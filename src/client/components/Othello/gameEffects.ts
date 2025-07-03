import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Game, Player } from '../../../server/models/Game';
import { JoinGameResponse } from '../../../server/sockets/gameHandlers';
import { SocketEvents } from '../../../shared/SocketEvents';
import { autoPlayService } from '../../services/autoPlayService';
import { useSocket, useSubscribeEffect } from '../../utils/socketHooks';

export const useGameEffects = (gameId: string) => {
  const navigate = useNavigate();
  const { socket, localUserId } = useSocket();
  const [boardState, setBoardState] = useState<string>('');
  const [players, setPlayers] = useState<{ [userId: string]: Player }>({});
  const [currentPlayer, setCurrentPlayer] = useState<'W' | 'B'>('B');
  const [gameStarted, setGameStarted] = useState(false);
  const [gameFull, setGameFull] = useState(false);
  const [gameFinished, setGameFinished] = useState(false);
  const [score, setScore] = useState({ B: 0, W: 0 });
  const [joinUrl, setJoinUrl] = useState('');
  const isCurrentPlayer = localUserId ? currentPlayer === players[localUserId]?.piece : false;
  const currentPlayerId = Object.keys(players).filter((userId) => players[userId]?.piece === currentPlayer)[0];
  const blackUserId = Object.keys(players).filter((userId) => players[userId]?.piece === 'B')[0];
  const whiteUserId = Object.keys(players).filter((userId) => players[userId]?.piece === 'W')[0];
  const black = blackUserId ? players[blackUserId] : undefined;
  const white = whiteUserId ? players[whiteUserId] : undefined;

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
      setGameFinished(gameData.gameFinished);
      setJoinUrl(gameData.joinUrl);
      setScore(gameData.board?.score);

      // Clear pending move when game state updates (indicates server processed our move)
      autoPlayService.clearPendingMove();
    });
  };
  const unsubscribe = () => {
    socket?.off(SocketEvents.GameUpdated(gameId));
  };

  // Reset state when gameId changes (e.g., when starting a new debug game)
  useEffect(() => {
    setBoardState('');
    setPlayers({});
    setCurrentPlayer('B');
    setGameStarted(false);
    setGameFull(false);
    setGameFinished(false);
    setScore({ B: 0, W: 0 });
    setJoinUrl('');
  }, [gameId]);

  useSubscribeEffect(subscribe, unsubscribe, gameId);

  return {
    gameStarted,
    gameFull,
    gameFinished,
    score,
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
