import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { notify } from '@/lib/notify';
import { logger } from '@/lib/logger';

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
  // New sentiment fields from email intelligence
  email_sentiment_score: number | null;
  email_health_score: number | null;
  email_health_status: string | null;
  inbound_count: number;
  outbound_count: number;
  sentiment_breakdown: { positive: number; neutral: number; negative: number } | null;
}

export interface CompanyRelationshipStats {
  total: number;
  healthy: number;
  needsAttention: number;
  atRisk: number;
  critical: number;
  avgEngagement: number;
  avgSentiment: number;
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
    avgEngagement: 0,
    avgSentiment: 0
  });

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

      // Get email sentiment data from new table
      const { data: emailSentiments, error: sentimentError } = await supabase
        .from('company_email_sentiment')
        .select('*');

      if (sentimentError) {
        logger.warn('Email sentiment table not available', { error: sentimentError.message });
      }

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
      const scoreMap = new Map<string, any>(scores?.map(s => [s.entity_id, s]) || []);

      // Build email sentiment map
      const sentimentMap = new Map<string, any>(
        (emailSentiments || []).filter(s => s.company_id).map(s => [s.company_id as string, s])
      );

      // Combine data
      let combinedData: CompanyRelationship[] = (companiesData || []).map(company => {
        const score = scoreMap.get(company.id);
        const emailSentiment = sentimentMap.get(company.id);

        // Use email sentiment data if available, fall back to communication scores
        const avgSentiment = emailSentiment?.avg_sentiment_score ?? score?.avg_sentiment ?? 0;
        const healthScore = emailSentiment?.health_score ?? null;
        const healthStatus = emailSentiment?.health_status ?? null;

        return {
          id: score?.id || company.id,
          company_id: company.id,
          company_name: company.name,
          logo_url: company.logo_url,
          engagement_score: score?.engagement_score || 0,
          response_rate: emailSentiment?.response_rate ?? score?.response_rate ?? 0,
          avg_sentiment: avgSentiment,
          total_communications: emailSentiment?.total_emails ?? score?.total_communications ?? 0,
          days_since_contact: score?.days_since_contact ?? calculateDaysSince(emailSentiment?.last_email_at),
          last_outbound_at: emailSentiment?.last_outbound_at ?? score?.last_outbound_at,
          preferred_channel: score?.preferred_channel,
          risk_level: calculateRiskFromHealth(healthStatus, healthScore, score),
          recommended_action: generateRecommendation(emailSentiment, score),
          active_jobs: jobCountMap.get(company.id) || 0,
          total_placements: placementCountMap.get(company.id) || 0,
          // New sentiment fields
          email_sentiment_score: emailSentiment?.avg_sentiment_score ?? null,
          email_health_score: healthScore,
          email_health_status: healthStatus,
          inbound_count: emailSentiment?.inbound_count ?? 0,
          outbound_count: emailSentiment?.outbound_count ?? 0,
          sentiment_breakdown: emailSentiment?.sentiment_breakdown as any ?? null
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
      const validSentiments = combinedData.filter(r => r.avg_sentiment !== null && r.avg_sentiment !== 0);
      const statsData: CompanyRelationshipStats = {
        total: combinedData.length,
        healthy: combinedData.filter(r => r.risk_level === 'low').length,
        needsAttention: combinedData.filter(r => r.risk_level === 'medium').length,
        atRisk: combinedData.filter(r => r.risk_level === 'high').length,
        critical: combinedData.filter(r => r.risk_level === 'critical').length,
        avgEngagement: combinedData.length > 0
          ? combinedData.reduce((sum, r) => sum + (r.engagement_score || 0), 0) / combinedData.length
          : 0,
        avgSentiment: validSentiments.length > 0
          ? validSentiments.reduce((sum, r) => sum + (r.avg_sentiment || 0), 0) / validSentiments.length
          : 0
      };
      setStats(statsData);
    } catch (err: any) {
      logger.error('Error fetching company relationships:', err);
      notify.error('Failed to load relationships', { description: err.message });
    } finally {
      setLoading(false);
    }
  }, [selectedCompanyId]);

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
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'company_email_sentiment'
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

// Calculate days since a date
function calculateDaysSince(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  const now = new Date();
  return Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
}

// Calculate risk level from health status or score
function calculateRiskFromHealth(
  healthStatus: string | null,
  healthScore: number | null,
  score: any
): RiskLevel {
  if (healthStatus) {
    switch (healthStatus) {
      case 'excellent': return 'low';
      case 'good': return 'low';
      case 'at_risk': return 'high';
      case 'critical': return 'critical';
      default: return 'medium';
    }
  }

  if (healthScore !== null) {
    if (healthScore >= 80) return 'low';
    if (healthScore >= 60) return 'medium';
    if (healthScore >= 40) return 'high';
    return 'critical';
  }

  // Fall back to original calculation
  if (!score) return 'medium';
  const daysSince = score.days_since_contact || 0;
  const engagement = score.engagement_score || 0;

  if (daysSince > 30 || engagement < 2) return 'critical';
  if (daysSince > 14 || engagement < 4) return 'high';
  if (daysSince > 7 || engagement < 6) return 'medium';
  return 'low';
}

// Generate recommended action based on sentiment data
function generateRecommendation(emailSentiment: any, score: any): string | null {
  if (emailSentiment?.health_status === 'critical') {
    return 'Urgent: Schedule a call to re-engage this partner';
  }
  if (emailSentiment?.health_status === 'at_risk') {
    return 'Send a personalized check-in email';
  }
  if (emailSentiment?.avg_sentiment_score < -0.3) {
    return 'Review recent communications for concerns';
  }
  if (emailSentiment?.response_rate < 0.3) {
    return 'Try different communication channel or timing';
  }
  return score?.recommended_action || null;
}
