import { CheckCircle2, Clock, Truck, Package, MapPin, Star } from "lucide-react";

interface Props {
  status: string;
  createdAt: string;
  startedAt?: string | null;
  completedAt?: string | null;
}

const STEPS = [
  { key: "pending", label: "Order Placed", icon: Package },
  { key: "assigned", label: "Driver Assigned", icon: Truck },
  { key: "in_transit", label: "In Transit", icon: MapPin },
  { key: "delivered", label: "Delivered", icon: CheckCircle2 },
];

const STATUS_ORDER = ["pending", "assigned", "in_transit", "delivered"];

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleString("en-IN", {
    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
  });
}

export default function DeliveryTimeline({ status, createdAt, startedAt, completedAt }: Props) {
  const currentIdx = STATUS_ORDER.indexOf(status);

  const getTimestamp = (stepKey: string) => {
    switch (stepKey) {
      case "pending": return createdAt;
      case "in_transit": return startedAt || null;
      case "delivered": return completedAt || null;
      default: return null;
    }
  };

  return (
    <div className="space-y-0">
      {STEPS.map((step, i) => {
        const isCompleted = i <= currentIdx;
        const isCurrent = i === currentIdx;
        const timestamp = getTimestamp(step.key);
        const Icon = step.icon;

        return (
          <div key={step.key} className="flex gap-3">
            {/* Vertical line + dot */}
            <div className="flex flex-col items-center">
              <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                isCompleted
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-muted-foreground"
              } ${isCurrent ? "ring-2 ring-primary/30 ring-offset-2 ring-offset-background" : ""}`}>
                {isCompleted && !isCurrent ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <Icon className="h-4 w-4" />
                )}
              </div>
              {i < STEPS.length - 1 && (
                <div className={`w-0.5 h-8 ${i < currentIdx ? "bg-primary" : "bg-border"}`} />
              )}
            </div>

            {/* Content */}
            <div className="pb-4 pt-1">
              <p className={`text-sm font-medium ${isCompleted ? "text-foreground" : "text-muted-foreground"}`}>
                {step.label}
              </p>
              {timestamp && (
                <p className="text-[11px] text-muted-foreground">{formatTime(timestamp)}</p>
              )}
              {isCurrent && !timestamp && step.key !== "pending" && (
                <p className="text-[11px] text-primary flex items-center gap-1">
                  <Clock className="h-3 w-3 animate-pulse" /> In progress...
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
