import { useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { trackingService } from '@/services/trackingService';

export function usePartnerTracking() {
  const { user } = useAuth();

  const trackCandidateView = useCallback((candidateId: string, viewContext: string) => {
    if (!user) return;
    
    trackingService.trackEvent({
      eventType: 'partner_candidate_viewed',
      metadata: { 
        candidateId, 
        viewContext,
        featureName: 'candidate_viewing',
        featureCategory: 'hiring',
      },
    });
  }, [user]);

  const trackCandidateShortlist = useCallback((candidateId: string, jobId: string) => {
    if (!user) return;
    
    trackingService.trackEvent({
      eventType: 'partner_candidate_shortlisted',
      metadata: { 
        candidateId,
        jobId,
        featureName: 'candidate_shortlist',
        featureCategory: 'hiring',
      },
    });
  }, [user]);

  const trackApplicationReview = useCallback((applicationId: string, decision: string, timeSpentSeconds: number) => {
    if (!user) return;
    
    trackingService.trackEvent({
      eventType: 'partner_application_reviewed',
      metadata: { 
        applicationId,
        decision,
        timeSpentSeconds,
        featureName: 'application_review',
        featureCategory: 'hiring',
      },
    });
  }, [user]);

  const trackInterviewScheduled = useCallback((candidateId: string, interviewType: string) => {
    if (!user) return;
    
    trackingService.trackEvent({
      eventType: 'partner_interview_scheduled',
      metadata: { 
        candidateId,
        interviewType,
        featureName: 'interview_scheduling',
        featureCategory: 'hiring',
      },
    });
  }, [user]);

  const trackOfferCreated = useCallback((candidateId: string, offerAmount: number) => {
    if (!user) return;
    
    trackingService.trackEvent({
      eventType: 'partner_offer_created',
      metadata: { 
        candidateId,
        offerAmount,
        featureName: 'offer_creation',
        featureCategory: 'hiring',
      },
    });
  }, [user]);

  const trackJobPosting = useCallback((jobId: string, action: 'created' | 'updated' | 'closed') => {
    if (!user) return;
    
    trackingService.trackEvent({
      eventType: `partner_job_${action}`,
      metadata: { 
        jobId,
        featureName: 'job_management',
        featureCategory: 'hiring',
      },
    });
  }, [user]);

  const trackCompanyIntelligenceAccess = useCallback((companyId: string, section: string) => {
    if (!user) return;
    
    trackingService.trackEvent({
      eventType: 'partner_intelligence_accessed',
      metadata: { 
        companyId,
        section,
        featureName: 'intelligence_hub',
        featureCategory: 'hiring',
      },
    });
  }, [user]);

  const trackPipelineUpdate = useCallback((applicationId: string, fromStage: string, toStage: string) => {
    if (!user) return;
    
    trackingService.trackEvent({
      eventType: 'partner_pipeline_updated',
      metadata: { 
        applicationId,
        fromStage,
        toStage,
        featureName: 'pipeline_management',
        featureCategory: 'hiring',
      },
    });
  }, [user]);

  return {
    trackCandidateView,
    trackCandidateShortlist,
    trackApplicationReview,
    trackInterviewScheduled,
    trackOfferCreated,
    trackJobPosting,
    trackCompanyIntelligenceAccess,
    trackPipelineUpdate,
  };
}
