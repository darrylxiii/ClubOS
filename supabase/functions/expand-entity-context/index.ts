import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";
import { publicCorsHeaders } from "../_shared/cors-config.ts";

const corsHeaders = publicCorsHeaders;

interface ExpandRequest {
  entity_type: 'candidate' | 'company' | 'job' | 'stakeholder';
  entity_id: string;
  depth?: number; // How many hops to traverse (default: 1, max: 3)
  include_types?: string[]; // Which related entity types to include
}

interface ExpandedContext {
  primary_entity: EntityContext;
  related_entities: EntityContext[];
  relationship_graph: RelationshipEdge[];
  context_summary: string;
}

interface EntityContext {
  id: string;
  type: string;
  name: string;
  key_attributes: Record<string, any>;
  relevance_score: number;
}

interface RelationshipEdge {
  source_id: string;
  source_type: string;
  target_id: string;
  target_type: string;
  relationship_type: string;
  strength: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const input: ExpandRequest = await req.json();

    if (!input.entity_type || !input.entity_id) {
      return new Response(JSON.stringify({ error: 'entity_type and entity_id are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const depth = Math.min(input.depth || 1, 3);
    const includeTypes = input.include_types || ['candidate', 'company', 'job', 'stakeholder'];

    // Get the primary entity
    const primaryEntity = await fetchEntity(supabase, input.entity_type, input.entity_id);
    
    if (!primaryEntity) {
      return new Response(JSON.stringify({ error: 'Entity not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Traverse the entity graph
    const { relatedEntities, edges } = await traverseEntityGraph(
      supabase,
      input.entity_type,
      input.entity_id,
      depth,
      includeTypes
    );

    // Generate context summary
    const contextSummary = generateContextSummary(primaryEntity, relatedEntities, edges);

    const result: ExpandedContext = {
      primary_entity: primaryEntity,
      related_entities: relatedEntities,
      relationship_graph: edges,
      context_summary: contextSummary,
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('Entity expansion error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function fetchEntity(
  supabase: any, 
  entityType: string, 
  entityId: string
): Promise<EntityContext | null> {
  try {
    let data: any = null;
    let name = '';
    let keyAttributes: Record<string, any> = {};

    switch (entityType) {
      case 'candidate': {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, full_name, email, headline, current_company, current_title, skills')
          .eq('id', entityId)
          .single();

        if (profile) {
          data = profile;
          name = profile.full_name || 'Unknown';
          keyAttributes = {
            email: profile.email,
            headline: profile.headline,
            current_company: profile.current_company,
            current_title: profile.current_title,
            skills: profile.skills,
          };
        }
        break;
      }

      case 'company': {
        const { data: company } = await supabase
          .from('companies')
          .select('id, name, industry, size_range, location, description')
          .eq('id', entityId)
          .single();

        if (company) {
          data = company;
          name = company.name;
          keyAttributes = {
            industry: company.industry,
            size_range: company.size_range,
            location: company.location,
            description: company.description,
          };
        }
        break;
      }

      case 'job': {
        const { data: job } = await supabase
          .from('jobs')
          .select('id, title, company_id, location, employment_type, experience_level, status')
          .eq('id', entityId)
          .single();

        if (job) {
          data = job;
          name = job.title;
          keyAttributes = {
            company_id: job.company_id,
            location: job.location,
            employment_type: job.employment_type,
            experience_level: job.experience_level,
            status: job.status,
          };
        }
        break;
      }

      case 'stakeholder': {
        const { data: stakeholder } = await supabase
          .from('profiles')
          .select('id, full_name, email, current_title, current_company')
          .eq('id', entityId)
          .single();

        if (stakeholder) {
          data = stakeholder;
          name = stakeholder.full_name || 'Unknown';
          keyAttributes = {
            email: stakeholder.email,
            title: stakeholder.current_title,
            company: stakeholder.current_company,
          };
        }
        break;
      }
    }

    if (!data) return null;

    return {
      id: entityId,
      type: entityType,
      name,
      key_attributes: keyAttributes,
      relevance_score: 1.0,
    };
  } catch (error) {
    console.error(`Error fetching ${entityType}:`, error);
    return null;
  }
}

async function traverseEntityGraph(
  supabase: any,
  startType: string,
  startId: string,
  maxDepth: number,
  includeTypes: string[]
): Promise<{ relatedEntities: EntityContext[]; edges: RelationshipEdge[] }> {
  const visited = new Set<string>();
  const relatedEntities: EntityContext[] = [];
  const edges: RelationshipEdge[] = [];
  
  async function traverse(entityType: string, entityId: string, currentDepth: number) {
    const key = `${entityType}:${entityId}`;
    if (visited.has(key) || currentDepth > maxDepth) return;
    visited.add(key);

    // Get relationships from entity_graph_links
    const { data: relationships } = await supabase
      .from('entity_graph_links')
      .select('*')
      .or(`source_entity_id.eq.${entityId},target_entity_id.eq.${entityId}`)
      .order('relationship_strength', { ascending: false })
      .limit(20);

    if (!relationships) return;

    for (const rel of relationships) {
      // Determine which side is the "other" entity
      const isSource = rel.source_entity_id === entityId;
      const otherType = isSource ? rel.target_entity_type : rel.source_entity_type;
      const otherId = isSource ? rel.target_entity_id : rel.source_entity_id;

      // Skip if we're not interested in this type
      if (!includeTypes.includes(otherType)) continue;

      // Add edge
      edges.push({
        source_id: rel.source_entity_id,
        source_type: rel.source_entity_type,
        target_id: rel.target_entity_id,
        target_type: rel.target_entity_type,
        relationship_type: rel.relationship_type,
        strength: rel.relationship_strength,
      });

      // Fetch related entity
      const relatedEntity = await fetchEntity(supabase, otherType, otherId);
      if (relatedEntity) {
        // Adjust relevance based on depth and relationship strength
        relatedEntity.relevance_score = rel.relationship_strength * (1 / (currentDepth + 1));
        relatedEntities.push(relatedEntity);

        // Recurse
        if (currentDepth < maxDepth) {
          await traverse(otherType, otherId, currentDepth + 1);
        }
      }
    }

    // Also check for implicit relationships
    await findImplicitRelationships(supabase, entityType, entityId, relatedEntities, edges, includeTypes);
  }

  await traverse(startType, startId, 0);

  // Sort by relevance
  relatedEntities.sort((a, b) => b.relevance_score - a.relevance_score);

  return { relatedEntities, edges };
}

async function findImplicitRelationships(
  supabase: any,
  entityType: string,
  entityId: string,
  relatedEntities: EntityContext[],
  edges: RelationshipEdge[],
  includeTypes: string[]
) {
  try {
    // Find implicit relationships based on entity type
    if (entityType === 'candidate' && includeTypes.includes('job')) {
      // Find jobs the candidate has applied to
      const { data: applications } = await supabase
        .from('applications')
        .select('job_id, status, created_at')
        .eq('candidate_id', entityId)
        .limit(10);

      if (applications) {
        for (const app of applications) {
          const job = await fetchEntity(supabase, 'job', app.job_id);
          if (job) {
            job.relevance_score = app.status === 'active' ? 0.9 : 0.6;
            job.key_attributes.application_status = app.status;
            relatedEntities.push(job);
            
            edges.push({
              source_id: entityId,
              source_type: 'candidate',
              target_id: app.job_id,
              target_type: 'job',
              relationship_type: 'applied_to',
              strength: job.relevance_score,
            });
          }
        }
      }
    }

    if (entityType === 'job' && includeTypes.includes('company')) {
      // Get the company for this job
      const { data: job } = await supabase
        .from('jobs')
        .select('company_id')
        .eq('id', entityId)
        .single();

      if (job?.company_id) {
        const company = await fetchEntity(supabase, 'company', job.company_id);
        if (company) {
          company.relevance_score = 1.0;
          relatedEntities.push(company);
          
          edges.push({
            source_id: entityId,
            source_type: 'job',
            target_id: job.company_id,
            target_type: 'company',
            relationship_type: 'posted_by',
            strength: 1.0,
          });
        }
      }
    }

    // Find recent interactions
    if (includeTypes.includes('stakeholder')) {
      const { data: interactions } = await supabase
        .from('company_interactions')
        .select('contact_person, created_at')
        .or(`candidate_id.eq.${entityId},company_id.eq.${entityId}`)
        .order('created_at', { ascending: false })
        .limit(5);

      // Process interactions to extract stakeholders
      // (Would need actual stakeholder IDs in practice)
    }
  } catch (error) {
    console.error('Error finding implicit relationships:', error);
  }
}

function generateContextSummary(
  primary: EntityContext,
  related: EntityContext[],
  edges: RelationshipEdge[]
): string {
  const parts: string[] = [];

  // Primary entity description
  parts.push(`Primary ${primary.type}: ${primary.name}`);

  // Group related entities by type
  const byType = new Map<string, EntityContext[]>();
  for (const entity of related) {
    if (!byType.has(entity.type)) {
      byType.set(entity.type, []);
    }
    byType.get(entity.type)!.push(entity);
  }

  // Describe relationships
  for (const [type, entities] of byType.entries()) {
    const topEntities = entities.slice(0, 3);
    const names = topEntities.map(e => e.name).join(', ');
    parts.push(`Related ${type}s (${entities.length}): ${names}${entities.length > 3 ? '...' : ''}`);
  }

  // Key relationship insights
  const strongRelationships = edges.filter(e => e.strength > 0.7);
  if (strongRelationships.length > 0) {
    parts.push(`Strong relationships: ${strongRelationships.length}`);
  }

  return parts.join('. ') + '.';
}
