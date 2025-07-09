import { Server, Socket } from 'socket.io';
import { SocketEvents } from '../../shared/SocketEvents';
import GameManager from '../models/GameManager';
import { Timer } from '../models/Timer';
import UserManager from '../models/UserManager';
import { latencyCompensation } from '../services/LatencyCompensation';
import { emit } from './sockets';

// Active timers for each game
const gameTimers: Map<string, Map<string, Timer>> = new Map();

// Helper function to emit timer updates to game participants
const emitTimerUpdate = (gameId: string, data: any) => {
  emit(SocketEvents.TimerUpdated(gameId), data);
};

// Helper function to emit timer tick to game participants
const emitTimerTick = (gameId: string, userId: string, remainingTime: number) => {
  const game = GameManager.getGame(gameId);
  if (game?.timerState) {
    // Send the full timer states for all players
    emit(SocketEvents.TimerTick(gameId), game.timerState.playerTimers);
  } else {
    // Fallback to simple format for compatibility
    emit(SocketEvents.TimerTick(gameId), {
      [userId]: {
        userId,
        remainingTime,
        timestamp: Date.now(),
      },
    });
  }
};

// Helper function to emit timer warning to game participants
const emitTimerWarning = (gameId: string, userId: string, warningType: 'low' | 'critical', remainingTime: number) => {
  const eventName =
    warningType === 'critical' ? SocketEvents.TimerCriticalWarning(gameId) : SocketEvents.TimerWarning(gameId);

  emit(eventName, {
    userId,
    warningType,
    remainingTime,
    timestamp: Date.now(),
  });
};

// Helper function to emit timer expired to game participants
const emitTimerExpired = (gameId: string, userId: string) => {
  emit(SocketEvents.TimerExpired(gameId), {
    userId,
    timestamp: Date.now(),
  });
};

// Helper function to emit timer increment to game participants
const emitTimerIncrement = (gameId: string, userId: string, newTime: number, incrementAmount: number) => {
  emit(SocketEvents.TimerIncrement(gameId), {
    userId,
    newTime,
    incrementAmount,
    timestamp: Date.now(),
  });
};

// Helper function to emit timer pause to game participants
const emitTimerPaused = (gameId: string, userId: string, remainingTime: number) => {
  emit(SocketEvents.TimerPaused(gameId), {
    userId,
    remainingTime,
    timestamp: Date.now(),
  });
};

// Helper function to emit timer resume to game participants
const emitTimerResumed = (gameId: string, userId: string, remainingTime: number) => {
  emit(SocketEvents.TimerResumed(gameId), {
    userId,
    remainingTime,
    timestamp: Date.now(),
  });
};

// Helper function to create timers for a game
const createGameTimers = (gameId: string): void => {
  const game = GameManager.getGame(gameId);
  if (!game?.timerState) return;

  const timers = new Map<string, Timer>();

  Object.keys(game.players).forEach((userId) => {
    // Initialize the player timer in the game's timer state
    game.initializePlayerTimer(userId);

    const timer = new Timer(game.timerState!.config);

    // Set up timer event listeners
    timer.on('tick', (remainingTime) => {
      // Update the game's timer state with the current time
      game.updatePlayerTimerState(userId, new Date());
      emitTimerTick(gameId, userId, remainingTime);
    });

    timer.on('warning', (warningType, remainingTime) => {
      emitTimerWarning(gameId, userId, warningType, remainingTime);
    });

    timer.on('timeout', () => {
      emitTimerExpired(gameId, userId);

      // Handle timeout in the game logic
      if (game.timerState?.config.autoFlagOnTimeout) {
        const gameStateBefore = {
          currentPlayer: game.currentPlayer,
          gameFinished: game.gameFinished,
        };

        game.handlePlayerTimeout(userId);

        // Emit timeout event with details
        emit(SocketEvents.TimerTimeout(gameId), {
          userId,
          timeoutType:
            gameStateBefore.currentPlayer === game.players[userId]?.piece ? 'move_timeout' : 'waiting_timeout',
          gameFinished: game.gameFinished,
          gameEndedByTimeout: !gameStateBefore.gameFinished && game.gameFinished,
          timestamp: Date.now(),
        });

        // Update game state
        emit(SocketEvents.GameUpdated(gameId), game);

        // Save game state after timeout
        if (game.gameFinished) {
          GameManager.markGameFinished(gameId, undefined, 'timeout').catch((error) => {
            console.error(`Failed to mark game ${gameId} as finished after timeout:`, error);
          });
        } else {
          GameManager.saveGame(gameId).catch((error) => {
            console.error(`Failed to save game ${gameId} after timeout:`, error);
          });
        }
      }
    });

    timer.on('increment', (newTime, incrementAmount) => {
      emitTimerIncrement(gameId, userId, newTime, incrementAmount);
    });

    timer.on('pause', (remainingTime) => {
      emitTimerPaused(gameId, userId, remainingTime);
    });

    timer.on('resume', (remainingTime) => {
      emitTimerResumed(gameId, userId, remainingTime);
    });

    timers.set(userId, timer);
  });

  gameTimers.set(gameId, timers);
};

// Helper function to start a player's timer
const startPlayerTimer = (gameId: string, userId: string): void => {
  const timers = gameTimers.get(gameId);
  if (!timers) return;

  const timer = timers.get(userId);
  if (!timer) return;

  // Stop all other timers in the game first
  timers.forEach((otherTimer, otherUserId) => {
    if (otherUserId !== userId) {
      otherTimer.stop();
    }
  });

  timer.start();

  // Also update the game's timer state
  const game = GameManager.getGame(gameId);
  if (game) {
    game.startPlayerTimer(userId);
  }
};

// Helper function to stop a player's timer
const stopPlayerTimer = (gameId: string, userId: string): void => {
  const timers = gameTimers.get(gameId);
  if (!timers) return;

  const timer = timers.get(userId);
  if (!timer) return;

  timer.stop();

  // Also update the game's timer state
  const game = GameManager.getGame(gameId);
  if (game) {
    game.stopPlayerTimer(userId);
  }
};

// Helper function to pause a player's timer
const pausePlayerTimer = (gameId: string, userId: string): void => {
  const timers = gameTimers.get(gameId);
  if (!timers) return;

  const timer = timers.get(userId);
  if (!timer) return;

  timer.pause();

  // Also update the game's timer state
  const game = GameManager.getGame(gameId);
  if (game) {
    game.pausePlayerTimer(userId);
  }
};

// Helper function to resume a player's timer
const resumePlayerTimer = (gameId: string, userId: string): void => {
  const timers = gameTimers.get(gameId);
  if (!timers) return;

  const timer = timers.get(userId);
  if (!timer) return;

  timer.resume();

  // Also update the game's timer state
  const game = GameManager.getGame(gameId);
  if (game) {
    game.resumePlayerTimer(userId);
  }
};

// Helper function to add time increment to a player's timer
const addTimeIncrement = (gameId: string, userId: string): void => {
  const timers = gameTimers.get(gameId);
  if (!timers) return;

  const timer = timers.get(userId);
  if (!timer) return;

  timer.addIncrement();

  // Also update the game's timer state
  const game = GameManager.getGame(gameId);
  if (game) {
    game.applyTimeIncrement(userId);
  }
};

// Helper function to get all timer states for a game
const getTimerStates = (gameId: string): Record<string, any> => {
  const game = GameManager.getGame(gameId);
  if (!game?.timerState) return {};

  const states: Record<string, any> = {};

  // Get compensated timer states for all players
  Object.keys(game.players).forEach((userId) => {
    const compensatedState = game.getCompensatedTimerState(userId);
    if (compensatedState) {
      states[userId] = compensatedState;
    }
  });

  return states;
};

// Helper function to synchronize timer states with game state
const syncTimerStates = (gameId: string): void => {
  const game = GameManager.getGame(gameId);
  if (!game?.timerState) return;

  const timerStates = getTimerStates(gameId);

  emit(SocketEvents.TimerStateSync(gameId), {
    timerStates,
    gameTimerState: game.timerState,
    timestamp: Date.now(),
  });
};

// Helper function to destroy timers for a game
const destroyGameTimers = (gameId: string): void => {
  const timers = gameTimers.get(gameId);
  if (!timers) return;

  timers.forEach((timer) => {
    timer.destroy();
  });

  gameTimers.delete(gameId);
};

export const registerTimerHandlers = (io: Server, socket: Socket): void => {
  // Handle timer state requests
  const onGetTimerState = (gameId: string, callback: (states: Record<string, any>) => void) => {
    const states = getTimerStates(gameId);
    callback(states);
  };

  // Handle timer synchronization requests
  const onRequestTimerSync = (gameId: string) => {
    syncTimerStates(gameId);
  };

  // Handle timer pause requests (for disconnections)
  const onRequestTimerPause = (gameId: string, userId: string) => {
    const user = UserManager.getUserById(userId);
    if (!user) return;

    const game = GameManager.getGame(gameId);
    if (!game?.hasPlayer(user)) return;

    pausePlayerTimer(gameId, userId);
  };

  // Handle timer resume requests (for reconnections)
  const onRequestTimerResume = (gameId: string, userId: string) => {
    const user = UserManager.getUserById(userId);
    if (!user) return;

    const game = GameManager.getGame(gameId);
    if (!game?.hasPlayer(user)) return;

    resumePlayerTimer(gameId, userId);
  };

  // Handle latency ping for network compensation
  const onLatencyPing = (gameId: string, data: { userId: string; clientTime: number; pingId: string }) => {
    try {
      const { userId, clientTime, pingId } = data;
      const serverReceiveTime = Date.now();

      // Record latency measurement
      const measurement = latencyCompensation.recordLatency(
        userId,
        gameId,
        clientTime,
        serverReceiveTime,
        serverReceiveTime,
      );

      // Send pong response
      socket.emit(SocketEvents.TimerLatencyPong(gameId), {
        pingId,
        serverTime: serverReceiveTime,
        clientTime,
        measurement,
      });
    } catch (error) {
      console.error('Error handling latency ping:', error);
      // Send error response
      socket.emit(SocketEvents.TimerLatencyPong(gameId), {
        pingId: data.pingId,
        error: 'Failed to record latency',
      });
    }
  };

  // Handle latency synchronization requests
  const onLatencySync = (gameId: string, data: { userId: string; requestTime: number }) => {
    try {
      const { userId, requestTime } = data;
      const syncData = latencyCompensation.getTimeSyncData(userId);

      // Include network quality assessment
      const networkQuality = latencyCompensation.getNetworkQuality(userId);

      socket.emit(SocketEvents.TimerLatencySync(gameId), {
        ...syncData,
        networkQuality,
        requestTime,
        responseTime: Date.now(),
      });
    } catch (error) {
      console.error('Error handling latency sync:', error);
      // Send error response
      socket.emit(SocketEvents.TimerLatencySync(gameId), {
        error: 'Failed to sync latency data',
        requestTime: data.requestTime,
        responseTime: Date.now(),
      });
    }
  };

  // Register socket event handlers
  socket.on(SocketEvents.GetTimerState(''), onGetTimerState);
  socket.on(SocketEvents.RequestTimerSync(''), onRequestTimerSync);
  socket.on(SocketEvents.RequestTimerPause(''), onRequestTimerPause);
  socket.on(SocketEvents.RequestTimerResume(''), onRequestTimerResume);
  socket.on(SocketEvents.TimerLatencyPing(''), onLatencyPing);
  socket.on(SocketEvents.TimerLatencySync(''), onLatencySync);
};

// Export timer management functions for use by other modules
export const TimerManager = {
  createGameTimers,
  startPlayerTimer,
  stopPlayerTimer,
  pausePlayerTimer,
  resumePlayerTimer,
  addTimeIncrement,
  getTimerStates,
  syncTimerStates,
  destroyGameTimers,
};
