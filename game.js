(() => {
  "use strict";

  const SIZE = 7;
  const WHITE = "white";
  const BLACK = "black";
  const EMPTY = null;

  const boardElement = document.getElementById("board");
  const statusElement = document.getElementById("status");
  const whiteCountElement = document.getElementById("whiteCount");
  const blackCountElement = document.getElementById("blackCount");
  const resetButton = document.getElementById("reset");
  const undoButton = document.getElementById("undoPlacement");
  const historyBtn = document.getElementById("historyBtn");
  const historyPanel = document.getElementById("gameHistoryPanel");
  const clearHistoryBtn = document.getElementById("clearHistoryBtn");

  clearHistoryBtn.addEventListener("click", () => {
    if (!confirm("Veux-tu vraiment effacer tout l'historique ?")) {
      return;
    }

    gameHistory = [];
    saveGameHistory();
    renderGameHistory();
  });

  historyBtn.addEventListener("click", () => {
    historyPanel.hidden = !historyPanel.hidden;
    historyBtn.textContent = historyPanel.hidden
      ? "📜 Historique"
      : "✖ Fermer l'historique";
  });

  let board = [];
  let selected = null;
  let currentPlayer = WHITE;
  let gameOver = false;
  let resultRecorded = false;
  let winner = null;
  let endMessage = "";
  let customPlacement = false;
  let placedPieces = 0;
  let placementHistory = [];

  // MODE CONTRE L'ORDINATEUR
  let aiMode = false;
  let aiDifficulty = "easy";
  let aiThinking = false;
  let aiTimer = null;

  // RÉGLAGES (couleurs, chrono, retour arrière)
  let activeSettings = { time: 0, noBack: false };
  let appliedStamp = "";
  let turnTimerId = null, turnTimerKey = "", turnLeft = 0;

  // RÈGLE ANTI-RÉPÉTITION
  // Une position = plateau + joueur au trait. Si la même position
  // revient 3 fois (contre l'ordinateur ou à deux sur le même appareil),
  // la partie est nulle. Pas appliqué en ligne.
  const REPEAT_LIMIT = 3;
  const positionCounts = new Map();
  let lastAIMove = null;

  const timerEl = document.createElement("p");
  timerEl.id = "turnTimer";
  timerEl.className = "turn-timer";
  timerEl.hidden = true;
  statusElement.after(timerEl);

  function settingsModeKey() {
    if (currentGameMode.startsWith("ai")) return "ai";
    if (currentGameMode === "online") return "online";
    return "local";
  }

  function syncSettings() {
    const S = window.XIDATA_SETTINGS;
    if (!S) return;
    const stamp = settingsModeKey() + ":" + S.version();
    if (stamp === appliedStamp) return;
    appliedStamp = stamp;
    activeSettings = S.apply(settingsModeKey());
  }

  function backwardBlocked(player, dr) {
    if (!activeSettings.noBack) return false;
    return player === WHITE ? dr < 0 : dr > 0;
  }

  function isMyTurnToPlay() {
    if (gameOver || customPlacement) return false;
    if (aiMode) return currentPlayer === BLACK;
    if (onlineMode) return currentPlayer === myColor;
    return true;
  }

  function stopTurnTimer() {
    clearInterval(turnTimerId);
    turnTimerId = null;
    turnTimerKey = "";
    timerEl.hidden = true;
  }

  function showTimer() {
    timerEl.hidden = false;
    timerEl.textContent = "⏳ " + turnLeft + " s";
    timerEl.classList.toggle("urgent", turnLeft <= 5);
  }

  function playRandomMove() {
    const moves = getAllMoves(currentPlayer);
    if (!moves.length) return;
    applyMove(moves[Math.floor(Math.random() * moves.length)]);
    finishTurn();
  }

  function syncTurnTimer() {
    const limit = activeSettings.time;
    if (!limit || !isMyTurnToPlay()) { stopTurnTimer(); return; }

    const k = getBoardPositionKey() + currentPlayer;
    if (k === turnTimerKey) return;

    stopTurnTimer();
    turnTimerKey = k;
    turnLeft = limit;
    showTimer();

    turnTimerId = setInterval(() => {
      turnLeft--;
      showTimer();
      if (turnLeft <= 0) {
        stopTurnTimer();
        playRandomMove();   // temps écoulé : coup au hasard
      }
    }, 1000);
  }

  // CORRECTION : cette variable n'était jamais déclarée, ce qui faisait
  // planter tous les boutons "nouvelle partie" et le mode ordinateur.
  const aiPositionHistory = new Map();

  // PROFIL DU JOUEUR
  const PROFILE_KEY = "xidataLenmeProfile";

  const playerNicknameInput =
    document.getElementById("playerNickname");

  const playerNicknameDisplay =
    document.getElementById("playerNicknameDisplay");

  const playerAvatarSelect =
    document.getElementById("playerAvatar");

  const playerAvatarDisplay =
    document.getElementById("playerAvatarDisplay");

  let playerProfile = {};

  try {
    playerProfile = JSON.parse(
      localStorage.getItem(PROFILE_KEY)
    ) || {};
  } catch (error) {
    playerProfile = {};
  }

  playerProfile.nickname = playerProfile.nickname || "Joueur";
  playerProfile.avatar = playerProfile.avatar || "👤";
  playerProfile.wins = Number(playerProfile.wins) || 0;
  playerProfile.losses = Number(playerProfile.losses) || 0;

  playerNicknameInput.value = playerProfile.nickname;
  playerNicknameDisplay.textContent = playerProfile.nickname;

  playerAvatarSelect.value = playerProfile.avatar;
  playerAvatarDisplay.textContent = playerProfile.avatar;

  function savePlayerProfile() {
    localStorage.setItem(
      PROFILE_KEY,
      JSON.stringify(playerProfile)
    );
  }

  function renderProfileStats() {
    const total = playerProfile.wins + playerProfile.losses;

    const rate = total > 0
      ? Math.round(playerProfile.wins / total * 100)
      : 0;

    document.getElementById("profileWins").textContent =
      playerProfile.wins;

    document.getElementById("profileLosses").textContent =
      playerProfile.losses;

    document.getElementById("profileWinRate").textContent =
      rate + " %";
  }

  playerNicknameInput.addEventListener("input", () => {
    playerProfile.nickname =
      playerNicknameInput.value.trim() || "Joueur";

    playerNicknameDisplay.textContent = playerProfile.nickname;
    savePlayerProfile();
  });

  playerAvatarSelect.addEventListener("change", () => {
    playerProfile.avatar = playerAvatarSelect.value;
    playerAvatarDisplay.textContent = playerProfile.avatar;
    savePlayerProfile();
  });

  renderProfileStats();

  // STATISTIQUES DU JEU
  const STATS_KEY = "xidataLenmeStats";

  // HISTORIQUE DES PARTIES
  const HISTORY_KEY = "xidataLenmeHistory";

  let gameHistory = loadGameHistory();

  function loadGameHistory() {
    try {
      const saved = JSON.parse(localStorage.getItem(HISTORY_KEY));
      return Array.isArray(saved) ? saved : [];
    } catch (error) {
      return [];
    }
  }

  function saveGameHistory() {
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(gameHistory));
    } catch (error) {
      console.warn("Erreur de sauvegarde de l'historique.");
    }
  }

  function renderGameHistory() {
    const list = document.getElementById("gameHistoryList");
    if (!list) return;

    list.innerHTML = "";

    if (gameHistory.length === 0) {
      list.textContent = "Aucune partie enregistrée.";
      return;
    }

    gameHistory.forEach((entry, index) => {
      const item = document.createElement("div");
      item.className = "history-entry";

      const title = document.createElement("strong");
      title.textContent = `${entry.winner} — ${entry.result}`;

      const details = document.createElement("p");
      details.textContent =
        `${entry.date} | Mode : ${entry.mode}`;

      const deleteButton = document.createElement("button");
      deleteButton.textContent = "🗑️";
      deleteButton.className = "delete-history-entry";
      deleteButton.type = "button";

      deleteButton.addEventListener("click", () => {
        if (!confirm("Supprimer cette partie de l'historique ?")) {
          return;
        }

        gameHistory.splice(index, 1);
        saveGameHistory();
        renderGameHistory();
      });

      item.appendChild(title);
      item.appendChild(details);
      item.appendChild(deleteButton);

      list.appendChild(item);
    });
  }

  let stats = loadStats();

  function loadStats() {
    const defaults = {
      gamesPlayed: 0,
      whiteWins: 0,
      blackWins: 0,
      draws: 0
    };

    try {
      const saved = JSON.parse(localStorage.getItem(STATS_KEY));
      return saved ? { ...defaults, ...saved } : defaults;
    } catch (error) {
      return defaults;
    }
  }

  function saveStats() {
    try {
      localStorage.setItem(STATS_KEY, JSON.stringify(stats));
    } catch (error) {
      console.warn("Erreur de sauvegarde des statistiques.");
    }
  }

  function renderStats() {
    for (const key of ["gamesPlayed", "whiteWins", "blackWins", "draws"]) {
      const element = document.getElementById(key);
      if (element) element.textContent = stats[key];
    }
  }

  function recordGameResult() {
    if (resultRecorded || !gameOver || onlineMode) return;

    resultRecorded = true;
    stats.gamesPlayed++;

    if (winner === WHITE) {
      stats.whiteWins++;
    } else if (winner === BLACK) {
      stats.blackWins++;
    } else {
      stats.draws++;
    }

    // Statistiques personnelles contre l'ordinateur
    // (un match nul n'est ni une victoire ni une défaite)
    if (aiMode) {
      if (winner === BLACK) {
        playerProfile.wins++;
      } else if (winner === WHITE) {
        playerProfile.losses++;
      }

      savePlayerProfile();
      renderProfileStats();
    }

    addGameToHistory();
    saveStats();
    renderStats();
  }

  function addGameToHistory() {
    const isDraw = !winner;

    const entry = {
      date: new Date().toLocaleString("fr-FR"),
      winner: isDraw ? "Match nul" : (winner === WHITE ? "Blancs" : "Noirs"),
      mode: currentGameMode,
      result: isDraw
        ? "même position 3 fois"
        : (endMessage.includes("lagade")
            ? "Victoire par captures"
            : "Victoire par blocage")
    };

    gameHistory.unshift(entry);

    // Conserver les 100 dernières parties
    gameHistory = gameHistory.slice(0, 100);

    saveGameHistory();
    renderGameHistory();
  }

  // MODE EN LIGNE
  let onlineMode = false;
  let myColor = null;

  // MÉMORISER LE MODE DE PARTIE
  let currentGameMode = "classic";

  function key(row, col) {
    return row * SIZE + col;
  }

  function coordinates(index) {
    return { row: Math.floor(index / SIZE), col: index % SIZE };
  }

  function isActive(row, col) {
    return (
      row >= 0 && row < SIZE &&
      col >= 0 && col < SIZE &&
      (row === 3 || col === 3)
    );
  }

  function opponent(player) {
    return player === WHITE ? BLACK : WHITE;
  }

  function playerName(player) {
    return player === WHITE ? "Blancs" : "Noirs";
  }

  function countPieces(player) {
    return board.filter(piece => piece === player).length;
  }

  /* ---------- Anti-répétition ---------- */

  // Enregistre la position actuelle et renvoie combien de fois elle est apparue.
  function trackPosition() {
    const k = getBoardPositionKey() + currentPlayer;
    const n = (positionCounts.get(k) || 0) + 1;
    positionCounts.set(k, n);
    return n;
  }

  // Position obtenue si "mover" joue ce coup (sans modifier le plateau).
  function positionAfter(move, mover) {
    const saved = board.slice();
    applyMove(move);
    const k = getBoardPositionKey() + opponent(mover);
    board = saved;
    return k;
  }

  /* ---------- Remise à zéro commune ---------- */

  function clearAITimer() {
    stopTurnTimer();
    if (aiTimer !== null) {
      clearTimeout(aiTimer);
      aiTimer = null;
    }
    aiThinking = false;
  }

  function resetState() {
    clearAITimer();
    board = Array(SIZE * SIZE).fill(EMPTY);
    selected = null;
    currentPlayer = WHITE;
    gameOver = false;
    resultRecorded = false;
    winner = null;
    endMessage = "";
    customPlacement = false;
    placedPieces = 0;
    placementHistory = [];
    aiMode = false;
    onlineMode = false;
    myColor = null;
    positionCounts.clear();
    lastAIMove = null;
  }

  /* ---------- Démarrage des parties ---------- */

  function setupGame() {
    resetState();
    currentGameMode = "classic";

    // Blancs : trois pions en haut et trois à gauche.
    // Noirs : trois pions en bas et trois à droite.
    for (let i = 0; i < 3; i++) {
      board[key(i, 3)] = WHITE;
      board[key(3, i)] = WHITE;
    }
    for (let i = 4; i < 7; i++) {
      board[key(i, 3)] = BLACK;
      board[key(3, i)] = BLACK;
    }

    trackPosition();   // position de départ
    render();
  }

  function startCustomGame() {
    resetState();
    currentGameMode = "custom";
    customPlacement = true;
    render();
  }

  function startAIClassicGame(difficulty) {
    aiPositionHistory.clear();
    aiDifficulty = difficulty || "easy";

    setupGame();

    currentGameMode = "ai-classic";
    aiMode = true;
    render();
    scheduleAIMove();
  }

  // Les pions sont placés un par un : l'ordinateur (blancs)
  // commence, puis le joueur (noirs), en alternance.
  function startAICustomGame(difficulty) {
    aiPositionHistory.clear();
    aiDifficulty = difficulty || "easy";

    startCustomGame();

    currentGameMode = "ai-custom";
    aiMode = true;
    render();
    scheduleAIPlacement();
  }

  function startOnlineGame(color) {
    setupGame();
    currentGameMode = "online";
    onlineMode = true;
    myColor = color === BLACK ? BLACK : WHITE;
    render();
  }

  window.startClassicGame = setupGame;
  window.startCustomGame = startCustomGame;
  window.startAIClassicGame = startAIClassicGame;
  window.startAICustomGame = startAICustomGame;

  /* ---------- Règles ---------- */

  const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];

  function getCaptures(from) {
    const { row, col } = coordinates(from);
    const enemy = opponent(board[from]);
    const captures = [];

    for (const [dr, dc] of directions) {
      if (backwardBlocked(board[from], dr)) continue;
      const mr = row + dr, mc = col + dc;
      const tr = row + dr * 2, tc = col + dc * 2;

      if (!isActive(mr, mc) || !isActive(tr, tc)) continue;

      const middle = key(mr, mc);
      const target = key(tr, tc);

      if (board[middle] === enemy && board[target] === EMPTY) {
        captures.push({ from, middle, to: target, isCapture: true });
      }
    }
    return captures;
  }

  function getNormalMoves(from) {
    const { row, col } = coordinates(from);
    const moves = [];

    for (const [dr, dc] of directions) {
      if (backwardBlocked(board[from], dr)) continue;
      const tr = row + dr, tc = col + dc;
      if (!isActive(tr, tc)) continue;

      const target = key(tr, tc);
      if (board[target] === EMPTY) {
        moves.push({ from, to: target, isCapture: false });
      }
    }
    return moves;
  }

  function getAllCaptures(player) {
    const result = [];
    board.forEach((piece, index) => {
      if (piece === player) result.push(...getCaptures(index));
    });
    return result;
  }

  function getAllMoves(player) {
    const moves = [];
    board.forEach((piece, index) => {
      if (piece === player) {
        moves.push(...getNormalMoves(index));
        moves.push(...getCaptures(index));
      }
    });
    return moves;
  }

  function applyMove(move) {
    board[move.to] = board[move.from];
    board[move.from] = EMPTY;
    if (move.isCapture) board[move.middle] = EMPTY;
  }

  /* ---------- Intelligence artificielle ---------- */

  // Note "de base" d'un coup (sans tenir compte des répétitions).
  function baseMoveScore(move) {
    if (aiDifficulty === "hard") {
      return evaluateMoveWithLookahead(move);
    }

    let score = move.isCapture ? 100 : 0;
    const { row, col } = coordinates(move.to);
    if (row === 3 || col === 3) score += 2;
    return score;
  }

  // Anti-répétition de l'ordinateur :
  // - un coup qui amènerait un match nul (3e répétition) est écarté s'il y a d'autres choix ;
  // - un coup qui répète une position déjà vue n'est gardé que s'il est nettement meilleur ;
  // - l'ordinateur évite de rejouer le même pion en boucle, avec un peu de hasard.
  function pickAIOptions(moves) {
    const scored = moves.map(move => ({
      move,
      id: move.from + "-" + move.to,
      score: baseMoveScore(move),
      seen: positionCounts.get(positionAfter(move, WHITE)) || 0,
      sameStone: lastAIMove !== null && move.from === lastAIMove.to
    }));

    const fresh = scored.filter(s => s.seen === 0);
    let keep;

    if (fresh.length > 0) {
      const bestFresh = Math.max(...fresh.map(s => s.score));
      const desperate = bestFresh <= -5000;   // défaite quasi certaine : le nul est acceptable

      keep = scored.filter(s =>
        s.seen === 0 ||
        (s.seen === 1 && s.score > bestFresh + 40) ||
        (s.seen >= REPEAT_LIMIT - 1 && desperate)
      );
    } else {
      const safe = scored.filter(s => s.seen < REPEAT_LIMIT - 1);
      keep = safe.length > 0 ? safe : scored;
    }

    const table = new Map(keep.map(s => [s.id, s]));

    return {
      moves: keep.map(s => s.move),
      score(move) {
        const s = table.get(move.from + "-" + move.to);
        if (!s) return -Infinity;
        return s.score - s.seen * 25 - (s.sameStone ? 6 : 0) + Math.random() * 3;
      }
    };
  }

  function scheduleAIMove() {
    if (!aiMode || gameOver || currentPlayer !== WHITE || aiThinking) return;

    aiThinking = true;
    render();

    aiTimer = setTimeout(() => {
      aiTimer = null;

      const moves = getAllMoves(WHITE);

      if (moves.length === 0) {
        aiThinking = false;
        finishTurn();
        return;
      }

      const options = pickAIOptions(moves);

      const chosenMove = window.XIDATA_AI
        ? window.XIDATA_AI.chooseMove({
            moves: options.moves,
            difficulty: aiDifficulty,
            evaluateMove: move => options.score(move)
          })
        : options.moves[Math.floor(Math.random() * options.moves.length)];

      if (chosenMove) {
        applyMove(chosenMove);
        lastAIMove = chosenMove;
      }

      aiThinking = false;
      finishTurn();
    }, 600);
  }

  function getBoardPositionKey() {
    return board.map(piece => {
      if (piece === WHITE) return "W";
      if (piece === BLACK) return "B";
      return ".";
    }).join("");
  }

  function rememberAIPosition() {
    const k = getBoardPositionKey();
    aiPositionHistory.set(k, (aiPositionHistory.get(k) || 0) + 1);
  }

  function evaluateBoardForAI() {
    const whiteMoves = getAllMoves(WHITE);
    const blackMoves = getAllMoves(BLACK);

    // Victoire / défaite par blocage
    if (blackMoves.length === 0) return 10000;
    if (whiteMoves.length === 0) return -10000;

    // Éviter les positions déjà rencontrées
    if ((aiPositionHistory.get(getBoardPositionKey()) || 0) > 0) return 0;

    const whiteCaptures = getAllCaptures(WHITE);
    const blackCaptures = getAllCaptures(BLACK);

    let score = 0;
    score += countPieces(WHITE) * 20;
    score -= countPieces(BLACK) * 20;
    score += whiteMoves.length * 3;
    score -= blackMoves.length * 5;
    score += whiteCaptures.length * 35;
    score -= blackCaptures.length * 45;

    if (blackMoves.length <= 2) score += 80;
    if (blackMoves.length <= 4) score += 30;
    if (whiteMoves.length <= 2) score -= 80;

    return score;
  }

  function minimaxAI(player, depth, alpha, beta) {
    const moves = getAllMoves(player);

    if (moves.length === 0) return player === WHITE ? -10000 : 10000;
    if (countPieces(WHITE) === 0) return -10000;
    if (countPieces(BLACK) === 0) return 10000;
    if (depth === 0) return evaluateBoardForAI();

    const maximizing = player === WHITE;
    let bestScore = maximizing ? -Infinity : Infinity;

    for (const move of moves) {
      const previousBoard = board.slice();
      applyMove(move);

      const score = minimaxAI(opponent(player), depth - 1, alpha, beta);

      board = previousBoard;

      if (maximizing) {
        bestScore = Math.max(bestScore, score);
        alpha = Math.max(alpha, bestScore);
      } else {
        bestScore = Math.min(bestScore, score);
        beta = Math.min(beta, bestScore);
      }

      if (beta <= alpha) break;
    }
    return bestScore;
  }

  function evaluateMoveWithLookahead(move) {
    const originalBoard = board.slice();
    applyMove(move);
    const score = minimaxAI(BLACK, 2, -Infinity, Infinity);
    board = originalBoard;
    return score;
  }

  // PLACEMENT MANUEL DE L'ORDINATEUR (pions blancs)
  function scheduleAIPlacement() {
    if (!aiMode || !customPlacement || currentPlayer !== WHITE || aiThinking) {
      return;
    }

    aiThinking = true;
    render();

    aiTimer = setTimeout(() => {
      aiTimer = null;

      const candidates = [];
      for (let i = 0; i < SIZE * SIZE; i++) {
        const { row, col } = coordinates(i);
        if (isActive(row, col) && board[i] === EMPTY && i !== key(3, 3)) {
          candidates.push(i);
        }
      }

      if (candidates.length === 0) {
        aiThinking = false;
        return;
      }

      const chosen = window.XIDATA_AI
        ? window.XIDATA_AI.chooseMove({
            moves: candidates,
            difficulty: aiDifficulty,
            evaluateMove: () => Math.random()
          })
        : candidates[Math.floor(Math.random() * candidates.length)];

      board[chosen] = WHITE;
      placementHistory.push({ index: chosen, player: WHITE });
      placedPieces++;
      aiThinking = false;

      if (placedPieces === 12) {
        afterPlacement();
        return;
      }

      currentPlayer = BLACK;
      render();
    }, 600);
  }

  /* ---------- Affichage ---------- */

  function statusText() {
    if (customPlacement) {
      if (aiMode) {
        return currentPlayer === WHITE
          ? "L'ordinateur place un pion blanc…"
          : "À toi de placer un pion noir";
      }
      return `Placement libre : aux ${playerName(currentPlayer)} de placer un pion`;
    }
    if (onlineMode) {
      return currentPlayer === myColor
        ? `À toi de jouer (${playerName(myColor)})`
        : "Tour de l'adversaire…";
    }
    if (aiMode) {
      return currentPlayer === WHITE
        ? "L'ordinateur réfléchit…"
        : "À toi de jouer (Noirs)";
    }
    return `Aux ${playerName(currentPlayer)} de jouer`;
  }

  function render() {
    syncSettings();
    boardElement.innerHTML = "";

    const possibleMoves =
      selected !== null && !gameOver ? getAllMoves(currentPlayer) : [];

    for (let row = 0; row < SIZE; row++) {
      for (let col = 0; col < SIZE; col++) {
        const cell = document.createElement("div");
        cell.className = "cell";

        if (!isActive(row, col)) {
          cell.classList.add("hidden");
          boardElement.appendChild(cell);
          continue;
        }

        const index = key(row, col);
        const piece = board[index];

        if (piece) {
          const pawn = document.createElement("div");
          pawn.className = `pawn ${piece}`;
          cell.appendChild(pawn);
        }

        if (selected === index) cell.classList.add("selected");

        if (possibleMoves.some(m => m.from === selected && m.to === index)) {
          cell.classList.add("possible");
        }

        cell.addEventListener("click", () => handleClick(index));
        boardElement.appendChild(cell);
      }
    }

    const whiteCount = countPieces(WHITE);
    const blackCount = countPieces(BLACK);

    whiteCountElement.textContent = customPlacement ? `${whiteCount}/6` : whiteCount;
    blackCountElement.textContent = customPlacement ? `${blackCount}/6` : blackCount;

    undoButton.hidden =
      !customPlacement ||
      placementHistory.length === 0 ||
      (aiMode && placementHistory.length < 3);

    // En ligne, on quitte via le menu Options.
    resetButton.hidden = onlineMode;

    statusElement.textContent = gameOver ? endMessage : statusText();
    syncTurnTimer();
  }

  function playEndSound() {
    if (!window.xidataPlaySound || !winner) return;

    let won = true;
    if (aiMode) won = winner === BLACK;
    if (onlineMode) won = winner === myColor;

    window.xidataPlaySound(won ? "victory" : "defeat");
  }

  function pushOnline() {
    if (window.LENME && typeof window.LENME.onLocalState === "function") {
      window.LENME.onLocalState(getState());
    }
  }

  function finishTurn() {
    const mover = currentPlayer;

    selected = null;
    currentPlayer = opponent(currentPlayer);

    if (aiMode && aiDifficulty === "hard") rememberAIPosition();

    if (countPieces(currentPlayer) === 0) {
      gameOver = true;
      winner = mover;
      endMessage = "Niyide ti lagade !";
    } else if (getAllMoves(currentPlayer).length === 0) {
      gameOver = true;
      winner = mover;
      endMessage = `${playerName(mover)} gagnent par blocage !`;
    } else if (!onlineMode && trackPosition() >= REPEAT_LIMIT) {
      // Même position 3 fois : match nul (ordinateur et 2 joueurs)
      gameOver = true;
      winner = null;
      endMessage = "Match nul : la même position est revenue 3 fois !";
    }

    if (gameOver) recordGameResult();

    render();

    if (onlineMode) pushOnline();

    if (gameOver) {
      playEndSound();
      return;
    }

    if (aiMode && currentPlayer === WHITE) scheduleAIMove();
  }

  // Fin du placement libre : les blancs commencent.
  function afterPlacement() {
    customPlacement = false;
    currentPlayer = WHITE;

    positionCounts.clear();
    trackPosition();   // position de départ après le placement

    if (getAllMoves(WHITE).length === 0) {
      gameOver = true;
      winner = BLACK;
      endMessage = "Noirs gagnent par blocage !";
      recordGameResult();
      render();
      playEndSound();
      return;
    }

    render();
    statusElement.textContent = "Placement terminé ! Aux Blancs de jouer.";

    if (aiMode) scheduleAIMove();
  }

  /* ---------- Clics ---------- */

  function handleClick(index) {
    if (gameOver || aiThinking) return;
    if (aiMode && currentPlayer === WHITE) return;
    if (onlineMode && currentPlayer !== myColor) return;

    // Placement libre
    if (customPlacement) {
      if (index === key(3, 3)) {
        statusElement.textContent = "La case centrale doit rester vide.";
        return;
      }
      if (board[index] !== EMPTY) {
        statusElement.textContent = "Cette case est déjà occupée.";
        return;
      }

      board[index] = currentPlayer;
      placementHistory.push({ index, player: currentPlayer });
      placedPieces++;

      if (placedPieces === 12) {
        afterPlacement();
        return;
      }

      if (aiMode) {
        currentPlayer = WHITE;
        render();
        scheduleAIPlacement();
        return;
      }

      currentPlayer = opponent(currentPlayer);
      render();
      return;
    }

    const moves = getAllMoves(currentPlayer);

    if (selected !== null) {
      const chosenMove = moves.find(
        m => m.from === selected && m.to === index
      );

      if (chosenMove) {
        applyMove(chosenMove);
        finishTurn(); // une seule capture par tour
        return;
      }
    }

    if (board[index] === currentPlayer) {
      selected = index;
      render();
      return;
    }

    selected = null;
    render();
  }

  /* ---------- Annuler un placement ---------- */

  window.undoPlacement = function () {
    if (!customPlacement || aiThinking || placementHistory.length === 0) return;

    if (aiMode) {
      // On retire le dernier pion de l'ordinateur puis le tien.
      if (placementHistory.length < 3) return;
      for (let i = 0; i < 2; i++) {
        const last = placementHistory.pop();
        board[last.index] = EMPTY;
        placedPieces--;
      }
      currentPlayer = BLACK;
      render();
      return;
    }

    const last = placementHistory.pop();
    board[last.index] = EMPTY;
    placedPieces--;
    currentPlayer = last.player;
    render();
  };

  /* ---------- Nouvelle partie ---------- */

  function newGame() {
    aiPositionHistory.clear();

    switch (currentGameMode) {
      case "custom":
        startCustomGame();
        break;
      case "ai-classic":
        startAIClassicGame(aiDifficulty);
        break;
      case "ai-custom":
        startAICustomGame(aiDifficulty);
        break;
      default:
        setupGame();
    }
  }

  resetButton.addEventListener("click", newGame);
  undoButton.addEventListener("click", () => window.undoPlacement());

  // Quitter la partie : arrêter l'ordinateur et la connexion en ligne.
  document.getElementById("quitGameBtn").addEventListener("click", () => {
    clearAITimer();
    if (onlineMode && window.LENME && typeof window.LENME.onQuit === "function") {
      window.LENME.onQuit();
    }
    onlineMode = false;
    myColor = null;
    aiMode = false;
  });

  /* ---------- Passerelle pour le jeu en ligne ---------- */

  function getState() {
    return {
      board: getBoardPositionKey(),
      turn: currentPlayer,
      over: gameOver,
      winner: winner || "",
      msg: endMessage
    };
  }

  function applyRemoteState(s) {
    if (!onlineMode || !s || typeof s.board !== "string" ||
        s.board.length !== SIZE * SIZE) {
      return;
    }

    board = s.board.split("").map(c =>
      c === "W" ? WHITE : c === "B" ? BLACK : EMPTY
    );
    selected = null;
    currentPlayer = s.turn === BLACK ? BLACK : WHITE;
    gameOver = !!s.over;
    winner = s.winner || null;
    endMessage = s.msg || "";

    render();
    if (gameOver) playEndSound();
  }

  window.LENME = {
    getMode: settingsModeKey,
    refresh: render,
    startOnlineGame,
    applyRemoteState,
    getState,
    onLocalState: null,
    onQuit: null
  };

  renderStats();
  renderGameHistory();
  setupGame();
})();
