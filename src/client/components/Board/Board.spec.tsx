import React from 'react';
import { render, screen, within } from '../../utils/jestUtils';
import { Board } from './Board';

describe('Board', () => {
  it('Renders the pieces in the correct place 1', () => {
    const state = `........
........
B....W..
B..W....
..W..B..
........
........
B....W..`;
    render(<Board boardState={state} />);
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
    render(<Board boardState={state} />);
    expect(screen.getAllByTestId('place')).toHaveLength(6);
    for (const elm of screen.getAllByTestId('place')) {
      expect(elm).toContainHTML('');
    }
  });
});
