/* Родословное древо. Без библиотек; данные лежат в data/derevo.js (window.DEREVO). */
(function () {
  'use strict';
  var D = window.DEREVO;
  if (!D) { return; }
  var P = D.people, PAIRS = D.pairs, CLAIMS = D.claims, SRC = D.sources, ROOT = D.root;
  var W = 136, H = 144, G = 36, PITCH = H + 64, RGAP = 24, TOP = 52;
  var LEVEL = { doc: 'документ', fam: 'со слов семьи', unv: 'не проверено', hyp: 'гипотеза', no: 'опровергнуто' };
  var GEN = ['Наше поколение', 'Родители', 'Бабушки и дедушки', 'Прадеды', 'Прапрадеды'];
  var RINGS = '<svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16"><circle cx="6" cy="8" r="4"></circle><circle cx="10" cy="8" r="4"></circle></svg>';
  var UP = '<svg aria-hidden="true" width="12" height="12" viewBox="0 0 12 12"><path d="M2 8l4-4 4 4"></path></svg>';
  var DOWN = '<svg aria-hidden="true" width="12" height="12" viewBox="0 0 12 12"><path d="M2 4l4 4 4-4"></path></svg>';
  var CLOSE = '<svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16"><path d="M3 3l10 10M13 3L3 13"></path></svg>';
  var FULL = '<svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16"><path d="M3 10l5-5 5 5"></path></svg>';

  function $(id) { return document.getElementById(id); }
  var view = $('view'), stage = $('stage'), panel = $('panel'), gensEl = $('gens');
  var state = { hyp: false, open: new Set(), sel: null, chip: null, x: 0, y: 0, k: 1 };
  var lay = null, info = {};
  var DOCS = D.meta.docs !== false; // сайт можно собрать и без страниц с доводами

  // ---------- helpers ----------
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function plural(n, one, few, many) {
    var a = n % 10, b = n % 100;
    if (a === 1 && b !== 11) { return one; }
    if (a >= 2 && a <= 4 && (b < 12 || b > 14)) { return few; }
    return many;
  }
  function par(id, hyp) {
    var p = P[id].par;
    return p[(hyp === undefined ? state.hyp : hyp) && p.length > 1 ? 1 : 0];
  }
  function nameShort(id) { var n = P[id].n; return [n[0], n[1], n[2]].filter(Boolean).join(' '); }
  function nameFull(id) { var n = P[id].n; return nameShort(id) + (n[3] ? ', урожд. ' + n[3] : ''); }
  function initials(id) { var n = P[id].n; return (n[0] || '').charAt(0) + (n[2] || '').replace(/[()]/g, '').charAt(0); }
  function avatar(id) {
    var p = P[id];
    return '<span class="ava" aria-hidden="true">' + (p.ph ? '<img src="' + esc(p.ph) + '" alt="">' : esc(initials(id))) + '</span>';
  }
  function tag(l) { return l && LEVEL[l] ? '<span class="tag t-' + l + '">' + LEVEL[l] + '</span>' : ''; }
  function pairKey(a, b) {
    if (PAIRS[a + '+' + b]) { return a + '+' + b; }
    if (PAIRS[b + '+' + a]) { return b + '+' + a; }
    return null;
  }
  function pLink(id, text) { return '<a href="#' + id + '" data-p="' + id + '">' + esc(text || nameShort(id)) + '</a>'; }
  function docLink(page, id, text, cls) {
    if (!DOCS) { return cls ? '<span class="ref muted">' + esc(text) + '</span>' : ''; }
    return '<a' + (cls ? ' class="' + cls + '"' : '') + ' href="docs/' + page + '.html' + (id ? '#' + id.toLowerCase() : '') + '" target="_blank" rel="noopener">' + esc(text) + '</a>';
  }
  function rich(t) {
    return esc(t).replace(/([APC])-\d{4}/g, function (id, kind) {
      if (kind === 'A' && SRC[id]) { return '<a class="ref" href="' + (DOCS ? 'docs/istochniki.html#' + id.toLowerCase() : '#') + '" data-src="' + id + '">' + id + '</a>'; }
      if (kind === 'P' && P[id]) { return pLink(id); }
      if (kind === 'C') { return docLink('utverzhdeniya', id, id, 'ref'); }
      return id;
    });
  }

  // ---------- who is in the tree ----------
  function treeInfo(hyp) {
    var out = {}, queue = [ROOT];
    out[ROOT] = { g: 0, via: null, side: '' };
    while (queue.length) {
      var c = queue.shift(), a = par(c, hyp);
      for (var i = 0; i < 2; i++) {
        var q = a[i];
        if (q && !out[q]) {
          out[q] = { g: out[c].g + 1, via: c, side: out[c].g === 0 ? (i === 0 ? 'по отцу' : 'по матери') : out[c].side };
          queue.push(q);
        }
      }
    }
    return out;
  }
  function countAnc(id) {
    var n = 0, a = par(id);
    for (var i = 0; i < 2; i++) { if (a[i]) { n += 1 + countAnc(a[i]); } }
    return n;
  }
  function resetOpen() {
    state.open = new Set();
    Object.keys(info).forEach(function (id) { if (info[id].g < 3) { state.open.add(id); } });
  }
  function openPath(id) {
    var c = info[id] && info[id].via;
    while (c) { state.open.add(c); c = info[c].via; }
  }
  function reveal(id) {
    if (!info[id]) {
      var alt = treeInfo(!state.hyp);
      if (!alt[id]) { return false; }
      state.hyp = !state.hyp;
      $('hyp').checked = state.hyp;
      info = alt;
    }
    openPath(id);
    return true;
  }
  function rootRow() {
    var sb = P[ROOT].sb || {};
    return [ROOT].concat(Object.keys(sb).filter(function (q) { return sb[q] === 'ok'; }));
  }

  // ---------- layout: couples side by side, elbows up to each spouse's parents ----------
  function layout() {
    var L = { pos: {}, units: [], arms: [], pills: [], stubs: [] }, ext = {};
    function shown(p) { var a = par(p); return state.open.has(p) && (a[0] || a[1]); }
    function measure(x) {
      var a = par(x), f = a[0], m = a[1];
      var hl = G / 2 + (f ? W : 32), hr = G / 2 + (m ? W : 32), fc = -(G / 2 + W / 2), mc = G / 2 + W / 2;
      var ea = f && shown(f) ? measure(f) : null, eb = m && shown(m) ? measure(m) : null;
      var xa = null, xb = null, l = hl, r = hr;
      if (ea && eb) { xa = -(ea[1] + G / 2); xb = eb[0] + G / 2; l = Math.max(hl, -xa + ea[0]); r = Math.max(hr, xb + eb[1]); }
      else if (ea) { xa = fc; l = Math.max(hl, -fc + ea[0]); r = Math.max(hr, fc + ea[1]); }
      else if (eb) { xb = mc; l = Math.max(hl, eb[0] - mc); r = Math.max(hr, mc + eb[1]); }
      ext[x] = [xa, xb];
      return [l, r];
    }
    function place(x, cu, g) {
      var a = par(x), e = ext[x];
      var c = [cu - (G / 2 + W / 2), cu + G / 2 + W / 2];
      L.units.push({ child: x, f: a[0], m: a[1], cu: cu, g: g + 1 });
      for (var i = 0; i < 2; i++) {
        var who = a[i];
        if (!who) { L.stubs.push({ x: cu + (i === 0 ? -1 : 1) * (G / 2 + 16), g: g + 1 }); continue; }
        L.pos[who] = { x: c[i], g: g + 1, via: x };
        if (e[i] !== null) {
          var pp = par(who);
          L.arms.push({ kx: cu + e[i], kg: g + 2, tx: c[i], both: !!(pp[0] && pp[1]) });
          place(who, cu + e[i], g + 1);
        } else {
          var n = countAnc(who);
          if (n) { L.pills.push({ x: c[i], g: g + 1, n: n, id: who }); }
        }
      }
    }
    var roots = rootRow(), half = (roots.length * W + (roots.length - 1) * RGAP) / 2;
    var has = shown(ROOT), e0 = has ? measure(ROOT) : [0, 0];
    var left = Math.max(e0[0], half), right = Math.max(e0[1], half);
    if (has) { place(ROOT, left, 0); }
    roots.forEach(function (id, i) { L.pos[id] = { x: left + (i - (roots.length - 1) / 2) * (W + RGAP), g: 0, via: null }; });
    L.roots = roots; L.rootC = left;
    L.maxg = 0;
    Object.keys(L.pos).forEach(function (id) { L.maxg = Math.max(L.maxg, L.pos[id].g); });
    L.w = left + right;
    L.h = TOP + L.maxg * PITCH + H + 16;
    L.rowY = function (g) { return TOP + (L.maxg - g) * PITCH; };
    return L;
  }

  // ---------- render tree ----------
  function cardHTML(id, x, y, lv) {
    var p = P[id], n = p.n, sel = state.sel && state.sel.p === id;
    var foot = [p.y, p.pl].filter(Boolean).join(' · ');
    return '<button type="button" class="card lv-' + lv + (id === ROOT ? ' me' : '') + (sel ? ' sel' : '') + '" data-p="' + id + '" style="left:' + (x - W / 2) + 'px;top:' + y + 'px" aria-label="' + esc(nameFull(id)) + '">' +
      avatar(id) + '<span><b class="nm">' + esc(n[0]) + '</b>' +
      (n[1] ? '<span class="nm">' + esc(n[1]) + '</span>' : '') +
      (n[2] ? '<span class="nm">' + esc(n[2]) + '</span>' : '') +
      (n[3] ? '<span class="nm sm">урожд. ' + esc(n[3]) + '</span>' : '') +
      (foot ? '<span class="nm yr">' + esc(foot) + '</span>' : '') + '</span></button>';
  }
  function render() {
    lay = layout();
    var h = [], d = [], L = lay;
    L.units.forEach(function (u) {
      var y = L.rowY(u.g), cy = y + H / 2, both = u.f && u.m;
      if (both) {
        d.push('M' + (u.cu - G / 2) + ' ' + cy + 'H' + (u.cu - 14), 'M' + (u.cu + 14) + ' ' + cy + 'H' + (u.cu + G / 2));
        var key = pairKey(u.f, u.m), sel = state.sel && state.sel.u === key;
        h.push('<button type="button" class="knot' + (sel ? ' sel' : '') + '" data-u="' + key + '" style="left:' + (u.cu - 14) + 'px;top:' + (cy - 14) + 'px" aria-label="Брак: ' + esc(nameShort(u.f) + ' и ' + nameShort(u.m)) + '">' + RINGS + '</button>');
      } else {
        d.push('M' + (u.cu - G / 2) + ' ' + cy + 'H' + (u.cu + G / 2));
      }
      if (u.child === ROOT) {
        var y0 = both ? cy + 14 : cy, yc = L.rowY(0), xs = L.roots.map(function (id) { return L.pos[id].x; });
        if (xs.length === 1) { d.push('M' + u.cu + ' ' + y0 + 'V' + yc); }
        else {
          d.push('M' + u.cu + ' ' + y0 + 'V' + (yc - 32), 'M' + xs[0] + ' ' + (yc - 32) + 'H' + xs[xs.length - 1]);
          xs.forEach(function (x) { d.push('M' + x + ' ' + (yc - 32) + 'V' + yc); });
        }
      }
    });
    L.arms.forEach(function (a) {
      var yk = L.rowY(a.kg) + H / 2 + (a.both ? 14 : 0), ym = L.rowY(a.kg) + H + 32, yc = L.rowY(a.kg - 1);
      if (a.kx === a.tx) { d.push('M' + a.kx + ' ' + yk + 'V' + yc); }
      else { d.push('M' + a.kx + ' ' + yk + 'V' + ym + 'H' + a.tx + 'V' + yc); }
    });
    L.stubs.forEach(function (s) {
      h.push('<span class="stub" style="left:' + (s.x - 16) + 'px;top:' + (L.rowY(s.g) + H / 2 - 16) + 'px" title="Родитель неизвестен">?</span>');
    });
    Object.keys(L.pos).forEach(function (id) {
      var q = L.pos[id], y = L.rowY(q.g), lv = q.via ? (P[q.via].lv || {})[id] || 'unv' : 'self';
      h.push(cardHTML(id, q.x, y, lv));
      var sb = P[id].sb || {}, n = Object.keys(sb).filter(function (k) { return sb[k] === 'ok'; }).length;
      if (n && q.g > 0) {
        h.push('<button type="button" class="sibs" data-sib="' + id + '" style="left:' + (q.x + W / 2 - 30) + 'px;top:' + (y - 12) + 'px" aria-label="Братья и сёстры: ' + n + '">+' + n + '</button>');
      }
      if (lv === 'hyp') { h.push('<span class="hyp-tag" style="left:' + (q.x - 38) + 'px;top:' + (y + H - 11) + 'px">гипотеза</span>'); }
      var a = par(id);
      if (q.g >= 3 && state.open.has(id) && (a[0] || a[1])) {
        h.push('<button type="button" class="fold" data-fold="' + id + '" style="left:' + (q.x - W / 2 - 9) + 'px;top:' + (y - 12) + 'px" aria-label="Свернуть предков: ' + esc(nameShort(id)) + '">' + DOWN + '</button>');
      }
    });
    L.pills.forEach(function (p) {
      h.push('<button type="button" class="pill" data-open="' + p.id + '" style="left:' + (p.x - 62) + 'px;top:' + (L.rowY(p.g) - 40) + 'px" aria-label="Показать предков: ' + esc(nameShort(p.id)) + '">' + UP + 'ещё ' + p.n + ' ' + plural(p.n, 'предок', 'предка', 'предков') + '</button>');
    });
    stage.style.width = L.w + 'px';
    stage.style.height = L.h + 'px';
    stage.innerHTML = '<svg class="lines" width="' + L.w + '" height="' + L.h + '" aria-hidden="true"><path d="' + d.join('') + '"></path></svg>' + h.join('');
    var g = [];
    for (var i = 0; i <= L.maxg; i++) { g.push('<span data-g="' + i + '">' + (GEN[i] || i + '-е поколение') + '</span>'); }
    gensEl.innerHTML = g.join('');
    applyT();
    Array.prototype.forEach.call(document.querySelectorAll('.chip'), function (b) {
      b.setAttribute('aria-pressed', b.dataset.chip === state.chip ? 'true' : 'false');
    });
  }

  // ---------- pan and zoom ----------
  function isSheet() { return window.matchMedia('(max-width: 820px)').matches; }
  function visH() {
    var hgt = view.clientHeight;
    if (isSheet() && !panel.hidden && !panel.classList.contains('full')) { hgt -= panel.offsetHeight; }
    return Math.max(hgt, 120);
  }
  function applyT() {
    stage.style.transform = 'translate(' + state.x + 'px,' + state.y + 'px) scale(' + state.k + ')';
    if (!lay) { return; }
    Array.prototype.forEach.call(gensEl.children, function (el) {
      el.style.top = (state.y + (lay.rowY(+el.dataset.g) + H / 2) * state.k - 9) + 'px';
    });
  }
  function clampK(k) { return Math.min(2, Math.max(0.15, k)); }
  function zoomAt(cx, cy, f) {
    var k = clampK(state.k * f);
    state.x = cx - (cx - state.x) * (k / state.k);
    state.y = cy - (cy - state.y) * (k / state.k);
    state.k = k;
    applyT();
  }
  function fitBox(x1, y1, x2, y2, minK) {
    var vw = view.clientWidth, vh = visH(), pad = isSheet() ? 14 : 110;
    var k = Math.min(1, (vw - 2 * pad) / (x2 - x1), (vh - 56) / (y2 - y1));
    state.k = clampK(Math.max(k, minK || 0.15));
    state.x = (vw - (x1 + x2) * state.k) / 2;
    state.y = (vh - (y1 + y2) * state.k) / 2;
    applyT();
  }
  function home() {
    var vw = view.clientWidth, vh = visH();
    fitBox(0, 0, lay.w, lay.h);
    if (state.k < 0.6) {
      state.k = 0.6;
      state.x = vw / 2 - lay.rootC * state.k;
      state.y = Math.min(12, vh - 12 - lay.h * state.k);
      if (lay.h * state.k > vh) { state.y = vh - 12 - lay.h * state.k; }
      applyT();
    }
  }
  function focusPoint(x, y) {
    if (state.k < 0.5) { state.k = 0.8; }
    state.x = view.clientWidth / 2 - x * state.k;
    state.y = visH() / 2 - y * state.k;
    applyT();
  }
  function focusSel() {
    if (!state.sel || !lay) { return; }
    if (state.sel.p && lay.pos[state.sel.p]) {
      var q = lay.pos[state.sel.p];
      focusPoint(q.x, lay.rowY(q.g) + H / 2);
    } else if (state.sel.u) {
      lay.units.some(function (u) {
        if (u.f && u.m && pairKey(u.f, u.m) === state.sel.u) { focusPoint(u.cu, lay.rowY(u.g) + H / 2); return true; }
        return false;
      });
    }
  }

  var ptrs = new Map(), moved = false, lastD = 0;
  function ptrDist() { var a = Array.from(ptrs.values()); return Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y); }
  view.addEventListener('pointerdown', function (e) {
    if (e.pointerType === 'mouse' && e.button !== 0) { return; }
    if (e.target.closest('.legend, .zoom')) { return; }
    ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (ptrs.size === 1) { moved = false; }
    if (ptrs.size === 2) { lastD = ptrDist(); }
  });
  view.addEventListener('pointermove', function (e) {
    var p = ptrs.get(e.pointerId);
    if (!p) { return; }
    if (ptrs.size === 1) {
      var dx = e.clientX - p.x, dy = e.clientY - p.y;
      if (!moved && Math.hypot(dx, dy) < 6) { return; }
      if (!moved) { moved = true; view.classList.add('drag'); try { view.setPointerCapture(e.pointerId); } catch (err) { /* нет захвата */ } }
      state.x += dx; state.y += dy; p.x = e.clientX; p.y = e.clientY;
      applyT();
    } else if (ptrs.size === 2) {
      p.x = e.clientX; p.y = e.clientY;
      var dist = ptrDist(), a = Array.from(ptrs.values()), r = view.getBoundingClientRect();
      if (lastD) { zoomAt((a[0].x + a[1].x) / 2 - r.left, (a[0].y + a[1].y) / 2 - r.top, dist / lastD); }
      lastD = dist; moved = true;
    }
  });
  function ptrEnd(e) { ptrs.delete(e.pointerId); if (!ptrs.size) { view.classList.remove('drag'); } lastD = 0; }
  view.addEventListener('pointerup', ptrEnd);
  view.addEventListener('pointercancel', ptrEnd);
  view.addEventListener('click', function (e) { if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; } }, true);
  view.addEventListener('wheel', function (e) {
    if (e.target.closest('.legend')) { return; }
    e.preventDefault();
    var r = view.getBoundingClientRect();
    zoomAt(e.clientX - r.left, e.clientY - r.top, Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0015)));
  }, { passive: false });
  view.addEventListener('keydown', function (e) {
    if (e.target.closest('.legend, .zoom')) { return; }
    var step = 80, hit = true;
    if (e.key === 'ArrowLeft') { state.x += step; }
    else if (e.key === 'ArrowRight') { state.x -= step; }
    else if (e.key === 'ArrowUp') { state.y += step; }
    else if (e.key === 'ArrowDown') { state.y -= step; }
    else if (e.key === '+' || e.key === '=') { zoomAt(view.clientWidth / 2, visH() / 2, 1.25); }
    else if (e.key === '-') { zoomAt(view.clientWidth / 2, visH() / 2, 0.8); }
    else { hit = false; }
    if (hit) { e.preventDefault(); applyT(); }
  });
  $('z-in').addEventListener('click', function () { zoomAt(view.clientWidth / 2, visH() / 2, 1.25); });
  $('z-out').addEventListener('click', function () { zoomAt(view.clientWidth / 2, visH() / 2, 0.8); });
  $('z-home').addEventListener('click', function () { state.chip = null; resetOpen(); render(); home(); });
  $('z-all').addEventListener('click', function () {
    state.chip = null;
    Object.keys(info).forEach(function (id) { state.open.add(id); });
    render();
    fitBox(0, 0, lay.w, lay.h);
  });

  // ---------- panel content ----------
  function role(id) {
    var t = info[id], s = P[id].s === 'ж';
    if (!t) { return ''; }
    if (t.g === 0) { return ''; }
    if (t.g === 1) { return s ? 'мать' : 'отец'; }
    var w = t.g === 2 ? (s ? 'бабушка' : 'дед') : t.g === 3 ? (s ? 'прабабушка' : 'прадед') : t.g === 4 ? (s ? 'прапрабабушка' : 'прапрадед') : 'предок, ' + t.g + '-е поколение';
    return w + ' ' + t.side;
  }
  function inTree(id) { return P[id].g !== undefined || P[id].gh !== undefined; }
  function anchor(id) {
    var p = P[id], s = p.s === 'ж', i, keys;
    function phrase(q, word) { return pLink(q, nameFull(q)) + ', ' + (P[q].s === 'ж' ? 'её ' : 'его ') + word; }
    if (id !== ROOT && P[ROOT].sb && P[ROOT].sb[id]) { return s ? 'сестра' : 'брат'; }
    keys = Object.keys(p.sb || {});
    for (i = 0; i < keys.length; i++) { if (inTree(keys[i])) { return phrase(keys[i], (s ? 'сестра' : 'брат') + (p.sb[keys[i]] === 'hyp' ? ' (возможно)' : '')); } }
    keys = p.sp || [];
    for (i = 0; i < keys.length; i++) { if (inTree(keys[i])) { return phrase(keys[i], s ? 'жена' : 'муж'); } }
    keys = Object.keys(p.lv || {}).concat(Object.keys(p.xp || {}));
    for (i = 0; i < keys.length; i++) { if (inTree(keys[i])) { return phrase(keys[i], s ? 'дочь' : 'сын'); } }
    keys = Object.keys(p.ch || {});
    for (i = 0; i < keys.length; i++) { if (inTree(keys[i])) { return phrase(keys[i], (s ? 'мать' : 'отец') + (p.ch[keys[i]] === 'hyp' ? ' (возможно)' : '')); } }
    return '';
  }
  function fact(label, html) { return html ? '<div class="fact"><dt>' + label + '</dt><dd>' + html + '</dd></div>' : ''; }
  function yearsOf(id) { return P[id].y ? ' <span class="muted">' + esc(P[id].y) + '</span>' : ''; }
  function listPeople(map, lvTags) {
    return Object.keys(map).map(function (q) {
      var l = map[q];
      return pLink(q) + yearsOf(q) + (lvTags ? tag(l) : (l === 'hyp' ? ' <span class="muted">(возможно)</span>' : ''));
    }).join('<br>');
  }
  function srcHTML(aid) {
    var a = SRC[aid];
    if (!a) { return ''; }
    var meta = [a.d, a.ref, a.rep].filter(Boolean).map(esc).join(' · ');
    var thumbs = (a.sc || []).map(function (s, i) {
      return '<button type="button" data-scan="' + esc(s) + '" data-cap="' + esc(a.t) + '" aria-label="Открыть снимок ' + (i + 1) + '"><img loading="lazy" src="' + esc(s) + '" alt=""></button>';
    }).join('');
    var links = [];
    if (a.url) { links.push('<a href="' + esc(a.url) + '" target="_blank" rel="noopener">Оригинал в сети</a>'); }
    links.push(docLink('istochniki', aid, 'В реестре источников'));
    return '<div class="src" id="src-' + aid + '"><div class="src-title">' + esc(a.t) + '</div>' +
      '<div class="src-meta">' + (a.o ? 'оригинал или его снимок' : 'вторичный источник: расшифровка, указатель или чужое древо') + (meta ? ' · ' + meta : '') + '</div>' +
      (thumbs ? '<div class="thumbs">' + thumbs + '</div>' : '') +
      (a.sum ? '<details><summary>Что в документе</summary><p>' + rich(a.sum) + '</p></details>' : '') +
      '<div class="src-links">' + links.join('') + '</div></div>';
  }
  function claimsBlocks(ids) {
    var life = [], args = [], next = [];
    ids.map(function (cid) { return { id: cid, c: CLAIMS[cid] }; })
      .filter(function (x) { return x.c; })
      .sort(function (a, b) { return (a.c.y || 9999) - (b.c.y || 9999) || (a.id < b.id ? -1 : 1); })
      .forEach(function (x) {
        var c = x.c, ref = docLink('utverzhdeniya', x.id, x.id, 'ref');
        if (c.l !== 'no') { life.push('<li><span class="yy">' + (c.y || '') + '</span><span>' + rich(c.t) + ' ' + tag(c.l) + ' ' + ref + '</span></li>'); }
        if (c.why || c.l === 'no') { args.push('<p>' + ref + ' ' + (c.l === 'no' ? tag('no') + ' ' + rich(c.t) + '<br>' : '') + rich(c.why || '') + '</p>'); }
        if (c.next && next.indexOf(c.next) < 0) { next.push(c.next); }
      });
    return { life: life, args: args, next: next };
  }
  function headHTML(avatars, title, sub) {
    return '<div class="p-head">' + avatars + '<div class="p-title"><h2>' + title + '</h2>' + (sub ? '<p>' + sub + '</p>' : '') + '</div>' +
      '<button type="button" class="p-btn" id="p-full" aria-label="Развернуть карточку на весь экран">' + FULL + '</button>' +
      '<button type="button" class="p-btn" id="p-close" aria-label="Закрыть карточку">' + CLOSE + '</button></div>';
  }
  function personHTML(id) {
    var p = P[id], f = p.s === 'ж', n = p.n, out = [];
    var sub = [n[3] ? 'урожд. ' + esc(n[3]) : '', role(id), p.y ? esc(p.y) : ''].filter(Boolean).join(' · ');
    out.push(headHTML(avatar(id), esc(nameShort(id)), sub));
    var parents = {};
    Object.keys(p.lv || {}).forEach(function (q) { parents[q] = p.lv[q]; });
    Object.keys(p.xp || {}).forEach(function (q) { parents[q] = p.xp[q]; });
    var sp = (p.sp || []).map(function (q) {
      var key = pairKey(id, q);
      return pLink(q) + yearsOf(q) + (key ? ' <a class="ref" href="#' + key.replace('+', '-') + '" data-u="' + key + '">о паре</a>' : '');
    }).join('<br>');
    var facts = [
      !info[id] && id !== ROOT ? fact('Родство', anchor(id) || '<span class="muted">связь с древом в реестре не записана</span>') : '',
      fact(f ? 'Родилась' : 'Родился', p.b ? rich(p.b.t) + ' ' + tag(p.b.l) : ''),
      fact(f ? 'Умерла' : 'Умер', p.d ? rich(p.d.t) + ' ' + tag(p.d.l) : ''),
      fact('Места', p.pc ? rich(p.pc) : ''),
      fact('Занятие', p.oc ? rich(p.oc) : ''),
      fact('Община', p.cf ? rich(p.cf) : ''),
      fact('В документах', p.wr ? rich(p.wr) : ''),
      fact('Родители', Object.keys(parents).length ? listPeople(parents, true) : '<span class="muted">в реестре не записаны</span>'),
      fact(f ? 'Муж' : 'Жена', sp),
      fact('Дети', p.ch ? listPeople(p.ch, false) : '')
    ].join('');
    out.push('<section><h3>Коротко</h3><dl class="facts">' + facts + '</dl></section>');
    if (p.sb) { out.push('<section id="sec-sibs"><h3>Братья и сёстры · ' + Object.keys(p.sb).length + '</h3><div>' + listPeople(p.sb, false) + '</div></section>'); }
    if (p.tx) { out.push('<section><h3>Рассказ</h3><div class="story">' + rich(p.tx) + '</div></section>'); }
    var cb = claimsBlocks(p.cl || []);
    if (cb.life.length) { out.push('<section><h3>Жизнь</h3><ul class="life">' + cb.life.join('') + '</ul></section>'); }
    if (p.src) { out.push('<section><h3>Документы · ' + p.src.length + '</h3>' + p.src.map(srcHTML).join('') + '</section>'); }
    var boxes = '';
    if (cb.args.length) { boxes += '<details class="box"><summary>Доводы и расхождения · ' + cb.args.length + '</summary><div>' + cb.args.join('') + '<p>' + docLink('rassuzhdeniya', '', 'Все рассуждения по порядку') + '</p></div></details>'; }
    if (cb.next.length) { boxes += '<details class="box"><summary>Что ещё искать · ' + cb.next.length + '</summary><div>' + cb.next.map(function (t) { return '<p>' + rich(t) + '</p>'; }).join('') + '</div></details>'; }
    boxes += '<p class="note">' + (docLink('lyudi', id, 'Запись ' + id + ' в реестре лиц') || 'Запись ' + id + ' в реестре лиц') + '</p>';
    out.push('<section>' + boxes + '</section>');
    return out.join('');
  }
  function kidHTML(q, ours) {
    return '<a class="kid' + (ours ? ' ours' : '') + '" href="#' + q + '" data-p="' + q + '"><b>' + esc(P[q].n[0]) + '</b>' + esc(P[q].y || '') + '</a>';
  }
  function pairHTML(key) {
    var u = PAIRS[key], ids = key.split('+'), a = ids[0], b = ids[1], out = [];
    var same = P[a].n[2] && P[a].n[2].replace(/а$/, '') === (P[b].n[2] || '').replace(/а$/, '');
    var title = same ? esc(P[a].n[0] + ' и ' + P[b].n[0] + ' ' + P[a].n[2]) : esc(P[a].n[0] + ' ' + P[a].n[2] + ' и ' + P[b].n[0] + ' ' + P[b].n[2]);
    var nKids = u.ch.length + (u.ch1 ? u.ch1.length : 0);
    var sub = ['пара', P[b].n[3] ? esc(P[b].n[0]) + ' урожд. ' + esc(P[b].n[3]) : '', nKids ? nKids + ' ' + plural(nKids, 'ребёнок', 'ребёнка', 'детей') : ''].filter(Boolean).join(' · ');
    out.push(headHTML('<span class="duo">' + avatar(a) + avatar(b) + '</span>', title, sub));
    var facts = [
      fact('Брак', u.r ? rich(u.why || 'записан в реестре') + ' ' + tag(u.l) : '<span class="muted">записи о браке в реестре нет; пара показана как родители общих детей</span>'),
      fact(P[a].s === 'ж' ? 'Жена' : 'Муж', pLink(a, nameFull(a)) + yearsOf(a)),
      fact(P[b].s === 'ж' ? 'Жена' : 'Муж', pLink(b, nameFull(b)) + yearsOf(b))
    ].join('');
    out.push('<section><h3>Коротко</h3><dl class="facts">' + facts + '</dl></section>');
    var cb = claimsBlocks(u.cl || []);
    if (cb.life.length) { out.push('<section><h3>Что известно о браке</h3><ul class="life">' + cb.life.join('') + '</ul></section>'); }
    if (u.ch.length) {
      var anyOurs = u.ch.some(inTree);
      out.push('<section><h3>Дети · ' + u.ch.length + '</h3><div class="kids">' + u.ch.map(function (q) { return kidHTML(q, inTree(q)); }).join('') + '</div>' +
        (anyOurs ? '<p class="note">Тёмным отмечена наша прямая линия.</p>' : '') + '</section>');
    }
    if (u.ch1 && u.ch1.length) {
      out.push('<section><h3>Дети, у которых записан один родитель · ' + u.ch1.length + '</h3><div class="kids">' + u.ch1.map(function (q) { return kidHTML(q, inTree(q)); }).join('') + '</div></section>');
    }
    if (u.src) { out.push('<section><h3>Источники · ' + u.src.length + '</h3>' + u.src.map(srcHTML).join('') + '</section>'); }
    if (cb.args.length) { out.push('<section><details class="box"><summary>Доводы и расхождения · ' + cb.args.length + '</summary><div>' + cb.args.join('') + '</div></details></section>'); }
    return out.join('');
  }

  // ---------- selection ----------
  function setHash(v) {
    try { history.replaceState(null, '', v ? '#' + v : location.pathname + location.search); } catch (err) { /* file:// */ }
  }
  function showPanel(html) {
    panel.innerHTML = html;
    panel.hidden = false;
    panel.classList.remove('full');
    panel.scrollTop = 0;
    requestAnimationFrame(focusSel);
  }
  function selectPerson(id, toSibs) {
    if (!P[id]) { return; }
    state.sel = { p: id };
    reveal(id);
    render();
    showPanel(personHTML(id));
    setHash(id);
    if (toSibs) { var s = $('sec-sibs'); if (s) { s.scrollIntoView(); } }
  }
  function selectPair(key) {
    if (!PAIRS[key]) { return; }
    state.sel = { u: key };
    reveal(key.split('+')[0]);
    render();
    showPanel(pairHTML(key));
    setHash(key.replace('+', '-'));
  }
  function closePanel() {
    panel.hidden = true;
    panel.innerHTML = '';
    state.sel = null;
    render();
    setHash('');
  }
  stage.addEventListener('click', function (e) {
    var t = e.target.closest('button');
    if (!t) { return; }
    if (t.dataset.p) { selectPerson(t.dataset.p); }
    else if (t.dataset.u) { selectPair(t.dataset.u); }
    else if (t.dataset.sib) { selectPerson(t.dataset.sib, true); }
    else if (t.dataset.open) {
      var id = t.dataset.open, stack = [id];
      state.chip = null;
      while (stack.length) { var c = stack.pop(), a = par(c); state.open.add(c); if (a[0]) { stack.push(a[0]); } if (a[1]) { stack.push(a[1]); } }
      var before = lay.pos[id], sx = before.x * state.k + state.x, sy = lay.rowY(before.g) * state.k + state.y;
      render();
      var after = lay.pos[id];
      state.x = sx - after.x * state.k; state.y = sy - lay.rowY(after.g) * state.k;
      applyT();
    } else if (t.dataset.fold) {
      var fid = t.dataset.fold, b2 = lay.pos[fid], fx = b2.x * state.k + state.x, fy = lay.rowY(b2.g) * state.k + state.y;
      state.chip = null;
      state.open.delete(fid);
      render();
      var a2 = lay.pos[fid];
      state.x = fx - a2.x * state.k; state.y = fy - lay.rowY(a2.g) * state.k;
      applyT();
    }
  });
  panel.addEventListener('click', function (e) {
    var t = e.target.closest('[data-p],[data-u],[data-src],[data-scan],#p-close,#p-full');
    if (!t) { return; }
    if (t.id === 'p-close') { closePanel(); return; }
    if (t.id === 'p-full') { panel.classList.toggle('full'); return; }
    if (t.dataset.scan) { openScan(t.dataset.scan, t.dataset.cap); return; }
    if (t.dataset.src) {
      var el = $('src-' + t.dataset.src);
      if (el) { e.preventDefault(); el.scrollIntoView({ block: 'start' }); var dt = el.querySelector('details'); if (dt) { dt.open = true; } }
      else if (DOCS) { t.target = '_blank'; t.rel = 'noopener'; }
      else { e.preventDefault(); }
      return;
    }
    e.preventDefault();
    if (t.dataset.p) { selectPerson(t.dataset.p); } else if (t.dataset.u) { selectPair(t.dataset.u); }
  });

  // ---------- lightbox ----------
  var lb = $('lightbox'), lastFocus = null;
  function openScan(src, cap) {
    lastFocus = document.activeElement;
    $('lb-img').src = src;
    $('lb-img').alt = cap || 'Снимок документа';
    $('lb-cap').textContent = cap || '';
    lb.hidden = false;
    lb.querySelector('.lb-close').focus();
  }
  function closeScan() { lb.hidden = true; $('lb-img').removeAttribute('src'); if (lastFocus) { lastFocus.focus(); } }
  lb.addEventListener('click', function (e) { if (e.target === lb || e.target.closest('.lb-close')) { closeScan(); } });

  // ---------- chips, switch, search ----------
  $('chips').innerHTML = D.chips.map(function (c) { return '<button type="button" class="chip" data-chip="' + esc(c) + '" aria-pressed="false">' + esc(c) + '</button>'; }).join('');
  $('chips').addEventListener('click', function (e) {
    var b = e.target.closest('.chip');
    if (!b) { return; }
    var name = b.dataset.chip;
    if (state.chip === name) { state.chip = null; resetOpen(); render(); home(); return; }
    state.chip = name;
    resetOpen();
    var ids = Object.keys(info).filter(function (id) { return P[id].v === name; });
    ids.forEach(openPath);
    render();
    var x1 = 1e9, y1 = 1e9, x2 = -1e9, y2 = -1e9;
    ids.forEach(function (id) {
      var q = lay.pos[id];
      if (!q) { return; }
      x1 = Math.min(x1, q.x - W); x2 = Math.max(x2, q.x + W);
      y1 = Math.min(y1, lay.rowY(q.g) - 44); y2 = Math.max(y2, lay.rowY(q.g) + H + 8);
    });
    if (x2 > x1) { fitBox(x1, y1, x2, y2, 0.35); }
  });
  $('hyp').addEventListener('change', function (e) {
    state.hyp = e.target.checked;
    info = treeInfo(state.hyp);
    var first = null;
    Object.keys(info).forEach(function (id) {
      var via = info[id].via;
      if (via && (P[via].lv || {})[id] === 'hyp') { openPath(id); first = first || id; }
    });
    render();
    if (state.hyp && first && lay.pos[first]) { focusPoint(lay.pos[first].x, lay.rowY(lay.pos[first].g) + H / 2); }
  });

  var q = $('q'), results = $('results');
  function norm(s) { return String(s).toLowerCase().replace(/ё/g, 'е'); }
  var index = Object.keys(P).map(function (id) { return { id: id, t: norm(P[id].n.join(' ') + ' ' + (P[id].wr || '')) }; });
  function search() {
    var words = norm(q.value).split(/\s+/).filter(Boolean);
    if (!words.length) { results.hidden = true; return; }
    var hits = index.filter(function (r) { return words.every(function (w) { return r.t.indexOf(w) >= 0; }); })
      .sort(function (a, b) { return (inTree(b.id) - inTree(a.id)) || (a.id < b.id ? -1 : 1); }).slice(0, 14);
    results.innerHTML = hits.length ? hits.map(function (r) {
      return '<li><button type="button" data-p="' + r.id + '">' + esc(nameFull(r.id)) + '<small>' + esc([P[r.id].y, inTree(r.id) ? 'в древе' : 'вне древа'].filter(Boolean).join(' · ')) + '</small></button></li>';
    }).join('') : '<li class="none">Никого не нашлось</li>';
    results.hidden = false;
  }
  q.addEventListener('input', search);
  q.addEventListener('focus', search);
  q.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') { var b = results.querySelector('button'); if (b && !results.hidden) { b.click(); } }
  });
  results.addEventListener('click', function (e) {
    var b = e.target.closest('button');
    if (!b) { return; }
    results.hidden = true; q.value = ''; q.blur();
    selectPerson(b.dataset.p);
  });
  document.addEventListener('click', function (e) { if (!e.target.closest('.search')) { results.hidden = true; } });
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') { return; }
    if (!lb.hidden) { closeScan(); }
    else if (!results.hidden) { results.hidden = true; }
    else if (!panel.hidden) { closePanel(); }
  });

  // ---------- start ----------
  function fromHash() {
    var v = decodeURIComponent(location.hash.replace(/^#/, '')), m = /^(P-\d{4})-(P-\d{4})$/.exec(v);
    if (m && pairKey(m[1], m[2])) { selectPair(pairKey(m[1], m[2])); return true; }
    if (P[v]) { selectPerson(v); return true; }
    return false;
  }
  info = treeInfo(false);
  resetOpen();
  var all = treeInfo(false), maxG = 0;
  Object.keys(all).forEach(function (id) { maxG = Math.max(maxG, all[id].g); });
  $('top-sub').textContent = 'семьи Казас и Кисир · в древе ' + D.meta.tree + ' ' + plural(D.meta.tree, 'человек', 'человека', 'человек') +
    ', ' + (maxG + 1) + ' ' + plural(maxG + 1, 'поколение', 'поколения', 'поколений');
  var note = document.createElement('li');
  note.className = 'muted';
  note.textContent = 'Данные реестров на ' + D.meta.made.split('-').reverse().join('.') + ', версия ' + D.meta.commit.slice(0, 7) + (D.meta.note ? '. ' + D.meta.note : '');
  $('legend').querySelector('ul').appendChild(note);
  render();
  home();
  if (!fromHash()) { /* обычный старт */ }
  window.addEventListener('hashchange', fromHash);
  window.addEventListener('resize', function () { applyT(); });
})();
