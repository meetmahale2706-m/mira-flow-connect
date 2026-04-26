import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search, ArrowLeft, BookOpen } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import ThemeToggle from "@/components/ThemeToggle";

type QA = { q: string; a: string; category: string };

const QAS: QA[] = [
  // Concept
  { category: "Concept", q: "What is MiraLink?", a: "An AI-powered smart logistics web platform connecting customers, drivers and admins, with route optimization and delivery pooling to cut fuel cost and traffic." },
  { category: "Concept", q: "What problem does it solve?", a: "Inefficient last-mile delivery in Indian cities — single-package trips, congestion and low driver earnings." },
  { category: "Concept", q: "Who are the target users?", a: "Customers booking deliveries, gig/fleet drivers fulfilling them, and admins monitoring operations in Mira-Bhayandar / Mumbai." },
  { category: "Concept", q: "How is it different from Dunzo or Porter?", a: "Profit-per-km ranking, transparent multi-stop pooling, congestion-zone avoidance, and multilingual UI in English/Hindi/Marathi." },

  // Tech Stack
  { category: "Tech Stack", q: "What frontend framework do you use?", a: "React 18 with TypeScript 5, bundled by Vite 5 and styled with Tailwind CSS v3 + shadcn/ui (Radix primitives)." },
  { category: "Tech Stack", q: "Why React + TypeScript over plain JS?", a: "Type safety catches bugs at compile time, improves IDE intellisense, and makes refactoring large role-based dashboards safer." },
  { category: "Tech Stack", q: "Why Vite instead of CRA?", a: "Vite uses native ES modules and esbuild, giving sub-second hot reload and much faster production builds." },
  { category: "Tech Stack", q: "Why Tailwind CSS?", a: "Utility-first classes plus HSL semantic tokens defined once in index.css let us theme the whole app and toggle dark mode from one place." },
  { category: "Tech Stack", q: "What backend does it use?", a: "Lovable Cloud — managed PostgreSQL with built-in Auth, Storage, Realtime and Edge Functions (Deno)." },
  { category: "Tech Stack", q: "What other libraries are used?", a: "Framer Motion (animations), React Router v6, TanStack Query (server state), Leaflet (maps), Recharts (analytics), Lucide icons, Vitest (tests)." },
  { category: "Tech Stack", q: "Why use shadcn/ui?", a: "Accessible Radix-based components with full source ownership — we can customize them without fighting a CSS-in-JS library." },

  // Security & RLS
  { category: "Security (RLS)", q: "What is Row-Level Security?", a: "A PostgreSQL feature that filters table rows per query based on the authenticated user, enforcing access control at the database layer instead of only the API." },
  { category: "Security (RLS)", q: "Why store roles in a separate user_roles table?", a: "Storing roles on profiles enables privilege escalation if a profile UPDATE policy is too loose. A separate user_roles table with admin-only writes is the secure pattern." },
  { category: "Security (RLS)", q: "What is the has_role() function?", a: "A SECURITY DEFINER SQL function that checks user_roles without triggering recursive RLS, used inside policies." },
  { category: "Security (RLS)", q: "How is privilege escalation prevented?", a: "Roles live in user_roles; INSERT/UPDATE there is admin-only; admins cannot self-register or self-demote; all role checks go through has_role()." },
  { category: "Security (RLS)", q: "Can a user query someone else's deliveries?", a: "No. RLS policies on the deliveries table restrict SELECT to auth.uid() = customer_id (or assigned driver, or admin)." },
  { category: "Security (RLS)", q: "Where do you store secrets?", a: "Server-side only — Lovable Cloud secrets like LOVABLE_API_KEY and SERVICE_ROLE_KEY. The frontend uses only the public anon/publishable key." },
  { category: "Security (RLS)", q: "What auth methods are supported?", a: "Email/password and Google OAuth via Supabase Auth. Sessions are JWT-based and managed by the SDK." },
  { category: "Security (RLS)", q: "How are passwords stored?", a: "We never store passwords. Supabase Auth handles hashing (bcrypt) and verification — we only see the user_id and email." },

  // Algorithms & Routing
  { category: "Algorithms", q: "Explain the Smart Route Optimizer.", a: "A greedy nearest-neighbour algorithm augmented with profit-per-km scoring. It picks the highest-scoring delivery, then iteratively appends the next nearest delivery whose detour cost is below a threshold." },
  { category: "Algorithms", q: "Why greedy and not full TSP?", a: "TSP is NP-hard. For small driver batches (5–15 stops) a greedy heuristic returns a near-optimal route in milliseconds — the right trade-off for live dispatch." },
  { category: "Algorithms", q: "How does delivery pooling work?", a: "Deliveries within a configurable radius (~1.5 km) and overlapping time slots are clustered into a single multi-stop trip, cutting total distance by up to 40%." },
  { category: "Algorithms", q: "How is delivery cost calculated?", a: "cost = base_fare + (distance_km × per_km_rate) + (weight_kg × weight_rate), multiplied by a surge factor during peak hours. See src/utils/pricing.ts." },
  { category: "Algorithms", q: "What is the Haversine formula?", a: "It computes great-circle distance between two lat/lng points on a sphere. Used for distance, ETA, and the 500m geofence trigger." },
  { category: "Algorithms", q: "How does congestion avoidance work?", a: "8+ known traffic zones are pre-mapped. The optimizer adds a penalty cost when a route segment intersects a zone during peak hours, so the greedy step naturally picks alternatives." },
  { category: "Algorithms", q: "How does the 500m proximity alert work?", a: "A Postgres trigger check_driver_proximity() runs on driver location updates, computes Haversine distance to the dropoff, and inserts a one-time notification when under 500m." },

  // Real-time & Notifications
  { category: "Real-time", q: "How is live tracking implemented?", a: "Driver browser pushes lat/lng to the deliveries row every few seconds. Customer subscribes to Supabase Realtime on that row and updates the Leaflet marker on each change." },
  { category: "Real-time", q: "How are notifications generated?", a: "Postgres trigger functions like notify_delivery_status_change insert into the notifications table on status change; the client subscribes via Realtime and rings the bell." },
  { category: "Real-time", q: "Why use database triggers instead of app code?", a: "Triggers guarantee notifications fire even if the action came from a different client or admin tool — single source of truth at the DB layer." },

  // Payments
  { category: "Payments", q: "Which payment methods are supported?", a: "Cash on Delivery (COD) and UPI. Stripe is intentionally on hold for the current scope." },
  { category: "Payments", q: "How does COD confirmation work?", a: "After delivery, the driver taps 'Mark Collected' which sets payment_status='paid' and paid_at=now() on the deliveries row." },
  { category: "Payments", q: "How does UPI work without a payment gateway?", a: "We generate a upi://pay deep link with the merchant VPA. The customer pays via any UPI app and submits the UTR, stored in upi_transaction_id for reconciliation." },
  { category: "Payments", q: "Is the UPI flow secure?", a: "We never handle card or bank credentials — UPI is bank-to-bank. The UTR is just a reference for reconciliation, not sensitive payment data." },

  // AI & Multilingual
  { category: "AI", q: "How is AI used in MiraLink?", a: "Two ways: (1) the heuristic route optimizer for live dispatch, and (2) a 24×7 support chatbot calling Lovable AI Gateway (Gemini/GPT) via an Edge Function." },
  { category: "AI", q: "Did you train your own ML model?", a: "No — we used a heuristic for routing (more interpretable for live dispatch) and pre-trained LLMs through Lovable AI for chat. A custom model wasn't needed for the MVP." },
  { category: "AI", q: "How is multilingual support implemented?", a: "A custom React I18nContext stores the current language and translation map. Components call t('key'). Three locales: English, Hindi, Marathi." },

  // Architecture & Database
  { category: "Architecture", q: "Describe the system architecture.", a: "3-tier: React SPA (presentation), Supabase SDK + Edge Functions (application), PostgreSQL with RLS (data)." },
  { category: "Architecture", q: "List the main tables.", a: "profiles, user_roles, deliveries, driver_profiles, delivery_addresses, delivery_ratings, driver_checkins, notifications, support_messages." },
  { category: "Architecture", q: "What are Edge Functions used for?", a: "Server-side logic needing secrets — the support-chat function calls Lovable AI, and seed-test-users provisions demo accounts." },
  { category: "Architecture", q: "How are proof-of-delivery photos stored?", a: "In the public Supabase Storage bucket 'delivery-proofs'; the URL is saved on the deliveries row as proof_photo_url." },

  // Deployment
  { category: "Deployment", q: "Where is MiraLink deployed?", a: "Frontend on Vercel as an SPA (vercel.json rewrites all routes to index.html). Backend is Lovable Cloud (managed Supabase)." },
  { category: "Deployment", q: "How will it scale?", a: "Lovable Cloud auto-scales Postgres and edge functions; Vercel handles CDN. For heavier load we can upsize the DB instance from Cloud → Overview → Advanced settings." },
  { category: "Deployment", q: "What about offline / poor network?", a: "PWA-ready React app with cached assets; React Query gives optimistic updates so critical actions feel instant." },
  { category: "Deployment", q: "How do you manage environment variables?", a: ".env is auto-managed (VITE_SUPABASE_URL, anon key). Server secrets stay in Lovable Cloud secrets, never in client code." },
  { category: "Deployment", q: "How is CI/CD handled?", a: "Each commit deploys automatically to Vercel; database migrations are versioned in supabase/migrations and applied via Lovable Cloud." },

  // Testing & Quality
  { category: "Testing", q: "How do you test the app?", a: "Vitest for unit tests, manual QA across three seeded role accounts (admin/driver/customer), and Lighthouse for performance/SEO checks." },
  { category: "Testing", q: "Biggest technical challenge?", a: "Designing RLS policies that let drivers see only pending or their own assigned deliveries, and preventing geofence triggers from spamming notifications (solved with a one-time EXISTS check)." },

  // Future
  { category: "Future", q: "How would you improve MiraLink in v2?", a: "ML-based ETA prediction trained on traffic, Stripe online payments, automated driver payouts, native mobile app via React Native, and live driver-customer chat." },
];

const CATEGORIES = ["All", ...Array.from(new Set(QAS.map((q) => q.category)))];

const VivaQA = () => {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("All");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return QAS.filter((item) => {
      const matchesCat = activeCategory === "All" || item.category === activeCategory;
      const matchesQuery =
        !q ||
        item.q.toLowerCase().includes(q) ||
        item.a.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q);
      return matchesCat && matchesQuery;
    });
  }, [query, activeCategory]);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur-xl">
        <div className="container flex h-16 items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/">
                <ArrowLeft className="mr-1 h-4 w-4" /> Home
              </Link>
            </Button>
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              <h1 className="font-display text-lg font-semibold">Viva Q&amp;A</h1>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="container py-10">
        <div className="mx-auto max-w-3xl">
          <div className="mb-8 text-center">
            <h2 className="mb-3 font-display text-3xl font-bold md:text-4xl">
              MiraLink Viva Preparation
            </h2>
            <p className="text-muted-foreground">
              {QAS.length}+ likely examiner questions with concise model answers — covering tech stack,
              security, routing algorithms, payments and deployment.
            </p>
          </div>

          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search questions or answers..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9"
              aria-label="Search Q&A"
            />
          </div>

          <div className="mb-6 flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => (
              <Badge
                key={cat}
                variant={activeCategory === cat ? "default" : "secondary"}
                className="cursor-pointer select-none px-3 py-1 text-xs"
                onClick={() => setActiveCategory(cat)}
              >
                {cat}
              </Badge>
            ))}
          </div>

          <p className="mb-4 text-sm text-muted-foreground">
            Showing <span className="font-medium text-foreground">{filtered.length}</span> of {QAS.length}
          </p>

          {filtered.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-10 text-center text-muted-foreground">
              No questions match your search.
            </div>
          ) : (
            <Accordion type="multiple" className="space-y-2">
              {filtered.map((item, i) => (
                <AccordionItem
                  key={`${item.q}-${i}`}
                  value={`${i}`}
                  className="rounded-lg border border-border bg-card px-4"
                >
                  <AccordionTrigger className="text-left hover:no-underline">
                    <div className="flex flex-1 items-start gap-3 pr-3">
                      <Badge variant="outline" className="mt-0.5 shrink-0 text-[10px]">
                        {item.category}
                      </Badge>
                      <span className="font-medium">{item.q}</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                    {item.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </div>
      </main>
    </div>
  );
};

export default VivaQA;
