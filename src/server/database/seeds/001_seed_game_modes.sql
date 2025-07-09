-- Seed: Initial game modes
-- This seed file populates the game modes table with initial game mode templates

-- Insert timer-based game modes
INSERT INTO game_modes (id, name, description, category, config, is_active, is_default, minimum_players, maximum_players, estimated_duration, difficulty_level, tags) VALUES
('bullet-1-1', 'Bullet 1+1', 'Fast-paced bullet game with 1 minute + 1 second increment', 'timer', '{"timer": {"type": "increment", "initialTime": 60, "increment": 1, "delay": 0, "maxTime": 180, "lowTimeWarning": 10, "criticalTimeWarning": 5, "autoFlagOnTimeout": true, "pauseOnDisconnect": false, "maxPauseTime": 0}, "ui": {"theme": "blitz", "showTimer": true, "showMoveHistory": false, "showEvaluation": false}}', true, false, 2, 2, 5, 'advanced', '{"bullet", "timer", "fast"}'),

('blitz-3-2', 'Blitz 3+2', 'Blitz game with 3 minutes + 2 second increment', 'timer', '{"timer": {"type": "increment", "initialTime": 180, "increment": 2, "delay": 0, "maxTime": 300, "lowTimeWarning": 30, "criticalTimeWarning": 10, "autoFlagOnTimeout": true, "pauseOnDisconnect": true, "maxPauseTime": 60}, "ui": {"theme": "blitz", "showTimer": true, "showMoveHistory": true, "showEvaluation": false}}', true, true, 2, 2, 10, 'intermediate', '{"blitz", "timer", "popular"}'),

('rapid-10-5', 'Rapid 10+5', 'Rapid game with 10 minutes + 5 second increment', 'timer', '{"timer": {"type": "increment", "initialTime": 600, "increment": 5, "delay": 0, "maxTime": 900, "lowTimeWarning": 60, "criticalTimeWarning": 30, "autoFlagOnTimeout": true, "pauseOnDisconnect": true, "maxPauseTime": 300}, "ui": {"theme": "default", "showTimer": true, "showMoveHistory": true, "showEvaluation": true}}', true, false, 2, 2, 20, 'intermediate', '{"rapid", "timer", "standard"}'),

('classical-30-30', 'Classical 30+30', 'Classical game with 30 minutes + 30 second increment', 'timer', '{"timer": {"type": "increment", "initialTime": 1800, "increment": 30, "delay": 0, "maxTime": 3600, "lowTimeWarning": 300, "criticalTimeWarning": 60, "autoFlagOnTimeout": true, "pauseOnDisconnect": true, "maxPauseTime": 600}, "ui": {"theme": "classical", "showTimer": true, "showMoveHistory": true, "showEvaluation": true}}', true, false, 2, 2, 60, 'advanced', '{"classical", "timer", "long"}');

-- Insert board variant game modes
INSERT INTO game_modes (id, name, description, category, config, is_active, is_default, minimum_players, maximum_players, estimated_duration, difficulty_level, tags) VALUES
('mini-board-6x6', 'Mini Board 6x6', 'Compact Othello on a 6x6 board', 'board-variant', '{"board": {"width": 6, "height": 6, "startingPosition": "......\n......\n..0...\n..WB..\n..BW..\n...0..\n......\n......", "validSizes": [6], "customRules": []}, "ui": {"theme": "default", "showTimer": false, "showMoveHistory": true, "showEvaluation": false}}', true, false, 2, 2, 10, 'beginner', '{"mini", "board-variant", "quick"}'),

('large-board-10x10', 'Large Board 10x10', 'Extended Othello on a 10x10 board', 'board-variant', '{"board": {"width": 10, "height": 10, "startingPosition": "..........\n..........\n..........\n..........\n....0.....\n...0WB....\n....BW0...\n.....0....\n..........\n..........", "validSizes": [10], "customRules": []}, "ui": {"theme": "default", "showTimer": false, "showMoveHistory": true, "showEvaluation": false}}', true, false, 2, 2, 30, 'intermediate', '{"large", "board-variant", "extended"}');

-- Insert daily challenge mode template
INSERT INTO game_modes (id, name, description, category, config, is_active, is_default, minimum_players, maximum_players, estimated_duration, difficulty_level, tags) VALUES
('daily-challenge', 'Daily Challenge', 'Daily tactical puzzle with limited attempts', 'daily-challenge', '{"challenge": {"type": "tactical", "difficulty": 3, "maxAttempts": 3, "timeLimit": 300, "hints": [], "solution": {"moves": [], "explanation": ""}, "tags": ["daily", "tactical"]}, "ui": {"theme": "puzzle", "showTimer": true, "showMoveHistory": true, "showEvaluation": false}}', true, false, 2, 2, 5, 'intermediate', '{"daily", "challenge", "puzzle"}');

-- Insert unlimited time mode (classic no-timer game)
INSERT INTO game_modes (id, name, description, category, config, is_active, is_default, minimum_players, maximum_players, estimated_duration, difficulty_level, tags) VALUES
('unlimited', 'Unlimited Time', 'Classic Othello with no time restrictions', 'timer', '{"timer": {"type": "unlimited", "initialTime": 0, "increment": 0, "delay": 0, "maxTime": 0, "lowTimeWarning": 0, "criticalTimeWarning": 0, "autoFlagOnTimeout": false, "pauseOnDisconnect": false, "maxPauseTime": 0}, "ui": {"theme": "default", "showTimer": false, "showMoveHistory": true, "showEvaluation": true}}', true, false, 2, 2, 20, 'beginner', '{"unlimited", "casual", "no-timer"}');