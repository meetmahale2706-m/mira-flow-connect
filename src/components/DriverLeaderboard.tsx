import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Star, TrendingUp, Medal } from "lucide-react";

interface DriverStat {
  driver_id: string;
  name: string;
  totalDeliveries: number;
  avgRating: number;
  totalRatings: number;
}

export default function DriverLeaderboard() {
  const [stats, setStats] = useState<DriverStat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    const [deliveriesRes, ratingsRes, profilesRes] = await Promise.all([
      supabase.from("deliveries").select("driver_id, status").eq("status", "delivered"),
      supabase.from("delivery_ratings").select("driver_id, rating"),
      supabase.from("profiles").select("user_id, name"),
    ]);

    const deliveries = deliveriesRes.data || [];
    const ratings = (ratingsRes.data || []) as any[];
    const profiles = profilesRes.data || [];

    const driverMap = new Map<string, DriverStat>();

    deliveries.forEach((d) => {
      if (!d.driver_id) return;
      if (!driverMap.has(d.driver_id)) {
        const profile = profiles.find((p) => p.user_id === d.driver_id);
        driverMap.set(d.driver_id, {
          driver_id: d.driver_id,
          name: profile?.name || "Unknown Driver",
          totalDeliveries: 0,
          avgRating: 0,
          totalRatings: 0,
        });
      }
      driverMap.get(d.driver_id)!.totalDeliveries++;
    });

    ratings.forEach((r: any) => {
      const stat = driverMap.get(r.driver_id);
      if (stat) {
        stat.totalRatings++;
        stat.avgRating = ((stat.avgRating * (stat.totalRatings - 1)) + r.rating) / stat.totalRatings;
      }
    });

    const sorted = Array.from(driverMap.values()).sort((a, b) => {
      const scoreA = a.avgRating * 0.6 + Math.min(a.totalDeliveries / 10, 5) * 0.4;
      const scoreB = b.avgRating * 0.6 + Math.min(b.totalDeliveries / 10, 5) * 0.4;
      return scoreB - scoreA;
    });

    setStats(sorted);
    setLoading(false);
  };

  const medalColor = (i: number) => {
    if (i === 0) return "text-yellow-500";
    if (i === 1) return "text-gray-400";
    if (i === 2) return "text-amber-600";
    return "text-muted-foreground";
  };

  if (loading) return null;

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="font-display flex items-center gap-2">
          <Trophy className="h-5 w-5 text-yellow-500" />
          Driver Leaderboard
        </CardTitle>
      </CardHeader>
      <CardContent>
        {stats.length === 0 ? (
          <p className="py-8 text-center text-muted-foreground">No delivery data yet</p>
        ) : (
          <div className="space-y-3">
            {stats.slice(0, 10).map((s, i) => (
              <div key={s.driver_id} className="flex items-center gap-4 rounded-lg border border-border p-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center">
                  {i < 3 ? (
                    <Medal className={`h-6 w-6 ${medalColor(i)}`} />
                  ) : (
                    <span className="text-sm font-bold text-muted-foreground">#{i + 1}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{s.name}</p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" />
                      {s.totalDeliveries} deliveries
                    </span>
                    {s.totalRatings > 0 && (
                      <span className="flex items-center gap-1">
                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                        {s.avgRating.toFixed(1)} ({s.totalRatings})
                      </span>
                    )}
                  </div>
                </div>
                {s.avgRating >= 4.5 && s.totalRatings >= 3 && (
                  <Badge className="bg-yellow-400/10 text-yellow-600 text-xs">Top Rated</Badge>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
