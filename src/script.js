const cells = [...document.querySelectorAll('.cell')];
const statusEl = document.getElementById('status');
const resetBtn = document.getElementById('reset');
const modeButtons = [...document.querySelectorAll('.mode-btn')];
const difficultySelect = document.getElementById('difficulty');
const startPlayerSelect = document.getElementById('start-player');
const historyList = document.getElementById('history-list');

const scoreEls = {
  O: document.getElementById('score-o'),
  X: document.getElementById('score-x'),
  draw: document.getElementById('score-draw')
};

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
let score = { O: 0, X: 0, draw: 0 };
let history = [];

let audioCtx = null;

function initAudio() {
  if (!audioCtx) {
    const AudioCtor = window.AudioContext || window.webkitAudioContext;
    if (AudioCtor) audioCtx = new AudioCtor();
  }
}

function playTone(frequency, duration = 0.12, type = 'square', volume = 0.04) {
  if (!audioCtx) initAudio();
  if (!audioCtx) return;

  const oscillator = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();

  oscillator.type = type;
  oscillator.frequency.value = frequency;

  gainNode.gain.value = volume;
  oscillator.connect(gainNode);
  gainNode.connect(audioCtx.destination);

  const startTime = audioCtx.currentTime;
  oscillator.start(startTime);
  oscillator.stop(startTime + duration);

  gainNode.gain.setValueAtTime(volume, startTime);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
}

function playMoveSound() {
  playTone(520, 0.08, 'square', 0.04);
}

function playWinSound() {
  playTone(780, 0.18, 'triangle', 0.06);
  setTimeout(() => playTone(980, 0.18, 'triangle', 0.05), 120);
}

function playDrawSound() {
  playTone(350, 0.2, 'sawtooth', 0.04);
}

function updateStartPlayerOptions() {
  if (gameMode === 'cpu') {
    startPlayerSelect.innerHTML = `
      <option value="human">あなた</option>
      <option value="cpu">CPU</option>
    `;
    startPlayerSelect.value = 'human';
  } else {
    startPlayerSelect.innerHTML = `
      <option value="O" selected>O</option>
      <option value="X">X</option>
    `;
    startPlayerSelect.value = 'O';
  }
}

function setStatus(text) {
  statusEl.textContent = text;
}

function findWinningPattern(mark, boardState = board) {
  for (const pattern of WIN_PATTERNS) {
    if (pattern.every(index => boardState[index] === mark)) return pattern;
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

function renderScoreboard() {
  scoreEls.O.textContent = String(score.O);
  scoreEls.X.textContent = String(score.X);
  scoreEls.draw.textContent = String(score.draw);
}

function addHistory(text) {
  const li = document.createElement('li');
  li.textContent = text;
  historyList.prepend(li);
  if (historyList.children.length > 8) {
    historyList.removeChild(historyList.lastChild);
  }
}

function resetBoard() {
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

  if (gameMode === 'cpu') {
    const selected = startPlayerSelect.value;
    currentPlayer = selected === 'cpu' ? 'X' : 'O';
    setStatus(currentPlayer === 'X' ? 'CPU の番です' : 'プレイヤー O の番です');

    if (currentPlayer === 'X') {
      setTimeout(() => {
        if (!gameOver) {
          const cpuMove = getCpuMove();
          placeMark(cpuMove, 'X');
        }
      }, 400);
    }
    return;
  }

  const firstMark = startPlayerSelect.value;
  currentPlayer = firstMark === 'X' ? 'X' : 'O';
  setStatus(`プレイヤー ${currentPlayer} の番です`);
}

function finalizeRound(resultText) {
  setStatus(resultText);
  gameOver = true;
  disableAll();
}

function disableAll() {
  cells.forEach(cell => cell.disabled = true);
}

function placeMark(index, mark) {
  if (gameOver || board[index]) return;

  board[index] = mark;
  moves[mark].push(index);
  addMarkToCell(index, mark);
  playMoveSound();

  const winningPattern = findWinningPattern(mark);
  if (winningPattern) {
    animateWin(winningPattern);
    score[mark] += 1;
    renderScoreboard();
    addHistory(`${mark} 勝ち`);
    playWinSound();
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
      }, 450);
    }
    return;
  }

  if (board.filter(Boolean).length === 9) {
    score.draw += 1;
    renderScoreboard();
    addHistory('引き分け');
    playDrawSound();
    finalizeRound('引き分けです');
    return;
  }

  currentPlayer = mark === 'O' ? 'X' : 'O';

  if (gameMode === 'cpu' && currentPlayer === cpuMark) {
    setStatus('CPU の番です');
    setTimeout(() => {
      if (!gameOver) {
        const cpuMove = getCpuMove();
        placeMark(cpuMove, cpuMark);
      }
    }, 500);
    return;
  }

  setStatus(`プレイヤー ${currentPlayer} の番です`);
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
  cpuMark = 'X';

  updateStartPlayerOptions();
  resetBoard();
}

function onDifficultyChange(event) {
  difficulty = event.target.value;
  resetBoard();
}

function onStartPlayerChange() {
  resetBoard();
}

modeButtons.forEach(button => {
  button.addEventListener('click', () => {
    modeButtons.forEach(btn => btn.classList.toggle('active', btn === button));
    setMode(button.dataset.mode);
  });
});

difficultySelect.addEventListener('change', onDifficultyChange);
startPlayerSelect.addEventListener('change', onStartPlayerChange);

cells.forEach(cell => cell.addEventListener('click', handleCellClick));
resetBtn.addEventListener('click', resetBoard);

renderScoreboard();
updateStartPlayerOptions();
resetBoard();
