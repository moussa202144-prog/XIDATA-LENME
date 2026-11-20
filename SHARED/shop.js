window.XIDATA_SHOP = {
  items: {
    undo: { name: "Annuler un déplacement", price: 5 },
    replay: { name: "Rejouer un coup", price: 8 },
    hint: { name: "Révéler un bon coup", price: 5 },
    shield: { name: "Bouclier stratégique", price: 10 },
    coach: { name: "Conseil du stratège", price: 8 }
  },

  getItems() {
    return Object.entries(this.items).map(([id, item]) => ({
      id,
      name: item.name,
      price: item.price
    }));
  },

  buy(id) {
    const item = this.items[id];

    if (!item) {
      return { success: false, message: "Avantage introuvable." };
    }

    if (!window.XIDATA_WALLET) {
      return { success: false, message: "Portefeuille indisponible." };
    }

    const success = window.XIDATA_WALLET.spend(item.price);

    if (!success) {
      return { success: false, message: "Tu n'as pas assez de cauris." };
    }

    return {
      success: true,
      id,
      name: item.name,
      message: "Achat réussi !"
    };
  }
};
