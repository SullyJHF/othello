/**
 * Tests for PlayerComponent with turn indicators and animations
 */

import { render, screen } from '@testing-library/react';
import React from 'react';
import { vi } from 'vitest';
import { PlayerComponent, RawPiece } from './Players';

// Mock the GamePiece component
vi.mock('../GamePiece/GamePiece', () => ({
  GamePiece: ({ color, size, className }: { color: string; size: string; className?: string }) => (
    <div data-testid={`game-piece-${color}`} data-size={size} className={className}>
      {color} piece
    </div>
  ),
}));

// Mock the ConnectedPip component
vi.mock('./ConnectedPip', () => ({
  ConnectedPip: ({ connected }: { connected: boolean }) => (
    <div data-testid="connected-pip" data-connected={connected}>
      {connected ? 'Connected' : 'Disconnected'}
    </div>
  ),
}));

describe('PlayerComponent', () => {
  const mockPlayer = {
    userId: 'player1',
    name: 'Test Player',
    connected: true,
  };

  const defaultProps = {
    player: mockPlayer,
    piece: 'B' as const,
    isLocalUser: false,
    isCurrentPlayer: false,
  };

  it('should render player information correctly', () => {
    render(<PlayerComponent {...defaultProps} />);

    expect(screen.getByText('Test Player')).toBeInTheDocument();
    expect(screen.getByTestId('game-piece-black')).toBeInTheDocument();
    expect(screen.getByTestId('connected-pip')).toBeInTheDocument();
  });

  it('should show "(You)" suffix for local user', () => {
    render(<PlayerComponent {...defaultProps} isLocalUser={true} />);

    expect(screen.getByText('Test Player (You)')).toBeInTheDocument();
  });

  it('should render white piece for white player', () => {
    render(<PlayerComponent {...defaultProps} piece="W" />);

    expect(screen.getByTestId('game-piece-white')).toBeInTheDocument();
  });

  it('should apply top class when top prop is true', () => {
    const { container } = render(<PlayerComponent {...defaultProps} top={true} />);

    const playerElement = container.querySelector('.player');
    expect(playerElement).toHaveClass('top');
  });

  it('should apply bottom class when top prop is false', () => {
    const { container } = render(<PlayerComponent {...defaultProps} top={false} />);

    const playerElement = container.querySelector('.player');
    expect(playerElement).toHaveClass('bottom');
  });

  describe('Turn Indicators', () => {
    it('should apply turn class when it is current player', () => {
      const { container } = render(<PlayerComponent {...defaultProps} isCurrentPlayer={true} />);

      const playerElement = container.querySelector('.player');
      expect(playerElement).toHaveClass('turn');
    });

    it('should not apply turn class when it is not current player', () => {
      const { container } = render(<PlayerComponent {...defaultProps} isCurrentPlayer={false} />);

      const playerElement = container.querySelector('.player');
      expect(playerElement).not.toHaveClass('turn');
    });

    it('should show "YOUR TURN" badge for current local user', () => {
      render(<PlayerComponent {...defaultProps} isCurrentPlayer={true} isLocalUser={true} />);

      expect(screen.getByText('YOUR TURN')).toBeInTheDocument();
    });

    it('should not show "YOUR TURN" badge for current non-local user', () => {
      render(<PlayerComponent {...defaultProps} isCurrentPlayer={true} isLocalUser={false} />);

      expect(screen.queryByText('YOUR TURN')).not.toBeInTheDocument();
    });

    it('should not show "YOUR TURN" badge for non-current local user', () => {
      render(<PlayerComponent {...defaultProps} isCurrentPlayer={false} isLocalUser={true} />);

      expect(screen.queryByText('YOUR TURN')).not.toBeInTheDocument();
    });

    it('should apply active-player class to game piece when current player', () => {
      render(<PlayerComponent {...defaultProps} isCurrentPlayer={true} />);

      const gamePiece = screen.getByTestId('game-piece-black');
      expect(gamePiece).toHaveClass('active-player');
    });

    it('should not apply active-player class when not current player', () => {
      render(<PlayerComponent {...defaultProps} isCurrentPlayer={false} />);

      const gamePiece = screen.getByTestId('game-piece-black');
      expect(gamePiece).not.toHaveClass('active-player');
    });
  });

  describe('Layout Structure', () => {
    it('should have proper component structure', () => {
      const { container } = render(<PlayerComponent {...defaultProps} />);

      // Check main structure
      const playerElement = container.querySelector('.player');
      expect(playerElement).toBeInTheDocument();

      const playerMain = container.querySelector('.player-main');
      expect(playerMain).toBeInTheDocument();

      const playerInfo = container.querySelector('.player-info');
      expect(playerInfo).toBeInTheDocument();

      const nameElement = container.querySelector('.name');
      expect(nameElement).toBeInTheDocument();
    });

    it('should position connection indicator on the right', () => {
      const { container } = render(<PlayerComponent {...defaultProps} />);

      const playerElement = container.querySelector('.player');
      const connectedPip = screen.getByTestId('connected-pip');

      // The connected pip should be a direct child of player element
      expect(playerElement).toContainElement(connectedPip);
    });

    it('should handle turn badge structure correctly', () => {
      const { container } = render(<PlayerComponent {...defaultProps} isCurrentPlayer={true} isLocalUser={true} />);

      const turnBadge = container.querySelector('.turn-badge');
      expect(turnBadge).toBeInTheDocument();
      expect(turnBadge).toHaveTextContent('YOUR TURN');

      // Turn badge should be inside player-info
      const playerInfo = container.querySelector('.player-info');
      expect(playerInfo).toContainElement(turnBadge);
    });
  });

  describe('Edge Cases', () => {
    it('should handle null player gracefully', () => {
      render(<PlayerComponent {...defaultProps} player={null} />);

      expect(screen.getByText('Unknown Player')).toBeInTheDocument();
    });

    it('should handle undefined player gracefully', () => {
      render(<PlayerComponent {...defaultProps} player={undefined} />);

      expect(screen.getByText('Unknown Player')).toBeInTheDocument();
    });

    it('should handle player without name', () => {
      const playerWithoutName = { ...mockPlayer, name: undefined };
      const { container } = render(<PlayerComponent {...defaultProps} player={playerWithoutName} />);

      // When player.name is undefined, the name div will be empty
      const nameElement = container.querySelector('.name');
      expect(nameElement).toBeInTheDocument();
      expect(nameElement).toBeEmptyDOMElement();
    });

    it('should handle disconnected player', () => {
      const disconnectedPlayer = { ...mockPlayer, connected: false };
      render(<PlayerComponent {...defaultProps} player={disconnectedPlayer} />);

      const connectedPip = screen.getByTestId('connected-pip');
      expect(connectedPip).toHaveAttribute('data-connected', 'false');
    });
  });

  describe('Long Player Names', () => {
    it('should handle very long player names', () => {
      const longNamePlayer = {
        ...mockPlayer,
        name: 'This is a very long player name that should be truncated with ellipsis',
      };

      const { container } = render(<PlayerComponent {...defaultProps} player={longNamePlayer} />);

      const nameElement = container.querySelector('.name');
      expect(nameElement).toHaveStyle('text-overflow: ellipsis');
      expect(nameElement).toHaveStyle('overflow: hidden');
      expect(nameElement).toHaveStyle('white-space: nowrap');
    });
  });
});

describe('RawPiece', () => {
  it('should render black piece correctly', () => {
    render(<RawPiece piece="B" />);

    const gamePiece = screen.getByTestId('game-piece-black');
    expect(gamePiece).toBeInTheDocument();
    expect(gamePiece).toHaveAttribute('data-size', 'large');
  });

  it('should render white piece correctly', () => {
    render(<RawPiece piece="W" />);

    const gamePiece = screen.getByTestId('game-piece-white');
    expect(gamePiece).toBeInTheDocument();
    expect(gamePiece).toHaveAttribute('data-size', 'large');
  });
});

describe('Player Component CSS Classes and Animations', () => {
  const mockPlayer = {
    userId: 'player1',
    name: 'Test Player',
    connected: true,
  };

  const testProps = {
    player: mockPlayer,
    piece: 'B' as const,
    isLocalUser: false,
    isCurrentPlayer: false,
  };

  it('should have correct CSS classes for styling validation', () => {
    const { container } = render(
      <PlayerComponent {...testProps} isCurrentPlayer={true} isLocalUser={true} top={true} />,
    );

    const playerElement = container.querySelector('.player');
    expect(playerElement).toHaveClass('player');
    expect(playerElement).toHaveClass('top');
    expect(playerElement).toHaveClass('turn');

    const turnBadge = container.querySelector('.turn-badge');
    expect(turnBadge).toHaveClass('turn-badge');

    const playerInfo = container.querySelector('.player-info');
    expect(playerInfo).toHaveClass('player-info');

    const nameElement = container.querySelector('.name');
    expect(nameElement).toHaveClass('name');
  });

  it('should ensure turn badge has proper attributes for animations', () => {
    const { container } = render(<PlayerComponent {...testProps} isCurrentPlayer={true} isLocalUser={true} />);

    const turnBadge = container.querySelector('.turn-badge');
    expect(turnBadge).toBeInTheDocument();

    // Check that the badge has the expected text content for animation
    expect(turnBadge).toHaveTextContent('YOUR TURN');

    // Verify the element exists for CSS animations to target
    expect(turnBadge?.tagName).toBe('DIV');
  });
});
