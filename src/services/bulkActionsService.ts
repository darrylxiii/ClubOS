import { supabase } from "@/integrations/supabase/client";
import { exportToCSV } from "@/utils/analyticsExport";

export interface BulkActionResult {
  success: boolean;
  processed: number;
  failed: number;
  errors?: string[];
}

export const bulkActionsService = {
  /**
   * Send bulk emails to candidates
   */
  async sendBulkEmails(
    candidateIds: string[], 
    template: string, 
    subject: string
  ): Promise<BulkActionResult> {
    try {
      const { data, error } = await supabase.functions.invoke('bulk-send-emails', {
        body: { candidateIds, template, subject }
      });

      if (error) throw error;

      return {
        success: true,
        processed: data?.processed || candidateIds.length,
        failed: data?.failed || 0,
        errors: data?.errors
      };
    } catch (error) {
      console.error('Bulk email error:', error);
      return {
        success: false,
        processed: 0,
        failed: candidateIds.length,
        errors: [(error as Error).message]
      };
    }
  },

  /**
   * Bulk schedule assessments for candidates
   */
  async bulkScheduleAssessments(
    candidateIds: string[], 
    assessmentType: string,
    dueDate?: Date
  ): Promise<BulkActionResult> {
    let processed = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const candidateId of candidateIds) {
      try {
        const { error } = await supabase
          .from('assessment_assignments')
          .insert({
            assigned_to: candidateId,
            assessment_type: assessmentType,
            assessment_id: crypto.randomUUID(), // Would be actual assessment
            assigned_by: (await supabase.auth.getUser()).data.user?.id || '',
            due_date: dueDate?.toISOString(),
            status: 'pending'
          });

        if (error) throw error;
        processed++;
      } catch (error) {
        failed++;
        errors.push(`Failed for ${candidateId}: ${(error as Error).message}`);
      }
    }

    return { success: failed === 0, processed, failed, errors };
  },

  /**
   * Bulk advance candidates to next stage
   */
  async bulkAdvanceStage(
    applicationIds: string[], 
    toStageIndex: number
  ): Promise<BulkActionResult> {
    let processed = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const appId of applicationIds) {
      try {
        const { error } = await supabase
          .from('applications')
          .update({ current_stage_index: toStageIndex })
          .eq('id', appId);

        if (error) throw error;
        processed++;
      } catch (error) {
        failed++;
        errors.push(`Failed for ${appId}: ${(error as Error).message}`);
      }
    }

    return { success: failed === 0, processed, failed, errors };
  },

  /**
   * Bulk export candidates data
   */
  async bulkExportCandidates(
    candidateIds: string[], 
    format: 'csv' | 'pdf' = 'csv'
  ): Promise<BulkActionResult> {
    try {
      // Fetch candidate data
      const { data: candidates, error } = await supabase
        .from('candidate_profiles')
        .select(`
          id,
          full_name,
          email,
          phone,
          current_title,
          current_company,
          current_salary_min,
          desired_salary_min,
          created_at
        `)
        .in('id', candidateIds);

      if (error) throw error;

      if (format === 'csv') {
        const exportData = (candidates || []).map(c => ({
          name: c.full_name,
          email: c.email,
          phone: c.phone,
          title: c.current_title,
          company: c.current_company,
          current_salary: c.current_salary_min,
          desired_salary: c.desired_salary_min,
          joined: new Date(c.created_at).toLocaleDateString()
        }));
        
        exportToCSV(exportData, `candidates-export-${Date.now()}`);
      }

      return {
        success: true,
        processed: candidates?.length || 0,
        failed: 0
      };
    } catch (error) {
      return {
        success: false,
        processed: 0,
        failed: candidateIds.length,
        errors: [(error as Error).message]
      };
    }
  },

  /**
   * Bulk send platform invitations to candidates
   */
  async bulkSendInvitations(candidateIds: string[]): Promise<BulkActionResult> {
    let processed = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const candidateId of candidateIds) {
      try {
        const { error } = await supabase.functions.invoke('send-candidate-invitation', {
          body: { candidateId }
        });

        if (error) throw error;
        processed++;
      } catch (error) {
        failed++;
        errors.push(`Failed for ${candidateId}: ${(error as Error).message}`);
      }
    }

    return { success: failed === 0, processed, failed, errors };
  },

  /**
   * Bulk archive items
   */
  async bulkArchive(
    table: string,
    ids: string[]
  ): Promise<BulkActionResult> {
    try {
      const { error } = await supabase
        .from(table as any)
        .update({ status: 'archived' })
        .in('id', ids);

      if (error) throw error;

      return {
        success: true,
        processed: ids.length,
        failed: 0
      };
    } catch (error) {
      return {
        success: false,
        processed: 0,
        failed: ids.length,
        errors: [(error as Error).message]
      };
    }
  }
};
