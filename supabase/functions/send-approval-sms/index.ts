import { createHandler } from '../_shared/handler.ts';
import { getAppUrl, AppUrls } from '../_shared/app-config.ts';
import { createFunctionLogger } from '../_shared/function-logger.ts';
import { sendSMS } from '../_shared/twilio-client.ts';

const APP_URL = getAppUrl();

interface SMSRequest {
  phone: string;
  fullName: string;
  requestType: 'candidate' | 'partner';
}

Deno.serve(createHandler(async (req, ctx) => {
  const logger = createFunctionLogger('send-approval-sms');

    const body: SMSRequest & { userId?: string } = await req.json();
    const { phone, fullName, requestType, userId } = body;

    logger.logRequest(req.method, undefined, { phone, requestType });

    if (!phone) {
      logger.warn('No phone number provided');
      return new Response(
        JSON.stringify({ success: false, message: 'No phone number' }),
        { headers: { ...ctx.corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // SMS message content - discreet, luxury tone
    const message = requestType === 'candidate'
      ? `Welcome to The Quantum Club, ${fullName}. Your application has been approved. Darryl will contact you within 19 minutes. Log in: ${AppUrls.auth()}`
      : `Welcome to The Quantum Club. Your partner application has been approved. Darryl will reach out within 19 minutes to discuss your hiring needs. Log in: ${AppUrls.auth()}`;

    // Send SMS via Twilio (shared client handles auth, timeout, retry)
    logger.checkpoint('sending_sms');
    const result = await sendSMS({ to: phone, body: message });
    logger.logExternalCall('twilio', 'Messages.json', 200, logger.getElapsedMs());
    logger.info('SMS sent successfully', { messageSid: result.sid });

    // Log notification to database
    try {
      if (userId && requestType) {
        await ctx.supabase.from('approval_notification_logs').insert({
          user_id: userId,
          request_type: requestType,
          notification_type: 'sms',
          status: 'sent',
          metadata: {
            message_sid: result.sid,
            phone: phone
          }
        });
        logger.info('SMS notification logged to database');
      }
    } catch (logError) {
      logger.error('Failed to log SMS notification', logError);
    }

    logger.logSuccess(200, { messageSid: result.sid });
    return new Response(
      JSON.stringify({ success: true, messageSid: result.sid }),
      { headers: { ...ctx.corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
}));
