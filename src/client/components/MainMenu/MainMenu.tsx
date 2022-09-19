import React from 'react';
import { Link } from 'react-router-dom';
import './main-menu.scss';

export const MainMenu = () => {
  // Show games that this user is in and let user click them
  return (
    <div id="main-menu">
      <Link to="/host">Host Game</Link>
      <Link to="/join">Join Game</Link>
    </div>
  );
};
