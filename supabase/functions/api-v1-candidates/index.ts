import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0';
import { authenticateAPIKey, logAPIUsage, hasScope } from '../_shared/api-auth.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  const startTime = Date.now();
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authResult = await authenticateAPIKey(req.headers.get('Authorization'));
    
    if (!authResult.authenticated) {
      return new Response(
        JSON.stringify({ error: authResult.error }),
        {
          status: authResult.rateLimitExceeded ? 429 : 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!hasScope(authResult.scopes!, 'read:candidates')) {
      return new Response(
        JSON.stringify({ error: 'Insufficient permissions' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const url = new URL(req.url);
    const pathParts = url.pathname.split('/').filter(Boolean);
    const candidateId = pathParts[pathParts.length - 1];

    // GET /api/v1/candidates - List candidates
    if (req.method === 'GET' && !candidateId) {
      const page = parseInt(url.searchParams.get('page') || '1');
      const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100);
      const offset = (page - 1) * limit;

      // Get candidates who have applied to company's jobs
      const { data, error, count } = await supabase
        .from('applications')
        .select(`
          user_id,
          profiles!inner(id, full_name, email, avatar_url),
          jobs!inner(company_id)
        `, { count: 'exact' })
        .eq('jobs.company_id', authResult.companyId!)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      // Deduplicate candidates
      const uniqueCandidates = Array.from(
        new Map(data?.map(item => [item.user_id, item.profiles]) || []).values()
      );

      await logAPIUsage(
        authResult.apiKeyId!,
        '/api/v1/candidates',
        'GET',
        200,
        Date.now() - startTime
      );

      return new Response(
        JSON.stringify({
          data: uniqueCandidates,
          pagination: {
            page,
            limit,
            total: uniqueCandidates.length,
            pages: Math.ceil(uniqueCandidates.length / limit),
          },
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // GET /api/v1/candidates/:id - Get candidate details
    if (req.method === 'GET' && candidateId) {
      // Check if candidate has applied to any of company's jobs
      const { data: hasApplication } = await supabase
        .from('applications')
        .select(`
          id,
          jobs!inner(company_id)
        `)
        .eq('user_id', candidateId)
        .eq('jobs.company_id', authResult.companyId!)
        .limit(1)
        .single();

      if (!hasApplication) {
        return new Response(
          JSON.stringify({ error: 'Candidate not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url, created_at')
        .eq('id', candidateId)
        .single();

      if (error) throw error;

      await logAPIUsage(
        authResult.apiKeyId!,
        `/api/v1/candidates/${candidateId}`,
        'GET',
        200,
        Date.now() - startTime
      );

      return new Response(
        JSON.stringify({ data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('API error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
