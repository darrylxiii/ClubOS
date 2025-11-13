import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
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

  const fetchRoles = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      console.log('[RoleContext] Fetching roles for user:', user.id);
      
      // Fast parallel fetch - no artificial timeouts
      const rolesPromise = supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      const { data: rolesData, error } = await rolesPromise;

      let roles: UserRole[] = ['user']; // Always default to user
      
      if (!error && rolesData && rolesData.length > 0) {
        const fetchedRoles: UserRole[] = rolesData.map(r => r.role as UserRole);
        roles = [...new Set([...fetchedRoles, 'user' as UserRole])]; // Ensure 'user' is included
      }

      console.log('[RoleContext] Available roles:', roles);
      setAvailableRoles(roles);

      // Get preferred role (non-blocking)
      const { data: prefsData } = await supabase
        .from('user_preferences')
        .select('preferred_role_view')
        .eq('user_id', user.id)
        .maybeSingle();

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
      
      console.log('[RoleContext] ✅ Setting role to:', selectedRole);
      setCurrentRole(selectedRole);

      // Fetch company ID (non-blocking)
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
      console.error('[RoleContext] Error in fetchRoles:', error);
      setCurrentRole('user');
      setAvailableRoles(['user']);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

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

  const switchRole = async (newRole: UserRole) => {
    // Prevent switching to the same role
    if (newRole === currentRole) {
      console.log('[RoleContext] Already on role:', newRole);
      return;
    }

    if (!user) {
      console.error('[RoleContext] Cannot switch role: User not authenticated');
      throw new Error('User not authenticated');
    }

    if (!availableRoles.includes(newRole)) {
      console.error('[RoleContext] Cannot switch to unavailable role:', newRole, 'Available:', availableRoles);
      throw new Error(`Role ${newRole} is not available for this user`);
    }

    const previousRole = currentRole;

    try {
      // Update local state FIRST to provide immediate UI feedback
      setCurrentRole(newRole);
      console.log('[RoleContext] Role switched locally to:', newRole);

      // Then save preference to database with retry logic
      let retries = 3;
      let lastError = null;
      
      while (retries > 0) {
        try {
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
          
          console.log('[RoleContext] Role preference saved to database');
          
          // Success - break out of retry loop
          lastError = null;
          break;
        } catch (err) {
          lastError = err;
          retries--;
          console.warn(`[RoleContext] Failed to save preference (${3 - retries}/3):`, err);
          
          if (retries > 0) {
            // Wait before retrying (exponential backoff: 500ms, 1s, 2s)
            await new Promise(resolve => setTimeout(resolve, 500 * Math.pow(2, 2 - retries)));
          }
        }
      }

      // If all retries failed, log but don't revert (user can try again)
      if (lastError) {
        console.error('[RoleContext] Failed to persist role preference after 3 attempts:', lastError);
        // Don't throw - let the UI update succeed even if DB save failed
        // The preference will be saved on next successful switch
      } else {
        // Only log audit if DB save was successful (non-blocking)
        try {
          await supabase.from('role_change_audit').insert({
            user_id: user.id,
            changed_by: user.id,
            old_roles: [previousRole],
            new_roles: [newRole],
            change_type: 'role_switched',
            metadata: { 
              timestamp: new Date().toISOString(),
              success: true
            }
          });
        } catch (auditError) {
          console.warn('[RoleContext] Failed to log audit entry:', auditError);
        }
      }

    } catch (error) {
      // Revert local state on critical errors
      console.error('[RoleContext] Critical error switching role, reverting:', error);
      setCurrentRole(previousRole);
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