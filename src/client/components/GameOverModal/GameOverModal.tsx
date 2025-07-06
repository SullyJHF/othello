import React from 'react';
import { Link } from 'react-router-dom';
import { Player } from '../../../server/models/Game';
import { useDebugMode } from '../../hooks/useDebugMode';
import { DebugSeparator } from '../DebugSeparator/DebugSeparator';
import { RawPiece } from '../Players/Players';
import { StartDebugGameButton } from '../StartDebugGameButton/StartDebugGameButton';
import './game-over-modal.scss';

interface GameOverModalProps {
  gameFinished: boolean;
  score: { B: number; W: number };
  black: Player;
  white: Player;
  localUserId: string;
}

export const GameOverModal = ({ gameFinished, score, black, white, localUserId }: GameOverModalProps) => {
  const { isDebugEnabled, isDummyGameEnabled } = useDebugMode();

  console.log('Hello');

  if (!gameFinished) return null;
  const winner = score.B > score.W ? black : score.B === score.W ? null : white;
  const localUserIsWinner = winner ? winner.userId === localUserId : false;

  let winText = '';
  if (winner === null) winText = "It's a tie!";
  else if (localUserIsWinner) winText = 'You win!';
  else winText = 'You lose...';
  return (
    <div className="overlay">
      <div className="modal card">
        <div className="modal-inner">
          <h1>{winText}</h1>
          <div className="score-wrapper">
            <div className="score">
              <RawPiece piece={'B'} />
              {score.B}
            </div>
            <div className="score">
              <RawPiece piece={'W'} />
              {score.W}
            </div>
          </div>
          <div className="links">
            <Link className="link" to="/">
              Back to Main Menu
            </Link>
            <Link className="link" to="/host">
              Host Game
            </Link>
            <Link className="link" to="/join">
              Join Game
            </Link>
            {isDebugEnabled && isDummyGameEnabled && (
              <>
                <DebugSeparator />
                <StartDebugGameButton />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
