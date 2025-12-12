import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const instantlyApiKey = Deno.env.get('INSTANTLY_API_KEY');
    const supabase = createClient(supabaseUrl, supabaseKey);

    if (!instantlyApiKey) {
      return new Response(JSON.stringify({ error: 'Instantly API key not configured' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch accounts from Instantly
    const accountsResponse = await fetch('https://api.instantly.ai/api/v2/accounts', {
      headers: {
        'Authorization': `Bearer ${instantlyApiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!accountsResponse.ok) {
      console.error('Instantly accounts fetch failed:', accountsResponse.status);
      return new Response(JSON.stringify({ error: 'Failed to fetch Instantly accounts' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const accountsData = await accountsResponse.json();
    const accounts = accountsData.data || accountsData || [];

    const results = [];

    for (const account of accounts) {
      // Calculate health score based on metrics
      const healthScore = calculateHealthScore(account);
      const alerts = generateAlerts(account, healthScore);

      const healthData = {
        email: account.email,
        health_score: healthScore,
        warmup_status: account.warmup_status || account.status || 'unknown',
        warmup_progress: account.warmup_progress || 0,
        inbox_placement_rate: account.inbox_placement_rate || 95,
        spam_rate: account.spam_rate || 0,
        bounce_rate: account.bounce_rate || 0,
        daily_limit: account.daily_limit || 50,
        emails_sent_today: account.emails_sent_today || 0,
        domain: account.email?.split('@')[1] || null,
        is_connected: account.status !== 'disconnected',
        last_checked_at: new Date().toISOString(),
        alerts: alerts,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('instantly_account_health')
        .upsert(healthData, { onConflict: 'email' })
        .select()
        .single();

      if (!error && data) {
        results.push(data);
      }
    }

    // Generate insights if health issues detected
    const lowHealthAccounts = results.filter(r => r.health_score < 70);
    if (lowHealthAccounts.length > 0) {
      await supabase.from('crm_outreach_insights').insert({
        insight_type: 'account_health',
        insight_title: `${lowHealthAccounts.length} Email Account(s) Need Attention`,
        insight_content: `The following accounts have health scores below 70%: ${lowHealthAccounts.map(a => a.email).join(', ')}. This may impact deliverability.`,
        recommendations: [
          'Review warmup settings for affected accounts',
          'Check for bounced emails and remove invalid addresses',
          'Consider pausing campaigns on accounts with high spam rates',
        ],
        severity: lowHealthAccounts.some(a => a.health_score < 50) ? 'critical' : 'warning',
        affected_campaigns: [],
      });
    }

    return new Response(JSON.stringify({ 
      success: true, 
      accounts: results,
      count: results.length,
      lowHealthCount: lowHealthAccounts.length,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Account health sync error:', error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function calculateHealthScore(account: any): number {
  let score = 100;

  // Deduct for high spam rate
  const spamRate = account.spam_rate || 0;
  if (spamRate > 5) score -= 30;
  else if (spamRate > 2) score -= 15;
  else if (spamRate > 1) score -= 5;

  // Deduct for high bounce rate
  const bounceRate = account.bounce_rate || 0;
  if (bounceRate > 10) score -= 25;
  else if (bounceRate > 5) score -= 15;
  else if (bounceRate > 2) score -= 5;

  // Deduct for low inbox placement
  const inboxRate = account.inbox_placement_rate || 100;
  if (inboxRate < 70) score -= 30;
  else if (inboxRate < 85) score -= 15;
  else if (inboxRate < 95) score -= 5;

  // Deduct if not warmed up
  if (account.warmup_status === 'not_started') score -= 20;
  else if (account.warmup_status === 'in_progress') score -= 10;

  // Deduct if disconnected
  if (account.status === 'disconnected') score -= 50;

  return Math.max(0, Math.min(100, score));
}

function generateAlerts(account: any, healthScore: number): any[] {
  const alerts = [];

  if (healthScore < 50) {
    alerts.push({
      type: 'critical',
      message: 'Account health is critical - consider pausing sends',
      timestamp: new Date().toISOString(),
    });
  }

  if (account.spam_rate > 2) {
    alerts.push({
      type: 'warning',
      message: `High spam rate detected: ${account.spam_rate}%`,
      timestamp: new Date().toISOString(),
    });
  }

  if (account.bounce_rate > 5) {
    alerts.push({
      type: 'warning',
      message: `High bounce rate: ${account.bounce_rate}%`,
      timestamp: new Date().toISOString(),
    });
  }

  if (account.status === 'disconnected') {
    alerts.push({
      type: 'critical',
      message: 'Account disconnected - reconnection required',
      timestamp: new Date().toISOString(),
    });
  }

  return alerts;
}
