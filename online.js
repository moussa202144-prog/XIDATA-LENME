/* =====================================================
   XIDATA LENME - JEU EN LIGNE (Firebase Realtime Database)
   Recherche automatique d'un adversaire, sans code.
   Données stockées sous "lenme/" uniquement.
   ===================================================== */

(() => {
  "use strict";

  const $ = id => document.getElementById(id);

  const findBtn = $("findMatchBtn");
  const cancelBtn = $("cancelMatchBtn");
  const statusEl = $("onlineStatus");

  if (!findBtn || !cancelBtn || !statusEl) return;

  if (!window.LENME) {
    statusEl.textContent = "Le jeu en ligne n'a pas pu être chargé.";
    findBtn.disabled = true;
    return;
  }

  const fb = window.LENME_FIREBASE;

  if (!fb || !fb.readyPromise) {
    statusEl.textContent =
      "Jeu en ligne indisponible : vérifie la configuration dans firebase.js.";
    findBtn.disabled = true;
    return;
  }

  // La connexion anonyme est asynchrone : on l'attend.
  findBtn.disabled = true;
  statusEl.textContent = "Connexion au jeu en ligne…";

  fb.readyPromise.then(ok => {
    if (!ok) {
      statusEl.textContent =
        "Jeu en ligne indisponible : " + (fb.reason || "connexion impossible.");
      return;
    }
    initOnline(fb);
  });

  function initOnline(fb) {
    const db = fb.db;
    const myId = fb.uid;
    const queueRef = db.ref("lenme/queue");

    let roomRef = null;
    let myColor = null;
    let searching = false;
    let started = false;
    let opponentSeen = false;

    /* ---------- Interface ---------- */

    function resetUI(message) {
      searching = false;
      findBtn.hidden = false;
      findBtn.disabled = false;
      cancelBtn.hidden = true;
      cancelBtn.disabled = false;
      statusEl.textContent =
        message || "Appuie sur le bouton pour trouver un adversaire.";
    }

    /* ---------- Nettoyage ---------- */

    function detach() {
      if (!roomRef) return;
      roomRef.child("black").off();
      roomRef.child("state").off();
      roomRef.child("presence").off();
    }

    function cleanup() {
      detach();

      const ref = roomRef;
      const color = myColor;
      const wasStarted = started;

      roomRef = null;
      myColor = null;
      started = false;
      opponentSeen = false;

      window.LENME.onLocalState = null;
      window.LENME.onQuit = null;

      if (!ref) return;

      if (!wasStarted) {
        // Hôte encore en attente : retirer l'annonce et la salle.
        queueRef.transaction(cur => (cur && cur.uid === myId ? null : cur));
        ref.remove();
        return;
      }

      // Partie commencée : retirer ma présence ; le dernier à partir
      // supprime la salle.
      ref.child("presence/" + color).remove().then(() => {
        ref.child("presence").once("value", snap => {
          if (!snap.exists()) ref.remove();
        });
      }).catch(() => {});
    }

    /* ---------- Recherche d'un adversaire ---------- */

    function findMatch() {
      if (searching || started) return;

      searching = true;
      findBtn.hidden = true;
      cancelBtn.hidden = false;
      cancelBtn.disabled = true;
      statusEl.textContent = "Recherche d'un adversaire…";

      const newRoomId = db.ref("lenme/rooms").push().key;
      let taken = null;

      queueRef.transaction(current => {
        taken = null;

        // Quelqu'un attend déjà : on prend sa place dans la file.
        if (current && current.uid !== myId && current.room) {
          taken = current;
          return null;
        }

        // Sinon, on s'inscrit et on attend.
        return { uid: myId, room: newRoomId };
      }, (error, committed) => {
        if (error || !committed) {
          resetUI("Connexion impossible. Vérifie ta connexion et réessaie.");
          return;
        }

        if (taken) joinRoom(taken.room);
        else hostRoom(newRoomId);
      }, false);
    }

    function hostRoom(roomId) {
      myColor = "white";
      roomRef = db.ref("lenme/rooms/" + roomId);

      roomRef.set({ white: myId, black: "" }).then(() => {
        // Si je quitte brutalement pendant l'attente, tout est nettoyé.
        queueRef.onDisconnect().remove();
        roomRef.onDisconnect().remove();

        cancelBtn.disabled = false;
        statusEl.textContent = "En attente d'un adversaire…";

        roomRef.child("black").on("value", snap => {
          if (!started && snap.val()) beginGame();
        });
      }).catch(() => {
        cleanup();
        resetUI("Connexion impossible. Réessaie.");
      });
    }

    function joinRoom(roomId) {
      myColor = "black";
      roomRef = db.ref("lenme/rooms/" + roomId);

      roomRef.once("value").then(snap => {
        const room = snap.val();

        // L'hôte est parti entre-temps : on relance une recherche.
        if (!room || room.black) {
          roomRef = null;
          myColor = null;
          searching = false;
          findMatch();
          return null;
        }

        return roomRef.child("black").set(myId).then(beginGame);
      }).catch(() => {
        cleanup();
        resetUI("Connexion impossible. Réessaie.");
      });
    }

    /* ---------- Début de la partie ---------- */

    function beginGame() {
      if (started || !roomRef) return;
      started = true;
      searching = false;

      // La partie commence : on annule les nettoyages d'attente.
      queueRef.onDisconnect().cancel();
      roomRef.onDisconnect().cancel();

      const other = myColor === "white" ? "black" : "white";
      const myPresence = roomRef.child("presence/" + myColor);
      myPresence.set(true);
      myPresence.onDisconnect().remove();

      window.LENME.startOnlineGame(myColor);
      showScreen("game");

      // Mes coups sont envoyés à l'adversaire.
      window.LENME.onLocalState = state => {
        if (!roomRef) return;
        state.by = myColor;
        roomRef.child("state").set(state);
      };

      // Quitter la partie depuis le menu Options.
      window.LENME.onQuit = () => {
        cleanup();
        resetUI();
      };

      // Coups de l'adversaire
      roomRef.child("state").on("value", snap => {
        const state = snap.val();
        if (state && state.by !== myColor) {
          window.LENME.applyRemoteState(state);
        }
      });

      // Présence de l'adversaire
      roomRef.child("presence").on("value", snap => {
        const presence = snap.val() || {};

        if (presence[other]) {
          opponentSeen = true;
          return;
        }

        if (opponentSeen) {
          opponentSeen = false;

          const current = window.LENME.getState();
          if (current.over) return;

          current.over = true;
          current.winner = myColor;
          current.msg = "Ton adversaire a quitté la partie : tu gagnes !";
          current.by = "system";
          window.LENME.applyRemoteState(current);
        }
      });
    }

    /* ---------- Annuler la recherche ---------- */

    function cancelSearch() {
      if (!searching) return;
      cleanup();
      resetUI();
    }

    findBtn.addEventListener("click", findMatch);
    cancelBtn.addEventListener("click", cancelSearch);

    const backBtn = $("onlineBackBtn");
    if (backBtn) backBtn.addEventListener("click", cancelSearch);

    const onlineBtn = $("onlineBtn");
    if (onlineBtn) {
      onlineBtn.addEventListener("click", () => {
        if (!searching && !started) resetUI();
      });
    }

    /* ---------- Joueurs connectés (accueil) ---------- */

    const presenceEl = $("presence");
    const countEl = $("onlineCount");

    if (presenceEl && countEl) {
      const myOnline = db.ref("lenme/online/" + myId);

      db.ref(".info/connected").on("value", snap => {
        if (snap.val() === true) {
          myOnline.onDisconnect().remove();
          myOnline.set(true);
        }
      });

      db.ref("lenme/online").on("value", snap => {
        const n = snap.numChildren();
        countEl.textContent = n + (n > 1 ? " joueurs connectés" : " joueur connecté");
        presenceEl.hidden = false;
      });
    }

    resetUI();
  }
})();
