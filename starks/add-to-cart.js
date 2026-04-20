/**
 * Starks.Design · add-to-cart.js 0.2.0
 *
 * Fly-to-Cart Animation: Clone des Produkt-Bildes fliegt bogenförmig zum
 * Cart-Button in der Nav. Pure JS/CSS, kein View Transitions API.
 *
 * DOM-Konventionen:
 *   Add-to-Cart Button:  [data-starks="add-to-cart"]
 *   Cart-Button (Ziel):  [data-starks-modal="cart-btn"]
 *                        (Fallback: [data-starks="cart-toggle"], .nav_cart)
 *   Produkt-Bild:        automatisch im nächsten .shop_col_clas_item /
 *                        .shop_col_item Wrapper gesucht
 *
 * Event-Verhalten: KEIN preventDefault — die bestehende starks-cart.js
 * Logic läuft normal weiter (Event bubbled durch). Nur der optische Clone
 * fliegt zusätzlich.
 *
 * Einbinden vor </body>:
 *   <script src="https://cdn.starks.design/starks/add-to-cart.js" defer></script>
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
    'img.product_picture_src,' +
    '.shop_product_img_clean img,' +
    '.cover_wrapper img,' +
    'img';

  var CART_SELECTOR =
    '[data-starks-modal="cart-btn"],' +
    '[data-starks="cart-toggle"],' +
    '.nav_cart,' +
    '.cart-btn';

  var DURATION = 700;
  var EASING = 'cubic-bezier(0.5, 0, 0.5, 1)';
  var DEBUG = false; // auf true setzen für Console-Logs

  function log() {
    if (DEBUG) console.log.apply(console, ['[sda/add-to-cart]'].concat([].slice.call(arguments)));
  }

  function findSource(addBtn) {
    var card = addBtn.closest(CARD_SELECTOR);
    if (!card) {
      card = addBtn.closest('.section, .page_main, main') || document.body;
      log('no card matched — fallback to section/body');
    }
    var imgs = card.querySelectorAll(IMAGE_SELECTOR);
    for (var i = 0; i < imgs.length; i++) {
      var img = imgs[i];
      var rect = img.getBoundingClientRect();
      if (rect.width > 40 && rect.height > 40) {
        log('source image found', img);
        return img;
      }
    }
    log('no image found in card', card);
    return null;
  }

  function findTarget() {
    var el = document.querySelector(CART_SELECTOR);
    log('target element', el);
    return el;
  }

  function flyImage(sourceEl, targetEl) {
    var srcRect = sourceEl.getBoundingClientRect();
    var tgtRect = targetEl.getBoundingClientRect();

    if (srcRect.width === 0 || tgtRect.width === 0) {
      log('skipping — zero rect', srcRect, tgtRect);
      return;
    }

    var clone = sourceEl.cloneNode(true);
    clone.setAttribute('style',
      'position:fixed;' +
      'top:' + srcRect.top + 'px;' +
      'left:' + srcRect.left + 'px;' +
      'width:' + srcRect.width + 'px;' +
      'height:' + srcRect.height + 'px;' +
      'margin:0;padding:0;' +
      'z-index:99999;pointer-events:none;' +
      'transition:all ' + DURATION + 'ms ' + EASING + ';' +
      'border-radius:inherit;object-fit:cover;' +
      'will-change:transform,opacity,top,left,width,height;'
    );
    document.body.appendChild(clone);

    var tgtX = tgtRect.left + tgtRect.width / 2;
    var tgtY = tgtRect.top + tgtRect.height / 2;

    requestAnimationFrame(function () {
      clone.style.transform = 'scale(1.08) rotate(-2deg)';
      requestAnimationFrame(function () {
        clone.style.top = (tgtY - 15) + 'px';
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
      pulseCart(targetEl);
    }, DURATION + 50);
  }

  function pulseCart(el) {
    if (!el || el.__sdPulseActive) return;
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

    log('add-to-cart clicked', btn);

    // WICHTIG: KEIN preventDefault / stopPropagation — damit starks-cart.js
    // den Event normal weiterverarbeitet und das Produkt wirklich hinzufügt.

    var source = findSource(btn);
    var target = findTarget();

    if (!source || !target) {
      log('skipping fly animation — source or target missing');
      return;
    }

    flyImage(source, target);
  }

  function init() {
    // Bubble phase (NICHT capture) damit wir starks-cart.js nicht blockieren
    document.addEventListener('click', handleClick);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
