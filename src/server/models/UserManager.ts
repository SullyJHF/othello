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
    console.log(`${userId} joined with socketId ${socketId}!`);
    console.log('All users:');
    console.log(this.users);

    // Only initialize games array if it doesn't exist - don't reset existing games!
    if (!this.usersGames[userId]) {
      this.usersGames[userId] = [];
    }
    console.log(`UserManager: User ${userId} games:`, this.usersGames[userId]);
    return user;
  }

  userDisconnected(socketId: string): ConnectedUser {
    const userId = Object.keys(this.users).find((uId) => {
      const user = this.users[uId];
      return user && user.socketId === socketId;
    });

    if (!userId) {
      console.log('Something went wrong, probably opened in another tab and left');
      // Return a dummy user to satisfy type requirements
      return { userId: 'unknown', name: 'Unknown', socketId, connected: false };
    }

    const user = this.users[userId];
    if (!user) {
      return { userId: 'unknown', name: 'Unknown', socketId, connected: false };
    }

    user.connected = false;
    console.log(`${socketId} disconnected!`);
    console.log('All users');
    console.log(this.users);
    return user;
  }

  updateUserName(userId: string, name: string) {
    const user = this.users[userId];
    if (user) {
      user.name = name;
    }
    return user;
  }

  getUserById(userId: string) {
    return this.users[userId];
  }

  getUsers() {
    return this.users;
  }

  getUsersGames(user: ConnectedUser): string[] {
    if (!this.usersGames[user.userId]) {
      this.usersGames[user.userId] = [];
    }
    return this.usersGames[user.userId];
  }

  addUserToGame(user: ConnectedUser, game: Game) {
    const userGames = this.getUsersGames(user);
    if (userGames.includes(game.id)) return;
    userGames.push(game.id);
  }

  removeUserFromGame(user: ConnectedUser, game: Game) {
    const userGames = this.getUsersGames(user);
    const index = userGames.indexOf(game.id);
    if (index > -1) {
      userGames.splice(index, 1);
    }
  }
}

export default UserManager.getInstance();
