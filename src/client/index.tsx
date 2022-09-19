import React from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './components/App/app.scss';
import { HostGameMenu } from './components/MainMenu/HostGameMenu';
import { JoinGameMenu } from './components/MainMenu/JoinGameMenu';
import { MainMenu } from './components/MainMenu/MainMenu';
import { Othello } from './components/Othello/Othello';
import { ProvideSocket } from './utils/socketHooks';

const router = createBrowserRouter([
  { path: '/', element: <MainMenu /> },
  { path: '/host', element: <HostGameMenu /> },
  { path: '/join', element: <JoinGameMenu /> },
  { path: '/join/:gameId', element: <JoinGameMenu /> },
  { path: '/game/:gameId', element: <Othello /> },
]);

const container = document.getElementById('root');
const root = createRoot(container);

root.render(
  <ProvideSocket>
    <ToastContainer position="bottom-right" limit={3} theme="colored" autoClose={5000} />
    <RouterProvider router={router} />
  </ProvideSocket>
);
