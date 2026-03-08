import { IndianRupee, TrendingUp, Package, Ruler, Fuel, Clock } from "lucide-react";
import { calculateDeliveryPrice } from "@/utils/pricing";

interface Props {
  distanceKm: number;
  weightKg: number;
  estimatedCost?: number;
  compact?: boolean;
}

export default function DeliveryCostBreakdown({ distanceKm, weightKg, estimatedCost, compact = false }: Props) {
  const pricing = calculateDeliveryPrice(distanceKm, weightKg);
  const displayTotal = estimatedCost || pricing.total;

  if (compact) {
    return (
      <div className="flex items-center gap-1.5 text-sm">
        <IndianRupee className="h-3.5 w-3.5 text-primary" />
        <span className="font-bold text-primary">₹{displayTotal}</span>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold flex items-center gap-1.5">
          <IndianRupee className="h-4 w-4 text-primary" />
          Cost Breakdown
        </span>
        <span className="text-xl font-bold font-display text-primary">₹{displayTotal}</span>
      </div>
      
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <div className="h-1.5 w-1.5 rounded-full bg-primary" />
            Base Fee
          </span>
          <span className="font-medium">₹{pricing.breakdown.base}</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <Ruler className="h-3 w-3" />
            Distance ({distanceKm} km × ₹8/km)
          </span>
          <span className="font-medium">₹{pricing.breakdown.distance}</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <Package className="h-3 w-3" />
            Weight ({weightKg} kg × ₹3/kg{weightKg > 10 ? " +30%" : ""})
          </span>
          <span className="font-medium">₹{pricing.breakdown.weight}</span>
        </div>
        {pricing.breakdown.surge > 0 && (
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-accent-foreground font-medium">
              <TrendingUp className="h-3 w-3" />
              {pricing.breakdown.surgeLabel}
            </span>
            <span className="font-medium text-accent-foreground">+₹{pricing.breakdown.surge}</span>
          </div>
        )}
        <div className="border-t border-primary/10 pt-1.5 flex items-center justify-between text-xs font-semibold">
          <span>Total</span>
          <span className="text-primary">₹{displayTotal}</span>
        </div>
      </div>
    </div>
  );
}
