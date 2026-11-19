
/* =====================================================
   XIDATA LENME - MOTEUR SONORE AFRICAIN
   Sons synthétisés : mbira, tambours et shaker
   Aucun fichier audio nécessaire
   ===================================================== */

(() => {
  "use strict";
  // PROFIL DU JOUEUR
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

// Charger le profil
let playerProfile;

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

function renderProfileStats() {
  const total = playerProfile.wins + playerProfile.losses;

  const rate = total > 0
    ? Math.round((playerProfile.wins / total) * 100)
    : 0;

  document.getElementById("profileWins").textContent =
    playerProfile.wins;

  document.getElementById("profileLosses").textContent =
    playerProfile.losses;

  document.getElementById("profileWinRate").textContent =
    rate + " %";
}

renderProfileStats();

// Afficher le profil
playerNicknameInput.value = playerProfile.nickname;
playerNicknameDisplay.textContent = playerProfile.nickname;

playerAvatarSelect.value = playerProfile.avatar;
playerAvatarDisplay.textContent = playerProfile.avatar;

// Sauvegarder le profil
function savePlayerProfile() {
  localStorage.setItem(
    PROFILE_KEY,
    JSON.stringify(playerProfile)
  );
}

// Modifier le pseudonyme
playerNicknameInput.addEventListener("input", () => {
  playerProfile.nickname =
    playerNicknameInput.value.trim() || "Joueur";

  playerNicknameDisplay.textContent =
    playerProfile.nickname;

  savePlayerProfile();
});

// Modifier l'avatar
playerAvatarSelect.addEventListener("change", () => {
  playerProfile.avatar = playerAvatarSelect.value;

  playerAvatarDisplay.textContent =
    playerProfile.avatar;

  savePlayerProfile();
});

const playerNicknameInput =
  document.getElementById("playerNickname");

const playerNicknameDisplay =
  document.getElementById("playerNicknameDisplay");

// Charger le pseudonyme enregistré
let playerProfile = {
  nickname: localStorage.getItem(PROFILE_KEY) || "Joueur"
};

playerNicknameInput.value = playerProfile.nickname;
playerNicknameDisplay.textContent = playerProfile.nickname;

// Enregistrer chaque modification
playerNicknameInput.addEventListener("input", () => {
  const nickname = playerNicknameInput.value.trim() || "Joueur";

  playerProfile.nickname = nickname;

  localStorage.setItem(PROFILE_KEY, nickname);

  playerNicknameDisplay.textContent = nickname;
});

  let ctx = null;
  let master = null;
  let muted = false;

  try {
    muted = localStorage.getItem("xidata-lenme-muted") === "1";
  } catch (e) {}

  /* ---------- AUDIO ---------- */

  function getCtx() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;

      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.8;
      master.connect(ctx.destination);
    }

    if (ctx.state === "suspended") {
      ctx.resume();
    }

    return ctx;
  }

  function tone(freq, start, dur, opts = {}) {
    if (!getCtx()) return;

    const {
      type = "sine",
      gain = 0.3,
      endFreq = null,
      attack = 0.003
    } = opts;

    const t = ctx.currentTime + start;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);

    if (endFreq) {
      osc.frequency.exponentialRampToValueAtTime(endFreq, t + dur);
    }

    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);

    osc.connect(g);
    g.connect(master);

    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  function noise(start, dur, opts = {}) {
    if (!getCtx()) return;

    const {
      freq = 2000,
      q = 1,
      gain = 0.3,
      type = "bandpass"
    } = opts;

    const t = ctx.currentTime + start;
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));

    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < len; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const src = ctx.createBufferSource();
    src.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = freq;
    filter.Q.value = q;

    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);

    src.connect(filter);
    filter.connect(g);
    g.connect(master);

    src.start(t);
    src.stop(t + dur + 0.02);
  }

  /* ---------- INSTRUMENTS ---------- */

  function mbira(freq, start = 0, gain = 0.25) {
    tone(freq, start, 0.7, {
      type: "triangle",
      gain
    });

    tone(freq * 2.01, start, 0.35, {
      gain: gain * 0.4
    });

    tone(freq * 5.4, start, 0.08, {
      gain: gain * 0.25
    });
  }

  function drum(start = 0, pitch = 120, gain = 0.5) {
    tone(pitch * 1.8, start, 0.3, {
      gain,
      endFreq: pitch
    });

    noise(start, 0.04, {
      freq: 900,
      gain: gain * 0.3
    });
  }

  function slap(start = 0, gain = 0.4) {
    noise(start, 0.09, {
      freq: 2200,
      q: 0.8,
      gain
    });

    tone(260, start, 0.12, {
      gain: gain * 0.6,
      endFreq: 140
    });
  }

  function logDrum(start = 0, pitch = 300, gain = 0.35) {
    tone(pitch, start, 0.16, {
      type: "triangle",
      gain,
      endFreq: pitch * 0.6
    });

    noise(start, 0.02, {
      freq: 3000,
      gain: gain * 0.25
    });
  }

  function shaker(start = 0, gain = 0.18) {
    noise(start, 0.07, {
      freq: 7000,
      q: 0.7,
      gain,
      type: "highpass"
    });
  }

  /* ---------- MELODIES ---------- */

  const C5 = 523.25;
  const D5 = 587.33;
  const E5 = 659.25;
  const G5 = 783.99;
  const A5 = 880;
  const C6 = 1046.5;
  const G4 = 392;

  const SOUNDS = {

    select: () => {
      mbira(A5, 0, 0.18);
    },

    move: () => {
      logDrum(0, 320, 0.35);
    },

    capture: () => {
      slap(0, 0.45);
      drum(0.02, 110, 0.45);
    },

    victory: () => {
      [0, 0.25, 0.5, 0.875].forEach((t, i) => {
        drum(t, i === 3 ? 90 : 120, 0.5);
      });

      slap(0.375, 0.35);
      slap(0.75, 0.35);

      [G4, C5, D5, E5, G5, E5, G5, C6]
        .forEach((f, i) => {
          mbira(f, 0.2 + i * 0.16, 0.24);
        });

      for (let i = 0; i < 8; i++) {
        shaker(i * 0.2, 0.12);
      }
    },

    defeat: () => {
      [E5, D5, C5, G4].forEach((f, i) => {
        mbira(f, i * 0.25, 0.2);
      });

      drum(1.0, 80, 0.45);
    }
  };

  /* ---------- LECTURE DES SONS ---------- */

  function play(name) {
    if (muted || !SOUNDS[name]) return;

    if (!getCtx()) return;

    try {
      SOUNDS[name]();
    } catch (e) {
      console.error("XIDATA LENME - Son :", e);
    }
  }

  window.xidataPlaySound = play;

  /* ---------- DÉTECTION DU PLATEAU ---------- */

  function snapshot(boardEl) {
    return Array.from(boardEl.children).map(cell => {
      const pawn = cell.querySelector(".pawn");

      if (!pawn) return "";

      return pawn.classList.contains("black") ? "b" : "w";
    });
  }

  function selectedIndex(boardEl) {
    return Array.from(boardEl.children)
      .findIndex(cell => cell.classList.contains("selected"));
  }

  function watchBoard(boardEl) {
    if (!boardEl) return;

    let previous = null;
    let previousSelected = -1;

    const observer = new MutationObserver(() => {
      const current = snapshot(boardEl);

      if (current.length !== 49) return;

      const selected = selectedIndex(boardEl);

      if (previous) {
        const count = array => array.filter(Boolean).length;

        const before = count(previous);
        const after = count(current);

        const changed = previous.some((value, i) => {
          return value !== current[i];
        });

        if (after > before || after === 0) {
          // Nouvelle partie ou placement : silence
        } else if (after < before) {
          play("capture");
        } else if (changed) {
          play("move");
        } else if (selected !== -1 && selected !== previousSelected) {
          play("select");
        }
      }

      previous = current;
      previousSelected = selected;
    });

    observer.observe(boardEl, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class"]
    });
  }

  /* ---------- BOUTON SON ---------- */

  function buildToggle() {
    const style = document.createElement("style");

    style.textContent = `
      .sound-toggle {
        position: fixed;
        right: max(12px, env(safe-area-inset-right));
        bottom: max(12px, env(safe-area-inset-bottom));
        z-index: 50;
        width: 48px;
        height: 48px;
        padding: 0;
        margin: 0;
        border-radius: 50%;
        border: 2px solid #e0a030;
        background: #2d1a0c;
        color: #f3e6c8;
        font-size: 22px;
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(0,0,0,.5);
      }

      body:not([data-view="game"]) .sound-toggle {
        display: none;
      }
    `;

    document.head.appendChild(style);

    const button = document.createElement("button");

    button.type = "button";
    button.className = "sound-toggle";
    button.setAttribute("aria-label", "Activer ou couper le son");

    function refresh() {
      button.textContent = muted ? "🔇" : "🔊";
      button.setAttribute("aria-pressed", String(!muted));
    }

    button.addEventListener("click", () => {
      muted = !muted;

      try {
        localStorage.setItem(
          "xidata-lenme-muted",
          muted ? "1" : "0"
        );
      } catch (e) {}

      refresh();

      if (!muted) play("select");
    });

    refresh();
    document.body.appendChild(button);
  }

  /* ---------- INITIALISATION ---------- */

  function init() {
    watchBoard(document.querySelector("#board"));
    buildToggle();

    console.log("XIDATA LENME : moteur sonore chargé !");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }

})();
