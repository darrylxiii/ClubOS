import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0';

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Twilio Status Callback Webhook
 * Receives delivery status updates for SMS messages.
 * Twilio sends: MessageSid, MessageStatus, ErrorCode (if failed)
 */
const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Twilio sends form-urlencoded data
    const formData = await req.formData();
    const messageSid = formData.get('MessageSid') as string;
    const messageStatus = formData.get('MessageStatus') as string;
    const errorCode = formData.get('ErrorCode') as string | null;

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
