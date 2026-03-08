import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/contexts/I18nContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, Car, Package, BarChart3, Eye, CheckCircle2, XCircle, Fuel, TrendingUp, Layers, Clock, Ruler } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import DashboardLayout from "@/components/DashboardLayout";
import DriverLeaderboard from "@/components/DriverLeaderboard";
import { calculateRouteCost } from "@/utils/deliveryPooling";

const CHART_COLORS = ["hsl(174, 62%, 38%)", "hsl(38, 92%, 50%)", "hsl(220, 25%, 14%)", "hsl(0, 84%, 60%)", "hsl(210, 15%, 60%)"];

const AdminDashboard = () => {
  const { profile, signOut } = useAuth();
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState("overview");
  const [allProfiles, setAllProfiles] = useState<any[]>([]);
  const [allRoles, setAllRoles] = useState<any[]>([]);
  const [driverProfiles, setDriverProfiles] = useState<any[]>([]);
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDriver, setSelectedDriver] = useState<any>(null);

  useEffect(() => { fetchData(); }, []);

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

  const getUserRole = (userId: string) => allRoles.find((r) => r.user_id === userId)?.role || "unassigned";
  const getDriverProfile = (userId: string) => driverProfiles.find((dp) => dp.user_id === userId);

  const drivers = allProfiles.filter((p) => getUserRole(p.user_id) === "driver");
  const customers = allProfiles.filter((p) => getUserRole(p.user_id) === "customer");
  const activeTrips = deliveries.filter((d) => d.status === "in_transit");
  const today = new Date().toDateString();
  const deliveredToday = deliveries.filter((d) => d.status === "delivered" && d.completed_at && new Date(d.completed_at).toDateString() === today);

  // Analytics
  const totalDistance = deliveries.reduce((sum, d) => sum + (d.distance_km || 0), 0);
  const avgDistance = deliveries.length > 0 ? (totalDistance / deliveries.length).toFixed(1) : 0;
  const totalTime = deliveries.reduce((sum, d) => sum + (d.estimated_time_mins || 0), 0);
  const avgTime = deliveries.length > 0 ? Math.round(totalTime / deliveries.length) : 0;

  const avgFuelEfficiency = driverProfiles.length > 0
    ? driverProfiles.reduce((sum, dp) => sum + (dp.fuel_efficiency || 0), 0) / driverProfiles.filter(dp => dp.fuel_efficiency > 0).length
    : 0;
  const totalFuelCost = avgFuelEfficiency > 0 ? calculateRouteCost(totalDistance, avgFuelEfficiency) : 0;

  // Status breakdown
  const statusCounts = ["pending", "assigned", "in_transit", "delivered", "cancelled"].map((status) => ({
    name: status,
    value: deliveries.filter((d) => d.status === status).length,
  })).filter((s) => s.value > 0);

  // Daily trend
  const trendMap = new Map<string, number>();
  deliveries.forEach((d) => {
    const date = new Date(d.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
    trendMap.set(date, (trendMap.get(date) || 0) + 1);
  });
  const trendData = Array.from(trendMap.entries()).map(([date, count]) => ({ date, count })).slice(-14);

  // Pooling efficiency: deliveries in same area ratio
  const poolableCount = deliveries.filter((d) =>
    deliveries.some((other) =>
      other.id !== d.id &&
      d.pickup_lat && other.pickup_lat &&
      Math.abs((d.pickup_lat || 0) - (other.pickup_lat || 0)) < 0.05 &&
      Math.abs((d.pickup_lng || 0) - (other.pickup_lng || 0)) < 0.05
    )
  ).length;
  const poolingEfficiency = deliveries.length > 0 ? Math.round((poolableCount / deliveries.length) * 100) : 0;

  const roleBadge = (role: string) => {
    switch (role) {
      case "admin": return <Badge className="bg-destructive/10 text-destructive">{t("common.admin")}</Badge>;
      case "driver": return <Badge className="bg-accent/20 text-accent-foreground">{t("common.driver")}</Badge>;
      case "customer": return <Badge className="bg-primary/10 text-primary">{t("common.customer")}</Badge>;
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
    <DashboardLayout role="admin" name={profile?.name || "Admin"} onSignOut={signOut} activeTab={activeTab} onTabChange={setActiveTab}>
      <div className="p-6">
        <h1 className="mb-1 font-display text-2xl font-bold">{t("admin.title")}</h1>
        <p className="mb-6 text-sm text-muted-foreground">{t("admin.subtitle")}</p>

        {/* Overview */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { icon: Users, label: t("admin.totalUsers"), value: allProfiles.length, color: "text-foreground" },
                { icon: Car, label: t("admin.totalDrivers"), value: drivers.length, color: "text-accent-foreground" },
                { icon: Package, label: t("admin.totalDeliveries"), value: deliveries.length, color: "text-primary" },
                { icon: TrendingUp, label: t("admin.activeTrips"), value: activeTrips.length, color: "text-foreground" },
              ].map((s) => (
                <Card key={s.label} className="shadow-card">
                  <CardContent className="flex items-center gap-4 p-5">
                    <div className="flex h-11 w-11 items-center justify-center rounded-lg gradient-primary">
                      <s.icon className="h-5 w-5 text-primary-foreground" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{s.label}</p>
                      <p className={`text-2xl font-bold font-display ${s.color}`}>{s.value}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Card className="shadow-card">
                <CardContent className="flex items-center gap-4 p-5">
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg gradient-accent">
                    <CheckCircle2 className="h-5 w-5 text-primary-foreground" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{t("admin.deliveredToday")}</p>
                    <p className="text-2xl font-bold font-display">{deliveredToday.length}</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="shadow-card">
                <CardContent className="flex items-center gap-4 p-5">
                  <Ruler className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-xs text-muted-foreground">{t("admin.avgDistance")}</p>
                    <p className="text-xl font-bold font-display">{avgDistance} km</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="shadow-card">
                <CardContent className="flex items-center gap-4 p-5">
                  <Clock className="h-5 w-5 text-accent-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">{t("admin.avgTime")}</p>
                    <p className="text-xl font-bold font-display">{avgTime} min</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="shadow-card">
                <CardContent className="flex items-center gap-4 p-5">
                  <Layers className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-xs text-muted-foreground">{t("admin.poolingEfficiency")}</p>
                    <p className="text-xl font-bold font-display">{poolingEfficiency}%</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Users */}
        {activeTab === "users" && (
          <Card className="shadow-card">
            <CardHeader><CardTitle className="font-display">{t("nav.users")} ({allProfiles.length})</CardTitle></CardHeader>
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
        )}

        {/* Drivers */}
        {activeTab === "drivers" && (
          <Card className="shadow-card">
            <CardHeader><CardTitle className="font-display">{t("nav.drivers")} ({drivers.length})</CardTitle></CardHeader>
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
                            <Badge className="bg-primary/10 text-primary gap-1"><CheckCircle2 className="h-3 w-3" /> {t("common.available")}</Badge>
                          ) : (
                            <Badge variant="secondary" className="gap-1"><XCircle className="h-3 w-3" /> {t("common.offline")}</Badge>
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
                                <div className="grid grid-cols-2 gap-4">
                                  <div><p className="text-sm text-muted-foreground">Name</p><p className="font-semibold">{selectedDriver.name}</p></div>
                                  <div><p className="text-sm text-muted-foreground">Email</p><p className="font-semibold">{selectedDriver.email}</p></div>
                                  <div><p className="text-sm text-muted-foreground">Mobile</p><p className="font-semibold">{selectedDriver.mobile || "—"}</p></div>
                                  <div><p className="text-sm text-muted-foreground">Status</p><p className="font-semibold">{selectedDriver.dp?.is_available ? t("common.available") : t("common.offline")}</p></div>
                                  <div><p className="text-sm text-muted-foreground">Vehicle</p><p className="font-semibold">{selectedDriver.dp?.vehicle_number || "Not set"}</p></div>
                                  <div><p className="text-sm text-muted-foreground">Type</p><p className="font-semibold">{selectedDriver.dp?.vehicle_type || "Not set"}</p></div>
                                  <div><p className="text-sm text-muted-foreground">Fuel Efficiency</p><p className="font-semibold">{selectedDriver.dp?.fuel_efficiency ? `${selectedDriver.dp.fuel_efficiency} km/l` : "Not set"}</p></div>
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
        )}

        {/* Deliveries */}
        {activeTab === "deliveries" && (
          <Card className="shadow-card">
            <CardHeader><CardTitle className="font-display">{t("admin.totalDeliveries")} ({deliveries.length})</CardTitle></CardHeader>
            <CardContent>
              {deliveries.length === 0 ? (
                <p className="py-8 text-center text-muted-foreground">{t("common.noData")}</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Pickup</TableHead>
                      <TableHead>Dropoff</TableHead>
                      <TableHead>Distance</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {deliveries.map((d) => (
                      <TableRow key={d.id}>
                        <TableCell className="max-w-[200px] truncate">{d.pickup_address}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{d.dropoff_address}</TableCell>
                        <TableCell>{d.distance_km || 0} km</TableCell>
                        <TableCell><Badge variant="secondary">{d.status}</Badge></TableCell>
                        <TableCell className="text-sm text-muted-foreground">{new Date(d.created_at).toLocaleDateString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        )}

        {/* Analytics */}
        {activeTab === "analytics" && (
          <div className="space-y-6">
            {/* Fuel & pooling stats */}
            <div className="grid gap-4 sm:grid-cols-3">
              <Card className="shadow-card">
                <CardContent className="flex items-center gap-4 p-5">
                  <Fuel className="h-8 w-8 text-destructive" />
                  <div>
                    <p className="text-xs text-muted-foreground">{t("admin.totalFuel")}</p>
                    <p className="text-xl font-bold font-display">₹{totalFuelCost.toFixed(0)}</p>
                    <p className="text-xs text-muted-foreground">Avg efficiency: {avgFuelEfficiency.toFixed(1)} km/l</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="shadow-card">
                <CardContent className="flex items-center gap-4 p-5">
                  <Layers className="h-8 w-8 text-primary" />
                  <div>
                    <p className="text-xs text-muted-foreground">{t("admin.poolingEfficiency")}</p>
                    <p className="text-xl font-bold font-display">{poolingEfficiency}%</p>
                    <p className="text-xs text-muted-foreground">{poolableCount} of {deliveries.length} poolable</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="shadow-card">
                <CardContent className="flex items-center gap-4 p-5">
                  <TrendingUp className="h-8 w-8 text-accent-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Total Distance</p>
                    <p className="text-xl font-bold font-display">{totalDistance.toFixed(0)} km</p>
                    <p className="text-xs text-muted-foreground">{deliveries.length} total deliveries</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              {/* Delivery Trends */}
              <Card className="shadow-card">
                <CardHeader><CardTitle className="font-display text-base">{t("admin.deliveryTrends")}</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={trendData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                      <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                      <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
                      <Line type="monotone" dataKey="count" stroke="hsl(174, 62%, 38%)" strokeWidth={2} dot={{ r: 4 }} name="Deliveries" />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Status Breakdown */}
              <Card className="shadow-card">
                <CardHeader><CardTitle className="font-display text-base">{t("admin.statusBreakdown")}</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie data={statusCounts} cx="50%" cy="50%" outerRadius={100} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                        {statusCounts.map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default AdminDashboard;
