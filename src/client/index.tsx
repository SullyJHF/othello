import React from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider, Outlet } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './components/App/app.scss';
import './components/AnimatedRoutes/animated-routes.scss';
import './components/TransitionWrapper/transition-wrapper.scss';
import { AnimatedRoutes } from './components/AnimatedRoutes/AnimatedRoutes';
import { TransitionWrapper } from './components/TransitionWrapper/TransitionWrapper';
import { HostGameMenu } from './components/MainMenu/HostGameMenu';
import { JoinGameMenu } from './components/MainMenu/JoinGameMenu';
import { MainMenu } from './components/MainMenu/MainMenu';
import { Othello } from './components/Othello/Othello';
import { ProvideSocket } from './utils/socketHooks';
import { GameViewProvider } from './contexts/GameViewContext';
import VersionInfo from './components/VersionInfo/VersionInfo';

// Root layout component with animated transitions
const RootLayout = () => (
  <div id="app">
    <VersionInfo className="global-version-info" />
    <AnimatedRoutes>
      <TransitionWrapper>
        <Outlet />
      </TransitionWrapper>
    </AnimatedRoutes>
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
    <GameViewProvider>
      <ToastContainer position="bottom-right" limit={3} theme="colored" autoClose={5000} />
      <RouterProvider router={router} />
    </GameViewProvider>
  </ProvideSocket>,
);
