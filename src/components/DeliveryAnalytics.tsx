import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell } from "recharts";
import { Clock, TrendingUp, Truck, Zap, Package, MapPin, Fuel, Star } from "lucide-react";

const COLORS = ["hsl(174, 62%, 38%)", "hsl(38, 92%, 50%)", "hsl(220, 25%, 14%)", "hsl(0, 84%, 60%)", "hsl(210, 15%, 60%)"];

interface Props {
  deliveries: any[];
  driverProfiles?: any[];
  ratings?: any[];
}

export default function DeliveryAnalytics({ deliveries, driverProfiles = [], ratings = [] }: Props) {
  // Peak hours analysis
  const hourCounts = new Array(24).fill(0);
  deliveries.forEach((d) => {
    const h = new Date(d.created_at).getHours();
    hourCounts[h]++;
  });
  const peakHourData = hourCounts.map((count, hour) => ({
    hour: `${hour.toString().padStart(2, "0")}:00`,
    deliveries: count,
  })).filter((_, i) => i >= 6 && i <= 23);

  const peakHour = hourCounts.indexOf(Math.max(...hourCounts));

  // Avg delivery time
  const completedDeliveries = deliveries.filter((d) => d.started_at && d.completed_at);
  const avgDeliveryTime = completedDeliveries.length > 0
    ? Math.round(completedDeliveries.reduce((sum, d) => {
        const diff = (new Date(d.completed_at).getTime() - new Date(d.started_at).getTime()) / 60000;
        return sum + diff;
      }, 0) / completedDeliveries.length)
    : 0;

  // Daily revenue
  const revenueMap = new Map<string, number>();
  deliveries.forEach((d) => {
    const date = new Date(d.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
    revenueMap.set(date, (revenueMap.get(date) || 0) + (d.estimated_cost || 0));
  });
  const revenueData = Array.from(revenueMap.entries()).map(([date, revenue]) => ({ date, revenue })).slice(-14);

  // Distance distribution
  const distRanges = [
    { name: "0-5 km", min: 0, max: 5 },
    { name: "5-10 km", min: 5, max: 10 },
    { name: "10-20 km", min: 10, max: 20 },
    { name: "20+ km", min: 20, max: 999 },
  ];
  const distData = distRanges.map((r) => ({
    name: r.name,
    value: deliveries.filter((d) => (d.distance_km || 0) >= r.min && (d.distance_km || 0) < r.max).length,
  })).filter((d) => d.value > 0);

  // Driver performance
  const driverDeliveryCount = new Map<string, number>();
  deliveries.filter((d) => d.driver_id && d.status === "delivered").forEach((d) => {
    driverDeliveryCount.set(d.driver_id, (driverDeliveryCount.get(d.driver_id) || 0) + 1);
  });
  const topDrivers = Array.from(driverDeliveryCount.entries())
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([id, count], i) => ({ name: `Driver ${i + 1}`, deliveries: count }));

  // Stats
  const totalRevenue = deliveries.reduce((s, d) => s + (d.estimated_cost || 0), 0);
  const totalDistance = deliveries.reduce((s, d) => s + (d.distance_km || 0), 0);
  const avgRating = ratings.length > 0
    ? (ratings.reduce((s, r) => s + r.rating, 0) / ratings.length).toFixed(1)
    : "N/A";
  const onTimeRate = completedDeliveries.length > 0
    ? Math.round((completedDeliveries.filter((d) => {
        const mins = (new Date(d.completed_at).getTime() - new Date(d.started_at).getTime()) / 60000;
        return mins <= (d.estimated_time_mins || 60);
      }).length / completedDeliveries.length) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { icon: TrendingUp, label: "Total Revenue", value: `₹${totalRevenue.toLocaleString()}`, color: "text-primary" },
          { icon: Clock, label: "Avg Delivery Time", value: avgDeliveryTime > 0 ? `${avgDeliveryTime} min` : "N/A", color: "text-accent-foreground" },
          { icon: Star, label: "Avg Rating", value: avgRating, color: "text-amber-500" },
          { icon: Zap, label: "On-Time Rate", value: `${onTimeRate}%`, color: "text-primary" },
        ].map((kpi) => (
          <Card key={kpi.label} className="shadow-card">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg gradient-primary">
                <kpi.icon className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{kpi.label}</p>
                <p className={`text-2xl font-bold font-display ${kpi.color}`}>{kpi.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Revenue Trend */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="font-display text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" /> Revenue Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            {revenueData.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No data yet</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} />
                  <defs>
                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(174, 62%, 38%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(174, 62%, 38%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area type="monotone" dataKey="revenue" stroke="hsl(174, 62%, 38%)" fill="url(#revGrad)" strokeWidth={2} name="Revenue (₹)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Peak Hours */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="font-display text-base flex items-center gap-2">
              <Clock className="h-4 w-4 text-accent-foreground" /> Peak Hours
              {peakHour >= 0 && <Badge variant="secondary" className="text-xs ml-auto">Peak: {peakHour}:00</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {peakHourData.every((d) => d.deliveries === 0) ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No data yet</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={peakHourData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="hour" tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" interval={1} />
                  <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} />
                  <Bar dataKey="deliveries" fill="hsl(38, 92%, 50%)" radius={[4, 4, 0, 0]} name="Orders" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Distance Distribution */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="font-display text-base flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" /> Distance Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            {distData.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No data yet</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={distData} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                    {distData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Top Drivers */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="font-display text-base flex items-center gap-2">
              <Truck className="h-4 w-4 text-accent-foreground" /> Top Performing Drivers
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topDrivers.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No completed deliveries yet</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={topDrivers} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" width={70} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} />
                  <Bar dataKey="deliveries" fill="hsl(174, 62%, 38%)" radius={[0, 4, 4, 0]} name="Completed" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
