-- Create Entity Relationships Table (The Core of the Knowledge Graph)
create table if not exists "public"."entity_relationships" (
  "id" uuid not null default gen_random_uuid(),
  "source_type" text not null, -- 'candidate', 'company', 'transcript', 'user', 'meeting'
  "source_id" text not null,   -- UUID or unique string
  "target_type" text not null, -- 'skill', 'topic', 'pain_point', 'company', 'candidate'
  "target_id" text not null,   -- Normalized ID (e.g., 'react', 'budget_cuts')
  "relationship_type" text not null, -- 'has_skill', 'interested_in', 'struggling_with', 'works_at'
  "strength_score" numeric default 0.5,
  "evidence" jsonb default '{}'::jsonb, -- Store source text, meeting_id, etc.
  "created_at" timestamp with time zone not null default now(),
  constraint "entity_relationships_pkey" primary key ("id"),
  constraint "entity_relationships_unique_edge" unique ("source_type", "source_id", "target_type", "target_id", "relationship_type")
);

-- Index for fast traversal
create index if not exists "idx_entity_rel_source" on "public"."entity_relationships" ("source_type", "source_id");
create index if not exists "idx_entity_rel_target" on "public"."entity_relationships" ("target_type", "target_id");
create index if not exists "idx_entity_rel_type" on "public"."entity_relationships" ("relationship_type");

-- Enable RLS
alter table "public"."entity_relationships" enable row level security;
create policy "Allow all for authenticated" on "public"."entity_relationships" for all using (auth.role() = 'authenticated');

-- RPC Function: Match Entity Relationships (The "Graph Walk")
-- Input: List of concepts (e.g. ['react', 'google'])
-- Output: List of text facts describing connections
create or replace function match_entity_relationships(
    entities text[], 
    match_threshold numeric default 0.5
)
returns table (
    source_type text,
    source_id text,
    relationship text,
    target text,
    content text,
    similarity numeric
) 
language plpgsql
as $$
begin
    return query
    with relevant_edges as (
        select 
            er.source_type,
            er.source_id,
            er.target_type,
            er.target_id,
            er.relationship_type,
            er.strength_score,
            er.evidence
        from 
            entity_relationships er
        where 
            -- Direct match on target (e.g. target='react')
            er.target_id = any(entities)
            -- OR Direct match on source (e.g. source='google')
            or er.source_id = any(entities)
    )
    select 
        re.source_type,
        re.source_id,
        re.relationship_type as relationship,
        re.target_id as target,
        case 
            when re.source_type = 'candidate' then 'Candidate ' || re.source_id || ' ' || re.relationship_type || ' ' || re.target_id
            when re.source_type = 'company' then 'Company ' || re.source_id || ' ' || re.relationship_type || ' ' || re.target_id
            else re.source_type || ' ' || re.relationship_type || ' ' || re.target_id
        end as content,
        re.strength_score as similarity
    from 
        relevant_edges re
    where 
        re.strength_score >= match_threshold
    order by 
        re.strength_score desc
    limit 20;
end;
$$;
