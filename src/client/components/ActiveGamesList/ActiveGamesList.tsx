import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { SocketEvents } from '../../../shared/SocketEvents';
import { useGameView } from '../../contexts/GameViewContext';
import { useSocket } from '../../utils/socketHooks';
import './active-games-list.scss';

interface GameSummary {
  id: string;
  joinUrl: string;
  playerCount: number;
  connectedPlayers: number;
  gameStarted: boolean;
  gameFinished: boolean;
  currentPlayer: 'B' | 'W';
  score: { B: number; W: number };
  createdAt: Date | string;
  lastActivityAt: Date | string;
  players: Array<{
    userId: string;
    name?: string;
    piece?: 'B' | 'W';
    connected: boolean;
  }>;
}

export const ActiveGamesList = () => {
  const { socket, localUserId } = useSocket();
  const { setCurrentView } = useGameView();
  const [activeGames, setActiveGames] = useState<GameSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setCurrentView('form');
  }, [setCurrentView]);

  useEffect(() => {
    console.log('ActiveGamesList: useEffect triggered', { socket: !!socket, localUserId });

    if (!socket || !localUserId) {
      console.log('ActiveGamesList: Missing socket or userId, staying in loading state');
      // Set a timeout to show connection issues if they persist
      const timeout = setTimeout(() => {
        if (!socket || !localUserId) {
          console.log('ActiveGamesList: Connection timeout - socket or userId still not available');
          setLoading(false); // Stop loading to show the "no games" state instead of infinite loading
        }
      }, 5000);

      return () => clearTimeout(timeout);
    }

    const fetchActiveGames = () => {
      console.log('ActiveGamesList: Fetching active games for user:', localUserId);
      socket.emit(SocketEvents.GetMyActiveGames, localUserId, (games: GameSummary[]) => {
        console.log('ActiveGamesList: Received games from server:', games);
        setActiveGames(games);
        setLoading(false);
      });
    };

    fetchActiveGames();

    // Listen for updates
    socket.on(SocketEvents.MyActiveGamesUpdated, (games: GameSummary[]) => {
      console.log('ActiveGamesList: Received live update:', games);
      setActiveGames(games);
    });

    return () => {
      socket.off(SocketEvents.MyActiveGamesUpdated);
    };
  }, [socket, localUserId]);

  const getGameStatus = (game: GameSummary) => {
    if (!game.gameStarted) return 'Waiting for players';
    if (game.gameFinished) return 'Game finished';

    const myPiece = game.players.find((p) => p.userId === localUserId)?.piece;
    if (myPiece === game.currentPlayer) return 'Your turn';
    return "Opponent's turn";
  };

  const formatTimeAgo = (date: Date | string) => {
    const now = new Date();
    const past = new Date(date);
    const diff = Math.floor((now.getTime() - past.getTime()) / 1000);

    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
    return `${Math.floor(diff / 86400)} days ago`;
  };

  console.log('ActiveGamesList: Rendering with state:', {
    loading,
    gamesCount: activeGames.length,
    hasSocket: !!socket,
    hasUserId: !!localUserId,
  });

  return (
    <div className="active-games-container">
      <div className="active-games-header">
        <h1 className="active-games-title">My Active Games</h1>
        <p className="active-games-subtitle">
          {loading ? 'Loading...' : `${activeGames.length} active game${activeGames.length !== 1 ? 's' : ''}`}
        </p>
      </div>

      <div className="games-list">
        {!loading && activeGames.length === 0 ? (
          <div className="no-games">
            <p className="no-games-text">You don&apos;t have any active games</p>
            <div className="no-games-actions">
              <Link to="/host" className="action-button primary">
                🎮 Host New Game
              </Link>
              <Link to="/join" className="action-button secondary">
                🤝 Join Game
              </Link>
            </div>
          </div>
        ) : (
          activeGames.map((game) => {
            const myPlayer = game.players.find((p) => p.userId === localUserId);
            const opponent = game.players.find((p) => p.userId !== localUserId);
            const isMyTurn = myPlayer?.piece === game.currentPlayer;

            return (
              <Link
                key={game.id}
                to={game.gameStarted ? `/game/${game.id}` : `/join/${game.id}`}
                className={`game-card ${isMyTurn ? 'my-turn' : ''}`}
              >
                <div className="game-info">
                  <div className="game-header">
                    <h3 className="game-id">Game #{game.id}</h3>
                    <span className={`game-status ${isMyTurn ? 'active' : ''}`}>{getGameStatus(game)}</span>
                  </div>

                  <div className="game-details">
                    <div className="players-info">
                      <span className="player me">
                        <span className="piece-indicator">{myPlayer?.piece === 'B' ? '⚫' : '⚪'}</span>
                        You
                      </span>
                      <span className="vs">vs</span>
                      <span className="player opponent">
                        <span className="piece-indicator">{opponent?.piece === 'B' ? '⚫' : '⚪'}</span>
                        {opponent?.name ?? 'Waiting...'}
                      </span>
                    </div>

                    {game.gameStarted && (
                      <div className="game-stats">
                        <span className="score">
                          ⚫ {game.score.B} - {game.score.W} ⚪
                        </span>
                        <span className="last-activity">Last activity: {formatTimeAgo(game.lastActivityAt)}</span>
                      </div>
                    )}

                    {!game.gameStarted && (
                      <div className="game-stats">
                        <span className="last-activity">Last activity: {formatTimeAgo(game.lastActivityAt)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            );
          })
        )}
      </div>

      <div className="back-to-menu">
        <Link to="/" className="back-link">
          ← Back to Main Menu
        </Link>
      </div>
    </div>
  );
};
