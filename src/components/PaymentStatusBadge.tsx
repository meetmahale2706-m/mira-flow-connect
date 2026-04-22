import { Badge } from "@/components/ui/badge";
import { Banknote, Smartphone, CheckCircle2, Clock } from "lucide-react";

interface Props {
  paymentMethod?: string;
  paymentStatus?: string;
}

export default function PaymentStatusBadge({ paymentMethod = "cod", paymentStatus = "pending" }: Props) {
  const isPaid = paymentStatus === "paid";
  const isUpi = paymentMethod === "upi";

  return (
    <Badge
      variant="secondary"
      className={`gap-1 ${isPaid ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}
    >
      {isUpi ? <Smartphone className="h-3 w-3" /> : <Banknote className="h-3 w-3" />}
      {isUpi ? "UPI" : "COD"}
      <span className="mx-1 opacity-50">•</span>
      {isPaid ? <CheckCircle2 className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
      {isPaid ? "Paid" : "Unpaid"}
    </Badge>
  );
}
