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

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const url = new URL(req.url);

    // GET /api/v1/applications - List applications
    if (req.method === 'GET') {
      if (!hasScope(authResult.scopes!, 'read:applications')) {
        return new Response(
          JSON.stringify({ error: 'Insufficient permissions' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const page = parseInt(url.searchParams.get('page') || '1');
      const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100);
      const offset = (page - 1) * limit;
      const status = url.searchParams.get('status');
      const jobId = url.searchParams.get('job_id');

      let query = supabase
        .from('applications')
        .select(`
          *,
          jobs!inner(company_id)
        `, { count: 'exact' })
        .eq('jobs.company_id', authResult.companyId!)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (status) query = query.eq('status', status);
      if (jobId) query = query.eq('job_id', jobId);

      const { data, error, count } = await query;

      if (error) throw error;

      await logAPIUsage(
        authResult.apiKeyId!,
        '/api/v1/applications',
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

    // POST /api/v1/applications - Create application
    if (req.method === 'POST') {
      if (!hasScope(authResult.scopes!, 'write:applications')) {
        return new Response(
          JSON.stringify({ error: 'Insufficient permissions' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const body = await req.json();
      
      // Verify job belongs to company
      const { data: job } = await supabase
        .from('jobs')
        .select('id')
        .eq('id', body.job_id)
        .eq('company_id', authResult.companyId)
        .single();

      if (!job) {
        return new Response(
          JSON.stringify({ error: 'Job not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data, error } = await supabase
        .from('applications')
        .insert(body)
        .select()
        .single();

      if (error) throw error;

      await logAPIUsage(
        authResult.apiKeyId!,
        '/api/v1/applications',
        'POST',
        201,
        Date.now() - startTime
      );

      // Queue webhook
      await supabase.rpc('queue_webhook_delivery', {
        p_company_id: authResult.companyId,
        p_event_type: 'application.created',
        p_payload: { application: data },
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
