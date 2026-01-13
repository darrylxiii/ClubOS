import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { getMoneybirdConfig, MONEYBIRD_API_BASE } from "../utils/moneybird.ts";

const SyncContactsSchema = z.object({
    companyId: z.string().optional(),
    syncAll: z.boolean().default(false),
});

export async function handleSyncContacts(supabase: SupabaseClient, payload: any) {
    const input = SyncContactsSchema.parse(payload);
    const { accessToken, administrationId } = getMoneybirdConfig();
    const startTime = Date.now();

    console.log(`[Action: Sync Contacts] Company: ${input.companyId || 'Bulk'}, SyncAll: ${input.syncAll}`);

    // Build Query
    let companiesQuery = supabase
        .from('companies')
        .select('id, name, website_url, industry, headquarters_location');

    if (input.companyId) {
        companiesQuery = companiesQuery.eq('id', input.companyId);
    } else if (!input.syncAll) {
        const { data: syncedIds } = await supabase
            .from('moneybird_contact_sync')
            .select('company_id')
            .eq('moneybird_administration_id', administrationId);

        const syncedCompanyIds = syncedIds?.map((s: any) => s.company_id) || [];
        if (syncedCompanyIds.length > 0) {
            companiesQuery = companiesQuery.not('id', 'in', `(${syncedCompanyIds.join(',')})`);
        }
    }

    const { data: companies, error: companiesError } = await companiesQuery.limit(50);
    if (companiesError) throw companiesError;

    const results = { created: 0, updated: 0, failed: 0, errors: [] as string[] };

    console.log(`[Sync Contacts] Processing ${companies?.length || 0} companies`);

    for (const company of companies || []) {
        try {
            // Search Existing
            const searchUrl = `${MONEYBIRD_API_BASE}/${administrationId}/contacts.json?query=${encodeURIComponent(company.name)}`;
            const searchResponse = await fetch(searchUrl, { headers: { 'Authorization': `Bearer ${accessToken}` } });
            if (!searchResponse.ok) throw new Error(`Search failed: ${searchResponse.status}`);

            const existingContacts = await searchResponse.json();
            const existingContact = existingContacts.find((c: any) => c.company_name?.toLowerCase() === company.name.toLowerCase());

            let moneybirdContactId: string;

            if (existingContact) {
                // Update
                moneybirdContactId = existingContact.id;
                await fetch(`${MONEYBIRD_API_BASE}/${administrationId}/contacts/${moneybirdContactId}.json`, {
                    method: 'PATCH',
                    headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contact: {
                            company_name: company.name,
                            address1: company.headquarters_location || '',
                            custom_fields_attributes: { '0': { value: company.industry || '' } }
                        }
                    })
                });
                results.updated++;
            } else {
                // Create
                const createResponse = await fetch(`${MONEYBIRD_API_BASE}/${administrationId}/contacts.json`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contact: {
                            company_name: company.name,
                            address1: company.headquarters_location || '',
                            customer_id: company.id
                        }
                    })
                });
                if (!createResponse.ok) throw new Error(`Create failed: ${await createResponse.text()}`);
                const newContact = await createResponse.json();
                moneybirdContactId = newContact.id;
                results.created++;
            }

            await supabase.from('moneybird_contact_sync').upsert({
                company_id: company.id,
                moneybird_contact_id: moneybirdContactId,
                moneybird_administration_id: administrationId,
                sync_status: 'synced',
                last_synced_at: new Date().toISOString(),
                sync_error: null
            }, { onConflict: 'company_id,moneybird_administration_id' });

        } catch (error) {
            results.failed++;
            const errorMsg = error instanceof Error ? error.message : 'Unknown error';
            results.errors.push(`${company.name}: ${errorMsg}`);
            // Log error in sync table
            await supabase.from('moneybird_contact_sync').upsert({
                company_id: company.id,
                moneybird_contact_id: '',
                moneybird_administration_id: administrationId,
                sync_status: 'error',
                last_synced_at: new Date().toISOString(),
                sync_error: errorMsg
            }, { onConflict: 'company_id,moneybird_administration_id' });
        }
    }

    // Log to history
    await supabase.from('moneybird_sync_logs').insert({
        operation_type: 'sync_contacts',
        entity_type: 'contact',
        entity_id: input.companyId || 'bulk',
        response_payload: results,
        success: results.failed === 0,
        error_message: results.errors.length > 0 ? results.errors.join('; ') : null,
        duration_ms: Date.now() - startTime
    });

    return { success: true, results };
}
