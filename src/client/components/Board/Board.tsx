import { SocketEvents } from '../../../shared/SocketEvents';
import { boardStringToArray } from '../../../shared/utils/boardUtils';
import { ClientBoardLogic } from '../../utils/boardLogic';
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
        <div className="place" data-testid={`board-cell-${placeId}`}>
          <GamePiece color="white" size="medium" data-testid={`piece-white-${placeId}`} />
        </div>
      );
    case 'B':
      return (
        <div className="place" data-testid={`board-cell-${placeId}`}>
          <GamePiece color="black" size="medium" data-testid={`piece-black-${placeId}`} />
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
          data-testid={`board-cell-${placeId}`}
          data-valid-move="true"
        />
      );
    case '.':
    default:
      return <div role="button" className="place clickable" data-testid={`board-cell-${placeId}`} />;
  }
};

interface BoardProps {
  gameId: string;
  boardState: string;
  isCurrentPlayer: boolean;
  manualControlMode?: boolean;
  currentPlayerId?: string;
  isChallenge?: boolean;
  onChallengeMove?: (placeId: number, newBoardState: string) => void;
}

export const Board = ({
  gameId,
  boardState,
  isCurrentPlayer,
  manualControlMode,
  currentPlayerId,
  isChallenge,
  onChallengeMove,
}: BoardProps) => {
  const { socket, localUserId } = useSocket();
  const places = boardStringToArray(boardState);

  const handlePlaceClick = (placeId: number) => {
    if (isChallenge) {
      // For challenge games, handle moves purely client-side using proper Othello rules
      if (onChallengeMove) {
        // Use client-side board logic to validate and execute the move
        const newBoardState = ClientBoardLogic.placePiece(boardState, placeId, 'B'); // Assume user is always black in challenges

        if (newBoardState) {
          // Update the board state with valid moves for the next turn (though in challenges this might not be needed)
          const finalBoardState = ClientBoardLogic.updateValidMoves(newBoardState, 'W');
          onChallengeMove(placeId, finalBoardState);
        } else {
          console.warn('Invalid challenge move attempted:', placeId);
        }
      }
      return;
    }

    // Normal game logic for non-challenge games
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
