import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Game, Player } from '../../../server/models/Game';
import { JoinGameResponse } from '../../../server/sockets/gameHandlers';
import { SocketEvents } from '../../../shared/SocketEvents';
import { useSocket, useSubscribeEffect } from '../../utils/socketHooks';

export const useGameEffects = (gameId: string) => {
  const navigate = useNavigate();
  const { socket, localUserId } = useSocket();
  const [boardState, setBoardState] = useState<string>('');
  const [players, setPlayers] = useState<{ [userId: string]: Player }>({});
  const [currentPlayer, setCurrentPlayer] = useState<'W' | 'B'>(null);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameFull, setGameFull] = useState(false);
  const [joinUrl, setJoinUrl] = useState('');
  const isCurrentPlayer = currentPlayer === players[localUserId]?.piece;
  const currentPlayerId = Object.keys(players).filter((userId) => players[userId]?.piece === currentPlayer)[0];
  const blackUserId = Object.keys(players).filter((userId) => players[userId]?.piece === 'B')[0];
  const whiteUserId = Object.keys(players).filter((userId) => players[userId]?.piece === 'W')[0];
  const black = players[blackUserId];
  const white = players[whiteUserId];

  const startGame = () => {
    socket?.emit(SocketEvents.StartGame, gameId);
  };

  const subscribe = () => {
    socket?.emit(SocketEvents.JoinedGame, localUserId, gameId, (response: JoinGameResponse) => {
      if (response.error) {
        console.error(`Error joining game ${response.error}`);
        navigate('/');
      }
    });
    socket?.on(SocketEvents.GameUpdated(gameId), (gameData: Game) => {
      console.log('Game updated');
      console.log(gameData);
      setBoardState(gameData.board?.boardState);
      setPlayers(gameData.players);
      setCurrentPlayer(gameData.currentPlayer);
      setGameStarted(gameData.gameStarted);
      setGameFull(gameData.gameFull);
      setJoinUrl(gameData.joinUrl);
    });
  };
  const unsubscribe = () => {
    socket?.off(SocketEvents.GameUpdated(gameId));
  };

  useSubscribeEffect(subscribe, unsubscribe);

  return {
    gameStarted,
    gameFull,
    startGame,
    joinUrl,
    localUserId,
    boardState,
    players,
    currentPlayer,
    isCurrentPlayer,
    black,
    white,
    currentPlayerId,
  };
};
