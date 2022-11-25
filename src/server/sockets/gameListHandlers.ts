import { Server, Socket } from 'socket.io';
import { SocketEvents } from '../../shared/SocketEvents';
import GameManager from '../models/GameManager';
import UserManager from '../models/UserManager';

export const GameListRoom = 'GameListRoom';

export const registerGameListHandlers = (io: Server, socket: Socket): void => {
  const onViewGameList = (userId: string, callback: (gameIds: string[]) => void) => {
    socket.join(GameListRoom);
    const user = UserManager.getUserById(userId);
    if (!user) return;
    const userGames = GameManager.getGameIdsUserIsIn(user);
    const allGames = GameManager.allGameIds;
    callback(allGames);
  };

  socket.on(SocketEvents.ViewGameList, onViewGameList);
};
