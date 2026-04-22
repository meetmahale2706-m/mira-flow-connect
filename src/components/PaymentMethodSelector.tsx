import { Banknote, Smartphone } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export type PaymentMethod = "cod" | "upi";

interface Props {
  value: PaymentMethod;
  onChange: (v: PaymentMethod) => void;
}

export default function PaymentMethodSelector({ value, onChange }: Props) {
  const options: { id: PaymentMethod; label: string; desc: string; icon: React.ReactNode }[] = [
    { id: "cod", label: "Cash on Delivery", desc: "Pay the driver in cash", icon: <Banknote className="h-5 w-5" /> },
    { id: "upi", label: "UPI Payment", desc: "Pay via Google Pay, PhonePe, Paytm", icon: <Smartphone className="h-5 w-5" /> },
  ];

  return (
    <div>
      <Label className="mb-2 block">Payment Method</Label>
      <RadioGroup value={value} onValueChange={(v) => onChange(v as PaymentMethod)} className="grid grid-cols-2 gap-3">
        {options.map((opt) => (
          <label
            key={opt.id}
            htmlFor={`pm-${opt.id}`}
            className={cn(
              "flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors",
              value === opt.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/40",
            )}
          >
            <RadioGroupItem value={opt.id} id={`pm-${opt.id}`} className="mt-1" />
            <div className="flex-1">
              <div className="flex items-center gap-2 text-sm font-semibold">
                {opt.icon}
                {opt.label}
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">{opt.desc}</p>
            </div>
          </label>
        ))}
      </RadioGroup>
    </div>
  );
}
