import { createAuthenticatedHandler } from '../_shared/handler.ts';

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

Deno.serve(createAuthenticatedHandler(async (req, ctx) => {
    const body = await req.json();
    const user = ctx.user;
    const { consents } = body;

    if (!Array.isArray(consents) || consents.length === 0 || consents.length > 10) {
      return new Response(
        JSON.stringify({ error: 'Invalid consents array (1-10 items required)' }),
        { status: 400, headers: { ...ctx.corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate each consent entry
    for (const consent of consents) {
      if (!consent.consent_type || !VALID_CONSENT_TYPES.includes(consent.consent_type)) {
        return new Response(
          JSON.stringify({ error: `Invalid consent_type: ${consent.consent_type}` }),
          { status: 400, headers: { ...ctx.corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (!consent.scope || !VALID_SCOPES.includes(consent.scope)) {
        return new Response(
          JSON.stringify({ error: `Invalid scope: ${consent.scope}` }),
          { status: 400, headers: { ...ctx.corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    const serverTimestamp = new Date().toISOString();

    const records = consents.map((c: { consent_type: string; scope: string; consent_text?: string }) => ({
      user_id: user.id,
      consent_type: c.consent_type,
      scope: c.scope,
      granted: true,
      consent_text: c.consent_text ? String(c.consent_text).substring(0, 500) : `User granted ${c.scope} for ${c.consent_type}`,
      granted_at: serverTimestamp,
    }));

    const { data, error } = await ctx.supabase
      .from('consent_receipts')
      .insert(records)
      .select();

    if (error) {
      console.error('[record-consent] Insert error:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to record consent' }),
        { status: 500, headers: { ...ctx.corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[record-consent] Recorded ${records.length} consents for user ${user.id}`);

    return new Response(
      JSON.stringify({ success: true, consents: data }),
      { headers: { ...ctx.corsHeaders, 'Content-Type': 'application/json' } }
    );
}));
