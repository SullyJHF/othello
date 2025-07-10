import { Server, Socket } from 'socket.io';
import { SocketEvents } from '../../shared/SocketEvents';
import GameManager from '../models/GameManager';
import UserManager from '../models/UserManager';
import { emit } from './sockets';
import { TimerManager } from './timerHandlers';

export type JoinGameResponse = {
  error: string | null;
};

// Helper function to emit active games updates to a specific user
const emitActiveGamesUpdate = (io: Server, userId: string) => {
  const user = UserManager.getUserById(userId);
  if (!user) return;

  const gameIds = UserManager.getUsersGames(user);
  const gameSummaries = gameIds
    .map((gameId) => {
      const game = GameManager.getGame(gameId);
      return game ? game.getGameSummary() : null;
    })
    .filter((summary): summary is NonNullable<typeof summary> => summary !== null)
    .filter((summary) => !summary.gameFinished);

  // Emit to all sockets of this user
  const userSockets = io.sockets.sockets;
  userSockets.forEach((socket) => {
    if (socket.data?.userId === userId) {
      socket.emit(SocketEvents.MyActiveGamesUpdated, gameSummaries);
    }
  });
};

export const registerGameHandlers = (io: Server, socket: Socket): void => {
  // used when hosting a new game
  const onHostNewGame = (userId: string, userName: string, callback: (gameId: string) => void) => {
    UserManager.updateUserName(userId, userName);
    const user = UserManager.getUserById(userId);
    if (!user) {
      console.error('User not found when hosting game:', userId);
      return;
    }
    const game = GameManager.createGame();
    game.addOrUpdatePlayer(user);
    UserManager.addUserToGame(user, game);
    callback(game.id);

    // Emit active games update to the host
    emitActiveGamesUpdate(io, userId);
  };

  // used when joining a game for the first time
  const onJoinGame = (
    userId: string,
    userName: string,
    gameId: string,
    callback: (response: JoinGameResponse) => void,
  ) => {
    const game = GameManager.getGame(gameId);
    if (!game) {
      callback({ error: `Game with ID ${gameId} not found.` });
      return;
    }

    UserManager.updateUserName(userId, userName);
    const user = UserManager.getUserById(userId);
    if (!user) {
      callback({ error: 'User not found' });
      return;
    }

    const result = game.addOrUpdatePlayer(user);
    if (!result.success) {
      callback({ error: result.error || 'Failed to join game' });
      return;
    }

    UserManager.addUserToGame(user, game);
    callback({ error: null });

    // Emit active games update to the joining user
    emitActiveGamesUpdate(io, userId);
  };

  // used for after a player has actually joined, they just refresh or somehow quit and rejoin the lobby page
  // basically to give the user the initial game data when they load the page
  const onGameJoined = (userId: string, gameId: string, callback: (response: JoinGameResponse) => void) => {
    const user = UserManager.getUserById(userId);
    const game = GameManager.getGame(gameId);
    if (!game) {
      callback({ error: 'Game does not exist!' });
      return;
    }
    if (!user) {
      callback({ error: 'User not found' });
      return;
    }
    if (game.hasPlayer(user)) {
      const result = game.addOrUpdatePlayer(user);
      if (!result.success) {
        callback({ error: result.error || 'Failed to rejoin game' });
        return;
      }
      UserManager.addUserToGame(user, game);

      // Resume timer if player was disconnected and is now reconnecting
      if (game.timerState && game.gameStarted) {
        TimerManager.resumePlayerTimer(gameId, userId);
      }

      emit(SocketEvents.GameUpdated(gameId), GameManager.getGame(gameId));
      return;
    }
    console.error('This user is not part of this game!');
    callback({ error: 'User not part of this game!' });
  };

  const onGameStart = (gameId: string) => {
    const game = GameManager.getGame(gameId);
    if (!game) {
      console.error('Game not found when starting:', gameId);
      return;
    }
    game.startGame();

    // Initialize timers if the game has timer configuration
    if (game.timerState) {
      TimerManager.createGameTimers(gameId);

      // Start timer for the first player (current player)
      const firstPlayerUserId = Object.keys(game.players).find(
        (userId) => game.players[userId].piece === game.currentPlayer,
      );
      if (firstPlayerUserId) {
        TimerManager.startPlayerTimer(gameId, firstPlayerUserId);
      }
    }

    emit(SocketEvents.GameUpdated(gameId), game);
  };

  const onPiecePlaced = (gameId: string, userId: string, placeId: number) => {
    const user = UserManager.getUserById(userId);
    const game = GameManager.getGame(gameId);
    if (!user) {
      console.error('User not found when placing piece:', userId);
      return;
    }
    if (!game) {
      console.error('Game not found when placing piece:', gameId);
      return;
    }

    // Handle challenge games differently
    if (game.isChallenge) {
      const player = game.players[userId];
      if (!player || !player.piece) {
        console.error('Player not found or piece not assigned in challenge:', userId);
        return;
      }

      const result = game.evaluateChallengeMove(placeId, player.piece);

      // Always emit the updated game state for challenges
      emit(SocketEvents.GameUpdated(gameId), game);

      // Emit challenge-specific result
      socket.emit('ChallengeMovePlayed', {
        success: result.success,
        isSolution: result.isSolution,
        isPartialSolution: result.isPartialSolution,
        challengeComplete: result.challengeComplete,
        attemptsRemaining: result.attemptsRemaining,
        explanation: result.explanation,
        error: result.error,
      });

      // If challenge is complete, clean up
      if (game.gameFinished) {
        emitActiveGamesUpdate(io, userId);
      }

      return;
    }

    // Normal game logic for non-challenge games
    const result = game.placePiece(user, placeId);
    if (result.success) {
      // Handle timer logic for successful moves
      if (game.timerState) {
        // Stop current player's timer
        TimerManager.stopPlayerTimer(gameId, userId);

        // Add time increment to the player who just moved
        TimerManager.addTimeIncrement(gameId, userId);

        // Start timer for next player if game is not finished
        if (!game.gameFinished) {
          const nextPlayerUserId = Object.keys(game.players).find(
            (playerId) => game.players[playerId].piece === game.currentPlayer,
          );
          if (nextPlayerUserId) {
            TimerManager.startPlayerTimer(gameId, nextPlayerUserId);
          }
        }
      }

      // Only emit game update if the move was successful
      emit(SocketEvents.GameUpdated(gameId), game);

      // If the game finished, update active games for both players and clean up timers
      if (game.gameFinished) {
        Object.keys(game.players).forEach((playerId) => {
          emitActiveGamesUpdate(io, playerId);
        });

        // Clean up timers for finished game
        if (game.timerState) {
          TimerManager.destroyGameTimers(gameId);
        }

        // Mark game as finished in database
        const score = game.board.getScore();
        const winner = score.W > score.B ? 'W' : score.B > score.W ? 'B' : undefined;
        GameManager.markGameFinished(gameId, winner, 'normal').catch((error) => {
          console.error(`Failed to mark game ${gameId} as finished:`, error);
        });
      } else {
        // Save game state after successful move
        GameManager.saveGame(gameId).catch((error) => {
          console.error(`Failed to save game ${gameId} after move:`, error);
        });
      }
    } else {
      // Log the rejected move but don't crash or emit updates
      console.warn('Move rejected and ignored:', {
        gameId,
        userId,
        placeId,
        error: result.error,
      });
    }
  };

  const onGetMyActiveGames = (userId: string, callback: (games: any[]) => void) => {
    const user = UserManager.getUserById(userId);
    if (!user) {
      callback([]);
      return;
    }

    const gameIds = UserManager.getUsersGames(user);
    const gameSummaries = gameIds
      .map((gameId) => {
        const game = GameManager.getGame(gameId);
        return game ? game.getGameSummary() : null;
      })
      .filter((summary): summary is NonNullable<typeof summary> => summary !== null)
      .filter((summary) => !summary.gameFinished); // Only return active games

    callback(gameSummaries);
  };

  socket.on(SocketEvents.PlacePiece, onPiecePlaced);
  socket.on(SocketEvents.HostNewGame, onHostNewGame);
  socket.on(SocketEvents.JoinGame, onJoinGame);
  socket.on(SocketEvents.JoinedGame, onGameJoined);
  socket.on(SocketEvents.StartGame, onGameStart);
  socket.on(SocketEvents.GetMyActiveGames, onGetMyActiveGames);
};
