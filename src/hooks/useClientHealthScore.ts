import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ClientHealthData {
  company_id: string;
  company_name: string;
  logo_url: string | null;
  overall_health_score: number;
  engagement_score: number;
  placement_success_rate: number;
  communication_score: number;
  activity_recency_days: number;
  nps_score: number | null;
  total_placements: number;
  active_jobs: number;
  pipeline_value: number;
  risk_level: 'low' | 'medium' | 'high';
  risk_factors: string[];
  suggested_actions: string[];
  last_activity_date: string | null;
  last_placement_date: string | null;
}

export function useClientHealthScores() {
  return useQuery({
    queryKey: ['client-health-scores'],
    queryFn: async (): Promise<ClientHealthData[]> => {
      // Get companies with their metrics
      const { data: companies, error: companiesError } = await supabase
        .from('companies')
        .select(`
          id,
          name,
          logo_url,
          jobs(id, status, created_at),
          company_intelligence_scores(
            hiring_health_score,
            engagement_score,
            communication_score
          )
        `)
        .eq('is_active', true);

      if (companiesError) throw companiesError;

      // Get placements (hired applications) per company
      const { data: placements } = await supabase
        .from('applications')
        .select('job_id, status, created_at')
        .eq('status', 'hired');

      // Get recent activities
      const { data: activities } = await supabase
        .from('activity_feed')
        .select('company_id, created_at')
        .not('company_id', 'is', null)
        .order('created_at', { ascending: false });

      // Calculate health scores for each company
      const healthData: ClientHealthData[] = (companies || []).map((company: any) => {
        const companyJobs = company.jobs || [];
        const companyJobIds = companyJobs.map((j: any) => j.id);
        const companyPlacements = (placements || []).filter(
          (p: any) => companyJobIds.includes(p.job_id)
        );
        const companyActivities = (activities || []).filter(
          (a: any) => a.company_id === company.id
        );
        
        const activeJobs = companyJobs.filter((j: any) => ['open', 'published'].includes(j.status)).length;
        const pipelineValue = 0; // Simplified - would need deals query
        
        const intelligence = company.company_intelligence_scores?.[0];
        const engagementScore = intelligence?.engagement_score || 50;
        const communicationScore = intelligence?.communication_score || 50;
        const hiringHealth = intelligence?.hiring_health_score || 50;
        
        // Calculate activity recency
        const lastActivity = companyActivities[0]?.created_at;
        const activityRecencyDays = lastActivity 
          ? Math.ceil((Date.now() - new Date(lastActivity).getTime()) / (1000 * 60 * 60 * 24))
          : 999;
        
        // Calculate placement success rate
        const totalApplications = (company.jobs || []).length * 5; // Estimate
        const placementRate = totalApplications > 0 
          ? (companyPlacements.length / totalApplications) * 100 
          : 0;
        
        // Overall health score
        const overallScore = Math.round(
          (hiringHealth * 0.3) +
          (engagementScore * 0.25) +
          (communicationScore * 0.2) +
          (Math.max(0, 100 - activityRecencyDays * 2) * 0.15) +
          (Math.min(100, placementRate * 10) * 0.1)
        );
        
        // Determine risk level
        let riskLevel: 'low' | 'medium' | 'high' = 'low';
        const riskFactors: string[] = [];
        const suggestedActions: string[] = [];
        
        if (activityRecencyDays > 30) {
          riskFactors.push('No activity in 30+ days');
          suggestedActions.push('Schedule check-in call');
          riskLevel = 'medium';
        }
        if (activityRecencyDays > 60) {
          riskLevel = 'high';
        }
        if (activeJobs === 0 && companyPlacements.length > 0) {
          riskFactors.push('No active job postings');
          suggestedActions.push('Propose new roles based on market trends');
        }
        if (engagementScore < 40) {
          riskFactors.push('Low engagement score');
          suggestedActions.push('Review communication frequency');
          riskLevel = riskLevel === 'high' ? 'high' : 'medium';
        }

        return {
          company_id: company.id,
          company_name: company.name,
          logo_url: company.logo_url,
          overall_health_score: overallScore,
          engagement_score: engagementScore,
          placement_success_rate: placementRate,
          communication_score: communicationScore,
          activity_recency_days: activityRecencyDays,
          nps_score: null,
          total_placements: companyPlacements.length,
          active_jobs: activeJobs,
          pipeline_value: pipelineValue,
          risk_level: riskLevel,
          risk_factors: riskFactors,
          suggested_actions: suggestedActions,
          last_activity_date: lastActivity || null,
          last_placement_date: companyPlacements[0]?.created_at || null,
        };
      });

      // Sort by health score (lowest first to highlight at-risk clients)
      return healthData.sort((a, b) => a.overall_health_score - b.overall_health_score);
    },
    staleTime: 120000,
  });
}

export function useClientHealth(companyId: string) {
  const { data: allScores } = useClientHealthScores();
  return allScores?.find(c => c.company_id === companyId) || null;
}
