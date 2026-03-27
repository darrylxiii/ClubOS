import { moneybirdRequest } from '../_shared/moneybird-client.ts';
import { createHandler } from '../_shared/handler.ts';

/** Generate a short SHA-256 hex key for idempotency */
async function makeIdempotencyKey(source: string): Promise<string> {
  const data = new TextEncoder().encode(source);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash)).slice(0, 16).map(b => b.toString(16).padStart(2, '0')).join('');
}

// EU countries for VAT handling
const EU_COUNTRIES = [
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR',
  'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL',
  'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE'
];

interface InvoiceDetails {
  partnerInvoiceId: string;
  companyId: string;
  amount: number;
  description: string;
  invoiceNumber?: string;
  dueDate?: string;
  countryCode?: string;
  vatNumber?: string;
}

Deno.serve(createHandler(async (req, ctx) => {
    const { supabase, corsHeaders } = ctx;

    const startTime = Date.now();
    const administrationId = Deno.env.get('MONEYBIRD_ADMINISTRATION_ID')!;

    try {

    const body: InvoiceDetails = await req.json();
    const { partnerInvoiceId, companyId, amount, description, invoiceNumber, dueDate, countryCode, vatNumber } = body;

    if (!partnerInvoiceId || !companyId || !amount) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[Moneybird Create Invoice] Creating invoice for partner invoice: ${partnerInvoiceId}`);

    // Get the Moneybird contact ID for this company
    let { data: contactSync } = await supabase
      .from('moneybird_contact_sync')
      .select('moneybird_contact_id')
      .eq('company_id', companyId)
      .eq('moneybird_administration_id', administrationId)
      .eq('sync_status', 'synced')
      .single();

    if (!contactSync?.moneybird_contact_id) {
      console.log(`[Moneybird Create Invoice] Contact not synced, syncing now...`);
      
      // Try to sync the contact first
      const { data: company } = await supabase
        .from('companies')
        .select('name, headquarters_location')
        .eq('id', companyId)
        .single();

      if (!company) {
        return new Response(
          JSON.stringify({ error: 'Company not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Create contact in Moneybird
      let newContact: Record<string, unknown>;
      try {
        newContact = await moneybirdRequest<Record<string, unknown>>('contacts.json', {
          method: 'POST',
          body: {
            contact: {
              company_name: company.name,
              address1: company.headquarters_location || '',
              customer_id: companyId,
            },
          },
          operation: 'create-invoice-contact',
          idempotencyKey: await makeIdempotencyKey(`contact:${companyId}:${company.name}`),
        });
      } catch (err: unknown) {
        const errorText = err instanceof Error ? err.message : String(err);
        console.error('[Moneybird Create Invoice] Failed to create contact:', errorText);
        return new Response(
          JSON.stringify({ error: 'Failed to create contact in Moneybird' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Store the sync record
      await supabase
        .from('moneybird_contact_sync')
        .upsert({
          company_id: companyId,
          moneybird_contact_id: newContact.id as string,
          moneybird_administration_id: administrationId,
          sync_status: 'synced',
          last_synced_at: new Date().toISOString(),
        }, {
          onConflict: 'company_id,moneybird_administration_id',
        });

      contactSync = { moneybird_contact_id: newContact.id as string };
    }

    // Determine VAT rate based on location
    let vatRemark = '';

    // Dutch VAT logic:
    // - NL: 21% BTW
    // - EU B2B with valid VAT: 0% with reverse charge
    // - Non-EU: 0% export
    const effectiveCountry = countryCode?.toUpperCase() || 'NL';
    
    if (effectiveCountry === 'NL') {
      // Standard Dutch VAT 21%
      vatRemark = '';
    } else if (EU_COUNTRIES.includes(effectiveCountry) && vatNumber) {
      // EU B2B with VAT number: reverse charge
      vatRemark = 'VAT reverse-charged / BTW verlegd';
    } else {
      // Non-EU or EU without VAT number
      vatRemark = 'Export / Geen BTW';
    }

    // Build invoice line items
    const invoiceLines = [
      {
        description: description || 'Placement fee',
        price: amount.toString(),
        amount: '1',
      },
    ];

    // Create invoice in Moneybird
    const reference = invoiceNumber || `TQC-${partnerInvoiceId.substring(0, 8)}`;
    const invoicePayload = {
      sales_invoice: {
        contact_id: contactSync!.moneybird_contact_id,
        reference,
        due_date: dueDate || undefined,
        details_attributes: invoiceLines,
        prices_are_incl_tax: false,
      },
    };

    console.log('[Moneybird Create Invoice] Creating invoice with payload:', JSON.stringify(invoicePayload));
    let moneybirdInvoice: Record<string, unknown>;
    try {
      moneybirdInvoice = await moneybirdRequest<Record<string, unknown>>('sales_invoices.json', {
        method: 'POST',
        body: invoicePayload,
        operation: 'create-invoice',
        idempotencyKey: await makeIdempotencyKey(`invoice:${contactSync!.moneybird_contact_id}:${amount}:${reference}`),
      });
    } catch (err: unknown) {
      const errorText = err instanceof Error ? err.message : String(err);
      console.error('[Moneybird Create Invoice] Failed to create invoice:', errorText);

      await supabase.from('moneybird_sync_logs').insert({
        operation_type: 'create_invoice',
        entity_type: 'invoice',
        entity_id: partnerInvoiceId,
        request_payload: invoicePayload,
        response_payload: { error: errorText },
        success: false,
        error_message: errorText,
        duration_ms: Date.now() - startTime,
      });

      return new Response(
        JSON.stringify({ error: 'Failed to create invoice in Moneybird', details: errorText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    console.log('[Moneybird Create Invoice] Invoice created:', moneybirdInvoice.id);

    // Store the sync record
    await supabase
      .from('moneybird_invoice_sync')
      .upsert({
        partner_invoice_id: partnerInvoiceId,
        moneybird_invoice_id: moneybirdInvoice.id,
        moneybird_administration_id: administrationId,
        moneybird_status: moneybirdInvoice.state || 'draft',
        external_url: `https://moneybird.com/${administrationId}/sales_invoices/${moneybirdInvoice.id}`,
        sync_status: 'synced',
        last_synced_at: new Date().toISOString(),
      }, {
        onConflict: 'partner_invoice_id,moneybird_administration_id',
      });

    // Log success
    await supabase.from('moneybird_sync_logs').insert({
      operation_type: 'create_invoice',
      entity_type: 'invoice',
      entity_id: partnerInvoiceId,
      request_payload: invoicePayload,
      response_payload: { moneybird_id: moneybirdInvoice.id, state: moneybirdInvoice.state },
      success: true,
      duration_ms: Date.now() - startTime,
    });

    return new Response(
      JSON.stringify({
        success: true,
        moneybirdInvoiceId: moneybirdInvoice.id,
        externalUrl: `https://moneybird.com/${administrationId}/sales_invoices/${moneybirdInvoice.id}`,
        status: moneybirdInvoice.state,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Moneybird Create Invoice] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}));
