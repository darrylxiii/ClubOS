import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const WHATSAPP_API_URL = 'https://graph.facebook.com/v21.0';

const SendWhatsappSchema = z.object({
    conversationId: z.string().optional(),
    candidatePhone: z.string().optional(),
    candidateId: z.string().optional(),
    messageType: z.enum(['text', 'template', 'image', 'document']),
    content: z.string().optional(),
    templateName: z.string().optional(),
    templateParams: z.array(z.record(z.string())).optional(),
    mediaUrl: z.string().optional(),
    mediaCaption: z.string().optional(),
});

interface ActionContext {
    supabase: SupabaseClient;
    payload: any;
    userId: string | null;
}

export async function handleSendWhatsapp({ supabase, payload, userId }: ActionContext) {
    const input = SendWhatsappSchema.parse(payload);

    if (!userId) throw new Error("Unauthorized: User ID required for WhatsApp logging");

    const whatsappAccessToken = Deno.env.get('WHATSAPP_ACCESS_TOKEN');
    const phoneNumberId = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID');

    if (!whatsappAccessToken || !phoneNumberId) throw new Error('WhatsApp API credentials not configured');

    // 1. Resolve Conversation & Recipient
    let conversation;
    let recipientPhone = input.candidatePhone;
    let accountId;

    if (input.conversationId) {
        const { data, error } = await supabase.from('whatsapp_conversations').select('*, whatsapp_business_accounts(*)').eq('id', input.conversationId).single();
        if (error) throw error;
        conversation = data;
        recipientPhone = conversation.candidate_phone;
        accountId = conversation.account_id || conversation.whatsapp_business_accounts?.id;
    } else if (input.candidatePhone) {
        // Find default account
        const { data: account, error: accErr } = await supabase.from('whatsapp_business_accounts').select('*').eq('is_active', true).limit(1).single();
        if (accErr) throw new Error('No active WhatsApp account configured');
        accountId = account.id;

        // Find/Create Conv
        const { data: existing } = await supabase.from('whatsapp_conversations').select('*').eq('account_id', accountId).eq('candidate_phone', input.candidatePhone).single();
        if (existing) {
            conversation = existing;
        } else {
            // Create new
            let cName = null;
            if (input.candidateId) {
                const { data: c } = await supabase.from('candidate_profiles').select('full_name').eq('id', input.candidateId).single();
                cName = c?.full_name;
            }
            const { data: newConv, error: createErr } = await supabase.from('whatsapp_conversations').insert({
                account_id: accountId,
                candidate_id: input.candidateId,
                candidate_phone: input.candidatePhone,
                candidate_name: cName,
                conversation_status: 'active'
            }).select('*').single();
            if (createErr) throw createErr;
            conversation = newConv;
        }
    } else {
        throw new Error('Either conversationId or candidatePhone is required');
    }

    if (!recipientPhone) throw new Error('Recipient phone number is required');

    // 2. Build Payload
    const messagePayload: any = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: recipientPhone.replace(/[^0-9]/g, ''),
    };

    if (input.messageType === 'template' && input.templateName) {
        // Check 24h window
        const windowExpired = conversation.messaging_window_expires_at ? new Date(conversation.messaging_window_expires_at) < new Date() : true;
        if (windowExpired) throw new Error('24-hour messaging window expired. Use template.');

        messagePayload.type = 'template';
        messagePayload.template = {
            name: input.templateName,
            language: { code: 'en' },
            components: input.templateParams ? [{ type: 'body', parameters: input.templateParams.map(p => ({ type: 'text', text: p.value })) }] : []
        };
    } else if (input.messageType === 'text' && input.content) {
        messagePayload.type = 'text';
        messagePayload.text = { body: input.content };
    } else if (['image', 'document'].includes(input.messageType) && input.mediaUrl) {
        messagePayload.type = input.messageType;
        messagePayload[input.messageType] = { link: input.mediaUrl, caption: input.mediaCaption };
    } else {
        throw new Error('Invalid message type or missing content');
    }

    // 3. Send API
    const waResponse = await fetch(`${WHATSAPP_API_URL}/${phoneNumberId}/messages`, {
        method: "POST",
        headers: { 'Authorization': `Bearer ${whatsappAccessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(messagePayload)
    });

    const waResult = await waResponse.json();
    if (!waResponse.ok) throw new Error(waResult.error?.message || 'Failed to send WhatsApp message');

    const waMessageId = waResult.messages?.[0]?.id;

    // 4. Log Message
    const { data: msg, error: logErr } = await supabase.from('whatsapp_messages').insert({
        account_id: accountId,
        conversation_id: conversation.id,
        candidate_id: conversation.candidate_id,
        direction: 'outbound',
        message_type: input.messageType,
        wa_message_id: waMessageId,
        content: input.content || input.mediaCaption,
        template_name: input.templateName,
        template_params: input.templateParams,
        media_url: input.mediaUrl,
        status: 'sent',
        sent_by: userId,
        is_automated: false
    }).select('*').single();

    if (logErr) console.error("Log error:", logErr);

    return { success: true, messageId: msg?.id, waMessageId, conversationId: conversation.id };
}
