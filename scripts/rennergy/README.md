# Rennergy Website Scripts

## Fachpartner Map (`fachpartner-map.js`)

Mapbox GL JS Karte mit PLZ-Suche, Radius-Filter, Autocomplete-Suggestions,
Dark/Light-Mode und Cluster-Darstellung.

### Einbindung in Webflow (Page Custom Code, before `</body>`):

```html
<script data-mapbox-token="YOUR_MAPBOX_TOKEN"
  src="https://cdn.jsdelivr.net/gh/starks-design/cdn@main/scripts/rennergy/fachpartner-map.js"></script>
```

> Token liegt im Webflow Page Custom Code, nicht im Repo.

### Abhaengigkeiten (im `<head>`):
- Mapbox GL JS v3.17.0 (CSS + JS)
- Finsweet Attributes (fs-list)

---

## Theme Persistence (Dark/Light Mode)

Verwendet die offiziellen Lumos Framework Scripts. Kein eigener Code noetig.

### Einbindung in Webflow (Site Settings, Footer Code):

```html
<script data-theme-toggle-script duration="0.5" ease="power1.out"
  src="https://cdn.jsdelivr.net/gh/lumosframework/scripts@v1.1.1/theme-toggle.js"></script>
<script src="https://cdn.jsdelivr.net/gh/lumosframework/scripts@v1.1.1/theme-collector.js"></script>
```

### Voraussetzungen:
- Lumos Framework v2.2+ mit Variable Modes (Light/Dark)
- GSAP (fuer animierten Theme-Wechsel)
- Toggle-Buttons mit `data-theme-toggle-button` Attribut

### Changelog

**v2.2.07** (2026-04-05)
- Alle Inline-Kommentare und Changelog aus dem Script entfernt. Changelog nur noch im README.

**v2.2.06** (2026-04-05)
- Bottom Sheet ins Hauptscript integriert (war separates Embed). 90%/25% Snap, Touch-Drag, Grabber-Tap-Toggle, Search-Focus schließt, Marker-Tap öffnet, Card-Tap schließt, Viewport-Resize.

**v2.2.05** (2026-04-05)
- Card-Tap Event: zoom-target Klick dispatcht `fachpartner:card-tap` CustomEvent für Bottom Sheet.

**v2.2.04** (2026-04-05)
- DOM-Sort komplett deaktiviert. Finsweet-Nesting verträgt kein DOM-Umsortieren. Pillen + Distanzberechnung bleiben aktiv.

**v2.2.03** (2026-04-05)
- Fix Flipping: Sort pro Parent-Container, Distanz vorberechnet, filterSeq verhindert veraltete Geocode-Callbacks.

**v2.2.02** (2026-04-05)
- Fix: DOM-Sort nur wenn Reihenfolge sich tatsächlich ändert.

**v2.2.01** (2026-04-05)
- Fix: Stabile Sortierung (cardIndex Tiebreaker bei gleicher Distanz).
- Fix: Suggestions schließen bei Enter (suppressed-Flag).
- Fix: Suggest-Hover nur auf generierte Nodes, nicht Template.

**v2.2.0** (2026-04-05)
- Entfernungs-Pille: `data-search-modul="km"` / `"km-text"` zeigen dynamisch die Distanz zum Suchzentrum.
- Ergebnisse werden bei Radius-Suche nach Entfernung sortiert.

**v2.1.8** (2026-04-04)
- Debug: `?debug=1` zeigt Version-Badge, Console-Log bei Init.

**v2.1.7** (2026-04-04)
- ergebnis_nr zeigt nur Zahl (kein "Fachpartner gefunden" Text).

**v2.1.6** (2026-04-04)
- Versions-Badge oben rechts im Kartenbereich.

**v2.1.5** (2026-04-04)
- stopPropagation auf zoom-target Click entfernt — blockierte Modal-Trigger auf Mobile.

**v2.1.4** (2026-04-03)
- Search-Reset Button nur sichtbar wenn Text im Suchfeld steht.

**v2.1.3** (2026-03-31)
- Suggest hover fix: is--hover → is-hover.

**v2.1.2** (2026-03-31)
- Style-Block entfernt: Fixes nativ in Webflow gelöst.

**v2.1.1** (2026-03-31)
- Left padding erhöht für Abstand zum Container-Rand.

**v2.1.0** (2026-03-31)
- Dynamic fitBounds padding, Arrow-Key Navigation in Suggestions, CSS-Fixes.

---

## Cookie Banner (`../vs-cc.js`)

Starks.Design Cookie Consent Banner. Einbindung siehe Root-README.
