import { supabase } from "@/integrations/supabase/client";
import { 
  MergeSuggestionForApproval, 
  CandidateProfileData, 
  ApprovalWorkflowData,
  ApprovalWorkflowResult 
} from "@/types/approval";
import { mergeService } from "@/services/mergeService";

export const memberApprovalService = {
  /**
   * Get merge suggestions for a new member based on email and name
   */
  async getMergeSuggestionsForMember(
    email: string,
    name: string
  ): Promise<MergeSuggestionForApproval[]> {
    try {
      const { data, error } = await supabase
        .from('potential_merges')
        .select('*')
        .eq('already_merged', false)
        .or(`profile_email.eq.${email},candidate_email.eq.${email}`)
        .order('confidence_score', { ascending: false });

      if (error) throw error;

      return (data || []).map(item => ({
        candidate_id: item.candidate_id,
        candidate_name: item.candidate_name,
        candidate_email: item.candidate_email,
        candidate_created_at: item.candidate_created_at,
        profile_id: item.profile_id,
        profile_name: item.profile_name,
        confidence_score: item.confidence_score,
        match_type: item.match_type as 'email_match' | 'partial_link' | 'manual',
      }));
    } catch (error) {
      console.error('Error fetching merge suggestions:', error);
      return [];
    }
  },

  /**
   * Create a candidate profile from member request data
   */
  async createCandidateFromRequest(
    requestData: CandidateProfileData
  ): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from('candidate_profiles')
        .insert({
          full_name: requestData.full_name,
          email: requestData.email,
          phone: requestData.phone,
          current_title: requestData.current_title,
          linkedin_url: requestData.linkedin_url,
          location: requestData.location,
          skills: requestData.skills || [],
          years_of_experience: requestData.years_of_experience,
          desired_salary_min: requestData.desired_salary_min,
          desired_salary_max: requestData.desired_salary_max,
          remote_work_preference: requestData.remote_work_preference,
          notice_period: requestData.notice_period,
          source_channel: requestData.source_channel,
          source_metadata: requestData.source_metadata,
          created_by: requestData.created_by,
        })
        .select('id')
        .single();

      if (error) throw error;
      return data?.id || null;
    } catch (error) {
      console.error('Error creating candidate profile:', error);
      throw error;
    }
  },

  /**
   * Link a candidate to a job by creating an application
   */
  async linkCandidateToJob(
    candidateId: string,
    jobId: string,
    adminId: string
  ): Promise<string | null> {
    try {
      // Get job details
      const { data: job, error: jobError } = await supabase
        .from('jobs')
        .select('title, company_id')
        .eq('id', jobId)
        .single();

      if (jobError) throw jobError;

      // Get candidate details
      const { data: candidate, error: candidateError } = await supabase
        .from('candidate_profiles')
        .select('full_name, email, phone, linkedin_url, current_title, resume_url')
        .eq('id', candidateId)
        .single();

      if (candidateError) throw candidateError;

      // Get company name
      const { data: company, error: companyError } = await supabase
        .from('companies')
        .select('name')
        .eq('id', job.company_id)
        .single();

      if (companyError) throw companyError;

      // Create application
      const { data: application, error: applicationError } = await supabase
        .from('applications')
        .insert({
          candidate_id: candidateId,
          job_id: jobId,
          position: job.title,
          company_name: company.name,
          candidate_full_name: candidate.full_name,
          candidate_email: candidate.email,
          candidate_phone: candidate.phone,
          candidate_linkedin_url: candidate.linkedin_url,
          candidate_title: candidate.current_title,
          candidate_resume_url: candidate.resume_url,
          application_source: 'direct',
          sourced_by: adminId,
          status: 'submitted',
          stages: [
            { name: 'Application', completed: true, date: new Date().toISOString() },
            { name: 'Screening', completed: false },
            { name: 'Interview', completed: false },
            { name: 'Offer', completed: false },
          ],
        })
        .select('id')
        .single();

      if (applicationError) throw applicationError;
      return application?.id || null;
    } catch (error) {
      console.error('Error linking candidate to job:', error);
      throw error;
    }
  },

  /**
   * Log approval action to tracking table
   */
  async logApprovalAction(
    requestId: string,
    approvedBy: string,
    actionType: 'merge' | 'create_profile' | 'assign_to_job' | 'skip_merge' | 'approve',
    actionData: any,
    actionResult: 'success' | 'failed' | 'pending',
    errorMessage?: string
  ): Promise<void> {
    try {
      await supabase
        .from('admin_member_approval_actions')
        .insert({
          request_id: requestId,
          approved_by: approvedBy,
          action_type: actionType,
          action_data: actionData,
          action_result: actionResult,
          error_message: errorMessage,
        });
    } catch (error) {
      console.error('Error logging approval action:', error);
    }
  },

  /**
   * Execute the complete approval workflow
   */
  async executeApprovalWorkflow(
    workflowData: ApprovalWorkflowData
  ): Promise<ApprovalWorkflowResult> {
    const errors: string[] = [];
    let candidateId: string | null = null;
    let applicationId: string | null = null;

    try {
      // Step 1: Handle merges if any
      if (workflowData.mergeActions.length > 0) {
        for (const mergeAction of workflowData.mergeActions) {
          try {
            const result = await mergeService.executeMerge(
              mergeAction.candidateId,
              mergeAction.userId,
              'manual',
              workflowData.adminId
            );

            if (!result.success) {
              throw new Error(result.error || 'Merge failed');
            }

            await this.logApprovalAction(
              workflowData.requestId,
              workflowData.adminId,
              'merge',
              { candidateId: mergeAction.candidateId, userId: mergeAction.userId },
              'success'
            );

            candidateId = mergeAction.candidateId;
          } catch (error: any) {
            errors.push(`Merge failed: ${error.message}`);
            await this.logApprovalAction(
              workflowData.requestId,
              workflowData.adminId,
              'merge',
              { candidateId: mergeAction.candidateId, userId: mergeAction.userId },
              'failed',
              error.message
            );
          }
        }
      }

      // Step 2: Create candidate profile if needed
      if (workflowData.createProfile && !candidateId) {
        try {
          candidateId = await this.createCandidateFromRequest(workflowData.createProfile);

          if (candidateId) {
            await this.logApprovalAction(
              workflowData.requestId,
              workflowData.adminId,
              'create_profile',
              { candidateId },
              'success'
            );
          }
        } catch (error: any) {
          errors.push(`Profile creation failed: ${error.message}`);
          await this.logApprovalAction(
            workflowData.requestId,
            workflowData.adminId,
            'create_profile',
            {},
            'failed',
            error.message
          );
        }
      }

      // Step 3: Assign to job if specified
      if (workflowData.assignToJob && candidateId) {
        try {
          applicationId = await this.linkCandidateToJob(
            candidateId,
            workflowData.assignToJob.jobId,
            workflowData.adminId
          );

          if (applicationId) {
            await this.logApprovalAction(
              workflowData.requestId,
              workflowData.adminId,
              'assign_to_job',
              { candidateId, jobId: workflowData.assignToJob.jobId, applicationId },
              'success'
            );
          }
        } catch (error: any) {
          errors.push(`Job assignment failed: ${error.message}`);
          await this.logApprovalAction(
            workflowData.requestId,
            workflowData.adminId,
            'assign_to_job',
            { candidateId, jobId: workflowData.assignToJob.jobId },
            'failed',
            error.message
          );
        }
      }

      // Step 4: Approve the member request
      try {
        const { error } = await supabase
          .from('profiles')
          .update({
            account_status: 'approved',
            account_approved_by: workflowData.adminId,
          })
          .eq('id', workflowData.requestId);

        if (error) throw error;

        await this.logApprovalAction(
          workflowData.requestId,
          workflowData.adminId,
          'approve',
          { candidateId, applicationId },
          'success'
        );
      } catch (error: any) {
        errors.push(`Approval failed: ${error.message}`);
        await this.logApprovalAction(
          workflowData.requestId,
          workflowData.adminId,
          'approve',
          {},
          'failed',
          error.message
        );
      }

      return {
        success: errors.length === 0,
        message: errors.length === 0 
          ? 'Member approved successfully' 
          : 'Approval completed with some errors',
        candidateId: candidateId || undefined,
        applicationId: applicationId || undefined,
        errors: errors.length > 0 ? errors : undefined,
      };
    } catch (error: any) {
      return {
        success: false,
        message: 'Approval workflow failed',
        errors: [error.message],
      };
    }
  },
};
