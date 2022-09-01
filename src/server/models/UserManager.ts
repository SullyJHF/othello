export interface ConnectedUser {
  userId: string;
  socketId: string;
  connected: boolean;
}

export interface ConnectedUserMap {
  [userId: string]: ConnectedUser;
}

class UserManager {
  static instance: UserManager;
  users: ConnectedUserMap;

  constructor() {
    this.users = {};
  }

  static getInstance(): UserManager {
    if (!this.instance) this.instance = new UserManager();
    return this.instance;
  }

  userConnected(userId: string, socketId: string): ConnectedUser {
    const user: ConnectedUser = {
      userId,
      socketId,
      connected: true,
    };
    this.users[userId] = user;
    console.log(`${userId} joined with socketId ${socketId}!`);
    console.log('All users:');
    console.log(this.users);
    return user;
  }

  userDisconnected(socketId: string): ConnectedUser {
    const userId = Object.keys(this.users).find((uId) => this.users[uId].socketId === socketId);
    const user = this.users[userId];
    user.connected = false;
    console.log(`${socketId} disconnected!`);
    console.log('All users');
    console.log(this.users);
    return user;
  }

  getUsers() {
    return this.users;
  }
}

export default UserManager.getInstance();
