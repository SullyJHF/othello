import { AnimatePresence, motion } from 'framer-motion';
import type { ReactNode, FC } from 'react';
import { useLocation } from 'react-router-dom';

interface AnimatedRoutesProps {
  children: ReactNode;
}

export const AnimatedRoutes: FC<AnimatedRoutesProps> = ({ children }) => {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <div key={location.pathname} className="animated-page">
        {children}
      </div>
    </AnimatePresence>
  );
};
