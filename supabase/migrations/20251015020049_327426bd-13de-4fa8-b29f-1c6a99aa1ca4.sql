-- Make partnership_type nullable since it's being removed from the form
ALTER TABLE partner_requests 
ALTER COLUMN partnership_type DROP NOT NULL,
ALTER COLUMN partnership_type SET DEFAULT 'ongoing';