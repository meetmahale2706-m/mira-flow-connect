import { Link } from "react-router-dom";
import { Truck, Shield, Zap, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";

const features = [
  { icon: Truck, title: "Real-Time Tracking", desc: "Track every delivery with live GPS updates and smart route optimization." },
  { icon: Shield, title: "Secure & Reliable", desc: "Enterprise-grade security for all logistics data and transactions." },
  { icon: Zap, title: "Lightning Fast", desc: "Reduce delivery times with AI-powered route planning." },
  { icon: MapPin, title: "Smart Routing", desc: "Minimize traffic congestion with intelligent delivery coordination." },
];

const Landing = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="fixed top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-lg">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg gradient-primary">
              <Truck className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-display text-xl font-bold text-foreground">MiraLink</span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" asChild>
              <Link to="/login">Sign In</Link>
            </Button>
            <Button asChild>
              <Link to="/register">Get Started</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden pt-16">
        <div className="gradient-hero">
          <div className="container relative flex min-h-[85vh] flex-col items-center justify-center py-20 text-center">
            <div className="absolute inset-0 opacity-10" style={{
              backgroundImage: "radial-gradient(circle at 30% 50%, hsl(174 62% 38% / 0.3), transparent 50%), radial-gradient(circle at 70% 30%, hsl(38 92% 50% / 0.2), transparent 50%)"
            }} />
            <span className="relative mb-6 inline-block rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary animate-fade-in">
              Smart Logistics for Modern Cities
            </span>
            <h1 className="relative mb-6 max-w-4xl font-display text-5xl font-bold leading-tight text-secondary-foreground md:text-7xl animate-fade-in" style={{ animationDelay: "0.1s" }}>
              Deliver Smarter,{" "}
              <span className="text-primary">Not Harder</span>
            </h1>
            <p className="relative mb-10 max-w-2xl text-lg text-muted-foreground animate-fade-in" style={{ animationDelay: "0.2s" }}>
              MiraLink coordinates deliveries between drivers and customers to reduce traffic congestion and maximize delivery efficiency.
            </p>
            <div className="relative flex flex-col gap-4 sm:flex-row animate-fade-in" style={{ animationDelay: "0.3s" }}>
              <Button size="lg" className="px-8 text-base" asChild>
                <Link to="/register">Start Free</Link>
              </Button>
              <Button size="lg" variant="outline" className="border-muted-foreground/30 px-8 text-base text-secondary-foreground hover:bg-secondary/80" asChild>
                <Link to="/login">Sign In</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24">
        <div className="container">
          <div className="mb-16 text-center">
            <h2 className="mb-4 font-display text-3xl font-bold md:text-4xl">Why MiraLink?</h2>
            <p className="mx-auto max-w-2xl text-muted-foreground">
              Built for the future of urban logistics — connecting admins, drivers, and customers seamlessly.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {features.map((f, i) => (
              <div
                key={f.title}
                className="group rounded-xl border border-border bg-card p-6 shadow-card transition-all hover:shadow-elevated hover:-translate-y-1 animate-fade-in"
                style={{ animationDelay: `${0.1 * i}s` }}
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg gradient-primary text-primary-foreground transition-transform group-hover:scale-110">
                  <f.icon className="h-6 w-6" />
                </div>
                <h3 className="mb-2 font-display text-lg font-semibold">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-secondary py-8">
        <div className="container flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-primary" />
            <span className="font-display font-bold text-secondary-foreground">MiraLink</span>
          </div>
          <p className="text-sm text-muted-foreground">© 2026 MiraLink. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
