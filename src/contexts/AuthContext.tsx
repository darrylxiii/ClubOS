import { createContext, useContext, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  signOut: () => Promise<void>;
  loading: boolean;
  userRoles: string[];
  isPartner: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [isPartner, setIsPartner] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUserRoles = async (userId: string) => {
      const { data: rolesData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);

      const roles = rolesData?.map(r => r.role) || [];
      setUserRoles(roles);

      // Check if user is a company member (partner)
      const { data: memberData } = await supabase
        .from('company_members')
        .select('id')
        .eq('user_id', userId)
        .eq('is_active', true)
        .single();

      setIsPartner(!!memberData);

      return { roles, isPartner: !!memberData };
    };

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        // Redirect to appropriate dashboard on sign in
        if (event === 'SIGNED_IN' && session) {
          const { isPartner } = await fetchUserRoles(session.user.id);
          setTimeout(() => {
            navigate(isPartner ? '/partner-dashboard' : '/dashboard');
          }, 0);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session) {
        await fetchUserRoles(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  return (
    <AuthContext.Provider value={{ user, session, signOut, loading, userRoles, isPartner }}>
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
