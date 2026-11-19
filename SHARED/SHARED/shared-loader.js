(function () {
  "use strict";

  const loaderUrl = document.currentScript.src;

  const scripts = [
    "cauris.js",
    "wallet.js",
    "shop.js",
    "ai-engine.js"
  ];

  function loadScript(index) {
    if (index >= scripts.length) {
      console.log("XIDATA GAMES : systèmes chargés !");
      window.dispatchEvent(new Event("xidata-shared-ready"));
      return;
    }

    const script = document.createElement("script");
    script.src = new URL(scripts[index], loaderUrl).href;

    script.onload = function () {
      loadScript(index + 1);
    };

    script.onerror = function () {
      console.error("Erreur de chargement : " + scripts[index]);
    };

    document.head.appendChild(script);
  }

  loadScript(0);
})();