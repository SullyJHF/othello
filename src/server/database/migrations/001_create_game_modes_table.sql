-- Migration: Create game modes table
-- This migration creates the core game modes table structure

-- Create the game modes table
CREATE TABLE game_modes (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    category game_mode_category NOT NULL,
    config JSONB NOT NULL,
    is_active BOOLEAN DEFAULT true,
    is_default BOOLEAN DEFAULT false,
    minimum_players INTEGER DEFAULT 2,
    maximum_players INTEGER DEFAULT 2,
    estimated_duration INTEGER, -- in minutes
    difficulty_level difficulty_level NOT NULL,
    tags TEXT[] DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX idx_game_modes_category ON game_modes(category);
CREATE INDEX idx_game_modes_active ON game_modes(is_active);
CREATE INDEX idx_game_modes_default ON game_modes(is_default);
CREATE INDEX idx_game_modes_difficulty ON game_modes(difficulty_level);
CREATE INDEX idx_game_modes_tags ON game_modes USING GIN(tags);

-- Create a function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_game_modes_updated_at
    BEFORE UPDATE ON game_modes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add constraint to ensure only one default game mode per category
CREATE UNIQUE INDEX idx_game_modes_unique_default
    ON game_modes(category)
    WHERE is_default = true;

-- Add constraint to ensure minimum and maximum players are valid for Othello
ALTER TABLE game_modes
ADD CONSTRAINT check_player_count
CHECK (minimum_players = 2 AND maximum_players = 2);

-- Add constraint to ensure estimated duration is positive
ALTER TABLE game_modes
ADD CONSTRAINT check_estimated_duration
CHECK (estimated_duration IS NULL OR estimated_duration > 0);