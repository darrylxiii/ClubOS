import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0';

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
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create export request
    const { data: exportRequest, error: requestError } = await supabaseClient
      .from('data_export_requests')
      .insert({
        user_id: user.id,
        status: 'processing',
      })
      .select()
      .single();

    if (requestError) throw requestError;

    // Collect all user data
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const exportData: any = {
      user_info: {
        id: user.id,
        email: user.email,
        created_at: user.created_at,
      },
      profile: null,
      candidate_profile: null,
      applications: [],
      messages: [],
      tasks: [],
      documents: [],
      achievements: [],
      export_date: new Date().toISOString(),
    };

    // Fetch profile
    const { data: profile } = await adminClient
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    exportData.profile = profile;

    // Fetch candidate profile
    const { data: candidateProfile } = await adminClient
      .from('candidate_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();
    exportData.candidate_profile = candidateProfile;

    // Fetch applications
    const { data: applications } = await adminClient
      .from('applications')
      .select('*')
      .eq('user_id', user.id);
    exportData.applications = applications;

    // Fetch messages (sent by user)
    const { data: messages } = await adminClient
      .from('messages')
      .select('*')
      .eq('sender_id', user.id);
    exportData.messages = messages;

    // Fetch tasks
    const { data: tasks } = await adminClient
      .from('unified_tasks')
      .select('*')
      .eq('assigned_to', user.id);
    exportData.tasks = tasks;

    // Fetch documents
    const { data: documents } = await adminClient
      .from('candidate_documents')
      .select('*')
      .eq('uploaded_by', user.id);
    exportData.documents = documents;

    // Fetch achievements
    const { data: achievements } = await adminClient
      .from('user_quantum_achievements')
      .select('*')
      .eq('user_id', user.id);
    exportData.achievements = achievements;

    // Convert to JSON
    const jsonData = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonData], { type: 'application/json' });

    // Store in storage bucket
    const fileName = `gdpr-exports/${user.id}/${Date.now()}.json`;
    const { error: uploadError } = await adminClient.storage
      .from('resumes')
      .upload(fileName, blob, {
        contentType: 'application/json',
        upsert: true,
      });

    if (uploadError) throw uploadError;

    // Generate signed URL (expires in 7 days)
    const { data: signedUrl } = await adminClient.storage
      .from('resumes')
      .createSignedUrl(fileName, 604800);

    if (!signedUrl) throw new Error('Failed to generate signed URL');

    // Update export request
    await adminClient
      .from('data_export_requests')
      .update({
        status: 'completed',
        export_url: signedUrl.signedUrl,
        expires_at: new Date(Date.now() + 604800000).toISOString(),
        completed_at: new Date().toISOString(),
      })
      .eq('id', exportRequest.id);

    // Log audit event
    await adminClient.from('audit_events').insert({
      event_type: 'gdpr_export',
      actor_id: user.id,
      actor_email: user.email,
      action: 'data_exported',
      metadata: { export_id: exportRequest.id },
    });

    return new Response(
      JSON.stringify({
        success: true,
        export_url: signedUrl.signedUrl,
        expires_at: new Date(Date.now() + 604800000).toISOString(),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('GDPR export error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
