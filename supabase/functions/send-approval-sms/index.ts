import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { getAppUrl, AppUrls } from '../_shared/app-config.ts';

const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
const TWILIO_PHONE_NUMBER = Deno.env.get("TWILIO_PHONE_NUMBER");

const APP_URL = getAppUrl();

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SMSRequest {
  phone: string;
  fullName: string;
  requestType: 'candidate' | 'partner';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { phone, fullName, requestType }: SMSRequest = await req.json();

    console.log('[send-approval-sms] Sending to:', phone);

    if (!phone) {
      console.warn('[send-approval-sms] No phone number provided');
      return new Response(
        JSON.stringify({ success: false, message: 'No phone number' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
      throw new Error('Twilio credentials not configured');
    }

    // SMS message content - discreet, luxury tone
    const message = requestType === 'candidate'
      ? `Welcome to The Quantum Club, ${fullName}. Your application has been approved. Darryl will contact you within 19 minutes. Log in: ${AppUrls.auth()}`
      : `Welcome to The Quantum Club. Your partner application has been approved. Darryl will reach out within 19 minutes to discuss your hiring needs. Log in: ${AppUrls.auth()}`;

    // Send SMS via Twilio
    const auth = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);
    const twilioResponse = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${auth}`,
        },
        body: new URLSearchParams({
          To: phone,
          From: TWILIO_PHONE_NUMBER,
          Body: message,
        }),
      }
    );

    if (!twilioResponse.ok) {
      const error = await twilioResponse.text();
      console.error('[send-approval-sms] Twilio error:', error);
      throw new Error(`Failed to send SMS: ${error}`);
    }

    const result = await twilioResponse.json();
    console.log('[send-approval-sms] SMS sent successfully:', result.sid);

    // Log notification to database
    try {
      const bodyText = await req.text();
      const { userId, requestType } = JSON.parse(bodyText);
      
      if (userId && requestType) {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        
        await fetch(`${supabaseUrl}/rest/v1/approval_notification_logs`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseServiceKey,
            'Authorization': `Bearer ${supabaseServiceKey}`,
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({
            user_id: userId,
            request_type: requestType,
            notification_type: 'sms',
            status: 'sent',
            metadata: {
              message_sid: result.sid,
              phone: phone
            }
          })
        });
        console.log('SMS notification logged to database');
      }
    } catch (logError) {
      console.error('Failed to log SMS notification:', logError);
    }

    return new Response(
      JSON.stringify({ success: true, messageSid: result.sid }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error: any) {
    console.error('[send-approval-sms] Error:', error);
    
    // Log failed notification attempt
    try {
      const bodyText = await req.text();
      const { userId, requestType, phone } = JSON.parse(bodyText);
      
      if (userId && requestType) {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        
        await fetch(`${supabaseUrl}/rest/v1/approval_notification_logs`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseServiceKey,
            'Authorization': `Bearer ${supabaseServiceKey}`,
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({
            user_id: userId,
            request_type: requestType,
            notification_type: 'sms',
            status: 'failed',
            error_message: error.message,
            metadata: { phone }
          })
        });
      }
    } catch (logError) {
      console.error('Failed to log error:', logError);
    }
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
