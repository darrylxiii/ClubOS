-- Add missing values to communication_entity_type enum
ALTER TYPE communication_entity_type ADD VALUE IF NOT EXISTS 'internal';
ALTER TYPE communication_entity_type ADD VALUE IF NOT EXISTS 'team';
ALTER TYPE communication_entity_type ADD VALUE IF NOT EXISTS 'system';