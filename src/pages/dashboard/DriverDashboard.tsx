import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Truck, LogOut, MapPin, Package, Clock } from "lucide-react";

const DriverDashboard = () => {
  const { profile, signOut } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border bg-card shadow-card">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg gradient-primary">
              <Truck className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-display text-xl font-bold">MiraLink</span>
            <span className="rounded-full bg-accent/20 px-3 py-1 text-xs font-medium text-accent-foreground">Driver</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">Welcome, {profile?.name || "Driver"}</span>
            <Button variant="ghost" size="icon" onClick={signOut}><LogOut className="h-4 w-4" /></Button>
          </div>
        </div>
      </nav>
      <div className="container py-12">
        <h1 className="mb-8 font-display text-3xl font-bold">Driver Dashboard</h1>
        <div className="grid gap-6 md:grid-cols-3">
          {[
            { icon: MapPin, title: "Active Routes", desc: "View your current delivery routes" },
            { icon: Package, title: "Deliveries", desc: "Manage pending and completed deliveries" },
            { icon: Clock, title: "Schedule", desc: "Check your upcoming delivery schedule" },
          ].map((item) => (
            <div key={item.title} className="rounded-xl border border-border bg-card p-6 shadow-card transition-all hover:shadow-elevated">
              <item.icon className="mb-4 h-8 w-8 text-primary" />
              <h3 className="mb-2 font-display text-lg font-semibold">{item.title}</h3>
              <p className="text-sm text-muted-foreground">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DriverDashboard;
