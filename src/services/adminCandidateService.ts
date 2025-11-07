import { supabase } from "@/integrations/supabase/client";

export interface UnifiedCandidateFilters {
  mergeStatus?: 'merged' | 'invited' | 'unlinked';
  minCompleteness?: number;
  strategistId?: string;
  searchTerm?: string;
}

export const adminCandidateService = {
  // Get unified candidate data (both tables merged)
  async getUnifiedCandidate(candidateId: string) {
    const { data, error } = await supabase.rpc('get_candidate_complete_data', { 
      p_candidate_id: candidateId 
    });
    return { data, error };
  },

  // Get all candidates with filters
  async getAllCandidates(filters: UnifiedCandidateFilters = {}) {
    let query: any = supabase
      .from('unified_candidate_view')
      .select('*');
    
    if (filters.strategistId) {
      query = query.eq('assigned_strategist_id', filters.strategistId);
    }
    if (filters.searchTerm) {
      query = query.or(
        `full_name.ilike.%${filters.searchTerm}%,email.ilike.%${filters.searchTerm}%`
      );
    }
    
    const { data, error } = await query.order('created_at', { ascending: false });
    
    // Apply client-side filtering for merge status if needed
    let filteredData = data;
    if (data && filters.mergeStatus) {
      if (filters.mergeStatus === 'merged') {
        filteredData = data.filter((c: any) => c.invitation_status === 'registered');
      } else if (filters.mergeStatus === 'unlinked') {
        filteredData = data.filter((c: any) => 
          !c.invitation_status || c.invitation_status === 'not_invited' || c.invitation_status === 'pending'
        );
      } else {
        filteredData = data.filter((c: any) => c.invitation_status === filters.mergeStatus);
      }
    }
    
    return { data: filteredData, error };
  },

  // Export candidates to CSV
  async exportCandidatesCSV(candidateIds: string[]) {
    const { data, error } = await supabase
      .from('unified_candidate_view')
      .select('*')
      .in('id', candidateIds);
    
    if (error || !data) return { data: null, error };

    // Convert to CSV format
    const headers = [
      'Name', 'Email', 'Phone', 'Current Title', 'Company', 'Years Experience',
      'Desired Salary Min', 'Desired Salary Max', 'Currency', 'LinkedIn', 
      'Created At'
    ];
    
    const rows = data.map((c: any) => [
      c.full_name || c.email,
      c.email,
      c.phone || '',
      c.current_title || '',
      c.current_company || '',
      c.years_of_experience || '',
      c.desired_salary_min || '',
      c.desired_salary_max || '',
      c.preferred_currency || '',
      c.linkedin_url ? 'Yes' : 'No',
      c.created_at
    ]);
    
    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    
    return { data: csv, error: null };
  },

  // Get candidate's settings data (from profiles table)
  async getCandidateSettings(userId: string) {
    const { data, error } = await supabase
      .from('profiles')
      .select(`
        current_salary_min, current_salary_max,
        desired_salary_min, desired_salary_max,
        preferred_currency,
        employment_type_preference,
        freelance_hourly_rate_min, freelance_hourly_rate_max,
        fulltime_hours_per_week_min, fulltime_hours_per_week_max,
        freelance_hours_per_week_min, freelance_hours_per_week_max,
        notice_period, contract_end_date, has_indefinite_contract,
        preferred_work_locations, remote_work_preference,
        resume_url, phone, phone_verified, email_verified,
        stealth_mode_enabled, privacy_settings, public_fields
      `)
      .eq('id', userId)
      .single();
    
    return { data, error };
  },

  // Get comprehensive user settings (works for all users, not just candidates)
  async getUserSettings(userId: string) {
    const { data, error } = await supabase
      .from('profiles')
      .select(`
        *,
        candidate_profiles(
          id,
          resume_url,
          portfolio_url,
          linkedin_url,
          github_url
        )
      `)
      .eq('id', userId)
      .single();
    
    return { data, error };
  },

  // Get merge statistics
  async getMergeStats() {
    const { data, error } = await supabase
      .from('candidate_profiles')
      .select('invitation_status, profile_completeness');
    
    if (error || !data) return { data: null, error };

    const stats = {
      total: data.length,
      merged: data.filter(c => c.invitation_status === 'registered').length,
      invited: data.filter(c => c.invitation_status === 'invited').length,
      unlinked: data.filter(c => !c.invitation_status || c.invitation_status === 'pending' || c.invitation_status === 'not_invited').length,
      avgCompleteness: data.length > 0 
        ? Math.round(data.reduce((sum, c) => sum + (c.profile_completeness || 0), 0) / data.length)
        : 0
    };

    return { data: stats, error: null };
  },

  // Get recent merges
  async getRecentMerges(limit: number = 10) {
    const { data, error } = await supabase
      .from('candidate_profiles')
      .select('id, full_name, email, merged_at, user_id')
      .not('merged_at', 'is', null)
      .order('merged_at', { ascending: false })
      .limit(limit);
    
    return { data, error };
  },

  // Get strategists
  async getStrategists() {
    // Temporarily simplified to avoid TypeScript issues
    // TODO: Implement proper strategist fetching
    return { data: [], error: null };
  },

  // Assign strategist to candidate
  async assignStrategist(candidateId: string, strategistId: string) {
    const { error } = await supabase
      .from('candidate_profiles')
      .update({ assigned_strategist_id: strategistId })
      .eq('id', candidateId);
    
    return { error };
  },

  // Bulk assign strategist
  async bulkAssignStrategist(candidateIds: string[], strategistId: string) {
    const { error } = await supabase
      .from('candidate_profiles')
      .update({ assigned_strategist_id: strategistId })
      .in('id', candidateIds);
    
    return { error };
  },

  // Bulk send invitations
  async bulkSendInvitations(candidateIds: string[]) {
    // This would call an edge function to send invitation emails
    const { data, error } = await supabase.functions.invoke('send-candidate-invitations', {
      body: { candidateIds }
    });
    
    return { data, error };
  }
};
