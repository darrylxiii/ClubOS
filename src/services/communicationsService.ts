import { supabase } from "@/integrations/supabase/client";

interface SendEmailParams {
    to: string;
    subject: string;
    body: string;
    replyToEmailId?: string;
    attachments?: string[];
}

interface SendSmsParams {
    to: string;
    message: string;
    candidate_id?: string;
    prospect_id?: string;
    company_id?: string;
}

interface SendWhatsappParams {
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

interface ServiceResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
    [key: string]: any;
}

export const communicationsService = {
    sendEmail: async (params: SendEmailParams): Promise<ServiceResponse> => {
        const { data, error } = await supabase.functions.invoke('communications-integration', {
            body: { action: 'send-email', payload: params }
        });
        if (error) throw error;
        return data;
    },

    sendSms: async (params: SendSmsParams): Promise<ServiceResponse> => {
        const { data, error } = await supabase.functions.invoke('communications-integration', {
            body: { action: 'send-sms', payload: params }
        });
        if (error) throw error;
        return data;
    },

    sendWhatsapp: async (params: SendWhatsappParams): Promise<ServiceResponse> => {
        const { data, error } = await supabase.functions.invoke('communications-integration', {
            body: { action: 'send-whatsapp', payload: params }
        });
        if (error) throw error;
        return data;
    }
};
