import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const accessToken = Deno.env.get('MONEYBIRD_ACCESS_TOKEN');
  const administrationId = Deno.env.get('MONEYBIRD_ADMINISTRATION_ID');
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { placementFeeId } = await req.json();

    if (!placementFeeId) {
      return new Response(
        JSON.stringify({ error: 'placementFeeId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[create-placement-invoice] Processing placement fee: ${placementFeeId}`);

    // 1. Fetch placement fee with job + company + candidate context
    const { data: fee, error: feeError } = await supabase
      .from('placement_fees')
      .select(`
        *,
        jobs:job_id (title, company_id, companies:company_id (id, name, headquarters_location, country_code, vat_number, placement_fee_percentage)),
        candidate_profiles:candidate_id (full_name)
      `)
      .eq('id', placementFeeId)
      .single();

    if (feeError || !fee) {
      console.error('[create-placement-invoice] Placement fee not found:', feeError);
      return new Response(
        JSON.stringify({ error: 'Placement fee not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Idempotency: if invoice_id already set, return existing
    if (fee.invoice_id) {
      console.log(`[create-placement-invoice] Invoice already exists: ${fee.invoice_id}`);
      const { data: existingInvoice } = await supabase
        .from('partner_invoices')
        .select('id, invoice_number, status')
        .eq('id', fee.invoice_id)
        .single();

      return new Response(
        JSON.stringify({ 
          success: true, 
          alreadyExisted: true,
          partnerInvoiceId: fee.invoice_id,
          invoiceNumber: existingInvoice?.invoice_number,
          status: existingInvoice?.status,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const company = (fee as any).jobs?.companies;
    const jobTitle = (fee as any).jobs?.title || 'Position';
    const candidateName = (fee as any).candidate_profiles?.full_name || 'Candidate';
    const companyId = company?.id || fee.partner_company_id;

    if (!companyId) {
      return new Response(
        JSON.stringify({ error: 'No company linked to this placement fee' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Generate invoice number
    const now = new Date();
    const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const shortId = placementFeeId.substring(0, 6).toUpperCase();
    const invoiceNumber = `TQC-${yearMonth}-${shortId}`;

    // 4. Create partner_invoices row
    const dueDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const feeAmount = fee.fee_amount || 0;

    // Determine VAT rate based on company country
    const countryCode = company?.country_code || 'NL';
    const taxRate = countryCode === 'AE' ? 5 : 21; // Dubai 5% VAT, NL 21% BTW

    const { data: partnerInvoice, error: invoiceError } = await supabase
      .from('partner_invoices')
      .insert({
        invoice_number: invoiceNumber,
        partner_company_id: companyId,
        invoice_date: now.toISOString().split('T')[0],
        due_date: dueDate.toISOString().split('T')[0],
        subtotal: feeAmount,
        tax_rate: taxRate,
        tax_amount: Math.round(feeAmount * (taxRate / 100) * 100) / 100,
        total_amount: Math.round(feeAmount * (1 + taxRate / 100) * 100) / 100,
        currency_code: fee.currency_code || 'EUR',
        status: 'draft',
        payment_terms_days: 30,
        placement_fee_id: placementFeeId,
        notes: `Placement fee: ${candidateName} - ${jobTitle} at ${company?.name || 'Client'}`,
      })
      .select()
      .single();

    if (invoiceError || !partnerInvoice) {
      console.error('[create-placement-invoice] Failed to create partner invoice:', invoiceError);
      throw new Error(`Failed to create partner invoice: ${invoiceError?.message}`);
    }

    console.log(`[create-placement-invoice] Created partner invoice: ${partnerInvoice.id}`);

    // 5. Link placement_fee to partner_invoice
    await supabase
      .from('placement_fees')
      .update({ 
        invoice_id: partnerInvoice.id,
        status: 'invoiced',
      })
      .eq('id', placementFeeId);

    // 6. Create Moneybird draft (non-blocking)
    let moneybirdResult = null;
    if (accessToken && administrationId) {
      try {
        // Call the existing moneybird-create-invoice function internally
        const mbResponse = await fetch(`${supabaseUrl}/functions/v1/moneybird-create-invoice`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({
            partnerInvoiceId: partnerInvoice.id,
            companyId,
            amount: feeAmount,
            description: `Placement fee: ${candidateName} - ${jobTitle}`,
            invoiceNumber,
            dueDate: dueDate.toISOString().split('T')[0],
            countryCode: company?.country_code || 'NL',
            vatNumber: company?.vat_number || undefined,
          }),
        });

        if (mbResponse.ok) {
          moneybirdResult = await mbResponse.json();
          console.log(`[create-placement-invoice] Moneybird draft created: ${moneybirdResult.moneybirdInvoiceId}`);
        } else {
          const errText = await mbResponse.text();
          console.warn(`[create-placement-invoice] Moneybird failed (non-blocking): ${errText}`);
        }
      } catch (mbError) {
        console.warn('[create-placement-invoice] Moneybird call failed (non-blocking):', mbError);
      }
    } else {
      console.log('[create-placement-invoice] Moneybird not configured, skipping draft creation');
    }

    // 7. Log the operation
    await supabase.from('moneybird_sync_logs').insert({
      operation_type: 'create_placement_invoice',
      entity_type: 'placement_fee',
      entity_id: placementFeeId,
      response_payload: {
        partner_invoice_id: partnerInvoice.id,
        invoice_number: invoiceNumber,
        moneybird: moneybirdResult ? { id: moneybirdResult.moneybirdInvoiceId, url: moneybirdResult.externalUrl } : null,
      },
      success: true,
      duration_ms: Date.now() - startTime,
    });

    return new Response(
      JSON.stringify({
        success: true,
        partnerInvoiceId: partnerInvoice.id,
        invoiceNumber,
        feeAmount,
        status: 'invoiced',
        moneybirdDraft: moneybirdResult ? {
          id: moneybirdResult.moneybirdInvoiceId,
          url: moneybirdResult.externalUrl,
        } : null,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[create-placement-invoice] Error:', error);

    await supabase.from('moneybird_sync_logs').insert({
      operation_type: 'create_placement_invoice',
      entity_type: 'placement_fee',
      entity_id: null,
      success: false,
      error_message: error instanceof Error ? error.message : 'Unknown error',
      duration_ms: Date.now() - startTime,
    }).catch(() => {});

    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
