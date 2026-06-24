/**
 * Theme Persist 1.4.0-starks
 * Speichert Dark/Light Mode in localStorage.
 * Beim ersten Besuch: System-Preference (prefers-color-scheme).
 * Bei Folgebesuchen: gespeicherter Zustand.
 * Toggle laeuft auch ohne Webflow IX2/IX3 Theme-Status-Attribut.
 *
 * CDN: https://starks-design.github.io/cdn/scripts/theme-persist.js
 *
 * Changelog:
 *   v1.4.0 (2026-06-24): Theme-Klassen direkt setzen, wenn IX keinen
 *     data-theme-status schreibt.
 *   v1.3.0 (2026-03-31): System-Preference bei Erstbesuch.
 *     Programmatischer Klick nach IX2-Init. Speicherung gefixt.
 *   v1.2.0 (2026-03-31): Programmatischer Klick statt manuelle Klassen.
 *   v1.1.0 (2026-03-31): data-theme-status Ansatz (verworfen).
 *   v1.0.0 (2026-03-31): Initial release.
 */
(function () {
  var KEY = "dark-mode";
  var saved = localStorage.getItem(KEY);

  function updateButtons(dark) {
    var buttons = document.querySelectorAll("[data-theme-toggle-button]");
    buttons.forEach(function (btn) {
      var value = btn.getAttribute("data-theme-toggle-button");
      if (value === "dark") btn.setAttribute("aria-pressed", dark ? "true" : "false");
      else if (value === "light") btn.setAttribute("aria-pressed", dark ? "false" : "true");
      else btn.setAttribute("aria-pressed", dark ? "true" : "false");
    });
  }

  function applyTheme(dark) {
    var html = document.documentElement;
    var body = document.body;

    html.classList.remove("u-theme-dark", "u-theme-light");
    html.classList.add(dark ? "u-theme-dark" : "u-theme-light");
    html.classList.toggle("dark-mode", dark);

    if (body) body.setAttribute("data-theme-status", dark ? "dark" : "light");
    localStorage.setItem(KEY, dark ? "true" : "false");
    updateButtons(dark);
  }

  function readCurrentDark() {
    var body = document.body;
    var html = document.documentElement;
    if (body && body.getAttribute("data-theme-status")) {
      return body.getAttribute("data-theme-status") === "dark";
    }
    return html.classList.contains("u-theme-dark") || html.classList.contains("dark-mode");
  }

  // Erstbesuch: System-Preference uebernehmen
  if (saved === null) {
    var prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    saved = prefersDark ? "true" : "false";
    localStorage.setItem(KEY, saved);
  }

  // Anti-Flash: Webflow rendert teils u-theme-dark statisch ins HTML.
  // Deshalb immer direkt den echten gespeicherten Zustand setzen.
  applyTheme(saved === "true");

  // Nach IX2-Init: Zustand abgleichen und ggf. Toggle klicken
  window.addEventListener("load", function () {
    setTimeout(function () {
      var body = document.body;
      // Aktuellen Zustand lesen (IX2/IX3 kann data-theme-status auf body setzen)
      var currentStatus = body.getAttribute("data-theme-status");
      var isDark = currentStatus === "dark";
      var wantDark = localStorage.getItem(KEY) === "true";

      if (currentStatus && isDark !== wantDark) {
        var targetValue = wantDark ? "dark" : "light";
        var btn = document.querySelector('[data-theme-toggle-button="' + targetValue + '"]');
        if (!btn) btn = document.querySelector("[data-theme-toggle-button]");
        if (btn) btn.click();
      }

      // Endzustand erzwingen, falls IX zwar Animationen ausfuehrt, aber keine
      // Theme-Klassen/data-theme-status schreibt.
      applyTheme(wantDark);
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
      applyTheme(true);
      return;
    }
    if (btnValue === "light") {
      applyTheme(false);
      return;
    }

    // Generischer Toggle: selbst umschalten. IX darf weiter Animationen spielen,
    // aber der funktionale Zustand haengt nicht mehr davon ab.
    applyTheme(!readCurrentDark());
  }, true);
})();
