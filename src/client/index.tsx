import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider, Outlet } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './components/App/app.scss';
import './components/AnimatedRoutes/animated-routes.scss';
import './components/TransitionWrapper/transition-wrapper.scss';
import { ActiveGamesList } from './components/ActiveGamesList/ActiveGamesList';
import { AnimatedRoutes } from './components/AnimatedRoutes/AnimatedRoutes';
import { FloatingSettingsButton } from './components/FloatingSettingsButton/FloatingSettingsButton';
import { HostGameMenu } from './components/MainMenu/HostGameMenu';
import { JoinGameMenu } from './components/MainMenu/JoinGameMenu';
import { MainMenu } from './components/MainMenu/MainMenu';
import { Othello } from './components/Othello/Othello';
import { TransitionWrapper } from './components/TransitionWrapper/TransitionWrapper';
import VersionInfo from './components/VersionInfo/VersionInfo';
import { GameModeProvider } from './contexts/GameModeContext';
import { GameViewProvider } from './contexts/GameViewContext';
import { ProvideSocket } from './utils/socketHooks';
import { initializeTimerSounds } from './utils/TimerSoundManager';

// Root layout component with animated transitions
const RootLayout = () => (
  <div id="app">
    <VersionInfo className="global-version-info" />
    <AnimatedRoutes>
      <TransitionWrapper>
        <Outlet />
      </TransitionWrapper>
    </AnimatedRoutes>
    <FloatingSettingsButton />
  </div>
);

const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      { index: true, element: <MainMenu /> },
      { path: 'host', element: <HostGameMenu /> },
      { path: 'join', element: <JoinGameMenu /> },
      { path: 'join/:gameId', element: <JoinGameMenu /> },
      { path: 'game/:gameId', element: <Othello /> },
      { path: 'my-games', element: <ActiveGamesList /> },
    ],
  },
]);

const container = document.getElementById('root');
if (!container) {
  throw new Error('Root element not found');
}
const root = createRoot(container);

root.render(
  <ProvideSocket>
    <GameModeProvider>
      <GameViewProvider>
        <ToastContainer position="bottom-right" limit={3} theme="colored" autoClose={5000} />
        <RouterProvider router={router} />
      </GameViewProvider>
    </GameModeProvider>
  </ProvideSocket>,
);

// Initialize timer sounds after the application has loaded
initializeTimerSounds().catch((error) => {
  console.warn('Failed to initialize timer sounds:', error);
});
