import { createAuthenticatedHandler } from '../_shared/handler.ts';

Deno.serve(createAuthenticatedHandler(async (req, ctx) => {
    // Parse request body
    const { candidateName, candidateTitle, jobTitle, companyName, stageName, interviewType, interviewerNames } = await req.json();

    // Validate required fields
    if (!candidateName || !stageName) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: candidateName, stageName' }),
        { status: 400, headers: { ...ctx.corsHeaders, 'Content-Type': 'application/json' } }
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

    // Call Google Gemini gateway using server-side API key
    const googleApiKey = Deno.env.get('GOOGLE_API_KEY');
    if (!googleApiKey) {
      console.error('GOOGLE_API_KEY not configured');
      // Return fallback description
      return new Response(
        JSON.stringify({
          description: `Interview with ${candidateName} for the ${stageName} stage of the ${jobTitle || 'open'} position at ${companyName || 'our company'}.\n\nInterviewers: ${interviewerNames || 'TBD'}\n\nKey Assessment Areas:\n- Technical skills and experience\n- Problem-solving approach\n- Cultural fit\n- Communication skills\n\nPlease review the candidate's profile and application before the interview.`,
          generated: false,
        }),
        { status: 200, headers: { ...ctx.corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${googleApiKey}`,
      },
      body: JSON.stringify({
        model: 'gemini-2.5-flash-lite',
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (response.ok) {
      const data = await response.json();
      const generatedDescription = data.choices?.[0]?.message?.content || '';

      console.log('AI description generated successfully');
      return new Response(
        JSON.stringify({ description: generatedDescription, generated: true }),
        { status: 200, headers: { ...ctx.corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      console.error('AI gateway error:', response.status, await response.text());
      // Return fallback
      return new Response(
        JSON.stringify({
          description: `Interview with ${candidateName} for the ${stageName} stage of the ${jobTitle || 'open'} position at ${companyName || 'our company'}.\n\nInterviewers: ${interviewerNames || 'TBD'}\n\nKey Assessment Areas:\n- Technical skills and experience\n- Problem-solving approach\n- Cultural fit\n- Communication skills\n\nPlease review the candidate's profile and application before the interview.`,
          generated: false,
        }),
        { status: 200, headers: { ...ctx.corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
}));
