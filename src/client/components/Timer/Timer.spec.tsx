import { render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { PlayerTimerState } from '../../../server/models/Game';
import { Timer } from './Timer';

// Mock timer state for testing
const createMockTimerState = (overrides: Partial<PlayerTimerState> = {}): PlayerTimerState => ({
  userId: 'test-user',
  remainingTime: 300,
  isActive: false,
  lastUpdateTime: new Date(),
  totalMoveTime: 0,
  moveCount: 0,
  timeWarnings: [],
  isPaused: false,
  totalPausedTime: 0,
  ...overrides,
});

describe('Timer Component', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders timer display correctly', () => {
    const timerState = createMockTimerState({ remainingTime: 300 });

    render(<Timer timerState={timerState} isActive={false} />);

    expect(screen.getByText('5:00')).toBeInTheDocument();
    expect(screen.getByText('Inactive')).toBeInTheDocument();
  });

  it('displays active state correctly', () => {
    const timerState = createMockTimerState({ remainingTime: 180, isActive: true });

    render(<Timer timerState={timerState} isActive={true} />);

    expect(screen.getByText('3:00')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('displays paused state correctly', () => {
    const timerState = createMockTimerState({
      remainingTime: 120,
      isActive: false,
      isPaused: true,
    });

    render(<Timer timerState={timerState} isActive={false} />);

    expect(screen.getByText('2:00')).toBeInTheDocument();
    expect(screen.getByText('Paused')).toBeInTheDocument();
  });

  it('shows low time warning', () => {
    const timerState = createMockTimerState({ remainingTime: 45, isActive: true });

    render(<Timer timerState={timerState} isActive={true} showWarnings={true} />);

    expect(screen.getByText('⏰ Low time')).toBeInTheDocument();
  });

  it('shows critical time warning', () => {
    const timerState = createMockTimerState({ remainingTime: 10, isActive: true });

    render(<Timer timerState={timerState} isActive={true} showWarnings={true} />);

    expect(screen.getByText('⚠️ Time running out!')).toBeInTheDocument();
  });

  it('updates display time for active timers', async () => {
    const timerState = createMockTimerState({
      remainingTime: 60,
      isActive: true,
      lastUpdateTime: new Date(),
    });

    render(<Timer timerState={timerState} isActive={true} />);

    // Initially shows 1:00
    expect(screen.getByText('1:00')).toBeInTheDocument();

    // Fast-forward time
    vi.advanceTimersByTime(5000);

    // Should update to show less time
    await waitFor(() => {
      expect(screen.getByText('0:55')).toBeInTheDocument();
    });
  });

  it('does not render when timer state is null', () => {
    const { container } = render(<Timer timerState={null} isActive={false} />);

    expect(container.firstChild).toBeNull();
  });

  it('formats time correctly for seconds under 10', () => {
    const timerState = createMockTimerState({ remainingTime: 65 });

    render(<Timer timerState={timerState} isActive={false} />);

    expect(screen.getByText('1:05')).toBeInTheDocument();
  });

  it('handles zero time correctly', () => {
    const timerState = createMockTimerState({ remainingTime: 0 });

    render(<Timer timerState={timerState} isActive={false} />);

    expect(screen.getByText('0:00')).toBeInTheDocument();
  });

  it('applies correct CSS classes for different states', () => {
    const timerState = createMockTimerState({ remainingTime: 10, isActive: true });

    const { container } = render(<Timer timerState={timerState} isActive={true} showWarnings={true} />);

    const timerDiv = container.querySelector('.timer');
    expect(timerDiv).toHaveClass('timer', 'timer-medium', 'active', 'warning-critical');
  });

  it('applies custom className', () => {
    const timerState = createMockTimerState();

    const { container } = render(<Timer timerState={timerState} isActive={false} className="custom-class" />);

    const timerDiv = container.querySelector('.timer');
    expect(timerDiv).toHaveClass('custom-class');
  });

  it('displays correctly with different sizes', () => {
    const timerState = createMockTimerState();

    const { container } = render(<Timer timerState={timerState} isActive={false} size="large" />);

    const timerDiv = container.querySelector('.timer');
    expect(timerDiv).toHaveClass('timer-large');
  });

  it('hides status text for small size', () => {
    const timerState = createMockTimerState();

    render(<Timer timerState={timerState} isActive={false} size="small" />);

    expect(screen.queryByText('Inactive')).not.toBeInTheDocument();
  });
});
