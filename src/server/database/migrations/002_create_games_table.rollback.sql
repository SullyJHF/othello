-- Rollback: Drop games table and related structures
-- This rollback removes the games table and all associated structures

-- Drop triggers
DROP TRIGGER IF EXISTS update_games_last_activity_at ON games;
DROP TRIGGER IF EXISTS update_games_updated_at ON games;

-- Drop functions
DROP FUNCTION IF EXISTS update_last_activity_at();

-- Drop indexes for game_players (will be dropped with table, but explicit for clarity)
DROP INDEX IF EXISTS idx_game_players_connected;
DROP INDEX IF EXISTS idx_game_players_piece;
DROP INDEX IF EXISTS idx_game_players_user_id;
DROP INDEX IF EXISTS idx_game_players_game_id;

-- Drop indexes for games (will be dropped with table, but explicit for clarity)
DROP INDEX IF EXISTS idx_games_winner;
DROP INDEX IF EXISTS idx_games_challenge_type;
DROP INDEX IF EXISTS idx_games_last_activity;
DROP INDEX IF EXISTS idx_games_created_at;
DROP INDEX IF EXISTS idx_games_game_finished;
DROP INDEX IF EXISTS idx_games_game_started;
DROP INDEX IF EXISTS idx_games_current_player;
DROP INDEX IF EXISTS idx_games_game_mode;

-- Drop tables (game_players first due to foreign key constraint)
DROP TABLE IF EXISTS game_players;
DROP TABLE IF EXISTS games;