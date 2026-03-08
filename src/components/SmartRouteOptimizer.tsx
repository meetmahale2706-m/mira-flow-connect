import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Zap, TrendingUp, Fuel, Clock, Ruler, AlertTriangle, CheckCircle2,
  IndianRupee, Route, ShieldAlert, ArrowRight, Package, MapPin, Navigation,
} from "lucide-react";
import DeliveryMap, { fetchRoute } from "@/components/DeliveryMap";
import {
  rankDeliveries, buildOptimizedRoute, getRouteSummary,
  OptimizedDelivery,
} from "@/utils/smartRouteOptimizer";

interface LatLng { lat: number; lng: number; }

interface Props {
  deliveries: any[];
  fuelEfficiency: number;
  onAcceptDelivery: (delivery: any) => void;
  onAcceptMultiple?: (deliveries: any[]) => void;
}

export default function SmartRouteOptimizer({ deliveries, fuelEfficiency, onAcceptDelivery, onAcceptMultiple }: Props) {
  const [optimizedRoute, setOptimizedRoute] = useState<OptimizedDelivery[]>([]);
  const [rankedList, setRankedList] = useState<OptimizedDelivery[]>([]);
  const [mapRoute, setMapRoute] = useState<LatLng[]>([]);
  const [selectedDelivery, setSelectedDelivery] = useState<OptimizedDelivery | null>(null);
  const [viewMode, setViewMode] = useState<"ranked" | "optimized">("ranked");

  useEffect(() => {
    if (deliveries.length === 0) return;
    const fe = fuelEfficiency || 12; // Default 12 km/l
    const ranked = rankDeliveries(deliveries, fe);
    setRankedList(ranked);
    const route = buildOptimizedRoute(deliveries, fe);
    setOptimizedRoute(route);
  }, [deliveries, fuelEfficiency]);

  useEffect(() => {
    if (selectedDelivery?.pickup_lat && selectedDelivery?.dropoff_lat) {
      fetchRoute(
        { lat: selectedDelivery.pickup_lat!, lng: selectedDelivery.pickup_lng! },
        { lat: selectedDelivery.dropoff_lat!, lng: selectedDelivery.dropoff_lng! }
      ).then(setMapRoute);
    } else {
      setMapRoute([]);
    }
  }, [selectedDelivery]);

  const currentList = viewMode === "ranked" ? rankedList : optimizedRoute;
  const summary = getRouteSummary(optimizedRoute);

  const riskColor = (risk: "low" | "medium" | "high") => {
    switch (risk) {
      case "low": return "bg-primary/10 text-primary";
      case "medium": return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
      case "high": return "bg-destructive/10 text-destructive";
    }
  };

  const riskIcon = (risk: "low" | "medium" | "high") => {
    switch (risk) {
      case "low": return <CheckCircle2 className="h-3 w-3" />;
      case "medium": return <AlertTriangle className="h-3 w-3" />;
      case "high": return <ShieldAlert className="h-3 w-3" />;
    }
  };

  const efficiencyColor = (score: number) => {
    if (score >= 70) return "text-primary";
    if (score >= 40) return "text-amber-500";
    return "text-destructive";
  };

  if (deliveries.length === 0) {
    return (
      <Card className="shadow-card">
        <CardContent className="flex flex-col items-center py-12">
          <Route className="mb-4 h-12 w-12 text-muted-foreground/40" />
          <p className="text-muted-foreground">No deliveries available to optimize</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Left: Route Analysis */}
      <div className="space-y-4">
        {/* Summary Card */}
        <Card className="shadow-card border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="font-display flex items-center gap-2 text-lg">
              <Zap className="h-5 w-5 text-primary" />
              Smart Route Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-lg border border-border bg-card p-3 text-center">
                <IndianRupee className="mx-auto mb-1 h-4 w-4 text-primary" />
                <p className="text-lg font-bold text-primary">₹{summary.totalProfit}</p>
                <p className="text-[10px] text-muted-foreground">Est. Profit</p>
              </div>
              <div className="rounded-lg border border-border bg-card p-3 text-center">
                <TrendingUp className="mx-auto mb-1 h-4 w-4 text-primary" />
                <p className="text-lg font-bold">₹{summary.totalEarnings}</p>
                <p className="text-[10px] text-muted-foreground">Total Earnings</p>
              </div>
              <div className="rounded-lg border border-border bg-card p-3 text-center">
                <Fuel className="mx-auto mb-1 h-4 w-4 text-destructive" />
                <p className="text-lg font-bold text-destructive">₹{summary.totalFuelCost}</p>
                <p className="text-[10px] text-muted-foreground">Fuel Cost</p>
              </div>
              <div className="rounded-lg border border-border bg-card p-3 text-center">
                <Clock className="mx-auto mb-1 h-4 w-4 text-muted-foreground" />
                <p className="text-lg font-bold">{summary.totalDuration}m</p>
                <p className="text-[10px] text-muted-foreground">Est. Duration</p>
              </div>
            </div>

            {summary.congestionZones.length > 0 && (
              <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950/30">
                <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-400">
                  <AlertTriangle className="h-3.5 w-3.5" /> Traffic Congestion Zones Detected
                </p>
                <div className="flex flex-wrap gap-1">
                  {summary.congestionZones.map((z) => (
                    <Badge key={z} variant="secondary" className="text-[10px] bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300">
                      {z}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {optimizedRoute.length > 1 && onAcceptMultiple && (
              <Button className="mt-3 w-full gap-2" onClick={() => onAcceptMultiple(optimizedRoute)}>
                <Navigation className="h-4 w-4" />
                Accept Optimized Route ({optimizedRoute.length} deliveries)
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Toggle */}
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={viewMode === "ranked" ? "default" : "outline"}
            onClick={() => setViewMode("ranked")}
            className="gap-1.5"
          >
            <TrendingUp className="h-3.5 w-3.5" /> Profit Ranked
          </Button>
          <Button
            size="sm"
            variant={viewMode === "optimized" ? "default" : "outline"}
            onClick={() => setViewMode("optimized")}
            className="gap-1.5"
          >
            <Route className="h-3.5 w-3.5" /> Optimized Route
          </Button>
        </div>

        {/* Delivery List */}
        <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
          {currentList.map((d) => (
            <div
              key={d.id}
              onClick={() => setSelectedDelivery(d)}
              className={`rounded-lg border p-3 cursor-pointer transition-all ${
                selectedDelivery?.id === d.id
                  ? "border-primary bg-primary/5 shadow-md"
                  : "border-border hover:border-primary/40"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${efficiencyColor(d.routeScore.efficiencyScore)} bg-muted`}>
                    {d.sequenceOrder}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{d.pickup_address?.slice(0, 35)}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <ArrowRight className="h-3 w-3 shrink-0" />
                      <span className="truncate">{d.dropoff_address?.slice(0, 35)}</span>
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className={`text-sm font-bold ${d.routeScore.estimatedProfit >= 0 ? "text-primary" : "text-destructive"}`}>
                    {d.routeScore.estimatedProfit >= 0 ? "+" : ""}₹{d.routeScore.estimatedProfit}
                  </p>
                  <p className="text-[10px] text-muted-foreground">profit</p>
                </div>
              </div>

              <div className="mt-2 flex items-center gap-2 flex-wrap">
                <Badge className={`${riskColor(d.routeScore.trafficRisk)} gap-1 text-[10px]`}>
                  {riskIcon(d.routeScore.trafficRisk)} {d.routeScore.trafficRisk} traffic
                </Badge>
                <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                  <Ruler className="h-3 w-3" />{d.routeScore.totalDistance}km
                </span>
                <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                  <Fuel className="h-3 w-3" />₹{d.routeScore.totalFuelCost}
                </span>
                <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                  <Clock className="h-3 w-3" />{d.routeScore.estimatedDuration}m
                </span>
                <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                  <Package className="h-3 w-3" />{d.package_weight}kg
                </span>
              </div>

              <div className="mt-2 flex items-center gap-2">
                <div className="flex-1">
                  <Progress value={d.routeScore.efficiencyScore} className="h-1.5" />
                </div>
                <span className={`text-xs font-bold ${efficiencyColor(d.routeScore.efficiencyScore)}`}>
                  {d.routeScore.efficiencyScore}%
                </span>
              </div>

              {d.routeScore.congestionZones.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {d.routeScore.congestionZones.map((z) => (
                    <span key={z} className="text-[9px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 rounded px-1.5 py-0.5">
                      ⚠ {z}
                    </span>
                  ))}
                </div>
              )}

              <div className="mt-2 flex gap-2">
                <Button
                  size="sm"
                  className="gap-1 h-7 text-xs"
                  onClick={(e) => { e.stopPropagation(); onAcceptDelivery(d); }}
                >
                  <CheckCircle2 className="h-3 w-3" /> Accept
                </Button>
                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground ml-auto">
                  <span>₹{d.routeScore.totalEarnings} earn</span>
                  <span>−</span>
                  <span>₹{d.routeScore.totalFuelCost} fuel</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right: Map */}
      <Card className="shadow-card overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="font-display text-base flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" />
            {selectedDelivery ? "Route Preview" : "Select a delivery to preview"}
          </CardTitle>
          {selectedDelivery && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className={`font-medium ${efficiencyColor(selectedDelivery.routeScore.efficiencyScore)}`}>
                Efficiency: {selectedDelivery.routeScore.efficiencyScore}%
              </span>
              <span>•</span>
              <span>Profit: ₹{selectedDelivery.routeScore.estimatedProfit}</span>
              <span>•</span>
              <Badge className={`${riskColor(selectedDelivery.routeScore.trafficRisk)} gap-0.5 text-[10px]`}>
                {riskIcon(selectedDelivery.routeScore.trafficRisk)} {selectedDelivery.routeScore.trafficRisk}
              </Badge>
            </div>
          )}
        </CardHeader>
        <CardContent className="p-0">
          <DeliveryMap
            pickup={selectedDelivery?.pickup_lat ? { lat: selectedDelivery.pickup_lat!, lng: selectedDelivery.pickup_lng! } : null}
            dropoff={selectedDelivery?.dropoff_lat ? { lat: selectedDelivery.dropoff_lat!, lng: selectedDelivery.dropoff_lng! } : null}
            route={mapRoute}
            height="550px"
          />
        </CardContent>
      </Card>
    </div>
  );
}
