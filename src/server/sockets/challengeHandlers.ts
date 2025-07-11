import { Socket } from 'socket.io';
import { SocketEvents } from '../../shared/SocketEvents';
import { Game } from '../models/Game';
import GameManager from '../models/GameManager';
import UserManager from '../models/UserManager';
import { databaseDailyChallengeService } from '../services/DatabaseDailyChallengeService';
import { emit } from './sockets';

type CallbackFunction = (response: any) => void;

export const setupChallengeHandlers = (socket: Socket) => {
  // Get today's daily challenge
  socket.on(SocketEvents.GetDailyChallenge, async (callback: CallbackFunction) => {
    try {
      const userId = socket.data.userId;
      if (!userId) {
        callback({
          success: false,
          error: 'User not authenticated',
        });
        return;
      }

      const challenge = await databaseDailyChallengeService.getTodaysChallenge();
      console.log('Challenge retrieved:', challenge ? `${challenge.title} (ID: ${challenge.id})` : 'NULL');

      const hasCompleted = await databaseDailyChallengeService.hasUserCompletedToday(userId);
      const remainingAttempts = await databaseDailyChallengeService.getRemainingAttempts(userId);

      const response = {
        success: true,
        challenge,
        userStats: null, // Not implemented yet in database service
        hasCompleted,
        remainingAttempts,
      };

      console.log(
        'Sending response to client:',
        JSON.stringify(response, (key, value) => {
          if (key === 'challenge' && value) {
            return { id: value.id, title: value.title, boardState: `${value.boardState?.substring(0, 20)}...` };
          }
          return value;
        }),
      );

      callback(response);
    } catch (error) {
      console.error('Error getting daily challenge:', error);
      callback({
        success: false,
        error: 'Failed to get daily challenge',
      });
    }
  });

  // Create a challenge game
  socket.on(
    SocketEvents.CreateChallengeGame,
    async (userId: string, userName: string, challengeId: string, callback: CallbackFunction) => {
      try {
        if (!userId || !userName || !challengeId) {
          callback({
            success: false,
            error: 'Missing required parameters',
          });
          return;
        }

        // Verify user exists
        const user = UserManager.getUserById(userId);
        if (!user) {
          callback({
            success: false,
            error: 'User not found',
          });
          return;
        }

        // Get the challenge data directly by ID
        console.log('Creating challenge game for challengeId:', challengeId);

        const challenge = await databaseDailyChallengeService.getChallengeById(challengeId);
        console.log('Challenge found:', challenge ? 'YES' : 'NO');
        if (challenge) {
          console.log('Challenge details:', {
            id: challenge.id,
            date: challenge.date,
            title: challenge.title,
            difficulty: challenge.difficulty,
          });
        }

        if (!challenge) {
          const today = new Date().toISOString().split('T')[0];
          const errorMessage = dateFromId > today ? 'Future challenges are not available yet' : 'Challenge not found';

          callback({
            success: false,
            error: errorMessage,
          });
          return;
        }

        // Check if user has attempts remaining
        const remainingAttempts = await databaseDailyChallengeService.getRemainingAttempts(userId);
        if (remainingAttempts <= 0) {
          callback({
            success: false,
            error: 'No attempts remaining for this challenge',
          });
          return;
        }

        try {
          // Create challenge game with preset board state and solution
          const challengeGame = new Game(undefined, undefined, {
            boardState: challenge.boardState,
            currentPlayer: challenge.currentPlayer,
            challengeId: challenge.id,
            challengeConfig: {
              ...challenge.config,
              solution: challenge.solution,
            },
          });

          // Add user as the sole player (single-player puzzle)
          console.log('Adding user to challenge game:', {
            userId: user.userId,
            socketId: user.socketId,
            userName,
          });
          const result = challengeGame.addOrUpdatePlayer(user);
          console.log('Add player result:', result);
          if (!result.success) {
            callback({
              success: false,
              error: result.error || 'Failed to add player to challenge',
            });
            return;
          }

          // Assign the user the current player's piece for the challenge
          challengeGame.players[userId].piece = challenge.currentPlayer;
          challengeGame.gameStarted = true; // Puzzle starts immediately
          challengeGame.gameFull = true; // Single-player puzzle is "full"

          // Register game with GameManager
          GameManager.games[challengeGame.id] = challengeGame;

          // Emit game state so client shows the board immediately
          emit(SocketEvents.GameUpdated(challengeGame.id), challengeGame);

          callback({
            success: true,
            gameId: challengeGame.id,
            challengeType: challenge.type,
            difficulty: challenge.difficulty,
          });
        } catch (error) {
          console.error('Error creating challenge game:', error);
          callback({
            success: false,
            error: 'Failed to create challenge game',
          });
        }
      } catch (error) {
        console.error('Error creating challenge game:', error);
        callback({
          success: false,
          error: 'Failed to create challenge game',
        });
      }
    },
  );

  // Submit a challenge attempt - DISABLED: Conflicts with gameHandlers.ts version
  // The gameHandlers.ts version handles challenge games correctly
  /*
  socket.on(
    SocketEvents.SubmitChallengeAttempt,
    async (challengeId: string, moves: number[], timeSpent: number, hintsUsed: number, callback?: CallbackFunction) => {
      try {
        const userId = socket.data.userId;
        if (!userId) {
          if (callback) {
            callback({
              success: false,
              error: 'User not authenticated',
            });
          }
          return;
        }

        if (!challengeId || !Array.isArray(moves) || typeof timeSpent !== 'number') {
          if (callback) {
            callback({
              success: false,
              error: 'Invalid challenge submission data',
            });
          }
          return;
        }

        const attemptResult = await databaseDailyChallengeService.submitAttempt(
          challengeId,
          userId,
          moves,
          timeSpent,
          hintsUsed || 0,
        );

        if (!attemptResult) {
          if (callback) {
            callback({
              success: false,
              error: 'Unable to submit attempt - challenge not found or max attempts exceeded',
            });
          }
          return;
        }

        if (callback) {
          callback({
            success: true,
            attempt: {
              success: attemptResult.success,
              score: attemptResult.score,
            },
            userStats: null, // Not implemented yet in database service
            remainingAttempts: attemptResult.attemptsRemaining,
          });
        }

        // Broadcast challenge update to user (for real-time updates across tabs)
        socket.emit(SocketEvents.ChallengeUpdated, {
          attempt: {
            success: attemptResult.success,
            score: attemptResult.score,
          },
          userStats: null,
          remainingAttempts: attemptResult.attemptsRemaining,
        });
      } catch (error) {
        console.error('Error submitting challenge attempt:', error);
        if (callback) {
          callback({
            success: false,
            error: 'Failed to submit challenge attempt',
          });
        }
      }
    },
  );
  */

  // Get user's challenge statistics (disabled - not implemented in database service yet)
  socket.on(SocketEvents.GetUserChallengeStats, async (callback: CallbackFunction) => {
    callback({
      success: false,
      error: 'User statistics not implemented yet',
    });
  });

  // Get global challenge leaderboard (disabled - not implemented in database service yet)
  socket.on(SocketEvents.GetChallengeLeaderboard, async (limit: number = 50, callback: CallbackFunction) => {
    callback({
      success: false,
      error: 'Leaderboard not implemented yet',
    });
  });

  // Get challenge by specific date (for viewing past challenges)
  socket.on(SocketEvents.GetChallengeByDate, async (date: string, callback: CallbackFunction) => {
    try {
      const userId = socket.data.userId;
      if (!userId) {
        callback({
          success: false,
          error: 'User not authenticated',
        });
        return;
      }

      if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        callback({
          success: false,
          error: 'Invalid date format. Use YYYY-MM-DD',
        });
        return;
      }

      const challenge = await databaseDailyChallengeService.getChallengeByDate(date);
      const userAttempts = challenge ? await databaseDailyChallengeService.getUserAttempts(challenge.id, userId) : [];

      callback({
        success: true,
        challenge,
        userAttempts,
      });
    } catch (error) {
      console.error('Error getting challenge by date:', error);
      callback({
        success: false,
        error: 'Failed to get challenge for specified date',
      });
    }
  });

  // Get user's attempts for a specific challenge
  socket.on(SocketEvents.GetUserChallengeAttempts, async (challengeId: string, callback: CallbackFunction) => {
    try {
      const userId = socket.data.userId;
      if (!userId) {
        callback({
          success: false,
          error: 'User not authenticated',
        });
        return;
      }

      if (!challengeId) {
        callback({
          success: false,
          error: 'Challenge ID is required',
        });
        return;
      }

      const attempts = await databaseDailyChallengeService.getUserAttempts(challengeId, userId);
      callback({
        success: true,
        attempts,
      });
    } catch (error) {
      console.error('Error getting user challenge attempts:', error);
      callback({
        success: false,
        error: 'Failed to get challenge attempts',
      });
    }
  });
};
