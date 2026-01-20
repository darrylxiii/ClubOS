-- Create tools_and_skills master table
CREATE TABLE IF NOT EXISTS public.tools_and_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL CHECK (category IN ('project_management', 'communication', 'design', 'development', 'language', 'database', 'cloud', 'analytics', 'crm', 'marketing', 'other')),
  logo_url TEXT,
  official_website TEXT,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create job_tools junction table
CREATE TABLE IF NOT EXISTS public.job_tools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  tool_id UUID NOT NULL REFERENCES public.tools_and_skills(id) ON DELETE CASCADE,
  proficiency_level TEXT CHECK (proficiency_level IN ('beginner', 'intermediate', 'advanced', 'expert')),
  is_required BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(job_id, tool_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_tools_category ON public.tools_and_skills(category);
CREATE INDEX IF NOT EXISTS idx_tools_active ON public.tools_and_skills(is_active);
CREATE INDEX IF NOT EXISTS idx_tools_slug ON public.tools_and_skills(slug);
CREATE INDEX IF NOT EXISTS idx_job_tools_job ON public.job_tools(job_id);
CREATE INDEX IF NOT EXISTS idx_job_tools_tool ON public.job_tools(tool_id);

-- Enable RLS
ALTER TABLE public.tools_and_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_tools ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tools_and_skills
CREATE POLICY "Anyone can view active tools"
  ON public.tools_and_skills
  FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage tools"
  ON public.tools_and_skills
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for job_tools
CREATE POLICY "Anyone can view job tools"
  ON public.job_tools
  FOR SELECT
  USING (true);

CREATE POLICY "Admins and partners can manage job tools"
  ON public.job_tools
  FOR ALL
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'partner'::app_role) OR
    has_role(auth.uid(), 'strategist'::app_role)
  );

-- Seed initial tools data (100+ tools across categories)

-- Project Management Tools
INSERT INTO public.tools_and_skills (name, slug, category, logo_url) VALUES
('Notion', 'notion', 'project_management', 'https://cdn.simpleicons.org/notion'),
('Monday.com', 'monday', 'project_management', 'https://cdn.simpleicons.org/monday'),
('Asana', 'asana', 'project_management', 'https://cdn.simpleicons.org/asana'),
('Jira', 'jira', 'project_management', 'https://cdn.simpleicons.org/jira'),
('Trello', 'trello', 'project_management', 'https://cdn.simpleicons.org/trello'),
('ClickUp', 'clickup', 'project_management', 'https://cdn.simpleicons.org/clickup'),
('Linear', 'linear', 'project_management', 'https://cdn.simpleicons.org/linear'),
('Basecamp', 'basecamp', 'project_management', 'https://cdn.simpleicons.org/basecamp'),
('Airtable', 'airtable', 'project_management', 'https://cdn.simpleicons.org/airtable'),
('Confluence', 'confluence', 'project_management', 'https://cdn.simpleicons.org/confluence'),
('Miro', 'miro', 'project_management', 'https://cdn.simpleicons.org/miro'),
('Smartsheet', 'smartsheet', 'project_management', 'https://cdn.simpleicons.org/smartsheet')
ON CONFLICT (slug) DO NOTHING;

-- Communication Tools
INSERT INTO public.tools_and_skills (name, slug, category, logo_url) VALUES
('Slack', 'slack', 'communication', 'https://cdn.simpleicons.org/slack'),
('Microsoft Teams', 'microsoftteams', 'communication', 'https://cdn.simpleicons.org/microsoftteams'),
('Discord', 'discord', 'communication', 'https://cdn.simpleicons.org/discord'),
('Zoom', 'zoom', 'communication', 'https://cdn.simpleicons.org/zoom'),
('Google Meet', 'googlemeet', 'communication', 'https://cdn.simpleicons.org/googlemeet'),
('Microsoft Outlook', 'microsoftoutlook', 'communication', 'https://cdn.simpleicons.org/microsoftoutlook'),
('Gmail', 'gmail', 'communication', 'https://cdn.simpleicons.org/gmail'),
('Telegram', 'telegram', 'communication', 'https://cdn.simpleicons.org/telegram'),
('WhatsApp', 'whatsapp', 'communication', 'https://cdn.simpleicons.org/whatsapp'),
('Skype', 'skype', 'communication', 'https://cdn.simpleicons.org/skype')
ON CONFLICT (slug) DO NOTHING;

-- Design Tools
INSERT INTO public.tools_and_skills (name, slug, category, logo_url) VALUES
('Figma', 'figma', 'design', 'https://cdn.simpleicons.org/figma'),
('Sketch', 'sketch', 'design', 'https://cdn.simpleicons.org/sketch'),
('Adobe XD', 'adobexd', 'design', 'https://cdn.simpleicons.org/adobexd'),
('Adobe Photoshop', 'adobephotoshop', 'design', 'https://cdn.simpleicons.org/adobephotoshop'),
('Adobe Illustrator', 'adobeillustrator', 'design', 'https://cdn.simpleicons.org/adobeillustrator'),
('Adobe InDesign', 'adobeindesign', 'design', 'https://cdn.simpleicons.org/adobeindesign'),
('Canva', 'canva', 'design', 'https://cdn.simpleicons.org/canva'),
('Framer', 'framer', 'design', 'https://cdn.simpleicons.org/framer'),
('InVision', 'invision', 'design', 'https://cdn.simpleicons.org/invision'),
('Blender', 'blender', 'design', 'https://cdn.simpleicons.org/blender'),
('After Effects', 'adobeaftereffects', 'design', 'https://cdn.simpleicons.org/adobeaftereffects'),
('Premiere Pro', 'adobepremierepro', 'design', 'https://cdn.simpleicons.org/adobepremierepro')
ON CONFLICT (slug) DO NOTHING;

-- Development Tools
INSERT INTO public.tools_and_skills (name, slug, category, logo_url) VALUES
('Git', 'git', 'development', 'https://cdn.simpleicons.org/git'),
('GitHub', 'github', 'development', 'https://cdn.simpleicons.org/github'),
('GitLab', 'gitlab', 'development', 'https://cdn.simpleicons.org/gitlab'),
('Bitbucket', 'bitbucket', 'development', 'https://cdn.simpleicons.org/bitbucket'),
('Docker', 'docker', 'development', 'https://cdn.simpleicons.org/docker'),
('Kubernetes', 'kubernetes', 'development', 'https://cdn.simpleicons.org/kubernetes'),
('Jenkins', 'jenkins', 'development', 'https://cdn.simpleicons.org/jenkins'),
('CircleCI', 'circleci', 'development', 'https://cdn.simpleicons.org/circleci'),
('GitHub Actions', 'githubactions', 'development', 'https://cdn.simpleicons.org/githubactions'),
('Postman', 'postman', 'development', 'https://cdn.simpleicons.org/postman'),
('VS Code', 'visualstudiocode', 'development', 'https://cdn.simpleicons.org/visualstudiocode'),
('IntelliJ IDEA', 'intellijidea', 'development', 'https://cdn.simpleicons.org/intellijidea'),
('WebStorm', 'webstorm', 'development', 'https://cdn.simpleicons.org/webstorm'),
('Vim', 'vim', 'development', 'https://cdn.simpleicons.org/vim'),
('Terraform', 'terraform', 'development', 'https://cdn.simpleicons.org/terraform'),
('Ansible', 'ansible', 'development', 'https://cdn.simpleicons.org/ansible')
ON CONFLICT (slug) DO NOTHING;

-- Programming Languages
INSERT INTO public.tools_and_skills (name, slug, category, logo_url) VALUES
('JavaScript', 'javascript', 'language', 'https://cdn.simpleicons.org/javascript'),
('TypeScript', 'typescript', 'language', 'https://cdn.simpleicons.org/typescript'),
('Python', 'python', 'language', 'https://cdn.simpleicons.org/python'),
('Java', 'java', 'language', 'https://cdn.simpleicons.org/openjdk'),
('Go', 'go', 'language', 'https://cdn.simpleicons.org/go'),
('Rust', 'rust', 'language', 'https://cdn.simpleicons.org/rust'),
('C++', 'cplusplus', 'language', 'https://cdn.simpleicons.org/cplusplus'),
('C#', 'csharp', 'language', 'https://cdn.simpleicons.org/csharp'),
('Ruby', 'ruby', 'language', 'https://cdn.simpleicons.org/ruby'),
('PHP', 'php', 'language', 'https://cdn.simpleicons.org/php'),
('Swift', 'swift', 'language', 'https://cdn.simpleicons.org/swift'),
('Kotlin', 'kotlin', 'language', 'https://cdn.simpleicons.org/kotlin'),
('Dart', 'dart', 'language', 'https://cdn.simpleicons.org/dart'),
('Scala', 'scala', 'language', 'https://cdn.simpleicons.org/scala'),
('R', 'r', 'language', 'https://cdn.simpleicons.org/r'),
('HTML5', 'html5', 'language', 'https://cdn.simpleicons.org/html5'),
('CSS3', 'css3', 'language', 'https://cdn.simpleicons.org/css3'),
('Sass', 'sass', 'language', 'https://cdn.simpleicons.org/sass'),
('React', 'react', 'language', 'https://cdn.simpleicons.org/react'),
('Vue.js', 'vuedotjs', 'language', 'https://cdn.simpleicons.org/vuedotjs'),
('Angular', 'angular', 'language', 'https://cdn.simpleicons.org/angular'),
('Node.js', 'nodedotjs', 'language', 'https://cdn.simpleicons.org/nodedotjs'),
('Next.js', 'nextdotjs', 'language', 'https://cdn.simpleicons.org/nextdotjs')
ON CONFLICT (slug) DO NOTHING;

-- Databases
INSERT INTO public.tools_and_skills (name, slug, category, logo_url) VALUES
('PostgreSQL', 'postgresql', 'database', 'https://cdn.simpleicons.org/postgresql'),
('MySQL', 'mysql', 'database', 'https://cdn.simpleicons.org/mysql'),
('MongoDB', 'mongodb', 'database', 'https://cdn.simpleicons.org/mongodb'),
('Redis', 'redis', 'database', 'https://cdn.simpleicons.org/redis'),
('Elasticsearch', 'elasticsearch', 'database', 'https://cdn.simpleicons.org/elasticsearch'),
('Firebase', 'firebase', 'database', 'https://cdn.simpleicons.org/firebase'),
('Supabase', 'supabase', 'database', 'https://cdn.simpleicons.org/supabase'),
('DynamoDB', 'amazondynamodb', 'database', 'https://cdn.simpleicons.org/amazondynamodb'),
('Cassandra', 'apachecassandra', 'database', 'https://cdn.simpleicons.org/apachecassandra'),
('SQLite', 'sqlite', 'database', 'https://cdn.simpleicons.org/sqlite'),
('MariaDB', 'mariadb', 'database', 'https://cdn.simpleicons.org/mariadb'),
('Oracle', 'oracle', 'database', 'https://cdn.simpleicons.org/oracle'),
('Microsoft SQL Server', 'microsoftsqlserver', 'database', 'https://cdn.simpleicons.org/microsoftsqlserver')
ON CONFLICT (slug) DO NOTHING;

-- Cloud & Infrastructure
INSERT INTO public.tools_and_skills (name, slug, category, logo_url) VALUES
('AWS', 'amazonaws', 'cloud', 'https://cdn.simpleicons.org/amazonaws'),
('Microsoft Azure', 'microsoftazure', 'cloud', 'https://cdn.simpleicons.org/microsoftazure'),
('Google Cloud', 'googlecloud', 'cloud', 'https://cdn.simpleicons.org/googlecloud'),
('Vercel', 'vercel', 'cloud', 'https://cdn.simpleicons.org/vercel'),
('Netlify', 'netlify', 'cloud', 'https://cdn.simpleicons.org/netlify'),
('Heroku', 'heroku', 'cloud', 'https://cdn.simpleicons.org/heroku'),
('DigitalOcean', 'digitalocean', 'cloud', 'https://cdn.simpleicons.org/digitalocean'),
('Cloudflare', 'cloudflare', 'cloud', 'https://cdn.simpleicons.org/cloudflare'),
('Railway', 'railway', 'cloud', 'https://cdn.simpleicons.org/railway')
ON CONFLICT (slug) DO NOTHING;

-- Analytics & BI
INSERT INTO public.tools_and_skills (name, slug, category, logo_url) VALUES
('Google Analytics', 'googleanalytics', 'analytics', 'https://cdn.simpleicons.org/googleanalytics'),
('Mixpanel', 'mixpanel', 'analytics', 'https://cdn.simpleicons.org/mixpanel'),
('Amplitude', 'amplitude', 'analytics', 'https://cdn.simpleicons.org/amplitude'),
('Tableau', 'tableau', 'analytics', 'https://cdn.simpleicons.org/tableau'),
('Power BI', 'powerbi', 'analytics', 'https://cdn.simpleicons.org/powerbi'),
('Looker', 'looker', 'analytics', 'https://cdn.simpleicons.org/looker'),
('Segment', 'segment', 'analytics', 'https://cdn.simpleicons.org/segment'),
('Hotjar', 'hotjar', 'analytics', 'https://cdn.simpleicons.org/hotjar')
ON CONFLICT (slug) DO NOTHING;

-- CRM & Sales
INSERT INTO public.tools_and_skills (name, slug, category, logo_url) VALUES
('Salesforce', 'salesforce', 'crm', 'https://cdn.simpleicons.org/salesforce'),
('HubSpot', 'hubspot', 'crm', 'https://cdn.simpleicons.org/hubspot'),
('Pipedrive', 'pipedrive', 'crm', 'https://cdn.simpleicons.org/pipedrive'),
('Zoho CRM', 'zoho', 'crm', 'https://cdn.simpleicons.org/zoho'),
('Intercom', 'intercom', 'crm', 'https://cdn.simpleicons.org/intercom'),
('Zendesk', 'zendesk', 'crm', 'https://cdn.simpleicons.org/zendesk'),
('Freshdesk', 'freshdesk', 'crm', 'https://cdn.simpleicons.org/freshdesk')
ON CONFLICT (slug) DO NOTHING;

-- Marketing Tools
INSERT INTO public.tools_and_skills (name, slug, category, logo_url) VALUES
('Mailchimp', 'mailchimp', 'marketing', 'https://cdn.simpleicons.org/mailchimp'),
('HubSpot Marketing', 'hubspot', 'marketing', 'https://cdn.simpleicons.org/hubspot'),
('Google Ads', 'googleads', 'marketing', 'https://cdn.simpleicons.org/googleads'),
('Facebook Ads', 'meta', 'marketing', 'https://cdn.simpleicons.org/meta'),
('LinkedIn Ads', 'linkedin', 'marketing', 'https://cdn.simpleicons.org/linkedin'),
('SEMrush', 'semrush', 'marketing', 'https://cdn.simpleicons.org/semrush'),
('Ahrefs', 'ahrefs', 'marketing', 'https://cdn.simpleicons.org/ahrefs')
ON CONFLICT (slug) DO NOTHING;