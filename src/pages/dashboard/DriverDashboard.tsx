import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Truck, LogOut, MapPin, Package, Clock, Car, Fuel, Settings, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import DashboardNav from "@/components/DashboardNav";

const DriverDashboard = () => {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [driverProfile, setDriverProfile] = useState<any>(null);
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [vehicleType, setVehicleType] = useState("");
  const [fuelEfficiency, setFuelEfficiency] = useState("");
  const [mobile, setMobile] = useState(profile?.mobile || "");

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

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
    const { error } = await supabase
      .from("driver_profiles")
      .update({ is_available: newVal })
      .eq("user_id", user!.id);
    if (error) {
      toast.error("Failed to update availability");
    } else {
      setDriverProfile({ ...driverProfile, is_available: newVal });
      toast.success(newVal ? "You are now available" : "You are now offline");
    }
  };

  const handleSaveVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      vehicle_number: vehicleNumber,
      vehicle_type: vehicleType,
      fuel_efficiency: parseFloat(fuelEfficiency) || 0,
    };

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
        {/* Availability Toggle */}
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

        <Tabs defaultValue="vehicle" className="space-y-6">
          <TabsList>
            <TabsTrigger value="vehicle" className="gap-2"><Car className="h-4 w-4" />Vehicle</TabsTrigger>
            <TabsTrigger value="deliveries" className="gap-2"><Package className="h-4 w-4" />Deliveries</TabsTrigger>
            <TabsTrigger value="profile" className="gap-2"><Settings className="h-4 w-4" />Profile</TabsTrigger>
          </TabsList>

          {/* Vehicle Tab */}
          <TabsContent value="vehicle">
            <div className="grid gap-6 md:grid-cols-2">
              <Card className="shadow-card">
                <CardHeader><CardTitle className="font-display">Vehicle Details</CardTitle></CardHeader>
                <CardContent>
                  <form onSubmit={handleSaveVehicle} className="space-y-4">
                    <div>
                      <Label>Vehicle Number</Label>
                      <Input placeholder="KA-01-AB-1234" value={vehicleNumber} onChange={(e) => setVehicleNumber(e.target.value)} />
                    </div>
                    <div>
                      <Label>Vehicle Type</Label>
                      <Input placeholder="Mini Truck, Van, Bike..." value={vehicleType} onChange={(e) => setVehicleType(e.target.value)} />
                    </div>
                    <div>
                      <Label>Fuel Efficiency (km/l)</Label>
                      <Input type="number" step="0.1" placeholder="12.5" value={fuelEfficiency} onChange={(e) => setFuelEfficiency(e.target.value)} />
                    </div>
                    <Button type="submit" className="w-full">Save Vehicle Details</Button>
                  </form>
                </CardContent>
              </Card>

              {driverProfile && (
                <Card className="shadow-card">
                  <CardHeader><CardTitle className="font-display">Vehicle Summary</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-3">
                      <Car className="h-5 w-5 text-primary" />
                      <div>
                        <p className="text-sm text-muted-foreground">Vehicle Number</p>
                        <p className="font-semibold">{driverProfile.vehicle_number || "Not set"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Truck className="h-5 w-5 text-primary" />
                      <div>
                        <p className="text-sm text-muted-foreground">Vehicle Type</p>
                        <p className="font-semibold">{driverProfile.vehicle_type || "Not set"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Fuel className="h-5 w-5 text-primary" />
                      <div>
                        <p className="text-sm text-muted-foreground">Fuel Efficiency</p>
                        <p className="font-semibold">{driverProfile.fuel_efficiency ? `${driverProfile.fuel_efficiency} km/l` : "Not set"}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Deliveries Tab */}
          <TabsContent value="deliveries">
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
                      <div key={d.id} className="flex items-center justify-between rounded-lg border border-border p-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-primary" />
                            <span className="text-sm">{d.pickup_address} → {d.dropoff_address}</span>
                          </div>
                          <p className="text-xs text-muted-foreground">{new Date(d.created_at).toLocaleDateString()}</p>
                        </div>
                        <Badge className={statusColor(d.status)}>{d.status}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Profile Tab */}
          <TabsContent value="profile">
            <Card className="max-w-md shadow-card">
              <CardHeader><CardTitle className="font-display">Profile Settings</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Name</Label>
                  <Input value={profile?.name || ""} disabled />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input value={profile?.email || ""} disabled />
                </div>
                <div>
                  <Label>Mobile Number</Label>
                  <Input value={mobile} onChange={(e) => setMobile(e.target.value)} />
                </div>
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
