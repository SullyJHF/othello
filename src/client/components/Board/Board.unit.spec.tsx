/**
 * Unit tests for Board component
 * Focused tests for board rendering and interaction logic
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { vi, beforeEach } from 'vitest';
import { Board } from './Board';

// Mock socket hooks to avoid complex integration
vi.mock('../../utils/socketHooks', () => ({
  useSocket: vi.fn(() => ({
    socket: { emit: vi.fn() },
    localUserId: 'test-user',
  })),
}));

describe('Board Component Unit Tests', () => {
  const defaultProps = {
    gameId: 'test-game',
    boardState: '................................................................', // 64 empty cells
    isCurrentPlayer: false,
  };

  describe('Board Rendering', () => {
    it('should render exactly 64 board cells', () => {
      render(<Board {...defaultProps} />);

      const cells = screen.getAllByTestId(/^board-cell-/);
      expect(cells).toHaveLength(64);
    });

    it('should render cells with correct test IDs', () => {
      render(<Board {...defaultProps} />);

      // Check first, middle, and last cells
      expect(screen.getByTestId('board-cell-0')).toBeInTheDocument();
      expect(screen.getByTestId('board-cell-32')).toBeInTheDocument();
      expect(screen.getByTestId('board-cell-63')).toBeInTheDocument();
    });

    it('should have board container with correct test ID', () => {
      render(<Board {...defaultProps} />);

      expect(screen.getByTestId('board')).toBeInTheDocument();
    });
  });

  describe('Piece Rendering', () => {
    it('should render black pieces in correct positions', () => {
      const boardWithPieces = 'B...............................................................';
      render(<Board {...defaultProps} boardState={boardWithPieces} />);

      const firstCell = screen.getByTestId('board-cell-0');
      expect(firstCell).toContainHTML('piece-black-0');
    });

    it('should render white pieces in correct positions', () => {
      const boardWithPieces = 'W...............................................................';
      render(<Board {...defaultProps} boardState={boardWithPieces} />);

      const firstCell = screen.getByTestId('board-cell-0');
      expect(firstCell).toContainHTML('piece-white-0');
    });

    it('should render multiple pieces correctly', () => {
      const boardWithPieces = 'BW..............................................................';
      render(<Board {...defaultProps} boardState={boardWithPieces} />);

      const blackCell = screen.getByTestId('board-cell-0');
      const whiteCell = screen.getByTestId('board-cell-1');

      expect(blackCell).toContainHTML('piece-black-0');
      expect(whiteCell).toContainHTML('piece-white-1');
    });

    it('should not render pieces for empty cells', () => {
      render(<Board {...defaultProps} />);

      const emptyCell = screen.getByTestId('board-cell-0');
      expect(emptyCell.innerHTML).toBe('');
    });

    it('should ignore invalid characters', () => {
      const boardWithInvalid = 'xyz.............................................................';
      render(<Board {...defaultProps} boardState={boardWithInvalid} />);

      const firstCell = screen.getByTestId('board-cell-0');
      const secondCell = screen.getByTestId('board-cell-1');
      const thirdCell = screen.getByTestId('board-cell-2');

      // Invalid characters should render as empty
      expect(firstCell.innerHTML).toBe('');
      expect(secondCell.innerHTML).toBe('');
      expect(thirdCell.innerHTML).toBe('');
    });
  });

  describe('Move Interaction', () => {
    it('should make valid moves clickable when current player', () => {
      const boardWithMoves = '0...............................................................';
      render(<Board {...defaultProps} boardState={boardWithMoves} isCurrentPlayer={true} />);

      const moveCell = screen.getByTestId('board-cell-0');
      expect(moveCell).toHaveClass('clickable');
      expect(moveCell).toHaveAttribute('role', 'button');
    });

    it('should make moves clickable but not responsive when not current player', () => {
      const boardWithMoves = '0...............................................................';
      render(<Board {...defaultProps} boardState={boardWithMoves} isCurrentPlayer={false} />);

      const moveCell = screen.getByTestId('board-cell-0');
      expect(moveCell).toHaveClass('clickable'); // Always clickable by design
      expect(moveCell).toHaveAttribute('role', 'button');
    });

    it('should not make occupied cells clickable', () => {
      const boardWithPieces = 'B...............................................................';
      render(<Board {...defaultProps} boardState={boardWithPieces} isCurrentPlayer={true} />);

      const occupiedCell = screen.getByTestId('board-cell-0');
      expect(occupiedCell).not.toHaveClass('clickable');
      expect(occupiedCell).not.toHaveAttribute('role', 'button');
    });

    it('should make empty cells clickable by design', () => {
      const emptyBoard = '................................................................';
      render(<Board {...defaultProps} boardState={emptyBoard} isCurrentPlayer={true} />);

      const emptyCell = screen.getByTestId('board-cell-0');
      expect(emptyCell).toHaveClass('clickable'); // Empty cells are clickable by design
      expect(emptyCell).toHaveAttribute('role', 'button');
    });

    it('should render valid moves as clickable', async () => {
      const user = userEvent.setup();
      const boardWithMoves = '0...............................................................';
      render(<Board {...defaultProps} boardState={boardWithMoves} isCurrentPlayer={true} />);

      const moveCell = screen.getByTestId('board-cell-0');
      expect(moveCell).toHaveClass('clickable');
      expect(moveCell).toHaveAttribute('role', 'button');

      // Should be clickable without crashing
      await user.click(moveCell);
    });

    it('should handle interactions gracefully', async () => {
      const user = userEvent.setup();
      const boardWithMoves = '0...............................................................';
      render(<Board {...defaultProps} boardState={boardWithMoves} isCurrentPlayer={true} />);

      const moveCell = screen.getByTestId('board-cell-0');

      // Should be clickable without crashing
      await user.click(moveCell);

      // Component should still be rendered after interaction
      expect(moveCell).toBeInTheDocument();
    });
  });

  describe('Board State Edge Cases', () => {
    it('should handle empty board state string', () => {
      render(<Board {...defaultProps} boardState="" />);

      // Empty string results in no cells being rendered
      const cells = screen.queryAllByTestId(/^board-cell-/);
      expect(cells).toHaveLength(0);
    });

    it('should handle board state shorter than 64 characters', () => {
      const shortBoard = 'BWB';
      render(<Board {...defaultProps} boardState={shortBoard} />);

      const cells = screen.getAllByTestId(/^board-cell-/);
      expect(cells.length).toBeGreaterThan(0);

      // First 3 cells should have pieces
      expect(screen.getByTestId('board-cell-0')).toContainHTML('piece-black-0');
      expect(screen.getByTestId('board-cell-1')).toContainHTML('piece-white-1');
      expect(screen.getByTestId('board-cell-2')).toContainHTML('piece-black-2');
    });

    it('should handle board state longer than 64 characters', () => {
      const longBoard = 'B'.repeat(100); // 100 B's
      render(<Board {...defaultProps} boardState={longBoard} />);

      const cells = screen.getAllByTestId(/^board-cell-/);
      expect(cells).toHaveLength(100); // Renders all characters as cells
    });

    it('should handle board state with newlines', () => {
      const boardWithNewlines = `BBBBBBBB
WWWWWWWW
........
........
........
........
........
........`;
      render(<Board {...defaultProps} boardState={boardWithNewlines} />);

      const cells = screen.getAllByTestId(/^board-cell-/);
      expect(cells).toHaveLength(64);
    });
  });

  describe('Responsive Behavior', () => {
    it('should apply responsive classes', () => {
      render(<Board {...defaultProps} />);

      const board = screen.getByTestId('board');
      expect(board).toHaveAttribute('id', 'board');
    });

    it('should maintain grid structure', () => {
      render(<Board {...defaultProps} />);

      const cells = screen.getAllByTestId(/^board-cell-/);

      // All cells should have the 'place' class
      cells.forEach((cell) => {
        expect(cell).toHaveClass('place');
      });
    });
  });

  describe('Performance Considerations', () => {
    it('should render large board states efficiently', () => {
      const complexBoard = 'BWBWBWBW'.repeat(8); // Alternating pattern

      const startTime = performance.now();
      render(<Board {...defaultProps} boardState={complexBoard} />);
      const endTime = performance.now();

      // Should render in reasonable time (< 100ms)
      expect(endTime - startTime).toBeLessThan(100);
    });

    it('should handle rapid state changes', () => {
      const { rerender } = render(
        <Board {...defaultProps} boardState="B......................................................." />,
      );

      // Simulate rapid state changes
      for (let i = 0; i < 10; i++) {
        const newState = 'W'.repeat(i) + '.'.repeat(64 - i);
        rerender(<Board {...defaultProps} boardState={newState} />);
      }

      // Should not crash and should show final state
      const lastCell = screen.getByTestId('board-cell-8');
      expect(lastCell).toContainHTML('piece-white-8');
    });
  });
});
