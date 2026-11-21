/* =====================================================
   XIDATA LENME - PWA
   Enregistre le service worker et propose l'installation
   (bouton dans le panneau Options, sur Android / Chrome).
   Charger APRÈS settings.js.
   ===================================================== */
(() => {
  "use strict";

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("sw.js").catch(error => {
        console.warn("Service worker non enregistré :", error);
      });
    });
  }

  const alreadyInstalled =
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true;

  let installEvent = null;

  function addInstallButton() {
    if (alreadyInstalled || document.getElementById("ssInstall")) return;

    const panel = document.querySelector("#settingsSheet .ss-panel");
    if (!panel) return;

    const button = document.createElement("button");
    button.type = "button";
    button.id = "ssInstall";
    button.className = "ss-install";
    button.textContent = "📲 Installer l'application";

    button.addEventListener("click", async () => {
      if (!installEvent) return;
      installEvent.prompt();
      try { await installEvent.userChoice; } catch (error) {}
      installEvent = null;
      button.remove();
    });

    const before = panel.querySelector("#ssRules") || panel.querySelector("#ssClose");
    panel.insertBefore(button, before);
  }

  window.addEventListener("beforeinstallprompt", event => {
    event.preventDefault();
    installEvent = event;
    addInstallButton();
  });

  window.addEventListener("appinstalled", () => {
    installEvent = null;
    const button = document.getElementById("ssInstall");
    if (button) button.remove();
  });
})();
