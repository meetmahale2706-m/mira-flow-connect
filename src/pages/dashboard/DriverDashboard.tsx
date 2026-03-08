import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Truck, MapPin, Package, Clock, Car, Fuel, Settings, CheckCircle2, XCircle, Play, Flag, Ruler } from "lucide-react";
import { toast } from "sonner";
import DashboardNav from "@/components/DashboardNav";
import DeliveryMap, { fetchRoute } from "@/components/DeliveryMap";

interface LatLng { lat: number; lng: number; }

const DriverDashboard = () => {
  const { user, profile, signOut } = useAuth();
  const [driverProfile, setDriverProfile] = useState<any>(null);
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDelivery, setSelectedDelivery] = useState<any>(null);
  const [route, setRoute] = useState<LatLng[]>([]);

  const [vehicleNumber, setVehicleNumber] = useState("");
  const [vehicleType, setVehicleType] = useState("");
  const [fuelEfficiency, setFuelEfficiency] = useState("");
  const [mobile, setMobile] = useState(profile?.mobile || "");

  useEffect(() => { if (user) fetchData(); }, [user]);

  const fetchData = async () => {
    setLoading(true);
    const [dpRes, delRes] = await Promise.all([
      supabase.from("driver_profiles").select("*").eq("user_id", user!.id).maybeSingle(),
      supabase.from("deliveries").select("*").eq("driver_id", user!.id).order("created_at", { ascending: false }),
    ]);
    if (dpRes.data) {
      setDriverProfile(dpRes.data);
      setVehicleNumber(dpRes.data.vehicle_number);
      setVehicleType(dpRes.data.vehicle_type);
      setFuelEfficiency(String(dpRes.data.fuel_efficiency || ""));
    }
    if (delRes.data) setDeliveries(delRes.data);
    setLoading(false);
  };

  const handleToggleAvailability = async () => {
    if (!driverProfile) return;
    const newVal = !driverProfile.is_available;
    const { error } = await supabase.from("driver_profiles").update({ is_available: newVal }).eq("user_id", user!.id);
    if (error) toast.error("Failed to update availability");
    else {
      setDriverProfile({ ...driverProfile, is_available: newVal });
      toast.success(newVal ? "You are now available" : "You are now offline");
    }
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

  const handleStartTrip = async (delivery: any) => {
    const { error } = await supabase.from("deliveries")
      .update({ status: "in_transit", started_at: new Date().toISOString() })
      .eq("id", delivery.id);
    if (error) toast.error(error.message);
    else { toast.success("Trip started!"); fetchData(); }
  };

  const handleCompleteDelivery = async (delivery: any) => {
    const { error } = await supabase.from("deliveries")
      .update({ status: "delivered", completed_at: new Date().toISOString() })
      .eq("id", delivery.id);
    if (error) toast.error(error.message);
    else { toast.success("Delivery completed!"); setSelectedDelivery(null); setRoute([]); fetchData(); }
  };

  const handleViewRoute = async (delivery: any) => {
    setSelectedDelivery(delivery);
    if (delivery.pickup_lat && delivery.dropoff_lat) {
      const r = await fetchRoute(
        { lat: delivery.pickup_lat, lng: delivery.pickup_lng },
        { lat: delivery.dropoff_lat, lng: delivery.dropoff_lng }
      );
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

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardNav role="driver" name={profile?.name || "Driver"} onSignOut={signOut} />
      <div className="container py-8">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold">Driver Dashboard</h1>
            <p className="text-muted-foreground">Manage your vehicle, availability, and deliveries</p>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 shadow-card">
            <span className="text-sm font-medium">Availability</span>
            <Switch checked={driverProfile?.is_available || false} onCheckedChange={handleToggleAvailability} />
            {driverProfile?.is_available ? (
              <Badge className="bg-primary/10 text-primary gap-1"><CheckCircle2 className="h-3 w-3" /> Available</Badge>
            ) : (
              <Badge variant="secondary" className="gap-1"><XCircle className="h-3 w-3" /> Offline</Badge>
            )}
          </div>
        </div>

        <Tabs defaultValue="deliveries" className="space-y-6">
          <TabsList>
            <TabsTrigger value="deliveries" className="gap-2"><Package className="h-4 w-4" />Deliveries</TabsTrigger>
            <TabsTrigger value="vehicle" className="gap-2"><Car className="h-4 w-4" />Vehicle</TabsTrigger>
            <TabsTrigger value="profile" className="gap-2"><Settings className="h-4 w-4" />Profile</TabsTrigger>
          </TabsList>

          {/* Deliveries Tab */}
          <TabsContent value="deliveries">
            <div className="grid gap-6 lg:grid-cols-2">
              <Card className="shadow-card">
                <CardHeader><CardTitle className="font-display">Assigned Deliveries</CardTitle></CardHeader>
                <CardContent>
                  {deliveries.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <Package className="mb-4 h-12 w-12 text-muted-foreground/40" />
                      <p className="text-muted-foreground">No deliveries assigned yet</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {deliveries.map((d) => (
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
                          </div>
                          <div className="flex gap-2 pt-1">
                            {d.status === "assigned" && (
                              <Button size="sm" className="gap-1" onClick={(e) => { e.stopPropagation(); handleStartTrip(d); }}>
                                <Play className="h-3.5 w-3.5" /> Start Trip
                              </Button>
                            )}
                            {d.status === "in_transit" && (
                              <Button size="sm" variant="default" className="gap-1" onClick={(e) => { e.stopPropagation(); handleCompleteDelivery(d); }}>
                                <Flag className="h-3.5 w-3.5" /> Complete
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Route Map */}
              <Card className="shadow-card overflow-hidden">
                <CardHeader className="pb-2">
                  <CardTitle className="font-display text-base">
                    {selectedDelivery ? "Route Visualization" : "Select a delivery to view route"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <DeliveryMap
                    pickup={selectedDelivery?.pickup_lat ? { lat: selectedDelivery.pickup_lat, lng: selectedDelivery.pickup_lng } : null}
                    dropoff={selectedDelivery?.dropoff_lat ? { lat: selectedDelivery.dropoff_lat, lng: selectedDelivery.dropoff_lng } : null}
                    route={route}
                    height="450px"
                  />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Vehicle Tab */}
          <TabsContent value="vehicle">
            <div className="grid gap-6 md:grid-cols-2">
              <Card className="shadow-card">
                <CardHeader><CardTitle className="font-display">Vehicle Details</CardTitle></CardHeader>
                <CardContent>
                  <form onSubmit={handleSaveVehicle} className="space-y-4">
                    <div><Label>Vehicle Number</Label><Input placeholder="KA-01-AB-1234" value={vehicleNumber} onChange={(e) => setVehicleNumber(e.target.value)} /></div>
                    <div><Label>Vehicle Type</Label><Input placeholder="Mini Truck, Van, Bike..." value={vehicleType} onChange={(e) => setVehicleType(e.target.value)} /></div>
                    <div><Label>Fuel Efficiency (km/l)</Label><Input type="number" step="0.1" placeholder="12.5" value={fuelEfficiency} onChange={(e) => setFuelEfficiency(e.target.value)} /></div>
                    <Button type="submit" className="w-full">Save Vehicle Details</Button>
                  </form>
                </CardContent>
              </Card>
              {driverProfile && (
                <Card className="shadow-card">
                  <CardHeader><CardTitle className="font-display">Vehicle Summary</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-3"><Car className="h-5 w-5 text-primary" /><div><p className="text-sm text-muted-foreground">Vehicle Number</p><p className="font-semibold">{driverProfile.vehicle_number || "Not set"}</p></div></div>
                    <div className="flex items-center gap-3"><Truck className="h-5 w-5 text-primary" /><div><p className="text-sm text-muted-foreground">Vehicle Type</p><p className="font-semibold">{driverProfile.vehicle_type || "Not set"}</p></div></div>
                    <div className="flex items-center gap-3"><Fuel className="h-5 w-5 text-primary" /><div><p className="text-sm text-muted-foreground">Fuel Efficiency</p><p className="font-semibold">{driverProfile.fuel_efficiency ? `${driverProfile.fuel_efficiency} km/l` : "Not set"}</p></div></div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Profile Tab */}
          <TabsContent value="profile">
            <Card className="max-w-md shadow-card">
              <CardHeader><CardTitle className="font-display">Profile Settings</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div><Label>Name</Label><Input value={profile?.name || ""} disabled /></div>
                <div><Label>Email</Label><Input value={profile?.email || ""} disabled /></div>
                <div><Label>Mobile Number</Label><Input value={mobile} onChange={(e) => setMobile(e.target.value)} /></div>
                <Button onClick={handleUpdateMobile}>Update Mobile</Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default DriverDashboard;
