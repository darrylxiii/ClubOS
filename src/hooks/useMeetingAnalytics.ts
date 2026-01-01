import { useState, useCallback, useRef, useEffect } from 'react';

interface ParticipantStats {
  participantId: string;
  participantName: string;
  speakingTimeMs: number;
  speakingPercentage: number;
  turnCount: number;
  averageTurnDurationMs: number;
  longestTurnMs: number;
  interruptionCount: number;
  reactionsGiven: number;
  questionsAsked: number;
  joinedAt: number;
  leftAt?: number;
}

interface MeetingMetrics {
  duration: number;
  participantCount: number;
  peakParticipantCount: number;
  totalSpeakingTime: number;
  silencePercentage: number;
  averageTurnLength: number;
  interruptionRate: number;
  engagementScore: number;
  qualityScore: number;
}

interface TimelineEvent {
  id: string;
  type: 'join' | 'leave' | 'speak_start' | 'speak_end' | 'reaction' | 'screen_share' | 'recording' | 'highlight';
  participantId?: string;
  participantName?: string;
  timestamp: number;
  data?: Record<string, unknown>;
}

interface EngagementTrend {
  timestamp: number;
  participantCount: number;
  activeSpeakers: number;
  engagementLevel: number;
}

interface UseMeetingAnalyticsReturn {
  participantStats: Map<string, ParticipantStats>;
  meetingMetrics: MeetingMetrics;
  timeline: TimelineEvent[];
  engagementTrends: EngagementTrend[];
  isTracking: boolean;
  startTracking: () => void;
  stopTracking: () => void;
  recordEvent: (event: Omit<TimelineEvent, 'id' | 'timestamp'>) => void;
  recordSpeakingStart: (participantId: string, participantName: string) => void;
  recordSpeakingEnd: (participantId: string) => void;
  recordParticipantJoin: (participantId: string, participantName: string) => void;
  recordParticipantLeave: (participantId: string) => void;
  addHighlight: (description: string, participantId?: string) => void;
  exportAnalytics: () => MeetingAnalyticsExport;
  getParticipantRanking: (metric: 'speakingTime' | 'turnCount' | 'engagement') => ParticipantStats[];
}

interface MeetingAnalyticsExport {
  meetingId: string;
  startTime: number;
  endTime: number;
  metrics: MeetingMetrics;
  participantStats: ParticipantStats[];
  timeline: TimelineEvent[];
  engagementTrends: EngagementTrend[];
}

export function useMeetingAnalytics(meetingId?: string): UseMeetingAnalyticsReturn {
  const [participantStats, setParticipantStats] = useState<Map<string, ParticipantStats>>(new Map());
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [engagementTrends, setEngagementTrends] = useState<EngagementTrend[]>([]);
  const [isTracking, setIsTracking] = useState(false);

  const startTimeRef = useRef<number>(0);
  const speakingStartRef = useRef<Map<string, number>>(new Map());
  const trendIntervalRef = useRef<ReturnType<typeof setInterval>>();
  const currentSpeakersRef = useRef<Set<string>>(new Set());

  const calculateMetrics = useCallback((): MeetingMetrics => {
    const stats = Array.from(participantStats.values());
    const duration = Date.now() - startTimeRef.current;
    const totalSpeakingTime = stats.reduce((sum, s) => sum + s.speakingTimeMs, 0);
    const totalTurns = stats.reduce((sum, s) => sum + s.turnCount, 0);
    const totalInterruptions = stats.reduce((sum, s) => sum + s.interruptionCount, 0);

    const silencePercentage = duration > 0 
      ? Math.max(0, 100 - (totalSpeakingTime / duration) * 100)
      : 0;

    const averageTurnLength = totalTurns > 0 
      ? totalSpeakingTime / totalTurns 
      : 0;

    const interruptionRate = totalTurns > 0 
      ? (totalInterruptions / totalTurns) * 100 
      : 0;

    // Calculate engagement score (0-100)
    const participationScore = stats.length > 0 
      ? (stats.filter(s => s.speakingTimeMs > 0).length / stats.length) * 100 
      : 0;
    const balanceScore = stats.length > 1 
      ? 100 - (Math.max(...stats.map(s => s.speakingPercentage)) - (100 / stats.length)) 
      : 100;
    const engagementScore = (participationScore * 0.5 + balanceScore * 0.5);

    // Quality score based on various factors
    const qualityScore = Math.min(100, Math.max(0,
      85 - (silencePercentage * 0.3) - (interruptionRate * 0.5) + (engagementScore * 0.2)
    ));

    return {
      duration,
      participantCount: stats.length,
      peakParticipantCount: Math.max(stats.length, engagementTrends.reduce((max, t) => Math.max(max, t.participantCount), 0)),
      totalSpeakingTime,
      silencePercentage,
      averageTurnLength,
      interruptionRate,
      engagementScore,
      qualityScore,
    };
  }, [participantStats, engagementTrends]);

  const [meetingMetrics, setMeetingMetrics] = useState<MeetingMetrics>(calculateMetrics);

  const recordEvent = useCallback((event: Omit<TimelineEvent, 'id' | 'timestamp'>) => {
    const fullEvent: TimelineEvent = {
      ...event,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
    };
    setTimeline(prev => [...prev, fullEvent]);
  }, []);

  const updateParticipantSpeakingTime = useCallback((participantId: string, additionalTime: number, isNewTurn: boolean) => {
    setParticipantStats(prev => {
      const newStats = new Map(prev);
      const existing = newStats.get(participantId);
      
      if (existing) {
        const totalSpeaking = existing.speakingTimeMs + additionalTime;
        const allStats = Array.from(newStats.values());
        const grandTotal = allStats.reduce((sum, s) => sum + s.speakingTimeMs, 0) + additionalTime;
        
        newStats.set(participantId, {
          ...existing,
          speakingTimeMs: totalSpeaking,
          speakingPercentage: grandTotal > 0 ? (totalSpeaking / grandTotal) * 100 : 0,
          turnCount: isNewTurn ? existing.turnCount + 1 : existing.turnCount,
          longestTurnMs: Math.max(existing.longestTurnMs, additionalTime),
          averageTurnDurationMs: existing.turnCount > 0 
            ? totalSpeaking / (isNewTurn ? existing.turnCount + 1 : existing.turnCount)
            : totalSpeaking,
        });

        // Recalculate percentages for all participants
        const updatedGrandTotal = grandTotal;
        newStats.forEach((stat, id) => {
          if (id !== participantId) {
            newStats.set(id, {
              ...stat,
              speakingPercentage: updatedGrandTotal > 0 ? (stat.speakingTimeMs / updatedGrandTotal) * 100 : 0,
            });
          }
        });
      }
      
      return newStats;
    });
  }, []);

  const recordSpeakingStart = useCallback((participantId: string, participantName: string) => {
    const now = Date.now();
    
    // Check for interruption
    if (currentSpeakersRef.current.size > 0) {
      setParticipantStats(prev => {
        const newStats = new Map(prev);
        const existing = newStats.get(participantId);
        if (existing) {
          newStats.set(participantId, {
            ...existing,
            interruptionCount: existing.interruptionCount + 1,
          });
        }
        return newStats;
      });
    }

    speakingStartRef.current.set(participantId, now);
    currentSpeakersRef.current.add(participantId);

    recordEvent({
      type: 'speak_start',
      participantId,
      participantName,
    });
  }, [recordEvent]);

  const recordSpeakingEnd = useCallback((participantId: string) => {
    const startTime = speakingStartRef.current.get(participantId);
    if (startTime) {
      const duration = Date.now() - startTime;
      updateParticipantSpeakingTime(participantId, duration, true);
      speakingStartRef.current.delete(participantId);
    }
    currentSpeakersRef.current.delete(participantId);

    recordEvent({
      type: 'speak_end',
      participantId,
    });
  }, [recordEvent, updateParticipantSpeakingTime]);

  const recordParticipantJoin = useCallback((participantId: string, participantName: string) => {
    setParticipantStats(prev => {
      const newStats = new Map(prev);
      if (!newStats.has(participantId)) {
        newStats.set(participantId, {
          participantId,
          participantName,
          speakingTimeMs: 0,
          speakingPercentage: 0,
          turnCount: 0,
          averageTurnDurationMs: 0,
          longestTurnMs: 0,
          interruptionCount: 0,
          reactionsGiven: 0,
          questionsAsked: 0,
          joinedAt: Date.now(),
        });
      }
      return newStats;
    });

    recordEvent({
      type: 'join',
      participantId,
      participantName,
    });
  }, [recordEvent]);

  const recordParticipantLeave = useCallback((participantId: string) => {
    // End any active speaking
    if (speakingStartRef.current.has(participantId)) {
      recordSpeakingEnd(participantId);
    }

    setParticipantStats(prev => {
      const newStats = new Map(prev);
      const existing = newStats.get(participantId);
      if (existing) {
        newStats.set(participantId, {
          ...existing,
          leftAt: Date.now(),
        });
      }
      return newStats;
    });

    recordEvent({
      type: 'leave',
      participantId,
    });
  }, [recordEvent, recordSpeakingEnd]);

  const addHighlight = useCallback((description: string, participantId?: string) => {
    recordEvent({
      type: 'highlight',
      participantId,
      data: { description },
    });
  }, [recordEvent]);

  const startTracking = useCallback(() => {
    startTimeRef.current = Date.now();
    setIsTracking(true);

    // Record engagement trends every 30 seconds
    trendIntervalRef.current = setInterval(() => {
      setEngagementTrends(prev => [...prev, {
        timestamp: Date.now(),
        participantCount: participantStats.size,
        activeSpeakers: currentSpeakersRef.current.size,
        engagementLevel: currentSpeakersRef.current.size > 0 
          ? Math.min(100, (currentSpeakersRef.current.size / Math.max(1, participantStats.size)) * 100 + 50)
          : 30,
      }]);
    }, 30000);
  }, [participantStats.size]);

  const stopTracking = useCallback(() => {
    setIsTracking(false);
    if (trendIntervalRef.current) {
      clearInterval(trendIntervalRef.current);
    }
    setMeetingMetrics(calculateMetrics());
  }, [calculateMetrics]);

  const exportAnalytics = useCallback((): MeetingAnalyticsExport => {
    return {
      meetingId: meetingId || `meeting-${startTimeRef.current}`,
      startTime: startTimeRef.current,
      endTime: Date.now(),
      metrics: calculateMetrics(),
      participantStats: Array.from(participantStats.values()),
      timeline,
      engagementTrends,
    };
  }, [meetingId, calculateMetrics, participantStats, timeline, engagementTrends]);

  const getParticipantRanking = useCallback((metric: 'speakingTime' | 'turnCount' | 'engagement'): ParticipantStats[] => {
    const stats = Array.from(participantStats.values());
    
    switch (metric) {
      case 'speakingTime':
        return stats.sort((a, b) => b.speakingTimeMs - a.speakingTimeMs);
      case 'turnCount':
        return stats.sort((a, b) => b.turnCount - a.turnCount);
      case 'engagement':
        return stats.sort((a, b) => 
          (b.turnCount + b.reactionsGiven) - (a.turnCount + a.reactionsGiven)
        );
      default:
        return stats;
    }
  }, [participantStats]);

  // Update metrics periodically while tracking
  useEffect(() => {
    if (isTracking) {
      const interval = setInterval(() => {
        setMeetingMetrics(calculateMetrics());
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [isTracking, calculateMetrics]);

  useEffect(() => {
    return () => {
      if (trendIntervalRef.current) {
        clearInterval(trendIntervalRef.current);
      }
    };
  }, []);

  return {
    participantStats,
    meetingMetrics,
    timeline,
    engagementTrends,
    isTracking,
    startTracking,
    stopTracking,
    recordEvent,
    recordSpeakingStart,
    recordSpeakingEnd,
    recordParticipantJoin,
    recordParticipantLeave,
    addHighlight,
    exportAnalytics,
    getParticipantRanking,
  };
}
