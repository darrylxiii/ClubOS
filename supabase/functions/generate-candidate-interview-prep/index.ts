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
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { applicationId } = await req.json();
    if (!applicationId) {
      return new Response(JSON.stringify({ error: 'applicationId required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify user owns this application
    const anonClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } }
    });
    const { data: { user } } = await anonClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch application with job details
    const { data: app, error: appError } = await supabase
      .from('applications')
      .select(`
        id, status,
        jobs:job_id (
          title, description, requirements, benefits, department, location, employment_type,
          companies:company_id (name, description)
        )
      `)
      .eq('id', applicationId)
      .or(`user_id.eq.${user.id},candidate_id.eq.${user.id}`)
      .single();

    if (appError || !app) {
      return new Response(JSON.stringify({ error: 'Application not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const job = app.jobs as any;
    const company = job?.companies;

    // Fetch candidate skills
    const { data: skills } = await supabase
      .from('skills')
      .select('skill_name, proficiency_level')
      .eq('candidate_id', user.id)
      .limit(10);

    // Fetch candidate experience
    const { data: experience } = await supabase
      .from('experience')
      .select('title, company_name, description')
      .eq('candidate_id', user.id)
      .order('start_date', { ascending: false })
      .limit(3);

    const GOOGLE_API_KEY = Deno.env.get('GOOGLE_API_KEY');
    if (!GOOGLE_API_KEY) {
      throw new Error('GOOGLE_API_KEY not configured');
    }

    const prompt = `Generate personalized interview preparation for a candidate.

JOB: ${job?.title || 'Unknown'}
COMPANY: ${company?.name || 'Unknown'}
COMPANY ABOUT: ${company?.description?.slice(0, 300) || 'N/A'}
JOB DESCRIPTION: ${job?.description?.slice(0, 800) || 'N/A'}
REQUIREMENTS: ${JSON.stringify(job?.requirements?.slice(0, 8) || [])}
DEPARTMENT: ${job?.department || 'N/A'}
LOCATION: ${job?.location || 'N/A'}

CANDIDATE SKILLS: ${skills?.map(s => s.skill_name).join(', ') || 'Not provided'}
RECENT EXPERIENCE: ${experience?.map(e => `${e.title} at ${e.company_name}`).join('; ') || 'Not provided'}

Return a JSON object with:
{
  "tailoredQuestions": [
    {
      "category": "Behavioral" | "Technical" | "Culture Fit" | "Role-Specific",
      "question": "The interview question",
      "why": "Why they might ask this based on the JD",
      "tip": "How to answer well given the candidate's background"
    }
  ],
  "smartQuestionsToAsk": [
    {
      "question": "A question the candidate should ask the interviewer",
      "insight": "What this reveals about the company/role"
    }
  ],
  "companyInsights": "2-3 sentences about the company culture and what they likely value",
  "keyThemesToEmphasize": ["theme1", "theme2", "theme3"]
}

Generate exactly 8 tailored questions (2 per category) and 7 smart questions to ask. Make every question specific to this JD and company, not generic.`;

    const aiResponse = await fetch('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GOOGLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gemini-2.5-flash-lite',
        messages: [
          { role: 'system', content: 'You are an expert interview coach at a luxury recruitment agency. Generate highly specific, JD-aware preparation materials. Always respond with valid JSON only, no markdown.' },
          { role: 'user', content: prompt }
        ],
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limited. Please try again shortly.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: 'AI quota exceeded.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`AI gateway error: ${status}`);
    }

    const aiData = await aiResponse.json();
    let prepData;

    try {
      const content = aiData.choices[0].message.content;
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      prepData = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(content);
    } catch {
      // Fallback
      prepData = {
        tailoredQuestions: [
          { category: "Role-Specific", question: `What experience do you have relevant to ${job?.title}?`, why: "Direct relevance check", tip: "Use specific examples from your experience" },
          { category: "Behavioral", question: "Tell me about a challenging project you led", why: "Assessing leadership", tip: "Use the STAR method" },
        ],
        smartQuestionsToAsk: [
          { question: `What does success look like in the first 90 days for this ${job?.title} role?`, insight: "Shows strategic thinking" },
          { question: "How does the team collaborate day-to-day?", insight: "Reveals team culture" },
        ],
        companyInsights: `${company?.name || 'This company'} is looking for someone who can contribute immediately to their ${job?.department || 'team'}.`,
        keyThemesToEmphasize: ["Relevant experience", "Problem-solving", "Team collaboration"],
      };
    }

    return new Response(JSON.stringify({ prep: prepData }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error generating candidate prep:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
