/**
 * Unit tests for GameOverModal component
 * Tests game completion modal display and winner determination logic
 */

import { render, screen } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { Player } from '../../../server/models/Game';
import { GameOverModal } from './GameOverModal';

// Mock GameActionButtons component
vi.mock('../GameActionButtons/GameActionButtons', () => ({
  GameActionButtons: ({ variant, showBackToMenu, showDebugOptions }: any) => (
    <div data-testid="game-action-buttons">
      <span>variant: {variant}</span>
      <span>showBackToMenu: {showBackToMenu.toString()}</span>
      <span>showDebugOptions: {showDebugOptions.toString()}</span>
    </div>
  ),
}));

// Mock RawPiece component
vi.mock('../Players/Players', () => ({
  RawPiece: ({ piece }: { piece: string }) => <span data-testid={`piece-${piece}`}>{piece === 'B' ? '⚫' : '⚪'}</span>,
}));

describe('GameOverModal Component', () => {
  const createPlayer = (userId: string, name: string, piece: 'B' | 'W'): Player => ({
    userId,
    socketId: `socket-${userId}`,
    name,
    piece,
    connected: true,
  });

  const defaultProps = {
    gameFinished: true,
    score: { B: 32, W: 32 },
    black: createPlayer('player1', 'Player 1', 'B'),
    white: createPlayer('player2', 'Player 2', 'W'),
    localUserId: 'player1',
  };

  describe('Conditional Rendering', () => {
    it('should not render when game is not finished', () => {
      render(<GameOverModal {...defaultProps} gameFinished={false} />);

      // Should not render any modal content
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(screen.queryByText(/win|lose|tie/i)).not.toBeInTheDocument();
    });

    it('should render when game is finished', () => {
      render(<GameOverModal {...defaultProps} />);

      // Should render modal structure
      expect(screen.getByText(/win|lose|tie/i)).toBeInTheDocument();
      expect(screen.getByTestId('game-action-buttons')).toBeInTheDocument();
    });
  });

  describe('Winner Determination Logic', () => {
    it('should display "You win!" when local user wins with black pieces', () => {
      render(
        <GameOverModal
          {...defaultProps}
          score={{ B: 35, W: 29 }}
          localUserId="player1" // Black player
        />,
      );

      expect(screen.getByText('You win!')).toBeInTheDocument();
    });

    it('should display "You win!" when local user wins with white pieces', () => {
      render(
        <GameOverModal
          {...defaultProps}
          score={{ B: 28, W: 36 }}
          localUserId="player2" // White player
        />,
      );

      expect(screen.getByText('You win!')).toBeInTheDocument();
    });

    it('should display "You lose..." when local user loses with black pieces', () => {
      render(
        <GameOverModal
          {...defaultProps}
          score={{ B: 25, W: 39 }}
          localUserId="player1" // Black player lost
        />,
      );

      expect(screen.getByText('You lose...')).toBeInTheDocument();
    });

    it('should display "You lose..." when local user loses with white pieces', () => {
      render(
        <GameOverModal
          {...defaultProps}
          score={{ B: 40, W: 24 }}
          localUserId="player2" // White player lost
        />,
      );

      expect(screen.getByText('You lose...')).toBeInTheDocument();
    });

    it('should display "It\'s a tie!" when scores are equal', () => {
      render(<GameOverModal {...defaultProps} score={{ B: 32, W: 32 }} localUserId="player1" />);

      expect(screen.getByText("It's a tie!")).toBeInTheDocument();
    });
  });

  describe('Score Display', () => {
    it('should display correct black and white scores', () => {
      render(<GameOverModal {...defaultProps} score={{ B: 45, W: 19 }} />);

      // Should show both scores
      expect(screen.getByText('45')).toBeInTheDocument();
      expect(screen.getByText('19')).toBeInTheDocument();

      // Should display piece indicators
      expect(screen.getByTestId('piece-B')).toBeInTheDocument();
      expect(screen.getByTestId('piece-W')).toBeInTheDocument();
    });

    it('should display scores with correct piece colors', () => {
      render(<GameOverModal {...defaultProps} />);

      const blackPiece = screen.getByTestId('piece-B');
      const whitePiece = screen.getByTestId('piece-W');

      expect(blackPiece).toHaveTextContent('⚫');
      expect(whitePiece).toHaveTextContent('⚪');
    });

    it('should handle edge case scores', () => {
      // Test minimum scores
      render(<GameOverModal {...defaultProps} score={{ B: 0, W: 64 }} />);

      expect(screen.getByText('0')).toBeInTheDocument();
      expect(screen.getByText('64')).toBeInTheDocument();
      expect(screen.getByText('You lose...')).toBeInTheDocument();
    });
  });

  describe('Modal Structure and Components', () => {
    it('should render modal with correct structure', () => {
      render(<GameOverModal {...defaultProps} />);

      // Should have overlay and modal structure
      const overlay = document.querySelector('.overlay');
      const modal = document.querySelector('.modal');
      const modalInner = document.querySelector('.modal-inner');

      expect(overlay).toBeInTheDocument();
      expect(modal).toBeInTheDocument();
      expect(modalInner).toBeInTheDocument();
    });

    it('should render GameActionButtons with correct props', () => {
      render(<GameOverModal {...defaultProps} />);

      const actionButtons = screen.getByTestId('game-action-buttons');
      expect(actionButtons).toBeInTheDocument();

      // Check that correct props are passed
      expect(actionButtons).toHaveTextContent('variant: modal');
      expect(actionButtons).toHaveTextContent('showBackToMenu: true');
      expect(actionButtons).toHaveTextContent('showDebugOptions: true');
    });

    it('should have correct CSS classes', () => {
      render(<GameOverModal {...defaultProps} />);

      // Check for CSS classes that would be used for styling
      expect(document.querySelector('.overlay')).toBeInTheDocument();
      expect(document.querySelector('.modal.card')).toBeInTheDocument();
      expect(document.querySelector('.modal-inner')).toBeInTheDocument();
      expect(document.querySelector('.score-wrapper')).toBeInTheDocument();
      expect(document.querySelector('.links')).toBeInTheDocument();
    });
  });

  describe('Different Game Scenarios', () => {
    it('should handle close game (1 point difference)', () => {
      render(
        <GameOverModal
          {...defaultProps}
          score={{ B: 32, W: 31 }}
          localUserId="player1" // Black player wins by 1
        />,
      );

      expect(screen.getByText('You win!')).toBeInTheDocument();
      expect(screen.getByText('32')).toBeInTheDocument();
      expect(screen.getByText('31')).toBeInTheDocument();
    });

    it('should handle blowout game (large score difference)', () => {
      render(
        <GameOverModal
          {...defaultProps}
          score={{ B: 55, W: 9 }}
          localUserId="player2" // White player loses badly
        />,
      );

      expect(screen.getByText('You lose...')).toBeInTheDocument();
      expect(screen.getByText('55')).toBeInTheDocument();
      expect(screen.getByText('9')).toBeInTheDocument();
    });

    it('should handle spectator scenario (user not in game)', () => {
      render(
        <GameOverModal
          {...defaultProps}
          score={{ B: 35, W: 29 }}
          localUserId="spectator" // Not player1 or player2
        />,
      );

      // When user is not a player, they should see "You lose..." (fallback)
      expect(screen.getByText('You lose...')).toBeInTheDocument();
    });
  });

  describe('Props Validation and Edge Cases', () => {
    it('should handle missing or invalid player data gracefully', () => {
      const invalidProps = {
        ...defaultProps,
        black: { ...defaultProps.black, userId: '' },
        white: { ...defaultProps.white, userId: '' },
      };

      expect(() => {
        render(<GameOverModal {...invalidProps} />);
      }).not.toThrow();

      // Should still render something
      expect(screen.getByText(/win|lose|tie/i)).toBeInTheDocument();
    });

    it('should handle extreme scores', () => {
      render(
        <GameOverModal
          {...defaultProps}
          score={{ B: 64, W: 0 }} // Perfect game
          localUserId="player1"
        />,
      );

      expect(screen.getByText('You win!')).toBeInTheDocument();
      expect(screen.getByText('64')).toBeInTheDocument();
      expect(screen.getByText('0')).toBeInTheDocument();
    });

    it('should handle negative scores (edge case)', () => {
      render(
        <GameOverModal
          {...defaultProps}
          score={{ B: -1, W: 65 }} // Invalid but should not crash
          localUserId="player1"
        />,
      );

      expect(screen.getByText('You lose...')).toBeInTheDocument();
    });
  });

  describe('Accessibility and User Experience', () => {
    it('should provide clear win/lose messaging', () => {
      // Test all possible outcomes are clear
      const scenarios = [
        { score: { B: 35, W: 29 }, userId: 'player1', expected: 'You win!' },
        { score: { B: 29, W: 35 }, userId: 'player1', expected: 'You lose...' },
        { score: { B: 32, W: 32 }, userId: 'player1', expected: "It's a tie!" },
      ];

      scenarios.forEach(({ score, userId, expected }) => {
        const { unmount } = render(<GameOverModal {...defaultProps} score={score} localUserId={userId} />);

        expect(screen.getByText(expected)).toBeInTheDocument();
        unmount();
      });
    });

    it('should display scores prominently', () => {
      render(<GameOverModal {...defaultProps} score={{ B: 42, W: 22 }} />);

      // Scores should be displayed with their corresponding pieces
      const blackScore = screen.getByText('42');
      const whiteScore = screen.getByText('22');

      expect(blackScore).toBeInTheDocument();
      expect(whiteScore).toBeInTheDocument();

      // Should have visual piece indicators
      expect(screen.getByTestId('piece-B')).toBeInTheDocument();
      expect(screen.getByTestId('piece-W')).toBeInTheDocument();
    });
  });

  describe('Performance and Rendering', () => {
    it('should render efficiently', () => {
      const startTime = performance.now();

      render(<GameOverModal {...defaultProps} />);

      const endTime = performance.now();
      expect(endTime - startTime).toBeLessThan(50); // Should render quickly
    });

    it('should handle rapid prop changes', () => {
      const { rerender } = render(<GameOverModal {...defaultProps} />);

      // Rapidly change scores
      for (let i = 0; i < 10; i++) {
        rerender(<GameOverModal {...defaultProps} score={{ B: 30 + i, W: 34 - i }} />);
      }

      // Should still display final state correctly
      expect(screen.getByText('39')).toBeInTheDocument();
      expect(screen.getByText('25')).toBeInTheDocument();
      expect(screen.getByText('You win!')).toBeInTheDocument();
    });
  });
});
