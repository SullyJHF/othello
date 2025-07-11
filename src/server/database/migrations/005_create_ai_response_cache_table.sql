-- Migration: Create AI Response Cache Table
-- Description: Creates table for caching AI responses to improve performance
-- Version: 005
-- Created: Performance optimization phase

-- Create AI response cache table
CREATE TABLE IF NOT EXISTS ai_response_cache (
    id SERIAL PRIMARY KEY,
    cache_key VARCHAR(32) UNIQUE NOT NULL,
    board_hash VARCHAR(16) NOT NULL,
    board_state TEXT NOT NULL,
    player_to_move CHAR(1) NOT NULL CHECK (player_to_move IN ('W', 'B')),
    strategy VARCHAR(20) NOT NULL CHECK (strategy IN ('minimax', 'alphabeta', 'random')),
    difficulty INTEGER NOT NULL CHECK (difficulty >= 1 AND difficulty <= 6),
    ai_move INTEGER NOT NULL CHECK (ai_move >= 0 AND ai_move <= 63),
    evaluation INTEGER NOT NULL,
    search_depth INTEGER NOT NULL CHECK (search_depth >= 0),
    calculation_time INTEGER NOT NULL CHECK (calculation_time >= 0),
    hit_count INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    last_accessed TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    
    -- Add constraints
    CONSTRAINT valid_board_size CHECK (LENGTH(board_state) IN (36, 64, 100)) -- 6x6, 8x8, 10x10
);

-- Create indexes for optimal query performance
CREATE INDEX IF NOT EXISTS idx_ai_response_cache_lookup 
ON ai_response_cache (board_hash, player_to_move, strategy, difficulty);

CREATE INDEX IF NOT EXISTS idx_ai_response_cache_created_at 
ON ai_response_cache (created_at);

CREATE INDEX IF NOT EXISTS idx_ai_response_cache_last_accessed 
ON ai_response_cache (last_accessed);

CREATE INDEX IF NOT EXISTS idx_ai_response_cache_hit_count 
ON ai_response_cache (hit_count DESC);

CREATE INDEX IF NOT EXISTS idx_ai_response_cache_board_hash 
ON ai_response_cache (board_hash);

-- Create composite index for common query patterns
CREATE INDEX IF NOT EXISTS idx_ai_response_cache_popular 
ON ai_response_cache (hit_count DESC, last_accessed DESC) 
WHERE hit_count > 0;

-- Create partial index for recent entries (using a simpler approach without time-based predicate)
CREATE INDEX IF NOT EXISTS idx_ai_response_cache_recent 
ON ai_response_cache (board_hash, player_to_move, strategy, difficulty, hit_count DESC, created_at DESC);

-- Add function to update last_accessed automatically
CREATE OR REPLACE FUNCTION update_last_accessed() 
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_accessed = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update last_accessed on hit_count changes
CREATE TRIGGER trigger_update_last_accessed
    BEFORE UPDATE OF hit_count ON ai_response_cache
    FOR EACH ROW
    EXECUTE FUNCTION update_last_accessed();

-- Create function for cache cleanup
CREATE OR REPLACE FUNCTION cleanup_expired_cache_entries(ttl_minutes INTEGER DEFAULT 60)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM ai_response_cache 
    WHERE created_at < (CURRENT_TIMESTAMP - (ttl_minutes || ' minutes')::INTERVAL);
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Also clean up entries with very low hit counts that are old
    DELETE FROM ai_response_cache 
    WHERE hit_count = 0 
    AND created_at < (CURRENT_TIMESTAMP - INTERVAL '24 hours');
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Create function to get cache statistics
CREATE OR REPLACE FUNCTION get_cache_statistics()
RETURNS TABLE (
    total_entries BIGINT,
    hit_rate NUMERIC,
    average_hit_count NUMERIC,
    cache_size_mb NUMERIC,
    entries_last_24h BIGINT,
    most_popular_strategy TEXT,
    most_popular_difficulty INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_entries,
        CASE 
            WHEN SUM(hit_count) > 0 THEN 
                ROUND(SUM(hit_count)::NUMERIC / COUNT(*)::NUMERIC, 2)
            ELSE 0 
        END as hit_rate,
        ROUND(AVG(hit_count), 2) as average_hit_count,
        ROUND(pg_total_relation_size('ai_response_cache'::regclass) / (1024.0 * 1024.0), 2) as cache_size_mb,
        COUNT(*) FILTER (WHERE created_at > CURRENT_TIMESTAMP - INTERVAL '24 hours') as entries_last_24h,
        (SELECT strategy FROM ai_response_cache GROUP BY strategy ORDER BY SUM(hit_count) DESC LIMIT 1) as most_popular_strategy,
        (SELECT difficulty FROM ai_response_cache GROUP BY difficulty ORDER BY SUM(hit_count) DESC LIMIT 1) as most_popular_difficulty
    FROM ai_response_cache;
END;
$$ LANGUAGE plpgsql;

-- Insert some common position hashes for initial optimization
-- (These would be populated by the application based on actual usage patterns)

-- Add comments for documentation
COMMENT ON TABLE ai_response_cache IS 'Caches AI move calculations to improve performance and reduce computation time';
COMMENT ON COLUMN ai_response_cache.cache_key IS 'MD5 hash of board state + player + strategy + difficulty for unique identification';
COMMENT ON COLUMN ai_response_cache.board_hash IS 'SHA256 hash of board state for faster board lookups';
COMMENT ON COLUMN ai_response_cache.hit_count IS 'Number of times this cached entry has been accessed';
COMMENT ON COLUMN ai_response_cache.calculation_time IS 'Original calculation time in milliseconds';
COMMENT ON FUNCTION cleanup_expired_cache_entries IS 'Removes expired cache entries based on TTL and low usage patterns';
COMMENT ON FUNCTION get_cache_statistics IS 'Returns comprehensive cache performance and usage statistics';