import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ExtractedFact {
  fact: string;
  category: 'preference' | 'commitment' | 'deadline' | 'budget' | 'relationship' | 'skill' | 'general';
  confidence: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { communication_id, batch_mode = false, limit = 50 } = await req.json();

    let communicationsToProcess = [];

    if (batch_mode) {
      // Process multiple communications that haven't been analyzed yet
      const { data, error } = await supabase
        .from('unified_communications')
        .select('*')
        .not('content_preview', 'is', null)
        .order('original_timestamp', { ascending: false })
        .limit(limit);

      if (error) throw error;
      communicationsToProcess = data || [];
    } else if (communication_id) {
      // Process single communication
      const { data, error } = await supabase
        .from('unified_communications')
        .select('*')
        .eq('id', communication_id)
        .single();

      if (error) throw error;
      if (data) communicationsToProcess = [data];
    } else {
      return new Response(
        JSON.stringify({ error: 'Either communication_id or batch_mode is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let totalFacts = 0;
    const results = [];

    for (const comm of communicationsToProcess) {
      // Skip if content is too short
      if (!comm.content_preview || comm.content_preview.length < 30) {
        continue;
      }

      try {
        // Build extraction prompt
        const extractionPrompt = `You are an expert at extracting key facts from professional communications.

Analyze this ${comm.channel} communication and extract important facts that would be valuable to remember for future interactions.

Communication:
${comm.subject ? `Subject: ${comm.subject}\n` : ''}
${comm.content_preview}

Extract facts in these categories:
- preference: Communication preferences, work style preferences, timing preferences
- commitment: Promises made, agreements, action items
- deadline: Important dates, timelines, deadlines mentioned
- budget: Salary expectations, budget constraints, compensation details
- relationship: Rapport indicators, concerns, objections, relationship status
- skill: Skills mentioned, experience, qualifications
- general: Other important facts worth remembering

Return ONLY a valid JSON array of objects with these fields:
- fact: A clear, concise statement of the fact (max 100 chars)
- category: One of the categories above
- confidence: A number between 0 and 1 indicating how confident you are

Example output:
[{"fact": "Prefers morning meetings before 10am", "category": "preference", "confidence": 0.9}]

If no significant facts can be extracted, return an empty array: []`;

        // Call AI for extraction
        const aiResponse = await fetch(
          `${supabaseUrl}/functions/v1/club-ai-chat`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${supabaseServiceKey}`,
            },
            body: JSON.stringify({
              message: extractionPrompt,
              context: { 
                extractionMode: true, 
                systemOnly: true,
                skipMemory: true
              }
            }),
          }
        );

        if (!aiResponse.ok) {
          console.warn(`AI extraction failed for ${comm.id}`);
          continue;
        }

        const aiData = await aiResponse.json();
        
        // Parse extracted facts
        const factsMatch = aiData.response?.match(/\[[\s\S]*?\]/);
        if (!factsMatch) continue;

        const facts: ExtractedFact[] = JSON.parse(factsMatch[0]);
        
        // Store high-confidence facts in ai_memory
        for (const fact of facts) {
          if (fact.confidence >= 0.6 && comm.entity_id) {
            // Check for duplicates
            const { data: existing } = await supabase
              .from('ai_memory')
              .select('id, content')
              .eq('user_id', comm.entity_id)
              .eq('memory_type', fact.category)
              .ilike('content', `%${fact.fact.substring(0, 50)}%`)
              .limit(1);

            if (!existing || existing.length === 0) {
              await supabase.from('ai_memory').insert({
                user_id: comm.entity_id,
                memory_type: fact.category,
                content: fact.fact,
                context: {
                  source: 'communication_extraction',
                  channel: comm.channel,
                  communication_id: comm.id,
                  original_timestamp: comm.original_timestamp,
                  extracted_at: new Date().toISOString()
                },
                relevance_score: fact.confidence
              });

              totalFacts++;
            }
          }
        }

        results.push({
          communication_id: comm.id,
          channel: comm.channel,
          facts_extracted: facts.length,
          facts_stored: facts.filter(f => f.confidence >= 0.6).length
        });

      } catch (parseError) {
        console.warn(`Failed to process ${comm.id}:`, parseError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        communications_processed: communicationsToProcess.length,
        total_facts_stored: totalFacts,
        results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in extract-communication-facts:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
