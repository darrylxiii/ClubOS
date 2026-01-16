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
    const businessAccountId = Deno.env.get('WHATSAPP_BUSINESS_ACCOUNT_ID');

    if (!whatsappAccessToken || !businessAccountId) {
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

    console.log(`[${requestId}] Syncing WhatsApp templates for business account: ${businessAccountId}`);

    // Get or create account
    const { data: account, error: accountError } = await supabase
      .from('whatsapp_business_accounts')
      .select('*')
      .eq('business_account_id', businessAccountId)
      .maybeSingle();

    if (accountError && accountError.code !== 'PGRST116') {
      throw accountError;
    }

    if (!account) {
      // Create the account if it doesn't exist
      const phoneNumberId = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID');
      
      const { data: newAccount, error: createError } = await supabase
        .from('whatsapp_business_accounts')
        .insert({
          phone_number_id: phoneNumberId,
          business_account_id: businessAccountId,
          is_active: true,
          created_by: user.id
        })
        .select('*')
        .single();

      if (createError) throw createError;
      account = newAccount;
    }

    // Ensure we have accountId
    const accountId = account?.id;
    if (!accountId) {
      throw new Error('Could not determine account ID');
    }

    // Fetch templates from Meta API
    const templatesResponse = await fetch(
      `${WHATSAPP_API_URL}/${businessAccountId}/message_templates?limit=100`,
      {
        headers: {
          'Authorization': `Bearer ${whatsappAccessToken}`,
        },
      }
    );

    if (!templatesResponse.ok) {
      const errorData = await templatesResponse.json();
      throw new Error(errorData.error?.message || 'Failed to fetch templates');
    }

    const templatesData = await templatesResponse.json();
    const templates = templatesData.data || [];

    console.log(`[${requestId}] Found ${templates.length} templates from Meta`);

    // Upsert templates
    const upsertedTemplates = [];
    
    for (const template of templates) {
      const templateData = {
        account_id: accountId,
        template_name: template.name,
        template_category: template.category,
        language_code: template.language,
        components: template.components,
        approval_status: template.status,
        rejection_reason: template.rejected_reason,
        meta_template_id: template.id,
        quality_score: template.quality_score?.score
      };

      const { data: upserted, error: upsertError } = await supabase
        .from('whatsapp_templates')
        .upsert(templateData, {
          onConflict: 'account_id,template_name,language_code'
        })
        .select('*')
        .single();

      if (upsertError) {
        console.error(`[${requestId}] Error upserting template:`, template.name, upsertError);
      } else {
        upsertedTemplates.push(upserted);
      }
    }

    console.log(`[${requestId}] Synced ${upsertedTemplates.length} templates`);

    return new Response(
      JSON.stringify({
        success: true,
        synced: upsertedTemplates.length,
        templates: upsertedTemplates
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
