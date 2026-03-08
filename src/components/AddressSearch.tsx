import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { MapPin } from "lucide-react";
import { searchAddress } from "@/components/DeliveryMap";

interface AddressSearchProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (result: { lat: number; lng: number; display_name: string }) => void;
  placeholder?: string;
  icon?: "pickup" | "dropoff";
}

export default function AddressSearch({ value, onChange, onSelect, placeholder, icon }: AddressSearchProps) {
  const [results, setResults] = useState<Array<{ lat: number; lng: number; display_name: string }>>([]);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<number>();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.length < 3) { setResults([]); return; }
    debounceRef.current = window.setTimeout(async () => {
      const res = await searchAddress(value);
      setResults(res);
      setOpen(res.length > 0);
    }, 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [value]);

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
        <MapPin className={`absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 ${icon === "pickup" ? "text-primary" : "text-destructive"}`} />
        <Input
          className="pl-9"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder={placeholder}
        />
      </div>
      {open && results.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-border bg-popover shadow-elevated max-h-48 overflow-auto">
          {results.map((r, i) => (
            <button
              key={i}
              type="button"
              className="flex w-full items-start gap-2 px-3 py-2 text-left text-sm hover:bg-muted transition-colors"
              onClick={() => {
                onSelect(r);
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
