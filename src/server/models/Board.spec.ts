import { Board } from './Board';

describe('Board', () => {
  it('Correctly plays a valid game', () => {
    const board = new Board();
    expect(board.boardState).toBe(`........
........
...0....
..0WB...
...BW0..
....0...
........
........`);
    board.updateBoard(19, 'B');
    expect(board.boardState).toBe(`........
........
..0B0...
...BB...
..0BW...
........
........
........`);
    board.updateBoard(18, 'W');
    expect(board.boardState).toBe(`........
........
.0WB....
..0WB...
...BW0..
....0...
........
........`);
    board.updateBoard(44, 'B');
    expect(board.boardState).toBe(`........
...0....
..WB0...
...WB0..
...BB...
...0B0..
........
........`);
    board.updateBoard(29, 'W');
    expect(board.boardState).toBe(`........
.0......
.0WB000.
...WWW..
...BB0..
....B...
........
........`);
    board.updateBoard(22, 'B');
    expect(board.boardState).toBe(`........
..00....
..WB0.B.
...WWB0.
...BB...
..00B0..
....0...
........`);
    board.updateBoard(42, 'W');
    expect(board.boardState).toBe(`........
.0......
.0WB0.B.
..0WWB..
..0WB0..
..W0B...
........
........`);
    board.updateBoard(9, 'B');
    expect(board.boardState).toBe(`........
.B00....
..BB..B.
..0BWB0.
...WB0..
..W.B...
....00..
........`);
    board.updateBoard(11, 'W');
    expect(board.boardState).toBe(`....0...
.B.W....
..BW0.B.
..0WWB..
..0WB...
..W.B...
........
........`);
    board.updateBoard(26, 'B');
    expect(board.boardState).toBe(`........
.B.W....
.0BW.0B.
.0BBBB..
.0.BB0..
..W0B...
........
........`);
    board.updateBoard(21, 'W');
    expect(board.boardState).toBe(`...00...
.B.W00..
..BW0WB.
..BBWB..
..0WB...
..W0B...
........
........`);
    board.updateBoard(3, 'B');
    expect(board.boardState).toBe(`...B....
.B0B....
.0BB.WB0
.0BBWB0.
...WB0..
..W.B...
....00..
........`);
    board.updateBoard(10, 'W');
    expect(board.boardState).toBe(`..0B....
.BWB00..
.0BW0WB.
..BBWB..
..0WB...
..W0B...
........
........`);
    board.updateBoard(20, 'B');
    expect(board.boardState).toBe(`...B....
0BWB0.0.
.0BBBBB.
..BBBB..
..0WB0..
..W.B...
.....0..
........`);
    board.updateBoard(34, 'W');
    expect(board.boardState).toBe(`.0.B....
.BWB....
.0WBBBB.
.0WBBB..
.0WWB...
.0W0B...
.0......
........`);
    board.updateBoard(17, 'B');
    expect(board.boardState).toBe(`..0B....
.BBB.00.
.BBBBBB.
..BBBB..
..WBB0..
..W.B...
........
........`);
    board.updateBoard(13, 'W');
    expect(board.boardState).toBe(`...B00..
.BBB0W..
.BBBWBB.
..BWBB..
.0WBB...
..W.B...
.00.....
........`);
    board.updateBoard(12, 'B');
    expect(board.boardState).toBe(`0.0B....
0BBBBW0.
.BBBBBB.
.0BWBB00
..WBB0..
..W0B0..
........
........`);
    board.updateBoard(8, 'W');
    expect(board.boardState).toBe(`000B000.
WWWWWW..
.BBBBBB.
..BWBB..
.0WBB...
.0W.B...
.00.....
........`);
    board.updateBoard(4, 'B');
    expect(board.boardState).toBe(`...BB.0.
WWWBBB0.
.BBBBBB.
00BWBB0.
..WBB0..
..W0B0..
.....0..
........`);
    board.updateBoard(6, 'W');
    expect(board.boardState).toBe(`000BB0W.
WWWBBW0.
.BBBWBB.
..BWBB..
.0WBB...
..W.B...
.00.....
........`);
    board.updateBoard(5, 'B');
    expect(board.boardState).toBe(`..0BBBW.
WWWBBB0.
0BBBWBB0
00BWBB0.
..WBB00.
..W0B0..
....00..
........`);
    board.updateBoard(2, 'W');
    expect(board.boardState).toBe(`00WWWWW.
WWWWBB..
.BBBWBB.
..BWBB..
.0WBB...
.0W.B...
.00.....
........`);
    board.updateBoard(1, 'B');
    expect(board.boardState).toBe(`0BWWWWW.
WBBWBB0.
0BBBWBB0
00BWBB00
.0WBB00.
..W0B0..
....00..
........`);
    board.updateBoard(0, 'W');
    expect(board.boardState).toBe(`WWWWWWW.
WWBWBB..
.BWBWBB.
..BWBB..
.0WBB...
.0W.B...
.00.....
........`);
    board.updateBoard(41, 'B');
    expect(board.boardState).toBe(`WWWWWWW.
WWBWBB0.
0BWBBBB0
00BBBB00
.0BBB00.
0BW0B0..
0...00..
........`);
    board.updateBoard(48, 'W');
    expect(board.boardState).toBe(`WWWWWWW.
WWBWBW0.
.BWBWBB.
..BWBB..
.0WBB...
.WW.B...
W00.....
........`);
    board.updateBoard(50, 'B');
    expect(board.boardState).toBe(`WWWWWWW.
WWBWBW..
0BWBWBB0
00BWBB00
.0BBB00.
.WB0B0..
W.B.00..
..00....`);
    board.updateBoard(58, 'W');
    expect(board.boardState).toBe(`WWWWWWW.
WWBWBW0.
.BWBWBB.
.0WWBB..
.0WBB...
.WW.B...
W0W.....
..W.....`);
    board.updateBoard(25, 'B');
    expect(board.boardState).toBe(`WWWWWWW.
WWBWBW0.
0BWBWBB0
0BBBBB00
00WBB00.
.WW0B0..
W.W.00..
..W.....`);
    board.updateBoard(37, 'W');
    expect(board.boardState).toBe(`WWWWWWW.
WWWWBW0.
.BWWWWB.
.BBBWW0.
..WWWW..
.WW0B0..
W.W.....
..W.....`);
    board.updateBoard(30, 'B');
    expect(board.boardState).toBe(`WWWWWWW.
WWWWBW00
0BWWWBB0
0BBBBBB0
00WWWB00
.WW.B00.
W.W.00..
..W.....`);
    board.updateBoard(46, 'W');
    expect(board.boardState).toBe(`WWWWWWW.
WWWWBW0.
.BWWWBB.
.BBBWBB.
..WWWW..
.WW0B0W.
W0W.....
..W.....`);
    board.updateBoard(45, 'B');
    expect(board.boardState).toBe(`WWWWWWW.
WWWWBW0.
0BWWWBB0
0BBBWBB0
00WWBB00
.WW0BBW.
W.W.000.
..W.....`);
    board.updateBoard(24, 'W');
    expect(board.boardState).toBe(`WWWWWWW.
WWWWBW0.
0WWWWBB.
WWWWWBB.
.0WWBB..
.WW.BBW0
W0W....0
..W.....`);
    board.updateBoard(16, 'B');
    expect(board.boardState).toBe(`WWWWWWW.
WWWWBW0.
BBBBBBB.
WWWWWBB0
..WWBB00
.WW0BBW.
W.W.000.
..W.....`);
    board.updateBoard(39, 'W');
    expect(board.boardState).toBe(`WWWWWWW.
WWWWWW..
BBBBBWB0
WWWWWBW0
00WWBB0W
.WW0BBW0
W.W....0
..W.....`);
    board.updateBoard(47, 'B');
    expect(board.boardState).toBe(`WWWWWWW.
WWWWWW0.
BBBBBWB0
WWWWWBW0
..WWBB0W
.WW.BBBB
W.W00000
..W.....`);
    board.updateBoard(53, 'W');
    expect(board.boardState).toBe(`WWWWWWW.
WWWWWW..
BBBBBWB.
WWWWWWW0
00WWBW0W
.WW0WWWB
W.W.0W00
..W...0.`);
    board.updateBoard(31, 'B');
    expect(board.boardState).toBe(`WWWWWWW.
WWWWWW00
BBBBBWB0
WWWWWWWB
..WWBW.B
.WW0WWWB
W.W..W..
..W.....`);
    board.updateBoard(43, 'W');
    expect(board.boardState).toBe(`WWWWWWW.
WWWWWW..
BBBBBWB.
WWWWWWWB
00WWWW0B
0WWWWWWB
W.W00W00
.0W.0.0.`);
    board.updateBoard(52, 'B');
    expect(board.boardState).toBe(`WWWWWWW.
WWWWWW00
BBBBBWB0
WBWWBWWB
00BWBW.B
.WWBBWWB
W.W0BW..
..W00...`);
    board.updateBoard(51, 'W');
    expect(board.boardState).toBe(`WWWWWWW.
WWWWWW0.
BBBBBWB.
WBWWBWWB
00BWBW0B
0WWWWWWB
W0WWWW00
.0W0000.`);
    board.updateBoard(59, 'B');
    expect(board.boardState).toBe(`WWWWWWW.
WWWWWW00
BBBBBWB0
WBWBBWWB
00BBBW.B
.WWBWWWB
W.WBWW..
..WB0...`);
    board.updateBoard(33, 'W');
    expect(board.boardState).toBe(`WWWWWWW.
WWWWWW0.
BWBBBWB0
WWWBBWWB
0WWWWW0B
0WWBWWWB
W0WBWW00
.0WB00..`);
    board.updateBoard(38, 'B');
    expect(board.boardState).toBe(`WWWWWWW.
WWWWWW00
BWBBBWB0
WWWBBBBB
.WWWWWBB
.WWBWBWB
W.WBBW0.
..WB00..`);
    board.updateBoard(23, 'W');
    expect(board.boardState).toBe(`WWWWWWW.
WWWWWW00
BWBBBWWW
WWWBBBWB
0WWWWWBB
0WWBWBWB
W0WBBW00
.0WB00..`);
    board.updateBoard(32, 'B');
    expect(board.boardState).toBe(`WWWWWWW.
WWWWWW..
BWBBBWWW
BBWBBBWB
BBBBBBBB
0BWBWBWB
W0BBBW00
.0WB0...`);
    board.updateBoard(40, 'W');
    expect(board.boardState).toBe(`WWWWWWW.
WWWWWW00
WWBBBWWW
WBWBBBWB
WWBBBBBB
WWWBWBWB
W0BBBW00
.0WB000.`);
    board.updateBoard(49, 'B');
    expect(board.boardState).toBe(`WWWWWWW.
WWWWWW..
WWBBBWWW
WBWBBBWB
WBBBBBBB
WBBBWBWB
WBBBBW00
00WB00..`);
    board.updateBoard(56, 'W');
    expect(board.boardState).toBe(`WWWWWWW.
WWWWWW00
WWBBBWWW
WBWBWBWB
WBBWBBBB
WBWBWBWB
WWBBBW00
W0WB00..`);
    board.updateBoard(54, 'B');
    expect(board.boardState).toBe(`WWWWWWW.
WWWWWW..
WWBBBWWW
WBWBWBWB
WBBWBBBB
WBWBWBBB
WWBBBBB0
W0WB0000`);
    board.updateBoard(57, 'W');
    expect(board.boardState).toBe(`WWWWWWW.
WWWWWW00
WWBBBWWW
WBWBWWWB
WBBWWBBB
WBWWWBBB
WWWBBBB.
WWWB....`);
    board.updateBoard(14, 'B');
    expect(board.boardState).toBe(`WWWWWWW0
WWWWWWB0
WWBBBWBW
WBWBWWBB
WBBWWBBB
WBWWWBBB
WWWBBBB0
WWWB0000`);
    board.updateBoard(62, 'W');
    expect(board.boardState).toBe(`WWWWWWW.
WWWWWWW0
WWBBBWWW
WBWBWWWB
WBBWWBWB
WBWWWBWB
WWWBBWW0
WWWB00W0`);
    board.updateBoard(15, 'B');
    expect(board.boardState).toBe(`WWWWWWW.
WWWWWWWB
WWBBBWWB
WBWBWWWB
WBBWWBWB
WBWWWBWB
WWWBBWW.
WWWB00W.`);
    board.updateBoard(60, 'W');
    expect(board.boardState).toBe(`WWWWWWW.
WWWWWWWB
WWBBBWWB
WBWBWWWB
WBBWWBWB
WBWWWBWB
WWWWWWW0
WWWWW0W0`);
    board.updateBoard(61, 'B');
    expect(board.boardState).toBe(`WWWWWWW.
WWWWWWWB
WWBBBWWB
WBWBWWWB
WBBWWBWB
WBWBWBWB
WWWWBBB0
WWWWWBW0`);
    board.updateBoard(63, 'W');
    expect(board.boardState).toBe(`WWWWWWW.
WWWWWWWB
WWBBBWWB
WBWBWWWB
WBBWWBWB
WBWBWWWB
WWWWBBW0
WWWWWBWW`);
    board.updateBoard(55, 'B');
    expect(board.boardState).toBe(`WWWWWWW0
WWWWWWWB
WWBBBWWB
WBWBWWWB
WBBWWBWB
WBWBWWBB
WWWWBBBB
WWWWWBWW`);
    board.updateBoard(7, 'W');
    expect(board.boardState).toBe(`WWWWWWWW
WWWWWWWW
WWBBBWWW
WBWBWWWW
WBBWWBWW
WBWBWWBW
WWWWBBBW
WWWWWBWW`);
  });
});
