/* =====================================================
   XIDATA LENME - FIREBASE
   Initialise Firebase, connecte le joueur en anonyme
   et expose window.LENME_FIREBASE pour online.js.

   Ordre de chargement dans index.html :
   1. firebase-app-compat.js
   2. firebase-auth-compat.js
   3. firebase-database-compat.js
   4. firebase.js (ce fichier)
   ===================================================== */

(() => {
  "use strict";

const firebaseConfig = {
    apiKey: "AIzaSyArjOBVkVP_7zK4053I5zvIF15gbG0KkR8",
    authDomain: "xidata-strategie-f598a.firebaseapp.com",
    databaseURL: "https://xidata-strategie-f598a-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "xidata-strategie-f598a",
    storageBucket: "xidata-strategie-f598a.firebasestorage.app",
    messagingSenderId: "698942672412",
    appId: "1:698942672412:web:c666ff68c8c196db5b59d9",
    measurementId: "G-J58GE79DWN"
  };

  const notReady = reason => {
    console.error("XIDATA LENME - Firebase :", reason);
    window.LENME_FIREBASE = { ready: false, reason, readyPromise: null };
  };

  if (!window.firebase || !firebase.database || !firebase.auth) {
    notReady("le SDK Firebase (app, auth, database) n'est pas chargé.");
    return;
  }

  if (Object.values(firebaseConfig).some(v => !v || String(v).includes("COLLE_ICI"))) {
    notReady("la configuration n'est pas renseignée dans firebase.js.");
    return;
  }

  try {
    // Réutilise l'application si elle existe déjà.
    const app = firebase.apps.length
      ? firebase.app()
      : firebase.initializeApp(firebaseConfig);

    const state = {
      ready: false,
      reason: "",
      uid: null,
      app,
      auth: firebase.auth(app),
      db: firebase.database(app),
      readyPromise: null
    };

    // La connexion est asynchrone : online.js attend readyPromise.
    state.readyPromise = state.auth.signInAnonymously()
      .then(credential => {
        state.uid = credential.user.uid;
        state.ready = true;
        console.log("XIDATA LENME : Firebase prêt !");
        return true;
      })
      .catch(error => {
        state.reason = error && error.code === "auth/operation-not-allowed"
          ? "la connexion anonyme n'est pas activée (console Firebase > Authentication > Méthode de connexion)."
          : (error && error.message) || "connexion impossible.";
        console.error("XIDATA LENME - Authentification :", error);
        return false;
      });

    window.LENME_FIREBASE = state;
  } catch (error) {
    notReady((error && error.message) || "initialisation impossible.");
  }
})();
