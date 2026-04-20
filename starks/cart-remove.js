/**
 * Starks.Design · cart-remove.js 0.4.0
 *
 * Cart-Item verschwindet mit CSS-Animation.
 * Transition NUR auf .sd-is-removing class — überschreibt nicht Webflow
 * IX2 base-state (opacity/transform wird sonst überschrieben = Item weg).
 *
 * DOM-Konventionen:
 *   Remove-Button: [data-starks-cart="erase"] (auch Aliase)
 *   Item-Wrapper:  [data-starks-cart="cart-item"] (auch Aliase)
 *
 * Einbinden vor </body>:
 *   <script src="https://cdn.starks.design/starks/cart-remove.js" defer></script>
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

  // Jeder Einzel-Selector mit .sd-is-removing (CSS-Präzedenz: Komma-Liste
  // trennt die Selectors — Suffix greift sonst nur auf den letzten).
  var REMOVING_SELECTOR =
    '[data-starks-cart="cart-item"].sd-is-removing,' +
    '[data-starks="cart-item"].sd-is-removing';

  // Phase 1: Item "verpufft" (300ms): scale + opacity + leichter slide
  // Phase 2 (startet bei 200ms): Height-Collapse (350ms), Items darunter rutschen hoch
  // Total: ~550ms
  var FADE_MS = 300;
  var COLLAPSE_DELAY_MS = 200;
  var COLLAPSE_MS = 350;
  var TOTAL_MS = COLLAPSE_DELAY_MS + COLLAPSE_MS;

  function injectStyles() {
    if (document.getElementById('sd-cart-remove-styles')) return;
    var s = document.createElement('style');
    s.id = 'sd-cart-remove-styles';
    s.textContent =
      REMOVING_SELECTOR + ' {' +
      '  transition:' +
      '    opacity ' + FADE_MS + 'ms cubic-bezier(0.4, 0, 1, 1),' +
      '    transform ' + FADE_MS + 'ms cubic-bezier(0.4, 0, 1, 1),' +
      '    filter ' + FADE_MS + 'ms cubic-bezier(0.4, 0, 1, 1),' +
      '    max-height ' + COLLAPSE_MS + 'ms cubic-bezier(0.16, 1, 0.3, 1) ' + COLLAPSE_DELAY_MS + 'ms,' +
      '    margin-top ' + COLLAPSE_MS + 'ms cubic-bezier(0.16, 1, 0.3, 1) ' + COLLAPSE_DELAY_MS + 'ms,' +
      '    margin-bottom ' + COLLAPSE_MS + 'ms cubic-bezier(0.16, 1, 0.3, 1) ' + COLLAPSE_DELAY_MS + 'ms,' +
      '    padding-top ' + COLLAPSE_MS + 'ms cubic-bezier(0.16, 1, 0.3, 1) ' + COLLAPSE_DELAY_MS + 'ms,' +
      '    padding-bottom ' + COLLAPSE_MS + 'ms cubic-bezier(0.16, 1, 0.3, 1) ' + COLLAPSE_DELAY_MS + 'ms;' +
      '  opacity: 0;' +
      '  transform: scale(0.88) translateX(16px);' +
      '  filter: blur(2px);' +
      '  max-height: 0 !important;' +
      '  margin-top: 0 !important;' +
      '  margin-bottom: 0 !important;' +
      '  padding-top: 0 !important;' +
      '  padding-bottom: 0 !important;' +
      '  overflow: hidden;' +
      '  pointer-events: none;' +
      '}';
    document.head.appendChild(s);
  }

  function triggerRemoveFallback(btn, item) {
    var productId = item.dataset.productId || item.dataset.cartItem;
    if (window.StarksCart && typeof window.StarksCart.removeFromCart === 'function' && productId) {
      window.StarksCart.removeFromCart(productId);
      return;
    }
    document.removeEventListener('click', handleClick, true);
    btn.click();
    setTimeout(function () {
      document.addEventListener('click', handleClick, true);
    }, 50);
  }

  function handleClick(e) {
    var btn = e.target.closest(REMOVE_SELECTOR);
    if (!btn) return;

    var item = btn.closest(ITEM_SELECTOR);
    if (!item) return;

    e.preventDefault();
    e.stopImmediatePropagation();

    if (item.classList.contains('sd-is-removing')) return;
    item.classList.add('sd-is-removing');

    setTimeout(function () {
      triggerRemoveFallback(btn, item);
    }, TOTAL_MS);
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
