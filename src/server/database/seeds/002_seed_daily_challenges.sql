-- Seed file: Daily Challenges
-- This file seeds the database with example daily challenges

-- First, let's insert some realistic Othello challenge positions
-- Note: Board states use 64-character strings where:
-- 'B' = Black piece, 'W' = White piece, '.' = Empty, '0' = Valid move marker

-- Challenge 1: Corner Capture Opportunity (Beginner)
INSERT INTO daily_challenges (
    date, 
    title, 
    description, 
    difficulty_level, 
    game_mode_id,
    initial_board_state, 
    solution_moves,
    max_attempts,
    time_limit,
    category,
    tags,
    hint_text,
    explanation
) VALUES (
    '2025-07-10',
    'Corner Capture Opportunity',
    'Find the move that captures the bottom-left corner and gains a significant advantage.',
    'beginner',
    'daily-challenge',
    '{"pieces": [".", ".", ".", ".", ".", ".", ".", ".", ".", "B", "B", "B", "B", "B", "B", ".", ".", "W", "B", "W", "W", "W", "B", ".", ".", "W", "W", "B", "W", "W", "B", ".", ".", "W", "W", "W", "B", "B", "B", ".", ".", "W", "W", "W", "W", "B", ".", ".", ".", "W", "W", "W", "W", ".", ".", ".", ".", ".", ".", ".", ".", ".", ".", "."], "nextMoves": [56], "size": 8}',
    '[56]', -- Solution: capture bottom-left corner at position 56
    3,
    180, -- 3 minutes
    'tactical',
    ARRAY['corner', 'beginner', 'capture'],
    'Look for moves that secure stable pieces.',
    'Playing at position 56 (bottom-left corner) captures the corner and creates an unflippable piece, giving Black a strong positional advantage.'
);

-- Challenge 2: Edge Control (Intermediate)
INSERT INTO daily_challenges (
    date, 
    title, 
    description, 
    difficulty_level, 
    game_mode_id,
    initial_board_state, 
    solution_moves,
    max_attempts,
    time_limit,
    category,
    tags,
    hint_text,
    explanation
) VALUES (
    '2025-07-11',
    'Edge Control Mastery',
    'Gain control of the entire top edge while maintaining your position.',
    'intermediate',
    'daily-challenge',
    '{"pieces": [".", ".", ".", ".", ".", ".", ".", ".", "B", "W", "W", "W", "W", "W", ".", ".", "B", "B", "W", "B", "B", "W", "W", ".", "B", "B", "B", "W", "B", "W", "W", ".", "B", "W", "W", "B", "B", "W", "W", ".", "B", "W", "W", "W", "B", "W", ".", ".", "B", "W", "W", "W", "W", ".", ".", ".", ".", ".", ".", ".", ".", ".", ".", "."], "nextMoves": [1, 6, 15, 47, 55], "size": 8}',
    '[1, 6]', -- Multiple solution moves
    4,
    240, -- 4 minutes
    'tactical',
    ARRAY['edge', 'intermediate', 'control'],
    'Consider moves that build along the edges.',
    'Playing along the top edge (positions 1 and 6) secures multiple stable pieces and limits opponent mobility.'
);

-- Challenge 3: Endgame Precision (Advanced)
INSERT INTO daily_challenges (
    date, 
    title, 
    description, 
    difficulty_level, 
    game_mode_id,
    initial_board_state, 
    solution_moves,
    max_attempts,
    time_limit,
    category,
    tags,
    hint_text,
    explanation
) VALUES (
    '2025-07-12',
    'Endgame Calculation',
    'With only a few moves left, find the sequence that maximizes your final score.',
    'advanced',
    'daily-challenge',
    '{"pieces": ["B", "B", "B", "B", "B", "B", "B", "B", "W", "W", "W", "B", "B", "B", "B", "B", "W", "W", "B", "B", "B", "B", "B", "B", "W", "W", "B", "B", "B", "B", "B", "B", "W", "W", "B", "B", "B", "B", "B", ".", "W", "W", "B", "B", "B", "B", ".", ".", "W", "W", "B", "B", "B", ".", ".", ".", "W", "W", "W", ".", ".", ".", ".", "."], "nextMoves": [39, 46, 47, 53, 54, 55, 60, 61, 62, 63], "size": 8}',
    '[39]', -- Critical endgame move
    2,
    300, -- 5 minutes
    'endgame',
    ARRAY['endgame', 'advanced', 'calculation'],
    'Count carefully - every remaining move matters.',
    'In endgame positions, precise calculation is essential. The move at position 39 sets up the optimal sequence for maximum points.'
);

-- Challenge 4: Expert Tactical Pattern (Expert)
INSERT INTO daily_challenges (
    date, 
    title, 
    description, 
    difficulty_level, 
    game_mode_id,
    initial_board_state, 
    solution_moves,
    max_attempts,
    time_limit,
    category,
    tags,
    hint_text,
    explanation
) VALUES (
    '2025-07-13',
    'Advanced Tactical Sequence',
    'Execute a complex tactical sequence to reverse the game situation.',
    'expert',
    'daily-challenge',
    '{"pieces": ["W", "W", "W", "W", "W", "W", "W", "W", "B", "B", "B", "W", "W", "W", "W", "W", "B", "B", "B", "B", "W", "W", "W", "W", "B", "B", "B", "B", "B", "W", "W", ".", "B", "B", "B", "B", "B", "B", ".", ".", "B", "B", "B", "B", "B", ".", ".", ".", "B", "B", "B", "B", ".", ".", ".", ".", "B", "B", ".", ".", ".", ".", ".", "."], "nextMoves": [31, 38, 39, 45, 46, 47, 52, 53, 54, 55, 59, 60, 61, 62, 63], "size": 8}',
    '[31, 38]', -- Complex sequence
    2,
    420, -- 7 minutes
    'puzzle',
    ARRAY['expert', 'tactical', 'sequence'],
    'This requires deep calculation and pattern recognition.',
    'The sequence starting with moves 31 and 38 creates a forcing combination that dramatically shifts the position in Black''s favor.'
);

-- Challenge 5: Grandmaster Level (Grandmaster)
INSERT INTO daily_challenges (
    date, 
    title, 
    description, 
    difficulty_level, 
    game_mode_id,
    initial_board_state, 
    solution_moves,
    max_attempts,
    time_limit,
    category,
    tags,
    hint_text,
    explanation
) VALUES (
    '2025-07-14',
    'Perfect Endgame Theory',
    'Find the theoretically perfect move in this complex endgame position.',
    'expert',
    'daily-challenge',
    '{"pieces": ["B", "B", "B", "B", "B", "B", "B", "W", "B", "B", "B", "B", "B", "B", "W", "W", "B", "B", "B", "B", "B", "W", "W", "W", "B", "B", "B", "B", "W", "W", "W", "W", "B", "B", "B", "W", "W", "W", "W", ".", "B", "B", "W", "W", "W", "W", ".", ".", "B", "W", "W", "W", "W", ".", ".", ".", "W", "W", "W", ".", ".", ".", ".", "."], "nextMoves": [39, 46, 47, 53, 54, 55, 60, 61, 62, 63], "size": 8}',
    '[39]', -- The only perfect move
    1,
    600, -- 10 minutes
    'theory',
    ARRAY['grandmaster', 'theory', 'perfect'],
    'Only one move leads to a theoretical win.',
    'This position represents the pinnacle of Othello theory. The move at position 39 is the only way to maintain the winning advantage through perfect play.'
);

-- Insert a few more challenges for the upcoming days
INSERT INTO daily_challenges (
    date, 
    title, 
    description, 
    difficulty_level, 
    game_mode_id,
    initial_board_state, 
    solution_moves,
    max_attempts,
    time_limit,
    category,
    tags,
    hint_text,
    explanation
) VALUES 
-- Quick tactical shot (Beginner)
(
    '2025-07-15',
    'Simple Capture',
    'Find the move that captures the most pieces.',
    'beginner',
    'daily-challenge',
    '{"pieces": [".", ".", ".", ".", ".", ".", ".", ".", ".", ".", "B", "B", "B", ".", ".", ".", ".", "B", "W", "W", "W", "B", ".", ".", ".", "B", "W", "B", "W", "B", ".", ".", ".", "B", "W", "W", "W", "B", ".", ".", ".", "B", "B", "B", ".", ".", ".", ".", ".", ".", ".", ".", ".", ".", ".", ".", ".", ".", ".", ".", ".", ".", "."], "nextMoves": [9, 15, 23, 31, 39, 47], "size": 8}',
    '[23]',
    3,
    120,
    'tactical',
    ARRAY['capture', 'beginner', 'tactics'],
    'Look for the move that flips the most pieces.',
    'Playing at position 23 captures multiple pieces in different directions, maximizing material gain.'
),
-- Opening theory (Intermediate)
(
    '2025-07-16',
    'Opening Development',
    'Navigate this opening position with proper development.',
    'intermediate',
    'daily-challenge',
    '{"pieces": [".", ".", ".", ".", ".", ".", ".", ".", ".", ".", ".", ".", ".", ".", ".", ".", ".", ".", ".", "B", ".", ".", ".", ".", ".", ".", ".", "W", "B", ".", ".", ".", ".", ".", ".", "B", "W", ".", ".", ".", ".", ".", ".", ".", ".", ".", ".", ".", ".", ".", ".", ".", ".", ".", ".", ".", ".", ".", ".", ".", ".", ".", "."], "nextMoves": [18, 21, 26, 29, 34, 37, 42, 45], "size": 8}',
    '[26, 29]',
    4,
    200,
    'opening',
    ARRAY['opening', 'development', 'intermediate'],
    'Focus on central control and development.',
    'The moves at positions 26 and 29 maintain central influence while developing position.'
);