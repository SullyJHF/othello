import { Database } from '../database/Database';
import { ChallengeConfig } from '../../shared/types/gameModeTypes';

export interface DailyChallenge {
  id: string;
  date: string; // YYYY-MM-DD format
  title: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  type: 'tactical' | 'endgame' | 'opening' | 'puzzle' | 'scenario';
  boardState: string; // Starting board position
  currentPlayer: 'B' | 'W';
  config: ChallengeConfig;
  hints: Array<{ order: number; text: string; cost: number }>;
  solution: {
    moves: number[];
    explanation: string;
    alternativeSolutions?: number[][];
  };
  tags: string[];
  points: number; // Base points for completion
  timeBonus: number; // Bonus points for quick completion
  createdAt: Date;
  isActive: boolean;
}

export class DatabaseDailyChallengeService {
  constructor(private db: Database) {}

  // Get today's challenge from database
  async getTodaysChallenge(): Promise<DailyChallenge | null> {
    const today = new Date().toISOString().split('T')[0];
    console.log('getTodaysChallenge called for date:', today);

    try {
      const result = await this.db.query('SELECT * FROM daily_challenges WHERE date = $1 AND is_active = true', [
        today,
      ]);

      if (result.rows.length === 0) {
        console.log('No challenge found for today:', today);
        return null;
      }

      const challenge = this.transformDbRowToChallenge(result.rows[0]);
      console.log('Found challenge for today:', challenge.title);
      console.log('Challenge object:', JSON.stringify(challenge, null, 2));
      return challenge;
    } catch (error) {
      console.error("Error fetching today's challenge:", error);
      return null;
    }
  }

  // Get challenge by specific date (only allows current or past dates)
  async getChallengeByDate(date: string): Promise<DailyChallenge | null> {
    const today = new Date().toISOString().split('T')[0];

    // Prevent access to future challenges
    if (date > today) {
      console.log('Attempted to access future challenge:', date, 'today:', today);
      return null;
    }

    try {
      const result = await this.db.query('SELECT * FROM daily_challenges WHERE date = $1 AND is_active = true', [date]);

      if (result.rows.length === 0) {
        return null;
      }

      return this.transformDbRowToChallenge(result.rows[0]);
    } catch (error) {
      console.error('Error fetching challenge by date:', error);
      return null;
    }
  }

  // Get challenge by ID
  async getChallengeById(challengeId: string): Promise<DailyChallenge | null> {
    try {
      const result = await this.db.query('SELECT * FROM daily_challenges WHERE id = $1 AND is_active = true', [
        challengeId,
      ]);

      if (result.rows.length === 0) {
        return null;
      }

      return this.transformDbRowToChallenge(result.rows[0]);
    } catch (error) {
      console.error('Error fetching challenge by ID:', error);
      return null;
    }
  }

  // Submit a challenge attempt
  async submitAttempt(
    challengeId: string,
    userId: string,
    moves: number[],
    timeSpent: number,
    hintsUsed: number = 0,
  ): Promise<{ success: boolean; score: number; attemptsRemaining: number } | null> {
    try {
      // Get the challenge
      const challengeResult = await this.db.query('SELECT * FROM daily_challenges WHERE id = $1', [challengeId]);

      if (challengeResult.rows.length === 0) {
        return null;
      }

      const challenge = this.transformDbRowToChallenge(challengeResult.rows[0]);

      // Check existing attempts
      const attemptsResult = await this.db.query(
        'SELECT attempt_number FROM user_challenge_attempts WHERE challenge_id = $1 AND user_id = $2 ORDER BY attempt_number DESC LIMIT 1',
        [challengeId, userId],
      );

      const attemptNumber = attemptsResult.rows.length > 0 ? attemptsResult.rows[0].attempt_number + 1 : 1;

      // Check if user has exceeded max attempts
      if (attemptNumber > challenge.config.maxAttempts) {
        return { success: false, score: 0, attemptsRemaining: 0 };
      }

      // Validate solution
      const success = this.validateSolution(challenge, moves);
      const score = success ? this.calculateScore(challenge, timeSpent, hintsUsed) : 0;

      // Record the attempt
      await this.db.query(
        `INSERT INTO user_challenge_attempts 
         (user_id, challenge_id, attempt_number, moves_made, final_board_state, time_taken, is_successful, hints_used)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          userId,
          challengeId,
          attemptNumber,
          JSON.stringify(moves),
          JSON.stringify({ moves }), // simplified final state
          timeSpent,
          success,
          hintsUsed,
        ],
      );

      // Update user progress
      if (success) {
        await this.updateUserProgress(userId, challengeId, attemptNumber, timeSpent, score);
      }

      const attemptsRemaining = Math.max(0, challenge.config.maxAttempts - attemptNumber);

      return { success, score, attemptsRemaining };
    } catch (error) {
      console.error('Error submitting challenge attempt:', error);
      return null;
    }
  }

  // Get user's attempts for a challenge
  async getUserAttempts(challengeId: string, userId: string): Promise<any[]> {
    try {
      const result = await this.db.query(
        'SELECT * FROM user_challenge_attempts WHERE challenge_id = $1 AND user_id = $2 ORDER BY attempt_number',
        [challengeId, userId],
      );

      return result.rows;
    } catch (error) {
      console.error('Error fetching user attempts:', error);
      return [];
    }
  }

  // Check if user has already completed today's challenge
  async hasUserCompletedToday(userId: string): Promise<boolean> {
    const todaysChallenge = await this.getTodaysChallenge();
    if (!todaysChallenge) return false;

    try {
      const result = await this.db.query(
        'SELECT id FROM user_challenge_attempts WHERE challenge_id = $1 AND user_id = $2 AND is_successful = true LIMIT 1',
        [todaysChallenge.id, userId],
      );

      return result.rows.length > 0;
    } catch (error) {
      console.error('Error checking if user completed today:', error);
      return false;
    }
  }

  // Get user's remaining attempts for today's challenge
  async getRemainingAttempts(userId: string): Promise<number> {
    const todaysChallenge = await this.getTodaysChallenge();
    if (!todaysChallenge) return 0;

    try {
      const result = await this.db.query(
        'SELECT COUNT(*) as count FROM user_challenge_attempts WHERE challenge_id = $1 AND user_id = $2',
        [todaysChallenge.id, userId],
      );

      const attemptsUsed = parseInt(result.rows[0].count);
      return Math.max(0, todaysChallenge.config.maxAttempts - attemptsUsed);
    } catch (error) {
      console.error('Error getting remaining attempts:', error);
      return 0;
    }
  }

  // Transform database row to DailyChallenge object
  private transformDbRowToChallenge(row: any): DailyChallenge {
    const boardStateData =
      typeof row.initial_board_state === 'string' ? JSON.parse(row.initial_board_state) : row.initial_board_state;

    const solutionMoves = typeof row.solution_moves === 'string' ? JSON.parse(row.solution_moves) : row.solution_moves;

    // Convert pieces array to board string for compatibility
    const boardState = Array.isArray(boardStateData.pieces)
      ? boardStateData.pieces.join('')
      : boardStateData.pieces || '';

    const challenge = {
      id: row.id.toString(),
      date: row.date.toISOString().split('T')[0],
      title: row.title,
      description: row.description,
      difficulty: row.difficulty_level,
      type: row.category,
      boardState,
      currentPlayer: 'B' as const, // Default to black, could be stored in DB
      config: {
        maxAttempts: row.max_attempts || 3,
        timeLimit: row.time_limit || null,
      },
      hints: row.hint_text ? [{ order: 1, text: row.hint_text, cost: 10 }] : [],
      solution: {
        moves: solutionMoves,
        explanation: row.explanation || '',
      },
      tags: row.tags || [],
      points: this.mapDifficultyToNumber(row.difficulty_level) * 100,
      timeBonus: this.mapDifficultyToNumber(row.difficulty_level) * 50,
      createdAt: new Date(row.created_at),
      isActive: row.is_active,
    };

    // Ensure the object is JSON serializable
    return JSON.parse(JSON.stringify(challenge));
  }

  // Map difficulty enum to number for compatibility
  private mapDifficultyToNumber(difficulty: string): number {
    const map = {
      beginner: 1,
      intermediate: 2,
      advanced: 3,
      expert: 4,
    };
    return map[difficulty as keyof typeof map] || 1;
  }

  // Validate if the submitted moves solve the challenge
  private validateSolution(challenge: DailyChallenge, moves: number[]): boolean {
    const primarySolution = challenge.solution.moves;

    // For now, just check if the moves match the primary solution
    // In a more sophisticated implementation, you'd simulate the game
    return this.movesMatch(moves, primarySolution);
  }

  private movesMatch(submitted: number[], expected: number[]): boolean {
    if (submitted.length !== expected.length) return false;
    return submitted.every((move, index) => move === expected[index]);
  }

  // Calculate score based on performance
  private calculateScore(challenge: DailyChallenge, timeSpent: number, hintsUsed: number): number {
    let score = challenge.points;

    // Time bonus (faster = more points)
    const timeLimit = challenge.config.timeLimit || 300;
    const timeRatio = Math.max(0, (timeLimit - timeSpent) / timeLimit);
    const timeBonus = Math.floor(challenge.timeBonus * timeRatio);
    score += timeBonus;

    // Hint penalty
    const hintPenalty = hintsUsed * 10; // Simple penalty
    score = Math.max(0, score - hintPenalty);

    return score;
  }

  // Update user progress after successful completion
  private async updateUserProgress(
    userId: string,
    challengeId: string,
    attemptNumber: number,
    timeSpent: number,
    score: number,
  ): Promise<void> {
    try {
      await this.db.query(
        `INSERT INTO user_challenge_progress 
         (user_id, challenge_id, attempts_made, is_completed, best_time, completion_date, total_time_spent)
         VALUES ($1, $2, $3, true, $4, CURRENT_TIMESTAMP, $5)
         ON CONFLICT (user_id, challenge_id)
         DO UPDATE SET
           attempts_made = $3,
           is_completed = true,
           best_time = LEAST(user_challenge_progress.best_time, $4),
           completion_date = CURRENT_TIMESTAMP,
           total_time_spent = user_challenge_progress.total_time_spent + $5`,
        [userId, challengeId, attemptNumber, timeSpent, timeSpent],
      );
    } catch (error) {
      console.error('Error updating user progress:', error);
    }
  }
}

// Create singleton instance with database connection
export const databaseDailyChallengeService = new DatabaseDailyChallengeService(Database.getInstance());
