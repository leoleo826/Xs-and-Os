const cells = [...document.querySelectorAll('.cell')];
const statusEl = document.getElementById('status');
const resetBtn = document.getElementById('reset');
const modeButtons = [...document.querySelectorAll('.mode-btn')];
const difficultySelect = document.getElementById('difficulty');

const WIN_PATTERNS = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6]
];

let board = Array(9).fill('');
let moves = { O: [], X: [] };
let currentPlayer = 'O';
let gameOver = false;
let gameMode = 'pvp';
let cpuMark = 'X';
let difficulty = 'normal';

function setStatus(text) {
  statusEl.textContent = text;
}

function findWinningPattern(mark, boardState = board) {
  for (const pattern of WIN_PATTERNS) {
    if (pattern.every(index => boardState[index] === mark)) {
      return pattern;
    }
  }
  return null;
}

function isWinner(mark, boardState = board) {
  return findWinningPattern(mark, boardState) !== null;
}

function getAvailableMoves(boardState = board) {
  return boardState
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

function findImmediateWinningMove(mark, boardState = board) {
  const available = getAvailableMoves(boardState);

  for (const index of available) {
    boardState[index] = mark;
    const pattern = findWinningPattern(mark, boardState);
    boardState[index] = '';
    if (pattern) return index;
  }

  return null;
}

function minimax(boardState, depth, isMaximizing, aiMark, humanMark) {
  const aiWin = findWinningPattern(aiMark, boardState);
  const humanWin = findWinningPattern(humanMark, boardState);

  if (aiWin) return 10 - depth;
  if (humanWin) return depth - 10;

  const available = getAvailableMoves(boardState);
  if (available.length === 0) return 0;

  if (isMaximizing) {
    let bestScore = -Infinity;
    for (const move of available) {
      boardState[move] = aiMark;
      const score = minimax(boardState, depth + 1, false, aiMark, humanMark);
      boardState[move] = '';
      bestScore = Math.max(bestScore, score);
    }
    return bestScore;
  }

  let bestScore = Infinity;
  for (const move of available) {
    boardState[move] = humanMark;
    const score = minimax(boardState, depth + 1, true, aiMark, humanMark);
    boardState[move] = '';
    bestScore = Math.min(bestScore, score);
  }
  return bestScore;
}

function getCpuMove() {
  const available = getAvailableMoves();

  if (difficulty === 'easy') {
    const randomIndex = Math.floor(Math.random() * available.length);
    return available[randomIndex];
  }

  if (difficulty === 'normal') {
    const winningMove = findImmediateWinningMove(cpuMark);
    if (winningMove !== null) return winningMove;

    const humanMark = cpuMark === 'O' ? 'X' : 'O';
    const blockMove = findImmediateWinningMove(humanMark);
    if (blockMove !== null) return blockMove;

    if (available.includes(4)) return 4;

    const corners = [0, 2, 6, 8].filter(index => available.includes(index));
    if (corners.length > 0) return corners[0];

    return available[0];
  }

  // Hard: minimax
  let bestScore = -Infinity;
  let bestMove = available[0];
  const humanMark = cpuMark === 'O' ? 'X' : 'O';

  for (const move of available) {
    board[move] = cpuMark;
    const score = minimax(board, 0, false, cpuMark, humanMark);
    board[move] = '';

    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
    }
  }

  return bestMove;
}

function disableAll() {
  cells.forEach(cell => cell.disabled = true);
}

function resetGame() {
  board = Array(9).fill('');
  moves = { O: [], X: [] };
  currentPlayer = 'O';
  gameOver = false;
  clearWinHighlight();

  cells.forEach(cell => {
    cell.textContent = '';
    cell.classList.remove('o', 'x', 'win');
    cell.disabled = false;
  });

  if (gameMode === 'cpu' && cpuMark === 'X') {
    setStatus('CPU が先攻です');
    setTimeout(() => {
      if (!gameOver) {
        const cpuMove = getCpuMove();
        placeMark(cpuMove, 'X');
      }
    }, 500);
    return;
  }

  setStatus('プレイヤー O の番です');
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

  const winningPattern = findWinningPattern(mark);
  if (winningPattern) {
    animateWin(winningPattern);
    finalizeRound(`プレイヤー ${mark} の勝ちです！`);
    return;
  }

  if (moves[mark].length >= 4) {
    const removed = removeOldestMove(mark);
    const nextPlayer = mark === 'O' ? 'X' : 'O';

    setStatus(
      `プレイヤー ${mark} が4つ目を入力したため、最初の入力（セル ${removed + 1}）が消えました。次はプレイヤー ${nextPlayer} の番です`
    );
    currentPlayer = nextPlayer;

    if (gameMode === 'cpu' && currentPlayer === cpuMark) {
      setTimeout(() => {
        if (!gameOver) {
          const cpuMove = getCpuMove();
          placeMark(cpuMove, cpuMark);
        }
      }, 500);
    }
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
      if (!gameOver) {
        const cpuMove = getCpuMove();
        placeMark(cpuMove, cpuMark);
      }
    }, 500);
  }
}

function handleCellClick(event) {
  const cell = event.currentTarget;
  const idx = Number(cell.dataset.index);

  if (gameOver || board[idx]) return;
  if (gameMode === 'cpu' && currentPlayer === cpuMark) return;

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

difficultySelect.addEventListener('change', (event) => {
  difficulty = event.target.value;
  resetGame();
});

cells.forEach(cell => {
  cell.addEventListener('click', handleCellClick);
});

resetBtn.addEventListener('click', resetGame);

setStatus('プレイヤー O の番です');
