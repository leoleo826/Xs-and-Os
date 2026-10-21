const cells = [...document.querySelectorAll('.cell')];
const statusEl = document.getElementById('status');
const resetBtn = document.getElementById('reset');
const modeButtons = [...document.querySelectorAll('.mode-btn')];
const difficultySelect = document.getElementById('difficulty');
const startPlayerSelect = document.getElementById('start-player');
const humanMarkSelect = document.getElementById('human-mark');
const cpuMarkContainer = document.getElementById('cpu-mark-container');
const historyList = document.getElementById('history-list');
const forcedDrawNoteEl = document.getElementById('forced-draw-note');

const scoreEls = {
  O: document.getElementById('score-o'),
  X: document.getElementById('score-x'),
  draw: document.getElementById('score-draw')
};

const STORAGE_KEY = 'tictactoe-history-v1';

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
let currentPlayer = 'O';
let gameOver = false;
let gameMode = 'pvp';
let difficulty = 'normal';
let score = { O: 0, X: 0, draw: 0 };
let history = [];
let humanMark = 'X';
let cpuMark = 'O';
let audioCtx = null;

function loadPersistentState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;

    const parsed = JSON.parse(raw);
    if (parsed.score) {
      score = { ...score, ...parsed.score };
    }
    if (Array.isArray(parsed.history)) {
      history = parsed.history.slice(0, 20);
    }
  } catch (error) {
    console.warn('状態の読み込みに失敗しました:', error);
  }
}

function savePersistentState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ score, history }));
  } catch (error) {
    console.warn('状態の保存に失敗しました:', error);
  }
}

function initAudio() {
  const AudioCtor = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtor) return;
  audioCtx = new AudioCtor();
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

function setStatus(text) {
  statusEl.textContent = text;
}

function showForcedDrawNote(show, text = '') {
  if (show) {
    forcedDrawNoteEl.textContent = text;
    forcedDrawNoteEl.classList.remove('hidden');
  } else {
    forcedDrawNoteEl.textContent = '';
    forcedDrawNoteEl.classList.add('hidden');
  }
}

function renderScoreboard() {
  scoreEls.O.textContent = String(score.O);
  scoreEls.X.textContent = String(score.X);
  scoreEls.draw.textContent = String(score.draw);
}

function renderHistory() {
  historyList.innerHTML = '';
  history.forEach(entry => {
    const li = document.createElement('li');
    li.textContent = entry;
    historyList.appendChild(li);
  });
}

function addHistory(entry) {
  history.unshift(entry);
  history = history.slice(0, 12);
  savePersistentState();
  renderHistory();
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

function canPlayerStillWin(mark) {
  return WIN_PATTERNS.some(pattern => {
    const cellsInLine = pattern.map(index => board[index]);
    const hasOpponent = cellsInLine.some(value => value !== '' && value !== mark);

    if (hasOpponent) return false;

    const emptyCount = cellsInLine.filter(value => value === '').length;
    return emptyCount > 0;
  });
}

function isForcedDraw() {
  return !canPlayerStillWin('O') && !canPlayerStillWin('X');
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

    const opponentMark = cpuMark === 'O' ? 'X' : 'O';
    const blockMove = findImmediateWinningMove(opponentMark);
    if (blockMove !== null) return blockMove;

    if (available.includes(4)) return 4;

    const corners = [0, 2, 6, 8].filter(index => available.includes(index));
    if (corners.length > 0) return corners[0];

    return available[0];
  }

  let bestScore = -Infinity;
  let bestMove = available[0];
  const opponentMark = cpuMark === 'O' ? 'X' : 'O';

  for (const move of available) {
    board[move] = cpuMark;
    const score = minimax(board, 0, false, cpuMark, opponentMark);
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

function updateStartPlayerOptions() {
  if (gameMode === 'cpu') {
    startPlayerSelect.innerHTML = `
      <option value="human" selected>あなた</option>
      <option value="cpu">CPU</option>
    `;
    startPlayerSelect.value = 'human';
    cpuMarkContainer.classList.remove('hidden');
  } else {
    startPlayerSelect.innerHTML = `
      <option value="O" selected>O</option>
      <option value="X">X</option>
    `;
    startPlayerSelect.value = 'O';
    cpuMarkContainer.classList.add('hidden');
  }
}

function syncCpuMarks() {
  if (gameMode !== 'cpu') return;

  const chosenHumanMark = humanMarkSelect.value;
  humanMark = chosenHumanMark;
  cpuMark = humanMark === 'X' ? 'O' : 'X';
}

function resetBoard() {
  board = Array(9).fill('');
  currentPlayer = 'O';
  gameOver = false;
  clearWinHighlight();
  showForcedDrawNote(false);

  cells.forEach(cell => {
    cell.textContent = '';
    cell.classList.remove('o', 'x', 'win');
    cell.disabled = false;
  });

  if (gameMode === 'cpu') {
    syncCpuMarks();

    const selectedFirst = startPlayerSelect.value;
    currentPlayer = selectedFirst === 'cpu' ? cpuMark : humanMark;

    setStatus(currentPlayer === cpuMark ? 'CPU の番です' : 'あなたの番です');

    if (currentPlayer === cpuMark) {
      setTimeout(() => {
        if (!gameOver) {
          const cpuMove = getCpuMove();
          placeMark(cpuMove, cpuMark);
        }
      }, 450);
    }
    return;
  }

  const firstMark = startPlayerSelect.value;
  currentPlayer = firstMark === 'X' ? 'X' : 'O';
  setStatus(`プレイヤー ${currentPlayer} の番です`);
}

function finalizeRound(message) {
  setStatus(message);
  gameOver = true;
  disableAll();
  savePersistentState();
}

function placeMark(index, mark) {
  if (gameOver || board[index]) return;

  board[index] = mark;
  addMarkToCell(index, mark);
  playMoveSound();

  const winningPattern = findWinningPattern(mark);
  if (winningPattern) {
    animateWin(winningPattern);
    score[mark] += 1;
    renderScoreboard();
    addHistory(`${mark} 勝ち`);
    playWinSound();
    showForcedDrawNote(false);
    finalizeRound(`プレイヤー ${mark} の勝ちです！`);
    return;
  }

  if (isForcedDraw()) {
    score.draw += 1;
    renderScoreboard();
    addHistory('強制引き分け');
    playDrawSound();
    showForcedDrawNote(true, 'どちらも 3 つ並べる余地がないため引き分けです');
    finalizeRound('どちらも 3 つ並べる余地がないため引き分けです');
    return;
  }

  if (board.filter(Boolean).length === 9) {
    score.draw += 1;
    renderScoreboard();
    addHistory('引き分け');
    playDrawSound();
    showForcedDrawNote(false);
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
    }, 450);
    return;
  }

  setStatus(`プレイヤー ${currentPlayer} の番です`);
}

function handleCellClick(event) {
  const cell = event.currentTarget;
  const index = Number(cell.dataset.index);

  if (gameOver || board[index]) return;
  if (gameMode === 'cpu' && currentPlayer === cpuMark) return;

  placeMark(index, currentPlayer);
}

function setMode(nextMode) {
  gameMode = nextMode;
  updateStartPlayerOptions();
  resetBoard();
}

modeButtons.forEach(button => {
  button.addEventListener('click', () => {
    modeButtons.forEach(btn => btn.classList.toggle('active', btn === button));
    setMode(button.dataset.mode);
  });
});

difficultySelect.addEventListener('change', event => {
  difficulty = event.target.value;
  resetBoard();
});

startPlayerSelect.addEventListener('change', () => {
  resetBoard();
});

humanMarkSelect.addEventListener('change', () => {
  syncCpuMarks();
  resetBoard();
});

cells.forEach(cell => {
  cell.addEventListener('click', handleCellClick);
});

resetBtn.addEventListener('click', resetBoard);

loadPersistentState();
renderScoreboard();
renderHistory();
updateStartPlayerOptions();
resetBoard();
