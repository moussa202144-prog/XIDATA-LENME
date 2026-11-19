window.XIDATA_WALLET = {
  getBalance() {
    return Number(localStorage.getItem("xidata_cauris") || 0);
  },

  add(amount) {
    if (!Number.isFinite(amount) || amount <= 0) return false;

    const balance = this.getBalance();
    localStorage.setItem("xidata_cauris", balance + amount);

    return this.getBalance();
  },

  spend(amount) {
    if (!Number.isFinite(amount) || amount <= 0) return false;

    const balance = this.getBalance();

    if (balance < amount) return false;

    localStorage.setItem("xidata_cauris", balance - amount);
    return true;
  },

  display() {
    return `${this.getBalance()} 🐚`;
  }
};
