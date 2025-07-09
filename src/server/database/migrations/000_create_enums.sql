-- Migration: Create enum types
-- This migration creates the PostgreSQL enum types needed for the game modes system

-- Create enum types (using IF NOT EXISTS to avoid conflicts)
DO $$ BEGIN
    CREATE TYPE game_mode_category AS ENUM ('timer', 'board-variant', 'special', 'daily-challenge', 'tournament');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE difficulty_level AS ENUM ('beginner', 'intermediate', 'advanced', 'expert');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE timer_type AS ENUM ('unlimited', 'fixed', 'increment', 'delay', 'correspondence');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;