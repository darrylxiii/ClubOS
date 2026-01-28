import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface CoverLetterRequest {
  jobId: string;
  tone: 'professional' | 'conversational' | 'executive';
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { jobId, tone = 'professional' }: CoverLetterRequest = await req.json();

    if (!jobId) {
      return new Response(JSON.stringify({ error: "jobId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch job details with company info
    const { data: job, error: jobError } = await supabaseClient
      .from('jobs')
      .select(`
        id,
        title,
        description,
        requirements,
        nice_to_have,
        responsibilities,
        companies (
          name,
          description,
          industry,
          tagline
        )
      `)
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      return new Response(JSON.stringify({ error: "Job not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch candidate profile
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select(`
        id,
        full_name,
        headline,
        bio
      `)
      .eq('id', user.id)
      .single();

    // Fetch candidate's detailed profile
    const { data: candidateProfile } = await supabaseClient
      .from('candidate_profiles')
      .select(`
        current_title,
        current_company,
        years_of_experience,
        skills,
        ai_summary
      `)
      .eq('user_id', user.id)
      .single();

    // Fetch work experience
    const { data: experiences } = await supabaseClient
      .from('profile_experience')
      .select('*')
      .eq('profile_id', user.id)
      .order('start_date', { ascending: false })
      .limit(5);

    // Build candidate context
    const candidateName = profile?.full_name || 'Candidate';
    const currentRole = candidateProfile?.current_title || profile?.headline || '';
    const currentCompany = candidateProfile?.current_company || '';
    const yearsExp = candidateProfile?.years_of_experience || 0;
    const skills = candidateProfile?.skills || [];
    const experienceList = experiences?.map(exp => 
      `${exp.title} at ${exp.company_name} (${exp.start_date?.split('-')[0] || ''}-${exp.end_date?.split('-')[0] || 'Present'}): ${exp.description || ''}`
    ).join('\n') || '';

    // Build tone instructions
    const toneInstructions = {
      professional: 'Use formal business language, proper salutations, and maintain a professional distance while showing enthusiasm.',
      conversational: 'Use friendly, approachable language while remaining professional. Show personality and genuine interest.',
      executive: 'Be concise and results-focused. Lead with impact metrics and strategic thinking. Suitable for C-level or senior positions.'
    };

    const systemPrompt = `You are QUIN, The Quantum Club's professional career assistant. You write tailored, compelling cover letters that highlight the candidate's relevant experience and skills.

IMPORTANT RULES:
- Write ONLY the cover letter content, no explanations or notes
- Do NOT include placeholders like [Your Name] - use the actual candidate information
- Keep it to 3-4 paragraphs maximum
- Focus on specific achievements and relevant experience
- Show genuine interest in the company and role
- Use the specified tone throughout

Tone: ${toneInstructions[tone]}`;

    const userPrompt = `Write a cover letter for:

JOB DETAILS:
- Title: ${job.title}
- Company: ${(job.companies as any)?.name || 'Company'}
- Industry: ${(job.companies as any)?.industry || 'Technology'}
- Company Description: ${(job.companies as any)?.description || (job.companies as any)?.tagline || ''}
- Job Description: ${job.description || ''}
- Requirements: ${(job.requirements || []).slice(0, 5).join(', ')}
- Nice to Have: ${(job.nice_to_have || []).slice(0, 3).join(', ')}
- Key Responsibilities: ${(job.responsibilities || []).slice(0, 3).join(', ')}

CANDIDATE PROFILE:
- Name: ${candidateName}
- Current Role: ${currentRole}${currentCompany ? ` at ${currentCompany}` : ''}
- Years of Experience: ${yearsExp}
- Key Skills: ${skills.slice(0, 10).join(', ')}
- Recent Experience:
${experienceList}

Write a compelling, personalized cover letter in the ${tone} tone. Address it to "Hiring Manager" unless a specific name is provided.`;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI service not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 1500,
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds to continue." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await aiResponse.text();
      console.error("AI API error:", aiResponse.status, errorText);
      return new Response(JSON.stringify({ error: "Failed to generate cover letter" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    const coverLetter = aiData.choices?.[0]?.message?.content || '';

    if (!coverLetter) {
      return new Response(JSON.stringify({ error: "No content generated" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({
      coverLetter,
      jobTitle: job.title,
      companyName: (job.companies as any)?.name || 'Company',
      generatedAt: new Date().toISOString(),
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error in generate-cover-letter:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
