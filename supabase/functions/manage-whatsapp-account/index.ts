import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { createErrorResponse, createSuccessResponse, CommonErrors } from '../_shared/error-responses.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Validates auth and returns user ID, or an error response
 */
async function validateAuth(req: Request): Promise<{ userId: string } | Response> {
  const authHeader = req.headers.get('Authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return createErrorResponse({
      message: 'Authentication required',
      status: 401,
      corsHeaders,
      code: 'AUTH_REQUIRED',
      details: { action: 'Please sign in to manage WhatsApp accounts' }
    });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

  const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const token = authHeader.replace('Bearer ', '');
  
  try {
    const { data: claimsData, error: claimsError } = await supabaseUser.auth.getClaims(token);
    
    if (claimsError) {
      // Check for specific JWT errors
      const errorMessage = claimsError.message?.toLowerCase() || '';
      
      if (errorMessage.includes('expired') || errorMessage.includes('jwt')) {
        console.log('[manage-whatsapp-account] JWT expired or invalid');
        return createErrorResponse({
          message: 'Session expired',
          status: 401,
          corsHeaders,
          code: 'SESSION_EXPIRED',
          details: { action: 'Please sign in again', retry: false }
        });
      }
      
      return createErrorResponse({
        message: 'Authentication failed',
        status: 401,
        corsHeaders,
        code: 'AUTH_FAILED',
        details: { action: 'Please sign in again' }
      });
    }
    
    if (!claimsData?.claims?.sub) {
      return createErrorResponse({
        message: 'Invalid session',
        status: 401,
        corsHeaders,
        code: 'INVALID_SESSION',
        details: { action: 'Please sign in again' }
      });
    }

    const userId = claimsData.claims.sub as string;

    // Check admin role using service client for RLS bypass
    const supabaseService = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data: profile } = await supabaseService
      .from('profiles')
      .select('system_role')
      .eq('id', userId)
      .single();

    if (!profile || !['admin', 'super_admin'].includes(profile.system_role)) {
      return createErrorResponse({
        message: 'Admin access required',
        status: 403,
        corsHeaders,
        code: 'FORBIDDEN',
        details: { action: 'Contact your administrator for WhatsApp management access' }
      });
    }

    return { userId };
  } catch (error) {
    console.error('[manage-whatsapp-account] Auth error:', error);
    const errorMessage = (error as Error).message?.toLowerCase() || '';
    
    // Catch JWT expired errors that might be thrown
    if (errorMessage.includes('expired') || errorMessage.includes('jwt')) {
      return createErrorResponse({
        message: 'Session expired',
        status: 401,
        corsHeaders,
        code: 'SESSION_EXPIRED',
        details: { action: 'Please sign in again', retry: false }
      });
    }
    
    return createErrorResponse({
      message: 'Authentication error',
      status: 401,
      corsHeaders,
      code: 'AUTH_ERROR',
      details: { action: 'Please sign in again' }
    });
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID().slice(0, 8);
  console.log(`[manage-whatsapp-account][${requestId}] Request started`);

  try {
    // Validate authentication
    const authResult = await validateAuth(req);
    if (authResult instanceof Response) {
      return authResult;
    }
    const { userId } = authResult;

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    const { action, account_id, ...data } = body;

    console.log(`[manage-whatsapp-account][${requestId}] Action: ${action}, User: ${userId}`);

    switch (action) {
      // ==================== ACTIVATE (from env secrets) ====================
      case 'activate': {
        const accessToken = Deno.env.get('WHATSAPP_ACCESS_TOKEN');
        const phoneNumberId = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID');
        const businessAccountId = Deno.env.get('WHATSAPP_BUSINESS_ACCOUNT_ID');

        if (!accessToken || !phoneNumberId || !businessAccountId) {
          const missing: string[] = [];
          if (!accessToken) missing.push('WHATSAPP_ACCESS_TOKEN');
          if (!phoneNumberId) missing.push('WHATSAPP_PHONE_NUMBER_ID');
          if (!businessAccountId) missing.push('WHATSAPP_BUSINESS_ACCOUNT_ID');
          
          return new Response(JSON.stringify({
            success: false,
            error: 'WhatsApp credentials not configured',
            code: 'MISSING_CREDENTIALS',
            action: 'Add WhatsApp API credentials in backend settings',
            missing,
          }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Verify connection with Meta API
        console.log('[manage-whatsapp-account] Verifying Meta API connection...');
        const metaResponse = await fetch(
          `https://graph.facebook.com/v21.0/${phoneNumberId}`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );

        const metaData = await metaResponse.json();

        if (metaData.error) {
          console.error('[manage-whatsapp-account] Meta API error:', metaData.error);
          return new Response(JSON.stringify({
            success: false,
            error: metaData.error.message || 'Invalid Meta API credentials',
            code: 'META_API_ERROR',
            action: 'Check your WhatsApp access token and phone number ID',
          }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Check if account exists
        const { data: existing } = await supabase
          .from('whatsapp_business_accounts')
          .select('id')
          .eq('phone_number_id', phoneNumberId)
          .maybeSingle();

        const accountData = {
          phone_number_id: phoneNumberId,
          business_account_id: businessAccountId,
          display_phone_number: metaData.display_phone_number || '+31622888444',
          verified_name: metaData.verified_name || 'The Quantum Club',
          quality_rating: metaData.quality_rating || 'GREEN',
          is_active: true,
          is_primary: true,
          verification_status: 'verified',
          last_verified_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        let result;
        if (existing) {
          // Remove primary from others first
          await supabase
            .from('whatsapp_business_accounts')
            .update({ is_primary: false })
            .neq('id', existing.id);

          const { data, error } = await supabase
            .from('whatsapp_business_accounts')
            .update(accountData)
            .eq('id', existing.id)
            .select()
            .single();

          if (error) throw error;
          result = data;
        } else {
          // Remove primary from all existing
          await supabase
            .from('whatsapp_business_accounts')
            .update({ is_primary: false });

          const { data, error } = await supabase
            .from('whatsapp_business_accounts')
            .insert({
              ...accountData,
              created_by: userId,
              access_token_encrypted: '***', // Token stored in secrets
            })
            .select()
            .single();

          if (error) throw error;
          result = data;
        }

        // Log the activation
        await supabase.from('whatsapp_account_changes').insert({
          account_id: result.id,
          changed_by: userId,
          change_type: 'activated',
          new_state: result,
        });

        console.log('[manage-whatsapp-account] Account activated:', result.display_phone_number);

        return new Response(JSON.stringify({
          success: true,
          account: result,
          webhook_url: `${supabaseUrl}/functions/v1/whatsapp-webhook-receiver`,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // ==================== CREATE ====================
      case 'create': {
        const { phone_number_id, business_account_id, display_phone_number, account_label } = data;

        if (!phone_number_id || !business_account_id || !display_phone_number) {
          return new Response(JSON.stringify({ 
            success: false, 
            error: 'Missing required fields',
            code: 'VALIDATION_ERROR',
            action: 'Provide phone_number_id, business_account_id, and display_phone_number'
          }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const { data: existing } = await supabase
          .from('whatsapp_business_accounts')
          .select('id')
          .eq('phone_number_id', phone_number_id)
          .maybeSingle();

        if (existing) {
          return new Response(JSON.stringify({ 
            success: false, 
            error: 'Account already exists',
            code: 'DUPLICATE',
            action: 'Use the existing account or delete it first'
          }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const { count } = await supabase
          .from('whatsapp_business_accounts')
          .select('*', { count: 'exact', head: true });

        const { data: newAccount, error: insertError } = await supabase
          .from('whatsapp_business_accounts')
          .insert({
            phone_number_id,
            business_account_id,
            display_phone_number,
            account_label,
            is_active: true,
            is_primary: count === 0,
            verification_status: 'pending',
            created_by: userId,
          })
          .select()
          .single();

        if (insertError) throw insertError;

        await supabase.from('whatsapp_account_changes').insert({
          account_id: newAccount.id,
          changed_by: userId,
          change_type: 'created',
          new_state: newAccount,
        });

        return new Response(JSON.stringify({ success: true, account: newAccount }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // ==================== UPDATE ====================
      case 'update': {
        if (!account_id) {
          return new Response(JSON.stringify({ 
            success: false, 
            error: 'account_id required',
            code: 'VALIDATION_ERROR'
          }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const { data: existing } = await supabase
          .from('whatsapp_business_accounts')
          .select('*')
          .eq('id', account_id)
          .maybeSingle();

        if (!existing) {
          return new Response(JSON.stringify({ 
            success: false, 
            error: 'Account not found',
            code: 'NOT_FOUND'
          }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
        if (data.account_label !== undefined) updateData.account_label = data.account_label;
        if (data.is_active !== undefined) updateData.is_active = data.is_active;

        const { data: updated, error: updateError } = await supabase
          .from('whatsapp_business_accounts')
          .update(updateData)
          .eq('id', account_id)
          .select()
          .single();

        if (updateError) throw updateError;

        await supabase.from('whatsapp_account_changes').insert({
          account_id,
          changed_by: userId,
          change_type: 'updated',
          previous_state: existing,
          new_state: updated,
        });

        return new Response(JSON.stringify({ success: true, account: updated }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // ==================== DELETE ====================
      case 'delete': {
        if (!account_id) {
          return new Response(JSON.stringify({ 
            success: false, 
            error: 'account_id required',
            code: 'VALIDATION_ERROR'
          }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const { data: existing } = await supabase
          .from('whatsapp_business_accounts')
          .select('*')
          .eq('id', account_id)
          .maybeSingle();

        if (!existing) {
          return new Response(JSON.stringify({ 
            success: false, 
            error: 'Account not found',
            code: 'NOT_FOUND'
          }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        console.log(`[manage-whatsapp-account] Deleting: ${existing.display_phone_number}`);

        const { error: deleteError } = await supabase
          .from('whatsapp_business_accounts')
          .delete()
          .eq('id', account_id);

        if (deleteError) throw deleteError;

        return new Response(JSON.stringify({ 
          success: true, 
          deleted: existing.display_phone_number 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // ==================== SET PRIMARY ====================
      case 'set-primary': {
        if (!account_id) {
          return new Response(JSON.stringify({ 
            success: false, 
            error: 'account_id required',
            code: 'VALIDATION_ERROR'
          }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        await supabase
          .from('whatsapp_business_accounts')
          .update({ is_primary: false })
          .neq('id', account_id);

        const { data: updated, error: updateError } = await supabase
          .from('whatsapp_business_accounts')
          .update({ is_primary: true, updated_at: new Date().toISOString() })
          .eq('id', account_id)
          .select()
          .single();

        if (updateError) throw updateError;

        await supabase.from('whatsapp_account_changes').insert({
          account_id,
          changed_by: userId,
          change_type: 'set_primary',
          new_state: updated,
        });

        return new Response(JSON.stringify({ success: true, account: updated }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // ==================== VERIFY ====================
      case 'verify': {
        if (!account_id) {
          return new Response(JSON.stringify({ 
            success: false, 
            error: 'account_id required',
            code: 'VALIDATION_ERROR'
          }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const { data: account } = await supabase
          .from('whatsapp_business_accounts')
          .select('*')
          .eq('id', account_id)
          .maybeSingle();

        if (!account) {
          return new Response(JSON.stringify({ 
            success: false, 
            error: 'Account not found',
            code: 'NOT_FOUND'
          }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const accessToken = Deno.env.get('WHATSAPP_ACCESS_TOKEN');
        if (!accessToken) {
          return new Response(JSON.stringify({ 
            success: true, 
            verified: false, 
            error: 'Access token not configured',
            code: 'MISSING_TOKEN'
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        try {
          const metaResponse = await fetch(
            `https://graph.facebook.com/v21.0/${account.phone_number_id}`,
            { headers: { Authorization: `Bearer ${accessToken}` } }
          );

          const metaData = await metaResponse.json();

          if (metaData.error) {
            await supabase
              .from('whatsapp_business_accounts')
              .update({ 
                verification_status: 'failed',
                last_verified_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              })
              .eq('id', account_id);

            return new Response(JSON.stringify({ 
              success: true, 
              verified: false, 
              error: metaData.error.message,
              code: 'META_VERIFICATION_FAILED'
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }

          await supabase
            .from('whatsapp_business_accounts')
            .update({ 
              verification_status: 'verified',
              last_verified_at: new Date().toISOString(),
              verified_name: metaData.verified_name || account.verified_name,
              quality_rating: metaData.quality_rating,
              updated_at: new Date().toISOString(),
            })
            .eq('id', account_id);

          return new Response(JSON.stringify({ 
            success: true, 
            verified: true,
            phone_number: metaData.display_phone_number,
            verified_name: metaData.verified_name,
            quality_rating: metaData.quality_rating,
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        } catch (metaError) {
          console.error('[manage-whatsapp-account] Meta API error:', metaError);
          return new Response(JSON.stringify({ 
            success: true, 
            verified: false, 
            error: 'Connection to Meta API failed',
            code: 'META_CONNECTION_ERROR'
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }

      default:
        return new Response(JSON.stringify({ 
          success: false, 
          error: `Unknown action: ${action}`,
          code: 'INVALID_ACTION',
          action: 'Valid actions: activate, create, update, delete, set-primary, verify'
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
  } catch (error: unknown) {
    console.error('[manage-whatsapp-account] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(JSON.stringify({ 
      success: false, 
      error: errorMessage,
      code: 'INTERNAL_ERROR',
      retry: true
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
