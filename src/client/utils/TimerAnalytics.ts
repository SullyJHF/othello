export interface TimerStats {
  totalGamesPlayed: number;
  totalTimedGames: number;
  averageGameDuration: number;
  averageMoveTime: number;
  fastestMove: number;
  slowestMove: number;
  timePressureEvents: {
    warningCount: number;
    criticalCount: number;
    timeoutCount: number;
  };
  winLossRecord: {
    wins: number;
    losses: number;
    timeouts: number;
  };
  moveTimeDistribution: {
    veryFast: number; // < 5s
    fast: number; // 5-15s
    normal: number; // 15-30s
    slow: number; // 30-60s
    verySlow: number; // > 60s
  };
  timeManagementScore: number; // 0-100 calculated score
}

export interface GameAnalytics {
  gameId: string;
  gameMode: string;
  startTime: number;
  endTime?: number;
  playerStats: {
    [playerId: string]: {
      moves: Array<{
        moveTime: number;
        remainingTime: number;
        moveNumber: number;
        timestamp: number;
      }>;
      timeWarnings: number;
      timeCriticals: number;
      timedOut: boolean;
      won: boolean;
    };
  };
}

export class TimerAnalytics {
  private stats: TimerStats;
  private currentGame: GameAnalytics | null = null;
  private readonly STORAGE_KEY = 'timer-analytics';

  constructor() {
    this.stats = this.getDefaultStats();
    this.loadFromStorage();
  }

  private getDefaultStats(): TimerStats {
    return {
      totalGamesPlayed: 0,
      totalTimedGames: 0,
      averageGameDuration: 0,
      averageMoveTime: 0,
      fastestMove: Number.MAX_SAFE_INTEGER,
      slowestMove: 0,
      timePressureEvents: {
        warningCount: 0,
        criticalCount: 0,
        timeoutCount: 0,
      },
      winLossRecord: {
        wins: 0,
        losses: 0,
        timeouts: 0,
      },
      moveTimeDistribution: {
        veryFast: 0,
        fast: 0,
        normal: 0,
        slow: 0,
        verySlow: 0,
      },
      timeManagementScore: 50,
    };
  }

  private loadFromStorage(): void {
    try {
      const savedStats = localStorage.getItem(this.STORAGE_KEY);
      if (savedStats) {
        this.stats = { ...this.getDefaultStats(), ...JSON.parse(savedStats) };
      }
    } catch (error) {
      console.warn('Failed to load timer analytics from storage:', error);
    }
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.stats));
    } catch (error) {
      console.warn('Failed to save timer analytics to storage:', error);
    }
  }

  startGame(gameId: string, gameMode: string): void {
    this.currentGame = {
      gameId,
      gameMode,
      startTime: Date.now(),
      playerStats: {},
    };
  }

  recordMove(playerId: string, moveTime: number, remainingTime: number, moveNumber: number): void {
    if (!this.currentGame) return;

    if (!this.currentGame.playerStats[playerId]) {
      this.currentGame.playerStats[playerId] = {
        moves: [],
        timeWarnings: 0,
        timeCriticals: 0,
        timedOut: false,
        won: false,
      };
    }

    this.currentGame.playerStats[playerId].moves.push({
      moveTime,
      remainingTime,
      moveNumber,
      timestamp: Date.now(),
    });

    // Update move time distribution
    if (moveTime < 5) {
      this.stats.moveTimeDistribution.veryFast++;
    } else if (moveTime < 15) {
      this.stats.moveTimeDistribution.fast++;
    } else if (moveTime < 30) {
      this.stats.moveTimeDistribution.normal++;
    } else if (moveTime < 60) {
      this.stats.moveTimeDistribution.slow++;
    } else {
      this.stats.moveTimeDistribution.verySlow++;
    }

    // Update fastest/slowest move records
    if (moveTime < this.stats.fastestMove) {
      this.stats.fastestMove = moveTime;
    }
    if (moveTime > this.stats.slowestMove) {
      this.stats.slowestMove = moveTime;
    }
  }

  recordTimerWarning(playerId: string, type: 'warning' | 'critical'): void {
    if (!this.currentGame?.playerStats[playerId]) return;

    if (type === 'warning') {
      this.currentGame.playerStats[playerId].timeWarnings++;
      this.stats.timePressureEvents.warningCount++;
    } else {
      this.currentGame.playerStats[playerId].timeCriticals++;
      this.stats.timePressureEvents.criticalCount++;
    }
  }

  recordTimeout(playerId: string): void {
    if (!this.currentGame?.playerStats[playerId]) return;

    this.currentGame.playerStats[playerId].timedOut = true;
    this.stats.timePressureEvents.timeoutCount++;
    this.stats.winLossRecord.timeouts++;
  }

  endGame(winnerId?: string): void {
    if (!this.currentGame) return;

    this.currentGame.endTime = Date.now();
    const gameDuration = (this.currentGame.endTime - this.currentGame.startTime) / 1000;

    // Update general statistics
    this.stats.totalGamesPlayed++;
    if (Object.keys(this.currentGame.playerStats).length > 0) {
      this.stats.totalTimedGames++;
    }

    // Update average game duration
    this.stats.averageGameDuration =
      (this.stats.averageGameDuration * (this.stats.totalTimedGames - 1) + gameDuration) / this.stats.totalTimedGames;

    // Process each player's performance
    let totalMoveTime = 0;
    let totalMoves = 0;

    Object.entries(this.currentGame.playerStats).forEach(([playerId, playerData]) => {
      // Update win/loss record (assuming this is the local player)
      if (winnerId === playerId) {
        playerData.won = true;
        this.stats.winLossRecord.wins++;
      } else if (winnerId && !playerData.timedOut) {
        this.stats.winLossRecord.losses++;
      }

      // Calculate move times
      playerData.moves.forEach((move) => {
        totalMoveTime += move.moveTime;
        totalMoves++;
      });
    });

    // Update average move time
    if (totalMoves > 0) {
      this.stats.averageMoveTime =
        (this.stats.averageMoveTime * (this.stats.totalTimedGames - 1) + totalMoveTime / totalMoves) /
        this.stats.totalTimedGames;
    }

    // Recalculate time management score
    this.calculateTimeManagementScore();

    // Save to storage
    this.saveToStorage();

    // Clear current game
    this.currentGame = null;
  }

  private calculateTimeManagementScore(): void {
    if (this.stats.totalTimedGames === 0) {
      this.stats.timeManagementScore = 50;
      return;
    }

    let score = 50; // Base score

    // Positive factors
    const winRate = this.stats.winLossRecord.wins / Math.max(1, this.stats.totalTimedGames);
    score += winRate * 30; // Up to 30 points for win rate

    // Time efficiency (prefer fast but not too fast moves)
    const fastMoveRatio =
      (this.stats.moveTimeDistribution.fast + this.stats.moveTimeDistribution.normal) /
      Math.max(
        1,
        Object.values(this.stats.moveTimeDistribution).reduce((a, b) => a + b, 0),
      );
    score += fastMoveRatio * 20; // Up to 20 points for good pacing

    // Negative factors
    const timeoutRate = this.stats.winLossRecord.timeouts / Math.max(1, this.stats.totalTimedGames);
    score -= timeoutRate * 40; // Penalty for timeouts

    const pressureEventRate =
      (this.stats.timePressureEvents.warningCount + this.stats.timePressureEvents.criticalCount) /
      Math.max(1, this.stats.totalTimedGames * 20); // Assume average 20 moves per game
    score -= pressureEventRate * 20; // Penalty for time pressure

    // Clamp score between 0 and 100
    this.stats.timeManagementScore = Math.max(0, Math.min(100, Math.round(score)));
  }

  getStats(): TimerStats {
    return { ...this.stats };
  }

  getDetailedStats(): {
    stats: TimerStats;
    insights: string[];
    recommendations: string[];
  } {
    const insights: string[] = [];
    const recommendations: string[] = [];

    // Generate insights
    if (this.stats.totalTimedGames > 0) {
      insights.push(`You've played ${this.stats.totalTimedGames} timed games`);
      insights.push(`Average game duration: ${Math.round(this.stats.averageGameDuration / 60)} minutes`);
      insights.push(`Average move time: ${this.stats.averageMoveTime.toFixed(1)} seconds`);

      const winRate = (this.stats.winLossRecord.wins / this.stats.totalTimedGames) * 100;
      insights.push(`Win rate: ${winRate.toFixed(1)}%`);
    }

    // Generate recommendations
    if (this.stats.moveTimeDistribution.verySlow > this.stats.moveTimeDistribution.fast) {
      recommendations.push('Try to think faster - you spend too much time on moves');
    }

    if (this.stats.timePressureEvents.timeoutCount > 0) {
      recommendations.push('Focus on time management to avoid timeouts');
    }

    if (this.stats.timePressureEvents.warningCount > this.stats.totalTimedGames * 5) {
      recommendations.push('Plan your moves earlier to avoid time pressure');
    }

    const fastMoveRatio =
      this.stats.moveTimeDistribution.veryFast /
      Math.max(
        1,
        Object.values(this.stats.moveTimeDistribution).reduce((a, b) => a + b, 0),
      );

    if (fastMoveRatio > 0.3) {
      recommendations.push('Consider taking more time for complex positions');
    }

    if (this.stats.timeManagementScore >= 80) {
      recommendations.push('Excellent time management! Keep it up!');
    } else if (this.stats.timeManagementScore >= 60) {
      recommendations.push('Good time management, with room for improvement');
    } else {
      recommendations.push('Focus on improving your time management skills');
    }

    return {
      stats: this.getStats(),
      insights,
      recommendations,
    };
  }

  reset(): void {
    this.stats = this.getDefaultStats();
    this.currentGame = null;
    try {
      localStorage.removeItem(this.STORAGE_KEY);
    } catch (error) {
      console.warn('Failed to clear timer analytics from storage:', error);
    }
  }

  exportData(): string {
    return JSON.stringify(
      {
        stats: this.stats,
        exportedAt: new Date().toISOString(),
      },
      null,
      2,
    );
  }

  importData(jsonData: string): boolean {
    try {
      const data = JSON.parse(jsonData);
      if (data.stats) {
        this.stats = { ...this.getDefaultStats(), ...data.stats };
        this.saveToStorage();
        return true;
      }
    } catch (error) {
      console.warn('Failed to import timer analytics data:', error);
    }
    return false;
  }
}

// Global timer analytics instance
let timerAnalytics: TimerAnalytics | null = null;

export const getTimerAnalytics = (): TimerAnalytics => {
  if (!timerAnalytics) {
    timerAnalytics = new TimerAnalytics();
  }
  return timerAnalytics;
};
