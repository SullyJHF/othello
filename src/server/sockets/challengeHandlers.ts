import { Socket } from 'socket.io';
import { SocketEvents } from '../../shared/SocketEvents';
import { dailyChallengeService } from '../services/DailyChallengeService';
import { createChallengeGame } from '../services/SinglePlayerService';
import UserManager from '../models/UserManager';

export const setupChallengeHandlers = (socket: Socket) => {
  // Get today's daily challenge
  socket.on(SocketEvents.GetDailyChallenge, async (callback: Function) => {
    try {
      const userId = socket.data.userId;
      if (!userId) {
        callback({
          success: false,
          error: 'User not authenticated',
        });
        return;
      }

      const challenge = await dailyChallengeService.getTodaysChallenge();
      const userStats = await dailyChallengeService.getUserStats(userId);
      const hasCompleted = await dailyChallengeService.hasUserCompletedToday(userId);
      const remainingAttempts = await dailyChallengeService.getRemainingAttempts(userId);

      callback({
        success: true,
        challenge,
        userStats,
        hasCompleted,
        remainingAttempts,
      });
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
    async (userId: string, userName: string, challengeId: string, callback: Function) => {
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

        // Get the challenge to determine difficulty
        const challenge = await dailyChallengeService.getChallengeByDate(challengeId.split('-').slice(1).join('-'));
        if (!challenge) {
          callback({
            success: false,
            error: 'Challenge not found',
          });
          return;
        }

        // Check if user has attempts remaining
        const remainingAttempts = await dailyChallengeService.getRemainingAttempts(userId);
        if (remainingAttempts <= 0) {
          callback({
            success: false,
            error: 'No attempts remaining for this challenge',
          });
          return;
        }

        // Create challenge game with appropriate difficulty
        const difficultyMap = {
          1: 'beginner',
          2: 'intermediate',
          3: 'advanced',
          4: 'expert',
          5: 'expert',
        } as const;

        const result = createChallengeGame(user, challengeId, {
          userPiece: 'B', // Player always starts as black in challenges
          aiDifficulty: difficultyMap[challenge.difficulty] || 'intermediate',
          aiPersonality: 'balanced',
        });

        if (result.success) {
          callback({
            success: true,
            gameId: result.gameId,
            aiOpponentName: result.aiOpponentName,
            difficulty: result.difficulty,
          });
        } else {
          callback({
            success: false,
            error: result.error || 'Failed to create challenge game',
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

  // Submit a challenge attempt
  socket.on(
    SocketEvents.SubmitChallengeAttempt,
    async (challengeId: string, moves: number[], timeSpent: number, hintsUsed: number, callback: Function) => {
      try {
        const userId = socket.data.userId;
        if (!userId) {
          callback({
            success: false,
            error: 'User not authenticated',
          });
          return;
        }

        if (!challengeId || !Array.isArray(moves) || typeof timeSpent !== 'number') {
          callback({
            success: false,
            error: 'Invalid challenge submission data',
          });
          return;
        }

        const attempt = await dailyChallengeService.submitAttempt(
          challengeId,
          userId,
          moves,
          timeSpent,
          hintsUsed || 0,
        );

        if (!attempt) {
          callback({
            success: false,
            error: 'Unable to submit attempt - challenge not found or max attempts exceeded',
          });
          return;
        }

        // Get updated user stats after the attempt
        const updatedStats = await dailyChallengeService.getUserStats(userId);
        const remainingAttempts = await dailyChallengeService.getRemainingAttempts(userId);

        callback({
          success: true,
          attempt,
          userStats: updatedStats,
          remainingAttempts,
        });

        // Broadcast challenge update to user (for real-time updates across tabs)
        socket.emit(SocketEvents.ChallengeUpdated, {
          attempt,
          userStats: updatedStats,
          remainingAttempts,
        });
      } catch (error) {
        console.error('Error submitting challenge attempt:', error);
        callback({
          success: false,
          error: 'Failed to submit challenge attempt',
        });
      }
    },
  );

  // Get user's challenge statistics
  socket.on(SocketEvents.GetUserChallengeStats, async (callback: Function) => {
    try {
      const userId = socket.data.userId;
      if (!userId) {
        callback({
          success: false,
          error: 'User not authenticated',
        });
        return;
      }

      const stats = await dailyChallengeService.getUserStats(userId);
      callback({
        success: true,
        stats,
      });
    } catch (error) {
      console.error('Error getting user challenge stats:', error);
      callback({
        success: false,
        error: 'Failed to get user statistics',
      });
    }
  });

  // Get global challenge leaderboard
  socket.on(SocketEvents.GetChallengeLeaderboard, async (limit: number = 50, callback: Function) => {
    try {
      const leaderboard = await dailyChallengeService.getGlobalLeaderboard(limit);
      callback({
        success: true,
        leaderboard,
      });
    } catch (error) {
      console.error('Error getting challenge leaderboard:', error);
      callback({
        success: false,
        error: 'Failed to get leaderboard',
      });
    }
  });

  // Get challenge by specific date (for viewing past challenges)
  socket.on(SocketEvents.GetChallengeByDate, async (date: string, callback: Function) => {
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

      const challenge = await dailyChallengeService.getChallengeByDate(date);
      const userAttempts = challenge ? await dailyChallengeService.getUserAttempts(challenge.id, userId) : [];

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
  socket.on(SocketEvents.GetUserChallengeAttempts, async (challengeId: string, callback: Function) => {
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

      const attempts = await dailyChallengeService.getUserAttempts(challengeId, userId);
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
