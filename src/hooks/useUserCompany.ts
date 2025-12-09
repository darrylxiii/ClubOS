import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface UserCompany {
  id: string;
  name: string;
  role: string;
}

export const useUserCompany = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['user-company', user?.id],
    queryFn: async (): Promise<UserCompany | null> => {
      if (!user?.id) {
        console.log('useUserCompany: No user ID available');
        return null;
      }

      console.log('useUserCompany: Fetching company for user:', user.id);

      // Get the user's primary company from company_members
      const { data, error } = await supabase
        .from('company_members')
        .select(`
          company_id,
          role,
          companies:company_id (
            id,
            name
          )
        `)
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: true })
        .limit(1);

      if (error) {
        console.error('useUserCompany: Error fetching company:', error);
        throw error;
      }

      if (!data || data.length === 0) {
        console.log('useUserCompany: No company membership found for user');
        return null;
      }

      const membership = data[0];
      const company = membership.companies as { id: string; name: string } | null;
      
      if (!company) {
        console.log('useUserCompany: No company data in membership');
        return null;
      }

      console.log('useUserCompany: Found company:', company.name, company.id);

      return {
        id: company.id,
        name: company.name,
        role: membership.role,
      };
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });
};
