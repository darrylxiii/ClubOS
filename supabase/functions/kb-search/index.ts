import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkUserRateLimit, createRateLimitResponse } from "../_shared/rate-limiter.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Rate limiting: 30 requests per minute per IP
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || 
                     req.headers.get("x-real-ip") || 
                     "unknown";
    
    const rateLimitResult = await checkUserRateLimit(clientIp, "kb-search", 30, 60000);
    if (!rateLimitResult.allowed) {
      console.log(`[KB Search] Rate limit exceeded for IP: ${clientIp}`);
      return createRateLimitResponse(rateLimitResult.retryAfter || 60, corsHeaders);
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const { query, category, user_role } = await req.json();

    if (!query || query.length < 2) {
      return new Response(
        JSON.stringify({ results: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build search query
    let dbQuery = supabaseClient
      .from('knowledge_base_articles')
      .select('*')
      .eq('status', 'published')
      .or(`title.ilike.%${query}%,content.ilike.%${query}%,search_keywords.cs.{${query}}`);

    // Filter by visibility based on user role
    if (user_role === 'partner' || user_role === 'admin') {
      dbQuery = dbQuery.in('visibility', ['public', 'partner_only']);
    } else {
      dbQuery = dbQuery.eq('visibility', 'public');
    }

    // Filter by category if provided
    if (category) {
      dbQuery = dbQuery.eq('category', category);
    }

    const { data: results, error } = await dbQuery
      .order('view_count', { ascending: false })
      .limit(10);

    if (error) throw error;

    return new Response(
      JSON.stringify({ 
        results: results || [],
        query,
        count: results?.length || 0
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error searching KB:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
