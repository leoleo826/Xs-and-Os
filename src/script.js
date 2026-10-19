const cells = [...document.querySelectorAll('.cell')];
const statusEl = document.getElementById('status');
const resetBtn = document.getElementById('reset');

const WIN_PATTERNS = [
  [0,1,2],[3,4,5],[6,7,8],
  [0,3,6],[1,4,7],[2,5,8],
  [0,4,8],[2,4,6]
];

let board = Array(9).fill('');           // 'O' or 'X' or ''
let moves = { O: [], X: [] };            // each player's move order (FIFO: oldest at 0)
let currentPlayer = 'O';
let gameOver = false;

function setStatus(text){
  statusEl.textContent = text;
}

function isWinner(mark){
  return WIN_PATTERNS.some(pattern => pattern.every(i => board[i] === mark));
}

function disableAll(){
  cells.forEach(c => c.disabled = true);
}

function enableAll(){
  cells.forEach(c => c.disabled = false);
}

function resetGame(){
  board.fill('');
  moves = { O: [], X: [] };
  currentPlayer = 'O';
  gameOver = false;
  cells.forEach(c => {
    c.textContent = '';
    c.classList.remove('o','x');
    c.disabled = false;
  });
  setStatus('プレイヤー O の番です');
}

function removeOldestMove(mark){
  // remove and return index of the oldest move for `mark`
  if (moves[mark].length === 0) return null;
  const oldest = moves[mark].shift();
  board[oldest] = '';
  const cell = cells[oldest];
  cell.textContent = '';
  cell.classList.remove('o','x');
  cell.disabled = false;
  return oldest;
}

function handleCellClick(e){
  if (gameOver) return;
  const cell = e.currentTarget;
  const idx = Number(cell.dataset.index);
  if (board[idx]) return; // already filled

  // place the move
  board[idx] = currentPlayer;
  moves[currentPlayer].push(idx);
  cell.textContent = currentPlayer;
  cell.classList.add(currentPlayer === 'O' ? 'o' : 'x');
  cell.disabled = true;

  // immediate win check
  if (isWinner(currentPlayer)){
    setStatus(`プレイヤー ${currentPlayer} の勝ちです！`);
    gameOver = true;
    disableAll();
    return;
  }

  // 4つ目の入力ルール：同じプレイヤーの手が4つ以上で勝利していないなら最初の入力を削除
  if (moves[currentPlayer].length >= 4){
    const removed = removeOldestMove(currentPlayer);
    // notify and pass turn
    setStatus(`プレイヤー ${currentPlayer} が4つ目を入力したため、最初の入力（セル ${removed + 1}）が消えました。`);
    currentPlayer = currentPlayer === 'O' ? 'X' : 'O';
    setStatus(`プレイヤー ${currentPlayer} の番です`);
    return;
  }

  // draw check
  if (board.filter(Boolean).length === 9){
    setStatus('引き分けです');
    gameOver = true;
    disableAll();
    return;
  }

  // normal turn switch
  currentPlayer = currentPlayer === 'O' ? 'X' : 'O';
  setStatus(`プレイヤー ${currentPlayer} の番です`);
}

// wire events
cells.forEach(c => c.addEventListener('click', handleCellClick));
resetBtn.addEventListener('click', resetGame);

// init
setStatus('プレイヤー O の番です');
