import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useAuthPrefetch, CompanyMembership } from "@/hooks/useAuthPrefetch";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { UserRole } from "@/types/roles";
import { logger } from "@/lib/logger";

interface RoleContextType {
  currentRole: UserRole;
  availableRoles: UserRole[];
  switchRole: (newRole: UserRole) => Promise<void>;
  loading: boolean;
  companyId: string | null;
  /** All companies the user is a member of */
  companies: CompanyMembership[];
  /** Switch active company context */
  switchCompany: (companyId: string) => Promise<void>;
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

export const RoleProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const { data: prefetch, isLoading: prefetchLoading } = useAuthPrefetch();
  const queryClient = useQueryClient();
  const [currentRole, setCurrentRole] = useState<UserRole>('user');
  const [availableRoles, setAvailableRoles] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [companies, setCompanies] = useState<CompanyMembership[]>([]);
  const [initialized, setInitialized] = useState(false);

  // Derive roles from prefetch cache instead of fetching independently
  useEffect(() => {
    if (!user || prefetchLoading || !prefetch || initialized) return;

    const roles = prefetch.roles;
    setAvailableRoles(roles);

    // Store all company memberships
    setCompanies(prefetch.companyMemberships);

    // Resolve active company: preference → first membership → legacy profile
    const resolvedCompanyId =
      prefetch.activeCompanyId ||
      prefetch.companyMemberships[0]?.company_id ||
      prefetch.profile?.company_id ||
      null;
    setCompanyId(resolvedCompanyId);

    // Determine current role from preferences
    const preferredRole = prefetch.preferences?.preferred_role_view as UserRole;
    let selectedRole: UserRole = 'user';

    if (preferredRole && roles.includes(preferredRole)) {
      selectedRole = preferredRole;
    } else {
      const priority: UserRole[] = ['admin', 'strategist', 'partner', 'user'];
      selectedRole = priority.find((r) => roles.includes(r)) || 'user';
    }

    logger.info('[RoleContext] ✅ Role set from prefetch cache', { selectedRole, companiesCount: prefetch.companyMemberships.length });
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
      setCompanies([]);
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

          // Also handle external company switch
          const newCompanyId = payload.new.active_company_id as string | null;
          if (newCompanyId && newCompanyId !== companyId && companies.some(c => c.company_id === newCompanyId)) {
            logger.info('[RoleContext] External company switch detected', { newCompanyId });
            setCompanyId(newCompanyId);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, availableRoles]); // Do NOT include currentRole or companyId

  const switchCompany = useCallback(async (newCompanyId: string) => {
    if (newCompanyId === companyId) return;
    if (!user) throw new Error('User not authenticated');

    const membership = companies.find(c => c.company_id === newCompanyId);
    if (!membership) throw new Error(`Not a member of company ${newCompanyId}`);

    const previousCompanyId = companyId;

    try {
      // Optimistic update
      setCompanyId(newCompanyId);

      // Persist to user_preferences
      const { error } = await supabase
        .from('user_preferences')
        .upsert(
          {
            user_id: user.id,
            active_company_id: newCompanyId,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        );

      if (error) throw error;

      logger.info('[RoleContext] Company switched', {
        from: previousCompanyId,
        to: newCompanyId,
        companyName: membership.company_name,
      });

      // Invalidate all queries that might depend on company context
      queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey;
          // Invalidate queries containing the old or new company ID, or 'company' in key
          return key.some(
            (k) =>
              k === previousCompanyId ||
              k === newCompanyId ||
              (typeof k === 'string' && (k.includes('company') || k.includes('partner') || k.includes('job') || k.includes('application') || k.includes('billing') || k.includes('sla')))
          );
        },
      });
    } catch (error) {
      logger.error('[RoleContext] Failed to switch company, reverting:', error);
      setCompanyId(previousCompanyId);
      throw error;
    }
  }, [user, companyId, companies, queryClient]);

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
    () => ({ currentRole, availableRoles, switchRole, loading, companyId, companies, switchCompany }),
    [currentRole, availableRoles, switchRole, loading, companyId, companies, switchCompany]
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
