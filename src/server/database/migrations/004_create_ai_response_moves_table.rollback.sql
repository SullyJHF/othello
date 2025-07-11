-- Rollback: Drop AI response moves table and related structures
-- This rollback removes the AI response moves system for challenge sequences

-- Drop triggers
DROP TRIGGER IF EXISTS validate_ai_move_sequence ON ai_response_moves;
DROP TRIGGER IF EXISTS generate_ai_moves_board_hash ON ai_response_moves;
DROP TRIGGER IF EXISTS update_sequences_updated_at ON ai_challenge_sequences;
DROP TRIGGER IF EXISTS update_ai_moves_updated_at ON ai_response_moves;

-- Drop functions
DROP FUNCTION IF EXISTS validate_sequence_integrity();
DROP FUNCTION IF EXISTS update_ai_move_usage();
DROP FUNCTION IF EXISTS generate_board_hash();

-- Drop indexes for ai_move_alternatives (will be dropped with table, but explicit for clarity)
DROP INDEX IF EXISTS idx_alternatives_probability;
DROP INDEX IF EXISTS idx_alternatives_teaching;
DROP INDEX IF EXISTS idx_alternatives_classification;
DROP INDEX IF EXISTS idx_alternatives_ai_move_id;

-- Drop indexes for ai_challenge_sequences (will be dropped with table, but explicit for clarity)
DROP INDEX IF EXISTS idx_sequences_difficulty;
DROP INDEX IF EXISTS idx_sequences_current_stage;
DROP INDEX IF EXISTS idx_sequences_challenge_id;

-- Drop composite indexes for ai_response_moves
DROP INDEX IF EXISTS idx_ai_moves_challenge_primary;
DROP INDEX IF EXISTS idx_ai_moves_board_player;
DROP INDEX IF EXISTS idx_ai_moves_challenge_stage;

-- Drop single column indexes for ai_response_moves (will be dropped with table, but explicit for clarity)
DROP INDEX IF EXISTS idx_ai_moves_themes;
DROP INDEX IF EXISTS idx_ai_moves_usage_count;
DROP INDEX IF EXISTS idx_ai_moves_validation_score;
DROP INDEX IF EXISTS idx_ai_moves_approved;
DROP INDEX IF EXISTS idx_ai_moves_triggers_move;
DROP INDEX IF EXISTS idx_ai_moves_is_retaliation;
DROP INDEX IF EXISTS idx_ai_moves_is_primary;
DROP INDEX IF EXISTS idx_ai_moves_position_type;
DROP INDEX IF EXISTS idx_ai_moves_difficulty;
DROP INDEX IF EXISTS idx_ai_moves_ai_strategy;
DROP INDEX IF EXISTS idx_ai_moves_sequence_stage;
DROP INDEX IF EXISTS idx_ai_moves_player_to_move;
DROP INDEX IF EXISTS idx_ai_moves_board_hash;
DROP INDEX IF EXISTS idx_ai_moves_game_id;
DROP INDEX IF EXISTS idx_ai_moves_challenge_id;

-- Drop tables (dependent tables first due to foreign key constraints)
DROP TABLE IF EXISTS ai_move_alternatives;
DROP TABLE IF EXISTS ai_challenge_sequences;
DROP TABLE IF EXISTS ai_response_moves;