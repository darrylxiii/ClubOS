import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface OptimalOutreach {
  /** 0=Sunday … 6=Saturday */
  dayOfWeek: number;
  /** 0-23 hour of day */
  hour: number;
  /** Human-readable label, e.g. "Tuesday, 10-12 AM" */
  label: string;
  /** Response probability 0-1 for each cell [day][timeBlock] */
  heatmap: number[][];
}

interface SentimentPoint {
  value: number;
  timestamp: string;
}

export interface CRIMetrics {
  engagementScore: number;
  sentimentTrend: SentimentPoint[];
  currentSentiment: number;
  sentimentDirection: 'warming' | 'cooling' | 'stable';
  optimalOutreach: OptimalOutreach;
  isWarmReactivation: boolean;
  lastInteractionDate: string | null;
  isLoading: boolean;
}

/**
 * Aggregates relationship intelligence metrics for a single candidate.
 */
export function useCRIMetrics(candidateId: string | undefined): CRIMetrics {
  const { data, isLoading } = useQuery({
    queryKey: ['cri-metrics', candidateId],
    enabled: !!candidateId,
    staleTime: 60_000,
    queryFn: async (): Promise<Omit<CRIMetrics, 'isLoading'>> => {
      const defaults: Omit<CRIMetrics, 'isLoading'> = {
        engagementScore: 0,
        sentimentTrend: [],
        currentSentiment: 50,
        sentimentDirection: 'stable',
        optimalOutreach: {
          dayOfWeek: 2,
          hour: 10,
          label: 'Tuesday, 10-12 AM',
          heatmap: Array.from({ length: 7 }, () => Array(4).fill(0)),
        },
        isWarmReactivation: false,
        lastInteractionDate: null,
      };

      if (!candidateId) return defaults;

      try {
        // ── Gather raw data in parallel ───────────────────────────
        const [messagesRes, meetingsRes, scorecardsRes, profileRes, applicationsRes] =
          await Promise.all([
            (supabase as any)
              .from('messages')
              .select('id, created_at, sender_id')
              .or(`sender_id.eq.${candidateId},recipient_id.eq.${candidateId}`)
              .order('created_at', { ascending: false })
              .limit(200),
            (supabase as any)
              .from('meetings')
              .select('id, scheduled_at, status')
              .or(`candidate_id.eq.${candidateId},organizer_id.eq.${candidateId}`)
              .order('scheduled_at', { ascending: false })
              .limit(100),
            (supabase as any)
              .from('candidate_scorecards')
              .select('id, overall_rating, created_at')
              .eq('candidate_id', candidateId)
              .order('created_at', { ascending: true })
              .limit(50),
            (supabase as any)
              .from('profiles')
              .select('id, updated_at')
              .eq('id', candidateId)
              .maybeSingle(),
            (supabase as any)
              .from('applications')
              .select('id, updated_at, status')
              .eq('candidate_id', candidateId)
              .order('updated_at', { ascending: false })
              .limit(20),
          ]);

        const messages = messagesRes.data || [];
        const meetings = meetingsRes.data || [];
        const scorecards = scorecardsRes.data || [];
        const profile = profileRes.data;
        const applications = applicationsRes.data || [];

        // ── Engagement Score (0-100) ──────────────────────────────
        const messageSent = messages.filter(
          (m: any) => m.sender_id === candidateId,
        ).length;
        const messageReceived = messages.length - messageSent;
        const meetingCount = meetings.filter(
          (m: any) => m.status === 'completed' || m.status === 'confirmed',
        ).length;
        const applicationCount = applications.length;

        // Weighted formula: messages (40%), meetings (35%), applications (25%)
        const rawEngagement =
          Math.min(messageSent + messageReceived, 50) * 0.8 + // up to 40 pts
          Math.min(meetingCount, 10) * 3.5 + // up to 35 pts
          Math.min(applicationCount, 5) * 5; // up to 25 pts
        const engagementScore = Math.min(100, Math.round(rawEngagement));

        // ── Sentiment Trend ───────────────────────────────────────
        const sentimentTrend: SentimentPoint[] = scorecards
          .filter((sc: any) => sc.overall_rating != null)
          .map((sc: any) => ({
            value: Math.round((sc.overall_rating / 5) * 100),
            timestamp: sc.created_at,
          }));

        const currentSentiment =
          sentimentTrend.length > 0
            ? sentimentTrend[sentimentTrend.length - 1].value
            : 50;

        let sentimentDirection: 'warming' | 'cooling' | 'stable' = 'stable';
        if (sentimentTrend.length >= 2) {
          const recent = sentimentTrend.slice(-3);
          const first = recent[0].value;
          const last = recent[recent.length - 1].value;
          const delta = last - first;
          if (delta > 10) sentimentDirection = 'warming';
          else if (delta < -10) sentimentDirection = 'cooling';
        }

        // ── Optimal Outreach Timing ───────────────────────────────
        // Analyze when candidate sends messages (proxy for responsiveness)
        const heatmap: number[][] = Array.from({ length: 7 }, () =>
          Array(4).fill(0),
        );
        const candidateMessages = messages.filter(
          (m: any) => m.sender_id === candidateId,
        );

        for (const m of candidateMessages) {
          const d = new Date(m.created_at);
          const day = d.getDay(); // 0=Sun
          const hour = d.getHours();
          let block: number;
          if (hour < 9) block = 0; // Morning (6-9)
          else if (hour < 12) block = 1; // Midday (9-12)
          else if (hour < 17) block = 2; // Afternoon (12-17)
          else block = 3; // Evening (17+)
          heatmap[day][block]++;
        }

        // Normalize to 0-1
        const maxVal = Math.max(1, ...heatmap.flat());
        const normalizedHeatmap = heatmap.map((row) =>
          row.map((v) => Math.round((v / maxVal) * 100) / 100),
        );

        // Find best cell
        let bestDay = 2;
        let bestBlock = 1;
        let bestScore = 0;
        for (let d = 0; d < 7; d++) {
          for (let b = 0; b < 4; b++) {
            if (normalizedHeatmap[d][b] > bestScore) {
              bestScore = normalizedHeatmap[d][b];
              bestDay = d;
              bestBlock = b;
            }
          }
        }

        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const blockLabels = ['6-9 AM', '10-12 AM', '12-5 PM', '5-9 PM'];
        const bestHour = [7, 10, 14, 18][bestBlock];

        const optimalOutreach: OptimalOutreach = {
          dayOfWeek: bestDay,
          hour: bestHour,
          label: `${dayNames[bestDay]}, ${blockLabels[bestBlock]}`,
          heatmap: normalizedHeatmap,
        };

        // ── Warm Reactivation ─────────────────────────────────────
        // True if: no messages/meetings in 30+ days BUT profile updated recently
        const allTimestamps = [
          ...messages.map((m: any) => m.created_at),
          ...meetings.map((m: any) => m.scheduled_at),
        ];
        const lastInteractionDate =
          allTimestamps.length > 0
            ? allTimestamps.sort(
                (a: string, b: string) =>
                  new Date(b).getTime() - new Date(a).getTime(),
              )[0]
            : null;

        const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
        const isInactive =
          !lastInteractionDate ||
          new Date(lastInteractionDate).getTime() < thirtyDaysAgo;

        const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        const profileRecentlyUpdated =
          profile?.updated_at &&
          new Date(profile.updated_at).getTime() > sevenDaysAgo;

        const isWarmReactivation = isInactive && !!profileRecentlyUpdated;

        return {
          engagementScore,
          sentimentTrend,
          currentSentiment,
          sentimentDirection,
          optimalOutreach,
          isWarmReactivation,
          lastInteractionDate,
        };
      } catch (err) {
        console.error('[useCRIMetrics] Error computing metrics:', err);
        return defaults;
      }
    },
  });

  return {
    engagementScore: data?.engagementScore ?? 0,
    sentimentTrend: data?.sentimentTrend ?? [],
    currentSentiment: data?.currentSentiment ?? 50,
    sentimentDirection: data?.sentimentDirection ?? 'stable',
    optimalOutreach: data?.optimalOutreach ?? {
      dayOfWeek: 2,
      hour: 10,
      label: 'Tuesday, 10-12 AM',
      heatmap: Array.from({ length: 7 }, () => Array(4).fill(0)),
    },
    isWarmReactivation: data?.isWarmReactivation ?? false,
    lastInteractionDate: data?.lastInteractionDate ?? null,
    isLoading,
  };
}
