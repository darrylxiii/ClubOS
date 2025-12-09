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
    queryFn: async () => {
      if (!user?.id) return null;

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
        .limit(1)
        .single();

      if (error || !data) return null;

      const company = data.companies as { id: string; name: string } | null;
      if (!company) return null;

      return {
        id: company.id,
        name: company.name,
        role: data.role,
      } as UserCompany;
    },
    enabled: !!user?.id,
  });
};
