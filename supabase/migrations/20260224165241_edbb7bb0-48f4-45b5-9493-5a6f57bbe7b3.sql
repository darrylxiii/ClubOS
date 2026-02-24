UPDATE partner_requests
SET status = 'declined',
    decline_reason = 'Invalid email address',
    reviewed_at = now()
WHERE status = 'pending'
  AND (contact_email !~ '^[^@]+@[^@]+\.[^@]+$');