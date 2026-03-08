import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/contexts/I18nContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Package, MapPin, Plus, Trash2, Star, Search, Ruler, Clock, Navigation } from "lucide-react";
import { toast } from "sonner";
import DashboardLayout from "@/components/DashboardLayout";
import CreateDeliveryForm from "@/components/CreateDeliveryForm";
import CustomerTracking from "@/components/CustomerTracking";

const CustomerDashboard = () => {
  const { user, profile, signOut } = useAuth();
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState("create");
  const [addresses, setAddresses] = useState<any[]>([]);
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [trackingDelivery, setTrackingDelivery] = useState<any>(null);

  const [name, setName] = useState(profile?.name || "");
  const [mobile, setMobile] = useState(profile?.mobile || "");
  const [addrLabel, setAddrLabel] = useState("Home");
  const [addrLine, setAddrLine] = useState("");
  const [addrCity, setAddrCity] = useState("");
  const [addrState, setAddrState] = useState("");
  const [addrPincode, setAddrPincode] = useState("");

  useEffect(() => { if (user) fetchData(); }, [user]);
  useEffect(() => { if (profile) { setName(profile.name); setMobile(profile.mobile); } }, [profile]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("customer-deliveries")
      .on("postgres_changes", { event: "*", schema: "public", table: "deliveries", filter: `customer_id=eq.${user.id}` }, () => fetchData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    const [aRes, dRes] = await Promise.all([
      supabase.from("delivery_addresses").select("*").eq("user_id", user!.id).order("created_at"),
      supabase.from("deliveries").select("*").eq("customer_id", user!.id).order("created_at", { ascending: false }),
    ]);
    if (aRes.data) setAddresses(aRes.data);
    if (dRes.data) setDeliveries(dRes.data);
    setLoading(false);
  };

  const handleSaveProfile = async () => {
    const { error } = await supabase.from("profiles").update({ name, mobile }).eq("user_id", user!.id);
    if (error) toast.error(error.message);
    else toast.success("Profile updated!");
  };

  const handleAddAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("delivery_addresses").insert({
      user_id: user!.id, label: addrLabel, address_line: addrLine,
      city: addrCity, state: addrState, pincode: addrPincode,
      is_default: addresses.length === 0,
    });
    if (error) toast.error(error.message);
    else {
      toast.success("Address added!");
      setDialogOpen(false);
      setAddrLabel("Home"); setAddrLine(""); setAddrCity(""); setAddrState(""); setAddrPincode("");
      fetchData();
    }
  };

  const handleDeleteAddress = async (id: string) => {
    const { error } = await supabase.from("delivery_addresses").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Address removed"); fetchData(); }
  };

  const handleSetDefault = async (id: string) => {
    await supabase.from("delivery_addresses").update({ is_default: false }).eq("user_id", user!.id);
    await supabase.from("delivery_addresses").update({ is_default: true }).eq("id", id);
    toast.success("Default address updated");
    fetchData();
  };

  const statusColor = (s: string) => {
    switch (s) {
      case "delivered": return "bg-primary/10 text-primary";
      case "in_transit": return "bg-accent/20 text-accent-foreground";
      case "assigned": return "bg-blue-100 text-blue-700";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const activeDeliveries = deliveries.filter((d) => ["assigned", "in_transit"].includes(d.status));

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <DashboardLayout role="customer" name={profile?.name || "Customer"} onSignOut={signOut} activeTab={activeTab} onTabChange={setActiveTab}>
      <div className="p-6">
        <h1 className="mb-1 font-display text-2xl font-bold">{t("customer.title")}</h1>
        <p className="mb-6 text-sm text-muted-foreground">{t("customer.subtitle")}</p>

        {activeTab === "create" && <CreateDeliveryForm onCreated={fetchData} />}

        {activeTab === "tracking" && (
          activeDeliveries.length === 0 ? (
            <Card className="shadow-card">
              <CardContent className="flex flex-col items-center py-12">
                <Navigation className="mb-4 h-12 w-12 text-muted-foreground/40" />
                <p className="text-muted-foreground">{t("customer.noTracking")}</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {!trackingDelivery ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {activeDeliveries.map((d) => (
                    <Card key={d.id} className="shadow-card cursor-pointer hover:border-primary/40 transition-colors" onClick={() => setTrackingDelivery(d)}>
                      <CardContent className="p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <Badge className={statusColor(d.status)}>{d.status}</Badge>
                          {d.estimated_time_mins > 0 && <span className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" />~{d.estimated_time_mins} min</span>}
                        </div>
                        <p className="text-sm font-medium line-clamp-1">{d.pickup_address}</p>
                        <p className="text-xs text-muted-foreground line-clamp-1">→ {d.dropoff_address}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div>
                  <Button variant="ghost" size="sm" className="mb-4" onClick={() => setTrackingDelivery(null)}>← Back</Button>
                  <CustomerTracking delivery={trackingDelivery} />
                </div>
              )}
            </div>
          )
        )}

        {activeTab === "orders" && (
          <Card className="shadow-card">
            <CardHeader><CardTitle className="font-display">{t("customer.myDeliveries")}</CardTitle></CardHeader>
            <CardContent>
              {deliveries.length === 0 ? (
                <div className="flex flex-col items-center py-12">
                  <Search className="mb-4 h-12 w-12 text-muted-foreground/40" />
                  <p className="text-muted-foreground">{t("customer.noDeliveries")}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {deliveries.map((d) => (
                    <div key={d.id} className="rounded-lg border border-border p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-primary" />
                          <span className="text-sm font-medium">{d.pickup_address?.slice(0, 40)}...</span>
                        </div>
                        <Badge className={statusColor(d.status)}>{d.status}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">→ {d.dropoff_address?.slice(0, 40)}...</p>
                      <div className="flex gap-3 text-xs text-muted-foreground">
                        {d.distance_km > 0 && <span className="flex items-center gap-1"><Ruler className="h-3 w-3" />{d.distance_km} km</span>}
                        {d.estimated_time_mins > 0 && <span className="flex items-center gap-1"><Clock className="h-3 w-3" />~{d.estimated_time_mins} min</span>}
                        {d.package_weight > 0 && <span className="flex items-center gap-1"><Package className="h-3 w-3" />{d.package_weight} kg</span>}
                        <span>{new Date(d.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {activeTab === "addresses" && (
          <Card className="shadow-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="font-display">{t("customer.deliveryAddresses")}</CardTitle>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-1"><Plus className="h-4 w-4" />{t("customer.addAddress")}</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>{t("customer.addAddress")}</DialogTitle></DialogHeader>
                  <form onSubmit={handleAddAddress} className="space-y-4">
                    <div><Label>Label</Label><Input placeholder="Home, Office..." value={addrLabel} onChange={(e) => setAddrLabel(e.target.value)} required /></div>
                    <div><Label>Address Line</Label><Input placeholder="123 Main Street" value={addrLine} onChange={(e) => setAddrLine(e.target.value)} required /></div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><Label>City</Label><Input placeholder="Mira-Bhayandar" value={addrCity} onChange={(e) => setAddrCity(e.target.value)} required /></div>
                      <div><Label>State</Label><Input placeholder="Maharashtra" value={addrState} onChange={(e) => setAddrState(e.target.value)} required /></div>
                    </div>
                    <div><Label>Pincode</Label><Input placeholder="401107" value={addrPincode} onChange={(e) => setAddrPincode(e.target.value)} required /></div>
                    <Button type="submit" className="w-full">{t("common.save")}</Button>
                  </form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {addresses.length === 0 ? (
                <p className="py-8 text-center text-muted-foreground">{t("customer.noAddresses")}</p>
              ) : (
                <div className="space-y-3">
                  {addresses.map((a) => (
                    <div key={a.id} className="flex items-start justify-between rounded-lg border border-border p-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{a.label}</span>
                          {a.is_default && <Badge className="bg-primary/10 text-primary text-xs">Default</Badge>}
                        </div>
                        <p className="text-sm text-muted-foreground">{a.address_line}, {a.city}, {a.state} - {a.pincode}</p>
                      </div>
                      <div className="flex gap-2">
                        {!a.is_default && <Button variant="ghost" size="icon" onClick={() => handleSetDefault(a.id)}><Star className="h-4 w-4" /></Button>}
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteAddress(a.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {activeTab === "profile" && (
          <Card className="max-w-md shadow-card">
            <CardHeader><CardTitle className="font-display">{t("customer.editProfile")}</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
              <div><Label>Email</Label><Input value={profile?.email || ""} disabled /></div>
              <div><Label>Mobile</Label><Input value={mobile} onChange={(e) => setMobile(e.target.value)} /></div>
              <Button onClick={handleSaveProfile}>{t("common.save")}</Button>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default CustomerDashboard;
