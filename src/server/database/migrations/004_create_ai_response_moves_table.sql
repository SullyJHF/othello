-- Migration: Create AI response moves table
-- This migration creates the AI response moves system for predefined optimal AI responses in challenges

-- Create the AI response moves table
CREATE TABLE ai_response_moves (
    id SERIAL PRIMARY KEY,
    
    -- Challenge/Game association
    challenge_id INTEGER, -- Link to daily_challenges (nullable for general positions)
    game_id VARCHAR(255), -- Link to specific game instance (nullable)
    
    -- Board position identification
    board_state JSONB NOT NULL, -- The board position for which this AI response applies
    board_hash VARCHAR(128) NOT NULL, -- Hash of board position for fast lookup
    player_to_move CHAR(1) NOT NULL CHECK (player_to_move IN ('W', 'B')),
    
    -- Move sequence and stage
    sequence_stage INTEGER DEFAULT 1, -- Stage in multi-stage challenge (1, 2, 3, etc.)
    move_number INTEGER DEFAULT 1, -- Move number within this stage
    
    -- AI move data
    ai_move INTEGER NOT NULL CHECK (ai_move >= 0 AND ai_move <= 63), -- The optimal AI move (0-63)
    ai_strategy VARCHAR(50) DEFAULT 'alphabeta', -- Strategy used: 'minimax', 'alphabeta'
    ai_difficulty INTEGER DEFAULT 3 CHECK (ai_difficulty >= 1 AND ai_difficulty <= 6), -- Search depth/difficulty
    
    -- Move evaluation and analysis
    move_evaluation INTEGER NOT NULL, -- Board evaluation after this move
    search_depth INTEGER DEFAULT 3, -- Actual search depth used
    nodes_searched INTEGER, -- Number of nodes explored
    calculation_time INTEGER, -- Time taken to calculate (milliseconds)
    
    -- Alternative moves
    alternative_moves JSONB DEFAULT '[]', -- Array of alternative good moves with evaluations
    
    -- Move sequence context
    preceding_moves JSONB DEFAULT '[]', -- Array of moves that led to this position
    expected_player_response JSONB, -- Expected/optimal player response to this AI move
    response_evaluation INTEGER, -- Evaluation after expected player response
    
    -- Move explanation and pedagogy
    move_explanation TEXT, -- Human-readable explanation of why this move is optimal
    tactical_themes TEXT[], -- Array of tactical themes: ['corner-control', 'edge-play', 'mobility']
    difficulty_rating VARCHAR(20) DEFAULT 'intermediate', -- 'beginner', 'intermediate', 'advanced', 'expert'
    
    -- Challenge flow
    is_primary_line BOOLEAN DEFAULT true, -- True if this is the main challenge line
    is_retaliation_move BOOLEAN DEFAULT false, -- True if this is a counter-response to player deviation
    triggers_on_player_move INTEGER, -- Player move that triggers this AI response (0-63)
    
    -- Metadata and validation
    position_type VARCHAR(50) DEFAULT 'tactical', -- 'opening', 'midgame', 'endgame', 'tactical', 'strategic'
    is_forcing_sequence BOOLEAN DEFAULT false, -- True if this starts a forcing sequence
    sequence_priority INTEGER DEFAULT 0, -- Priority order for multiple possible sequences
    
    -- Timestamps and tracking
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_validated_at TIMESTAMP, -- When this AI response was last validated
    
    -- Validation and quality
    validation_score DECIMAL(4,2) DEFAULT 0.0, -- AI validation score (0.0-10.0)
    human_approved BOOLEAN DEFAULT false, -- Human expert approval
    usage_count INTEGER DEFAULT 0, -- How many times this response has been used
    
    -- Foreign key constraints
    CONSTRAINT fk_ai_moves_challenge 
        FOREIGN KEY (challenge_id) 
        REFERENCES daily_challenges(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    
    CONSTRAINT fk_ai_moves_game 
        FOREIGN KEY (game_id) 
        REFERENCES games(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

-- Create multi-stage challenge sequences table
CREATE TABLE ai_challenge_sequences (
    id SERIAL PRIMARY KEY,
    challenge_id INTEGER NOT NULL,
    sequence_name VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Sequence configuration
    total_stages INTEGER DEFAULT 1,
    current_stage INTEGER DEFAULT 1,
    is_linear BOOLEAN DEFAULT true, -- True if stages must be completed in order
    
    -- Success criteria
    success_criteria JSONB DEFAULT '{}', -- Conditions for completing each stage
    completion_rewards JSONB DEFAULT '{}', -- Points/rewards for completion
    
    -- Sequence metadata
    difficulty_progression VARCHAR(20) DEFAULT 'static', -- 'static', 'increasing', 'decreasing'
    estimated_duration INTEGER, -- Estimated completion time in seconds
    required_accuracy DECIMAL(4,2) DEFAULT 0.8, -- Required accuracy to progress (0.0-1.0)
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key constraints
    CONSTRAINT fk_sequences_challenge 
        FOREIGN KEY (challenge_id) 
        REFERENCES daily_challenges(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    
    -- Ensure unique sequence name per challenge
    UNIQUE(challenge_id, sequence_name)
);

-- Create AI move alternatives table for storing multiple good moves per position
CREATE TABLE ai_move_alternatives (
    id SERIAL PRIMARY KEY,
    ai_response_move_id INTEGER NOT NULL,
    
    -- Alternative move data
    move_position INTEGER NOT NULL CHECK (move_position >= 0 AND move_position <= 63),
    evaluation INTEGER NOT NULL,
    evaluation_difference INTEGER DEFAULT 0, -- Difference from best move evaluation
    
    -- Move analysis
    move_classification VARCHAR(50), -- 'excellent', 'good', 'acceptable', 'mistake', 'blunder'
    explanation TEXT, -- Why this move is good/bad
    probability_played DECIMAL(4,2) DEFAULT 0.0, -- Probability human would play this (0.0-1.0)
    
    -- Pedagogical value
    is_teaching_moment BOOLEAN DEFAULT false, -- True if this move teaches important concepts
    learning_value TEXT, -- What this move teaches about Othello strategy
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key constraints
    CONSTRAINT fk_alternatives_ai_move 
        FOREIGN KEY (ai_response_move_id) 
        REFERENCES ai_response_moves(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

-- Create comprehensive indexes for optimal performance
CREATE INDEX idx_ai_moves_challenge_id ON ai_response_moves(challenge_id);
CREATE INDEX idx_ai_moves_game_id ON ai_response_moves(game_id);
CREATE INDEX idx_ai_moves_board_hash ON ai_response_moves(board_hash);
CREATE INDEX idx_ai_moves_player_to_move ON ai_response_moves(player_to_move);
CREATE INDEX idx_ai_moves_sequence_stage ON ai_response_moves(sequence_stage);
CREATE INDEX idx_ai_moves_ai_strategy ON ai_response_moves(ai_strategy);
CREATE INDEX idx_ai_moves_difficulty ON ai_response_moves(ai_difficulty);
CREATE INDEX idx_ai_moves_position_type ON ai_response_moves(position_type);
CREATE INDEX idx_ai_moves_is_primary ON ai_response_moves(is_primary_line);
CREATE INDEX idx_ai_moves_is_retaliation ON ai_response_moves(is_retaliation_move);
CREATE INDEX idx_ai_moves_triggers_move ON ai_response_moves(triggers_on_player_move);
CREATE INDEX idx_ai_moves_approved ON ai_response_moves(human_approved);
CREATE INDEX idx_ai_moves_validation_score ON ai_response_moves(validation_score);
CREATE INDEX idx_ai_moves_usage_count ON ai_response_moves(usage_count);
CREATE INDEX idx_ai_moves_themes ON ai_response_moves USING GIN(tactical_themes);

-- Composite indexes for common query patterns
CREATE INDEX idx_ai_moves_challenge_stage ON ai_response_moves(challenge_id, sequence_stage);
CREATE INDEX idx_ai_moves_board_player ON ai_response_moves(board_hash, player_to_move);
CREATE INDEX idx_ai_moves_challenge_primary ON ai_response_moves(challenge_id, is_primary_line, sequence_stage);

-- Indexes for sequence table
CREATE INDEX idx_sequences_challenge_id ON ai_challenge_sequences(challenge_id);
CREATE INDEX idx_sequences_current_stage ON ai_challenge_sequences(current_stage);
CREATE INDEX idx_sequences_difficulty ON ai_challenge_sequences(difficulty_progression);

-- Indexes for alternatives table
CREATE INDEX idx_alternatives_ai_move_id ON ai_move_alternatives(ai_response_move_id);
CREATE INDEX idx_alternatives_classification ON ai_move_alternatives(move_classification);
CREATE INDEX idx_alternatives_teaching ON ai_move_alternatives(is_teaching_moment);
CREATE INDEX idx_alternatives_probability ON ai_move_alternatives(probability_played);

-- Create trigger to automatically update updated_at for ai_response_moves
CREATE TRIGGER update_ai_moves_updated_at
    BEFORE UPDATE ON ai_response_moves
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create trigger to automatically update updated_at for ai_challenge_sequences
CREATE TRIGGER update_sequences_updated_at
    BEFORE UPDATE ON ai_challenge_sequences
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create function to automatically generate board hash
CREATE OR REPLACE FUNCTION generate_board_hash()
RETURNS TRIGGER AS $$
BEGIN
    -- Generate a hash of the board state for fast lookups
    NEW.board_hash = md5(NEW.board_state::text);
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically generate board hash
CREATE TRIGGER generate_ai_moves_board_hash
    BEFORE INSERT OR UPDATE ON ai_response_moves
    FOR EACH ROW
    EXECUTE FUNCTION generate_board_hash();

-- Create function to update usage statistics
CREATE OR REPLACE FUNCTION update_ai_move_usage()
RETURNS TRIGGER AS $$
BEGIN
    -- Increment usage count when AI move is used
    UPDATE ai_response_moves 
    SET 
        usage_count = usage_count + 1,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.ai_response_move_id;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create function to validate move sequences
CREATE OR REPLACE FUNCTION validate_sequence_integrity()
RETURNS TRIGGER AS $$
BEGIN
    -- Ensure sequence stages are valid
    IF NEW.sequence_stage < 1 THEN
        RAISE EXCEPTION 'Sequence stage must be positive';
    END IF;
    
    -- Ensure move is within board bounds
    IF NEW.ai_move < 0 OR NEW.ai_move > 63 THEN
        RAISE EXCEPTION 'AI move must be between 0 and 63';
    END IF;
    
    -- Ensure difficulty is within valid range
    IF NEW.ai_difficulty < 1 OR NEW.ai_difficulty > 6 THEN
        RAISE EXCEPTION 'AI difficulty must be between 1 and 6';
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for sequence validation
CREATE TRIGGER validate_ai_move_sequence
    BEFORE INSERT OR UPDATE ON ai_response_moves
    FOR EACH ROW
    EXECUTE FUNCTION validate_sequence_integrity();

-- Add table comments for comprehensive documentation
COMMENT ON TABLE ai_response_moves IS 'Stores predefined optimal AI responses for challenge positions and multi-stage sequences';
COMMENT ON COLUMN ai_response_moves.board_state IS 'JSON representation of the board position';
COMMENT ON COLUMN ai_response_moves.board_hash IS 'MD5 hash of board state for fast position lookups';
COMMENT ON COLUMN ai_response_moves.sequence_stage IS 'Stage number in multi-stage challenge sequence';
COMMENT ON COLUMN ai_response_moves.ai_move IS 'Optimal AI move position (0-63 board index)';
COMMENT ON COLUMN ai_response_moves.move_evaluation IS 'Board evaluation score after AI move';
COMMENT ON COLUMN ai_response_moves.alternative_moves IS 'JSON array of alternative good moves with evaluations';
COMMENT ON COLUMN ai_response_moves.preceding_moves IS 'JSON array of moves that led to this position';
COMMENT ON COLUMN ai_response_moves.expected_player_response IS 'Expected optimal player response';
COMMENT ON COLUMN ai_response_moves.tactical_themes IS 'Array of tactical concepts demonstrated';
COMMENT ON COLUMN ai_response_moves.is_retaliation_move IS 'True if this counters player deviation from main line';
COMMENT ON COLUMN ai_response_moves.triggers_on_player_move IS 'Player move that triggers this AI response';

COMMENT ON TABLE ai_challenge_sequences IS 'Defines multi-stage challenge sequences with progression rules';
COMMENT ON COLUMN ai_challenge_sequences.success_criteria IS 'JSON conditions for completing each stage';
COMMENT ON COLUMN ai_challenge_sequences.completion_rewards IS 'JSON rewards structure for sequence completion';
COMMENT ON COLUMN ai_challenge_sequences.required_accuracy IS 'Minimum accuracy required to progress to next stage';

COMMENT ON TABLE ai_move_alternatives IS 'Stores alternative moves for each position with pedagogical analysis';
COMMENT ON COLUMN ai_move_alternatives.evaluation_difference IS 'Point difference from optimal move evaluation';
COMMENT ON COLUMN ai_move_alternatives.probability_played IS 'Statistical probability that humans play this move';
COMMENT ON COLUMN ai_move_alternatives.is_teaching_moment IS 'True if this move provides valuable learning opportunity';