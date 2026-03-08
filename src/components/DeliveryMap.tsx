import { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix default marker icons
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

function FitBounds({ pickup, dropoff }: { pickup?: LatLng | null; dropoff?: LatLng | null }) {
  const map = useMap();
  useEffect(() => {
    if (pickup && dropoff) {
      const bounds = L.latLngBounds([pickup, dropoff]);
      map.fitBounds(bounds, { padding: [50, 50] });
    } else if (pickup) {
      map.setView(pickup, 14);
    } else if (dropoff) {
      map.setView(dropoff, 14);
    }
  }, [pickup, dropoff, map]);
  return null;
}

function ClickHandler({
  mode,
  onPickup,
  onDropoff,
}: {
  mode: "pickup" | "dropoff" | null;
  onPickup?: (pos: LatLng) => void;
  onDropoff?: (pos: LatLng) => void;
}) {
  const map = useMap();
  useEffect(() => {
    if (!mode) return;
    const handler = (e: L.LeafletMouseEvent) => {
      const pos = { lat: e.latlng.lat, lng: e.latlng.lng };
      if (mode === "pickup" && onPickup) onPickup(pos);
      if (mode === "dropoff" && onDropoff) onDropoff(pos);
    };
    map.on("click", handler);
    return () => { map.off("click", handler); };
  }, [mode, onPickup, onDropoff, map]);
  return null;
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
  const defaultCenter: LatLng = { lat: 12.9716, lng: 77.5946 }; // Bangalore

  return (
    <div className="relative">
      {interactive && (
        <div className="absolute top-2 left-12 z-[1000] flex gap-2">
          <button
            type="button"
            onClick={() => setClickMode(clickMode === "pickup" ? null : "pickup")}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium shadow-card transition-colors ${
              clickMode === "pickup"
                ? "bg-primary text-primary-foreground"
                : "bg-card text-card-foreground border border-border"
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
                : "bg-card text-card-foreground border border-border"
            }`}
          >
            🏁 Set Dropoff
          </button>
        </div>
      )}
      <MapContainer
        center={pickup || dropoff || defaultCenter}
        zoom={12}
        style={{ height, width: "100%", borderRadius: "var(--radius)", zIndex: 1 }}
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds pickup={pickup} dropoff={dropoff} />
        {interactive && (
          <ClickHandler
            mode={clickMode}
            onPickup={onPickupChange}
            onDropoff={onDropoffChange}
          />
        )}
        {pickup && (
          <Marker position={pickup} icon={pickupIcon}>
            <Popup>Pickup Location</Popup>
          </Marker>
        )}
        {dropoff && (
          <Marker position={dropoff} icon={dropoffIcon}>
            <Popup>Dropoff Location</Popup>
          </Marker>
        )}
        {route && route.length > 1 && (
          <Polyline
            positions={route}
            pathOptions={{ color: "hsl(174, 62%, 38%)", weight: 4, opacity: 0.8 }}
          />
        )}
      </MapContainer>
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
