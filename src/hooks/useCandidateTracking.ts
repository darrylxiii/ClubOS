import { useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { trackingService } from '@/services/trackingService';

export function useCandidateTracking() {
  const { user } = useAuth();

  const trackJobView = useCallback((jobId: string, jobTitle: string, companyName: string) => {
    if (!user) return;
    
    trackingService.trackEvent({
      eventType: 'candidate_job_view',
      metadata: { 
        jobId, 
        jobTitle, 
        companyName,
        featureName: 'job_viewing',
        featureCategory: 'career',
      },
    });
  }, [user]);

  const trackJobSave = useCallback((jobId: string, saved: boolean) => {
    if (!user) return;
    
    trackingService.trackEvent({
      eventType: saved ? 'candidate_job_saved' : 'candidate_job_unsaved',
      metadata: { 
        jobId,
        featureName: 'job_saving',
        featureCategory: 'career',
      },
    });
  }, [user]);

  const trackApplicationStart = useCallback((jobId: string) => {
    if (!user) return;
    
    trackingService.trackEvent({
      eventType: 'candidate_application_started',
      metadata: { 
        jobId,
        featureName: 'application_start',
        featureCategory: 'career',
      },
    });
  }, [user]);

  const trackApplicationComplete = useCallback((jobId: string, timeSpentSeconds: number) => {
    if (!user) return;
    
    trackingService.trackEvent({
      eventType: 'candidate_application_completed',
      metadata: { 
        jobId,
        timeSpentSeconds,
        featureName: 'application_complete',
        featureCategory: 'career',
      },
    });
  }, [user]);

  const trackApplicationSubmit = useCallback((jobId: string, applicationId: string) => {
    if (!user) return;
    
    trackingService.trackEvent({
      eventType: 'candidate_application_submitted',
      metadata: { 
        jobId,
        applicationId,
        featureName: 'application_submit',
        featureCategory: 'career',
      },
    });
  }, [user]);

  const trackResumeUpdate = useCallback(() => {
    if (!user) return;
    
    trackingService.trackEvent({
      eventType: 'candidate_resume_updated',
      metadata: {
        featureName: 'resume_update',
        featureCategory: 'profile',
      },
    });
  }, [user]);

  const trackProfileUpdate = useCallback((section: string) => {
    if (!user) return;
    
    trackingService.trackEvent({
      eventType: 'candidate_profile_updated',
      metadata: { 
        section,
        featureName: 'profile_update',
        featureCategory: 'profile',
      },
    });
  }, [user]);

  const trackInterviewPrepAccess = useCallback((jobId?: string) => {
    if (!user) return;
    
    trackingService.trackEvent({
      eventType: 'candidate_interview_prep_accessed',
      metadata: { 
        jobId,
        featureName: 'interview_prep',
        featureCategory: 'career',
      },
    });
  }, [user]);

  const trackSearchQuery = useCallback((query: string, filters: any, resultsCount: number = 0) => {
    if (!user) return;
    
    trackingService.trackSearch({
      searchQuery: query,
      searchFilters: filters,
      resultsCount,
      searchCategory: 'jobs',
    });
  }, [user]);

  return {
    trackJobView,
    trackJobSave,
    trackApplicationStart,
    trackApplicationComplete,
    trackApplicationSubmit,
    trackResumeUpdate,
    trackProfileUpdate,
    trackInterviewPrepAccess,
    trackSearchQuery,
  };
}
