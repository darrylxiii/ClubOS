import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

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
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Aggregating market intelligence...');

    const insights = [];

    // Salary benchmarks by role/level
    const { data: salaryData } = await supabase
      .from('candidate_profiles')
      .select('current_title, seniority_level, current_compensation_amount, current_compensation_currency, location')
      .not('current_compensation_amount', 'is', null);

    if (salaryData && salaryData.length > 0) {
      const salaryByRole: Record<string, number[]> = {};
      
      salaryData.forEach(profile => {
        const key = `${profile.current_title}_${profile.seniority_level}_${profile.current_compensation_currency}`;
        if (!salaryByRole[key]) salaryByRole[key] = [];
        salaryByRole[key].push(profile.current_compensation_amount);
      });

      for (const [key, salaries] of Object.entries(salaryByRole)) {
        if (salaries.length < 3) continue; // Need minimum sample size

        const [title, level, currency] = key.split('_');
        const sorted = salaries.sort((a, b) => a - b);
        const median = sorted[Math.floor(sorted.length / 2)];
        const p25 = sorted[Math.floor(sorted.length * 0.25)];
        const p75 = sorted[Math.floor(sorted.length * 0.75)];

        await supabase.from('market_intelligence').insert({
          metric_type: 'salary_benchmark',
          metric_category: 'compensation',
          metric_value: {
            title,
            level,
            currency,
            median,
            p25,
            p75,
            avg: salaries.reduce((a, b) => a + b, 0) / salaries.length
          },
          time_period: 'current',
          sample_size: salaries.length,
          confidence_score: Math.min(1, salaries.length / 20),
          valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        });

        insights.push({ type: 'salary_benchmark', key, sample_size: salaries.length });
      }
    }

    // Skill demand trends from jobs
    const { data: jobData } = await supabase
      .from('jobs')
      .select('required_skills, title, department, created_at')
      .gte('created_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString());

    if (jobData && jobData.length > 0) {
      const skillDemand: Record<string, number> = {};
      
      jobData.forEach(job => {
        if (job.required_skills) {
          job.required_skills.forEach((skill: string) => {
            skillDemand[skill] = (skillDemand[skill] || 0) + 1;
          });
        }
      });

      const topSkills = Object.entries(skillDemand)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 50);

      await supabase.from('market_intelligence').insert({
        metric_type: 'skill_demand',
        metric_category: 'market_trends',
        metric_value: {
          top_skills: topSkills.map(([skill, count]) => ({ skill, demand_count: count })),
          total_jobs_analyzed: jobData.length
        },
        time_period: 'last_90_days',
        sample_size: jobData.length,
        confidence_score: Math.min(1, jobData.length / 50),
        valid_until: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      });

      insights.push({ type: 'skill_demand', skills_tracked: topSkills.length });
    }

    // Time-to-hire benchmarks
    const { data: hiredApps } = await supabase
      .from('applications')
      .select('applied_at, created_at, stages')
      .eq('status', 'hired')
      .gte('created_at', new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString());

    if (hiredApps && hiredApps.length > 3) {
      const hireTimes = hiredApps
        .map(app => {
          const hiredStage = (app.stages as any[])?.find(s => s.stage === 'Hired');
          if (!hiredStage) return null;
          return (new Date(hiredStage.date).getTime() - new Date(app.applied_at).getTime()) / (1000 * 60 * 60 * 24);
        })
        .filter(t => t !== null) as number[];

      if (hireTimes.length > 0) {
        const sorted = hireTimes.sort((a, b) => a - b);
        const median = sorted[Math.floor(sorted.length / 2)];
        const avg = hireTimes.reduce((a, b) => a + b, 0) / hireTimes.length;

        await supabase.from('market_intelligence').insert({
          metric_type: 'time_to_hire',
          metric_category: 'hiring_velocity',
          metric_value: {
            median_days: median,
            avg_days: avg,
            min_days: Math.min(...hireTimes),
            max_days: Math.max(...hireTimes)
          },
          time_period: 'last_180_days',
          sample_size: hireTimes.length,
          confidence_score: Math.min(1, hireTimes.length / 30),
          valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        });

        insights.push({ type: 'time_to_hire', sample_size: hireTimes.length });
      }
    }

    console.log(`Generated ${insights.length} market intelligence insights`);

    return new Response(
      JSON.stringify({
        insights_generated: insights.length,
        insights
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in aggregate-market-intelligence:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
