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

    const invoiceId = body.id?.toString();
    
    if (!invoiceId || !administration_id) {
      console.warn('[Moneybird Webhook] Missing invoice ID or administration ID');
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
      .eq('moneybird_administration_id', administration_id.toString())
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

      // Find settings to get user ID for logging
      const { data: settings } = await supabase
        .from('moneybird_settings')
        .select('user_id')
        .eq('administration_id', administration_id.toString())
        .eq('is_active', true)
        .single();

      // Log the webhook event
      await supabase.from('moneybird_sync_logs').insert({
        user_id: settings?.user_id,
        operation_type: 'webhook_payment',
        entity_type: 'invoice',
        entity_id: sync.partner_invoice_id,
        request_payload: body,
        response_payload: { previous_status: previousStatus, new_status: newStatus },
        success: true,
      });

      // TODO: Trigger referral payout processing if applicable
      // This would involve checking if the invoice has associated referral fees
      // and creating payout records
    }

    // Handle other status changes
    if (newStatus !== previousStatus) {
      const { data: settings } = await supabase
        .from('moneybird_settings')
        .select('user_id')
        .eq('administration_id', administration_id.toString())
        .eq('is_active', true)
        .single();

      await supabase.from('moneybird_sync_logs').insert({
        user_id: settings?.user_id,
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
