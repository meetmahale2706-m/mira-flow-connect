import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart3, Fuel, Truck, IndianRupee, TrendingUp, Package } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { calculateRouteCost } from "@/utils/deliveryPooling";
import { useI18n } from "@/contexts/I18nContext";

interface Props {
  deliveries: any[];
  fuelEfficiency: number;
}

export default function DriverEarnings({ deliveries, fuelEfficiency }: Props) {
  const { t } = useI18n();
  const completedDeliveries = deliveries.filter((d) => d.status === "delivered");

  // Calculate stats
  const totalTrips = completedDeliveries.length;
  const totalDistance = completedDeliveries.reduce((sum, d) => sum + (d.distance_km || 0), 0);
  const totalFuelCost = fuelEfficiency > 0 ? calculateRouteCost(totalDistance, fuelEfficiency) : 0;
  const earningsPerKm = 15; // ₹15/km base rate
  const totalEarnings = parseFloat((totalDistance * earningsPerKm).toFixed(2));
  const profit = totalEarnings - totalFuelCost;

  // Daily aggregation
  const dailyMap = new Map<string, { earnings: number; fuel: number; trips: number }>();
  completedDeliveries.forEach((d) => {
    const date = d.completed_at ? new Date(d.completed_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }) : "N/A";
    const existing = dailyMap.get(date) || { earnings: 0, fuel: 0, trips: 0 };
    const dist = d.distance_km || 0;
    existing.earnings += dist * earningsPerKm;
    existing.fuel += fuelEfficiency > 0 ? calculateRouteCost(dist, fuelEfficiency) : 0;
    existing.trips += 1;
    dailyMap.set(date, existing);
  });

  const dailyData = Array.from(dailyMap.entries())
    .map(([date, data]) => ({
      date,
      earnings: parseFloat(data.earnings.toFixed(0)),
      fuel: parseFloat(data.fuel.toFixed(0)),
      profit: parseFloat((data.earnings - data.fuel).toFixed(0)),
      trips: data.trips,
    }))
    .slice(-14); // Last 14 days

  // Per-delivery breakdown
  const perDeliveryData = completedDeliveries.slice(0, 10).map((d, i) => {
    const dist = d.distance_km || 0;
    const earning = dist * earningsPerKm;
    const fuel = fuelEfficiency > 0 ? calculateRouteCost(dist, fuelEfficiency) : 0;
    return {
      name: `#${i + 1}`,
      earnings: parseFloat(earning.toFixed(0)),
      fuel: parseFloat(fuel.toFixed(0)),
      profit: parseFloat((earning - fuel).toFixed(0)),
    };
  });

  const statCards = [
    { icon: Truck, label: t("earnings.totalTrips"), value: totalTrips, suffix: "", color: "text-primary" },
    { icon: TrendingUp, label: t("earnings.totalDistance"), value: totalDistance.toFixed(1), suffix: " km", color: "text-accent-foreground" },
    { icon: Fuel, label: t("earnings.totalFuelCost"), value: `₹${totalFuelCost.toFixed(0)}`, suffix: "", color: "text-destructive" },
    { icon: IndianRupee, label: t("earnings.totalEarnings"), value: `₹${totalEarnings.toFixed(0)}`, suffix: "", color: "text-primary" },
  ];

  if (completedDeliveries.length === 0) {
    return (
      <Card className="shadow-card">
        <CardContent className="flex flex-col items-center py-12">
          <BarChart3 className="mb-4 h-12 w-12 text-muted-foreground/40" />
          <p className="text-muted-foreground">{t("earnings.noDeliveries")}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((s) => (
          <Card key={s.label} className="shadow-card">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg gradient-primary">
                <s.icon className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className={`text-xl font-bold font-display ${s.color}`}>{s.value}{s.suffix}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Profit badge */}
      <div className="flex items-center gap-3">
        <Badge className={`text-sm px-4 py-1.5 ${profit >= 0 ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"}`}>
          Net Profit: ₹{profit.toFixed(0)}
        </Badge>
        {fuelEfficiency > 0 && (
          <Badge variant="secondary" className="text-sm px-3 py-1.5">
            <Fuel className="h-3.5 w-3.5 mr-1" />{fuelEfficiency} km/l
          </Badge>
        )}
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="font-display text-base">{t("earnings.dailyEarnings")}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }}
                  labelStyle={{ color: "hsl(var(--foreground))" }}
                />
                <Bar dataKey="earnings" fill="hsl(174, 62%, 38%)" radius={[4, 4, 0, 0]} name="Earnings (₹)" />
                <Bar dataKey="fuel" fill="hsl(0, 84%, 60%)" radius={[4, 4, 0, 0]} name="Fuel Cost (₹)" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="font-display text-base">{t("earnings.profitPerDelivery")}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={perDeliveryData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }}
                  labelStyle={{ color: "hsl(var(--foreground))" }}
                />
                <Line type="monotone" dataKey="profit" stroke="hsl(174, 62%, 38%)" strokeWidth={2} dot={{ r: 4 }} name="Profit (₹)" />
                <Line type="monotone" dataKey="fuel" stroke="hsl(0, 84%, 60%)" strokeWidth={2} dot={{ r: 3 }} name="Fuel Cost (₹)" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
