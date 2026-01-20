import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';
import { checkUserRateLimit, createRateLimitResponse } from '../_shared/rate-limiter.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const requestSchema = z.object({
  meetingId: z.string().uuid('Invalid meeting ID format'),
  transcript: z.string().min(1).max(50000, 'Transcript too long')
});

const scoreSchema = z.object({
  communication_clarity: z.number().min(0).max(100),
  technical_depth: z.number().min(0).max(100),
  culture_fit: z.number().min(0).max(100),
  red_flags: z.array(z.string().max(500)).max(10).optional(),
  green_flags: z.array(z.string().max(500)).max(10).optional(),
  overall_score: z.number().min(0).max(100),
  key_insights: z.string().max(5000),
  follow_up_suggestions: z.array(z.string().max(500)).max(10).optional()
});

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized - Authentication required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;

    // Authenticate user with auth header
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      console.error('[Realtime Analysis] Auth error:', authError);
      return new Response(JSON.stringify({ error: 'Unauthorized - Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Rate limiting (5 requests per 15 minutes per user)
    const rateLimit = await checkUserRateLimit(
      user.id,
      'analyze-interview-realtime',
      5,
      900000 // 15 minutes
    );

    if (!rateLimit.allowed) {
      return createRateLimitResponse(rateLimit.retryAfter || 900, corsHeaders);
    }

    // Validate input
    const body = await req.json();
    let validatedInput;
    try {
      validatedInput = requestSchema.parse(body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return new Response(
          JSON.stringify({ error: 'Validation failed', details: error.issues }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw error;
    }

    const { meetingId, transcript } = validatedInput;

    // Use service role key for database operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user is a participant in this meeting
    const { data: participant, error: participantError } = await supabase
      .from('meeting_participants')
      .select('id')
      .eq('meeting_id', meetingId)
      .eq('user_id', user.id)
      .single();

    if (participantError || !participant) {
      console.error('[Realtime Analysis] Participant verification failed:', participantError);
      return new Response(JSON.stringify({ 
        error: 'Forbidden - You are not a participant in this meeting' 
      }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('[Realtime Analysis] Analyzing transcript for meeting:', meetingId);

    // Call Lovable AI to analyze the transcript
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are an AI interview analyst. Analyze interview transcripts in real-time and provide scoring.
Return a JSON object with these exact fields:
{
  "communication_clarity": number (0-100),
  "technical_depth": number (0-100),
  "culture_fit": number (0-100),
  "red_flags": string[],
  "green_flags": string[],
  "overall_score": number (0-100),
  "key_insights": string,
  "follow_up_suggestions": string[]
}`
          },
          {
            role: 'user',
            content: `Analyze this interview transcript and provide real-time scoring:\n\n${transcript}`
          }
        ],
        tools: [{
          type: "function",
          function: {
            name: "score_interview",
            description: "Score the interview based on transcript analysis",
            parameters: {
              type: "object",
              properties: {
                communication_clarity: { type: "number", minimum: 0, maximum: 100 },
                technical_depth: { type: "number", minimum: 0, maximum: 100 },
                culture_fit: { type: "number", minimum: 0, maximum: 100 },
                red_flags: { type: "array", items: { type: "string" } },
                green_flags: { type: "array", items: { type: "string" } },
                overall_score: { type: "number", minimum: 0, maximum: 100 },
                key_insights: { type: "string" },
                follow_up_suggestions: { type: "array", items: { type: "string" } }
              },
              required: ["communication_clarity", "technical_depth", "culture_fit", "overall_score", "key_insights"],
              additionalProperties: false
            }
          }
        }],
        tool_choice: { type: "function", function: { name: "score_interview" } }
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('[Realtime Analysis] AI API error:', aiResponse.status, errorText);
      return new Response(JSON.stringify({ error: 'AI analysis failed' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices[0]?.message?.tool_calls?.[0];
    
    if (!toolCall) {
      console.error('[Realtime Analysis] No tool call in response');
      return new Response(JSON.stringify({ error: 'Invalid AI response' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let scores;
    try {
      const parsedScores = JSON.parse(toolCall.function.arguments);
      scores = scoreSchema.parse(parsedScores);
    } catch (error) {
      console.error('[Realtime Analysis] Score validation failed:', error);
      return new Response(JSON.stringify({ error: 'Invalid AI response format' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    console.log('[Realtime Analysis] Scores generated:', scores);

    // Update interview_insights table
    const { data: existingInsight } = await supabase
      .from('interview_insights' as any)
      .select('id')
      .eq('meeting_id', meetingId)
      .single();

    if (existingInsight) {
      // Update existing
      const { error: updateError } = await supabase
        .from('interview_insights' as any)
        .update({
          communication_clarity: scores.communication_clarity,
          technical_depth: scores.technical_depth,
          culture_fit: scores.culture_fit,
          red_flags: scores.red_flags || [],
          green_flags: scores.green_flags || [],
          overall_score: scores.overall_score,
          key_insights: scores.key_insights,
          follow_up_suggestions: scores.follow_up_suggestions || [],
          last_analyzed_at: new Date().toISOString(),
        })
        .eq('id', existingInsight.id);

      if (updateError) {
        console.error('[Realtime Analysis] Update error:', updateError);
      }
    } else {
      // Insert new
      const { error: insertError } = await supabase
        .from('interview_insights' as any)
        .insert({
          meeting_id: meetingId,
          communication_clarity: scores.communication_clarity,
          technical_depth: scores.technical_depth,
          culture_fit: scores.culture_fit,
          red_flags: scores.red_flags || [],
          green_flags: scores.green_flags || [],
          overall_score: scores.overall_score,
          key_insights: scores.key_insights,
          follow_up_suggestions: scores.follow_up_suggestions || [],
          last_analyzed_at: new Date().toISOString(),
        });

      if (insertError) {
        console.error('[Realtime Analysis] Insert error:', insertError);
      }
    }

    console.log('[Realtime Analysis] Successfully updated scores');

    return new Response(JSON.stringify({ success: true, scores }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[Realtime Analysis] Error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
