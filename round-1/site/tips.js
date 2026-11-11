/*! Construworth interaction tips.
 *  Contextual coach marks that point at the interactive parts of a page the first time each one scrolls into view.
 *  Shown on every visit (nothing is stored). Never blocks the page: a tip closes when the visitor uses the element,
 *  presses "Got it", or presses Esc; "Hide tips" turns them all off until the next visit.
 *  Also adds permanent cues: pulsing map pins and a "Drag to turn" badge on 3D models.
 */
(function () {
  'use strict';
  var RM = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var path = location.pathname.replace(/^\/embed(?=\/)/, '').replace(/index\.html$/, '');
  if (!/\/$/.test(path)) path += '/';

  function txt(el) { return (el.getAttribute('aria-label') || el.innerText || '').replace(/\s+/g, ' ').trim(); }
  function visible(el) { var r = el.getBoundingClientRect(); var s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none'; }
  function pick(sel, re) {
    var list = document.querySelectorAll(sel);
    for (var i = 0; i < list.length; i++) if (visible(list[i]) && (!re || re.test(txt(list[i])))) return list[i];
    return null;
  }
  function pickAll(sel, re) { return Array.prototype.filter.call(document.querySelectorAll(sel), function (e) { return visible(e) && (!re || re.test(txt(e))); }); }

  var STEPS = {
    '/': [
      { id: 'bill', sel: 'button', re: /^[A-Z] .+\+/, title: 'Open a line of the bill', body: 'Tap any element to see what was measured and how it was priced.', g: 'tap', also: function () { return pickAll('button', /^[A-Z] .+[+−]/); } },
      { id: 'stages', sel: 'button', re: /^0[1-6]$/, group: true, title: 'Walk through the six stages', body: 'Tap a number, or use Next stage, to see what we do at each step of a project.', g: 'tap', also: function () { return pickAll('button', /^(0[1-6]|← Previous|Next stage →)$/); } },
      { id: 'strip', sel: 'a', re: /^Kings Tower/, title: 'Swipe for more buildings', body: 'This row scrolls sideways. Swipe it to see other projects we have costed.', g: 'swipe', scroller: true }
    ],
    '/projects/': [
      { id: 'filters', sel: 'button', re: /^Residential \d+$/, group: true, title: 'Filter the list', body: 'Tap a sector or a status to narrow the projects down. Tap All to reset.', g: 'tap', also: function () { return pickAll('[role=group] button'); } },
      { id: 'map', sel: 'button', re: /^Lagos, \d+ projects?$/, title: 'Pick a city on the map', body: 'Tap a pin to show only the projects in that city.', g: 'tap', also: function () { return pickAll('button', /, \d+ projects?$/); } }
    ],
    '/projects/j77a/': [
      { id: 'model', sel: 'canvas', title: 'Turn the model', body: 'Drag to look around the house. Use + and − to zoom in and out.', g: 'drag', inside: true },
      { id: 'build', sel: 'button', re: /^Play the build$/, title: 'Watch it go up', body: 'Press play, or tap a stage, to build the house one Bill of Quantities stage at a time.', g: 'tap', also: function () { return pickAll('button', /^(0[1-8] .+|Play the build|Pause|Previous stage|Next stage)$/); } },
      { id: 'floors', after: 'model', sel: 'button', re: /^Floor by floor$/, title: 'Look inside each floor', body: 'Switch to Floor by floor, then pick a level to cut through it.', g: 'tap' },
      { id: 'gallery-swipe', g: 'swipe', scroller: true, title: 'Swipe through the renderings', body: 'This row scrolls sideways. Swipe to see every view of the house.',
        find: function () { var im = pickAll('img').filter(function (i) { return !i.closest('button,a') && scroller(i); }); return im[0] || null; } },
      { id: 'gallery', sel: 'button[aria-label^="Enlarge"]', title: 'Tap a picture to enlarge it', body: 'Open any rendering full size, then use the arrows to move through them.', g: 'tap', also: function () { return pickAll('button[aria-label^="Enlarge"]'); } }
    ]
  };
  var steps = STEPS[path];
  if (!steps) return;

  // ---------- styles ----------
  var css = '' +
    '.cwt-ring{position:absolute;z-index:2147483000;pointer-events:none;border:2px solid #E8731C;border-radius:4px;box-shadow:0 0 0 0 rgba(232,115,28,.55);animation:cwt-pulse 1.8s ease-out infinite}' +
    '@keyframes cwt-pulse{0%{box-shadow:0 0 0 0 rgba(232,115,28,.55)}70%{box-shadow:0 0 0 12px rgba(232,115,28,0)}100%{box-shadow:0 0 0 0 rgba(232,115,28,0)}}' +
    '.cwt-card{position:absolute;z-index:2147483001;width:min(320px,calc(100vw - 24px));box-sizing:border-box;background:#1B1C1E;color:#F3F2EE;border:1px solid #3A3B3E;box-shadow:0 12px 32px rgba(0,0,0,.28);padding:16px 16px 14px;font:15px/1.5 "IBM Plex Sans",system-ui,sans-serif;opacity:0;transform:translateY(6px);transition:opacity .2s,transform .2s}' +
    '.cwt-card.in{opacity:1;transform:none}' +
    '.cwt-card .cwt-top{display:flex;align-items:center;gap:12px}' +
    '.cwt-card .cwt-k{font:500 11px/1 "IBM Plex Mono",ui-monospace,monospace;letter-spacing:.12em;color:#F0A066;text-transform:uppercase}' +
    '.cwt-card h3{margin:4px 0 0;font:700 22px/1.05 "Archivo","Arial Narrow",sans-serif;font-stretch:78%;letter-spacing:-.01em}' +
    '.cwt-card p{margin:8px 0 0;color:#D6D3CB;font-size:14px}' +
    '.cwt-card .cwt-act{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-top:14px}' +
    '.cwt-card button{font:inherit;font-size:14px;cursor:pointer;min-height:44px;padding:0 16px}' +
    '.cwt-card .cwt-skip{background:transparent;border:0;color:#BDBAB2;text-decoration:underline;padding:0 4px}' +
    '.cwt-card .cwt-ok{background:#E8731C;border:0;color:#1B1C1E;font-weight:600}' +
    '.cwt-card button:focus-visible{outline:2px solid #F0A066;outline-offset:2px}' +
    '.cwt-arrow{position:absolute;width:12px;height:12px;background:#1B1C1E;border:1px solid #3A3B3E;transform:rotate(45deg)}' +
    '.cwt-g{flex:0 0 44px;height:44px;border:1px solid #3A3B3E;display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden}' +
    '.cwt-g svg{width:26px;height:26px}' +
    '.cwt-g .h{transform-origin:50% 90%}' +
    '.cwt-tap .h{animation:cwt-tap 1.6s ease-in-out infinite}.cwt-tap .rp{animation:cwt-rp 1.6s ease-out infinite;transform-origin:11px 6px}' +
    '@keyframes cwt-tap{0%,100%{transform:translateY(0)}40%{transform:translateY(2px) scale(.94)}}' +
    '@keyframes cwt-rp{0%,30%{opacity:0;transform:scale(.4)}45%{opacity:1}100%{opacity:0;transform:scale(1.6)}}' +
    '.cwt-drag .h{animation:cwt-drag 2s ease-in-out infinite}@keyframes cwt-drag{0%,100%{transform:translateX(-5px)}50%{transform:translateX(5px)}}' +
    '.cwt-swipe .h{animation:cwt-swipe 1.6s ease-in-out infinite}@keyframes cwt-swipe{0%{transform:translateX(6px);opacity:0}20%{opacity:1}80%{opacity:1}100%{transform:translateX(-8px);opacity:0}}' +
    '.cwt-pin{animation:cwt-pin 2.2s ease-out infinite;border-radius:50%}' +
    '@keyframes cwt-pin{0%{box-shadow:0 0 0 0 rgba(232,115,28,.6)}70%{box-shadow:0 0 0 14px rgba(232,115,28,0)}100%{box-shadow:0 0 0 0 rgba(232,115,28,0)}}' +
    '.cwt-chip{position:absolute;right:12px;bottom:12px;z-index:5;display:flex;align-items:center;gap:8px;background:rgba(18,19,20,.86);color:#EDEBE6;border:1px solid #3A3B3E;padding:6px 10px 6px 8px;font:500 11px/1 "IBM Plex Mono",ui-monospace,monospace;letter-spacing:.08em;text-transform:uppercase;pointer-events:none;transition:opacity .4s}' +
    '.cwt-chip svg{width:20px;height:20px}.cwt-chip .h{animation:cwt-drag 2s ease-in-out infinite}' +
    '.cwt-chip.gone{opacity:0}' +
    '.cwt-edge::after{content:"";position:absolute;top:0;right:0;bottom:0;width:36px;background:linear-gradient(90deg,rgba(243,242,238,0),rgba(243,242,238,.95));pointer-events:none}' +
    '@media (prefers-reduced-motion:reduce){.cwt-ring,.cwt-pin,.cwt-g .h,.cwt-g .rp,.cwt-chip .h{animation:none!important}.cwt-card{transition:none}}';
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  var HAND = '<path class="h" d="M9.5 21c-1.6-1.4-3.6-3.7-4.7-5.4-.6-.9-.3-2 .6-2.4.7-.3 1.4-.1 1.9.5l1.2 1.4V6.4c0-.9.7-1.6 1.6-1.6s1.6.7 1.6 1.6v4.8c0-.9.7-1.5 1.6-1.5s1.6.7 1.6 1.5v.6c0-.8.7-1.4 1.5-1.4s1.5.6 1.5 1.4v.9c0-.7.6-1.3 1.4-1.3s1.4.6 1.4 1.4V17c0 2.3-1.7 4-4 4H9.5z" fill="#F3F2EE" stroke="#1B1C1E" stroke-width=".8"/>';
  var ICON = {
    tap: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle class="rp" cx="11" cy="6" r="4" fill="none" stroke="#E8731C" stroke-width="1.4"/>' + HAND + '</svg>',
    drag: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 5h5M2 5l2-2M2 5l2 2M22 5h-5M22 5l-2-2M22 5l-2 2" stroke="#E8731C" stroke-width="1.4" fill="none"/>' + HAND + '</svg>',
    swipe: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 4H6M6 4l3-2.5M6 4l3 2.5" stroke="#E8731C" stroke-width="1.4" fill="none"/>' + HAND + '</svg>'
  };

  // ---------- state ----------
  var off = false, cur = null, ring = null, card = null, arrow = null, done = {}, seen = {}, raf = 0, io = null;
  var live = [], byId = {};   // steps whose targets exist at this width
  var framed = window.parent !== window, VP = null;
  // Visible slice of this document: the host page tells a framed copy which part is on screen.
  function view() {
    if (framed && VP) return { top: VP.top, h: VP.h };
    return { top: window.pageYOffset, h: window.innerHeight };
  }
  window.addEventListener('message', function (e) { var d = e.data; if (d && d.type === 'construworth:viewport') { VP = { top: Math.max(0, d.top | 0), h: Math.max(200, d.height | 0) }; } });

  function hide() {
    if (card) { var c = card; c.classList.remove('in'); setTimeout(function () { c.remove(); }, 200); }
    if (ring) ring.remove();
    card = ring = arrow = null; cur = null; cancelAnimationFrame(raf);
  }
  function finish(s) { if (!s) return; done[s.id] = true; if (cur === s) hide(); setTimeout(next, 450); }
  function hideAll() { off = true; hide(); if (io) io.disconnect(); }

  function place() {
    if (!cur || !card) return;
    var t = cur.el, r = t.getBoundingClientRect(), sx = window.pageXOffset, sy = window.pageYOffset, V = view();
    if (!visible(t)) { hide(); return; }
    var pad = cur.inside ? -1 : 5;
    var top = r.top + sy, bot = r.bottom + sy;         // document coordinates
    ring.style.left = (r.left + sx - pad) + 'px'; ring.style.top = (top - pad) + 'px';
    ring.style.width = (r.width + pad * 2) + 'px'; ring.style.height = (r.height + pad * 2) + 'px';
    var vw = document.documentElement.clientWidth, cw = card.offsetWidth, ch = card.offsetHeight, x, y, below = true;
    x = r.left + r.width / 2 - cw / 2;
    if (cur.inside) {
      y = Math.max(top, V.top) + Math.min(r.height * 0.18, 90); arrow.style.display = 'none';
    } else {
      var spaceBelow = V.top + V.h - bot, spaceAbove = top - V.top;
      below = spaceBelow > ch + 18 || spaceAbove < ch + 18 && spaceBelow >= spaceAbove;
      y = below ? bot + 14 : top - ch - 14;
      arrow.style.display = 'block';
    }
    x = Math.max(12, Math.min(vw - cw - 12, x));
    card.style.left = (x + sx) + 'px'; card.style.top = y + 'px';
    if (!cur.inside) {
      var ax = Math.max(14, Math.min(cw - 26, r.left + r.width / 2 - x - 6));
      arrow.style.left = ax + 'px';
      arrow.style.top = below ? '-7px' : (ch - 6) + 'px';
      arrow.style.borderRight = below ? '0' : ''; arrow.style.borderBottom = below ? '0' : '';
      arrow.style.borderLeft = below ? '' : '0'; arrow.style.borderTop = below ? '' : '0';
    }
    raf = requestAnimationFrame(place);
  }

  function show(s) {
    if (off || cur || done[s.id]) return;
    cur = s;
    var n = live.indexOf(s) + 1;
    ring = document.createElement('div'); ring.className = 'cwt-ring'; if (s.inside || RM) ring.style.animation = 'none';
    card = document.createElement('div'); card.className = 'cwt-card'; card.setAttribute('role', 'dialog'); card.setAttribute('aria-live', 'polite'); card.setAttribute('aria-label', 'Tip: ' + s.title);
    card.innerHTML = '<div class="cwt-arrow"></div><div class="cwt-top"><span class="cwt-g cwt-' + s.g + '">' + ICON[s.g] + '</span><div><div class="cwt-k">' + (live.length > 1 ? 'Tip ' + n + ' of ' + live.length : 'Tip') + '</div><h3>' + s.title + '</h3></div></div>' +
      '<p>' + s.body + '</p><div class="cwt-act"><button type="button" class="cwt-skip">Hide tips</button><button type="button" class="cwt-ok">Got it</button></div>';
    arrow = card.querySelector('.cwt-arrow');
    document.body.appendChild(ring); document.body.appendChild(card);
    card.querySelector('.cwt-ok').onclick = function () { finish(s); };
    card.querySelector('.cwt-skip').onclick = hideAll;
    place();
    requestAnimationFrame(function () { if (card) card.classList.add('in'); });
  }

  function inView(el) {
    var r = el.getBoundingClientRect(), V = view(), top = r.top + window.pageYOffset, bot = r.bottom + window.pageYOffset;
    var vis = Math.min(bot, V.top + V.h) - Math.max(top, V.top);
    return vis > Math.min(r.height, V.h) * 0.6;
  }
  function next() {
    if (off || cur) return;
    for (var i = 0; i < live.length; i++) { var s = live[i]; if (!done[s.id] && !(s.after && s.after in byId && !done[s.after]) && inView(s.el)) { show(s); return; } }
  }

  // ---------- permanent cues ----------
  function cues() {
    // map pins pulse until a city is picked
    var pins = pickAll('button', /, \d+ projects?$/);
    pins.forEach(function (p) { var dot = p.querySelector('span,div') || p; dot.classList.add('cwt-pin'); });
    if (pins.length) document.addEventListener('click', function f(e) { if (e.target.closest && e.target.closest('button') && /, \d+ projects?$/.test(txt(e.target.closest('button')))) { pins.forEach(function (p) { (p.querySelector('span,div') || p).classList.remove('cwt-pin'); }); document.removeEventListener('click', f, true); } }, true);
    // drag badge on 3D canvases
    pickAll('canvas').forEach(function (c) {
      var host = c.parentElement; if (!host || host.querySelector('.cwt-chip')) return;
      if (getComputedStyle(host).position === 'static') host.style.position = 'relative';
      var chip = document.createElement('div'); chip.className = 'cwt-chip';
      chip.innerHTML = ICON.drag.replace('viewBox', 'class="" viewBox') + '<span>Drag to turn</span>';
      host.appendChild(chip);
      c.addEventListener('pointerdown', function () { chip.classList.add('gone'); setTimeout(function () { chip.remove(); }, 500); }, { once: true });
    });
    // sideways strips: fade the edge so it reads as scrollable
    live.forEach(function (s) { if (s.scroller) { var sc = scroller(s.btn); if (sc && sc.parentElement) { var pe = sc.parentElement; if (getComputedStyle(pe).position === 'static') pe.style.position = 'relative'; pe.classList.add('cwt-edge'); } } });
  }
  function scroller(el) { for (var p = el.parentElement; p && p !== document.body; p = p.parentElement) { var s = getComputedStyle(p); if (/(auto|scroll)/.test(s.overflowX) && p.scrollWidth > p.clientWidth + 4) return p; } return null; }

  // ---------- boot ----------
  function boot() {
    live = [];
    steps.forEach(function (s) {
      var el = s.find ? s.find() : pick(s.sel, s.re);
      if (!el) return;
      if (s.scroller && !scroller(el)) return;
      s.btn = el; s.el = s.group && el.parentElement ? el.parentElement : el; live.push(s);
    });
    if (!live.length) return;
    byId = {}; live.forEach(function (s) { byId[s.id] = s; });
    live.sort(function (a, b) { return a.el.compareDocumentPosition(b.el) & 4 ? -1 : 1; });
    live.slice().forEach(function (s) { if (s.after && byId[s.after]) { live.splice(live.indexOf(s), 1); live.splice(live.indexOf(byId[s.after]) + 1, 0, s); } });
    cues();
    live.forEach(function (s) {
      var targets = (s.also ? s.also() : []).concat([s.btn]);
      var ev = s.g === 'drag' ? 'pointerdown' : 'click';
      targets.forEach(function (t) { t.addEventListener(ev, function () { finish(s); }, { passive: true }); });
      if (s.scroller) { var sc = scroller(s.btn); if (sc) sc.addEventListener('scroll', function () { finish(s); }, { passive: true, once: true }); }
    });
    io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { var s = live.filter(function (x) { return x.el === e.target; })[0]; if (s && e.intersectionRatio >= 0.6) seen[s.id] = true; });
      next();
    }, { threshold: [0, 0.6, 1] });
    live.forEach(function (s) { io.observe(s.el); });
    function onScroll() {
      if (cur) { var r = cur.el.getBoundingClientRect(), V = view(), t = r.top + window.pageYOffset; if (t + r.height < V.top || t > V.top + V.h) finish(cur); return; }
      next();
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('message', function (e) { if (e.data && e.data.type === 'construworth:viewport') setTimeout(onScroll, 30); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && cur) finish(cur); });
  }
  // wait for the page's components to render
  var tries = 0;
  (function wait() {
    tries++;
    var ready = steps.some(function (s) { return s.sel && pick(s.sel, s.re); });
    if (ready && tries > 2) { setTimeout(boot, 600); return; }
    if (tries < 60) setTimeout(wait, 250);
  })();
})();
