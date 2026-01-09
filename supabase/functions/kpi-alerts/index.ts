import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AlertConfig {
  id: string;
  kpi_name: string;
  domain: string;
  warning_threshold: number | null;
  critical_threshold: number | null;
  is_lower_better: boolean;
  notification_channels: string[];
  is_active: boolean;
}

interface KPIValue {
  kpi_name: string;
  value: number;
  category: string;
  domain?: string;
  updated_at?: string;
}

interface DetectedAnomaly {
  kpi_name: string;
  domain: string;
  current_value: number;
  threshold_value: number;
  severity: 'warning' | 'critical';
  message: string;
  detected_at: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { check_stale = true, notify = true } = await req.json().catch(() => ({}));
    
    const anomalies: DetectedAnomaly[] = [];
    const now = new Date();

    // Get active alert configurations
    const { data: alertConfigs } = await supabase
      .from('kpi_alert_configs')
      .select('*')
      .eq('is_active', true);

    if (!alertConfigs || alertConfigs.length === 0) {
      console.log('[KPI Alerts] No active alert configurations found');
    }

    // Fetch latest KPI values from all tables
    const [operationsKPIs, salesKPIs, webKPIs] = await Promise.all([
      supabase.from('kpi_metrics').select('*').order('created_at', { ascending: false }).limit(100),
      supabase.from('sales_kpi_metrics').select('*').order('created_at', { ascending: false }).limit(100),
      supabase.from('web_kpi_metrics').select('*').order('updated_at', { ascending: false }).limit(100),
    ]);

    // Map KPIs by name for easy lookup
    const kpiValues = new Map<string, KPIValue>();
    
    operationsKPIs.data?.forEach(kpi => {
      if (!kpiValues.has(kpi.kpi_name)) {
        kpiValues.set(kpi.kpi_name, { 
          ...kpi, 
          domain: 'operations',
          updated_at: kpi.created_at 
        });
      }
    });
    
    salesKPIs.data?.forEach(kpi => {
      if (!kpiValues.has(kpi.kpi_name)) {
        kpiValues.set(kpi.kpi_name, { 
          ...kpi, 
          domain: 'sales',
          updated_at: kpi.calculated_at || kpi.created_at 
        });
      }
    });
    
    webKPIs.data?.forEach(kpi => {
      if (!kpiValues.has(kpi.kpi_name)) {
        kpiValues.set(kpi.kpi_name, { 
          ...kpi, 
          domain: 'website',
          updated_at: kpi.updated_at 
        });
      }
    });

    // Check each alert config against current values
    for (const config of alertConfigs || []) {
      const kpiValue = kpiValues.get(config.kpi_name);
      if (!kpiValue) continue;

      const value = kpiValue.value;
      const isLowerBetter = config.is_lower_better;

      // Check critical threshold
      if (config.critical_threshold !== null) {
        const isCritical = isLowerBetter 
          ? value > config.critical_threshold
          : value < config.critical_threshold;

        if (isCritical) {
          anomalies.push({
            kpi_name: config.kpi_name,
            domain: config.domain || kpiValue.domain || 'unknown',
            current_value: value,
            threshold_value: config.critical_threshold,
            severity: 'critical',
            message: `${config.kpi_name} is at ${value}, ${isLowerBetter ? 'above' : 'below'} critical threshold of ${config.critical_threshold}`,
            detected_at: now.toISOString(),
          });
          continue; // Skip warning check if already critical
        }
      }

      // Check warning threshold
      if (config.warning_threshold !== null) {
        const isWarning = isLowerBetter
          ? value > config.warning_threshold
          : value < config.warning_threshold;

        if (isWarning) {
          anomalies.push({
            kpi_name: config.kpi_name,
            domain: config.domain || kpiValue.domain || 'unknown',
            current_value: value,
            threshold_value: config.warning_threshold,
            severity: 'warning',
            message: `${config.kpi_name} is at ${value}, ${isLowerBetter ? 'above' : 'below'} warning threshold of ${config.warning_threshold}`,
            detected_at: now.toISOString(),
          });
        }
      }
    }

    // Check for stale KPIs (no update in 24+ hours)
    if (check_stale) {
      const staleThreshold = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      
      for (const [name, kpi] of kpiValues) {
        if (kpi.updated_at) {
          const lastUpdate = new Date(kpi.updated_at);
          if (lastUpdate < staleThreshold) {
            const hoursStale = Math.round((now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60));
            anomalies.push({
              kpi_name: name,
              domain: kpi.domain || 'unknown',
              current_value: kpi.value,
              threshold_value: 24,
              severity: hoursStale > 48 ? 'critical' : 'warning',
              message: `${name} has not been updated in ${hoursStale} hours`,
              detected_at: now.toISOString(),
            });
          }
        }
      }
    }

    // Store detected anomalies
    if (anomalies.length > 0) {
      const anomalyRecords = anomalies.map(a => ({
        kpi_name: a.kpi_name,
        category: a.domain,
        anomaly_type: a.severity === 'critical' ? 'threshold_breach' : 'warning',
        severity: a.severity,
        description: a.message,
        current_value: a.current_value,
        expected_range: JSON.stringify({ threshold: a.threshold_value }),
        detected_at: a.detected_at,
        status: 'open',
      }));

      await supabase
        .from('detected_anomalies')
        .insert(anomalyRecords);

      console.log(`[KPI Alerts] Detected ${anomalies.length} anomalies`);
    }

    // Create notifications for critical alerts if notify is enabled
    if (notify && anomalies.filter(a => a.severity === 'critical').length > 0) {
      // Get admin users to notify
      const { data: admins } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'admin')
        .limit(10);

      if (admins && admins.length > 0) {
        const criticalAlerts = anomalies.filter(a => a.severity === 'critical');
        
        const notifications = admins.flatMap(admin => 
          criticalAlerts.map(alert => ({
            user_id: admin.id,
            title: `Critical KPI Alert: ${alert.kpi_name}`,
            message: alert.message,
            type: 'kpi_alert',
            action_url: '/admin/kpi-command-center',
            metadata: { kpi_name: alert.kpi_name, domain: alert.domain, severity: alert.severity },
          }))
        );

        await supabase
          .from('notifications')
          .insert(notifications);

        console.log(`[KPI Alerts] Created ${notifications.length} notifications`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        anomalies_detected: anomalies.length,
        critical_count: anomalies.filter(a => a.severity === 'critical').length,
        warning_count: anomalies.filter(a => a.severity === 'warning').length,
        anomalies,
        checked_at: now.toISOString(),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[KPI Alerts] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
