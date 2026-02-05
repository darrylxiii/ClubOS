import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface CompanyDomain {
  domain: string;
  is_enabled: boolean;
  auto_provision_users: boolean;
  require_admin_approval: boolean;
}

interface UseCompanyDomainsResult {
  domains: string[];
  allDomainSettings: CompanyDomain[];
  primaryDomain: string | null;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useCompanyDomains(companyId: string | undefined): UseCompanyDomainsResult {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['company-domains', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      
      const { data, error } = await supabase
        .from('organization_domain_settings')
        .select('domain, is_enabled, auto_provision_users, require_admin_approval')
        .eq('company_id', companyId)
        .eq('is_enabled', true)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return data as CompanyDomain[];
    },
    enabled: !!companyId
  });

  const allDomainSettings = data || [];
  const domains = allDomainSettings.map(d => d.domain);
  const primaryDomain = domains.length > 0 ? domains[0] : null;

  return {
    domains,
    allDomainSettings,
    primaryDomain,
    loading: isLoading,
    error: error as Error | null,
    refetch
  };
}
