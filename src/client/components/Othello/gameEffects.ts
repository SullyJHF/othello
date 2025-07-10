import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Game, Player, PlayerTimerState } from '../../../server/models/Game';
import { JoinGameResponse } from '../../../server/sockets/gameHandlers';
import { SocketEvents } from '../../../shared/SocketEvents';
import { autoPlayService } from '../../services/autoPlayService';
import { useSocket, useSubscribeEffect } from '../../utils/socketHooks';
import { getTimerSoundManager, playTimerSound } from '../../utils/TimerSoundManager';

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
  const [timerStates, setTimerStates] = useState<{ [userId: string]: PlayerTimerState }>({});
  const [timerNotifications, setTimerNotifications] = useState<
    Array<{
      id: string;
      type: 'low' | 'critical' | 'expired';
      playerName: string;
      remainingTime: number;
      timestamp: number;
    }>
  >([]);
  const isCurrentPlayer = localUserId ? currentPlayer === players[localUserId]?.piece : false;
  const currentPlayerId = Object.keys(players).filter((userId) => players[userId]?.piece === currentPlayer)[0];
  const blackUserId = Object.keys(players).filter((userId) => players[userId]?.piece === 'B')[0];
  const whiteUserId = Object.keys(players).filter((userId) => players[userId]?.piece === 'W')[0];
  const black = blackUserId ? players[blackUserId] : undefined;
  const white = whiteUserId ? players[whiteUserId] : undefined;

  const startGame = () => {
    socket?.emit(SocketEvents.StartGame, gameId);
  };

  const addTimerNotification = (type: 'low' | 'critical' | 'expired', userId: string, remainingTime: number) => {
    const player = players[userId];
    const playerName = player?.name || 'Unknown Player';

    const notification = {
      id: `${userId}-${type}-${Date.now()}`,
      type,
      playerName,
      remainingTime,
      timestamp: Date.now(),
    };

    setTimerNotifications((prev) => [...prev, notification]);
  };

  const dismissTimerNotification = (notificationId: string) => {
    setTimerNotifications((prev) => prev.filter((n) => n.id !== notificationId));
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

      // Update timer states if available
      if (gameData.timerState?.playerTimers) {
        setTimerStates(gameData.timerState.playerTimers);
      }

      // Clear pending move when game state updates (indicates server processed our move)
      autoPlayService.clearPendingMove();
    });

    // Timer-specific event handlers
    socket?.on(SocketEvents.TimerUpdated(gameId), (timerData: { [userId: string]: PlayerTimerState }) => {
      console.log('Timer updated', timerData);
      setTimerStates(timerData);
    });

    socket?.on(SocketEvents.TimerTick(gameId), (timerData: { [userId: string]: PlayerTimerState }) => {
      setTimerStates(timerData);
    });

    socket?.on(
      SocketEvents.TimerWarning(gameId),
      (data: { userId: string; warning: 'low' | 'critical'; remainingTime: number }) => {
        console.log(`Timer warning for ${data.userId}: ${data.warning}`);
        addTimerNotification(data.warning, data.userId, data.remainingTime);

        // Play appropriate timer warning sound
        const soundType = data.warning === 'low' ? 'warning' : 'critical';
        playTimerSound(soundType).catch(console.warn);
      },
    );

    socket?.on(SocketEvents.TimerExpired(gameId), (data: { userId: string }) => {
      console.log(`Timer expired for ${data.userId}`);
      addTimerNotification('expired', data.userId, 0);

      // Play timer expired sound when timer actually expires
      playTimerSound('expired').catch(console.warn);
    });
  };
  const unsubscribe = () => {
    socket?.off(SocketEvents.GameUpdated(gameId));
    socket?.off(SocketEvents.TimerUpdated(gameId));
    socket?.off(SocketEvents.TimerTick(gameId));
    socket?.off(SocketEvents.TimerWarning(gameId));
    socket?.off(SocketEvents.TimerExpired(gameId));

    // Cleanup timer sounds when leaving the game
    const soundManager = getTimerSoundManager();
    soundManager.dispose();
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
    setTimerStates({});
    setTimerNotifications([]);
  }, [gameId]);

  useSubscribeEffect(subscribe, unsubscribe, gameId);

  // Cleanup timer sounds when game ends
  useEffect(() => {
    if (gameFinished) {
      const soundManager = getTimerSoundManager();
      soundManager.dispose();
    }
  }, [gameFinished]);

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
    timerStates,
    timerNotifications,
    dismissTimerNotification,
  };
};
