UPDATE auth.users 
SET raw_user_meta_data = raw_user_meta_data || '{"force_password_change": false}'::jsonb
WHERE id = '31f473b9-18e0-4b3b-bfde-398ea2c5078a';