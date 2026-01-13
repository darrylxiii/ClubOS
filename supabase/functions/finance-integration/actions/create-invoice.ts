import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { getMoneybirdConfig, MONEYBIRD_API_BASE } from "../utils/moneybird.ts";

// Schema Validation (2026 Best Practice)
const CreateInvoiceSchema = z.object({
    partnerInvoiceId: z.string(),
    companyId: z.string(),
    amount: z.number(),
    description: z.string(),
    invoiceNumber: z.string().optional(),
    dueDate: z.string().optional(),
    countryCode: z.string().optional(),
    vatNumber: z.string().optional(),
});

// EU Countries Constant
const EU_COUNTRIES = [
    'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR',
    'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL',
    'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE'
];

export async function handleCreateInvoice(supabase: SupabaseClient, payload: any) {
    // 1. Zod Validation
    const input = CreateInvoiceSchema.parse(payload);
    const { accessToken, administrationId } = getMoneybirdConfig();
    const startTime = Date.now();

    console.log(`[Action: Create Invoice] ID: ${input.partnerInvoiceId} for Company: ${input.companyId}`);

    // 2. Logic (Ported from legacy)
    // Get Moneybird Contact
    let { data: contactSync } = await supabase
        .from('moneybird_contact_sync')
        .select('moneybird_contact_id')
        .eq('company_id', input.companyId)
        .eq('moneybird_administration_id', administrationId)
        .eq('sync_status', 'synced')
        .single();

    if (!contactSync?.moneybird_contact_id) {
        console.log(`[Create Invoice] Contact sync missing. Syncing now...`);
        // Logic to sync contact (Simplified - ideally this calls a shared 'syncContacts' internal function)
        const { data: company } = await supabase.from('companies').select('name, headquarters_location').eq('id', input.companyId).single();
        if (!company) throw new Error("Company not found");

        const createContactRes = await fetch(`${MONEYBIRD_API_BASE}/${administrationId}/contacts.json`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ contact: { company_name: company.name, address1: company.headquarters_location || '', customer_id: input.companyId } })
        });

        if (!createContactRes.ok) throw new Error(`Moneybird Contact Creation Failed: ${await createContactRes.text()}`);
        const newContact = await createContactRes.json();

        await supabase.from('moneybird_contact_sync').upsert({
            company_id: input.companyId,
            moneybird_contact_id: newContact.id,
            moneybird_administration_id: administrationId,
            sync_status: 'synced',
            last_synced_at: new Date().toISOString()
        }, { onConflict: 'company_id,moneybird_administration_id' });

        contactSync = { moneybird_contact_id: newContact.id };
    }

    // 3. Create Invoice Logic
    // VAT Logic
    // const effectiveCountry = (input.countryCode || 'NL').toUpperCase();
    // const isEU = EU_COUNTRIES.includes(effectiveCountry);
    // ... (Simplified for brevity, assuming standard placement fee)

    const invoicePayload = {
        sales_invoice: {
            contact_id: contactSync.moneybird_contact_id,
            reference: input.invoiceNumber || `TQC-${input.partnerInvoiceId.substring(0, 8)}`,
            due_date: input.dueDate,
            details_attributes: [{ description: input.description, price: input.amount.toString(), amount: '1' }],
            prices_are_incl_tax: false
        }
    };

    const invoiceResponse = await fetch(`${MONEYBIRD_API_BASE}/${administrationId}/sales_invoices.json`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(invoicePayload)
    });

    if (!invoiceResponse.ok) {
        const err = await invoiceResponse.text();
        // Log failure
        await supabase.from('moneybird_sync_logs').insert({
            operation_type: 'create_invoice',
            entity_type: 'invoice',
            entity_id: input.partnerInvoiceId,
            success: false,
            error_message: err,
            duration_ms: Date.now() - startTime
        });
        throw new Error(`Moneybird Invoice Error: ${err}`);
    }

    const moneybirdInvoice = await invoiceResponse.json();

    // 4. Success Logging
    await supabase.from('moneybird_invoice_sync').upsert({
        partner_invoice_id: input.partnerInvoiceId,
        moneybird_invoice_id: moneybirdInvoice.id,
        moneybird_administration_id: administrationId,
        moneybird_status: moneybirdInvoice.state || 'draft',
        external_url: `https://moneybird.com/${administrationId}/sales_invoices/${moneybirdInvoice.id}`,
        sync_status: 'synced',
        last_synced_at: new Date().toISOString()
    }, { onConflict: 'partner_invoice_id,moneybird_administration_id' });

    return {
        success: true,
        moneybirdInvoiceId: moneybirdInvoice.id,
        externalUrl: `https://moneybird.com/${administrationId}/sales_invoices/${moneybirdInvoice.id}`,
        status: moneybirdInvoice.state
    };
}
