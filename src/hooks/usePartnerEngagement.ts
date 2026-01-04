import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface PartnerStats {
  id: string;
  name: string;
  companyName: string;
  lastActive: string;
  candidatesViewed: number;
  placements: number;
}

interface PartnerEngagement {
  totalPartners: number;
  activePartners: number;
  atRiskPartners: number;
  avgResponseTime: number;
  placementSuccessRate: number;
  topPartners: PartnerStats[];
  trend: number;
}

export function usePartnerEngagement() {
  return useQuery({
    queryKey: ['partner-engagement'],
    queryFn: async (): Promise<PartnerEngagement> => {
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      // Get partner users
      const { data: partnerRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'partner');

      if (rolesError) throw rolesError;

      const partnerIds = partnerRoles?.map(r => r.user_id) || [];
      const totalPartners = partnerIds.length;

      if (totalPartners === 0) {
        return {
          totalPartners: 0,
          activePartners: 0,
          atRiskPartners: 0,
          avgResponseTime: 0,
          placementSuccessRate: 0,
          topPartners: [],
          trend: 0,
        };
      }

      // Get partner profiles with activity (using updated_at as proxy for activity)
      const { data: partnerProfiles } = await supabase
        .from('profiles')
        .select('id, full_name, company_id, updated_at')
        .in('id', partnerIds);

      // Get company names
      const companyIds = [...new Set(partnerProfiles?.map(p => p.company_id).filter(Boolean) || [])];
      const { data: companies } = await supabase
        .from('companies')
        .select('id, name')
        .in('id', companyIds.length > 0 ? companyIds : ['none']);

      const companyMap = new Map(companies?.map(c => [c.id, c.name]) || []);

      // Calculate active vs at-risk partners using updated_at as activity proxy
      let activePartners = 0;
      let atRiskPartners = 0;

      partnerProfiles?.forEach(p => {
        const lastActive = p.updated_at ? new Date(p.updated_at) : null;
        if (lastActive && lastActive >= sevenDaysAgo) {
          activePartners++;
        } else if (!lastActive || lastActive < fourteenDaysAgo) {
          atRiskPartners++;
        }
      });

      // Get placements by partner companies
      const { data: applications } = await supabase
        .from('applications')
        .select('id, status, job_id')
        .gte('updated_at', thirtyDaysAgo.toISOString());

      // Get jobs to map to companies
      const jobIds = [...new Set(applications?.map(a => a.job_id) || [])];
      const { data: jobs } = await supabase
        .from('jobs')
        .select('id, company_id')
        .in('id', jobIds.length > 0 ? jobIds : ['none']);

      const jobCompanyMap = new Map(jobs?.map(j => [j.id, j.company_id]) || []);

      // Calculate placements per company
      const companyPlacements: Record<string, { total: number; hired: number }> = {};
      applications?.forEach(app => {
        const companyId = jobCompanyMap.get(app.job_id);
        if (companyId) {
          if (!companyPlacements[companyId]) {
            companyPlacements[companyId] = { total: 0, hired: 0 };
          }
          companyPlacements[companyId].total++;
          if (app.status === 'hired') {
            companyPlacements[companyId].hired++;
          }
        }
      });

      // Calculate success rate
      const totalApps = Object.values(companyPlacements).reduce((sum, c) => sum + c.total, 0);
      const totalHires = Object.values(companyPlacements).reduce((sum, c) => sum + c.hired, 0);
      const placementSuccessRate = totalApps > 0 ? (totalHires / totalApps) * 100 : 0;

      // Top partners by placements
      const topPartners: PartnerStats[] = partnerProfiles
        ?.map(p => {
          const placements = p.company_id ? (companyPlacements[p.company_id]?.hired || 0) : 0;
          return {
            id: p.id,
            name: p.full_name || 'Unknown',
            companyName: p.company_id ? (companyMap.get(p.company_id) || 'Unknown') : 'Unknown',
            lastActive: p.updated_at || '',
            candidatesViewed: 0,
            placements,
          };
        })
        .sort((a, b) => b.placements - a.placements)
        .slice(0, 5) || [];

      return {
        totalPartners,
        activePartners,
        atRiskPartners,
        avgResponseTime: 24,
        placementSuccessRate: Math.round(placementSuccessRate * 10) / 10,
        topPartners,
        trend: 0,
      };
    },
    staleTime: 5 * 60 * 1000,
  });
}
