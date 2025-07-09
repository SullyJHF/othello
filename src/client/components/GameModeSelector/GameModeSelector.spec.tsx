import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GameModeSelector } from './GameModeSelector';
import { GameModeProvider } from '../../contexts/GameModeContext';
import { GameMode, GameModeCategory } from '../../../shared/types/gameModeTypes';

// Mock the socket hook
vi.mock('../../utils/socketHooks', () => ({
  useSocket: () => ({
    socket: {
      emit: vi.fn(),
      on: vi.fn(),
      off: vi.fn(),
    },
  }),
}));

// Mock game modes data
const mockGameModes: GameMode[] = [
  {
    id: 'bullet-1-1',
    name: 'Bullet 1+1',
    description: 'Fast-paced bullet game with 1 minute + 1 second increment',
    category: 'timer' as GameModeCategory,
    config: {
      timer: {
        type: 'increment',
        initialTime: 60,
        increment: 1,
        delay: 0,
        maxTime: 180,
        lowTimeWarning: 10,
        criticalTimeWarning: 5,
        autoFlagOnTimeout: true,
        pauseOnDisconnect: false,
        maxPauseTime: 0,
        timeoutAction: 'forfeit',
      },
    },
    isActive: true,
    isDefault: false,
    minimumPlayers: 2,
    maximumPlayers: 2,
    estimatedDuration: 5,
    difficultyLevel: 'advanced',
    tags: ['bullet', 'timer', 'fast'],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    id: 'blitz-3-2',
    name: 'Blitz 3+2',
    description: 'Blitz game with 3 minutes + 2 second increment',
    category: 'timer' as GameModeCategory,
    config: {
      timer: {
        type: 'increment',
        initialTime: 180,
        increment: 2,
        delay: 0,
        maxTime: 300,
        lowTimeWarning: 30,
        criticalTimeWarning: 10,
        autoFlagOnTimeout: true,
        pauseOnDisconnect: true,
        maxPauseTime: 60,
        timeoutAction: 'forfeit',
      },
    },
    isActive: true,
    isDefault: true,
    minimumPlayers: 2,
    maximumPlayers: 2,
    estimatedDuration: 10,
    difficultyLevel: 'intermediate',
    tags: ['blitz', 'timer', 'popular'],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    id: 'mini-board-6x6',
    name: 'Mini Board 6x6',
    description: 'Compact Othello on a 6x6 board',
    category: 'board-variant' as GameModeCategory,
    config: {
      board: {
        width: 6,
        height: 6,
        startingPosition: '',
        validSizes: [6],
        customRules: [],
      },
    },
    isActive: true,
    isDefault: false,
    minimumPlayers: 2,
    maximumPlayers: 2,
    estimatedDuration: 15,
    difficultyLevel: 'beginner',
    tags: ['mini', 'board-variant', 'quick'],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    id: 'large-board-10x10',
    name: 'Large Board 10x10',
    description: 'Extended Othello on a 10x10 board',
    category: 'board-variant' as GameModeCategory,
    config: {
      board: {
        width: 10,
        height: 10,
        startingPosition: '',
        validSizes: [10],
        customRules: [],
      },
    },
    isActive: true,
    isDefault: false,
    minimumPlayers: 2,
    maximumPlayers: 2,
    estimatedDuration: 30,
    difficultyLevel: 'intermediate',
    tags: ['large', 'board-variant', 'extended'],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    id: 'daily-challenge-tactical',
    name: 'Daily Tactical Challenge',
    description: "Today's tactical puzzle challenge",
    category: 'daily-challenge' as GameModeCategory,
    config: {
      challenge: {
        type: 'tactical',
        difficulty: 3,
        maxAttempts: 3,
        timeLimit: 300,
        hints: [],
        solution: {
          moves: [],
          explanation: '',
        },
        tags: ['daily', 'tactical'],
      },
    },
    isActive: true,
    isDefault: false,
    minimumPlayers: 2,
    maximumPlayers: 2,
    estimatedDuration: 15,
    difficultyLevel: 'intermediate',
    tags: ['daily', 'challenge', 'tactical'],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
];

// Mock GameModeContext
let mockGameModeContext = {
  gameModes: mockGameModes,
  loading: false,
  error: null,
  selectedGameMode: null,
  setSelectedGameMode: vi.fn(),
  refreshGameModes: vi.fn(),
  getGameModesByCategory: (category: GameModeCategory) => mockGameModes.filter((mode) => mode.category === category),
  getDefaultGameMode: () => mockGameModes.find((mode) => mode.isDefault) || null,
};

vi.mock('../../contexts/GameModeContext', () => ({
  GameModeProvider: ({ children }: { children: React.ReactNode }) => children,
  useGameModes: () => mockGameModeContext,
}));

describe('GameModeSelector', () => {
  let mockOnModeSelect: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockOnModeSelect = vi.fn();
    vi.clearAllMocks();

    // Reset mock context to default state
    mockGameModeContext = {
      gameModes: mockGameModes,
      loading: false,
      error: null,
      selectedGameMode: null,
      setSelectedGameMode: vi.fn(),
      refreshGameModes: vi.fn(),
      getGameModesByCategory: (category: GameModeCategory) =>
        mockGameModes.filter((mode) => mode.category === category),
      getDefaultGameMode: () => mockGameModes.find((mode) => mode.isDefault) || null,
    };
  });

  const renderComponent = (props: any = {}) => {
    return render(
      <GameModeProvider>
        <GameModeSelector onModeSelect={mockOnModeSelect} showDescription={true} {...props} />
      </GameModeProvider>,
    );
  };

  describe('Step 1: Category Selection', () => {
    it('should render category selection step initially', () => {
      renderComponent();

      expect(screen.getByText('Choose Game Type')).toBeInTheDocument();
      expect(screen.getByText('What type of game would you like to play?')).toBeInTheDocument();
      expect(screen.getByText('Timed Games')).toBeInTheDocument();
      expect(screen.getByText('Board Sizes')).toBeInTheDocument();
      expect(screen.getByText('Special Rules')).toBeInTheDocument();
      expect(screen.getByText('Daily Challenge')).toBeInTheDocument();
    });

    it('should show correct category counts', () => {
      renderComponent();

      expect(screen.getAllByText('2 options')).toHaveLength(2); // Timer modes and Board variants
      expect(screen.getByText('0 options')).toBeInTheDocument(); // Special rules
      expect(screen.getByText('1 options')).toBeInTheDocument(); // Daily challenge
    });

    it('should show step indicator with step 1 active', () => {
      renderComponent();

      const stepIndicator = screen.getByText('1').closest('.step');
      expect(stepIndicator).toHaveClass('active');
      expect(screen.getByText('2').closest('.step')).not.toHaveClass('active');
      expect(screen.getByText('3').closest('.step')).not.toHaveClass('active');
    });

    it('should not show breadcrumb on initial step', () => {
      renderComponent();

      expect(screen.queryByText('← Back')).not.toBeInTheDocument();
    });
  });

  describe('Step 2: Mode Selection', () => {
    it('should navigate to mode selection when category is selected', () => {
      renderComponent();

      fireEvent.click(screen.getByText('Timed Games'));

      expect(screen.getByText('Select Specific Mode')).toBeInTheDocument();
      expect(screen.getByText('Choose from available timer options:')).toBeInTheDocument();
    });

    it('should show filtered modes for selected category', () => {
      renderComponent();

      fireEvent.click(screen.getByText('Timed Games'));

      expect(screen.getByText('Bullet 1+1')).toBeInTheDocument();
      expect(screen.getByText('Blitz 3+2')).toBeInTheDocument();
      expect(screen.queryByText('Mini Board 6x6')).not.toBeInTheDocument();
    });

    it('should show breadcrumb with category name', () => {
      renderComponent();

      fireEvent.click(screen.getByText('Timed Games'));

      expect(screen.getByText('← Back')).toBeInTheDocument();
      expect(screen.getByText('Timed Games')).toBeInTheDocument();
    });

    it('should show step indicator with step 2 active', () => {
      renderComponent();

      fireEvent.click(screen.getByText('Timed Games'));

      expect(screen.getByText('1').closest('.step')).not.toHaveClass('active');
      expect(screen.getByText('2').closest('.step')).toHaveClass('active');
      expect(screen.getByText('3').closest('.step')).not.toHaveClass('active');
    });

    it('should show mode details in cards', () => {
      renderComponent();

      fireEvent.click(screen.getByText('Timed Games'));

      expect(screen.getByText('60s + 1s')).toBeInTheDocument();
      expect(screen.getByText('advanced')).toBeInTheDocument();
      expect(screen.getByText('180s + 2s')).toBeInTheDocument();
      expect(screen.getByText('intermediate')).toBeInTheDocument();
    });

    it('should go back to category selection when back button is clicked', () => {
      renderComponent();

      fireEvent.click(screen.getByText('Timed Games'));
      fireEvent.click(screen.getByText('← Back'));

      expect(screen.getByText('Choose Game Type')).toBeInTheDocument();
      expect(screen.getByText('1').closest('.step')).toHaveClass('active');
    });
  });

  describe('Step 3: Preview & Confirm', () => {
    it('should navigate to preview when mode is selected', () => {
      renderComponent();

      fireEvent.click(screen.getByText('Timed Games'));
      fireEvent.click(screen.getByText('Bullet 1+1'));

      expect(screen.getByText('Confirm Selection')).toBeInTheDocument();
      expect(screen.getByText('Review your game mode choice:')).toBeInTheDocument();
    });

    it('should show selected mode details in preview', () => {
      renderComponent();

      fireEvent.click(screen.getByText('Timed Games'));
      fireEvent.click(screen.getByText('Bullet 1+1'));

      expect(screen.getByText('Bullet 1+1')).toBeInTheDocument();
      expect(screen.getByText('Fast-paced bullet game with 1 minute + 1 second increment')).toBeInTheDocument();
      expect(screen.getByText('5 min')).toBeInTheDocument();
      expect(screen.getByText('60s + 1s')).toBeInTheDocument();
    });

    it('should show breadcrumb with full path', () => {
      renderComponent();

      fireEvent.click(screen.getByText('Timed Games'));
      fireEvent.click(screen.getByText('Bullet 1+1'));

      expect(screen.getByText('Timed Games > Bullet 1+1')).toBeInTheDocument();
    });

    it('should show step indicator with step 3 active', () => {
      renderComponent();

      fireEvent.click(screen.getByText('Timed Games'));
      fireEvent.click(screen.getByText('Bullet 1+1'));

      expect(screen.getByText('1').closest('.step')).not.toHaveClass('active');
      expect(screen.getByText('2').closest('.step')).not.toHaveClass('active');
      expect(screen.getByText('3').closest('.step')).toHaveClass('active');
    });

    it('should show mode tags', () => {
      renderComponent();

      fireEvent.click(screen.getByText('Timed Games'));
      fireEvent.click(screen.getByText('Bullet 1+1'));

      expect(screen.getByText('#bullet')).toBeInTheDocument();
      expect(screen.getByText('#timer')).toBeInTheDocument();
      expect(screen.getByText('#fast')).toBeInTheDocument();
    });

    it('should call onModeSelect when Select This Mode is clicked', () => {
      renderComponent();

      fireEvent.click(screen.getByText('Timed Games'));
      fireEvent.click(screen.getByText('Bullet 1+1'));
      fireEvent.click(screen.getByText('Select This Mode'));

      expect(mockOnModeSelect).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'bullet-1-1',
          name: 'Bullet 1+1',
        }),
      );
    });

    it('should go back to mode selection when back button is clicked', () => {
      renderComponent();

      fireEvent.click(screen.getByText('Timed Games'));
      fireEvent.click(screen.getByText('Bullet 1+1'));
      fireEvent.click(screen.getByText('← Back'));

      expect(screen.getByText('Select Specific Mode')).toBeInTheDocument();
      expect(screen.getByText('2').closest('.step')).toHaveClass('active');
    });
  });

  describe('Board Variant Category', () => {
    it('should show board variant modes when board category is selected', () => {
      renderComponent();

      fireEvent.click(screen.getByText('Board Sizes'));

      expect(screen.getByText('Choose from available board-variant options:')).toBeInTheDocument();
      expect(screen.getByText('Mini Board 6x6')).toBeInTheDocument();
      expect(screen.getByText('Large Board 10x10')).toBeInTheDocument();
      expect(screen.queryByText('Bullet 1+1')).not.toBeInTheDocument();
    });

    it('should show board details in preview', () => {
      renderComponent();

      fireEvent.click(screen.getByText('Board Sizes'));
      fireEvent.click(screen.getByText('Large Board 10x10'));

      expect(screen.getByText('Large Board 10x10')).toBeInTheDocument();
      expect(screen.getByText('Board:')).toBeInTheDocument();
      expect(screen.getByText('10x10')).toBeInTheDocument();
      expect(screen.getByText('30 min')).toBeInTheDocument();
    });
  });

  describe('Loading and Error States', () => {
    it('should show loading state', () => {
      mockGameModeContext.loading = true;
      renderComponent();

      expect(screen.getByText('Loading game modes...')).toBeInTheDocument();
    });

    it('should show error state', () => {
      mockGameModeContext.loading = false;
      mockGameModeContext.error = 'Failed to load game modes';
      renderComponent();

      expect(screen.getByText('Error loading game modes: Failed to load game modes')).toBeInTheDocument();
    });
  });

  describe('Empty Categories', () => {
    it('should show no modes message when category has no modes', () => {
      renderComponent();

      fireEvent.click(screen.getByText('Special Rules'));

      expect(screen.getByText('No game modes available in this category.')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper heading hierarchy', () => {
      renderComponent();

      expect(screen.getByRole('heading', { level: 3, name: 'Choose Game Type' })).toBeInTheDocument();

      fireEvent.click(screen.getByText('Timed Games'));
      expect(screen.getByRole('heading', { level: 3, name: 'Select Specific Mode' })).toBeInTheDocument();

      fireEvent.click(screen.getByText('Bullet 1+1'));
      expect(screen.getByRole('heading', { level: 3, name: 'Confirm Selection' })).toBeInTheDocument();
    });

    it('should have clickable buttons with proper labels', () => {
      renderComponent();

      fireEvent.click(screen.getByText('Timed Games'));
      expect(screen.getByRole('button', { name: '← Back' })).toBeInTheDocument();

      fireEvent.click(screen.getByText('Bullet 1+1'));
      expect(screen.getByRole('button', { name: 'Select This Mode' })).toBeInTheDocument();
    });
  });

  describe('Props', () => {
    it('should respect selectedModeId prop', () => {
      renderComponent({ selectedModeId: 'blitz-3-2' });

      // Since we're starting at category selection, selectedModeId should not affect the flow
      expect(screen.getByText('Choose Game Type')).toBeInTheDocument();
    });

    it('should respect showDescription prop', () => {
      renderComponent({ showDescription: false });

      fireEvent.click(screen.getByText('Timed Games'));

      // Mode cards should not show descriptions when showDescription is false
      expect(screen.queryByText('Fast-paced bullet game with 1 minute + 1 second increment')).not.toBeInTheDocument();
    });

    it('should respect compact prop', () => {
      const { container } = renderComponent({ compact: true });

      expect(container.querySelector('.game-mode-selector')).toHaveClass('compact');
    });
  });
});
