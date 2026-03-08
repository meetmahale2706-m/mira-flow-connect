import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, Car, Package, BarChart3, Eye, CheckCircle2, XCircle } from "lucide-react";
import DashboardNav from "@/components/DashboardNav";

const AdminDashboard = () => {
  const { profile, signOut } = useAuth();
  const [allProfiles, setAllProfiles] = useState<any[]>([]);
  const [allRoles, setAllRoles] = useState<any[]>([]);
  const [driverProfiles, setDriverProfiles] = useState<any[]>([]);
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDriver, setSelectedDriver] = useState<any>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [pRes, rRes, dpRes, dRes] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("user_roles").select("*"),
      supabase.from("driver_profiles").select("*"),
      supabase.from("deliveries").select("*").order("created_at", { ascending: false }),
    ]);
    if (pRes.data) setAllProfiles(pRes.data);
    if (rRes.data) setAllRoles(rRes.data);
    if (dpRes.data) setDriverProfiles(dpRes.data);
    if (dRes.data) setDeliveries(dRes.data);
    setLoading(false);
  };

  const getUserRole = (userId: string) => {
    const r = allRoles.find((r) => r.user_id === userId);
    return r?.role || "unassigned";
  };

  const getDriverProfile = (userId: string) => {
    return driverProfiles.find((dp) => dp.user_id === userId);
  };

  const drivers = allProfiles.filter((p) => getUserRole(p.user_id) === "driver");
  const customers = allProfiles.filter((p) => getUserRole(p.user_id) === "customer");
  const admins = allProfiles.filter((p) => getUserRole(p.user_id) === "admin");

  const roleBadge = (role: string) => {
    switch (role) {
      case "admin": return <Badge className="bg-destructive/10 text-destructive">Admin</Badge>;
      case "driver": return <Badge className="bg-accent/20 text-accent-foreground">Driver</Badge>;
      case "customer": return <Badge className="bg-primary/10 text-primary">Customer</Badge>;
      default: return <Badge variant="secondary">Unassigned</Badge>;
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
      <DashboardNav role="admin" name={profile?.name || "Admin"} onSignOut={signOut} />
      <div className="container py-8">
        <h1 className="mb-2 font-display text-3xl font-bold">Admin Dashboard</h1>
        <p className="mb-8 text-muted-foreground">Full system overview and user management</p>

        {/* Stats */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: Users, label: "Total Users", value: allProfiles.length, color: "text-foreground" },
            { icon: Car, label: "Drivers", value: drivers.length, color: "text-accent-foreground" },
            { icon: Users, label: "Customers", value: customers.length, color: "text-primary" },
            { icon: Package, label: "Deliveries", value: deliveries.length, color: "text-foreground" },
          ].map((s) => (
            <Card key={s.label} className="shadow-card">
              <CardContent className="flex items-center gap-4 p-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg gradient-primary">
                  <s.icon className="h-6 w-6 text-primary-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{s.label}</p>
                  <p className={`text-2xl font-bold font-display ${s.color}`}>{s.value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="users" className="space-y-6">
          <TabsList>
            <TabsTrigger value="users" className="gap-2"><Users className="h-4 w-4" />All Users</TabsTrigger>
            <TabsTrigger value="drivers" className="gap-2"><Car className="h-4 w-4" />Drivers</TabsTrigger>
            <TabsTrigger value="deliveries" className="gap-2"><Package className="h-4 w-4" />Deliveries</TabsTrigger>
          </TabsList>

          {/* All Users */}
          <TabsContent value="users">
            <Card className="shadow-card">
              <CardHeader><CardTitle className="font-display">All Users ({allProfiles.length})</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Mobile</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Joined</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allProfiles.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">{p.name || "—"}</TableCell>
                        <TableCell>{p.email}</TableCell>
                        <TableCell>{p.mobile || "—"}</TableCell>
                        <TableCell>{roleBadge(getUserRole(p.user_id))}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{new Date(p.created_at).toLocaleDateString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Drivers */}
          <TabsContent value="drivers">
            <Card className="shadow-card">
              <CardHeader><CardTitle className="font-display">All Drivers ({drivers.length})</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Mobile</TableHead>
                      <TableHead>Vehicle</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {drivers.map((d) => {
                      const dp = getDriverProfile(d.user_id);
                      return (
                        <TableRow key={d.id}>
                          <TableCell className="font-medium">{d.name || "—"}</TableCell>
                          <TableCell>{d.mobile || "—"}</TableCell>
                          <TableCell>{dp?.vehicle_number || "Not set"}</TableCell>
                          <TableCell>
                            {dp?.is_available ? (
                              <Badge className="bg-primary/10 text-primary gap-1"><CheckCircle2 className="h-3 w-3" /> Available</Badge>
                            ) : (
                              <Badge variant="secondary" className="gap-1"><XCircle className="h-3 w-3" /> Offline</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button variant="ghost" size="sm" className="gap-1" onClick={() => setSelectedDriver({ ...d, dp })}>
                                  <Eye className="h-4 w-4" /> View
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader><DialogTitle>Driver Details</DialogTitle></DialogHeader>
                                {selectedDriver && (
                                  <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                      <div>
                                        <p className="text-sm text-muted-foreground">Name</p>
                                        <p className="font-semibold">{selectedDriver.name}</p>
                                      </div>
                                      <div>
                                        <p className="text-sm text-muted-foreground">Email</p>
                                        <p className="font-semibold">{selectedDriver.email}</p>
                                      </div>
                                      <div>
                                        <p className="text-sm text-muted-foreground">Mobile</p>
                                        <p className="font-semibold">{selectedDriver.mobile || "—"}</p>
                                      </div>
                                      <div>
                                        <p className="text-sm text-muted-foreground">Status</p>
                                        <p className="font-semibold">{selectedDriver.dp?.is_available ? "Available" : "Offline"}</p>
                                      </div>
                                      <div>
                                        <p className="text-sm text-muted-foreground">Vehicle Number</p>
                                        <p className="font-semibold">{selectedDriver.dp?.vehicle_number || "Not set"}</p>
                                      </div>
                                      <div>
                                        <p className="text-sm text-muted-foreground">Vehicle Type</p>
                                        <p className="font-semibold">{selectedDriver.dp?.vehicle_type || "Not set"}</p>
                                      </div>
                                      <div>
                                        <p className="text-sm text-muted-foreground">Fuel Efficiency</p>
                                        <p className="font-semibold">{selectedDriver.dp?.fuel_efficiency ? `${selectedDriver.dp.fuel_efficiency} km/l` : "Not set"}</p>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </DialogContent>
                            </Dialog>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Deliveries */}
          <TabsContent value="deliveries">
            <Card className="shadow-card">
              <CardHeader><CardTitle className="font-display">All Deliveries ({deliveries.length})</CardTitle></CardHeader>
              <CardContent>
                {deliveries.length === 0 ? (
                  <p className="py-8 text-center text-muted-foreground">No deliveries in the system yet</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Pickup</TableHead>
                        <TableHead>Dropoff</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {deliveries.map((d) => (
                        <TableRow key={d.id}>
                          <TableCell>{d.pickup_address}</TableCell>
                          <TableCell>{d.dropoff_address}</TableCell>
                          <TableCell><Badge variant="secondary">{d.status}</Badge></TableCell>
                          <TableCell className="text-sm text-muted-foreground">{new Date(d.created_at).toLocaleDateString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminDashboard;
