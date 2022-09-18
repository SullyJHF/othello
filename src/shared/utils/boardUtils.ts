export const boardStringToArray = (boardState: string) => {
  return boardState.split('\n').flatMap((row) => row.split(''));
};

export const boardArrayToString = (boardArray: string[]) => {
  for (let i = 6; i >= 0; i--) {
    boardArray.splice(i * 8 + 8, 0, '\n');
  }
  return boardArray.join('');
};
