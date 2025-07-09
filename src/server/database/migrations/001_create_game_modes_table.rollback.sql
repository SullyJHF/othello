-- Rollback: Drop game modes table
-- This rollback script undoes the changes from 001_create_game_modes_table.sql

-- Drop the trigger first
DROP TRIGGER IF EXISTS update_game_modes_updated_at ON game_modes;

-- Drop the function
DROP FUNCTION IF EXISTS update_updated_at_column();

-- Drop the table (this will also drop all indexes and constraints)
DROP TABLE IF EXISTS game_modes;