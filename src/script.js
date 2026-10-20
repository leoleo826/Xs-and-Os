const cells = [...document.querySelectorAll('.cell')];
const statusEl = document.getElementById('status');
const resetBtn = document.getElementById('reset');
const modeButtons = [...document.querySelectorAll('.mode-btn')];

const WIN_PATTERNS = [
  [0,1,2],[3,4,5],[6,7,8],
  [0,3,6],[1,4,7],[2,5,8],
  [0,4,8],[2,4,6]
];

let board = Array(9).fill('');
let moves = { O: [], X: [] };
let currentPlayer = 'O';
let gameOver = false;
let gameMode = 'pvp';
let cpuMark = 'X';
let winnerPattern = null;

function setStatus(text) {
  statusEl.textContent = text;
}

function findWinningPattern(mark) {
  for (const pattern of WIN_PATTERNS) {
    if (pattern.every(i => board[i] === mark)) return pattern;
  }
  return null;
}

function isWinner(mark) {
  return findWinningPattern(mark) !== null;
}

function disableAll() {
  cells.forEach(cell => cell.disabled = true);
}

function getAvailableMoves() {
  return board
    .map((value, index) => (value === '' ? index : null))
    .filter(value => value !== null);
}

function clearWinHighlight() {
  cells.forEach(cell => cell.classList.remove('win'));
}

function animateWin(pattern) {
  pattern.forEach(index => {
    const cell = cells[index];
    cell.classList.add('win');
  });
}

function addMarkToCell(index, mark) {
  const cell = cells[index];
  cell.textContent = mark;
  cell.classList.add(mark === 'O' ? 'o' : 'x');
  cell.disabled = true;
}

function removeMarkFromCell(index) {
  const cell = cells[index];
  cell.textContent = '';
  cell.classList.remove('o', 'x');
  cell.disabled = false;
}

function removeOldestMove(mark) {
  if (moves[mark].length === 0) return null;

  const oldest = moves[mark].shift();
  board[oldest] = '';
  removeMarkFromCell(oldest);
  return oldest;
}

function getBestCpuMove() {
  const available = getAvailableMoves();

  // すぐ勝てる手
  for (const idx of available) {
    board[idx] = cpuMark;
    if (isWinner(cpuMark)) {
      board[idx] = '';
      return idx;
    }
    board[idx] = '';
  }

  // 相手の一手先を防ぐ
  const humanMark = cpuMark === 'O' ? 'X' : 'O';
  for (const idx of available) {
    board[idx] = humanMark;
    if (isWinner(humanMark)) {
      board[idx] = '';
      return idx;
    }
    board[idx] = '';
  }

  // 中央を優先
  if (available.includes(4)) return 4;

  // 角を優先
  const corners = [0, 2, 6, 8].filter(index => available.includes(index));
  if (corners.length > 0) {
    return corners[Math.floor(Math.random() * corners.length)];
  }

  // それ以外
  return available[0];
}

function resetGame() {
  board = Array(9).fill('');
  moves = { O: [], X: [] };
  currentPlayer = 'O';
  gameOver = false;
  winnerPattern = null;
  clearWinHighlight();

  cells.forEach(cell => {
    cell.textContent = '';
    cell.classList.remove('o', 'x', 'win');
    cell.disabled = false;
  });

  if (gameMode === 'cpu' && cpuMark === 'X') {
    setStatus('CPU が先攻です');
    setTimeout(() => {
      if (gameOver) return;
      const cpuMove = getBestCpuMove();
      placeMark(cpuMove, 'X');
    }, 500);
  } else {
    setStatus('プレイヤー O の番です');
  }
}

function finalizeRound(message) {
  setStatus(message);
  gameOver = true;
  disableAll();
}

function placeMark(index, mark) {
  if (gameOver || board[index]) return;

  board[index] = mark;
  moves[mark].push(index);

  addMarkToCell(index, mark);

  const pattern = findWinningPattern(mark);
  if (pattern) {
    winnerPattern = pattern;
    animateWin(pattern);
    finalizeRound(`プレイヤー ${mark} の勝ちです！`);
    return;
  }

  if (moves[mark].length >= 4) {
    const removed = removeOldestMove(mark);
    const nextPlayer = mark === 'O' ? 'X' : 'O';

    setStatus(`プレイヤー ${mark} が4つ目を入力したため、最初の入力（セル ${removed + 1}）が消えました。次はプレイヤー ${nextPlayer} の番です`);
    currentPlayer = nextPlayer;
    return;
  }

  if (board.filter(Boolean).length === 9) {
    finalizeRound('引き分けです');
    return;
  }

  currentPlayer = mark === 'O' ? 'X' : 'O';
  setStatus(`プレイヤー ${currentPlayer} の番です`);

  if (gameMode === 'cpu' && currentPlayer === cpuMark) {
    setTimeout(() => {
      if (gameOver) return;
      const cpuMove = getBestCpuMove();
      placeMark(cpuMove, cpuMark);
    }, 500);
  }
}

function handleCellClick(event) {
  const cell = event.currentTarget;
  const idx = Number(cell.dataset.index);

  if (gameOver || board[idx]) return;

  if (gameMode === 'cpu' && currentPlayer === cpuMark) {
    return;
  }

  placeMark(idx, currentPlayer);
}

function setMode(nextMode) {
  gameMode = nextMode;
  cpuMark = nextMode === 'cpu' ? 'X' : 'O';
  resetGame();
}

modeButtons.forEach(button => {
  button.addEventListener('click', () => {
    modeButtons.forEach(btn => btn.classList.toggle('active', btn === button));
    setMode(button.dataset.mode);
  });
});

cells.forEach(cell => cell.addEventListener('click', handleCellClick));
resetBtn.addEventListener('click', resetGame);

setStatus('プレイヤー O の番です');
