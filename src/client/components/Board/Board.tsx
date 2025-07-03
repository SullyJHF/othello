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
          tabIndex={0}
          onClick={(_e) => {
            onClick(placeId);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onClick(placeId);
            }
          }}
          data-testid="place"
        />
      );
    case '.':
    default:
      return <div role="button" className="place clickable" data-testid="place" />;
  }
};

interface BoardProps {
  gameId: string;
  boardState: string;
  isCurrentPlayer: boolean;
  manualControlMode?: boolean;
  currentPlayerId?: string;
}

export const Board = ({ gameId, boardState, isCurrentPlayer, manualControlMode, currentPlayerId }: BoardProps) => {
  const { socket, localUserId } = useSocket();
  const places = boardStringToArray(boardState);
  const handlePlaceClick = (placeId: number) => {
    if (!socket) return;

    if (manualControlMode && currentPlayerId) {
      // In manual control mode, make moves as the current player
      socket.emit(SocketEvents.PlacePiece, gameId, currentPlayerId, placeId);
    } else if (isCurrentPlayer) {
      // Normal mode - only allow moves when it's your turn
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
