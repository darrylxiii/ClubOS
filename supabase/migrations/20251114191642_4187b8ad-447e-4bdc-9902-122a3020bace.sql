-- Create company_news_articles table
CREATE TABLE company_news_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  added_by UUID REFERENCES profiles(id) NOT NULL,
  
  -- Article details
  url TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  published_date TIMESTAMP WITH TIME ZONE,
  source_name TEXT,
  author TEXT,
  
  -- Metadata
  is_featured BOOLEAN DEFAULT FALSE,
  is_pinned BOOLEAN DEFAULT FALSE,
  view_count INTEGER DEFAULT 0,
  click_count INTEGER DEFAULT 0,
  tags TEXT[],
  
  -- RSS feed info (for future automation)
  rss_feed_id UUID,
  article_guid TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create rss_feeds table (stub for future)
CREATE TABLE rss_feeds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  feed_url TEXT NOT NULL,
  feed_name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  last_fetched_at TIMESTAMP WITH TIME ZONE,
  fetch_interval_minutes INTEGER DEFAULT 60,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add foreign key for rss_feed_id
ALTER TABLE company_news_articles 
ADD CONSTRAINT fk_rss_feed 
FOREIGN KEY (rss_feed_id) REFERENCES rss_feeds(id) ON DELETE SET NULL;

-- Indexes for performance
CREATE INDEX idx_company_news_company_id ON company_news_articles(company_id);
CREATE INDEX idx_company_news_featured ON company_news_articles(is_featured);
CREATE INDEX idx_company_news_published ON company_news_articles(published_date DESC);
CREATE INDEX idx_rss_feeds_company_id ON rss_feeds(company_id);

-- Enable RLS
ALTER TABLE company_news_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE rss_feeds ENABLE ROW LEVEL SECURITY;

-- RLS Policies for company_news_articles
CREATE POLICY "Anyone can view company news articles"
  ON company_news_articles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM companies 
      WHERE companies.id = company_news_articles.company_id 
      AND companies.is_active = TRUE
    )
  );

CREATE POLICY "Company members can manage news articles"
  ON company_news_articles FOR ALL
  USING (
    auth.uid() IN (
      SELECT user_id FROM company_members 
      WHERE company_id = company_news_articles.company_id 
      AND is_active = TRUE
    )
    OR
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role = 'admin'
    )
  );

-- RLS Policies for rss_feeds
CREATE POLICY "Anyone can view rss feeds for active companies"
  ON rss_feeds FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM companies 
      WHERE companies.id = rss_feeds.company_id 
      AND companies.is_active = TRUE
    )
  );

CREATE POLICY "Company members can manage rss feeds"
  ON rss_feeds FOR ALL
  USING (
    auth.uid() IN (
      SELECT user_id FROM company_members 
      WHERE company_id = rss_feeds.company_id 
      AND is_active = TRUE
    )
    OR
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role = 'admin'
    )
  );

-- Add trigger for company_news_articles
CREATE TRIGGER update_company_news_articles_updated_at
BEFORE UPDATE ON company_news_articles
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();