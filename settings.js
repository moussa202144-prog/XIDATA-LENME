/* =====================================================
   XIDATA LENME - RÉGLAGES PAR TYPE DE PARTIE
   Ordinateur / 2 joueurs / En ligne
   Charger AVANT game.js (après sounds.js)
   ===================================================== */
(() => {
  "use strict";

  const KEY = "xidataLenmeSettings";

  const MODES = [
    ["ai", "🤖", "Ordinateur"],
    ["local", "👥", "2 joueurs"],
    ["online", "🌍", "En ligne"]
  ];

  /* b = pions noirs (3 teintes), w = pions blancs (3 teintes) */
  const PAWNS = {
    ebene: {
      name: "Ébène & Ivoire",
      b: ["#7a5238", "#2a170b", "#0b0603"], edgeb: "#0b0603", ringb: "#e0a030",
      w: ["#fffaf0", "#eadbb6", "#b99d68"], edgew: "#8f7440", ringw: "#c4532a"
    },
    rouge: {
      name: "Rouge & Or",
      b: ["#ff7a6b", "#c62828", "#5e0b0b"], edgeb: "#4a0808", ringb: "#ffd27a",
      w: ["#fff3b0", "#f1c232", "#a67c00"], edgew: "#7a5a00", ringw: "#8a4b00"
    },
    bleu: {
      name: "Bleu & Ivoire",
      b: ["#7aa5ff", "#1e4fb8", "#0a1f55"], edgeb: "#08163d", ringb: "#bcd4ff",
      w: ["#fffaf0", "#eadbb6", "#b99d68"], edgew: "#8f7440", ringw: "#1e4fb8"
    },
    vert: {
      name: "Vert & Jaune",
      b: ["#7ad98e", "#1f9d43", "#0a4a1d"], edgeb: "#073414", ringb: "#e7f7c0",
      w: ["#fffbc2", "#f4e04d", "#b8a10f"], edgew: "#8a7a08", ringw: "#2e7d32"
    },
    noir: {
      name: "Noir & Argent",
      b: ["#5f5f5f", "#1d1d1d", "#000000"], edgeb: "#000000", ringb: "#c0c0c0",
      w: ["#ffffff", "#e3e6ea", "#9aa1ab"], edgew: "#6b7280", ringw: "#555555"
    }
  };

  const BOARDS = {
    terre:  { name: "Terre",  bd1: "#8c5832", bd2: "rgba(190,120,70,.55)", bd3: "rgba(90,50,25,.5)",   border: "#5a3519", hole1: "#3d2312", hole2: "#24130a" },
    savane: { name: "Savane", bd1: "#c9a566", bd2: "rgba(240,210,150,.55)", bd3: "rgba(130,95,40,.45)", border: "#8a6a32", hole1: "#5a4220", hole2: "#35250f" },
    argile: { name: "Argile", bd1: "#b5472b", bd2: "rgba(230,120,90,.5)",  bd3: "rgba(90,25,10,.5)",   border: "#6e2611", hole1: "#4a1c10", hole2: "#2a0e08" },
    foret:  { name: "Forêt",  bd1: "#3f7a45", bd2: "rgba(120,190,120,.45)", bd3: "rgba(15,55,25,.5)",  border: "#1f4a26", hole1: "#173b1d", hole2: "#0d2411" },
    nuit:   { name: "Nuit",   bd1: "#2a3550", bd2: "rgba(90,110,160,.4)",  bd3: "rgba(5,10,25,.55)",   border: "#121a2e", hole1: "#141b2e", hole2: "#0a0f1c" }
  };

  const TIMES = [
    [0, "Désactivé"],
    [10, "10 secondes"],
    [15, "15 secondes"],
    [30, "30 secondes"],
    [60, "1 minute"]
  ];

  const DEFAULTS = { pawns: "ebene", board: "terre", time: 0, noBack: false };

  let data = load();
  let version = 0;
  let tab = "ai";

  function load() {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY));
      return saved && typeof saved === "object" ? saved : {};
    } catch (error) {
      return {};
    }
  }

  function save() {
    version++;
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
    } catch (error) {
      console.warn("Erreur de sauvegarde des réglages.");
    }
  }

  function get(mode) {
    return { ...DEFAULTS, ...(data[mode] || {}) };
  }

  function change(patch) {
    data[tab] = { ...get(tab), ...patch };
    save();
    render();
  }

  /* Applique les couleurs et renvoie les règles à utiliser par game.js */
  function apply(mode) {
    const s = get(mode);
    const p = PAWNS[s.pawns] || PAWNS.ebene;
    const b = BOARDS[s.board] || BOARDS.terre;
    const st = document.documentElement.style;

    st.setProperty("--pb1", p.b[0]);
    st.setProperty("--pb2", p.b[1]);
    st.setProperty("--pb3", p.b[2]);
    st.setProperty("--edgeb", p.edgeb);
    st.setProperty("--ringb", p.ringb);

    st.setProperty("--pw1", p.w[0]);
    st.setProperty("--pw2", p.w[1]);
    st.setProperty("--pw3", p.w[2]);
    st.setProperty("--edgew", p.edgew);
    st.setProperty("--ringw", p.ringw);

    st.setProperty("--bd1", b.bd1);
    st.setProperty("--bd2", b.bd2);
    st.setProperty("--bd3", b.bd3);
    st.setProperty("--bdborder", b.border);
    st.setProperty("--hole1", b.hole1);
    st.setProperty("--hole2", b.hole2);

    return { time: Number(s.time) || 0, noBack: !!s.noBack };
  }

  /* ---------- Interface ---------- */

  const root = document.createElement("div");
  root.id = "settingsSheet";
  root.hidden = true;
  root.innerHTML = `
    <div class="ss-backdrop"></div>
    <div class="ss-panel" role="dialog" aria-modal="true" aria-label="Réglages de partie">
      <p class="ss-intro">Chaque type de partie a ses propres réglages.</p>
      <div class="ss-tabs" id="ssTabs"></div>

      <h3>Couleur des pions</h3>
      <div class="ss-grid" id="ssPawns"></div>

      <h3>Couleur du plateau</h3>
      <div class="ss-grid" id="ssBoards"></div>

      <h3>⏳ Temps de réflexion par tour</h3>
      <select id="ssTime" aria-label="Temps de réflexion par tour"></select>

      <h3>📏 Règle : retour arrière</h3>
      <select id="ssBack" aria-label="Règle retour arrière">
        <option value="off">Désactivée (les pions peuvent reculer)</option>
        <option value="on">Activée (pas de retour en arrière)</option>
      </select>
      <p class="ss-note" id="ssNote"></p>

      <details class="ss-rules" id="ssRules">
        <summary>📜 Règles du jeu</summary>
        <div class="ss-rules-body">
          <h4>But du jeu</h4>
          <p>Capturer tous les pions de l'adversaire, ou le bloquer pour qu'il ne puisse plus jouer.</p>

          <h4>Le plateau</h4>
          <p>Un plateau en croix de 13 cases. Chaque joueur a 6 pions. Les blancs jouent en premier.</p>

          <h4>Mode 1 · Classique</h4>
          <p>Les blancs occupent le haut et la gauche, les noirs le bas et la droite. La case centrale est vide.</p>

          <h4>Mode 2 · Personnalisé</h4>
          <p>Les joueurs placent leurs pions un par un, chacun à son tour, sur les cases libres. La case centrale doit rester vide. Les blancs placent en premier et jouent en premier. Tu peux annuler le dernier placement.</p>

          <h4>Se déplacer</h4>
          <p>À ton tour, avance un pion d'une case vers le haut, le bas, la gauche ou la droite, sur une case vide. Pas de déplacement en diagonale.</p>

          <h4>Capturer</h4>
          <p>Si un pion adverse est juste à côté du tien et que la case derrière lui est vide, saute par-dessus : il est retiré du plateau. Une seule capture par tour. Capturer n'est pas obligatoire.</p>

          <h4>Gagner</h4>
          <ul>
            <li>Tu captures tous les pions adverses.</li>
            <li>Ton adversaire ne peut plus bouger : tu gagnes par blocage.</li>
          </ul>

          <h4>Contre l'ordinateur</h4>
          <p>Tu joues les pions noirs. Choisis le niveau : facile, moyen ou difficile.</p>

          <h4>Réglages optionnels</h4>
          <p><strong>Temps de réflexion :</strong> si le temps est écoulé, un coup au hasard est joué pour toi.</p>
          <p><strong>Retour arrière :</strong> quand la règle est activée, un pion ne peut aller qu'en avant, à gauche ou à droite. Pour les blancs, avant = vers le bas ; pour les noirs, avant = vers le haut.</p>
        </div>
      </details>

      <button type="button" class="ss-close" id="ssClose">Fermer</button>
    </div>`;

  function dot(c) {
    return `<span class="ss-dot" style="background:radial-gradient(circle at 35% 30%,${c[0]},${c[1]} 55%,${c[2]})"></span>`;
  }

  function render() {
    const s = get(tab);

    root.querySelector("#ssTabs").innerHTML = MODES.map(([id, icon, label]) =>
      `<button type="button" class="ss-tab${id === tab ? " active" : ""}" data-tab="${id}">
         <span>${icon}</span> ${label}
       </button>`).join("");

    root.querySelector("#ssPawns").innerHTML = Object.entries(PAWNS).map(([id, p]) =>
      `<button type="button" class="ss-card${id === s.pawns ? " active" : ""}" data-pawns="${id}">
         <span class="ss-dots">${dot(p.b)}${dot(p.w)}</span>${p.name}
       </button>`).join("");

    root.querySelector("#ssBoards").innerHTML = Object.entries(BOARDS).map(([id, b]) =>
      `<button type="button" class="ss-card${id === s.board ? " active" : ""}" data-board="${id}">
         <span class="ss-swatch" style="background:${b.bd1};border-color:${b.border}">
           <i style="background:${b.hole1}"></i><i style="background:${b.hole1}"></i>
         </span>${b.name}
       </button>`).join("");

    const time = root.querySelector("#ssTime");
    time.innerHTML = TIMES.map(([v, l]) =>
      `<option value="${v}"${Number(s.time) === v ? " selected" : ""}>${l}</option>`).join("");

    root.querySelector("#ssBack").value = s.noBack ? "on" : "off";

    root.querySelector("#ssNote").textContent = s.noBack
      ? "Les règles s'appliquent à la prochaine partie. Un pion ne peut alors aller qu'en avant, à gauche ou à droite."
      : "Les règles s'appliquent à la prochaine partie. Les pions peuvent avancer, reculer et aller sur les côtés.";
  }

  root.addEventListener("click", event => {
    if (event.target.classList.contains("ss-backdrop")) return close();

    const button = event.target.closest("button");
    if (!button) return;

    if (button.id === "ssClose") return close();
    if (button.dataset.tab) { tab = button.dataset.tab; return render(); }
    if (button.dataset.pawns) return change({ pawns: button.dataset.pawns });
    if (button.dataset.board) return change({ board: button.dataset.board });
  });

  root.querySelector("#ssTime").addEventListener("change", event => {
    change({ time: Number(event.target.value) });
  });

  root.querySelector("#ssBack").addEventListener("change", event => {
    change({ noBack: event.target.value === "on" });
  });

  function open(mode) {
    if (MODES.some(m => m[0] === mode)) tab = mode;
    render();
    root.hidden = false;
  }

  function close() {
    root.hidden = true;
  }

  document.body.appendChild(root);

  /* Ouvre le panneau directement sur les règles */
  function openRules() {
    open();
    const details = root.querySelector("#ssRules");
    details.open = true;
    details.scrollIntoView({ block: "start" });
  }

  window.XIDATA_SETTINGS = { get, apply, open, openRules, close, version: () => version };
})();
