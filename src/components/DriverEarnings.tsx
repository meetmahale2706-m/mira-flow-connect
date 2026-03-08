import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { BarChart3, Fuel, Truck, IndianRupee, TrendingUp, Package, Calendar, ArrowUpRight, ArrowDownRight, Gauge } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, AreaChart, Area, Legend } from "recharts";
import { useI18n } from "@/contexts/I18nContext";

interface Props {
  deliveries: any[];
  fuelEfficiency: number;
}

const FUEL_PRICE_DEFAULT = 105; // ₹/litre default

export default function DriverEarnings({ deliveries, fuelEfficiency: savedEfficiency }: Props) {
  const { t } = useI18n();
  const [mileage, setMileage] = useState(savedEfficiency > 0 ? String(savedEfficiency) : "");
  const [fuelPrice, setFuelPrice] = useState(String(FUEL_PRICE_DEFAULT));
  const [period, setPeriod] = useState<"daily" | "monthly">("daily");

  const mileageVal = parseFloat(mileage) || 0;
  const fuelPriceVal = parseFloat(fuelPrice) || FUEL_PRICE_DEFAULT;

  const completedDeliveries = deliveries.filter((d) => d.status === "delivered");

  const calcFuelCost = (distKm: number) => {
    if (mileageVal <= 0) return 0;
    const litres = distKm / mileageVal;
    return litres * fuelPriceVal;
  };

  // Commission rate: use estimated_cost if available, else ₹15/km
  const getEarning = (d: any) => d.estimated_cost > 0 ? d.estimated_cost * 0.7 : (d.distance_km || 0) * 15;

  const stats = useMemo(() => {
    const totalTrips = completedDeliveries.length;
    const totalDistance = completedDeliveries.reduce((s, d) => s + (d.distance_km || 0), 0);
    const totalEarnings = completedDeliveries.reduce((s, d) => s + getEarning(d), 0);
    const totalFuelCost = calcFuelCost(totalDistance);
    const netProfit = totalEarnings - totalFuelCost;
    const profitPerKm = totalDistance > 0 ? netProfit / totalDistance : 0;
    const profitPerTrip = totalTrips > 0 ? netProfit / totalTrips : 0;
    return { totalTrips, totalDistance, totalEarnings, totalFuelCost, netProfit, profitPerKm, profitPerTrip };
  }, [completedDeliveries, mileageVal, fuelPriceVal]);

  // Daily aggregation
  const dailyData = useMemo(() => {
    const map = new Map<string, { earnings: number; fuel: number; trips: number; distance: number }>();
    completedDeliveries.forEach((d) => {
      const dateStr = d.completed_at
        ? new Date(d.completed_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })
        : "N/A";
      const existing = map.get(dateStr) || { earnings: 0, fuel: 0, trips: 0, distance: 0 };
      const dist = d.distance_km || 0;
      existing.earnings += getEarning(d);
      existing.fuel += calcFuelCost(dist);
      existing.trips += 1;
      existing.distance += dist;
      map.set(dateStr, existing);
    });
    return Array.from(map.entries()).map(([date, data]) => ({
      date,
      earnings: Math.round(data.earnings),
      fuel: Math.round(data.fuel),
      profit: Math.round(data.earnings - data.fuel),
      trips: data.trips,
      distance: parseFloat(data.distance.toFixed(1)),
    })).slice(-14);
  }, [completedDeliveries, mileageVal, fuelPriceVal]);

  // Monthly aggregation
  const monthlyData = useMemo(() => {
    const map = new Map<string, { earnings: number; fuel: number; trips: number; distance: number }>();
    completedDeliveries.forEach((d) => {
      const dateStr = d.completed_at
        ? new Date(d.completed_at).toLocaleDateString("en-IN", { month: "short", year: "2-digit" })
        : "N/A";
      const existing = map.get(dateStr) || { earnings: 0, fuel: 0, trips: 0, distance: 0 };
      const dist = d.distance_km || 0;
      existing.earnings += getEarning(d);
      existing.fuel += calcFuelCost(dist);
      existing.trips += 1;
      existing.distance += dist;
      map.set(dateStr, existing);
    });
    return Array.from(map.entries()).map(([month, data]) => ({
      month,
      earnings: Math.round(data.earnings),
      fuel: Math.round(data.fuel),
      profit: Math.round(data.earnings - data.fuel),
      trips: data.trips,
      distance: parseFloat(data.distance.toFixed(1)),
    }));
  }, [completedDeliveries, mileageVal, fuelPriceVal]);

  // Today's stats
  const todayStats = useMemo(() => {
    const today = new Date().toDateString();
    const todayDeliveries = completedDeliveries.filter(
      (d) => d.completed_at && new Date(d.completed_at).toDateString() === today
    );
    const earnings = todayDeliveries.reduce((s, d) => s + getEarning(d), 0);
    const distance = todayDeliveries.reduce((s, d) => s + (d.distance_km || 0), 0);
    const fuel = calcFuelCost(distance);
    return { trips: todayDeliveries.length, earnings, fuel, profit: earnings - fuel, distance };
  }, [completedDeliveries, mileageVal, fuelPriceVal]);

  // This month stats
  const thisMonthStats = useMemo(() => {
    const now = new Date();
    const monthDeliveries = completedDeliveries.filter(
      (d) => d.completed_at && new Date(d.completed_at).getMonth() === now.getMonth() && new Date(d.completed_at).getFullYear() === now.getFullYear()
    );
    const earnings = monthDeliveries.reduce((s, d) => s + getEarning(d), 0);
    const distance = monthDeliveries.reduce((s, d) => s + (d.distance_km || 0), 0);
    const fuel = calcFuelCost(distance);
    return { trips: monthDeliveries.length, earnings, fuel, profit: earnings - fuel, distance };
  }, [completedDeliveries, mileageVal, fuelPriceVal]);

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

  const chartData = period === "daily" ? dailyData : monthlyData;
  const dateKey = period === "daily" ? "date" : "month";
  const currentStats = period === "daily" ? todayStats : thisMonthStats;
  const periodLabel = period === "daily" ? "Today" : "This Month";

  return (
    <div className="space-y-6">
      {/* Mileage & Fuel Price Input */}
      <Card className="shadow-card border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="font-display text-base flex items-center gap-2">
            <Gauge className="h-5 w-5 text-primary" />
            Fuel & Mileage Calculator
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4 items-end">
            <div>
              <Label className="text-xs">Vehicle Mileage (km/l)</Label>
              <Input
                type="number"
                step="0.1"
                min="1"
                placeholder="e.g. 15"
                value={mileage}
                onChange={(e) => setMileage(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Fuel Price (₹/litre)</Label>
              <Input
                type="number"
                step="0.5"
                min="1"
                placeholder="e.g. 105"
                value={fuelPrice}
                onChange={(e) => setFuelPrice(e.target.value)}
                className="mt-1"
              />
            </div>
            <div className="sm:col-span-2 flex items-center gap-3 flex-wrap">
              {mileageVal > 0 && (
                <>
                  <Badge variant="secondary" className="gap-1.5 px-3 py-1.5">
                    <Fuel className="h-3.5 w-3.5" /> {mileageVal} km/l
                  </Badge>
                  <Badge variant="secondary" className="gap-1.5 px-3 py-1.5">
                    <IndianRupee className="h-3.5 w-3.5" /> ₹{fuelPriceVal}/L
                  </Badge>
                  <Badge variant="secondary" className="gap-1.5 px-3 py-1.5">
                    Cost/km: ₹{(fuelPriceVal / mileageVal).toFixed(1)}
                  </Badge>
                </>
              )}
              {mileageVal <= 0 && (
                <p className="text-xs text-muted-foreground">
                  ⚡ Enter your vehicle mileage to see accurate profit calculations
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Period Toggle + Current Period Summary */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <Tabs value={period} onValueChange={(v) => setPeriod(v as "daily" | "monthly")}>
          <TabsList>
            <TabsTrigger value="daily" className="gap-1.5">
              <Calendar className="h-3.5 w-3.5" /> Daily
            </TabsTrigger>
            <TabsTrigger value="monthly" className="gap-1.5">
              <Calendar className="h-3.5 w-3.5" /> Monthly
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <Badge className={`text-sm px-4 py-1.5 ${stats.netProfit >= 0 ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"}`}>
          Overall Net Profit: ₹{Math.round(stats.netProfit).toLocaleString()}
        </Badge>
      </div>

      {/* Period KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card className="shadow-card">
          <CardContent className="p-4">
            <p className="text-[11px] text-muted-foreground">{periodLabel} Trips</p>
            <p className="text-2xl font-bold font-display text-foreground">{currentStats.trips}</p>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="p-4">
            <p className="text-[11px] text-muted-foreground">{periodLabel} Earnings</p>
            <p className="text-2xl font-bold font-display text-primary flex items-center gap-1">
              <ArrowUpRight className="h-4 w-4" /> ₹{Math.round(currentStats.earnings).toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="p-4">
            <p className="text-[11px] text-muted-foreground">{periodLabel} Fuel Cost</p>
            <p className="text-2xl font-bold font-display text-destructive flex items-center gap-1">
              <ArrowDownRight className="h-4 w-4" /> ₹{Math.round(currentStats.fuel).toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="p-4">
            <p className="text-[11px] text-muted-foreground">{periodLabel} Distance</p>
            <p className="text-2xl font-bold font-display text-accent-foreground">{currentStats.distance.toFixed(1)} km</p>
          </CardContent>
        </Card>
        <Card className="shadow-card border-primary/20">
          <CardContent className="p-4">
            <p className="text-[11px] text-muted-foreground">{periodLabel} Net Profit</p>
            <p className={`text-2xl font-bold font-display ${currentStats.profit >= 0 ? "text-primary" : "text-destructive"}`}>
              ₹{Math.round(currentStats.profit).toLocaleString()}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Overall stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { icon: Truck, label: t("earnings.totalTrips"), value: stats.totalTrips, color: "text-foreground" },
          { icon: TrendingUp, label: t("earnings.totalDistance"), value: `${stats.totalDistance.toFixed(1)} km`, color: "text-accent-foreground" },
          { icon: Fuel, label: t("earnings.totalFuelCost"), value: `₹${Math.round(stats.totalFuelCost).toLocaleString()}`, color: "text-destructive" },
          { icon: IndianRupee, label: t("earnings.totalEarnings"), value: `₹${Math.round(stats.totalEarnings).toLocaleString()}`, color: "text-primary" },
        ].map((s) => (
          <Card key={s.label} className="shadow-card">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg gradient-primary">
                <s.icon className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className={`text-xl font-bold font-display ${s.color}`}>{s.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Profit breakdown */}
      {mileageVal > 0 && (
        <Card className="shadow-card border-primary/20 bg-primary/5">
          <CardContent className="p-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold">Profit Summary</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Based on {mileageVal} km/l mileage × ₹{fuelPriceVal}/L fuel price
                </p>
              </div>
              <div className="flex gap-6 text-center">
                <div>
                  <p className="text-xs text-muted-foreground">Profit/km</p>
                  <p className={`text-lg font-bold font-display ${stats.profitPerKm >= 0 ? "text-primary" : "text-destructive"}`}>
                    ₹{stats.profitPerKm.toFixed(1)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Profit/trip</p>
                  <p className={`text-lg font-bold font-display ${stats.profitPerTrip >= 0 ? "text-primary" : "text-destructive"}`}>
                    ₹{Math.round(stats.profitPerTrip)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Fuel % of Revenue</p>
                  <p className="text-lg font-bold font-display text-destructive">
                    {stats.totalEarnings > 0 ? Math.round((stats.totalFuelCost / stats.totalEarnings) * 100) : 0}%
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Earnings vs Fuel vs Profit */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="font-display text-base">
              {period === "daily" ? t("earnings.dailyEarnings") : "Monthly Earnings"} vs Fuel vs Profit
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey={dateKey} tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} />
                <Legend wrapperStyle={{ fontSize: "11px" }} />
                <Bar dataKey="earnings" fill="hsl(174, 62%, 38%)" radius={[4, 4, 0, 0]} name="Earnings (₹)" />
                <Bar dataKey="fuel" fill="hsl(0, 84%, 60%)" radius={[4, 4, 0, 0]} name="Fuel Cost (₹)" />
                <Bar dataKey="profit" fill="hsl(38, 92%, 50%)" radius={[4, 4, 0, 0]} name="Profit (₹)" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Profit Trend */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="font-display text-base">{t("earnings.profitPerDelivery")} Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey={dateKey} tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} />
                <defs>
                  <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(174, 62%, 38%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(174, 62%, 38%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="profit" stroke="hsl(174, 62%, 38%)" fill="url(#profitGrad)" strokeWidth={2} name="Net Profit (₹)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
