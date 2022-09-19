import React from 'react';
import { Piece, Player } from '../../../server/models/Game';
import { ConnectedPip } from './ConnectedPip';
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
    name = isLocalUser ? 'Me' : player.name;
  }
  return (
    <div className={`player ${top ? 'top' : 'bottom'} ${isCurrentPlayer ? ' turn' : ''}`}>
      <div className={`piece ${piece === 'B' ? 'black' : 'white'}`} />
      <div className="name">{name}</div>
      <ConnectedPip connected={player?.connected} />
    </div>
  );
};
