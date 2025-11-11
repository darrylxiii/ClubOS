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
    const { meetingId, candidateId, roleTitle, companyName } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch candidate profile data
    const { data: candidate, error: candidateError } = await supabase
      .from('candidate_profiles')
      .select('*, profiles!inner(*)')
      .eq('id', candidateId)
      .single();

    if (candidateError) {
      console.error('Error fetching candidate:', candidateError);
    }

    // Fetch candidate's experience, skills, documents
    const { data: experience } = await supabase
      .from('experience')
      .select('*')
      .eq('user_id', candidate?.user_id)
      .order('start_date', { ascending: false });

    const { data: skills } = await supabase
      .from('skills')
      .select('*')
      .eq('user_id', candidate?.user_id);

    // Build candidate context
    const candidateContext = {
      name: candidate?.profiles?.full_name || 'Candidate',
      title: candidate?.current_title,
      experience: experience || [],
      skills: skills?.map(s => s.name) || [],
      yearsExperience: candidate?.years_experience,
      education: candidate?.education_level,
    };

    // Generate AI prep brief
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are an expert interview preparation assistant. Generate a comprehensive interview prep brief for the interviewer.

Your response must be valid JSON in this exact format:
{
  "candidate_summary": "2-3 sentence overview of candidate",
  "key_strengths": ["strength 1", "strength 2", "strength 3"],
  "potential_concerns": ["concern 1", "concern 2"],
  "cv_gaps": ["gap 1", "gap 2"],
  "suggested_questions": [
    {"question": "Question text", "category": "technical|behavioral|culture", "priority": "high|medium|low"},
    {"question": "Question text", "category": "technical|behavioral|culture", "priority": "high|medium|low"}
  ],
  "conversation_starters": ["starter 1", "starter 2", "starter 3"],
  "technical_topics": ["topic 1", "topic 2", "topic 3"]
}`
          },
          {
            role: "user",
            content: `Prepare an interview brief for this candidate:

Role: ${roleTitle}
Company: ${companyName}

Candidate Profile:
- Name: ${candidateContext.name}
- Current Title: ${candidateContext.title || 'Not specified'}
- Years of Experience: ${candidateContext.yearsExperience || 'Not specified'}
- Education: ${candidateContext.education || 'Not specified'}
- Skills: ${candidateContext.skills.join(', ') || 'Not specified'}
- Recent Experience: ${JSON.stringify(candidateContext.experience.slice(0, 2))}

Generate a comprehensive interview prep brief with:
1. Candidate summary
2. Key strengths to explore
3. Potential concerns or gaps
4. CV gaps to probe
5. 8-10 suggested interview questions (mix of technical, behavioral, culture fit)
6. 3-4 conversation starters to build rapport
7. Technical topics to assess

Provide response as valid JSON.`
          }
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("AI analysis failed");
    }

    const data = await response.json();
    const analysisText = data.choices[0].message.content;
    
    // Parse JSON response
    let prepBrief;
    try {
      const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        prepBrief = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (parseError) {
      console.error("Failed to parse AI response:", analysisText);
      prepBrief = {
        candidate_summary: "Review candidate profile for detailed assessment.",
        key_strengths: ["Strong background", "Relevant experience"],
        potential_concerns: [],
        cv_gaps: [],
        suggested_questions: [
          {question: "Tell me about your experience with " + roleTitle, category: "technical", priority: "high"}
        ],
        conversation_starters: ["Welcome! Thanks for joining us today."],
        technical_topics: []
      };
    }

    // Store prep brief in database
    const { data: brief, error: insertError } = await supabase
      .from('interview_prep_briefs')
      .insert({
        meeting_id: meetingId,
        candidate_id: candidateId,
        role_title: roleTitle,
        company_name: companyName,
        candidate_summary: prepBrief.candidate_summary,
        key_strengths: prepBrief.key_strengths,
        potential_concerns: prepBrief.potential_concerns,
        cv_gaps: prepBrief.cv_gaps,
        suggested_questions: prepBrief.suggested_questions,
        conversation_starters: prepBrief.conversation_starters,
        technical_topics: prepBrief.technical_topics,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting prep brief:', insertError);
      throw insertError;
    }

    return new Response(
      JSON.stringify({ brief }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in generate-interview-prep:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});