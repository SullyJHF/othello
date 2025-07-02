import React from 'react';
import { SocketEvents } from '../../../shared/SocketEvents';
import { boardStringToArray } from '../../../shared/utils/boardUtils';
import { useSocket } from '../../utils/socketHooks';
import { GamePiece } from '../GamePiece/GamePiece';
import './board.scss';

interface PlaceProps {
  placeId: number;
  type: string;
  onClick: (placeId: number) => void;
}
const Place = ({ placeId, type, onClick }: PlaceProps) => {
  switch (type) {
    case 'W':
      return (
        <div className="place" data-testid="place">
          <GamePiece color="white" size="medium" data-testid="white" />
        </div>
      );
    case 'B':
      return (
        <div className="place" data-testid="place">
          <GamePiece color="black" size="medium" data-testid="black" />
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
          data-testid="place"
        ></div>
      );
    case '.':
    default:
      return <div role="button" className="place clickable" data-testid="place"></div>;
  }
};

interface BoardProps {
  gameId: string;
  boardState: string;
  isCurrentPlayer: boolean;
}

export const Board = ({ gameId, boardState, isCurrentPlayer }: BoardProps) => {
  const { socket, localUserId } = useSocket();
  const places = boardStringToArray(boardState);
  const handlePlaceClick = (placeId: number) => {
    if (isCurrentPlayer) {
      socket.emit(SocketEvents.PlacePiece, gameId, localUserId, placeId);
    }
  };
  return (
    <div id="board" data-testid="board">
      {places.map((place, i) => (
        <Place key={`${i}-${place}`} placeId={i} type={place} onClick={handlePlaceClick} />
      ))}
    </div>
  );
};
