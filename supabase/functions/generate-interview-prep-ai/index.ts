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
    const { candidateId, jobId, interviewerId, interviewType } = await req.json();
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch data
    const { data: candidate } = await supabase
      .from('candidate_profiles')
      .select('*')
      .eq('id', candidateId)
      .single();

    const { data: job } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    const { data: interviewer } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', interviewerId)
      .single();

    const { data: experience } = await supabase
      .from('experience')
      .select('*')
      .eq('candidate_id', candidateId);

    const { data: skills } = await supabase
      .from('skills')
      .select('*')
      .eq('candidate_id', candidateId);

    const { data: previousFeedback } = await supabase
      .from('interview_feedback')
      .select('*')
      .eq('candidate_id', candidateId)
      .order('created_at', { ascending: false })
      .limit(3);

    // Generate AI prep
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const prompt = `Generate personalized interview prep for an interviewer.

INTERVIEWER: ${interviewer?.full_name}
INTERVIEW TYPE: ${interviewType || 'General'}

CANDIDATE: ${candidate?.full_name}
Current Role: ${candidate?.current_title}
Experience: ${experience?.length || 0} positions
Top Skills: ${skills?.slice(0, 5).map(s => s.skill_name).join(', ')}

JOB: ${job?.title}
Department: ${job?.department}
Location: ${job?.location}

PREVIOUS FEEDBACK HIGHLIGHTS:
${previousFeedback?.map(f => `- ${f.recommendation}: ${f.key_strengths?.join(', ')}`).join('\n') || 'First interview'}

Generate a JSON response:
{
  "candidateSummary": "2-3 sentence overview tailored for this interviewer",
  "focusAreas": ["area 1 to probe", "area 2 to probe", "area 3 to probe"],
  "suggestedQuestions": [
    {
      "question": "Question text",
      "rationale": "Why ask this",
      "expectedInsights": "What you'll learn",
      "followUps": ["follow-up 1", "follow-up 2"]
    }
  ],
  "redFlagsToWatch": ["flag 1", "flag 2"],
  "conversationStarters": ["opener 1", "opener 2"],
  "keySkillsToAssess": ["skill 1", "skill 2", "skill 3"],
  "cultureFitIndicators": ["indicator 1", "indicator 2"],
  "previousRoundInsights": "What was learned so far",
  "whatMakesThisCandidateUnique": "Standout qualities",
  "potentialConcerns": ["concern 1", "concern 2"],
  "estimatedInterviewTime": 45
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
          { role: 'system', content: 'You are an interview preparation AI coach. Generate practical, insightful prep materials. Always respond with valid JSON.' },
          { role: 'user', content: prompt }
        ],
      }),
    });

    const aiData = await aiResponse.json();
    let prepMaterial;

    try {
      const content = aiData.choices[0].message.content;
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      prepMaterial = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(content);
    } catch (e) {
      console.error('Failed to parse AI response:', e);
      prepMaterial = {
        candidateSummary: `${candidate?.full_name} brings ${experience?.length || 0} years of experience in ${candidate?.current_title}.`,
        focusAreas: ["Technical competency", "Team collaboration", "Problem-solving approach"],
        suggestedQuestions: [
          {
            question: "Tell me about a challenging project you've worked on recently",
            rationale: "Assess problem-solving and technical depth",
            expectedInsights: "Technical approach, collaboration, outcome focus",
            followUps: ["What would you do differently?", "How did you measure success?"]
          }
        ],
        redFlagsToWatch: ["Vague answers", "Lack of ownership"],
        conversationStarters: ["I see you worked on X, tell me more about that"],
        keySkillsToAssess: skills?.slice(0, 3).map(s => s.skill_name) || ["Technical skills", "Communication", "Collaboration"],
        cultureFitIndicators: ["Team orientation", "Growth mindset"],
        previousRoundInsights: previousFeedback?.[0]?.notes || "This is the first interview",
        whatMakesThisCandidateUnique: "Strong background in relevant domain",
        potentialConcerns: ["Need to assess long-term commitment"],
        estimatedInterviewTime: 45
      };
    }

    return new Response(JSON.stringify({ prepMaterial }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error generating prep:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
