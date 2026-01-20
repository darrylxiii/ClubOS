/**
 * Generate Offer Recommendation Edge Function
 * 
 * AI-powered offer builder that integrates salary benchmarks
 * to generate optimal compensation packages with market positioning.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OfferRequest {
  candidate_id: string;
  job_id: string;
  application_id?: string;
}

interface SalaryBenchmark {
  role_title: string;
  location: string;
  experience_years: any;
  salary_min: number;
  salary_max: number;
  currency: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { candidate_id, job_id, application_id }: OfferRequest = await req.json();

    if (!candidate_id || !job_id) {
      return new Response(
        JSON.stringify({ error: 'candidate_id and job_id are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[Offer Recommendation] Generating for candidate: ${candidate_id}, job: ${job_id}`);

    // Fetch candidate data
    const { data: candidate, error: candidateError } = await supabase
      .from('candidate_profiles')
      .select(`
        *,
        candidate_experience(company_name, job_title, start_date, end_date),
        candidate_compensation(current_salary, expected_salary_min, expected_salary_max, currency)
      `)
      .eq('id', candidate_id)
      .single();

    if (candidateError) throw candidateError;

    // Fetch job data
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('*, companies(name, industry)')
      .eq('id', job_id)
      .single();

    if (jobError) throw jobError;

    // Calculate candidate's years of experience
    const experience = candidate.candidate_experience || [];
    let totalYears = 0;
    experience.forEach((exp: any) => {
      const start = new Date(exp.start_date);
      const end = exp.end_date ? new Date(exp.end_date) : new Date();
      totalYears += (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 365);
    });
    totalYears = Math.round(totalYears);

    // Fetch salary benchmarks
    const { data: benchmarks } = await supabase
      .from('salary_benchmarks')
      .select('*')
      .ilike('role_title', `%${job.title}%`)
      .limit(5);

    // Get candidate salary expectations
    const compensation = candidate.candidate_compensation?.[0];
    const expectedMin = compensation?.expected_salary_min || 0;
    const expectedMax = compensation?.expected_salary_max || 0;
    const currentSalary = compensation?.current_salary || 0;
    const currency = compensation?.currency || 'EUR';

    // Calculate market benchmarks
    let marketMin = 0;
    let marketMax = 0;
    let marketMedian = 0;

    if (benchmarks && benchmarks.length > 0) {
      const relevantBenchmarks = benchmarks.filter((b: SalaryBenchmark) => {
        const expRange = String(b.experience_years || '');
        if (expRange.includes('-')) {
          const [min, max] = expRange.split('-').map(Number);
          return totalYears >= min && totalYears <= max;
        }
        return true;
      });

      if (relevantBenchmarks.length > 0) {
        marketMin = relevantBenchmarks.reduce((sum: number, b: SalaryBenchmark) => sum + (b.salary_min || 0), 0) / relevantBenchmarks.length;
        marketMax = relevantBenchmarks.reduce((sum: number, b: SalaryBenchmark) => sum + (b.salary_max || 0), 0) / relevantBenchmarks.length;
        marketMedian = (marketMin + marketMax) / 2;
      }
    }

    // Fallback market data if no benchmarks
    if (marketMedian === 0) {
      marketMin = expectedMin || 60000;
      marketMax = expectedMax || 100000;
      marketMedian = (marketMin + marketMax) / 2;
    }

    // Calculate recommended offer
    let recommendedBase = marketMedian;
    
    // Adjust for candidate expectations
    if (expectedMin > marketMedian) {
      recommendedBase = Math.min(expectedMin, marketMax * 1.1);
    }
    
    // Adjust for experience
    if (totalYears > 10) {
      recommendedBase *= 1.15;
    } else if (totalYears > 5) {
      recommendedBase *= 1.05;
    }

    // Adjust for current salary (don't lowball)
    if (currentSalary > recommendedBase) {
      recommendedBase = currentSalary * 1.10; // At least 10% raise
    }

    // Round to nearest 1000
    recommendedBase = Math.round(recommendedBase / 1000) * 1000;

    // Calculate percentile
    let percentile = 50;
    if (marketMax > marketMin) {
      percentile = Math.round(((recommendedBase - marketMin) / (marketMax - marketMin)) * 100);
      percentile = Math.max(0, Math.min(100, percentile));
    }

    // Calculate competitiveness score
    let competitiveness = 50;
    if (expectedMax > 0) {
      const offerRatio = recommendedBase / expectedMax;
      if (offerRatio >= 1) competitiveness = 90;
      else if (offerRatio >= 0.9) competitiveness = 75;
      else if (offerRatio >= 0.8) competitiveness = 60;
      else competitiveness = 40;
    }

    // Build AI recommendation
    let aiInsights = {
      summary: '',
      risk_factors: [] as string[],
      negotiation_tips: [] as string[],
      counter_offer_preparation: '',
    };

    if (lovableApiKey) {
      try {
        const prompt = `You are a compensation expert for a premium executive recruiting platform.

Analyze this offer scenario and provide insights:

CANDIDATE:
- Name: ${candidate.full_name}
- Years Experience: ${totalYears}
- Current Salary: ${currency} ${currentSalary.toLocaleString()}
- Expected Range: ${currency} ${expectedMin.toLocaleString()} - ${expectedMax.toLocaleString()}

JOB:
- Title: ${job.title}
- Company: ${(job.companies as any)?.name || 'Unknown'}
- Location: ${job.location}

MARKET DATA:
- Market Range: ${currency} ${Math.round(marketMin).toLocaleString()} - ${Math.round(marketMax).toLocaleString()}
- Recommended Offer: ${currency} ${recommendedBase.toLocaleString()}
- Percentile: ${percentile}th

Provide a JSON response with:
{
  "summary": "2-3 sentence summary of the offer positioning",
  "risk_factors": ["list of 2-3 risks if we lowball", "or reasons candidate might reject"],
  "negotiation_tips": ["3-4 specific negotiation strategies"],
  "counter_offer_preparation": "How to respond if candidate counters"
}`;

        const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${lovableApiKey}`,
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [{ role: 'user', content: prompt }],
            response_format: { type: 'json_object' },
          }),
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          const content = aiData.choices?.[0]?.message?.content;
          if (content) {
            aiInsights = JSON.parse(content);
          }
        }
      } catch (aiError) {
        console.warn('[Offer Recommendation] AI generation failed:', aiError);
      }
    }

    // Prepare response
    const recommendation = {
      recommended_base_salary: recommendedBase,
      recommended_bonus_percentage: totalYears > 5 ? 15 : 10,
      recommended_equity_percentage: job.title.includes('Director') || job.title.includes('VP') ? 0.5 : 0,
      total_compensation: recommendedBase * (1 + (totalYears > 5 ? 0.15 : 0.10)),
      salary_percentile: percentile,
      market_competitiveness_score: competitiveness,
      currency,
      market_data: {
        min: Math.round(marketMin),
        max: Math.round(marketMax),
        median: Math.round(marketMedian),
        sample_size: benchmarks?.length || 0,
      },
      candidate_expectations: {
        current_salary: currentSalary,
        expected_min: expectedMin,
        expected_max: expectedMax,
        years_experience: totalYears,
      },
      ai_insights: aiInsights,
      generated_at: new Date().toISOString(),
    };

    console.log(`[Offer Recommendation] Generated: ${currency} ${recommendedBase.toLocaleString()} (${percentile}th percentile)`);

    return new Response(
      JSON.stringify(recommendation),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Offer Recommendation] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
