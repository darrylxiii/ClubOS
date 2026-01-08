import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Unified CORS headers
 */
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key, x-supabase-api-version',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

const WHATSAPP_API_URL = 'https://graph.facebook.com/v21.0';

interface SendMessageRequest {
  conversationId?: string;
  candidatePhone?: string;
  candidateId?: string;
  messageType: 'text' | 'template' | 'image' | 'document';
  content?: string;
  templateName?: string;
  templateParams?: Record<string, string>[];
  mediaUrl?: string;
  mediaCaption?: string;
}

serve(async (req) => {
  const requestId = crypto.randomUUID().slice(0, 8);
  const origin = req.headers.get('origin') || 'unknown';

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    console.log(`[${requestId}] CORS preflight from: ${origin}`);
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  console.log(`[${requestId}] ${req.method} from: ${origin}`);

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const whatsappAccessToken = Deno.env.get('WHATSAPP_ACCESS_TOKEN');
    const phoneNumberId = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID');

    if (!whatsappAccessToken || !phoneNumberId) {
      throw new Error('WhatsApp API credentials not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get authenticated user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const body: SendMessageRequest = await req.json();
    const { 
      conversationId, 
      candidatePhone, 
      candidateId,
      messageType, 
      content, 
      templateName, 
      templateParams,
      mediaUrl,
      mediaCaption 
    } = body;

    console.log(`[${requestId}] Sending WhatsApp message:`, { messageType, conversationId, candidatePhone });

    // Get or create conversation
    let conversation;
    let recipientPhone = candidatePhone;

    if (conversationId) {
      const { data, error } = await supabase
        .from('whatsapp_conversations')
        .select('*, whatsapp_business_accounts(*)')
        .eq('id', conversationId)
        .single();
      
      if (error) throw error;
      conversation = data;
      recipientPhone = conversation.candidate_phone;
    } else if (candidatePhone) {
      // Get default account
      const { data: account, error: accountError } = await supabase
        .from('whatsapp_business_accounts')
        .select('*')
        .eq('is_active', true)
        .limit(1)
        .single();
      
      if (accountError) throw new Error('No active WhatsApp account configured');

      // Find or create conversation
      const { data: existingConv } = await supabase
        .from('whatsapp_conversations')
        .select('*')
        .eq('account_id', account.id)
        .eq('candidate_phone', candidatePhone)
        .single();

      if (existingConv) {
        conversation = { ...existingConv, whatsapp_business_accounts: account };
      } else {
        // Get candidate name if candidateId provided
        let candidateName = null;
        if (candidateId) {
          const { data: candidate } = await supabase
            .from('candidate_profiles')
            .select('full_name')
            .eq('id', candidateId)
            .single();
          candidateName = candidate?.full_name;
        }

        const { data: newConv, error: createError } = await supabase
          .from('whatsapp_conversations')
          .insert({
            account_id: account.id,
            candidate_id: candidateId,
            candidate_phone: candidatePhone,
            candidate_name: candidateName,
            conversation_status: 'active'
          })
          .select('*')
          .single();
        
        if (createError) throw createError;
        conversation = { ...newConv, whatsapp_business_accounts: account };
      }
    } else {
      throw new Error('Either conversationId or candidatePhone is required');
    }

    // Build WhatsApp API message payload
    if (!recipientPhone) {
      throw new Error('Recipient phone number is required');
    }

    let messagePayload: any = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: recipientPhone.replace(/[^0-9]/g, ''),
    };

    if (messageType === 'template' && templateName) {
      const windowExpired = conversation.messaging_window_expires_at 
        ? new Date(conversation.messaging_window_expires_at) < new Date()
        : true;

      if (windowExpired && messageType !== 'template') {
        throw new Error('24-hour messaging window expired. Please use a template message.');
      }

      messagePayload.type = 'template';
      messagePayload.template = {
        name: templateName,
        language: { code: 'en' },
        components: templateParams ? [
          {
            type: 'body',
            parameters: templateParams.map(param => ({
              type: 'text',
              text: param.value
            }))
          }
        ] : []
      };
    } else if (messageType === 'text' && content) {
      messagePayload.type = 'text';
      messagePayload.text = { body: content };
    } else if (messageType === 'image' && mediaUrl) {
      messagePayload.type = 'image';
      messagePayload.image = {
        link: mediaUrl,
        caption: mediaCaption
      };
    } else if (messageType === 'document' && mediaUrl) {
      messagePayload.type = 'document';
      messagePayload.document = {
        link: mediaUrl,
        caption: mediaCaption
      };
    } else {
      throw new Error('Invalid message type or missing content');
    }

    // Send to WhatsApp API
    console.log(`[${requestId}] Sending to WhatsApp API`);
    
    const waResponse = await fetch(
      `${WHATSAPP_API_URL}/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${whatsappAccessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messagePayload),
      }
    );

    const waResult = await waResponse.json();

    if (!waResponse.ok) {
      console.error(`[${requestId}] WhatsApp API error:`, waResult);
      throw new Error(waResult.error?.message || 'Failed to send WhatsApp message');
    }

    const waMessageId = waResult.messages?.[0]?.id;

    // Store message in database
    const { data: message, error: messageError } = await supabase
      .from('whatsapp_messages')
      .insert({
        account_id: conversation.account_id || conversation.whatsapp_business_accounts?.id,
        conversation_id: conversation.id,
        candidate_id: conversation.candidate_id,
        direction: 'outbound',
        message_type: messageType,
        wa_message_id: waMessageId,
        content: content || mediaCaption,
        template_name: templateName,
        template_params: templateParams,
        media_url: mediaUrl,
        status: 'sent',
        sent_by: user.id,
        is_automated: false
      })
      .select('*')
      .single();

    if (messageError) {
      console.error(`[${requestId}] Error storing message:`, messageError);
    }

    console.log(`[${requestId}] Message sent successfully:`, { waMessageId, messageId: message?.id });

    return new Response(
      JSON.stringify({
        success: true,
        messageId: message?.id,
        waMessageId,
        conversationId: conversation.id
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error(`[${requestId}] Error:`, error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
