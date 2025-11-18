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
  tier_results?: Record<string, { verified: number; total: number; duration_ms: number }>;
}

interface TableTier {
  name: string;
  tables: string[];
  severity: 'critical' | 'high' | 'medium' | 'low';
}

// Organized critical tables by business tier
const TABLE_TIERS: TableTier[] = [
  {
    name: 'Core User Data',
    severity: 'critical',
    tables: [
      'profiles', 'candidate_profiles', 'user_roles', 'user_preferences',
      'applications', 'candidate_documents', 'profile_experience',
      'candidate_notes', 'target_companies', 'career_context_snapshots',
      'user_quantum_achievements', 'quantum_achievements', 'club_objectives',
      'password_reset_tokens', 'email_verifications', 'phone_verifications',
      'verification_attempts'
    ]
  },
  {
    name: 'Business Operations',
    severity: 'critical',
    tables: [
      'companies', 'company_members', 'company_stakeholders', 'jobs',
      'job_team_assignments', 'job_tools', 'bookings', 'booking_links',
      'meetings', 'meeting_participants', 'subscriptions', 'waitlist',
      'invite_codes', 'api_keys', 'tasks', 'unified_tasks'
    ]
  },
  {
    name: 'Communication & Engagement',
    severity: 'high',
    tables: [
      'messages', 'conversations', 'conversation_participants',
      'emails', 'email_templates', 'notifications', 'posts', 'stories'
    ]
  },
  {
    name: 'AI & Matching',
    severity: 'high',
    tables: [
      'match_scores', 'ai_conversations', 'ai_session_scores',
      'assessment_results', 'detected_interviews', 'tools_and_skills'
    ]
  },
  {
    name: 'Compliance & Audit',
    severity: 'medium',
    tables: [
      'role_change_audit', 'pipeline_audit_logs', 'security_logs',
      'error_logs', 'user_activity_tracking', 'candidate_profile_views',
      'company_interactions', 'candidate_interactions'
    ]
  },
  {
    name: 'DR Infrastructure',
    severity: 'low',
    tables: [
      'backup_verification_logs', 'platform_alerts', 'pitr_test_logs',
      'region_health_checks', 'incident_logs', 'backup_policies',
      'data_integrity_checks'
    ]
  }
];

async function verifyTableBatch(
  supabase: any,
  tables: string[],
  tierName: string
): Promise<{ verified: number; issues: string[] }> {
  const results = await Promise.all(
    tables.map(async (table) => {
      try {
        const { count, error } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true });

        if (error) {
          console.error(`[Backup Verification] ❌ [${tierName}] ${table}:`, error.message);
          return { success: false, issue: `Table ${table}: ${error.message}` };
        } else if (count === null) {
          console.error(`[Backup Verification] ⚠️ [${tierName}] ${table}: Unable to verify row count`);
          return { success: false, issue: `Table ${table}: Unable to verify row count` };
        } else {
          console.log(`[Backup Verification] ✓ [${tierName}] ${table}: ${count} rows`);
          return { success: true, issue: null };
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        console.error(`[Backup Verification] ❌ [${tierName}] ${table}:`, errorMessage);
        return { success: false, issue: `Table ${table}: ${errorMessage}` };
      }
    })
  );

  const verified = results.filter(r => r.success).length;
  const issues = results.filter(r => !r.success).map(r => r.issue!);

  return { verified, issues };
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

    const totalTables = TABLE_TIERS.reduce((acc, tier) => acc + tier.tables.length, 0);
    console.log(`[Backup Verification] Starting verification of ${totalTables} tables across ${TABLE_TIERS.length} tiers`);

    const startTime = Date.now();
    const allIssues: string[] = [];
    let totalSuccessful = 0;
    const tierResults: Record<string, { verified: number; total: number; duration_ms: number }> = {};

    // Process each tier in parallel batches
    for (const tier of TABLE_TIERS) {
      const tierStart = Date.now();
      console.log(`[Backup Verification] Processing tier: ${tier.name} (${tier.tables.length} tables, severity: ${tier.severity})`);

      // Split tier tables into batches of 10 for parallel processing
      const batchSize = 10;
      const batches: string[][] = [];
      for (let i = 0; i < tier.tables.length; i += batchSize) {
        batches.push(tier.tables.slice(i, i + batchSize));
      }

      let tierVerified = 0;
      const tierIssues: string[] = [];

      // Process batches in parallel
      const batchResults = await Promise.all(
        batches.map(batch => verifyTableBatch(supabaseAdmin, batch, tier.name))
      );

      batchResults.forEach(result => {
        tierVerified += result.verified;
        tierIssues.push(...result.issues);
      });

      const tierDuration = Date.now() - tierStart;
      tierResults[tier.name] = {
        verified: tierVerified,
        total: tier.tables.length,
        duration_ms: tierDuration
      };

      totalSuccessful += tierVerified;
      allIssues.push(...tierIssues);

      const tierSuccessRate = ((tierVerified / tier.tables.length) * 100).toFixed(1);
      console.log(`[Backup Verification] ${tier.name}: ${tierVerified}/${tier.tables.length} verified (${tierSuccessRate}%) in ${tierDuration}ms`);

      // Tier-specific alerting
      if (tier.severity === 'critical' && tierVerified < tier.tables.length) {
        console.error(`[Backup Verification] 🚨 CRITICAL: ${tier.name} has failures!`);
      } else if (tierIssues.length >= 3) {
        console.warn(`[Backup Verification] ⚠️ WARNING: ${tier.name} has ${tierIssues.length} failures`);
      }
    }

    const duration = Date.now() - startTime;

    const result: BackupVerificationResult = {
      timestamp: new Date().toISOString(),
      backup_id: `verify_${Date.now()}`,
      verification_status: 
        totalSuccessful === totalTables ? 'success' :
        totalSuccessful > 0 ? 'partial' : 'failed',
      tables_verified: totalSuccessful,
      total_tables: totalTables,
      verification_duration_ms: duration,
      issues: allIssues,
      tier_results: tierResults
    };

    console.log('[Backup Verification] Overall Result:', result.verification_status);
    console.log('[Backup Verification] Total Duration:', duration, 'ms');
    console.log('[Backup Verification] Tables verified:', totalSuccessful, '/', totalTables);
    console.log('[Backup Verification] Success rate:', ((totalSuccessful / totalTables) * 100).toFixed(1), '%');

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

    // Enhanced tier-based alerting
    if (result.verification_status !== 'success') {
      let severity: 'info' | 'warning' | 'error' | 'critical' = 'warning';
      let alertMessage = `Backup verification ${result.verification_status}: ${result.tables_verified}/${result.total_tables} tables verified`;

      // Check for critical tier failures
      const criticalTierFailures = TABLE_TIERS
        .filter(t => t.severity === 'critical')
        .some(t => tierResults[t.name].verified < tierResults[t.name].total);

      if (criticalTierFailures || result.verification_status === 'failed') {
        severity = 'critical';
        alertMessage = `🚨 CRITICAL: Backup verification failed for critical tier tables`;
      }

      const { error: alertError } = await supabaseAdmin
        .from('platform_alerts')
        .insert({
          alert_type: 'backup_verification_failed',
          severity,
          message: alertMessage,
          metadata: {
            backup_id: result.backup_id,
            issues: result.issues,
            verification_duration_ms: result.verification_duration_ms,
            tier_results: tierResults
          }
        });

      if (alertError) {
        console.error('[Backup Verification] Failed to create alert:', alertError);
      } else {
        console.log(`[Backup Verification] Alert created with severity: ${severity}`);
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
