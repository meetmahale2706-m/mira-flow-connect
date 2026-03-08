import { Link } from "react-router-dom";
import { Truck, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface DashboardNavProps {
  role: "admin" | "driver" | "customer";
  name: string;
  onSignOut: () => void;
}

const roleLabel: Record<string, string> = {
  admin: "Admin",
  driver: "Driver",
  customer: "Customer",
};

const DashboardNav = ({ role, name, onSignOut }: DashboardNavProps) => {
  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur-lg shadow-card">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg gradient-primary">
              <Truck className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-display text-xl font-bold">MiraLink</span>
          </Link>
          <Badge variant="secondary" className="capitalize">{roleLabel[role]}</Badge>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-muted-foreground sm:block">Welcome, {name}</span>
          <Button variant="ghost" size="sm" className="gap-2" onClick={onSignOut}>
            <LogOut className="h-4 w-4" /> Sign Out
          </Button>
        </div>
      </div>
    </nav>
  );
};

export default DashboardNav;
