import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const webhookToken = Deno.env.get('MONEYBIRD_WEBHOOK_TOKEN');
  const administrationId = Deno.env.get('MONEYBIRD_ADMINISTRATION_ID')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Verify webhook token if configured
    const url = new URL(req.url);
    const token = url.searchParams.get('token');
    
    if (webhookToken && token !== webhookToken) {
      console.warn('[Moneybird Webhook] Invalid token');
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    console.log('[Moneybird Webhook] Received:', JSON.stringify(body));

    const { entity, action, state, administration_id } = body;

    // Only process sales invoice events
    if (entity !== 'SalesInvoice') {
      console.log('[Moneybird Webhook] Ignoring non-invoice event:', entity);
      return new Response(
        JSON.stringify({ success: true, message: 'Ignored' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify it's for our administration
    if (administration_id?.toString() !== administrationId) {
      console.log('[Moneybird Webhook] Ignoring event for different administration');
      return new Response(
        JSON.stringify({ success: true, message: 'Different administration' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const invoiceId = body.id?.toString();
    
    if (!invoiceId) {
      console.warn('[Moneybird Webhook] Missing invoice ID');
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find the synced invoice
    const { data: sync, error: syncError } = await supabase
      .from('moneybird_invoice_sync')
      .select('*, partner_invoices(id, status)')
      .eq('moneybird_invoice_id', invoiceId)
      .eq('moneybird_administration_id', administrationId)
      .single();

    if (syncError || !sync) {
      console.log('[Moneybird Webhook] Invoice not found in sync records:', invoiceId);
      return new Response(
        JSON.stringify({ success: true, message: 'Invoice not tracked' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const previousStatus = sync.moneybird_status;
    const newStatus = state;

    console.log(`[Moneybird Webhook] Invoice ${invoiceId} status: ${previousStatus} -> ${newStatus}`);

    // Update sync record
    await supabase
      .from('moneybird_invoice_sync')
      .update({
        moneybird_status: newStatus,
        last_synced_at: new Date().toISOString(),
      })
      .eq('id', sync.id);

    // Handle payment received
    if (newStatus === 'paid' && previousStatus !== 'paid') {
      console.log(`[Moneybird Webhook] Payment received for TQC invoice: ${sync.partner_invoice_id}`);

      // Update partner invoice
      await supabase
        .from('partner_invoices')
        .update({
          status: 'paid',
          paid_at: new Date().toISOString(),
        })
        .eq('id', sync.partner_invoice_id);

      // Log the webhook event
      await supabase.from('moneybird_sync_logs').insert({
        operation_type: 'webhook_payment',
        entity_type: 'invoice',
        entity_id: sync.partner_invoice_id,
        request_payload: body,
        response_payload: { previous_status: previousStatus, new_status: newStatus },
        success: true,
      });
    }

    // Handle other status changes
    if (newStatus !== previousStatus) {
      await supabase.from('moneybird_sync_logs').insert({
        operation_type: 'webhook_status_change',
        entity_type: 'invoice',
        entity_id: sync.partner_invoice_id,
        request_payload: body,
        response_payload: { previous_status: previousStatus, new_status: newStatus },
        success: true,
      });
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Moneybird Webhook] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
