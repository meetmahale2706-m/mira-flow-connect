import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Truck, UserCircle, Car, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { toast } from "sonner";
import { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

const roles: { value: AppRole; label: string; icon: React.ElementType; desc: string }[] = [
  { value: "admin", label: "Admin", icon: UserCircle, desc: "Manage fleet & operations" },
  { value: "driver", label: "Driver", icon: Car, desc: "Deliver packages efficiently" },
  { value: "customer", label: "Customer", icon: Package, desc: "Send & receive packages" },
];

const Register = () => {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [selectedRole, setSelectedRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRole) {
      toast.error("Please select a role");
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name, mobile },
        emailRedirectTo: window.location.origin + "/dashboard",
      },
    });
    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }
    if (data.user) {
      // Update profile with mobile
      await supabase.from("profiles").update({ name, mobile }).eq("user_id", data.user.id);
      // Insert role
      await supabase.from("user_roles").insert({ user_id: data.user.id, role: selectedRole });
      toast.success("Account created! Please check your email to verify.");
      navigate("/login");
    }
    setLoading(false);
  };

  const handleGoogleRegister = async () => {
    setLoading(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin + "/register/complete",
    });
    if (result.error) {
      toast.error(result.error.message || "Google sign-up failed");
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Left Panel */}
      <div className="hidden w-1/2 gradient-hero lg:flex lg:flex-col lg:items-center lg:justify-center lg:p-12">
        <div className="max-w-md text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl gradient-primary animate-pulse-glow">
            <Truck className="h-8 w-8 text-primary-foreground" />
          </div>
          <h2 className="mb-4 font-display text-4xl font-bold text-secondary-foreground">Join MiraLink</h2>
          <p className="text-muted-foreground">Create your account and start optimizing your delivery operations today.</p>
        </div>
      </div>

      {/* Right Panel */}
      <div className="flex w-full flex-col items-center justify-center p-8 lg:w-1/2">
        <div className="w-full max-w-md">
          <Link to="/" className="mb-8 flex items-center gap-2 lg:hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg gradient-primary">
              <Truck className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-display text-xl font-bold">MiraLink</span>
          </Link>

          <h1 className="mb-2 font-display text-3xl font-bold">Create Account</h1>
          <p className="mb-8 text-muted-foreground">Select your role and fill in your details</p>

          {/* Role Selection */}
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
                <r.icon className={`mb-2 h-8 w-8 transition-colors ${selectedRole === r.value ? "text-primary" : "text-muted-foreground group-hover:text-primary/60"}`} />
                <span className="text-sm font-semibold">{r.label}</span>
                <span className="mt-1 text-center text-xs text-muted-foreground">{r.desc}</span>
              </button>
            ))}
          </div>

          {/* Google */}
          <Button variant="outline" className="mb-6 w-full gap-2" onClick={handleGoogleRegister} disabled={loading}>
            <svg className="h-5 w-5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
            Sign up with Google
          </Button>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
            <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground">or register with email</span></div>
          </div>

          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <Label htmlFor="name">Full Name</Label>
              <Input id="name" placeholder="John Doe" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="reg-email">Email</Label>
              <Input id="reg-email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="mobile">Mobile Number</Label>
              <Input id="mobile" type="tel" placeholder="+91 9876543210" value={mobile} onChange={(e) => setMobile(e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="reg-password">Password</Label>
              <Input id="reg-password" type="password" placeholder="Min 6 characters" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
            </div>
            <Button type="submit" className="w-full" disabled={loading || !selectedRole}>
              {loading ? "Creating account..." : "Create Account"}
            </Button>
          </form>

          <p className="mt-8 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link to="/login" className="font-medium text-primary hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
