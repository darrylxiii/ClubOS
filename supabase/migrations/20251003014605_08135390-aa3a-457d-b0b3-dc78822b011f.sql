-- Create talent_strategists table
CREATE TABLE public.talent_strategists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT NOT NULL,
  title TEXT NOT NULL,
  bio TEXT,
  email TEXT,
  phone TEXT,
  linkedin_url TEXT,
  twitter_url TEXT,
  instagram_url TEXT,
  photo_url TEXT,
  availability TEXT,
  specialties TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.talent_strategists ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to view strategists
CREATE POLICY "Authenticated users can view talent strategists"
ON public.talent_strategists
FOR SELECT
TO authenticated
USING (true);

-- Only admins can modify strategists
CREATE POLICY "Only admins can insert talent strategists"
ON public.talent_strategists
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can update talent strategists"
ON public.talent_strategists
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can delete talent strategists"
ON public.talent_strategists
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Insert the talent strategists
INSERT INTO public.talent_strategists (full_name, title, bio, email, phone, linkedin_url, twitter_url, photo_url, specialties) VALUES
(
  'Darryl Mehilal',
  'Founder & CEO',
  'Visionary leader dedicated to connecting elite talent with groundbreaking opportunities. With over 15 years of experience in executive recruitment, I''m passionate about transforming careers.',
  'darryl@quantumclub.io',
  '+31 6 1234 5678',
  'https://linkedin.com/in/darrylmehilal',
  'https://twitter.com/darrylmehilal',
  null,
  ARRAY['Executive Leadership', 'C-Suite Placement', 'Strategic Vision']
),
(
  'Jasper Biezepol',
  'Senior Talent Strategist',
  'Specialized in matching technical leaders with innovative startups. I combine deep industry knowledge with a personal approach to ensure the perfect fit for both candidates and companies.',
  'jasper@quantumclub.io',
  '+31 6 2345 6789',
  'https://linkedin.com/in/jasperbiezepol',
  'https://twitter.com/jasperbiezepol',
  null,
  ARRAY['Tech Leadership', 'Engineering Excellence', 'AI/ML Roles']
),
(
  'Romy Brouwer',
  'Head of Marketing & Talent Strategist',
  'Bridging the gap between marketing excellence and talent acquisition. I help professionals find roles where they can make a real impact while building exceptional teams.',
  'romy@quantumclub.io',
  '+31 6 3456 7890',
  'https://linkedin.com/in/romybrouwer',
  'https://twitter.com/romybrouwer',
  null,
  ARRAY['Product Marketing', 'Growth Strategy', 'Brand Leadership']
),
(
  'Sebastiaan Brouwer',
  'Talent Strategist',
  'Focused on nurturing long-term relationships and understanding the unique needs of every candidate. I believe in creating meaningful connections that drive career success.',
  'sebastiaan@quantumclub.io',
  '+31 6 4567 8901',
  'https://linkedin.com/in/sebastiaanbrouwer',
  'https://twitter.com/sebastiaanbrouwer',
  null,
  ARRAY['Product Leadership', 'Design Excellence', 'Innovation']
);

-- Create updated_at trigger
CREATE TRIGGER update_talent_strategists_updated_at
BEFORE UPDATE ON public.talent_strategists
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();