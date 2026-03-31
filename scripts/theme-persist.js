/**
 * Theme Persist 1.0.0-starks
 * Speichert Dark/Light Mode in localStorage.
 * Der Toggle selbst laeuft nativ ueber Webflow/Lumos.
 * Dieses Script sorgt nur dafuer, dass die Wahl beim Reload erhalten bleibt.
 *
 * CDN: https://cdn.jsdelivr.net/gh/starks-design/cdn@main/scripts/theme-persist.js
 *
 * Einbindung im <head>:
 *   <script src="https://cdn.jsdelivr.net/gh/starks-design/cdn@main/scripts/theme-persist.js"></script>
 *
 * Erwartet:
 *   - Toggle-Buttons mit data-theme-toggle-button Attribut (light/dark/leer)
 *   - Klasse "dark-mode" oder "u-theme-dark" auf <html> oder <body>
 */
(function () {
  var html = document.documentElement;
  var KEY = "dark-mode";

  // 1. Sofort beim Laden: gespeicherten Zustand anwenden (vor Render)
  var saved = localStorage.getItem(KEY);
  if (saved === "true") {
    html.classList.add("dark-mode", "u-theme-dark");
  }

  // 2. Bei Klick auf Toggle: neuen Zustand speichern
  document.addEventListener("click", function (e) {
    var btn = e.target.closest("[data-theme-toggle-button]");
    if (!btn) return;

    // Kurz warten bis Webflow/Lumos die Klasse gesetzt hat
    requestAnimationFrame(function () {
      setTimeout(function () {
        var isDark =
          html.classList.contains("dark-mode") ||
          html.classList.contains("u-theme-dark") ||
          document.body.classList.contains("dark-mode") ||
          document.body.classList.contains("u-theme-dark");
        localStorage.setItem(KEY, isDark ? "true" : "false");
      }, 100);
    });
  });
})();
