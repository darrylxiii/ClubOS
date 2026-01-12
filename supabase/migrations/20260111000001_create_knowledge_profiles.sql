-- Create Entity Type Enum if not exists
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'entity_type_enum') THEN 
        CREATE TYPE entity_type_enum AS ENUM ('company', 'user', 'job');
    END IF; 
END $$;

-- Create Knowledge Profiles Table
create table if not exists knowledge_profiles (
  id uuid primary key default gen_random_uuid(),
  entity_type entity_type_enum not null,
  entity_id uuid not null,
  
  -- Voice & Style
  voice_tone text, -- e.g. "Professional", "Casual", "Authentic"
  voice_examples jsonb default '[]'::jsonb, -- Array of strings
  keywords_to_include text[] default '{}',
  keywords_to_avoid text[] default '{}',
  
  -- Knowledge Base Config
  knowledge_sources jsonb default '{"use_website": true, "use_uploaded_docs": true, "use_past_comms": true}'::jsonb,
  custom_instructions text, -- "Always mention we are YC backed."
  
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  
  -- Constraint: One profile per entity
  unique(entity_type, entity_id)
);

-- RLS Policies
alter table knowledge_profiles enable row level security;

-- Everyone can read (for now, to let shared agents work easily)
create policy "Enable read for authenticated users" 
on knowledge_profiles for select to authenticated using (true);

-- Users can insert/update their own profile or profiles related to their company
-- (Simplified for now - strictly should check company_id of user)
create policy "Enable insert/update for authenticated users"
on knowledge_profiles for all to authenticated using (true) with check (true);
