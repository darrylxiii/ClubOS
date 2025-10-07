import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { UserRole } from "@/hooks/useUserRole";

interface RoleContextType {
  currentRole: UserRole;
  availableRoles: UserRole[];
  switchRole: (newRole: UserRole) => Promise<void>;
  loading: boolean;
  companyId: string | null;
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

export const RoleProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [currentRole, setCurrentRole] = useState<UserRole>(null);
  const [availableRoles, setAvailableRoles] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [companyId, setCompanyId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    fetchRoles();
  }, [user]);

  useEffect(() => {
    if (!user || availableRoles.length === 0) return;
    
    // Use a ref to track the current role without causing re-subscriptions
    let lastKnownRole = currentRole;
    
    // Subscribe to role preference changes from OTHER sessions/devices only
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
          const newRole = payload.new.preferred_role_view as UserRole;
          // CRITICAL FIX: Only update if the role is actually different to prevent infinite loops
          // Compare against the ref instead of state to avoid stale closure issues
          if (newRole && availableRoles.includes(newRole) && newRole !== lastKnownRole) {
            console.log('[RoleContext] External preference change detected, updating to:', newRole);
            lastKnownRole = newRole;
            setCurrentRole(newRole);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, availableRoles]); // FIXED: Removed currentRole from dependencies to prevent re-subscriptions

  const fetchRoles = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      console.log('[RoleContext] Fetching roles for user:', user.id);
      
      // Get all user roles with timeout
      const rolesPromise = supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      const { data: rolesData, error } = await Promise.race([
        rolesPromise,
        new Promise<{ data: null; error: Error }>((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 5000)
        )
      ]).catch((err) => {
        console.error('[RoleContext] Roles fetch failed:', err);
        return { data: null, error: err };
      });

      let roles: UserRole[] = ['user']; // Always default to user
      
      if (!error && rolesData && rolesData.length > 0) {
        const fetchedRoles = rolesData.map(r => r.role as UserRole);
        roles = [...new Set([...fetchedRoles, 'user'])]; // Ensure 'user' is included
      }

      console.log('[RoleContext] Available roles:', roles);
      setAvailableRoles(roles);

      // Get preferred role (non-blocking)
      let prefsData = null;
      try {
        const result = await supabase
          .from('user_preferences')
          .select('preferred_role_view')
          .eq('user_id', user.id)
          .maybeSingle();
        prefsData = result.data;
      } catch (err) {
        console.error('[RoleContext] Error fetching preferences:', err);
      }

      const preferredRole = prefsData?.preferred_role_view as UserRole;
      
      // Set current role with priority
      let selectedRole: UserRole = 'user';
      
      if (preferredRole && roles.includes(preferredRole)) {
        selectedRole = preferredRole;
      } else {
        // Priority: admin > strategist > partner > user
        const priority: UserRole[] = ['admin', 'strategist', 'partner', 'user'];
        selectedRole = priority.find(r => roles.includes(r)) || 'user';
      }
      
      console.log('[RoleContext] Setting role to:', selectedRole);
      setCurrentRole(selectedRole);

      // Fetch company ID (non-blocking, don't let it fail the whole process)
      supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .maybeSingle()
        .then(({ data }) => {
          if (data?.company_id) {
            setCompanyId(data.company_id);
          }
        });

    } catch (error) {
      console.error('[RoleContext] Critical error in fetchRoles:', error);
      // Always set a default role to prevent redirect loops
      setCurrentRole('user');
      setAvailableRoles(['user']);
    } finally {
      setLoading(false);
    }
  };

  const switchRole = async (newRole: UserRole) => {
    // Prevent switching to the same role
    if (newRole === currentRole) {
      console.log('[RoleContext] Already on role:', newRole);
      return;
    }

    if (!user || !availableRoles.includes(newRole)) {
      console.error('[RoleContext] Cannot switch to unavailable role:', newRole);
      return;
    }

    try {
      // Update local state FIRST to prevent feedback loop
      setCurrentRole(newRole);
      console.log('[RoleContext] Role switched successfully to:', newRole);

      // Then save preference to database
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

      // Log role switch in audit table (non-blocking, fire-and-forget)
      supabase.from('role_change_audit').insert({
        user_id: user.id,
        changed_by: user.id,
        old_roles: [currentRole],
        new_roles: [newRole],
        change_type: 'role_switched',
        metadata: { timestamp: new Date().toISOString() }
      });

    } catch (error) {
      console.error('[RoleContext] Error switching role:', error);
      throw error;
    }
  };

  return (
    <RoleContext.Provider value={{ currentRole, availableRoles, switchRole, loading, companyId }}>
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