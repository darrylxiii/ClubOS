import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MONEYBIRD_API_BASE = 'https://moneybird.com/api/v2';

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
    const { data: contactSync } = await supabase
      .from('moneybird_contact_sync')
      .select('moneybird_contact_id')
      .eq('company_id', companyId)
      .eq('moneybird_administration_id', settings.administration_id)
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
      const createContactResponse = await fetch(
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
              customer_id: companyId,
            },
          }),
        }
      );

      if (!createContactResponse.ok) {
        const errorText = await createContactResponse.text();
        console.error('[Moneybird Create Invoice] Failed to create contact:', errorText);
        return new Response(
          JSON.stringify({ error: 'Failed to create contact in Moneybird' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const newContact = await createContactResponse.json();
      
      // Store the sync record
      await supabase
        .from('moneybird_contact_sync')
        .upsert({
          company_id: companyId,
          moneybird_contact_id: newContact.id,
          moneybird_administration_id: settings.administration_id,
          sync_status: 'synced',
          last_synced_at: new Date().toISOString(),
        }, {
          onConflict: 'company_id,moneybird_administration_id',
        });

      contactSync!.moneybird_contact_id = newContact.id;
    }

    // Determine VAT rate based on location
    let taxRateId = settings.default_tax_rate_id;
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
        tax_rate_id: taxRateId || undefined,
      },
    ];

    // Create invoice in Moneybird
    const invoicePayload = {
      sales_invoice: {
        contact_id: contactSync!.moneybird_contact_id,
        reference: invoiceNumber || `TQC-${partnerInvoiceId.substring(0, 8)}`,
        due_date: dueDate || undefined,
        details_attributes: invoiceLines,
        prices_are_incl_tax: false,
      },
    };

    console.log('[Moneybird Create Invoice] Creating invoice with payload:', JSON.stringify(invoicePayload));

    const invoiceResponse = await fetch(
      `${MONEYBIRD_API_BASE}/${settings.administration_id}/sales_invoices.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${settings.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(invoicePayload),
      }
    );

    if (!invoiceResponse.ok) {
      const errorText = await invoiceResponse.text();
      console.error('[Moneybird Create Invoice] Failed to create invoice:', errorText);
      
      await supabase.from('moneybird_sync_logs').insert({
        user_id: user.id,
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

    const moneybirdInvoice = await invoiceResponse.json();
    console.log('[Moneybird Create Invoice] Invoice created:', moneybirdInvoice.id);

    // Store the sync record
    await supabase
      .from('moneybird_invoice_sync')
      .upsert({
        partner_invoice_id: partnerInvoiceId,
        moneybird_invoice_id: moneybirdInvoice.id,
        moneybird_administration_id: settings.administration_id,
        moneybird_status: moneybirdInvoice.state || 'draft',
        external_url: `https://moneybird.com/${settings.administration_id}/sales_invoices/${moneybirdInvoice.id}`,
        sync_status: 'synced',
        last_synced_at: new Date().toISOString(),
      }, {
        onConflict: 'partner_invoice_id,moneybird_administration_id',
      });

    // Log success
    await supabase.from('moneybird_sync_logs').insert({
      user_id: user.id,
      operation_type: 'create_invoice',
      entity_type: 'invoice',
      entity_id: partnerInvoiceId,
      request_payload: invoicePayload,
      response_payload: { moneybird_id: moneybirdInvoice.id, state: moneybirdInvoice.state },
      success: true,
      duration_ms: Date.now() - startTime,
    });

    // Optionally send the invoice
    if (settings.auto_send_invoices) {
      console.log('[Moneybird Create Invoice] Auto-sending invoice...');
      
      const sendResponse = await fetch(
        `${MONEYBIRD_API_BASE}/${settings.administration_id}/sales_invoices/${moneybirdInvoice.id}/send_invoice.json`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${settings.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sales_invoice_sending: {
              delivery_method: 'Email',
            },
          }),
        }
      );

      if (sendResponse.ok) {
        console.log('[Moneybird Create Invoice] Invoice sent via email');
        
        await supabase
          .from('moneybird_invoice_sync')
          .update({ moneybird_status: 'sent' })
          .eq('partner_invoice_id', partnerInvoiceId)
          .eq('moneybird_administration_id', settings.administration_id);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        moneybirdInvoiceId: moneybirdInvoice.id,
        externalUrl: `https://moneybird.com/${settings.administration_id}/sales_invoices/${moneybirdInvoice.id}`,
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
});
