import { useCallback, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type InternalReviewStatus = Database['public']['Enums']['internal_review_status_enum'] | null;
type PartnerReviewStatus = Database['public']['Enums']['partner_review_status_enum'] | null;

export interface ReviewQueueApplication {
  id: string;
  jobId: string;
  companyId: string | null;
  jobTitle: string;
  companyName: string;
  candidateId: string | null;
  userId: string | null;
  candidateName: string;
  candidateTitle: string | null;
  candidateAvatarUrl: string | null;
  candidateSkills: string[];
  candidateSourceChannel: string | null;
  candidateSourcedBy: string | null;
  internalReviewNotes: string | null;
  status: string;
  matchScore: number | null;
  currentStageIndex: number;
  salaryMin: number | null;
  salaryMax: number | null;
  currency: string | null;
  internalReviewStatus: InternalReviewStatus;
  partnerReviewStatus: PartnerReviewStatus;
  createdAt: string;
  // Enriched candidate profile fields
  candidateLinkedinUrl: string | null;
  candidateResumeUrl: string | null;
  candidateYearsOfExperience: number | null;
  candidateLocation: string | null;
  candidateCurrentCompany: string | null;
  candidateEducation: unknown[] | null;
  candidateWorkHistory: unknown[] | null;
  candidateNoticePeriod: string | null;
  candidateRemotePreference: string | null;
  candidateSeniorityLevel: string | null;
  candidateAiSummary: string | null;
  candidateAiRecommendation: string | null;
  candidateDesiredSalaryMin: number | null;
  candidateDesiredSalaryMax: number | null;
  // Enriched job fields
  jobRequirements: unknown[] | null;
  jobNiceToHave: unknown[] | null;
  jobDescription: string | null;
  jobLocation: string | null;
  jobExperienceLevel: string | null;
  jobSeniorityLevel: string | null;
}

interface PartnerReviewFeedbackInput {
  application: ReviewQueueApplication;
  feedbackType: 'approval' | 'rejection' | 'hold';
  notes?: string;
  rating?: number;
  rejectionReason?: string;
  specificGaps?: string[];
  tags?: string[];
  idealCandidate?: string;
}

function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string' && item.length > 0);
  }
  return [];
}

async function fetchReviewQueue(jobId: string): Promise<ReviewQueueApplication[]> {
  const { data: applications, error: applicationsError } = await supabase
    .from('applications')
    .select(
      'id, job_id, candidate_id, user_id, current_stage_index, status, match_score, created_at, internal_review_status, partner_review_status, internal_review_notes, sourced_by',
    )
    .eq('job_id', jobId)
    .neq('status', 'rejected')
    .order('created_at', { ascending: false });

  if (applicationsError) throw applicationsError;

  const applicationRows = applications ?? [];
  if (applicationRows.length === 0) return [];

  const candidateIds = [...new Set(applicationRows.map((app) => app.candidate_id).filter(Boolean))] as string[];
  const applicationUserIds = [...new Set(applicationRows.map((app) => app.user_id).filter(Boolean))] as string[];
  const sourcedByIds = [...new Set(applicationRows.map((app) => app.sourced_by).filter(Boolean))] as string[];

  const [candidateProfilesResult, jobResult] = await Promise.all([
    candidateIds.length > 0
      ? supabase
          .from('candidate_profiles')
          .select('id, user_id, full_name, current_title, avatar_url, skills')
          .in('id', candidateIds)
      : Promise.resolve({ data: [], error: null }),
    supabase
      .from('jobs')
      .select('id, title, salary_min, salary_max, currency, company_id')
      .eq('id', jobId)
      .maybeSingle(),
  ]);

  if (candidateProfilesResult.error) throw candidateProfilesResult.error;
  if (jobResult.error) throw jobResult.error;

  const candidateProfiles = candidateProfilesResult.data ?? [];
  const profileIdsToFetch = new Set([...applicationUserIds, ...sourcedByIds]);
  candidateProfiles.forEach((profile) => {
    if (profile.user_id) profileIdsToFetch.add(profile.user_id);
  });

  const profileIds = Array.from(profileIdsToFetch);
  const { data: profiles, error: profilesError } = profileIds.length
    ? await supabase.from('profiles').select('id, full_name, avatar_url').in('id', profileIds)
    : { data: [], error: null };

  if (profilesError) throw profilesError;

  const job = jobResult.data;
  let companyName = 'Company';
  if (job?.company_id) {
    const { data: companyData } = await supabase
      .from('companies')
      .select('name')
      .eq('id', job.company_id)
      .maybeSingle();
    companyName = companyData?.name || companyName;
  }

  const candidateProfileById = new Map(candidateProfiles.map((profile) => [profile.id, profile]));
  const profileById = new Map((profiles ?? []).map((profile) => [profile.id, profile]));

  return applicationRows.map((app) => {
    const candidateProfile = app.candidate_id ? candidateProfileById.get(app.candidate_id) : undefined;
    const linkedProfileId = candidateProfile?.user_id || app.user_id || '';
    const linkedProfile = linkedProfileId ? profileById.get(linkedProfileId) : undefined;
    const sourcedByProfile = app.sourced_by ? profileById.get(app.sourced_by) : undefined;

    return {
      id: app.id,
      jobId: app.job_id,
      companyId: job?.company_id || null,
      jobTitle: job?.title || 'Role',
      companyName,
      candidateId: app.candidate_id,
      userId: app.user_id,
      candidateName: candidateProfile?.full_name || linkedProfile?.full_name || 'Candidate',
      candidateTitle: candidateProfile?.current_title || null,
      candidateAvatarUrl: candidateProfile?.avatar_url || linkedProfile?.avatar_url || null,
      candidateSkills: toStringArray(candidateProfile?.skills),
      candidateSourceChannel: null, // Not available on applications table
      candidateSourcedBy: sourcedByProfile?.full_name || null,
      internalReviewNotes: app.internal_review_notes || null,
      status: app.status,
      matchScore: app.match_score,
      currentStageIndex: app.current_stage_index,
      salaryMin: job?.salary_min || null,
      salaryMax: job?.salary_max || null,
      currency: job?.currency || null,
      internalReviewStatus: app.internal_review_status,
      partnerReviewStatus: app.partner_review_status,
      createdAt: app.created_at,
    };
  });
}

async function writeAuditLog(action: string, applicationId: string, jobId: string, metadata?: Record<string, unknown>) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await (supabase as any).from('candidate_application_logs').insert({
      application_id: applicationId,
      action,
      performed_by: user.id,
      metadata: { job_id: jobId, ...metadata },
    });
  } catch {
    // Audit log failures should not block the main flow
  }
}

export function useReviewQueue(jobId?: string) {
  const queryClient = useQueryClient();

  const queueQuery = useQuery({
    queryKey: ['review-queue', jobId],
    queryFn: () => fetchReviewQueue(jobId as string),
    enabled: Boolean(jobId),
    staleTime: 45_000,
  });

  const reviewQueue = queueQuery.data ?? [];

  const internalPending = useMemo(
    () =>
      reviewQueue.filter(
        (application) =>
          application.status !== 'rejected' &&
          (application.internalReviewStatus === null || application.internalReviewStatus === 'pending'),
      ),
    [reviewQueue],
  );

  const partnerPending = useMemo(
    () =>
      reviewQueue.filter(
        (application) =>
          application.internalReviewStatus === 'approved' &&
          (application.partnerReviewStatus === null || application.partnerReviewStatus === 'pending'),
      ),
    [reviewQueue],
  );

  const getCurrentUserId = async (): Promise<string> => {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    if (!user?.id) throw new Error('You need to be signed in to review candidates.');
    return user.id;
  };

  const invalidateReviewQueries = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['review-queue', jobId] }),
      queryClient.invalidateQueries({ queryKey: ['applications'] }),
    ]);
  }, [queryClient, jobId]);

  const writePartnerReviewFeedback = async ({
    application,
    feedbackType,
    notes,
    rating,
    rejectionReason,
    specificGaps,
    tags,
    idealCandidate,
  }: PartnerReviewFeedbackInput) => {
    const reviewerId = await getCurrentUserId();

    await supabase.from('role_candidate_feedback').insert({
      job_id: application.jobId,
      candidate_id: application.candidateId,
      application_id: application.id,
      feedback_type: feedbackType,
      stage_name: 'partner_review',
      rejection_reason: rejectionReason,
      feedback_text: notes,
      skills_match_score: rating,
      experience_match_score: rating,
      specific_gaps: specificGaps,
      strong_points: feedbackType === 'approval' ? tags : null,
      provided_by: reviewerId,
      metadata: {
        review_layer: 'partner_first_review',
        tags,
        ideal_candidate: idealCandidate,
      },
    });

    if (application.companyId) {
      await supabase.from('company_candidate_feedback').insert({
        company_id: application.companyId,
        candidate_id: application.candidateId,
        application_id: application.id,
        job_id: application.jobId,
        feedback_type: feedbackType,
        stage_name: 'partner_review',
        rejection_reason: rejectionReason,
        feedback_text: notes,
        rating,
        skills_mismatch: specificGaps,
        provided_by: reviewerId,
        metadata: {
          review_layer: 'partner_first_review',
          tags,
          ideal_candidate: idealCandidate,
        },
      });
    }
  };

  const approveInternalMutation = useMutation({
    mutationFn: async ({ application, notes }: { application: ReviewQueueApplication; notes?: string }) => {
      const reviewerId = await getCurrentUserId();
      const { error } = await supabase
        .from('applications')
        .update({
          internal_review_status: 'approved',
          internal_reviewed_by: reviewerId,
          internal_reviewed_at: new Date().toISOString(),
          internal_review_notes: notes || null,
          partner_review_status: 'pending',
        })
        .eq('id', application.id);

      if (error) throw error;

      await writeAuditLog('internal_review_approved', application.id, application.jobId, { notes });

      // Notify assigned partner reviewers
      try {
        const { data: partnerReviewers } = await supabase
          .from('pipeline_reviewers')
          .select('reviewer_id')
          .eq('job_id', application.jobId)
          .eq('review_type', 'partner');

        if (partnerReviewers && partnerReviewers.length > 0) {
          const notifications = partnerReviewers.map((r) => ({
            reviewer_id: r.reviewer_id,
            job_id: application.jobId,
            application_id: application.id,
            review_type: 'partner',
            notification_type: 'review_ready',
          }));

          await supabase.from('review_notifications').insert(notifications);
        }
      } catch {
        // Notification failures should not block the main flow
      }
    },
    onSuccess: async () => {
      toast.success('Candidate approved for partner review.');
      await invalidateReviewQueries();
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to approve candidate.');
    },
  });

  const rejectInternalMutation = useMutation({
    mutationFn: async ({ application, notes }: { application: ReviewQueueApplication; notes: string }) => {
      const reviewerId = await getCurrentUserId();

      const { error } = await supabase
        .from('applications')
        .update({
          status: 'rejected',
          internal_review_status: 'rejected',
          internal_reviewed_by: reviewerId,
          internal_reviewed_at: new Date().toISOString(),
          internal_review_notes: notes,
          partner_review_status: 'rejected',
        })
        .eq('id', application.id);

      if (error) throw error;

      await writePartnerReviewFeedback({
        application,
        feedbackType: 'rejection',
        notes,
        rejectionReason: 'internal_screening',
      });

      await writeAuditLog('internal_review_rejected', application.id, application.jobId, { notes });
    },
    onSuccess: async () => {
      toast.success('Candidate rejected during internal review.');
      await invalidateReviewQueries();
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to reject candidate.');
    },
  });

  const approvePartnerMutation = useMutation({
    mutationFn: async ({
      application, notes, rating, tags,
    }: {
      application: ReviewQueueApplication;
      notes?: string;
      rating?: number;
      tags?: string[];
    }) => {
      const reviewerId = await getCurrentUserId();
      const reviewedAt = new Date().toISOString();

      const { error } = await supabase
        .from('applications')
        .update({
          partner_review_status: 'approved',
          partner_reviewed_by: reviewerId,
          partner_reviewed_at: reviewedAt,
          partner_review_notes: notes || null,
          partner_review_rating: rating || null,
        })
        .eq('id', application.id);

      if (error) throw error;

      await writePartnerReviewFeedback({ application, feedbackType: 'approval', notes, rating, tags });
      await writeAuditLog('partner_review_approved', application.id, application.jobId, { rating, tags });
    },
    onSuccess: async () => {
      toast.success('Candidate approved for the live pipeline.');
      await invalidateReviewQueries();
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to approve partner review.');
    },
  });

  const rejectPartnerMutation = useMutation({
    mutationFn: async ({
      application, notes, rejectionReason, specificGaps, idealCandidate, tags, rating,
    }: {
      application: ReviewQueueApplication;
      notes: string;
      rejectionReason: string;
      specificGaps?: string[];
      idealCandidate?: string;
      tags?: string[];
      rating?: number;
    }) => {
      const reviewerId = await getCurrentUserId();
      const reviewedAt = new Date().toISOString();

      const { error } = await supabase
        .from('applications')
        .update({
          status: 'rejected',
          partner_review_status: 'rejected',
          partner_reviewed_by: reviewerId,
          partner_reviewed_at: reviewedAt,
          partner_review_notes: notes,
          partner_review_rating: rating || null,
        })
        .eq('id', application.id);

      if (error) throw error;

      await writePartnerReviewFeedback({
        application, feedbackType: 'rejection', notes, rating, rejectionReason, specificGaps, tags, idealCandidate,
      });
      await writeAuditLog('partner_review_rejected', application.id, application.jobId, { rejectionReason, specificGaps });
    },
    onSuccess: async () => {
      toast.success('Candidate rejected by partner review.');
      await invalidateReviewQueries();
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to reject in partner review.');
    },
  });

  const holdPartnerMutation = useMutation({
    mutationFn: async ({
      application, notes, rating, tags,
    }: {
      application: ReviewQueueApplication;
      notes?: string;
      rating?: number;
      tags?: string[];
    }) => {
      const reviewerId = await getCurrentUserId();
      const reviewedAt = new Date().toISOString();

      const { error } = await supabase
        .from('applications')
        .update({
          partner_review_status: 'hold',
          partner_reviewed_by: reviewerId,
          partner_reviewed_at: reviewedAt,
          partner_review_notes: notes || null,
          partner_review_rating: rating || null,
        })
        .eq('id', application.id);

      if (error) throw error;

      await writePartnerReviewFeedback({ application, feedbackType: 'hold', notes, rating, tags });
      await writeAuditLog('partner_review_hold', application.id, application.jobId, { notes });
    },
    onSuccess: async () => {
      toast.success('Candidate moved to hold.');
      await invalidateReviewQueries();
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to hold candidate.');
    },
  });

  return {
    isLoading: queueQuery.isLoading,
    isError: queueQuery.isError,
    reviewQueue,
    internalPending,
    partnerPending,
    approveInternalMutation,
    rejectInternalMutation,
    approvePartnerMutation,
    rejectPartnerMutation,
    holdPartnerMutation,
  };
}
