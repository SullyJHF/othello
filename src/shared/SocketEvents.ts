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

  // Active games events
  GetMyActiveGames: 'GetMyActiveGames',
  MyActiveGamesUpdated: 'MyActiveGamesUpdated',

  GameUpdated: (gameId: string) => `Game_${gameId}_Updated`,
};
