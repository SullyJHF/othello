-- Rollback: Drop enum types
-- This rollback script removes the enum types created in 000_create_enums.sql

-- Drop enum types (they'll only be dropped if not referenced by any tables)
DROP TYPE IF EXISTS timer_type;
DROP TYPE IF EXISTS difficulty_level;
DROP TYPE IF EXISTS game_mode_category;