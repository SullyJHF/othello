-- Rollback: Drop daily challenges table and related structures
-- This rollback removes the daily challenges system

-- Drop triggers
DROP TRIGGER IF EXISTS update_challenge_stats_on_attempt ON user_challenge_attempts;
DROP TRIGGER IF EXISTS update_daily_challenges_updated_at ON daily_challenges;

-- Drop functions
DROP FUNCTION IF EXISTS update_challenge_statistics();

-- Drop indexes for user_challenge_progress (will be dropped with table, but explicit for clarity)
DROP INDEX IF EXISTS idx_user_progress_completion_date;
DROP INDEX IF EXISTS idx_user_progress_completed;
DROP INDEX IF EXISTS idx_user_progress_challenge_id;
DROP INDEX IF EXISTS idx_user_progress_user_id;

-- Drop indexes for user_challenge_attempts (will be dropped with table, but explicit for clarity)
DROP INDEX IF EXISTS idx_user_attempts_completed_at;
DROP INDEX IF EXISTS idx_user_attempts_successful;
DROP INDEX IF EXISTS idx_user_attempts_challenge_id;
DROP INDEX IF EXISTS idx_user_attempts_user_id;

-- Drop indexes for daily_challenges (will be dropped with table, but explicit for clarity)
DROP INDEX IF EXISTS idx_daily_challenges_tags;
DROP INDEX IF EXISTS idx_daily_challenges_featured;
DROP INDEX IF EXISTS idx_daily_challenges_active;
DROP INDEX IF EXISTS idx_daily_challenges_category;
DROP INDEX IF EXISTS idx_daily_challenges_difficulty;
DROP INDEX IF EXISTS idx_daily_challenges_game_mode;
DROP INDEX IF EXISTS idx_daily_challenges_date;

-- Drop tables (dependent tables first due to foreign key constraints)
DROP TABLE IF EXISTS user_challenge_progress;
DROP TABLE IF EXISTS user_challenge_attempts;
DROP TABLE IF EXISTS daily_challenges;