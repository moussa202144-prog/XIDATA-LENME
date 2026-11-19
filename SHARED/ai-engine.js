
window.XIDATA_AI = {
  chooseMove(config) {
    const moves = config.moves || [];

    if (moves.length === 0) return null;

    const difficulty = config.difficulty || "easy";
    const evaluate = config.evaluateMove;

    if (difficulty === "easy") {
      return moves[Math.floor(Math.random() * moves.length)];
    }

    const scoredMoves = moves.map(move => ({
      move,
      score: typeof evaluate === "function"
        ? evaluate(move)
        : 0
    }));

    scoredMoves.sort((a, b) => b.score - a.score);

    if (difficulty === "medium") {
      const top = scoredMoves.slice(
        0,
        Math.max(1, Math.ceil(scoredMoves.length / 2))
      );

      return top[Math.floor(Math.random() * top.length)].move;
    }

    // DIFFICILE : privilégier les meilleurs coups
    return scoredMoves[0].move;
  }
};
