import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AutoResponseRule {
  enabled: boolean;
  threshold: number;
  block_duration_minutes: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    console.log('[auto-respond-threats] Starting automated threat response...');

    // Get configuration
    const { data: configs } = await supabase
      .from('security_config')
      .select('config_key, config_value');

    const getConfig = (key: string): AutoResponseRule | null => {
      const config = configs?.find(c => c.config_key === key);
      return config?.config_value as AutoResponseRule | null;
    };

    const getWhitelist = (): string[] => {
      const config = configs?.find(c => c.config_key === 'ip_whitelist');
      return (config?.config_value as { ips: string[] })?.ips || [];
    };

    const whitelist = getWhitelist();
    const bruteForceConfig = getConfig('auto_block_brute_force');
    const credentialStuffingConfig = getConfig('auto_block_credential_stuffing');
    const enumerationConfig = getConfig('auto_block_enumeration');

    let blockedCount = 0;
    const actions: string[] = [];

    // 1. Auto-block for brute force (if enabled)
    if (bruteForceConfig?.enabled) {
      const { data: bruteForceThreats } = await supabase
        .from('threat_events')
        .select('ip_address, attack_details')
        .eq('event_type', 'brute_force')
        .eq('is_resolved', false)
        .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString());

      for (const threat of bruteForceThreats || []) {
        if (!threat.ip_address || whitelist.includes(threat.ip_address)) continue;

        const attempts = (threat.attack_details as any)?.attempts || 0;
        if (attempts >= bruteForceConfig.threshold) {
          const { error } = await supabase
            .from('blocked_ips')
            .upsert({
              ip_address: threat.ip_address,
              block_type: 'auto_brute_force',
              reason: `Auto-blocked: ${attempts} brute force attempts`,
              expires_at: new Date(Date.now() + bruteForceConfig.block_duration_minutes * 60 * 1000).toISOString(),
              is_active: true,
              metadata: { auto_response: true, attempts, config: 'auto_block_brute_force' }
            }, { onConflict: 'ip_address' });

          if (!error) {
            blockedCount++;
            actions.push(`Blocked ${threat.ip_address} for brute force (${attempts} attempts)`);
          }
        }
      }
    }

    // 2. Auto-block for enumeration (if enabled)
    if (enumerationConfig?.enabled) {
      const { data: enumThreats } = await supabase
        .from('threat_events')
        .select('ip_address, attack_details')
        .eq('event_type', 'enumeration')
        .eq('is_resolved', false)
        .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString());

      for (const threat of enumThreats || []) {
        if (!threat.ip_address || whitelist.includes(threat.ip_address)) continue;

        const attempts = (threat.attack_details as any)?.unique_emails_checked || 0;
        if (attempts >= enumerationConfig.threshold) {
          const { error } = await supabase
            .from('blocked_ips')
            .upsert({
              ip_address: threat.ip_address,
              block_type: 'auto_enumeration',
              reason: `Auto-blocked: ${attempts} enumeration attempts`,
              expires_at: new Date(Date.now() + enumerationConfig.block_duration_minutes * 60 * 1000).toISOString(),
              is_active: true,
              metadata: { auto_response: true, attempts, config: 'auto_block_enumeration' }
            }, { onConflict: 'ip_address' });

          if (!error) {
            blockedCount++;
            actions.push(`Blocked ${threat.ip_address} for enumeration (${attempts} emails checked)`);
          }
        }
      }
    }

    // 3. Auto-resolve expired threats (older than 24 hours and not critical)
    const { data: resolvedCount } = await supabase
      .from('threat_events')
      .update({ 
        is_resolved: true, 
        resolved_at: new Date().toISOString(),
        resolution_notes: 'Auto-resolved: Threat aged out after 24 hours'
      })
      .eq('is_resolved', false)
      .neq('severity', 'critical')
      .lt('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .select('id');

    const autoResolvedCount = resolvedCount?.length || 0;
    if (autoResolvedCount > 0) {
      actions.push(`Auto-resolved ${autoResolvedCount} aged threats`);
    }

    // 4. Escalate critical threats that haven't been addressed
    const { data: criticalThreats } = await supabase
      .from('threat_events')
      .select('id, event_type, ip_address, created_at, attack_details')
      .eq('severity', 'critical')
      .eq('is_resolved', false)
      .lt('created_at', new Date(Date.now() - 15 * 60 * 1000).toISOString()); // 15 min old

    // Check if critical alerts are enabled
    const alertConfig = configs?.find(c => c.config_key === 'alert_on_critical');
    const alertEnabled = (alertConfig?.config_value as { enabled: boolean; email: string })?.enabled;

    if (criticalThreats && criticalThreats.length > 0) {
      actions.push(`⚠️ ${criticalThreats.length} critical threats require immediate attention`);
      
      // Auto-block any critical threat IPs immediately
      for (const threat of criticalThreats) {
        if (!threat.ip_address || whitelist.includes(threat.ip_address)) continue;

        await supabase
          .from('blocked_ips')
          .upsert({
            ip_address: threat.ip_address,
            block_type: 'auto_suspicious',
            reason: `Auto-blocked: Unresolved critical ${threat.event_type} threat`,
            expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
            is_active: true,
            metadata: { auto_response: true, threat_id: threat.id, escalated: true }
          }, { onConflict: 'ip_address' });
        
        blockedCount++;
      }

      // Send email alerts for critical threats if enabled
      if (alertEnabled) {
        for (const threat of criticalThreats) {
          try {
            const alertResponse = await fetch(
              `${Deno.env.get('SUPABASE_URL')}/functions/v1/send-security-alert`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
                },
                body: JSON.stringify({
                  threat_type: threat.event_type,
                  severity: 'critical',
                  ip_address: threat.ip_address,
                  details: `Critical ${threat.event_type} detected from IP ${threat.ip_address}. Attack details: ${JSON.stringify(threat.attack_details || {})}`,
                  actions_taken: ['IP auto-blocked for 24 hours', 'Threat escalated for review'],
                  threat_id: threat.id
                })
              }
            );
            
            if (alertResponse.ok) {
              actions.push(`📧 Alert email sent for critical threat from ${threat.ip_address}`);
            }
          } catch (alertError) {
            console.error('[auto-respond-threats] Failed to send alert:', alertError);
          }
        }
      }
    }

    console.log(`[auto-respond-threats] Complete: ${blockedCount} IPs blocked, ${autoResolvedCount} threats resolved`);

    return new Response(
      JSON.stringify({
        success: true,
        blocked_count: blockedCount,
        auto_resolved_count: autoResolvedCount,
        critical_pending: criticalThreats?.length || 0,
        actions,
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[auto-respond-threats] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Auto-response failed', details: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
