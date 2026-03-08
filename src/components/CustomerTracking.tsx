import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Clock, Truck, Navigation } from "lucide-react";
import DeliveryMap from "@/components/DeliveryMap";

interface LatLng { lat: number; lng: number; }

interface Props {
  delivery: any;
}

export default function CustomerTracking({ delivery }: Props) {
  const [liveDelivery, setLiveDelivery] = useState(delivery);
  const [route, setRoute] = useState<LatLng[]>([]);

  // Subscribe to realtime updates
  useEffect(() => {
    const channel = supabase
      .channel(`delivery-${delivery.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "deliveries",
          filter: `id=eq.${delivery.id}`,
        },
        (payload) => {
          setLiveDelivery(payload.new);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [delivery.id]);

  // Fetch route
  useEffect(() => {
    if (liveDelivery.pickup_lat && liveDelivery.dropoff_lat) {
      import("@/components/DeliveryMap").then(({ fetchRoute }) => {
        fetchRoute(
          { lat: liveDelivery.pickup_lat, lng: liveDelivery.pickup_lng },
          { lat: liveDelivery.dropoff_lat, lng: liveDelivery.dropoff_lng }
        ).then(setRoute);
      });
    }
  }, [liveDelivery.pickup_lat, liveDelivery.dropoff_lat]);

  const calculateETA = () => {
    if (liveDelivery.status === "delivered") return "Delivered";
    if (liveDelivery.status === "pending") return "Awaiting driver";
    if (liveDelivery.status === "assigned") return "Driver assigned";

    if (liveDelivery.started_at && liveDelivery.estimated_time_mins) {
      const started = new Date(liveDelivery.started_at).getTime();
      const etaMs = started + liveDelivery.estimated_time_mins * 60 * 1000;
      const now = Date.now();
      const remaining = Math.max(0, Math.round((etaMs - now) / 60000));
      return remaining > 0 ? `~${remaining} min remaining` : "Arriving soon";
    }
    return "Calculating...";
  };

  const statusConfig: Record<string, { color: string; label: string }> = {
    pending: { color: "bg-muted text-muted-foreground", label: "Pending" },
    assigned: { color: "bg-blue-100 text-blue-700", label: "Driver Assigned" },
    in_transit: { color: "bg-accent/20 text-accent-foreground", label: "In Transit" },
    delivered: { color: "bg-primary/10 text-primary", label: "Delivered" },
  };

  const status = statusConfig[liveDelivery.status] || statusConfig.pending;

  return (
    <div className="space-y-4">
      {/* Status bar */}
      <div className="flex items-center justify-between rounded-xl border border-border bg-card p-4 shadow-card">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg gradient-primary">
            <Truck className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <p className="text-sm font-medium">Delivery Status</p>
            <Badge className={status.color}>{status.label}</Badge>
          </div>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            <span>ETA</span>
          </div>
          <p className="text-sm font-semibold">{calculateETA()}</p>
        </div>
      </div>

      {/* Progress steps */}
      <div className="flex items-center gap-2">
        {["pending", "assigned", "in_transit", "delivered"].map((step, i) => {
          const steps = ["pending", "assigned", "in_transit", "delivered"];
          const currentIdx = steps.indexOf(liveDelivery.status);
          const isActive = i <= currentIdx;
          return (
            <div key={step} className="flex flex-1 items-center gap-2">
              <div
                className={`h-2 flex-1 rounded-full transition-colors ${
                  isActive ? "gradient-primary" : "bg-muted"
                }`}
              />
            </div>
          );
        })}
      </div>

      {/* Map with driver location */}
      <Card className="shadow-card overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-display flex items-center gap-2">
            <Navigation className="h-4 w-4 text-primary" />
            Live Tracking
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <DeliveryMap
            pickup={
              liveDelivery.pickup_lat
                ? { lat: liveDelivery.pickup_lat, lng: liveDelivery.pickup_lng }
                : null
            }
            dropoff={
              liveDelivery.dropoff_lat
                ? { lat: liveDelivery.dropoff_lat, lng: liveDelivery.dropoff_lng }
                : null
            }
            route={route}
            height="300px"
          />
        </CardContent>
      </Card>

      {/* Delivery details */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-border p-3">
          <p className="text-xs text-muted-foreground">Pickup</p>
          <p className="text-sm font-medium line-clamp-2">{liveDelivery.pickup_address}</p>
        </div>
        <div className="rounded-lg border border-border p-3">
          <p className="text-xs text-muted-foreground">Dropoff</p>
          <p className="text-sm font-medium line-clamp-2">{liveDelivery.dropoff_address}</p>
        </div>
      </div>
    </div>
  );
}
