/* Infinity by GroupChatOn (infinity.groupchaton.com) — tool loader + shared kit
   Designed & Developed by Nivesh Sahayak (https://www.niveshsahayak.in/). All rights reserved: see LICENSE.
   A Blogger post becomes a tool with:  <div class="gco-page" data-gco-tool="pdf-merge"> ... <div class="gco-tool-mount"></div> ... </div>
   site.js loads this file; this file loads tools.css and tools/<id>.js, which calls GCOTools.register(). */
(function () {
  'use strict';
  // loaded twice (site.js and the ⌘K search both ask for it): the second time only mounts tools added since
  if (window.GCOTools && window.GCOTools.scan) { window.GCOTools.scan(); return; }
  var C = window.GCO || {};
  var BASE = C.base || '';
  // EDIT: bump this after changing any file in assets/tools/, so browsers fetch the new version straight away
  var VERSION = '2026-11-02.6';
  var doc = document;
  var T = window.GCOTools = window.GCOTools || {};

  /* ---------- the tool database: data/tools.json (built from scripts/catalog.py) ---------- */
  T.list = [];
  T.cats = [];
  T.find = function (id) { return T.list.filter(function (t) { return t.id === id; })[0]; };
  T.cat = function (id) { return T.cats.filter(function (c) { return c.id === id; })[0] || { id: id, name: id, label: id, icon: '•', color: '#888' }; };
  // every published post, read from the blog's feed 500 at a time: tool slug → its address (/yyyy/mm/slug.html)
  function postPaths(start, acc) {
    return fetch('/feeds/posts/summary?alt=json&max-results=500&start-index=' + start, { credentials: 'omit' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        var list = (d && d.feed && d.feed.entry) || [];
        list.forEach(function (e) {
          var link = (e.link || []).filter(function (l) { return l.rel === 'alternate'; })[0];
          if (!link) return;
          var path = link.href.replace(/^https?:\/\/[^/]+/, '');
          acc[path.replace(/^.*\//, '').replace(/\.html$/, '')] = path;
          if (e.title) acc['title:' + e.title.$t] = path;   // posts imported in bulk get their address from the title
        });
        return list.length === 500 ? postPaths(start + 500, acc) : acc;
      });
  }
  T.ready = fetch(BASE + 'data/tools.json?v=' + Math.floor(Date.now() / 6e5), { credentials: 'omit' })
    .then(function (r) { if (!r.ok) throw new Error('Tool list ' + r.status); return r.json(); })
    .then(function (db) {
      T.cats = db.categories || [];
      T.list = db.tools || [];
      // until the post list arrives, a tool's link is a search for it; then it becomes the post's own address
      T.list.forEach(function (t) { t.path = '/search?q=' + encodeURIComponent(t.name); });
      if (C.isApp) return {};   // app.groupchaton.com: tools open inside the app (#id)
      return postPaths(1, {}).catch(function () { return {}; });
    })
    .then(function (paths) {
      T.list.forEach(function (t) {
        var p = paths[t.slug] || paths['title:' + t.title];
        if (p) t.path = p;
        if (C.isApp) t.path = t.app ? '#' + t.id : (C.infinity || '') + '/search?q=' + encodeURIComponent(t.name);
      });
      Array.prototype.forEach.call(doc.querySelectorAll('[data-tool-link]'), function (a) {
        var t = T.find(a.getAttribute('data-tool-link'));
        if (t) a.setAttribute('href', t.path);
      });
    })
    .catch(function (e) { if (window.console) console.warn('Infinity: tool list not loaded', e); });

  /* ---------- libraries (fixed versions) ---------- */
  var CDN = 'https://cdnjs.cloudflare.com/ajax/libs/';
  var LIBS = {
    pdflib: [CDN + 'pdf-lib/1.17.1/pdf-lib.min.js', 'PDFLib'],
    pdfjs: [CDN + 'pdf.js/3.11.174/pdf.min.js', 'pdfjsLib'],
    jszip: [CDN + 'jszip/3.10.1/jszip.min.js', 'JSZip'],
    jspdf: [CDN + 'jspdf/2.5.1/jspdf.umd.min.js', 'jspdf'],
    html2canvas: [CDN + 'html2canvas/1.4.1/html2canvas.min.js', 'html2canvas'],
    tesseract: ['https://cdn.jsdelivr.net/npm/tesseract.js@5.0.5/dist/tesseract.min.js', 'Tesseract'],
    qrcode: [CDN + 'qrcode-generator/1.4.4/qrcode.min.js', 'qrcode'],
    marked: ['https://cdn.jsdelivr.net/npm/marked@12.0.2/marked.min.js', 'marked'],
    purify: ['https://cdn.jsdelivr.net/npm/dompurify@3.1.6/dist/purify.min.js', 'DOMPurify'],
    yaml: ['https://cdn.jsdelivr.net/npm/js-yaml@4.1.0/dist/js-yaml.min.js', 'jsyaml'],
    terser: ['https://cdn.jsdelivr.net/npm/terser@5.31.0/dist/bundle.min.js', 'Terser'],
    leaflet: [CDN + 'leaflet/1.9.4/leaflet.min.js', 'L']
  };
  var loading = {};
  T.loadScript = function (src) {
    if (!loading[src]) loading[src] = new Promise(function (ok, fail) {
      var s = doc.createElement('script');
      s.src = src; s.async = true;
      s.onload = function () { ok(); };
      s.onerror = function () { delete loading[src]; fail(new Error('Could not load ' + src.split('/').pop() + '. Check your connection and try again.')); };
      doc.head.appendChild(s);
    });
    return loading[src];
  };
  T.lib = function (name) {
    var l = LIBS[name];
    return T.loadScript(l[0]).then(function () {
      var g = window[l[1]];
      if (name === 'pdfjs' && g && !g.GlobalWorkerOptions.workerSrc) g.GlobalWorkerOptions.workerSrc = CDN + 'pdf.js/3.11.174/pdf.worker.min.js';
      return g;
    });
  };

  /* ---------- small helpers ---------- */
  var h = T.h = function (tag, attrs, kids) {
    var n = doc.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      var v = attrs[k];
      if (v === null || v === undefined || v === false) return;
      if (k === 'text') n.textContent = v;
      else if (k === 'html') n.innerHTML = v;
      else if (k.slice(0, 2) === 'on') n.addEventListener(k.slice(2), v);
      else n.setAttribute(k, v === true ? '' : v);
    });
    (kids || []).forEach(function (c) { if (c !== null && c !== undefined && c !== false) n.appendChild(typeof c === 'string' ? doc.createTextNode(c) : c); });
    return n;
  };
  T.bytes = function (n) {
    if (n < 1024) return n + ' B';
    if (n < 1048576) return (n / 1024).toFixed(1) + ' KB';
    return (n / 1048576).toFixed(n < 10485760 ? 2 : 1) + ' MB';
  };
  T.baseName = function (name) { return String(name || 'file').replace(/\.[^.]+$/, ''); };
  T.read = function (file, how) {
    return new Promise(function (ok, fail) {
      var r = new FileReader();
      r.onload = function () { ok(r.result); };
      r.onerror = function () { fail(new Error('Could not read ' + file.name)); };
      if (how === 'dataURL') r.readAsDataURL(file); else if (how === 'text') r.readAsText(file); else r.readAsArrayBuffer(file);
    });
  };
  T.download = function (blob, name) {
    var url = URL.createObjectURL(blob);
    var a = h('a', { href: url, download: name });
    doc.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 60000);
  };
  T.zip = function (items, onProgress) {
    return T.lib('jszip').then(function (JSZip) {
      var z = new JSZip();
      items.forEach(function (it) { z.file(it.name, it.blob); });
      return z.generateAsync({ type: 'blob' }, function (m) { if (onProgress) onProgress(m.percent / 100); });
    });
  };
  T.copy = function (text, btn) {
    var done = function () {
      if (!btn) return;
      var old = btn.textContent; btn.textContent = 'Copied ✓';
      setTimeout(function () { btn.textContent = old; }, 1600);
    };
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text).then(done);
    var ta = h('textarea', { style: 'position:fixed;opacity:0' }); ta.value = text;
    doc.body.appendChild(ta); ta.select();
    try { doc.execCommand('copy'); done(); } catch (e) {}
    ta.remove();
    return Promise.resolve();
  };
  T.store = {
    get: function (k, d) { try { var v = localStorage.getItem('gco-tool-' + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem('gco-tool-' + k, JSON.stringify(v)); } catch (e) {} }
  };

  /* ---------- building blocks ---------- */
  T.button = function (text, opts) {
    opts = opts || {};
    return h('button', { type: 'button', 'class': 'tbtn' + (opts.primary ? ' tbtn-primary' : '') + (opts.small ? ' tbtn-sm' : ''),
      onclick: opts.onclick, disabled: opts.disabled }, [text]);
  };
  T.field = function (label, input, hint) {
    return h('label', { 'class': 'tfield' }, [h('span', { 'class': 'tfield-label', text: label }), input, hint ? h('small', { text: hint }) : null]);
  };
  T.select = function (options, value) {
    var s = h('select', {}, options.map(function (o) {
      var val = Array.isArray(o) ? o[0] : o, lab = Array.isArray(o) ? o[1] : o;
      return h('option', { value: val, selected: String(val) === String(value) }, [lab]);
    }));
    return s;
  };
  T.seg = function (options, value, onChange) {
    var wrap = h('div', { 'class': 'tseg', role: 'group' });
    function draw() {
      wrap.innerHTML = '';
      options.forEach(function (o) {
        wrap.appendChild(h('button', { type: 'button', 'aria-pressed': String(o[0] === value), text: o[1],
          onclick: function () { value = o[0]; draw(); if (onChange) onChange(value); } }));
      });
    }
    draw();
    wrap.value = function () { return value; };
    return wrap;
  };
  T.row = function (kids, cls) { return h('div', { 'class': 'trow' + (cls ? ' ' + cls : '') }, kids); };

  // drop area: click, drag and drop, or paste (images)
  T.dropzone = function (opts) {
    var input = h('input', { type: 'file', accept: opts.accept || '', multiple: opts.multiple ? true : null, hidden: true });
    if (opts.folder) { input.setAttribute('webkitdirectory', ''); input.setAttribute('directory', ''); }
    var zone = h('div', { 'class': 'tdrop', tabindex: '0', role: 'button', 'aria-label': opts.label }, [
      h('span', { 'class': 'tdrop-ic', 'aria-hidden': 'true', text: opts.icon || '📂' }),
      h('b', { text: opts.label || 'Choose files' }),
      h('small', { text: opts.hint || 'or drag and drop them here' }),
      input]);
    function take(list) {
      var files = Array.prototype.slice.call(list || []);
      if (opts.filter) files = files.filter(opts.filter);
      if (files.length) opts.onFiles(opts.multiple ? files : [files[0]]);
    }
    zone.addEventListener('click', function () { input.click(); });
    zone.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input.click(); } });
    input.addEventListener('change', function () { take(input.files); input.value = ''; });
    ['dragenter', 'dragover'].forEach(function (ev) { zone.addEventListener(ev, function (e) { e.preventDefault(); zone.classList.add('is-over'); }); });
    ['dragleave', 'drop'].forEach(function (ev) { zone.addEventListener(ev, function (e) { e.preventDefault(); zone.classList.remove('is-over'); }); });
    zone.addEventListener('drop', function (e) { take(e.dataTransfer.files); });
    if (opts.paste) doc.addEventListener('paste', function (e) {
      var items = (e.clipboardData && e.clipboardData.files) || [];
      if (items.length) take(items);
    });
    return zone;
  };

  // a list of files the user can reorder and remove
  T.fileList = function (onChange) {
    var files = [], ul = h('ol', { 'class': 'tfiles' });
    function draw() {
      ul.innerHTML = '';
      files.forEach(function (f, i) {
        ul.appendChild(h('li', {}, [
          f.thumb ? h('img', { src: f.thumb, alt: '' }) : h('span', { 'class': 'tfiles-ic', text: '📄' }),
          h('span', { 'class': 'tfiles-name' }, [h('b', { text: f.file.name }), h('small', { text: T.bytes(f.file.size) + (f.note ? ' · ' + f.note : '') })]),
          h('span', { 'class': 'tfiles-act' }, [
            h('button', { type: 'button', 'aria-label': 'Move up', disabled: i === 0, text: '↑', onclick: function () { move(i, -1); } }),
            h('button', { type: 'button', 'aria-label': 'Move down', disabled: i === files.length - 1, text: '↓', onclick: function () { move(i, 1); } }),
            h('button', { type: 'button', 'aria-label': 'Remove', text: '✕', onclick: function () { files.splice(i, 1); draw(); } })])]));
      });
      ul.hidden = !files.length;
      if (onChange) onChange(files);
    }
    function move(i, d) { var x = files.splice(i, 1)[0]; files.splice(i + d, 0, x); draw(); }
    return {
      el: ul,
      add: function (list) {
        list.forEach(function (file) {
          var item = { file: file };
          files.push(item);
          if (/^image\//.test(file.type)) { item.thumb = URL.createObjectURL(file); }
        });
        draw();
      },
      files: function () { return files.map(function (f) { return f.file; }); },
      clear: function () { files = []; draw(); },
      draw: draw
    };
  };

  // status line with optional progress bar
  T.status = function () {
    var bar = h('div', { 'class': 'tprogress', hidden: true }, [h('span')]);
    var msg = h('p', { 'class': 'tstatus', role: 'status', 'aria-live': 'polite' });
    var wrap = h('div', { 'class': 'tstatus-wrap' }, [bar, msg]);
    function set(kind, text) { msg.className = 'tstatus' + (kind ? ' is-' + kind : ''); msg.textContent = text || ''; }
    return {
      el: wrap,
      info: function (t) { set('', t); },
      ok: function (t) { bar.hidden = true; set('ok', t); },
      error: function (e) { bar.hidden = true; set('error', (e && e.message) || String(e)); },
      progress: function (p, t) { bar.hidden = false; bar.firstChild.style.width = Math.round(Math.max(0, Math.min(1, p)) * 100) + '%'; if (t) set('', t); },
      clear: function () { bar.hidden = true; set('', ''); }
    };
  };

  // a box of result files with download buttons (+ "download all as ZIP")
  T.results = function () {
    var box = h('div', { 'class': 'tresults', hidden: true });
    var items = [];
    function draw() {
      box.innerHTML = '';
      box.hidden = !items.length;
      if (!items.length) return;
      var head = h('div', { 'class': 'tresults-head' }, [h('b', { text: items.length === 1 ? 'Your file is ready' : items.length + ' files are ready' })]);
      if (items.length > 1) head.appendChild(T.button('Download all (ZIP)', { primary: true, small: true, onclick: function () {
        T.zip(items).then(function (z) { T.download(z, (box.zipName || 'files') + '.zip'); });
      } }));
      box.appendChild(head);
      var grid = h('div', { 'class': 'tresults-grid' });
      items.forEach(function (it) {
        grid.appendChild(h('div', { 'class': 'tresult' }, [
          it.preview ? h('img', { src: it.preview, alt: it.name, loading: 'lazy' }) : h('span', { 'class': 'tresult-ic', text: it.icon || '📄' }),
          h('span', { 'class': 'tresult-name' }, [h('b', { text: it.name }), h('small', { text: T.bytes(it.blob.size) + (it.note ? ' · ' + it.note : '') })]),
          T.button('Download', { small: true, primary: items.length === 1, onclick: function () { T.download(it.blob, it.name); } })]));
      });
      box.appendChild(grid);
    }
    return {
      el: box,
      set: function (list, zipName) { items = list; box.zipName = zipName; draw(); },
      clear: function () { items = []; draw(); }
    };
  };

  T.card = function (kids) { return h('div', { 'class': 'tool-app' }, kids); };

  /* text in → text out: the shape of most text and developer tools.
     o: { id, run(text, opts) → string (throw Error for a message), options: [elements], live: true (update as you type),
          button: 'Format', inLabel, outLabel, placeholder, sample, mono, rows, download: 'result.txt', type: 'text/plain' }
     Returns { input, output, update }. Options with data-opt="name" are passed to run() as opts.name. */
  T.transformer = function (spot, o) {
    var mono = o.mono ? ' tmono' : '';
    var input = h('textarea', { rows: String(o.rows || 9), 'class': 'tin' + mono, placeholder: o.placeholder || 'Type or paste here…', 'aria-label': o.inLabel || 'Input', spellcheck: o.mono ? 'false' : null });
    var output = h('textarea', { rows: String(o.rows || 9), 'class': 'tout' + mono, readonly: true, 'aria-label': o.outLabel || 'Result', spellcheck: 'false' });
    var status = T.status();
    input.value = T.store.get(o.id + '-in', '');
    var seq = 0;
    function opts() {
      var r = {};
      (o.options || []).forEach(function (el) {
        Array.prototype.forEach.call([el].concat(Array.prototype.slice.call(el.querySelectorAll ? el.querySelectorAll('[data-opt]') : [])), function (x) {
          var k = x.getAttribute && x.getAttribute('data-opt');
          if (!k) return;
          r[k] = x.type === 'checkbox' ? x.checked : typeof x.value === 'function' ? x.value() : x.value;
        });
      });
      return r;
    }
    function update() {
      T.store.set(o.id + '-in', input.value.slice(0, 200000));
      if (!input.value) { output.value = ''; status.clear(); return; }
      try {
        var res = o.run(input.value, opts()), tok = ++seq;
        if (res && typeof res.then === 'function') {   // tools that wait for a library or the browser's crypto
          status.info('Working…');
          res.then(function (v) { if (tok !== seq) return; output.value = v == null ? '' : String(v); if (o.note) status.info(o.note(input.value, output.value)); else status.clear(); },
            function (e) { if (tok === seq) { output.value = ''; status.error(e); } });
          return;
        }
        output.value = res == null ? '' : String(res);
        if (o.note) status.info(o.note(input.value, output.value)); else status.clear();
      } catch (e) { output.value = ''; status.error(e); }
    }
    var copy = T.button('Copy result', { onclick: function () { T.copy(output.value, copy); } });
    var dl = T.button('Download', { onclick: function () { T.download(new Blob([output.value], { type: (o.type || 'text/plain') + ';charset=utf-8' }), o.download || 'result.txt'); } });
    var go = o.live === false ? T.button(o.button || 'Convert', { primary: true, onclick: update }) : null;
    var sample = o.sample ? T.button('Try a sample', { small: true, onclick: function () { input.value = o.sample; update(); } }) : null;
    var clear = T.button('Clear', { small: true, onclick: function () { input.value = ''; update(); input.focus(); } });
    spot.appendChild(T.card([
      T.field(o.inLabel || 'Your text', input),
      (o.options || []).length ? h('div', { 'class': 'topts' }, o.options) : null,
      T.row([go, sample, clear]),
      status.el,
      T.field(o.outLabel || 'Result', output),
      T.row([copy, o.download === false ? null : dl])]));
    if (o.live !== false) input.addEventListener('input', update);
    (o.options || []).forEach(function (el) { el.addEventListener('change', update); el.addEventListener('input', function () { if (o.live !== false) update(); }); el.addEventListener('click', function () { if (o.live !== false) setTimeout(update, 0); }); });
    update();
    return { input: input, output: output, update: update, status: status };
  };
  // a labelled checkbox / select / number for T.transformer options
  T.opt = {
    check: function (name, label, on) { return h('label', { 'class': 'tcheck' }, [h('input', { type: 'checkbox', 'data-opt': name, checked: on ? true : null }), ' ' + label]); },
    select: function (name, label, options, value) { var s = T.select(options, value); s.setAttribute('data-opt', name); return T.field(label, s); },
    text: function (name, label, value, ph) { return T.field(label, h('input', { type: 'text', 'data-opt': name, value: value || '', placeholder: ph || '' })); },
    number: function (name, label, value, min, max) { return T.field(label, h('input', { type: 'number', 'data-opt': name, value: String(value), min: min, max: max })); }
  };


  /* ---------- engines: one script draws many tools from a short description ----------
     A tool file calls  GCOTools.engine('calc', 'emi', { ...description... })  and _calc.js does the rest. */
  T.engines = {};
  T.tests = {};   // id → function returning a Promise of { ok, fails: [] } (used by our own test runs)
  T.engine = function (name, id, def) {
    var go = function () { T.register(id, function (spot, T, page) { return T.engines[name](spot, T, def, id, page); }); };
    if (T.engines[name]) return go();
    T.loadScript(BASE + 'assets/tools/_' + name + '.js?v=' + VERSION).then(go, function (e) {
      $all('[data-gco-tool="' + id + '"] .gco-tool-mount').forEach(function (s) { s.appendChild(h('p', { 'class': 'tstatus is-error', text: e.message })); });
    });
  };

  /* ---------- numbers and money for a global audience ---------- */
  var LANG = (navigator.languages && navigator.languages[0]) || navigator.language || 'en-US';
  var REGION_CUR = { IN: 'INR', US: 'USD', GB: 'GBP', IE: 'EUR', DE: 'EUR', FR: 'EUR', ES: 'EUR', IT: 'EUR', NL: 'EUR', BE: 'EUR', AT: 'EUR', PT: 'EUR', FI: 'EUR', GR: 'EUR',
    CA: 'CAD', AU: 'AUD', NZ: 'NZD', AE: 'AED', SA: 'SAR', QA: 'QAR', KW: 'KWD', OM: 'OMR', BH: 'BHD', PK: 'PKR', BD: 'BDT', NP: 'NPR', LK: 'LKR', SG: 'SGD', MY: 'MYR',
    ID: 'IDR', PH: 'PHP', TH: 'THB', VN: 'VND', JP: 'JPY', CN: 'CNY', HK: 'HKD', KR: 'KRW', TW: 'TWD', ZA: 'ZAR', NG: 'NGN', KE: 'KES', EG: 'EGP', GH: 'GHS', TR: 'TRY',
    RU: 'RUB', UA: 'UAH', PL: 'PLN', SE: 'SEK', NO: 'NOK', DK: 'DKK', CH: 'CHF', CZ: 'CZK', HU: 'HUF', RO: 'RON', IL: 'ILS', MX: 'MXN', BR: 'BRL', AR: 'ARS', CL: 'CLP', CO: 'COP', PE: 'PEN' };
  T.CURRENCIES = ['USD', 'EUR', 'GBP', 'INR', 'AED', 'SAR', 'PKR', 'BDT', 'NPR', 'LKR', 'CAD', 'AUD', 'NZD', 'SGD', 'MYR', 'IDR', 'PHP', 'THB', 'VND', 'JPY', 'CNY', 'HKD', 'KRW',
    'ZAR', 'NGN', 'KES', 'EGP', 'GHS', 'TRY', 'RUB', 'UAH', 'PLN', 'SEK', 'NOK', 'DKK', 'CHF', 'CZK', 'ILS', 'QAR', 'KWD', 'OMR', 'BHD', 'MXN', 'BRL', 'ARS', 'CLP', 'COP', 'PEN'];
  T.currency = function (set) {
    if (set) { T.store.set('currency', set); return set; }
    return T.store.get('currency', null) || REGION_CUR[(LANG.split('-')[1] || '').toUpperCase()] || 'USD';
  };
  function locFor(cur) { return cur === 'INR' ? 'en-IN' : LANG; }   // lakh / crore grouping for rupees
  T.money = function (n, cur) {
    cur = cur || T.currency();
    if (!isFinite(n)) return '—';
    try { return new Intl.NumberFormat(locFor(cur), { style: 'currency', currency: cur, maximumFractionDigits: Math.abs(n) >= 1000 ? 0 : 2 }).format(n); }
    catch (e) { return cur + ' ' + T.num(n, 2); }
  };
  T.num = function (n, dp) {
    if (typeof n !== 'number' || !isFinite(n)) return n === Infinity ? '∞' : '—';
    var a = Math.abs(n);
    if (a !== 0 && (a >= 1e15 || a < 1e-6)) return n.toExponential(Math.min(dp == null ? 6 : dp, 10)).replace('e+', ' × 10^').replace('e-', ' × 10^-');
    return n.toLocaleString(locFor(T.currency()), { maximumFractionDigits: dp == null ? (a >= 1000 ? 2 : a >= 1 ? 4 : 8) : dp });
  };


  /* ---------- on-device storage for record-keeping tools (money manager, book keeper, invoices…) ----------
     Like WhatsApp Web, records live in this browser's IndexedDB: large, fast, and able to hold photos and PDFs (Blobs).
     Each tool's records are loaded into memory once, then every change is written back.
     var V = T.vault('money', emptyValue);  V.ready.then(draw);  V.data() → the records;  V.save(records);  V.bar(onChange) → Backup / Restore / Delete all */
  var idb = null;
  function db() {
    if (!idb) idb = new Promise(function (ok, fail) {
      if (!window.indexedDB) return fail(new Error('no IndexedDB'));
      var r = indexedDB.open('gco-records', 1);
      r.onupgradeneeded = function () { r.result.createObjectStore('vault'); };
      r.onsuccess = function () { ok(r.result); };
      r.onerror = function () { fail(r.error); };
    });
    return idb;
  }
  function idbDo(mode, fn) {
    return db().then(function (d) {
      return new Promise(function (ok, fail) {
        var tx = d.transaction('vault', mode), req = fn(tx.objectStore('vault'));
        tx.oncomplete = function () { ok(req && req.result); };
        tx.onerror = tx.onabort = function () { fail(tx.error); };
      });
    });
  }
  T.idb = { get: function (k) { return idbDo('readonly', function (s) { return s.get(k); }); }, put: function (k, v) { return idbDo('readwrite', function (s) { return s.put(v, k); }); },
    del: function (k) { return idbDo('readwrite', function (s) { return s['delete'](k); }); }, keys: function () { return idbDo('readonly', function (s) { return s.getAllKeys(); }); } };
  var vaults = {};
  T.vault = function (name, empty) {
    if (vaults[name]) return vaults[name];
    var key = 'gco-vault-' + name, mem, useLocal = false;
    function fresh() { return JSON.parse(JSON.stringify(empty || {})); }
    mem = fresh();
    var v = { key: key };
    // ask the browser not to clear these records when space runs low
    if (navigator.storage && navigator.storage.persist) { try { navigator.storage.persist(); } catch (e) {} }
    v.ready = T.idb.get(key).then(function (got) {
      if (got !== undefined) { mem = got; return; }
      var old = null; try { old = localStorage.getItem(key); } catch (e) {}   // records saved by the first version of these tools
      if (old) { mem = JSON.parse(old); return T.idb.put(key, mem).then(function () { try { localStorage.removeItem(key); } catch (e) {} }); }
    }).catch(function () {   // private windows in some browsers block IndexedDB: fall back to localStorage
      useLocal = true;
      try { var x = localStorage.getItem(key); if (x) mem = JSON.parse(x); } catch (e) {}
    });
    v.data = function () { return mem; };
    v.save = function (d) {
      mem = d;
      var fail = function () { alert('Your records could not be saved: the browser storage may be full. Download a backup, then delete old records.'); };
      if (useLocal) { try { localStorage.setItem(key, JSON.stringify(d)); } catch (e) { fail(); } return Promise.resolve(); }
      return T.idb.put(key, d).catch(fail);
    };
    v.clear = function () { return v.save(fresh()); };
    v.backup = function () {
      // photos and files are saved as data URLs so one JSON file holds everything
      return toPlain(mem).then(function (plain) {
        T.download(new Blob([JSON.stringify({ tool: name, saved: new Date().toISOString(), data: plain }, null, 1)], { type: 'application/json' }),
          name + '-backup-' + new Date().toISOString().slice(0, 10) + '.json');
      });
    };
    v.restore = function (file) {
      return T.read(file, 'text').then(function (t) {
        var j = JSON.parse(t);
        if (!j || j.tool !== name || !j.data) throw new Error('This is not a backup from this tool.');
        return fromPlain(j.data).then(function (d) { return v.save(d).then(function () { return d; }); });
      });
    };
    v.bar = function (onChange) {
      var file = h('input', { type: 'file', accept: '.json,application/json', hidden: true });
      file.addEventListener('change', function () {
        if (!file.files[0]) return;
        v.restore(file.files[0]).then(function () { if (onChange) onChange(); alert('Backup restored.'); }, function (e) { alert(e.message); });
        file.value = '';
      });
      return h('div', { 'class': 'tvault' }, [
        h('span', { 'class': 'tvault-msg' }, [h('b', { text: '🔒 Saved only on this device. ' }), 'Nothing is uploaded. Download a backup now and then, and before clearing your browser.']),
        h('span', { 'class': 'tvault-act' }, [
          T.button('Backup', { small: true, onclick: v.backup }),
          T.button('Restore', { small: true, onclick: function () { file.click(); } }),
          T.button('Delete all', { small: true, onclick: function () {
            if (!confirm('Delete all saved records in this tool? Download a backup first if you may need them.')) return;
            v.clear().then(function () { if (onChange) onChange(); });
          } }), file])]);
    };
    vaults[name] = v;
    return v;
  };
  // Blobs ↔ data URLs, for backups that fit in one JSON file
  function toPlain(x) {
    if (x instanceof Blob) return T.read(x, 'dataURL').then(function (u) { return { __blob: u }; });
    if (Array.isArray(x)) return Promise.all(x.map(toPlain));
    if (x && typeof x === 'object') { var ks = Object.keys(x); return Promise.all(ks.map(function (k) { return toPlain(x[k]); })).then(function (vs) { var o = {}; ks.forEach(function (k, i) { o[k] = vs[i]; }); return o; }); }
    return Promise.resolve(x);
  }
  function fromPlain(x) {
    if (x && x.__blob) return fetch(x.__blob).then(function (r) { return r.blob(); });
    if (Array.isArray(x)) return Promise.all(x.map(fromPlain));
    if (x && typeof x === 'object') { var ks = Object.keys(x); return Promise.all(ks.map(function (k) { return fromPlain(x[k]); })).then(function (vs) { var o = {}; ks.forEach(function (k, i) { o[k] = vs[i]; }); return o; }); }
    return Promise.resolve(x);
  }
  // amount in words: lakh / crore for rupees, million / billion for other currencies
  T.words = function (n, cur) {
    cur = cur || T.currency();
    var ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    var tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    function two(x) { return x < 20 ? ones[x] : tens[Math.floor(x / 10)] + (x % 10 ? '-' + ones[x % 10] : ''); }
    function three(x) { return (x >= 100 ? ones[Math.floor(x / 100)] + ' Hundred' + (x % 100 ? ' ' : '') : '') + (x % 100 ? two(x % 100) : ''); }
    function whole(x) {
      if (x === 0) return 'Zero';
      var out = [];
      if (cur === 'INR' || cur === 'NPR' || cur === 'PKR' || cur === 'BDT') {
        if (x >= 1e9) { out.push(whole(Math.floor(x / 1e7)).replace(/^Zero$/, '') + ' Crore'); x %= 1e7; }
        [[1e7, 'Crore'], [1e5, 'Lakh'], [1e3, 'Thousand']].forEach(function (p) { if (x >= p[0]) { out.push(two(Math.floor(x / p[0])) + ' ' + p[1]); x %= p[0]; } });
        if (x) out.push(three(x));
      } else {
        [[1e12, 'Trillion'], [1e9, 'Billion'], [1e6, 'Million'], [1e3, 'Thousand']].forEach(function (p) { if (x >= p[0]) { out.push(three(Math.floor(x / p[0])) + ' ' + p[1]); x %= p[0]; } });
        if (x) out.push(three(x));
      }
      return out.join(' ');
    }
    var NAMES = { INR: ['Rupees', 'Paise'], USD: ['Dollars', 'Cents'], EUR: ['Euros', 'Cents'], GBP: ['Pounds', 'Pence'], AED: ['Dirhams', 'Fils'], SAR: ['Riyals', 'Halalas'],
      PKR: ['Rupees', 'Paisa'], BDT: ['Taka', 'Poisha'], NPR: ['Rupees', 'Paisa'], LKR: ['Rupees', 'Cents'], CAD: ['Dollars', 'Cents'], AUD: ['Dollars', 'Cents'], SGD: ['Dollars', 'Cents'] };
    var nm = NAMES[cur] || [cur, 'Cents'];
    n = Math.round(Math.abs(n) * 100);
    var c = n % 100;
    return nm[0] + ' ' + whole(Math.floor(n / 100)) + (c ? ' and ' + two(c) + ' ' + nm[1] : '') + ' Only';
  };

  /* ---------- PDF helpers ---------- */
  T.openPdf = function (file) {
    return Promise.all([T.lib('pdfjs'), T.read(file)]).then(function (r) {
      return r[0].getDocument({ data: new Uint8Array(r[1]) }).promise;
    }).catch(function (e) {
      if (/password/i.test(e && e.name + e.message)) throw new Error('This PDF is password-protected. Remove the password first.');
      throw e;
    });
  };
  T.renderPage = function (pdf, n, scale) {
    return pdf.getPage(n).then(function (page) {
      var vp = page.getViewport({ scale: scale || 1 });
      var canvas = h('canvas'); canvas.width = Math.ceil(vp.width); canvas.height = Math.ceil(vp.height);
      var ctx = canvas.getContext('2d');
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
      // 'print' intent renders without waiting for animation frames, so it keeps going in a background tab
      return page.render({ canvasContext: ctx, viewport: vp, intent: 'print' }).promise.then(function () { return canvas; });
    });
  };
  T.canvasBlob = function (canvas, type, quality) {
    return new Promise(function (ok) { canvas.toBlob(ok, type || 'image/png', quality); });
  };
  // "1-3, 5, 8-" → [1,2,3,5,8,...,max]
  T.parseRanges = function (text, max) {
    var out = [];
    String(text || '').split(/[,;]+/).forEach(function (part) {
      var m = part.trim().match(/^(\d*)\s*-\s*(\d*)$/), a, b;
      if (m) { a = m[1] ? +m[1] : 1; b = m[2] ? +m[2] : max; }
      else if (/^\d+$/.test(part.trim())) { a = b = +part.trim(); }
      else return;
      for (var i = Math.max(1, a); i <= Math.min(max, b); i++) if (out.indexOf(i) < 0) out.push(i);
    });
    return out;
  };

  /* ---------- loading and mounting ---------- */
  var registry = {};
  T.register = function (id, setup) {
    registry[id] = setup;
    $all('[data-gco-tool="' + id + '"]').forEach(mount);
  };
  function $all(sel) { return Array.prototype.slice.call(doc.querySelectorAll(sel)); }
  function mount(page) {
    if (page.__mounted) return;
    page.__mounted = true;
    var id = page.getAttribute('data-gco-tool');
    var spot = page.querySelector('.gco-tool-mount') || page.insertBefore(h('div', { 'class': 'gco-tool-mount' }), page.firstChild);
    spot.innerHTML = '';
    if (id !== 'hub') { toolbar(page, spot, id); T.used(id); }
    try { registry[id](spot, T, page); } catch (e) {
      spot.appendChild(h('p', { 'class': 'tstatus is-error', text: 'This tool could not start: ' + e.message }));
      if (window.console) console.error(e);
    }
    T.ready.then(function () {
    var info = T.find(id);
    if (info && !C.isApp) {
      // an ad between the tool and the guide below it (never next to the tool's buttons)
      if (C.adSlot) { var ad = C.adSlot('in-article', (C.ads || {}).inArticle); if (ad) spot.parentNode.insertBefore(ad, spot.nextSibling); }
      related(page, info);
      structured(info);
    }
    });
  }
  // above every tool: favourite, and install just this tool as an app
  function toolbar(page, spot, id) {
    if (page.querySelector('.tbar') || doc.documentElement.classList.contains('is-embed') || C.only) return;
    var fav = T.isFav(id);
    var star = h('button', { type: 'button', 'class': 'tbtn tbtn-sm tbar-fav', 'data-id': id, 'aria-pressed': String(fav), onclick: function () { T.toggleFav(id); } },
      [h('span', { 'aria-hidden': 'true', text: '★' }), h('span', { text: fav ? ' Favourite' : ' Add to favourites' })]);
    var kids = [star];
    var appBase = C.isApp ? location.origin + '/' : C.appUrl ? C.appUrl.replace(/\/?$/, '/') : '';
    if (appBase) kids.push(h('a', { 'class': 'tbtn tbtn-sm', href: appBase + 't/' + id + '/', target: C.isApp ? null : '_blank', rel: 'noopener',
      title: 'Opens this tool on its own, ready to install on your phone or computer' }, [h('span', { 'aria-hidden': 'true', text: '⬇' }), ' Install as app']));
    spot.parentNode.insertBefore(h('div', { 'class': 'tbar' }, kids), spot);
  }
  function related(page, info) {
    var same = T.list.filter(function (t) { return t.id !== info.id && t.cat === info.cat; });
    var other = T.list.filter(function (t) { return t.id !== info.id && t.cat !== info.cat; });
    var picks = same.concat(other).slice(0, 6);
    page.appendChild(h('section', { 'class': 'trelated' }, [
      h('h2', { text: 'More ' + T.cat(info.cat).name + ' tools and more' }),
      h('div', { 'class': 'thub-grid' }, picks.map(card)),
      h('p', { 'class': 'trelated-all' }, [h('a', { href: '/', text: 'See all ' + T.list.length + ' tools →' })])]));
  }
  function card(t) {
    var c = T.cat(t.cat), fav = T.isFav(t.id);
    var star = h('button', { type: 'button', 'class': 'thub-fav', 'aria-pressed': String(fav), title: fav ? 'Remove from favourites' : 'Add to favourites',
      'aria-label': (fav ? 'Remove ' : 'Add ') + t.name + (fav ? ' from' : ' to') + ' favourites', text: fav ? '★' : '☆',
      onclick: function (e) { e.preventDefault(); e.stopPropagation(); T.toggleFav(t.id); } });
    return h('div', { 'class': 'thub-cell', 'data-id': t.id }, [h('a', { 'class': 'thub-card', href: t.path, 'data-tool-link': t.id, 'data-cat': t.cat, style: '--cc:' + c.color }, [
      h('span', { 'class': 'thub-ic', 'aria-hidden': 'true', text: t.icon }),
      h('span', {}, [h('b', {}, [t.name, t.isNew ? h('em', { 'class': 'thub-new', text: 'NEW' }) : null]), h('small', { text: t.desc })])]), star]);
  }
  /* ---------- favourites, recently used and popular (favourites and usage stay on this device) ---------- */
  T.favs = function () { var f = T.store.get('favs', []); return Array.isArray(f) ? f : []; };
  T.isFav = function (id) { return T.favs().indexOf(id) >= 0; };
  T.toggleFav = function (id) {
    var f = T.favs(), i = f.indexOf(id);
    if (i >= 0) f.splice(i, 1); else f.unshift(id);
    T.store.set('favs', f.slice(0, 200));
    // every star for this tool on the page follows
    $all('.thub-cell[data-id="' + id + '"] .thub-fav, .tbar-fav[data-id="' + id + '"]').forEach(function (b) {
      var on = i < 0; b.setAttribute('aria-pressed', String(on));
      if (b.classList.contains('thub-fav')) { b.textContent = on ? '★' : '☆'; b.title = on ? 'Remove from favourites' : 'Add to favourites'; }
      else b.lastChild.textContent = on ? ' Favourite' : ' Add to favourites';
    });
    doc.dispatchEvent(new CustomEvent('gco-favs'));
    return i < 0;
  };
  T.used = function (id) {
    var u = T.store.get('use', {}), r = u[id] || [0, 0];
    u[id] = [r[0] + 1, Date.now()];
    var ids = Object.keys(u);
    if (ids.length > 150) ids.sort(function (a, b) { return u[a][1] - u[b][1]; }).slice(0, ids.length - 150).forEach(function (k) { delete u[k]; });
    T.store.set('use', u);
  };
  T.recent = function (n) {
    var u = T.store.get('use', {});
    return Object.keys(u).sort(function (a, b) { return u[b][1] - u[a][1]; }).map(T.find).filter(Boolean).slice(0, n || 8);
  };
  // the most-visited tools across the site: Blogger's Popular Posts gadget (#gco-popular), topped up with everyday favourites
  var STARTER = ['image-compress', 'pdf-merge', 'emi', 'qr', 'invoice', 'percentage', 'age', 'gst', 'scientific', 'word-count', 'money-manager', 'income-tax-in'];
  T.popular = function (n) {
    var out = [];
    function add(t) { if (t && out.indexOf(t) < 0) out.push(t); }
    $all('#gco-popular a[href]').forEach(function (a) {
      // by the post's address, or by its title when Blogger gave the post a different address
      var m = a.getAttribute('href').match(/\/([a-z0-9-]+)\.html(?:$|[?#])/), title = a.textContent.trim();
      add(T.list.filter(function (x) { return (m && x.slug === m[1]) || x.title === title || x.name === title; })[0]);
    });
    STARTER.forEach(function (id) { add(T.find(id)); });
    return out.slice(0, n || 8);
  };
  T.toolCard = card;
  function structured(info) {
    var s = h('script', { type: 'application/ld+json' });
    s.textContent = JSON.stringify({ '@context': 'https://schema.org', '@type': 'WebApplication', name: info.name + ' — Infinity by GroupChatOn',
      url: location.origin + location.pathname, applicationCategory: 'UtilitiesApplication', operatingSystem: 'Any (runs in your browser)',
      description: info.desc, offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' } });
    doc.head.appendChild(s);
  }

  /* the tool hub (home page and category pages).
     Home: your favourites, recently used, popular, then each category with its most-used tools and "See all".
     Searching or picking a category shows a grid, drawn 48 cards at a time so a phone never builds hundreds at once. */
  T.register('hub', function (spot) {
    T.ready.then(function () {
      var label = (location.pathname.match(/^\/search\/label\/([^/?#]+)/) || [])[1];
      label = label ? decodeURIComponent(label).replace(/\+/g, ' ') : '';
      var cat = (T.cats.filter(function (c) { return c.label === label; })[0] || {}).id || 'all';
      var q = h('input', { type: 'search', 'class': 'thub-search', placeholder: 'Search ' + T.list.length + ' free tools…', 'aria-label': 'Search tools', enterkeyhint: 'search' });
      var startQ = new URLSearchParams(location.search).get('q');
      if (startQ && !label) q.value = startQ;
      var chips = h('div', { 'class': 'thub-cats', role: 'tablist', 'aria-label': 'Categories' });
      var body = h('div', { 'class': 'thub-body' });
      var count = h('p', { 'class': 'thub-count', role: 'status', 'aria-live': 'polite' });
      var PAGE = 48, limit = PAGE, timer = 0, popIds = {};
      function chip(id, name, icon, color, n) {
        return h('button', { type: 'button', role: 'tab', 'class': 'thub-chip', 'data-cat': id, style: color ? '--cc:' + color : null,
          'aria-selected': String(cat === id), onclick: function () { pickCat(id); } }, [h('span', { 'aria-hidden': 'true', text: icon }), name, h('em', { text: String(n) })]);
      }
      function pickCat(id) { cat = id; limit = PAGE; draw(); if (id !== 'all' && spot.scrollIntoView) spot.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
      function drawChips() {
        chips.innerHTML = '';
        chips.appendChild(chip('all', 'All', '∞', '', T.list.length));
        var favN = T.favs().filter(T.find).length;
        if (favN) chips.appendChild(chip('fav', 'Favourites', '★', '#FBBF24', favN));
        T.cats.forEach(function (c) {
          var n = T.list.filter(function (t) { return t.cat === c.id; }).length;
          if (n) chips.appendChild(chip(c.id, c.name, c.icon, c.color, n));
        });
      }
      function section(icon, title, tools, more, cls) {
        if (!tools.length) return null;
        return h('section', { 'class': 'thub-sec' + (cls ? ' ' + cls : '') }, [
          h('div', { 'class': 'thub-sec-head' }, [h('h2', {}, [h('span', { 'aria-hidden': 'true', text: icon }), ' ' + title]),
            more ? h('button', { type: 'button', 'class': 'thub-more', onclick: more[1], text: more[0] }) : null]),
          h('div', { 'class': 'thub-grid' }, tools.map(card))]);
      }
      function home() {
        var favs = T.favs().map(T.find).filter(Boolean), recent = T.recent(3), pop = T.popular(6);
        pop.forEach(function (t, i) { popIds[t.id] = i + 1; });
        [section('★', 'Your favourites', favs.slice(0, 6), favs.length > 6 ? ['See all ' + favs.length + ' →', function () { pickCat('fav'); }] : null, 'is-fav'),
          section('🕘', 'Recently used', recent, null, 'is-recent'),
          section('🔥', 'Popular right now', pop, null, 'is-pop')].forEach(function (x) { if (x) body.appendChild(x); });
        if (!favs.length) body.appendChild(h('p', { 'class': 'thub-tip', text: 'Tip: tap ☆ on any tool to keep it at the top of this page.' }));
        T.cats.forEach(function (c) {
          var all = T.list.filter(function (t) { return t.cat === c.id; });
          if (!all.length) return;
          // the tools people use most lead each row
          var ranked = all.slice().sort(function (a, b) { return (popIds[a.id] || 99) - (popIds[b.id] || 99); });
          body.appendChild(section(c.icon, c.name, ranked.slice(0, 6), all.length > 6 ? ['See all ' + all.length + ' →', function () { pickCat(c.id); }] : null, 'is-cat'));
        });
        count.textContent = '';
      }
      function draw() {
        var s = q.value.trim().toLowerCase();
        drawChips();
        body.innerHTML = '';
        if (!s && cat === 'all') return home();
        var words = s.split(/\s+/).filter(Boolean), favs = T.favs();
        var shown = T.list.filter(function (t) {
          if (cat === 'fav' ? favs.indexOf(t.id) < 0 : cat !== 'all' && t.cat !== cat) return false;
          if (!words.length) return true;
          var hay = (t.name + ' ' + t.desc + ' ' + T.cat(t.cat).name + ' ' + (t.keywords || []).join(' ')).toLowerCase();
          return words.every(function (w) { return hay.indexOf(w) >= 0; });
        });
        if (words.length) shown.sort(function (a, b) { var x = a.name.toLowerCase().indexOf(words[0]) >= 0, y = b.name.toLowerCase().indexOf(words[0]) >= 0; return x === y ? 0 : x ? -1 : 1; });
        var grid = h('div', { 'class': 'thub-grid' });
        shown.slice(0, limit).forEach(function (t) { grid.appendChild(card(t)); });
        body.appendChild(grid);
        if (shown.length > limit) body.appendChild(h('p', { 'class': 'thub-pager' }, [T.button('Show ' + Math.min(PAGE, shown.length - limit) + ' more (' + (shown.length - limit) + ' left)', { onclick: function () { limit += PAGE; draw(); } })]));
        count.textContent = shown.length + (shown.length === 1 ? ' tool' : ' tools') + (cat !== 'all' ? ' in ' + (cat === 'fav' ? 'Favourites' : T.cat(cat).name) : '');
        if (!shown.length) body.appendChild(h('p', { 'class': 'tstatus', html: cat === 'fav' && !s ? 'No favourites yet: tap ☆ on any tool card.' : 'No tool matches “' + h('b', { text: q.value }).outerHTML + '” yet. <a href="/p/ask-for-a-tool.html" data-feedback="tool">Ask for it</a> and we’ll build it.' }));
      }
      q.addEventListener('input', function () { clearTimeout(timer); timer = setTimeout(function () { limit = PAGE; draw(); }, 120); });
      doc.addEventListener('gco-favs', function () { clearTimeout(timer); timer = setTimeout(draw, 600); });
      spot.appendChild(h('div', { 'class': 'thub' }, [q, chips, count, body]));
      draw();
    });
  });

  // load the stylesheet, then each tool's script
  if (!doc.getElementById('gco-tools-css')) doc.head.appendChild(h('link', { id: 'gco-tools-css', rel: 'stylesheet', href: BASE + 'assets/tools/tools.css?v=' + VERSION }));
  function inline(page, id) {
    if (registry[id]) return mount(page);
    if (!/^[a-z0-9-]+$/.test(id)) return;
    showLoading(page, id);
    T.loadScript(BASE + 'assets/tools/' + id + '.js?v=' + VERSION).catch(function (e) {
      var spot = page.querySelector('.gco-tool-mount');
      if (spot) { spot.innerHTML = ''; spot.appendChild(h('p', { 'class': 'tstatus is-error' }, [e.message + ' ', T.button('Try again', { small: true, onclick: function () { location.reload(); } })])); }
    });
  }
  // every post shows a loading panel until its tool starts; after 10 s it offers a reload in case the connection stalled
  function showLoading(page, id) {
    var spot = page.querySelector('.gco-tool-mount');
    if (!spot || id === 'hub') return;
    var box = spot.querySelector('.tload');
    if (!box) { box = h('div', { 'class': 'tload', role: 'status', 'aria-live': 'polite' }, [h('span', { 'class': 'tload-bar' }, [h('i')]), h('code', { text: 'loading tool' })]); spot.appendChild(box); }
    setTimeout(function () {
      if (!box.isConnected || box.querySelector('.tload-slow')) return;
      box.appendChild(h('p', { 'class': 'tload-slow' }, ['Taking longer than usual: your connection may be slow. ', T.button('Reload', { small: true, onclick: function () { location.reload(); } })]));
    }, 10000);
  }
  /* A tool that keeps records (money manager, khata, invoices…) is shown from the Infinity app (C.appUrl) in a frame.
     app.groupchaton.com and this blog are the same site to the browser, so the frame and the installed app share one set of records.
     If the app cannot be reached, the tool runs here instead. */
  function fromApp(page, info) {
    page.__mounted = true;
    var spot = page.querySelector('.gco-tool-mount') || page.insertBefore(h('div', { 'class': 'gco-tool-mount' }), page.firstChild);
    var src = C.appUrl.replace(/\/?$/, '/') + '?embed=1#' + info.id;
    var frame = h('iframe', { src: src, title: info.name, 'class': 'tapp-frame', loading: 'eager', allow: 'clipboard-write; camera; microphone' });
    var ready = false;
    function onMsg(e) {
      if (e.source !== frame.contentWindow || !e.data || !e.data.gcoApp) return;
      if (e.data.gcoApp === 'ready') ready = true;
      if (e.data.gcoApp === 'height') frame.style.height = Math.max(400, Math.min(6000, +e.data.h || 0)) + 'px';
    }
    window.addEventListener('message', onMsg);
    spot.innerHTML = '';
    toolbar(page, spot, info.id); T.used(info.id);
    spot.appendChild(frame);
    spot.appendChild(h('p', { 'class': 'tapp-note' }, ['🔒 Your records are saved only on this device. ',
      h('a', { href: C.appUrl.replace(/\/?$/, '/') + '#' + info.id, target: '_blank', rel: 'noopener', text: 'Open it as an app (works offline) →' })]));
    setTimeout(function () {
      if (ready) return;
      window.removeEventListener('message', onMsg);
      page.__mounted = false; spot.innerHTML = '';
      inline(page, info.id);
    }, 12000);
    if (C.adSlot) { var ad = C.adSlot('in-article', (C.ads || {}).inArticle); if (ad) spot.parentNode.insertBefore(ad, spot.nextSibling); }
    related(page, info);
    structured(info);
  }
  T.scan = function () { $all('[data-gco-tool]').forEach(function (page) {
    var id = page.getAttribute('data-gco-tool');
    if (page.__mounted || page.__waiting) return;
    if (!C.appUrl || C.isApp || id === 'hub') return inline(page, id);
    page.__waiting = true;
    T.ready.then(function () {
      page.__waiting = false;
      var info = T.find(id);
      if (info && info.app) fromApp(page, info); else inline(page, id);
    });
  }); };
  T.scan();
})();
