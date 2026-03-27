import { createHandler } from '../_shared/handler.ts';

Deno.serve(createHandler(async (req, ctx) => {
  const { text, sourceId, sourceType } = await req.json();

  const googleApiKey = Deno.env.get('GOOGLE_API_KEY')!;

    // Use LLM for NER extraction
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${googleApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gemini-2.5-flash-lite',
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
        headers: { ...ctx.corsHeaders, 'Content-Type': 'application/json' },
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
        await ctx.supabase.from('ner_entity_relationships').insert({
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
      headers: { ...ctx.corsHeaders, 'Content-Type': 'application/json' },
    });

}));
