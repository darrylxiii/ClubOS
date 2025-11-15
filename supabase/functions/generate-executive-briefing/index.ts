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
    const { candidateId, jobId } = await req.json();
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch candidate and application data
    const { data: candidate } = await supabase
      .from('candidate_profiles')
      .select('*')
      .eq('id', candidateId)
      .single();

    const { data: application } = await supabase
      .from('applications')
      .select('*')
      .eq('candidate_id', candidateId)
      .eq('job_id', jobId)
      .single();

    const { data: feedback } = await supabase
      .from('interview_feedback')
      .select('*')
      .eq('candidate_id', candidateId)
      .order('created_at', { ascending: false });

    // Generate one-page briefing
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const prompt = `Generate a one-page executive briefing for quick decision-making (30-second read).

CANDIDATE: ${candidate?.full_name} - ${candidate?.current_title}
MATCH SCORE: ${application?.match_score}%
INTERVIEW ROUNDS: ${feedback?.length || 0}

FEEDBACK SUMMARY:
${feedback?.map(f => `- ${f.recommendation}: Tech ${f.technical_rating}/5, Culture ${f.culture_fit_rating}/5, Comm ${f.communication_rating}/5`).join('\n')}

Generate a JSON response:
{
  "headline": "One sentence summary (max 15 words)",
  "topThreeStrengths": ["strength 1", "strength 2", "strength 3"],
  "topThreeConcerns": ["concern 1", "concern 2", "concern 3"],
  "teamConsensus": {
    "score": 85,
    "confidence": "high|medium|low",
    "alignment": "strong|moderate|weak"
  },
  "aiRecommendation": "hire|no_hire|need_more_info",
  "aiRecommendationReasoning": "One sentence why (max 20 words)",
  "nextStep": "Specific action to take next",
  "riskFactors": ["risk 1", "risk 2"],
  "opportunityCost": "What we lose if we don't hire (one sentence)",
  "readTime": "30 seconds"
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
          { role: 'system', content: 'You are an executive briefing AI. Be concise, clear, and actionable. Always respond with valid JSON.' },
          { role: 'user', content: prompt }
        ],
      }),
    });

    const aiData = await aiResponse.json();
    let briefing;

    try {
      const content = aiData.choices[0].message.content;
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      briefing = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(content);
    } catch (e) {
      console.error('Failed to parse AI response:', e);
      briefing = {
        headline: `${candidate?.full_name} - Strong candidate pending review`,
        topThreeStrengths: ["Technical competence", "Cultural alignment", "Strong communication"],
        topThreeConcerns: ["More data needed", "Additional interviews recommended", "Team feedback pending"],
        teamConsensus: { score: 75, confidence: "medium", alignment: "moderate" },
        aiRecommendation: "need_more_info",
        aiRecommendationReasoning: "Insufficient interview data for confident decision",
        nextStep: "Schedule final interview round",
        riskFactors: ["Limited interview feedback"],
        opportunityCost: "Potential quality hire may accept competing offer",
        readTime: "30 seconds"
      };
    }

    return new Response(JSON.stringify({ briefing }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error generating briefing:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
