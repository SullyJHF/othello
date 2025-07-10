import { ChallengeConfig, ChallengeHint, ChallengeSolution } from '../../shared/types/gameModeTypes';

export interface DailyChallenge {
  id: string;
  date: string; // YYYY-MM-DD format
  title: string;
  description: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  type: 'tactical' | 'endgame' | 'opening' | 'puzzle' | 'scenario';
  boardState: string; // Starting board position
  currentPlayer: 'B' | 'W';
  config: ChallengeConfig;
  hints: ChallengeHint[];
  solution: ChallengeSolution;
  tags: string[];
  points: number; // Base points for completion
  timeBonus: number; // Bonus points for quick completion
  createdAt: Date;
  isActive: boolean;
}

export interface ChallengeAttempt {
  id: string;
  challengeId: string;
  userId: string;
  moves: number[]; // Sequence of moves made
  completed: boolean;
  success: boolean;
  score: number; // Points earned
  timeSpent: number; // Time in seconds
  hintsUsed: number;
  attemptNumber: number; // Which attempt (1, 2, 3...)
  completedAt?: Date;
  createdAt: Date;
}

export interface UserChallengeStats {
  userId: string;
  totalChallengesCompleted: number;
  totalPoints: number;
  currentStreak: number; // Consecutive days completed
  longestStreak: number;
  averageTime: number; // Average completion time in seconds
  difficultyStats: {
    [difficulty: number]: {
      attempted: number;
      completed: number;
      averageScore: number;
    };
  };
  typeStats: {
    [type: string]: {
      attempted: number;
      completed: number;
      averageScore: number;
    };
  };
  lastChallengeDate: string; // YYYY-MM-DD
  updatedAt: Date;
}

export class DailyChallengeModel {
  private challenges: Map<string, DailyChallenge> = new Map();
  private attempts: Map<string, ChallengeAttempt[]> = new Map();
  private userStats: Map<string, UserChallengeStats> = new Map();

  // Get challenge for a specific date
  getChallengeByDate(date: string): DailyChallenge | null {
    const challenge = Array.from(this.challenges.values()).find((c) => c.date === date && c.isActive);
    return challenge || null;
  }

  // Get today's challenge
  getTodaysChallenge(): DailyChallenge | null {
    const today = new Date().toISOString().split('T')[0];
    return this.getChallengeByDate(today);
  }

  // Create a new daily challenge
  createChallenge(challengeData: Omit<DailyChallenge, 'id' | 'createdAt'>): DailyChallenge {
    const challenge: DailyChallenge = {
      ...challengeData,
      id: `daily-${challengeData.date}`,
      createdAt: new Date(),
    };

    this.challenges.set(challenge.id, challenge);
    return challenge;
  }

  // Submit an attempt for a challenge
  submitAttempt(
    challengeId: string,
    userId: string,
    moves: number[],
    timeSpent: number,
    hintsUsed: number = 0,
  ): ChallengeAttempt | null {
    const challenge = this.challenges.get(challengeId);
    if (!challenge) return null;

    const userAttempts = this.attempts.get(`${challengeId}-${userId}`) || [];
    const attemptNumber = userAttempts.length + 1;

    // Check if user has exceeded max attempts
    if (attemptNumber > challenge.config.maxAttempts) {
      return null;
    }

    // Validate solution
    const success = this.validateSolution(challenge, moves);
    const score = this.calculateScore(challenge, success, timeSpent, hintsUsed);

    const attempt: ChallengeAttempt = {
      id: `${challengeId}-${userId}-${attemptNumber}`,
      challengeId,
      userId,
      moves,
      completed: true,
      success,
      score,
      timeSpent,
      hintsUsed,
      attemptNumber,
      completedAt: success ? new Date() : undefined,
      createdAt: new Date(),
    };

    userAttempts.push(attempt);
    this.attempts.set(`${challengeId}-${userId}`, userAttempts);

    // Update user stats if successful
    if (success) {
      this.updateUserStats(userId, challenge, attempt);
    }

    return attempt;
  }

  // Get user's attempts for a challenge
  getUserAttempts(challengeId: string, userId: string): ChallengeAttempt[] {
    return this.attempts.get(`${challengeId}-${userId}`) || [];
  }

  // Get user's challenge statistics
  getUserStats(userId: string): UserChallengeStats {
    const existing = this.userStats.get(userId);
    if (existing) return existing;

    // Create default stats for new user
    const defaultStats: UserChallengeStats = {
      userId,
      totalChallengesCompleted: 0,
      totalPoints: 0,
      currentStreak: 0,
      longestStreak: 0,
      averageTime: 0,
      difficultyStats: {},
      typeStats: {},
      lastChallengeDate: '',
      updatedAt: new Date(),
    };

    this.userStats.set(userId, defaultStats);
    return defaultStats;
  }

  // Validate if the submitted moves solve the challenge
  private validateSolution(challenge: DailyChallenge, moves: number[]): boolean {
    const primarySolution = challenge.solution.moves;
    const alternativeSolutions = challenge.solution.alternativeSolutions || [];

    // Check primary solution
    if (this.movesMatch(moves, primarySolution)) return true;

    // Check alternative solutions
    return alternativeSolutions.some((altSolution) => this.movesMatch(moves, altSolution));
  }

  private movesMatch(submitted: number[], expected: number[]): boolean {
    if (submitted.length !== expected.length) return false;
    return submitted.every((move, index) => move === expected[index]);
  }

  // Calculate score based on performance
  private calculateScore(challenge: DailyChallenge, success: boolean, timeSpent: number, hintsUsed: number): number {
    if (!success) return 0;

    let score = challenge.points;

    // Time bonus (faster = more points)
    const timeLimit = challenge.config.timeLimit || 300;
    const timeRatio = Math.max(0, (timeLimit - timeSpent) / timeLimit);
    const timeBonus = Math.floor(challenge.timeBonus * timeRatio);
    score += timeBonus;

    // Hint penalty
    const hintPenalty = challenge.hints.reduce((total, hint, index) => {
      return index < hintsUsed ? total + hint.cost : total;
    }, 0);
    score = Math.max(0, score - hintPenalty);

    return score;
  }

  // Update user statistics after successful challenge completion
  private updateUserStats(userId: string, challenge: DailyChallenge, attempt: ChallengeAttempt): void {
    const stats = this.getUserStats(userId);

    // Update basic stats
    stats.totalChallengesCompleted++;
    stats.totalPoints += attempt.score;
    stats.averageTime = this.calculateNewAverage(stats.averageTime, attempt.timeSpent, stats.totalChallengesCompleted);

    // Update difficulty stats
    if (!stats.difficultyStats[challenge.difficulty]) {
      stats.difficultyStats[challenge.difficulty] = { attempted: 0, completed: 0, averageScore: 0 };
    }
    const diffStats = stats.difficultyStats[challenge.difficulty];
    diffStats.completed++;
    diffStats.averageScore = this.calculateNewAverage(diffStats.averageScore, attempt.score, diffStats.completed);

    // Update type stats
    if (!stats.typeStats[challenge.type]) {
      stats.typeStats[challenge.type] = { attempted: 0, completed: 0, averageScore: 0 };
    }
    const typeStats = stats.typeStats[challenge.type];
    typeStats.completed++;
    typeStats.averageScore = this.calculateNewAverage(typeStats.averageScore, attempt.score, typeStats.completed);

    // Update streak
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    if (stats.lastChallengeDate === yesterday) {
      stats.currentStreak++;
    } else if (stats.lastChallengeDate !== today) {
      stats.currentStreak = 1;
    }

    stats.longestStreak = Math.max(stats.longestStreak, stats.currentStreak);
    stats.lastChallengeDate = today;
    stats.updatedAt = new Date();

    this.userStats.set(userId, stats);
  }

  private calculateNewAverage(currentAverage: number, newValue: number, count: number): number {
    return (currentAverage * (count - 1) + newValue) / count;
  }

  // Get all challenges (for admin/debugging)
  getAllChallenges(): DailyChallenge[] {
    return Array.from(this.challenges.values());
  }

  // Generate upcoming challenges (this would typically be done by a content management system)
  generateUpcomingChallenges(days: number = 30): DailyChallenge[] {
    const challenges: DailyChallenge[] = [];
    const today = new Date();

    for (let i = 0; i < days; i++) {
      const date = new Date(today.getTime() + i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];

      // Skip if challenge already exists for this date
      if (this.getChallengeByDate(dateStr)) continue;

      const challenge = this.generateChallengeForDate(dateStr, i);
      challenges.push(challenge);
    }

    return challenges;
  }

  private generateChallengeForDate(date: string, dayOffset: number): DailyChallenge {
    // This is a simplified generator - in production, you'd want more sophisticated content
    const difficulties: (1 | 2 | 3 | 4 | 5)[] = [1, 2, 3, 4, 5];
    const types: ('tactical' | 'endgame' | 'opening' | 'puzzle' | 'scenario')[] = [
      'tactical',
      'endgame',
      'opening',
      'puzzle',
      'scenario',
    ];

    const difficulty = difficulties[dayOffset % difficulties.length];
    const type = types[Math.floor(dayOffset / 7) % types.length];

    return this.createChallenge({
      date,
      title: `Daily Challenge ${date}`,
      description: `A ${difficulty}-star ${type} challenge for ${date}`,
      difficulty,
      type,
      boardState: this.generateRandomBoardState(difficulty),
      currentPlayer: dayOffset % 2 === 0 ? 'B' : 'W',
      config: {
        type,
        difficulty,
        maxAttempts: 3,
        timeLimit: difficulty * 60, // 1-5 minutes based on difficulty
        hints: this.generateHints(difficulty),
        solution: this.generateSolution(difficulty),
        tags: ['daily', type, `difficulty-${difficulty}`],
      },
      hints: this.generateHints(difficulty),
      solution: this.generateSolution(difficulty),
      tags: ['daily', type, `difficulty-${difficulty}`],
      points: difficulty * 100,
      timeBonus: difficulty * 50,
      isActive: true,
    });
  }

  private generateRandomBoardState(difficulty: number): string {
    // This is a simplified board generator - you'd want more sophisticated puzzle positions
    const baseState = '00000000000000000000000000000000000000000000000000000000000000000';
    // Add some pieces based on difficulty
    return baseState;
  }

  private generateHints(difficulty: number): ChallengeHint[] {
    const hints: ChallengeHint[] = [];

    if (difficulty >= 2) {
      hints.push({
        order: 1,
        text: 'Look for corner opportunities',
        cost: 10,
      });
    }

    if (difficulty >= 3) {
      hints.push({
        order: 2,
        text: 'Consider edge control strategies',
        cost: 15,
      });
    }

    if (difficulty >= 4) {
      hints.push({
        order: 3,
        text: 'Think about mobility and tempo',
        cost: 20,
      });
    }

    return hints;
  }

  private generateSolution(difficulty: number): ChallengeSolution {
    // This is a placeholder - you'd generate actual puzzle solutions
    return {
      moves: [27, 35, 43], // Example moves
      explanation: `This ${difficulty}-star puzzle demonstrates key tactical principles.`,
      alternativeSolutions: difficulty >= 3 ? [[28, 36, 44]] : undefined,
    };
  }
}

// Singleton instance
export const dailyChallengeModel = new DailyChallengeModel();
