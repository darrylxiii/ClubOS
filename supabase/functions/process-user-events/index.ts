import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';
import { publicCorsHeaders as corsHeaders } from "../_shared/cors-config.ts";

interface EventBatch {
  events: Array<{
    user_id: string;
    session_id: string;
    event_type: string;
    page_path: string;
    metadata?: Record<string, any>;
  }>;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { events } = await req.json() as EventBatch;

    if (!events || !Array.isArray(events)) {
      throw new Error('Invalid event batch format');
    }

    // Process events in parallel
    const results = await Promise.allSettled([
      updateEngagementScores(supabase, events),
      detectFrustrationPatterns(supabase, events),
      updatePartnerMetrics(supabase, events),
      detectChurnSignals(supabase, events),
    ]);

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    return new Response(
      JSON.stringify({ 
        success: true, 
        processed: events.length,
        operations: { successful, failed }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error processing events:', error);
    return new Response(
      JSON.stringify({ error: error?.message || 'Unknown error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

async function updateEngagementScores(supabase: any, events: any[]) {
  const userEvents = events.reduce((acc, event) => {
    if (!acc[event.user_id]) acc[event.user_id] = [];
    acc[event.user_id].push(event);
    return acc;
  }, {} as Record<string, any[]>);

  for (const [userId, userEventList] of Object.entries(userEvents)) {
    const score = calculateEngagementScore(userEventList as any[]);
    
    await supabase.rpc('calculate_user_engagement_score', {
      p_user_id: userId,
      p_score: score
    });
  }
}

function calculateEngagementScore(events: any[]): number {
  let score = 0;
  
  const clickEvents = events.filter(e => e.event_type === 'click').length;
  const scrollEvents = events.filter(e => e.event_type === 'scroll').length;
  const timeOnPage = events.reduce((sum, e) => sum + (e.metadata?.time_on_page || 0), 0);
  
  score += Math.min(clickEvents * 2, 30);
  score += Math.min(scrollEvents, 20);
  score += Math.min(timeOnPage / 60, 50);
  
  return Math.min(score, 100);
}

async function detectFrustrationPatterns(supabase: any, events: any[]) {
  const frustrationEvents = events.filter(e => 
    e.event_type === 'rage_click' || 
    e.event_type === 'error' ||
    e.event_type === 'dead_click'
  );

  if (frustrationEvents.length > 0) {
    const patterns = frustrationEvents.reduce((acc, event) => {
      const key = `${event.page_path}-${event.metadata?.element_id || 'unknown'}`;
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
    }, {} as Record<string, any>);

    await supabase
      .from('user_frustration_signals')
      .insert(Object.values(patterns));
  }
}

async function updatePartnerMetrics(supabase: any, events: any[]) {
  const { data: partners } = await supabase
    .from('profiles')
    .select('id')
    .eq('role', 'partner')
    .in('id', [...new Set(events.map(e => e.user_id))]);

  if (!partners || partners.length === 0) return;

  const partnerIds = new Set(partners.map((p: any) => p.id));
  const partnerEvents = events.filter(e => partnerIds.has(e.user_id));

  const metricsMap = new Map<string, any>();
  
  partnerEvents.forEach(event => {
    const date = new Date(event.metadata?.timestamp || Date.now()).toISOString().split('T')[0];
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
      metrics.total_session_time_minutes += event.metadata.time_on_page / 60;
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

async function detectChurnSignals(supabase: any, events: any[]) {
  const userIds = [...new Set(events.map(e => e.user_id))];
  
  for (const userId of userIds) {
    await supabase.rpc('detect_churn_risk', { p_user_id: userId });
  }
}
