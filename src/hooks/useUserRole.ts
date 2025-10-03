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
        setLoading(false);
        return;
      }

      try {
        // Get user roles
        const { data: rolesData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .single();

        // Get profile with company info
        const { data: profileData } = await supabase
          .from('profiles')
          .select('company_id')
          .eq('id', user.id)
          .single();

        // Check if user is a company member
        if (profileData?.company_id) {
          const { data: memberData } = await supabase
            .from('company_members')
            .select('role, company_id')
            .eq('user_id', user.id)
            .eq('is_active', true)
            .single();

          if (memberData) {
            setCompanyId(memberData.company_id);
            // Map company role to user role
            if (memberData.role === 'owner' || memberData.role === 'admin') {
              setRole('company_admin');
            } else if (memberData.role === 'recruiter') {
              setRole('recruiter');
            }
          }
        }

        // Override with system role if exists
        if (rolesData) {
          setRole(rolesData.role as UserRole);
        }
      } catch (error) {
        console.error('Error fetching user role:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserRole();
  }, [user]);

  return { role, companyId, loading };
};
