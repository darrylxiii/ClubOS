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

    const { companyId } = await req.json();

    // Fetch all active jobs
    let jobsQuery = supabase
      .from('jobs')
      .select('*, companies(name)')
      .eq('status', 'published');

    if (companyId) {
      jobsQuery = jobsQuery.eq('company_id', companyId);
    }

    const { data: jobs, error: jobsError } = await jobsQuery;
    if (jobsError) throw jobsError;

    const jobIds = jobs?.map(j => j.id) || [];

    // Fetch applications across all jobs
    const { data: applications } = await supabase
      .from('applications')
      .select('*, candidate_profiles(full_name)')
      .in('job_id', jobIds.length > 0 ? jobIds : ['none']);

    // Fetch interviews/bookings
    const { data: interviews } = await supabase
      .from('bookings')
      .select('*')
      .or('is_interview_booking.eq.true,job_id.not.is.null')
      .gte('scheduled_start', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

    // Fetch historical hires (closed jobs)
    const { data: historicalHires } = await supabase
      .from('jobs')
      .select('*')
      .eq('status', 'closed');

    // Fetch continuous pipeline data
    const { data: continuousJobs } = await supabase
      .from('jobs')
      .select('*, continuous_pipeline_hires(*)')
      .eq('is_continuous', true);

    // Calculate metrics
    const totalActiveJobs = jobs?.length || 0;
    const totalApplications = applications?.length || 0;
    const totalInterviews = interviews?.length || 0;
    const standardJobs = jobs?.filter(j => !j.is_continuous) || [];
    const continuousPipelines = continuousJobs || [];

    // Calculate stage distribution
    const stageDistribution: Record<string, number> = {};
    applications?.forEach(app => {
      const stage = app.status || 'unknown';
      stageDistribution[stage] = (stageDistribution[stage] || 0) + 1;
    });

    // Calculate avg match score
    const appsWithScores = applications?.filter(a => a.match_score != null) || [];
    const avgMatchScore = appsWithScores.length > 0
      ? appsWithScores.reduce((sum, a) => sum + (a.match_score || 0), 0) / appsWithScores.length
      : 0;

    // Identify bottlenecks
    const bottlenecks: string[] = [];
    const patterns: string[] = [];
    const concerns: string[] = [];

    // Check for common issues
    const jobsWithFewCandidates = jobs?.filter(j => {
      const appCount = applications?.filter(a => a.job_id === j.id).length || 0;
      return appCount < 3;
    }) || [];

    if (jobsWithFewCandidates.length > totalActiveJobs * 0.5) {
      bottlenecks.push(`${jobsWithFewCandidates.length}/${totalActiveJobs} jobs have fewer than 3 candidates`);
    }

    // Check interview scheduling
    const jobsWithNoInterviews = jobs?.filter(j => {
      const interviewCount = interviews?.filter(i => i.job_id === j.id).length || 0;
      const appCount = applications?.filter(a => a.job_id === j.id).length || 0;
      return appCount > 3 && interviewCount === 0;
    }) || [];

    if (jobsWithNoInterviews.length > 0) {
      bottlenecks.push(`${jobsWithNoInterviews.length} roles have candidates but no scheduled interviews`);
    }

    // Identify patterns
    if (stageDistribution['screening'] > totalApplications * 0.4) {
      patterns.push('High accumulation in screening stage - consider faster review cycles');
    }
    if (avgMatchScore > 70) {
      patterns.push('Strong candidate quality across pipelines');
    }

    // Calculate health scores per job
    const jobHealthScores = jobs?.map(job => {
      const appCount = applications?.filter(a => a.job_id === job.id).length || 0;
      const interviewCount = interviews?.filter(i => i.job_id === job.id).length || 0;
      let score = 0;
      if (appCount > 10) score += 40;
      else if (appCount > 5) score += 30;
      else if (appCount > 0) score += 20;
      if (interviewCount > 0) score += 30;
      if (avgMatchScore > 60) score += 30;
      return { jobId: job.id, title: job.title, score: Math.min(score, 100), appCount };
    }) || [];

    const avgHealthScore = jobHealthScores.length > 0
      ? Math.round(jobHealthScores.reduce((sum, j) => sum + j.score, 0) / jobHealthScores.length)
      : 0;

    // Find top performer
    const topPerformer = jobHealthScores.sort((a, b) => b.score - a.score)[0];

    // Calculate predicted hires
    const conversionRate = historicalHires?.length && totalApplications > 0
      ? historicalHires.length / totalApplications
      : 0.15;

    const predictedHires30Days = Math.ceil(totalApplications * conversionRate * 0.5);
    const predictedHires90Days = Math.ceil(totalApplications * conversionRate);

    // Generate AI-powered insights using Lovable AI
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    let aiInsights = null;

    if (LOVABLE_API_KEY) {
      try {
        const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              {
                role: 'system',
                content: `You are an expert hiring intelligence analyst. Analyze the provided hiring data and generate strategic insights. Return a JSON object with:
                - executiveSummary: string (2-3 sentences)
                - strategicRecommendations: array of { priority: "critical"|"high"|"medium", insight: string, impact: string }
                - improvementOpportunities: array of { area: string, currentState: string, recommendation: string, potentialGain: string }
                - riskFactors: array of strings
                - healthTrend: "improving"|"stable"|"declining"`
              },
              {
                role: 'user',
                content: JSON.stringify({
                  totalActiveJobs,
                  totalApplications,
                  totalInterviews,
                  avgMatchScore,
                  stageDistribution,
                  bottlenecks,
                  patterns,
                  jobHealthScores: jobHealthScores.slice(0, 10),
                  continuousPipelines: continuousPipelines.length,
                  historicalHires: historicalHires?.length || 0
                })
              }
            ]
          })
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          const content = aiData.choices?.[0]?.message?.content;
          if (content) {
            try {
              // Try to parse JSON from the response
              const jsonMatch = content.match(/\{[\s\S]*\}/);
              if (jsonMatch) {
                aiInsights = JSON.parse(jsonMatch[0]);
              }
            } catch (parseError) {
              console.error('Failed to parse AI response:', parseError);
            }
          }
        }
      } catch (aiError) {
        console.error('AI insights generation failed:', aiError);
      }
    }

    const aggregatedInsights = {
      overallHealth: {
        score: avgHealthScore,
        trend: aiInsights?.healthTrend || (avgHealthScore > 60 ? 'stable' : 'needs_attention'),
        summary: aiInsights?.executiveSummary || `Managing ${totalActiveJobs} active jobs with ${totalApplications} candidates in pipeline`
      },
      crossPipelineInsights: {
        bottleneckPattern: bottlenecks[0] || 'No major bottlenecks detected',
        topPerformer: topPerformer ? `${topPerformer.title} pipeline showing best performance` : null,
        concernAreas: concerns.length > 0 ? concerns : ['No critical concerns identified'],
        patterns
      },
      strategicRecommendations: aiInsights?.strategicRecommendations || [
        {
          priority: bottlenecks.length > 2 ? 'critical' : 'high',
          insight: bottlenecks[0] || 'Consider expanding sourcing channels',
          impact: 'Improve candidate pipeline health'
        }
      ],
      portfolioForecast: {
        predictedHires30Days,
        predictedHires90Days,
        confidence: Math.min(0.85, 0.5 + (totalApplications / 100)),
        riskFactors: aiInsights?.riskFactors || (bottlenecks.length > 0 ? bottlenecks : ['Market conditions'])
      },
      improvementOpportunities: aiInsights?.improvementOpportunities || [
        {
          area: 'Candidate sourcing',
          currentState: `${totalApplications} total candidates`,
          recommendation: 'Diversify sourcing channels',
          potentialGain: '+20% pipeline diversity'
        }
      ],
      metrics: {
        totalActiveJobs,
        totalApplications,
        totalInterviews,
        avgMatchScore: Math.round(avgMatchScore),
        stageDistribution,
        standardPipelines: standardJobs.length,
        continuousPipelines: continuousPipelines.length
      },
      jobHealthScores
    };

    return new Response(JSON.stringify({ insights: aggregatedInsights }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: unknown) {
    console.error('Error generating aggregated insights:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
