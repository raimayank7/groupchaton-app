/* Infinity App by GroupChatOn (app.groupchaton.com) — the installable, offline home for tools that keep records.
   One page: #<tool-id> opens a tool, no hash shows the home screen. ?embed=1 is the view shown inside infinity.groupchaton.com posts.
   Designed & Developed by Nivesh Sahayak (https://www.niveshsahayak.in/). All rights reserved: see LICENSE. */
(function () {
  'use strict';
  var T = window.GCOTools, h = T.h, app = document.getElementById('app');
  var embed = document.documentElement.classList.contains('is-embed');

  // ---- offline: the service worker keeps every file of the app on the device ----
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('sw.js').catch(function () {});
  }
  var off = document.getElementById('app-offline');
  function net() { if (off) off.textContent = navigator.onLine ? 'Online' : 'Offline: your tools still work'; }
  addEventListener('online', net); addEventListener('offline', net); net();

  // ---- install button (Chrome, Edge, Android); iPhone users get a hint instead ----
  var installBtn = document.getElementById('app-install'), deferred = null;
  addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); deferred = e; installBtn.hidden = false; });
  installBtn.addEventListener('click', function () {
    if (!deferred) return;
    deferred.prompt();
    deferred.userChoice.then(function () { deferred = null; installBtn.hidden = true; });
  });
  var standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  var ios = /iphone|ipad|ipod/i.test(navigator.userAgent);

  // ---- light / dark ----
  document.getElementById('app-theme').addEventListener('click', function () {
    var t = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', t);
    try { localStorage.setItem('gct-theme', t); } catch (e) {}
  });

  // ---- inside an infinity post: tell the page our height so the frame fits ----
  if (embed && window.parent !== window) {
    var post = function () { parent.postMessage({ gcoApp: 'height', h: document.documentElement.scrollHeight }, '*'); };
    if (window.ResizeObserver) new ResizeObserver(post).observe(document.body);
    addEventListener('load', post);
    parent.postMessage({ gcoApp: 'ready' }, '*');
  }

  function appTools() { return T.list.filter(function (t) { return t.app; }); }
  function home() {
    document.title = 'Infinity App by GroupChatOn';
    app.innerHTML = '';
    app.appendChild(h('section', { 'class': 'app-hero' }, [
      h('h1', {}, ['Your business and money toolkit, ', h('span', { 'class': 'app-grad', text: 'in your pocket.' })]),
      h('p', { text: 'Invoices, quotations, receipts, khata with statements and a money manager. Works offline once opened, and every record stays on this device.' }),
      standalone ? null : h('p', { 'class': 'app-hint', text: ios ? 'Install: tap Share, then “Add to Home Screen”.' : 'Install it from the button above, or your browser menu → “Install app”.' })]));
    var groups = {};
    appTools().forEach(function (t) { (groups[t.cat] = groups[t.cat] || []).push(t); });
    Object.keys(groups).forEach(function (c) {
      var cat = T.cat(c);
      app.appendChild(h('h2', { 'class': 'app-h2', text: cat.icon + ' ' + cat.name }));
      app.appendChild(h('div', { 'class': 'thub-grid' }, groups[c].map(function (t) {
        return h('a', { 'class': 'thub-card', href: '#' + t.id, style: '--cc:' + cat.color }, [h('span', { 'class': 'thub-ic', 'aria-hidden': 'true', text: t.icon }),
          h('span', {}, [h('b', { text: t.name }), h('small', { text: t.desc })])]);
      })));
    });
    app.appendChild(h('p', { 'class': 'app-more' }, [h('a', { href: window.GCO.infinity + '/', target: '_blank', rel: 'noopener', text: 'See all ' + T.list.length + ' free tools on Infinity →' })]));
  }
  function tool(id) {
    var t = T.find(id);
    if (!t) return home();
    document.title = t.name + ' · Infinity App';
    app.innerHTML = '';
    if (!embed) app.appendChild(h('nav', { 'class': 'app-crumb' }, [h('a', { href: '#', text: '← All toolkits' })]));
    if (!embed) app.appendChild(h('h1', { 'class': 'app-title', text: t.icon + ' ' + t.name }));
    app.appendChild(h('div', { 'class': 'gco-page', 'data-gco-tool': id }, [h('div', { 'class': 'gco-tool-mount' })]));
    T.scan();
    scrollTo(0, 0);
  }
  function route() { var id = location.hash.replace(/^#\/?/, ''); if (id) tool(id); else home(); }
  T.ready.then(function () { route(); addEventListener('hashchange', route); });
})();
