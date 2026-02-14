
-- Add new expense categories
INSERT INTO expense_categories (name) VALUES ('Partnerships & Retainers') ON CONFLICT (name) DO NOTHING;
INSERT INTO expense_categories (name) VALUES ('Insurance & Compliance') ON CONFLICT (name) DO NOTHING;

-- Add vat_amount column to operating_expenses
ALTER TABLE operating_expenses ADD COLUMN IF NOT EXISTS vat_amount numeric DEFAULT 0;
