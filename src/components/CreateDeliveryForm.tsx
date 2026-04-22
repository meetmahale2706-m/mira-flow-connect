import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Package, Navigation, Clock, Ruler, IndianRupee, TrendingUp, CalendarIcon } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import DeliveryMap, { calcDistance, estimateTime, reverseGeocode, fetchRoute } from "@/components/DeliveryMap";
import { calculateDeliveryPrice } from "@/utils/pricing";
import AddressSearch from "@/components/AddressSearch";
import PaymentMethodSelector, { type PaymentMethod } from "@/components/PaymentMethodSelector";

interface LatLng { lat: number; lng: number; }

const TIME_SLOTS = [
  { value: "asap", label: "ASAP (Now)" },
  { value: "morning", label: "Morning (8 AM - 12 PM)" },
  { value: "afternoon", label: "Afternoon (12 PM - 4 PM)" },
  { value: "evening", label: "Evening (4 PM - 8 PM)" },
  { value: "night", label: "Night (8 PM - 11 PM)" },
];

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
  const [pricing, setPricing] = useState<ReturnType<typeof calculateDeliveryPrice> | null>(null);
  const [scheduledDate, setScheduledDate] = useState<Date | undefined>(undefined);
  const [timeSlot, setTimeSlot] = useState("asap");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cod");

  useEffect(() => {
    if (pickupPos && dropoffPos) {
      const d = calcDistance(pickupPos, dropoffPos);
      setDistance(parseFloat(d.toFixed(1)));
      setEstTime(estimateTime(d));
      fetchRoute(pickupPos, dropoffPos).then(setRoute);
    } else {
      setDistance(0); setEstTime(0); setRoute([]);
    }
  }, [pickupPos, dropoffPos]);

  useEffect(() => {
    const w = parseFloat(weight);
    if (distance > 0 && w > 0) {
      setPricing(calculateDeliveryPrice(distance, w));
    } else {
      setPricing(null);
    }
  }, [distance, weight]);

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
    if (!pickupPos || !dropoffPos) { toast.error("Please set both pickup and dropoff locations"); return; }
    if (!weight || parseFloat(weight) <= 0) { toast.error("Please enter package weight"); return; }

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
      estimated_cost: pricing?.total || 0,
      scheduled_date: scheduledDate ? format(scheduledDate, "yyyy-MM-dd") : null,
      scheduled_time_slot: timeSlot !== "asap" ? timeSlot : null,
      payment_method: paymentMethod,
      payment_status: "pending",
      status: "pending",
    } as any);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Delivery request created!");
      setPickupText(""); setDropoffText(""); setWeight("");
      setPickupPos(null); setDropoffPos(null);
      setRoute([]); setDistance(0); setEstTime(0);
      setScheduledDate(undefined); setTimeSlot("asap");
      setPaymentMethod("cod");
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
              <Input type="number" step="0.1" min="0.1" placeholder="e.g. 5.0" value={weight} onChange={(e) => setWeight(e.target.value)} />
            </div>

            {/* Scheduling */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Schedule Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !scheduledDate && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {scheduledDate ? format(scheduledDate, "PPP") : "Today (ASAP)"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={scheduledDate}
                      onSelect={setScheduledDate}
                      disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <Label>Time Slot</Label>
                <Select value={timeSlot} onValueChange={setTimeSlot}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIME_SLOTS.map((slot) => (
                      <SelectItem key={slot.value} value={slot.value}>{slot.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {distance > 0 && (
              <div className="flex flex-wrap gap-3">
                <Badge variant="secondary" className="gap-1.5 px-3 py-1.5"><Ruler className="h-3.5 w-3.5" />{distance} km</Badge>
                <Badge variant="secondary" className="gap-1.5 px-3 py-1.5"><Clock className="h-3.5 w-3.5" />~{estTime} min</Badge>
                {scheduledDate && (
                  <Badge variant="secondary" className="gap-1.5 px-3 py-1.5">
                    <CalendarIcon className="h-3.5 w-3.5" />
                    {format(scheduledDate, "dd MMM")} • {TIME_SLOTS.find(s => s.value === timeSlot)?.label}
                  </Badge>
                )}
              </div>
            )}

            {pricing && (
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold flex items-center gap-1.5">
                    <IndianRupee className="h-4 w-4 text-primary" />
                    Estimated Cost
                  </span>
                  <span className="text-xl font-bold font-display text-primary">₹{pricing.total}</span>
                </div>
                <div className="grid grid-cols-2 gap-1 text-xs text-muted-foreground">
                  <span>Base fee: ₹{pricing.breakdown.base}</span>
                  <span>Distance: ₹{pricing.breakdown.distance}</span>
                  <span>Weight: ₹{pricing.breakdown.weight}</span>
                  {pricing.breakdown.surge > 0 && (
                    <span className="text-accent-foreground font-medium flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" />
                      {pricing.breakdown.surgeLabel}: +₹{pricing.breakdown.surge}
                    </span>
                  )}
                </div>
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
