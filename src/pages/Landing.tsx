import { Link } from "react-router-dom";
import { motion, useInView } from "framer-motion";
import { useRef, useState, useEffect } from "react";
import {
  Truck, Shield, Zap, MapPin, Route, BarChart3, Users, Fuel,
  ArrowRight, CheckCircle2, TrendingUp, Clock, Star, ChevronRight,
  Globe, Layers, Brain, Phone
} from "lucide-react";
import { Button } from "@/components/ui/button";
import ThemeToggle from "@/components/ThemeToggle";

/* ─── Animated counter ─── */
function AnimatedCounter({ target, suffix = "", prefix = "" }: { target: number; suffix?: string; prefix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const duration = 2000;
    const step = target / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= target) { setCount(target); clearInterval(timer); }
      else setCount(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [inView, target]);

  return <span ref={ref}>{prefix}{count}{suffix}</span>;
}

/* ─── Section wrapper ─── */
function Section({ children, className = "", id }: { children: React.ReactNode; className?: string; id?: string }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <motion.section
      ref={ref}
      id={id}
      initial={{ opacity: 0, y: 40 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.section>
  );
}

/* ─── Data ─── */
const features = [
  { icon: Route, title: "Smart Route Optimization", desc: "AI-powered routing that maximizes profit per delivery while minimizing fuel consumption and idle time." },
  { icon: Shield, title: "Congestion Avoidance", desc: "Real-time traffic zone monitoring avoids 8+ known bottlenecks during peak hours automatically." },
  { icon: Fuel, title: "Fuel Cost Savings", desc: "Drivers save up to 30% on fuel costs with optimized multi-stop routes and efficiency scoring." },
  { icon: TrendingUp, title: "Profit Maximization", desc: "Each delivery is scored by profitability — drivers always pick the most rewarding routes." },
  { icon: Brain, title: "AI-Powered Decisions", desc: "Machine learning analyzes traffic patterns, delivery density, and driver capacity in real-time." },
  { icon: Globe, title: "Multi-Language Support", desc: "Full support for English, Hindi, and Marathi — built for drivers and customers across India." },
];

const keyPoints = [
  { icon: Route, title: "Smart Route Optimizer", desc: "Greedy algorithm ranks deliveries by profit/km, builds multi-stop routes with minimal detours, and avoids real-time congestion zones." },
  { icon: Layers, title: "Delivery Pooling Engine", desc: "Groups nearby deliveries into batched routes, reducing total distance by up to 40% and increasing driver earnings per trip." },
  { icon: BarChart3, title: "Real-Time Analytics", desc: "Live dashboards for admins with delivery KPIs, driver performance, revenue tracking, and customer satisfaction metrics." },
  { icon: Users, title: "Role-Based Architecture", desc: "Separate dashboards for Admin, Driver, and Customer — each with tailored features, RLS-secured data, and real-time updates." },
  { icon: Phone, title: "AI Support Chat", desc: "Built-in AI-powered support chatbot that handles customer queries, delivery issues, and driver assistance 24/7." },
  { icon: MapPin, title: "Live GPS Tracking", desc: "Customers track their delivery in real-time on an interactive map with driver location updates and ETA calculations." },
];

const howItWorks = [
  { step: "01", title: "Customer Places Order", desc: "Enter pickup & dropoff addresses, select time slot, and get instant cost estimation." },
  { step: "02", title: "AI Optimizes Routes", desc: "Our algorithm scores deliveries by profitability, avoids traffic zones, and batches nearby orders." },
  { step: "03", title: "Driver Accepts & Delivers", desc: "Drivers see ranked deliveries with profit scores, accept the best routes, and follow optimized paths." },
  { step: "04", title: "Track & Rate", desc: "Customers track in real-time, receive notifications, and rate the delivery experience." },
];

const stats = [
  { value: 30, suffix: "%", label: "Fuel Savings" },
  { value: 40, suffix: "%", label: "Faster Deliveries" },
  { value: 8, suffix: "+", label: "Traffic Zones Monitored" },
  { value: 3, suffix: "", label: "Languages Supported" },
];

const Landing = () => {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* ─── Nav ─── */}
      <nav className={`fixed top-0 z-50 w-full transition-all duration-300 ${scrolled ? "border-b border-border/50 bg-background/95 backdrop-blur-xl shadow-card" : "bg-transparent"}`}>
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <motion.div
              whileHover={{ rotate: 10, scale: 1.1 }}
              className="flex h-9 w-9 items-center justify-center rounded-lg gradient-primary"
            >
              <Truck className="h-5 w-5 text-primary-foreground" />
            </motion.div>
            <span className="font-display text-xl font-bold text-foreground">MiraLink</span>
          </div>
          <div className="hidden md:flex items-center gap-6">
            <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Features</a>
            <a href="#how-it-works" className="text-sm text-muted-foreground hover:text-foreground transition-colors">How It Works</a>
            <a href="#key-points" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Key Points</a>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" asChild>
              <Link to="/login">Sign In</Link>
            </Button>
            <Button asChild className="shadow-elevated">
              <Link to="/register">Get Started <ArrowRight className="ml-1 h-4 w-4" /></Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* ─── Hero ─── */}
      <section className="relative overflow-hidden pt-16">
        <div className="gradient-hero">
          {/* Animated background shapes */}
          <div className="absolute inset-0 overflow-hidden">
            <motion.div
              animate={{ x: [0, 30, 0], y: [0, -20, 0] }}
              transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
              className="absolute top-20 left-[10%] w-72 h-72 rounded-full opacity-10"
              style={{ background: "radial-gradient(circle, hsl(174 62% 38% / 0.5), transparent 70%)" }}
            />
            <motion.div
              animate={{ x: [0, -20, 0], y: [0, 30, 0] }}
              transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
              className="absolute bottom-20 right-[15%] w-96 h-96 rounded-full opacity-10"
              style={{ background: "radial-gradient(circle, hsl(38 92% 50% / 0.4), transparent 70%)" }}
            />
            <motion.div
              animate={{ x: [0, 15, 0], y: [0, 15, 0] }}
              transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-5"
              style={{ background: "radial-gradient(circle, hsl(174 62% 38% / 0.6), transparent 60%)" }}
            />
          </div>

          <div className="container relative flex min-h-[90vh] flex-col items-center justify-center py-20 text-center">
            <motion.span
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-5 py-2 text-sm font-medium text-primary"
            >
              <Zap className="h-4 w-4" />
              Smart Logistics for Modern Cities
            </motion.span>

            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.1 }}
              className="mb-6 max-w-5xl font-display text-5xl font-bold leading-tight text-primary-foreground md:text-7xl lg:text-8xl"
            >
              Deliver Smarter,{" "}
              <span className="text-primary">Not Harder</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="mb-10 max-w-2xl text-lg text-muted-foreground md:text-xl"
            >
              MiraLink uses AI-powered route optimization and delivery pooling to reduce traffic, 
              save fuel, and maximize driver profits — all in real-time.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.3 }}
              className="flex flex-col gap-4 sm:flex-row"
            >
              <Button size="lg" className="px-8 text-base shadow-elevated animate-pulse-glow" asChild>
                <Link to="/register">
                  Start Free <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="border-primary/30 px-8 text-base text-primary-foreground hover:bg-primary/10" asChild>
                <Link to="/login">Sign In</Link>
              </Button>
            </motion.div>

            {/* Floating trust badges */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6, duration: 0.8 }}
              className="mt-16 flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground"
            >
              {["AI-Powered Routing", "Real-Time Tracking", "Multi-Language", "Secure & Fast"].map((t) => (
                <span key={t} className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  {t}
                </span>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* ─── Stats ─── */}
      <Section className="py-16 border-b border-border">
        <div className="container">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="text-center"
              >
                <div className="font-display text-4xl md:text-5xl font-bold text-primary">
                  <AnimatedCounter target={s.value} suffix={s.suffix} />
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{s.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </Section>

      {/* ─── Features ─── */}
      <Section id="features" className="py-24">
        <div className="container">
          <div className="mb-16 text-center">
            <span className="mb-3 inline-block rounded-full bg-primary/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-primary">
              Features
            </span>
            <h2 className="mb-4 font-display text-3xl font-bold md:text-5xl">Why Choose MiraLink?</h2>
            <p className="mx-auto max-w-2xl text-muted-foreground">
              Built for the future of urban logistics — connecting admins, drivers, and customers seamlessly with AI.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                whileHover={{ y: -6, scale: 1.02 }}
                className="group relative overflow-hidden rounded-xl border border-border bg-card p-6 shadow-card transition-shadow hover:shadow-elevated"
              >
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  style={{ background: "radial-gradient(circle at 50% 0%, hsl(174 62% 38% / 0.05), transparent 60%)" }}
                />
                <div className="relative">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg gradient-primary text-primary-foreground transition-transform group-hover:scale-110 group-hover:rotate-3">
                    <f.icon className="h-6 w-6" />
                  </div>
                  <h3 className="mb-2 font-display text-lg font-semibold">{f.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </Section>

      {/* ─── How It Works ─── */}
      <Section id="how-it-works" className="py-24 bg-secondary/30">
        <div className="container">
          <div className="mb-16 text-center">
            <span className="mb-3 inline-block rounded-full bg-accent/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-accent">
              Process
            </span>
            <h2 className="mb-4 font-display text-3xl font-bold md:text-5xl">How MiraLink Works</h2>
            <p className="mx-auto max-w-2xl text-muted-foreground">
              From order to delivery — optimized at every step.
            </p>
          </div>
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            {howItWorks.map((item, i) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="relative"
              >
                {i < howItWorks.length - 1 && (
                  <div className="hidden lg:block absolute top-8 left-full w-full h-px border-t-2 border-dashed border-primary/20 z-0" />
                )}
                <div className="relative rounded-xl border border-border bg-card p-6 shadow-card">
                  <span className="font-display text-3xl font-bold text-primary/20">{item.step}</span>
                  <h3 className="mt-2 font-display text-lg font-semibold">{item.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </Section>

      {/* ─── Key Points (Presentation) ─── */}
      <Section id="key-points" className="py-24">
        <div className="container">
          <div className="mb-16 text-center">
            <span className="mb-3 inline-block rounded-full bg-primary/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-primary">
              Project Highlights
            </span>
            <h2 className="mb-4 font-display text-3xl font-bold md:text-5xl">What Makes MiraLink Outstanding</h2>
            <p className="mx-auto max-w-2xl text-muted-foreground">
              Technical innovations and smart features that set this project apart.
            </p>
          </div>
          <div className="grid gap-8 md:grid-cols-2">
            {keyPoints.map((kp, i) => (
              <motion.div
                key={kp.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                whileHover={{ scale: 1.02 }}
                className="group flex gap-5 rounded-xl border border-border bg-card p-6 shadow-card transition-all hover:shadow-elevated hover:border-primary/30"
              >
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl gradient-primary text-primary-foreground transition-transform group-hover:scale-110">
                  <kp.icon className="h-7 w-7" />
                </div>
                <div>
                  <h3 className="font-display text-lg font-semibold mb-1 flex items-center gap-2">
                    {kp.title}
                    <ChevronRight className="h-4 w-4 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{kp.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </Section>

      {/* ─── Tech Stack ─── */}
      <Section className="py-16 bg-secondary/30 border-y border-border">
        <div className="container text-center">
          <h3 className="font-display text-lg font-semibold mb-6 text-muted-foreground">Built With Modern Technologies</h3>
          <div className="flex flex-wrap items-center justify-center gap-6">
            {["React + TypeScript", "Tailwind CSS", "Lovable Cloud", "Leaflet Maps", "AI Models", "Real-Time DB"].map((tech, i) => (
              <motion.span
                key={tech}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="rounded-full border border-border bg-card px-5 py-2 text-sm font-medium text-foreground shadow-card"
              >
                {tech}
              </motion.span>
            ))}
          </div>
        </div>
      </Section>

      {/* ─── CTA ─── */}
      <Section className="py-24">
        <div className="container">
          <div className="relative overflow-hidden rounded-2xl gradient-hero p-12 md:p-16 text-center">
            <div className="absolute inset-0 opacity-10"
              style={{ background: "radial-gradient(circle at 30% 50%, hsl(174 62% 38% / 0.4), transparent 50%), radial-gradient(circle at 80% 30%, hsl(38 92% 50% / 0.3), transparent 50%)" }}
            />
            <div className="relative">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
              >
                <Star className="mx-auto mb-4 h-10 w-10 text-accent" />
                <h2 className="mb-4 font-display text-3xl font-bold text-primary-foreground md:text-5xl">
                  Ready to Optimize Your Deliveries?
                </h2>
                <p className="mb-8 mx-auto max-w-xl text-muted-foreground">
                  Join MiraLink and experience AI-powered logistics that saves time, fuel, and money.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button size="lg" className="px-10 text-base shadow-elevated" asChild>
                    <Link to="/register">Get Started Free <ArrowRight className="ml-1 h-4 w-4" /></Link>
                  </Button>
                  <Button size="lg" variant="outline" className="border-primary/30 px-10 text-base text-primary-foreground hover:bg-primary/10" asChild>
                    <Link to="/login">Sign In</Link>
                  </Button>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </Section>

      {/* ─── Footer ─── */}
      <footer className="border-t border-border bg-secondary py-10">
        <div className="container">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-primary" />
              <span className="font-display font-bold text-secondary-foreground">MiraLink</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <a href="#features" className="hover:text-foreground transition-colors">Features</a>
              <a href="#how-it-works" className="hover:text-foreground transition-colors">How It Works</a>
              <a href="#key-points" className="hover:text-foreground transition-colors">Key Points</a>
            </div>
            <p className="text-sm text-muted-foreground">© 2026 MiraLink. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
