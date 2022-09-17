import React from 'react';
import { useSocket } from '../../utils/socketHooks';
import './board.scss';

interface PlaceProps {
  placeId: number;
  type: string;
  onClick: (placeId: number) => void;
}
const Place = ({ placeId, type, onClick }: PlaceProps) => {
  switch (type) {
    case '.':
      return <div role="button" className="place clickable" data-testid="place"></div>;
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
    case '0':
      // clickable
      return (
        <div
          role="button"
          className="place clickable"
          onClick={(e) => {
            onClick(placeId);
          }}
          data-testid="place"></div>
      );
    default:
      return <div role="button" className="place clickable" data-testid="place"></div>;
  }
};

interface BoardProps {
  boardState: string;
  isCurrentPlayer: boolean;
}

export const Board = ({ boardState, isCurrentPlayer }: BoardProps) => {
  const { socket, localUserId } = useSocket();
  const places = boardState.split('\n').flatMap((row) => row.split(''));
  const handlePlaceClick = (placeId: number) => {
    if (isCurrentPlayer) {
      console.log(`Place ${placeId} clicked`);
    }
  };
  return (
    <div id="board">
      {places.map((place, i) => (
        <Place key={`${i}-${place}`} placeId={i} type={place} onClick={handlePlaceClick} />
      ))}
    </div>
  );
};
