import React from 'react';
import './game-piece.scss';

interface GamePieceProps {
  color: 'black' | 'white';
  size?: 'small' | 'medium' | 'large';
  className?: string;
  'data-testid'?: string;
}

export const GamePiece = ({ color, size = 'medium', className = '', 'data-testid': testId }: GamePieceProps) => {
  return (
    <div className={`game-piece ${color} ${size} ${className}`} data-testid={testId}>
      <div className="piece-highlight" />
    </div>
  );
};