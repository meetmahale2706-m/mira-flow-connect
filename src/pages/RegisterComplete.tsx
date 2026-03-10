import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Truck, UserCircle, Car, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

const roles: { value: AppRole; label: string; icon: React.ElementType; desc: string }[] = [
  { value: "driver", label: "Driver", icon: Car, desc: "Deliver packages efficiently" },
  { value: "customer", label: "Customer", icon: Package, desc: "Send & receive packages" },
];

const RegisterComplete = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [mobile, setMobile] = useState("");
  const [selectedRole, setSelectedRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(false);

  const handleComplete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRole || !user) {
      toast.error("Please select a role");
      return;
    }
    setLoading(true);
    await supabase.from("profiles").update({ mobile }).eq("user_id", user.id);
    await supabase.from("user_roles").insert({ user_id: user.id, role: selectedRole });
    toast.success("Registration complete!");
    navigate(`/dashboard/${selectedRole}`);
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-8">
      <div className="w-full max-w-md">
        <div className="mb-8 flex items-center justify-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg gradient-primary">
            <Truck className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-display text-xl font-bold">MiraLink</span>
        </div>

        <h1 className="mb-2 text-center font-display text-3xl font-bold">Complete Your Profile</h1>
        <p className="mb-8 text-center text-muted-foreground">Select your role and add your phone number</p>

        <div className="mb-6 grid grid-cols-3 gap-3">
          {roles.map((r) => (
            <button
              key={r.value}
              type="button"
              onClick={() => setSelectedRole(r.value)}
              className={`group flex flex-col items-center rounded-xl border-2 p-4 transition-all ${
                selectedRole === r.value
                  ? "border-primary bg-primary/5 shadow-card"
                  : "border-border hover:border-primary/40"
              }`}
            >
              <r.icon className={`mb-2 h-8 w-8 transition-colors ${selectedRole === r.value ? "text-primary" : "text-muted-foreground"}`} />
              <span className="text-sm font-semibold">{r.label}</span>
              <span className="mt-1 text-center text-xs text-muted-foreground">{r.desc}</span>
            </button>
          ))}
        </div>

        <form onSubmit={handleComplete} className="space-y-4">
          <div>
            <Label htmlFor="mobile">Mobile Number</Label>
            <Input id="mobile" type="tel" placeholder="+91 9876543210" value={mobile} onChange={(e) => setMobile(e.target.value)} required />
          </div>
          <Button type="submit" className="w-full" disabled={loading || !selectedRole}>
            {loading ? "Completing..." : "Complete Registration"}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default RegisterComplete;
