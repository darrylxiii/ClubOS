import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MONEYBIRD_API_BASE = 'https://moneybird.com/api/v2';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Verify auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get Moneybird settings
    const { data: settings, error: settingsError } = await supabase
      .from('moneybird_settings')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (settingsError || !settings) {
      return new Response(
        JSON.stringify({ error: 'Moneybird not connected' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { companyId, syncAll = false } = body;

    // Build query for companies to sync
    let companiesQuery = supabase
      .from('companies')
      .select('id, name, website_url, industry, headquarters_location');

    if (companyId) {
      companiesQuery = companiesQuery.eq('id', companyId);
    } else if (!syncAll) {
      // Only sync companies not yet synced
      const { data: syncedIds } = await supabase
        .from('moneybird_contact_sync')
        .select('company_id')
        .eq('moneybird_administration_id', settings.administration_id);
      
      const syncedCompanyIds = syncedIds?.map(s => s.company_id) || [];
      if (syncedCompanyIds.length > 0) {
        companiesQuery = companiesQuery.not('id', 'in', `(${syncedCompanyIds.join(',')})`);
      }
    }

    const { data: companies, error: companiesError } = await companiesQuery.limit(50);

    if (companiesError) {
      console.error('[Moneybird Sync Contacts] Failed to fetch companies:', companiesError);
      throw companiesError;
    }

    console.log(`[Moneybird Sync Contacts] Syncing ${companies?.length || 0} companies`);

    const results = {
      created: 0,
      updated: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (const company of companies || []) {
      try {
        // Check if contact already exists in Moneybird by company name
        const searchUrl = `${MONEYBIRD_API_BASE}/${settings.administration_id}/contacts.json?query=${encodeURIComponent(company.name)}`;
        const searchResponse = await fetch(searchUrl, {
          headers: { 'Authorization': `Bearer ${settings.access_token}` },
        });

        if (!searchResponse.ok) {
          throw new Error(`Search failed: ${searchResponse.status}`);
        }

        const existingContacts = await searchResponse.json();
        const existingContact = existingContacts.find(
          (c: any) => c.company_name?.toLowerCase() === company.name.toLowerCase()
        );

        let moneybirdContactId: string;

        if (existingContact) {
          // Update existing contact
          moneybirdContactId = existingContact.id;
          
          const updateResponse = await fetch(
            `${MONEYBIRD_API_BASE}/${settings.administration_id}/contacts/${moneybirdContactId}.json`,
            {
              method: 'PATCH',
              headers: {
                'Authorization': `Bearer ${settings.access_token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                contact: {
                  company_name: company.name,
                  address1: company.headquarters_location || '',
                  custom_fields_attributes: {
                    '0': { value: company.industry || '' },
                  },
                },
              }),
            }
          );

          if (!updateResponse.ok) {
            throw new Error(`Update failed: ${updateResponse.status}`);
          }

          results.updated++;
          console.log(`[Moneybird Sync Contacts] Updated: ${company.name}`);
        } else {
          // Create new contact
          const createResponse = await fetch(
            `${MONEYBIRD_API_BASE}/${settings.administration_id}/contacts.json`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${settings.access_token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                contact: {
                  company_name: company.name,
                  address1: company.headquarters_location || '',
                  customer_id: company.id,
                },
              }),
            }
          );

          if (!createResponse.ok) {
            const errorText = await createResponse.text();
            throw new Error(`Create failed: ${createResponse.status} - ${errorText}`);
          }

          const newContact = await createResponse.json();
          moneybirdContactId = newContact.id;
          results.created++;
          console.log(`[Moneybird Sync Contacts] Created: ${company.name}`);
        }

        // Update sync record
        await supabase
          .from('moneybird_contact_sync')
          .upsert({
            company_id: company.id,
            moneybird_contact_id: moneybirdContactId,
            moneybird_administration_id: settings.administration_id,
            sync_status: 'synced',
            last_synced_at: new Date().toISOString(),
            sync_error: null,
          }, {
            onConflict: 'company_id,moneybird_administration_id',
          });

      } catch (error) {
        results.failed++;
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        results.errors.push(`${company.name}: ${errorMsg}`);
        console.error(`[Moneybird Sync Contacts] Failed for ${company.name}:`, error);

        // Update sync record with error
        await supabase
          .from('moneybird_contact_sync')
          .upsert({
            company_id: company.id,
            moneybird_contact_id: '',
            moneybird_administration_id: settings.administration_id,
            sync_status: 'error',
            last_synced_at: new Date().toISOString(),
            sync_error: errorMsg,
          }, {
            onConflict: 'company_id,moneybird_administration_id',
          });
      }
    }

    // Log the sync operation
    await supabase.from('moneybird_sync_logs').insert({
      user_id: user.id,
      operation_type: 'sync_contacts',
      entity_type: 'contact',
      entity_id: companyId || 'bulk',
      response_payload: results,
      success: results.failed === 0,
      error_message: results.errors.length > 0 ? results.errors.join('; ') : null,
      duration_ms: Date.now() - startTime,
    });

    console.log(`[Moneybird Sync Contacts] Completed:`, results);

    return new Response(
      JSON.stringify({ success: true, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Moneybird Sync Contacts] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
