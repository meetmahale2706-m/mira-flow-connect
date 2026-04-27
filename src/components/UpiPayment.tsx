import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Smartphone, Copy, CheckCircle2, IndianRupee } from "lucide-react";
import { toast } from "sonner";

// Merchant UPI ID — in production this should come from settings/env
export const MERCHANT_UPI_ID = "priyasharma123@upi";
export const MERCHANT_NAME = "Priya Sharma";

interface Props {
  deliveryId: string;
  amount: number;
  paymentStatus: string;
  upiTransactionId?: string | null;
  onPaid?: () => void;
}

export default function UpiPayment({ deliveryId, amount, paymentStatus, upiTransactionId, onPaid }: Props) {
  const [utr, setUtr] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const upiLink = `upi://pay?pa=${encodeURIComponent(MERCHANT_UPI_ID)}&pn=${encodeURIComponent(MERCHANT_NAME)}&am=${amount}&cu=INR&tn=${encodeURIComponent("Delivery " + deliveryId.slice(0, 8))}`;

  const copyUpiId = async () => {
    await navigator.clipboard.writeText(MERCHANT_UPI_ID);
    toast.success("UPI ID copied!");
  };

  const handleSubmitUtr = async () => {
    if (utr.trim().length < 6) {
      toast.error("Please enter a valid UPI transaction reference (UTR)");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase
      .from("deliveries")
      .update({
        upi_transaction_id: utr.trim(),
        payment_status: "paid",
        paid_at: new Date().toISOString(),
      } as any)
      .eq("id", deliveryId);
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Payment recorded! Awaiting confirmation.");
      setUtr("");
      onPaid?.();
    }
  };

  if (paymentStatus === "paid") {
    return (
      <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-sm font-semibold text-primary">
            <CheckCircle2 className="h-4 w-4" />
            UPI Payment Recorded
          </span>
          <Badge className="bg-primary/10 text-primary">Paid</Badge>
        </div>
        {upiTransactionId && (
          <p className="mt-1 text-xs text-muted-foreground">UTR: {upiTransactionId}</p>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card p-3 space-y-3">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2 text-sm font-semibold">
          <Smartphone className="h-4 w-4 text-primary" />
          Pay via UPI
        </span>
        <span className="flex items-center gap-1 font-bold text-primary">
          <IndianRupee className="h-4 w-4" />
          {amount}
        </span>
      </div>

      <div className="flex items-center gap-2 rounded-md border border-dashed border-primary/40 bg-primary/5 p-2">
        <span className="flex-1 truncate text-sm font-mono">{MERCHANT_UPI_ID}</span>
        <Button type="button" size="sm" variant="ghost" onClick={copyUpiId} className="h-7 gap-1">
          <Copy className="h-3 w-3" /> Copy
        </Button>
      </div>

      <a
        href={upiLink}
        className="block w-full rounded-md bg-primary px-4 py-2 text-center text-sm font-medium text-primary-foreground hover:bg-primary/90"
      >
        Open UPI App to Pay
      </a>
      <p className="text-xs text-muted-foreground">
        After paying, enter the UPI transaction reference (UTR) below to confirm.
      </p>

      <div className="space-y-2">
        <Label htmlFor={`utr-${deliveryId}`} className="text-xs">UPI Transaction Reference (UTR)</Label>
        <div className="flex gap-2">
          <Input
            id={`utr-${deliveryId}`}
            placeholder="e.g. 412345678901"
            value={utr}
            onChange={(e) => setUtr(e.target.value)}
            className="h-9"
          />
          <Button type="button" size="sm" onClick={handleSubmitUtr} disabled={submitting}>
            {submitting ? "Saving..." : "Confirm"}
          </Button>
        </div>
      </div>
    </div>
  );
}
