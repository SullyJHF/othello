import { ChallengeConfig } from '../../shared/types/gameModeTypes';
import { dailyChallengeModel, DailyChallenge, ChallengeAttempt, UserChallengeStats } from '../models/DailyChallenge';

export class DailyChallengeService {
  // Get today's challenge
  async getTodaysChallenge(): Promise<DailyChallenge | null> {
    const challenge = dailyChallengeModel.getTodaysChallenge();

    // If no challenge exists for today, generate one
    if (!challenge) {
      const today = new Date().toISOString().split('T')[0];
      return this.generateChallengeForDate(today);
    }

    return challenge;
  }

  // Get challenge by specific date
  async getChallengeByDate(date: string): Promise<DailyChallenge | null> {
    return dailyChallengeModel.getChallengeByDate(date);
  }

  // Submit a challenge attempt
  async submitAttempt(
    challengeId: string,
    userId: string,
    moves: number[],
    timeSpent: number,
    hintsUsed: number = 0,
  ): Promise<ChallengeAttempt | null> {
    return dailyChallengeModel.submitAttempt(challengeId, userId, moves, timeSpent, hintsUsed);
  }

  // Get user's attempts for a challenge
  async getUserAttempts(challengeId: string, userId: string): Promise<ChallengeAttempt[]> {
    return dailyChallengeModel.getUserAttempts(challengeId, userId);
  }

  // Get user's challenge statistics
  async getUserStats(userId: string): Promise<UserChallengeStats> {
    return dailyChallengeModel.getUserStats(userId);
  }

  // Check if user has already completed today's challenge
  async hasUserCompletedToday(userId: string): Promise<boolean> {
    const todaysChallenge = await this.getTodaysChallenge();
    if (!todaysChallenge) return false;

    const attempts = await this.getUserAttempts(todaysChallenge.id, userId);
    return attempts.some((attempt) => attempt.success);
  }

  // Get user's remaining attempts for today's challenge
  async getRemainingAttempts(userId: string): Promise<number> {
    const todaysChallenge = await this.getTodaysChallenge();
    if (!todaysChallenge) return 0;

    const attempts = await this.getUserAttempts(todaysChallenge.id, userId);
    const maxAttempts = todaysChallenge.config.maxAttempts;

    return Math.max(0, maxAttempts - attempts.length);
  }

  // Generate content for upcoming challenges
  async generateUpcomingChallenges(days: number = 7): Promise<DailyChallenge[]> {
    return dailyChallengeModel.generateUpcomingChallenges(days);
  }

  // Generate a specific challenge for a date
  private async generateChallengeForDate(date: string): Promise<DailyChallenge> {
    // Parse date to determine challenge characteristics
    const dateObj = new Date(date);
    const dayOfYear = Math.floor(
      (dateObj.getTime() - new Date(dateObj.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24),
    );

    return this.createCustomChallenge(date, dayOfYear);
  }

  // Create custom challenge with more sophisticated content
  private createCustomChallenge(date: string, dayOffset: number): DailyChallenge {
    const challengeTemplates = this.getChallengeTemplates();
    const template = challengeTemplates[dayOffset % challengeTemplates.length];

    const challenge = dailyChallengeModel.createChallenge({
      date,
      title: template.title.replace('{date}', date),
      description: template.description,
      difficulty: template.difficulty,
      type: template.type,
      boardState: template.boardState,
      currentPlayer: template.currentPlayer,
      config: template.config,
      hints: template.hints,
      solution: template.solution,
      tags: [...template.tags, 'daily'],
      points: template.difficulty * 100,
      timeBonus: template.difficulty * 50,
      isActive: true,
    });

    return challenge;
  }

  // Get predefined challenge templates
  private getChallengeTemplates(): Array<
    Omit<DailyChallenge, 'id' | 'date' | 'createdAt' | 'isActive' | 'points' | 'timeBonus'>
  > {
    return [
      // Beginner tactical challenge
      {
        title: 'Corner Tactics - {date}',
        description: 'Master the art of corner control in this beginner-friendly tactical puzzle.',
        difficulty: 1,
        type: 'tactical',
        boardState: '0000000000000000000000000WB000000BW000000000000000000000000000000',
        currentPlayer: 'B',
        config: {
          type: 'tactical',
          difficulty: 1,
          maxAttempts: 5,
          timeLimit: 180,
          hints: [
            { order: 1, text: 'Look for moves that secure corners', cost: 5 },
            { order: 2, text: 'Corners cannot be flipped by opponents', cost: 10 },
          ],
          solution: {
            moves: [0, 7, 56, 63],
            explanation: 'Securing all four corners gives you unflippable pieces and strong board control.',
          },
          tags: ['beginner', 'corners', 'tactical'],
        },
        hints: [
          { order: 1, text: 'Look for moves that secure corners', cost: 5 },
          { order: 2, text: 'Corners cannot be flipped by opponents', cost: 10 },
        ],
        solution: {
          moves: [0, 7, 56, 63],
          explanation: 'Securing all four corners gives you unflippable pieces and strong board control.',
        },
        tags: ['beginner', 'corners', 'tactical'],
      },

      // Intermediate edge control
      {
        title: 'Edge Mastery - {date}',
        description: 'Learn advanced edge control techniques in this intermediate challenge.',
        difficulty: 2,
        type: 'tactical',
        boardState: '0000000000BBBB000WBBBB000WBBWB000WBBWB000BBWB000BBWW000000000000000000',
        currentPlayer: 'W',
        config: {
          type: 'tactical',
          difficulty: 2,
          maxAttempts: 4,
          timeLimit: 240,
          hints: [
            { order: 1, text: 'Control the edges to limit opponent mobility', cost: 10 },
            { order: 2, text: 'Look for moves that create edge stability', cost: 15 },
          ],
          solution: {
            moves: [1, 8, 15],
            explanation: 'Edge control restricts opponent options and builds toward corner acquisition.',
            alternativeSolutions: [[2, 9, 16]],
          },
          tags: ['intermediate', 'edges', 'mobility'],
        },
        hints: [
          { order: 1, text: 'Control the edges to limit opponent mobility', cost: 10 },
          { order: 2, text: 'Look for moves that create edge stability', cost: 15 },
        ],
        solution: {
          moves: [1, 8, 15],
          explanation: 'Edge control restricts opponent options and builds toward corner acquisition.',
          alternativeSolutions: [[2, 9, 16]],
        },
        tags: ['intermediate', 'edges', 'mobility'],
      },

      // Advanced endgame
      {
        title: 'Endgame Precision - {date}',
        description: 'Navigate complex endgame scenarios with perfect technique.',
        difficulty: 3,
        type: 'endgame',
        boardState: 'BBBBBBBBWWWWWBBBWWWWWBBBWWWWWBBBWWWWWBBBWWWBBBBBWWBBBBBBBWWBBBBBB0WBBBBB',
        currentPlayer: 'B',
        config: {
          type: 'endgame',
          difficulty: 3,
          maxAttempts: 3,
          timeLimit: 300,
          hints: [
            { order: 1, text: 'Count the exact number of moves remaining', cost: 15 },
            { order: 2, text: 'Every move matters in the endgame', cost: 20 },
            { order: 3, text: 'Look for moves that maximize your final score', cost: 25 },
          ],
          solution: {
            moves: [56],
            explanation: 'In endgame positions, precise calculation is essential for optimal play.',
          },
          tags: ['advanced', 'endgame', 'calculation'],
        },
        hints: [
          { order: 1, text: 'Count the exact number of moves remaining', cost: 15 },
          { order: 2, text: 'Every move matters in the endgame', cost: 20 },
          { order: 3, text: 'Look for moves that maximize your final score', cost: 25 },
        ],
        solution: {
          moves: [56],
          explanation: 'In endgame positions, precise calculation is essential for optimal play.',
        },
        tags: ['advanced', 'endgame', 'calculation'],
      },

      // Expert puzzle
      {
        title: 'Master Puzzle - {date}',
        description: 'Only true masters can solve this expert-level strategic puzzle.',
        difficulty: 4,
        type: 'puzzle',
        boardState: 'BWBWBWBWWBWBWBWBBWBWBWBWWBWBWBWBBWBWBWBWWBWBWBWBBWBWBWBWWBWBWBWB0000000',
        currentPlayer: 'B',
        config: {
          type: 'puzzle',
          difficulty: 4,
          maxAttempts: 2,
          timeLimit: 420,
          hints: [
            { order: 1, text: 'This position requires deep calculation', cost: 20 },
            { order: 2, text: 'Consider all forcing moves first', cost: 30 },
            { order: 3, text: 'The solution involves a tactical sequence', cost: 40 },
          ],
          solution: {
            moves: [56, 57, 58, 59],
            explanation: 'Expert puzzles test your ability to find complex tactical sequences under pressure.',
            alternativeSolutions: [[60, 61, 62, 63]],
          },
          tags: ['expert', 'puzzle', 'tactics'],
        },
        hints: [
          { order: 1, text: 'This position requires deep calculation', cost: 20 },
          { order: 2, text: 'Consider all forcing moves first', cost: 30 },
          { order: 3, text: 'The solution involves a tactical sequence', cost: 40 },
        ],
        solution: {
          moves: [56, 57, 58, 59],
          explanation: 'Expert puzzles test your ability to find complex tactical sequences under pressure.',
          alternativeSolutions: [[60, 61, 62, 63]],
        },
        tags: ['expert', 'puzzle', 'tactics'],
      },

      // Grandmaster scenario
      {
        title: 'Grandmaster Challenge - {date}',
        description: 'The ultimate test of Othello mastery. Can you find the winning line?',
        difficulty: 5,
        type: 'scenario',
        boardState: 'BBWWBBWWBWWBBWWBWWBBWWBWWWBBWWBWWWBBWWBWWWBBWWBWWBBWWBWWBBWWBBWW0000',
        currentPlayer: 'W',
        config: {
          type: 'scenario',
          difficulty: 5,
          maxAttempts: 1,
          timeLimit: 600,
          hints: [
            { order: 1, text: 'This is a theoretical winning position', cost: 50 },
            { order: 2, text: 'Perfect play is required from both sides', cost: 75 },
            { order: 3, text: 'The key move unlocks the winning sequence', cost: 100 },
          ],
          solution: {
            moves: [60, 61, 62, 63],
            explanation:
              'Grandmaster challenges represent the pinnacle of Othello theory and require perfect calculation.',
          },
          tags: ['grandmaster', 'theory', 'perfection'],
        },
        hints: [
          { order: 1, text: 'This is a theoretical winning position', cost: 50 },
          { order: 2, text: 'Perfect play is required from both sides', cost: 75 },
          { order: 3, text: 'The key move unlocks the winning sequence', cost: 100 },
        ],
        solution: {
          moves: [60, 61, 62, 63],
          explanation:
            'Grandmaster challenges represent the pinnacle of Othello theory and require perfect calculation.',
        },
        tags: ['grandmaster', 'theory', 'perfection'],
      },
    ];
  }

  // Get global leaderboard for challenges
  async getGlobalLeaderboard(limit: number = 50): Promise<Array<UserChallengeStats & { rank: number }>> {
    const allStats = Array.from(dailyChallengeModel['userStats'].values());

    // Sort by total points, then by current streak, then by completion count
    const sortedStats = allStats.sort((a, b) => {
      if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
      if (b.currentStreak !== a.currentStreak) return b.currentStreak - a.currentStreak;
      return b.totalChallengesCompleted - a.totalChallengesCompleted;
    });

    return sortedStats.slice(0, limit).map((stats, index) => ({
      ...stats,
      rank: index + 1,
    }));
  }

  // Initialize the service with some default challenges
  async initialize(): Promise<void> {
    // Generate challenges for the next 30 days
    await this.generateUpcomingChallenges(30);

    // Ensure today's challenge exists
    await this.getTodaysChallenge();
  }
}

// Singleton instance
export const dailyChallengeService = new DailyChallengeService();
