import { publicCorsHeaders as corsHeaders } from '../_shared/cors-config.ts';

const SERVICE_PROVIDER_CONFIG = {
  schemas: ['urn:ietf:params:scim:schemas:core:2.0:ServiceProviderConfig'],
  documentationUri: 'https://docs.thequantumclub.com/scim',
  patch: {
    supported: true,
  },
  bulk: {
    supported: false,
    maxOperations: 0,
    maxPayloadSize: 0,
  },
  filter: {
    supported: true,
    maxResults: 100,
  },
  changePassword: {
    supported: false,
  },
  sort: {
    supported: false,
  },
  etag: {
    supported: false,
  },
  authenticationSchemes: [
    {
      type: 'oauthbearertoken',
      name: 'OAuth Bearer Token',
      description: 'Authentication scheme using the OAuth Bearer Token Standard',
      specUri: 'https://www.rfc-editor.org/info/rfc6750',
      primary: true,
    },
  ],
  meta: {
    location: '/scim/v2/ServiceProviderConfig',
    resourceType: 'ServiceProviderConfig',
    created: '2024-01-01T00:00:00Z',
    lastModified: '2024-01-01T00:00:00Z',
  },
};

const SCHEMAS = {
  schemas: ['urn:ietf:params:scim:api:messages:2.0:ListResponse'],
  totalResults: 2,
  itemsPerPage: 2,
  startIndex: 1,
  Resources: [
    {
      id: 'urn:ietf:params:scim:schemas:core:2.0:User',
      name: 'User',
      description: 'User Account',
      attributes: [
        {
          name: 'userName',
          type: 'string',
          multiValued: false,
          required: true,
          caseExact: false,
          mutability: 'readWrite',
          returned: 'default',
          uniqueness: 'server',
        },
        {
          name: 'name',
          type: 'complex',
          multiValued: false,
          required: false,
          mutability: 'readWrite',
          returned: 'default',
          subAttributes: [
            { name: 'formatted', type: 'string', multiValued: false, required: false },
            { name: 'familyName', type: 'string', multiValued: false, required: false },
            { name: 'givenName', type: 'string', multiValued: false, required: false },
          ],
        },
        {
          name: 'displayName',
          type: 'string',
          multiValued: false,
          required: false,
          mutability: 'readWrite',
          returned: 'default',
        },
        {
          name: 'emails',
          type: 'complex',
          multiValued: true,
          required: false,
          mutability: 'readWrite',
          returned: 'default',
          subAttributes: [
            { name: 'value', type: 'string', multiValued: false, required: true },
            { name: 'type', type: 'string', multiValued: false, required: false },
            { name: 'primary', type: 'boolean', multiValued: false, required: false },
          ],
        },
        {
          name: 'active',
          type: 'boolean',
          multiValued: false,
          required: false,
          mutability: 'readWrite',
          returned: 'default',
        },
        {
          name: 'externalId',
          type: 'string',
          multiValued: false,
          required: false,
          mutability: 'readWrite',
          returned: 'default',
        },
      ],
      meta: {
        resourceType: 'Schema',
        location: '/scim/v2/Schemas/urn:ietf:params:scim:schemas:core:2.0:User',
      },
    },
    {
      id: 'urn:ietf:params:scim:schemas:core:2.0:Group',
      name: 'Group',
      description: 'Group',
      attributes: [
        {
          name: 'displayName',
          type: 'string',
          multiValued: false,
          required: true,
          mutability: 'readWrite',
          returned: 'default',
        },
        {
          name: 'members',
          type: 'complex',
          multiValued: true,
          required: false,
          mutability: 'readWrite',
          returned: 'default',
          subAttributes: [
            { name: 'value', type: 'string', multiValued: false, required: true },
            { name: 'display', type: 'string', multiValued: false, required: false },
            { name: '$ref', type: 'reference', multiValued: false, required: false },
          ],
        },
        {
          name: 'externalId',
          type: 'string',
          multiValued: false,
          required: false,
          mutability: 'readWrite',
          returned: 'default',
        },
      ],
      meta: {
        resourceType: 'Schema',
        location: '/scim/v2/Schemas/urn:ietf:params:scim:schemas:core:2.0:Group',
      },
    },
  ],
};

const RESOURCE_TYPES = {
  schemas: ['urn:ietf:params:scim:api:messages:2.0:ListResponse'],
  totalResults: 2,
  itemsPerPage: 2,
  startIndex: 1,
  Resources: [
    {
      schemas: ['urn:ietf:params:scim:schemas:core:2.0:ResourceType'],
      id: 'User',
      name: 'User',
      endpoint: '/Users',
      description: 'User Account',
      schema: 'urn:ietf:params:scim:schemas:core:2.0:User',
      meta: {
        location: '/scim/v2/ResourceTypes/User',
        resourceType: 'ResourceType',
      },
    },
    {
      schemas: ['urn:ietf:params:scim:schemas:core:2.0:ResourceType'],
      id: 'Group',
      name: 'Group',
      endpoint: '/Groups',
      description: 'Group',
      schema: 'urn:ietf:params:scim:schemas:core:2.0:Group',
      meta: {
        location: '/scim/v2/ResourceTypes/Group',
        resourceType: 'ResourceType',
      },
    },
  ],
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const path = url.pathname.toLowerCase();

  try {
    let response: any;

    if (path.includes('serviceproviderconfig') || path.endsWith('/')) {
      response = SERVICE_PROVIDER_CONFIG;
    } else if (path.includes('schemas')) {
      const schemaId = url.searchParams.get('id');
      if (schemaId) {
        response = SCHEMAS.Resources.find(s => s.id === schemaId) || SCHEMAS;
      } else {
        response = SCHEMAS;
      }
    } else if (path.includes('resourcetypes')) {
      const resourceType = path.split('/').pop();
      if (resourceType && resourceType !== 'resourcetypes') {
        response = RESOURCE_TYPES.Resources.find(r => r.id.toLowerCase() === resourceType.toLowerCase()) || RESOURCE_TYPES;
      } else {
        response = RESOURCE_TYPES;
      }
    } else {
      response = SERVICE_PROVIDER_CONFIG;
    }

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/scim+json' },
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    console.error('SCIM ServiceProviderConfig error:', error);

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
