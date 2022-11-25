import { Game } from './Game';
export interface ConnectedUser {
  userId: string;
  socketId: string;
  connected: boolean;
  name?: string;
}

export interface ConnectedUserMap {
  [userId: string]: ConnectedUser;
}
interface UsersGamesMap {
  [userId: string]: string[];
}

class UserManager {
  static instance: UserManager;
  users: ConnectedUserMap;
  usersGames: UsersGamesMap;

  constructor() {
    this.users = {};
    this.usersGames = {};
  }

  static getInstance(): UserManager {
    if (!this.instance) this.instance = new UserManager();
    return this.instance;
  }

  userConnected(userId: string, socketId: string): ConnectedUser {
    // try and handle the same user connecting with multiple socket ids
    const user: ConnectedUser = {
      userId,
      socketId,
      connected: true,
    };
    this.users[userId] = user;
    this.usersGames[userId] = [];
    return user;
  }

  userDisconnected(socketId: string): ConnectedUser {
    const userId = Object.keys(this.users).find((uId) => this.users[uId].socketId === socketId);
    const user = this.users[userId];
    if (!user) {
      console.log('Something went wrong, probably opened in another tab and left');
      return null;
    }
    user.connected = false;
    return user;
  }

  updateUserName(userId: string, name: string) {
    this.users[userId].name = name;
    return this.users[userId];
  }

  getUserById(userId: string) {
    return this.users[userId];
  }

  getUsers() {
    return this.users;
  }

  getUsersGames(user: ConnectedUser) {
    return this.usersGames[user.userId];
  }

  addUserToGame(user: ConnectedUser, game: Game) {
    if (this.getUsersGames(user).includes(game.id)) return;
    this.getUsersGames(user).push(game.id);
  }

  removeUserFromGame(user: ConnectedUser, game: Game) {
    // remove game id from usersGames list
    // if (this.getUsersGames(user).includes(game.id))
  }
}

export default UserManager.getInstance();
