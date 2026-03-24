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
    queryKey: ['user-companies', user?.id],
    queryFn: async (): Promise<UserCompany[]> => {
      if (!user?.id) {
        return [];
      }

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
        .order('created_at', { ascending: true });

      if (error) {
        console.error('useUserCompany: Error fetching companies:', error);
        throw error;
      }

      if (!data || data.length === 0) {
        return [];
      }

      return data
        .map((membership) => {
          const company = membership.companies as { id: string; name: string } | null;
          if (!company) return null;
          return {
            id: company.id,
            name: company.name,
            role: membership.role,
          };
        })
        .filter((c): c is UserCompany => c !== null);
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5,
  });
};
