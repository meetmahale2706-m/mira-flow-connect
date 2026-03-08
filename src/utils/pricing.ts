// Dynamic delivery pricing based on distance, weight, and time of day

const BASE_RATE = 20; // ₹20 base fee
const PER_KM_RATE = 8; // ₹8 per km
const PER_KG_RATE = 3; // ₹3 per kg
const HEAVY_WEIGHT_THRESHOLD = 10; // kg
const HEAVY_WEIGHT_SURCHARGE = 1.3; // 30% surcharge
const PEAK_MULTIPLIER = 1.4; // 40% surge during peak hours
const NIGHT_MULTIPLIER = 1.25; // 25% surge at night
const MIN_PRICE = 30; // Minimum ₹30

function getTimeMultiplier(hour?: number): { multiplier: number; label: string } {
  const h = hour ?? new Date().getHours();
  if (h >= 8 && h <= 10) return { multiplier: PEAK_MULTIPLIER, label: "Morning Peak" };
  if (h >= 17 && h <= 20) return { multiplier: PEAK_MULTIPLIER, label: "Evening Peak" };
  if (h >= 22 || h < 6) return { multiplier: NIGHT_MULTIPLIER, label: "Night Surcharge" };
  return { multiplier: 1, label: "Standard" };
}

export function calculateDeliveryPrice(
  distanceKm: number,
  weightKg: number,
  hour?: number
): { total: number; breakdown: { base: number; distance: number; weight: number; surge: number; surgeLabel: string } } {
  const base = BASE_RATE;
  const distance = distanceKm * PER_KM_RATE;
  const weightCharge = weightKg * PER_KG_RATE * (weightKg > HEAVY_WEIGHT_THRESHOLD ? HEAVY_WEIGHT_SURCHARGE : 1);
  const subtotal = base + distance + weightCharge;
  const { multiplier, label } = getTimeMultiplier(hour);
  const surge = subtotal * (multiplier - 1);
  const total = Math.max(Math.round(subtotal + surge), MIN_PRICE);

  return {
    total,
    breakdown: {
      base,
      distance: Math.round(distance),
      weight: Math.round(weightCharge),
      surge: Math.round(surge),
      surgeLabel: label,
    },
  };
}
