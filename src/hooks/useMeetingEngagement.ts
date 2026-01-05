import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ParticipantEngagement {
  id: string;
  name: string;
  role: 'host' | 'candidate' | 'interviewer' | 'participant';
  speakingTimeMs: number;
  speakingPercentage: number;
  isSpeaking: boolean;
  engagement: number;
  sentimentTrend: 'positive' | 'neutral' | 'negative';
  lastSpoke: number;
}

interface MeetingEngagementMetrics {
  overallEngagement: number;
  speakingBalance: number;
  participationRate: number;
  interactionDensity: number;
}

interface UseMeetingEngagementProps {
  meetingId: string;
  participantId: string;
  participantName: string;
  userRole: string;
  localStream?: MediaStream | null;
  remoteStreams?: Map<string, { stream: MediaStream; name: string }>;
  enabled?: boolean;
}

export function useMeetingEngagement({
  meetingId,
  participantId,
  participantName,
  userRole,
  localStream,
  remoteStreams = new Map(),
  enabled = true
}: UseMeetingEngagementProps) {
  const [participants, setParticipants] = useState<ParticipantEngagement[]>([]);
  const [metrics, setMetrics] = useState<MeetingEngagementMetrics>({
    overallEngagement: 75,
    speakingBalance: 50,
    participationRate: 0,
    interactionDensity: 0
  });
  const [activeSpeakerId, setActiveSpeakerId] = useState<string | null>(null);
  const [elapsedTimeMs, setElapsedTimeMs] = useState(0);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyzerMapRef = useRef<Map<string, AnalyserNode>>(new Map());
  const speakingTimesRef = useRef<Map<string, number>>(new Map());
  const startTimeRef = useRef<number>(Date.now());
  const animationFrameRef = useRef<number>();
  const saveIntervalRef = useRef<NodeJS.Timeout>();

  // Initialize audio context
  useEffect(() => {
    if (!enabled) return;
    
    try {
      audioContextRef.current = new AudioContext();
    } catch (error) {
      console.error('[MeetingEngagement] Failed to create AudioContext:', error);
    }

    startTimeRef.current = Date.now();

    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (saveIntervalRef.current) {
        clearInterval(saveIntervalRef.current);
      }
    };
  }, [enabled]);

  // Setup analyzer for a stream
  const setupStreamAnalyzer = useCallback((stream: MediaStream, pId: string) => {
    if (!audioContextRef.current || !stream.getAudioTracks().length) return;

    // Skip if already setup
    if (analyzerMapRef.current.has(pId)) return;

    try {
      const source = audioContextRef.current.createMediaStreamSource(stream);
      const analyser = audioContextRef.current.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyzerMapRef.current.set(pId, analyser);
      speakingTimesRef.current.set(pId, 0);
    } catch (error) {
      console.error('[MeetingEngagement] Failed to setup analyzer for', pId, error);
    }
  }, []);

  // Setup analyzers for all streams
  useEffect(() => {
    if (!enabled || !audioContextRef.current) return;

    // Setup local stream analyzer
    if (localStream) {
      setupStreamAnalyzer(localStream, participantId);
    }

    // Setup remote stream analyzers
    remoteStreams.forEach(({ stream }, id) => {
      setupStreamAnalyzer(stream, id);
    });
  }, [enabled, localStream, remoteStreams, participantId, setupStreamAnalyzer]);

  // Audio level monitoring loop
  useEffect(() => {
    if (!enabled) return;

    const SPEAKING_THRESHOLD = 25;
    const UPDATE_INTERVAL = 100; // ms
    let lastUpdate = Date.now();

    const monitorAudioLevels = () => {
      const now = Date.now();
      const elapsed = now - startTimeRef.current;
      setElapsedTimeMs(elapsed);

      // Only update at intervals
      if (now - lastUpdate < UPDATE_INTERVAL) {
        animationFrameRef.current = requestAnimationFrame(monitorAudioLevels);
        return;
      }
      lastUpdate = now;

      let currentSpeakerId: string | null = null;
      let maxLevel = 0;
      const newParticipants: ParticipantEngagement[] = [];

      // Add local participant
      const localAnalyzer = analyzerMapRef.current.get(participantId);
      if (localAnalyzer) {
        const dataArray = new Uint8Array(localAnalyzer.frequencyBinCount);
        localAnalyzer.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
        
        const isSpeaking = average > SPEAKING_THRESHOLD;
        if (isSpeaking) {
          speakingTimesRef.current.set(participantId, (speakingTimesRef.current.get(participantId) || 0) + UPDATE_INTERVAL);
          if (average > maxLevel) {
            maxLevel = average;
            currentSpeakerId = participantId;
          }
        }

        const speakingTime = speakingTimesRef.current.get(participantId) || 0;
        newParticipants.push({
          id: participantId,
          name: participantName || 'You',
          role: (userRole as any) || 'participant',
          speakingTimeMs: speakingTime,
          speakingPercentage: elapsed > 0 ? Math.round((speakingTime / elapsed) * 100) : 0,
          isSpeaking,
          engagement: Math.min(100, 50 + Math.round((speakingTime / Math.max(elapsed, 1)) * 100)),
          sentimentTrend: 'neutral',
          lastSpoke: isSpeaking ? now : (speakingTime > 0 ? now - 1000 : 0)
        });
      }

      // Add remote participants
      remoteStreams.forEach(({ name }, id) => {
        const analyzer = analyzerMapRef.current.get(id);
        if (analyzer) {
          const dataArray = new Uint8Array(analyzer.frequencyBinCount);
          analyzer.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
          
          const isSpeaking = average > SPEAKING_THRESHOLD;
          if (isSpeaking) {
            speakingTimesRef.current.set(id, (speakingTimesRef.current.get(id) || 0) + UPDATE_INTERVAL);
            if (average > maxLevel) {
              maxLevel = average;
              currentSpeakerId = id;
            }
          }

          const speakingTime = speakingTimesRef.current.get(id) || 0;
          newParticipants.push({
            id,
            name: name || 'Participant',
            role: 'participant',
            speakingTimeMs: speakingTime,
            speakingPercentage: elapsed > 0 ? Math.round((speakingTime / elapsed) * 100) : 0,
            isSpeaking,
            engagement: Math.min(100, 50 + Math.round((speakingTime / Math.max(elapsed, 1)) * 100)),
            sentimentTrend: 'neutral',
            lastSpoke: isSpeaking ? now : (speakingTime > 0 ? now - 1000 : 0)
          });
        }
      });

      setActiveSpeakerId(currentSpeakerId);
      setParticipants(newParticipants);

      // Calculate metrics
      if (newParticipants.length > 0) {
        const totalSpeakingTime = newParticipants.reduce((acc, p) => acc + p.speakingTimeMs, 0);
        const activeSpeakers = newParticipants.filter(p => p.speakingTimeMs > 1000).length;
        
        let speakingBalance = 50;
        if (totalSpeakingTime > 0 && newParticipants.length > 1) {
          const expectedShare = 1 / newParticipants.length;
          const deviations = newParticipants.map(p => 
            Math.abs((p.speakingTimeMs / totalSpeakingTime) - expectedShare)
          );
          const avgDeviation = deviations.reduce((a, b) => a + b, 0) / deviations.length;
          speakingBalance = Math.max(0, Math.min(100, 100 - (avgDeviation * 200)));
        }

        const participationRate = Math.round((activeSpeakers / newParticipants.length) * 100);
        const interactionDensity = elapsed > 0 ? Math.min(100, Math.round((totalSpeakingTime / elapsed) * 100)) : 0;
        const overallEngagement = Math.round((speakingBalance * 0.4) + (participationRate * 0.3) + (interactionDensity * 0.3));

        setMetrics({
          overallEngagement,
          speakingBalance: Math.round(speakingBalance),
          participationRate,
          interactionDensity
        });
      }

      animationFrameRef.current = requestAnimationFrame(monitorAudioLevels);
    };

    animationFrameRef.current = requestAnimationFrame(monitorAudioLevels);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [enabled, participantId, participantName, userRole, remoteStreams]);

  // Save metrics to database periodically
  useEffect(() => {
    if (!enabled || !meetingId) return;

    const saveMetrics = async () => {
      try {
        const participantData = participants.map(p => ({
          participant_id: p.id,
          name: p.name,
          role: p.role,
          speaking_time_ms: p.speakingTimeMs,
          speaking_percentage: p.speakingPercentage,
          engagement: p.engagement,
          sentiment: p.sentimentTrend
        }));

        // Try to save - table might not exist
        const { error } = await supabase
          .from('meeting_engagement_metrics' as any)
          .upsert({
            meeting_id: meetingId,
            metrics: {
              overall_engagement: metrics.overallEngagement,
              speaking_balance: metrics.speakingBalance,
              participation_rate: metrics.participationRate,
              interaction_density: metrics.interactionDensity,
              participants: participantData,
              elapsed_time_ms: elapsedTimeMs
            },
            recorded_at: new Date().toISOString()
          }, { onConflict: 'meeting_id' });

        if (error && !error.message.includes('does not exist')) {
          console.error('[MeetingEngagement] Save error:', error);
        }
      } catch (error) {
        // Silently fail if table doesn't exist
        console.debug('[MeetingEngagement] Metrics save skipped:', error);
      }
    };

    saveIntervalRef.current = setInterval(saveMetrics, 30000);
    
    return () => {
      if (saveIntervalRef.current) {
        clearInterval(saveIntervalRef.current);
      }
    };
  }, [enabled, meetingId, participants, metrics, elapsedTimeMs]);

  return {
    participants,
    metrics,
    activeSpeakerId,
    elapsedTimeMs,
    isTracking: enabled && analyzerMapRef.current.size > 0
  };
}
