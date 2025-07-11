-- Migration: Create games table with game mode support
-- This migration creates the games table to persist game state with game mode integration

-- Create the games table
CREATE TABLE games (
    id VARCHAR(255) PRIMARY KEY,
    join_url VARCHAR(500) NOT NULL,
    current_player CHAR(1) CHECK (current_player IN ('W', 'B')),
    game_started BOOLEAN DEFAULT false,
    game_full BOOLEAN DEFAULT false,
    game_finished BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_activity_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Game mode integration
    game_mode_id VARCHAR(255) NOT NULL,
    game_mode_config JSONB DEFAULT '{}',
    
    -- Timer state (for timed game modes)
    player_timers JSONB DEFAULT '{}', -- { "player_id": { "timeLeft": seconds, "lastMoveTime": timestamp } }
    timer_state JSONB DEFAULT '{}', -- Current timer state and settings
    
    -- Board state
    board_state JSONB NOT NULL DEFAULT '{}', -- Board configuration and current state
    board_size INTEGER DEFAULT 8, -- Support for different board sizes
    
    -- Game results and statistics
    final_score JSONB DEFAULT '{}', -- { "W": score, "B": score }
    winner CHAR(1) CHECK (winner IN ('W', 'B') OR winner IS NULL),
    finish_reason VARCHAR(100), -- 'normal', 'resignation', 'timeout', 'draw'
    move_count INTEGER DEFAULT 0,
    
    -- Challenge mode specific fields
    challenge_type VARCHAR(50), -- 'daily', 'puzzle', 'scenario', null for regular games
    challenge_attempts INTEGER DEFAULT 0,
    challenge_max_attempts INTEGER,
    challenge_solved BOOLEAN DEFAULT false,
    
    -- Metadata
    metadata JSONB DEFAULT '{}', -- Additional game-specific data
    
    -- Foreign key to game modes
    CONSTRAINT fk_games_game_mode 
        FOREIGN KEY (game_mode_id) 
        REFERENCES game_modes(id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
);

-- Create indexes for better performance
CREATE INDEX idx_games_game_mode ON games(game_mode_id);
CREATE INDEX idx_games_current_player ON games(current_player);
CREATE INDEX idx_games_game_started ON games(game_started);
CREATE INDEX idx_games_game_finished ON games(game_finished);
CREATE INDEX idx_games_created_at ON games(created_at);
CREATE INDEX idx_games_last_activity ON games(last_activity_at);
CREATE INDEX idx_games_challenge_type ON games(challenge_type);
CREATE INDEX idx_games_winner ON games(winner);

-- Create players table to store game participants
CREATE TABLE game_players (
    id SERIAL PRIMARY KEY,
    game_id VARCHAR(255) NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    piece CHAR(1) CHECK (piece IN ('W', 'B')),
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_connected BOOLEAN DEFAULT true,
    last_seen_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Player-specific game mode data
    player_config JSONB DEFAULT '{}',
    
    -- Player statistics for this game
    moves_made INTEGER DEFAULT 0,
    time_used INTEGER DEFAULT 0, -- Time used in seconds
    
    -- Constraints
    CONSTRAINT fk_game_players_game 
        FOREIGN KEY (game_id) 
        REFERENCES games(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    
    -- Ensure unique player per game
    UNIQUE(game_id, user_id),
    
    -- Ensure unique piece per game
    UNIQUE(game_id, piece)
);

-- Create indexes for game_players
CREATE INDEX idx_game_players_game_id ON game_players(game_id);
CREATE INDEX idx_game_players_user_id ON game_players(user_id);
CREATE INDEX idx_game_players_piece ON game_players(piece);
CREATE INDEX idx_game_players_connected ON game_players(is_connected);

-- Create trigger to automatically update updated_at for games
CREATE TRIGGER update_games_updated_at
    BEFORE UPDATE ON games
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create trigger to automatically update last_activity_at on any game update
CREATE OR REPLACE FUNCTION update_last_activity_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_activity_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_games_last_activity_at
    BEFORE UPDATE ON games
    FOR EACH ROW
    EXECUTE FUNCTION update_last_activity_at();

-- Add constraint to ensure at least one player for started games
-- This will be enforced at the application level for better performance

-- Add constraint to ensure game has exactly 2 players when full
-- This will be enforced at the application level for better performance

-- Add comments for documentation
COMMENT ON TABLE games IS 'Stores persistent game state with game mode integration';
COMMENT ON COLUMN games.game_mode_id IS 'References the game mode configuration';
COMMENT ON COLUMN games.player_timers IS 'JSON object storing timer state for each player';
COMMENT ON COLUMN games.board_state IS 'JSON object storing the current board configuration and state';
COMMENT ON COLUMN games.challenge_type IS 'Type of challenge if this is a challenge game';
COMMENT ON COLUMN games.metadata IS 'Additional game-specific configuration and data';

COMMENT ON TABLE game_players IS 'Stores player participation in games';
COMMENT ON COLUMN game_players.player_config IS 'Player-specific game mode configuration';