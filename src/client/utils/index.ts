export const generateRandomBoard = () => {
  const options = '.WB';
  return [...Array(64)].map(() => options[Math.floor(Math.random() * options.length)]).join('');
};
