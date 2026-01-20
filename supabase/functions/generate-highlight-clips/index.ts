import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface HighlightMoment {
  timestamp_ms: number;
  end_timestamp_ms: number;
  type: string;
  title: string;
  reasoning: string;
  confidence: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { recordingId } = await req.json();
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log(`Generating highlight clips for recording: ${recordingId}`);

    // Fetch recording with transcript
    const { data: recording, error: recError } = await supabase
      .from("meeting_recordings_extended")
      .select("*")
      .eq("id", recordingId)
      .single();

    if (recError || !recording) {
      throw new Error("Recording not found");
    }

    if (!recording.transcript_json && !recording.transcript) {
      throw new Error("No transcript available for highlight detection");
    }

    const transcriptJson = recording.transcript_json || [];
    const fullTranscript = recording.transcript || 
      transcriptJson.map((s: any) => `${s.speaker}: ${s.text}`).join('\n');

    // Use AI to identify highlight moments
    const systemPrompt = `You are an expert interview analyst. Analyze this meeting transcript and identify the most important highlight moments that should be clipped and shared.

Focus on:
1. **Strong Answers** - When the candidate gives an impressive, well-structured response
2. **Red Flags** - Concerning statements, evasiveness, or contradictions
3. **Key Decisions** - Important agreements, commitments, or pivotal discussion points
4. **Cultural Fit Moments** - Reveals about values, work style, or team dynamics
5. **Technical Excellence** - Demonstrations of deep expertise or problem-solving

For each highlight, provide:
- Start and end timestamps (use existing timestamps from transcript segments)
- Type (strong_answer, red_flag, key_decision, cultural_fit, technical_excellence)
- A short title (under 50 chars)
- Reasoning for why this is a highlight
- Confidence score (0-1)

Return a JSON array of highlights, ordered by importance.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Transcript:\n${fullTranscript}\n\nTranscript segments with timestamps:\n${JSON.stringify(transcriptJson.slice(0, 100))}` }
        ],
        tools: [{
          type: "function",
          function: {
            name: "identify_highlights",
            description: "Identify key highlight moments from the interview",
            parameters: {
              type: "object",
              properties: {
                highlights: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      timestamp_ms: { type: "number" },
                      end_timestamp_ms: { type: "number" },
                      type: { 
                        type: "string", 
                        enum: ["strong_answer", "red_flag", "key_decision", "cultural_fit", "technical_excellence"] 
                      },
                      title: { type: "string" },
                      reasoning: { type: "string" },
                      confidence: { type: "number" }
                    },
                    required: ["timestamp_ms", "end_timestamp_ms", "type", "title", "reasoning", "confidence"]
                  }
                }
              },
              required: ["highlights"]
            }
          }
        }],
        tool_choice: { type: "function", function: { name: "identify_highlights" } }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI API error:", errorText);
      throw new Error("Failed to analyze transcript for highlights");
    }

    const aiResult = await response.json();
    const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];
    
    let highlights: HighlightMoment[] = [];
    if (toolCall?.function?.arguments) {
      const parsed = JSON.parse(toolCall.function.arguments);
      highlights = parsed.highlights || [];
    }

    console.log(`Found ${highlights.length} highlight moments`);

    // Create clip records for each highlight
    const createdClips = [];
    for (const highlight of highlights.slice(0, 10)) { // Max 10 clips per recording
      // Find the transcript text for this clip
      const clipSegments = transcriptJson.filter((s: any) => 
        s.timestamp_ms >= highlight.timestamp_ms && 
        s.timestamp_ms <= highlight.end_timestamp_ms
      );
      const clipText = clipSegments.map((s: any) => `${s.speaker}: ${s.text}`).join('\n');

      const { data: clip, error: clipError } = await supabase
        .from("meeting_clips")
        .insert({
          recording_id: recordingId,
          created_by: recording.created_by || null,
          title: highlight.title,
          description: highlight.reasoning,
          start_time_ms: highlight.timestamp_ms,
          end_time_ms: highlight.end_timestamp_ms,
          transcript_excerpt: clipText.slice(0, 2000),
          ai_generated: true,
          highlight_type: highlight.type,
          ai_reasoning: highlight.reasoning,
          confidence_score: highlight.confidence
        })
        .select()
        .single();

      if (!clipError && clip) {
        createdClips.push(clip);
      }
    }

    console.log(`Created ${createdClips.length} highlight clips`);

    return new Response(
      JSON.stringify({
        success: true,
        highlights: highlights.length,
        clips: createdClips
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error generating highlights:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
