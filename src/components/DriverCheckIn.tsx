import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LogIn, LogOut, Clock, Calendar, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

interface CheckIn {
  id: string;
  checked_in_at: string;
  checked_out_at: string | null;
}

export default function DriverCheckIn() {
  const { user } = useAuth();
  const [checkins, setCheckins] = useState<CheckIn[]>([]);
  const [activeCheckin, setActiveCheckin] = useState<CheckIn | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCheckins = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("driver_checkins")
      .select("*")
      .eq("user_id", user.id)
      .order("checked_in_at", { ascending: false })
      .limit(14);
    if (data) {
      setCheckins(data as CheckIn[]);
      const active = data.find((c: any) => !c.checked_out_at);
      setActiveCheckin(active as CheckIn || null);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchCheckins(); }, [fetchCheckins]);

  const handleCheckIn = async () => {
    if (!user) return;
    const { error } = await supabase.from("driver_checkins").insert({
      user_id: user.id,
      device_info: navigator.userAgent.slice(0, 100),
    } as any);
    if (error) toast.error(error.message);
    else { toast.success("Checked in! Have a great day 🚚"); fetchCheckins(); }
  };

  const handleCheckOut = async () => {
    if (!activeCheckin) return;
    const { error } = await supabase
      .from("driver_checkins")
      .update({ checked_out_at: new Date().toISOString() } as any)
      .eq("id", activeCheckin.id);
    if (error) toast.error(error.message);
    else { toast.success("Checked out! See you tomorrow 👋"); fetchCheckins(); }
  };

  const formatTime = (d: string) => new Date(d).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  const formatDate = (d: string) => new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", weekday: "short" });

  const getDuration = (start: string, end: string | null) => {
    const diff = (end ? new Date(end).getTime() : Date.now()) - new Date(start).getTime();
    const hrs = Math.floor(diff / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    return `${hrs}h ${mins}m`;
  };

  if (loading) return null;

  return (
    <div className="space-y-6">
      {/* Check-in / Check-out card */}
      <Card className="shadow-card">
        <CardContent className="flex flex-col items-center gap-4 py-8 sm:flex-row sm:justify-between">
          <div className="text-center sm:text-left">
            <h3 className="font-display text-lg font-bold">Daily Check-In</h3>
            {activeCheckin ? (
              <div className="mt-1 space-y-1">
                <Badge className="bg-primary/10 text-primary gap-1">
                  <CheckCircle2 className="h-3 w-3" /> Checked in at {formatTime(activeCheckin.checked_in_at)}
                </Badge>
                <p className="text-xs text-muted-foreground">
                  Duration: {getDuration(activeCheckin.checked_in_at, null)}
                </p>
              </div>
            ) : (
              <p className="mt-1 text-sm text-muted-foreground">You haven't checked in today. Please check in to start accepting deliveries.</p>
            )}
          </div>
          {activeCheckin ? (
            <Button variant="outline" className="gap-2 border-destructive text-destructive hover:bg-destructive/10" onClick={handleCheckOut}>
              <LogOut className="h-4 w-4" /> Check Out
            </Button>
          ) : (
            <Button className="gap-2" onClick={handleCheckIn}>
              <LogIn className="h-4 w-4" /> Check In
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Check-in history */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="font-display flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" /> Check-In History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {checkins.length === 0 ? (
            <p className="py-6 text-center text-muted-foreground">No check-in records yet</p>
          ) : (
            <div className="space-y-2">
              {checkins.map((c) => (
                <div key={c.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                  <div className="flex items-center gap-3">
                    <div className={`h-2.5 w-2.5 rounded-full ${c.checked_out_at ? "bg-muted-foreground" : "bg-primary animate-pulse"}`} />
                    <div>
                      <p className="text-sm font-medium">{formatDate(c.checked_in_at)}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatTime(c.checked_in_at)}
                        {c.checked_out_at ? ` → ${formatTime(c.checked_out_at)}` : " → Active"}
                      </p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="gap-1 text-xs">
                    <Clock className="h-3 w-3" />
                    {getDuration(c.checked_in_at, c.checked_out_at)}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
