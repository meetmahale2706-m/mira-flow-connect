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
  package_weight: number | null;
  [key: string]: any;
}

export interface DeliveryPool {
  id: string;
  deliveries: Delivery[];
  totalDistance: number;
  totalTime: number;
  totalWeight: number;
  center: LatLng;
}

const POOL_RADIUS_KM = 5; // Group deliveries within 5km radius

/**
 * Groups nearby deliveries into pools based on pickup/dropoff proximity
 */
export function poolDeliveries(deliveries: Delivery[]): DeliveryPool[] {
  const validDeliveries = deliveries.filter(
    (d) => d.pickup_lat && d.pickup_lng && d.dropoff_lat && d.dropoff_lng
  );

  if (validDeliveries.length === 0) return [];

  const used = new Set<string>();
  const pools: DeliveryPool[] = [];

  for (const delivery of validDeliveries) {
    if (used.has(delivery.id)) continue;

    const pool: Delivery[] = [delivery];
    used.add(delivery.id);

    const pickupCenter: LatLng = { lat: delivery.pickup_lat!, lng: delivery.pickup_lng! };

    // Find nearby deliveries
    for (const other of validDeliveries) {
      if (used.has(other.id)) continue;

      const pickupDist = calcDistance(pickupCenter, { lat: other.pickup_lat!, lng: other.pickup_lng! });
      const dropoffDist = calcDistance(
        { lat: delivery.dropoff_lat!, lng: delivery.dropoff_lng! },
        { lat: other.dropoff_lat!, lng: other.dropoff_lng! }
      );

      // Pool if both pickup and dropoff are within radius
      if (pickupDist <= POOL_RADIUS_KM && dropoffDist <= POOL_RADIUS_KM) {
        pool.push(other);
        used.add(other.id);
      }
    }

    const totalDistance = pool.reduce((sum, d) => sum + (d.distance_km || 0), 0);
    const totalTime = pool.reduce((sum, d) => sum + (d.estimated_time_mins || 0), 0);
    const totalWeight = pool.reduce((sum, d) => sum + (d.package_weight || 0), 0);
    const centerLat = pool.reduce((sum, d) => sum + (d.pickup_lat || 0), 0) / pool.length;
    const centerLng = pool.reduce((sum, d) => sum + (d.pickup_lng || 0), 0) / pool.length;

    pools.push({
      id: `pool-${pools.length + 1}`,
      deliveries: pool,
      totalDistance: parseFloat(totalDistance.toFixed(1)),
      totalTime: Math.round(totalTime),
      totalWeight: parseFloat(totalWeight.toFixed(1)),
      center: { lat: centerLat, lng: centerLng },
    });
  }

  return pools;
}

/**
 * Calculates optimized route cost considering distance and fuel efficiency
 */
export function calculateRouteCost(distanceKm: number, fuelEfficiency: number, fuelPricePerLiter = 100): number {
  if (!fuelEfficiency || fuelEfficiency <= 0) return 0;
  const litersNeeded = distanceKm / fuelEfficiency;
  return parseFloat((litersNeeded * fuelPricePerLiter).toFixed(2));
}

/**
 * Simple route optimization: sort deliveries by nearest-neighbor from a starting point
 */
export function optimizeRoute(deliveries: Delivery[], startPos?: LatLng): Delivery[] {
  if (deliveries.length <= 1) return deliveries;

  const remaining = [...deliveries];
  const ordered: Delivery[] = [];
  let current: LatLng = startPos || { lat: remaining[0].pickup_lat!, lng: remaining[0].pickup_lng! };

  while (remaining.length > 0) {
    let nearestIdx = 0;
    let nearestDist = Infinity;

    for (let i = 0; i < remaining.length; i++) {
      const d = remaining[i];
      const dist = calcDistance(current, { lat: d.pickup_lat!, lng: d.pickup_lng! });
      if (dist < nearestDist) {
        nearestDist = dist;
        nearestIdx = i;
      }
    }

    const next = remaining.splice(nearestIdx, 1)[0];
    ordered.push(next);
    current = { lat: next.dropoff_lat!, lng: next.dropoff_lng! };
  }

  return ordered;
}
