import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface MeetingIntelligence {
  engagement_timeline: Array<{ timestamp: number; engagement: number; sentiment: number }>;
  speaking_ratio_per_participant: Record<string, number>;
  topic_transitions: Array<{ timestamp: number; fromTopic: string; toTopic: string }>;
  confusion_markers: Array<{ timestamp: number; speaker: string; text: string }>;
  agreement_markers: Array<{ timestamp: number; speaker: string; type: string }>;
  answer_quality_scores: Array<{ speaker: string; timestamp: number; score: number; components: string[] }>;
  overall_sentiment: number;
  engagement_score: number;
  meeting_effectiveness: number;
}

export interface EngagementSample {
  participant_id: string;
  engagement_score: number;
  sentiment_score: number;
  speaking_detected: boolean;
  attention_indicator: string;
  sample_timestamp: string;
}

export function useMeetingIntelligence(meetingId: string | null) {
  const [intelligence, setIntelligence] = useState<MeetingIntelligence | null>(null);
  const [engagementSamples, setEngagementSamples] = useState<EngagementSample[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Fetch existing intelligence data
  const fetchIntelligence = useCallback(async () => {
    if (!meetingId) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('meeting_intelligence')
        .select('*')
        .eq('meeting_id', meetingId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Failed to fetch intelligence:', error);
      }

      if (data) {
        // Cast to any to handle dynamic schema - types will be regenerated after migration
        const rawData = data as any;
        setIntelligence({
          engagement_timeline: rawData.engagement_timeline || [],
          speaking_ratio_per_participant: rawData.speaking_ratio_per_participant || {},
          topic_transitions: rawData.topic_transitions || [],
          confusion_markers: rawData.confusion_markers || [],
          agreement_markers: rawData.agreement_markers || [],
          answer_quality_scores: rawData.answer_quality_scores || [],
          overall_sentiment: rawData.overall_sentiment || 0,
          engagement_score: rawData.engagement_score || 50,
          meeting_effectiveness: rawData.meeting_effectiveness || 50
        });
      }

      // Fetch recent engagement samples
      const { data: samples } = await supabase
        .from('meeting_engagement_samples')
        .select('*')
        .eq('meeting_id', meetingId)
        .order('sample_timestamp', { ascending: false })
        .limit(100);

      if (samples) {
        setEngagementSamples(samples as EngagementSample[]);
      }
    } finally {
      setIsLoading(false);
    }
  }, [meetingId]);

  // Analyze transcript in real-time
  const analyzeTranscript = useCallback(async (
    transcriptSegments: Array<{ speaker: string; text: string; timestamp: number; duration: number }>,
    participants?: Array<{ id: string; name: string; isSpeaking?: boolean; engagementScore?: number }>
  ) => {
    if (!meetingId) return;

    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-meeting-live-enhanced', {
        body: { meetingId, transcriptSegments, participants }
      });

      if (error) throw error;

      // Refresh intelligence after analysis
      await fetchIntelligence();

      return data.analysis;
    } catch (error) {
      console.error('Failed to analyze transcript:', error);
    } finally {
      setIsAnalyzing(false);
    }
  }, [meetingId, fetchIntelligence]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!meetingId) return;

    fetchIntelligence();

    const channel = supabase
      .channel(`meeting-intelligence-${meetingId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'meeting_intelligence',
          filter: `meeting_id=eq.${meetingId}`
        },
        () => {
          fetchIntelligence();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'meeting_engagement_samples',
          filter: `meeting_id=eq.${meetingId}`
        },
        (payload) => {
          setEngagementSamples(prev => [payload.new as EngagementSample, ...prev.slice(0, 99)]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [meetingId, fetchIntelligence]);

  // Get current speaker ratios as percentages
  const getSpeakerRatioChart = useCallback(() => {
    if (!intelligence?.speaking_ratio_per_participant) return [];

    return Object.entries(intelligence.speaking_ratio_per_participant).map(([speaker, ratio]) => ({
      name: speaker,
      value: ratio,
      fill: `hsl(${Math.random() * 360}, 70%, 50%)`
    }));
  }, [intelligence]);

  // Get engagement trend over time
  const getEngagementTrend = useCallback(() => {
    if (!intelligence?.engagement_timeline) return [];

    return intelligence.engagement_timeline.map((point, index) => ({
      time: index,
      engagement: point.engagement,
      sentiment: (point.sentiment + 1) * 50 // Convert -1 to 1 range to 0-100
    }));
  }, [intelligence]);

  return {
    intelligence,
    engagementSamples,
    isLoading,
    isAnalyzing,
    fetchIntelligence,
    analyzeTranscript,
    getSpeakerRatioChart,
    getEngagementTrend
  };
}
