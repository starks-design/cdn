/**
 * Theme Persist 1.2.0-starks
 * Speichert Dark/Light Mode in localStorage.
 * Der Toggle laeuft nativ ueber Webflow IX2 Interactions.
 * Dieses Script klickt nach dem Laden den richtigen Button,
 * damit IX2 den State korrekt uebernimmt.
 *
 * CDN: https://cdn.jsdelivr.net/gh/starks-design/cdn@main/scripts/theme-persist.js
 *
 * Changelog:
 *   v1.2.0 (2026-03-31): Programmatischer Klick statt manuelle Klassen.
 *     Verhindert Konflikte mit Webflow IX2 Interaction State.
 *   v1.1.0 (2026-03-31): data-theme-status Ansatz (verworfen — bricht IX2).
 *   v1.0.0 (2026-03-31): Initial release.
 */
(function () {
  var KEY = "dark-mode";
  var saved = localStorage.getItem(KEY);

  // Kein gespeicherter Zustand → nichts tun, Webflow-Default gilt
  if (saved === null) return;

  // Anti-Flash: Wenn dark gespeichert, sofort Klasse setzen (wird von IX2 uebernommen)
  if (saved === "true") {
    document.documentElement.classList.add("u-theme-dark");
  }

  // Nach vollstaendigem Laden (IX2 ist initialisiert):
  // Pruefen ob der aktuelle Zustand mit dem gespeicherten uebereinstimmt.
  // Falls nicht: den passenden Toggle-Button programmatisch klicken.
  window.addEventListener("load", function () {
    setTimeout(function () {
      var body = document.body;
      var isDark = body.getAttribute("data-theme-status") === "dark" ||
                   body.classList.contains("dark-mode") ||
                   body.classList.contains("u-theme-dark");
      var wantDark = saved === "true";

      if (isDark !== wantDark) {
        // Den richtigen Button finden und klicken
        var targetValue = wantDark ? "dark" : "light";
        var btn = document.querySelector('[data-theme-toggle-button="' + targetValue + '"]');
        if (!btn) {
          // Fallback: generischer Toggle-Button
          btn = document.querySelector("[data-theme-toggle-button]");
        }
        if (btn) btn.click();
      }
    }, 300);
  });

  // Bei Klick auf Toggle: neuen Zustand speichern
  document.addEventListener("click", function (e) {
    var btn = e.target.closest("[data-theme-toggle-button]");
    if (!btn) return;

    requestAnimationFrame(function () {
      setTimeout(function () {
        var body = document.body;
        var isDark = body.getAttribute("data-theme-status") === "dark" ||
                     body.classList.contains("dark-mode") ||
                     body.classList.contains("u-theme-dark") ||
                     document.documentElement.classList.contains("dark-mode") ||
                     document.documentElement.classList.contains("u-theme-dark");
        localStorage.setItem(KEY, isDark ? "true" : "false");
      }, 200);
    });
  });
})();
