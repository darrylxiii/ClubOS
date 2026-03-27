import { createHandler } from '../_shared/handler.ts';
import { SupabaseClient } from 'npm:@supabase/supabase-js@2';

interface UserEvent {
  user_id: string;
  session_id: string;
  event_type: string;
  page_path: string;
  metadata?: Record<string, unknown>;
}

interface EventBatch {
  events: UserEvent[];
}

Deno.serve(createHandler(async (req, ctx) => {
  const { events } = await req.json() as EventBatch;

  if (!events || !Array.isArray(events)) {
    throw new Error('Invalid event batch format');
  }

  // Process events in parallel
  const results = await Promise.allSettled([
    updateEngagementScores(ctx.supabase, events),
    detectFrustrationPatterns(ctx.supabase, events),
    updatePartnerMetrics(ctx.supabase, events),
    detectChurnSignals(ctx.supabase, events),
  ]);

  const successful = results.filter(r => r.status === 'fulfilled').length;
  const failed = results.filter(r => r.status === 'rejected').length;

  return new Response(
    JSON.stringify({
      success: true,
      processed: events.length,
      operations: { successful, failed }
    }),
    { headers: { ...ctx.corsHeaders, 'Content-Type': 'application/json' } }
  );
}));

async function updateEngagementScores(supabase: SupabaseClient, events: UserEvent[]) {
  const userEvents = events.reduce((acc, event) => {
    if (!acc[event.user_id]) acc[event.user_id] = [];
    acc[event.user_id].push(event);
    return acc;
  }, {} as Record<string, UserEvent[]>);

  for (const [userId, userEventList] of Object.entries(userEvents)) {
    const score = calculateEngagementScore(userEventList);

    await supabase.rpc('calculate_user_engagement_score', {
      p_user_id: userId,
      p_score: score
    });
  }
}

function calculateEngagementScore(events: UserEvent[]): number {
  let score = 0;

  const clickEvents = events.filter(e => e.event_type === 'click').length;
  const scrollEvents = events.filter(e => e.event_type === 'scroll').length;
  const timeOnPage = events.reduce((sum, e) => sum + ((e.metadata?.time_on_page as number) || 0), 0);

  score += Math.min(clickEvents * 2, 30);
  score += Math.min(scrollEvents, 20);
  score += Math.min(timeOnPage / 60, 50);

  return Math.min(score, 100);
}

async function detectFrustrationPatterns(supabase: SupabaseClient, events: UserEvent[]) {
  const frustrationEvents = events.filter(e =>
    e.event_type === 'rage_click' ||
    e.event_type === 'error' ||
    e.event_type === 'dead_click'
  );

  if (frustrationEvents.length > 0) {
    const patterns = frustrationEvents.reduce((acc, event) => {
      const key = `${event.page_path}-${(event.metadata?.element_id as string) || 'unknown'}`;
      if (!acc[key]) {
        acc[key] = {
          user_id: event.user_id,
          session_id: event.session_id,
          page_path: event.page_path,
          signal_type: event.event_type,
          element_info: event.metadata,
          count: 0
        };
      }
      acc[key].count++;
      return acc;
    }, {} as Record<string, { user_id: string; session_id: string; page_path: string; signal_type: string; element_info?: Record<string, unknown>; count: number }>);

    await supabase
      .from('user_frustration_signals')
      .insert(Object.values(patterns));
  }
}

async function updatePartnerMetrics(supabase: SupabaseClient, events: UserEvent[]) {
  const { data: partners } = await supabase
    .from('profiles')
    .select('id')
    .eq('role', 'partner')
    .in('id', [...new Set(events.map(e => e.user_id))]);

  if (!partners || partners.length === 0) return;

  const partnerIds = new Set(partners.map((p) => p.id));
  const partnerEvents = events.filter(e => partnerIds.has(e.user_id));

  const metricsMap = new Map<string, { partner_id: string; date: string; total_logins: number; total_session_time_minutes: number; candidates_viewed: number; engagement_score: number }>();

  partnerEvents.forEach(event => {
    const date = new Date((event.metadata?.timestamp as string | number) || Date.now()).toISOString().split('T')[0];
    const key = `${event.user_id}-${date}`;

    if (!metricsMap.has(key)) {
      metricsMap.set(key, {
        partner_id: event.user_id,
        date,
        total_logins: 0,
        total_session_time_minutes: 0,
        candidates_viewed: 0,
        engagement_score: 0,
      });
    }

    const metrics = metricsMap.get(key);

    if (event.event_type === 'page_entry' && event.page_path === '/') {
      metrics.total_logins++;
    }

    if (event.metadata?.time_on_page) {
      metrics.total_session_time_minutes += (event.metadata.time_on_page as number) / 60;
    }

    if (event.page_path?.includes('/candidates/')) {
      metrics.candidates_viewed++;
    }
  });

  for (const metrics of metricsMap.values()) {
    await supabase
      .from('partner_engagement_metrics')
      .upsert(metrics, { onConflict: 'partner_id,date' });
  }
}

async function detectChurnSignals(supabase: SupabaseClient, events: UserEvent[]) {
  const userIds = [...new Set(events.map(e => e.user_id))];

  for (const userId of userIds) {
    await supabase.rpc('detect_churn_risk', { p_user_id: userId });
  }
}
