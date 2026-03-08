// Geofencing utility for proximity-based notifications
const PROXIMITY_THRESHOLD_KM = 0.5; // 500 meters

export function isWithinGeofence(
  driverLat: number,
  driverLng: number,
  targetLat: number,
  targetLng: number,
  thresholdKm: number = PROXIMITY_THRESHOLD_KM
): boolean {
  const R = 6371;
  const dLat = ((targetLat - driverLat) * Math.PI) / 180;
  const dLng = ((targetLng - driverLng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((driverLat * Math.PI) / 180) *
    Math.cos((targetLat * Math.PI) / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  return distance <= thresholdKm;
}

export function getDistanceInMeters(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
