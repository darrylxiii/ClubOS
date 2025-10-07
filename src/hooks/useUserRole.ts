import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type UserRole = 'admin' | 'partner' | 'company_admin' | 'recruiter' | 'user' | 'strategist' | null;

export const useUserRole = () => {
  const [role, setRole] = useState<UserRole>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const fetchUserRole = async () => {
      if (!user?.id) {
        console.log('[useUserRole] No user found, stopping loading');
        setLoading(false);
        setRole(null);
        setCompanyId(null);
        return;
      }

      console.log('[useUserRole] Fetching role for user:', user.id);

      try {
        // Get ALL user roles from database (single source of truth)
        const { data: rolesData, error: rolesError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id);

        console.log('[useUserRole] User roles data:', rolesData, 'error:', rolesError);

        // Get user's preferred role view from preferences
        const { data: prefsData } = await supabase
          .from('user_preferences')
          .select('preferred_role_view')
          .eq('user_id', user.id)
          .maybeSingle();

        console.log('[useUserRole] User preference:', prefsData);

        // Get profile with company info
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('company_id')
          .eq('id', user.id)
          .maybeSingle();

        console.log('[useUserRole] Profile data:', profileData, 'error:', profileError);

        // Determine role: respect preference if valid, otherwise use priority
        if (rolesData && rolesData.length > 0) {
          const userRoles = rolesData.map(r => r.role);
          const preferredRole = prefsData?.preferred_role_view;
          
          // Type guard to ensure preferredRole is a valid UserRole
          const isValidRole = (role: string): role is UserRole => {
            return ['admin', 'partner', 'company_admin', 'recruiter', 'user', 'strategist'].includes(role);
          };
          
          // If user has a valid preferred role, use it
          if (preferredRole && isValidRole(preferredRole) && userRoles.includes(preferredRole)) {
            console.log('[useUserRole] Using preferred role:', preferredRole);
            setRole(preferredRole);
          } else {
            // Otherwise use priority: admin > strategist > partner > user
            const finalRole: UserRole = rolesData.some(r => r.role === 'admin') ? 'admin' 
              : rolesData.some(r => r.role === 'strategist') ? 'strategist'
              : rolesData.some(r => r.role === 'partner') ? 'partner'
              : 'user';
            console.log('[useUserRole] Using priority role:', finalRole);
            setRole(finalRole);
          }
        } else {
          console.log('[useUserRole] No roles found, defaulting to user');
          setRole('user');
        }

        // Check if user is a company member (for company_id, not role override)
        if (profileData?.company_id) {
          const { data: memberData, error: memberError } = await supabase
            .from('company_members')
            .select('role, company_id')
            .eq('user_id', user.id)
            .eq('is_active', true)
            .maybeSingle();

          console.log('[useUserRole] Member data:', memberData, 'error:', memberError);

          if (memberData) {
            setCompanyId(memberData.company_id);
          }
        }

        console.log('[useUserRole] Final state - roles:', rolesData, 'companyId:', profileData?.company_id);
      } catch (error) {
        console.error('[useUserRole] Error fetching user role:', error);
      } finally {
        console.log('[useUserRole] Setting loading to false');
        setLoading(false);
      }
    };

    fetchUserRole();
  }, [user?.id]);

  return { role, companyId, loading };
};
