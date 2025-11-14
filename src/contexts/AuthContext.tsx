import { createContext, useContext, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { trackLogin, trackLogout } from "@/services/sessionTracking";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  signOut: () => Promise<void>;
  loading: boolean;
  authError: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;
    const startTime = Date.now();
    
    console.log("[AuthContext] 🚀 Initializing auth at", new Date().toISOString());

    // CRITICAL: Maximum 3-second timeout to prevent infinite loading
    const maxTimeout = setTimeout(() => {
      if (mounted && loading) {
        const elapsed = Date.now() - startTime;
        console.error("[AuthContext] ⏰ TIMEOUT after", elapsed, "ms - forcing loading to false");
        setLoading(false);
      }
    }, 3000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted) return;
        
        const elapsed = Date.now() - startTime;
        console.log("[AuthContext] 📢 Auth event:", event, "at", elapsed, "ms | User ID:", session?.user?.id, "Has session:", !!session);
        
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        setAuthError(null);
        
        // Track login in background without blocking
        if (event === 'SIGNED_IN' && session?.user?.id) {
          setTimeout(() => {
            trackLogin(session.user.id, 'email').catch(err => {
              console.log('[AuthContext] Login tracking failed (non-critical):', err.message);
            });
          }, 0);
        }
      }
    );

    supabase.auth.getSession()
      .then(({ data: { session }, error }) => {
        if (!mounted) return;
        
        const elapsed = Date.now() - startTime;
        
        if (error) {
          console.error("[AuthContext] ❌ Error getting session at", elapsed, "ms:", error.message);
          setAuthError(error.message);
          setLoading(false);
          return;
        }
        
        console.log("[AuthContext] ✅ Initial session check at", elapsed, "ms:", !!session, session?.user?.id);
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      })
      .catch((err) => {
        if (!mounted) return;
        
        const elapsed = Date.now() - startTime;
        console.error("[AuthContext] 💥 getSession() rejected at", elapsed, "ms:", err);
        setLoading(false);
        setAuthError(err.message || 'Session initialization failed');
      });

    return () => {
      mounted = false;
      clearTimeout(maxTimeout);
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    try {
      if (user?.id) {
        await trackLogout(user.id).catch(err => {
          console.log('[AuthContext] Logout tracking failed (non-critical):', err.message);
        });
      }

      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      setUser(null);
      setSession(null);
      navigate("/auth");
    } catch (error) {
      console.error("Error signing out:", error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, signOut, loading, authError }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
