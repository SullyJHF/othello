# Unit Testing Strategy

## High-Value Unit Tests

### 1. **Game Logic & State Management**
- `gameEffects.ts` - State derivation functions
- `Board.tsx` - Move validation and cell rendering  
- `GameBoard.tsx` - Turn management and score handling
- `Lobby.tsx` - Player state and game start logic

### 2. **Socket Event Handling**
- `socketHooks.ts` - Connection management and event parsing
- Real-time state synchronization
- Error handling and reconnection logic

### 3. **Component Rendering Logic**
- `Othello.tsx` - Conditional rendering (lobby vs game)
- `GamePiece.tsx` - Piece rendering and styling
- `Player.tsx` - Player state display and turn indicators

### 4. **Utility Functions**
- Board state parsing and validation
- Score calculation
- Move validation logic

### 5. **Error Boundaries & Edge Cases**
- Invalid game states
- Disconnection scenarios
- Malformed socket data
- Network timeout handling

## Benefits of Unit Tests
- **Fast execution** (< 100ms each)
- **Isolated testing** (no complex mocking)
- **Precise error detection**
- **High coverage** with minimal setup
- **Regression detection** for specific functions