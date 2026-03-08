import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Package, MapPin, Plus, Trash2, Star, Settings, Search } from "lucide-react";
import { toast } from "sonner";
import DashboardNav from "@/components/DashboardNav";

const CustomerDashboard = () => {
  const { user, profile, signOut } = useAuth();
  const [addresses, setAddresses] = useState<any[]>([]);
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Profile form
  const [name, setName] = useState(profile?.name || "");
  const [mobile, setMobile] = useState(profile?.mobile || "");

  // Address form
  const [addrLabel, setAddrLabel] = useState("Home");
  const [addrLine, setAddrLine] = useState("");
  const [addrCity, setAddrCity] = useState("");
  const [addrState, setAddrState] = useState("");
  const [addrPincode, setAddrPincode] = useState("");

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  useEffect(() => {
    if (profile) {
      setName(profile.name);
      setMobile(profile.mobile);
    }
  }, [profile]);

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
      user_id: user!.id,
      label: addrLabel,
      address_line: addrLine,
      city: addrCity,
      state: addrState,
      pincode: addrPincode,
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
    // Unset all, then set this one
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
      <DashboardNav role="customer" name={profile?.name || "Customer"} onSignOut={signOut} />
      <div className="container py-8">
        <h1 className="mb-2 font-display text-3xl font-bold">Customer Dashboard</h1>
        <p className="mb-8 text-muted-foreground">Manage your profile, addresses, and track deliveries</p>

        <Tabs defaultValue="orders" className="space-y-6">
          <TabsList>
            <TabsTrigger value="orders" className="gap-2"><Package className="h-4 w-4" />My Orders</TabsTrigger>
            <TabsTrigger value="addresses" className="gap-2"><MapPin className="h-4 w-4" />Addresses</TabsTrigger>
            <TabsTrigger value="profile" className="gap-2"><Settings className="h-4 w-4" />Profile</TabsTrigger>
          </TabsList>

          {/* Orders */}
          <TabsContent value="orders">
            <Card className="shadow-card">
              <CardHeader><CardTitle className="font-display">My Deliveries</CardTitle></CardHeader>
              <CardContent>
                {deliveries.length === 0 ? (
                  <div className="flex flex-col items-center py-12">
                    <Search className="mb-4 h-12 w-12 text-muted-foreground/40" />
                    <p className="text-muted-foreground">No deliveries yet</p>
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

          {/* Addresses */}
          <TabsContent value="addresses">
            <Card className="shadow-card">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="font-display">Delivery Addresses</CardTitle>
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="gap-1"><Plus className="h-4 w-4" />Add Address</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Add New Address</DialogTitle></DialogHeader>
                    <form onSubmit={handleAddAddress} className="space-y-4">
                      <div>
                        <Label>Label</Label>
                        <Input placeholder="Home, Office, etc." value={addrLabel} onChange={(e) => setAddrLabel(e.target.value)} required />
                      </div>
                      <div>
                        <Label>Address Line</Label>
                        <Input placeholder="123 Main Street" value={addrLine} onChange={(e) => setAddrLine(e.target.value)} required />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label>City</Label>
                          <Input placeholder="Bangalore" value={addrCity} onChange={(e) => setAddrCity(e.target.value)} required />
                        </div>
                        <div>
                          <Label>State</Label>
                          <Input placeholder="Karnataka" value={addrState} onChange={(e) => setAddrState(e.target.value)} required />
                        </div>
                      </div>
                      <div>
                        <Label>Pincode</Label>
                        <Input placeholder="560001" value={addrPincode} onChange={(e) => setAddrPincode(e.target.value)} required />
                      </div>
                      <Button type="submit" className="w-full">Save Address</Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {addresses.length === 0 ? (
                  <p className="py-8 text-center text-muted-foreground">No addresses saved yet</p>
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
                          {!a.is_default && (
                            <Button variant="ghost" size="icon" onClick={() => handleSetDefault(a.id)} title="Set as default">
                              <Star className="h-4 w-4" />
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteAddress(a.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Profile */}
          <TabsContent value="profile">
            <Card className="max-w-md shadow-card">
              <CardHeader><CardTitle className="font-display">Edit Profile</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Name</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input value={profile?.email || ""} disabled />
                </div>
                <div>
                  <Label>Mobile</Label>
                  <Input value={mobile} onChange={(e) => setMobile(e.target.value)} />
                </div>
                <Button onClick={handleSaveProfile}>Save Changes</Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default CustomerDashboard;
