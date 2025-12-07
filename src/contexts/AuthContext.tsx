import { createContext, useContext, useEffect, useState, useRef } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { trackLogin, trackLogout } from "@/services/sessionTracking";
import { useSecurityTracking, generateDeviceFingerprint } from "@/hooks/useSecurityTracking";

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
  const { recordLoginAttempt, createSession, endSession } = useSecurityTracking();
  const sessionCreatedRef = useRef<string | null>(null);

  useEffect(() => {
    let mounted = true;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    const startTime = Date.now();
    
    console.log("[AuthContext] 🚀 Initializing auth at", new Date().toISOString());

    // Helper to clear timeout safely
    const clearAuthTimeout = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
        console.log("[AuthContext] ✅ Timeout cleared");
      }
    };

    // CRITICAL: Maximum 3-second timeout to prevent infinite loading
    timeoutId = setTimeout(() => {
      if (mounted && loading) {
        const elapsed = Date.now() - startTime;
        console.error("[AuthContext] ⏰ TIMEOUT after", elapsed, "ms - forcing loading to false");
        setLoading(false);
      }
    }, 3000);

    // PHASE 2: Call getSession() FIRST to ensure user is available immediately
    supabase.auth.getSession()
      .then(({ data: { session }, error }) => {
        if (!mounted) return;
        
        // CRITICAL FIX: Clear timeout IMMEDIATELY when session loads
        clearAuthTimeout();
        
        const elapsed = Date.now() - startTime;
        
        if (error) {
          console.error("[AuthContext] ❌ Error getting session at", elapsed, "ms:", error.message);
          setAuthError(error.message);
          setLoading(false);
          return;
        }
        
        console.log("[AuthContext] ✅ Initial session loaded at", elapsed, "ms:", !!session, "User ID:", session?.user?.id, "Email:", session?.user?.email);
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      })
      .catch((err) => {
        if (!mounted) return;
        
        // Clear timeout on error too
        clearAuthTimeout();
        
        const elapsed = Date.now() - startTime;
        console.error("[AuthContext] 💥 getSession() rejected at", elapsed, "ms:", err);
        setLoading(false);
        setAuthError(err.message || 'Session initialization failed');
      });

    // THEN set up auth state listener for future changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted) return;
        
        const elapsed = Date.now() - startTime;
        console.log("[AuthContext] 📢 Auth event:", event, "at", elapsed, "ms | User ID:", session?.user?.id, "Email:", session?.user?.email, "Has session:", !!session);
        
        setSession(session);
        setUser(session?.user ?? null);
        setAuthError(null);
        
        // Track login and create security session (non-blocking)
        if (event === 'SIGNED_IN' && session?.user?.id) {
          const userId = session.user.id;
          const userEmail = session.user.email || '';
          const sessionId = session.access_token?.substring(0, 32); // Use part of token as session ID
          
          // Prevent duplicate session creation
          if (sessionCreatedRef.current !== userId) {
            sessionCreatedRef.current = userId;
            
            setTimeout(() => {
              // Record successful login attempt
              recordLoginAttempt(userEmail, true).catch(err => {
                console.log('[AuthContext] Login attempt tracking failed (non-critical):', err);
              });
              
              // Create security session
              const fingerprint = generateDeviceFingerprint();
              createSession(userId, sessionId, undefined, undefined, fingerprint).catch(err => {
                console.log('[AuthContext] Security session creation failed (non-critical):', err);
              });
              
              // Legacy session tracking
              trackLogin(userId, 'email').catch(err => {
                console.log('[AuthContext] Login tracking failed (non-critical):', err.message);
              });
            }, 0);
          }
        }
        
        // Clear session ref on sign out
        if (event === 'SIGNED_OUT') {
          sessionCreatedRef.current = null;
        }
      }
    );

    return () => {
      mounted = false;
      clearAuthTimeout();
      subscription.unsubscribe();
    };
  }, [recordLoginAttempt, createSession]);

  const signOut = async () => {
    try {
      if (user?.id) {
        // End security session (non-blocking)
        endSession(user.id).catch(err => {
          console.log('[AuthContext] Security session end failed (non-critical):', err);
        });
        
        await trackLogout(user.id).catch(err => {
          console.log('[AuthContext] Logout tracking failed (non-critical):', err.message);
        });
      }

      // Attempt to sign out from Supabase, but don't fail if session is already invalid
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.log('[AuthContext] Backend signout error (will clear local state anyway):', error.message);
      }
    } catch (error) {
      console.error('[AuthContext] Error during signout (will clear local state anyway):', error);
    } finally {
      // Always clear local state and redirect, even if backend signout fails
      sessionCreatedRef.current = null;
      setUser(null);
      setSession(null);
      navigate("/auth");
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
