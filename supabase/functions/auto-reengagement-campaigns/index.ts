/**
 * Auto Re-engagement Campaigns Edge Function
 * 
 * Scheduled cron job that automatically identifies at-risk users
 * and sends personalized re-engagement campaigns.
 * 
 * Schedule: Daily at 9 AM UTC
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AtRiskUser {
  user_id: string;
  email: string;
  full_name: string;
  role: string;
  churn_score: number;
  days_inactive: number;
  reengagement_count: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('[Auto Reengagement] Starting automated campaign run');

    // Configuration
    const CHURN_THRESHOLD = 70;
    const MAX_REENGAGEMENT_ATTEMPTS = 3;
    const BATCH_SIZE = 50;
    const RATE_LIMIT_MS = 1000;

    // Get users with low activity
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: trackingData, error: trackingError } = await supabase
      .from('user_activity_tracking')
      .select('user_id, activity_level, last_activity_at, last_login_at')
      .or(`activity_level.eq.inactive,activity_level.eq.low,last_activity_at.lt.${thirtyDaysAgo.toISOString()}`)
      .limit(BATCH_SIZE * 2);

    if (trackingError) throw trackingError;

    if (!trackingData || trackingData.length === 0) {
      console.log('[Auto Reengagement] No at-risk users found');
      return new Response(
        JSON.stringify({ success: true, processed: 0, message: 'No at-risk users' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userIds = trackingData.map(t => t.user_id);

    // Get profiles
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .in('id', userIds);

    // Get roles
    const { data: roles } = await supabase
      .from('user_roles')
      .select('user_id, role')
      .in('user_id', userIds);

    // Get previous reengagement attempts (last 30 days)
    const { data: previousAttempts } = await supabase
      .from('reengagement_history')
      .select('user_id')
      .in('user_id', userIds)
      .gte('sent_at', thirtyDaysAgo.toISOString());

    const attemptCounts: Record<string, number> = {};
    previousAttempts?.forEach(a => {
      attemptCounts[a.user_id] = (attemptCounts[a.user_id] || 0) + 1;
    });

    // Build at-risk user list
    const atRiskUsers: AtRiskUser[] = [];

    trackingData.forEach(tracking => {
      const profile = profiles?.find(p => p.id === tracking.user_id);
      const role = roles?.find(r => r.user_id === tracking.user_id);
      const reengagementCount = attemptCounts[tracking.user_id] || 0;

      if (!profile?.email) return;
      if (reengagementCount >= MAX_REENGAGEMENT_ATTEMPTS) return;

      // Calculate churn score
      const daysInactive = tracking.last_activity_at
        ? Math.floor((Date.now() - new Date(tracking.last_activity_at).getTime()) / (1000 * 60 * 60 * 24))
        : 999;

      let churnScore = 0;
      if (daysInactive > 60) churnScore = 95;
      else if (daysInactive > 30) churnScore = 80;
      else if (daysInactive > 14) churnScore = 60;
      else if (daysInactive > 7) churnScore = 40;
      else churnScore = 20;

      if (tracking.activity_level === 'inactive') churnScore += 15;
      else if (tracking.activity_level === 'low') churnScore += 10;

      churnScore = Math.min(100, churnScore);

      if (churnScore >= CHURN_THRESHOLD) {
        atRiskUsers.push({
          user_id: tracking.user_id,
          email: profile.email,
          full_name: profile.full_name || 'User',
          role: role?.role || 'candidate',
          churn_score: churnScore,
          days_inactive: daysInactive,
          reengagement_count: reengagementCount,
        });
      }
    });

    // Sort by churn score (prioritize highest risk)
    atRiskUsers.sort((a, b) => b.churn_score - a.churn_score);
    const usersToProcess = atRiskUsers.slice(0, BATCH_SIZE);

    console.log(`[Auto Reengagement] Processing ${usersToProcess.length} at-risk users`);

    let successCount = 0;
    let errorCount = 0;

    for (const user of usersToProcess) {
      try {
        // Get personalized template
        const template = getPersonalizedTemplate(user);

        // Send email
        const { error: emailError } = await supabase.functions.invoke('send-notification-email', {
          body: {
            to: user.email,
            subject: template.subject,
            template_name: template.templateId,
            template_data: {
              user_name: user.full_name,
              ...template.data,
            },
            notification_type: 'reengagement',
            user_id: user.user_id,
          },
        });

        if (emailError) {
          console.error(`[Auto Reengagement] Email error for ${user.user_id}:`, emailError);
          errorCount++;
          continue;
        }

        // Log reengagement
        await supabase.from('reengagement_history').insert({
          user_id: user.user_id,
          campaign_type: 'email',
          template_id: template.templateId,
          trigger_reason: `churn_score_${user.churn_score}_days_inactive_${user.days_inactive}`,
          churn_score: user.churn_score,
          metadata: {
            role: user.role,
            days_inactive: user.days_inactive,
            attempt_number: user.reengagement_count + 1,
          },
        });

        successCount++;
        console.log(`[Auto Reengagement] Sent to ${user.email} (churn: ${user.churn_score}%)`);

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_MS));

      } catch (error) {
        console.error(`[Auto Reengagement] Error processing ${user.user_id}:`, error);
        errorCount++;
      }
    }

    console.log(`[Auto Reengagement] Complete: ${successCount} sent, ${errorCount} errors`);

    return new Response(
      JSON.stringify({
        success: true,
        at_risk_users_found: atRiskUsers.length,
        processed: usersToProcess.length,
        sent: successCount,
        errors: errorCount,
        run_at: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Auto Reengagement] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function getPersonalizedTemplate(user: AtRiskUser): {
  templateId: string;
  subject: string;
  data: Record<string, any>;
} {
  const appUrl = Deno.env.get('APP_URL') || 'https://app.thequantumclub.io';

  // Candidate templates
  if (user.role === 'candidate') {
    if (user.days_inactive > 30) {
      return {
        templateId: 'reengagement_candidate_dormant',
        subject: `${user.full_name}, exclusive opportunities are waiting`,
        data: {
          headline: 'New roles have been curated just for you',
          body: `We've noticed you haven't been active lately. Since your last visit, we've added ${Math.floor(Math.random() * 20) + 5} new positions that match your profile.`,
          cta_text: 'Explore Opportunities',
          cta_url: `${appUrl}/jobs`,
          offer: user.reengagement_count === 0 ? 'Priority placement on your next application' : null,
        },
      };
    }
    return {
      templateId: 'reengagement_candidate_gentle',
      subject: `${user.full_name}, your profile is getting noticed`,
      data: {
        headline: 'Partners are viewing your profile',
        body: 'Your profile is generating interest. Complete any missing sections to increase your visibility.',
        cta_text: 'Update Profile',
        cta_url: `${appUrl}/profile`,
      },
    };
  }

  // Partner templates
  if (user.role === 'partner') {
    return {
      templateId: 'reengagement_partner',
      subject: `${user.full_name}, your hiring pipeline needs attention`,
      data: {
        headline: 'Top candidates are ready for review',
        body: 'New AI-matched candidates have been added to your pipeline. Some have been waiting for over a week.',
        cta_text: 'Review Pipeline',
        cta_url: `${appUrl}/applications`,
        urgency: user.days_inactive > 14 ? 'Candidates may accept other offers soon' : null,
      },
    };
  }

  // Strategist/Admin templates
  if (user.role === 'strategist' || user.role === 'admin') {
    return {
      templateId: 'reengagement_strategist',
      subject: `${user.full_name}, platform activity update`,
      data: {
        headline: 'Your dashboard awaits',
        body: 'New matches and activities require your attention.',
        cta_text: 'View Dashboard',
        cta_url: `${appUrl}/admin`,
      },
    };
  }

  // Generic fallback
  return {
    templateId: 'reengagement_generic',
    subject: `We miss you at The Quantum Club, ${user.full_name}`,
    data: {
      headline: 'Come back and see what\'s new',
      body: 'The platform has been busy while you were away. Log in to catch up.',
      cta_text: 'Return to Platform',
      cta_url: `${appUrl}/home`,
    },
  };
}
