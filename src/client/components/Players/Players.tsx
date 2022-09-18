import React from 'react';
import { Piece, Player } from '../../../server/models/Game';
import './players.scss';

interface PlayerProps {
  player: Player;
  piece: Piece;
  isLocalUser: boolean;
  isCurrentPlayer: boolean;
  top?: boolean;
}

export const PlayerComponent = ({ player, piece, isLocalUser, isCurrentPlayer, top = false }: PlayerProps) => {
  let name: string;
  if (player) {
    name = isLocalUser ? 'Me' : player.userId;
  }
  return (
    <div className={`player ${top ? 'top' : 'bottom'} ${isCurrentPlayer ? ' turn' : ''}`}>
      <div className={`piece ${piece === 'B' ? 'black' : 'white'}`} />
      <div className="name">{name}</div>
      <div className="pip-wrapper">
        <div className={`connected-pip ${player?.connected ? 'connected' : 'disconnected'}`} />
      </div>
    </div>
  );
};
