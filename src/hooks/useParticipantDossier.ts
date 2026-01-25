import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface DossierContent {
  executiveSummary: string;
  linkedinSnapshot: {
    headline: string;
    currentCompany: string;
    experience: Array<{ title: string; company: string; duration: string }>;
    skills: string[];
    education: string[];
  } | null;
  previousInteractions: Array<{
    type: 'meeting' | 'email' | 'whatsapp' | 'call';
    date: string;
    summary: string;
  }>;
  companyIntel: {
    companyName: string;
    recentNews: string[];
    fundingStatus: string;
    sentiment: string;
    employeeCount: string;
    industry: string;
  } | null;
  mutualConnections: string[];
  suggestedTopics: string[];
  iceBreakers: string[];
  redFlags: string[];
  thingsToAvoid: string[];
  personalityInsights: {
    communicationStyle: string;
    preferredMeetingFormat: string;
    decisionMakingStyle: string;
  } | null;
}

export interface ParticipantDossier {
  id: string;
  booking_id: string | null;
  meeting_id: string | null;
  participant_type: 'host' | 'guest' | 'attendee';
  participant_email: string;
  participant_name: string | null;
  dossier_content: DossierContent;
  linkedin_data: unknown;
  interaction_history: unknown[];
  company_intel: unknown;
  personality_insights: unknown;
  suggested_talking_points: string[];
  ice_breakers: string[];
  things_to_avoid: string[];
  red_flags: string[];
  mutual_connections: string[];
  generated_at: string;
  viewed_at: string | null;
  created_at: string;
}

interface UseParticipantDossierOptions {
  bookingId?: string;
  meetingId?: string;
}

export function useParticipantDossier(options: UseParticipantDossierOptions = {}) {
  const [dossiers, setDossiers] = useState<ParticipantDossier[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDossiers = useCallback(async () => {
    if (!options.bookingId && !options.meetingId) return;

    setIsLoading(true);
    setError(null);

    try {
      // Use edge function to fetch dossiers for untyped table
      const { data, error: fetchError } = await supabase.functions.invoke('generate-meeting-dossier-360', {
        body: {
          action: 'fetch',
          bookingId: options.bookingId,
          meetingId: options.meetingId,
        },
      });

      if (fetchError) throw fetchError;
      setDossiers((data?.dossiers as ParticipantDossier[]) || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch dossiers';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [options.bookingId, options.meetingId]);

  const generateDossier = useCallback(async (
    participantEmail: string,
    participantName?: string,
    forceRefresh = false
  ): Promise<ParticipantDossier | null> => {
    setIsGenerating(true);
    setError(null);

    try {
      const { data, error: invokeError } = await supabase.functions.invoke('generate-meeting-dossier-360', {
        body: {
          bookingId: options.bookingId,
          meetingId: options.meetingId,
          participantEmail,
          participantName,
          forceRefresh,
        },
      });

      if (invokeError) throw invokeError;

      if (data?.dossier) {
        const newDossier = data.dossier as ParticipantDossier;
        setDossiers(prev => {
          const filtered = prev.filter(d => d.participant_email !== participantEmail);
          return [newDossier, ...filtered];
        });

        toast.success(data.cached ? 'Dossier retrieved' : 'Dossier generated', {
          description: `Intelligence brief ready for ${participantName || participantEmail}`,
        });

        return newDossier;
      }

      return null;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate dossier';
      setError(message);
      toast.error('Dossier generation failed', { description: message });
      return null;
    } finally {
      setIsGenerating(false);
    }
  }, [options.bookingId, options.meetingId]);

  const markAsViewed = useCallback(async (dossierId: string) => {
    setDossiers(prev => 
      prev.map(d => d.id === dossierId ? { ...d, viewed_at: new Date().toISOString() } : d)
    );
  }, []);

  const getDossierForParticipant = useCallback((email: string): ParticipantDossier | undefined => {
    return dossiers.find(d => d.participant_email === email);
  }, [dossiers]);

  return {
    dossiers,
    isLoading,
    isGenerating,
    error,
    fetchDossiers,
    generateDossier,
    markAsViewed,
    getDossierForParticipant,
  };
}
