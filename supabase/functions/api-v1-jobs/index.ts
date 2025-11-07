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
    // Authenticate API key
    const authResult = await authenticateAPIKey(req.headers.get('Authorization'));
    
    if (!authResult.authenticated) {
      await logAPIUsage(
        authResult.apiKeyId || 'unknown',
        '/api/v1/jobs',
        req.method,
        authResult.rateLimitExceeded ? 429 : 401,
        Date.now() - startTime,
        req.headers.get('x-forwarded-for') || undefined,
        req.headers.get('user-agent') || undefined,
        authResult.error
      );
      
      return new Response(
        JSON.stringify({ error: authResult.error }),
        {
          status: authResult.rateLimitExceeded ? 429 : 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const url = new URL(req.url);
    const pathParts = url.pathname.split('/').filter(Boolean);
    const jobId = pathParts[pathParts.length - 1];

    // GET /api/v1/jobs - List jobs
    if (req.method === 'GET' && !jobId) {
      if (!hasScope(authResult.scopes!, 'read:jobs')) {
        return new Response(
          JSON.stringify({ error: 'Insufficient permissions' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const page = parseInt(url.searchParams.get('page') || '1');
      const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100);
      const offset = (page - 1) * limit;

      let query = supabase
        .from('jobs')
        .select('*', { count: 'exact' })
        .eq('company_id', authResult.companyId!)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      const { data, error, count } = await query;

      if (error) throw error;

      await logAPIUsage(
        authResult.apiKeyId!,
        '/api/v1/jobs',
        'GET',
        200,
        Date.now() - startTime
      );

      return new Response(
        JSON.stringify({
          data,
          pagination: {
            page,
            limit,
            total: count,
            pages: Math.ceil((count || 0) / limit),
          },
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // GET /api/v1/jobs/:id - Get single job
    if (req.method === 'GET' && jobId) {
      if (!hasScope(authResult.scopes!, 'read:jobs')) {
        return new Response(
          JSON.stringify({ error: 'Insufficient permissions' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('id', jobId)
        .eq('company_id', authResult.companyId!)
        .single();

      if (error) throw error;
      if (!data) {
        return new Response(
          JSON.stringify({ error: 'Job not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      await logAPIUsage(
        authResult.apiKeyId!,
        `/api/v1/jobs/${jobId}`,
        'GET',
        200,
        Date.now() - startTime
      );

      return new Response(
        JSON.stringify({ data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // POST /api/v1/jobs - Create job
    if (req.method === 'POST') {
      if (!hasScope(authResult.scopes!, 'write:jobs')) {
        return new Response(
          JSON.stringify({ error: 'Insufficient permissions' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const body = await req.json();
      const { data, error } = await supabase
        .from('jobs')
        .insert({
          ...body,
          company_id: authResult.companyId,
        })
        .select()
        .single();

      if (error) throw error;

      await logAPIUsage(
        authResult.apiKeyId!,
        '/api/v1/jobs',
        'POST',
        201,
        Date.now() - startTime
      );

      // Queue webhook
      await supabase.rpc('queue_webhook_delivery', {
        p_company_id: authResult.companyId,
        p_event_type: 'job.created',
        p_payload: { job: data },
      });

      return new Response(
        JSON.stringify({ data }),
        { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
