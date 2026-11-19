/* =====================================================
   XIDATA LENME - CONFIGURATION FIREBASE
   Initialise Firebase une seule fois et expose
   window.LENME_FIREBASE pour online.js.

   Ordre de chargement dans index.html :
   1. firebase-app-compat.js   (SDK)
   2. firebase-database-compat.js (SDK)
   3. firebase.js              (ce fichier)
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
    window.LENME_FIREBASE = {
      ready: false,
      reason
    };
  };

  if (!window.firebase || !firebase.database) {
    notReady("Le SDK Firebase n'est pas chargé.");
    return;
  }

  if (Object.values(firebaseConfig).some(
    value => !value || value.startsWith("TON_") ||
             value === "TA_VRAIE_API_KEY"
  )) {
    notReady("La configuration Firebase est incomplète.");
    return;
  }

  try {
    const app = firebase.apps.length
      ? firebase.app()
      : firebase.initializeApp(firebaseConfig);

    const auth = firebase.auth(app);
const db = firebase.database(app);

const state = {
  ready: false,
  app: app,
  auth: auth,
  db: db,
  readyPromise: null
};

window.LENME_FIREBASE = state;

state.readyPromise = auth.signInAnonymously()
  .then(() => {
    state.ready = true;
    console.log("XIDATA LENME : Firebase authentifié !");
    return true;
  })
  .catch(error => {
  document.getElementById("onlineStatus").textContent =
  "Erreur Firebase : " + state.reason;
  console.error("Erreur authentification :", error);
  return false;
});

auth.signInAnonymously()
  .then(() => {
    window.LENME_FIREBASE.ready = true;
    console.log("XIDATA LENME : Firebase authentifié !");
  })
  .catch(error => {
    console.error("Erreur authentification :", error);
    window.LENME_FIREBASE.reason = error.message;
  });

    console.log("XIDATA LENME : Firebase prêt !");

  } catch (error) {
    notReady(error.message || "Initialisation impossible.");
  }
})();
