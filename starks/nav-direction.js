/**
 * Starks.Design · nav-direction.js 0.1.0
 *
 * Tagged Cross-Document View Transitions mit Navigation-Richtung, damit
 * CSS zwischen Forward (Link-Klick) und Back (Browser-Zurück) unterscheidet.
 *
 * Setzt Type "forward" oder "back" auf die laufende View Transition,
 * lesbar in CSS via :active-view-transition-type(back).
 *
 * Browser: Chrome 126+ · Safari 18.2+ · Firefox noch partial
 * Fallback: wenn Events nicht feuern → default (forward) Animation.
 *
 * Einbinden direkt nach dem @view-transition Opt-in im Head:
 *   <script src="https://cdn.starks.design/starks/nav-direction.js"></script>
 */
(function () {
  'use strict';

  if (typeof navigation === 'undefined') return;

  function getDirection() {
    try {
      var act = navigation.activation;
      if (act && act.from && act.entry) {
        return act.from.index > act.entry.index ? 'back' : 'forward';
      }
    } catch (e) {
      /* no-op */
    }
    return 'forward';
  }

  // Outgoing page — setzt Type vor dem Snapshot
  window.addEventListener('pageswap', function (e) {
    if (e.viewTransition && e.viewTransition.types) {
      e.viewTransition.types.add(getDirection());
    }
  });

  // Incoming page — setzt Type bevor die Animation startet
  window.addEventListener('pagereveal', function (e) {
    if (e.viewTransition && e.viewTransition.types) {
      e.viewTransition.types.add(getDirection());
    }
  });
})();
