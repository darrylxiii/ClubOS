import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

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
  candidateData: Record<string, any>;
  profileData: Record<string, any>;
  fieldsToMerge: string[];
  conflicts: Array<{ field: string; candidateValue: any; profileValue: any }>;
  applicationsCount: number;
  interactionsCount: number;
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
      toast({
        title: "Error",
        description: "Failed to fetch merge suggestions",
        variant: "destructive",
      });
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
      // Fetch candidate profile
      const { data: candidate, error: candidateError } = await supabase
        .from('candidate_profiles')
        .select('*')
        .eq('id', candidateId)
        .single();

      if (candidateError) throw candidateError;

      // Fetch user profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError) throw profileError;

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

      const mergeableFields = [
        'full_name', 'avatar_url', 'bio', 'location', 'phone',
        'linkedin_url', 'desired_salary_min', 'desired_salary_max',
        'preferred_currency', 'remote_work_preference', 'notice_period'
      ];

      mergeableFields.forEach(field => {
        const candidateValue = candidate[field];
        const profileValue = profile[field];

        if (candidateValue && !profileValue) {
          fieldsToMerge.push(field);
        } else if (candidateValue && profileValue && candidateValue !== profileValue) {
          conflicts.push({ field, candidateValue, profileValue });
        }
      });

      return {
        candidateData: candidate,
        profileData: profile,
        fieldsToMerge,
        conflicts,
        applicationsCount: appsCount || 0,
        interactionsCount: interactionsCount || 0,
      };
    } catch (error) {
      console.error('Error previewing merge:', error);
      toast({
        title: "Error",
        description: "Failed to preview merge",
        variant: "destructive",
      });
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
        toast({
          title: "Success",
          description: data.message || "Candidate profile merged successfully",
        });
      }

      return data;
    } catch (error: any) {
      console.error('Error executing merge:', error);
      const errorMessage = error?.message || 'Failed to merge candidate profile';
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });

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

    toast({
      title: "Bulk Merge Complete",
      description: `${results.successful} succeeded, ${results.failed} failed`,
      variant: results.failed > 0 ? "destructive" : "default",
    });

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

      toast({
        title: "Merge Rejected",
        description: "The merge suggestion has been dismissed",
      });
    } catch (error) {
      console.error('Error rejecting merge:', error);
      toast({
        title: "Error",
        description: "Failed to reject merge suggestion",
        variant: "destructive",
      });
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
      toast({
        title: "Error",
        description: "Failed to fetch merge history",
        variant: "destructive",
      });
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
