import { Piece, Player, PlayerTimerState } from '../../../server/models/Game';
import { GamePiece } from '../GamePiece/GamePiece';
import { Timer } from '../Timer/Timer';
import { ConnectedPip } from './ConnectedPip';
import './players.scss';

interface RawPieceProps {
  piece: 'B' | 'W';
}

export const RawPiece = ({ piece }: RawPieceProps) => {
  return <GamePiece color={piece === 'B' ? 'black' : 'white'} size="large" />;
};

interface PlayerProps {
  player: Player;
  piece: Piece;
  isLocalUser: boolean;
  isCurrentPlayer: boolean;
  timerState?: PlayerTimerState | null;
  top?: boolean;
}

export const PlayerComponent = ({
  player,
  piece,
  isLocalUser,
  isCurrentPlayer,
  timerState,
  top = false,
}: PlayerProps) => {
  const name = player ? (isLocalUser ? `${player.name} (You)` : player.name) : 'Unknown Player';

  return (
    <div className={`player ${top ? 'top' : 'bottom'} ${isCurrentPlayer ? ' turn' : ''}`}>
      <div className="player-main">
        <GamePiece
          color={piece === 'B' ? 'black' : 'white'}
          size="large"
          className={isCurrentPlayer ? 'active-player' : ''}
        />
        <div className="player-info">
          <div className="name">{name}</div>
          {isCurrentPlayer && isLocalUser && <div className="turn-badge">YOUR TURN</div>}
        </div>
      </div>
      <ConnectedPip connected={player?.connected} />
      {timerState && (
        <Timer timerState={timerState} isActive={isCurrentPlayer} size="medium" className="player-timer" />
      )}
    </div>
  );
};
