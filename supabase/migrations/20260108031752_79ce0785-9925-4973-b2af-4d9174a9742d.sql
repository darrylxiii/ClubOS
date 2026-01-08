-- Clean up all demo/test WhatsApp data
DELETE FROM whatsapp_messages WHERE wa_message_id LIKE 'wamid_demo_%' OR wa_message_id LIKE 'demo_%';
DELETE FROM whatsapp_conversations WHERE candidate_phone LIKE '+316123%' OR candidate_phone = '+31 6 1234 5678';
DELETE FROM whatsapp_business_accounts WHERE display_phone_number = '+31 6 1234 5678' OR phone_number_id LIKE 'demo_%';

-- Clean up test intelligence data (skip tables that may not exist)
DELETE FROM company_interactions WHERE is_test_data = true;
DELETE FROM company_stakeholders WHERE is_test_data = true;