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
      if (!user) {
        console.log('[useUserRole] No user found, stopping loading');
        setLoading(false);
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

        // Get profile with company info
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('company_id')
          .eq('id', user.id)
          .maybeSingle();

        console.log('[useUserRole] Profile data:', profileData, 'error:', profileError);

        // Determine role based on database only (server-side priority)
        if (rolesData && rolesData.length > 0) {
          // Priority: admin > strategist > partner > user
          const finalRole = rolesData.some(r => r.role === 'admin') ? 'admin' 
            : rolesData.some(r => r.role === 'strategist') ? 'strategist'
            : rolesData.some(r => r.role === 'partner') ? 'partner'
            : 'user';
          console.log('[useUserRole] Using server-side priority role:', finalRole);
          setRole(finalRole);
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
  }, [user]);

  return { role, companyId, loading };
};
