import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix default marker icons
// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

const pickupIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

const dropoffIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

interface LatLng {
  lat: number;
  lng: number;
}

interface DeliveryMapProps {
  pickup?: LatLng | null;
  dropoff?: LatLng | null;
  route?: LatLng[];
  height?: string;
  interactive?: boolean;
  onPickupChange?: (pos: LatLng) => void;
  onDropoffChange?: (pos: LatLng) => void;
}

export default function DeliveryMap({
  pickup,
  dropoff,
  route,
  height = "400px",
  interactive = false,
  onPickupChange,
  onDropoffChange,
}: DeliveryMapProps) {
  const [clickMode, setClickMode] = useState<"pickup" | "dropoff" | null>(null);
  const defaultCenter: LatLng = { lat: 19.2952, lng: 72.8544 }; // Mira-Bhayandar

  const mapElementRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const pickupMarkerRef = useRef<L.Marker | null>(null);
  const dropoffMarkerRef = useRef<L.Marker | null>(null);
  const routeLineRef = useRef<L.Polyline | null>(null);

  // Initialize map once
  useEffect(() => {
    if (!mapElementRef.current || mapRef.current) return;

    const map = L.map(mapElementRef.current, {
      center: [defaultCenter.lat, defaultCenter.lng],
      zoom: 12,
      scrollWheelZoom: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Resize/focus map when data changes (helps when shown inside tabs)
  useEffect(() => {
    if (!mapRef.current) return;
    const timer = setTimeout(() => mapRef.current?.invalidateSize(), 0);
    return () => clearTimeout(timer);
  }, [height, pickup, dropoff, route]);

  // Keep view in sync
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (pickup && dropoff) {
      const bounds = L.latLngBounds([pickup, dropoff]);
      map.fitBounds(bounds, { padding: [50, 50] });
      return;
    }

    if (pickup) {
      map.setView([pickup.lat, pickup.lng], 14);
      return;
    }

    if (dropoff) {
      map.setView([dropoff.lat, dropoff.lng], 14);
    }
  }, [pickup, dropoff]);

  // Keep markers in sync
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (pickup) {
      if (!pickupMarkerRef.current) {
        pickupMarkerRef.current = L.marker([pickup.lat, pickup.lng], { icon: pickupIcon }).addTo(map);
        pickupMarkerRef.current.bindPopup("Pickup Location");
      } else {
        pickupMarkerRef.current.setLatLng([pickup.lat, pickup.lng]);
      }
    } else if (pickupMarkerRef.current) {
      map.removeLayer(pickupMarkerRef.current);
      pickupMarkerRef.current = null;
    }

    if (dropoff) {
      if (!dropoffMarkerRef.current) {
        dropoffMarkerRef.current = L.marker([dropoff.lat, dropoff.lng], { icon: dropoffIcon }).addTo(map);
        dropoffMarkerRef.current.bindPopup("Dropoff Location");
      } else {
        dropoffMarkerRef.current.setLatLng([dropoff.lat, dropoff.lng]);
      }
    } else if (dropoffMarkerRef.current) {
      map.removeLayer(dropoffMarkerRef.current);
      dropoffMarkerRef.current = null;
    }
  }, [pickup, dropoff]);

  // Keep route polyline in sync
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (routeLineRef.current) {
      map.removeLayer(routeLineRef.current);
      routeLineRef.current = null;
    }

    if (route && route.length > 1) {
      routeLineRef.current = L.polyline(
        route.map((p) => [p.lat, p.lng] as [number, number]),
        { color: "hsl(174, 62%, 38%)", weight: 4, opacity: 0.8 }
      ).addTo(map);
    }
  }, [route]);

  // Interactive click-to-set points
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !interactive || !clickMode) return;

    const handler = (e: L.LeafletMouseEvent) => {
      const pos = { lat: e.latlng.lat, lng: e.latlng.lng };
      if (clickMode === "pickup") onPickupChange?.(pos);
      if (clickMode === "dropoff") onDropoffChange?.(pos);
    };

    map.on("click", handler);
    return () => {
      map.off("click", handler);
    };
  }, [interactive, clickMode, onPickupChange, onDropoffChange]);

  return (
    <div className="relative">
      {interactive && (
        <div className="absolute left-12 top-2 z-[1000] flex gap-2">
          <button
            type="button"
            onClick={() => setClickMode(clickMode === "pickup" ? null : "pickup")}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium shadow-card transition-colors ${
              clickMode === "pickup"
                ? "bg-primary text-primary-foreground"
                : "border border-border bg-card text-card-foreground"
            }`}
          >
            📍 Set Pickup
          </button>
          <button
            type="button"
            onClick={() => setClickMode(clickMode === "dropoff" ? null : "dropoff")}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium shadow-card transition-colors ${
              clickMode === "dropoff"
                ? "bg-destructive text-destructive-foreground"
                : "border border-border bg-card text-card-foreground"
            }`}
          >
            🏁 Set Dropoff
          </button>
        </div>
      )}

      <div
        ref={mapElementRef}
        style={{ height, width: "100%", borderRadius: "var(--radius)", zIndex: 1 }}
      />
    </div>
  );
}

// Utility: calculate distance between two coords (Haversine)
export function calcDistance(a: LatLng, b: LatLng): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}

// Utility: estimate time based on distance (avg 30 km/h city)
export function estimateTime(distanceKm: number): number {
  return Math.round((distanceKm / 30) * 60);
}

// Utility: reverse geocode using Nominatim
export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      { headers: { "User-Agent": "MiraLink-Logistics/1.0" } }
    );
    const data = await res.json();
    return data.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  } catch {
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  }
}

// Utility: search address using Nominatim
export async function searchAddress(query: string): Promise<Array<{ lat: number; lng: number; display_name: string }>> {
  if (query.length < 3) return [];
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&countrycodes=in`,
      { headers: { "User-Agent": "MiraLink-Logistics/1.0" } }
    );
    const data = await res.json();
    return data.map((d: any) => ({ lat: parseFloat(d.lat), lng: parseFloat(d.lon), display_name: d.display_name }));
  } catch {
    return [];
  }
}

// Utility: fetch route from OSRM
export async function fetchRoute(pickup: LatLng, dropoff: LatLng): Promise<LatLng[]> {
  try {
    const res = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${pickup.lng},${pickup.lat};${dropoff.lng},${dropoff.lat}?overview=full&geometries=geojson`
    );
    const data = await res.json();
    if (data.routes?.[0]) {
      return data.routes[0].geometry.coordinates.map((c: number[]) => ({ lat: c[1], lng: c[0] }));
    }
  } catch {}
  return [pickup, dropoff];
}

