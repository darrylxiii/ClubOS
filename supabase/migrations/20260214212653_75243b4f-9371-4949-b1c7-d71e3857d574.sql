
-- Create expense-receipts storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('expense-receipts', 'expense-receipts', false) ON CONFLICT (id) DO NOTHING;

-- Authenticated users can upload expense receipts
CREATE POLICY "Authenticated users can upload expense receipts"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'expense-receipts');

-- Authenticated users can read expense receipts
CREATE POLICY "Authenticated users can read expense receipts"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'expense-receipts');

-- Authenticated users can delete their expense receipts
CREATE POLICY "Authenticated users can delete expense receipts"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'expense-receipts');
