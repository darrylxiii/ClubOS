import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CacheRequest {
  action: 'search' | 'store' | 'invalidate';
  query?: string;
  embedding?: number[];
  results?: any[];
  search_params?: Record<string, any>;
  similarity_threshold?: number;
}

interface CacheResult {
  hit: boolean;
  results: any[] | null;
  cache_key?: string;
  similarity?: number;
  cached_at?: string;
}

// Crypto hash for cache keys
async function hashQuery(query: string, params: Record<string, any> = {}): Promise<string> {
  const encoder = new TextEncoder();
  const normalized = query.toLowerCase().trim() + JSON.stringify(params);
  const data = encoder.encode(normalized);
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

    const input: CacheRequest = await req.json();

    switch (input.action) {
      case 'search':
        return await searchCache(supabase, input);
      case 'store':
        return await storeInCache(supabase, input);
      case 'invalidate':
        return await invalidateCache(supabase, input);
      default:
        return new Response(JSON.stringify({ error: 'Invalid action' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
  } catch (error: unknown) {
    console.error('Cache error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function searchCache(supabase: any, input: CacheRequest): Promise<Response> {
  if (!input.query) {
    return new Response(JSON.stringify({ error: 'Query is required for search' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const queryHash = await hashQuery(input.query, input.search_params || {});
  const similarityThreshold = input.similarity_threshold || 0.90;

  // First, try exact hash match (fastest)
  const { data: exactMatch } = await supabase
    .from('embedding_cache')
    .select('*')
    .eq('query_hash', queryHash)
    .gt('expires_at', new Date().toISOString())
    .single();

  if (exactMatch) {
    // Update hit count
    await supabase
      .from('embedding_cache')
      .update({ 
        hit_count: exactMatch.hit_count + 1,
        last_hit_at: new Date().toISOString()
      })
      .eq('id', exactMatch.id);

    const result: CacheResult = {
      hit: true,
      results: exactMatch.results_json,
      cache_key: exactMatch.query_hash,
      similarity: 1.0,
      cached_at: exactMatch.created_at,
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // If we have an embedding, try semantic similarity match
  if (input.embedding && input.embedding.length > 0) {
    const embeddingStr = `[${input.embedding.join(',')}]`;
    
    // Use pgvector to find similar cached queries
    const { data: similarMatches, error } = await supabase.rpc(
      'find_similar_cached_queries',
      {
        query_embedding: embeddingStr,
        match_threshold: similarityThreshold,
        match_count: 1
      }
    );

    if (!error && similarMatches && similarMatches.length > 0) {
      const match = similarMatches[0];
      
      // Check if still valid
      if (new Date(match.expires_at) > new Date()) {
        // Update hit count
        await supabase
          .from('embedding_cache')
          .update({ 
            hit_count: match.hit_count + 1,
            last_hit_at: new Date().toISOString()
          })
          .eq('id', match.id);

        const result: CacheResult = {
          hit: true,
          results: match.results_json,
          cache_key: match.query_hash,
          similarity: match.similarity,
          cached_at: match.created_at,
        };

        return new Response(JSON.stringify(result), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }
  }

  // No cache hit
  const result: CacheResult = {
    hit: false,
    results: null,
  };

  return new Response(JSON.stringify(result), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function storeInCache(supabase: any, input: CacheRequest): Promise<Response> {
  if (!input.query || !input.results) {
    return new Response(JSON.stringify({ error: 'Query and results are required for store' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const queryHash = await hashQuery(input.query, input.search_params || {});
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  const cacheEntry: any = {
    query_hash: queryHash,
    query_text: input.query,
    results_json: input.results,
    search_params: input.search_params || {},
    expires_at: expiresAt.toISOString(),
  };

  // Add embedding if provided
  if (input.embedding && input.embedding.length > 0) {
    cacheEntry.embedding = `[${input.embedding.join(',')}]`;
  }

  const { error } = await supabase
    .from('embedding_cache')
    .upsert(cacheEntry, { 
      onConflict: 'query_hash',
      ignoreDuplicates: false 
    });

  if (error) {
    console.error('Error storing in cache:', error);
    return new Response(JSON.stringify({ error: 'Failed to store in cache' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Clean up old entries (LRU eviction)
  await cleanupCache(supabase);

  return new Response(JSON.stringify({ 
    success: true, 
    cache_key: queryHash,
    expires_at: expiresAt.toISOString()
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function invalidateCache(supabase: any, input: CacheRequest): Promise<Response> {
  if (input.query) {
    const queryHash = await hashQuery(input.query, input.search_params || {});
    await supabase
      .from('embedding_cache')
      .delete()
      .eq('query_hash', queryHash);
  } else {
    // Invalidate all expired entries
    await supabase
      .from('embedding_cache')
      .delete()
      .lt('expires_at', new Date().toISOString());
  }

  return new Response(JSON.stringify({ success: true }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function cleanupCache(supabase: any) {
  try {
    // Delete expired entries
    await supabase
      .from('embedding_cache')
      .delete()
      .lt('expires_at', new Date().toISOString());

    // If cache is too large, delete least recently used entries
    const { count } = await supabase
      .from('embedding_cache')
      .select('*', { count: 'exact', head: true });

    const maxCacheSize = 10000;
    
    if (count && count > maxCacheSize) {
      // Delete oldest 10% by last_hit_at
      const deleteCount = Math.floor(count * 0.1);
      
      const { data: oldEntries } = await supabase
        .from('embedding_cache')
        .select('id')
        .order('last_hit_at', { ascending: true })
        .limit(deleteCount);

      if (oldEntries && oldEntries.length > 0) {
        const idsToDelete = oldEntries.map((e: any) => e.id);
        await supabase
          .from('embedding_cache')
          .delete()
          .in('id', idsToDelete);
      }
    }
  } catch (error) {
    console.error('Cache cleanup error:', error);
  }
}
