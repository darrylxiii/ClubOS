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
    let query = supabase
      .from('unified_candidate_view')
      .select('*');
    
    if (filters.mergeStatus) {
      query = query.eq('merge_status', filters.mergeStatus);
    }
    if (filters.minCompleteness !== undefined) {
      query = query.gte('data_completeness_score', filters.minCompleteness);
    }
    if (filters.strategistId) {
      query = query.eq('assigned_strategist_id', filters.strategistId);
    }
    if (filters.searchTerm) {
      query = query.or(
        `display_name.ilike.%${filters.searchTerm}%,display_email.ilike.%${filters.searchTerm}%`
      );
    }
    
    const { data, error } = await query.order('candidate_created_at', { ascending: false });
    return { data, error };
  },

  // Export candidates to CSV
  async exportCandidatesCSV(candidateIds: string[]) {
    const { data, error } = await supabase
      .from('unified_candidate_view')
      .select('*')
      .in('candidate_id', candidateIds);
    
    if (error || !data) return { data: null, error };

    // Convert to CSV format
    const headers = [
      'Name', 'Email', 'Phone', 'Current Title', 'Company', 'Years Experience',
      'Desired Salary Min', 'Desired Salary Max', 'Currency', 'Resume', 
      'Merge Status', 'Data Completeness', 'Created At'
    ];
    
    const rows = data.map(c => [
      c.display_name,
      c.display_email,
      c.phone || '',
      c.current_title || '',
      c.current_company || '',
      c.years_of_experience || '',
      c.final_desired_salary_min || '',
      c.final_desired_salary_max || '',
      c.final_currency,
      c.resume_url ? 'Yes' : 'No',
      c.merge_status,
      c.data_completeness_score,
      c.candidate_created_at
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

  // Get merge statistics
  async getMergeStats() {
    const { data, error } = await supabase
      .from('unified_candidate_view')
      .select('merge_status, data_completeness_score');
    
    if (error || !data) return { data: null, error };

    const stats = {
      total: data.length,
      merged: data.filter(c => c.merge_status === 'merged').length,
      invited: data.filter(c => c.merge_status === 'invited').length,
      unlinked: data.filter(c => c.merge_status === 'unlinked').length,
      avgCompleteness: Math.round(
        data.reduce((sum, c) => sum + (c.data_completeness_score || 0), 0) / data.length
      ),
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
  }
};
