import { Board } from '../../models/Board';
import { Piece } from '../AIEngine';
import { MinimaxStrategy } from './MinimaxStrategy';

describe('MinimaxStrategy', () => {
  let strategy: MinimaxStrategy;

  beforeEach(() => {
    strategy = new MinimaxStrategy();
  });

  describe('getName', () => {
    it('should return "minimax"', () => {
      expect(strategy.getName()).toBe('minimax');
    });
  });

  describe('evaluatePosition', () => {
    it('should evaluate initial board position', () => {
      const board = new Board();
      const whiteEval = strategy.evaluatePosition(board, 'W');
      const blackEval = strategy.evaluatePosition(board, 'B');

      // Initial position should be roughly equal
      expect(Math.abs(whiteEval - blackEval)).toBeLessThan(100);
    });

    it('should favor player with corner control', () => {
      const boardWithCorner = `W.......
........
........
...WB...
...BW...
........
........
........`;

      const board = new Board(boardWithCorner);
      const whiteEval = strategy.evaluatePosition(board, 'W');
      const blackEval = strategy.evaluatePosition(board, 'B');

      // White has corner, should be favored
      expect(whiteEval).toBeGreaterThan(blackEval);
    });
  });

  describe('getBestMove', () => {
    it('should return a valid move for initial position', async () => {
      const board = new Board();
      board.updateNextMoves('B'); // Set valid moves for black

      const result = await strategy.getBestMove(board, 'B', 2, 1000);

      expect(result.move).toBeGreaterThanOrEqual(0);
      expect(result.move).toBeLessThanOrEqual(63);
      expect(result.strategy).toBe('minimax');
      expect(result.searchDepth).toBeGreaterThanOrEqual(0);
      expect(result.timeElapsed).toBeGreaterThan(0);
      expect(result.nodesSearched).toBeGreaterThan(0);
    });

    it('should handle single valid move efficiently', async () => {
      // Create a board with only one valid move
      const boardWithOneMove = `WWWWWWWW
WWWWWWWW
WWWWWWWW
WWWWBWWW
WWWBW0WW
WWWWWWWW
WWWWWWWW
WWWWWWWW`;

      const board = new Board(boardWithOneMove);
      const result = await strategy.getBestMove(board, 'B', 4, 1000);

      expect(result.searchDepth).toBe(0); // Should be optimized for single move
      expect(result.nodesSearched).toBe(1);
    });

    it('should throw error when no valid moves available', async () => {
      // Create a board with no valid moves for black
      const boardNoMoves = `WWWWWWWW
WWWWWWWW
WWWWWWWW
WWWWWWWW
WWWWWWWW
WWWWWWWW
WWWWWWWW
WWWWWWWW`;

      const board = new Board(boardNoMoves);

      await expect(strategy.getBestMove(board, 'B', 2, 1000)).rejects.toThrow('No valid moves available');
    });

    it('should respect time limits', async () => {
      const board = new Board();
      board.updateNextMoves('B');

      const startTime = Date.now();
      const result = await strategy.getBestMove(board, 'B', 6, 50); // Very short time limit
      const elapsed = Date.now() - startTime;

      expect(elapsed).toBeLessThan(200); // Should timeout quickly
      expect(result.timeElapsed).toBeLessThanOrEqual(100); // Should be close to limit
    });

    it('should perform deeper search with more time', async () => {
      const board = new Board();
      board.updateNextMoves('B');

      const resultShallow = await strategy.getBestMove(board, 'B', 2, 100);
      const resultDeep = await strategy.getBestMove(board, 'B', 4, 2000);

      expect(resultDeep.searchDepth).toBeGreaterThanOrEqual(resultShallow.searchDepth);
      expect(resultDeep.nodesSearched).toBeGreaterThan(resultShallow.nodesSearched);
    });

    it('should prefer corner moves when available', async () => {
      // Create a position where corner is available
      const boardWithCornerMove = `........
.BBBBBBB
.BWWWWWB
.BWWWWWB
.BWWWWWB
.BWWWWWB
.BBBBBBB
0.......`;

      const board = new Board(boardWithCornerMove);
      const result = await strategy.getBestMove(board, 'W', 3, 1000);

      // Should prefer a corner move (0 or 7 are corners in top row)
      expect([0, 7, 56, 63]).toContain(result.move);
    });

    it('should handle endgame positions correctly', async () => {
      // Create a simple endgame position where Black can move
      const endgameBoard = `........
........
........
...WB...
...BW...
........
........
........`;

      const board = new Board(endgameBoard);
      board.updateNextMoves('W'); // Set valid moves for Black
      const result = await strategy.getBestMove(board, 'B', 5, 1000);

      expect(result.move).toBeGreaterThanOrEqual(0);
      expect(result.move).toBeLessThanOrEqual(63);
    });
  });

  describe('minimax algorithm behavior', () => {
    it('should make consistent moves for same position', async () => {
      const board = new Board();
      board.updateNextMoves('B');

      const result1 = await strategy.getBestMove(board, 'B', 3, 1000);
      const result2 = await strategy.getBestMove(board, 'B', 3, 1000);

      // Same position and depth should give same move (no randomness in base minimax)
      expect(result1.move).toBe(result2.move);
    });

    it('should explore more nodes with increased depth', async () => {
      const board = new Board();
      board.updateNextMoves('B');

      const resultDepth2 = await strategy.getBestMove(board, 'B', 2, 2000);
      const resultDepth3 = await strategy.getBestMove(board, 'B', 3, 2000);

      expect(resultDepth3.nodesSearched).toBeGreaterThan(resultDepth2.nodesSearched);
    });

    it('should handle alternating player turns correctly', async () => {
      // Position where optimal play involves considering opponent responses
      const tacticalBoard = `........
........
...BB...
..BWWB..
..BWWB..
...BB...
........
........`;

      const board = new Board(tacticalBoard);
      board.updateNextMoves('W');

      const result = await strategy.getBestMove(board, 'W', 4, 2000);

      expect(result.move).toBeGreaterThanOrEqual(0);
      expect(result.searchDepth).toBeGreaterThan(0);
    });
  });

  describe('performance characteristics', () => {
    it('should complete shallow search quickly', async () => {
      const board = new Board();
      board.updateNextMoves('B');

      const startTime = Date.now();
      await strategy.getBestMove(board, 'B', 2, 5000);
      const elapsed = Date.now() - startTime;

      expect(elapsed).toBeLessThan(1000); // Should be fast for depth 2
    });

    it('should use iterative deepening effectively', async () => {
      const board = new Board();
      board.updateNextMoves('B');

      const result = await strategy.getBestMove(board, 'B', 5, 500);

      // Should complete at least some depth even with limited time
      expect(result.searchDepth).toBeGreaterThan(0);
      expect(result.timeElapsed).toBeLessThanOrEqual(600); // Allow some tolerance
    });
  });

  describe('edge cases', () => {
    it('should handle board with many empty squares', async () => {
      const sparseBoard = `........
........
........
...WB...
...BW...
........
........
........`;

      const board = new Board(sparseBoard);
      board.updateNextMoves('B');

      const result = await strategy.getBestMove(board, 'B', 3, 1000);

      expect(result.move).toBeGreaterThanOrEqual(0);
      expect(result.move).toBeLessThanOrEqual(63);
    });

    it('should handle board with few empty squares', async () => {
      const densBoard = `WWWWWWWW
WBBBBBBB
WBWWWWWB
WBWWWWWB
WBWWWWWB
WBWWWWWB
WBBBBBBB
W..WB..W`;

      const board = new Board(densBoard);
      board.updateNextMoves('W'); // Set valid moves for Black

      const result = await strategy.getBestMove(board, 'B', 4, 1000);

      expect(result.move).toBeGreaterThanOrEqual(0);
      expect(result.move).toBeLessThanOrEqual(63);
    });
  });
});
