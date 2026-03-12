import { useEffect, useRef, useState, useMemo } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, MapPin, IndianRupee, Ruler, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { fetchRoute } from "@/components/DeliveryMap";
import { calculateDeliveryPrice } from "@/utils/pricing";

interface Delivery {
  id: string;
  pickup_address: string;
  dropoff_address: string;
  pickup_lat: number | null;
  pickup_lng: number | null;
  dropoff_lat: number | null;
  dropoff_lng: number | null;
  distance_km: number | null;
  estimated_cost: number | null;
  package_weight: number | null;
  status: string;
  driver_id: string | null;
  completed_at: string | null;
  created_at: string;
}

interface DriverProfile {
  user_id: string;
  fuel_efficiency: number | null;
}

interface ProfitPerKmMapProps {
  deliveries: Delivery[];
  driverProfiles: DriverProfile[];
}

interface RouteData {
  delivery: Delivery;
  profitPerKm: number;
  revenue: number;
  fuelCost: number;
  netProfit: number;
  route: { lat: number; lng: number }[];
}

// Color scale: red (low profit) → yellow (mid) → green (high)
function getProfitColor(profitPerKm: number, min: number, max: number): string {
  if (max === min) return "hsl(120, 70%, 45%)";
  const ratio = Math.max(0, Math.min(1, (profitPerKm - min) / (max - min)));
  // Red (0) → Orange (0.33) → Yellow (0.66) → Green (1)
  if (ratio < 0.33) {
    return `hsl(${Math.round(ratio * 3 * 40)}, 80%, 50%)`;
  } else if (ratio < 0.66) {
    return `hsl(${40 + Math.round((ratio - 0.33) * 3 * 20)}, 85%, 50%)`;
  }
  return `hsl(${60 + Math.round((ratio - 0.66) * 3 * 60)}, 70%, 45%)`;
}

const FUEL_PRICE_PER_LITER = 105; // ₹ approximate

export default function ProfitPerKmMap({ deliveries, driverProfiles }: ProfitPerKmMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const layerGroup = useRef<L.LayerGroup | null>(null);
  const [routesData, setRoutesData] = useState<RouteData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRoute, setSelectedRoute] = useState<RouteData | null>(null);

  // Only completed deliveries with coords
  const completedDeliveries = useMemo(
    () =>
      deliveries.filter(
        (d) =>
          d.status === "delivered" &&
          d.pickup_lat && d.pickup_lng &&
          d.dropoff_lat && d.dropoff_lng &&
          (d.distance_km || 0) > 0
      ),
    [deliveries]
  );

  // Calculate profit data
  useEffect(() => {
    if (completedDeliveries.length === 0) {
      setRoutesData([]);
      setLoading(false);
      return;
    }

    const calculateRoutes = async () => {
      setLoading(true);
      const results: RouteData[] = [];

      // Process deliveries (limit to 20 to avoid API spam)
      const toProcess = completedDeliveries.slice(0, 20);

      for (const d of toProcess) {
        const pickup = { lat: d.pickup_lat!, lng: d.pickup_lng! };
        const dropoff = { lat: d.dropoff_lat!, lng: d.dropoff_lng! };

        // Get revenue
        const pricing = calculateDeliveryPrice(d.distance_km || 0, d.package_weight || 0);
        const revenue = d.estimated_cost || pricing.total;

        // Get fuel cost
        const driverProfile = driverProfiles.find((dp) => dp.user_id === d.driver_id);
        const fuelEff = driverProfile?.fuel_efficiency || 15; // default 15 km/l
        const fuelCost = ((d.distance_km || 0) / fuelEff) * FUEL_PRICE_PER_LITER;

        const netProfit = revenue - fuelCost;
        const profitPerKm = (d.distance_km || 1) > 0 ? netProfit / (d.distance_km || 1) : 0;

        try {
          const route = await fetchRoute(pickup, dropoff);
          results.push({ delivery: d, profitPerKm, revenue, fuelCost, netProfit, route });
        } catch {
          results.push({ delivery: d, profitPerKm, revenue, fuelCost, netProfit, route: [pickup, dropoff] });
        }
      }

      setRoutesData(results);
      setLoading(false);
    };

    calculateRoutes();
  }, [completedDeliveries, driverProfiles]);

  // Stats
  const stats = useMemo(() => {
    if (routesData.length === 0) return null;
    const profits = routesData.map((r) => r.profitPerKm);
    const min = Math.min(...profits);
    const max = Math.max(...profits);
    const avg = profits.reduce((s, p) => s + p, 0) / profits.length;
    const totalProfit = routesData.reduce((s, r) => s + r.netProfit, 0);
    const totalRevenue = routesData.reduce((s, r) => s + r.revenue, 0);
    const bestRoute = routesData.reduce((b, r) => (r.profitPerKm > b.profitPerKm ? r : b));
    const worstRoute = routesData.reduce((w, r) => (r.profitPerKm < w.profitPerKm ? r : w));
    return { min, max, avg, totalProfit, totalRevenue, bestRoute, worstRoute };
  }, [routesData]);

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    const map = L.map(mapRef.current, {
      center: [19.2952, 72.8544],
      zoom: 12,
      scrollWheelZoom: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    layerGroup.current = L.layerGroup().addTo(map);
    mapInstance.current = map;

    return () => {
      map.remove();
      mapInstance.current = null;
    };
  }, []);

  // Draw routes on map
  useEffect(() => {
    const map = mapInstance.current;
    const lg = layerGroup.current;
    if (!map || !lg || !stats) return;

    lg.clearLayers();

    routesData.forEach((rd) => {
      const color = getProfitColor(rd.profitPerKm, stats.min, stats.max);
      const isSelected = selectedRoute?.delivery.id === rd.delivery.id;

      const polyline = L.polyline(
        rd.route.map((p) => [p.lat, p.lng] as [number, number]),
        {
          color,
          weight: isSelected ? 6 : 4,
          opacity: isSelected ? 1 : 0.7,
        }
      ).addTo(lg);

      polyline.bindPopup(
        `<div style="font-family:system-ui;min-width:200px">
          <div style="font-weight:700;margin-bottom:6px;font-size:13px">₹${rd.profitPerKm.toFixed(1)}/km</div>
          <div style="font-size:11px;color:#666;margin-bottom:2px">📍 ${rd.delivery.pickup_address?.slice(0, 40)}...</div>
          <div style="font-size:11px;color:#666;margin-bottom:6px">🏁 ${rd.delivery.dropoff_address?.slice(0, 40)}...</div>
          <div style="display:flex;gap:12px;font-size:11px">
            <span>Revenue: ₹${rd.revenue}</span>
            <span>Fuel: ₹${rd.fuelCost.toFixed(0)}</span>
          </div>
          <div style="font-weight:600;font-size:12px;margin-top:4px;color:${rd.netProfit >= 0 ? '#16a34a' : '#dc2626'}">
            Net: ₹${rd.netProfit.toFixed(0)} | ${rd.delivery.distance_km} km
          </div>
        </div>`
      );

      polyline.on("click", () => setSelectedRoute(rd));

      // Start/end markers
      const startIcon = L.circleMarker(
        [rd.delivery.pickup_lat!, rd.delivery.pickup_lng!],
        { radius: 5, fillColor: color, color: "#fff", weight: 2, fillOpacity: 1 }
      ).addTo(lg);

      const endIcon = L.circleMarker(
        [rd.delivery.dropoff_lat!, rd.delivery.dropoff_lng!],
        { radius: 5, fillColor: color, color: "#333", weight: 2, fillOpacity: 1 }
      ).addTo(lg);
    });

    // Fit bounds
    if (routesData.length > 0) {
      const allPoints = routesData.flatMap((rd) => rd.route.map((p) => [p.lat, p.lng] as [number, number]));
      if (allPoints.length > 0) {
        map.fitBounds(L.latLngBounds(allPoints), { padding: [30, 30] });
      }
    }

    map.invalidateSize();
  }, [routesData, stats, selectedRoute]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Analyzing route profitability...</p>
        </div>
      </div>
    );
  }

  if (completedDeliveries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <TrendingUp className="mb-4 h-12 w-12 text-muted-foreground/40" />
        <p className="text-muted-foreground">No completed deliveries to analyze</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary stats */}
      {stats && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="shadow-card">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg gradient-primary">
                <IndianRupee className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Avg Profit/Km</p>
                <p className="text-2xl font-bold font-display text-primary">₹{stats.avg.toFixed(1)}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                <ArrowUpRight className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Best Route</p>
                <p className="text-xl font-bold font-display text-emerald-600">₹{stats.bestRoute.profitPerKm.toFixed(1)}/km</p>
                <p className="text-[10px] text-muted-foreground truncate max-w-[140px]">{stats.bestRoute.delivery.dropoff_address?.slice(0, 25)}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-red-100 dark:bg-red-900/30">
                <ArrowDownRight className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Worst Route</p>
                <p className="text-xl font-bold font-display text-red-600">₹{stats.worstRoute.profitPerKm.toFixed(1)}/km</p>
                <p className="text-[10px] text-muted-foreground truncate max-w-[140px]">{stats.worstRoute.delivery.dropoff_address?.slice(0, 25)}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg gradient-accent">
                <TrendingUp className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Net Profit</p>
                <p className={`text-2xl font-bold font-display ${stats.totalProfit >= 0 ? "text-primary" : "text-destructive"}`}>
                  ₹{stats.totalProfit.toFixed(0)}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Map */}
        <Card className="shadow-card overflow-hidden lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="font-display text-base flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" />
              Profit Per Kilometer — Route Map
            </CardTitle>
            <p className="text-xs text-muted-foreground">Click a route to see details. Colors: 🔴 Low → 🟡 Mid → 🟢 High profit/km</p>
          </CardHeader>
          <CardContent className="p-0">
            <div ref={mapRef} style={{ height: "500px", width: "100%", borderRadius: "0 0 var(--radius) var(--radius)" }} />
          </CardContent>
        </Card>

        {/* Route list */}
        <Card className="shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="font-display text-base">All Routes ({routesData.length})</CardTitle>
          </CardHeader>
          <CardContent className="max-h-[500px] overflow-y-auto space-y-2 p-3">
            {routesData
              .sort((a, b) => b.profitPerKm - a.profitPerKm)
              .map((rd) => {
                const color = stats ? getProfitColor(rd.profitPerKm, stats.min, stats.max) : "#666";
                const isSelected = selectedRoute?.delivery.id === rd.delivery.id;
                return (
                  <div
                    key={rd.delivery.id}
                    onClick={() => setSelectedRoute(rd)}
                    className={`rounded-lg border p-3 cursor-pointer transition-all ${
                      isSelected ? "border-primary bg-primary/5 shadow-md" : "border-border hover:border-primary/40"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: color }} />
                        <span className="text-sm font-bold" style={{ color }}>
                          ₹{rd.profitPerKm.toFixed(1)}/km
                        </span>
                      </div>
                      <Badge variant="secondary" className="text-[10px]">
                        {rd.delivery.distance_km} km
                      </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {rd.delivery.pickup_address?.slice(0, 30)} → {rd.delivery.dropoff_address?.slice(0, 25)}
                    </p>
                    <div className="flex gap-3 mt-1 text-[10px] text-muted-foreground">
                      <span>Rev: ₹{rd.revenue}</span>
                      <span>Fuel: ₹{rd.fuelCost.toFixed(0)}</span>
                      <span className={rd.netProfit >= 0 ? "text-primary font-semibold" : "text-destructive font-semibold"}>
                        Net: ₹{rd.netProfit.toFixed(0)}
                      </span>
                    </div>
                  </div>
                );
              })}
          </CardContent>
        </Card>
      </div>

      {/* Legend */}
      {stats && (
        <Card className="shadow-card">
          <CardContent className="flex flex-wrap items-center gap-6 p-4">
            <span className="text-sm font-medium">Profit Scale:</span>
            <div className="flex items-center gap-1">
              {Array.from({ length: 10 }, (_, i) => {
                const val = stats.min + ((stats.max - stats.min) * i) / 9;
                return (
                  <div
                    key={i}
                    className="h-4 w-6 rounded-sm"
                    style={{ backgroundColor: getProfitColor(val, stats.min, stats.max) }}
                    title={`₹${val.toFixed(1)}/km`}
                  />
                );
              })}
            </div>
            <div className="flex gap-4 text-xs text-muted-foreground">
              <span>₹{stats.min.toFixed(1)}/km (Low)</span>
              <span>→</span>
              <span>₹{stats.max.toFixed(1)}/km (High)</span>
            </div>
            <span className="text-xs text-muted-foreground ml-auto">
              Showing {routesData.length} of {completedDeliveries.length} completed deliveries
            </span>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
