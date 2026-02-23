import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0';

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Resend Webhook Handler
 * Receives bounce, complaint, and delivery events from Resend.
 * Updates email_verifications with delivery status.
 *
 * Webhook events: https://resend.com/docs/dashboard/webhooks/introduction
 */
const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    const { type, data } = payload;

    if (!type || !data) {
      return new Response('Missing type or data', { status: 400 });
    }

    const emailId = data.email_id;
    if (!emailId) {
      console.log(`[Resend Webhook] Event ${type} without email_id, skipping`);
      return new Response('OK', { status: 200 });
    }

    console.log(`[Resend Webhook] Event: ${type}, Email ID: ${emailId}`);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Map Resend event types to a status
    let resendStatus: string;
    switch (type) {
      case 'email.delivered':
        resendStatus = 'delivered';
        break;
      case 'email.bounced':
        resendStatus = 'bounced';
        break;
      case 'email.complained':
        resendStatus = 'complained';
        break;
      case 'email.delivery_delayed':
        resendStatus = 'delayed';
        break;
      default:
        resendStatus = type;
    }

    // Update the email_verifications record with delivery status
    const { error } = await supabase
      .from('email_verifications')
      .update({
        resend_status: resendStatus,
      })
      .eq('resend_id', emailId);

    if (error) {
      console.error('[Resend Webhook] DB update error:', error);
    }

    // Log bounce/complaint for monitoring
    if (['email.bounced', 'email.complained'].includes(type)) {
      console.warn(`[Resend Webhook] ${type}: ID=${emailId}, to=${data.to?.join(',')}`);
    }

    return new Response('OK', { status: 200 });
  } catch (error) {
    console.error('[Resend Webhook] Error:', error);
    return new Response('Internal error', { status: 500 });
  }
};

serve(handler);
