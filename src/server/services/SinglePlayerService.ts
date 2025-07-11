/**
 * Single player game service that builds on existing debug infrastructure
 */

import { DummyGameOptions } from '../../shared/types/debugTypes';
import { GameMode } from '../../shared/types/gameModeTypes';
import { ConnectedUser } from '../models/UserManager';
import { createDummyGame, CreateDummyGameResponse } from './debugGameService';

export interface SinglePlayerGameOptions {
  userPiece: 'B' | 'W' | 'random';
  aiDifficulty: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  aiPersonality?: 'aggressive' | 'defensive' | 'balanced' | 'unpredictable';
  gameMode?: GameMode;
  isChallenge?: boolean;
  challengeId?: string;
}

export interface CreateSinglePlayerGameResponse extends CreateDummyGameResponse {
  aiOpponentName?: string;
  difficulty?: string;
}

/**
 * AI opponent names by difficulty level with personality variants
 */
const AI_OPPONENT_NAMES = {
  beginner: ['Rookie Robot', 'Learning Lily', 'Student Sam', 'Friendly Fred'],
  intermediate: ['Clever Cat', 'Tactical Turtle', 'Smart Steve', 'Balanced Betty'],
  advanced: ['Strategic Sphinx', 'Master Mike', 'Expert Emma', 'Wise Walter'],
  expert: ['Grandmaster Eagle', 'Perfect Phoenix', 'Champion Charlie', 'Elite Evelyn'],
} as const;

/**
 * Get AI opponent name based on difficulty and optional personality
 */
function getAIOpponentName(
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'expert',
  personality?: 'aggressive' | 'defensive' | 'balanced' | 'unpredictable',
): string {
  const names = AI_OPPONENT_NAMES[difficulty];

  // If personality is specified, try to match it to a suitable name
  if (personality) {
    switch (personality) {
      case 'aggressive':
        return names[0]; // First name for aggressive
      case 'defensive':
        return names[1]; // Second name for defensive
      case 'balanced':
        return names[2] || names[0]; // Third name for balanced, fallback to first
      case 'unpredictable':
        return names[3] || names[0]; // Fourth name for unpredictable, fallback to first
    }
  }

  // Default: randomly select from available names
  const randomIndex = Math.floor(Math.random() * names.length);
  return names[randomIndex];
}

/**
 * Create a single player game against AI opponent
 */
export function createSinglePlayerGame(
  realUser: ConnectedUser,
  options: SinglePlayerGameOptions,
): CreateSinglePlayerGameResponse {
  const aiOpponentName = getAIOpponentName(options.aiDifficulty, options.aiPersonality);

  // Convert single player options to dummy game options
  const dummyGameOptions: DummyGameOptions = {
    playerNames: {
      user: realUser.name,
      opponent: aiOpponentName,
    },
    userPiece: options.userPiece,
    opponentBehavior: options.aiDifficulty,
    aiPersonality: options.aiPersonality,
    startImmediately: true, // Single player games start immediately
    gameMode: options.gameMode,
  };

  // Create the dummy game using existing infrastructure
  const result = createDummyGame(realUser, dummyGameOptions);

  // Return enhanced response with AI information
  return {
    ...result,
    aiOpponentName,
    difficulty: options.aiDifficulty,
  };
}

/**
 * Create a practice game (no rating impact)
 */
export function createPracticeGame(
  realUser: ConnectedUser,
  options: Omit<SinglePlayerGameOptions, 'isChallenge' | 'challengeId'>,
): CreateSinglePlayerGameResponse {
  return createSinglePlayerGame(realUser, {
    ...options,
    isChallenge: false,
  });
}

/**
 * Create a daily challenge game
 */
export function createChallengeGame(
  realUser: ConnectedUser,
  challengeId: string,
  options: Omit<SinglePlayerGameOptions, 'isChallenge' | 'challengeId'>,
): CreateSinglePlayerGameResponse {
  return createSinglePlayerGame(realUser, {
    ...options,
    isChallenge: true,
    challengeId,
  });
}

/**
 * Get available AI difficulties with descriptions
 */
export function getAvailableAIDifficulties() {
  return [
    {
      id: 'beginner',
      name: 'Beginner',
      description: 'Perfect for learning the basics. Makes mostly random moves with occasional good choices.',
      icon: '🌱',
      estimatedRating: '600-800',
    },
    {
      id: 'intermediate',
      name: 'Intermediate',
      description: 'Good challenge for developing players. Focuses on captures and basic strategy.',
      icon: '🔧',
      estimatedRating: '900-1200',
    },
    {
      id: 'advanced',
      name: 'Advanced',
      description: 'Strong strategic play. Avoids common mistakes and plans ahead.',
      icon: '⚔️',
      estimatedRating: '1300-1600',
    },
    {
      id: 'expert',
      name: 'Expert',
      description: 'Formidable opponent with deep analysis. Only for the most skilled players!',
      icon: '👑',
      estimatedRating: '1700+',
    },
  ] as const;
}

/**
 * Get available AI personalities with descriptions
 */
export function getAvailableAIPersonalities() {
  return [
    {
      id: 'aggressive',
      name: 'Aggressive',
      description: 'Seeks to capture pieces and control the game tempo.',
      icon: '⚡',
    },
    {
      id: 'defensive',
      name: 'Defensive',
      description: 'Plays safely, focusing on board position and avoiding risks.',
      icon: '🛡️',
    },
    {
      id: 'balanced',
      name: 'Balanced',
      description: 'Well-rounded play that adapts to the game situation.',
      icon: '⚖️',
    },
    {
      id: 'unpredictable',
      name: 'Unpredictable',
      description: 'Mixes different strategies to keep you guessing.',
      icon: '🎲',
    },
  ] as const;
}
