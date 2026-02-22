import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useAuthPrefetch } from "@/hooks/useAuthPrefetch";
import { supabase } from "@/integrations/supabase/client";
import { UserRole } from "@/types/roles";
import { logger } from "@/lib/logger";

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
  const { data: prefetch, isLoading: prefetchLoading } = useAuthPrefetch();
  const [currentRole, setCurrentRole] = useState<UserRole>('user');
  const [availableRoles, setAvailableRoles] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  // Derive roles from prefetch cache instead of fetching independently
  useEffect(() => {
    if (!user || prefetchLoading || !prefetch || initialized) return;

    const roles = prefetch.roles;
    setAvailableRoles(roles);
    setCompanyId(prefetch.profile?.company_id || null);

    // Determine current role from preferences
    const preferredRole = prefetch.preferences?.preferred_role_view as UserRole;
    let selectedRole: UserRole = 'user';

    if (preferredRole && roles.includes(preferredRole)) {
      selectedRole = preferredRole;
    } else {
      const priority: UserRole[] = ['admin', 'strategist', 'partner', 'user'];
      selectedRole = priority.find((r) => roles.includes(r)) || 'user';
    }

    logger.info('[RoleContext] ✅ Role set from prefetch cache', { selectedRole });
    setCurrentRole(selectedRole);
    setLoading(false);
    setInitialized(true);
  }, [user, prefetch, prefetchLoading, initialized]);

  // Reset on user change
  useEffect(() => {
    if (!user) {
      setLoading(false);
      setInitialized(false);
      setAvailableRoles([]);
      setCurrentRole('user');
      setCompanyId(null);
    }
  }, [user]);

  // Subscribe to role preference changes from OTHER sessions/devices
  useEffect(() => {
    if (!user || availableRoles.length === 0) return;

    const lastKnownRoleRef = { current: currentRole };

    const channel = supabase
      .channel('role-preference-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'user_preferences',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newRole = payload.new.preferred_role_view as UserRole;
          if (newRole && availableRoles.includes(newRole) && newRole !== lastKnownRoleRef.current) {
            logger.info('[RoleContext] External preference change detected', { newRole });
            lastKnownRoleRef.current = newRole;
            setCurrentRole(newRole);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, availableRoles]); // Do NOT include currentRole

  const switchRole = useCallback(async (newRole: UserRole) => {
    if (newRole === currentRole) return;
    if (!user) throw new Error('User not authenticated');
    if (!availableRoles.includes(newRole)) throw new Error(`Role ${newRole} is not available`);

    const previousRole = currentRole;

    try {
      setCurrentRole(newRole);

      let retries = 3;
      let lastError = null;

      while (retries > 0) {
        try {
          const { error } = await supabase
            .from('user_preferences')
            .upsert(
              { user_id: user.id, preferred_role_view: newRole, updated_at: new Date().toISOString() },
              { onConflict: 'user_id' }
            );
          if (error) throw error;
          lastError = null;
          break;
        } catch (err) {
          lastError = err;
          retries--;
          if (retries > 0) await new Promise((r) => setTimeout(r, 500 * Math.pow(2, 2 - retries)));
        }
      }

      if (!lastError) {
        try {
          await supabase
            .from('role_change_audit')
            .insert({
              user_id: user.id,
              changed_by: user.id,
              old_roles: [previousRole],
              new_roles: [newRole],
              change_type: 'role_switched',
              metadata: { timestamp: new Date().toISOString(), success: true },
            });
        } catch (auditError) {
          logger.warn('[RoleContext] Failed to log audit entry:', auditError);
        }
      }
    } catch (error) {
      logger.error('[RoleContext] Critical error switching role, reverting:', error);
      setCurrentRole(previousRole);
      throw error;
    }
  }, [user, currentRole, availableRoles]);

  const contextValue = useMemo(
    () => ({ currentRole, availableRoles, switchRole, loading, companyId }),
    [currentRole, availableRoles, switchRole, loading, companyId]
  );

  return <RoleContext.Provider value={contextValue}>{children}</RoleContext.Provider>;
};

export const useRole = () => {
  const context = useContext(RoleContext);
  if (context === undefined) {
    throw new Error("useRole must be used within a RoleProvider");
  }
  return context;
};
