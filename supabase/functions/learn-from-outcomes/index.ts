import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface OutcomeData {
  entity_type: 'placement' | 'deal' | 'hire' | 'referral';
  entity_id: string;
  outcome_type: 'success' | 'failure';
  success_metrics?: Record<string, any>;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const { outcome_data }: { outcome_data: OutcomeData } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const supabase = createClient(supabaseUrl, supabaseKey);

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    console.log(`📊 Learning from outcome: ${outcome_data.entity_type} - ${outcome_data.outcome_type}`);

    // Fetch all communications related to this entity
    const { data: communications } = await supabase
      .from('unified_communications')
      .select('*')
      .eq('entity_id', outcome_data.entity_id)
      .order('original_timestamp', { ascending: true });

    if (!communications || communications.length === 0) {
      console.log("No communications found for entity");
      return new Response(
        JSON.stringify({ success: true, patterns_learned: 0, message: "No communications to analyze" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch related emails for richer context
    const { data: emails } = await supabase
      .from('emails')
      .select('subject, snippet, from_email, ai_category, ai_priority_score, email_date')
      .order('email_date', { ascending: true })
      .limit(50);

    // Fetch meetings
    const { data: meetings } = await supabase
      .from('meetings')
      .select('title, description, start_time, meeting_type, ai_summary, action_items')
      .order('start_time', { ascending: true })
      .limit(20);

    // Build communication timeline for analysis
    const timeline = communications.map(c => ({
      channel: c.channel,
      direction: c.direction,
      preview: c.content_preview?.substring(0, 200),
      sentiment: c.sentiment_score,
      timestamp: c.original_timestamp,
      daysFromStart: 0 // Will calculate below
    }));

    if (timeline.length > 0) {
      const startDate = new Date(timeline[0].timestamp).getTime();
      timeline.forEach(t => {
        t.daysFromStart = Math.round((new Date(t.timestamp).getTime() - startDate) / (1000 * 60 * 60 * 24));
      });
    }

    // Use AI to extract patterns
    const analysisPrompt = `You are an expert recruiter and business analyst. Analyze this communication timeline that led to a ${outcome_data.outcome_type} ${outcome_data.entity_type}.

COMMUNICATION TIMELINE:
${JSON.stringify(timeline, null, 2)}

${emails?.length ? `\nEMAIL CONTEXT:\n${emails.slice(0, 10).map(e => `- ${e.subject}: ${e.snippet?.substring(0, 100)}...`).join('\n')}` : ''}

${meetings?.length ? `\nMEETING CONTEXT:\n${meetings.slice(0, 5).map(m => `- ${m.title}: ${m.ai_summary?.substring(0, 100) || m.description?.substring(0, 100) || 'No summary'}...`).join('\n')}` : ''}

Extract the SUCCESS PATTERNS that contributed to this ${outcome_data.outcome_type}:

1. TIMING PATTERNS: What was the cadence? How quickly were responses sent?
2. CHANNEL EFFECTIVENESS: Which channels worked best?
3. CONTENT PATTERNS: What messaging approaches were used?
4. RELATIONSHIP SIGNALS: What sentiment patterns emerged?
5. MILESTONE MARKERS: What key moments indicated progress?

For each pattern, provide:
- A clear description
- Confidence score (0-1)
- Whether it's replicable
- Recommended actions for similar situations`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are an expert at analyzing business communication patterns. Extract actionable insights from communication timelines." },
          { role: "user", content: analysisPrompt }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "store_success_patterns",
              description: "Store identified success patterns from the communication analysis",
              parameters: {
                type: "object",
                properties: {
                  patterns: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        pattern_type: { 
                          type: "string", 
                          enum: ["timing", "channel", "content", "relationship", "milestone"]
                        },
                        description: { type: "string" },
                        confidence_score: { type: "number", minimum: 0, maximum: 1 },
                        is_replicable: { type: "boolean" },
                        recommended_actions: {
                          type: "array",
                          items: { type: "string" }
                        },
                        applicable_to: {
                          type: "array",
                          items: { 
                            type: "string",
                            enum: ["placements", "deals", "hires", "referrals", "all"]
                          }
                        }
                      },
                      required: ["pattern_type", "description", "confidence_score", "is_replicable"]
                    }
                  },
                  overall_success_rate: { type: "number" },
                  key_takeaways: { 
                    type: "array",
                    items: { type: "string" }
                  }
                },
                required: ["patterns", "key_takeaways"]
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "store_success_patterns" } }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", errorText);
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const toolCall = aiResponse.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall) {
      console.log("No patterns extracted from AI");
      return new Response(
        JSON.stringify({ success: true, patterns_learned: 0, message: "No patterns could be extracted" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const patternsData = JSON.parse(toolCall.function.arguments);
    let patternsStored = 0;

    // Store each pattern
    for (const pattern of patternsData.patterns || []) {
      // Check if similar pattern already exists
      const { data: existingPattern } = await supabase
        .from('success_patterns')
        .select('id, sample_size, success_rate, pattern_data')
        .eq('pattern_type', pattern.pattern_type)
        .ilike('pattern_description', `%${pattern.description.substring(0, 50)}%`)
        .maybeSingle();

      if (existingPattern) {
        // Update existing pattern with increased sample size
        const newSampleSize = (existingPattern.sample_size || 1) + 1;
        const currentSuccessCount = Math.round((existingPattern.success_rate || 0) * (existingPattern.sample_size || 1));
        const newSuccessCount = outcome_data.outcome_type === 'success' ? currentSuccessCount + 1 : currentSuccessCount;
        const newSuccessRate = newSuccessCount / newSampleSize;

        await supabase
          .from('success_patterns')
          .update({
            sample_size: newSampleSize,
            success_rate: newSuccessRate,
            confidence_score: (pattern.confidence_score + (existingPattern.pattern_data?.confidence_score || 0.5)) / 2,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingPattern.id);

        console.log(`📈 Updated existing pattern: ${pattern.pattern_type}`);
      } else {
        // Create new pattern
        await supabase
          .from('success_patterns')
          .insert({
            pattern_type: pattern.pattern_type,
            pattern_description: pattern.description,
            context_entity_type: outcome_data.entity_type,
            sample_size: 1,
            success_rate: outcome_data.outcome_type === 'success' ? 1.0 : 0.0,
            confidence_score: pattern.confidence_score,
            is_active: true,
            pattern_data: {
              confidence_score: pattern.confidence_score,
              is_replicable: pattern.is_replicable,
              recommended_actions: pattern.recommended_actions || [],
              applicable_to: pattern.applicable_to || ['all'],
              key_takeaways: patternsData.key_takeaways || []
            }
          });

        patternsStored++;
        console.log(`✅ Stored new pattern: ${pattern.pattern_type} - ${pattern.description.substring(0, 50)}...`);
      }
    }

    // Log this learning action
    await supabase
      .from('ai_action_audit')
      .insert({
        action_type: 'learn_from_outcome',
        actor_type: 'ai',
        actor_id: 'learn-from-outcomes',
        target_entity_type: outcome_data.entity_type,
        target_entity_id: outcome_data.entity_id,
        action_details: {
          outcome_type: outcome_data.outcome_type,
          communications_analyzed: communications.length,
          patterns_extracted: patternsData.patterns?.length || 0,
          patterns_stored: patternsStored,
          key_takeaways: patternsData.key_takeaways
        },
        context_used: {
          email_count: emails?.length || 0,
          meeting_count: meetings?.length || 0
        },
        outcome: 'success',
        duration_ms: Date.now() - startTime
      });

    return new Response(
      JSON.stringify({
        success: true,
        patterns_learned: patternsStored,
        patterns_updated: (patternsData.patterns?.length || 0) - patternsStored,
        key_takeaways: patternsData.key_takeaways,
        processing_time_ms: Date.now() - startTime
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("learn-from-outcomes error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
