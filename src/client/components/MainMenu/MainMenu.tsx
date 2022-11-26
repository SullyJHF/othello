import { Link } from 'react-router-dom';
import './main-menu.scss';

export const MainMenu = () => {
  // Show games that this user is in and let user click them
  return (
    <div id="main-menu">
      <div className="menu-wrapper card">
        <h1 className="title">Othello</h1>
        <Link className="link" to="/host">
          Host Game
        </Link>
        <Link className="link" to="/join">
          Join Game
        </Link>
        <Link className="link" to="/games">
          View Games
        </Link>
      </div>
    </div>
  );
};
