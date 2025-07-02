export const SocketEvents = {
  ClientConnected: 'ClientConnected',

  UserJoined: 'UserJoined',
  UserLeft: 'UserLeft',

  Disconnected: 'disconnect',
  Connected: 'connection',

  PlacePiece: 'PlacePiece',

  HostNewGame: 'HostNewGame',
  JoinGame: 'JoinGame',
  JoinedGame: 'JoinedGame',

  StartGame: 'StartGame',

  // Debug events
  CreateDummyGame: 'CreateDummyGame',

  GameUpdated: (gameId: string) => `Game_${gameId}_Updated`,
};
