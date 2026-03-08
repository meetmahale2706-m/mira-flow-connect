import { calcDistance } from "@/components/DeliveryMap";

interface LatLng { lat: number; lng: number; }

interface Delivery {
  id: string;
  pickup_lat: number | null;
  pickup_lng: number | null;
  dropoff_lat: number | null;
  dropoff_lng: number | null;
  distance_km: number | null;
  estimated_time_mins: number | null;
  estimated_cost: number | null;
  package_weight: number | null;
  [key: string]: any;
}

export interface RouteScore {
  profitPerKm: number;
  fuelCost: number;
  estimatedProfit: number;
  trafficRisk: "low" | "medium" | "high";
  congestionZones: string[];
  efficiencyScore: number; // 0-100
  totalDistance: number;
  totalEarnings: number;
  totalFuelCost: number;
  estimatedDuration: number;
}

export interface OptimizedDelivery extends Delivery {
  routeScore: RouteScore;
  sequenceOrder: number;
}

// Known congestion zones in Mira-Bhayandar / Mumbai region
const CONGESTION_ZONES: { name: string; center: LatLng; radius: number; peakHours: number[]; severity: number }[] = [
  { name: "Mira Road Station", center: { lat: 19.2812, lng: 72.8685 }, radius: 0.8, peakHours: [8, 9, 10, 17, 18, 19, 20], severity: 0.9 },
  { name: "Bhayandar Station", center: { lat: 19.3012, lng: 72.8510 }, radius: 0.7, peakHours: [8, 9, 10, 17, 18, 19, 20], severity: 0.85 },
  { name: "Kashimira Junction", center: { lat: 19.2650, lng: 72.8550 }, radius: 1.0, peakHours: [8, 9, 10, 11, 17, 18, 19, 20], severity: 0.75 },
  { name: "Dahisar Check Naka", center: { lat: 19.2550, lng: 72.8650 }, radius: 0.6, peakHours: [7, 8, 9, 10, 17, 18, 19, 20, 21], severity: 0.95 },
  { name: "Western Express Highway (Mira-Bhayandar)", center: { lat: 19.2900, lng: 72.8600 }, radius: 1.5, peakHours: [8, 9, 10, 18, 19, 20], severity: 0.7 },
  { name: "Thane-Belapur Road Junction", center: { lat: 19.2100, lng: 72.9700 }, radius: 1.0, peakHours: [8, 9, 17, 18, 19], severity: 0.8 },
  { name: "Andheri-Kurla Road", center: { lat: 19.1130, lng: 72.8690 }, radius: 1.2, peakHours: [8, 9, 10, 17, 18, 19, 20], severity: 0.85 },
  { name: "Borivali Station Area", center: { lat: 19.2290, lng: 72.8560 }, radius: 0.6, peakHours: [8, 9, 10, 17, 18, 19], severity: 0.8 },
];

const DRIVER_COMMISSION_RATE = 0.70; // Driver gets 70% of delivery cost
const IDLE_FUEL_PENALTY_PER_MIN = 0.5; // ₹0.5 per minute in traffic

/**
 * Check which congestion zones a route passes through
 */
function detectCongestionZones(pickup: LatLng, dropoff: LatLng, hour?: number): { zones: string[]; risk: "low" | "medium" | "high"; timePenalty: number } {
  const currentHour = hour ?? new Date().getHours();
  const hitZones: string[] = [];
  let totalPenalty = 0;

  // Check midpoint and endpoints against congestion zones
  const midpoint: LatLng = { lat: (pickup.lat + dropoff.lat) / 2, lng: (pickup.lng + dropoff.lng) / 2 };
  const checkPoints = [pickup, midpoint, dropoff];

  for (const zone of CONGESTION_ZONES) {
    for (const point of checkPoints) {
      const dist = calcDistance(point, zone.center);
      if (dist <= zone.radius) {
        const isPeakHour = zone.peakHours.includes(currentHour);
        if (isPeakHour) {
          hitZones.push(zone.name);
          totalPenalty += zone.severity * 15; // Up to 15 min penalty per zone
        } else {
          // Even off-peak, high-congestion areas add slight delay
          totalPenalty += zone.severity * 3;
        }
        break; // Don't count same zone twice
      }
    }
  }

  const uniqueZones = [...new Set(hitZones)];
  const risk: "low" | "medium" | "high" = uniqueZones.length === 0 ? "low" : uniqueZones.length <= 2 ? "medium" : "high";

  return { zones: uniqueZones, risk, timePenalty: Math.round(totalPenalty) };
}

/**
 * Calculate route score for a single delivery
 */
export function scoreDelivery(
  delivery: Delivery,
  fuelEfficiency: number,
  fuelPricePerLiter: number = 100,
  currentHour?: number
): RouteScore {
  const distKm = delivery.distance_km || 0;
  const earnings = (delivery.estimated_cost || 0) * DRIVER_COMMISSION_RATE;
  const estTime = delivery.estimated_time_mins || 0;

  // Fuel cost
  const litersNeeded = fuelEfficiency > 0 ? distKm / fuelEfficiency : 0;
  const baseFuelCost = litersNeeded * fuelPricePerLiter;

  // Traffic analysis
  const pickup: LatLng = { lat: delivery.pickup_lat || 0, lng: delivery.pickup_lng || 0 };
  const dropoff: LatLng = { lat: delivery.dropoff_lat || 0, lng: delivery.dropoff_lng || 0 };
  const congestion = detectCongestionZones(pickup, dropoff, currentHour);

  // Idle fuel cost from traffic
  const idleFuelCost = congestion.timePenalty * IDLE_FUEL_PENALTY_PER_MIN;
  const totalFuelCost = parseFloat((baseFuelCost + idleFuelCost).toFixed(2));

  const estimatedProfit = parseFloat((earnings - totalFuelCost).toFixed(2));
  const profitPerKm = distKm > 0 ? parseFloat((estimatedProfit / distKm).toFixed(2)) : 0;

  // Efficiency score (0-100) combining profit, distance, and traffic
  const profitScore = Math.min(Math.max(profitPerKm * 10, 0), 40); // Max 40 pts
  const distanceScore = Math.min(Math.max((20 - distKm) * 1.5, 0), 30); // Shorter = better, max 30 pts
  const trafficScore = congestion.risk === "low" ? 30 : congestion.risk === "medium" ? 15 : 0; // Max 30 pts
  const efficiencyScore = Math.round(Math.min(profitScore + distanceScore + trafficScore, 100));

  return {
    profitPerKm,
    fuelCost: baseFuelCost,
    estimatedProfit,
    trafficRisk: congestion.risk,
    congestionZones: congestion.zones,
    efficiencyScore,
    totalDistance: distKm,
    totalEarnings: parseFloat(earnings.toFixed(2)),
    totalFuelCost,
    estimatedDuration: estTime + congestion.timePenalty,
  };
}

/**
 * Score and rank deliveries by profitability, sorted best-first
 */
export function rankDeliveries(
  deliveries: Delivery[],
  fuelEfficiency: number,
  fuelPricePerLiter: number = 100,
  currentHour?: number
): OptimizedDelivery[] {
  const scored = deliveries
    .filter((d) => d.pickup_lat && d.pickup_lng && d.dropoff_lat && d.dropoff_lng)
    .map((d) => ({
      ...d,
      routeScore: scoreDelivery(d, fuelEfficiency, fuelPricePerLiter, currentHour),
      sequenceOrder: 0,
    }));

  // Sort by efficiency score (highest first), then by profit per km
  scored.sort((a, b) => {
    if (b.routeScore.efficiencyScore !== a.routeScore.efficiencyScore) {
      return b.routeScore.efficiencyScore - a.routeScore.efficiencyScore;
    }
    return b.routeScore.profitPerKm - a.routeScore.profitPerKm;
  });

  scored.forEach((d, i) => { d.sequenceOrder = i + 1; });

  return scored;
}

/**
 * Build an optimized multi-stop route that maximizes profit while avoiding congestion.
 * Uses greedy selection: pick best-scored delivery, then nearest-neighbor from there.
 */
export function buildOptimizedRoute(
  deliveries: Delivery[],
  fuelEfficiency: number,
  startPos?: LatLng,
  maxDeliveries: number = 5,
  fuelPricePerLiter: number = 100,
  currentHour?: number
): OptimizedDelivery[] {
  const ranked = rankDeliveries(deliveries, fuelEfficiency, fuelPricePerLiter, currentHour);
  if (ranked.length === 0) return [];

  // Filter to only profitable deliveries
  const profitable = ranked.filter((d) => d.routeScore.estimatedProfit > 0);
  const candidates = profitable.length > 0 ? profitable : ranked.slice(0, maxDeliveries);

  const selected: OptimizedDelivery[] = [];
  const used = new Set<string>();
  let currentPos = startPos || { lat: candidates[0].pickup_lat!, lng: candidates[0].pickup_lng! };

  // Greedy: pick nearest high-score delivery
  while (selected.length < maxDeliveries && used.size < candidates.length) {
    let bestIdx = -1;
    let bestValue = -Infinity;

    for (let i = 0; i < candidates.length; i++) {
      if (used.has(candidates[i].id)) continue;

      const d = candidates[i];
      const detourDist = calcDistance(currentPos, { lat: d.pickup_lat!, lng: d.pickup_lng! });
      // Combined score: efficiency score minus detour penalty
      const value = d.routeScore.efficiencyScore - detourDist * 5;

      if (value > bestValue) {
        bestValue = value;
        bestIdx = i;
      }
    }

    if (bestIdx === -1) break;

    const next = candidates[bestIdx];
    used.add(next.id);
    next.sequenceOrder = selected.length + 1;
    selected.push(next);
    currentPos = { lat: next.dropoff_lat!, lng: next.dropoff_lng! };
  }

  return selected;
}

/**
 * Get summary stats for a set of optimized deliveries
 */
export function getRouteSummary(deliveries: OptimizedDelivery[]): {
  totalEarnings: number;
  totalFuelCost: number;
  totalProfit: number;
  totalDistance: number;
  totalDuration: number;
  avgEfficiency: number;
  congestionZones: string[];
} {
  if (deliveries.length === 0) return { totalEarnings: 0, totalFuelCost: 0, totalProfit: 0, totalDistance: 0, totalDuration: 0, avgEfficiency: 0, congestionZones: [] };

  const totalEarnings = deliveries.reduce((s, d) => s + d.routeScore.totalEarnings, 0);
  const totalFuelCost = deliveries.reduce((s, d) => s + d.routeScore.totalFuelCost, 0);
  const totalDistance = deliveries.reduce((s, d) => s + d.routeScore.totalDistance, 0);
  const totalDuration = deliveries.reduce((s, d) => s + d.routeScore.estimatedDuration, 0);
  const avgEfficiency = Math.round(deliveries.reduce((s, d) => s + d.routeScore.efficiencyScore, 0) / deliveries.length);
  const allZones = [...new Set(deliveries.flatMap((d) => d.routeScore.congestionZones))];

  return {
    totalEarnings: parseFloat(totalEarnings.toFixed(2)),
    totalFuelCost: parseFloat(totalFuelCost.toFixed(2)),
    totalProfit: parseFloat((totalEarnings - totalFuelCost).toFixed(2)),
    totalDistance: parseFloat(totalDistance.toFixed(1)),
    totalDuration: Math.round(totalDuration),
    avgEfficiency,
    congestionZones: allZones,
  };
}
