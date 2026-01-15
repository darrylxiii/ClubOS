import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { publicCorsHeaders, handleCorsPreFlight, jsonResponse } from '../_shared/cors-config.ts';

interface AnomalyResult {
  kpi_name: string;
  domain: string;
  current_value: number;
  expected_value: number;
  z_score: number;
  percentile_rank: number;
  anomaly_type: 'spike' | 'drop' | 'trend_break';
  severity: 'warning' | 'critical';
}

interface RequestBody {
  date?: string; // ISO date string, defaults to today
  z_score_threshold?: number; // Default 2.0
  notify_admins?: boolean; // Whether to create notifications
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return handleCorsPreFlight(publicCorsHeaders);
  }

  const requestId = crypto.randomUUID().slice(0, 8);
  console.log(`[${requestId}] detect-kpi-anomalies: Starting anomaly detection`);

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse request body
    let body: RequestBody = {};
    try {
      body = await req.json();
    } catch {
      // Empty body is fine
    }

    const targetDate = body.date || new Date().toISOString().split('T')[0];
    const zScoreThreshold = body.z_score_threshold || 2.0;
    const notifyAdmins = body.notify_admins !== false;

    console.log(`[${requestId}] Detecting anomalies for date: ${targetDate}, threshold: ${zScoreThreshold}`);

    // Step 1: Detect anomalies using the database function
    const { data: anomalies, error: detectError } = await supabase.rpc(
      'detect_kpi_anomalies',
      {
        p_date: targetDate,
        p_zscore_threshold: zScoreThreshold,
        p_min_data_points: 7,
      }
    );

    if (detectError) {
      console.error(`[${requestId}] Error detecting anomalies:`, detectError);
      // Try fallback: calculate anomalies manually
      const fallbackAnomalies = await detectAnomaliesFallback(supabase, targetDate, zScoreThreshold);
      if (fallbackAnomalies.length === 0) {
        return jsonResponse({
          success: true,
          message: 'No anomalies detected (fallback method)',
          date: targetDate,
          anomalies: [],
          count: 0,
        });
      }
    }

    const detectedAnomalies: AnomalyResult[] = anomalies || [];
    console.log(`[${requestId}] Detected ${detectedAnomalies.length} anomalies`);

    // Step 2: Store anomalies in detected_anomalies table
    if (detectedAnomalies.length > 0) {
      const anomalyRecords = detectedAnomalies.map((a) => ({
        kpi_name: a.kpi_name,
        category: a.domain,
        anomaly_type: a.anomaly_type,
        severity: a.severity,
        description: `${a.kpi_name} is ${a.anomaly_type === 'spike' ? 'unusually high' : 'unusually low'} (z-score: ${a.z_score.toFixed(2)})`,
        current_value: a.current_value,
        expected_range: {
          expected: a.expected_value,
          z_score: a.z_score,
          percentile: a.percentile_rank,
        },
        detected_at: new Date().toISOString(),
        status: 'open',
      }));

      const { error: insertError } = await supabase
        .from('detected_anomalies')
        .upsert(anomalyRecords, {
          onConflict: 'kpi_name,detected_at',
          ignoreDuplicates: true,
        });

      if (insertError) {
        console.warn(`[${requestId}] Error storing anomalies:`, insertError);
      }
    }

    // Step 3: Update kpi_daily_snapshots with anomaly flags
    for (const anomaly of detectedAnomalies) {
      await supabase
        .from('kpi_daily_snapshots')
        .update({
          is_anomaly: true,
          anomaly_type: anomaly.anomaly_type,
          z_score: anomaly.z_score,
        })
        .eq('snapshot_date', targetDate)
        .eq('kpi_name', anomaly.kpi_name)
        .eq('domain', anomaly.domain);
    }

    // Step 4: Create notifications for critical anomalies
    if (notifyAdmins && detectedAnomalies.some((a) => a.severity === 'critical')) {
      const criticalAnomalies = detectedAnomalies.filter((a) => a.severity === 'critical');

      // Get admin users
      const { data: adminUsers } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'admin');

      if (adminUsers && adminUsers.length > 0) {
        const notifications = adminUsers.flatMap((admin) =>
          criticalAnomalies.map((anomaly) => ({
            user_id: admin.id,
            type: 'kpi_alert',
            title: `Critical KPI Anomaly: ${anomaly.kpi_name}`,
            message: `${anomaly.kpi_name} detected ${anomaly.anomaly_type} (z-score: ${anomaly.z_score.toFixed(2)})`,
            priority: 'high',
            action_url: '/admin/kpi-command-center',
            metadata: {
              kpi_name: anomaly.kpi_name,
              domain: anomaly.domain,
              severity: anomaly.severity,
              z_score: anomaly.z_score,
            },
          }))
        );

        await supabase.from('notifications').insert(notifications);
        console.log(`[${requestId}] Created ${notifications.length} notifications`);
      }
    }

    // Step 5: Update statistics on snapshots
    await supabase.rpc('update_kpi_snapshot_statistics', { p_date: targetDate });

    return jsonResponse({
      success: true,
      date: targetDate,
      threshold: zScoreThreshold,
      anomalies: detectedAnomalies,
      count: detectedAnomalies.length,
      critical_count: detectedAnomalies.filter((a) => a.severity === 'critical').length,
      warning_count: detectedAnomalies.filter((a) => a.severity === 'warning').length,
      processed_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error(`[${requestId}] Error in detect-kpi-anomalies:`, error);
    return jsonResponse(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

// Fallback anomaly detection if RPC function doesn't exist
async function detectAnomaliesFallback(
  supabase: ReturnType<typeof createClient>,
  date: string,
  threshold: number
): Promise<AnomalyResult[]> {
  const anomalies: AnomalyResult[] = [];

  // Get today's snapshots
  const { data: todaySnapshots } = await supabase
    .from('kpi_daily_snapshots')
    .select('*')
    .eq('snapshot_date', date);

  if (!todaySnapshots || todaySnapshots.length === 0) {
    return anomalies;
  }

  // For each KPI, calculate statistics from historical data
  for (const snapshot of todaySnapshots) {
    // Get historical data for this KPI
    const thirtyDaysAgo = new Date(date);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: history } = await supabase
      .from('kpi_daily_snapshots')
      .select('value')
      .eq('kpi_name', snapshot.kpi_name)
      .eq('domain', snapshot.domain)
      .gte('snapshot_date', thirtyDaysAgo.toISOString().split('T')[0])
      .lt('snapshot_date', date);

    if (!history || history.length < 7) continue;

    // Calculate mean and std dev
    const values = history.map((h) => h.value);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);

    if (stdDev === 0) continue;

    const zScore = (snapshot.value - mean) / stdDev;

    if (Math.abs(zScore) > threshold) {
      // Calculate percentile
      const belowCount = values.filter((v) => v < snapshot.value).length;
      const percentile = (belowCount / values.length) * 100;

      anomalies.push({
        kpi_name: snapshot.kpi_name,
        domain: snapshot.domain,
        current_value: snapshot.value,
        expected_value: mean,
        z_score: zScore,
        percentile_rank: percentile,
        anomaly_type: zScore > 0 ? 'spike' : 'drop',
        severity: Math.abs(zScore) > 3 ? 'critical' : 'warning',
      });
    }
  }

  return anomalies;
}
