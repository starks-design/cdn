/**
 * vs-cc — Cookie Consent Script
 * by Starks.Design
 *
 * Drop-in replacement for Finsweet Cookie Consent.
 * Attribute-based, self-hosted, no dependencies.
 * Supports Google Consent Mode v2.
 *
 * Usage: Add <script src="vs-cc.js" vs-cc-mode="opt-in" vs-cc-consentmode="true"></script>
 *        to your site. All UI is controlled via vs-cc attributes in HTML.
 *
 * @version 1.0.0
 * @license MIT
 */
"use strict";
(() => {
  // ─── Config ───────────────────────────────────────────────────────
  const PREFIX = "vs-cc";
  const COOKIE_NAME = PREFIX;
  const COOKIE_UPDATED = `${PREFIX}-updated`;
  const DEFAULT_EXPIRY = 180; // days
  const CATEGORIES = ["essential", "personalization", "analytics", "marketing", "uncategorized"];
  const OPT_IN_DEFAULTS = { essential: true, personalization: false, analytics: false, marketing: false, uncategorized: false };
  const ALL_GRANTED = { essential: true, personalization: true, analytics: true, marketing: true, uncategorized: true };
  const MODES = ["opt-in", "opt-out", "informational"];

  // ─── Selectors (attribute-based) ──────────────────────────────────
  const SEL = {
    banner:     `[${PREFIX}="banner"]`,
    preferences:`[${PREFIX}="preferences"]`,
    manager:    `[${PREFIX}="manager"]`,
    allow:      `[${PREFIX}="allow"]`,
    deny:       `[${PREFIX}="deny"]`,
    submit:     `[${PREFIX}="submit"]`,
    openPrefs:  `[${PREFIX}="open-preferences"]`,
    close:      `[${PREFIX}="close"]`,
  };

  const ATTR = {
    categories:   [`${PREFIX}-category`, `${PREFIX}-categories`],
    scroll:       `${PREFIX}-scroll`,
    display:      `${PREFIX}-display`,
    expires:      `${PREFIX}-expires`,
    mode:         `${PREFIX}-mode`,
    debug:        `${PREFIX}-debug`,
    endpoint:     `${PREFIX}-endpoint`,
    src:          `${PREFIX}-src`,
    placeholder:  `${PREFIX}-placeholder`,
    domain:       `${PREFIX}-domain`,
    consentMode:  `${PREFIX}-consentmode`,
  };

  // ─── Cookie Helpers (no dependencies) ─────────────────────────────
  function setCookie(name, value, days, domain) {
    let expires = "";
    if (days) {
      const d = new Date();
      d.setTime(d.getTime() + days * 86400000);
      expires = `; expires=${d.toUTCString()}`;
    }
    const domainStr = domain ? `; domain=${domain}` : "";
    document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}${expires}; path=/${domainStr}; SameSite=Lax`;
  }

  function getCookie(name) {
    const match = document.cookie.match(new RegExp(`(?:^|; )${encodeURIComponent(name).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}=([^;]*)`));
    return match ? decodeURIComponent(match[1]) : null;
  }

  function deleteCookie(name, domain) {
    setCookie(name, "", -1, domain);
    if (domain) {
      setCookie(name, "", -1);
      setCookie(name, "", -1, `.${domain}`);
    }
  }

  // ─── Debug Logger ─────────────────────────────────────────────────
  const debug = {
    active: false,
    log(msg, level = "info") {
      if (!this.active) return;
      const colors = { info: "#4CAF50", warning: "#FF9800", error: "#f44336" };
      console.log(`%c[${PREFIX}] ${msg}`, `color:${colors[level] || colors.info}`);
    },
  };

  // ─── Fade helpers ─────────────────────────────────────────────────
  function fadeIn(el, display = "flex") {
    el.style.display = display;
    el.style.opacity = "0";
    let op = 0;
    (function step() {
      op += 0.08;
      el.style.opacity = String(Math.min(op, 1));
      if (op < 1) requestAnimationFrame(step);
    })();
  }

  function fadeOut(el) {
    let op = parseFloat(el.style.opacity) || 1;
    (function step() {
      op -= 0.08;
      el.style.opacity = String(Math.max(op, 0));
      if (op > 0) requestAnimationFrame(step);
      else el.style.display = "none";
    })();
  }

  // ─── Scroll Lock ──────────────────────────────────────────────────
  let scrollLockActive = false;
  let savedScrollY = 0;

  function lockScroll() {
    if (scrollLockActive) return;
    savedScrollY = window.scrollY;
    document.body.style.position = "fixed";
    document.body.style.top = `-${savedScrollY}px`;
    document.body.style.left = "0";
    document.body.style.right = "0";
    scrollLockActive = true;
  }

  function unlockScroll() {
    if (!scrollLockActive) return;
    document.body.style.position = "";
    document.body.style.top = "";
    document.body.style.left = "";
    document.body.style.right = "";
    window.scrollTo(0, savedScrollY);
    scrollLockActive = false;
  }

  // ─── Google Consent Mode v2 ───────────────────────────────────────
  function gtagConsent(command, params) {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(["consent", command, params]);
    // Also push via gtag function if available
    if (typeof window.gtag === "function") {
      window.gtag("consent", command, params);
    }
    debug.log(`Consent Mode ${command}: ${JSON.stringify(params)}`);
  }

  function buildConsentParams(consents) {
    const g = (v) => v ? "granted" : "denied";
    return {
      ad_storage: g(consents.marketing),
      ad_user_data: g(consents.marketing),
      ad_personalization: g(consents.marketing),
      analytics_storage: g(consents.analytics),
      functionality_storage: g(consents.personalization),
      personalization_storage: g(consents.personalization),
      security_storage: "granted",
    };
  }

  // ─── GTM Custom Events ────────────────────────────────────────────
  function fireGtmEvent(category) {
    window.dataLayer = window.dataLayer || [];
    const eventName = `${category}-activated`;
    if (!window.dataLayer.find((e) => typeof e === "object" && e.event === eventName)) {
      window.dataLayer.push({ event: eventName });
      debug.log(`GTM event fired: ${eventName}`);
    }
  }

  // ─── Store ────────────────────────────────────────────────────────
  class ConsentStore {
    constructor() {
      const script = document.currentScript;
      const modeAttr = script?.getAttribute(ATTR.mode);
      this.mode = MODES.includes(modeAttr) ? modeAttr : "opt-in";
      this.consents = (this.mode === "opt-in") ? { ...OPT_IN_DEFAULTS } : { ...ALL_GRANTED };
      this.confirmed = false;
      this.scripts = [];
      this.iframes = [];

      this.cookieMaxAge = parseInt(script?.getAttribute(ATTR.expires) || DEFAULT_EXPIRY, 10);
      this.consentModeEnabled = script?.getAttribute(ATTR.consentMode) === "true";
      this.endpoint = script?.getAttribute(ATTR.endpoint) || null;
      this.domain = script?.getAttribute(ATTR.domain) || null;

      const debugAttr = script?.getAttribute(ATTR.debug);
      if (debugAttr === "" || debugAttr === "true") {
        debug.active = true;
      }

      debug.log(`Mode: ${this.mode}, Expiry: ${this.cookieMaxAge}d, Consent Mode: ${this.consentModeEnabled}`);
    }

    storeConsents(newConsents) {
      const changed = [];
      for (const key of Object.keys(newConsents)) {
        if (key === "essential") continue;
        if (newConsents[key] !== undefined && newConsents[key] !== this.consents[key]) {
          this.consents[key] = newConsents[key];
          changed.push(key);
        }
      }
      this.confirmed = true;
      return changed;
    }

    getActivableElements() {
      return [...this.scripts, ...this.iframes].filter(
        (el) => !el.active && el.categories.every((cat) => this.consents[cat])
      );
    }

    getDomain() {
      if (!this.domain) return undefined;
      const { hostname } = window.location;
      return hostname.includes("webflow.io") ? hostname : this.domain;
    }
  }

  // ─── Cookie Persistence ───────────────────────────────────────────
  function loadFromCookie() {
    const raw = getCookie(COOKIE_NAME);
    if (!raw) return null;
    try {
      const data = JSON.parse(raw);
      if (data.consents && typeof data.consents === "object") {
        return data.consents;
      }
    } catch { /* ignore */ }
    return null;
  }

  function saveToCookie(store) {
    const payload = JSON.stringify({ id: crypto.randomUUID?.() || Date.now().toString(36), consents: store.consents });
    setCookie(COOKIE_NAME, payload, store.cookieMaxAge, store.getDomain());
  }

  function markUpdated(store) {
    setCookie(COOKIE_UPDATED, "true", store.cookieMaxAge, store.getDomain());
  }

  function wasUpdated() {
    return !!getCookie(COOKIE_UPDATED);
  }

  function clearDeniedCookies() {
    const allCookies = document.cookie.split(";");
    const host = window.location.host.split(".");
    for (const c of allCookies) {
      const name = c.split("=")[0].trim();
      if (name === COOKIE_NAME || name === COOKIE_UPDATED) continue;
      // Try removing with various domain permutations
      deleteCookie(name);
      for (let i = 0; i < host.length - 1; i++) {
        const domain = host.slice(i).join(".");
        deleteCookie(name, domain);
        deleteCookie(name, `.${domain}`);
      }
    }
    debug.log("Denied cookies cleared");
  }

  // ─── Script/Iframe Controller ─────────────────────────────────────
  function collectElements(store) {
    const known = [...store.scripts, ...store.iframes].map((e) => e.element);

    // Scripts with type="vs-cc"
    document.querySelectorAll(`script[type="${PREFIX}"]`).forEach((el) => {
      if (known.includes(el)) return;
      const cats = parseCategories(el);
      store.scripts.push({ element: el, categories: cats, active: false });
      debug.log(`Stored script: ${el.src || "(inline)"} [${cats}]`);
    });

    // Iframes with vs-cc-src
    document.querySelectorAll(`iframe[${ATTR.src}]`).forEach((el) => {
      if (known.includes(el)) return;
      const cats = parseCategories(el);
      const src = el.getAttribute(ATTR.src);
      if (!src) return;
      el.removeAttribute("src");
      const placeholderSel = el.getAttribute(ATTR.placeholder);
      const placeholder = placeholderSel ? document.querySelector(placeholderSel) : null;
      store.iframes.push({ element: el, categories: cats, src, placeholder, active: false });
      debug.log(`Stored iframe: ${src} [${cats}]`);
    });
  }

  function parseCategories(el) {
    const raw = el.getAttribute(ATTR.categories[0]) || el.getAttribute(ATTR.categories[1]) || "";
    const cats = raw.split(",").map((s) => s.trim()).filter(Boolean);
    return cats.length ? cats.filter((c) => CATEGORIES.includes(c)) : ["uncategorized"];
  }

  function activateElements(store) {
    for (const item of store.getActivableElements()) {
      const { element } = item;
      let replacement;

      if (item.type === "script" || store.scripts.includes(item)) {
        replacement = document.createElement("script");
        replacement.type = "text/javascript";
        replacement.innerText = element.innerText;
        replacement.text = element.text;
        if (element.src) replacement.src = element.src;
      } else {
        replacement = document.createElement("iframe");
        for (const attr of element.attributes) {
          replacement.setAttribute(attr.name, attr.value);
        }
        replacement.src = item.src;
        if (item.placeholder) {
          replacement.addEventListener("load", () => fadeOut(item.placeholder));
        }
      }

      element.parentElement?.insertBefore(replacement, element);
      element.remove();
      item.element = replacement;
      item.active = true;
      debug.log(`Activated: ${replacement.src || "(inline)"}`);
    }
  }

  // ─── Endpoint POST ────────────────────────────────────────────────
  async function postConsents(store, action) {
    if (!store.endpoint) return;
    try {
      const body = JSON.stringify({
        id: crypto.randomUUID?.() || Date.now().toString(36),
        action,
        consents: store.consents,
        url: window.location.href,
        userAgent: navigator.userAgent,
      });
      const res = await fetch(store.endpoint, { method: "POST", body, headers: { "Content-Type": "application/json" } });
      if (res.ok) debug.log("Consents POSTed to endpoint");
      else debug.log(`Endpoint returned ${res.status}`, "error");
    } catch (err) {
      debug.log(`POST error: ${err}`, "error");
    }
  }

  // ─── UI Controller ────────────────────────────────────────────────
  class UIComponent {
    constructor(selector, store) {
      this.selector = selector;
      this.store = store;
      this.element = null;
      this.checkboxes = new Map();
      this.visible = false;
      this.scrollLock = false;
      this.displayProp = "flex";
      this.ready = false;
      this._readyCallbacks = [];

      if (document.readyState === "complete") this.init();
      else window.addEventListener("load", () => this.init());
    }

    init() {
      this.element = document.querySelector(this.selector);
      if (!this.element) {
        if (this.selector === SEL.banner) {
          debug.log(`No element with ${SEL.banner} found!`, "error");
        }
        return;
      }

      // Display property
      const dp = this.element.getAttribute(ATTR.display);
      if (dp) this.displayProp = dp;

      // Scroll lock
      this.scrollLock = this.element.getAttribute(ATTR.scroll) === "disable";

      // Hide initially
      this.element.style.display = "none";

      // Find checkboxes in form
      const form = this.element.querySelector("form");
      if (form) {
        this.form = form;
        for (const cat of ["personalization", "analytics", "marketing"]) {
          const sel = `[${PREFIX}-checkbox="${cat}"]`;
          const input = form.querySelector(`input${sel}, ${sel} input`);
          if (input && input.type === "checkbox") {
            input.checked = false;
            this.checkboxes.set(cat, input);
          }
        }
        form.addEventListener("submit", (e) => {
          e.preventDefault();
          e.stopPropagation();
          const consents = {};
          this.checkboxes.forEach((cb, cat) => { consents[cat] = cb.checked; });
          this._emit("formsubmit", consents);
        });
      }

      // Accessibility
      for (const sel of Object.values(SEL)) {
        const btn = this.element.querySelector(sel);
        if (btn) {
          btn.setAttribute("role", "button");
          btn.setAttribute("tabindex", "0");
        }
      }

      this.ready = true;
      this._readyCallbacks.forEach((fn) => fn());
      this._readyCallbacks = [];
    }

    onReady(fn) {
      if (this.ready) fn();
      else this._readyCallbacks.push(fn);
    }

    show() {
      if (!this.element || this.visible) return;
      fadeIn(this.element, this.displayProp);
      if (this.scrollLock) lockScroll();
      this.visible = true;
    }

    hide() {
      if (!this.element) return;
      fadeOut(this.element);
      if (this.scrollLock) unlockScroll();
      this.visible = false;
    }

    updateCheckboxes() {
      this.checkboxes.forEach((cb, cat) => {
        const val = !!this.store.consents[cat];
        if (cb.checked !== val) {
          cb.click();
        }
      });
    }

    // Simple event system
    _listeners = {};
    on(event, fn) {
      (this._listeners[event] = this._listeners[event] || []).push(fn);
    }
    _emit(event, data) {
      (this._listeners[event] || []).forEach((fn) => fn(data));
    }
  }

  // ─── Main Controller ──────────────────────────────────────────────
  class CookieConsent {
    constructor() {
      this.store = new ConsentStore();
      this.loadSavedConsents();
      this.collectAndActivate();

      if (document.readyState === "complete") this.initUI();
      else window.addEventListener("load", () => this.initUI());
    }

    loadSavedConsents() {
      const saved = loadFromCookie();

      // Set Consent Mode defaults (before anything loads)
      if (this.store.consentModeEnabled) {
        gtagConsent("default", buildConsentParams(saved || this.store.consents));
      }

      if (!saved) return;

      debug.log(`Loaded consents: ${JSON.stringify(saved)}`);
      this.store.storeConsents(saved);

      // Fire GTM events for granted categories
      for (const [cat, granted] of Object.entries(saved)) {
        if (granted) fireGtmEvent(cat);
      }

      // Clear denied cookies if consents were updated
      if (wasUpdated()) {
        clearDeniedCookies();
      }
    }

    collectAndActivate() {
      collectElements(this.store);
      activateElements(this.store);

      // Also collect after full load (for dynamically added elements)
      if (document.readyState !== "complete") {
        window.addEventListener("load", () => {
          collectElements(this.store);
          activateElements(this.store);
        });
      }
    }

    initUI() {
      this.banner = new UIComponent(SEL.banner, this.store);
      this.preferences = new UIComponent(SEL.preferences, this.store);
      this.manager = new UIComponent(SEL.manager, this.store);

      // Inject hide-all style
      document.head.insertAdjacentHTML("beforeend",
        `<style>${SEL.banner},${SEL.manager},${SEL.preferences}{display:none!important;}</style>`
      );

      // Wait for banner to be ready, then remove the hide-all and show appropriately
      this.banner.onReady(() => {
        // Remove the hide-all style (replace with non-important version handled by JS)
        const hideStyle = document.head.querySelector(`style:last-of-type`);
        if (hideStyle?.textContent?.includes(PREFIX)) hideStyle.remove();

        if (/bot|crawler|spider|crawling/i.test(navigator.userAgent)) return;

        if (this.store.confirmed) {
          this.manager.onReady(() => this.manager.show());
        } else {
          this.banner.show();
        }

        this.listenEvents();
      });
    }

    listenEvents() {
      // Global click/keyboard handler
      const handler = (e) => {
        const target = e.target;
        if (!(target instanceof Element)) return;
        if ("key" in e && e.key !== "Enter") return;

        // Allow all
        if (target.closest(SEL.allow)) {
          e.preventDefault();
          this.updateConsents(ALL_GRANTED, "allow");
          this.banner.updateCheckboxes();
          this.preferences.updateCheckboxes();
          this.closeAll();
        }
        // Deny all
        else if (target.closest(SEL.deny)) {
          e.preventDefault();
          this.updateConsents(OPT_IN_DEFAULTS, "deny");
          this.closeAll();
        }
        // Open preferences
        else if (target.closest(SEL.openPrefs)) {
          e.preventDefault();
          this.banner.hide();
          this.manager.hide();
          this.preferences.updateCheckboxes();
          this.preferences.show();
        }
        // Submit preferences
        else if (target.closest(SEL.submit)) {
          e.preventDefault();
          const comp = this.preferences.element ? this.preferences : this.manager;
          const consents = { essential: true };
          comp.checkboxes.forEach((cb, cat) => { consents[cat] = cb.checked; });
          this.updateConsents(consents, "submit");
          this.closeAll();
        }
        // Close
        else if (target.closest(SEL.close)) {
          this.handleClose();
        }
        // Manager click → open preferences
        else if (target.closest(SEL.manager)) {
          e.preventDefault();
          this.manager.hide();
          this.preferences.updateCheckboxes();
          this.preferences.show();
        }
      };

      document.addEventListener("click", handler);
      document.addEventListener("keydown", handler);

      // Form submissions
      for (const comp of [this.banner, this.preferences, this.manager]) {
        comp.on("formsubmit", (consents) => {
          this.updateConsents(consents, "submit");
          this.closeAll();
        });
      }
    }

    handleClose() {
      this.banner.hide();
      this.preferences.hide();

      if (this.store.mode === "informational" && !this.store.confirmed) {
        debug.log("Informational mode: auto-accepting all on close", "warning");
        this.updateConsents(ALL_GRANTED, "allow");
      }

      if (this.store.confirmed) {
        this.manager.onReady(() => this.manager.show());
      }
    }

    closeAll() {
      this.banner.hide();
      this.preferences.hide();
      if (this.manager.element) {
        this.manager.onReady(() => this.manager.show());
      }
    }

    updateConsents(newConsents, action) {
      const changed = this.store.storeConsents(newConsents);

      // Save cookie
      saveToCookie(this.store);

      // Google Consent Mode update
      if (this.store.consentModeEnabled && changed.length) {
        gtagConsent("update", buildConsentParams(this.store.consents));
      }

      // Fire GTM events for newly granted
      for (const cat of changed) {
        if (this.store.consents[cat]) fireGtmEvent(cat);
      }

      // POST to endpoint
      if (this.store.endpoint) {
        postConsents(this.store, action);
      }

      // Mark updated + clear denied cookies
      if (changed.length) {
        markUpdated(this.store);
        activateElements(this.store);
        debug.log(`Consents updated: ${changed.join(", ")}`);
      }

      // Update all checkboxes
      this.banner.updateCheckboxes();
      this.preferences.updateCheckboxes();
      this.manager.updateCheckboxes();

      // Dispatch custom event
      window.dispatchEvent(new CustomEvent(`${PREFIX}-updated`, { detail: this.store.consents }));
    }
  }

  // ─── Init ─────────────────────────────────────────────────────────
  new CookieConsent();
})();
