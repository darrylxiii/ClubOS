import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get auth header
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    
    // Verify user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    // Get user role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const role = profile?.role || 'candidate';

    let insights: any[] = [];

    if (role === 'candidate') {
      // Generate candidate insights
      insights = await generateCandidateInsights(supabase, user.id);
    } else if (role === 'partner') {
      // Generate partner insights
      insights = await generatePartnerInsights(supabase, user.id, profile);
    } else if (role === 'admin') {
      // Generate admin insights
      insights = await generateAdminInsights(supabase);
    }

    // Store insights
    if (insights.length > 0) {
      await supabase.from('analytics_insights').insert(
        insights.map(insight => ({
          user_id: user.id,
          insight_type: insight.type,
          insight_text: insight.text,
          confidence_score: insight.confidence,
          metadata: insight.metadata,
        }))
      );
    }

    return new Response(
      JSON.stringify({ success: true, insights }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error generating analytics:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function generateCandidateInsights(supabase: any, userId: string) {
  const insights = [];

  // Get profile views trend
  const { data: candidateProfile } = await supabase
    .from('candidate_profiles')
    .select('id')
    .eq('user_id', userId)
    .single();

  if (candidateProfile) {
    const { data: recentViews } = await supabase
      .from('candidate_engagement_events')
      .select('created_at, companies(name)')
      .eq('candidate_id', candidateProfile.id)
      .eq('event_type', 'profile_view')
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

    if (recentViews && recentViews.length > 0) {
      const uniqueCompanies = new Set(recentViews.map((v: any) => v.companies?.name)).size;
      insights.push({
        type: 'profile_engagement',
        text: `Your profile received ${recentViews.length} views from ${uniqueCompanies} companies this week`,
        confidence: 0.95,
        metadata: { views: recentViews.length, companies: uniqueCompanies },
      });
    }
  }

  // Get application trends
  const { data: recentApps } = await supabase
    .from('applications')
    .select('status, created_at')
    .eq('user_id', userId)
    .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

  if (recentApps && recentApps.length > 0) {
    const interviewStage = recentApps.filter((a: any) => ['interview', 'final'].includes(a.status)).length;
    if (interviewStage > 0) {
      insights.push({
        type: 'application_progress',
        text: `${interviewStage} of your applications progressed to interview stage this month`,
        confidence: 0.9,
        metadata: { interview_count: interviewStage, total: recentApps.length },
      });
    }
  }

  return insights;
}

async function generatePartnerInsights(supabase: any, userId: string, profile: any) {
  const insights = [];

  // Get company jobs performance
  const { data: jobs } = await supabase
    .from('jobs')
    .select('id, title')
    .eq('company_id', profile.company_id);

  if (jobs && jobs.length > 0) {
    const jobIds = jobs.map((j: any) => j.id);
    const { data: applications } = await supabase
      .from('applications')
      .select('status, created_at')
      .in('job_id', jobIds)
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

    if (applications) {
      const hires = applications.filter((a: any) => a.status === 'hired').length;
      const total = applications.length;
      const conversionRate = total > 0 ? Math.round((hires / total) * 100) : 0;

      insights.push({
        type: 'hiring_performance',
        text: `Your team achieved a ${conversionRate}% hire rate this month (${hires} hires from ${total} applications)`,
        confidence: 0.92,
        metadata: { hires, total, rate: conversionRate },
      });
    }
  }

  return insights;
}

async function generateAdminInsights(supabase: any) {
  const insights = [];

  // Platform-wide metrics
  const { count: activeUsers } = await supabase
    .from('user_activity_events')
    .select('user_id', { count: 'exact', head: true })
    .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

  if (activeUsers) {
    insights.push({
      type: 'platform_health',
      text: `${activeUsers} active users on the platform in the last 24 hours`,
      confidence: 0.98,
      metadata: { active_users: activeUsers },
    });
  }

  return insights;
}
