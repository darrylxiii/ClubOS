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
    let authInitialized = false;
    const loadStartTime = Date.now();
    
    console.log('[AuthContext] 🚀 Starting auth initialization');
    
    // ENTERPRISE: Ultra-aggressive 2-second timeout
    // Track progress every 500ms for debugging
    const progressInterval = setInterval(() => {
      if (!authInitialized) {
        console.log(`[AuthContext] ⏱️ Still initializing... ${Date.now() - loadStartTime}ms`);
      }
    }, 500);
    
    const emergencyTimeout = setTimeout(() => {
      if (mounted && !authInitialized) {
        const loadTime = Date.now() - loadStartTime;
        console.error(`[AuthContext] 🚨 EMERGENCY TIMEOUT - Forcing loading off after ${loadTime}ms`);
        setLoading(false);
        setAuthError('Authentication initialization timeout');
      }
    }, 2000); // REDUCED: 3s → 2s
    
    const initializeAuth = async () => {
      try {
        console.log('[AuthContext] 🔐 Setting up auth state listener...');
        
        // Set up auth state listener FIRST
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (event, session) => {
            if (!mounted) return;
            
            console.log("[AuthContext] Auth event:", event, session?.user?.id);
            authInitialized = true;
            
            // Track login event (non-blocking - don't await)
            if (event === 'SIGNED_IN' && session?.user?.id) {
              trackLogin(session.user.id, 'email').catch(err => {
                console.log('[AuthContext] Login tracking failed (non-critical):', err.message);
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
            
            // ALWAYS set loading to false on any auth state change
            setLoading(false);
            setAuthError(null);
          }
        );

        // THEN check for existing session with timeout
        const sessionPromise = supabase.auth.getSession();
        const sessionTimeout = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Session check timeout')), 2000)
        );

        try {
          const { data: { session }, error } = await Promise.race([
            sessionPromise,
            sessionTimeout
          ]) as any;
          
          if (!mounted) return;
          
          authInitialized = true;
          
          if (error) {
            console.error("[AuthContext] ⚠️ Error getting session:", error);
            setAuthError(error.message);
          } else {
            console.log("[AuthContext] ✅ Initial session:", session?.user?.id || 'No session');
          }
          
          setSession(session);
          setUser(session?.user ?? null);
          setLoading(false);
        } catch (err: any) {
          if (!mounted) return;
          console.error("[AuthContext] ⚠️ Session check timeout/error:", err.message);
          authInitialized = true;
          setLoading(false);
          setAuthError(err.message);
        }

        return () => {
          subscription.unsubscribe();
        };
      } catch (error: any) {
        if (!mounted) return;
        const loadTime = Date.now() - loadStartTime;
        console.error(`[AuthContext] ❌ Fatal initialization error after ${loadTime}ms:`, error);
        authInitialized = true;
        setLoading(false);
        setAuthError(error.message);
      }
    };

    initializeAuth();

    return () => {
      mounted = false;
      clearTimeout(emergencyTimeout);
      clearInterval(progressInterval);
    };

    return () => {
      mounted = false;
      clearTimeout(emergencyTimeout);
    };
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
