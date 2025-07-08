/**
 * Unit tests for Lobby component
 * Tests game lobby functionality, player display, and game start logic
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { Player } from '../../../../server/models/Game';
import { Lobby } from './Lobby';

// Mock CopyTextButton component
vi.mock('../../CopyTextButton/CopyTextButton', () => ({
  CopyTextButton: ({ text }: { text: string }) => (
    <div data-testid="copy-text-button">
      <span data-testid="copy-text">{text}</span>
      <button data-testid="copy-button">Copy</button>
    </div>
  ),
}));

// Mock LobbyPlayers component
vi.mock('./LobbyPlayers', () => ({
  LobbyPlayers: ({ players }: { players: { [userId: string]: Player } }) => (
    <div data-testid="lobby-players">
      <h2>Players:</h2>
      {Object.keys(players).map((userId) => {
        const player = players[userId];
        return player ? (
          <div key={userId} data-testid={`player-${userId}`}>
            <span>{player.name}</span>
            <span data-testid={`connected-${userId}`}>{player.connected ? 'Connected' : 'Disconnected'}</span>
          </div>
        ) : null;
      })}
    </div>
  ),
}));

describe('Lobby Component', () => {
  const createPlayer = (userId: string, name: string, connected = true): Player => ({
    userId,
    socketId: `socket-${userId}`,
    name,
    piece: userId === 'player1' ? 'B' : 'W',
    connected,
  });

  const defaultProps = {
    joinUrl: 'http://localhost:3000/join/ABC123',
    players: {},
    gameFull: false,
    onStartGameClicked: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render lobby with correct structure', () => {
      render(<Lobby {...defaultProps} />);

      expect(screen.getByRole('heading', { name: 'Game Lobby' })).toBeInTheDocument();
      expect(screen.getByText('Share this link to invite a friend:')).toBeInTheDocument();
      expect(screen.getByTestId('copy-text-button')).toBeInTheDocument();
      expect(screen.getByTestId('lobby-players')).toBeInTheDocument();
    });

    it('should have correct ID and CSS structure', () => {
      render(<Lobby {...defaultProps} />);

      expect(document.querySelector('#lobby')).toBeInTheDocument();
      expect(document.querySelector('.lobby-header')).toBeInTheDocument();
      expect(document.querySelector('.lobby-title')).toBeInTheDocument();
      expect(document.querySelector('.lobby-subtitle')).toBeInTheDocument();
      expect(document.querySelector('.join-url-section')).toBeInTheDocument();
    });
  });

  describe('Dynamic Subtitle Text', () => {
    it('should show "Waiting for players to join..." when no players', () => {
      render(<Lobby {...defaultProps} players={{}} />);

      expect(screen.getByText('Waiting for players to join...')).toBeInTheDocument();
    });

    it('should show "Waiting for one more player..." when 1 player', () => {
      const players = {
        player1: createPlayer('player1', 'Player 1'),
      };

      render(<Lobby {...defaultProps} players={players} />);

      expect(screen.getByText('Waiting for one more player...')).toBeInTheDocument();
    });

    it('should show "Ready to start!" when game is full with 2 players', () => {
      const players = {
        player1: createPlayer('player1', 'Player 1'),
        player2: createPlayer('player2', 'Player 2'),
      };

      render(<Lobby {...defaultProps} players={players} gameFull={true} />);

      expect(screen.getByText('Ready to start!')).toBeInTheDocument();
    });

    it('should not show ready text when 2 players but game not marked as full', () => {
      const players = {
        player1: createPlayer('player1', 'Player 1'),
        player2: createPlayer('player2', 'Player 2'),
      };

      render(<Lobby {...defaultProps} players={players} gameFull={false} />);

      expect(screen.queryByText('Ready to start!')).not.toBeInTheDocument();
    });
  });

  describe('Join URL and Copy Functionality', () => {
    it('should display the correct join URL', () => {
      const joinUrl = 'https://othello.example.com/join/XYZ789';

      render(<Lobby {...defaultProps} joinUrl={joinUrl} />);

      expect(screen.getByTestId('copy-text')).toHaveTextContent(joinUrl);
    });

    it('should render CopyTextButton with correct text prop', () => {
      const joinUrl = 'http://localhost:3000/join/TEST123';

      render(<Lobby {...defaultProps} joinUrl={joinUrl} />);

      const copyTextButton = screen.getByTestId('copy-text-button');
      expect(copyTextButton).toBeInTheDocument();
      expect(screen.getByTestId('copy-text')).toHaveTextContent(joinUrl);
    });

    it('should handle long URLs correctly', () => {
      const longUrl = 'https://very-long-domain-name.example.com/join/VERYLONGGAMEID123456';

      render(<Lobby {...defaultProps} joinUrl={longUrl} />);

      expect(screen.getByTestId('copy-text')).toHaveTextContent(longUrl);
    });
  });

  describe('Player Display', () => {
    it('should render LobbyPlayers component with correct props', () => {
      const players = {
        player1: createPlayer('player1', 'Alice'),
        player2: createPlayer('player2', 'Bob'),
      };

      render(<Lobby {...defaultProps} players={players} />);

      expect(screen.getByTestId('lobby-players')).toBeInTheDocument();
      expect(screen.getByTestId('player-player1')).toBeInTheDocument();
      expect(screen.getByTestId('player-player2')).toBeInTheDocument();
      expect(screen.getByText('Alice')).toBeInTheDocument();
      expect(screen.getByText('Bob')).toBeInTheDocument();
    });

    it('should show connection status for players', () => {
      const players = {
        player1: createPlayer('player1', 'Connected Player', true),
        player2: createPlayer('player2', 'Disconnected Player', false),
      };

      render(<Lobby {...defaultProps} players={players} />);

      expect(screen.getByTestId('connected-player1')).toHaveTextContent('Connected');
      expect(screen.getByTestId('connected-player2')).toHaveTextContent('Disconnected');
    });

    it('should handle empty players object', () => {
      render(<Lobby {...defaultProps} players={{}} />);

      const lobbyPlayers = screen.getByTestId('lobby-players');
      expect(lobbyPlayers).toBeInTheDocument();

      // Should not have any player elements
      expect(screen.queryByTestId(/^player-/)).not.toBeInTheDocument();
    });
  });

  describe('Start Game Button', () => {
    it('should show start game button when game is full', () => {
      const players = {
        player1: createPlayer('player1', 'Player 1'),
        player2: createPlayer('player2', 'Player 2'),
      };

      render(<Lobby {...defaultProps} players={players} gameFull={true} />);

      const startButton = screen.getByRole('button', { name: /start game/i });
      expect(startButton).toBeInTheDocument();
      expect(startButton).toHaveTextContent('🎮 Start Game!');
    });

    it('should not show start game button when game is not full', () => {
      const players = {
        player1: createPlayer('player1', 'Player 1'),
      };

      render(<Lobby {...defaultProps} players={players} gameFull={false} />);

      expect(screen.queryByRole('button', { name: /start game/i })).not.toBeInTheDocument();
    });

    it('should call onStartGameClicked when start button is clicked', async () => {
      const user = userEvent.setup();
      const mockOnStartGameClicked = vi.fn();

      const players = {
        player1: createPlayer('player1', 'Player 1'),
        player2: createPlayer('player2', 'Player 2'),
      };

      render(<Lobby {...defaultProps} players={players} gameFull={true} onStartGameClicked={mockOnStartGameClicked} />);

      const startButton = screen.getByRole('button', { name: /start game/i });
      await user.click(startButton);

      expect(mockOnStartGameClicked).toHaveBeenCalledTimes(1);
    });

    it('should have correct CSS classes for start button', () => {
      const players = {
        player1: createPlayer('player1', 'Player 1'),
        player2: createPlayer('player2', 'Player 2'),
      };

      render(<Lobby {...defaultProps} players={players} gameFull={true} />);

      const startButton = screen.getByRole('button', { name: /start game/i });
      expect(startButton).toHaveClass('start-button', 'link');

      const buttonWrapper = document.querySelector('.button-wrapper');
      expect(buttonWrapper).toBeInTheDocument();
    });
  });

  describe('Player Count Logic', () => {
    it('should calculate player count correctly', () => {
      const testCases = [
        { players: {}, expectedCount: 0 },
        { players: { p1: createPlayer('p1', 'One') }, expectedCount: 1 },
        { players: { p1: createPlayer('p1', 'One'), p2: createPlayer('p2', 'Two') }, expectedCount: 2 },
      ];

      testCases.forEach(({ players, expectedCount }) => {
        const { unmount } = render(<Lobby {...defaultProps} players={players} />);

        const expectedTexts = [
          'Waiting for players to join...',
          'Waiting for one more player...',
          // Note: 2 players doesn't automatically show "Ready to start!" unless gameFull is true
        ];

        if (expectedCount < expectedTexts.length) {
          expect(screen.getByText(expectedTexts[expectedCount])).toBeInTheDocument();
        }

        unmount();
      });
    });

    it('should handle more than 2 players gracefully', () => {
      const players = {
        player1: createPlayer('player1', 'Player 1'),
        player2: createPlayer('player2', 'Player 2'),
        player3: createPlayer('player3', 'Player 3'),
      };

      render(<Lobby {...defaultProps} players={players} />);

      // Should not show any of the waiting messages when player count > 2
      expect(screen.queryByText('Waiting for players to join...')).not.toBeInTheDocument();
      expect(screen.queryByText('Waiting for one more player...')).not.toBeInTheDocument();
      expect(screen.queryByText('Ready to start!')).not.toBeInTheDocument();
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle null/undefined players gracefully', () => {
      const playersWithNull = {
        player1: createPlayer('player1', 'Valid Player'),
        player2: null as any,
        player3: undefined as any,
      };

      expect(() => {
        render(<Lobby {...defaultProps} players={playersWithNull} />);
      }).not.toThrow();

      // Should still render the valid player
      expect(screen.getByText('Valid Player')).toBeInTheDocument();
    });

    it('should handle empty join URL', () => {
      render(<Lobby {...defaultProps} joinUrl="" />);

      expect(screen.getByTestId('copy-text')).toHaveTextContent('');
    });

    it('should handle special characters in join URL', () => {
      const specialUrl = 'https://example.com/join/ABC-123_xyz?param=value&other=test';

      render(<Lobby {...defaultProps} joinUrl={specialUrl} />);

      expect(screen.getByTestId('copy-text')).toHaveTextContent(specialUrl);
    });

    it('should handle players with missing names', () => {
      const playersWithMissingNames = {
        player1: { ...createPlayer('player1', ''), name: undefined as any },
        player2: createPlayer('player2', 'Valid Name'),
      };

      expect(() => {
        render(<Lobby {...defaultProps} players={playersWithMissingNames} />);
      }).not.toThrow();
    });
  });

  describe('Interaction and State Changes', () => {
    it('should update when players prop changes', () => {
      const initialPlayers = {
        player1: createPlayer('player1', 'Initial Player'),
      };

      const { rerender } = render(<Lobby {...defaultProps} players={initialPlayers} />);

      expect(screen.getByText('Waiting for one more player...')).toBeInTheDocument();
      expect(screen.getByText('Initial Player')).toBeInTheDocument();

      // Add second player
      const updatedPlayers = {
        ...initialPlayers,
        player2: createPlayer('player2', 'Second Player'),
      };

      rerender(<Lobby {...defaultProps} players={updatedPlayers} gameFull={true} />);

      expect(screen.getByText('Ready to start!')).toBeInTheDocument();
      expect(screen.getByText('Second Player')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /start game/i })).toBeInTheDocument();
    });

    it('should handle rapid prop changes', () => {
      const { rerender } = render(<Lobby {...defaultProps} />);

      // Rapidly change between different states
      for (let i = 0; i < 5; i++) {
        const players =
          i % 2 === 0
            ? { player1: createPlayer('player1', `Player ${i}`) }
            : {
                player1: createPlayer('player1', `Player ${i}A`),
                player2: createPlayer('player2', `Player ${i}B`),
              };

        rerender(<Lobby {...defaultProps} players={players} gameFull={Object.keys(players).length === 2} />);
      }

      // Final state should have 1 player (since i=4, 4%2===0)
      expect(screen.getByText('Waiting for one more player...')).toBeInTheDocument();
      expect(screen.getByText('Player 4')).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('should render efficiently', () => {
      const startTime = performance.now();

      const players = {
        player1: createPlayer('player1', 'Player 1'),
        player2: createPlayer('player2', 'Player 2'),
      };

      render(<Lobby {...defaultProps} players={players} gameFull={true} />);

      const endTime = performance.now();
      expect(endTime - startTime).toBeLessThan(50); // Should render quickly
    });
  });
});
