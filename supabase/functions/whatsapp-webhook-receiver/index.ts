import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyWhatsAppWebhook } from '../_shared/webhook-verifier.ts';
import { getCorsHeaders } from '../_shared/cors.ts';

serve(async (req) => {
  const requestId = crypto.randomUUID().slice(0, 8);

  const corsHeaders = getCorsHeaders(req);

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
      const rawBody = await req.text();

      // Verify Meta webhook signature (X-Hub-Signature-256)
      const appSecret = Deno.env.get('WHATSAPP_APP_SECRET');
      const hubSignature = req.headers.get('X-Hub-Signature-256');
      if (appSecret && hubSignature) {
        const isValid = await verifyWhatsAppWebhook(rawBody, hubSignature, appSecret);
        if (!isValid) {
          console.error(`[${requestId}] WhatsApp webhook signature verification failed`);
          return new Response('Invalid signature', { status: 403 });
        }
        console.log(`[${requestId}] WhatsApp webhook signature verified`);
      } else if (Deno.env.get('DENO_ENV') !== 'development') {
        console.warn(`[${requestId}] WhatsApp webhook signature verification skipped — missing WHATSAPP_APP_SECRET`);
      }

      const body = JSON.parse(rawBody);
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
  supabase: SupabaseClient,
  account: Record<string, unknown>,
  message: Record<string, unknown>,
  contact: Record<string, unknown> | undefined,
  requestId: string
) {
  const msg = message as Record<string, Record<string, unknown> & { body?: string; id?: string; caption?: string; mime_type?: string; filename?: string; emoji?: string; message_id?: string; latitude?: number; longitude?: number; name?: string; text?: string; title?: string; button_reply?: Record<string, unknown>; list_reply?: Record<string, unknown> }>;
  console.log(`[${requestId}] Processing incoming message:`, { messageId: msg.id, from: msg.from });

  const senderPhone = msg.from as unknown as string;
  const contactProfile = (contact as Record<string, unknown>)?.profile as Record<string, unknown> | undefined;
  const senderName = contactProfile?.name || (contact as Record<string, unknown>)?.wa_id;

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

  switch (msg.type as unknown as string) {
    case 'text':
      content = msg.text?.body || '';
      break;
    case 'image':
      mediaId = msg.image?.id;
      content = msg.image?.caption || '';
      mediaMimeType = msg.image?.mime_type;
      break;
    case 'document':
      mediaId = msg.document?.id;
      content = msg.document?.caption || '';
      mediaMimeType = msg.document?.mime_type;
      mediaFilename = msg.document?.filename;
      break;
    case 'audio':
      mediaId = msg.audio?.id;
      mediaMimeType = msg.audio?.mime_type;
      break;
    case 'video':
      mediaId = msg.video?.id;
      content = msg.video?.caption || '';
      mediaMimeType = msg.video?.mime_type;
      break;
    case 'sticker':
      mediaId = msg.sticker?.id;
      mediaMimeType = msg.sticker?.mime_type;
      break;
    case 'location':
      content = `Location: ${msg.location?.latitude}, ${msg.location?.longitude}`;
      if (msg.location?.name) content += ` - ${msg.location.name}`;
      break;
    case 'reaction':
      reactionEmoji = msg.reaction?.emoji;
      reactionMessageId = msg.reaction?.message_id;
      messageType = 'reaction';
      break;
    case 'button':
      content = msg.button?.text || '';
      break;
    case 'interactive':
      if (msg.interactive?.button_reply) {
        content = msg.interactive.button_reply.title;
      } else if (msg.interactive?.list_reply) {
        content = msg.interactive.list_reply.title;
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
      wa_message_id: message.id as string,
      content,
      media_id: mediaId,
      media_mime_type: mediaMimeType,
      media_filename: mediaFilename,
      reaction_emoji: reactionEmoji,
      reaction_message_id: reactionMessageId,
      context_message_id: (message.context as Record<string, unknown> | undefined)?.id,
      status: 'received',
      created_at: new Date(parseInt(message.timestamp as string) * 1000).toISOString()
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

async function handleStatusUpdate(supabase: SupabaseClient, status: Record<string, unknown>, requestId: string) {
  console.log(`[${requestId}] Processing status update:`, { messageId: status.id, status: status.status });

  const statusMap: Record<string, string> = {
    'sent': 'sent',
    'delivered': 'delivered',
    'read': 'read',
    'failed': 'failed'
  };

  const mappedStatus = statusMap[status.status as string] || (status.status as string);

  const updateData: Record<string, unknown> = {
    status: mappedStatus,
    status_timestamp: new Date(parseInt(status.timestamp as string) * 1000).toISOString()
  };

  const errors = status.errors as Array<Record<string, unknown>> | undefined;
  if (errors && errors.length > 0) {
    updateData.error_code = errors[0].code?.toString();
    updateData.error_message = errors[0].title || errors[0].message;
  }

  const { error } = await supabase
    .from('whatsapp_messages')
    .update(updateData)
    .eq('wa_message_id', status.id as string);

  if (error) {
    console.error(`[${requestId}] Error updating message status:`, error);
  } else {
    console.log(`[${requestId}] Status updated successfully`);
  }
}
