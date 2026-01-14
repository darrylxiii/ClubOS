import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { publicCorsHeaders } from "../_shared/cors-config.ts";

import { handleCreateInvoice } from "./actions/create-invoice.ts";
import { handleFetchFinancials } from "./actions/fetch-financials.ts";
import { handleSyncContacts } from "./actions/sync-contacts.ts";
import { handleSyncInvoiceStatus } from "./actions/sync-invoice-status.ts";
import { handleTestConnection } from "./actions/test-connection.ts";

const corsHeaders = publicCorsHeaders;

// Application Registry Mapping
const ACTION_HANDLERS = {
    'create-invoice': handleCreateInvoice,
    'fetch-financials': handleFetchFinancials,
    'sync-contacts': handleSyncContacts,
    'sync-invoice-status': handleSyncInvoiceStatus,
    'test-connection': handleTestConnection,
};

// Input Schema for Router
const RouterSchema = z.object({
    action: z.enum([
        'create-invoice',
        'fetch-financials',
        'sync-contacts',
        'sync-invoice-status',
        'test-connection'
    ]),
    payload: z.record(z.unknown()).optional(),
});

serve(async (req) => {
    // CORS Preflight
    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    try {
        const rawBody = await req.json();

        // Validate Router Payload
        const result = RouterSchema.safeParse(rawBody);
        if (!result.success) {
            return new Response(
                JSON.stringify({ error: 'Invalid Request', details: result.error }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        const { action, payload } = result.data;
        const handler = ACTION_HANDLERS[action];

        console.log(`[Finance Service] Executing action: ${action}`);

        // Execute Handler
        const response = await handler(supabase, payload || {});

        return new Response(
            JSON.stringify(response),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (error) {
        console.error(`[Finance Service] Fatal Error:`, error);
        return new Response(
            JSON.stringify({ error: error instanceof Error ? error.message : 'Internal Server Error' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
