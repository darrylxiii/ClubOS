-- Drop partial index and add a proper unique constraint
DROP INDEX IF EXISTS idx_crm_email_replies_external_id;
ALTER TABLE crm_email_replies ADD CONSTRAINT uq_crm_email_replies_external_id UNIQUE (external_id);