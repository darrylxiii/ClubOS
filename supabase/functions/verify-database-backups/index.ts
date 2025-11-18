import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BackupVerificationResult {
  timestamp: string;
  backup_id: string;
  verification_status: 'success' | 'failed' | 'partial';
  tables_verified: number;
  total_tables: number;
  verification_duration_ms: number;
  issues: string[];
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Critical tables to verify
    const criticalTables = [
      'profiles',
      'user_roles',
      'candidate_profiles',
      'applications',
      'jobs',
      'bookings',
      'subscriptions',
      'companies',
      'meetings',
      'match_scores',
      'messages',
      'conversations'
    ];

    const startTime = Date.now();
    const issues: string[] = [];
    let successfulVerifications = 0;

    console.log('[Backup Verification] Starting verification of', criticalTables.length, 'tables');

    // Verify each critical table
    for (const table of criticalTables) {
      try {
        const { count, error } = await supabaseAdmin
          .from(table)
          .select('*', { count: 'exact', head: true });

        if (error) {
          issues.push(`Table ${table}: ${error.message}`);
          console.error(`[Backup Verification] ❌ Table ${table}:`, error.message);
        } else if (count === null) {
          issues.push(`Table ${table}: Unable to verify row count`);
          console.error(`[Backup Verification] ⚠️ Table ${table}: Unable to verify row count`);
        } else {
          successfulVerifications++;
          console.log(`[Backup Verification] ✓ Table ${table}: ${count} rows`);
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        issues.push(`Table ${table}: ${errorMessage}`);
        console.error(`[Backup Verification] ❌ Table ${table}:`, errorMessage);
      }
    }

    const duration = Date.now() - startTime;

    const result: BackupVerificationResult = {
      timestamp: new Date().toISOString(),
      backup_id: `verify_${Date.now()}`,
      verification_status: 
        successfulVerifications === criticalTables.length ? 'success' :
        successfulVerifications > 0 ? 'partial' : 'failed',
      tables_verified: successfulVerifications,
      total_tables: criticalTables.length,
      verification_duration_ms: duration,
      issues
    };

    console.log('[Backup Verification] Result:', result.verification_status);
    console.log('[Backup Verification] Duration:', duration, 'ms');
    console.log('[Backup Verification] Tables verified:', successfulVerifications, '/', criticalTables.length);

    // Log to backup_verification_logs table
    const { error: logError } = await supabaseAdmin
      .from('backup_verification_logs')
      .insert({
        timestamp: result.timestamp,
        backup_id: result.backup_id,
        verification_status: result.verification_status,
        tables_verified: result.tables_verified,
        total_tables: result.total_tables,
        verification_duration_ms: result.verification_duration_ms,
        issues: result.issues
      });

    if (logError) {
      console.error('[Backup Verification] Failed to log result:', logError);
    }

    // Alert if verification failed
    if (result.verification_status !== 'success') {
      const { error: alertError } = await supabaseAdmin
        .from('platform_alerts')
        .insert({
          alert_type: 'backup_verification_failed',
          severity: result.verification_status === 'failed' ? 'critical' : 'warning',
          message: `Backup verification ${result.verification_status}: ${result.tables_verified}/${result.total_tables} tables verified`,
          metadata: {
            backup_id: result.backup_id,
            issues: result.issues,
            verification_duration_ms: result.verification_duration_ms
          }
        });

      if (alertError) {
        console.error('[Backup Verification] Failed to create alert:', alertError);
      } else {
        console.log('[Backup Verification] Alert created for verification failure');
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        result
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('[Backup Verification] Fatal error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
