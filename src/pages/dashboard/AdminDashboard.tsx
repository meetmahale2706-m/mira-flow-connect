import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Truck, LogOut, Users, BarChart3, Settings } from "lucide-react";

const AdminDashboard = () => {
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
            <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">Admin</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">Welcome, {profile?.name || "Admin"}</span>
            <Button variant="ghost" size="icon" onClick={signOut}><LogOut className="h-4 w-4" /></Button>
          </div>
        </div>
      </nav>
      <div className="container py-12">
        <h1 className="mb-8 font-display text-3xl font-bold">Admin Dashboard</h1>
        <div className="grid gap-6 md:grid-cols-3">
          {[
            { icon: Users, title: "Manage Drivers", desc: "View and manage all registered drivers" },
            { icon: BarChart3, title: "Analytics", desc: "Track delivery performance and metrics" },
            { icon: Settings, title: "Settings", desc: "Configure platform settings" },
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

export default AdminDashboard;
