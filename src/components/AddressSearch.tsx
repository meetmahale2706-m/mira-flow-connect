import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { MapPin, Clock } from "lucide-react";

interface SearchResult {
  lat: number;
  lng: number;
  display_name: string;
}

interface AddressSearchProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (result: SearchResult) => void;
  placeholder?: string;
  icon?: "pickup" | "dropoff";
}

// Popular locations in Mira-Bhayandar & Mumbai for quick suggestions
const LOCAL_SUGGESTIONS: SearchResult[] = [
  { lat: 19.2952, lng: 72.8544, display_name: "Mira Road Station, Mira Bhayandar, Maharashtra" },
  { lat: 19.3045, lng: 72.8503, display_name: "Bhayandar Station, Bhayandar West, Maharashtra" },
  { lat: 19.2883, lng: 72.8568, display_name: "Mira Road East, Mira Bhayandar, Maharashtra" },
  { lat: 19.2812, lng: 72.8645, display_name: "Kashimira, Mira Bhayandar, Maharashtra" },
  { lat: 19.2760, lng: 72.8540, display_name: "Sheetal Nagar, Mira Road, Maharashtra" },
  { lat: 19.3100, lng: 72.8460, display_name: "Bhayandar East, Mira Bhayandar, Maharashtra" },
  { lat: 19.2690, lng: 72.8630, display_name: "Beverly Park, Mira Road, Maharashtra" },
  { lat: 19.2995, lng: 72.8680, display_name: "Navghar, Mira Bhayandar, Maharashtra" },
  { lat: 19.2240, lng: 72.8635, display_name: "Dahisar, Mumbai, Maharashtra" },
  { lat: 19.2094, lng: 72.8410, display_name: "Borivali Station, Mumbai, Maharashtra" },
  { lat: 19.1895, lng: 72.8490, display_name: "Kandivali Station, Mumbai, Maharashtra" },
  { lat: 19.1760, lng: 72.8498, display_name: "Malad Station, Mumbai, Maharashtra" },
  { lat: 19.1197, lng: 72.8464, display_name: "Andheri Station, Mumbai, Maharashtra" },
  { lat: 19.0760, lng: 72.8777, display_name: "Bandra Station, Mumbai, Maharashtra" },
  { lat: 19.0178, lng: 72.8478, display_name: "Dadar Station, Mumbai, Maharashtra" },
  { lat: 18.9402, lng: 72.8356, display_name: "CST (Chhatrapati Shivaji Terminus), Mumbai" },
  { lat: 19.0896, lng: 72.8656, display_name: "Mumbai Airport (T2), Mumbai, Maharashtra" },
  { lat: 19.1550, lng: 72.8494, display_name: "Goregaon Station, Mumbai, Maharashtra" },
  { lat: 19.2300, lng: 72.8570, display_name: "Mira Bhayandar Municipal Corporation, Maharashtra" },
  { lat: 19.2633, lng: 72.8520, display_name: "Pleasant Park, Mira Road, Maharashtra" },
];

// Search via Photon (Komoot) — fast, autocomplete-friendly geocoder biased toward Mumbai
async function searchAddressLocal(query: string): Promise<SearchResult[]> {
  if (query.length < 2) return [];
  try {
    // Photon supports autocomplete-style queries and is much faster than Nominatim
    const res = await fetch(
      `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=6&lat=19.295&lon=72.854&lang=en`
    );
    const data = await res.json();
    return (data.features || []).map((f: any) => {
      const p = f.properties;
      const parts = [p.name, p.street, p.district, p.city, p.state, p.country].filter(Boolean);
      return {
        lat: f.geometry.coordinates[1],
        lng: f.geometry.coordinates[0],
        display_name: parts.join(", "),
      };
    });
  } catch {
    return [];
  }
}

export default function AddressSearch({ value, onChange, onSelect, placeholder, icon }: AddressSearchProps) {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [showLocal, setShowLocal] = useState(false);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<number>();
  const containerRef = useRef<HTMLDivElement>(null);

  // Filter local suggestions + API search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (value.length === 0) {
      setResults([]);
      return;
    }

    // Immediately filter local suggestions
    const query = value.toLowerCase();
    const localMatches = LOCAL_SUGGESTIONS.filter((s) =>
      s.display_name.toLowerCase().includes(query)
    ).slice(0, 4);

    if (localMatches.length > 0) {
      setResults(localMatches);
      setShowLocal(true);
      setOpen(true);
    }

    if (value.length < 2) return;

    debounceRef.current = window.setTimeout(async () => {
      const apiResults = await searchAddressLocal(value);
      // Merge: local first, then API (deduplicated)
      const localNames = new Set(localMatches.map((l) => l.display_name));
      const merged = [
        ...localMatches,
        ...apiResults.filter((r) => !localNames.has(r.display_name)),
      ].slice(0, 8);
      setResults(merged);
      setShowLocal(localMatches.length > 0);
      setOpen(merged.length > 0);
    }, 350);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value]);

  // Show popular places on focus when empty
  const handleFocus = () => {
    if (value.length === 0) {
      setResults(LOCAL_SUGGESTIONS.slice(0, 6));
      setShowLocal(true);
      setOpen(true);
    } else if (results.length > 0) {
      setOpen(true);
    }
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <MapPin
          className={`absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 ${
            icon === "pickup" ? "text-primary" : "text-destructive"
          }`}
        />
        <Input
          className="pl-9"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={handleFocus}
          placeholder={placeholder || "Search Mira-Bhayandar, Mumbai..."}
        />
      </div>
      {open && results.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-border bg-popover shadow-elevated max-h-60 overflow-auto">
          {value.length === 0 && (
            <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground border-b border-border flex items-center gap-1.5">
              <Clock className="h-3 w-3" /> Popular locations
            </div>
          )}
          {results.map((r, i) => (
            <button
              key={i}
              type="button"
              className="flex w-full items-start gap-2 px-3 py-2.5 text-left text-sm hover:bg-muted transition-colors"
              onClick={() => {
                onSelect(r);
                onChange(r.display_name);
                setOpen(false);
              }}
            >
              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <span className="line-clamp-2 text-popover-foreground">{r.display_name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
