import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/contexts/I18nContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Truck, MapPin, Package, Clock, Car, Fuel, CheckCircle2, XCircle,
  Play, Flag, Ruler, Layers, Navigation, Zap, HandMetal,
} from "lucide-react";
import { toast } from "sonner";
import DashboardLayout from "@/components/DashboardLayout";
import DeliveryMap, { fetchRoute } from "@/components/DeliveryMap";
import DriverEarnings from "@/components/DriverEarnings";
import DriverCheckIn from "@/components/DriverCheckIn";
import { poolDeliveries, optimizeRoute, calculateRouteCost, DeliveryPool } from "@/utils/deliveryPooling";

interface LatLng { lat: number; lng: number; }

const DriverDashboard = () => {
  const { user, profile, signOut } = useAuth();
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState("available");
  const [driverProfile, setDriverProfile] = useState<any>(null);
  const [myDeliveries, setMyDeliveries] = useState<any[]>([]);
  const [pendingDeliveries, setPendingDeliveries] = useState<any[]>([]);
  const [pools, setPools] = useState<DeliveryPool[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDelivery, setSelectedDelivery] = useState<any>(null);
  const [route, setRoute] = useState<LatLng[]>([]);

  const [vehicleNumber, setVehicleNumber] = useState("");
  const [vehicleType, setVehicleType] = useState("");
  const [fuelEfficiency, setFuelEfficiency] = useState("");
  const [mobile, setMobile] = useState(profile?.mobile || "");

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const [dpRes, myRes, pendingRes] = await Promise.all([
      supabase.from("driver_profiles").select("*").eq("user_id", user.id).maybeSingle(),
      supabase.from("deliveries").select("*").eq("driver_id", user.id).order("created_at", { ascending: false }),
      supabase.from("deliveries").select("*").eq("status", "pending").is("driver_id", null).order("created_at", { ascending: false }),
    ]);
    if (dpRes.data) {
      setDriverProfile(dpRes.data);
      setVehicleNumber(dpRes.data.vehicle_number);
      setVehicleType(dpRes.data.vehicle_type);
      setFuelEfficiency(String(dpRes.data.fuel_efficiency || ""));
    }
    if (myRes.data) setMyDeliveries(myRes.data);
    if (pendingRes.data) {
      setPendingDeliveries(pendingRes.data);
      setPools(poolDeliveries(pendingRes.data));
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    const channel = supabase
      .channel("driver-deliveries")
      .on("postgres_changes", { event: "*", schema: "public", table: "deliveries" }, () => fetchData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchData]);

  const handleToggleAvailability = async () => {
    if (!driverProfile) return;
    const newVal = !driverProfile.is_available;
    const { error } = await supabase.from("driver_profiles").update({ is_available: newVal }).eq("user_id", user!.id);
    if (error) toast.error("Failed to update availability");
    else {
      setDriverProfile({ ...driverProfile, is_available: newVal });
      toast.success(newVal ? t("common.available") : t("common.offline"));
    }
  };

  const handleAcceptDelivery = async (delivery: any) => {
    const { error } = await supabase.from("deliveries").update({ driver_id: user!.id, status: "assigned" }).eq("id", delivery.id).eq("status", "pending");
    if (error) toast.error(error.message);
    else { toast.success("Delivery accepted!"); fetchData(); }
  };

  const handleAcceptPool = async (pool: DeliveryPool) => {
    const optimized = optimizeRoute(pool.deliveries);
    for (const d of optimized) {
      await supabase.from("deliveries").update({ driver_id: user!.id, status: "assigned" }).eq("id", d.id).eq("status", "pending");
    }
    toast.success(`Accepted ${pool.deliveries.length} pooled deliveries!`);
    fetchData();
  };

  const handleStartTrip = async (delivery: any) => {
    const { error } = await supabase.from("deliveries").update({ status: "in_transit", started_at: new Date().toISOString() }).eq("id", delivery.id);
    if (error) toast.error(error.message);
    else { toast.success(t("driver.startTrip") + "!"); fetchData(); }
  };

  const handleCompleteDelivery = async (delivery: any) => {
    const { error } = await supabase.from("deliveries").update({ status: "delivered", completed_at: new Date().toISOString() }).eq("id", delivery.id);
    if (error) toast.error(error.message);
    else { toast.success(t("common.delivered") + "!"); setSelectedDelivery(null); setRoute([]); fetchData(); }
  };

  const handleSaveVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { vehicle_number: vehicleNumber, vehicle_type: vehicleType, fuel_efficiency: parseFloat(fuelEfficiency) || 0 };
    if (driverProfile) {
      const { error } = await supabase.from("driver_profiles").update(payload).eq("user_id", user!.id);
      if (error) toast.error(error.message);
      else { toast.success("Vehicle details updated!"); fetchData(); }
    } else {
      const { error } = await supabase.from("driver_profiles").insert({ ...payload, user_id: user!.id });
      if (error) toast.error(error.message);
      else { toast.success("Vehicle details saved!"); fetchData(); }
    }
  };

  const handleUpdateMobile = async () => {
    const { error } = await supabase.from("profiles").update({ mobile }).eq("user_id", user!.id);
    if (error) toast.error(error.message);
    else toast.success("Mobile number updated!");
  };

  const handleViewRoute = async (delivery: any) => {
    setSelectedDelivery(delivery);
    if (delivery.pickup_lat && delivery.dropoff_lat) {
      const r = await fetchRoute({ lat: delivery.pickup_lat, lng: delivery.pickup_lng }, { lat: delivery.dropoff_lat, lng: delivery.dropoff_lng });
      setRoute(r);
    }
  };

  const statusColor = (s: string) => {
    switch (s) {
      case "delivered": return "bg-primary/10 text-primary";
      case "in_transit": return "bg-accent/20 text-accent-foreground";
      case "assigned": return "bg-blue-100 text-blue-700";
      case "cancelled": return "bg-destructive/10 text-destructive";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const fuelCost = (distKm: number) =>
    driverProfile?.fuel_efficiency ? calculateRouteCost(distKm, driverProfile.fuel_efficiency) : 0;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const renderDeliveryCard = (d: any, showActions: "accept" | "trip" | null) => (
    <div
      key={d.id}
      className={`rounded-lg border p-4 space-y-2 cursor-pointer transition-colors ${
        selectedDelivery?.id === d.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
      }`}
      onClick={() => handleViewRoute(d)}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium line-clamp-1">{d.pickup_address?.slice(0, 35)}...</span>
        </div>
        <Badge className={statusColor(d.status)}>{d.status}</Badge>
      </div>
      <p className="text-xs text-muted-foreground">→ {d.dropoff_address?.slice(0, 40)}...</p>
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        {d.distance_km > 0 && <span className="flex items-center gap-1"><Ruler className="h-3 w-3" />{d.distance_km} km</span>}
        {d.estimated_time_mins > 0 && <span className="flex items-center gap-1"><Clock className="h-3 w-3" />~{d.estimated_time_mins} min</span>}
        {d.package_weight > 0 && <span className="flex items-center gap-1"><Package className="h-3 w-3" />{d.package_weight} kg</span>}
        {fuelCost(d.distance_km) > 0 && <span className="flex items-center gap-1"><Fuel className="h-3 w-3" />₹{fuelCost(d.distance_km)}</span>}
      </div>
      <div className="flex gap-2 pt-1">
        {showActions === "accept" && (
          <Button size="sm" className="gap-1" onClick={(e) => { e.stopPropagation(); handleAcceptDelivery(d); }}>
            <CheckCircle2 className="h-3.5 w-3.5" /> {t("driver.accept")}
          </Button>
        )}
        {showActions === "trip" && d.status === "assigned" && (
          <Button size="sm" className="gap-1" onClick={(e) => { e.stopPropagation(); handleStartTrip(d); }}>
            <Play className="h-3.5 w-3.5" /> {t("driver.startTrip")}
          </Button>
        )}
        {showActions === "trip" && d.status === "in_transit" && (
          <Button size="sm" variant="default" className="gap-1" onClick={(e) => { e.stopPropagation(); handleCompleteDelivery(d); }}>
            <Flag className="h-3.5 w-3.5" /> {t("driver.complete")}
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <DashboardLayout role="driver" name={profile?.name || "Driver"} onSignOut={signOut} activeTab={activeTab} onTabChange={setActiveTab}>
      <div className="p-6">
        {/* Header with availability toggle */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold">{t("driver.title")}</h1>
            <p className="text-sm text-muted-foreground">{t("driver.subtitle")}</p>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 shadow-card">
            <span className="text-sm font-medium">{t("driver.availability")}</span>
            <Switch checked={driverProfile?.is_available || false} onCheckedChange={handleToggleAvailability} />
            {driverProfile?.is_available ? (
              <Badge className="bg-primary/10 text-primary gap-1"><CheckCircle2 className="h-3 w-3" /> {t("common.available")}</Badge>
            ) : (
              <Badge variant="secondary" className="gap-1"><XCircle className="h-3 w-3" /> {t("common.offline")}</Badge>
            )}
          </div>
        </div>

        {/* Available */}
        {activeTab === "available" && (
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="font-display flex items-center gap-2">
                  <Zap className="h-5 w-5 text-accent-foreground" />
                  {t("driver.availableDeliveries")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {pendingDeliveries.length === 0 ? (
                  <div className="flex flex-col items-center py-12">
                    <Package className="mb-4 h-12 w-12 text-muted-foreground/40" />
                    <p className="text-muted-foreground">{t("driver.noPending")}</p>
                  </div>
                ) : (
                  <div className="space-y-3">{pendingDeliveries.map((d) => renderDeliveryCard(d, "accept"))}</div>
                )}
              </CardContent>
            </Card>
            <Card className="shadow-card overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="font-display text-base">{selectedDelivery ? t("driver.routePreview") : t("driver.selectDelivery")}</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <DeliveryMap
                  pickup={selectedDelivery?.pickup_lat ? { lat: selectedDelivery.pickup_lat, lng: selectedDelivery.pickup_lng } : null}
                  dropoff={selectedDelivery?.dropoff_lat ? { lat: selectedDelivery.dropoff_lat, lng: selectedDelivery.dropoff_lng } : null}
                  route={route} height="450px"
                />
              </CardContent>
            </Card>
          </div>
        )}

        {/* My Deliveries */}
        {activeTab === "mydeliveries" && (
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="shadow-card">
              <CardHeader><CardTitle className="font-display">{t("driver.assignedDeliveries")}</CardTitle></CardHeader>
              <CardContent>
                {myDeliveries.length === 0 ? (
                  <div className="flex flex-col items-center py-12">
                    <Package className="mb-4 h-12 w-12 text-muted-foreground/40" />
                    <p className="text-muted-foreground">{t("driver.noAssigned")}</p>
                  </div>
                ) : (
                  <div className="space-y-3">{myDeliveries.map((d) => renderDeliveryCard(d, "trip"))}</div>
                )}
              </CardContent>
            </Card>
            <Card className="shadow-card overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="font-display text-base">{selectedDelivery ? t("driver.routeViz") : t("driver.selectDelivery")}</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <DeliveryMap
                  pickup={selectedDelivery?.pickup_lat ? { lat: selectedDelivery.pickup_lat, lng: selectedDelivery.pickup_lng } : null}
                  dropoff={selectedDelivery?.dropoff_lat ? { lat: selectedDelivery.dropoff_lat, lng: selectedDelivery.dropoff_lng } : null}
                  route={route} height="450px"
                />
              </CardContent>
            </Card>
          </div>
        )}

        {/* Pooled Routes */}
        {activeTab === "pooled" && (
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="font-display flex items-center gap-2">
                  <Layers className="h-5 w-5 text-primary" />
                  {t("driver.pooledGroups")}
                </CardTitle>
                <p className="text-xs text-muted-foreground">{t("driver.pooledDesc")}</p>
              </CardHeader>
              <CardContent>
                {pools.length === 0 ? (
                  <div className="flex flex-col items-center py-12">
                    <Layers className="mb-4 h-12 w-12 text-muted-foreground/40" />
                    <p className="text-muted-foreground">{t("driver.noPools")}</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {pools.map((pool) => (
                      <div key={pool.id} className="rounded-lg border border-border p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{pool.deliveries.length} deliveries</span>
                          {pool.deliveries.length > 1 && (
                            <Badge className="bg-accent/20 text-accent-foreground gap-1"><Zap className="h-3 w-3" /> Pooled</Badge>
                          )}
                        </div>
                        <div className="flex gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><Ruler className="h-3 w-3" />{pool.totalDistance} km</span>
                          <span className="flex items-center gap-1"><Clock className="h-3 w-3" />~{pool.totalTime} min</span>
                          <span className="flex items-center gap-1"><Package className="h-3 w-3" />{pool.totalWeight} kg</span>
                          {fuelCost(pool.totalDistance) > 0 && <span className="flex items-center gap-1"><Fuel className="h-3 w-3" />₹{fuelCost(pool.totalDistance)}</span>}
                        </div>
                        {pool.deliveries.map((d, i) => (
                          <p key={d.id} className="text-xs text-muted-foreground">{i + 1}. {d.pickup_address?.slice(0, 30)} → {d.dropoff_address?.slice(0, 30)}</p>
                        ))}
                        <Button size="sm" className="gap-1 w-full" onClick={() => handleAcceptPool(pool)}>
                          <CheckCircle2 className="h-3.5 w-3.5" /> {t("driver.acceptAll")} ({pool.deliveries.length})
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
            <Card className="shadow-card overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="font-display text-base flex items-center gap-2">
                  <Navigation className="h-4 w-4 text-primary" />
                  {t("driver.optimizedRoute")}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <DeliveryMap pickup={null} dropoff={null} route={[]} height="450px" />
              </CardContent>
            </Card>
          </div>
        )}

        {/* Earnings */}
        {activeTab === "earnings" && (
          <DriverEarnings deliveries={myDeliveries} fuelEfficiency={driverProfile?.fuel_efficiency || 0} />
        )}

        {/* Vehicle */}
        {activeTab === "vehicle" && (
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="shadow-card">
              <CardHeader><CardTitle className="font-display">{t("driver.vehicleDetails")}</CardTitle></CardHeader>
              <CardContent>
                <form onSubmit={handleSaveVehicle} className="space-y-4">
                  <div><Label>{t("driver.vehicleNumber")}</Label><Input placeholder="KA-01-AB-1234" value={vehicleNumber} onChange={(e) => setVehicleNumber(e.target.value)} /></div>
                  <div><Label>{t("driver.vehicleType")}</Label><Input placeholder="Mini Truck, Van, Bike..." value={vehicleType} onChange={(e) => setVehicleType(e.target.value)} /></div>
                  <div><Label>{t("driver.fuelEfficiency")} (km/l)</Label><Input type="number" step="0.1" placeholder="12.5" value={fuelEfficiency} onChange={(e) => setFuelEfficiency(e.target.value)} /></div>
                  <Button type="submit" className="w-full">{t("common.save")}</Button>
                </form>
              </CardContent>
            </Card>
            {driverProfile && (
              <Card className="shadow-card">
                <CardHeader><CardTitle className="font-display">{t("driver.vehicleSummary")}</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3"><Car className="h-5 w-5 text-primary" /><div><p className="text-sm text-muted-foreground">{t("driver.vehicleNumber")}</p><p className="font-semibold">{driverProfile.vehicle_number || "Not set"}</p></div></div>
                  <div className="flex items-center gap-3"><Truck className="h-5 w-5 text-primary" /><div><p className="text-sm text-muted-foreground">{t("driver.vehicleType")}</p><p className="font-semibold">{driverProfile.vehicle_type || "Not set"}</p></div></div>
                  <div className="flex items-center gap-3"><Fuel className="h-5 w-5 text-primary" /><div><p className="text-sm text-muted-foreground">{t("driver.fuelEfficiency")}</p><p className="font-semibold">{driverProfile.fuel_efficiency ? `${driverProfile.fuel_efficiency} km/l` : "Not set"}</p></div></div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Profile */}
        {activeTab === "profile" && (
          <Card className="max-w-md shadow-card">
            <CardHeader><CardTitle className="font-display">{t("driver.profileSettings")}</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div><Label>Name</Label><Input value={profile?.name || ""} disabled /></div>
              <div><Label>Email</Label><Input value={profile?.email || ""} disabled /></div>
              <div><Label>Mobile Number</Label><Input value={mobile} onChange={(e) => setMobile(e.target.value)} /></div>
              <Button onClick={handleUpdateMobile}>{t("driver.updateMobile")}</Button>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default DriverDashboard;
