-- Migration: Create challenge sessions table for multi-stage challenge orchestration
-- This table stores session state for complex multi-stage challenges

-- Drop existing table if it exists (for development)
DROP TABLE IF EXISTS challenge_sessions CASCADE;

-- Create challenge sessions table
CREATE TABLE challenge_sessions (
    -- Primary identifiers
    session_id VARCHAR(255) PRIMARY KEY,
    challenge_id INTEGER NOT NULL,
    user_id VARCHAR(100) NOT NULL,
    
    -- Progress tracking
    current_stage INTEGER DEFAULT 1,
    total_stages INTEGER NOT NULL,
    
    -- Session state (JSONB for complex data structures)
    attempts JSONB DEFAULT '[]'::jsonb, -- Array of StageAttempt objects
    
    -- Timestamps
    start_time TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    last_activity TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    -- Status flags
    is_active BOOLEAN DEFAULT true,
    is_completed BOOLEAN DEFAULT false,
    
    -- Performance metrics
    overall_accuracy DECIMAL(5,2) DEFAULT 0.00, -- 0-100%
    total_time_spent INTEGER DEFAULT 0, -- milliseconds
    total_hints_used INTEGER DEFAULT 0,
    final_score INTEGER DEFAULT 0,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for efficient queries
CREATE INDEX idx_challenge_sessions_challenge_user ON challenge_sessions(challenge_id, user_id);
CREATE INDEX idx_challenge_sessions_user_active ON challenge_sessions(user_id, is_active);
CREATE INDEX idx_challenge_sessions_challenge_active ON challenge_sessions(challenge_id, is_active);
CREATE INDEX idx_challenge_sessions_last_activity ON challenge_sessions(last_activity);
CREATE INDEX idx_challenge_sessions_completion ON challenge_sessions(is_completed, final_score);

-- Create GIN index for JSONB attempts data
CREATE INDEX idx_challenge_sessions_attempts_gin ON challenge_sessions USING GIN (attempts);

-- Create function to update last_activity timestamp
CREATE OR REPLACE FUNCTION update_challenge_session_activity()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    NEW.last_activity = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update timestamps
CREATE TRIGGER trigger_challenge_sessions_update_activity
    BEFORE UPDATE ON challenge_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_challenge_session_activity();

-- Add constraints
ALTER TABLE challenge_sessions 
ADD CONSTRAINT check_current_stage_positive 
CHECK (current_stage > 0);

ALTER TABLE challenge_sessions 
ADD CONSTRAINT check_total_stages_positive 
CHECK (total_stages > 0);

ALTER TABLE challenge_sessions 
ADD CONSTRAINT check_current_stage_within_total 
CHECK (current_stage <= total_stages + 1); -- Allow completion (current_stage = total_stages + 1)

ALTER TABLE challenge_sessions 
ADD CONSTRAINT check_accuracy_range 
CHECK (overall_accuracy >= 0 AND overall_accuracy <= 100);

ALTER TABLE challenge_sessions 
ADD CONSTRAINT check_time_spent_non_negative 
CHECK (total_time_spent >= 0);

ALTER TABLE challenge_sessions 
ADD CONSTRAINT check_hints_used_non_negative 
CHECK (total_hints_used >= 0);

-- Add comments for documentation
COMMENT ON TABLE challenge_sessions IS 'Stores session state for multi-stage challenge orchestration';
COMMENT ON COLUMN challenge_sessions.session_id IS 'Unique session identifier for the challenge attempt';
COMMENT ON COLUMN challenge_sessions.challenge_id IS 'Reference to the challenge being attempted';
COMMENT ON COLUMN challenge_sessions.user_id IS 'User attempting the challenge';
COMMENT ON COLUMN challenge_sessions.current_stage IS 'Current stage number (1-based indexing)';
COMMENT ON COLUMN challenge_sessions.total_stages IS 'Total number of stages in this challenge';
COMMENT ON COLUMN challenge_sessions.attempts IS 'JSONB array of StageAttempt objects with detailed attempt history';
COMMENT ON COLUMN challenge_sessions.is_active IS 'Whether the session is currently active';
COMMENT ON COLUMN challenge_sessions.is_completed IS 'Whether the entire challenge has been completed';
COMMENT ON COLUMN challenge_sessions.overall_accuracy IS 'Overall accuracy percentage across all completed stages';
COMMENT ON COLUMN challenge_sessions.total_time_spent IS 'Total time spent on the challenge in milliseconds';
COMMENT ON COLUMN challenge_sessions.total_hints_used IS 'Total number of hints used across all stages';
COMMENT ON COLUMN challenge_sessions.final_score IS 'Final calculated score for the completed challenge';

-- Create function for session cleanup (remove old inactive sessions)
CREATE OR REPLACE FUNCTION cleanup_old_challenge_sessions(days_old INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM challenge_sessions 
    WHERE is_active = false 
    AND last_activity < CURRENT_TIMESTAMP - INTERVAL '1 day' * days_old;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Create function to get session statistics
CREATE OR REPLACE FUNCTION get_challenge_session_stats(p_challenge_id INTEGER DEFAULT NULL)
RETURNS TABLE (
    challenge_id INTEGER,
    total_sessions BIGINT,
    active_sessions BIGINT,
    completed_sessions BIGINT,
    average_completion_time NUMERIC,
    average_accuracy NUMERIC,
    total_hints_used BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cs.challenge_id,
        COUNT(*) as total_sessions,
        SUM(CASE WHEN cs.is_active THEN 1 ELSE 0 END) as active_sessions,
        SUM(CASE WHEN cs.is_completed THEN 1 ELSE 0 END) as completed_sessions,
        AVG(CASE WHEN cs.is_completed THEN cs.total_time_spent ELSE NULL END) as average_completion_time,
        AVG(CASE WHEN cs.is_completed THEN cs.overall_accuracy ELSE NULL END) as average_accuracy,
        SUM(cs.total_hints_used) as total_hints_used
    FROM challenge_sessions cs
    WHERE (p_challenge_id IS NULL OR cs.challenge_id = p_challenge_id)
    GROUP BY cs.challenge_id
    ORDER BY cs.challenge_id;
END;
$$ LANGUAGE plpgsql;

-- Create function to get user session history
CREATE OR REPLACE FUNCTION get_user_challenge_history(p_user_id VARCHAR(100))
RETURNS TABLE (
    session_id VARCHAR(255),
    challenge_id INTEGER,
    current_stage INTEGER,
    total_stages INTEGER,
    is_completed BOOLEAN,
    overall_accuracy DECIMAL(5,2),
    total_time_spent INTEGER,
    final_score INTEGER,
    start_time TIMESTAMPTZ,
    last_activity TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cs.session_id,
        cs.challenge_id,
        cs.current_stage,
        cs.total_stages,
        cs.is_completed,
        cs.overall_accuracy,
        cs.total_time_spent,
        cs.final_score,
        cs.start_time,
        cs.last_activity
    FROM challenge_sessions cs
    WHERE cs.user_id = p_user_id
    ORDER BY cs.start_time DESC;
END;
$$ LANGUAGE plpgsql;

-- Sample data for testing (optional - can be removed in production)
-- INSERT INTO challenge_sessions (
--     session_id, challenge_id, user_id, current_stage, total_stages,
--     overall_accuracy, total_time_spent, total_hints_used, final_score, is_completed
-- ) VALUES 
-- ('test_session_1', 1, 'test_user_1', 3, 3, 85.5, 120000, 2, 850, true),
-- ('test_session_2', 1, 'test_user_2', 2, 3, 70.0, 180000, 5, 650, false),
-- ('test_session_3', 2, 'test_user_1', 1, 5, 95.0, 60000, 0, 950, false);

-- Grant permissions (adjust as needed for your user roles)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON challenge_sessions TO your_app_user;
-- GRANT USAGE, SELECT ON SEQUENCE challenge_sessions_id_seq TO your_app_user;