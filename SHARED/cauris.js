window.XIDATA_ECONOMY = Object.freeze({
  currency: {
    name: "Cauris",
    symbol: "🐚"
  },

  rewards: {
    ai: {
      easy: 5,
      medium: 10,
      hard: 15
    },
    online: 10
  },

  shop: {
    undo: 5,
    replay: 8,
    hint: 5,
    shield: 10,
    coach: 8
  },

  getReward(mode, difficulty) {
    if (mode === "online") return this.rewards.online;
    if (mode === "ai") return this.rewards.ai[difficulty] || 0;
    return 0;
  },

  getPrice(advantage) {
    return this.shop[advantage] || 0;
  },

  format(amount) {
    return `${amount} 🐚`;
  }
});
