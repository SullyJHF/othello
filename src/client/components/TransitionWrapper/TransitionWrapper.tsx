import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { useGameView } from '../../contexts/GameViewContext';
import './transition-wrapper.scss';

interface TransitionWrapperProps {
  children: ReactNode;
  className?: string;
}

// Get the appropriate size class based on the current view context
const getSizeClass = (currentView: string): string => {
  switch (currentView) {
    case 'menu':
      return 'menu-size';
    case 'form':
      return 'form-size';
    case 'lobby':
      return 'lobby-size';
    case 'game':
      return 'game-size';
    default:
      return 'menu-size';
  }
};

// Create a stable layout ID based on route pattern
const getLayoutId = (pathname: string): string => {
  if (pathname === '/') return 'main-menu';
  if (pathname === '/host' || pathname === '/join' || pathname.startsWith('/join/') || pathname === '/my-games')
    return 'form-screen';
  if (pathname.includes('/game/')) {
    // Use same ID for lobby and game to enable smooth transition
    return 'game-screen';
  }
  return 'main-menu';
};

export const TransitionWrapper: React.FC<TransitionWrapperProps> = ({ children, className = '' }) => {
  const location = useLocation();
  const { currentView } = useGameView();
  const sizeClass = getSizeClass(currentView);
  const layoutId = getLayoutId(location.pathname);
  const isFullScreen = sizeClass === 'game-size';

  console.log('TransitionWrapper debug:', {
    pathname: location.pathname,
    currentView,
    sizeClass,
    layoutId,
    isFullScreen,
    className,
  });

  // Always use the same structure, just add fullscreen class when needed
  return (
    <div className={`modal-transition-container ${className}`}>
      <motion.div
        className={`transition-card ${sizeClass} ${isFullScreen ? 'fullscreen' : ''}`}
        layout
        layoutId={layoutId}
        transition={{
          type: 'spring',
          stiffness: 300,
          damping: 30,
          mass: 0.8,
          bounce: 0.2,
        }}
      >
        {children}
      </motion.div>
    </div>
  );
};
