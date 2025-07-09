import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import type { ReactNode, FC } from 'react';
import { SocketEvents } from '../../shared/SocketEvents';
import { GameMode, GameModeCategory } from '../../shared/types/gameModeTypes';
import { useSocket } from '../utils/socketHooks';

interface GameModeContextType {
  gameModes: GameMode[];
  selectedGameMode: GameMode | null;
  loading: boolean;
  error: string | null;
  setSelectedGameMode: (mode: GameMode | null) => void;
  refreshGameModes: () => void;
  getGameModesByCategory: (category: GameModeCategory) => GameMode[];
  getDefaultGameMode: () => GameMode | null;
}

const GameModeContext = createContext<GameModeContextType | undefined>(undefined);

export const GameModeProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [gameModes, setGameModes] = useState<GameMode[]>([]);
  const [selectedGameMode, setSelectedGameMode] = useState<GameMode | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { socket } = useSocket();

  const refreshGameModes = useCallback(() => {
    if (!socket) return;

    setLoading(true);
    setError(null);

    socket.emit(
      SocketEvents.GetGameModes,
      { isActive: true },
      (response: { success: boolean; data?: GameMode[]; error?: string }) => {
        setLoading(false);
        if (response.success) {
          setGameModes(response.data ?? []);
          setError(null);
        } else {
          setError(response.error ?? 'Failed to load game modes');
        }
      },
    );
  }, [socket]);

  // Load game modes on mount and when socket becomes available
  useEffect(() => {
    if (socket) {
      refreshGameModes();
    }
  }, [socket, refreshGameModes]);

  // Set default game mode when modes are loaded
  useEffect(() => {
    if (gameModes.length > 0 && !selectedGameMode) {
      const defaultMode = gameModes.find((mode) => mode.isDefault);
      if (defaultMode) {
        setSelectedGameMode(defaultMode);
      }
    }
  }, [gameModes, selectedGameMode]);

  // Listen for real-time game mode updates
  useEffect(() => {
    if (!socket) return;

    const handleGameModesUpdated = (updatedModes: GameMode[]) => {
      setGameModes(updatedModes);
    };

    socket.on(SocketEvents.GameModesUpdated, handleGameModesUpdated);

    return () => {
      socket.off(SocketEvents.GameModesUpdated, handleGameModesUpdated);
    };
  }, [socket]);

  const getGameModesByCategory = useCallback(
    (category: GameModeCategory): GameMode[] => {
      return gameModes.filter((mode) => mode.category === category && mode.isActive);
    },
    [gameModes],
  );

  const getDefaultGameMode = useCallback((): GameMode | null => {
    return gameModes.find((mode) => mode.isDefault && mode.isActive) ?? null;
  }, [gameModes]);

  const value: GameModeContextType = useMemo(
    () => ({
      gameModes,
      selectedGameMode,
      loading,
      error,
      setSelectedGameMode,
      refreshGameModes,
      getGameModesByCategory,
      getDefaultGameMode,
    }),
    [
      gameModes,
      selectedGameMode,
      loading,
      error,
      setSelectedGameMode,
      refreshGameModes,
      getGameModesByCategory,
      getDefaultGameMode,
    ],
  );

  return <GameModeContext.Provider value={value}>{children}</GameModeContext.Provider>;
};

export const useGameModes = (): GameModeContextType => {
  const context = useContext(GameModeContext);
  if (context === undefined) {
    throw new Error('useGameModes must be used within a GameModeProvider');
  }
  return context;
};
