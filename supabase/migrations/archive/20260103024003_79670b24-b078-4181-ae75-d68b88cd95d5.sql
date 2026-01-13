-- Create expense categories table
CREATE TABLE IF NOT EXISTS public.expense_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT,
  color TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create operating expenses table
CREATE TABLE IF NOT EXISTS public.operating_expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  expense_date DATE NOT NULL,
  category_id UUID REFERENCES public.expense_categories(id),
  category_name TEXT NOT NULL,
  description TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  currency TEXT DEFAULT 'EUR',
  vendor TEXT,
  is_recurring BOOLEAN DEFAULT false,
  recurring_frequency TEXT,
  receipt_url TEXT,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operating_expenses ENABLE ROW LEVEL SECURITY;

-- RLS policies for expense_categories (admin only via user_roles)
CREATE POLICY "Admins can view expense categories"
  ON public.expense_categories FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can manage expense categories"
  ON public.expense_categories FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- RLS policies for operating_expenses (admin only via user_roles)
CREATE POLICY "Admins can view operating expenses"
  ON public.operating_expenses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can manage operating expenses"
  ON public.operating_expenses FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Insert default expense categories
INSERT INTO public.expense_categories (name, description, icon, color) VALUES
  ('Salaries & Benefits', 'Employee salaries, bonuses, and benefits', 'Users', 'blue'),
  ('Software & SaaS', 'Software subscriptions and tools', 'Laptop', 'purple'),
  ('Office & Facilities', 'Rent, utilities, supplies', 'Building', 'green'),
  ('Marketing & Advertising', 'Marketing campaigns and ads', 'Megaphone', 'orange'),
  ('Professional Services', 'Legal, accounting, consulting', 'Briefcase', 'slate'),
  ('Travel & Entertainment', 'Business travel and client entertainment', 'Plane', 'cyan'),
  ('Other', 'Miscellaneous expenses', 'MoreHorizontal', 'gray')
ON CONFLICT (name) DO NOTHING;

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_operating_expenses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_operating_expenses_timestamp ON public.operating_expenses;
CREATE TRIGGER update_operating_expenses_timestamp
  BEFORE UPDATE ON public.operating_expenses
  FOR EACH ROW
  EXECUTE FUNCTION update_operating_expenses_updated_at();