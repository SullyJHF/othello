-- Rollback Migration: Drop AI Response Cache Table
-- Description: Removes AI response cache table and related objects
-- Version: 005
-- Created: Performance optimization phase rollback

-- Drop triggers first
DROP TRIGGER IF EXISTS trigger_update_last_accessed ON ai_response_cache;

-- Drop functions
DROP FUNCTION IF EXISTS update_last_accessed();
DROP FUNCTION IF EXISTS cleanup_expired_cache_entries(INTEGER);
DROP FUNCTION IF EXISTS get_cache_statistics();

-- Drop indexes (they will be dropped automatically with the table, but being explicit)
DROP INDEX IF EXISTS idx_ai_response_cache_lookup;
DROP INDEX IF EXISTS idx_ai_response_cache_created_at;
DROP INDEX IF EXISTS idx_ai_response_cache_last_accessed;
DROP INDEX IF EXISTS idx_ai_response_cache_hit_count;
DROP INDEX IF EXISTS idx_ai_response_cache_board_hash;
DROP INDEX IF EXISTS idx_ai_response_cache_popular;
DROP INDEX IF EXISTS idx_ai_response_cache_recent;

-- Drop the main table
DROP TABLE IF EXISTS ai_response_cache;