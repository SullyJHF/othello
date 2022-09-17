import React from 'react';
import { Player } from '../../../server/models/Game';

interface PlayersProps {
  players: { [userId: string]: Player };
  currentPlayer: 'W' | 'B';
}

export const Players = ({ players, currentPlayer }) => {
  //get player data
  return <div id="players">{currentPlayer}</div>;
};
