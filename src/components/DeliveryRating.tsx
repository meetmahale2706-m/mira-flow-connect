import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Star } from "lucide-react";
import { toast } from "sonner";

interface Props {
  delivery: any;
  existingRating?: any;
  onRated?: () => void;
}

export default function DeliveryRating({ delivery, existingRating, onRated }: Props) {
  const { user } = useAuth();
  const [rating, setRating] = useState(existingRating?.rating || 0);
  const [hoveredStar, setHoveredStar] = useState(0);
  const [review, setReview] = useState(existingRating?.review || "");
  const [submitting, setSubmitting] = useState(false);
  const isReadOnly = !!existingRating;

  const handleSubmit = async () => {
    if (rating === 0) {
      toast.error("Please select a rating");
      return;
    }
    if (!delivery.driver_id) {
      toast.error("No driver assigned to rate");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("delivery_ratings").insert({
      delivery_id: delivery.id,
      customer_id: user!.id,
      driver_id: delivery.driver_id,
      rating,
      review: review.trim() || null,
    });
    if (error) {
      if (error.code === "23505") toast.error("You've already rated this delivery");
      else toast.error(error.message);
    } else {
      toast.success("Thank you for your rating!");
      onRated?.();
    }
    setSubmitting(false);
  };

  return (
    <Card className="shadow-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-display">
          {isReadOnly ? "Your Rating" : "Rate this Delivery"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              disabled={isReadOnly}
              className="p-0.5 transition-transform hover:scale-110 disabled:cursor-default"
              onClick={() => !isReadOnly && setRating(star)}
              onMouseEnter={() => !isReadOnly && setHoveredStar(star)}
              onMouseLeave={() => !isReadOnly && setHoveredStar(0)}
            >
              <Star
                className={`h-7 w-7 transition-colors ${
                  star <= (hoveredStar || rating)
                    ? "fill-amber-400 text-amber-400"
                    : "text-muted-foreground/30"
                }`}
              />
            </button>
          ))}
          {rating > 0 && (
            <span className="ml-2 text-sm font-medium text-muted-foreground">
              {rating}/5
            </span>
          )}
        </div>
        <Textarea
          placeholder="Write a review (optional)..."
          value={review}
          onChange={(e) => setReview(e.target.value)}
          disabled={isReadOnly}
          rows={2}
          className="resize-none"
        />
        {!isReadOnly && (
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={submitting || rating === 0}
            className="w-full"
          >
            {submitting ? "Submitting..." : "Submit Rating"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
