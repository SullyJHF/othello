import { createContext, useContext, useState } from 'react';
import type { ReactNode, FC } from 'react';

type GameViewType = 'menu' | 'form' | 'lobby' | 'game';

interface GameViewContextType {
  currentView: GameViewType;
  setCurrentView: (view: GameViewType) => void;
}

const GameViewContext = createContext<GameViewContextType | undefined>(undefined);

export const GameViewProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [currentView, setCurrentView] = useState<GameViewType>('menu');

  return <GameViewContext.Provider value={{ currentView, setCurrentView }}>{children}</GameViewContext.Provider>;
};

export const useGameView = () => {
  const context = useContext(GameViewContext);
  if (context === undefined) {
    throw new Error('useGameView must be used within a GameViewProvider');
  }
  return context;
};
