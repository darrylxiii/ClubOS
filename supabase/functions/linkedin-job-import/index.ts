import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Input validation schemas
const initiateSchema = z.object({
  action: z.literal('initiate'),
  companyId: z.string().uuid('Invalid company ID format'),
});

const callbackSchema = z.object({
  action: z.literal('callback'),
  companyId: z.string().uuid('Invalid company ID format'),
  code: z.string().min(1, 'Authorization code is required'),
});

const statusSchema = z.object({
  action: z.literal('status'),
  companyId: z.string().uuid('Invalid company ID format'),
});

const requestSchema = z.discriminatedUnion('action', [
  initiateSchema,
  callbackSchema,
  statusSchema,
]);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Missing authorization header' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    // Create auth client to verify user
    const supabaseAuth = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    // Verify user is authenticated
    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Invalid token' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    // Create service role client for privileged operations
    const supabaseService = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Parse and validate request body
    const rawBody = await req.json();
    const validationResult = requestSchema.safeParse(rawBody);
    
    if (!validationResult.success) {
      return new Response(
        JSON.stringify({ 
          error: 'Invalid request parameters',
          details: validationResult.error.issues 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const body = validationResult.data;
    const { action, companyId } = body;

    // For actions requiring company access, verify membership
    if (action === 'callback' || action === 'status') {
      const { data: memberCheck } = await supabaseAuth
        .from('company_members')
        .select('role')
        .eq('user_id', user.id)
        .eq('company_id', companyId)
        .eq('is_active', true)
        .maybeSingle();

      if (!memberCheck || !['owner', 'admin', 'recruiter'].includes(memberCheck.role)) {
        return new Response(
          JSON.stringify({ error: 'Forbidden - Insufficient company permissions' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
        );
      }
    }

    if (action === 'initiate') {
      // Generate LinkedIn OAuth URL
      const clientId = Deno.env.get('LINKEDIN_CLIENT_ID');
      const redirectUri = `${Deno.env.get('SUPABASE_URL')}/functions/v1/linkedin-job-import`;
      const state = companyId;
      
      const authUrl = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&scope=w_organization_social%20r_organization_social`;

      return new Response(
        JSON.stringify({ authUrl }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'callback') {
      const { code } = body;
      
      // Exchange code for access token
      const clientId = Deno.env.get('LINKEDIN_CLIENT_ID');
      const clientSecret = Deno.env.get('LINKEDIN_CLIENT_SECRET');
      const redirectUri = `${Deno.env.get('SUPABASE_URL')}/functions/v1/linkedin-job-import`;

      const tokenResponse = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          client_id: clientId!,
          client_secret: clientSecret!,
          redirect_uri: redirectUri,
        }),
      });

      const { access_token } = await tokenResponse.json();

      // Fetch jobs from LinkedIn API
      const jobsResponse = await fetch(
        'https://api.linkedin.com/v2/jobs?q=criteria&jobStatus=OPEN',
        {
          headers: {
            'Authorization': `Bearer ${access_token}`,
            'X-Restli-Protocol-Version': '2.0.0',
          },
        }
      );

      const jobsData = await jobsResponse.json();
      
      // Log import (use service client for write)
      const { data: importLog } = await supabaseService
        .from('linkedin_job_imports')
        .insert({
          company_id: companyId,
          imported_by: user.id,
          status: 'processing',
        })
        .select()
        .single();

      let imported = 0;
      let failed = 0;

      // Import each job
      for (const job of jobsData.elements || []) {
        try {
          await supabaseService.from('jobs').insert({
            company_id: companyId,
            title: job.title,
            description: job.description?.text || '',
            location: job.location || '',
            employment_type: job.employmentStatus?.toLowerCase() || 'fulltime',
            status: 'draft',
            created_by: user.id,
          });
          imported++;
        } catch (error) {
          console.error('Failed to import job:', error);
          failed++;
        }
      }

      // Update import log
      await supabaseService
        .from('linkedin_job_imports')
        .update({
          jobs_imported: imported,
          jobs_failed: failed,
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', importLog?.id);

      return new Response(
        JSON.stringify({ success: true, imported, failed }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'status') {
      const { data: latestImport } = await supabaseAuth
        .from('linkedin_job_imports')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      return new Response(
        JSON.stringify(latestImport),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    throw new Error('Invalid action');
  } catch (error: any) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error?.message || 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});