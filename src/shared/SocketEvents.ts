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

  // Single player events
  CreateSinglePlayerGame: 'CreateSinglePlayerGame',
  CreatePracticeGame: 'CreatePracticeGame',
  GetAIOptions: 'GetAIOptions',

  // Active games events
  GetMyActiveGames: 'GetMyActiveGames',
  MyActiveGamesUpdated: 'MyActiveGamesUpdated',

  GameUpdated: (gameId: string) => `Game_${gameId}_Updated`,

  // Game mode events
  GetGameModes: 'GetGameModes',
  GameModesUpdated: 'GameModesUpdated',
  HostNewGameWithMode: 'HostNewGameWithMode',
  JoinGameWithMode: 'JoinGameWithMode',

  // Timer events
  TimerUpdated: (gameId: string) => `Timer_${gameId}_Updated`,
  TimerTick: (gameId: string) => `Timer_${gameId}_Tick`,
  TimerWarning: (gameId: string) => `Timer_${gameId}_Warning`,
  TimerCriticalWarning: (gameId: string) => `Timer_${gameId}_CriticalWarning`,
  TimerExpired: (gameId: string) => `Timer_${gameId}_Expired`,
  TimerTimeout: (gameId: string) => `Timer_${gameId}_Timeout`,
  TimerPaused: (gameId: string) => `Timer_${gameId}_Paused`,
  TimerResumed: (gameId: string) => `Timer_${gameId}_Resumed`,
  TimerIncrement: (gameId: string) => `Timer_${gameId}_Increment`,
  TimerStateSync: (gameId: string) => `Timer_${gameId}_StateSync`,
  GetTimerState: (gameId: string) => `Timer_${gameId}_GetState`,

  // Client-side timer events
  RequestTimerPause: (gameId: string) => `Timer_${gameId}_RequestPause`,
  RequestTimerResume: (gameId: string) => `Timer_${gameId}_RequestResume`,
  RequestTimerSync: (gameId: string) => `Timer_${gameId}_RequestSync`,

  // Latency compensation events
  TimerLatencyPing: (gameId: string) => `Timer_${gameId}_LatencyPing`,
  TimerLatencyPong: (gameId: string) => `Timer_${gameId}_LatencyPong`,
  TimerLatencySync: (gameId: string) => `Timer_${gameId}_LatencySync`,

  // Game mode state events
  GameModeStateUpdated: (gameId: string) => `GameModeState_${gameId}_Updated`,
  GamePaused: (gameId: string) => `Game_${gameId}_Paused`,
  GameResumed: (gameId: string) => `Game_${gameId}_Resumed`,

  // Challenge events
  GetDailyChallenge: 'GetDailyChallenge',
  CreateChallengeGame: 'CreateChallengeGame',
  ChallengeMovePlayed: 'ChallengeMovePlayed',
  SubmitChallengeAttempt: 'SubmitChallengeAttempt',
  ChallengeUpdated: 'ChallengeUpdated',
  GetUserChallengeStats: 'GetUserChallengeStats',
  GetChallengeLeaderboard: 'GetChallengeLeaderboard',
  GetChallengeByDate: 'GetChallengeByDate',
  GetUserChallengeAttempts: 'GetUserChallengeAttempts',

  // Enhanced multi-stage challenge events
  UndoChallengeMove: 'UndoChallengeMove',
  ChallengeMoveUndone: 'ChallengeMoveUndone',
  ChallengeSequenceComplete: 'ChallengeSequenceComplete',
  ChallengeCompleted: 'ChallengeCompleted',
  ChallengeAttemptFailed: 'ChallengeAttemptFailed',

  // Admin events
  CreateGameMode: 'CreateGameMode',
  UpdateGameMode: 'UpdateGameMode',
  DeleteGameMode: 'DeleteGameMode',
  GetGameModeStats: 'GetGameModeStats',
};
