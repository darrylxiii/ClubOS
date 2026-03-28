import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface UnifiedTimelineEntry {
  id: string;
  type: 'message' | 'email' | 'meeting' | 'stage_change' | 'scorecard';
  title: string;
  description: string;
  timestamp: string;
  sentiment?: number | null;
  metadata: Record<string, unknown>;
}

/**
 * Merges ALL interaction sources for a candidate into a single chronological feed.
 * Sources: messages, emails, meetings, application stage changes, scorecard submissions.
 */
export function useUnifiedCandidateTimeline(candidateId: string | undefined) {
  const { data: timeline = [], isLoading } = useQuery({
    queryKey: ['unified-candidate-timeline', candidateId],
    enabled: !!candidateId,
    staleTime: 30_000,
    queryFn: async (): Promise<UnifiedTimelineEntry[]> => {
      if (!candidateId) return [];
      const entries: UnifiedTimelineEntry[] = [];

      try {
        // ── Messages ──────────────────────────────────────────────
        const { data: messages } = await (supabase as any)
          .from('messages')
          .select('id, content, sender_id, created_at, metadata')
          .or(`sender_id.eq.${candidateId},recipient_id.eq.${candidateId}`)
          .order('created_at', { ascending: false })
          .limit(50);

        for (const m of messages || []) {
          const direction = m.sender_id === candidateId ? 'outbound' : 'inbound';
          entries.push({
            id: `msg-${m.id}`,
            type: 'message',
            title: direction === 'outbound' ? 'Candidate sent a message' : 'Message sent to candidate',
            description: (m.content || '').slice(0, 120),
            timestamp: m.created_at,
            sentiment: m.metadata?.sentiment_score ?? null,
            metadata: { direction, sender_id: m.sender_id },
          });
        }

        // ── Emails ────────────────────────────────────────────────
        const { data: emails } = await (supabase as any)
          .from('emails')
          .select('id, subject, body_preview, direction, sentiment_score, created_at')
          .eq('candidate_id', candidateId)
          .order('created_at', { ascending: false })
          .limit(50);

        for (const e of emails || []) {
          entries.push({
            id: `email-${e.id}`,
            type: 'email',
            title: e.subject || 'Email',
            description: (e.body_preview || '').slice(0, 120),
            timestamp: e.created_at,
            sentiment: e.sentiment_score ?? null,
            metadata: { direction: e.direction },
          });
        }

        // ── Meetings ──────────────────────────────────────────────
        const { data: meetings } = await (supabase as any)
          .from('meetings')
          .select('id, title, scheduled_at, status, meeting_type')
          .or(`candidate_id.eq.${candidateId},organizer_id.eq.${candidateId}`)
          .order('scheduled_at', { ascending: false })
          .limit(30);

        for (const mt of meetings || []) {
          entries.push({
            id: `mtg-${mt.id}`,
            type: 'meeting',
            title: mt.title || 'Meeting',
            description: `${mt.meeting_type || 'Interview'} - ${mt.status || 'scheduled'}`,
            timestamp: mt.scheduled_at,
            sentiment: null,
            metadata: { status: mt.status, meeting_type: mt.meeting_type },
          });
        }

        // ── Application stage changes ─────────────────────────────
        const { data: applications } = await (supabase as any)
          .from('applications')
          .select('id, status, current_stage, updated_at, created_at, job_id')
          .eq('candidate_id', candidateId)
          .order('updated_at', { ascending: false })
          .limit(20);

        for (const app of applications || []) {
          entries.push({
            id: `stage-${app.id}`,
            type: 'stage_change',
            title: `Application status: ${app.status || 'updated'}`,
            description: app.current_stage
              ? `Current stage: ${app.current_stage}`
              : 'Application updated',
            timestamp: app.updated_at || app.created_at,
            sentiment: null,
            metadata: { job_id: app.job_id, status: app.status, stage: app.current_stage },
          });
        }

        // ── Scorecard submissions ─────────────────────────────────
        const { data: scorecards } = await (supabase as any)
          .from('candidate_scorecards')
          .select('id, overall_rating, recommendation, created_at, evaluator_id')
          .eq('candidate_id', candidateId)
          .order('created_at', { ascending: false })
          .limit(20);

        for (const sc of scorecards || []) {
          const ratingLabel = sc.overall_rating != null ? `Rating: ${sc.overall_rating}/5` : '';
          entries.push({
            id: `sc-${sc.id}`,
            type: 'scorecard',
            title: 'Scorecard submitted',
            description: [ratingLabel, sc.recommendation].filter(Boolean).join(' - '),
            timestamp: sc.created_at,
            sentiment: sc.overall_rating != null ? (sc.overall_rating / 5) * 100 : null,
            metadata: {
              overall_rating: sc.overall_rating,
              recommendation: sc.recommendation,
              evaluator_id: sc.evaluator_id,
            },
          });
        }
      } catch (err) {
        console.error('[useUnifiedCandidateTimeline] Error fetching timeline:', err);
        return [];
      }

      // Sort all entries by timestamp descending
      entries.sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      );

      return entries;
    },
  });

  return { timeline, isLoading };
}
