/**
 * Theme Persist 1.1.0-starks
 * Speichert Dark/Light Mode in localStorage.
 * Der Toggle selbst laeuft nativ ueber Webflow/Lumos Interactions.
 * Dieses Script sorgt dafuer, dass die Wahl beim Reload erhalten bleibt.
 *
 * CDN: https://cdn.jsdelivr.net/gh/starks-design/cdn@main/scripts/theme-persist.js
 *
 * Changelog:
 *   v1.1.0 (2026-03-31): Setzt auch data-theme-status auf body + html,
 *     damit Webflow IX2 den korrekten Startzustand liest.
 *   v1.0.0 (2026-03-31): Initial release.
 */
(function () {
  var html = document.documentElement;
  var KEY = "dark-mode";

  // 1. Sofort beim Laden: gespeicherten Zustand anwenden (vor Render)
  var saved = localStorage.getItem(KEY);
  if (saved === "true") {
    html.classList.add("dark-mode", "u-theme-dark");
    html.setAttribute("data-theme-status", "dark");
  } else if (saved === "false") {
    html.classList.remove("dark-mode", "u-theme-dark");
    html.setAttribute("data-theme-status", "light");
  }

  // 2. Sobald Body existiert: data-theme-status auch dort setzen
  //    (Webflow IX2 liest es vom body)
  function syncBody() {
    if (!document.body) return;
    var isDark = saved === "true";
    document.body.setAttribute("data-theme-status", isDark ? "dark" : "light");
    if (isDark) {
      document.body.classList.add("dark-mode", "u-theme-dark");
    }
  }

  // Body kann noch nicht existieren (Script ist im Head)
  if (document.body) {
    syncBody();
  } else {
    document.addEventListener("DOMContentLoaded", syncBody);
  }

  // 3. Bei Klick auf Toggle: neuen Zustand speichern
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
