import { supabase } from "@/integrations/supabase/client";

export interface AuditLogEntry {
  id: string;
  candidate_id: string;
  action: 'create' | 'update' | 'soft_delete' | 'hard_delete' | 'restore';
  performed_by: string;
  performed_at: string;
  before_data: any;
  after_data: any;
  changed_fields: string[];
  reason: string | null;
  metadata: any;
  is_bulk_action: boolean;
  bulk_action_id: string | null;
  performed_by_profile?: {
    full_name: string;
    avatar_url: string;
  };
}

export interface DeletionImpact {
  total_applications: number;
  active_applications: number;
  rejected_applications: number;
  hired_applications: number;
  affected_jobs: string[];
}

export const candidateAuditService = {
  // Log an audit entry
  async logAudit(entry: {
    candidate_id: string;
    action: 'create' | 'update' | 'soft_delete' | 'hard_delete' | 'restore';
    before_data?: any;
    after_data?: any;
    changed_fields?: string[];
    reason?: string;
    metadata?: any;
    is_bulk_action?: boolean;
    bulk_action_id?: string;
  }) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await (supabase as any)
      .from('candidate_profile_audit')
      .insert({
        ...entry,
        performed_by: user.id,
      });

    return { error };
  },

  // Get audit history for a candidate
  async getCandidateAuditHistory(candidateId: string) {
    const { data, error } = await (supabase as any)
      .from('candidate_profile_audit')
      .select(`
        *,
        performed_by_profile:profiles!performed_by(full_name, avatar_url)
      `)
      .eq('candidate_id', candidateId)
      .order('performed_at', { ascending: false });

    return { data: data as AuditLogEntry[], error };
  },

  // Get deletion impact preview
  async getDeletionImpact(candidateId: string): Promise<{ data: DeletionImpact | null; error: any }> {
    const { data: apps, error } = await supabase
      .from('applications')
      .select(`
        id,
        status,
        job_id,
        jobs(title)
      `)
      .eq('candidate_id', candidateId);

    if (error) return { data: null, error };
    if (!apps) return { data: null, error: null };

    const impact: DeletionImpact = {
      total_applications: apps.length,
      active_applications: apps.filter((a: any) => a.status === 'active').length,
      rejected_applications: apps.filter((a: any) => a.status === 'rejected').length,
      hired_applications: apps.filter((a: any) => a.status === 'hired').length,
      affected_jobs: [...new Set(apps.map((a: any) => a.jobs?.title).filter(Boolean))]
    };

    return { data: impact, error: null };
  },

  // Track field changes
  getChangedFields(before: any, after: any): string[] {
    if (!before || !after) return [];
    
    return Object.keys(after).filter(key => 
      JSON.stringify(before[key]) !== JSON.stringify(after[key])
    );
  }
};
