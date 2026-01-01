import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MemoryExtraction {
  stakeholder_id: string;
  memory_type: string;
  content: string;
  context: string;
  source_type: string;
  source_id: string;
  confidence_score: number;
  tags: string[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { source_type, source_id, content, stakeholder_id } = await req.json();

    if (!content) {
      throw new Error('content is required');
    }

    console.log('[Memory Extraction] Processing:', source_type, source_id);

    const memories: MemoryExtraction[] = [];
    const contentLower = content.toLowerCase();

    // Pattern matching for different memory types
    const patterns: Record<string, Array<{ regex: RegExp; type: string; tag?: string }>> = {
      preference: [
        { regex: /prefer(?:s|red)?\s+(.+?)(?:\.|,|$)/gi, type: 'preference' },
        { regex: /like(?:s)?\s+(.+?)(?:\.|,|$)/gi, type: 'preference' },
        { regex: /want(?:s)?\s+(.+?)(?:\.|,|$)/gi, type: 'preference' },
        { regex: /looking for\s+(.+?)(?:\.|,|$)/gi, type: 'preference' },
        { regex: /need(?:s)?\s+(.+?)(?:\.|,|$)/gi, type: 'preference' },
      ],
      quote: [
        { regex: /"([^"]+)"/g, type: 'quote' },
        { regex: /said[:\s]+"?([^"]+)"?(?:\.|,|$)/gi, type: 'quote' },
        { regex: /mentioned[:\s]+"?([^"]+)"?(?:\.|,|$)/gi, type: 'quote' },
      ],
      commitment: [
        { regex: /will\s+(.+?)(?:\.|,|$)/gi, type: 'commitment' },
        { regex: /promised\s+(.+?)(?:\.|,|$)/gi, type: 'commitment' },
        { regex: /agreed to\s+(.+?)(?:\.|,|$)/gi, type: 'commitment' },
        { regex: /committed to\s+(.+?)(?:\.|,|$)/gi, type: 'commitment' },
        { regex: /by\s+(monday|tuesday|wednesday|thursday|friday|next week|end of week|tomorrow)/gi, type: 'commitment' },
      ],
      objection: [
        { regex: /concern(?:ed)?\s+(?:about|with)\s+(.+?)(?:\.|,|$)/gi, type: 'objection' },
        { regex: /worried\s+(?:about|that)\s+(.+?)(?:\.|,|$)/gi, type: 'objection' },
        { regex: /issue(?:s)?\s+with\s+(.+?)(?:\.|,|$)/gi, type: 'objection' },
        { regex: /problem(?:s)?\s+with\s+(.+?)(?:\.|,|$)/gi, type: 'objection' },
        { regex: /not sure (?:about|if)\s+(.+?)(?:\.|,|$)/gi, type: 'objection' },
      ],
      insight: [
        { regex: /budget(?:\s+is)?\s+(?:around|about|approximately)?\s*€?(\d+[k|K|m|M]?)/gi, type: 'insight', tag: 'budget' },
        { regex: /timeline(?:\s+is)?\s+(.+?)(?:\.|,|$)/gi, type: 'insight', tag: 'timeline' },
        { regex: /decision(?:\s+by)?\s+(.+?)(?:\.|,|$)/gi, type: 'insight', tag: 'timeline' },
        { regex: /competitor(?:s)?[:\s]+(.+?)(?:\.|,|$)/gi, type: 'insight', tag: 'competitor' },
        { regex: /using\s+(.+?)\s+(?:currently|now|at the moment)/gi, type: 'insight', tag: 'current_tools' },
      ],
      pattern: [
        { regex: /always\s+(.+?)(?:\.|,|$)/gi, type: 'pattern' },
        { regex: /never\s+(.+?)(?:\.|,|$)/gi, type: 'pattern' },
        { regex: /usually\s+(.+?)(?:\.|,|$)/gi, type: 'pattern' },
        { regex: /typically\s+(.+?)(?:\.|,|$)/gi, type: 'pattern' },
      ]
    };

    // Extract memories using patterns
    for (const [memoryType, patternList] of Object.entries(patterns)) {
      for (const pattern of patternList) {
        let match;
        while ((match = pattern.regex.exec(content)) !== null) {
          const extractedContent = match[1]?.trim();
          if (extractedContent && extractedContent.length > 5 && extractedContent.length < 500) {
            memories.push({
              stakeholder_id: stakeholder_id || '',
              memory_type: memoryType,
              content: extractedContent,
              context: match[0],
              source_type: source_type || 'unknown',
              source_id: source_id || '',
              confidence_score: calculateConfidence(match[0], extractedContent),
              tags: pattern.tag ? [pattern.tag] : []
            });
          }
        }
      }
    }

    // Detect communication style preferences
    const communicationPatterns = {
      prefers_email: /prefer(?:s)?\s+email/i.test(contentLower),
      prefers_call: /prefer(?:s)?\s+(?:call|phone)/i.test(contentLower),
      prefers_whatsapp: /prefer(?:s)?\s+(?:whatsapp|text|message)/i.test(contentLower),
      prefers_morning: /(?:morning|early|before\s+\d)/i.test(contentLower),
      prefers_afternoon: /(?:afternoon|after\s+lunch)/i.test(contentLower),
      busy_schedule: /(?:busy|tight\s+schedule|limited\s+time)/i.test(contentLower),
      decision_maker: /(?:I\s+decide|my\s+decision|I\s+approve)/i.test(contentLower),
      influencer: /(?:I\s+recommend|I\s+suggest\s+to|I\s+advise)/i.test(contentLower),
    };

    for (const [pattern, detected] of Object.entries(communicationPatterns)) {
      if (detected) {
        memories.push({
          stakeholder_id: stakeholder_id || '',
          memory_type: 'pattern',
          content: pattern.replace(/_/g, ' '),
          context: `Detected from content analysis`,
          source_type: source_type || 'unknown',
          source_id: source_id || '',
          confidence_score: 0.7,
          tags: ['communication', pattern]
        });
      }
    }

    // If we have a stakeholder_id, save the memories
    if (stakeholder_id && memories.length > 0) {
      const memoriesWithStakeholder = memories
        .filter(m => m.content.length > 5)
        .map(m => ({
          ...m,
          stakeholder_id,
          created_at: new Date().toISOString()
        }));

      const { error } = await supabase
        .from('stakeholder_memory')
        .insert(memoriesWithStakeholder);

      if (error) {
        console.error('[Memory Extraction] Insert error:', error);
      } else {
        console.log('[Memory Extraction] Saved', memoriesWithStakeholder.length, 'memories');
      }
    }

    // Also try to find stakeholder from context if not provided
    if (!stakeholder_id && source_type === 'meeting' && source_id) {
      const { data: meeting } = await supabase
        .from('meetings')
        .select(`
          company_id,
          meeting_participants(external_email, external_name)
        `)
        .eq('id', source_id)
        .single();

      if (meeting?.company_id) {
        // Try to match participants to stakeholders
        const participants = meeting.meeting_participants || [];
        for (const participant of participants) {
          if (participant.external_email || participant.external_name) {
            const { data: stakeholder } = await supabase
              .from('company_stakeholders')
              .select('id')
              .eq('company_id', meeting.company_id)
              .or(`email.eq.${participant.external_email},name.ilike.%${participant.external_name}%`)
              .single();

            if (stakeholder && memories.length > 0) {
              // Attribute memories to this stakeholder
              const { error } = await supabase
                .from('stakeholder_memory')
                .insert(
                  memories.map(m => ({
                    ...m,
                    stakeholder_id: stakeholder.id,
                    created_at: new Date().toISOString()
                  }))
                );

              if (!error) {
                console.log('[Memory Extraction] Attributed', memories.length, 'memories to stakeholder', stakeholder.id);
              }
            }
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        memories_extracted: memories.length,
        memories: memories.map(m => ({
          type: m.memory_type,
          content: m.content.substring(0, 100),
          confidence: m.confidence_score,
          tags: m.tags
        }))
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Memory Extraction] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function calculateConfidence(fullMatch: string, extracted: string): number {
  let confidence = 0.6;
  
  // Longer, more specific content = higher confidence
  if (extracted.length > 20) confidence += 0.1;
  if (extracted.length > 50) confidence += 0.1;
  
  // Quotes have higher confidence
  if (fullMatch.includes('"')) confidence += 0.15;
  
  // Contains specific details (numbers, names, dates)
  if (/\d/.test(extracted)) confidence += 0.05;
  if (/[A-Z][a-z]+/.test(extracted)) confidence += 0.05;
  
  return Math.min(0.95, confidence);
}
