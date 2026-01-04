import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface TimeSlotScore {
  slot: string;
  date: string;
  score: number;
  factors: {
    historicalShowRate: number;
    timezoneCompatibility: number;
    candidatePreference: number;
    interviewerAvailability: number;
  };
}

interface SchedulingSuggestion {
  recommendedSlots: TimeSlotScore[];
  optimalDate: string;
  optimalTime: string;
  confidence: number;
  reasoning: string[];
}

export function useSmartScheduling() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const analyzeOptimalSlots = async (
    candidateId: string,
    interviewerIds: string[],
    durationMinutes: number = 60,
    dateRange?: { start: Date; end: Date }
  ): Promise<SchedulingSuggestion | null> => {
    setLoading(true);
    setError(null);

    try {
      // Fetch candidate timezone and preferences
      const { data: candidateProfile } = await (supabase as any)
        .from('candidate_profiles')
        .select('timezone, user_id')
        .eq('id', candidateId)
        .single();

      // Fetch historical meeting data for show-rate analysis
      const { data: historicalMeetings } = await (supabase as any)
        .from('video_call_sessions')
        .select('scheduled_start_time, started_at, status, created_at')
        .gte('created_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString())
        .not('status', 'eq', 'cancelled');

      // Analyze show rates by hour
      const showRatesByHour: Record<number, { attended: number; total: number }> = {};
      (historicalMeetings || []).forEach((meeting: any) => {
        if (meeting.scheduled_start_time) {
          const hour = new Date(meeting.scheduled_start_time).getHours();
          if (!showRatesByHour[hour]) {
            showRatesByHour[hour] = { attended: 0, total: 0 };
          }
          showRatesByHour[hour].total++;
          if (meeting.started_at || meeting.status === 'completed') {
            showRatesByHour[hour].attended++;
          }
        }
      });

      // Calculate show rates
      const hourlyShowRates: Record<number, number> = {};
      Object.entries(showRatesByHour).forEach(([hour, data]) => {
        hourlyShowRates[parseInt(hour)] = data.total > 0 ? data.attended / data.total : 0.5;
      });

      // Generate time slots for next 2 weeks
      const startDate = dateRange?.start || new Date();
      const endDate = dateRange?.end || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
      
      const slots: TimeSlotScore[] = [];
      const currentDate = new Date(startDate);
      
      while (currentDate <= endDate) {
        // Skip weekends
        if (currentDate.getDay() !== 0 && currentDate.getDay() !== 6) {
          // Generate slots from 9 AM to 5 PM
          for (let hour = 9; hour <= 17; hour++) {
            const slotDate = new Date(currentDate);
            slotDate.setHours(hour, 0, 0, 0);

            // Skip past times
            if (slotDate <= new Date()) continue;

            const showRate = hourlyShowRates[hour] || 0.7;
            
            // Calculate timezone compatibility (prefer overlapping business hours)
            const candidateTz = candidateProfile?.timezone || 'Europe/Amsterdam';
            const tzScore = calculateTimezoneScore(hour, candidateTz);
            
            // Prefer mid-day slots (10 AM - 3 PM) for higher attention
            const preferenceScore = hour >= 10 && hour <= 15 ? 0.9 : 0.7;
            
            // Default interviewer availability (would check calendar in production)
            const availabilityScore = 0.8;

            const overallScore = (
              showRate * 0.35 +
              tzScore * 0.25 +
              preferenceScore * 0.25 +
              availabilityScore * 0.15
            );

            slots.push({
              slot: `${hour.toString().padStart(2, '0')}:00`,
              date: currentDate.toISOString().split('T')[0],
              score: Math.round(overallScore * 100) / 100,
              factors: {
                historicalShowRate: showRate,
                timezoneCompatibility: tzScore,
                candidatePreference: preferenceScore,
                interviewerAvailability: availabilityScore,
              },
            });
          }
        }
        currentDate.setDate(currentDate.getDate() + 1);
      }

      // Sort by score and get top recommendations
      slots.sort((a, b) => b.score - a.score);
      const topSlots = slots.slice(0, 5);

      if (topSlots.length === 0) {
        return null;
      }

      const bestSlot = topSlots[0];
      
      // Generate reasoning
      const reasoning: string[] = [];
      if (bestSlot.factors.historicalShowRate > 0.8) {
        reasoning.push(`${Math.round(bestSlot.factors.historicalShowRate * 100)}% historical show rate for ${bestSlot.slot} slots`);
      }
      if (bestSlot.factors.timezoneCompatibility > 0.8) {
        reasoning.push('Optimal timezone overlap for both parties');
      }
      if (bestSlot.factors.candidatePreference > 0.8) {
        reasoning.push('Mid-day slot preferred for higher candidate attention');
      }

      return {
        recommendedSlots: topSlots,
        optimalDate: bestSlot.date,
        optimalTime: bestSlot.slot,
        confidence: bestSlot.score,
        reasoning,
      };
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to analyze scheduling');
      setError(error);
      console.error('Smart scheduling error:', error);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const suggestReschedule = async (
    meetingId: string,
    reason: 'no_show' | 'cancelled' | 'conflict'
  ): Promise<TimeSlotScore[] | null> => {
    setLoading(true);
    
    try {
      // Fetch original meeting
      const { data: meeting } = await (supabase as any)
        .from('video_call_sessions')
        .select('*, meeting_participants(*)')
        .eq('id', meetingId)
        .single();

      if (!meeting) return null;

      // Find candidate from participants
      const candidateParticipant = (meeting.meeting_participants || []).find(
        (p: any) => p.role === 'candidate' || p.role === 'guest'
      );

      if (!candidateParticipant) return null;

      // Get optimal slots avoiding the original time
      const originalHour = meeting.scheduled_start_time 
        ? new Date(meeting.scheduled_start_time).getHours() 
        : 10;
      const originalDay = meeting.scheduled_start_time 
        ? new Date(meeting.scheduled_start_time).getDay() 
        : 1;

      // Analyze and suggest avoiding similar patterns if no-show
      const suggestion = await analyzeOptimalSlots(
        candidateParticipant.user_id,
        [meeting.host_id],
        60
      );

      if (!suggestion) return null;

      // Filter out similar time slots if it was a no-show
      if (reason === 'no_show') {
        return suggestion.recommendedSlots.filter(slot => {
          const slotHour = parseInt(slot.slot.split(':')[0]);
          const slotDay = new Date(slot.date).getDay();
          // Avoid same day of week and same hour
          return !(slotDay === originalDay && Math.abs(slotHour - originalHour) <= 1);
        });
      }

      return suggestion.recommendedSlots;
    } catch (err) {
      console.error('Reschedule suggestion error:', err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return {
    analyzeOptimalSlots,
    suggestReschedule,
    loading,
    error,
  };
}

// Helper: Calculate timezone compatibility score
function calculateTimezoneScore(hour: number, candidateTz: string): number {
  // Simplified - in production would use proper timezone library
  const europeanTzs = ['Europe/Amsterdam', 'Europe/London', 'Europe/Paris', 'Europe/Berlin'];
  const americanTzs = ['America/New_York', 'America/Los_Angeles', 'America/Chicago'];
  
  if (europeanTzs.some(tz => candidateTz.includes('Europe'))) {
    // European candidate - prefer 9 AM - 6 PM CET
    return hour >= 9 && hour <= 18 ? 0.9 : 0.5;
  }
  
  if (americanTzs.some(tz => candidateTz.includes('America'))) {
    // American candidate - prefer afternoon CET (morning US time)
    return hour >= 14 && hour <= 18 ? 0.9 : 0.6;
  }
  
  // Default - prefer mid-day
  return hour >= 10 && hour <= 16 ? 0.8 : 0.6;
}
