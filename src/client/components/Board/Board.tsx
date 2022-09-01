import React from 'react';
import './board.scss';

interface PlaceProps {
  type: string;
}
const Place = ({ type }: PlaceProps) => {
  switch (type) {
    case '.':
      return <div className="place" data-testid="place"></div>;
    case 'W':
      return (
        <div className="place" data-testid="place">
          <div className="piece white" data-testid="white" />
        </div>
      );
    case 'B':
      return (
        <div className="place" data-testid="place">
          <div className="piece black" data-testid="black" />
        </div>
      );
    default:
      return <div className="place" data-testid="place"></div>;
  }
};

interface BoardProps {
  boardState: string;
}

export const Board = ({ boardState }: BoardProps) => {
  const places = boardState.split('\n').flatMap((row) => row.split(''));
  return (
    <div id="board">
      {places.map((place, i) => (
        <Place key={`${i}-${place}`} type={place} />
      ))}
    </div>
  );
};
