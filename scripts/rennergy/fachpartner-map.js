/* Rennergy Fachpartner Map v2.2.08 — see README.md for changelog */
(function () {
  "use strict";
  var MAPBOX_TOKEN =
    "pk.eyJ1IjoiYnlzdGFyayIsImEiOiJjbHc2amJna2IwMWNiMm5vOW9nM3AxYWg1In0.mzRxy5Sib2iJKeJh7XHmZg";

  var STYLE_LIGHT = "mapbox://styles/bystark/cmicxkh5l00gn01pf7awy8xnv";
  var STYLE_DARK  = "mapbox://styles/bystark/cmicwtx2s00hx01s91mesh22d";

  var SOURCE_ID = "fachpartner";

  var ANIM = {
    fly:        900,
    fitBounds:  700,
    zoomBtn:    450,
    clusterFly: 550
  };

  var HORIZONTAL_MIN_WIDTH = 1200;

  var PAD_DESKTOP_FALLBACK = { top: 120, right: 80, bottom: 120, left: 80 };
  var PAD_TABLET  = { top: 90,  right: 48, bottom: 90,  left: 48 };

  var CLUSTER_RADIUS   = 90;
  var CLUSTER_MAX_ZOOM = 12;

  var JITTER_MAX_METERS = 1800;

  var GEOCODE_CONCURRENCY = 10;

  var STABLE_TIMEOUT_MS = 20000;
  var STABLE_DELAY_MS   = 700;
  var STABLE_POLL_MS    = 200;

  var SEARCH_DEBOUNCE_MS  = 180;
  var SUGGEST_DEBOUNCE_MS = 160;
  var DOM_CHANGE_DELAY_MS = 450;

  var MAP_VARS = {
    bubble:      ["--_theme---b-50",       "#9B1B85"],
    bubbleHover: ["--_theme---b-40",       "#c24daf"],
    bubbleActive:["--_theme---b-60",       "#6e1260"],
    text:        "#ffffff",
    stroke:      ["--_theme---background", "#ffffff"],
    radiusFill:  ["--_theme---b-50",       "#9B1B85"],
    radiusLine:  ["--_theme---b-60",       "#7a1570"]
  };

  var SEL = {
    mapContainer:    "map",
    partnerItem:     '[modal-partner="item"]',
    plzAttr:         "[modal-partner-plz]",
    cityAttr:        "[modal-partner-city]",
    sidebarScroll:   ".search_results_wrapper",
    aussendienstItem:".aussendienst-karte-item-wrapper",
    zoomIn:          ".zoom-controls .zoom-in",
    zoomOut:         ".zoom-controls .zoom-out",
    zoomReset:       ".zoom-controls .zoom-reset",
    zoomResetMain:   ".zoom-reset-main",
    prevBtn:         ".previous-card",
    nextBtn:         ".next-card",
    searchReset:     ".search-reset",
    searchInput:     '[data-search-modul="plz"], .searchfield',
    radiusSelect:    '[data-search-modul="radius"]',
    resultInfo:      '[data-search-modul="ergebnis_nr"]',
    kmPill:          '[data-search-modul="km"]',
    kmText:          '[data-search-modul="km-text"]',
    searchNone:      ".search_none",
    zoomTarget:      ".zoom-target",
    suggestPanel:    '[data-suggest="panel"]',
    suggestList:     '[data-suggest="list"]',
    suggestTemplate: '[data-suggest="template"]',
    suggestText:     '[data-suggest="text"]',
    itemLink:        'a[fs-list-element="item-link"]',
    modalGroup:      ".modal-group",
    mobileGrabber:   ".mobile_grabber",
    modal:           ".modal"
  };

  function onReady(fn) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", fn, { once: true });
    } else {
      fn();
    }
  }

  function debounce(fn, ms) {
    var timer = null;
    return function () {
      var ctx = this, args = arguments;
      clearTimeout(timer);
      timer = setTimeout(function () { fn.apply(ctx, args); }, ms);
    };
  }

  function qs(sel, root) { return (root || document).querySelector(sel); }
  function qsa(sel, root) { return Array.from((root || document).querySelectorAll(sel)); }

  function isHorizontalLayout() { return window.innerWidth > HORIZONTAL_MIN_WIDTH; }

  function sanitizeQuery(v) { return String(v || "").trim().replace(/\s+/g, " "); }
  function sanitizePlz(v) { return String(v || "").replace(/[^\d]/g, "").slice(0, 5); }

  function distanceKm(lat1, lng1, lat2, lng2) {
    var R = 6371;
    var toRad = function (d) { return (d * Math.PI) / 180; };
    var dLat = toRad(lat2 - lat1);
    var dLng = toRad(lng2 - lng1);
    var a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  function hashString(str) {
    var h = 2166136261;
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function jitterLatLng(base, i, total, seed) {
    var idx = Math.max(0, i);
    var n = Math.max(1, total);
    var angle = (idx * 137.508) * (Math.PI / 180);
    var radius = Math.sqrt(idx / n) * JITTER_MAX_METERS;
    var tweak = (hashString(seed || String(idx)) % 200) - 100;
    var r = Math.max(0, Math.min(JITTER_MAX_METERS, radius + tweak));
    var dLat = (r * Math.sin(angle)) / 111320;
    var dLng = (r * Math.cos(angle)) / (111320 * Math.cos((base.lat * Math.PI) / 180));
    return { lat: base.lat + dLat, lng: base.lng + dLng };
  }

  function makeCircleGeoJSON(lng, lat, radiusKm, steps) {
    steps = steps || 96;
    var coords = [];
    var distX = radiusKm / (111.32 * Math.cos((lat * Math.PI) / 180));
    var distY = radiusKm / 110.574;
    for (var i = 0; i <= steps; i++) {
      var theta = (i / steps) * (Math.PI * 2);
      coords.push([lng + distX * Math.cos(theta), lat + distY * Math.sin(theta)]);
    }
    return {
      type: "FeatureCollection",
      features: [{ type: "Feature", geometry: { type: "Polygon", coordinates: [coords] }, properties: { radiusKm: radiusKm } }]
    };
  }

  var EMPTY_FC = { type: "FeatureCollection", features: [] };

  var geocodeCache = new Map();

  function geocode(query, types) {
    var q = String(query || "").trim();
    if (!q) return Promise.resolve(null);

    var key = types + ":" + q.toLowerCase();
    if (geocodeCache.has(key)) return Promise.resolve(geocodeCache.get(key));

    var url =
      "https://api.mapbox.com/geocoding/v5/mapbox.places/" +
      encodeURIComponent(q) +
      ".json?types=" + encodeURIComponent(types) +
      "&limit=1&country=de,at,ch&language=de&access_token=" + MAPBOX_TOKEN;

    return fetch(url)
      .then(function (r) { return r.json(); })
      .then(function (data) {
        var f = data && data.features && data.features[0];
        if (!f || !f.center) { geocodeCache.set(key, null); return null; }
        var out = { lat: f.center[1], lng: f.center[0] };
        geocodeCache.set(key, out);
        return out;
      })
      .catch(function () { geocodeCache.set(key, null); return null; });
  }

  function geocodeQuery(qRaw) {
    var digits = sanitizePlz(qRaw);
    if (/^\d{4,5}$/.test(digits)) return geocode(digits, "postcode");
    var txt = String(qRaw || "").trim();
    if (txt.length < 2) return Promise.resolve(null);
    return geocode(txt, "place,locality");
  }

  function fetchSuggestions(qRaw) {
    var q = String(qRaw || "").trim();
    if (!q || q.length < 2) return Promise.resolve([]);

    var digits = sanitizePlz(q);
    var isDigits = digits.length >= 2 && /^\d+$/.test(digits);
    var types = isDigits ? "postcode" : "place,locality";
    var query = isDigits ? digits : q;

    var url =
      "https://api.mapbox.com/geocoding/v5/mapbox.places/" +
      encodeURIComponent(query) +
      ".json?autocomplete=true&limit=5&types=" + encodeURIComponent(types) +
      "&country=de,at,ch&language=de&access_token=" + MAPBOX_TOKEN;

    return fetch(url)
      .then(function (r) { return r.json(); })
      .then(function (data) {
        var feats = (data && data.features) || [];
        return feats.slice(0, 5).map(function (f) {
          return {
            label: f.place_name_de || f.place_name || "",
            center: f.center ? { lng: f.center[0], lat: f.center[1] } : null,
            id: f.id || f.place_name || ""
          };
        });
      })
      .catch(function () { return []; });
  }

  function isDarkMode() {
    var html = document.documentElement;
    var body = document.body;
    return (
      html.classList.contains("dark-mode") ||
      body.classList.contains("dark-mode") ||
      html.classList.contains("u-theme-dark") ||
      body.classList.contains("u-theme-dark")
    );
  }

  function resolveColor(entry) {
    if (typeof entry === "string") return entry;

    var varName = entry[0], fallback = entry[1];
    var probe = document.createElement("div");
    probe.style.color = "var(" + varName + ", " + fallback + ")";
    probe.style.position = "absolute";
    probe.style.left = "-9999px";
    document.body.appendChild(probe);
    var computed = getComputedStyle(probe).color;
    document.body.removeChild(probe);

    if (!computed || computed === "transparent" || computed === "rgba(0, 0, 0, 0)") return fallback;

    var val = String(computed).trim();
    if (!val.startsWith("color(")) return val;

    try {
      var parts = val.slice(val.indexOf("(") + 1, val.lastIndexOf(")")).trim().split(/\s+/);
      if (parts[0].toLowerCase() !== "srgb") return fallback;
      var r = Math.round(Math.min(Math.max(parseFloat(parts[1]), 0), 1) * 255);
      var g = Math.round(Math.min(Math.max(parseFloat(parts[2]), 0), 1) * 255);
      var b = Math.round(Math.min(Math.max(parseFloat(parts[3]), 0), 1) * 255);
      if (isNaN(r) || isNaN(g) || isNaN(b)) return fallback;
      return "rgb(" + r + ", " + g + ", " + b + ")";
    } catch (_) { return fallback; }
  }

  function getThemeColors() {
    return {
      bubble:      resolveColor(MAP_VARS.bubble),
      bubbleHover: resolveColor(MAP_VARS.bubbleHover),
      bubbleActive:resolveColor(MAP_VARS.bubbleActive),
      text:        resolveColor(MAP_VARS.text),
      stroke:      resolveColor(MAP_VARS.stroke),
      radiusFill:  resolveColor(MAP_VARS.radiusFill),
      radiusLine:  resolveColor(MAP_VARS.radiusLine)
    };
  }

  function getUnclusteredPaint() {
    var c = getThemeColors();
    return {
      "circle-color": [
        "case",
        ["boolean", ["feature-state", "active"], false], c.bubbleActive,
        ["boolean", ["feature-state", "hover"], false],  c.bubbleHover,
        c.bubble
      ],
      "circle-emissive-strength": 1,
      "circle-radius": [
        "case",
        ["boolean", ["feature-state", "active"], false], 26,
        ["boolean", ["feature-state", "hover"], false],  24,
        18
      ],
      "circle-stroke-color": c.stroke,
      "circle-stroke-width": 2
    };
  }

  onReady(function () {
    if (!window.mapboxgl) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;
    var allGeoData = [];
    var geoData = [];
    var partnerElByIndex = new Map();

    var lastOpen = null;
    var hoveredFeatureId = null;
    var activeFeatureId = null;
    var filterSeq = 0;

    var currentQuery = "";
    var currentRadiusKm = null;
    var searchCenter = null;
    var currentStyle = isDarkMode() ? STYLE_DARK : STYLE_LIGHT;
    var zoomInBtn      = qs(SEL.zoomIn);
    var zoomOutBtn     = qs(SEL.zoomOut);
    var zoomResetBtn   = qs(SEL.zoomReset);
    var zoomResetMain  = qs(SEL.zoomResetMain);
    var prevBtn        = qs(SEL.prevBtn);
    var nextBtn        = qs(SEL.nextBtn);
    var searchInput    = qs(SEL.searchInput);
    var radiusSelect   = qs(SEL.radiusSelect);
    var searchResetBtn = qs(SEL.searchReset);
    var resultInfoEl   = qs(SEL.resultInfo);
    var searchNoneEls  = qsa(SEL.searchNone);
    var suggestPanel   = qs(SEL.suggestPanel);
    var suggestList    = qs(SEL.suggestList);
    var suggestTemplate = qs(SEL.suggestTemplate);
    var map = new mapboxgl.Map({
      container: SEL.mapContainer,
      style: currentStyle,
      center: [10.4515, 51.1657],
      zoom: 5,
      bearing: 0,
      pitch: 0,
      locale: "de-DE"
    });

    function getScrollWrapper() {
      return qs(SEL.sidebarScroll);
    }

    function resolveRoot() {
      return getScrollWrapper() || document.body;
    }

    function setSearchNoneVisible(show) {
      searchNoneEls.forEach(function (el) {
        el.style.setProperty("display", show ? "block" : "none", "important");
      });
    }

    function updateResultInfo() {
      if (!resultInfoEl) return;
      resultInfoEl.textContent = !currentQuery
        ? String(allGeoData.length)
        : geoData.length + " von " + allGeoData.length;
    }

    function updateNoResults() {
      setSearchNoneVisible(!!(currentQuery && currentRadiusKm && geoData.length === 0));
    }

    function updateAussendienstVisibility() {
      qsa(SEL.aussendienstItem).forEach(function (ad) {
        var partners = ad.querySelectorAll(SEL.partnerItem);
        if (!partners.length) { ad.style.display = ""; return; }
        var anyVisible = Array.from(partners).some(function (p) { return p.style.display !== "none"; });
        ad.style.display = anyVisible ? "" : "none";
      });
    }

    function sortCardsByDistance(center) {
      if (!center) return;
      var root = resolveRoot();
      var cards = qsa(SEL.partnerItem, root).filter(function (c) { return c.style.display !== "none"; });
      if (!cards.length) return;

      var distMap = new Map();
      cards.forEach(function (card) {
        var idx = parseInt(card.dataset.cardIndex, 10);
        var geo = allGeoData.find(function (p) { return p.cardIndex === idx; });
        distMap.set(idx, geo
          ? distanceKm(geo.latitude, geo.longitude, center.lat, center.lng)
          : Infinity);
      });

      var parentGroups = new Map();
      cards.forEach(function (card) {
        var parent = card.parentNode;
        if (!parentGroups.has(parent)) parentGroups.set(parent, []);
        parentGroups.get(parent).push(card);
      });

      parentGroups.forEach(function (group) {
        var sorted = group.slice().sort(function (a, b) {
          var dA = distMap.get(parseInt(a.dataset.cardIndex, 10));
          var dB = distMap.get(parseInt(b.dataset.cardIndex, 10));
          var diff = dA - dB;
          return diff !== 0 ? diff : parseInt(a.dataset.cardIndex, 10) - parseInt(b.dataset.cardIndex, 10);
        });

        var needsMove = false;
        for (var i = 0; i < sorted.length; i++) {
          if (sorted[i] !== group[i]) { needsMove = true; break; }
        }
        if (needsMove) {
          sorted.forEach(function (card) { card.parentNode.appendChild(card); });
        }
      });
    }

    function updateDistancePills() {
      var root = resolveRoot();
      qsa(SEL.partnerItem, root).forEach(function (card) {
        var pill = card.querySelector(SEL.kmPill);
        var text = card.querySelector(SEL.kmText);
        if (!pill) return;

        if (!searchCenter) {
          pill.style.display = "none";
          return;
        }

        var idx = parseInt(card.dataset.cardIndex, 10);
        var geo = allGeoData.find(function (p) { return p.cardIndex === idx; });
        if (!geo) { pill.style.display = "none"; return; }

        var km = distanceKm(geo.latitude, geo.longitude, searchCenter.lat, searchCenter.lng);
        var label = km < 1 ? km.toFixed(1) + " km" : Math.round(km) + " km";

        pill.style.display = "";
        if (text) text.textContent = label;
      });
    }

    function setActiveCard(cardEl) {
      qsa(SEL.partnerItem).forEach(function (x) { x.classList.remove("is--active"); });
      if (cardEl) cardEl.classList.add("is--active");
    }

    function scrollCardToCenter(cardEl) {
      var wrapper = getScrollWrapper();
      if (!wrapper || !cardEl) return;
      var wRect = wrapper.getBoundingClientRect();
      var cRect = cardEl.getBoundingClientRect();
      var target = wrapper.scrollTop + (cRect.top - wRect.top) - wRect.height / 2 + cRect.height / 2;
      try { wrapper.scrollTo({ top: target, behavior: "smooth" }); }
      catch (_) { wrapper.scrollTop = target; }
    }

    /**
     * Dynamic padding for fitBounds — ensures markers stay within the
     * visible 9-column area (to the left of the 3-column sidebar).
     *
     * Reads the actual sidebar width and container margin from the DOM
     * so it adapts to any viewport width.
     */
    function computePadding() {
      if (!isHorizontalLayout()) return PAD_TABLET;

      var sidebar = getScrollWrapper();
      var sidebarWidth = (sidebar && sidebar.offsetWidth) || 0;

      var containerMargin = 0;
      try {
        var computed = getComputedStyle(document.documentElement).getPropertyValue("--site--margin");
        if (computed) {
          var probe = document.createElement("div");
          probe.style.position = "absolute";
          probe.style.left = "-9999px";
          probe.style.width = computed.trim();
          document.body.appendChild(probe);
          containerMargin = probe.offsetWidth || 0;
          document.body.removeChild(probe);
        }
      } catch (_) {}

      var gutter = 16; // 1rem default
      try {
        var g = getComputedStyle(document.documentElement).getPropertyValue("--site--gutter");
        if (g) {
          var gProbe = document.createElement("div");
          gProbe.style.position = "absolute";
          gProbe.style.left = "-9999px";
          gProbe.style.width = g.trim();
          document.body.appendChild(gProbe);
          gutter = gProbe.offsetWidth || 16;
          document.body.removeChild(gProbe);
        }
      } catch (_) {}

      var nav = qs(".nav_wrap") || qs("nav") || qs(".w-nav");
      var navHeight = (nav && nav.offsetHeight) || 80;

      var zoomControls = qs(".zoom-controls.interaktive-karte");
      var zoomWidth = (zoomControls && zoomControls.offsetWidth) || 0;
      var leftExtra = zoomWidth ? zoomWidth + gutter * 2 : gutter;

      var pad = {
        top:    navHeight + 40,
        right:  sidebarWidth + gutter * 2 + containerMargin,
        bottom: 80,
        left:   containerMargin + leftExtra + gutter
      };
      return pad;
    }

    function computeOffset() {
      if (isHorizontalLayout()) {
        var sidebar = getScrollWrapper();
        var sidebarW = (sidebar && sidebar.offsetWidth) || 0;
        var mapContainer = qs("#" + SEL.mapContainer);
        var mapW = (mapContainer && mapContainer.offsetWidth) || window.innerWidth;
        var freeCenter = (mapW - sidebarW) / 2;
        var mapCenter = mapW / 2;
        return [Math.round(freeCenter - mapCenter), 0];
      }
      var vh = (window.visualViewport && window.visualViewport.height) || window.innerHeight;
      return [0, -Math.round(vh * 0.25)];
    }

    function parseRadiusKm() {
      if (!radiusSelect) return null;
      var m = (radiusSelect.value || "").match(/(\d+)/);
      if (!m) return null;
      var km = parseFloat(m[1]);
      return isNaN(km) ? null : km;
    }

    function applyGermanLabels() {
      if (!map.isStyleLoaded()) return;
      var style = map.getStyle();
      if (!style || !style.layers) return;

      style.layers.forEach(function (layer) {
        if (!layer || layer.type !== "symbol") return;
        var tf = layer.layout && layer.layout["text-field"];
        if (!tf) return;

        var s = JSON.stringify(tf);
        if (!s.includes("name") || s.includes("name_de")) return;

        var newTf = Array.isArray(tf)
          ? ["coalesce", ["get", "name_de"], tf]
          : ["coalesce", ["get", "name_de"], ["get", "name"]];

        try { map.setLayoutProperty(layer.id, "text-field", newTf); } catch (_) {}
      });
    }

    function ensureRadiusLayers() {
      var srcId = "search-radius";
      if (!map.getSource(srcId))
        map.addSource(srcId, { type: "geojson", data: EMPTY_FC });

      var c = getThemeColors();

      if (!map.getLayer("search-radius-fill"))
        map.addLayer({ id: "search-radius-fill", type: "fill", source: srcId, paint: { "fill-color": c.radiusFill, "fill-opacity": 0.10 } });

      if (!map.getLayer("search-radius-line"))
        map.addLayer({ id: "search-radius-line", type: "line", source: srcId, paint: { "line-color": c.radiusLine, "line-width": 2, "line-opacity": 0.9 } });

      requestAnimationFrame(function () { setTimeout(forceLayerColors, 60); });
    }

    function setRadiusOverlay(center, radiusKm) {
      var src = map.getSource("search-radius");
      if (!center || !radiusKm) {
        if (src) src.setData(EMPTY_FC);
        return;
      }
      ensureRadiusLayers();
      map.getSource("search-radius").setData(makeCircleGeoJSON(center.lng, center.lat, radiusKm));
      forceLayerColors();
    }

    function geoDataToGeoJSON(arr) {
      return {
        type: "FeatureCollection",
        features: (arr || []).map(function (p) {
          return {
            type: "Feature",
            id: p.cardIndex,
            geometry: { type: "Point", coordinates: [p.longitude, p.latitude] },
            properties: { cardIndex: p.cardIndex, zip: p.zip || "", city: p.city || "" }
          };
        })
      };
    }

    function addOrUpdateSource(skipStyleCheck) {
      if (!skipStyleCheck && !map.isStyleLoaded()) return;

      var data = geoDataToGeoJSON(geoData);

      if (!map.getSource(SOURCE_ID)) {
        map.addSource(SOURCE_ID, {
          type: "geojson",
          data: data,
          cluster: true,
          clusterMaxZoom: CLUSTER_MAX_ZOOM,
          clusterRadius: CLUSTER_RADIUS
        });
      } else {
        map.getSource(SOURCE_ID).setData(data);
      }

      var c = getThemeColors();

      if (!map.getLayer("fachpartner-clusters")) {
        map.addLayer({
          id: "fachpartner-clusters",
          type: "circle",
          source: SOURCE_ID,
          filter: ["has", "point_count"],
          paint: {
            "circle-color": c.bubble,
            "circle-emissive-strength": 1,
            "circle-radius": [
              "interpolate", ["linear"], ["get", "point_count"],
              1, 22,  5, 30,  10, 38,  25, 46,  50, 56,  100, 70
            ]
          }
        });
      }

      if (!map.getLayer("fachpartner-cluster-count")) {
        map.addLayer({
          id: "fachpartner-cluster-count",
          type: "symbol",
          source: SOURCE_ID,
          filter: ["has", "point_count"],
          layout: {
            "text-field": "{point_count_abbreviated}",
            "text-font": ["DIN Offc Pro Medium", "Arial Unicode MS Bold"],
            "text-size": 14
          },
          paint: {
            "text-color": c.text,
            "text-emissive-strength": 1
          }
        });
      }

      if (!map.getLayer("fachpartner-unclustered")) {
        map.addLayer({
          id: "fachpartner-unclustered",
          type: "circle",
          source: SOURCE_ID,
          filter: ["!", ["has", "point_count"]],
          paint: getUnclusteredPaint()
        });
      } else {
        var uPaint = getUnclusteredPaint();
        Object.keys(uPaint).forEach(function (prop) {
          map.setPaintProperty("fachpartner-unclustered", prop, uPaint[prop]);
        });
      }

      ensureRadiusLayers();
      forceLayerColors();

      requestAnimationFrame(function () { setTimeout(applyGermanLabels, 50); });
    }

    function forceLayerColors() {
      var c = getThemeColors();

      try {
        if (map.getLayer("fachpartner-clusters")) {
          map.setPaintProperty("fachpartner-clusters", "circle-color", c.bubble);
          map.setPaintProperty("fachpartner-clusters", "circle-emissive-strength", 1);
        }
        if (map.getLayer("fachpartner-cluster-count")) {
          map.setPaintProperty("fachpartner-cluster-count", "text-color", c.text);
          map.setPaintProperty("fachpartner-cluster-count", "text-emissive-strength", 1);
        }
        if (map.getLayer("fachpartner-unclustered")) {
          var paint = getUnclusteredPaint();
          Object.keys(paint).forEach(function (prop) {
            map.setPaintProperty("fachpartner-unclustered", prop, paint[prop]);
          });
        }
        if (map.getLayer("search-radius-fill")) {
          map.setPaintProperty("search-radius-fill", "fill-color", c.radiusFill);
          map.setPaintProperty("search-radius-fill", "fill-emissive-strength", 1);
        }
        if (map.getLayer("search-radius-line")) {
          map.setPaintProperty("search-radius-line", "line-color", c.radiusLine);
          map.setPaintProperty("search-radius-line", "line-emissive-strength", 1);
        }
      } catch (e) {
        console.warn("[MAP] forceLayerColors error:", e);
      }

      try { map.triggerRepaint(); } catch (_) {}
    }

    function clearFeatureStates() {
      if (!map.getSource(SOURCE_ID)) {
        hoveredFeatureId = null;
        activeFeatureId = null;
        return;
      }
      try {
        if (hoveredFeatureId !== null)
          map.setFeatureState({ source: SOURCE_ID, id: hoveredFeatureId }, { hover: false });
        if (activeFeatureId !== null)
          map.setFeatureState({ source: SOURCE_ID, id: activeFeatureId }, { active: false });
      } catch (_) {}
      hoveredFeatureId = null;
      activeFeatureId = null;
    }

    function flyToWithSidebar(lng, lat, targetZoom) {
      map.easeTo({
        center: [lng, lat],
        zoom: targetZoom || Math.max(map.getZoom(), 6),
        duration: ANIM.fly,
        curve: 1,
        easing: function (t) { return 1 - Math.pow(1 - t, 3); },
        offset: computeOffset(),
        essential: true
      });
    }

    function zoomRelative(step) {
      var current = map.getZoom();
      var target = Math.max(map.getMinZoom(), Math.min(map.getMaxZoom(), current + step));
      var opts = {
        zoom: target,
        duration: ANIM.zoomBtn,
        easing: function (t) { return 1 - Math.pow(1 - t, 3); }
      };

      if (lastOpen) {
        opts.center = [lastOpen.lng, lastOpen.lat];
        opts.offset = computeOffset();
      } else {
        opts.center = map.getCenter();
      }

      map.easeTo(opts);
    }

    function fitAll(animate) {
      if (!geoData.length) return;

      if (geoData.length === 1) {
        var p = geoData[0];
        map.easeTo({
          center: [p.longitude, p.latitude],
          zoom: 9,
          duration: animate ? ANIM.fly : 0,
          offset: computeOffset()
        });
        return;
      }

      var bounds = new mapboxgl.LngLatBounds();
      geoData.forEach(function (p) { bounds.extend([p.longitude, p.latitude]); });
      map.fitBounds(bounds, {
        padding: computePadding(),
        duration: animate ? ANIM.fitBounds : 0,
        linear: false
      });
    }

    function fitToRadius(center, radiusKm, animate) {
      if (!center || !radiusKm) return;
      var circle = makeCircleGeoJSON(center.lng, center.lat, radiusKm);
      var bounds = new mapboxgl.LngLatBounds();
      circle.features[0].geometry.coordinates[0].forEach(function (c) { bounds.extend(c); });
      map.fitBounds(bounds, {
        padding: computePadding(),
        duration: animate ? ANIM.fitBounds : 0,
        linear: false
      });
    }

    function zoomToCardIndex(cardIndex, customZoom, knownCoords) {
      var geo = allGeoData.find(function (p) { return p.cardIndex === cardIndex; });
      if (!geo && !knownCoords) return;

      var lng = knownCoords ? knownCoords.lng : geo.longitude;
      var lat = knownCoords ? knownCoords.lat : geo.latitude;
      var zoom = customZoom || 11;

      lastOpen = { cardIndex: cardIndex, lng: lng, lat: lat, zoom: zoom };
      if (zoomResetBtn) zoomResetBtn.classList.add("is-active");

      if (map.getSource(SOURCE_ID)) {
        try {
          if (activeFeatureId !== null)
            map.setFeatureState({ source: SOURCE_ID, id: activeFeatureId }, { active: false });
          activeFeatureId = cardIndex;
          map.setFeatureState({ source: SOURCE_ID, id: activeFeatureId }, { active: true });
        } catch (_) {}
      }

      var el = partnerElByIndex.get(cardIndex);
      if (el) { setActiveCard(el); scrollCardToCenter(el); }

      requestAnimationFrame(function () { flyToWithSidebar(lng, lat, zoom); });
    }

    async function buildDataFromDOM() {
      var root = resolveRoot();
      var partnerEls = qsa(SEL.partnerItem, root);

      partnerElByIndex = new Map();
      allGeoData = [];
      geoData = [];

      if (!partnerEls.length) {
        updateResultInfo();
        updateNoResults();
        return;
      }

      var raw = [];
      partnerEls.forEach(function (item) {
        var plzEl = item.querySelector(SEL.plzAttr);
        var cityEl = item.querySelector(SEL.cityAttr);

        var plzRaw = plzEl ? (plzEl.getAttribute("modal-partner-plz") || plzEl.textContent || "") : "";
        var cityRaw = cityEl ? (cityEl.getAttribute("modal-partner-city") || cityEl.textContent || "") : "";

        var zip = sanitizePlz(plzRaw);
        if (!zip) return;

        var linkEl = item.querySelector(SEL.itemLink) || item.querySelector("a");
        raw.push({
          item: item,
          zip: zip,
          city: String(cityRaw).trim(),
          link: linkEl ? (linkEl.getAttribute("href") || "") : ""
        });
      });

      var uniquePlz = Array.from(new Set(raw.map(function (r) { return r.zip; })));
      var plzResults = new Map();
      var plzIdx = 0;

      async function worker() {
        while (plzIdx < uniquePlz.length) {
          var plz = uniquePlz[plzIdx++];
          plzResults.set(plz, await geocode(plz, "postcode"));
        }
      }

      var workers = [];
      for (var k = 0; k < Math.min(GEOCODE_CONCURRENCY, uniquePlz.length); k++)
        workers.push(worker());
      await Promise.all(workers);

      var groups = new Map();
      raw.forEach(function (r) {
        if (!groups.has(r.zip)) groups.set(r.zip, []);
        groups.get(r.zip).push(r);
      });

      var cardIndex = 0;
      groups.forEach(function (arr, zip) {
        var base = plzResults.get(zip);
        if (!base) return;

        arr.forEach(function (r, i) {
          var j = jitterLatLng(base, i, arr.length, zip + "|" + r.link);
          r.item.dataset.cardIndex = String(cardIndex);
          partnerElByIndex.set(cardIndex, r.item);

          allGeoData.push({
            latitude: j.lat, longitude: j.lng,
            zip: zip, city: r.city, link: r.link,
            cardIndex: cardIndex
          });
          cardIndex++;
        });
      });

      geoData = allGeoData.slice();

      addOrUpdateSource();
      updateResultInfo();
      updateDistancePills();
      updateNoResults();
      updateAussendienstVisibility();

      if (!currentQuery) fitAll(false);
    }

    function applyCardsVisibility(allowedSet) {
      qsa(SEL.partnerItem, resolveRoot()).forEach(function (card) {
        var idx = parseInt(card.dataset.cardIndex, 10);
        var show = !allowedSet || allowedSet.has(idx);
        card.style.display = show ? "" : "none";
        if (!show) card.classList.remove("is--active");
      });
      updateAussendienstVisibility();
    }

    async function setFilterByQuery(rawValue, opts) {
      var qRaw = sanitizeQuery(rawValue);
      currentQuery = qRaw;
      var noSuggest = opts && opts.noSuggest;
      var noZoom = opts && opts.noZoom;

      if (!noSuggest) debouncedSuggest(qRaw);

      if (!qRaw) {
        geoData = allGeoData.slice();
        searchCenter = null;
        applyCardsVisibility(null);
        clearFeatureStates();
        lastOpen = null;
        if (zoomResetBtn) zoomResetBtn.classList.remove("is-active");
        addOrUpdateSource();
        setRadiusOverlay(null, null);
        updateResultInfo();
        updateDistancePills();
        updateNoResults();
        if (!noZoom) fitAll(true);
        hideSuggestions();
        return;
      }

      var radius = currentRadiusKm;

      if (!radius) {
        var qLower = qRaw.toLowerCase();
        var digits = sanitizePlz(qRaw);

        geoData = allGeoData.filter(function (p) {
          if (/^\d+$/.test(qRaw) && digits) return String(p.zip).startsWith(digits);
          return String(p.city).toLowerCase().includes(qLower) || String(p.zip).startsWith(digits);
        });

        if (!noZoom) {
          var seq = ++filterSeq;
          geocodeQuery(qRaw).then(function (c) {
            if (seq !== filterSeq) return;
            searchCenter = c || null;
            updateDistancePills();
          });
        }

        applyCardsVisibility(new Set(geoData.map(function (p) { return p.cardIndex; })));
        addOrUpdateSource();
        setRadiusOverlay(null, null);
        updateResultInfo();
        updateNoResults();
        if (!noZoom && geoData.length) fitAll(true);
        return;
      }

      var center = await geocodeQuery(qRaw);
      if (!center) {
        geoData = [];
        searchCenter = null;
        applyCardsVisibility(new Set());
        addOrUpdateSource();
        setRadiusOverlay(null, null);
        updateResultInfo();
        updateDistancePills();
        updateNoResults();
        return;
      }

      searchCenter = center;
      geoData = allGeoData.filter(function (p) {
        return distanceKm(p.latitude, p.longitude, center.lat, center.lng) <= radius;
      });

      geoData.sort(function (a, b) {
        var diff = distanceKm(a.latitude, a.longitude, center.lat, center.lng)
                 - distanceKm(b.latitude, b.longitude, center.lat, center.lng);
        return diff !== 0 ? diff : a.cardIndex - b.cardIndex;
      });

      applyCardsVisibility(new Set(geoData.map(function (p) { return p.cardIndex; })));
      addOrUpdateSource();
      setRadiusOverlay(center, radius);
      updateResultInfo();
      updateDistancePills();
      updateNoResults();
      if (!noZoom) fitToRadius(center, radius, true);
    }

    var suggestState = { items: [], activeIndex: -1, open: false, suppressed: false };

    function hideSuggestions() {
      suggestState.open = false;
      suggestState.suppressed = true;
      suggestState.activeIndex = -1;
      if (suggestPanel) suggestPanel.style.display = "none";
    }

    function showSuggestions() {
      if (!suggestPanel) return;
      suggestState.open = true;
      suggestPanel.style.display = "block";
    }

    function setSuggestHover(index) {
      if (!suggestList) return;
      var nodes = Array.from(suggestList.querySelectorAll('[data-suggest-generated="1"]'));
      nodes.forEach(function (n) { n.classList.remove("is-hover"); });
      if (index >= 0 && index < nodes.length) {
        nodes[index].classList.add("is-hover");
        try { nodes[index].scrollIntoView({ block: "nearest" }); } catch (_) {}
      }
    }

    function renderSuggestions(items) {
      if (!suggestPanel || !suggestList || !suggestTemplate) return;
      if (suggestState.suppressed) return;

      qsa('[data-suggest-generated="1"]', suggestList).forEach(function (el) { el.remove(); });

      if (!items.length) { hideSuggestions(); return; }

      suggestState.items = items.slice(0, 5);
      suggestTemplate.style.display = "none";

      suggestState.items.forEach(function (it, idx) {
        var node = suggestTemplate.cloneNode(true);
        node.style.display = "";
        node.setAttribute("data-suggest-generated", "1");

        var textEl = node.querySelector(SEL.suggestText);
        if (textEl) textEl.textContent = it.label;

        node.addEventListener("mouseenter", function () {
          suggestState.activeIndex = idx;
          setSuggestHover(idx);
        });
        node.addEventListener("mousedown", function (e) { e.preventDefault(); });
        node.addEventListener("click", function (e) {
          e.preventDefault();
          applySuggestion(idx);
        });

        suggestList.appendChild(node);
      });

      suggestState.activeIndex = -1;
      showSuggestions();
    }

    function applySuggestion(idx) {
      var it = suggestState.items[idx];
      if (!it) return;

      if (searchInput) {
        searchInput.value = it.label;
        searchInput.blur();
      }

      hideSuggestions();
      setFilterByQuery(it.label, { noSuggest: true });
    }

    var debouncedSuggest = debounce(function (q) {
      if (!suggestPanel || !suggestList || !suggestTemplate || !searchInput) return;
      var query = String(q || "").trim();
      if (!query || query.length < 2) { hideSuggestions(); return; }

      fetchSuggestions(query).then(function (items) {
        if (String(searchInput.value || "").trim() !== query) return;
        renderSuggestions(items);
      });
    }, SUGGEST_DEBOUNCE_MS);

    function getVisibleCardIndices() {
      return geoData.map(function (x) { return x.cardIndex; });
    }

    function navigateCard(direction) {
      var visible = getVisibleCardIndices();
      if (!visible.length) return;

      var current = (lastOpen && typeof lastOpen.cardIndex === "number") ? lastOpen.cardIndex : -1;
      var idx = visible.indexOf(current);

      var nextIdx;
      if (direction > 0) {
        nextIdx = (idx === -1 || idx >= visible.length - 1) ? 0 : idx + 1;
      } else {
        nextIdx = (idx === -1 || idx <= 0) ? visible.length - 1 : idx - 1;
      }
      zoomToCardIndex(visible[nextIdx], 11);
    }

    function handleSearchKeydown(e) {
      if (document.activeElement !== searchInput) return;

      var key = e.key;

      if (key === "Enter") {
        e.preventDefault();
        if (suggestState.open && suggestState.items.length && suggestState.activeIndex >= 0) {
          applySuggestion(suggestState.activeIndex);
        } else {
          hideSuggestions();
          setFilterByQuery(searchInput.value || "", { noSuggest: true });
          searchInput.blur();
        }
        return;
      }

      if (key === "Escape") {
        e.preventDefault();
        hideSuggestions();
        return;
      }

      if (key === "ArrowDown") {
        e.preventDefault();
        if (suggestState.open && suggestState.items.length) {
          var nextIdx = suggestState.activeIndex + 1;
          if (nextIdx >= suggestState.items.length) nextIdx = 0;
          suggestState.activeIndex = nextIdx;
          setSuggestHover(nextIdx);
          var item = suggestState.items[nextIdx];
          if (item && searchInput) searchInput.value = item.label;
        } else {
          hideSuggestions();
          searchInput.blur();
          navigateCard(+1);
        }
        return;
      }
      if (key === "ArrowUp") {
        e.preventDefault();
        if (suggestState.open && suggestState.items.length) {
          var prevIdx = suggestState.activeIndex - 1;
          if (prevIdx < 0) prevIdx = suggestState.items.length - 1;
          suggestState.activeIndex = prevIdx;
          setSuggestHover(prevIdx);
          var prevItem = suggestState.items[prevIdx];
          if (prevItem && searchInput) searchInput.value = prevItem.label;
        } else {
          hideSuggestions();
          searchInput.blur();
          navigateCard(-1);
        }
        return;
      }
    }

    function handleGlobalKeydown(e) {
      var tag = document.activeElement && document.activeElement.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (document.activeElement && document.activeElement.isContentEditable) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        navigateCard(+1);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        navigateCard(-1);
      } else if (e.key === "Escape" && lastOpen) {
        clearFeatureStates();
        setActiveCard(null);
        lastOpen = null;
        if (zoomResetBtn) zoomResetBtn.classList.remove("is-active");
      }
    }

    function setupControls() {
      if (zoomInBtn) zoomInBtn.addEventListener("click", function () { zoomRelative(+1); });
      if (zoomOutBtn) zoomOutBtn.addEventListener("click", function () { zoomRelative(-1); });

      if (zoomResetBtn) {
        zoomResetBtn.addEventListener("click", function () {
          if (!lastOpen) return;
          zoomToCardIndex(lastOpen.cardIndex, lastOpen.zoom, { lng: lastOpen.lng, lat: lastOpen.lat });
        });
      }

      if (zoomResetMain) {
        zoomResetMain.addEventListener("click", function () {
          clearFeatureStates();
          lastOpen = null;
          if (zoomResetBtn) zoomResetBtn.classList.remove("is-active");
          setSearchNoneVisible(false);
          setActiveCard(null);
          if (searchInput) searchInput.value = "";
          if (searchResetBtn) searchResetBtn.style.display = "none";
          currentQuery = "";
          currentRadiusKm = parseRadiusKm();
          setFilterByQuery("", { noSuggest: true });
        });
      }

      if (searchResetBtn) {
        searchResetBtn.style.display = "none";
        searchResetBtn.addEventListener("click", function (e) {
          e.preventDefault();
          if (searchInput) searchInput.value = "";
          currentQuery = "";
          searchResetBtn.style.display = "none";
          setFilterByQuery("", { noSuggest: true });
        });
      }

      if (radiusSelect) {
        currentRadiusKm = parseRadiusKm();
        radiusSelect.addEventListener("change", function () {
          currentRadiusKm = parseRadiusKm();
          setFilterByQuery(currentQuery);
        });
      }

      if (prevBtn) prevBtn.addEventListener("click", function () { navigateCard(-1); });
      if (nextBtn) nextBtn.addEventListener("click", function () { navigateCard(+1); });
    }

    function setupSearchInput() {
      if (!searchInput) return;

      searchInput.addEventListener("keydown", handleSearchKeydown, true);

      var debouncedFilter = debounce(function () {
        setFilterByQuery(searchInput.value || "");
      }, SEARCH_DEBOUNCE_MS);

      searchInput.addEventListener("input", function () {
        suggestState.suppressed = false;
        if (searchResetBtn) {
          searchResetBtn.style.display = searchInput.value.trim() ? "" : "none";
        }
        debouncedFilter();
      });

      document.addEventListener("mousedown", function (e) {
        if (!suggestState.open) return;
        var insideInput = searchInput && searchInput.contains(e.target);
        var insidePanel = suggestPanel && suggestPanel.contains(e.target);
        if (!insideInput && !insidePanel) hideSuggestions();
      });

      searchInput.addEventListener("blur", function () {
        setTimeout(function () {
          if (document.activeElement === searchInput) return;
          hideSuggestions();
        }, 120);
      });
    }

    function bindMapEvents() {
      map.on("click", "fachpartner-clusters", function (e) {
        var feature = e.features && e.features[0];
        if (!feature) return;
        var src = map.getSource(SOURCE_ID);
        if (!src || !src.getClusterExpansionZoom) return;

        src.getClusterExpansionZoom(feature.properties.cluster_id, function (err, zoom) {
          if (err) return;
          map.easeTo({
            center: feature.geometry.coordinates,
            zoom: zoom,
            duration: ANIM.clusterFly,
            easing: function (t) { return 1 - Math.pow(1 - t, 3); }
          });
        });
      });

      map.on("mouseenter", "fachpartner-unclustered", function (e) {
        map.getCanvas().style.cursor = "pointer";
        var f = e.features && e.features[0];
        if (!f) return;
        try {
          if (hoveredFeatureId !== null)
            map.setFeatureState({ source: SOURCE_ID, id: hoveredFeatureId }, { hover: false });
          hoveredFeatureId = f.id;
          map.setFeatureState({ source: SOURCE_ID, id: hoveredFeatureId }, { hover: true });
        } catch (_) {}
      });

      map.on("mouseleave", "fachpartner-unclustered", function () {
        map.getCanvas().style.cursor = "";
        try {
          if (hoveredFeatureId !== null)
            map.setFeatureState({ source: SOURCE_ID, id: hoveredFeatureId }, { hover: false });
        } catch (_) {}
        hoveredFeatureId = null;
      });

      map.on("click", "fachpartner-unclustered", function (e) {
        var f = e.features && e.features[0];
        if (!f) return;
        var coords = f.geometry.coordinates;
        zoomToCardIndex(parseInt(f.properties.cardIndex, 10), Math.max(map.getZoom(), 11),
          { lng: coords[0], lat: coords[1] });
      });

      map.on("mouseenter", "fachpartner-clusters", function () { map.getCanvas().style.cursor = "pointer"; });
      map.on("mouseleave", "fachpartner-clusters", function () { map.getCanvas().style.cursor = ""; });
    }

    function bindZoomTargets() {
      qsa(SEL.zoomTarget, resolveRoot()).forEach(function (target) {
        if (target.dataset._bound === "1") return;
        target.dataset._bound = "1";

        qsa("[data-modal-trigger]", target).forEach(function (trigger) {
          if (trigger.dataset._modalBound === "1") return;
          trigger.dataset._modalBound = "1";
          trigger.addEventListener("click", function (e) {
            e.stopPropagation();
            var modalId = trigger.getAttribute("data-modal-trigger");
            if (window.lumos && window.lumos.modal) {
              window.lumos.modal.open(modalId);
            }
          });
        });

        target.addEventListener("click", function (e) {
          e.preventDefault();
          var cardEl = target.closest(SEL.partnerItem);
          if (!cardEl) return;
          var idx = parseInt(cardEl.dataset.cardIndex, 10);
          if (!isNaN(idx)) {
            zoomToCardIndex(idx, 11);
            document.dispatchEvent(new CustomEvent("fachpartner:card-tap"));
          }
        });
      });
    }

    var isStyleSwitching = false;

    function setupThemeObserver() {
      var obs = new MutationObserver(function () {
        if (isStyleSwitching) return;

        var newStyle = isDarkMode() ? STYLE_DARK : STYLE_LIGHT;

        if (newStyle === currentStyle) {
          requestAnimationFrame(function () {
            setTimeout(function () { forceLayerColors(); applyGermanLabels(); }, 60);
          });
          return;
        }

        currentStyle = newStyle;
        isStyleSwitching = true;
        clearFeatureStates();

        var savedGeoData = geoData.slice();
        var savedAllGeoData = allGeoData.slice();

        try { map.setStyle(newStyle, { diff: false }); }
        catch (_) { map.setStyle(newStyle); }

        function rebuildAfterStyleSwitch() {
          if (!geoData.length && savedGeoData.length) {
            geoData = savedGeoData;
            allGeoData = savedAllGeoData;
          }

          addOrUpdateSource(true);
          setRadiusOverlay(searchCenter, currentRadiusKm);
          forceLayerColors();
          applyGermanLabels();
          isStyleSwitching = false;

          if (lastOpen) flyToWithSidebar(lastOpen.lng, lastOpen.lat, lastOpen.zoom);
        }

        map.once("style.load", function () {
          setTimeout(rebuildAfterStyleSwitch, 50);
        });

        setTimeout(function () {
          if (isStyleSwitching) rebuildAfterStyleSwitch();
        }, 1500);
      });

      obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
      obs.observe(document.body, { attributes: true, attributeFilter: ["class"] });
    }

    function setupDomObserver() {
      var debouncedRebuild = debounce(async function () {
        if (isStyleSwitching) return;
        await buildDataFromDOM();
        bindZoomTargets();
        setFilterByQuery(currentQuery, { noSuggest: true, noZoom: true });
      }, DOM_CHANGE_DELAY_MS);

      var obs = new MutationObserver(debouncedRebuild);
      obs.observe(resolveRoot(), { childList: true, subtree: true });
    }

    async function waitForStableItems() {
      var start = Date.now();
      var lastCount = -1;
      var lastChange = Date.now();

      while (Date.now() - start < STABLE_TIMEOUT_MS) {
        var count = qsa(SEL.partnerItem, resolveRoot()).length;
        if (count !== lastCount) { lastCount = count; lastChange = Date.now(); }
        if (count > 0 && Date.now() - lastChange >= STABLE_DELAY_MS) return count;
        await new Promise(function (r) { setTimeout(r, STABLE_POLL_MS); });
      }
      return lastCount;
    }

    var sheet = {
      OPEN: 0.90,
      CLOSED: 0.25,
      TRANS: "height 0.35s cubic-bezier(0.32, 0.72, 0, 1)",
      TAP_THRESH: 8,
      el: null, grabber: null, frac: 0.25,
      dragging: false, dragDist: 0, startY: 0, startH: 0, lastY: 0, lastT: 0
    };

    function sheetVH() {
      return window.visualViewport ? window.visualViewport.height : window.innerHeight;
    }

    function sheetSet(frac, animate) {
      if (!sheet.el) return;
      sheet.el.style.transition = animate ? sheet.TRANS : "none";
      sheet.el.style.height = Math.round(sheetVH() * frac) + "px";
      sheet.frac = frac;
    }

    function sheetIsOpen() { return sheet.frac > (sheet.OPEN + sheet.CLOSED) / 2; }
    function sheetOpen()   { if (isHorizontalLayout()) return; sheetSet(sheet.OPEN, true); }
    function sheetClose()  { if (isHorizontalLayout()) return; sheetSet(sheet.CLOSED, true); }
    function sheetToggle() { sheetSet(sheetIsOpen() ? sheet.CLOSED : sheet.OPEN, true); }

    function sheetSnap(frac, vel) {
      if (Math.abs(vel) > 0.3) { sheetSet(vel < 0 ? sheet.OPEN : sheet.CLOSED, true); return; }
      sheetSet(frac > (sheet.OPEN + sheet.CLOSED) / 2 ? sheet.OPEN : sheet.CLOSED, true);
    }

    function setupBottomSheet() {
      sheet.el = qs(SEL.modalGroup);
      sheet.grabber = qs(SEL.mobileGrabber);
      if (!sheet.el || !sheet.grabber) return;

      if (!isHorizontalLayout()) sheetSet(sheet.CLOSED, false);

      sheet.grabber.addEventListener("touchstart", function (e) {
        if (isHorizontalLayout()) return;
        sheet.dragging = true; sheet.dragDist = 0;
        sheet.startY = e.touches[0].clientY;
        sheet.startH = sheet.el.getBoundingClientRect().height;
        sheet.el.style.transition = "none";
        sheet.lastY = sheet.startY; sheet.lastT = Date.now();
      }, { passive: true });

      sheet.grabber.addEventListener("touchmove", function (e) {
        if (!sheet.dragging) return;
        var y = e.touches[0].clientY;
        var delta = sheet.startY - y;
        sheet.dragDist = Math.max(sheet.dragDist, Math.abs(delta));
        var minPx = Math.round(sheetVH() * sheet.CLOSED) - 20;
        var maxPx = Math.round(sheetVH() * sheet.OPEN) + 20;
        var px = Math.max(minPx, Math.min(maxPx, sheet.startH + delta));
        sheet.el.style.height = px + "px";
        sheet.frac = px / sheetVH();
        sheet.lastY = y; sheet.lastT = Date.now();
        e.preventDefault();
      }, { passive: false });

      sheet.grabber.addEventListener("touchend", function () {
        if (!sheet.dragging) return;
        sheet.dragging = false;
        if (sheet.dragDist < sheet.TAP_THRESH) { sheetToggle(); return; }
        var dt = Date.now() - sheet.lastT;
        var dy = sheet.startY - sheet.lastY;
        sheetSnap(sheet.frac, dt > 0 ? -(dy / dt) : 0);
      }, { passive: true });

      if (searchInput) {
        searchInput.addEventListener("focus", function () {
          if (!isHorizontalLayout() && sheetIsOpen()) sheetClose();
        });
      }

      document.addEventListener("fachpartner:card-tap", function () {
        if (!isHorizontalLayout()) sheetClose();
      });

      var sheetObs = new MutationObserver(function (muts) {
        if (isHorizontalLayout()) return;
        for (var i = 0; i < muts.length; i++) {
          var m = muts[i];
          if (m.type === "attributes" && m.attributeName === "class") {
            if (m.target.classList.contains("is--active") && m.target.matches(SEL.partnerItem)) {
              sheetOpen(); return;
            }
          }
        }
      });

      var resultsWrap = qs(SEL.sidebarScroll);
      if (resultsWrap) {
        sheetObs.observe(resultsWrap, { attributes: true, attributeFilter: ["class"], subtree: true });
      }

      function sheetRecalc() {
        if (isHorizontalLayout()) { sheet.el.style.height = ""; sheet.el.style.transition = ""; return; }
        if (!sheet.dragging) sheetSet(sheet.frac, true);
      }
      window.addEventListener("resize", sheetRecalc);
      if (window.visualViewport) window.visualViewport.addEventListener("resize", sheetRecalc);

      console.log("[fachpartner-map] BottomSheet ready");
    }

    map.on("load", async function () {
      setupControls();
      setupSearchInput();
      setupThemeObserver();
      bindMapEvents();

      document.addEventListener("keydown", handleGlobalKeydown);

      var scrollWrapper = getScrollWrapper();
      if (scrollWrapper) {
        scrollWrapper.addEventListener("touchmove", function (e) { e.stopPropagation(); }, { passive: true });
      }

      currentRadiusKm = parseRadiusKm();

      await waitForStableItems();
      await buildDataFromDOM();

      bindZoomTargets();
      setupDomObserver();
      setupBottomSheet();

      requestAnimationFrame(function () {
        setTimeout(function () { forceLayerColors(); applyGermanLabels(); }, 80);
      });

      hideSuggestions();
      setSearchNoneVisible(false);

      var VERSION = "2.2.07";
      console.log("[fachpartner-map] v" + VERSION);
      if (new URLSearchParams(location.search).get("debug") === "1") {
        var badge = document.createElement("div");
        badge.textContent = "v" + VERSION;
        badge.style.cssText = "position:fixed;top:8px;right:8px;font-size:14px;color:#ff0000;z-index:999999;pointer-events:none;font-family:monospace;font-weight:bold;background:rgba(0,0,0,0.8);padding:4px 8px;border-radius:4px;";
        document.body.appendChild(badge);
      }
    });
  });
})();
