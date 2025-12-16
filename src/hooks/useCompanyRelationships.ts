import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface CompanyRelationship {
  id: string;
  company_id: string;
  company_name: string;
  logo_url: string | null;
  engagement_score: number | null;
  response_rate: number | null;
  avg_sentiment: number | null;
  total_communications: number | null;
  days_since_contact: number | null;
  last_outbound_at: string | null;
  preferred_channel: string | null;
  risk_level: RiskLevel;
  recommended_action: string | null;
  active_jobs: number;
  total_placements: number;
}

export interface CompanyRelationshipStats {
  total: number;
  healthy: number;
  needsAttention: number;
  atRisk: number;
  critical: number;
  avgEngagement: number;
}

export function useCompanyRelationships(selectedCompanyId?: string | null) {
  const [relationships, setRelationships] = useState<CompanyRelationship[]>([]);
  const [companies, setCompanies] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<CompanyRelationshipStats>({
    total: 0,
    healthy: 0,
    needsAttention: 0,
    atRisk: 0,
    critical: 0,
    avgEngagement: 0
  });
  const { toast } = useToast();

  const fetchRelationships = useCallback(async () => {
    try {
      setLoading(true);

      // Get all companies with their basic info
      const { data: companiesData, error: companiesError } = await supabase
        .from('companies')
        .select('id, name, logo_url')
        .order('name');

      if (companiesError) throw companiesError;

      // Get relationship scores for companies
      let scoreQuery = supabase
        .from('communication_relationship_scores')
        .select('*')
        .eq('entity_type', 'company');

      if (selectedCompanyId) {
        scoreQuery = scoreQuery.eq('entity_id', selectedCompanyId);
      }

      const { data: scores, error: scoresError } = await scoreQuery;
      if (scoresError) throw scoresError;

      // Get job counts per company
      const { data: jobCounts, error: jobsError } = await supabase
        .from('jobs')
        .select('company_id')
        .eq('status', 'published');

      if (jobsError) throw jobsError;

      // Get placement counts (hired applications)
      const { data: placements, error: placementsError } = await supabase
        .from('applications')
        .select('job_id, jobs!inner(company_id)')
        .eq('status', 'hired');

      if (placementsError) throw placementsError;

      // Build job count map
      const jobCountMap = new Map<string, number>();
      jobCounts?.forEach(job => {
        const count = jobCountMap.get(job.company_id) || 0;
        jobCountMap.set(job.company_id, count + 1);
      });

      // Build placement count map
      const placementCountMap = new Map<string, number>();
      placements?.forEach((p: any) => {
        const companyId = p.jobs?.company_id;
        if (companyId) {
          const count = placementCountMap.get(companyId) || 0;
          placementCountMap.set(companyId, count + 1);
        }
      });

      // Build score map
      const scoreMap = new Map(scores?.map(s => [s.entity_id, s]) || []);

      // Combine data
      let combinedData: CompanyRelationship[] = (companiesData || []).map(company => {
        const score = scoreMap.get(company.id);
        return {
          id: score?.id || company.id,
          company_id: company.id,
          company_name: company.name,
          logo_url: company.logo_url,
          engagement_score: score?.engagement_score || 0,
          response_rate: score?.response_rate || 0,
          avg_sentiment: score?.avg_sentiment || 0,
          total_communications: score?.total_communications || 0,
          days_since_contact: score?.days_since_contact,
          last_outbound_at: score?.last_outbound_at,
          preferred_channel: score?.preferred_channel,
          risk_level: (score?.risk_level as RiskLevel) || calculateRiskLevel(score),
          recommended_action: score?.recommended_action,
          active_jobs: jobCountMap.get(company.id) || 0,
          total_placements: placementCountMap.get(company.id) || 0
        };
      });

      // Apply company filter if selected
      if (selectedCompanyId) {
        combinedData = combinedData.filter(r => r.company_id === selectedCompanyId);
      }

      // Sort by risk level (critical first) and then by days since contact
      combinedData.sort((a, b) => {
        const riskOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        const riskDiff = riskOrder[a.risk_level] - riskOrder[b.risk_level];
        if (riskDiff !== 0) return riskDiff;
        return (b.days_since_contact || 0) - (a.days_since_contact || 0);
      });

      setRelationships(combinedData);
      setCompanies(companiesData || []);

      // Calculate stats
      const statsData: CompanyRelationshipStats = {
        total: combinedData.length,
        healthy: combinedData.filter(r => r.risk_level === 'low').length,
        needsAttention: combinedData.filter(r => r.risk_level === 'medium').length,
        atRisk: combinedData.filter(r => r.risk_level === 'high').length,
        critical: combinedData.filter(r => r.risk_level === 'critical').length,
        avgEngagement: combinedData.length > 0
          ? combinedData.reduce((sum, r) => sum + (r.engagement_score || 0), 0) / combinedData.length
          : 0
      };
      setStats(statsData);
    } catch (err: any) {
      console.error('Error fetching company relationships:', err);
      toast({
        title: 'Failed to load relationships',
        description: err.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }, [selectedCompanyId, toast]);

  useEffect(() => {
    fetchRelationships();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('company_relationships_changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'communication_relationship_scores',
        filter: 'entity_type=eq.company'
      }, () => {
        fetchRelationships();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchRelationships]);

  return {
    relationships,
    companies,
    loading,
    stats,
    refetch: fetchRelationships
  };
}

// Helper to calculate risk level if not set
function calculateRiskLevel(score: any): RiskLevel {
  if (!score) return 'medium';
  
  const daysSince = score.days_since_contact || 0;
  const engagement = score.engagement_score || 0;
  
  if (daysSince > 30 || engagement < 2) return 'critical';
  if (daysSince > 14 || engagement < 4) return 'high';
  if (daysSince > 7 || engagement < 6) return 'medium';
  return 'low';
}
