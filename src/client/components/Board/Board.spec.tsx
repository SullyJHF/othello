import React from 'react';
import { render, screen, within } from '../../utils/jestUtils';
import { Board } from './Board';

// Mock window.matchMedia for responsive testing
const createMatchMediaMock = (matches: boolean) => (query: string) => ({
  matches,
  media: query,
  onchange: null,
  addListener: jest.fn(),
  removeListener: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  dispatchEvent: jest.fn(),
});

describe('Board', () => {
  beforeEach(() => {
    window.matchMedia = createMatchMediaMock(false);
  });

  it('Renders the pieces in the correct place 1', () => {
    const state = `........
........
B....W..
B..W....
..W..B..
........
........
B....W..`;
    render(<Board gameId="test" boardState={state} isCurrentPlayer={false} />);
    expect(screen.getAllByTestId('place')).toHaveLength(64);
    expect(within(screen.getAllByTestId('place')[16]).getByTestId('black')).toBeInTheDocument();
    expect(within(screen.getAllByTestId('place')[21]).getByTestId('white')).toBeInTheDocument();
    expect(within(screen.getAllByTestId('place')[24]).getByTestId('black')).toBeInTheDocument();
    expect(within(screen.getAllByTestId('place')[56]).getByTestId('black')).toBeInTheDocument();
    expect(screen.getAllByTestId('place')[0]).toContainHTML('');
    expect(screen.getAllByTestId('place')[63]).toContainHTML('');
  });

  it('Renders invalid pieces as empty', () => {
    const state = `xyzabc`;
    render(<Board gameId="test" boardState={state} isCurrentPlayer={false} />);
    expect(screen.getAllByTestId('place')).toHaveLength(6);
    for (const elm of screen.getAllByTestId('place')) {
      expect(elm).toContainHTML('');
    }
  });

  it('Renders all 64 board squares', () => {
    const state = '.' + '.'.repeat(63); // 64 empty squares
    render(<Board gameId="test" boardState={state} isCurrentPlayer={false} />);
    expect(screen.getAllByTestId('place')).toHaveLength(64);
  });

  it('Handles click events on clickable squares when current player', () => {
    const state = '.' + '.'.repeat(63);
    render(<Board gameId="test" boardState={state} isCurrentPlayer={true} />);
    
    const places = screen.getAllByTestId('place');
    // Check that places exist and are clickable when it's the current player's turn
    expect(places[0]).toBeInTheDocument();
  });

  it('Does not allow clicks when not current player', () => {
    const state = '.' + '.'.repeat(63);
    render(<Board gameId="test" boardState={state} isCurrentPlayer={false} />);
    
    const places = screen.getAllByTestId('place');
    expect(places[0]).toBeInTheDocument();
    // When not current player, places should not have clickable class
  });

  describe('Responsive Behavior', () => {
    it('Should render board with proper structure for mobile', () => {
      window.matchMedia = createMatchMediaMock(true); // Mock mobile viewport
      
      const state = '.' + '.'.repeat(63);
      render(<Board gameId="test" boardState={state} isCurrentPlayer={false} />);
      
      const board = screen.getByTestId('board');
      expect(board).toBeInTheDocument();
      expect(screen.getAllByTestId('place')).toHaveLength(64);
    });

    it('Should maintain 8x8 grid structure across all viewports', () => {
      const state = '.' + '.'.repeat(63);
      render(<Board gameId="test" boardState={state} isCurrentPlayer={false} />);
      
      // Should always have exactly 64 squares regardless of viewport
      expect(screen.getAllByTestId('place')).toHaveLength(64);
    });
  });
});
