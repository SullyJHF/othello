import React from 'react';
import { Piece, Player } from '../../../server/models/Game';
import { ConnectedPip } from './ConnectedPip';
import './players.scss';

interface RawPieceProps {
  piece: 'B' | 'W';
}

export const RawPiece = ({ piece }: RawPieceProps) => {
  return <div className={`piece ${piece === 'B' ? 'black' : 'white'}`} />;
};

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
    name = isLocalUser ? `${player.name} (You)` : player.name;
  }
  return (
    <div className={`player ${top ? 'top' : 'bottom'} ${isCurrentPlayer ? ' turn' : ''}`}>
      <RawPiece piece={piece} />
      <div className="name">{name}</div>
      <ConnectedPip connected={player?.connected} />
    </div>
  );
};
