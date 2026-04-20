/**
 * SDA Transitions · add-to-cart.js 0.1.0
 *
 * Fly-to-Cart Animation: beim Click auf "Add to Cart" fliegt ein Clone des
 * Produkt-Bildes bogenförmig zum Cart-Button in der Nav.
 *
 * Browser-universal — nutzt kein View Transitions API sondern reines JS/CSS,
 * funktioniert deshalb auch in Safari <18 und Firefox <130.
 *
 * DOM-Konventionen:
 *   Add-to-Cart Button:  [data-starks="add-to-cart"]
 *   Cart-Button (Ziel):  [data-starks-modal="cart-btn"]
 *                        (Fallback: [data-starks="cart-toggle"], .nav_cart)
 *   Produkt-Bild:        wird automatisch gefunden — erstes <img> oder Element
 *                        mit .product_picture_src innerhalb des nächsten Card-Wrappers
 *
 * Einbinden vor </body>:
 *   <script src="https://cdn.starks.design/sda/transitions/add-to-cart.js" defer></script>
 */
(function () {
  'use strict';

  var ADD_SELECTOR = '[data-starks="add-to-cart"]';

  var CARD_SELECTOR =
    '.shop_col_clas_item,' +
    '.shop_col_item,' +
    '[data-starks-cart="product-card"],' +
    '[data-product-card]';

  var IMAGE_SELECTOR =
    '.main_img_wrapper img,' +
    '.product_picture_src,' +
    '.shop_product_img_clean img,' +
    'img';

  var CART_SELECTOR =
    '[data-starks-modal="cart-btn"],' +
    '[data-starks="cart-toggle"],' +
    '.nav_cart,' +
    '.cart-btn';

  var DURATION = 700; // ms
  var EASING = 'cubic-bezier(0.5, 0, 0.5, 1)';

  function findSource(addBtn) {
    // 1. Nächster Card-Wrapper finden
    var card = addBtn.closest(CARD_SELECTOR);
    if (!card) {
      // Fallback: Detail-Page Hero — gehe aufwärts bis .page_main oder .section
      card = addBtn.closest('.section, .page_main, main') || document.body;
    }
    // 2. Erstes sichtbares Image
    var imgs = card.querySelectorAll(IMAGE_SELECTOR);
    for (var i = 0; i < imgs.length; i++) {
      var img = imgs[i];
      var rect = img.getBoundingClientRect();
      if (rect.width > 20 && rect.height > 20) return img;
    }
    return null;
  }

  function findTarget() {
    var el = document.querySelector(CART_SELECTOR);
    if (!el) return null;
    // Falls unsichtbar (z.B. hinter Menu): trotzdem Position verwenden
    return el;
  }

  function flyImage(sourceEl, targetEl) {
    var srcRect = sourceEl.getBoundingClientRect();
    var tgtRect = targetEl.getBoundingClientRect();

    if (srcRect.width === 0 || tgtRect.width === 0) return;

    // Clone vom Source-Element (Image oder DIV mit background-image)
    var clone = sourceEl.cloneNode(true);
    // Evtl. innere Bilder auch cloneabel machen
    var cloneStyle =
      'position:fixed;' +
      'top:' + srcRect.top + 'px;' +
      'left:' + srcRect.left + 'px;' +
      'width:' + srcRect.width + 'px;' +
      'height:' + srcRect.height + 'px;' +
      'margin:0;' +
      'padding:0;' +
      'z-index:99999;' +
      'pointer-events:none;' +
      'transition:top ' + DURATION + 'ms ' + EASING + ',' +
      'left ' + DURATION + 'ms ' + EASING + ',' +
      'width ' + DURATION + 'ms ' + EASING + ',' +
      'height ' + DURATION + 'ms ' + EASING + ',' +
      'opacity ' + DURATION + 'ms ' + EASING + ',' +
      'transform ' + DURATION + 'ms ' + EASING + ',' +
      'filter ' + DURATION + 'ms ' + EASING + ';' +
      'border-radius:inherit;' +
      'object-fit:cover;' +
      'will-change:transform,opacity;';
    clone.setAttribute('style', cloneStyle);
    document.body.appendChild(clone);

    // Target-Position (Zentrum)
    var tgtX = tgtRect.left + tgtRect.width / 2;
    var tgtY = tgtRect.top + tgtRect.height / 2;

    // Bogen durch Zwischen-Step (nach oben-ab)
    requestAnimationFrame(function () {
      // Kleine Skalierung zuerst (Phase 1)
      clone.style.transform = 'scale(1.08) rotate(-2deg)';
      requestAnimationFrame(function () {
        // Phase 2: fliegen
        clone.style.top = (tgtY - 30) + 'px';
        clone.style.left = (tgtX - 15) + 'px';
        clone.style.width = '30px';
        clone.style.height = '30px';
        clone.style.opacity = '0';
        clone.style.transform = 'translate(-50%, -50%) rotate(25deg) scale(0.6)';
        clone.style.filter = 'blur(2px)';
      });
    });

    setTimeout(function () {
      if (clone.parentNode) clone.parentNode.removeChild(clone);
      // Cart-Icon „pulsieren" lassen als Bestätigung
      pulseCart(targetEl);
    }, DURATION + 50);
  }

  function pulseCart(el) {
    if (!el) return;
    if (el.__sdPulseActive) return;
    el.__sdPulseActive = true;
    var prevTransition = el.style.transition;
    var prevTransform = el.style.transform;
    el.style.transition = 'transform 0.18s cubic-bezier(0.34, 1.56, 0.64, 1)';
    el.style.transform = 'scale(1.2)';
    setTimeout(function () {
      el.style.transform = prevTransform || '';
      setTimeout(function () {
        el.style.transition = prevTransition || '';
        el.__sdPulseActive = false;
      }, 200);
    }, 180);
  }

  function handleClick(e) {
    var btn = e.target.closest(ADD_SELECTOR);
    if (!btn) return;

    var source = findSource(btn);
    var target = findTarget();

    if (!source || !target) return; // graceful skip

    flyImage(source, target);
  }

  function init() {
    document.addEventListener('click', handleClick, true);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
