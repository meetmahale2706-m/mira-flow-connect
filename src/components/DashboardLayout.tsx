import { Link } from "react-router-dom";
import { Truck, LogOut, Package, MapPin, Car, Settings, BarChart3, Users, Layers, HandMetal, Plus, Navigation, Globe, Bell } from "lucide-react";
import NotificationBell from "@/components/NotificationBell";
import { Badge } from "@/components/ui/badge";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { useI18n } from "@/contexts/I18nContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface DashboardLayoutProps {
  role: "admin" | "driver" | "customer";
  name: string;
  onSignOut: () => void;
  activeTab: string;
  onTabChange: (tab: string) => void;
  children: React.ReactNode;
}

const driverNav = [
  { title: "nav.available", icon: HandMetal, tab: "available" },
  { title: "nav.myDeliveries", icon: Package, tab: "mydeliveries" },
  { title: "nav.pooledRoutes", icon: Layers, tab: "pooled" },
  { title: "nav.earnings", icon: BarChart3, tab: "earnings" },
  { title: "nav.vehicle", icon: Car, tab: "vehicle" },
  { title: "nav.profile", icon: Settings, tab: "profile" },
];

const customerNav = [
  { title: "nav.newDelivery", icon: Plus, tab: "create" },
  { title: "nav.tracking", icon: Navigation, tab: "tracking" },
  { title: "nav.orders", icon: Package, tab: "orders" },
  { title: "nav.addresses", icon: MapPin, tab: "addresses" },
  { title: "nav.profile", icon: Settings, tab: "profile" },
];

const adminNav = [
  { title: "nav.dashboard", icon: BarChart3, tab: "overview" },
  { title: "nav.users", icon: Users, tab: "users" },
  { title: "nav.drivers", icon: Car, tab: "drivers" },
  { title: "nav.deliveries", icon: Package, tab: "deliveries" },
  { title: "nav.analytics", icon: BarChart3, tab: "analytics" },
];

function SidebarNav({ role, name, onSignOut, activeTab, onTabChange }: Omit<DashboardLayoutProps, "children">) {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { t, lang, setLang, languages } = useI18n();

  const navItems = role === "driver" ? driverNav : role === "customer" ? customerNav : adminNav;

  const roleColors: Record<string, string> = {
    admin: "bg-destructive/10 text-destructive",
    driver: "bg-accent/20 text-accent-foreground",
    customer: "bg-primary/10 text-primary",
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarContent className="bg-sidebar text-sidebar-foreground">
        <div className="flex items-center gap-2 px-4 py-4 border-b border-sidebar-border">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg gradient-primary">
              <Truck className="h-4 w-4 text-primary-foreground" />
            </div>
            {!collapsed && <span className="font-display text-lg font-bold text-sidebar-foreground">{t("app.name")}</span>}
          </Link>
        </div>

        {!collapsed && (
          <div className="px-4 py-3 border-b border-sidebar-border">
            <p className="text-xs text-sidebar-foreground/60">{t("common.welcome")}</p>
            <p className="text-sm font-medium text-sidebar-foreground truncate">{name}</p>
            <Badge className={`mt-1 text-xs ${roleColors[role]}`}>{t(`common.${role}`)}</Badge>
          </div>
        )}

        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/50">{t("nav.dashboard")}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.tab}>
                  <SidebarMenuButton
                    isActive={activeTab === item.tab}
                    className={activeTab === item.tab ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50"}
                    onClick={() => onTabChange(item.tab)}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    {!collapsed && <span>{t(item.title)}</span>}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <div className="mt-auto border-t border-sidebar-border p-3 space-y-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 w-full rounded-md px-2 py-1.5 text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent/50 transition-colors">
                <Globe className="h-4 w-4 shrink-0" />
                {!collapsed && <span>{languages.find((l) => l.code === lang)?.name}</span>}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="right" align="end">
              {languages.map((l) => (
                <DropdownMenuItem key={l.code} onClick={() => setLang(l.code)} className={lang === l.code ? "font-semibold" : ""}>
                  {l.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <button
            onClick={onSignOut}
            className="flex items-center gap-2 w-full rounded-md px-2 py-1.5 text-sm text-destructive hover:bg-destructive/10 transition-colors"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {!collapsed && <span>{t("common.signOut")}</span>}
          </button>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}

export default function DashboardLayout({ role, name, onSignOut, activeTab, onTabChange, children }: DashboardLayoutProps) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <SidebarNav role={role} name={name} onSignOut={onSignOut} activeTab={activeTab} onTabChange={onTabChange} />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-12 flex items-center justify-between border-b border-border bg-card/95 backdrop-blur-lg px-4 sticky top-0 z-50">
            <SidebarTrigger className="mr-3" />
            <NotificationBell />
          </header>
          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
