import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0';
import { verifyTwilioWebhook } from '../_shared/webhook-verifier.ts';
import { getCorsHeaders } from '../_shared/cors.ts';

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

/**
 * Twilio Status Callback Webhook
 * Receives delivery status updates for SMS messages.
 * Twilio sends: MessageSid, MessageStatus, ErrorCode (if failed)
 */
const handler = async (req: Request): Promise<Response> => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Twilio sends form-urlencoded data
    const formData = await req.formData();

    // Verify Twilio signature
    const params: Record<string, string> = {};
    formData.forEach((value, key) => { params[key] = value.toString(); });

    const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    const twilioSignature = req.headers.get('X-Twilio-Signature');
    if (twilioAuthToken && twilioSignature) {
      const requestUrl = new URL(req.url).toString();
      const isValid = await verifyTwilioWebhook(requestUrl, params, twilioSignature, twilioAuthToken);
      if (!isValid) {
        console.error('[Twilio Callback] Signature verification failed');
        return new Response('Invalid signature', { status: 403 });
      }
    } else if (Deno.env.get('DENO_ENV') !== 'development') {
      console.warn('[Twilio Callback] Signature verification skipped — missing TWILIO_AUTH_TOKEN or X-Twilio-Signature');
    }

    const messageSid = params['MessageSid'] || formData.get('MessageSid') as string;
    const messageStatus = params['MessageStatus'] || formData.get('MessageStatus') as string;
    const errorCode = params['ErrorCode'] || formData.get('ErrorCode') as string | null;

    if (!messageSid || !messageStatus) {
      return new Response('Missing required fields', { status: 400 });
    }

    console.log(`[Twilio Callback] SID: ${messageSid}, Status: ${messageStatus}, Error: ${errorCode || 'none'}`);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Update the phone_verifications record with delivery status
    const { error } = await supabase
      .from('phone_verifications')
      .update({
        twilio_status: messageStatus,
        twilio_error_code: errorCode || null,
      })
      .eq('twilio_sid', messageSid);

    if (error) {
      console.error('[Twilio Callback] DB update error:', error);
    }

    // Log failed deliveries for monitoring
    if (['failed', 'undelivered'].includes(messageStatus)) {
      console.warn(`[Twilio Callback] SMS delivery failed: SID=${messageSid}, ErrorCode=${errorCode}`);
    }

    // Twilio expects 200 OK
    return new Response('OK', { status: 200 });
  } catch (error) {
    console.error('[Twilio Callback] Error:', error);
    return new Response('Internal error', { status: 500 });
  }
};

serve(handler);
