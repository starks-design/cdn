/**
 * Theme Persist 1.3.0-starks
 * Speichert Dark/Light Mode in localStorage.
 * Beim ersten Besuch: System-Preference (prefers-color-scheme).
 * Bei Folgebesuchen: gespeicherter Zustand.
 * Toggle laeuft nativ ueber Webflow IX2 Interactions.
 *
 * CDN: https://starks-design.github.io/cdn/scripts/theme-persist.js
 *
 * Changelog:
 *   v1.3.0 (2026-03-31): System-Preference bei Erstbesuch.
 *     Programmatischer Klick nach IX2-Init. Speicherung gefixt.
 *   v1.2.0 (2026-03-31): Programmatischer Klick statt manuelle Klassen.
 *   v1.1.0 (2026-03-31): data-theme-status Ansatz (verworfen).
 *   v1.0.0 (2026-03-31): Initial release.
 */
(function () {
  var KEY = "dark-mode";
  var saved = localStorage.getItem(KEY);

  // Erstbesuch: System-Preference uebernehmen
  if (saved === null) {
    var prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    saved = prefersDark ? "true" : "false";
    localStorage.setItem(KEY, saved);
  }

  // Anti-Flash: sofort Klasse setzen wenn dark
  if (saved === "true") {
    document.documentElement.classList.add("u-theme-dark");
  }

  // Nach IX2-Init: Zustand abgleichen und ggf. Toggle klicken
  window.addEventListener("load", function () {
    setTimeout(function () {
      var body = document.body;
      var html = document.documentElement;

      // Aktuellen Zustand lesen (IX2 setzt data-theme-status auf body)
      var currentStatus = body.getAttribute("data-theme-status");
      var isDark = currentStatus === "dark";
      var wantDark = localStorage.getItem(KEY) === "true";

      if (isDark !== wantDark) {
        var targetValue = wantDark ? "dark" : "light";
        var btn = document.querySelector('[data-theme-toggle-button="' + targetValue + '"]');
        if (!btn) btn = document.querySelector("[data-theme-toggle-button]");
        if (btn) btn.click();
      }

      // Anti-Flash Klasse aufraeumen (IX2 hat jetzt uebernommen)
      if (!wantDark) {
        html.classList.remove("u-theme-dark");
      }
    }, 400);
  });

  // Bei JEDEM Klick auf Toggle: Zustand speichern
  // Nutzt Capture-Phase damit es VOR IX2 registriert wird
  document.addEventListener("click", function (e) {
    var btn = e.target.closest("[data-theme-toggle-button]");
    if (!btn) return;

    var btnValue = btn.getAttribute("data-theme-toggle-button");

    // Wenn Button einen expliziten Wert hat (light/dark), direkt speichern
    if (btnValue === "dark") {
      localStorage.setItem(KEY, "true");
      return;
    }
    if (btnValue === "light") {
      localStorage.setItem(KEY, "false");
      return;
    }

    // Generischer Toggle: nach IX2 Animation den neuen Zustand lesen
    setTimeout(function () {
      var isDark = document.body.getAttribute("data-theme-status") === "dark" ||
                   document.body.classList.contains("u-theme-dark") ||
                   document.documentElement.classList.contains("u-theme-dark");
      localStorage.setItem(KEY, isDark ? "true" : "false");
    }, 300);
  }, true);
})();
