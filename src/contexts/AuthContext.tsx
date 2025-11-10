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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;
    
    try {
      console.log('[AuthContext] 🔐 Initializing auth state listener...');
      
      // Set up auth state listener FIRST
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          if (!mounted) return;
          
          console.log("[Auth] Auth state changed:", event, session?.user?.id);
          
          // Track login event (non-blocking - don't await)
          if (event === 'SIGNED_IN' && session?.user?.id) {
            trackLogin(session.user.id, 'email').catch(err => {
              console.log('[Auth] Login tracking failed (non-critical):', err.message);
            });
          }
          
          // Ignore refresh token errors - they're expected when tokens expire
          if (event === 'SIGNED_OUT' && !session) {
            setSession(null);
            setUser(null);
          } else {
            setSession(session);
            setUser(session?.user ?? null);
          }
          
          // Set loading to false for all auth state changes
          setLoading(false);
        }
      );

      // THEN check for existing session
      supabase.auth.getSession()
        .then(({ data: { session }, error }) => {
          if (!mounted) return;
          
          if (error) {
            console.error("[Auth] ⚠️ Error getting session:", error);
          }
          console.log("[Auth] Initial session check:", session?.user?.id);
          setSession(session);
          setUser(session?.user ?? null);
          setLoading(false);
        })
        .catch((err) => {
          console.error("[Auth] ❌ Critical error during session check:", err);
          setLoading(false);
        });

      return () => {
        mounted = false;
        subscription.unsubscribe();
      };
    } catch (error) {
      console.error('[AuthContext] ❌ CRITICAL: Error during initialization:', error);
      setLoading(false);
    }
  }, []);

  const signOut = async () => {
    console.log("[Auth] Signing out");
    
    try {
      // Step 1: Track logout and update presence (non-blocking)
      if (user?.id) {
        // Fire and forget - don't block sign out
        const trackingPromises = [
          trackLogout(user.id).catch(err => 
            console.log('[Auth] Logout tracking failed (non-critical):', err.message)
          ),
          (async () => {
            try {
              await supabase
                .from('user_presence')
                .update({
                  status: 'offline',
                  last_seen: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                })
                .eq('user_id', user.id);
            } catch (err) {
              console.log('[Auth] Presence update failed (non-critical)');
            }
          })()
        ];
        
        // Don't await - let it run in background
        Promise.all(trackingPromises).catch(() => {
          // Ignore all tracking errors
        });
      }

      // Step 2: Sign out from Supabase with global scope
      const { error } = await supabase.auth.signOut({ scope: 'global' });
      if (error) {
        console.error("[Auth] Sign out error:", error);
        // Don't throw - still proceed with local cleanup
      }

      // Step 3: Clear local state
      setSession(null);
      setUser(null);

      // Step 4: Navigate to auth page (let React Router handle it)
      navigate("/auth", { replace: true });
    } catch (error) {
      console.error("[Auth] Sign out failed:", error);
      // Force navigation even if sign out fails
      setSession(null);
      setUser(null);
      navigate("/auth", { replace: true });
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, signOut, loading }}>
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
