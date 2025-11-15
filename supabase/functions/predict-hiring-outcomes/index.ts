import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { jobId } = await req.json();
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch job and applications data
    const { data: job } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    const { data: applications } = await supabase
      .from('applications')
      .select('*')
      .eq('job_id', jobId);

    const { data: interviews } = await supabase
      .from('bookings')
      .select('*, interview_feedback(*)')
      .eq('is_interview_booking', true)
      .order('scheduled_start', { ascending: false });

    // Fetch historical hiring data for benchmarking
    const { data: historicalJobs } = await supabase
      .from('jobs')
      .select('*')
      .eq('status', 'closed')
      .order('created_at', { ascending: false })
      .limit(50);

    // Generate predictions
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const currentDate = new Date();
    const jobCreatedDate = new Date(job?.created_at || currentDate);
    const daysOpen = Math.floor((currentDate.getTime() - jobCreatedDate.getTime()) / (1000 * 60 * 60 * 24));

    const prompt = `Analyze hiring metrics and generate predictive analytics.

CURRENT JOB:
Title: ${job?.title}
Department: ${job?.department}
Days Open: ${daysOpen}
Total Applications: ${applications?.length || 0}
Active Candidates: ${applications?.filter(a => a.status === 'active').length || 0}
Interview Stages: ${job?.pipeline_stages?.length || 0}

PIPELINE STATUS:
${applications?.map(a => `- Stage ${a.current_stage_index}: ${a.status}`).join('\n')}

RECENT INTERVIEWS: ${interviews?.slice(0, 10).length || 0}

HISTORICAL BENCHMARK:
Average jobs closed: ${historicalJobs?.length || 0} in last period
Average time-to-hire: Estimated 30-45 days

Generate a JSON response with predictions:
{
  "timeToHire": {
    "predictedDays": 35,
    "confidence": 0.75,
    "earliestDate": "2025-01-15",
    "latestDate": "2025-02-01",
    "factors": ["factor 1", "factor 2"]
  },
  "offerAcceptanceProbability": {
    "averageProbability": 0.80,
    "topCandidate": {
      "probability": 0.90,
      "reasoning": "Strong interest, good fit"
    },
    "factors": ["factor 1", "factor 2"]
  },
  "hiringDifficulty": {
    "score": "medium",
    "reasoning": "Competitive market, specialized role",
    "marketFactors": ["factor 1", "factor 2"]
  },
  "pipelineHealth": {
    "score": 75,
    "bottlenecks": ["stage with delay"],
    "recommendations": ["action 1", "action 2"]
  },
  "costPrediction": {
    "estimatedCostPerHire": 5000,
    "timeInvestment": "120 hours",
    "breakdown": {
      "recruiting": 2000,
      "interviews": 2000,
      "administrative": 1000
    }
  },
  "qualityPrediction": {
    "expectedQuality": "high",
    "retentionProbability": 0.85,
    "timeToProductivity": "2-3 months",
    "factors": ["factor 1", "factor 2"]
  },
  "competitiveIntel": {
    "marketDemand": "high",
    "salaryBenchmark": "€80k-€100k",
    "competingOffers": 2,
    "speedToOffer": "Act within 5 days"
  },
  "actionRecommendations": [
    {
      "action": "specific action",
      "priority": "high|medium|low",
      "impact": "expected outcome",
      "timeline": "when to do it"
    }
  ]
}`;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'You are a predictive hiring analytics AI. Generate data-driven predictions. Always respond with valid JSON.' },
          { role: 'user', content: prompt }
        ],
      }),
    });

    const aiData = await aiResponse.json();
    let predictions;

    try {
      const content = aiData.choices[0].message.content;
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      predictions = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(content);
    } catch (e) {
      console.error('Failed to parse AI response:', e);
      const estimatedDays = Math.max(30, 60 - daysOpen);
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + estimatedDays);
      
      predictions = {
        timeToHire: {
          predictedDays: estimatedDays,
          confidence: 0.65,
          earliestDate: new Date(Date.now() + (estimatedDays - 10) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          latestDate: new Date(Date.now() + (estimatedDays + 15) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          factors: ["Current pipeline velocity", "Interview stage completion rate"]
        },
        offerAcceptanceProbability: {
          averageProbability: 0.75,
          topCandidate: { probability: 0.80, reasoning: "Strong pipeline engagement" },
          factors: ["Candidate engagement", "Role competitiveness"]
        },
        hiringDifficulty: {
          score: "medium",
          reasoning: "Standard market conditions for this role level",
          marketFactors: ["Market demand", "Skill availability"]
        },
        pipelineHealth: {
          score: 70,
          bottlenecks: (applications?.length || 0) > 5 ? ["High volume, review needed"] : [],
          recommendations: ["Maintain interview momentum", "Regular candidate communication"]
        },
        costPrediction: {
          estimatedCostPerHire: 5000,
          timeInvestment: "100 hours",
          breakdown: { recruiting: 2000, interviews: 2000, administrative: 1000 }
        },
        qualityPrediction: {
          expectedQuality: "medium-high",
          retentionProbability: 0.80,
          timeToProductivity: "2-3 months",
          factors: ["Role clarity", "Interview process quality"]
        },
        competitiveIntel: {
          marketDemand: "moderate",
          salaryBenchmark: "Market rate",
          competingOffers: 1,
          speedToOffer: "Maintain steady pace"
        },
        actionRecommendations: [
          {
            action: "Review candidates in early stages",
            priority: "high",
            impact: "Reduce time-to-hire",
            timeline: "This week"
          }
        ]
      };
    }

    return new Response(JSON.stringify({ predictions }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error generating predictions:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
