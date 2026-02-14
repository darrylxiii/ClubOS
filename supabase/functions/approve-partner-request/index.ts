/**
 * One-Click Admin Provisioning for Partner Requests
 * Provisions a partner account directly from an approval action in the admin panel
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface ProvisionPayload {
  requestId: string;
  approvedBy: string;
}

export async function handler(req: Request) {
  // CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: corsHeaders }
    );
  }

  try {
    const { requestId, approvedBy } = (await req.json()) as ProvisionPayload;

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Fetch the partner request
    const { data: request, error: fetchError } = await supabase
      .from('partner_requests')
      .select('*')
      .eq('id', requestId)
      .single();

    if (fetchError || !request) {
      return new Response(
        JSON.stringify({ error: 'Partner request not found' }),
        { status: 404, headers: corsHeaders }
      );
    }

    if (request.status !== 'pending') {
      return new Response(
        JSON.stringify({ error: `Request is already ${request.status}` }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Create auth user with magic link
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.admin.createUser({
      email: request.contact_email,
      email_confirm: true,
      user_metadata: {
        full_name: request.contact_name,
        phone: request.contact_phone,
      },
    });

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: `Auth creation failed: ${authError?.message}` }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Create company if needed
    let companyId = request.company_id;
    if (!companyId && request.company_name) {
      const { data: company, error: companyError } = await supabase
        .from('companies')
        .insert({
          name: request.company_name,
          domain: new URL(`https://${request.contact_email.split('@')[1]}`).hostname,
          status: 'active',
        })
        .select()
        .single();

      if (companyError) {
        console.error('Company creation error:', companyError);
      } else {
        companyId = company?.id;
      }
    }

    // Assign partner role
    const { error: roleError } = await supabase
      .from('user_roles')
      .insert({
        user_id: user.id,
        role: 'partner',
        company_id: companyId,
      });

    if (roleError) {
      console.error('Role assignment error:', roleError);
    }

    // Update partner request status
    const { error: updateError } = await supabase
      .from('partner_requests')
      .update({
        status: 'approved',
      })
      .eq('id', requestId);

    if (updateError) {
      console.error('Request update error:', updateError);
    }

    // Generate magic link
    const {
      data: { properties: magicLinkData },
      error: linkError,
    } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: request.contact_email,
      options: {
        redirectTo: `${Deno.env.get('APP_URL') || 'https://thequantumclub.lovable.app'}/partner-welcome`,
      },
    });

    if (linkError || !magicLinkData) {
      console.error('Magic link generation error:', linkError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        userId: user.id,
        companyId,
        message: 'Partner provisioned successfully',
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Provisioning error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: corsHeaders }
    );
  }
}

Deno.serve(handler);
