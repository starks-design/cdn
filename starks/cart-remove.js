/**
 * SDA Transitions · cart-remove.js 0.1.0
 *
 * Fly-Out Animation beim Entfernen eines Cart-Items.
 * Nutzt native View Transitions API. Fallback: normale Löschung.
 *
 * DOM-Konventionen (alle unterstützt):
 *   Remove-Button: [data-starks-cart="erase"]
 *                  [data-starks-cart="cart-remove"]
 *                  [data-starks="cart-remove"]
 *                  [data-starks="erase"]
 *   Item-Wrapper:  [data-starks-cart="cart-item"]
 *                  [data-starks="cart-item"]
 *
 * Einbinden vor </body>:
 *   <script src="https://cdn.starks.design/sda/transitions/cart-remove.js" defer></script>
 *
 * CSS (separat oder inline):
 *   ::view-transition-old(sd-cart-removing) {
 *     animation: sd-cart-fly 0.5s cubic-bezier(0.7, 0, 0.84, 0) forwards;
 *   }
 *   @keyframes sd-cart-fly {
 *     to { transform: translateX(120%) rotate(12deg) scale(0.85); opacity: 0; filter: blur(4px); }
 *   }
 */
(function () {
  'use strict';

  var REMOVE_SELECTOR =
    '[data-starks-cart="erase"],' +
    '[data-starks-cart="cart-remove"],' +
    '[data-starks="cart-remove"],' +
    '[data-starks="erase"]';

  var ITEM_SELECTOR =
    '[data-starks-cart="cart-item"],' +
    '[data-starks="cart-item"]';

  var TRANSITION_NAME = 'sd-cart-removing';

  // CSS einmalig injizieren (falls nicht via separates Stylesheet geladen)
  function injectStyles() {
    if (document.getElementById('sd-cart-remove-styles')) return;
    var s = document.createElement('style');
    s.id = 'sd-cart-remove-styles';
    s.textContent =
      '::view-transition-old(' + TRANSITION_NAME + ') {' +
      '  animation: sd-cart-fly 0.5s cubic-bezier(0.7, 0, 0.84, 0) forwards;' +
      '}' +
      '::view-transition-new(' + TRANSITION_NAME + ') { animation: none; }' +
      '@keyframes sd-cart-fly {' +
      '  to {' +
      '    transform: translateX(120%) rotate(12deg) scale(0.85);' +
      '    opacity: 0;' +
      '    filter: blur(4px);' +
      '  }' +
      '}' +
      // Nachrückende Items morphen automatisch
      ITEM_SELECTOR + ' {' +
      '  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);' +
      '}';
    document.head.appendChild(s);
  }

  function handleClick(e) {
    var btn = e.target.closest(REMOVE_SELECTOR);
    if (!btn) return;

    var item = btn.closest(ITEM_SELECTOR);
    if (!item) return;

    if (!document.startViewTransition) return; // Fallback: normale Löschung

    // Aktuelles Click-Event nicht blockieren — starks-cart.js soll die Logic ausführen.
    // Wir wrappen nur die DOM-Mutation in eine View Transition.

    item.style.viewTransitionName = TRANSITION_NAME;

    // Die existing Click-Logic läuft synchron im gleichen Event-Loop weiter.
    // Wir hijacken nicht preventDefault — stattdessen starten wir die Transition,
    // die den DOM-Mutation-Snapshot im nächsten Frame macht.
    var transition = document.startViewTransition(function () {
      // Ein leerer Callback reicht — die Mutation passiert durch starks-cart.js
      // (removeFromCart → re-render). Der Browser snapshot'd vor + nach.
      return Promise.resolve();
    });

    // Nach Abschluss die Custom Property wieder entfernen
    transition.finished.finally(function () {
      if (item && item.isConnected) {
        item.style.viewTransitionName = '';
      }
    });
  }

  function init() {
    injectStyles();
    document.addEventListener('click', handleClick, true);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
