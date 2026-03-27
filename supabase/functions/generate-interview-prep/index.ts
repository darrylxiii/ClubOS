import { createHandler } from '../_shared/handler.ts';

Deno.serve(createHandler(async (req, ctx) => {
    const { meetingId, candidateId, roleTitle, companyName } = await req.json();

    const GOOGLE_API_KEY = Deno.env.get("GOOGLE_API_KEY");
    if (!GOOGLE_API_KEY) {
      throw new Error("GOOGLE_API_KEY not configured");
    }

    // === DEDUP GUARD: Return existing brief if already generated for this meeting+candidate ===
    const { data: existingBrief } = await ctx.supabase
      .from('interview_prep_briefs')
      .select('*')
      .eq('meeting_id', meetingId)
      .eq('candidate_id', candidateId)
      .maybeSingle();

    if (existingBrief) {
      console.log(`[generate-interview-prep] Cache HIT for meeting ${meetingId} + candidate ${candidateId}`);
      return new Response(
        JSON.stringify({ brief: existingBrief }),
        { headers: { ...ctx.corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch candidate profile data
    const { data: candidate, error: candidateError } = await ctx.supabase
      .from('candidate_profiles')
      .select('*, profiles!inner(*)')
      .eq('id', candidateId)
      .single();

    if (candidateError) {
      console.error('Error fetching candidate:', candidateError);
    }

    // Fetch candidate's experience, skills in parallel
    const [{ data: experience }, { data: skills }] = await Promise.all([
      ctx.supabase.from('experience').select('*').eq('user_id', candidate?.user_id).order('start_date', { ascending: false }),
      ctx.supabase.from('skills').select('*').eq('user_id', candidate?.user_id),
    ]);

    // Build candidate context
    const candidateContext = {
      name: candidate?.profiles?.full_name || 'Candidate',
      title: candidate?.current_title,
      experience: experience || [],
      skills: skills?.map(s => s.name) || [],
      yearsExperience: candidate?.years_experience,
      education: candidate?.education_level,
    };

    // Generate AI prep brief -- downgraded to flash-lite (structured JSON from structured input)
    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GOOGLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gemini-2.5-flash-lite",
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
    const { data: brief, error: insertError } = await ctx.supabase
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
      { headers: { ...ctx.corsHeaders, "Content-Type": "application/json" } }
    );
}));
