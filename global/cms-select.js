(function () {
  function populate() {
    var sources = document.querySelectorAll('[data-sd-select-list]');
    sources.forEach(function (source) {
      var key = source.getAttribute('data-sd-select-list');
      if (!key) return;
      var target = document.querySelector('select[data-sd-select-target="' + key + '"]');
      if (!target) return;
      var existing = new Set();
      Array.prototype.forEach.call(target.options, function (o) { existing.add(o.value); });
      var items = source.querySelectorAll('[data-sd-select-item]');
      items.forEach(function (item) {
        var val = (item.textContent || '').trim();
        if (!val || existing.has(val)) return;
        var opt = document.createElement('option');
        opt.value = val;
        opt.textContent = val;
        target.appendChild(opt);
        existing.add(val);
      });
    });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', populate);
  } else {
    populate();
  }
})();
