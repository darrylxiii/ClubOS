import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useRole } from '@/contexts/RoleContext';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { stealthJobAuditService } from '@/services/stealthJobAuditService';

export type DisclosureLevel = 'code_name_only' | 'nda_required' | 'full_access';

export interface ConfidentialMetadata {
  code_name: string;
  disclosure_level: DisclosureLevel;
  tier_descriptions?: {
    code_name_only?: string;
    nda_required?: string;
    full_access?: string;
  };
}

export interface ConfidentialJob {
  id: string;
  title: string;
  code_name: string;
  disclosure_level: DisclosureLevel;
  tier_descriptions: ConfidentialMetadata['tier_descriptions'];
  status: string | null;
  created_at: string | null;
  candidate_count: number;
}

function parseConfidentialMetadata(doc: unknown): ConfidentialMetadata | null {
  try {
    if (!doc || typeof doc !== 'object') return null;
    const meta = doc as Record<string, unknown>;
    if (typeof meta.code_name !== 'string') return null;
    return {
      code_name: meta.code_name,
      disclosure_level: (meta.disclosure_level as DisclosureLevel) || 'code_name_only',
      tier_descriptions: (meta.tier_descriptions as ConfidentialMetadata['tier_descriptions']) || {},
    };
  } catch {
    return null;
  }
}

export function useConfidentialMode() {
  const { companyId } = useRole();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const {
    data: confidentialJobs = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['confidential-jobs', companyId],
    queryFn: async (): Promise<ConfidentialJob[]> => {
      if (!companyId) return [];

      try {
        const { data: jobs, error } = await (supabase as any)
          .from('jobs')
          .select('id, title, status, created_at, supporting_documents')
          .eq('company_id', companyId)
          .eq('is_stealth', true)
          .order('created_at', { ascending: false });

        if (error) throw error;
        if (!jobs) return [];

        // Fetch candidate counts for each stealth job
        const jobIds = jobs.map((j: any) => j.id);
        const { data: appCounts } = await (supabase as any)
          .from('applications')
          .select('job_id')
          .in('job_id', jobIds);

        const countMap = new Map<string, number>();
        (appCounts || []).forEach((app: any) => {
          countMap.set(app.job_id, (countMap.get(app.job_id) || 0) + 1);
        });

        return jobs
          .map((job: any) => {
            const meta = parseConfidentialMetadata(job.supporting_documents);
            if (!meta) return null;
            return {
              id: job.id,
              title: job.title,
              code_name: meta.code_name,
              disclosure_level: meta.disclosure_level,
              tier_descriptions: meta.tier_descriptions || {},
              status: job.status,
              created_at: job.created_at,
              candidate_count: countMap.get(job.id) || 0,
            };
          })
          .filter(Boolean) as ConfidentialJob[];
      } catch (error) {
        console.error('[ConfidentialMode] Failed to load confidential jobs:', error);
        return [];
      }
    },
    enabled: !!companyId,
  });

  const createSearch = useMutation({
    mutationFn: async ({
      codeName,
      actualTitle,
      disclosureLevel,
      tierDescriptions,
    }: {
      codeName: string;
      actualTitle: string;
      disclosureLevel: DisclosureLevel;
      tierDescriptions?: ConfidentialMetadata['tier_descriptions'];
    }) => {
      if (!companyId || !user?.id) throw new Error('Missing company or user context');

      const confidentialMeta: ConfidentialMetadata = {
        code_name: codeName,
        disclosure_level: disclosureLevel,
        tier_descriptions: tierDescriptions || {},
      };

      const { data, error } = await (supabase as any)
        .from('jobs')
        .insert({
          title: actualTitle,
          company_id: companyId,
          created_by: user.id,
          is_stealth: true,
          stealth_enabled_at: new Date().toISOString(),
          stealth_enabled_by: user.id,
          status: 'draft',
          supporting_documents: confidentialMeta,
        })
        .select('id, title')
        .single();

      if (error) throw error;

      // Fire-and-forget audit log
      stealthJobAuditService.logStealthToggled(data.id, actualTitle, true, {
        id: user.id,
        email: user.email,
      });

      return data;
    },
    onSuccess: () => {
      toast.success('Confidential search created');
      queryClient.invalidateQueries({ queryKey: ['confidential-jobs'] });
      queryClient.invalidateQueries({ queryKey: ['partner-jobs'] });
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
    },
    onError: (error) => {
      console.error('[ConfidentialMode] Failed to create search:', error);
      toast.error('Failed to create confidential search');
    },
  });

  const updateDisclosure = useMutation({
    mutationFn: async ({
      jobId,
      level,
      tierDescriptions,
    }: {
      jobId: string;
      level: DisclosureLevel;
      tierDescriptions?: ConfidentialMetadata['tier_descriptions'];
    }) => {
      if (!user?.id) throw new Error('Missing user context');

      // First fetch existing supporting_documents to merge
      const { data: existing, error: fetchErr } = await (supabase as any)
        .from('jobs')
        .select('title, supporting_documents')
        .eq('id', jobId)
        .single();

      if (fetchErr) throw fetchErr;

      const currentMeta = parseConfidentialMetadata(existing.supporting_documents) || {
        code_name: 'Unknown',
        disclosure_level: 'code_name_only' as DisclosureLevel,
        tier_descriptions: {},
      };

      const updatedMeta: ConfidentialMetadata = {
        ...currentMeta,
        disclosure_level: level,
        ...(tierDescriptions ? { tier_descriptions: { ...currentMeta.tier_descriptions, ...tierDescriptions } } : {}),
      };

      const { error } = await (supabase as any)
        .from('jobs')
        .update({ supporting_documents: updatedMeta })
        .eq('id', jobId);

      if (error) throw error;

      // Audit log for disclosure level change
      try {
        await supabase.from('comprehensive_audit_logs').insert({
          action: 'disclosure_level_changed',
          entity_type: 'job',
          entity_id: jobId,
          performed_by: user.id,
          metadata: {
            previous_level: currentMeta.disclosure_level,
            new_level: level,
            job_title: existing.title,
          },
        } as any);
      } catch {
        // Fire-and-forget — don't block the mutation
      }

      return { jobId, level };
    },
    onSuccess: () => {
      toast.success('Disclosure level updated');
      queryClient.invalidateQueries({ queryKey: ['confidential-jobs'] });
    },
    onError: (error) => {
      console.error('[ConfidentialMode] Failed to update disclosure:', error);
      toast.error('Failed to update disclosure level');
    },
  });

  return {
    confidentialJobs,
    createSearch,
    updateDisclosure,
    isLoading,
    isError,
  };
}
