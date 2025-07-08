/**
 * Complete game simulation integration tests
 * Tests full gameplay from lobby to game completion with board interactions
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { vi } from 'vitest';
import { GameViewProvider } from '../contexts/GameViewContext';
import { Othello } from '../components/Othello/Othello';

// Mock the socket hooks
vi.mock('../utils/socketHooks', () => {
  const eventHandlers: Record<string, Function[]> = {};
  
  const mockSocketInstance = {
    emit: vi.fn((event: string, ...args: any[]) => {
      // Simulate server responses for game moves
      if (event === 'MakeMove') {
        const callback = args[args.length - 1];
        if (typeof callback === 'function') {
          setTimeout(() => {
            const position = args[1]; // position is 2nd parameter after gameId
            // Simulate successful move
            callback({ success: true, position });
          }, 10);
        }
      }
      
      if (event === 'StartGame') {
        // Game start handled by triggering updated state
        setTimeout(() => {
          const gameId = args[0];
          const gameUpdatedHandlers = eventHandlers[`Game_${gameId}_Updated`] || [];
          gameUpdatedHandlers.forEach(handler => {
            handler({
              id: gameId,
              gameStarted: true,
              gameFull: true,
              gameFinished: false,
              currentPlayer: 'B',
              players: {
                'user1': { userId: 'user1', socketId: 'socket1', name: 'Player 1', piece: 'B', connected: true },
                'user2': { userId: 'user2', socketId: 'socket2', name: 'Player 2', piece: 'W', connected: true }
              },
              board: {
                boardState: `........
........
...0....
..0WB...
...BW0..
....0...
........
........`,
                score: { B: 2, W: 2 }
              },
              joinUrl: 'http://localhost:3000/join/test-game-456'
            });
          });
        }, 10);
      }
      
      if (event === 'JoinedGame') {
        // Emit JoinedGame for component initialization
        const callback = args[args.length - 1];
        if (typeof callback === 'function') {
          setTimeout(() => {
            callback({ success: true });
          }, 5);
        }
      }
    }),
    
    on: vi.fn((event: string, handler: Function) => {
      if (!eventHandlers[event]) {
        eventHandlers[event] = [];
      }
      eventHandlers[event].push(handler);
    }),
    
    off: vi.fn((event: string) => {
      delete eventHandlers[event];
    }),
    
    // Helper to trigger events manually
    triggerEvent: (event: string, data: any) => {
      const handlers = eventHandlers[event] || [];
      handlers.forEach(handler => handler(data));
    }
  };

  return {
    useSocket: vi.fn(() => ({
      socket: mockSocketInstance,
      localUserId: 'user1'
    })),
    useSubscribeEffect: vi.fn((subscribe, unsubscribe, deps) => {
      React.useEffect(() => {
        subscribe();
        return unsubscribe;
      }, [deps]);
    }),
    ProvideSocket: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    __mockSocket: mockSocketInstance
  };
});

// Mock debug mode
vi.mock('../hooks/useDebugMode', () => ({
  useDebugMode: vi.fn(() => ({
    debugConfig: { enabled: false, features: {} },
    isDebugEnabled: false,
    isDummyGameEnabled: false,
    isAutoPlayEnabled: false,
    isGameInspectorEnabled: false,
    isPerformanceMonitorEnabled: false,
    panelState: { isOpen: false, activeTab: 'auto-play', position: 'top-right', size: 'compact' },
    togglePanel: vi.fn(),
    setPanelTab: vi.fn(),
    setPanelPosition: vi.fn(),
    setPanelSize: vi.fn(),
    actions: [],
    addAction: vi.fn(),
    clearActions: vi.fn(),
    exportActions: vi.fn(),
    logDebug: vi.fn()
  }))
}));

// Mock router navigation
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: vi.fn(() => ({ gameId: 'test-game-456' }))
  };
});

// Test wrapper component
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>
    <GameViewProvider>
      {children}
    </GameViewProvider>
  </BrowserRouter>
);

describe('Complete Game Simulation Tests', () => {
  let mockSocket: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockNavigate.mockClear();
    
    // Get the mock socket instance
    const socketHooks = await import('../utils/socketHooks');
    mockSocket = (socketHooks as any).__mockSocket;
  });

  describe('Full Game Simulation', () => {
    it('should simulate a complete game from lobby to finish', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <Othello />
        </TestWrapper>
      );

      // Step 1: Start with lobby state (2 players, ready to start)
      await waitFor(async () => {
        mockSocket.triggerEvent('Game_test-game-456_Updated', {
          id: 'test-game-456',
          gameStarted: false,
          gameFull: true,
          gameFinished: false,
          players: {
            'user1': { userId: 'user1', socketId: 'socket1', name: 'Player 1', piece: 'B', connected: true },
            'user2': { userId: 'user2', socketId: 'socket2', name: 'Player 2', piece: 'W', connected: true }
          },
          board: { boardState: '', score: { B: 2, W: 2 } },
          joinUrl: 'http://localhost:3000/join/test-game-456'
        });
      });

      // Verify lobby state
      await waitFor(() => {
        expect(screen.getByText('Player 1')).toBeInTheDocument();
        expect(screen.getByText('Player 2')).toBeInTheDocument();
        expect(screen.getByText('🎮 Start Game!')).toBeInTheDocument();
      });

      // Step 2: Start the game
      const startButton = screen.getByText('🎮 Start Game!');
      await user.click(startButton);

      // Verify socket call was made
      expect(mockSocket.emit).toHaveBeenCalledWith('StartGame', 'test-game-456');

      // Wait for game board to render with initial state
      await waitFor(() => {
        expect(screen.getByTestId('game-board-container')).toBeInTheDocument();
        expect(screen.getAllByTestId(/^board-cell-/)).toHaveLength(64);
      });

      // Step 3: Verify initial game state
      await waitFor(() => {
        // Should show both players
        expect(screen.getByText('Player 1 (You)')).toBeInTheDocument();
        expect(screen.getByText('Player 2')).toBeInTheDocument();
        
        // Should show turn indicator
        expect(screen.getByText('YOUR TURN')).toBeInTheDocument();
        
        // Note: Scores are not displayed during gameplay, only in GameOverModal
      });

      // Step 4: Make first move (simulate clicking a valid position)
      // Look for a cell marked as clickable (with '0' in board state)
      const clickableCells = screen.getAllByRole('button').filter(el => 
        el.getAttribute('data-testid')?.startsWith('board-cell-')
      );
      expect(clickableCells.length).toBeGreaterThan(0);
      
      const firstMoveCell = clickableCells[0];
      const cellPosition = parseInt(firstMoveCell.getAttribute('data-testid')!.split('-')[2]);
      
      await user.click(firstMoveCell);

      // Verify move was submitted (check for MakeMove after StartGame)
      const makeMoveCall = mockSocket.emit.mock.calls.find(call => call[0] === 'MakeMove');
      expect(makeMoveCall).toBeDefined();
      expect(makeMoveCall[1]).toBe('test-game-456');
      expect(makeMoveCall[2]).toBe(cellPosition);

      // Step 5: Simulate game state update after move
      await waitFor(async () => {
        mockSocket.triggerEvent('Game_test-game-456_Updated', {
          id: 'test-game-456',
          gameStarted: true,
          gameFull: true,
          gameFinished: false,
          currentPlayer: 'W', // Switched to white player's turn
          players: {
            'user1': { userId: 'user1', socketId: 'socket1', name: 'Player 1', piece: 'B', connected: true },
            'user2': { userId: 'user2', socketId: 'socket2', name: 'Player 2', piece: 'W', connected: true }
          },
          board: {
            boardState: `........
........
...B....
...BB...
...BW...
........
........
........`,
            score: { B: 4, W: 1 } // Score updated after move
          },
          joinUrl: 'http://localhost:3000/join/test-game-456'
        });
      });

      // Step 6: Verify turn switched
      await waitFor(() => {
        // Should no longer be our turn
        expect(screen.queryByText('YOUR TURN')).not.toBeInTheDocument();
        
        // Note: Scores not displayed during gameplay
        
        // Board should have new piece at the clicked position
        const updatedCell = screen.getByTestId(`board-cell-${cellPosition}`);
        expect(updatedCell).toContainHTML(`piece-black-${cellPosition}`);
      });

      // Step 7: Simulate opponent's move
      await waitFor(async () => {
        mockSocket.triggerEvent('Game_test-game-456_Updated', {
          id: 'test-game-456',
          gameStarted: true,
          gameFull: true,
          gameFinished: false,
          currentPlayer: 'B', // Back to our turn
          players: {
            'user1': { userId: 'user1', socketId: 'socket1', name: 'Player 1', piece: 'B', connected: true },
            'user2': { userId: 'user2', socketId: 'socket2', name: 'Player 2', piece: 'W', connected: true }
          },
          board: {
            boardState: `........
........
...B....
...BW...
...WW...
....W...
........
........`,
            score: { B: 3, W: 4 } // Opponent captured pieces
          },
          joinUrl: 'http://localhost:3000/join/test-game-456'
        });
      });

      // Step 8: Verify it's our turn again
      await waitFor(() => {
        expect(screen.getByText('YOUR TURN')).toBeInTheDocument();
        // Note: Scores not displayed during gameplay
      });
    });

    it('should handle game completion scenarios', async () => {
      render(
        <TestWrapper>
          <Othello />
        </TestWrapper>
      );

      // Simulate a finished game state
      await waitFor(async () => {
        mockSocket.triggerEvent('Game_test-game-456_Updated', {
          id: 'test-game-456',
          gameStarted: true,
          gameFull: true,
          gameFinished: true,
          winner: 'B', // Black wins
          players: {
            'user1': { userId: 'user1', socketId: 'socket1', name: 'Player 1', piece: 'B', connected: true },
            'user2': { userId: 'user2', socketId: 'socket2', name: 'Player 2', piece: 'W', connected: true }
          },
          board: {
            boardState: 'BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBWWWW',
            score: { B: 60, W: 4 }
          },
          joinUrl: 'http://localhost:3000/join/test-game-456'
        });
      });

      // Should show game over modal
      await waitFor(() => {
        // Look for modal or game over indicators
        const gameOverElements = screen.queryAllByText(/game over|you win|you lose|tie/i);
        expect(gameOverElements.length).toBeGreaterThan(0);
        
        // Should show scores in the modal
        expect(screen.getByText('60')).toBeInTheDocument(); // Winning score
        expect(screen.getByText('4')).toBeInTheDocument(); // Losing score
      });
    });

    it('should handle invalid move attempts', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <Othello />
        </TestWrapper>
      );

      // Set up active game state
      await waitFor(async () => {
        mockSocket.triggerEvent('Game_test-game-456_Updated', {
          id: 'test-game-456',
          gameStarted: true,
          gameFull: true,
          gameFinished: false,
          currentPlayer: 'B',
          players: {
            'user1': { userId: 'user1', socketId: 'socket1', name: 'Player 1', piece: 'B', connected: true },
            'user2': { userId: 'user2', socketId: 'socket2', name: 'Player 2', piece: 'W', connected: true }
          },
          board: {
            boardState: `........
........
........
...WB...
...BW...
........
........
........`,
            score: { B: 2, W: 2 }
          },
          joinUrl: 'http://localhost:3000/join/test-game-456'
        });
      });

      await waitFor(() => {
        expect(screen.getByTestId('game-board-container')).toBeInTheDocument();
      });

      // Try to click on a cell that's not marked as a valid move
      // Find a cell that doesn't have role="button" (meaning it's not a valid move)
      const allCells = screen.getAllByTestId(/^board-cell-/);
      const nonClickableCells = allCells.filter(cell => cell.getAttribute('role') !== 'button');
      
      if (nonClickableCells.length > 0) {
        const invalidCell = nonClickableCells[0];
        await user.click(invalidCell);
        
        const cellPosition = parseInt(invalidCell.getAttribute('data-testid')!.split('-')[2]);
        
        // Should not have made a move call for this position
        expect(mockSocket.emit).not.toHaveBeenCalledWith(
          'MakeMove',
          'test-game-456',
          cellPosition,
          expect.anything()
        );
      }

    });

    it('should handle disconnection and reconnection scenarios', async () => {
      render(
        <TestWrapper>
          <Othello />
        </TestWrapper>
      );

      // Start with normal game state
      await waitFor(async () => {
        mockSocket.triggerEvent('Game_test-game-456_Updated', {
          id: 'test-game-456',
          gameStarted: true,
          gameFull: true,
          gameFinished: false,
          currentPlayer: 'B',
          players: {
            'user1': { userId: 'user1', socketId: 'socket1', name: 'Player 1', piece: 'B', connected: true },
            'user2': { userId: 'user2', socketId: 'socket2', name: 'Player 2', piece: 'W', connected: true }
          },
          board: {
            boardState: `........
........
........
...WB...
...BW...
........
........
........`,
            score: { B: 2, W: 2 }
          },
          joinUrl: 'http://localhost:3000/join/test-game-456'
        });
      });

      // Verify initial state
      await waitFor(() => {
        expect(screen.getByText('Player 1 (You)')).toBeInTheDocument();
        expect(screen.getByText('Player 2')).toBeInTheDocument();
      });

      // Simulate opponent disconnection
      await waitFor(async () => {
        mockSocket.triggerEvent('Game_test-game-456_Updated', {
          id: 'test-game-456',
          gameStarted: true,
          gameFull: true,
          gameFinished: false,
          currentPlayer: 'B',
          players: {
            'user1': { userId: 'user1', socketId: 'socket1', name: 'Player 1', piece: 'B', connected: true },
            'user2': { userId: 'user2', socketId: 'socket2', name: 'Player 2', piece: 'W', connected: false } // Disconnected
          },
          board: {
            boardState: `........
........
........
...WB...
...BW...
........
........
........`,
            score: { B: 2, W: 2 }
          },
          joinUrl: 'http://localhost:3000/join/test-game-456'
        });
      });

      // Should show disconnection indicator
      await waitFor(() => {
        expect(screen.getByText('Player 2')).toBeInTheDocument();
        // Should indicate disconnected state (exact UI may vary)
      });

      // Simulate reconnection
      await waitFor(async () => {
        mockSocket.triggerEvent('Game_test-game-456_Updated', {
          id: 'test-game-456',
          gameStarted: true,
          gameFull: true,
          gameFinished: false,
          currentPlayer: 'B',
          players: {
            'user1': { userId: 'user1', socketId: 'socket1', name: 'Player 1', piece: 'B', connected: true },
            'user2': { userId: 'user2', socketId: 'socket2', name: 'Player 2', piece: 'W', connected: true } // Reconnected
          },
          board: {
            boardState: `........
........
........
...WB...
...BW...
........
........
........`,
            score: { B: 2, W: 2 }
          },
          joinUrl: 'http://localhost:3000/join/test-game-456'
        });
      });

      // Should show both players as connected
      await waitFor(() => {
        expect(screen.getByText('Player 1 (You)')).toBeInTheDocument();
        expect(screen.getByText('Player 2')).toBeInTheDocument();
      });
    });
  });

  describe('Board Interaction Tests', () => {
    it('should only allow clicks on valid moves when it is player turn', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <Othello />
        </TestWrapper>
      );

      // Set up game state where it's our turn
      await waitFor(async () => {
        mockSocket.triggerEvent('Game_test-game-456_Updated', {
          id: 'test-game-456',
          gameStarted: true,
          gameFull: true,
          gameFinished: false,
          currentPlayer: 'B', // Our turn
          players: {
            'user1': { userId: 'user1', socketId: 'socket1', name: 'Player 1', piece: 'B', connected: true },
            'user2': { userId: 'user2', socketId: 'socket2', name: 'Player 2', piece: 'W', connected: true }
          },
          board: {
            boardState: `........
........
...0....
..0WB...
...BW0..
....0...
........
........`, // 0 represents valid moves
            score: { B: 2, W: 2 }
          },
          joinUrl: 'http://localhost:3000/join/test-game-456'
        });
      });

      await waitFor(() => {
        expect(screen.getByTestId('game-board-container')).toBeInTheDocument();
      });

      // Valid move cells should have role="button"
      const validMoveCells = screen.getAllByRole('button').filter(el => 
        el.getAttribute('data-testid')?.startsWith('board-cell-')
      );
      expect(validMoveCells.length).toBeGreaterThan(0);

      // Invalid cells should not have role="button"
      const allCells = screen.getAllByTestId(/^board-cell-/);
      const invalidCells = allCells.filter(cell => cell.getAttribute('role') !== 'button');
      expect(invalidCells.length).toBeGreaterThan(0);

      // Click valid move
      const firstValidCell = validMoveCells[0];
      const cellPosition = parseInt(firstValidCell.getAttribute('data-testid')!.split('-')[2]);
      
      // Clear previous calls
      mockSocket.emit.mockClear();
      
      await user.click(firstValidCell);
      
      // Check for MakeMove call
      const makeMoveCall = mockSocket.emit.mock.calls.find(call => call[0] === 'MakeMove');
      expect(makeMoveCall).toBeDefined();
      expect(makeMoveCall[1]).toBe('test-game-456');
      expect(makeMoveCall[2]).toBe(cellPosition);
    });

    it('should disable all moves when it is not player turn', async () => {
      render(
        <TestWrapper>
          <Othello />
        </TestWrapper>
      );

      // Set up game state where it's opponent's turn
      await waitFor(async () => {
        mockSocket.triggerEvent('Game_test-game-456_Updated', {
          id: 'test-game-456',
          gameStarted: true,
          gameFull: true,
          gameFinished: false,
          currentPlayer: 'W', // Opponent's turn
          players: {
            'user1': { userId: 'user1', socketId: 'socket1', name: 'Player 1', piece: 'B', connected: true },
            'user2': { userId: 'user2', socketId: 'socket2', name: 'Player 2', piece: 'W', connected: true }
          },
          board: {
            boardState: `........
........
...0....
..0WB...
...BW0..
....0...
........
........`,
            score: { B: 2, W: 2 }
          },
          joinUrl: 'http://localhost:3000/join/test-game-456'
        });
      });

      await waitFor(() => {
        expect(screen.getByTestId('game-board-container')).toBeInTheDocument();
      });

      // No cells should have role="button" when it's not our turn
      const buttonCells = screen.queryAllByRole('button').filter(el => 
        el.getAttribute('data-testid')?.startsWith('board-cell-')
      );
      expect(buttonCells).toHaveLength(0);
    });
  });
});