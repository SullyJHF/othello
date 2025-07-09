-- Migration: Create daily challenges table
-- This migration creates the daily challenges system for puzzle-based gameplay

-- Create the daily challenges table
CREATE TABLE daily_challenges (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL UNIQUE, -- One challenge per day
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    difficulty_level difficulty_level NOT NULL,
    
    -- Challenge configuration
    game_mode_id VARCHAR(255) NOT NULL,
    initial_board_state JSONB NOT NULL, -- Starting board position
    target_board_state JSONB, -- Target end position (if applicable)
    solution_moves JSONB, -- Array of solution moves
    max_attempts INTEGER DEFAULT 3,
    time_limit INTEGER, -- Time limit in seconds (null for no limit)
    
    -- Challenge metadata
    category VARCHAR(50) NOT NULL DEFAULT 'tactical', -- 'tactical', 'endgame', 'opening', 'puzzle'
    tags TEXT[] DEFAULT '{}',
    hint_text TEXT,
    explanation TEXT, -- Explanation of the solution
    
    -- Statistics
    total_attempts INTEGER DEFAULT 0,
    successful_attempts INTEGER DEFAULT 0,
    average_attempts DECIMAL(4,2) DEFAULT 0,
    average_time_to_solve INTEGER DEFAULT 0, -- in seconds
    
    -- Challenge status
    is_active BOOLEAN DEFAULT true,
    is_featured BOOLEAN DEFAULT false,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key to game modes
    CONSTRAINT fk_daily_challenges_game_mode 
        FOREIGN KEY (game_mode_id) 
        REFERENCES game_modes(id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
);

-- Create user challenge attempts table
CREATE TABLE user_challenge_attempts (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    challenge_id INTEGER NOT NULL,
    attempt_number INTEGER NOT NULL,
    
    -- Attempt details
    moves_made JSONB NOT NULL DEFAULT '[]', -- Array of moves made
    final_board_state JSONB NOT NULL,
    time_taken INTEGER, -- Time taken in seconds
    
    -- Result
    is_successful BOOLEAN DEFAULT false,
    completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Additional data
    hints_used INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    
    -- Foreign key constraints
    CONSTRAINT fk_user_attempts_challenge 
        FOREIGN KEY (challenge_id) 
        REFERENCES daily_challenges(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    
    -- Ensure unique attempt per user per challenge
    UNIQUE(user_id, challenge_id, attempt_number)
);

-- Create user challenge progress table for tracking overall progress
CREATE TABLE user_challenge_progress (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    challenge_id INTEGER NOT NULL,
    
    -- Progress tracking
    attempts_made INTEGER DEFAULT 0,
    is_completed BOOLEAN DEFAULT false,
    best_time INTEGER, -- Best completion time in seconds
    completion_date TIMESTAMP,
    
    -- First attempt tracking
    first_attempt_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_attempt_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Statistics
    total_time_spent INTEGER DEFAULT 0, -- Total time spent on this challenge
    hints_used_total INTEGER DEFAULT 0,
    
    -- Foreign key constraints
    CONSTRAINT fk_user_progress_challenge 
        FOREIGN KEY (challenge_id) 
        REFERENCES daily_challenges(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    
    -- Ensure unique progress per user per challenge
    UNIQUE(user_id, challenge_id)
);

-- Create indexes for better performance
CREATE INDEX idx_daily_challenges_date ON daily_challenges(date);
CREATE INDEX idx_daily_challenges_game_mode ON daily_challenges(game_mode_id);
CREATE INDEX idx_daily_challenges_difficulty ON daily_challenges(difficulty_level);
CREATE INDEX idx_daily_challenges_category ON daily_challenges(category);
CREATE INDEX idx_daily_challenges_active ON daily_challenges(is_active);
CREATE INDEX idx_daily_challenges_featured ON daily_challenges(is_featured);
CREATE INDEX idx_daily_challenges_tags ON daily_challenges USING GIN(tags);

CREATE INDEX idx_user_attempts_user_id ON user_challenge_attempts(user_id);
CREATE INDEX idx_user_attempts_challenge_id ON user_challenge_attempts(challenge_id);
CREATE INDEX idx_user_attempts_successful ON user_challenge_attempts(is_successful);
CREATE INDEX idx_user_attempts_completed_at ON user_challenge_attempts(completed_at);

CREATE INDEX idx_user_progress_user_id ON user_challenge_progress(user_id);
CREATE INDEX idx_user_progress_challenge_id ON user_challenge_progress(challenge_id);
CREATE INDEX idx_user_progress_completed ON user_challenge_progress(is_completed);
CREATE INDEX idx_user_progress_completion_date ON user_challenge_progress(completion_date);

-- Create trigger to automatically update updated_at for daily_challenges
CREATE TRIGGER update_daily_challenges_updated_at
    BEFORE UPDATE ON daily_challenges
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create function to update challenge statistics
CREATE OR REPLACE FUNCTION update_challenge_statistics()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the daily challenge statistics based on user attempts
    UPDATE daily_challenges 
    SET 
        total_attempts = (
            SELECT COUNT(*) 
            FROM user_challenge_attempts 
            WHERE challenge_id = NEW.challenge_id
        ),
        successful_attempts = (
            SELECT COUNT(*) 
            FROM user_challenge_attempts 
            WHERE challenge_id = NEW.challenge_id 
            AND is_successful = true
        ),
        average_attempts = (
            SELECT AVG(attempt_number) 
            FROM user_challenge_attempts 
            WHERE challenge_id = NEW.challenge_id 
            AND is_successful = true
        ),
        average_time_to_solve = (
            SELECT AVG(time_taken) 
            FROM user_challenge_attempts 
            WHERE challenge_id = NEW.challenge_id 
            AND is_successful = true 
            AND time_taken IS NOT NULL
        ),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.challenge_id;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update statistics
CREATE TRIGGER update_challenge_stats_on_attempt
    AFTER INSERT OR UPDATE ON user_challenge_attempts
    FOR EACH ROW
    EXECUTE FUNCTION update_challenge_statistics();

-- Add comments for documentation
COMMENT ON TABLE daily_challenges IS 'Stores daily challenge puzzles and configurations';
COMMENT ON COLUMN daily_challenges.initial_board_state IS 'Starting board position for the challenge';
COMMENT ON COLUMN daily_challenges.solution_moves IS 'Array of moves that solve the challenge';
COMMENT ON COLUMN daily_challenges.target_board_state IS 'Target end position if applicable';

COMMENT ON TABLE user_challenge_attempts IS 'Tracks individual user attempts at challenges';
COMMENT ON COLUMN user_challenge_attempts.moves_made IS 'Array of moves made during this attempt';
COMMENT ON COLUMN user_challenge_attempts.final_board_state IS 'Final board state after attempt';

COMMENT ON TABLE user_challenge_progress IS 'Tracks overall user progress on challenges';
COMMENT ON COLUMN user_challenge_progress.best_time IS 'Best completion time for this challenge';
COMMENT ON COLUMN user_challenge_progress.total_time_spent IS 'Total time spent on this challenge across all attempts';