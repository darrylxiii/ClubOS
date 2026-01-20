import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client to verify the user
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const { candidateName, candidateTitle, jobTitle, companyName, stageName, interviewType, interviewerNames } = await req.json();

    // Validate required fields
    if (!candidateName || !stageName) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: candidateName, stageName' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Generating interview description for ${candidateName} at ${companyName}`);

    // Build the prompt
    const prompt = `Generate a professional interview meeting description for:
Candidate: ${candidateName}
Current Title: ${candidateTitle || 'Not specified'}
Job Position: ${jobTitle || 'Position'}
Company: ${companyName || 'Company'}
Interview Stage: ${stageName}
Interview Type: ${(interviewType || 'interview').replace('_', ' ')}
Interviewers: ${interviewerNames || 'TBD'}

Include:
1. Brief introduction
2. Key areas to assess
3. Interview format
4. A note about the meeting link being included

Keep it concise (3-4 sentences) and professional.`;

    // Call Lovable AI gateway using server-side API key
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) {
      console.error('LOVABLE_API_KEY not configured');
      // Return fallback description
      return new Response(
        JSON.stringify({
          description: `Interview with ${candidateName} for the ${stageName} stage of the ${jobTitle || 'open'} position at ${companyName || 'our company'}.\n\nInterviewers: ${interviewerNames || 'TBD'}\n\nKey Assessment Areas:\n- Technical skills and experience\n- Problem-solving approach\n- Cultural fit\n- Communication skills\n\nPlease review the candidate's profile and application before the interview.`,
          generated: false,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const response = await fetch('https://gateway.lovable.app/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${lovableApiKey}`,
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (response.ok) {
      const data = await response.json();
      const generatedDescription = data.choices?.[0]?.message?.content || '';
      
      console.log('AI description generated successfully');
      return new Response(
        JSON.stringify({ description: generatedDescription, generated: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      console.error('AI gateway error:', response.status, await response.text());
      // Return fallback
      return new Response(
        JSON.stringify({
          description: `Interview with ${candidateName} for the ${stageName} stage of the ${jobTitle || 'open'} position at ${companyName || 'our company'}.\n\nInterviewers: ${interviewerNames || 'TBD'}\n\nKey Assessment Areas:\n- Technical skills and experience\n- Problem-solving approach\n- Cultural fit\n- Communication skills\n\nPlease review the candidate's profile and application before the interview.`,
          generated: false,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('Error generating interview description:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
