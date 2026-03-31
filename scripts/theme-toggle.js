/**
 * Theme Toggle 1.1.1-starks
 * Based on Lumos Framework Theme Toggle 1.1.1 (MIT License)
 * Fork by Starks.Design — customized for Webflow projects
 *
 * Original: https://cdn.jsdelivr.net/gh/lumosframework/scripts@v1.1.1/theme-toggle.js
 * CDN:      https://cdn.jsdelivr.net/gh/starks-design/cdn@main/scripts/theme-toggle.js
 *
 * Supports:
 *   - Single toggle: <button data-theme-toggle-button>
 *   - Explicit buttons: <button data-theme-toggle-button="light">
 *                        <button data-theme-toggle-button="dark">
 *
 * Changelog:
 *   v1.1.1-starks (2026-03-31):
 *     - Support for explicit light/dark button values
 *     - localStorage persistence
 *     - prefers-color-scheme fallback
 */
function colorModeToggle() {
  function attr(defaultVal, attrVal) {
    var defaultValType = typeof defaultVal;
    if (typeof attrVal !== "string" || attrVal.trim() === "") return defaultVal;
    if (attrVal === "true" && defaultValType === "boolean") return true;
    if (attrVal === "false" && defaultValType === "boolean") return false;
    if (isNaN(attrVal) && defaultValType === "string") return attrVal;
    if (!isNaN(attrVal) && defaultValType === "number") return +attrVal;
    return defaultVal;
  }

  var htmlElement = document.documentElement;

  var scriptTag = document.querySelector("[data-theme-toggle-script]");
  if (!scriptTag) {
    console.warn("Script tag with data-theme-toggle-script attribute not found");
    return;
  }

  var colorModeDuration = attr(0.5, scriptTag.getAttribute("duration"));
  var colorModeEase = attr("power1.out", scriptTag.getAttribute("ease"));

  function setColors(themeString, animate) {
    if (typeof gsap !== "undefined" && typeof colorThemes !== "undefined" && animate) {
      gsap.to(htmlElement, Object.assign({}, colorThemes.getTheme(themeString), {
        duration: colorModeDuration,
        ease: colorModeEase
      }));
    } else {
      htmlElement.classList.remove("u-theme-dark");
      htmlElement.classList.remove("u-theme-light");
      htmlElement.classList.add("u-theme-" + themeString);
    }
  }

  function goDark(dark, animate) {
    if (dark) {
      localStorage.setItem("dark-mode", "true");
      htmlElement.classList.add("dark-mode");
      setColors("dark", animate);
    } else {
      localStorage.setItem("dark-mode", "false");
      htmlElement.classList.remove("dark-mode");
      setColors("light", animate);
    }

    // Update aria-pressed on all toggle buttons
    var buttons = document.querySelectorAll("[data-theme-toggle-button]");
    buttons.forEach(function (el) {
      var val = el.getAttribute("data-theme-toggle-button");
      if (val === "dark") {
        el.setAttribute("aria-pressed", dark ? "true" : "false");
      } else if (val === "light") {
        el.setAttribute("aria-pressed", dark ? "false" : "true");
      } else {
        el.setAttribute("aria-pressed", dark ? "true" : "false");
      }
    });
  }

  // System preference
  var colorPreference = window.matchMedia("(prefers-color-scheme: dark)");
  colorPreference.addEventListener("change", function (e) {
    goDark(e.matches, false);
  });

  // Init: localStorage > system preference
  var storagePreference = localStorage.getItem("dark-mode");
  if (storagePreference !== null) {
    goDark(storagePreference === "true", false);
  } else {
    goDark(colorPreference.matches, false);
  }

  // Bind click handlers after DOM ready
  window.addEventListener("DOMContentLoaded", function () {
    var buttons = document.querySelectorAll("[data-theme-toggle-button]");

    buttons.forEach(function (el) {
      el.setAttribute("role", "button");
    });

    document.addEventListener("click", function (e) {
      var btn = e.target.closest("[data-theme-toggle-button]");
      if (!btn) return;

      var val = btn.getAttribute("data-theme-toggle-button");

      if (val === "dark") {
        // Explicit dark button → go dark
        goDark(true, true);
      } else if (val === "light") {
        // Explicit light button → go light
        goDark(false, true);
      } else {
        // No value → classic toggle
        goDark(!htmlElement.classList.contains("dark-mode"), true);
      }
    });
  });
}
colorModeToggle();
