import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { meetingId, transcript } = await req.json();
    
    if (!meetingId || !transcript) {
      return new Response(JSON.stringify({ error: 'Missing meetingId or transcript' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseKey);

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

    const scores = JSON.parse(toolCall.function.arguments);
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
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
