import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const VALID_CONSENT_TYPES = [
  'terms_of_service',
  'privacy_policy',
  'marketing',
  'data_sharing',
  'club_sync',
  'salary_visibility',
  'profile_sharing',
];

const VALID_SCOPES = [
  'platform_usage',
  'data_processing',
  'data_processing_and_communications',
  'marketing_emails',
  'third_party_sharing',
  'salary_display',
  'profile_display',
];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const { consents } = body;

    if (!Array.isArray(consents) || consents.length === 0 || consents.length > 10) {
      return new Response(
        JSON.stringify({ error: 'Invalid consents array (1-10 items required)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate each consent entry
    for (const consent of consents) {
      if (!consent.consent_type || !VALID_CONSENT_TYPES.includes(consent.consent_type)) {
        return new Response(
          JSON.stringify({ error: `Invalid consent_type: ${consent.consent_type}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (!consent.scope || !VALID_SCOPES.includes(consent.scope)) {
        return new Response(
          JSON.stringify({ error: `Invalid scope: ${consent.scope}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const serverTimestamp = new Date().toISOString();

    const records = consents.map((c: { consent_type: string; scope: string; consent_text?: string }) => ({
      user_id: user.id,
      consent_type: c.consent_type,
      scope: c.scope,
      granted: true,
      consent_text: c.consent_text ? String(c.consent_text).substring(0, 500) : `User granted ${c.scope} for ${c.consent_type}`,
      granted_at: serverTimestamp,
    }));

    const { data, error } = await supabaseAdmin
      .from('consent_receipts')
      .insert(records)
      .select();

    if (error) {
      console.error('[record-consent] Insert error:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to record consent' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[record-consent] Recorded ${records.length} consents for user ${user.id}`);

    return new Response(
      JSON.stringify({ success: true, consents: data }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[record-consent] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
