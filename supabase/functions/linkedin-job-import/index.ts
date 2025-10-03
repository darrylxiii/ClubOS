import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { action, companyId, code } = await req.json();

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

    if (action === 'callback' && code) {
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
      // Note: LinkedIn's Job Posting API requires specific permissions
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
      
      // Log import
      const { data: importLog } = await supabaseClient
        .from('linkedin_job_imports')
        .insert({
          company_id: companyId,
          imported_by: req.headers.get('Authorization')?.split(' ')[1] || '',
          status: 'processing',
        })
        .select()
        .single();

      let imported = 0;
      let failed = 0;

      // Import each job
      for (const job of jobsData.elements || []) {
        try {
          await supabaseClient.from('jobs').insert({
            company_id: companyId,
            title: job.title,
            description: job.description?.text || '',
            location: job.location || '',
            employment_type: job.employmentStatus?.toLowerCase() || 'fulltime',
            status: 'draft',
            created_by: req.headers.get('Authorization')?.split(' ')[1] || '',
          });
          imported++;
        } catch (error) {
          console.error('Failed to import job:', error);
          failed++;
        }
      }

      // Update import log
      await supabaseClient
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
      const { data: latestImport } = await supabaseClient
        .from('linkedin_job_imports')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

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
