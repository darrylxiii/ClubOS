import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type IntentType = 'informational' | 'navigational' | 'transactional' | 'comparison' | 'entity_lookup';

interface QueryIntent {
  intent_type: IntentType;
  confidence: number;
  sub_intents: string[];
  entities_detected: EntityMention[];
  specialized_retriever: string;
  routing_hints: RoutingHints;
}

interface EntityMention {
  text: string;
  type: 'candidate' | 'company' | 'job' | 'person' | 'skill' | 'date' | 'location';
  start: number;
  end: number;
}

interface RoutingHints {
  primary_entity_type: string | null;
  search_scope: 'narrow' | 'medium' | 'broad';
  time_relevance: 'recent' | 'historical' | 'any';
  result_format: 'list' | 'single' | 'comparison' | 'summary';
}

// Crypto hash function for caching
async function hashQuery(query: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(query.toLowerCase().trim());
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { query, use_cache = true } = await req.json();

    if (!query || typeof query !== 'string') {
      return new Response(JSON.stringify({ error: 'Query is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const queryHash = await hashQuery(query);

    // Check cache first
    if (use_cache) {
      const { data: cached } = await supabase
        .from('query_intent_cache')
        .select('*')
        .eq('query_hash', queryHash)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (cached) {
        // Update hit count
        await supabase
          .from('query_intent_cache')
          .update({ cache_hits: cached.cache_hits + 1 })
          .eq('id', cached.id);

        return new Response(JSON.stringify({
          ...cached,
          from_cache: true,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Classify the query
    const intent = await classifyIntent(query);

    // Cache the result
    await supabase
      .from('query_intent_cache')
      .upsert({
        query_hash: queryHash,
        query_text: query,
        intent_type: intent.intent_type,
        confidence: intent.confidence,
        sub_intents: intent.sub_intents,
        entities_detected: intent.entities_detected,
        specialized_retriever: intent.specialized_retriever,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      }, { onConflict: 'query_hash' });

    return new Response(JSON.stringify({
      ...intent,
      query_hash: queryHash,
      from_cache: false,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('Intent classification error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function classifyIntent(query: string): Promise<QueryIntent> {
  const queryLower = query.toLowerCase().trim();
  
  // Extract entities first
  const entities = extractEntities(query);
  
  // Determine intent based on patterns
  const { intent_type, confidence, sub_intents } = determineIntent(queryLower, entities);
  
  // Get routing hints
  const routing_hints = getRoutingHints(intent_type, entities, queryLower);
  
  // Determine specialized retriever
  const specialized_retriever = getSpecializedRetriever(intent_type, routing_hints);

  return {
    intent_type,
    confidence,
    sub_intents,
    entities_detected: entities,
    specialized_retriever,
    routing_hints,
  };
}

function extractEntities(query: string): EntityMention[] {
  const entities: EntityMention[] = [];
  
  // Candidate/person name patterns (capitalized words)
  const namePattern = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\b/g;
  let match;
  while ((match = namePattern.exec(query)) !== null) {
    entities.push({
      text: match[1],
      type: 'candidate',
      start: match.index,
      end: match.index + match[1].length,
    });
  }

  // Company patterns
  const companyPatterns = [
    /\b(at|from|for|with)\s+([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+)*)\b/gi,
    /\b([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+)*)\s+(company|inc|corp|ltd|gmbh|bv)\b/gi,
  ];
  
  for (const pattern of companyPatterns) {
    while ((match = pattern.exec(query)) !== null) {
      const companyName = match[2] || match[1];
      if (companyName && !entities.some(e => e.text === companyName)) {
        entities.push({
          text: companyName,
          type: 'company',
          start: match.index,
          end: match.index + match[0].length,
        });
      }
    }
  }

  // Job title patterns
  const jobPatterns = [
    /\b(senior|junior|lead|head of|chief|principal|staff)\s+\w+\s*(engineer|developer|designer|manager|analyst|scientist|architect)/gi,
    /\b(CTO|CEO|CFO|COO|VP|Director|Manager)\b/g,
  ];
  
  for (const pattern of jobPatterns) {
    while ((match = pattern.exec(query)) !== null) {
      entities.push({
        text: match[0],
        type: 'job',
        start: match.index,
        end: match.index + match[0].length,
      });
    }
  }

  // Skill patterns
  const skillPatterns = /\b(python|java|javascript|typescript|react|node|aws|gcp|azure|kubernetes|docker|sql|nosql|machine learning|ai|ml|data science|product management)\b/gi;
  while ((match = skillPatterns.exec(query)) !== null) {
    entities.push({
      text: match[0],
      type: 'skill',
      start: match.index,
      end: match.index + match[0].length,
    });
  }

  // Date patterns
  const datePatterns = /\b(today|yesterday|last week|this week|last month|this month|\d{1,2}\/\d{1,2}\/\d{2,4}|\d{4}-\d{2}-\d{2})\b/gi;
  while ((match = datePatterns.exec(query)) !== null) {
    entities.push({
      text: match[0],
      type: 'date',
      start: match.index,
      end: match.index + match[0].length,
    });
  }

  // Location patterns
  const locationPatterns = /\b(remote|hybrid|on-?site|amsterdam|london|new york|san francisco|berlin|paris|singapore)\b/gi;
  while ((match = locationPatterns.exec(query)) !== null) {
    entities.push({
      text: match[0],
      type: 'location',
      start: match.index,
      end: match.index + match[0].length,
    });
  }

  return entities;
}

function determineIntent(
  query: string, 
  entities: EntityMention[]
): { intent_type: IntentType; confidence: number; sub_intents: string[] } {
  const sub_intents: string[] = [];
  let intent_type: IntentType = 'informational';
  let confidence = 0.5;

  // Entity lookup - looking for specific entity
  if (entities.length > 0 && entities.some(e => e.type === 'candidate')) {
    if (/\b(find|get|show|lookup|profile|details|info|about)\b/i.test(query)) {
      intent_type = 'entity_lookup';
      confidence = 0.9;
      sub_intents.push('candidate_lookup');
    }
  }

  // Navigational - going to specific place/action
  if (/\b(go to|open|navigate|show me|take me to)\b/i.test(query)) {
    intent_type = 'navigational';
    confidence = 0.85;
    sub_intents.push('navigation');
  }

  // Transactional - performing an action
  if (/\b(schedule|book|send|create|add|update|delete|remove|submit|apply|invite)\b/i.test(query)) {
    intent_type = 'transactional';
    confidence = 0.9;
    if (/schedule|book/i.test(query)) sub_intents.push('scheduling');
    if (/send/i.test(query)) sub_intents.push('messaging');
    if (/create|add/i.test(query)) sub_intents.push('creation');
    if (/apply|submit/i.test(query)) sub_intents.push('application');
  }

  // Comparison - comparing entities
  if (/\b(compare|versus|vs\.?|difference|better|between|or)\b/i.test(query)) {
    intent_type = 'comparison';
    confidence = 0.85;
    sub_intents.push('entity_comparison');
  }

  // Informational patterns (default fallback with more specificity)
  if (intent_type === 'informational') {
    if (/\b(who|what|why|how|when|where|which|explain|tell me|describe)\b/i.test(query)) {
      confidence = 0.8;
      if (/who/i.test(query)) sub_intents.push('person_info');
      if (/what/i.test(query)) sub_intents.push('definition');
      if (/how/i.test(query)) sub_intents.push('process');
      if (/why/i.test(query)) sub_intents.push('reasoning');
    }
    
    if (/\b(list|all|candidates?|jobs?|companies?)\b/i.test(query)) {
      sub_intents.push('listing');
    }
    
    if (/\b(best|top|recommend|suggest|suitable)\b/i.test(query)) {
      sub_intents.push('recommendation');
      confidence = 0.75;
    }
  }

  return { intent_type, confidence, sub_intents };
}

function getRoutingHints(
  intent_type: IntentType, 
  entities: EntityMention[],
  query: string
): RoutingHints {
  // Determine primary entity type
  let primary_entity_type: string | null = null;
  if (entities.length > 0) {
    const entityTypes = entities.map(e => e.type);
    if (entityTypes.includes('candidate')) primary_entity_type = 'candidate';
    else if (entityTypes.includes('job')) primary_entity_type = 'job';
    else if (entityTypes.includes('company')) primary_entity_type = 'company';
  }

  // Determine search scope
  let search_scope: 'narrow' | 'medium' | 'broad' = 'medium';
  if (intent_type === 'entity_lookup' && entities.length > 0) {
    search_scope = 'narrow';
  } else if (intent_type === 'informational' && /all|every|list/i.test(query)) {
    search_scope = 'broad';
  }

  // Determine time relevance
  let time_relevance: 'recent' | 'historical' | 'any' = 'any';
  if (/\b(recent|latest|today|yesterday|this week|last week|new)\b/i.test(query)) {
    time_relevance = 'recent';
  } else if (/\b(history|past|previous|earlier|before|old)\b/i.test(query)) {
    time_relevance = 'historical';
  }

  // Determine result format
  let result_format: 'list' | 'single' | 'comparison' | 'summary' = 'summary';
  if (intent_type === 'entity_lookup') {
    result_format = 'single';
  } else if (intent_type === 'comparison') {
    result_format = 'comparison';
  } else if (/\b(list|all|candidates?|jobs?)\b/i.test(query)) {
    result_format = 'list';
  }

  return {
    primary_entity_type,
    search_scope,
    time_relevance,
    result_format,
  };
}

function getSpecializedRetriever(
  intent_type: IntentType, 
  hints: RoutingHints
): string {
  // Route to specialized retrievers based on intent and context
  if (intent_type === 'entity_lookup') {
    switch (hints.primary_entity_type) {
      case 'candidate': return 'candidate_profile_retriever';
      case 'job': return 'job_detail_retriever';
      case 'company': return 'company_info_retriever';
      default: return 'entity_search_retriever';
    }
  }

  if (intent_type === 'transactional') {
    return 'action_context_retriever';
  }

  if (intent_type === 'comparison') {
    return 'multi_entity_retriever';
  }

  if (intent_type === 'navigational') {
    return 'navigation_retriever';
  }

  // Default informational
  if (hints.time_relevance === 'recent') {
    return 'recent_interactions_retriever';
  }

  return 'semantic_search_retriever';
}
