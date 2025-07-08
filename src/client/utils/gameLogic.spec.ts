/**
 * Unit tests for game logic functions
 * Fast, focused tests for core game mechanics
 */

import { describe, it, expect } from 'vitest';

// Test helper to create mock player objects
const createPlayer = (userId: string, piece?: 'B' | 'W', connected = true) => ({
  userId,
  socketId: `socket-${userId}`,
  name: `Player ${userId}`,
  piece,
  connected,
});

// Test helper to create mock players object
const createPlayers = (player1: any, player2?: any) => {
  const players: Record<string, any> = {
    [player1.userId]: player1,
  };
  if (player2) {
    players[player2.userId] = player2;
  }
  return players;
};

/**
 * Tests for player derivation logic (extracted from gameEffects.ts)
 */
describe('Game Logic - Player Derivation', () => {
  describe('currentPlayerId derivation', () => {
    it('should return userId of player with matching piece', () => {
      const players = createPlayers(createPlayer('user1', 'B'), createPlayer('user2', 'W'));
      const currentPlayer = 'B';

      // Simulate the derivation logic
      const currentPlayerId = Object.keys(players).filter((userId) => players[userId]?.piece === currentPlayer)[0];

      expect(currentPlayerId).toBe('user1');
    });

    it('should return undefined when no player has matching piece', () => {
      const players = createPlayers(createPlayer('user1', 'B'), createPlayer('user2', 'W'));
      const currentPlayer = 'X' as any; // Invalid piece

      const currentPlayerId = Object.keys(players).filter((userId) => players[userId]?.piece === currentPlayer)[0];

      expect(currentPlayerId).toBeUndefined();
    });

    it('should return undefined when players have no pieces assigned', () => {
      const players = createPlayers(
        createPlayer('user1'), // No piece
        createPlayer('user2'), // No piece
      );
      const currentPlayer = 'B';

      const currentPlayerId = Object.keys(players).filter((userId) => players[userId]?.piece === currentPlayer)[0];

      expect(currentPlayerId).toBeUndefined();
    });

    it('should handle empty players object', () => {
      const players = {};
      const currentPlayer = 'B';

      const currentPlayerId = Object.keys(players).filter((userId) => players[userId]?.piece === currentPlayer)[0];

      expect(currentPlayerId).toBeUndefined();
    });
  });

  describe('black player derivation', () => {
    it('should return player object with piece B', () => {
      const players = createPlayers(createPlayer('user1', 'B'), createPlayer('user2', 'W'));

      const blackUserId = Object.keys(players).filter((userId) => players[userId]?.piece === 'B')[0];
      const black = blackUserId ? players[blackUserId] : undefined;

      expect(black).toEqual({
        userId: 'user1',
        socketId: 'socket-user1',
        name: 'Player user1',
        piece: 'B',
        connected: true,
      });
    });

    it('should return undefined when no black player exists', () => {
      const players = createPlayers(createPlayer('user1', 'W'), createPlayer('user2', 'W'));

      const blackUserId = Object.keys(players).filter((userId) => players[userId]?.piece === 'B')[0];
      const black = blackUserId ? players[blackUserId] : undefined;

      expect(black).toBeUndefined();
    });
  });

  describe('white player derivation', () => {
    it('should return player object with piece W', () => {
      const players = createPlayers(createPlayer('user1', 'B'), createPlayer('user2', 'W'));

      const whiteUserId = Object.keys(players).filter((userId) => players[userId]?.piece === 'W')[0];
      const white = whiteUserId ? players[whiteUserId] : undefined;

      expect(white).toEqual({
        userId: 'user2',
        socketId: 'socket-user2',
        name: 'Player user2',
        piece: 'W',
        connected: true,
      });
    });

    it('should return undefined when no white player exists', () => {
      const players = createPlayers(createPlayer('user1', 'B'), createPlayer('user2', 'B'));

      const whiteUserId = Object.keys(players).filter((userId) => players[userId]?.piece === 'W')[0];
      const white = whiteUserId ? players[whiteUserId] : undefined;

      expect(white).toBeUndefined();
    });
  });
});

/**
 * Tests for game state validation logic
 */
describe('Game Logic - State Validation', () => {
  describe('GameBoard render conditions', () => {
    it('should return true when all conditions are met', () => {
      const gameStarted = true;
      const localUserId = 'user1';
      const currentPlayerId = 'user1';
      const black = createPlayer('user1', 'B');
      const white = createPlayer('user2', 'W');

      // Simulate the conditional logic from Othello.tsx
      const shouldRenderGameBoard = !!(gameStarted && localUserId && currentPlayerId && black && white);

      expect(shouldRenderGameBoard).toBe(true);
    });

    it('should return false when gameStarted is false', () => {
      const gameStarted = false;
      const localUserId = 'user1';
      const currentPlayerId = 'user1';
      const black = createPlayer('user1', 'B');
      const white = createPlayer('user2', 'W');

      const shouldRenderGameBoard = !!(gameStarted && localUserId && currentPlayerId && black && white);

      expect(shouldRenderGameBoard).toBe(false);
    });

    it('should return false when localUserId is missing', () => {
      const gameStarted = true;
      const localUserId = '';
      const currentPlayerId = 'user1';
      const black = createPlayer('user1', 'B');
      const white = createPlayer('user2', 'W');

      const shouldRenderGameBoard = !!(gameStarted && localUserId && currentPlayerId && black && white);

      expect(shouldRenderGameBoard).toBe(false);
    });

    it('should return false when currentPlayerId is undefined', () => {
      const gameStarted = true;
      const localUserId = 'user1';
      const currentPlayerId = undefined;
      const black = createPlayer('user1', 'B');
      const white = createPlayer('user2', 'W');

      const shouldRenderGameBoard = !!(gameStarted && localUserId && currentPlayerId && black && white);

      expect(shouldRenderGameBoard).toBe(false);
    });

    it('should return false when black player is missing', () => {
      const gameStarted = true;
      const localUserId = 'user1';
      const currentPlayerId = 'user1';
      const black = undefined;
      const white = createPlayer('user2', 'W');

      const shouldRenderGameBoard = !!(gameStarted && localUserId && currentPlayerId && black && white);

      expect(shouldRenderGameBoard).toBe(false);
    });

    it('should return false when white player is missing', () => {
      const gameStarted = true;
      const localUserId = 'user1';
      const currentPlayerId = 'user1';
      const black = createPlayer('user1', 'B');
      const white = undefined;

      const shouldRenderGameBoard = !!(gameStarted && localUserId && currentPlayerId && black && white);

      expect(shouldRenderGameBoard).toBe(false);
    });
  });
});

/**
 * Tests for board state parsing and validation
 */
describe('Game Logic - Board State', () => {
  describe('board state validation', () => {
    it('should handle valid board state with pieces and moves', () => {
      const boardState = `........
........
...0....
..0WB...
...BW0..
....0...
........
........`;

      // Test board state parsing (simplified version)
      const lines = boardState.split('\n');
      const cells = lines.flatMap((line) => line.split(''));

      expect(cells).toHaveLength(64);
      expect(cells.filter((cell) => cell === 'B')).toHaveLength(2);
      expect(cells.filter((cell) => cell === 'W')).toHaveLength(2);
      expect(cells.filter((cell) => cell === '0')).toHaveLength(4); // Valid moves
      expect(cells.filter((cell) => cell === '.')).toHaveLength(56); // Empty
    });

    it('should handle empty board state', () => {
      const boardState = '';
      const lines = boardState.split('\n');

      expect(lines).toEqual(['']);
    });

    it('should handle malformed board state gracefully', () => {
      const boardState = 'invalid';
      const lines = boardState.split('\n');
      const cells = lines.flatMap((line) => line.split(''));

      expect(cells).toEqual(['i', 'n', 'v', 'a', 'l', 'i', 'd']);
    });
  });

  describe('move validation', () => {
    it('should identify valid moves from board state', () => {
      const boardState = `........
........
...0....
..0WB...
...BW0..
....0...
........
........`;

      const lines = boardState.split('\n');
      const cells = lines.flatMap((line) => line.split(''));

      // Find positions of valid moves ('0')
      const validMovePositions = cells
        .map((cell, index) => ({ cell, index }))
        .filter(({ cell }) => cell === '0')
        .map(({ index }) => index);

      expect(validMovePositions).toEqual([19, 26, 37, 44]); // Expected positions
    });

    it('should return empty array when no valid moves exist', () => {
      const boardState = `BBBBBBBB
BBBBBBBB
BBBBBBBB
BBBBBBBB
WWWWWWWW
WWWWWWWW
WWWWWWWW
WWWWWWWW`;

      const lines = boardState.split('\n');
      const cells = lines.flatMap((line) => line.split(''));

      const validMovePositions = cells
        .map((cell, index) => ({ cell, index }))
        .filter(({ cell }) => cell === '0')
        .map(({ index }) => index);

      expect(validMovePositions).toEqual([]);
    });
  });
});

/**
 * Tests for score calculations
 */
describe('Game Logic - Score Calculations', () => {
  it('should count pieces correctly from board state', () => {
    const boardState = `BBBBBBBB
BBBBBBBB
BBWWWWBB
BBWWWWBB
BBWWWWBB
BBWWWWBB
BBBBBBBB
BBBBBBBB`;

    const lines = boardState.split('\n');
    const cells = lines.flatMap((line) => line.split(''));

    const blackCount = cells.filter((cell) => cell === 'B').length;
    const whiteCount = cells.filter((cell) => cell === 'W').length;

    expect(blackCount).toBe(48);
    expect(whiteCount).toBe(16);
  });

  it('should handle empty board', () => {
    const boardState = '................................................................';

    const cells = boardState.split('');
    const blackCount = cells.filter((cell) => cell === 'B').length;
    const whiteCount = cells.filter((cell) => cell === 'W').length;

    expect(blackCount).toBe(0);
    expect(whiteCount).toBe(0);
  });

  it('should ignore invalid characters in score calculation', () => {
    const boardState = 'BBWW0123xyz.';

    const cells = boardState.split('');
    const blackCount = cells.filter((cell) => cell === 'B').length;
    const whiteCount = cells.filter((cell) => cell === 'W').length;

    expect(blackCount).toBe(2);
    expect(whiteCount).toBe(2);
  });
});
