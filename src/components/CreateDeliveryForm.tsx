import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Package, Navigation, Clock, Ruler } from "lucide-react";
import { toast } from "sonner";
import DeliveryMap, { calcDistance, estimateTime, reverseGeocode, fetchRoute } from "@/components/DeliveryMap";
import AddressSearch from "@/components/AddressSearch";

interface LatLng { lat: number; lng: number; }

interface Props {
  onCreated: () => void;
}

export default function CreateDeliveryForm({ onCreated }: Props) {
  const { user } = useAuth();
  const [pickupText, setPickupText] = useState("");
  const [dropoffText, setDropoffText] = useState("");
  const [pickupPos, setPickupPos] = useState<LatLng | null>(null);
  const [dropoffPos, setDropoffPos] = useState<LatLng | null>(null);
  const [weight, setWeight] = useState("");
  const [route, setRoute] = useState<LatLng[]>([]);
  const [distance, setDistance] = useState(0);
  const [estTime, setEstTime] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  // Fetch route when both points set
  useEffect(() => {
    if (pickupPos && dropoffPos) {
      const d = calcDistance(pickupPos, dropoffPos);
      setDistance(parseFloat(d.toFixed(1)));
      setEstTime(estimateTime(d));
      fetchRoute(pickupPos, dropoffPos).then(setRoute);
    } else {
      setDistance(0);
      setEstTime(0);
      setRoute([]);
    }
  }, [pickupPos, dropoffPos]);

  const handlePickupFromMap = async (pos: LatLng) => {
    setPickupPos(pos);
    const addr = await reverseGeocode(pos.lat, pos.lng);
    setPickupText(addr);
  };

  const handleDropoffFromMap = async (pos: LatLng) => {
    setDropoffPos(pos);
    const addr = await reverseGeocode(pos.lat, pos.lng);
    setDropoffText(addr);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pickupPos || !dropoffPos) {
      toast.error("Please set both pickup and dropoff locations");
      return;
    }
    if (!weight || parseFloat(weight) <= 0) {
      toast.error("Please enter package weight");
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.from("deliveries").insert({
      customer_id: user!.id,
      pickup_address: pickupText,
      dropoff_address: dropoffText,
      pickup_lat: pickupPos.lat,
      pickup_lng: pickupPos.lng,
      dropoff_lat: dropoffPos.lat,
      dropoff_lng: dropoffPos.lng,
      package_weight: parseFloat(weight),
      distance_km: distance,
      estimated_time_mins: estTime,
      status: "pending",
    });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Delivery request created!");
      setPickupText(""); setDropoffText(""); setWeight("");
      setPickupPos(null); setDropoffPos(null);
      setRoute([]); setDistance(0); setEstTime(0);
      onCreated();
    }
    setSubmitting(false);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="font-display flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            New Delivery Request
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Pickup Address</Label>
              <AddressSearch
                value={pickupText}
                onChange={setPickupText}
                onSelect={(r) => { setPickupText(r.display_name); setPickupPos({ lat: r.lat, lng: r.lng }); }}
                placeholder="Search pickup location..."
                icon="pickup"
              />
            </div>
            <div>
              <Label>Dropoff Address</Label>
              <AddressSearch
                value={dropoffText}
                onChange={setDropoffText}
                onSelect={(r) => { setDropoffText(r.display_name); setDropoffPos({ lat: r.lat, lng: r.lng }); }}
                placeholder="Search delivery location..."
                icon="dropoff"
              />
            </div>
            <div>
              <Label>Package Weight (kg)</Label>
              <Input
                type="number"
                step="0.1"
                min="0.1"
                placeholder="e.g. 5.0"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
              />
            </div>

            {distance > 0 && (
              <div className="flex gap-3">
                <Badge variant="secondary" className="gap-1.5 px-3 py-1.5">
                  <Ruler className="h-3.5 w-3.5" />
                  {distance} km
                </Badge>
                <Badge variant="secondary" className="gap-1.5 px-3 py-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  ~{estTime} min
                </Badge>
              </div>
            )}

            <Button type="submit" className="w-full gap-2" disabled={submitting}>
              <Navigation className="h-4 w-4" />
              {submitting ? "Creating..." : "Create Delivery Request"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="shadow-card overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="font-display text-base">Select Locations on Map</CardTitle>
          <p className="text-xs text-muted-foreground">Click the buttons above the map, then click to place markers</p>
        </CardHeader>
        <CardContent className="p-0">
          <DeliveryMap
            pickup={pickupPos}
            dropoff={dropoffPos}
            route={route}
            height="380px"
            interactive
            onPickupChange={handlePickupFromMap}
            onDropoffChange={handleDropoffFromMap}
          />
        </CardContent>
      </Card>
    </div>
  );
}
