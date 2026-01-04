import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface MemoryOperation {
  operation: 'store' | 'retrieve' | 'update_importance' | 'learn_preference' | 'get_context' | 'consolidate' | 'decay';
  userId: string;
  data?: any;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { operation, userId, data } = await req.json() as MemoryOperation;
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let result: any;

    switch (operation) {
      case 'store':
        result = await storeMemory(supabase, userId, data);
        break;
      case 'retrieve':
        result = await retrieveMemories(supabase, userId, data);
        break;
      case 'update_importance':
        result = await updateImportance(supabase, userId, data);
        break;
      case 'learn_preference':
        result = await learnPreference(supabase, userId, data);
        break;
      case 'get_context':
        result = await getFullContext(supabase, userId, data);
        break;
      case 'consolidate':
        result = await consolidateMemories(supabase, userId);
        break;
      case 'decay':
        result = await applyMemoryDecay(supabase, userId);
        break;
      default:
        throw new Error(`Unknown operation: ${operation}`);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("Agent Memory Manager error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// Store a new memory
async function storeMemory(supabase: any, userId: string, data: any) {
  const { memoryType, content, context, entityType, entityId, source, importanceScore } = data;

  const { data: memory, error } = await supabase
    .from('ai_memory')
    .insert({
      user_id: userId,
      memory_type: memoryType,
      content,
      context: context || {},
      entity_type: entityType,
      entity_id: entityId,
      source: source || 'conversation',
      importance_score: importanceScore || 0.5,
      relevance_score: importanceScore || 0.5,
    })
    .select()
    .single();

  if (error) throw error;

  // Log the decision
  await supabase.from('agent_decision_log').insert({
    agent_name: 'memory_manager',
    user_id: userId,
    decision_type: 'store_memory',
    decision_made: `Stored ${memoryType} memory`,
    reasoning: { source, content_preview: content.substring(0, 100) },
    confidence_score: importanceScore || 0.5,
  });

  return { success: true, memory };
}

// Retrieve relevant memories using semantic search
async function retrieveMemories(supabase: any, userId: string, data: any) {
  const { query, memoryTypes, limit = 10, minRelevance = 0.3 } = data;

  let dbQuery = supabase
    .from('ai_memory')
    .select('*')
    .eq('user_id', userId)
    .or('expires_at.is.null,expires_at.gt.now()')
    .gte('relevance_score', minRelevance)
    .order('importance_score', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit);

  if (memoryTypes && memoryTypes.length > 0) {
    dbQuery = dbQuery.in('memory_type', memoryTypes);
  }

  const { data: memories, error } = await dbQuery;

  if (error) throw error;

  // Update last_accessed_at for retrieved memories
  if (memories && memories.length > 0) {
    const memoryIds = memories.map((m: any) => m.id);
    await supabase
      .from('ai_memory')
      .update({ last_accessed_at: new Date().toISOString() })
      .in('id', memoryIds);
  }

  return { success: true, memories: memories || [] };
}

// Update memory importance based on usage
async function updateImportance(supabase: any, userId: string, data: any) {
  const { memoryId, importanceDelta } = data;

  const { data: memory } = await supabase
    .from('ai_memory')
    .select('importance_score')
    .eq('id', memoryId)
    .eq('user_id', userId)
    .single();

  if (!memory) throw new Error('Memory not found');

  const newScore = Math.max(0, Math.min(1, (memory.importance_score || 0.5) + importanceDelta));

  const { error } = await supabase
    .from('ai_memory')
    .update({ 
      importance_score: newScore,
      last_accessed_at: new Date().toISOString()
    })
    .eq('id', memoryId);

  if (error) throw error;

  return { success: true, newImportanceScore: newScore };
}

// Learn and store a user preference
async function learnPreference(supabase: any, userId: string, data: any) {
  const { category, key, value, source, confidence = 0.5 } = data;

  const { data: existing } = await supabase
    .from('agent_user_preferences')
    .select('*')
    .eq('user_id', userId)
    .eq('preference_category', category)
    .eq('preference_key', key)
    .single();

  if (existing) {
    // Update existing preference with increased confidence
    const newConfidence = Math.min(1, existing.confidence_score + 0.1);
    const learnedFrom = [...(existing.learned_from || []), source].slice(-10);

    const { error } = await supabase
      .from('agent_user_preferences')
      .update({
        preference_value: value,
        confidence_score: newConfidence,
        learned_from: learnedFrom,
        updated_at: new Date().toISOString()
      })
      .eq('id', existing.id);

    if (error) throw error;

    return { success: true, action: 'updated', confidence: newConfidence };
  } else {
    // Create new preference
    const { error } = await supabase
      .from('agent_user_preferences')
      .insert({
        user_id: userId,
        preference_category: category,
        preference_key: key,
        preference_value: value,
        confidence_score: confidence,
        learned_from: [source]
      });

    if (error) throw error;

    return { success: true, action: 'created', confidence };
  }
}

// Get full context for QUIN before responding
async function getFullContext(supabase: any, userId: string, data: any) {
  const { sessionId, currentRoute, includeWorkingMemory = true } = data || {};

  // Parallel fetch all context data
  const [
    memoriesResult,
    preferencesResult,
    workingMemoryResult,
    goalsResult,
    recentDecisionsResult,
    predictiveSignalsResult
  ] = await Promise.all([
    // Long-term memories
    supabase
      .from('ai_memory')
      .select('*')
      .eq('user_id', userId)
      .or('expires_at.is.null,expires_at.gt.now()')
      .order('importance_score', { ascending: false })
      .limit(15),
    
    // User preferences
    supabase
      .from('agent_user_preferences')
      .select('*')
      .eq('user_id', userId)
      .gte('confidence_score', 0.4),
    
    // Working memory (if enabled and sessionId provided)
    includeWorkingMemory && sessionId
      ? supabase
          .from('agent_working_memory')
          .select('*')
          .eq('user_id', userId)
          .eq('session_id', sessionId)
          .gt('expires_at', new Date().toISOString())
          .order('priority', { ascending: false })
      : Promise.resolve({ data: [] }),
    
    // Active goals
    supabase
      .from('agent_goals')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('priority', { ascending: false })
      .limit(5),
    
    // Recent decisions (for continuity)
    supabase
      .from('agent_decision_log')
      .select('decision_type, decision_made, reasoning, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(5),
    
    // Predictive signals
    supabase
      .from('predictive_signals')
      .select('*')
      .eq('user_id', userId)
      .eq('acknowledged', false)
      .or('expires_at.is.null,expires_at.gt.now()')
      .order('confidence_score', { ascending: false })
      .limit(5)
  ]);

  const context = {
    memories: memoriesResult.data || [],
    preferences: preferencesResult.data || [],
    workingMemory: workingMemoryResult.data || [],
    activeGoals: goalsResult.data || [],
    recentDecisions: recentDecisionsResult.data || [],
    predictiveSignals: predictiveSignalsResult.data || [],
    contextTimestamp: new Date().toISOString()
  };

  return { success: true, context };
}

// Consolidate similar memories to reduce noise
async function consolidateMemories(supabase: any, userId: string) {
  // Get memories that could be consolidated
  const { data: memories } = await supabase
    .from('ai_memory')
    .select('*')
    .eq('user_id', userId)
    .order('memory_type')
    .order('created_at', { ascending: false });

  if (!memories || memories.length < 10) {
    return { success: true, message: 'Not enough memories to consolidate' };
  }

  // Group by memory_type and identify duplicates (simplified)
  const grouped = memories.reduce((acc: any, mem: any) => {
    acc[mem.memory_type] = acc[mem.memory_type] || [];
    acc[mem.memory_type].push(mem);
    return acc;
  }, {});

  let consolidatedCount = 0;

  for (const [type, mems] of Object.entries(grouped)) {
    const typeMems = mems as any[];
    if (typeMems.length > 5) {
      // Keep top 5 by importance, delete the rest
      const toDelete = typeMems
        .sort((a, b) => (b.importance_score || 0) - (a.importance_score || 0))
        .slice(5)
        .map(m => m.id);

      if (toDelete.length > 0) {
        await supabase.from('ai_memory').delete().in('id', toDelete);
        consolidatedCount += toDelete.length;
      }
    }
  }

  return { success: true, consolidatedCount };
}

// Apply decay to old, unused memories
async function applyMemoryDecay(supabase: any, userId: string) {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Reduce importance of memories not accessed in 30 days
  const { data: staleMemories } = await supabase
    .from('ai_memory')
    .select('id, importance_score, decay_rate')
    .eq('user_id', userId)
    .or(`last_accessed_at.is.null,last_accessed_at.lt.${thirtyDaysAgo.toISOString()}`);

  if (!staleMemories || staleMemories.length === 0) {
    return { success: true, decayedCount: 0 };
  }

  let decayedCount = 0;
  let deletedCount = 0;

  for (const memory of staleMemories) {
    const decayRate = memory.decay_rate || 0.01;
    const newImportance = (memory.importance_score || 0.5) - decayRate;

    if (newImportance <= 0.1) {
      // Delete very low importance memories
      await supabase.from('ai_memory').delete().eq('id', memory.id);
      deletedCount++;
    } else {
      await supabase
        .from('ai_memory')
        .update({ importance_score: newImportance })
        .eq('id', memory.id);
      decayedCount++;
    }
  }

  return { success: true, decayedCount, deletedCount };
}
