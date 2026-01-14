import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";
import { publicCorsHeaders } from "../_shared/cors-config.ts";

const corsHeaders = publicCorsHeaders;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, sourceId, sourceType } = await req.json();
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableKey = Deno.env.get('LOVABLE_API_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Use LLM for NER extraction
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `Extract entities and relationships from the text. Return JSON:
{
  "entities": [{"id": "uuid", "name": "string", "type": "person|company|skill|role|location|product"}],
  "relationships": [{"source": "entity_name", "target": "entity_name", "type": "works_at|has_skill|manages|reports_to|located_in|knows", "confidence": 0.0-1.0}]
}`
          },
          { role: 'user', content: text.substring(0, 8000) }
        ],
        tools: [{
          type: 'function',
          function: {
            name: 'extract_entities',
            parameters: {
              type: 'object',
              properties: {
                entities: { type: 'array', items: { type: 'object', properties: { id: { type: 'string' }, name: { type: 'string' }, type: { type: 'string' } } } },
                relationships: { type: 'array', items: { type: 'object', properties: { source: { type: 'string' }, target: { type: 'string' }, type: { type: 'string' }, confidence: { type: 'number' } } } }
              }
            }
          }
        }],
        tool_choice: { type: 'function', function: { name: 'extract_entities' } }
      }),
    });

    const result = await response.json();
    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall) {
      return new Response(JSON.stringify({ entities: [], relationships: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    interface ExtractedEntity {
      id: string;
      name: string;
      type: string;
    }
    
    const extracted = JSON.parse(toolCall.function.arguments);
    
    // Store relationships in database
    const entityMap = new Map<string, ExtractedEntity>(
      extracted.entities.map((e: any) => [e.name, { ...e, id: crypto.randomUUID() }])
    );
    
    for (const rel of extracted.relationships || []) {
      const source = entityMap.get(rel.source);
      const target = entityMap.get(rel.target);
      
      if (source && target) {
        await supabase.from('ner_entity_relationships').insert({
          source_entity_id: source.id,
          source_entity_type: source.type,
          source_entity_name: source.name,
          relationship_type: rel.type,
          target_entity_id: target.id,
          target_entity_type: target.type,
          target_entity_name: target.name,
          confidence_score: rel.confidence || 0.7,
          extraction_source: 'ner',
          evidence_source_id: sourceId || null,
          evidence_text: text.substring(0, 500)
        });
      }
    }

    return new Response(JSON.stringify({
      entities: Array.from(entityMap.values()),
      relationships: extracted.relationships,
      stored: true
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('NER extraction error:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
