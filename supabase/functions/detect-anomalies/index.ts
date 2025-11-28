import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AnomalyDetectionResult {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  affectedUsers: number;
  description: string;
  data: any;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Starting anomaly detection scan...');

    const anomalies: AnomalyDetectionResult[] = [];

    // Detection 1: Frustration Signal Spike
    const frustrationAnomaly = await detectFrustrationSpike(supabase);
    if (frustrationAnomaly) anomalies.push(frustrationAnomaly);

    // Detection 2: Login Drop
    const loginAnomaly = await detectLoginDrop(supabase);
    if (loginAnomaly) anomalies.push(loginAnomaly);

    // Detection 3: Application Abandonment
    const abandonmentAnomaly = await detectApplicationAbandonment(supabase);
    if (abandonmentAnomaly) anomalies.push(abandonmentAnomaly);

    // Detection 4: Performance Issues
    const performanceAnomaly = await detectPerformanceIssues(supabase);
    if (performanceAnomaly) anomalies.push(performanceAnomaly);

    console.log(`Detected ${anomalies.length} anomalies`);

    // Store anomalies in database
    for (const anomaly of anomalies) {
      const { error } = await supabase.from('detected_anomalies').insert({
        anomaly_type: anomaly.type,
        severity: anomaly.severity,
        affected_users: anomaly.affectedUsers,
        detection_data: {
          description: anomaly.description,
          ...anomaly.data,
        },
        alert_sent: false,
      });

      if (error) {
        console.error('Error storing anomaly:', error);
      }
    }

    // Send alerts for high/critical anomalies
    const criticalAnomalies = anomalies.filter(a => 
      a.severity === 'high' || a.severity === 'critical'
    );

    if (criticalAnomalies.length > 0) {
      await sendAnomalyAlerts(supabase, criticalAnomalies);
    }

    return new Response(
      JSON.stringify({
        success: true,
        anomaliesDetected: anomalies.length,
        criticalAnomalies: criticalAnomalies.length,
        anomalies: anomalies,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in detect-anomalies:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function detectFrustrationSpike(supabase: any): Promise<AnomalyDetectionResult | null> {
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  // Get frustration signals from last hour
  const { data: recentSignals } = await supabase
    .from('user_frustration_signals')
    .select('*')
    .gte('created_at', oneHourAgo.toISOString());

  // Get baseline from last 24 hours
  const { data: baselineSignals } = await supabase
    .from('user_frustration_signals')
    .select('*')
    .gte('created_at', oneDayAgo.toISOString())
    .lt('created_at', oneHourAgo.toISOString());

  if (!recentSignals || !baselineSignals) return null;

  const recentRate = recentSignals.length;
  const baselineRate = baselineSignals.length / 23; // Average per hour over 23 hours
  const zScore = (recentRate - baselineRate) / Math.sqrt(baselineRate);

  if (zScore > 2.5) {
    const uniqueUsers = new Set(recentSignals.map((s: any) => s.user_id)).size;
    return {
      type: 'frustration_spike',
      severity: zScore > 4 ? 'critical' : 'high',
      affectedUsers: uniqueUsers,
      description: `Frustration signals spiked ${Math.round(zScore * 100)}% above normal in the last hour`,
      data: {
        recentCount: recentRate,
        baselineAverage: Math.round(baselineRate),
        zScore: Math.round(zScore * 100) / 100,
        topSignals: getTopSignalTypes(recentSignals),
      },
    };
  }

  return null;
}

async function detectLoginDrop(supabase: any): Promise<AnomalyDetectionResult | null> {
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  // Get logins from last hour
  const { data: recentLogins } = await supabase
    .from('user_session_events')
    .select('user_id')
    .eq('event_type', 'login')
    .gte('created_at', oneHourAgo.toISOString());

  // Get baseline logins
  const { data: baselineLogins } = await supabase
    .from('user_session_events')
    .select('user_id')
    .eq('event_type', 'login')
    .gte('created_at', oneDayAgo.toISOString())
    .lt('created_at', oneHourAgo.toISOString());

  if (!recentLogins || !baselineLogins) return null;

  const recentCount = recentLogins.length;
  const baselineAvg = baselineLogins.length / 23;
  const dropPercent = ((baselineAvg - recentCount) / baselineAvg) * 100;

  if (dropPercent > 40) {
    return {
      type: 'login_drop',
      severity: dropPercent > 60 ? 'critical' : 'high',
      affectedUsers: Math.round(baselineAvg - recentCount),
      description: `Login rate dropped ${Math.round(dropPercent)}% below normal`,
      data: {
        recentCount,
        baselineAverage: Math.round(baselineAvg),
        dropPercent: Math.round(dropPercent),
      },
    };
  }

  return null;
}

async function detectApplicationAbandonment(supabase: any): Promise<AnomalyDetectionResult | null> {
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

  // Get application starts vs completions
  const { data: events } = await supabase
    .from('user_session_events')
    .select('event_type, event_data')
    .in('event_type', ['application_started', 'application_submitted'])
    .gte('created_at', oneHourAgo.toISOString());

  if (!events) return null;

  const starts = events.filter((e: any) => e.event_type === 'application_started').length;
  const completions = events.filter((e: any) => e.event_type === 'application_submitted').length;

  if (starts > 10) {
    const completionRate = (completions / starts) * 100;
    
    if (completionRate < 30) {
      return {
        type: 'application_abandonment',
        severity: completionRate < 15 ? 'high' : 'medium',
        affectedUsers: starts - completions,
        description: `${Math.round(100 - completionRate)}% of applications abandoned in last hour`,
        data: {
          applicationsStarted: starts,
          applicationsCompleted: completions,
          abandonmentRate: Math.round(100 - completionRate),
        },
      };
    }
  }

  return null;
}

async function detectPerformanceIssues(supabase: any): Promise<AnomalyDetectionResult | null> {
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

  // Get page load times
  const { data: pageAnalytics } = await supabase
    .from('user_page_analytics')
    .select('load_time_ms')
    .gte('entry_time', oneHourAgo.toISOString())
    .not('load_time_ms', 'is', null);

  if (!pageAnalytics || pageAnalytics.length < 10) return null;

  const loadTimes = pageAnalytics.map((p: any) => p.load_time_ms);
  const avgLoadTime = loadTimes.reduce((a: number, b: number) => a + b, 0) / loadTimes.length;

  if (avgLoadTime > 3000) {
    const slowPages = pageAnalytics.filter((p: any) => p.load_time_ms > 5000).length;
    return {
      type: 'performance_issue',
      severity: avgLoadTime > 5000 ? 'high' : 'medium',
      affectedUsers: slowPages,
      description: `Average page load time: ${Math.round(avgLoadTime)}ms (${slowPages} pages >5s)`,
      data: {
        averageLoadTime: Math.round(avgLoadTime),
        slowPageCount: slowPages,
        totalSamples: loadTimes.length,
      },
    };
  }

  return null;
}

function getTopSignalTypes(signals: any[]): Record<string, number> {
  const counts: Record<string, number> = {};
  signals.forEach((s: any) => {
    const type = s.signal_type || 'unknown';
    counts[type] = (counts[type] || 0) + 1;
  });
  return Object.entries(counts)
    .sort(([, a], [, b]) => (b as number) - (a as number))
    .slice(0, 3)
    .reduce((obj, [key, val]) => ({ ...obj, [key]: val }), {});
}

async function sendAnomalyAlerts(supabase: any, anomalies: AnomalyDetectionResult[]) {
  console.log(`Sending alerts for ${anomalies.length} critical anomalies`);
  
  // Get admin alert preferences
  const { data: admins } = await supabase
    .from('admin_alert_preferences')
    .select('admin_id, notification_channels')
    .eq('is_active', true);

  if (!admins || admins.length === 0) {
    console.log('No active alert preferences found');
    return;
  }

  // Mark anomalies as alerted
  const anomalyTypes = anomalies.map(a => a.type);
  await supabase
    .from('detected_anomalies')
    .update({ alert_sent: true })
    .in('anomaly_type', anomalyTypes)
    .is('alert_sent', false);

  console.log('Anomaly alerts sent successfully');
}