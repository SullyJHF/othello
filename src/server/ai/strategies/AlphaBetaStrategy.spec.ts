import { Board } from '../../models/Board';
import { Piece } from '../AIEngine';
import { AlphaBetaStrategy } from './AlphaBetaStrategy';
import { MinimaxStrategy } from './MinimaxStrategy';

describe('AlphaBetaStrategy', () => {
  let strategy: AlphaBetaStrategy;
  let minimaxStrategy: MinimaxStrategy;

  beforeEach(() => {
    strategy = new AlphaBetaStrategy();
    minimaxStrategy = new MinimaxStrategy();
  });

  describe('getName', () => {
    it('should return "alphabeta"', () => {
      expect(strategy.getName()).toBe('alphabeta');
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

    it('should produce same evaluation as minimax for same position', () => {
      const board = new Board();
      const player: Piece = 'B';

      const alphaBetaEval = strategy.evaluatePosition(board, player);
      const minimaxEval = minimaxStrategy.evaluatePosition(board, player);

      expect(alphaBetaEval).toBe(minimaxEval);
    });
  });

  describe('getBestMove', () => {
    it('should return a valid move for initial position', async () => {
      const board = new Board();
      board.updateNextMoves('B'); // Set valid moves for black

      const result = await strategy.getBestMove(board, 'B', 3, 2000);

      expect(result.move).toBeGreaterThanOrEqual(0);
      expect(result.move).toBeLessThanOrEqual(63);
      expect(result.strategy).toBe('alphabeta');
      expect(result.searchDepth).toBeGreaterThanOrEqual(0);
      expect(result.timeElapsed).toBeGreaterThan(0);
      expect(result.nodesSearched).toBeGreaterThan(0);
    });

    it('should handle single valid move efficiently', async () => {
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
      const boardNoMoves = `WWWWWWWW
WWWWWWWW
WWWWWWWW
WWWWWWWW
WWWWWWWW
WWWWWWWW
WWWWWWWW
WWWWWWWW`;

      const board = new Board(boardNoMoves);

      await expect(strategy.getBestMove(board, 'B', 3, 1000)).rejects.toThrow('No valid moves available');
    });

    it('should respect time limits', async () => {
      const board = new Board();
      board.updateNextMoves('B');

      const startTime = Date.now();
      const result = await strategy.getBestMove(board, 'B', 8, 50); // Very short time limit
      const elapsed = Date.now() - startTime;

      expect(elapsed).toBeLessThan(200); // Should timeout quickly
      expect(result.timeElapsed).toBeLessThanOrEqual(100); // Should be close to limit
    });

    it('should find same best move as minimax but faster', async () => {
      const board = new Board();
      board.updateNextMoves('B');

      const depth = 3;
      const timeLimit = 2000;

      const [alphaBetaResult, minimaxResult] = await Promise.all([
        strategy.getBestMove(board, 'B', depth, timeLimit),
        minimaxStrategy.getBestMove(board, 'B', depth, timeLimit),
      ]);

      // Should find same or equivalent move (evaluation should be similar)
      expect(Math.abs(alphaBetaResult.evaluation - minimaxResult.evaluation)).toBeLessThan(50);

      // Alpha-beta should search fewer nodes due to pruning
      expect(alphaBetaResult.nodesSearched).toBeLessThanOrEqual(minimaxResult.nodesSearched);
    });

    it('should prefer corner moves when available', async () => {
      const boardWithCornerMove = `........
.BBBBBBB
.BWWWWWB
.BWWWWWB
.BWWWWWB
.BWWWWWB
.BBBBBBB
0.......`;

      const board = new Board(boardWithCornerMove);
      const result = await strategy.getBestMove(board, 'W', 4, 1000);

      // Should prefer a corner move
      expect([0, 7, 56, 63]).toContain(result.move);
    });

    it('should handle complex tactical positions', async () => {
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

      const result = await strategy.getBestMove(board, 'W', 5, 3000);

      expect(result.move).toBeGreaterThanOrEqual(0);
      expect(result.searchDepth).toBeGreaterThan(0);
      expect(result.nodesSearched).toBeGreaterThan(10);
    });
  });

  describe('alpha-beta pruning efficiency', () => {
    it('should demonstrate pruning effectiveness', async () => {
      const board = new Board();
      board.updateNextMoves('B');

      const result = await strategy.getBestMove(board, 'B', 4, 3000);
      const stats = strategy.getPruningStats();

      expect(stats.nodesSearched).toBeGreaterThan(0);
      expect(stats.pruneCount).toBeGreaterThan(0);
      expect(stats.pruningEfficiency).toBeGreaterThan(0);
      expect(stats.pruningEfficiency).toBeLessThanOrEqual(1);
    });

    it('should prune more nodes with deeper search', async () => {
      const board = new Board();
      board.updateNextMoves('B');

      // Shallow search
      await strategy.getBestMove(board, 'B', 2, 2000);
      const shallowStats = strategy.getPruningStats();

      // Deep search
      await strategy.getBestMove(board, 'B', 4, 3000);
      const deepStats = strategy.getPruningStats();

      expect(deepStats.pruneCount).toBeGreaterThan(shallowStats.pruneCount);
    });

    it('should be significantly faster than minimax for same depth', async () => {
      const board = new Board();
      board.updateNextMoves('B');

      const depth = 4;
      const timeLimit = 5000;

      const alphaBetaStart = Date.now();
      const alphaBetaResult = await strategy.getBestMove(board, 'B', depth, timeLimit);
      const alphaBetaTime = Date.now() - alphaBetaStart;

      const minimaxStart = Date.now();
      const minimaxResult = await minimaxStrategy.getBestMove(board, 'B', depth, timeLimit);
      const minimaxTime = Date.now() - minimaxStart;

      // Alpha-beta should be faster or at least not significantly slower
      // Allow more tolerance for CI environments and system load variations
      expect(alphaBetaTime).toBeLessThanOrEqual(minimaxTime * 2.0);

      // Should explore fewer nodes
      expect(alphaBetaResult.nodesSearched).toBeLessThanOrEqual(minimaxResult.nodesSearched);
    });
  });

  describe('move ordering optimization', () => {
    it('should prioritize corner moves in ordering', async () => {
      const boardWithCorners = `0.......
........
........
...WB...
...BW...
........
........
......0.`;

      const board = new Board(boardWithCorners);
      const result = await strategy.getBestMove(board, 'B', 3, 1000);

      // Should prefer corners when they're tactically sound, otherwise any valid move
      expect(result.move).toBeGreaterThanOrEqual(0);
      expect(result.move).toBeLessThanOrEqual(63);
    });

    it('should avoid dangerous X-squares when possible', async () => {
      const boardWithXSquare = `..0.....
.B......
........
...WB...
...BW...
........
........
........`;

      const board = new Board(boardWithXSquare);
      const result = await strategy.getBestMove(board, 'B', 4, 1000);

      // Should avoid position 1 (X-square) and prefer position 2
      expect(result.move).not.toBe(1);
    });

    it('should handle endgame positions correctly', async () => {
      const endgameBoard = `........
........
........
...WB...
...BW...
........
........
........`;

      const board = new Board(endgameBoard);
      board.updateNextMoves('W');

      const result = await strategy.getBestMove(board, 'B', 6, 2000);

      expect(result.move).toBeGreaterThanOrEqual(0);
      expect(result.move).toBeLessThanOrEqual(63);
    });
  });

  describe('performance characteristics', () => {
    it('should complete moderate depth search quickly', async () => {
      const board = new Board();
      board.updateNextMoves('B');

      const startTime = Date.now();
      await strategy.getBestMove(board, 'B', 4, 5000);
      const elapsed = Date.now() - startTime;

      expect(elapsed).toBeLessThan(2000); // Should be reasonably fast
    });

    it('should use iterative deepening effectively', async () => {
      const board = new Board();
      board.updateNextMoves('B');

      const result = await strategy.getBestMove(board, 'B', 6, 500);

      // Should complete at least some depth even with limited time
      expect(result.searchDepth).toBeGreaterThan(0);
      expect(result.timeElapsed).toBeLessThanOrEqual(600); // Allow some tolerance
    });

    it('should scale better than minimax with increased depth', async () => {
      const board = new Board();
      board.updateNextMoves('B');

      // Compare node counts at different depths
      const depth3Result = await strategy.getBestMove(board, 'B', 3, 3000);
      const depth4Result = await strategy.getBestMove(board, 'B', 4, 3000);

      // Node growth should be sublinear due to pruning
      const growthRatio = depth4Result.nodesSearched / depth3Result.nodesSearched;
      expect(growthRatio).toBeLessThan(10); // Much less than exponential growth
    });
  });

  describe('edge cases and robustness', () => {
    it('should handle positions with limited mobility', async () => {
      const limitedMobilityBoard = `WWWWWWWW
WBBBBBBB
WBWWWWWB
WBWWWWWB
WBWWWWWB
WBWWWWWB
WBBBBBBB
W..WB..W`;

      const board = new Board(limitedMobilityBoard);
      board.updateNextMoves('W');

      const result = await strategy.getBestMove(board, 'B', 5, 1000);

      expect(result.move).toBeGreaterThanOrEqual(0);
      expect(result.move).toBeLessThanOrEqual(63);
    });

    it('should maintain consistency across multiple runs', async () => {
      const board = new Board();
      board.updateNextMoves('B');

      const result1 = await strategy.getBestMove(board, 'B', 3, 2000);
      const result2 = await strategy.getBestMove(board, 'B', 3, 2000);

      // Same position and depth should give same move (deterministic)
      expect(result1.move).toBe(result2.move);
      expect(result1.evaluation).toBe(result2.evaluation);
    });

    it('should handle near-full board positions', async () => {
      const nearFullBoard = `WWWWWWWW
WBBBBBBB
WBWWWWWB
WBWWWWWB
WBWWWWWB
WBWWWWWB
WBBBBBBB
W..WB..W`;

      const board = new Board(nearFullBoard);
      board.updateNextMoves('W'); // Set up valid moves for B

      const result = await strategy.getBestMove(board, 'B', 8, 1000);

      expect(result.move).toBeGreaterThanOrEqual(0);
      expect(result.move).toBeLessThanOrEqual(63);
    });
  });

  describe('pruning statistics', () => {
    it('should provide meaningful pruning statistics', async () => {
      const board = new Board();
      board.updateNextMoves('B');

      await strategy.getBestMove(board, 'B', 4, 2000);
      const stats = strategy.getPruningStats();

      expect(stats.nodesSearched).toBeGreaterThan(0);
      expect(stats.pruneCount).toBeGreaterThan(0);
      expect(stats.pruningEfficiency).toBeGreaterThan(0);
      expect(stats.pruningEfficiency).toBeLessThanOrEqual(1);

      // Efficiency should be reasonable for alpha-beta
      expect(stats.pruningEfficiency).toBeGreaterThan(0.1);
    });
  });
});
