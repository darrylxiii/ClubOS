import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/').filter(Boolean);
    
    // Get auth - support both JWT and API key
    const authHeader = req.headers.get('Authorization');
    const apiKey = req.headers.get('x-api-key');
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    let userId: string | null = null;

    // Authenticate via JWT
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (error || !user) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      userId = user.id;
    }
    // Authenticate via API key
    else if (apiKey) {
      const { data: keyData, error: keyError } = await supabase
        .from('workspace_api_keys')
        .select('*')
        .eq('key_hash', apiKey)
        .eq('is_active', true)
        .single();
      
      if (keyError || !keyData) {
        return new Response(JSON.stringify({ error: 'Invalid API key' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      // Check rate limit
      const { data: usageData } = await supabase
        .from('workspace_api_keys')
        .select('usage_count')
        .eq('id', keyData.id)
        .single();
      
      // Update usage and last_used
      await supabase
        .from('workspace_api_keys')
        .update({ 
          usage_count: (usageData?.usage_count || 0) + 1,
          last_used_at: new Date().toISOString()
        })
        .eq('id', keyData.id);
      
      userId = keyData.user_id;
    }
    else {
      return new Response(JSON.stringify({ error: 'Authorization required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Parse path: /databases, /databases/:id, /databases/:id/rows, /databases/:id/rows/:rowId
    const resource = pathParts[0];
    const databaseId = pathParts[1];
    const subResource = pathParts[2];
    const rowId = pathParts[3];

    // Query parameters
    const filter = url.searchParams.get('filter');
    const sort = url.searchParams.get('sort');
    const limit = parseInt(url.searchParams.get('limit') || '100');
    const offset = parseInt(url.searchParams.get('offset') || '0');

    console.log(`[Workspace API] ${req.method} ${url.pathname} by user ${userId}`);

    // LIST DATABASES
    if (req.method === 'GET' && resource === 'databases' && !databaseId) {
      const { data, error } = await supabase
        .from('workspace_databases')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;
      
      return new Response(JSON.stringify({ data, count: data?.length || 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // GET DATABASE
    if (req.method === 'GET' && resource === 'databases' && databaseId && !subResource) {
      const { data: database, error } = await supabase
        .from('workspace_databases')
        .select('*')
        .eq('id', databaseId)
        .eq('user_id', userId)
        .single();

      if (error || !database) {
        return new Response(JSON.stringify({ error: 'Database not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Get columns
      const { data: columns } = await supabase
        .from('workspace_database_columns')
        .select('*')
        .eq('database_id', databaseId)
        .order('position');

      // Get rows count
      const { count } = await supabase
        .from('workspace_database_rows')
        .select('*', { count: 'exact', head: true })
        .eq('database_id', databaseId);

      return new Response(JSON.stringify({ 
        ...database, 
        columns: columns || [],
        row_count: count || 0
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // CREATE DATABASE
    if (req.method === 'POST' && resource === 'databases' && !databaseId) {
      const body = await req.json();
      
      const { data: database, error } = await supabase
        .from('workspace_databases')
        .insert({
          user_id: userId,
          page_id: body.page_id,
          name: body.name || 'Untitled Database',
          view_type: body.view_type || 'table'
        })
        .select()
        .single();

      if (error) throw error;

      // Create default columns
      const defaultColumns = [
        { database_id: database.id, name: 'Name', column_type: 'text', position: 0 },
        { database_id: database.id, name: 'Status', column_type: 'select', position: 1, config: { options: ['Todo', 'In Progress', 'Done'] } },
      ];

      await supabase.from('workspace_database_columns').insert(defaultColumns);

      return new Response(JSON.stringify(database), {
        status: 201,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // UPDATE DATABASE
    if (req.method === 'PUT' && resource === 'databases' && databaseId && !subResource) {
      const body = await req.json();
      
      const { data, error } = await supabase
        .from('workspace_databases')
        .update({
          name: body.name,
          view_type: body.view_type,
          updated_at: new Date().toISOString()
        })
        .eq('id', databaseId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;

      // Dispatch webhook
      await dispatchWebhook(supabase, databaseId, 'database.updated', data);

      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // DELETE DATABASE
    if (req.method === 'DELETE' && resource === 'databases' && databaseId && !subResource) {
      const { error } = await supabase
        .from('workspace_databases')
        .delete()
        .eq('id', databaseId)
        .eq('user_id', userId);

      if (error) throw error;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // GET ROWS
    if (req.method === 'GET' && resource === 'databases' && databaseId && subResource === 'rows' && !rowId) {
      // Verify access
      const { data: database } = await supabase
        .from('workspace_databases')
        .select('id')
        .eq('id', databaseId)
        .eq('user_id', userId)
        .single();

      if (!database) {
        return new Response(JSON.stringify({ error: 'Database not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      let query = supabase
        .from('workspace_database_rows')
        .select('*', { count: 'exact' })
        .eq('database_id', databaseId);

      // Apply sorting
      if (sort) {
        const [field, direction] = sort.split(':');
        query = query.order(field, { ascending: direction !== 'desc' });
      } else {
        query = query.order('position');
      }

      // Apply pagination
      query = query.range(offset, offset + limit - 1);

      const { data: rows, error, count } = await query;

      if (error) throw error;

      return new Response(JSON.stringify({ 
        data: rows, 
        count,
        limit,
        offset,
        has_more: (count || 0) > offset + limit
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // CREATE ROW
    if (req.method === 'POST' && resource === 'databases' && databaseId && subResource === 'rows') {
      const body = await req.json();
      
      // Verify access
      const { data: database } = await supabase
        .from('workspace_databases')
        .select('id')
        .eq('id', databaseId)
        .eq('user_id', userId)
        .single();

      if (!database) {
        return new Response(JSON.stringify({ error: 'Database not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Get max position
      const { data: maxRow } = await supabase
        .from('workspace_database_rows')
        .select('position')
        .eq('database_id', databaseId)
        .order('position', { ascending: false })
        .limit(1)
        .single();

      const { data: row, error } = await supabase
        .from('workspace_database_rows')
        .insert({
          database_id: databaseId,
          values: body.values || {},
          position: (maxRow?.position || 0) + 1
        })
        .select()
        .single();

      if (error) throw error;

      // Dispatch webhook
      await dispatchWebhook(supabase, databaseId, 'row.created', row);

      return new Response(JSON.stringify(row), {
        status: 201,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // UPDATE ROW
    if (req.method === 'PUT' && resource === 'databases' && databaseId && subResource === 'rows' && rowId) {
      const body = await req.json();
      
      // Verify access via database ownership
      const { data: database } = await supabase
        .from('workspace_databases')
        .select('id')
        .eq('id', databaseId)
        .eq('user_id', userId)
        .single();

      if (!database) {
        return new Response(JSON.stringify({ error: 'Database not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const { data: row, error } = await supabase
        .from('workspace_database_rows')
        .update({
          values: body.values,
          position: body.position,
          updated_at: new Date().toISOString()
        })
        .eq('id', rowId)
        .eq('database_id', databaseId)
        .select()
        .single();

      if (error) throw error;

      // Dispatch webhook
      await dispatchWebhook(supabase, databaseId, 'row.updated', row);

      return new Response(JSON.stringify(row), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // DELETE ROW
    if (req.method === 'DELETE' && resource === 'databases' && databaseId && subResource === 'rows' && rowId) {
      // Verify access
      const { data: database } = await supabase
        .from('workspace_databases')
        .select('id')
        .eq('id', databaseId)
        .eq('user_id', userId)
        .single();

      if (!database) {
        return new Response(JSON.stringify({ error: 'Database not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Get row before deletion for webhook
      const { data: row } = await supabase
        .from('workspace_database_rows')
        .select('*')
        .eq('id', rowId)
        .single();

      const { error } = await supabase
        .from('workspace_database_rows')
        .delete()
        .eq('id', rowId)
        .eq('database_id', databaseId);

      if (error) throw error;

      // Dispatch webhook
      if (row) {
        await dispatchWebhook(supabase, databaseId, 'row.deleted', row);
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 404 for unmatched routes
    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Workspace API Error]', error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

// Helper to dispatch webhooks
async function dispatchWebhook(supabase: any, databaseId: string, event: string, data: any) {
  try {
    const { data: webhooks } = await supabase
      .from('workspace_webhooks')
      .select('*')
      .eq('database_id', databaseId)
      .eq('is_active', true)
      .contains('events', [event]);

    if (!webhooks?.length) return;

    for (const webhook of webhooks) {
      const payload = {
        event,
        database_id: databaseId,
        data,
        timestamp: new Date().toISOString()
      };

      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };

      if (webhook.secret) {
        headers['X-Webhook-Secret'] = webhook.secret;
      }

      // Fire and forget - log result async
      fetch(webhook.url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      }).then(async (response) => {
        await supabase.from('workspace_webhook_logs').insert({
          webhook_id: webhook.id,
          event,
          payload,
          status_code: response.status,
          success: response.ok
        });
      }).catch(async (error) => {
        await supabase.from('workspace_webhook_logs').insert({
          webhook_id: webhook.id,
          event,
          payload,
          success: false,
          error_message: error.message
        });
      });
    }
  } catch (e) {
    console.error('[Webhook dispatch error]', e);
  }
}
