import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { notify } from '@/lib/notify';
import { logger } from '@/lib/logger';

interface CandidateRelationship {
  id: string;
  entity_type: string;
  entity_id: string;
  engagement_score: number | null;
  response_rate: number | null;
  avg_sentiment: number | null;
  total_communications: number | null;
  last_inbound_at: string | null;
  last_outbound_at: string | null;
  days_since_contact: number | null;
  preferred_channel: string | null;
  risk_level: string | null;
  recommended_action: string | null;
  created_at: string;
  updated_at: string;
  candidate_name?: string;
  candidate_email?: string;
  candidate_avatar?: string;
  job_title?: string;
  pipeline_stage?: string;
}

export function usePartnerRelationships() {
  const [relationships, setRelationships] = useState<CandidateRelationship[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalCandidates: 0,
    healthyRelationships: 0,
    atRiskRelationships: 0,
    avgResponseRate: 0,
    avgEngagement: 0
  });

  const fetchRelationships = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Determine access scope by role
      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      if (rolesError) {
        logger.warn('Failed to fetch user roles', { componentName: 'usePartnerRelationships', error: rolesError });
      }

      const roles = (userRoles || []).map((r: { role: string }) => r.role);
      const isAdminOrStrategist = roles.includes('admin') || roles.includes('strategist');

      // Get partner's company (only needed for partners)
      let companyId: string | null = null;
      if (!isAdminOrStrategist) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('company_id')
          .eq('id', user.id)
          .single();

        companyId = profile?.company_id ?? null;
        if (!companyId) {
          setRelationships([]);
          setLoading(false);
          return;
        }
      }

      // Get candidates with proper joins
      let applicationsQuery = supabase
        .from('applications')
        .select(`
          candidate_id,
          candidate_full_name,
          candidate_email,
          position,
          status,
          job_id,
          jobs!inner(company_id),
          candidate_profiles!applications_candidate_id_fkey(
            full_name,
            email,
            avatar_url
          )
        `)
        .not('candidate_id', 'is', null);

      // Partners are limited to their own company; admins/strategists see all
      if (!isAdminOrStrategist) {
        applicationsQuery = applicationsQuery.eq('jobs.company_id', companyId!);
      }

      const { data: applications, error: applicationsError } = await applicationsQuery;
      if (applicationsError) throw applicationsError;

      if (!applications?.length) {
        setRelationships([]);
        setLoading(false);
        return;
      }

      const candidateIds = [...new Set(applications.map(a => a.candidate_id).filter(Boolean))];

      // Get relationship scores for these candidates
      const { data: scores } = await supabase
        .from('communication_relationship_scores')
        .select('*')
        .eq('entity_type', 'candidate')
        .in('entity_id', candidateIds);

      // Combine data
      const combined: CandidateRelationship[] = applications
        .filter(a => a.candidate_id)
        .map(app => {
          const score = scores?.find(s => s.entity_id === app.candidate_id);
          const candidateProfile = app.candidate_profiles as { full_name?: string; email?: string; avatar_url?: string } | null;
          return {
            id: score?.id || crypto.randomUUID(),
            entity_type: 'candidate' as const,
            entity_id: app.candidate_id!,
            engagement_score: score?.engagement_score || 5,
            response_rate: score?.response_rate || 0.5,
            avg_sentiment: score?.avg_sentiment || 0,
            total_communications: score?.total_communications || 0,
            last_inbound_at: score?.last_inbound_at || null,
            last_outbound_at: score?.last_outbound_at || null,
            days_since_contact: score?.days_since_contact || 0,
            preferred_channel: score?.preferred_channel || 'email',
            risk_level: score?.risk_level || 'medium',
            recommended_action: score?.recommended_action || 'Send a follow-up message',
            created_at: score?.created_at || new Date().toISOString(),
            updated_at: score?.updated_at || new Date().toISOString(),
            candidate_name: candidateProfile?.full_name || app.candidate_full_name || 'Unknown Candidate',
            candidate_email: candidateProfile?.email || app.candidate_email || undefined,
            candidate_avatar: candidateProfile?.avatar_url,
            job_title: app.position,
            pipeline_stage: app.status
          };
        });

      // Remove duplicates by candidate_id
      const unique = combined.reduce((acc, curr) => {
        if (!acc.find(r => r.entity_id === curr.entity_id)) {
          acc.push(curr);
        }
        return acc;
      }, [] as CandidateRelationship[]);

      setRelationships(unique);

      // Calculate stats
      const healthy = unique.filter(r => r.risk_level === 'low').length;
      const atRisk = unique.filter(r => ['high', 'critical'].includes(r.risk_level || '')).length;
      const avgResponse = unique.length > 0
        ? unique.reduce((sum, r) => sum + (r.response_rate || 0), 0) / unique.length
        : 0;
      const avgEng = unique.length > 0
        ? unique.reduce((sum, r) => sum + (r.engagement_score || 0), 0) / unique.length
        : 0;

      setStats({
        totalCandidates: unique.length,
        healthyRelationships: healthy,
        atRiskRelationships: atRisk,
        avgResponseRate: Math.round(avgResponse * 100),
        avgEngagement: Math.round(avgEng * 10) / 10
      });

    } catch (err: any) {
      console.error('Error fetching relationships:', err);
      notify.error('Error', { description: err.message });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRelationships();

    // Real-time subscription
    const channel = supabase
      .channel('partner_relationships')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'communication_relationship_scores'
      }, () => {
        fetchRelationships();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchRelationships]);

  return {
    relationships,
    loading,
    stats,
    refetch: fetchRelationships
  };
}
