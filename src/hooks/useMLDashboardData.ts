import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { MLModel, MLABTest, MLModelMetrics } from '@/types/ml';

export interface CompanyIntelligenceItem {
  company: { id: string; name: string; slug: string };
  health_score: number;
  relationship_status: string;
  total_interactions: number;
  urgency_score: number;
  sentiment: number;
  last_updated: string;
  ghost_risk: number;
}

export interface InsightItem {
  id: string;
  insight_type: string;
  insight_text: string;
  confidence_score: number | null;
  created_at: string;
  interaction?: {
    company?: { name: string; slug: string };
    interaction_type: string;
    interaction_date: string;
  };
}

export interface InteractionStats {
  total: number;
  byType: Record<string, number>;
  companiesWithData: number;
}

export interface JobOption {
  id: string;
  title: string;
  companies: { name: string } | null;
}

export function useMLDashboardJobs() {
  return useQuery<JobOption[]>({
    queryKey: ['ml-dashboard-jobs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('jobs')
        .select('id, title, companies(name)')
        .eq('status', 'open')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as JobOption[];
    },
    staleTime: 60_000,
  });
}

export function useMLDashboardData(selectedJobId: string | null) {
  return useQuery({
    queryKey: ['ml-dashboard-data', selectedJobId],
    queryFn: async () => {
      // Core ML data
      const [modelsResult, abTestsResult, metricsResult] = await Promise.all([
        supabase.from('ml_models').select('*').order('version', { ascending: false }),
        supabase.from('ml_ab_tests').select('*').order('started_at', { ascending: false }).limit(5),
        supabase.from('ml_model_metrics').select('*').order('metric_date', { ascending: false }).limit(100),
      ]);

      const models = (modelsResult.data || []) as MLModel[];
      const abTests = (abTestsResult.data || []) as MLABTest[];
      const metrics = (metricsResult.data || []) as MLModelMetrics[];

      // Intelligence data
      const { data: reports } = await supabase
        .from('interaction_ml_features')
        .select('*')
        .eq('entity_type', 'company')
        .order('computed_at', { ascending: false });

      let companyIntelligence: CompanyIntelligenceItem[] = [];

      if (reports && reports.length > 0) {
        const companyIds = reports.map((r: Record<string, unknown>) => r.entity_id as string);
        const { data: companies } = await supabase
          .from('companies')
          .select('id, name, slug')
          .in('id', companyIds);

        const companyMap = new Map(companies?.map(c => [c.id, c]) || []);

        companyIntelligence = reports
          .filter((r: Record<string, unknown>) => {
            const features = r.features as Record<string, unknown> | null;
            return features?.ai_recommendations;
          })
          .map((r: Record<string, unknown>) => {
            const features = r.features as Record<string, Record<string, unknown>>;
            const recs = features.ai_recommendations || {};
            const summary = features.interaction_summary || {};
            const hiring = features.hiring_intelligence || {};
            return {
              company: companyMap.get(r.entity_id as string)!,
              health_score: (recs.overall_health_score as number) || 0,
              relationship_status: (recs.relationship_status as string) || 'unknown',
              total_interactions: (summary.total as number) || 0,
              urgency_score: (hiring.avg_urgency_score as number) || 0,
              sentiment: (summary.avg_sentiment as number) || 0,
              last_updated: r.computed_at as string,
              ghost_risk: (recs.ghost_risk as number) || 0,
            };
          })
          .filter(d => d.company)
          .sort((a, b) => b.health_score - a.health_score);
      }

      // Insights
      const { data: insights } = await supabase
        .from('interaction_insights')
        .select(`
          *,
          interaction:company_interactions(
            company:companies(name, slug),
            interaction_type,
            interaction_date
          )
        `)
        .in('insight_type', ['hiring_urgency', 'positive_signal', 'red_flag', 'budget_signal'])
        .order('created_at', { ascending: false })
        .limit(20);

      const recentInsights = (insights || []) as InsightItem[];

      // Interaction stats (30d)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: interactions } = await supabase
        .from('company_interactions')
        .select('id, company_id, interaction_type, created_at')
        .gte('interaction_date', thirtyDaysAgo.toISOString());

      let interactionStats: InteractionStats | null = null;
      if (interactions) {
        interactionStats = {
          total: interactions.length,
          byType: interactions.reduce((acc: Record<string, number>, int) => {
            acc[int.interaction_type] = (acc[int.interaction_type] || 0) + 1;
            return acc;
          }, {}),
          companiesWithData: new Set(interactions.map(i => i.company_id)).size,
        };
      }

      return { models, abTests, metrics, companyIntelligence, recentInsights, interactionStats };
    },
    staleTime: 60_000,
  });
}
