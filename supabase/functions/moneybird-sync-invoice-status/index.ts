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
    const { partnerInvoiceId, syncAll = false } = body;

    // Get invoices to sync
    let query = supabase
      .from('moneybird_invoice_sync')
      .select('*, partner_invoices(id, status)')
      .eq('moneybird_administration_id', settings.administration_id)
      .eq('sync_status', 'synced');

    if (partnerInvoiceId) {
      query = query.eq('partner_invoice_id', partnerInvoiceId);
    } else if (!syncAll) {
      // Only sync invoices that are not paid yet
      query = query.not('moneybird_status', 'in', '(paid,uncollectible)');
    }

    const { data: invoiceSyncs, error: syncError } = await query.limit(50);

    if (syncError) {
      console.error('[Moneybird Sync Status] Failed to fetch syncs:', syncError);
      throw syncError;
    }

    console.log(`[Moneybird Sync Status] Checking ${invoiceSyncs?.length || 0} invoices`);

    const results = {
      checked: 0,
      updated: 0,
      paid: 0,
      errors: [] as string[],
    };

    for (const sync of invoiceSyncs || []) {
      try {
        results.checked++;

        // Fetch invoice status from Moneybird
        const invoiceResponse = await fetch(
          `${MONEYBIRD_API_BASE}/${settings.administration_id}/sales_invoices/${sync.moneybird_invoice_id}.json`,
          {
            headers: { 'Authorization': `Bearer ${settings.access_token}` },
          }
        );

        if (!invoiceResponse.ok) {
          if (invoiceResponse.status === 404) {
            // Invoice deleted in Moneybird
            await supabase
              .from('moneybird_invoice_sync')
              .update({
                sync_status: 'error',
                sync_error: 'Invoice not found in Moneybird',
                last_synced_at: new Date().toISOString(),
              })
              .eq('id', sync.id);
            continue;
          }
          throw new Error(`Fetch failed: ${invoiceResponse.status}`);
        }

        const moneybirdInvoice = await invoiceResponse.json();
        const newStatus = moneybirdInvoice.state;
        const previousStatus = sync.moneybird_status;

        // Update sync record if status changed
        if (newStatus !== previousStatus) {
          await supabase
            .from('moneybird_invoice_sync')
            .update({
              moneybird_status: newStatus,
              last_synced_at: new Date().toISOString(),
            })
            .eq('id', sync.id);

          results.updated++;
          console.log(`[Moneybird Sync Status] Updated ${sync.partner_invoice_id}: ${previousStatus} -> ${newStatus}`);

          // If invoice is now paid, update TQC invoice and trigger referral processing
          if (newStatus === 'paid' && previousStatus !== 'paid') {
            results.paid++;

            // Update partner invoice status
            await supabase
              .from('partner_invoices')
              .update({ 
                status: 'paid',
                paid_at: new Date().toISOString(),
              })
              .eq('id', sync.partner_invoice_id);

            // Log payment received
            await supabase.from('moneybird_sync_logs').insert({
              user_id: user.id,
              operation_type: 'payment_received',
              entity_type: 'invoice',
              entity_id: sync.partner_invoice_id,
              response_payload: {
                moneybird_invoice_id: sync.moneybird_invoice_id,
                total_paid: moneybirdInvoice.total_paid,
                paid_at: moneybirdInvoice.paid_at,
              },
              success: true,
            });

            console.log(`[Moneybird Sync Status] Payment received for invoice: ${sync.partner_invoice_id}`);
          }
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        results.errors.push(`${sync.partner_invoice_id}: ${errorMsg}`);
        console.error(`[Moneybird Sync Status] Error for ${sync.partner_invoice_id}:`, error);
      }
    }

    // Log the sync operation
    await supabase.from('moneybird_sync_logs').insert({
      user_id: user.id,
      operation_type: 'sync_invoice_status',
      entity_type: 'invoice',
      entity_id: partnerInvoiceId || 'bulk',
      response_payload: results,
      success: results.errors.length === 0,
      error_message: results.errors.length > 0 ? results.errors.join('; ') : null,
      duration_ms: Date.now() - startTime,
    });

    console.log(`[Moneybird Sync Status] Completed:`, results);

    return new Response(
      JSON.stringify({ success: true, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Moneybird Sync Status] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
