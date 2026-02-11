import { supabase } from "@/integrations/supabase/client";
import { notify } from "@/lib/notify";

export interface MergeSuggestion {
  candidate_id: string;
  candidate_name: string | null;
  candidate_email: string;
  linked_user_id: string | null;
  invitation_status: string | null;
  candidate_completeness: number | null;
  candidate_created_at: string;
  profile_id: string;
  profile_name: string | null;
  profile_email: string;
  profile_created_at: string;
  match_type: 'email_match' | 'partial_link' | 'manual';
  confidence_score: number | null;
  already_merged: boolean;
}

export interface MergePreview {
  candidate: Record<string, any>;
  user: Record<string, any>;
  fieldsToMerge: string[];
  conflicts: Array<{ field: string; candidateValue: any; profileValue: any }>;
  applicationCount: number;
  interactionCount: number;
}

export interface MergeResult {
  success: boolean;
  message: string;
  candidateId?: string;
  userId?: string;
  mergedFields?: string[];
  error?: string;
}

export interface BulkMergeResult {
  total: number;
  successful: number;
  failed: number;
  results: Array<{
    candidateId: string;
    userId: string;
    success: boolean;
    error?: string;
  }>;
}

export interface MergeLog {
  id: string;
  candidate_id: string;
  profile_id: string;
  merged_by: string;
  merge_type: 'auto' | 'manual' | 'invitation';
  merged_fields: Record<string, any>;
  merge_status: 'pending' | 'completed' | 'failed' | 'reverted';
  error_message: string | null;
  confidence_score: number | null;
  match_type: string | null;
  created_at: string;
  completed_at: string | null;
}

export const mergeService = {
  /**
   * Get merge suggestions with optional filters
   */
  async getSuggestions(filters: {
    minConfidence?: number;
    matchType?: string;
    limit?: number;
  } = {}): Promise<MergeSuggestion[]> {
    try {
      let query = supabase
        .from('potential_merges')
        .select('*')
        .eq('already_merged', false);

      if (filters.minConfidence) {
        query = query.gte('confidence_score', filters.minConfidence);
      }

      if (filters.matchType) {
        query = query.eq('match_type', filters.matchType);
      }

      if (filters.limit) {
        query = query.limit(filters.limit);
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data || []) as MergeSuggestion[];
    } catch (error) {
      console.error('Error fetching merge suggestions:', error);
      notify.error("Error", { description: "Failed to fetch merge suggestions" });
      return [];
    }
  },

  /**
   * Preview merge impact before execution
   */
  async previewMerge(
    candidateId: string,
    userId: string
  ): Promise<MergePreview | null> {
    try {
      console.log('[MergeService] Starting preview for candidate:', candidateId, 'user:', userId);

      // Fetch candidate profile
      const { data: candidate, error: candidateError } = await supabase
        .from('candidate_profiles')
        .select('*')
        .eq('id', candidateId)
        .single();

      if (candidateError) {
        console.error('[MergeService] Candidate fetch error:', candidateError);
        throw new Error(`Failed to fetch candidate: ${candidateError.message}`);
      }

      if (!candidate) {
        throw new Error('Candidate not found');
      }

      // Validate candidate has email
      if (!candidate.email) {
        throw new Error('Candidate has no email address. Please update the candidate profile before merging.');
      }

      console.log('[MergeService] Candidate loaded:', candidate.full_name, candidate.email);

      // Fetch user profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError) {
        console.error('[MergeService] Profile fetch error:', profileError);
        throw new Error(`Failed to fetch user profile: ${profileError.message}`);
      }

      if (!profile) {
        throw new Error('User profile not found');
      }

      console.log('[MergeService] User profile loaded:', profile.full_name, profile.email);

      // Count applications
      const { count: appsCount } = await supabase
        .from('applications')
        .select('*', { count: 'exact', head: true })
        .eq('candidate_id', candidateId);

      // Count interactions
      const { count: interactionsCount } = await supabase
        .from('candidate_interactions')
        .select('*', { count: 'exact', head: true })
        .eq('candidate_id', candidateId);

      // Determine fields to merge and conflicts
      const fieldsToMerge: string[] = [];
      const conflicts: Array<{ field: string; candidateValue: any; profileValue: any }> = [];

      // FIX #5: Use correct column names that exist in both tables
      // candidate_profiles: full_name, phone, linkedin_url, desired_salary_min, desired_salary_max, 
      //                     remote_preference (text), notice_period, desired_locations (jsonb)
      // profiles: full_name, avatar_url, bio, location_city, phone_number, linkedin_url, 
      //           desired_salary_min, desired_salary_max, preferred_currency, remote_work_preference (bool)
      const mergeableFields = [
        'full_name', 'linkedin_url', 'desired_salary_min', 'desired_salary_max',
        'notice_period', 'avatar_url', 'bio'
      ];

      mergeableFields.forEach(field => {
        const candidateValue = candidate[field];
        const profileValue = profile[field];

        // Null-safe comparison
        if (candidateValue && !profileValue) {
          fieldsToMerge.push(field);
        } else if (candidateValue && profileValue && candidateValue !== profileValue) {
          conflicts.push({ field, candidateValue, profileValue });
        }
      });

      console.log('[MergeService] Preview complete:', {
        fieldsToMerge: fieldsToMerge.length,
        conflicts: conflicts.length,
        applications: appsCount || 0,
        interactions: interactionsCount || 0
      });

      return {
        candidate,
        user: profile,
        fieldsToMerge,
        conflicts,
        applicationCount: appsCount || 0,
        interactionCount: interactionsCount || 0,
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to preview merge';
      console.error('[MergeService] Preview error:', {
        message: errorMessage,
        candidateId,
        userId,
        timestamp: new Date().toISOString(),
        stack: error instanceof Error ? error.stack : undefined
      });
      
      notify.error("Preview Error", { description: errorMessage });
      return null;
    }
  },

  /**
   * Execute single merge
   */
  async executeMerge(
    candidateId: string,
    userId: string,
    mergeType: 'auto' | 'manual' = 'manual',
    invitationToken?: string
  ): Promise<MergeResult> {
    try {
      // Call edge function
      const { data, error } = await supabase.functions.invoke('merge-candidate-profile', {
        body: {
          candidateId,
          userId,
          invitationToken,
          mergeType,
          mergedBy: (await supabase.auth.getUser()).data.user?.id,
        },
      });

      if (error) throw error;

      if (data.success) {
        notify.success("Success", { description: data.message || "Candidate profile merged successfully" });
      }

      return data;
    } catch (error: unknown) {
      console.error('Error executing merge:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to merge candidate profile';
      
      notify.error("Error", { description: errorMessage });

      return {
        success: false,
        message: errorMessage,
        error: errorMessage,
      };
    }
  },

  /**
   * Execute bulk merge operations
   */
  async executeBulkMerge(
    merges: Array<{ candidateId: string; userId: string }>
  ): Promise<BulkMergeResult> {
    const results: BulkMergeResult = {
      total: merges.length,
      successful: 0,
      failed: 0,
      results: [],
    };

    for (const merge of merges) {
      const result = await this.executeMerge(
        merge.candidateId,
        merge.userId,
        'auto'
      );

      if (result.success) {
        results.successful++;
      } else {
        results.failed++;
      }

      results.results.push({
        candidateId: merge.candidateId,
        userId: merge.userId,
        success: result.success,
        error: result.error,
      });
    }

    if (results.failed > 0) {
      notify.error("Bulk Merge Complete", { description: `${results.successful} succeeded, ${results.failed} failed` });
    } else {
      notify.success("Bulk Merge Complete", { description: `${results.successful} succeeded, ${results.failed} failed` });
    }

    return results;
  },

  /**
   * Reject merge suggestion (mark as reviewed/dismissed)
   */
  async rejectMerge(
    candidateId: string,
    userId: string,
    reason: string
  ): Promise<void> {
    try {
      const currentUser = (await supabase.auth.getUser()).data.user;
      
      const { error } = await supabase
        .from('candidate_merge_log')
        .insert({
          candidate_id: candidateId,
          profile_id: userId,
          merged_by: currentUser?.id,
          merge_type: 'manual',
          merge_status: 'failed',
          error_message: `Rejected: ${reason}`,
        });

      if (error) throw error;

      notify.success("Merge Rejected", { description: "The merge suggestion has been dismissed" });
    } catch (error) {
      console.error('Error rejecting merge:', error);
      notify.error("Error", { description: "Failed to reject merge suggestion" });
    }
  },

  /**
   * Get merge history with optional filters
   */
  async getMergeHistory(filters?: {
    dateFrom?: string;
    dateTo?: string;
    status?: string;
    limit?: number;
  }): Promise<MergeLog[]> {
    try {
      let query = supabase
        .from('candidate_merge_log')
        .select('*')
        .order('created_at', { ascending: false });

      if (filters?.dateFrom) {
        query = query.gte('created_at', filters.dateFrom);
      }

      if (filters?.dateTo) {
        query = query.lte('created_at', filters.dateTo);
      }

      if (filters?.status) {
        query = query.eq('merge_status', filters.status);
      }

      if (filters?.limit) {
        query = query.limit(filters.limit);
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data || []) as MergeLog[];
    } catch (error) {
      console.error('Error fetching merge history:', error);
      notify.error("Error", { description: "Failed to fetch merge history" });
      return [];
    }
  },

  /**
   * Get merge statistics
   */
  async getStats() {
    try {
      const [suggestionsResult, historyResult] = await Promise.all([
        supabase.from('potential_merges').select('*', { count: 'exact', head: true }),
        supabase.from('candidate_merge_log').select('merge_status', { count: 'exact' }),
      ]);

      const totalSuggestions = suggestionsResult.count || 0;
      const history = historyResult.data || [];

      const completed = history.filter(h => h.merge_status === 'completed').length;
      const failed = history.filter(h => h.merge_status === 'failed').length;
      const pending = history.filter(h => h.merge_status === 'pending').length;

      return {
        totalSuggestions,
        completed,
        failed,
        pending,
      };
    } catch (error) {
      console.error('Error fetching merge stats:', error);
      return {
        totalSuggestions: 0,
        completed: 0,
        failed: 0,
        pending: 0,
      };
    }
  },
};
