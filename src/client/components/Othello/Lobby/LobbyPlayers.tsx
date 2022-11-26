import { Player } from '../../../../server/models/Game';
import { ConnectedPip } from '../../Players/ConnectedPip';
import './lobby-player.scss';

export const LobbyPlayer = ({ player, showConnected = true }: { player: Player; showConnected?: boolean }) => {
  return (
    <div className="lobby-player">
      <div className="name" title={player.name}>
        {player.name}
      </div>
      {showConnected ? <ConnectedPip connected={player.connected} small /> : null}
    </div>
  );
};

interface LobbyPlayersProps {
  players: { [userId: string]: Player };
}
export const LobbyPlayers = ({ players }: LobbyPlayersProps) => {
  return (
    <div className="player-wrapper">
      <h2>Players:</h2>
      {Object.keys(players).map((userId) => (
        <LobbyPlayer key={userId} player={players[userId]} />
      ))}
    </div>
  );
};
