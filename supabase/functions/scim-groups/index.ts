import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';
import { publicCorsHeaders as corsHeaders } from '../_shared/cors-config.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface SCIMGroup {
  schemas: string[];
  id: string;
  externalId?: string;
  displayName: string;
  members?: Array<{ value: string; display?: string; $ref?: string }>;
  meta?: {
    resourceType: string;
    created: string;
    lastModified: string;
    location: string;
  };
}

interface SCIMListResponse {
  schemas: string[];
  totalResults: number;
  startIndex: number;
  itemsPerPage: number;
  Resources: SCIMGroup[];
}

async function validateScimToken(authHeader: string | null, supabase: any): Promise<{ valid: boolean; companyId?: string; error?: string }> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { valid: false, error: 'Missing or invalid authorization header' };
  }

  const token = authHeader.replace('Bearer ', '');
  const tokenHash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  const hashHex = Array.from(new Uint8Array(tokenHash)).map(b => b.toString(16).padStart(2, '0')).join('');

  const { data: tokenData, error } = await supabase
    .from('scim_tokens')
    .select('id, company_id, scopes, is_active, expires_at')
    .eq('token_hash', hashHex)
    .single();

  if (error || !tokenData) {
    return { valid: false, error: 'Invalid SCIM token' };
  }

  if (!tokenData.is_active) {
    return { valid: false, error: 'SCIM token is inactive' };
  }

  if (tokenData.expires_at && new Date(tokenData.expires_at) < new Date()) {
    return { valid: false, error: 'SCIM token has expired' };
  }

  await supabase.from('scim_tokens').update({ last_used_at: new Date().toISOString() }).eq('id', tokenData.id);

  return { valid: true, companyId: tokenData.company_id };
}

async function getGroupMembers(supabase: any, groupId: string, baseUrl: string) {
  const { data: memberships } = await supabase
    .from('scim_user_group_memberships')
    .select('user_id, profiles:user_id(id, full_name, email)')
    .eq('group_id', groupId);

  return (memberships || []).map((m: any) => ({
    value: m.user_id,
    display: m.profiles?.full_name || m.profiles?.email,
    $ref: `${baseUrl}/scim/v2/Users/${m.user_id}`,
  }));
}

function groupToScimGroup(group: any, members: any[], baseUrl: string): SCIMGroup {
  return {
    schemas: ['urn:ietf:params:scim:schemas:core:2.0:Group'],
    id: group.id,
    externalId: group.external_id,
    displayName: group.display_name,
    members,
    meta: {
      resourceType: 'Group',
      created: group.created_at,
      lastModified: group.updated_at || group.created_at,
      location: `${baseUrl}/scim/v2/Groups/${group.id}`,
    },
  };
}

async function logScimOperation(supabase: any, companyId: string, operation: string, resourceId: string | null, request: any, response: any, status: string, error?: string, req?: Request) {
  await supabase.from('scim_provisioning_logs').insert({
    company_id: companyId,
    operation,
    resource_type: 'Group',
    resource_id: resourceId,
    request_payload: request,
    response_payload: response,
    status,
    error_message: error,
    ip_address: req?.headers.get('x-forwarded-for')?.split(',')[0] || null,
    user_agent: req?.headers.get('user-agent'),
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const url = new URL(req.url);
  const baseUrl = `${url.protocol}//${url.host}`;

  const authResult = await validateScimToken(req.headers.get('authorization'), supabase);
  if (!authResult.valid) {
    return new Response(JSON.stringify({
      schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'],
      detail: authResult.error,
      status: 401,
    }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/scim+json' },
    });
  }

  const companyId = authResult.companyId!;
  const pathParts = url.pathname.split('/').filter(Boolean);
  const groupId = pathParts[pathParts.length - 1] !== 'Groups' ? pathParts[pathParts.length - 1] : null;

  try {
    // GET /Groups - List groups
    if (req.method === 'GET' && !groupId) {
      const filter = url.searchParams.get('filter');
      const startIndex = parseInt(url.searchParams.get('startIndex') || '1');
      const count = Math.min(parseInt(url.searchParams.get('count') || '100'), 100);

      let query = supabase.from('scim_groups').select('*', { count: 'exact' }).eq('company_id', companyId);

      if (filter) {
        const displayNameMatch = filter.match(/displayName eq "([^"]+)"/);
        if (displayNameMatch) {
          query = query.eq('display_name', displayNameMatch[1]);
        }
        const externalIdMatch = filter.match(/externalId eq "([^"]+)"/);
        if (externalIdMatch) {
          query = query.eq('external_id', externalIdMatch[1]);
        }
      }

      const { data: groups, count: totalCount, error } = await query.range(startIndex - 1, startIndex - 1 + count - 1);

      if (error) throw error;

      const resources = await Promise.all((groups || []).map(async (g) => {
        const members = await getGroupMembers(supabase, g.id, baseUrl);
        return groupToScimGroup(g, members, baseUrl);
      }));

      const response: SCIMListResponse = {
        schemas: ['urn:ietf:params:scim:api:messages:2.0:ListResponse'],
        totalResults: totalCount || 0,
        startIndex,
        itemsPerPage: resources.length,
        Resources: resources,
      };

      await logScimOperation(supabase, companyId, 'LIST', null, { filter, startIndex, count }, { totalResults: totalCount }, 'success', undefined, req);

      return new Response(JSON.stringify(response), {
        headers: { ...corsHeaders, 'Content-Type': 'application/scim+json' },
      });
    }

    // GET /Groups/:id - Get group by ID
    if (req.method === 'GET' && groupId) {
      const { data: group, error } = await supabase
        .from('scim_groups')
        .select('*')
        .eq('id', groupId)
        .eq('company_id', companyId)
        .single();

      if (error || !group) {
        await logScimOperation(supabase, companyId, 'GET', groupId, {}, {}, 'error', 'Group not found', req);
        return new Response(JSON.stringify({
          schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'],
          detail: 'Group not found',
          status: 404,
        }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/scim+json' },
        });
      }

      const members = await getGroupMembers(supabase, groupId, baseUrl);
      const response = groupToScimGroup(group, members, baseUrl);

      await logScimOperation(supabase, companyId, 'GET', groupId, {}, response, 'success', undefined, req);

      return new Response(JSON.stringify(response), {
        headers: { ...corsHeaders, 'Content-Type': 'application/scim+json' },
      });
    }

    // POST /Groups - Create group
    if (req.method === 'POST') {
      const scimGroup = await req.json();

      const { data: existing } = await supabase
        .from('scim_groups')
        .select('id')
        .eq('company_id', companyId)
        .eq('external_id', scimGroup.externalId || scimGroup.displayName)
        .single();

      if (existing) {
        await logScimOperation(supabase, companyId, 'CREATE', null, scimGroup, {}, 'error', 'Group already exists', req);
        return new Response(JSON.stringify({
          schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'],
          detail: 'Group already exists',
          status: 409,
          scimType: 'uniqueness',
        }), {
          status: 409,
          headers: { ...corsHeaders, 'Content-Type': 'application/scim+json' },
        });
      }

      const { data: newGroup, error } = await supabase.from('scim_groups').insert({
        company_id: companyId,
        external_id: scimGroup.externalId || scimGroup.displayName,
        display_name: scimGroup.displayName,
        description: scimGroup.description,
      }).select().single();

      if (error) throw error;

      // Add members if provided
      if (scimGroup.members?.length) {
        const memberships = scimGroup.members.map((m: any) => ({
          group_id: newGroup.id,
          user_id: m.value,
        }));
        await supabase.from('scim_user_group_memberships').insert(memberships);
      }

      const members = await getGroupMembers(supabase, newGroup.id, baseUrl);
      const response = groupToScimGroup(newGroup, members, baseUrl);

      await logScimOperation(supabase, companyId, 'CREATE', newGroup.id, scimGroup, response, 'success', undefined, req);

      return new Response(JSON.stringify(response), {
        status: 201,
        headers: { ...corsHeaders, 'Content-Type': 'application/scim+json', 'Location': response.meta?.location || '' },
      });
    }

    // PATCH /Groups/:id - Update group (add/remove members)
    if (req.method === 'PATCH' && groupId) {
      const patchRequest = await req.json();

      for (const operation of patchRequest.Operations || []) {
        if (operation.op === 'add' && operation.path === 'members') {
          const members = Array.isArray(operation.value) ? operation.value : [operation.value];
          const memberships = members.map((m: any) => ({
            group_id: groupId,
            user_id: m.value,
          }));
          await supabase.from('scim_user_group_memberships').upsert(memberships, { onConflict: 'user_id,group_id' });
        } else if (operation.op === 'remove') {
          if (operation.path?.startsWith('members[value eq "')) {
            const userIdMatch = operation.path.match(/members\[value eq "([^"]+)"\]/);
            if (userIdMatch) {
              await supabase
                .from('scim_user_group_memberships')
                .delete()
                .eq('group_id', groupId)
                .eq('user_id', userIdMatch[1]);
            }
          }
        } else if (operation.op === 'replace') {
          if (operation.path === 'displayName') {
            await supabase.from('scim_groups').update({ display_name: operation.value }).eq('id', groupId);
          } else if (!operation.path && operation.value?.members) {
            // Replace all members
            await supabase.from('scim_user_group_memberships').delete().eq('group_id', groupId);
            if (operation.value.members.length) {
              const memberships = operation.value.members.map((m: any) => ({
                group_id: groupId,
                user_id: m.value,
              }));
              await supabase.from('scim_user_group_memberships').insert(memberships);
            }
          }
        }
      }

      const { data: group } = await supabase.from('scim_groups').select('*').eq('id', groupId).single();
      const members = await getGroupMembers(supabase, groupId, baseUrl);
      const response = groupToScimGroup(group, members, baseUrl);

      await logScimOperation(supabase, companyId, 'PATCH', groupId, patchRequest, response, 'success', undefined, req);

      return new Response(JSON.stringify(response), {
        headers: { ...corsHeaders, 'Content-Type': 'application/scim+json' },
      });
    }

    // DELETE /Groups/:id - Delete group
    if (req.method === 'DELETE' && groupId) {
      const { error } = await supabase.from('scim_groups').delete().eq('id', groupId).eq('company_id', companyId);

      if (error) throw error;

      await logScimOperation(supabase, companyId, 'DELETE', groupId, {}, {}, 'success', undefined, req);

      return new Response(null, {
        status: 204,
        headers: corsHeaders,
      });
    }

    return new Response(JSON.stringify({
      schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'],
      detail: 'Method not allowed',
      status: 405,
    }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/scim+json' },
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    console.error('SCIM Groups error:', error);
    await logScimOperation(supabase, companyId, 'ERROR', groupId, {}, {}, 'error', errorMessage, req);

    return new Response(JSON.stringify({
      schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'],
      detail: errorMessage,
      status: 500,
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/scim+json' },
    });
  }
});
