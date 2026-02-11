import { supabase } from "@/integrations/supabase/client";
import { 
  MergeSuggestionForApproval, 
  CandidateProfileData, 
  ApprovalWorkflowData,
  ApprovalWorkflowResult,
  StaffAssignment,
  PipelineAssignment,
  ExistingApplication
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

      // Get existing applications for each candidate
      const candidateIds = (data || []).map(item => item.candidate_id);
      let applicationsMap: Record<string, ExistingApplication[]> = {};

      if (candidateIds.length > 0) {
        const { data: applications } = await supabase
          .from('applications')
          .select('candidate_id, job_id, position, company_name, status')
          .in('candidate_id', candidateIds);

        if (applications) {
          applicationsMap = applications.reduce((acc, app) => {
            if (!acc[app.candidate_id]) {
              acc[app.candidate_id] = [];
            }
            acc[app.candidate_id].push({
              job_id: app.job_id,
              job_title: app.position,
              company_name: app.company_name,
              status: app.status,
            });
            return acc;
          }, {} as Record<string, ExistingApplication[]>);
        }
      }

      return (data || []).map(item => ({
        candidate_id: item.candidate_id,
        candidate_name: item.candidate_name,
        candidate_email: item.candidate_email,
        candidate_created_at: item.candidate_created_at,
        profile_id: item.profile_id,
        profile_name: item.profile_name,
        confidence_score: item.confidence_score,
        match_type: item.match_type as 'email_match' | 'partial_link' | 'manual',
        existing_applications: applicationsMap[item.candidate_id] || [],
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
    requestData: CandidateProfileData,
    userId: string
  ): Promise<string | null> {
    try {
      // Check 1: By user_id (prevents duplicate for same user)
      const { data: existingByUserId } = await supabase
        .from('candidate_profiles')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (existingByUserId) {
        console.log('[MemberApproval] Candidate already exists by user_id:', existingByUserId.id);
        return existingByUserId.id;
      }

      // Check 2: By email (prevents unique_email_when_present violation)
      if (requestData.email) {
        const { data: existingByEmail } = await supabase
          .from('candidate_profiles')
          .select('id, user_id')
          .eq('email', requestData.email)
          .maybeSingle();

        if (existingByEmail) {
          // Link existing candidate to this user if not already linked
          if (!existingByEmail.user_id) {
            const { error: linkError } = await supabase
              .from('candidate_profiles')
              .update({ user_id: userId })
              .eq('id', existingByEmail.id);
            
            if (linkError) {
              console.error('[MemberApproval] Failed to link candidate:', linkError);
            } else {
              console.log('[MemberApproval] Linked existing candidate to user:', existingByEmail.id);
            }
          } else {
            console.log('[MemberApproval] Candidate already exists by email (already linked):', existingByEmail.id);
          }
          return existingByEmail.id;
        }
      }

      // No existing candidate found - proceed with insert
      const insertData = {
        user_id: userId,
        full_name: requestData.full_name,
        email: requestData.email,
        phone: requestData.phone || null,
        current_title: requestData.current_title || null,
        linkedin_url: requestData.linkedin_url || null,
        skills: requestData.skills || [],
        years_of_experience: requestData.years_of_experience || null,
        desired_salary_min: requestData.desired_salary_min || null,
        desired_salary_max: requestData.desired_salary_max || null,
        notice_period: requestData.notice_period || null,
        source_channel: requestData.source_channel,
        source_metadata: requestData.source_metadata || null,
        created_by: requestData.created_by,
        remote_preference: requestData.remote_preference || null,
        desired_locations: requestData.desired_locations && requestData.desired_locations.length > 0 
          ? requestData.desired_locations 
          : null,
      };

      const { data, error } = await supabase
        .from('candidate_profiles')
        .insert(insertData)
        .select('id')
        .single();

      if (error) {
        console.error('[MemberApproval] Create candidate error:', error);
        throw error;
      }
      
      console.log('[MemberApproval] Candidate profile created:', data?.id);
      return data?.id || null;
    } catch (error) {
      console.error('Error creating candidate profile:', error);
      throw error;
    }
  },

  /**
   * Auto-create candidate profile from request data for pipeline assignment
   */
  async autoCreateCandidateProfile(
    requestId: string,
    adminId: string
  ): Promise<string | null> {
    try {
      // Get the profile data from the request
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('full_name, email, phone, current_title, linkedin_url, location')
        .eq('id', requestId)
        .single();

      if (profileError || !profile) {
        console.error('[MemberApproval] Could not fetch profile for auto-create:', profileError);
        return null;
      }

      // Check 1: By user_id
      const { data: existingByUserId } = await supabase
        .from('candidate_profiles')
        .select('id')
        .eq('user_id', requestId)
        .maybeSingle();

      if (existingByUserId) {
        console.log('[MemberApproval] Candidate exists by user_id:', existingByUserId.id);
        return existingByUserId.id;
      }

      // Check 2: By email (prevents duplicate key violation)
      if (profile.email) {
        const { data: existingByEmail } = await supabase
          .from('candidate_profiles')
          .select('id, user_id')
          .eq('email', profile.email)
          .maybeSingle();

        if (existingByEmail) {
          // Link existing candidate to this user if not already linked
          if (!existingByEmail.user_id) {
            const { error: linkError } = await supabase
              .from('candidate_profiles')
              .update({ user_id: requestId })
              .eq('id', existingByEmail.id);
            
            if (linkError) {
              console.error('[MemberApproval] Failed to link candidate:', linkError);
            } else {
              console.log('[MemberApproval] Linked existing candidate to user:', existingByEmail.id);
            }
          } else {
            console.log('[MemberApproval] Candidate exists by email (already linked):', existingByEmail.id);
          }
          return existingByEmail.id;
        }
      }

      // No existing candidate found - create new
      const { data: newCandidate, error: createError } = await supabase
        .from('candidate_profiles')
        .insert({
          user_id: requestId,
          full_name: profile.full_name || 'Unknown',
          email: profile.email,
          phone: profile.phone || null,
          current_title: profile.current_title || null,
          linkedin_url: profile.linkedin_url || null,
          desired_locations: profile.location ? [profile.location] : null,
          source_channel: 'member_approval',
          created_by: adminId,
        })
        .select('id')
        .single();

      if (createError) {
        console.error('[MemberApproval] Auto-create candidate error:', createError);
        throw createError;
      }

      console.log('[MemberApproval] Auto-created candidate profile:', newCandidate?.id);
      return newCandidate?.id || null;
    } catch (error) {
      console.error('Error auto-creating candidate profile:', error);
      return null;
    }
  },

  /**
   * Assign a user role
   */
  async assignUserRole(
    userId: string,
    role: string,
    adminId: string
  ): Promise<boolean> {
    try {
      // Check if role already exists
      const { data: existingRole } = await (supabase as any)
        .from('user_roles')
        .select('id')
        .eq('user_id', userId)
        .eq('role', role)
        .single();

      if (existingRole) {
        console.log('[MemberApproval] Role already assigned:', role);
        return true;
      }

      // Insert new role
      const { error } = await (supabase as any)
        .from('user_roles')
        .insert({
          user_id: userId,
          role: role,
        });

      if (error) {
        console.error('[MemberApproval] Assign role error:', error);
        throw error;
      }

      console.log('[MemberApproval] Role assigned:', role, 'to user:', userId);
      return true;
    } catch (error) {
      console.error('Error assigning user role:', error);
      throw error;
    }
  },

  /**
   * Assign user to company (for partners)
   */
  async assignToCompany(
    userId: string,
    companyId: string,
    role: string
  ): Promise<boolean> {
    try {
      // Check if already a member
      const { data: existingMember } = await supabase
        .from('company_members')
        .select('id')
        .eq('user_id', userId)
        .eq('company_id', companyId)
        .single();

      if (existingMember) {
        console.log('[MemberApproval] Already a company member');
        return true;
      }

      // Add to company_members
      const { error } = await supabase
        .from('company_members')
        .insert({
          user_id: userId,
          company_id: companyId,
          role: role,
        });

      if (error) {
        console.error('[MemberApproval] Assign to company error:', error);
        throw error;
      }

      console.log('[MemberApproval] User assigned to company:', companyId);
      return true;
    } catch (error) {
      console.error('Error assigning user to company:', error);
      throw error;
    }
  },

  /**
   * Link a candidate to a job by creating an application
   */
  async linkCandidateToJob(
    candidateId: string,
    jobId: string,
    adminId: string,
    stageIndex: number = 0
  ): Promise<string | null> {
    try {
      // Check for existing application (duplicate prevention)
      const { data: existingApp } = await supabase
        .from('applications')
        .select('id, status, position')
        .eq('candidate_id', candidateId)
        .eq('job_id', jobId)
        .maybeSingle();

      if (existingApp) {
        throw new Error(`Candidate is already in the "${existingApp.position}" pipeline (Status: ${existingApp.status})`);
      }

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

      // Define pipeline stages
      const pipelineStages = [
        { name: 'Applied', completed: stageIndex >= 0, date: stageIndex >= 0 ? new Date().toISOString() : undefined },
        { name: 'Screening', completed: stageIndex >= 1, date: stageIndex >= 1 ? new Date().toISOString() : undefined },
        { name: 'Interview', completed: stageIndex >= 2, date: stageIndex >= 2 ? new Date().toISOString() : undefined },
        { name: 'Final Round', completed: stageIndex >= 3, date: stageIndex >= 3 ? new Date().toISOString() : undefined },
        { name: 'Offer', completed: stageIndex >= 4, date: stageIndex >= 4 ? new Date().toISOString() : undefined },
      ];

      // Create application
      const { data: application, error: applicationError } = await (supabase as any)
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
          application_source: 'other',
          sourced_by: adminId,
          status: 'submitted',
          current_stage_index: stageIndex,
          stages: pipelineStages,
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
    actionType: 'merge' | 'create_profile' | 'assign_to_job' | 'assign_role' | 'assign_company' | 'skip_merge' | 'approve',
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
      console.log('[MemberApproval] Starting approval workflow for:', workflowData.requestId);

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
          } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : 'Unknown error';
            errors.push(`Merge failed: ${msg}`);
            await this.logApprovalAction(
              workflowData.requestId,
              workflowData.adminId,
              'merge',
              { candidateId: mergeAction.candidateId, userId: mergeAction.userId },
              'failed',
              msg
            );
          }
        }
      }

      // Step 2: Create candidate profile if needed
      if (workflowData.createProfile && !candidateId) {
        try {
          candidateId = await this.createCandidateFromRequest(
            workflowData.createProfile,
            workflowData.requestId
          );

          if (candidateId) {
            await this.logApprovalAction(
              workflowData.requestId,
              workflowData.adminId,
              'create_profile',
              { candidateId },
              'success'
            );
          }
        } catch (error: unknown) {
          const msg = error instanceof Error ? error.message : 'Unknown error';
          errors.push(`Profile creation failed: ${msg}`);
          await this.logApprovalAction(
            workflowData.requestId,
            workflowData.adminId,
            'create_profile',
            {},
            'failed',
            msg
          );
        }
      }

      // Step 3: Handle staff assignment (role + optional company)
      if (workflowData.assignmentType === 'staff' && workflowData.staffAssignment) {
        try {
          await this.assignUserRole(
            workflowData.requestId,
            workflowData.staffAssignment.role,
            workflowData.adminId
          );

          await this.logApprovalAction(
            workflowData.requestId,
            workflowData.adminId,
            'assign_role',
            { role: workflowData.staffAssignment.role },
            'success'
          );

          // If partner role, also assign to company
          if (workflowData.staffAssignment.role === 'partner' && workflowData.staffAssignment.companyId) {
            await this.assignToCompany(
              workflowData.requestId,
              workflowData.staffAssignment.companyId,
              'partner'
            );

            await this.logApprovalAction(
              workflowData.requestId,
              workflowData.adminId,
              'assign_company',
              { companyId: workflowData.staffAssignment.companyId },
              'success'
            );
          }
        } catch (error: unknown) {
          const msg = error instanceof Error ? error.message : 'Unknown error';
          errors.push(`Role assignment failed: ${msg}`);
          await this.logApprovalAction(
            workflowData.requestId,
            workflowData.adminId,
            'assign_role',
            { role: workflowData.staffAssignment?.role },
            'failed',
            msg
          );
        }
      }

      // Step 4: Handle pipeline assignment (auto-create candidate profile + add to job)
      const pipelineAssignment = workflowData.pipelineAssignment || workflowData.assignToJob;
      if (workflowData.assignmentType === 'candidate' && pipelineAssignment) {
        try {
          // Auto-create candidate profile if not already created
          if (!candidateId) {
            candidateId = await this.autoCreateCandidateProfile(
              workflowData.requestId,
              workflowData.adminId
            );
          }

          if (candidateId) {
            applicationId = await this.linkCandidateToJob(
              candidateId,
              pipelineAssignment.jobId,
              workflowData.adminId,
              pipelineAssignment.stageIndex
            );

            if (applicationId) {
              await this.logApprovalAction(
                workflowData.requestId,
                workflowData.adminId,
                'assign_to_job',
                { candidateId, jobId: pipelineAssignment.jobId, applicationId, stageIndex: pipelineAssignment.stageIndex },
                'success'
              );
            }
          } else {
            errors.push('Could not create candidate profile for pipeline assignment');
          }
        } catch (error: unknown) {
          const msg = error instanceof Error ? error.message : 'Unknown error';
          errors.push(`Pipeline assignment failed: ${msg}`);
          await this.logApprovalAction(
            workflowData.requestId,
            workflowData.adminId,
            'assign_to_job',
            { candidateId, jobId: pipelineAssignment.jobId },
            'failed',
            msg
          );
        }
      }

      // Legacy support: Handle assignToJob without assignmentType
      if (!workflowData.assignmentType && workflowData.assignToJob && candidateId) {
        try {
          applicationId = await this.linkCandidateToJob(
            candidateId,
            workflowData.assignToJob.jobId,
            workflowData.adminId,
            workflowData.assignToJob.stageIndex
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
        } catch (error: unknown) {
          errors.push(`Job assignment failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // Step 5: Approve the member request
      try {
        const { error } = await supabase
          .from('profiles')
          .update({
            account_status: 'approved',
            account_approved_by: workflowData.adminId,
            account_reviewed_at: new Date().toISOString(),
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

        console.log('[MemberApproval] Member approved successfully:', workflowData.requestId);
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`Approval failed: ${msg}`);
        await this.logApprovalAction(
          workflowData.requestId,
          workflowData.adminId,
          'approve',
          {},
          'failed',
          msg
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
    } catch (error: unknown) {
      console.error('[MemberApproval] Workflow error:', error);
      return {
        success: false,
        message: 'Approval workflow failed',
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      };
    }
  },
};
