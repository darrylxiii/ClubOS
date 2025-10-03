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
        // Check for manually selected role in localStorage
        const selectedRole = localStorage.getItem('selected_role');
        
        // Get ALL user roles (user can have multiple)
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

        // Use manually selected role if available and user has that role (PRIORITY)
        if (selectedRole && rolesData?.some(r => r.role === selectedRole)) {
          console.log('[useUserRole] Using selected role from localStorage:', selectedRole);
          setRole(selectedRole as UserRole);
        } else if (rolesData && rolesData.length > 0) {
          // Otherwise prioritize admin role (highest priority)
          if (rolesData.some(r => r.role === 'admin')) {
            setRole('admin');
          } else if (rolesData.some(r => r.role === 'strategist')) {
            setRole('strategist');
          } else if (rolesData.some(r => r.role === 'partner')) {
            setRole('partner');
          } else {
            setRole('user');
          }
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
