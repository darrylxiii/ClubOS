import { createContext, useContext, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

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
    console.log('[AuthContext] Setting up auth listener');
    
    // Check for existing session immediately
    const initAuth = async () => {
      try {
        console.log('[AuthContext] Getting initial session');
        const { data: { session }, error } = await supabase.auth.getSession();
        console.log('[AuthContext] Initial session:', session, 'error:', error);
        
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        console.log('[AuthContext] Initial auth state set, loading = false');
      } catch (error) {
        console.error('[AuthContext] Error getting session:', error);
        setLoading(false);
      }
    };

    initAuth();

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('[AuthContext] Auth state changed:', event, 'has session:', !!session);
        setSession(session);
        setUser(session?.user ?? null);

        // Redirect based on role on sign in
        if (event === 'SIGNED_IN' && session) {
          setTimeout(async () => {
            // Check if user is a company member
            const { data: memberData } = await supabase
              .from('company_members')
              .select('company_id, role')
              .eq('user_id', session.user.id)
              .eq('is_active', true)
              .maybeSingle();

            if (memberData) {
              navigate('/partner-dashboard');
            } else {
              navigate('/dashboard');
            }
          }, 0);
        }
      }
    );

    return () => {
      console.log('[AuthContext] Cleaning up auth listener');
      subscription.unsubscribe();
    };
  }, [navigate]);

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
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
