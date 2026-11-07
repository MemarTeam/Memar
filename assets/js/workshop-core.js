/* Memar workshop announcement: a radar sweep finds a dot → the camera zooms into it → the dot becomes the first pill
   of a large pill grid → bilingual details change in place → QR card → shrinks back into the dial. Loops seamlessly.
   Design space is 1920 × 1080; render() scales it to any 16:9 size. Needs the global `qrcode` (qrcode-generator). */
(function (global) {
  'use strict';

  var W0 = 1920, H0 = 1080, CX = 960, CY = 540;
  // Colour versions, each from the identity: the opening dial (radar), the ground (night), the three pill fills
  // (deep, bright, light), the warm sand pills, and paper for text and the QR card. Text on bright pills is paper;
  // text on light and sand pills is the ground colour, so each pair keeps good contrast.
  var PALETTES = {
    blueprint: { radar: '#1E6AB6', paper: '#F3F1EB', night: '#082F54', deep: '#0E3D69', bright: '#1E6AB6', light: '#5996D9', sand: '#EBDBC9', sandHi: '#F8F0E6' },
    courtyard: { radar: '#267450', paper: '#F3F1EB', night: '#0D2B20', deep: '#164A36', bright: '#267450', light: '#7DBA98', sand: '#EBDBC9', sandHi: '#F8F0E6' },
    clay: { radar: '#A85334', paper: '#F3F1EB', night: '#33170E', deep: '#62301F', bright: '#A85334', light: '#E39E7E', sand: '#EBDBC9', sandHi: '#F8F0E6' },
    ink: { radar: '#2B3036', paper: '#F3F1EB', night: '#111418', deep: '#262A30', bright: '#51565B', light: '#B9BEC4', sand: '#EBDBC9', sandHi: '#F8F0E6' }
  };
  var FONT_EN = '"IBM Plex Sans", "IBM Plex Sans Arabic", system-ui, sans-serif';
  var FONT_AR = '"IBM Plex Sans Arabic", "IBM Plex Sans", Tahoma, sans-serif';
  // the grid at the reference's scale: about four rows fill the frame
  var PH = 210, PAD = 80, GAP = 30, GAPD = 34, FEATHER = 120, BASE = 62;
  var ROWY = [0, 270, 540, 810, 1080];
  var CARD = 560, CARD_Y = 420, CAP_H = 160, CAP_PAD = 60, CAP_Y = 880;
  var BIG = 500, CAPW = 1500;            // the chosen circle at its full size, and the capsule it squashes into

  function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }
  function clamp01(x) { return clamp(x, 0, 1); }
  function prog(t, a, d) { return clamp01((t - a) / d); }
  function lerp(a, b, x) { return a + (b - a) * x; }
  function eio(x) { return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; }
  function eo(x) { return 1 - Math.pow(1 - x, 3); }
  function eioArea(x) {
    if (x <= 0) return 0;
    if (x < 0.5) return x * x * x * x;
    if (x < 1) return 0.0625 + (x - 0.5) + (Math.pow(2 - 2 * x, 4) - 1) / 16;
    return 0.5 + (x - 1);
  }
  function rng(seed) {
    return function () {
      seed = seed + 0x6D2B79F5 | 0;
      var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function chars(s) { return Array.from(s || ''); }
  function wordPrefix(a, b) {
    if (!a || !b) return '';
    var A = a.split(' '), B = b.split(' '), n = 0;
    while (n < A.length - 1 && n < B.length - 1 && A[n] === B[n]) n++;
    return n ? A.slice(0, n).join(' ') + ' ' : '';
  }
  function rr(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  function hex(h) { h = h.replace('#', ''); return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; }
  function rgba(h, a) { var c = hex(h); return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')'; }
  function mixHex(a, b, x) { var A = hex(a), B = hex(b); return 'rgb(' + Math.round(lerp(A[0], B[0], x)) + ',' + Math.round(lerp(A[1], B[1], x)) + ',' + Math.round(lerp(A[2], B[2], x)) + ')'; }

  function create(cfg) {
    cfg = cfg || {};
    var COL = PALETTES[cfg.palette] || PALETTES.blueprint;
    var mctx = document.createElement('canvas').getContext('2d');
    var cache = {};
    // cfg.fonts { en, ar } lets the site's chosen fonts replace the identity's
    var FE = (cfg.fonts && cfg.fonts.en) || FONT_EN, FA = (cfg.fonts && cfg.fonts.ar) || FONT_AR;
    function font(lang, size) { return '500 ' + size + 'px ' + (lang === 'ar' ? FA : FE); }
    function meas(text, lang, size) {
      if (!text) return 0;
      var k = lang + size + '|' + text;
      if (cache[k] === undefined) { mctx.font = font(lang, size); mctx.direction = lang === 'ar' ? 'rtl' : 'ltr'; cache[k] = mctx.measureText(text).width; }
      return cache[k];
    }
    function fit(texts, lang, maxInner, base) {
      var s = base;
      texts.forEach(function (tx) { var w = meas(tx, lang, base); if (w > maxInner) s = Math.min(s, base * maxInner / w); });
      return Math.max(28, Math.floor(s));
    }

    // ---------- content ----------
    var lines = (cfg.lines || []).map(function (l) { return { en: (l.en || '').trim(), ar: (l.ar || '').trim() }; })
      .filter(function (l) { return l.en || l.ar; }).slice(0, 8);
    if (!lines.length) lines = [{ en: '', ar: '' }];
    var head = { en: ((cfg.header || {}).en || '').trim(), ar: ((cfg.header || {}).ar || '').trim() };
    var scan = { en: ((cfg.scan || {}).en || '').trim(), ar: ((cfg.scan || {}).ar || '').trim() };
    var hold = clamp(Number(cfg.hold) || 7, 3, 15);
    var L = { en: { txt: lines.map(function (l) { return l.en; }), pfx: [''] }, ar: { txt: lines.map(function (l) { return l.ar; }), pfx: [''] } };
    ['en', 'ar'].forEach(function (g) {
      for (var i = 1; i < lines.length; i++) L[g].pfx.push(wordPrefix(L[g].txt[i - 1], L[g].txt[i]));
      L[g].size = fit(L[g].txt, g, 1400, BASE);
    });
    var HS = { en: fit([head.en], 'en', 600, BASE), ar: fit([head.ar], 'ar', 600, BASE) };
    var CS_ = { en: fit([scan.en], 'en', 560, 46), ar: fit([scan.ar], 'ar', 560, 46) };

    // ---------- timeline ----------
    var T = { hit: 2.55, sel: 2.6, zoom: 3.35, zoomD: 1.75 };
    T.zoomEnd = T.zoom + T.zoomD;          // the chosen dot now fills the frame
    T.m0 = T.zoomEnd + 1.6;                // it holds the screen for its moment
    T.cap = T.m0 + 0.75;                   // then squashes into a wide capsule
    T.capD = 0.65;                         // which narrows into the first pill
    T.rows = T.m0 + 0.3;                   // the grid emerges around it
    T.btn = T.cap + 0.35;
    T.head = T.cap + 0.45;
    T.p0 = T.cap + 0.6;
    var S = [], TS = [], TD = [], HIDE = 0.45, tt = T.p0;
    for (var i = 0; i < lines.length; i++) {
      var hide = i ? HIDE : 0, n = 0;
      ['en', 'ar'].forEach(function (g) { n = Math.max(n, chars(L[g].txt[i]).length - chars(L[g].pfx[i]).length); });
      var td = clamp(n / 24, 0.5, 1.05);
      var read = clamp(1.05 + 0.022 * Math.max(chars(L.en.txt[i]).length, chars(L.ar.txt[i]).length), 1.4, 2.0);
      S.push(tt); TS.push(tt + hide); TD.push(td);
      tt += hide + td + read;
    }
    T.qr = tt; T.ready = T.qr + 1.8; T.close = T.ready + hold; T.closeD = 1.4;
    var DURATION = Math.round((T.close + T.closeD + 0.3) * 100) / 100;

    // ---------- radar: a phosphor screen; only what the line has passed glows, then fades ----------
    var TH0 = -Math.PI / 2, OMEGA = 2 * Math.PI / 2.4, SA = 0.8, DOT_R = 10.5, ZE = BIG / DOT_R;
    function theta(t) { return TH0 + OMEGA * SA * eioArea(t / SA); }
    var AX = theta(T.hit), RX = 330;
    var DOT = [CX + RX * Math.cos(AX), CY + RX * Math.sin(AX)];
    var RINGS = [170, 340, 510, 680, 850];
    var BLIPS = [[1.0, 455], [1.8, 230], [2.55, 520], [3.35, 395], [4.15, 610], [4.9, 270], [5.6, 470]].map(function (b) {
      var a = AX - 2 * Math.PI + b[0];
      while (a < TH0) a += 2 * Math.PI;
      return { a: a, x: CX + b[1] * Math.cos(a), y: CY + b[1] * Math.sin(a) };
    });
    function decay(age, k) { return Math.exp(-age / k); }
    function camera(t) {
      var q = eio(prog(t, T.zoom, T.zoomD)), z = Math.exp(Math.log(ZE) * q);
      return { z: z, x: DOT[0] + (CX - DOT[0]) * (1 - q) / z, y: DOT[1] + (CY - DOT[1]) * (1 - q) / z, q: q };
    }
    function drawRadar(ctx, t, B) {
      var cf = eio(prog(t, T.zoom + 0.55, T.zoomD - 0.6));             // ground turns to night as we arrive
      ctx.setTransform(B.s, 0, 0, B.s, B.ox, B.oy);
      ctx.fillStyle = mixHex(COL.radar, COL.night, cf);
      ctx.fillRect(0, 0, W0, H0);
      if (t >= T.zoomEnd) return;
      var cam = camera(t);
      ctx.setTransform(B.s * cam.z, 0, 0, B.s * cam.z, B.ox + B.s * (CX - cam.x * cam.z), B.oy + B.s * (CY - cam.y * cam.z));
      var fade = 1 - eio(prog(t, T.zoom + 0.35, 1.0));                // rings and beam fly past, then fade
      var th = theta(t), swept = th - TH0;
      if (swept > 0.001 && fade > 0) {
        var g = ctx.createConicGradient(th, CX, CY);
        for (var k = 0; k <= 32; k++) {
          var sx = k / 32, age = 2 * Math.PI * (1 - sx);
          g.addColorStop(sx, rgba(COL.paper, age > swept ? 0 : 0.22 * decay(age, 2.0) * fade));
        }
        ctx.strokeStyle = g; ctx.lineWidth = 1.6;
        RINGS.forEach(function (r) { ctx.beginPath(); ctx.arc(CX, CY, r, 0, Math.PI * 2); ctx.stroke(); });
        var grow = eio(prog(t, 0, 0.6)), WW = 1.15, RW = 860;
        var w = ctx.createConicGradient(th - WW, CX, CY), f = WW / (2 * Math.PI);
        w.addColorStop(0, rgba(COL.paper, 0));
        w.addColorStop(f * 0.985, rgba(COL.paper, 0.2 * grow * fade));
        w.addColorStop(f, rgba(COL.paper, 0));
        w.addColorStop(1, rgba(COL.paper, 0));
        ctx.fillStyle = w;
        ctx.beginPath(); ctx.moveTo(CX, CY); ctx.arc(CX, CY, RW, th - WW, th); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = rgba(COL.paper, 0.85 * grow * fade); ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.moveTo(CX, CY); ctx.lineTo(CX + RW * Math.cos(th), CY + RW * Math.sin(th)); ctx.stroke();
        BLIPS.forEach(function (b) {
          var d = th - b.a; if (d < 0) return;
          var ag = d % (2 * Math.PI), br = decay(ag, 1.7) * fade;
          ctx.fillStyle = rgba(COL.paper, 0.95 * br);
          ctx.beginPath(); ctx.arc(b.x, b.y, 6, 0, Math.PI * 2); ctx.fill();
          if (ag < 1.3) { ctx.strokeStyle = rgba(COL.paper, 0.55 * (1 - ag / 1.3) * fade); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(b.x, b.y, 9 + ag * 26, 0, Math.PI * 2); ctx.stroke(); }
        });
      }
      ctx.fillStyle = rgba(COL.paper, fade);
      ctx.beginPath(); ctx.arc(CX, CY, 9, 0, Math.PI * 2); ctx.fill();
      // the chosen dot: lit when the line passes, then held, marked, and zoomed into
      if (t >= T.hit) {
        var age2 = th - AX;
        if (age2 < 1.3) { ctx.strokeStyle = rgba(COL.paper, 0.6 * (1 - age2 / 1.3) * fade); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(DOT[0], DOT[1], 9 + age2 * 26, 0, Math.PI * 2); ctx.stroke(); }
        var sel = eio(prog(t, T.sel, 0.55));
        if (sel > 0 && fade > 0) {
          ctx.strokeStyle = rgba(COL.paper, 0.85 * (1 - eio(prog(t, T.zoom, 0.6)))); ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(DOT[0], DOT[1], 24, -Math.PI / 2, -Math.PI / 2 + sel * 2 * Math.PI); ctx.stroke();
        }
        var r = lerp(6, DOT_R, eio(prog(t, T.sel, T.zoom + 0.4 - T.sel)));
        var blink = t < T.zoom ? 0.75 + 0.25 * Math.cos(2 * Math.PI * (t - T.hit) / 0.4) : 1;
        ctx.fillStyle = rgba(COL.paper, blink);
        ctx.beginPath(); ctx.arc(DOT[0], DOT[1], r, 0, Math.PI * 2); ctx.fill();
      }
    }


    // ---------- the circle's moment: it fills the frame, swells gently, then squashes into a capsule ----------
    function bigShape(ctx, t) {
      if (t < T.zoomEnd || t >= T.cap) return;
      var br = 1 + 0.03 * Math.sin(Math.PI * prog(t, T.zoomEnd, T.m0 - T.zoomEnd));
      var c = eio(prog(t, T.m0, T.cap - T.m0));
      var w = lerp(2 * BIG * br, CAPW, c), h = lerp(2 * BIG * br, PH, c);
      rr(ctx, CX - w / 2, CY - h / 2, w, h, h / 2);
      ctx.fillStyle = mixHex(COL.paper, COL.bright, eio(prog(t, T.m0 + 0.15, 0.55)));
      ctx.fill();
    }

    // ---------- pill grid ----------
    var R = rng(20261031);
    function pattern(n) {
      var out = [];
      for (var k = 0; k < n; k++) {
        var u = R(), st = u < 0.36 ? 'deep' : u < 0.62 ? 'outline' : u < 0.84 ? 'bright' : u < 0.93 ? 'sand' : 'light';
        out.push({ w: Math.round(280 + R() * 500), st: st, ph: R() * 6.28 });
      }
      return out;
    }
    var ROWS = ROWY.map(function (y, j) {
      var p = pattern(8), Lp = 0;
      p.forEach(function (q) { Lp += q.w + GAPD; });
      return { y: y, dir: j % 2 ? -1 : 1, v: 16 + 6 * (j % 3), pat: p, len: Lp, left: pattern(4), right: pattern(4), off: R() * Lp };
    });
    var FILL = { deep: COL.deep, bright: COL.bright, light: COL.light, sand: COL.sand };

    // how each pill arrives: four kinds, mixed, in a wave from the centre
    function arrival(t, x, y, salt, kind) {
      if (kind === 2) return prog(t, T.cap, T.capD + 0.25);
      var d = Math.hypot((x - CX) / 1.6, y - CY);
      return prog(t, T.rows + d / 1300 + (salt % 5) * 0.035, 0.8);
    }
    function entrance(kind, ep, x, y, w, h) {
      if (ep >= 1) return { x: x, y: y, w: w, h: h, a: 1 };
      if (ep <= 0) return null;
      var e = eio(ep), a = Math.min(1, ep * 3);
      if (kind === 0) { var hh = h * e, ww = Math.max(hh, w * e); return { x: x + (w - ww) / 2, y: y, w: ww, h: hh, a: a }; }   // grows from a dot
      if (kind === 1) { var h1 = h * lerp(0.4, 1, eo(ep)), w1 = lerp(h1, w, e); return { x: x + (w - w1) / 2, y: y, w: w1, h: h1, a: a }; } // unfolds from a circle
      if (kind === 2) return { x: lerp(CX - w / 2, x, e), y: y, w: w, h: h, a: 1 };                                             // carved out of the capsule as it narrows
      return { x: x + (y < CY ? -1 : 1) * 140 * (1 - e), y: y, w: w, h: h, a: a };                                             // glides in a short way
    }
    function pill(ctx, x, y, w, h, q, t, alpha, kind, salt) {
      if (alpha <= 0) return;
      var r = kind === undefined ? { x: x, y: y, w: w, h: h, a: 1 } : entrance(kind, arrival(t, x + w / 2, y, salt, kind), x, y, w, h);
      if (!r || r.a <= 0) return;
      ctx.globalAlpha = alpha * r.a;
      rr(ctx, r.x, r.y - r.h / 2, r.w, r.h, r.h / 2);
      if (q.st === 'outline') { ctx.lineWidth = 2.5; ctx.strokeStyle = rgba(COL.light, 0.45); ctx.stroke(); }
      else if (q.st === 'sand') {
        var g = ctx.createLinearGradient(r.x, 0, r.x + r.w, 0), c = 0.5 + 0.45 * Math.sin(t * 0.9 + q.ph);
        g.addColorStop(0, COL.sand); g.addColorStop(clamp(c, 0.05, 0.95), COL.sandHi); g.addColorStop(1, COL.sand);
        ctx.fillStyle = g; ctx.fill();
      } else { ctx.fillStyle = FILL[q.st]; ctx.fill(); }
      ctx.globalAlpha = 1;
    }
    // background pills breathe: neighbours trade width, so a row's length never changes
    function bw(q, k, t, paired) {
      var d = 46 * Math.sin(0.65 * t + (paired ? Math.floor(k / 2) * 1.7 : q.ph));
      return q.w + (paired ? (k % 2 ? -d : d) : d);
    }
    function strip(ctx, row, j, x0, t, alpha, sandAlpha) {
      var x = ((x0 % row.len) + row.len) % row.len - row.len, k = 0, rep = 0;
      while (x < W0 + 10) {
        var idx = k % row.pat.length, q = row.pat[idx], w = bw(q, idx, t, true), salt = j * 97 + idx * 31 + rep * 17;
        if (x + w > -10) pill(ctx, x, row.y, w, PH, q, t, q.st === 'sand' ? sandAlpha : alpha, [0, 1, 3][salt % 3], salt);
        x += w + GAPD; k++; if (idx === row.pat.length - 1) rep++;
      }
    }
    function side(ctx, row, j, edge, dir, list, t, alpha, fromCapsule) {
      var x = edge;
      for (var k = 0; k < list.length && (dir < 0 ? x > -10 : x < W0 + 10); k++) {
        var q = list[k], w = bw(q, k, t, false), salt = j * 53 + k * 29 + (dir < 0 ? 7 : 11);
        if (dir < 0) x -= w;
        pill(ctx, x, row.y, w, PH, q, t, alpha, fromCapsule ? 2 : [0, 1, 3][salt % 3], salt);
        x = dir < 0 ? x - GAPD : x + w + GAPD;
      }
    }

    function pillText(ctx, lang, size, x, w, y, h, pad, pre, suf, e, alpha, rgb) {
      if (alpha <= 0) return;
      rgb = rgb || hex(COL.paper);
      function c(a) { return 'rgba(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ',' + a + ')'; }
      ctx.save();
      rr(ctx, x, y - h / 2, w, h, h / 2); ctx.clip();
      ctx.font = font(lang, size);
      ctx.textBaseline = 'middle';
      var ar = lang === 'ar';
      ctx.direction = ar ? 'rtl' : 'ltr';
      ctx.textAlign = ar ? 'right' : 'left';
      var wPre = meas(pre, lang, size), start = ar ? x + w - pad : x + pad;
      if (pre) { ctx.fillStyle = c(alpha); ctx.fillText(pre, start, y + 2); }
      if (suf && e > 0) {
        var s0 = ar ? start - wPre : start + wPre, g;
        if (ar) { g = ctx.createLinearGradient(s0 - e, 0, s0 - e + FEATHER, 0); g.addColorStop(0, c(0)); g.addColorStop(1, c(alpha)); }
        else { g = ctx.createLinearGradient(s0 + e - FEATHER, 0, s0 + e, 0); g.addColorStop(0, c(alpha)); g.addColorStop(1, c(0)); }
        ctx.fillStyle = g;
        ctx.fillText(suf, s0, y + 2);
      }
      ctx.restore();
    }

    // each change uses a different shape: shrink to a circle, squash to a line, or swell into a bulge,
    // and English and Arabic never use the same one at the same moment
    var STY = ['shrink', 'squash', 'bulge'], FC = ['bright', 'sand', 'light'];
    function styleOf(g, i) { return STY[(g === 'en' ? i - 1 : i) % 3]; }
    function fillOf(g, i) { return FC[(g === 'en' ? i : i + 1) % 3]; }
    function fullW(text, g, size) { return Math.max(PH, meas(text, g, size) + 2 * PAD); }
    function phrase(g, t) {
      var D = L[g], size = D.size, i = 0, BUL = PH * 1.3;
      for (var k = 0; k < S.length; k++) if (t >= S[k]) i = k;
      var base = { pre: '', suf: '', e: 0, inner: 0, fill: g === 'en' ? 1 : 0, size: size, h: PH, w: g === 'en' ? fullW(D.txt[0], g, size) : null, ta: 1, col: fillOf(g, 0) };
      if (t < S[0]) return base;
      if (i > 0 && t < TS[i]) {
        var old = D.txt[i - 1], pre = D.pfx[i], suf = chars(old).slice(chars(pre).length).join('');
        var sw = meas(suf, g, size), f = eio(prog(t, S[i], HIDE)), sty = styleOf(g, i), col = fillOf(g, i);
        if (sty === 'shrink') {
          var e = (sw + FEATHER) * (1 - f);
          return { pre: pre, suf: suf, e: e, inner: meas(pre, g, size) + clamp(e - FEATHER * 0.6, 0, sw), fill: 0, size: size, h: PH, w: null, ta: 1, col: col };
        }
        var wOld = fullW(old, g, size), wNew = fullW(D.txt[i], g, size);
        var o = { pre: pre, suf: suf, e: sw + FEATHER, inner: 0, fill: f, size: size, ta: 1 - Math.min(1, f * 1.6), col: col };
        if (sty === 'squash') { o.h = lerp(PH, 14, f); o.w = lerp(wOld, wNew, f); }
        else { o.h = lerp(PH, BUL, f); o.w = lerp(wOld, BUL, f); }
        return o;
      }
      var cur = D.txt[i], p2 = D.pfx[i], s2 = chars(cur).slice(chars(p2).length).join('');
      var sty2 = i ? styleOf(g, i) : 'shrink', col2 = fillOf(g, i);
      var sw2 = meas(s2, g, size), e2 = (sw2 + FEATHER) * eio(prog(t, TS[i], TD[i]));
      var lit = (i === 0 && g === 'en') || sty2 !== 'shrink';
      var fill = (lit ? 1 : eio(prog(t, TS[i], 0.15))) * (1 - eio(prog(t, TS[i] + TD[i] + 0.55, 0.5)));
      var st = { pre: p2, suf: s2, e: e2, inner: meas(p2, g, size) + clamp(e2 - FEATHER * 0.6, 0, sw2), fill: fill, size: size, h: PH, w: null, ta: 1, col: col2 };
      if (i === 0 && g === 'en') st.w = fullW(cur, g, size);
      if (sty2 === 'squash') { st.h = lerp(14, PH, eio(prog(t, TS[i], 0.35))); st.w = fullW(cur, g, size); }
      else if (sty2 === 'bulge') { var kk = eio(prog(t, TS[i], 0.4)); st.h = lerp(BUL, PH, kk); st.w = Math.max(st.h, lerp(BUL, Math.max(PH, st.inner + 2 * PAD), kk)); }
      return st;
    }
    function headState(g, t) {
      var tx = head[g], sw = meas(tx, g, HS[g]), e = (sw + FEATHER) * eio(prog(t, T.head, 0.8));
      return { pre: '', suf: tx, e: e, inner: clamp(e - FEATHER * 0.6, 0, sw), fill: 0, size: HS[g], h: PH, w: null, ta: 1, col: 'bright' };
    }
    function pw(st) { return st.w !== null && st.w !== undefined ? st.w : Math.max(PH, st.inner + 2 * PAD); }

    function button(ctx, cx, cy, h, icon, alpha, scale, rot) {
      if (alpha <= 0 || scale <= 0) return;
      var r = h / 2 * scale, k = h / 104 * scale;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = COL.bright;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
      if (icon === 'tri') {                      // the Memar triangle (half as deep as it is tall), centred on its centroid
        var c = Math.cos(rot || 0), sn = Math.sin(rot || 0);
        ctx.fillStyle = COL.paper;
        ctx.beginPath();
        [[-7.3, -22], [14.7, 0], [-7.3, 22]].forEach(function (v, i) {
          var x = cx + (v[0] * c - v[1] * sn) * k, y = cy + (v[0] * sn + v[1] * c) * k;
          if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
        });
        ctx.closePath(); ctx.fill();
        ctx.globalAlpha = 1;
        return;
      }
      ctx.strokeStyle = COL.paper; ctx.lineWidth = 4 * k; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath();
      if (icon === 'check') { ctx.moveTo(cx - 15 * k, cy + 1 * k); ctx.lineTo(cx - 4 * k, cy + 12 * k); ctx.lineTo(cx + 17 * k, cy - 11 * k); }
      else if (icon === 'up') { ctx.moveTo(cx, cy + 16 * k); ctx.lineTo(cx, cy - 16 * k); ctx.moveTo(cx - 13 * k, cy - 3 * k); ctx.lineTo(cx, cy - 16 * k); ctx.lineTo(cx + 13 * k, cy - 3 * k); }
      else {
        var d = icon === 'right' ? 1 : -1;
        ctx.moveTo(cx - 16 * k * d, cy); ctx.lineTo(cx + 16 * k * d, cy);
        ctx.moveTo(cx + 3 * k * d, cy - 13 * k); ctx.lineTo(cx + 16 * k * d, cy); ctx.lineTo(cx + 3 * k * d, cy + 13 * k);
      }
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    function contentPill(ctx, x, y, w, h, pad, st, g, alpha, kind, salt, t) {
      if (alpha <= 0) return;
      var r = kind === undefined ? { x: x, y: y, w: w, h: h, a: 1 } : entrance(kind, arrival(t, x + w / 2, y, salt, kind), x, y, w, h);
      if (!r || r.a <= 0) return;
      var a = alpha * r.a, fc = FILL[st.col || 'bright'], dark = st.col === 'sand' || st.col === 'light';
      ctx.globalAlpha = a;
      rr(ctx, r.x, r.y - r.h / 2, r.w, r.h, r.h / 2);
      if (st.fill > 0) { ctx.fillStyle = rgba(fc, st.fill); ctx.fill(); }
      ctx.lineWidth = 2.5; ctx.strokeStyle = rgba(COL.light, 0.55 * (1 - st.fill) + 0.0001); ctx.stroke();
      ctx.globalAlpha = 1;
      var P = hex(COL.paper), N = hex(COL.night), kd = dark ? clamp01(st.fill * 1.4) : 0;
      var tc = [Math.round(lerp(P[0], N[0], kd)), Math.round(lerp(P[1], N[1], kd)), Math.round(lerp(P[2], N[2], kd))];
      pillText(ctx, g, st.size, r.x, r.w, r.y, r.h, pad, st.pre, st.suf, st.e, a * (st.ta === undefined ? 1 : st.ta), tc);
    }

    // the triangle button and the text pill swap sides with every new line; the two rows mirror each other.
    // side 0: button on the left, pointing right at the text; side 1: button on the right, pointing left.
    function sideAt(g, t) {
      var b = g === 'en' ? 0 : 1, s = b;
      for (var k = 1; k < S.length; k++) if (t >= S[k]) s = lerp((b + k - 1) % 2, (b + k) % 2, eio(prog(t, S[k], 0.8)));
      return s;
    }
    function line(w, sd, bp, st) {
      var gw = w + bp * (PH + GAP), l = CX - gw / 2;
      return { l: l, r: l + gw, pill: [l + (1 - sd) * bp * (PH + GAP), w], btn: lerp(l + bp * PH / 2, l + w + bp * (GAP + PH / 2), sd), side: sd, st: st };
    }

    // the three content rows; buttons grow out after the capsule settles
    function groups(t) {
      var bp = eio(prog(t, T.btn, 0.6));
      var hE = headState('en', t), hA = headState('ar', t), lE = phrase('en', t), lA = phrase('ar', t);
      var wE = pw(hE), wA = pw(hA), gw = wE + GAP + wA + bp * (PH + GAP), l = CX - gw / 2;
      var G = { bp: bp };
      G.head = { l: l, r: l + gw, en: [l, wE, hE], btn: l + wE + GAP + bp * PH / 2, ar: [l + wE + GAP + bp * (PH + GAP), wA, hA] };
      var w = pw(lE);
      if (t < T.cap + T.capD) w = lerp(CAPW, w, eio(prog(t, T.cap, T.capD)));   // the capsule narrows into the pill
      G.lineEn = line(w, sideAt('en', t), bp, lE);
      G.lineAr = line(pw(lA), sideAt('ar', t), bp, lA);
      return G;
    }
    var GQR = null;
    function cardRect(c) {
      var s = lerp(CARD, 18, c);
      return { x: CX - s / 2, y: lerp(CARD_Y, CY, c) - s / 2, s: s, r: lerp(44, s / 2, c) };
    }

    var QR = null;
    try {
      if (global.qrcode && cfg.link) {
        var qr = global.qrcode(0, 'M'); qr.addData(String(cfg.link)); qr.make();
        var nq = qr.getModuleCount(), mods = [];
        for (var r0 = 0; r0 < nq; r0++) for (var c0 = 0; c0 < nq; c0++) if (qr.isDark(r0, c0)) mods.push([r0, c0]);
        QR = { n: nq, mods: mods };
      }
    } catch (err) { QR = null; }

    function drawCard(ctx, t) {
      var c = eio(prog(t, T.close, T.closeD)), cr = cardRect(c);
      ctx.fillStyle = COL.paper;
      rr(ctx, cr.x, cr.y, cr.s, cr.s, cr.r); ctx.fill();
      var ma = 1 - eio(prog(t, T.close, 0.45));
      if (!QR || ma <= 0) return;
      var inner = cr.s - 2 * lerp(42, 0, c), cell = inner / QR.n, ox = cr.x + (cr.s - inner) / 2, oy = cr.y + (cr.s - inner) / 2;
      ctx.fillStyle = COL.night;
      QR.mods.forEach(function (m) {
        var a = prog(t, T.qr + 1.0 + 0.55 * (m[0] + m[1]) / (2 * QR.n), 0.25) * ma;
        if (a <= 0) return;
        ctx.globalAlpha = a;
        ctx.fillRect(ox + m[1] * cell - 0.2, oy + m[0] * cell - 0.2, cell + 0.4, cell + 0.4);
      });
      ctx.globalAlpha = 1;
    }
    function captions(ctx, t) {
      var a = eio(prog(t, T.qr + 0.85, 0.6)) * (1 - eio(prog(t, T.close, 0.35)));
      if (a <= 0) return;
      var rise = 36 * (1 - eio(prog(t, T.qr + 0.85, 0.6)));
      var eE = scan.en, eA = scan.ar;
      var wE = eE ? Math.max(CAP_H, meas(eE, 'en', CS_.en) + 2 * CAP_PAD) : 0, wA = eA ? Math.max(CAP_H, meas(eA, 'ar', CS_.ar) + 2 * CAP_PAD) : 0;
      var gw = wE + wA + CAP_H + (wE ? GAP : 0) + (wA ? GAP : 0), l = CX - gw / 2, y = CAP_Y + rise;
      if (wE) { contentPill(ctx, l, y, wE, CAP_H, CAP_PAD, { pre: eE, suf: '', e: 0, fill: 0, size: CS_.en, col: 'bright' }, 'en', a); l += wE + GAP; }
      button(ctx, l + CAP_H / 2, y, CAP_H, 'up', a, 1); l += CAP_H + GAP;
      if (wA) contentPill(ctx, l, y, wA, CAP_H, CAP_PAD, { pre: eA, suf: '', e: 0, fill: 0, size: CS_.ar, col: 'bright' }, 'ar', a);
    }

    function drawGrid(ctx, t) {
      var q = eio(prog(t, T.qr, 1.0)), cl = eio(prog(t, T.close, T.closeD * 0.8));
      var G = t < T.qr ? groups(t) : (GQR || (GQR = groups(T.qr)));
      ROWS.forEach(function (row, j) {
        if (j === 0 || j === 4) { strip(ctx, row, j, row.off + row.dir * row.v * t, t, (1 - 0.7 * q) * (1 - cl), 1 - q); return; }
        var gap = GAPD + 14 * (1 + Math.sin(0.5 * t + j)), dA = 1 - q;
        if (j === 1) {
          var H_ = G.head, y1 = row.y - 60 * q;
          side(ctx, row, j, H_.l - gap, -1, row.left, t, dA);
          side(ctx, row, j, H_.r + gap, 1, row.right, t, dA);
          contentPill(ctx, H_.en[0], y1, H_.en[1], PH, PAD, H_.en[2], 'en', 1 - q, 0, 3, t);
          button(ctx, H_.btn, y1, PH, 'check', 1 - q, G.bp);
          contentPill(ctx, H_.ar[0], y1, H_.ar[1], PH, PAD, H_.ar[2], 'ar', 1 - q, 0, 8, t);
          return;
        }
        var g = j === 2 ? 'en' : 'ar', gr = G[j === 2 ? 'lineEn' : 'lineAr'];
        side(ctx, row, j, gr.l - gap, -1, row.left, t, dA, j === 2);
        side(ctx, row, j, gr.r + gap, 1, row.right, t, dA, j === 2);
        if (j === 2 && t < T.cap) return;                    // until then the capsule is the English pill
        var st = gr.st, h = st.h || PH, cross = Math.sin(Math.PI * gr.side);
        if (t < T.qr) {
          contentPill(ctx, gr.pill[0], row.y, gr.pill[1], h, PAD, st, g, 1, j === 3 ? 1 : undefined, 5, t);
          button(ctx, gr.btn, row.y, PH, 'tri', 1, G.bp * (1 - 0.22 * cross), Math.PI * gr.side);   // passes in front, a little smaller
          return;
        }
        button(ctx, gr.btn, row.y, PH, 'tri', 1 - q, G.bp, Math.PI * gr.side);
        var m = eio(prog(t, T.qr, 1.0)), cr = cardRect(0);
        if (m >= 1) return;
        var x = lerp(gr.pill[0], cr.x, m), w = lerp(gr.pill[1], cr.s, m), hh = lerp(PH, cr.s, m), yy = lerp(row.y, cr.y + cr.s / 2, m);
        rr(ctx, x, yy - hh / 2, w, hh, lerp(PH / 2, cr.r, m));
        ctx.fillStyle = rgba(COL.paper, eio(prog(t, T.qr, 0.3))); ctx.fill();
        ctx.lineWidth = 2.5; ctx.strokeStyle = rgba(COL.light, 0.55 * (1 - m)); ctx.stroke();
        pillText(ctx, g, st.size, gr.pill[0], gr.pill[1], row.y, PH, PAD, st.pre, st.suf, st.e, 1 - eio(prog(t, T.qr, 0.2)));
      });
      if (t >= T.qr + 1.0) drawCard(ctx, t);
      captions(ctx, t);
    }

    function render(ctx, t, W, Hh) {
      t = clamp(t, 0, DURATION);
      if (t < T.qr) GQR = null;
      var s = Math.min(W / W0, Hh / H0), B = { s: s, ox: (W - W0 * s) / 2, oy: (Hh - H0 * s) / 2 };
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = 1;
      ctx.clearRect(0, 0, W, Hh);
      if (t < T.zoomEnd) drawRadar(ctx, t, B);
      ctx.setTransform(s, 0, 0, s, B.ox, B.oy);
      if (t >= T.zoomEnd) {
        var back = eio(prog(t, T.close + 0.35, T.closeD - 0.35));   // ground returns to the radar blue
        ctx.fillStyle = mixHex(COL.night, COL.radar, back);
        ctx.fillRect(0, 0, W0, H0);
      }
      if (t >= T.rows) drawGrid(ctx, t);
      bigShape(ctx, t);
    }

    return {
      duration: DURATION,
      times: T,
      stages: [
        { name: 'Scanning', a: 0, b: T.zoom },
        { name: 'Zoom in', a: T.zoom, b: T.zoomEnd },
        { name: 'The circle', a: T.zoomEnd, b: T.m0 },
        { name: 'Details', a: T.m0, b: T.qr },
        { name: 'QR code', a: T.qr, b: T.close },
        { name: 'Back to the dial', a: T.close, b: DURATION }
      ],
      render: render
    };
  }

  global.MemarWorkshop = { create: create, W: W0, H: H0, PALETTES: PALETTES };
})(typeof window !== 'undefined' ? window : this);
