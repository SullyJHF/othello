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

  GameUpdated: (gameId: string) => `Game_${gameId}_Updated`,

  ViewGameList: 'ViewGameList',
  GameListUpdated: 'GameListUpdated',
};
