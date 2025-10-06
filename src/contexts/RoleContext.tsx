import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { UserRole } from "@/hooks/useUserRole";

interface RoleContextType {
  currentRole: UserRole;
  availableRoles: UserRole[];
  switchRole: (newRole: UserRole) => Promise<void>;
  loading: boolean;
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

export const RoleProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [currentRole, setCurrentRole] = useState<UserRole>(null);
  const [availableRoles, setAvailableRoles] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    fetchRoles();
    
    // Subscribe to role preference changes
    const channel = supabase
      .channel('role-preference-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'user_preferences',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('[RoleContext] Preference updated:', payload);
          const newRole = payload.new.preferred_role_view as UserRole;
          if (newRole && availableRoles.includes(newRole)) {
            setCurrentRole(newRole);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const fetchRoles = async () => {
    if (!user) return;

    try {
      // Get all user roles
      const { data: rolesData, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      if (error) throw error;

      const roles: UserRole[] = rolesData?.map(r => r.role as UserRole) || ['user'];
      
      // Always include 'user' as a fallback
      if (!roles.includes('user')) {
        roles.push('user');
      }

      setAvailableRoles(roles);

      // Get preferred role
      const { data: prefsData } = await supabase
        .from('user_preferences')
        .select('preferred_role_view')
        .eq('user_id', user.id)
        .maybeSingle();

      const preferredRole = prefsData?.preferred_role_view as UserRole;
      
      // Set current role
      if (preferredRole && roles.includes(preferredRole)) {
        setCurrentRole(preferredRole);
      } else {
        // Priority: admin > strategist > partner > user
        const priority: UserRole[] = ['admin', 'strategist', 'partner', 'user'];
        const defaultRole = priority.find(r => roles.includes(r)) || 'user';
        setCurrentRole(defaultRole);
      }
    } catch (error) {
      console.error('[RoleContext] Error fetching roles:', error);
      setCurrentRole('user');
      setAvailableRoles(['user']);
    } finally {
      setLoading(false);
    }
  };

  const switchRole = async (newRole: UserRole) => {
    if (!user || !availableRoles.includes(newRole)) {
      console.error('[RoleContext] Cannot switch to unavailable role:', newRole);
      return;
    }

    try {
      // Save preference to database
      const { error } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: user.id,
          preferred_role_view: newRole,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });

      if (error) throw error;

      // Log role switch in audit table
      await supabase.from('role_change_audit').insert({
        user_id: user.id,
        changed_by: user.id,
        old_roles: [currentRole],
        new_roles: [newRole],
        change_type: 'role_switched',
        metadata: { timestamp: new Date().toISOString() }
      });

      // Update local state - this triggers re-renders
      setCurrentRole(newRole);
      
      console.log('[RoleContext] Role switched successfully to:', newRole);
    } catch (error) {
      console.error('[RoleContext] Error switching role:', error);
      throw error;
    }
  };

  return (
    <RoleContext.Provider value={{ currentRole, availableRoles, switchRole, loading }}>
      {children}
    </RoleContext.Provider>
  );
};

export const useRole = () => {
  const context = useContext(RoleContext);
  if (context === undefined) {
    throw new Error("useRole must be used within a RoleProvider");
  }
  return context;
};