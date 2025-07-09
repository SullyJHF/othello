-- Create database user and set permissions
DO $$
BEGIN
    -- Create user if not exists
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'othello_user') THEN
        CREATE ROLE othello_user LOGIN PASSWORD 'secure_password';
    END IF;
END
$$;

-- Grant necessary permissions
GRANT CONNECT ON DATABASE othello TO othello_user;
GRANT USAGE ON SCHEMA public TO othello_user;
GRANT CREATE ON SCHEMA public TO othello_user;

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Set timezone
SET timezone = 'UTC';

-- Create enum types
CREATE TYPE game_mode_category AS ENUM ('timer', 'board-variant', 'special', 'daily-challenge', 'tournament');
CREATE TYPE difficulty_level AS ENUM ('beginner', 'intermediate', 'advanced', 'expert');
CREATE TYPE timer_type AS ENUM ('unlimited', 'fixed', 'increment', 'delay', 'correspondence');

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_games_created_at ON games(created_at);
CREATE INDEX IF NOT EXISTS idx_games_last_activity ON games(last_activity_at);