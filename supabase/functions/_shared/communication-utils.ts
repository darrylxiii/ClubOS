/**
 * Communication utilities for agent actions
 * Provides functions for sending WhatsApp, SMS, and Email communications
 */

interface SendWhatsAppOptions {
  phone: string;
  message: string;
  candidateId?: string;
  userId?: string;
}

interface SendSMSOptions {
  phone: string;
  message: string;
}

interface SendEmailOptions {
  to: string;
  subject: string;
  body: string;
  html?: string;
}

/**
 * Send WhatsApp message via the WhatsApp Business API
 */
export async function sendWhatsAppMessage(
  supabase: any,
  options: SendWhatsAppOptions
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const { phone, message, candidateId, userId } = options;
  
  const WHATSAPP_ACCESS_TOKEN = Deno.env.get('WHATSAPP_ACCESS_TOKEN');
  const WHATSAPP_PHONE_NUMBER_ID = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID');
  
  if (!WHATSAPP_ACCESS_TOKEN || !WHATSAPP_PHONE_NUMBER_ID) {
    console.warn('[communication] WhatsApp credentials not configured');
    return { success: false, error: 'WhatsApp not configured' };
  }
  
  try {
    console.log('[communication] Sending WhatsApp to:', phone.substring(0, 8) + '****');
    
    // Clean phone number (remove leading +)
    const cleanPhone = phone.replace(/^\+/, '');
    
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: cleanPhone,
          type: 'text',
          text: { body: message }
        }),
      }
    );
    
    if (!response.ok) {
      const errorBody = await response.text();
      console.error('[communication] WhatsApp API error:', response.status, errorBody);
      return { success: false, error: `WhatsApp API error: ${response.status}` };
    }
    
    const result = await response.json();
    const messageId = result.messages?.[0]?.id;
    
    console.log('[communication] WhatsApp sent:', messageId);
    
    // Log the touchpoint
    if (candidateId) {
      await supabase.from('candidate_touchpoints').insert({
        candidate_id: candidateId,
        channel: 'whatsapp',
        direction: 'outbound',
        content: message,
        created_by: userId || 'system',
        metadata: { message_id: messageId, automated: true }
      });
    }
    
    return { success: true, messageId };
  } catch (error) {
    console.error('[communication] WhatsApp error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Send SMS via Twilio
 */
export async function sendSMS(
  options: SendSMSOptions
): Promise<{ success: boolean; messageSid?: string; error?: string }> {
  const { phone, message } = options;
  
  const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID');
  const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN');
  const TWILIO_PHONE_NUMBER = Deno.env.get('TWILIO_PHONE_NUMBER');
  
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
    console.warn('[communication] Twilio credentials not configured');
    return { success: false, error: 'Twilio not configured' };
  }
  
  try {
    console.log('[communication] Sending SMS to:', phone.substring(0, 8) + '****');
    
    const auth = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);
    
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          To: phone,
          From: TWILIO_PHONE_NUMBER,
          Body: message,
        }),
      }
    );
    
    if (!response.ok) {
      const errorBody = await response.text();
      console.error('[communication] Twilio API error:', response.status, errorBody);
      return { success: false, error: `Twilio API error: ${response.status}` };
    }
    
    const result = await response.json();
    console.log('[communication] SMS sent:', result.sid);
    
    return { success: true, messageSid: result.sid };
  } catch (error) {
    console.error('[communication] SMS error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Send Email via Resend
 */
export async function sendEmail(
  options: SendEmailOptions
): Promise<{ success: boolean; emailId?: string; error?: string }> {
  const { to, subject, body, html } = options;
  
  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
  
  if (!RESEND_API_KEY) {
    console.warn('[communication] Resend API key not configured');
    return { success: false, error: 'Email not configured' };
  }
  
  try {
    console.log('[communication] Sending email to:', to);
    
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'The Quantum Club <notifications@thequantumclub.com>',
        to,
        subject,
        text: body,
        html: html || body,
      }),
    });
    
    if (!response.ok) {
      const errorBody = await response.text();
      console.error('[communication] Resend API error:', response.status, errorBody);
      return { success: false, error: `Resend API error: ${response.status}` };
    }
    
    const result = await response.json();
    console.log('[communication] Email sent:', result.id);
    
    return { success: true, emailId: result.id };
  } catch (error) {
    console.error('[communication] Email error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Get candidate contact information
 */
export async function getCandidateContact(
  supabase: any,
  candidateId: string
): Promise<{ phone?: string; email?: string; name?: string } | null> {
  try {
    const { data: candidate, error } = await supabase
      .from('candidate_profiles')
      .select(`
        phone,
        user_id,
        full_name,
        profiles!candidate_profiles_user_id_fkey (
          email,
          full_name,
          phone_number
        )
      `)
      .eq('id', candidateId)
      .single();
    
    if (error || !candidate) {
      console.error('[communication] Candidate not found:', candidateId);
      return null;
    }
    
    const profile = Array.isArray(candidate.profiles) ? candidate.profiles[0] : candidate.profiles;
    
    return {
      phone: candidate.phone || profile?.phone_number,
      email: profile?.email,
      name: candidate.full_name || profile?.full_name
    };
  } catch (error) {
    console.error('[communication] Error fetching candidate:', error);
    return null;
  }
}

/**
 * Log agent communication action
 */
export async function logAgentCommunication(
  supabase: any,
  options: {
    agentName: string;
    userId?: string;
    candidateId?: string;
    channel: 'whatsapp' | 'sms' | 'email';
    action: string;
    success: boolean;
    metadata?: Record<string, any>;
  }
): Promise<void> {
  try {
    await supabase.from('ai_action_log').insert({
      action_type: `agent_${options.channel}_${options.action}`,
      action_data: {
        agent_name: options.agentName,
        candidate_id: options.candidateId,
        channel: options.channel,
        ...options.metadata
      },
      user_id: options.userId,
      status: options.success ? 'completed' : 'failed',
    });
  } catch (error) {
    console.error('[communication] Error logging action:', error);
  }
}
