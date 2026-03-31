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

---

## Cookie Banner (`../vs-cc.js`)

Starks.Design Cookie Consent Banner. Einbindung siehe Root-README.
