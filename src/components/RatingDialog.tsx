import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Star } from "lucide-react";
import { toast } from "sonner";

interface Props {
  delivery: any;
  open: boolean;
  onClose: () => void;
  onRated: () => void;
}

export default function RatingDialog({ delivery, open, onClose, onRated }: Props) {
  const { user } = useAuth();
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [review, setReview] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) { toast.error("Please select a rating"); return; }
    if (!delivery.driver_id) { toast.error("No driver assigned"); return; }
    setSubmitting(true);
    const { error } = await supabase.from("delivery_ratings").insert({
      delivery_id: delivery.id,
      customer_id: user!.id,
      driver_id: delivery.driver_id,
      rating,
      review,
    } as any);
    if (error) {
      if (error.code === "23505") toast.error("You already rated this delivery");
      else toast.error(error.message);
    } else {
      toast.success("Thank you for your feedback! ⭐");
      onRated();
      onClose();
      setRating(0);
      setReview("");
    }
    setSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-display text-center">Rate Your Delivery</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-center text-sm text-muted-foreground">
            How was your delivery experience?
          </p>
          <div className="flex justify-center gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                className="p-1 transition-transform hover:scale-110"
                onMouseEnter={() => setHover(star)}
                onMouseLeave={() => setHover(0)}
                onClick={() => setRating(star)}
              >
                <Star
                  className={`h-8 w-8 transition-colors ${
                    star <= (hover || rating)
                      ? "fill-yellow-400 text-yellow-400"
                      : "text-muted-foreground/30"
                  }`}
                />
              </button>
            ))}
          </div>
          <p className="text-center text-xs text-muted-foreground">
            {rating === 1 && "Poor"}{rating === 2 && "Fair"}{rating === 3 && "Good"}{rating === 4 && "Very Good"}{rating === 5 && "Excellent!"}
          </p>
          <Textarea
            placeholder="Write a review (optional)..."
            value={review}
            onChange={(e) => setReview(e.target.value)}
            rows={3}
          />
          <Button className="w-full gap-2" onClick={handleSubmit} disabled={submitting}>
            <Star className="h-4 w-4" />
            {submitting ? "Submitting..." : "Submit Rating"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
