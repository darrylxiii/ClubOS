import { moneybirdRequest } from '../_shared/moneybird-client.ts';
import { createHandler } from '../_shared/handler.ts';

/** Generate a short SHA-256 hex key for idempotency */
async function makeIdempotencyKey(source: string): Promise<string> {
  const data = new TextEncoder().encode(source);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash)).slice(0, 16).map(b => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(createHandler(async (req, ctx) => {
    const { supabase, corsHeaders } = ctx;

    const startTime = Date.now();
    const administrationId = Deno.env.get('MONEYBIRD_ADMINISTRATION_ID')!;

    try {

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
        .eq('moneybird_administration_id', administrationId);
      
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
        const existingContacts = await moneybirdRequest<Array<Record<string, unknown>>>(
          `contacts.json?query=${encodeURIComponent(company.name)}`,
          { operation: 'sync-contacts-search' },
        );
        const existingContact = existingContacts.find(
          (c: any) => c.company_name?.toLowerCase() === company.name.toLowerCase()
        );

        let moneybirdContactId: string;

        if (existingContact) {
          // Update existing contact
          moneybirdContactId = existingContact.id as string;
          
          await moneybirdRequest(`contacts/${moneybirdContactId}.json`, {
            method: 'PATCH',
            body: {
              contact: {
                company_name: company.name,
                address1: company.headquarters_location || '',
                custom_fields_attributes: {
                  '0': { value: company.industry || '' },
                },
              },
            },
            operation: 'sync-contacts-update',
          });

          results.updated++;
          console.log(`[Moneybird Sync Contacts] Updated: ${company.name}`);
        } else {
          // Create new contact
          const newContact = await moneybirdRequest<Record<string, unknown>>('contacts.json', {
            method: 'POST',
            body: {
              contact: {
                company_name: company.name,
                address1: company.headquarters_location || '',
                customer_id: company.id,
              },
            },
            operation: 'sync-contacts-create',
            idempotencyKey: await makeIdempotencyKey(`sync-contact:${company.id}:${company.name}`),
          });
          moneybirdContactId = newContact.id as string;
          results.created++;
          console.log(`[Moneybird Sync Contacts] Created: ${company.name}`);
        }

        // Update sync record
        await supabase
          .from('moneybird_contact_sync')
          .upsert({
            company_id: company.id,
            moneybird_contact_id: moneybirdContactId,
            moneybird_administration_id: administrationId,
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
            moneybird_administration_id: administrationId,
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
}));
