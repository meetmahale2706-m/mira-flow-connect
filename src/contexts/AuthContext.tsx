import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

// Session duration by role
const SESSION_DURATION: Record<string, number> = {
  driver: 24 * 60 * 60 * 1000,      // 24 hours
  customer: 30 * 24 * 60 * 60 * 1000, // 30 days
  admin: 30 * 24 * 60 * 60 * 1000,    // 30 days
};

interface AuthContextType {
  session: Session | null;
  user: User | null;
  role: AppRole | null;
  profile: Database["public"]["Tables"]["profiles"]["Row"] | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  role: null,
  profile: null,
  loading: true,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [profile, setProfile] = useState<Database["public"]["Tables"]["profiles"]["Row"] | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserData = async (userId: string) => {
    const [profileRes, roleRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("user_id", userId).single(),
      supabase.rpc("get_user_role", { _user_id: userId }),
    ]);
    if (profileRes.data) setProfile(profileRes.data);
    if (roleRes.data) setRole(roleRes.data);
    return { profile: profileRes.data, role: roleRes.data };
  };

  const checkSessionExpiry = (userRole: AppRole | null, lastLogin: string | null) => {
    if (!userRole || !lastLogin) return false;
    const maxDuration = SESSION_DURATION[userRole] || SESSION_DURATION.customer;
    const loginTime = new Date(lastLogin).getTime();
    const elapsed = Date.now() - loginTime;
    return elapsed > maxDuration;
  };

  const recordLogin = async (userId: string) => {
    await supabase.from("profiles").update({ last_login_at: new Date().toISOString() } as any).eq("user_id", userId);
    localStorage.setItem("miralink-last-login", new Date().toISOString());
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          const userData = await fetchUserData(session.user.id);

          // On sign in, record the login time
          if (event === "SIGNED_IN") {
            await recordLogin(session.user.id);
          }

          // Check session expiry based on role
          const lastLogin = localStorage.getItem("miralink-last-login") || (userData.profile as any)?.last_login_at;
          if (userData.role && checkSessionExpiry(userData.role, lastLogin)) {
            await supabase.auth.signOut();
            setSession(null);
            setUser(null);
            setRole(null);
            setProfile(null);
            localStorage.removeItem("miralink-last-login");
            setLoading(false);
            return;
          }
        } else {
          setRole(null);
          setProfile(null);
        }
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        const userData = await fetchUserData(session.user.id);
        
        const lastLogin = localStorage.getItem("miralink-last-login") || (userData.profile as any)?.last_login_at;
        if (userData.role && checkSessionExpiry(userData.role, lastLogin)) {
          await supabase.auth.signOut();
          setSession(null);
          setUser(null);
          setRole(null);
          setProfile(null);
          localStorage.removeItem("miralink-last-login");
        }
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setRole(null);
    setProfile(null);
    localStorage.removeItem("miralink-last-login");
  };

  return (
    <AuthContext.Provider value={{ session, user, role, profile, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
