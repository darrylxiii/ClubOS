import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ success: false, error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Create client with user auth to check permissions
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Check if user is admin
    const { data: { user } } = await supabaseUser.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: profile } = await supabaseUser
      .from('profiles')
      .select('system_role')
      .eq('id', user.id)
      .single();

    if (!profile || !['admin', 'super_admin'].includes(profile.system_role)) {
      return new Response(JSON.stringify({ success: false, error: 'Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Use service role for database operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    const { action, account_id, ...data } = body;

    console.log(`[manage-whatsapp-account] Action: ${action}, Account: ${account_id}`);

    switch (action) {
      case 'create': {
        const { phone_number_id, business_account_id, display_phone_number, account_label } = data;

        if (!phone_number_id || !business_account_id || !display_phone_number) {
          return new Response(JSON.stringify({ 
            success: false, 
            error: 'Missing required fields: phone_number_id, business_account_id, display_phone_number' 
          }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Check if account already exists
        const { data: existing } = await supabase
          .from('whatsapp_business_accounts')
          .select('id')
          .eq('phone_number_id', phone_number_id)
          .single();

        if (existing) {
          return new Response(JSON.stringify({ 
            success: false, 
            error: 'An account with this Phone Number ID already exists' 
          }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Check if this is the first account (make it primary)
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
            created_by: user.id,
          })
          .select()
          .single();

        if (insertError) throw insertError;

        // Log the change
        await supabase.from('whatsapp_account_changes').insert({
          account_id: newAccount.id,
          changed_by: user.id,
          change_type: 'created',
          new_state: newAccount,
        });

        return new Response(JSON.stringify({ success: true, account: newAccount }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'update': {
        if (!account_id) {
          return new Response(JSON.stringify({ success: false, error: 'account_id is required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const { data: existing } = await supabase
          .from('whatsapp_business_accounts')
          .select('*')
          .eq('id', account_id)
          .single();

        if (!existing) {
          return new Response(JSON.stringify({ success: false, error: 'Account not found' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const updateData: Record<string, any> = { updated_at: new Date().toISOString() };
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
          changed_by: user.id,
          change_type: 'updated',
          previous_state: existing,
          new_state: updated,
        });

        return new Response(JSON.stringify({ success: true, account: updated }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'delete': {
        if (!account_id) {
          return new Response(JSON.stringify({ success: false, error: 'account_id is required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const { data: existing } = await supabase
          .from('whatsapp_business_accounts')
          .select('*')
          .eq('id', account_id)
          .single();

        if (!existing) {
          return new Response(JSON.stringify({ success: false, error: 'Account not found' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Log before delete (cascade will remove the log too, so just console log)
        console.log(`[manage-whatsapp-account] Deleting account: ${existing.display_phone_number}`);

        const { error: deleteError } = await supabase
          .from('whatsapp_business_accounts')
          .delete()
          .eq('id', account_id);

        if (deleteError) throw deleteError;

        return new Response(JSON.stringify({ success: true, deleted: existing.display_phone_number }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'set-primary': {
        if (!account_id) {
          return new Response(JSON.stringify({ success: false, error: 'account_id is required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Remove primary from all accounts
        await supabase
          .from('whatsapp_business_accounts')
          .update({ is_primary: false })
          .neq('id', account_id);

        // Set new primary
        const { data: updated, error: updateError } = await supabase
          .from('whatsapp_business_accounts')
          .update({ is_primary: true, updated_at: new Date().toISOString() })
          .eq('id', account_id)
          .select()
          .single();

        if (updateError) throw updateError;

        await supabase.from('whatsapp_account_changes').insert({
          account_id,
          changed_by: user.id,
          change_type: 'set_primary',
          new_state: updated,
        });

        return new Response(JSON.stringify({ success: true, account: updated }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'verify': {
        if (!account_id) {
          return new Response(JSON.stringify({ success: false, error: 'account_id is required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const { data: account } = await supabase
          .from('whatsapp_business_accounts')
          .select('*')
          .eq('id', account_id)
          .single();

        if (!account) {
          return new Response(JSON.stringify({ success: false, error: 'Account not found' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Try to verify connection with Meta API
        const accessToken = Deno.env.get('WHATSAPP_ACCESS_TOKEN');
        if (!accessToken) {
          return new Response(JSON.stringify({ 
            success: true, 
            verified: false, 
            error: 'Access token not configured' 
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        try {
          const metaResponse = await fetch(
            `https://graph.facebook.com/v21.0/${account.phone_number_id}`,
            {
              headers: { Authorization: `Bearer ${accessToken}` },
            }
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
              error: metaData.error.message 
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
              updated_at: new Date().toISOString(),
            })
            .eq('id', account_id);

          return new Response(JSON.stringify({ 
            success: true, 
            verified: true,
            phone_number: metaData.display_phone_number,
            verified_name: metaData.verified_name,
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        } catch (metaError) {
          console.error('[manage-whatsapp-account] Meta API error:', metaError);
          return new Response(JSON.stringify({ 
            success: true, 
            verified: false, 
            error: 'Failed to connect to Meta API' 
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }

      default:
        return new Response(JSON.stringify({ 
          success: false, 
          error: `Unknown action: ${action}. Valid actions: create, update, delete, set-primary, verify` 
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
      error: errorMessage 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
