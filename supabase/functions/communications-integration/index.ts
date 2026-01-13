import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

import { handleSendEmail } from "./actions/send-email.ts";
import { handleSendSms } from "./actions/send-sms.ts";
import { handleSendWhatsapp } from "./actions/send-whatsapp.ts";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ACTION_HANDLERS = {
    'send-email': handleSendEmail,
    'send-sms': handleSendSms,
    'send-whatsapp': handleSendWhatsapp,
};

const RouterSchema = z.object({
    action: z.enum(['send-email', 'send-sms', 'send-whatsapp']),
    payload: z.record(z.unknown()).optional(),
});

serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    try {
        const rawBody = await req.json();
        const result = RouterSchema.safeParse(rawBody);

        if (!result.success) {
            return new Response(
                JSON.stringify({ error: 'Invalid Request', details: result.error }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        const { action, payload } = result.data;
        const handler = ACTION_HANDLERS[action];

        console.log(`[Comms Service] Executing: ${action}`);

        // Pass req context if needed? Mostly just supabase client + payload
        // Some handlers need Auth context from Headers. 
        // Let's modify handlers to accept (supabase, payload, req) if needed.
        // Or cleaner: Extract user from header here and pass it.

        const authHeader = req.headers.get('Authorization');
        let userId: string | null = null;
        if (authHeader) {
            const { data: { user } } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
            userId = user?.id || null;
        }

        const response = await handler({ supabase, payload: payload || {}, userId });

        return new Response(
            JSON.stringify(response),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (error) {
        console.error(`[Comms Service] Error:`, error);
        return new Response(
            JSON.stringify({ error: error instanceof Error ? error.message : 'Internal Server Error' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
