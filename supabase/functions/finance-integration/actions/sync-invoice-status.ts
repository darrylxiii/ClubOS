import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { getMoneybirdConfig, MONEYBIRD_API_BASE } from "../utils/moneybird.ts";

const SyncStatusSchema = z.object({
    partnerInvoiceId: z.string().optional(),
    syncAll: z.boolean().default(false),
});

export async function handleSyncInvoiceStatus(supabase: SupabaseClient, payload: any) {
    const input = SyncStatusSchema.parse(payload);
    const { accessToken, administrationId } = getMoneybirdConfig();
    const startTime = Date.now();

    console.log(`[Action: Sync Status] Invoice: ${input.partnerInvoiceId || 'Bulk'}, SyncAll: ${input.syncAll}`);

    let query = supabase.from('moneybird_invoice_sync')
        .select('*, partner_invoices(id, status)')
        .eq('moneybird_administration_id', administrationId)
        .eq('sync_status', 'synced');

    if (input.partnerInvoiceId) {
        query = query.eq('partner_invoice_id', input.partnerInvoiceId);
    } else if (!input.syncAll) {
        query = query.not('moneybird_status', 'in', '(paid,uncollectible)');
    }

    const { data: invoiceSyncs, error: syncError } = await query.limit(50);
    if (syncError) throw syncError;

    const results = { checked: 0, updated: 0, paid: 0, errors: [] as string[] };

    for (const sync of invoiceSyncs || []) {
        try {
            results.checked++;
            const res = await fetch(`${MONEYBIRD_API_BASE}/${administrationId}/sales_invoices/${sync.moneybird_invoice_id}.json`, {
                headers: { 'Authorization': `Bearer ${accessToken}` }
            });

            if (!res.ok) {
                if (res.status === 404) {
                    await supabase.from('moneybird_invoice_sync').update({
                        sync_status: 'error',
                        sync_error: 'Invoice not found in Moneybird',
                        last_synced_at: new Date().toISOString()
                    }).eq('id', sync.id);
                    continue;
                }
                throw new Error(`Fetch failed: ${res.status}`);
            }

            const moneybirdInvoice = await res.json();
            const newStatus = moneybirdInvoice.state;

            if (newStatus !== sync.moneybird_status) {
                await supabase.from('moneybird_invoice_sync').update({
                    moneybird_status: newStatus,
                    last_synced_at: new Date().toISOString()
                }).eq('id', sync.id);
                results.updated++;

                if (newStatus === 'paid' && sync.moneybird_status !== 'paid') {
                    results.paid++;
                    await supabase.from('partner_invoices').update({ status: 'paid', paid_at: new Date().toISOString() }).eq('id', sync.partner_invoice_id);
                    await supabase.from('moneybird_sync_logs').insert({
                        operation_type: 'payment_received',
                        entity_type: 'invoice',
                        entity_id: sync.partner_invoice_id,
                        response_payload: { moneybird_id: sync.moneybird_invoice_id, paid_at: moneybirdInvoice.paid_at },
                        success: true
                    });
                }
            }
        } catch (error) {
            const msg = error instanceof Error ? error.message : 'Unknown';
            results.errors.push(`${sync.partner_invoice_id}: ${msg}`);
        }
    }

    await supabase.from('moneybird_sync_logs').insert({
        operation_type: 'sync_invoice_status',
        entity_type: 'invoice',
        entity_id: input.partnerInvoiceId || 'bulk',
        response_payload: results,
        success: results.errors.length === 0,
        error_message: results.errors.length > 0 ? results.errors.join('; ') : null,
        duration_ms: Date.now() - startTime
    });

    return { success: true, results };
}
