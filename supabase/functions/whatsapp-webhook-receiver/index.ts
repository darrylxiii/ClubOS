import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Unified CORS headers (for app-initiated calls, not Meta webhooks)
 */
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key, x-supabase-api-version',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

serve(async (req) => {
  const requestId = crypto.randomUUID().slice(0, 8);

  // Handle CORS preflight (for app-initiated calls)
  if (req.method === 'OPTIONS') {
    console.log(`[${requestId}] CORS preflight`);
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const verifyToken = Deno.env.get('WHATSAPP_WEBHOOK_VERIFY_TOKEN');

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Handle webhook verification (GET request from Meta)
  if (req.method === 'GET') {
    const url = new URL(req.url);
    const mode = url.searchParams.get('hub.mode');
    const token = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge');

    console.log(`[${requestId}] Webhook verification request:`, { mode, tokenMatch: token === verifyToken });

    if (mode === 'subscribe' && token === verifyToken) {
      console.log(`[${requestId}] Webhook verified successfully`);
      return new Response(challenge, { 
        status: 200,
        headers: { 'Content-Type': 'text/plain' }
      });
    } else {
      console.error(`[${requestId}] Webhook verification failed`);
      return new Response('Verification failed', { status: 403 });
    }
  }

  // Handle incoming webhook events (POST request from Meta)
  if (req.method === 'POST') {
    try {
      const body = await req.json();
      console.log(`[${requestId}] Received webhook payload`);

      const entry = body.entry?.[0];
      if (!entry) {
        console.log(`[${requestId}] No entry in webhook payload`);
        return new Response('OK', { status: 200 });
      }

      const changes = entry.changes?.[0];
      if (!changes) {
        console.log(`[${requestId}] No changes in webhook payload`);
        return new Response('OK', { status: 200 });
      }

      const value = changes.value;
      const phoneNumberId = value.metadata?.phone_number_id;

      // Get the WhatsApp business account
      const { data: account, error: accountError } = await supabase
        .from('whatsapp_business_accounts')
        .select('*')
        .eq('phone_number_id', phoneNumberId)
        .single();

      if (accountError || !account) {
        console.error(`[${requestId}] Account not found for phone_number_id:`, phoneNumberId);
        return new Response('OK', { status: 200 });
      }

      // Handle incoming messages
      if (value.messages) {
        for (const message of value.messages) {
          await handleIncomingMessage(supabase, account, message, value.contacts?.[0], requestId);
        }
      }

      // Handle status updates (sent, delivered, read)
      if (value.statuses) {
        for (const status of value.statuses) {
          await handleStatusUpdate(supabase, status, requestId);
        }
      }

      return new Response('OK', { status: 200 });

    } catch (error) {
      console.error(`[${requestId}] Error processing webhook:`, error);
      // Always return 200 to prevent Meta from retrying
      return new Response('OK', { status: 200 });
    }
  }

  return new Response('Method not allowed', { status: 405 });
});

async function handleIncomingMessage(
  supabase: any,
  account: any,
  message: any,
  contact: any,
  requestId: string
) {
  console.log(`[${requestId}] Processing incoming message:`, { messageId: message.id, from: message.from });

  const senderPhone = message.from;
  const senderName = contact?.profile?.name || contact?.wa_id;

  // Find or create conversation
  let { data: conversation } = await supabase
    .from('whatsapp_conversations')
    .select('*')
    .eq('account_id', account.id)
    .eq('candidate_phone', senderPhone)
    .single();

  if (!conversation) {
    // Try to match with existing candidate by phone
    const { data: candidate } = await supabase
      .from('candidate_profiles')
      .select('id, full_name')
      .or(`phone.eq.${senderPhone},phone.eq.+${senderPhone}`)
      .single();

    // Create new conversation
    const { data: newConv, error: createError } = await supabase
      .from('whatsapp_conversations')
      .insert({
        account_id: account.id,
        candidate_id: candidate?.id,
        candidate_phone: senderPhone,
        candidate_name: candidate?.full_name || senderName,
        conversation_status: 'active',
        messaging_window_expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      })
      .select('*')
      .single();

    if (createError) {
      console.error(`[${requestId}] Error creating conversation:`, createError);
      return;
    }
    conversation = newConv;
  } else {
    // Update messaging window
    await supabase
      .from('whatsapp_conversations')
      .update({
        messaging_window_expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        candidate_name: conversation.candidate_name || senderName
      })
      .eq('id', conversation.id);
  }

  // Extract message content based on type
  let messageType = message.type;
  let content = '';
  let mediaId = null;
  let mediaMimeType = null;
  let mediaFilename = null;
  let reactionEmoji = null;
  let reactionMessageId = null;

  switch (message.type) {
    case 'text':
      content = message.text?.body || '';
      break;
    case 'image':
      mediaId = message.image?.id;
      content = message.image?.caption || '';
      mediaMimeType = message.image?.mime_type;
      break;
    case 'document':
      mediaId = message.document?.id;
      content = message.document?.caption || '';
      mediaMimeType = message.document?.mime_type;
      mediaFilename = message.document?.filename;
      break;
    case 'audio':
      mediaId = message.audio?.id;
      mediaMimeType = message.audio?.mime_type;
      break;
    case 'video':
      mediaId = message.video?.id;
      content = message.video?.caption || '';
      mediaMimeType = message.video?.mime_type;
      break;
    case 'sticker':
      mediaId = message.sticker?.id;
      mediaMimeType = message.sticker?.mime_type;
      break;
    case 'location':
      content = `Location: ${message.location?.latitude}, ${message.location?.longitude}`;
      if (message.location?.name) content += ` - ${message.location.name}`;
      break;
    case 'reaction':
      reactionEmoji = message.reaction?.emoji;
      reactionMessageId = message.reaction?.message_id;
      messageType = 'reaction';
      break;
    case 'button':
      content = message.button?.text || '';
      break;
    case 'interactive':
      if (message.interactive?.button_reply) {
        content = message.interactive.button_reply.title;
      } else if (message.interactive?.list_reply) {
        content = message.interactive.list_reply.title;
      }
      break;
    default:
      content = `[${message.type} message]`;
  }

  // Store the message
  const { data: storedMessage, error: messageError } = await supabase
    .from('whatsapp_messages')
    .insert({
      account_id: account.id,
      conversation_id: conversation.id,
      candidate_id: conversation.candidate_id,
      direction: 'inbound',
      message_type: messageType,
      wa_message_id: message.id,
      content,
      media_id: mediaId,
      media_mime_type: mediaMimeType,
      media_filename: mediaFilename,
      reaction_emoji: reactionEmoji,
      reaction_message_id: reactionMessageId,
      context_message_id: message.context?.id,
      status: 'received',
      created_at: new Date(parseInt(message.timestamp) * 1000).toISOString()
    })
    .select('*')
    .single();

  if (messageError) {
    console.error(`[${requestId}] Error storing message:`, messageError);
    return;
  }

  console.log(`[${requestId}] Message stored successfully:`, storedMessage.id);

  // Queue AI analysis for text messages
  if (messageType === 'text' && content) {
    try {
      await supabase.functions.invoke('process-whatsapp-message', {
        body: { messageId: storedMessage.id }
      });
    } catch (error) {
      console.error(`[${requestId}] Error queueing message for AI analysis:`, error);
    }
  }
}

async function handleStatusUpdate(supabase: any, status: any, requestId: string) {
  console.log(`[${requestId}] Processing status update:`, { messageId: status.id, status: status.status });

  const statusMap: Record<string, string> = {
    'sent': 'sent',
    'delivered': 'delivered',
    'read': 'read',
    'failed': 'failed'
  };

  const mappedStatus = statusMap[status.status] || status.status;

  const updateData: any = {
    status: mappedStatus,
    status_timestamp: new Date(parseInt(status.timestamp) * 1000).toISOString()
  };

  if (status.errors?.length > 0) {
    updateData.error_code = status.errors[0].code?.toString();
    updateData.error_message = status.errors[0].title || status.errors[0].message;
  }

  const { error } = await supabase
    .from('whatsapp_messages')
    .update(updateData)
    .eq('wa_message_id', status.id);

  if (error) {
    console.error(`[${requestId}] Error updating message status:`, error);
  } else {
    console.log(`[${requestId}] Status updated successfully`);
  }
}
