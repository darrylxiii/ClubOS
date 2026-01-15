import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";
import { publicCorsHeaders } from '../_shared/cors-config.ts';

const corsHeaders = publicCorsHeaders;

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[APPROVE-REFERRAL-PAYOUT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { payout_id, action, approved_by, rejection_reason, payment_reference } = await req.json();

    logStep('Processing payout action', { payout_id, action });

    if (!payout_id || !action) {
      return new Response(
        JSON.stringify({ error: 'Missing payout_id or action' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!['approve', 'reject', 'mark_paid'].includes(action)) {
      return new Response(
        JSON.stringify({ error: 'Invalid action. Must be: approve, reject, or mark_paid' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch the payout
    const { data: payout, error: fetchError } = await supabase
      .from('referral_payouts')
      .select('*')
      .eq('id', payout_id)
      .single();

    if (fetchError || !payout) {
      logStep('Payout not found', { payout_id, error: fetchError });
      return new Response(
        JSON.stringify({ error: 'Payout not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    switch (action) {
      case 'approve':
        if (payout.status !== 'pending') {
          return new Response(
            JSON.stringify({ error: 'Can only approve pending payouts' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        updateData.status = 'approved';
        updateData.approved_by = approved_by;
        updateData.approved_at = new Date().toISOString();
        break;

      case 'reject':
        if (!['pending', 'approved'].includes(payout.status)) {
          return new Response(
            JSON.stringify({ error: 'Can only reject pending or approved payouts' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        updateData.status = 'rejected';
        updateData.rejection_reason = rejection_reason || 'No reason provided';
        break;

      case 'mark_paid':
        if (payout.status !== 'approved' && payout.status !== 'processing') {
          return new Response(
            JSON.stringify({ error: 'Can only mark approved or processing payouts as paid' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        updateData.status = 'paid';
        updateData.paid_at = new Date().toISOString();
        updateData.payment_reference = payment_reference;
        updateData.processed_by = approved_by;
        updateData.processed_at = new Date().toISOString();
        break;
    }

    // Update the payout
    const { data: updated, error: updateError } = await supabase
      .from('referral_payouts')
      .update(updateData)
      .eq('id', payout_id)
      .select()
      .single();

    if (updateError) {
      logStep('Error updating payout', updateError);
      throw updateError;
    }

    // Also update the corresponding referral_earnings if exists
    if (payout.application_id) {
      const earningsUpdate: Record<string, any> = {
        updated_at: new Date().toISOString(),
      };

      if (action === 'mark_paid') {
        earningsUpdate.status = 'paid';
        earningsUpdate.paid_at = new Date().toISOString();
        earningsUpdate.payment_reference = payment_reference;
      } else if (action === 'reject') {
        earningsUpdate.status = 'cancelled';
      }

      if (Object.keys(earningsUpdate).length > 1) {
        await supabase
          .from('referral_earnings')
          .update(earningsUpdate)
          .eq('application_id', payout.application_id)
          .eq('referrer_id', payout.referrer_user_id);
      }
    }

    // Log the activity
    await supabase.from('activity_feed').insert({
      event_type: `referral_payout_${action}`,
      visibility: 'internal',
      user_id: approved_by,
      event_data: {
        payout_id,
        action,
        payout_amount: payout.payout_amount,
        referrer_id: payout.referrer_user_id,
      },
    });

    logStep('Payout updated successfully', { payout_id, action, new_status: updated.status });

    return new Response(
      JSON.stringify({ 
        success: true, 
        payout: updated,
        message: `Payout ${action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'marked as paid'}` 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    logStep('Error processing payout action', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
