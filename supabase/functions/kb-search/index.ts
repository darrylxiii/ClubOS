/**
 * KB Search Edge Function
 * Phase 3: Enhanced with validation, logging, and standardized CORS
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkUserRateLimit, createRateLimitResponse } from "../_shared/rate-limiter.ts";
import { publicCorsHeaders, handleCorsPreFlight } from "../_shared/cors-config.ts";
import { createFunctionLogger, getClientInfo } from "../_shared/function-logger.ts";
import { kbSearchSchema, validateInputSafe } from "../_shared/validation-schemas.ts";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return handleCorsPreFlight(publicCorsHeaders);
  }

  const logger = createFunctionLogger('kb-search');
  const clientInfo = getClientInfo(req);
  logger.logRequest(req.method, undefined, { ip: clientInfo.ip });

  try {
    // Rate limiting: 30 requests per minute per IP
    const rateLimitResult = await checkUserRateLimit(clientInfo.ip, "kb-search", 30, 60000);
    if (!rateLimitResult.allowed) {
      logger.logRateLimit(clientInfo.ip);
      return createRateLimitResponse(rateLimitResult.retryAfter || 60, publicCorsHeaders);
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const rawInput = await req.json();
    const validation = validateInputSafe(kbSearchSchema, rawInput, publicCorsHeaders);
    if (!validation.success) {
      logger.logError(400, 'Validation failed');
      return validation.response;
    }
    
    const { query, category, user_role } = validation.data;
    logger.info('Search query received', { queryLength: query.length, category, user_role });

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

    logger.logSuccess(200, { resultCount: results?.length || 0 });

    return new Response(
      JSON.stringify({ 
        results: results || [],
        query,
        count: results?.length || 0
      }),
      { headers: { ...publicCorsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    logger.error('Search failed', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { headers: { ...publicCorsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
