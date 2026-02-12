
-- Phase 1: Add nice_to_have and salary_period to jobs
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS nice_to_have JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS salary_period TEXT DEFAULT 'annual';

-- Phase 2: Populate skills_taxonomy synonyms (text[] type)
UPDATE public.skills_taxonomy SET synonyms = ARRAY['js', 'ecmascript', 'es6', 'es2015'] WHERE lower(canonical_name) = 'javascript';
UPDATE public.skills_taxonomy SET synonyms = ARRAY['ts'] WHERE lower(canonical_name) = 'typescript';
UPDATE public.skills_taxonomy SET synonyms = ARRAY['reactjs', 'react.js', 'react js'] WHERE lower(canonical_name) = 'react';
UPDATE public.skills_taxonomy SET synonyms = ARRAY['vuejs', 'vue.js', 'vue js'] WHERE lower(canonical_name) = 'vue';
UPDATE public.skills_taxonomy SET synonyms = ARRAY['angularjs', 'angular.js', 'ng'] WHERE lower(canonical_name) = 'angular';
UPDATE public.skills_taxonomy SET synonyms = ARRAY['node', 'nodejs', 'node.js'] WHERE lower(canonical_name) IN ('node.js', 'nodejs');
UPDATE public.skills_taxonomy SET synonyms = ARRAY['py'] WHERE lower(canonical_name) = 'python';
UPDATE public.skills_taxonomy SET synonyms = ARRAY['rb'] WHERE lower(canonical_name) = 'ruby';
UPDATE public.skills_taxonomy SET synonyms = ARRAY['aws', 'amazon web services'] WHERE lower(canonical_name) IN ('aws', 'amazon web services');
UPDATE public.skills_taxonomy SET synonyms = ARRAY['gcp', 'google cloud'] WHERE lower(canonical_name) IN ('google cloud platform', 'gcp');
UPDATE public.skills_taxonomy SET synonyms = ARRAY['k8s'] WHERE lower(canonical_name) = 'kubernetes';
UPDATE public.skills_taxonomy SET synonyms = ARRAY['ci/cd', 'cicd', 'continuous integration'] WHERE lower(canonical_name) IN ('ci/cd', 'continuous integration');
UPDATE public.skills_taxonomy SET synonyms = ARRAY['postgres', 'psql', 'pg'] WHERE lower(canonical_name) IN ('postgresql', 'postgres');
UPDATE public.skills_taxonomy SET synonyms = ARRAY['mongo'] WHERE lower(canonical_name) IN ('mongodb', 'mongo');
UPDATE public.skills_taxonomy SET synonyms = ARRAY['css3', 'cascading style sheets'] WHERE lower(canonical_name) = 'css';
UPDATE public.skills_taxonomy SET synonyms = ARRAY['html5'] WHERE lower(canonical_name) = 'html';
UPDATE public.skills_taxonomy SET synonyms = ARRAY['csharp', 'c sharp'] WHERE lower(canonical_name) = 'c#';
UPDATE public.skills_taxonomy SET synonyms = ARRAY['cpp', 'c plus plus'] WHERE lower(canonical_name) = 'c++';
UPDATE public.skills_taxonomy SET synonyms = ARRAY['tf', 'terraform hcl'] WHERE lower(canonical_name) = 'terraform';
UPDATE public.skills_taxonomy SET synonyms = ARRAY['ml'] WHERE lower(canonical_name) = 'machine learning';
UPDATE public.skills_taxonomy SET synonyms = ARRAY['ai'] WHERE lower(canonical_name) = 'artificial intelligence';
UPDATE public.skills_taxonomy SET synonyms = ARRAY['ux', 'user experience'] WHERE lower(canonical_name) IN ('ux design', 'ux');
UPDATE public.skills_taxonomy SET synonyms = ARRAY['ui', 'user interface'] WHERE lower(canonical_name) IN ('ui design', 'ui');
UPDATE public.skills_taxonomy SET synonyms = ARRAY['pm', 'project management'] WHERE lower(canonical_name) = 'project management';
UPDATE public.skills_taxonomy SET synonyms = ARRAY['agile methodology', 'scrum master'] WHERE lower(canonical_name) = 'agile';
UPDATE public.skills_taxonomy SET synonyms = ARRAY['nextjs', 'next.js'] WHERE lower(canonical_name) IN ('next.js', 'nextjs');
UPDATE public.skills_taxonomy SET synonyms = ARRAY['tailwindcss', 'tailwind css'] WHERE lower(canonical_name) IN ('tailwind', 'tailwindcss');
UPDATE public.skills_taxonomy SET synonyms = ARRAY['gql'] WHERE lower(canonical_name) = 'graphql';
UPDATE public.skills_taxonomy SET synonyms = ARRAY['rest', 'restful', 'rest api'] WHERE lower(canonical_name) IN ('rest api', 'restful api');
UPDATE public.skills_taxonomy SET synonyms = ARRAY['scss'] WHERE lower(canonical_name) IN ('sass', 'scss');
UPDATE public.skills_taxonomy SET synonyms = ARRAY['figma design'] WHERE lower(canonical_name) = 'figma';
UPDATE public.skills_taxonomy SET synonyms = ARRAY['photoshop', 'adobe photoshop'] WHERE lower(canonical_name) = 'photoshop';
UPDATE public.skills_taxonomy SET synonyms = ARRAY['illustrator', 'adobe illustrator'] WHERE lower(canonical_name) = 'illustrator';
UPDATE public.skills_taxonomy SET synonyms = ARRAY['seo', 'search engine optimization'] WHERE lower(canonical_name) = 'seo';
UPDATE public.skills_taxonomy SET synonyms = ARRAY['java ee', 'j2ee', 'jakarta ee'] WHERE lower(canonical_name) = 'java';
UPDATE public.skills_taxonomy SET synonyms = ARRAY['spring boot', 'spring framework'] WHERE lower(canonical_name) = 'spring';
UPDATE public.skills_taxonomy SET synonyms = ARRAY['dotnet', '.net core', 'asp.net'] WHERE lower(canonical_name) IN ('.net', 'dotnet');
UPDATE public.skills_taxonomy SET synonyms = ARRAY['golang'] WHERE lower(canonical_name) = 'go';
UPDATE public.skills_taxonomy SET synonyms = ARRAY['swiftui', 'swift ui'] WHERE lower(canonical_name) = 'swift';
UPDATE public.skills_taxonomy SET synonyms = ARRAY['kotlin android'] WHERE lower(canonical_name) = 'kotlin';
UPDATE public.skills_taxonomy SET synonyms = ARRAY['rn'] WHERE lower(canonical_name) = 'react native';
UPDATE public.skills_taxonomy SET synonyms = ARRAY['flutter dart'] WHERE lower(canonical_name) = 'flutter';
UPDATE public.skills_taxonomy SET synonyms = ARRAY['my sql'] WHERE lower(canonical_name) = 'mysql';
UPDATE public.skills_taxonomy SET synonyms = ARRAY['redis cache'] WHERE lower(canonical_name) = 'redis';
UPDATE public.skills_taxonomy SET synonyms = ARRAY['elastic', 'elk'] WHERE lower(canonical_name) IN ('elasticsearch', 'elastic');
UPDATE public.skills_taxonomy SET synonyms = ARRAY['data science', 'data analytics'] WHERE lower(canonical_name) = 'data analysis';
UPDATE public.skills_taxonomy SET synonyms = ARRAY['powerbi'] WHERE lower(canonical_name) = 'power bi';
UPDATE public.skills_taxonomy SET synonyms = ARRAY['salesforce crm', 'sfdc'] WHERE lower(canonical_name) = 'salesforce';
UPDATE public.skills_taxonomy SET synonyms = ARRAY['hubspot crm'] WHERE lower(canonical_name) = 'hubspot';

-- Phase 3: Add response_time_minutes to candidate_interactions
ALTER TABLE public.candidate_interactions ADD COLUMN IF NOT EXISTS response_time_minutes INTEGER;
ALTER TABLE public.candidate_interactions ADD COLUMN IF NOT EXISTS interaction_quality TEXT;
