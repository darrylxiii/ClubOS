import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface SCIMUser {
  schemas: string[];
  id: string;
  externalId?: string;
  userName: string;
  name?: {
    formatted?: string;
    familyName?: string;
    givenName?: string;
  };
  displayName?: string;
  emails?: Array<{ value: string; primary?: boolean; type?: string }>;
  active: boolean;
  groups?: Array<{ value: string; display?: string }>;
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
  Resources: SCIMUser[];
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

  // Update last_used_at
  await supabase.from('scim_tokens').update({ last_used_at: new Date().toISOString() }).eq('id', tokenData.id);

  return { valid: true, companyId: tokenData.company_id };
}

function profileToScimUser(profile: any, baseUrl: string): SCIMUser {
  return {
    schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
    id: profile.id,
    externalId: profile.external_id || undefined,
    userName: profile.email || profile.id,
    name: {
      formatted: profile.full_name,
      givenName: profile.full_name?.split(' ')[0],
      familyName: profile.full_name?.split(' ').slice(1).join(' '),
    },
    displayName: profile.full_name,
    emails: profile.email ? [{ value: profile.email, primary: true, type: 'work' }] : [],
    active: profile.is_active !== false,
    meta: {
      resourceType: 'User',
      created: profile.created_at,
      lastModified: profile.updated_at || profile.created_at,
      location: `${baseUrl}/scim/v2/Users/${profile.id}`,
    },
  };
}

async function logScimOperation(supabase: any, companyId: string, operation: string, resourceId: string | null, request: any, response: any, status: string, error?: string, req?: Request) {
  await supabase.from('scim_provisioning_logs').insert({
    company_id: companyId,
    operation,
    resource_type: 'User',
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

  // Validate SCIM token
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
  const userId = pathParts[pathParts.length - 1] !== 'Users' ? pathParts[pathParts.length - 1] : null;

  try {
    // GET /Users - List users
    if (req.method === 'GET' && !userId) {
      const filter = url.searchParams.get('filter');
      const startIndex = parseInt(url.searchParams.get('startIndex') || '1');
      const count = Math.min(parseInt(url.searchParams.get('count') || '100'), 100);

      let query = supabase.from('profiles').select('*', { count: 'exact' }).eq('company_id', companyId);

      // Parse SCIM filter (basic support for userName eq "value")
      if (filter) {
        const emailMatch = filter.match(/userName eq "([^"]+)"/);
        if (emailMatch) {
          query = query.eq('email', emailMatch[1]);
        }
        const externalIdMatch = filter.match(/externalId eq "([^"]+)"/);
        if (externalIdMatch) {
          query = query.eq('external_id', externalIdMatch[1]);
        }
      }

      const { data: profiles, count: totalCount, error } = await query.range(startIndex - 1, startIndex - 1 + count - 1);

      if (error) throw error;

      const response: SCIMListResponse = {
        schemas: ['urn:ietf:params:scim:api:messages:2.0:ListResponse'],
        totalResults: totalCount || 0,
        startIndex,
        itemsPerPage: profiles?.length || 0,
        Resources: (profiles || []).map(p => profileToScimUser(p, baseUrl)),
      };

      await logScimOperation(supabase, companyId, 'LIST', null, { filter, startIndex, count }, { totalResults: totalCount }, 'success', undefined, req);

      return new Response(JSON.stringify(response), {
        headers: { ...corsHeaders, 'Content-Type': 'application/scim+json' },
      });
    }

    // GET /Users/:id - Get user by ID
    if (req.method === 'GET' && userId) {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .eq('company_id', companyId)
        .single();

      if (error || !profile) {
        await logScimOperation(supabase, companyId, 'GET', userId, {}, {}, 'error', 'User not found', req);
        return new Response(JSON.stringify({
          schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'],
          detail: 'User not found',
          status: 404,
        }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/scim+json' },
        });
      }

      await logScimOperation(supabase, companyId, 'GET', userId, {}, profile, 'success', undefined, req);

      return new Response(JSON.stringify(profileToScimUser(profile, baseUrl)), {
        headers: { ...corsHeaders, 'Content-Type': 'application/scim+json' },
      });
    }

    // POST /Users - Create user
    if (req.method === 'POST') {
      const scimUser = await req.json();
      
      const email = scimUser.emails?.find((e: any) => e.primary)?.value || scimUser.emails?.[0]?.value || scimUser.userName;
      const fullName = scimUser.name?.formatted || `${scimUser.name?.givenName || ''} ${scimUser.name?.familyName || ''}`.trim() || scimUser.displayName;

      // Check if user already exists
      const { data: existing } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .single();

      if (existing) {
        await logScimOperation(supabase, companyId, 'CREATE', null, scimUser, {}, 'error', 'User already exists', req);
        return new Response(JSON.stringify({
          schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'],
          detail: 'User already exists',
          status: 409,
          scimType: 'uniqueness',
        }), {
          status: 409,
          headers: { ...corsHeaders, 'Content-Type': 'application/scim+json' },
        });
      }

      // Create user in auth (if supported) and profile
      const { data: newProfile, error } = await supabase.from('profiles').insert({
        email,
        full_name: fullName,
        company_id: companyId,
        external_id: scimUser.externalId,
        is_active: scimUser.active !== false,
      }).select().single();

      if (error) throw error;

      const response = profileToScimUser(newProfile, baseUrl);
      await logScimOperation(supabase, companyId, 'CREATE', newProfile.id, scimUser, response, 'success', undefined, req);

      return new Response(JSON.stringify(response), {
        status: 201,
        headers: { ...corsHeaders, 'Content-Type': 'application/scim+json', 'Location': response.meta?.location || '' },
      });
    }

    // PUT /Users/:id - Replace user
    if (req.method === 'PUT' && userId) {
      const scimUser = await req.json();
      
      const email = scimUser.emails?.find((e: any) => e.primary)?.value || scimUser.emails?.[0]?.value;
      const fullName = scimUser.name?.formatted || `${scimUser.name?.givenName || ''} ${scimUser.name?.familyName || ''}`.trim();

      const { data: profile, error } = await supabase
        .from('profiles')
        .update({
          email,
          full_name: fullName,
          external_id: scimUser.externalId,
          is_active: scimUser.active !== false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)
        .eq('company_id', companyId)
        .select()
        .single();

      if (error || !profile) {
        await logScimOperation(supabase, companyId, 'REPLACE', userId, scimUser, {}, 'error', 'User not found', req);
        return new Response(JSON.stringify({
          schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'],
          detail: 'User not found',
          status: 404,
        }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/scim+json' },
        });
      }

      const response = profileToScimUser(profile, baseUrl);
      await logScimOperation(supabase, companyId, 'REPLACE', userId, scimUser, response, 'success', undefined, req);

      return new Response(JSON.stringify(response), {
        headers: { ...corsHeaders, 'Content-Type': 'application/scim+json' },
      });
    }

    // PATCH /Users/:id - Update user
    if (req.method === 'PATCH' && userId) {
      const patchRequest = await req.json();
      const updates: Record<string, any> = {};

      for (const operation of patchRequest.Operations || []) {
        if (operation.op === 'replace' || operation.op === 'add') {
          if (operation.path === 'active') {
            updates.is_active = operation.value;
          } else if (operation.path === 'name.formatted' || operation.path === 'displayName') {
            updates.full_name = operation.value;
          } else if (operation.path === 'externalId') {
            updates.external_id = operation.value;
          } else if (!operation.path && typeof operation.value === 'object') {
            // Bulk replace
            if (operation.value.active !== undefined) updates.is_active = operation.value.active;
            if (operation.value.name?.formatted) updates.full_name = operation.value.name.formatted;
            if (operation.value.displayName) updates.full_name = operation.value.displayName;
          }
        }
      }

      updates.updated_at = new Date().toISOString();

      const { data: profile, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId)
        .eq('company_id', companyId)
        .select()
        .single();

      if (error || !profile) {
        await logScimOperation(supabase, companyId, 'PATCH', userId, patchRequest, {}, 'error', 'User not found', req);
        return new Response(JSON.stringify({
          schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'],
          detail: 'User not found',
          status: 404,
        }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/scim+json' },
        });
      }

      const response = profileToScimUser(profile, baseUrl);
      await logScimOperation(supabase, companyId, 'PATCH', userId, patchRequest, response, 'success', undefined, req);

      return new Response(JSON.stringify(response), {
        headers: { ...corsHeaders, 'Content-Type': 'application/scim+json' },
      });
    }

    // DELETE /Users/:id - Deactivate user
    if (req.method === 'DELETE' && userId) {
      const { data: profile, error } = await supabase
        .from('profiles')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', userId)
        .eq('company_id', companyId)
        .select()
        .single();

      if (error || !profile) {
        await logScimOperation(supabase, companyId, 'DELETE', userId, {}, {}, 'error', 'User not found', req);
        return new Response(JSON.stringify({
          schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'],
          detail: 'User not found',
          status: 404,
        }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/scim+json' },
        });
      }

      await logScimOperation(supabase, companyId, 'DELETE', userId, {}, {}, 'success', undefined, req);

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
    console.error('SCIM Users error:', error);
    await logScimOperation(supabase, companyId, 'ERROR', userId, {}, {}, 'error', errorMessage, req);

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
