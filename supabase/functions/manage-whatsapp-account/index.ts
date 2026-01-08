import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders, handleCorsPreFlight, publicCorsHeaders } from '../_shared/cors-config.ts';

interface AuthResult {
  userId: string;
  role: string;
}

/**
 * Create a standardized JSON response with CORS headers
 * Uses shared CORS config that includes all required headers
 */
function jsonResponse(data: Record<string, unknown>, status = 200, req?: Request): Response {
  const headers = req ? getCorsHeaders(req) : publicCorsHeaders;
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...headers, 'Content-Type': 'application/json' },
  });
}

/**
 * Validates auth and returns user ID + role, or an error response
 */
async function validateAuth(req: Request, requestId: string): Promise<AuthResult | Response> {
  const authHeader = req.headers.get('Authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log(`[${requestId}] No auth header`);
    return jsonResponse({
      success: false,
      error: 'Authentication required',
      code: 'AUTH_REQUIRED',
      action: 'Please sign in to manage WhatsApp accounts',
      request_id: requestId,
    }, 401);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const token = authHeader.replace('Bearer ', '');

  const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  try {
    const { data: userData, error: userError } = await supabaseUser.auth.getUser(token);
    
    if (userError) {
      const errorMessage = userError.message?.toLowerCase() || '';
      console.log(`[${requestId}] Auth error: ${userError.message}`);
      
      if (errorMessage.includes('expired') || errorMessage.includes('jwt') || errorMessage.includes('invalid')) {
        return jsonResponse({
          success: false,
          error: 'Session expired',
          code: 'SESSION_EXPIRED',
          action: 'Please sign in again',
          request_id: requestId,
        }, 401);
      }
      
      return jsonResponse({
        success: false,
        error: 'Authentication failed',
        code: 'AUTH_FAILED',
        action: 'Please sign in again',
        request_id: requestId,
      }, 401);
    }
    
    if (!userData?.user?.id) {
      return jsonResponse({
        success: false,
        error: 'Invalid session',
        code: 'INVALID_SESSION',
        action: 'Please sign in again',
        request_id: requestId,
      }, 401);
    }

    const userId = userData.user.id;

    // Check admin role using service client for RLS bypass
    const supabaseService = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data: profile } = await supabaseService
      .from('profiles')
      .select('system_role')
      .eq('id', userId)
      .single();

    const role = profile?.system_role || 'user';
    
    if (!['admin', 'super_admin'].includes(role)) {
      console.log(`[${requestId}] User ${userId} has role ${role}, access denied`);
      return jsonResponse({
        success: false,
        error: 'Admin access required',
        code: 'FORBIDDEN',
        action: 'Contact your administrator for WhatsApp management access',
        request_id: requestId,
      }, 403);
    }

    console.log(`[${requestId}] Auth OK: user=${userId}, role=${role}`);
    return { userId, role };
  } catch (error) {
    const errorMessage = (error as Error).message?.toLowerCase() || '';
    console.error(`[${requestId}] Auth exception:`, error);
    
    if (errorMessage.includes('expired') || errorMessage.includes('jwt') || errorMessage.includes('invalid')) {
      return jsonResponse({
        success: false,
        error: 'Session expired',
        code: 'SESSION_EXPIRED',
        action: 'Please sign in again',
        request_id: requestId,
      }, 401);
    }
    
    return jsonResponse({
      success: false,
      error: 'Authentication error',
      code: 'AUTH_ERROR',
      action: 'Please sign in again',
      request_id: requestId,
    }, 401);
  }
}

serve(async (req) => {
  const requestId = crypto.randomUUID().slice(0, 8);
  const origin = req.headers.get('origin') || 'unknown';
  const requestedHeaders = req.headers.get('access-control-request-headers') || '';
  
  // Handle CORS preflight with detailed logging
  if (req.method === 'OPTIONS') {
    console.log(`[${requestId}] CORS preflight: origin=${origin}, requested-headers=${requestedHeaders}`);
    return handleCorsPreFlight(req, requestId);
  }

  console.log(`[${requestId}] ${req.method} request from: ${origin}`);

  try {
    // Parse body first
    let body: Record<string, unknown> = {};
    try {
      body = await req.json();
    } catch {
      return jsonResponse({
        success: false,
        error: 'Invalid JSON body',
        code: 'BAD_REQUEST',
        request_id: requestId,
      }, 400);
    }

    const { action, account_id, ...data } = body;
    console.log(`[${requestId}] Action: ${action}`);

    // ==================== PING (ultra-simple connectivity test) ====================
    if (action === 'ping') {
      console.log(`[${requestId}] Ping received, responding with pong`);
      return jsonResponse({
        success: true,
        pong: true,
        timestamp: new Date().toISOString(),
        request_id: requestId,
      });
    }

    // ==================== DIAGNOSTICS (special handling) ====================
    if (action === 'diagnostics') {
      const diagnostics: Record<string, unknown> = {
        request_id: requestId,
        timestamp: new Date().toISOString(),
        checks: {},
      };

      // Check 1: Auth
      const authResult = await validateAuth(req, requestId);
      if (authResult instanceof Response) {
        const authBody = await authResult.clone().json();
        diagnostics.checks = {
          auth: { ok: false, error: authBody.error, code: authBody.code },
          secrets: { ok: false, skipped: 'auth failed' },
          meta_api: { ok: false, skipped: 'auth failed' },
          database: { ok: false, skipped: 'auth failed' },
        };
        return jsonResponse({
          success: true,
          overall_status: 'error',
          diagnostics,
        });
      }

      diagnostics.checks = { auth: { ok: true, user_id: authResult.userId, role: authResult.role } };

      // Check 2: Secrets
      const accessToken = Deno.env.get('WHATSAPP_ACCESS_TOKEN');
      const phoneNumberId = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID');
      const businessAccountId = Deno.env.get('WHATSAPP_BUSINESS_ACCOUNT_ID');
      
      const missingSecrets: string[] = [];
      if (!accessToken) missingSecrets.push('WHATSAPP_ACCESS_TOKEN');
      if (!phoneNumberId) missingSecrets.push('WHATSAPP_PHONE_NUMBER_ID');
      if (!businessAccountId) missingSecrets.push('WHATSAPP_BUSINESS_ACCOUNT_ID');
      
      (diagnostics.checks as Record<string, unknown>).secrets = {
        ok: missingSecrets.length === 0,
        missing: missingSecrets.length > 0 ? missingSecrets : undefined,
      };

      // Check 3: Meta API (only if secrets present)
      if (accessToken && phoneNumberId) {
        try {
          const metaResponse = await fetch(
            `https://graph.facebook.com/v21.0/${phoneNumberId}`,
            { headers: { Authorization: `Bearer ${accessToken}` } }
          );
          const metaData = await metaResponse.json();
          
          if (metaData.error) {
            (diagnostics.checks as Record<string, unknown>).meta_api = {
              ok: false,
              error: metaData.error.message,
              code: metaData.error.code,
            };
          } else {
            (diagnostics.checks as Record<string, unknown>).meta_api = {
              ok: true,
              phone_number: metaData.display_phone_number,
              verified_name: metaData.verified_name,
            };
          }
        } catch (e) {
          (diagnostics.checks as Record<string, unknown>).meta_api = {
            ok: false,
            error: 'Network error connecting to Meta API',
          };
        }
      } else {
        (diagnostics.checks as Record<string, unknown>).meta_api = {
          ok: false,
          skipped: 'missing secrets',
        };
      }

      // Check 4: Database access
      try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseService = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
        
        const { count, error } = await supabaseService
          .from('whatsapp_business_accounts')
          .select('*', { count: 'exact', head: true });
        
        if (error) {
          (diagnostics.checks as Record<string, unknown>).database = {
            ok: false,
            error: error.message,
          };
        } else {
          (diagnostics.checks as Record<string, unknown>).database = {
            ok: true,
            accounts_count: count || 0,
          };
        }
      } catch (e) {
        (diagnostics.checks as Record<string, unknown>).database = {
          ok: false,
          error: 'Database connection failed',
        };
      }

      // Overall status
      const checks = diagnostics.checks as Record<string, { ok: boolean }>;
      const allOk = Object.values(checks).every(c => c.ok);
      
      return jsonResponse({
        success: true,
        overall_status: allOk ? 'healthy' : 'issues_found',
        diagnostics,
      });
    }

    // Validate authentication for all other actions
    const authResult = await validateAuth(req, requestId);
    if (authResult instanceof Response) {
      return authResult;
    }
    const { userId } = authResult;

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

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
          
          return jsonResponse({
            success: false,
            error: 'WhatsApp credentials not configured',
            code: 'MISSING_CREDENTIALS',
            action: 'Add WhatsApp API credentials in backend settings',
            missing,
            request_id: requestId,
          }, 400);
        }

        // Verify connection with Meta API
        console.log(`[${requestId}] Verifying Meta API connection...`);
        const metaResponse = await fetch(
          `https://graph.facebook.com/v21.0/${phoneNumberId}`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );

        const metaData = await metaResponse.json();

        if (metaData.error) {
          console.error(`[${requestId}] Meta API error:`, metaData.error);
          return jsonResponse({
            success: false,
            error: metaData.error.message || 'Invalid Meta API credentials',
            code: 'META_API_ERROR',
            action: 'Check your WhatsApp access token and phone number ID',
            request_id: requestId,
          }, 400);
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
          await supabase
            .from('whatsapp_business_accounts')
            .update({ is_primary: false });

          const { data, error } = await supabase
            .from('whatsapp_business_accounts')
            .insert({
              ...accountData,
              created_by: userId,
              access_token_encrypted: '***',
            })
            .select()
            .single();

          if (error) throw error;
          result = data;
        }

        await supabase.from('whatsapp_account_changes').insert({
          account_id: result.id,
          changed_by: userId,
          change_type: 'activated',
          new_state: result,
        });

        console.log(`[${requestId}] Account activated: ${result.display_phone_number}`);

        return jsonResponse({
          success: true,
          account: result,
          webhook_url: `${supabaseUrl}/functions/v1/whatsapp-webhook-receiver`,
          request_id: requestId,
        });
      }

      // ==================== CREATE ====================
      case 'create': {
        const { phone_number_id, business_account_id, display_phone_number, account_label } = data;

        if (!phone_number_id || !business_account_id || !display_phone_number) {
          return jsonResponse({ 
            success: false, 
            error: 'Missing required fields',
            code: 'VALIDATION_ERROR',
            action: 'Provide phone_number_id, business_account_id, and display_phone_number',
            request_id: requestId,
          }, 400);
        }

        const { data: existing } = await supabase
          .from('whatsapp_business_accounts')
          .select('id')
          .eq('phone_number_id', phone_number_id)
          .maybeSingle();

        if (existing) {
          return jsonResponse({ 
            success: false, 
            error: 'Account already exists',
            code: 'DUPLICATE',
            action: 'Use the existing account or delete it first',
            request_id: requestId,
          }, 400);
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

        return jsonResponse({ success: true, account: newAccount, request_id: requestId });
      }

      // ==================== UPDATE ====================
      case 'update': {
        if (!account_id) {
          return jsonResponse({ 
            success: false, 
            error: 'account_id required',
            code: 'VALIDATION_ERROR',
            request_id: requestId,
          }, 400);
        }

        const { data: existing } = await supabase
          .from('whatsapp_business_accounts')
          .select('*')
          .eq('id', account_id)
          .maybeSingle();

        if (!existing) {
          return jsonResponse({ 
            success: false, 
            error: 'Account not found',
            code: 'NOT_FOUND',
            request_id: requestId,
          }, 404);
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
          old_state: existing,
          new_state: updated,
        });

        return jsonResponse({ success: true, account: updated, request_id: requestId });
      }

      // ==================== DELETE ====================
      case 'delete': {
        if (!account_id) {
          return jsonResponse({ 
            success: false, 
            error: 'account_id required',
            code: 'VALIDATION_ERROR',
            request_id: requestId,
          }, 400);
        }

        const { data: existing } = await supabase
          .from('whatsapp_business_accounts')
          .select('*')
          .eq('id', account_id)
          .maybeSingle();

        if (!existing) {
          return jsonResponse({ 
            success: false, 
            error: 'Account not found',
            code: 'NOT_FOUND',
            request_id: requestId,
          }, 404);
        }

        await supabase.from('whatsapp_account_changes').insert({
          account_id,
          changed_by: userId,
          change_type: 'deleted',
          old_state: existing,
        });

        const { error: deleteError } = await supabase
          .from('whatsapp_business_accounts')
          .delete()
          .eq('id', account_id);

        if (deleteError) throw deleteError;

        return jsonResponse({ success: true, deleted: true, request_id: requestId });
      }

      // ==================== SET PRIMARY ====================
      case 'set_primary': {
        if (!account_id) {
          return jsonResponse({ 
            success: false, 
            error: 'account_id required',
            code: 'VALIDATION_ERROR',
            request_id: requestId,
          }, 400);
        }

        await supabase
          .from('whatsapp_business_accounts')
          .update({ is_primary: false });

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

        return jsonResponse({ success: true, account: updated, request_id: requestId });
      }

      // ==================== VERIFY ====================
      case 'verify': {
        if (!account_id) {
          return jsonResponse({ 
            success: false, 
            error: 'account_id required',
            code: 'VALIDATION_ERROR',
            request_id: requestId,
          }, 400);
        }

        const accessToken = Deno.env.get('WHATSAPP_ACCESS_TOKEN');
        if (!accessToken) {
          return jsonResponse({
            success: false,
            error: 'WhatsApp access token not configured',
            code: 'MISSING_CREDENTIALS',
            request_id: requestId,
          }, 400);
        }

        const { data: account } = await supabase
          .from('whatsapp_business_accounts')
          .select('*')
          .eq('id', account_id)
          .maybeSingle();

        if (!account) {
          return jsonResponse({ 
            success: false, 
            error: 'Account not found',
            code: 'NOT_FOUND',
            request_id: requestId,
          }, 404);
        }

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
            })
            .eq('id', account_id);

          return jsonResponse({
            success: true,
            verified: false,
            error: metaData.error.message,
            request_id: requestId,
          });
        }

        const { data: updated } = await supabase
          .from('whatsapp_business_accounts')
          .update({
            display_phone_number: metaData.display_phone_number || account.display_phone_number,
            verified_name: metaData.verified_name,
            quality_rating: metaData.quality_rating,
            verification_status: 'verified',
            last_verified_at: new Date().toISOString(),
          })
          .eq('id', account_id)
          .select()
          .single();

        return jsonResponse({
          success: true,
          verified: true,
          account: updated,
          request_id: requestId,
        });
      }

      default:
        return jsonResponse({ 
          success: false, 
          error: `Unknown action: ${action}`,
          code: 'UNKNOWN_ACTION',
          request_id: requestId,
        }, 400);
    }
  } catch (error) {
    console.error(`[${requestId}] Error:`, error);
    return jsonResponse({
      success: false,
      error: (error as Error).message || 'Internal server error',
      code: 'INTERNAL_ERROR',
      request_id: requestId,
    }, 500);
  }
});
