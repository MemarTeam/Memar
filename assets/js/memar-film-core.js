/* Memar "Together" logo film: one timeline, drawn on a 2D canvas.
   World units: the finished wordmark spans x 170..1139, y 200..370 (letters 170 tall).
   Eight squares: five become the letters M E M A R, three travel on.
   Every movement eases in and out, so nothing starts or stops abruptly. */
(function (global) {
  'use strict';

  var K = 16;                 // points per template edge
  var H = 85;                 // half letter height
  var VBW = 1600;             // world width visible at zoom 1
  var NCAR = 8;               // cars 0..4 are the letters (front of the train first), 5..7 travel on

  // ---------- easing ----------
  function clamp01(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
  function prog(t, a, d) { return clamp01((t - a) / d); }
  function lerp(a, b, x) { return a + (b - a) * x; }
  function eio(x) { return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; }
  function eo(x) { return 1 - Math.pow(1 - x, 3); }
  function esine(x) { return -(Math.cos(Math.PI * x) - 1) / 2; }
  function eioArea(x) { // integral of eio from 0 to x (x may run past 1)
    if (x <= 0) return 0;
    if (x < 0.5) return x * x * x * x;
    if (x < 1) return 0.0625 + (x - 0.5) + (Math.pow(2 - 2 * x, 4) - 1) / 16;
    return 0.5 + (x - 1);
  }

  // ---------- shapes: 8 key points, every edge split into K points ----------
  function build(keys, arcs) {
    var pts = [];
    for (var i = 0; i < 8; i++) {
      var a = keys[i], b = keys[(i + 1) % 8], A = arcs && arcs[i];
      for (var j = 0; j < K; j++) {
        var f = j / K;
        if (A) {
          var ang = A.a0 + (A.a1 - A.a0) * f;
          pts.push([A.cx + A.r * Math.cos(ang), A.cy + A.r * Math.sin(ang)]);
        } else {
          pts.push([a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f]);
        }
      }
    }
    return pts;
  }
  function mix(a, b, x) {
    var out = new Array(a.length);
    for (var i = 0; i < a.length; i++) out[i] = [a[i][0] + (b[i][0] - a[i][0]) * x, a[i][1] + (b[i][1] - a[i][1]) * x];
    return out;
  }
  function block(h) { return build([[-h, -H], [0, -H], [h, -H], [h, 0], [h, H], [0, H], [-h, H], [-h, 0]]); }

  var RA = Math.atan2(54, 18);
  var SH = {
    SQ: block(H),
    M: build([[-H, -H], [0, 0], [H, -H], [H, 0], [H, H], [0, H], [-H, H], [-H, 0]]),
    E: build([[-71, -H], [0, -H], [71, -H], [-14, 0], [71, H], [0, H], [-71, H], [-71, 0]]),
    A: build([[-3.5, -H], [-0.5, -H], [2.5, -H], [38.5, 0], [74.5, H], [0, H], [-74.5, H], [-39, 0]]),
    R: build([[-68, -H], [9, -H], [66, -28], [27, 26.07], [68, H], [0, H], [-68, H], [-68, 0]],
      { 1: { cx: 9, cy: -28, r: 57, a0: -Math.PI / 2, a1: 0 }, 2: { cx: 9, cy: -28, r: 57, a0: 0, a1: RA } })
  };
  SH.MA = mix(SH.M, SH.A, 0.5);

  // ---------- letters ----------
  var SLOT_X = [255, 461, 667.5, 877.5, 1071];
  var KIND = ['M', 'E', 'M', 'A', 'R'];
  var HALF = [85, 71, 85, 74.5, 68];
  var BLOCK = HALF.map(function (h) { return block(h); });


  // ---------- the loop: a circle to the right of the wordmark ----------
  // Cars leave it along a transition curve whose bend fades out evenly, so their turning slows to nothing
  // instead of stopping at once, and they arrive on the letters' centre line (y = 285) heading left.
  var R0 = 330;                       // ring radius
  var C = 2 * Math.PI * R0;           // circumference
  var X0 = 1380;                      // ring centre x
  var LC = 300;                       // length of the transition curve
  var PHB = -LC / (2 * R0);           // the curve branches off just before the bottom of the ring
  var SB = R0 * PHB;                  // the same point as a track position (the bottom of the ring is 0)
  var NCL = 600, CL = [];
  (function () {
    var x = -R0 * Math.sin(PHB), y = R0 * Math.cos(PHB), h = LC / NCL;
    function th(s) { return Math.PI + PHB + (s - s * s / (2 * LC)) / R0; }
    CL.push([x, y, th(0)]);
    for (var i = 1; i <= NCL; i++) {
      var tm = th((i - 0.5) * h);
      x += Math.cos(tm) * h; y += Math.sin(tm) * h;
      CL.push([x, y, th(i * h)]);
    }
  })();
  var YC = 285 - CL[NCL][1];          // ring centre y, chosen so the curve lands exactly on the centre line
  var XL = X0 + CL[NCL][0];           // where the straight run begins
  var CS = [X0, YC];                  // the squares gather around the ring centre
  var RS = 0.75;                      // cars are a little smaller while they travel together
  var SP = 240;                       // spacing along the track: clear gaps between cars
  var OUT = 0;                        // cars board the ring directly, with no second step
  function ringAt(s) {                // clockwise; at s = 0 the car is at the bottom, heading left
    var ph = s / R0;
    return { x: X0 - R0 * Math.sin(ph), y: YC + R0 * Math.cos(ph), ph: ph };
  }
  function exitAt(sig) {              // the bottom exit, sig = distance past the branch point
    if (sig >= LC) return { x: XL - (sig - LC), y: 285, a: 0 };
    var f = sig / LC * NCL, i = Math.min(NCL - 1, Math.floor(f)), u = f - i, A = CL[i], B = CL[i + 1];
    return { x: X0 + lerp(A[0], B[0], u), y: YC + lerp(A[1], B[1], u), a: lerp(A[2], B[2], u) - Math.PI };
  }
  function topExitAt(sig) {           // the top exit is the bottom one turned half a circle about the centre
    var p = exitAt(sig);
    return { x: 2 * X0 - p.x, y: 2 * YC - p.y, a: p.a };
  }
  // ---------- opening field: the hero (car 1) in the middle, seven more around it ----------
  var HERO = 1;
  var SPOTS = [[0, 15], [-540, -265], [20, -290], [560, -250], [-600, 25], [590, 40], [-330, 275], [300, 285]];
  var ASSIGN = [4, 0, 6, 7, 5, 3, 2, 1];   // spot used by each car (car 1 takes spot 0)
  var SCATTER = ASSIGN.map(function (i) { return [CS[0] + SPOTS[i][0], CS[1] + SPOTS[i][1]]; });

  // morph events [start, duration, shape]; the last one of each car is its slow, staggered return to a square
  var MORPHS = [
    [[4.1, .45, 'A'], [4.75, .45, 'SQ'], [5.4, .45, 'M'], [6.05, .5, 'R'], [6.75, .6, 'E'], [7.5, 1.0, 'SQ']],
    [[0.5, .55, 'M'], [1.3, .45, 'SQ'], [1.85, .5, 'E'], [2.5, .4, 'SQ'], [2.95, .4, 'A'], [3.38, .32, 'R'], [3.72, .38, 'MA'],
     [4.4, .45, 'SQ'], [4.95, .45, 'E'], [5.6, .45, 'A'], [6.25, .5, 'M'], [6.9, .6, 'R'], [7.6, 1.05, 'SQ']],
    [[4.3, .45, 'R'], [4.9, .45, 'E'], [5.5, .45, 'SQ'], [6.05, .5, 'A'], [6.7, .6, 'M'], [7.7, 1.0, 'SQ']],
    [[4.0, .5, 'M'], [4.95, .5, 'A'], [5.9, .55, 'E'], [6.6, .6, 'R'], [7.35, 1.0, 'SQ']],
    [[4.2, .45, 'E'], [4.7, .45, 'M'], [5.2, .45, 'SQ'], [5.7, .45, 'R'], [6.2, .5, 'A'], [6.75, .55, 'E'], [7.85, 1.0, 'SQ']],
    [[4.15, .5, 'R'], [5.0, .5, 'M'], [5.85, .5, 'A'], [6.7, .55, 'SQ'], [7.25, .55, 'E'], [8.0, 1.0, 'SQ']],
    [[4.35, .45, 'E'], [5.1, .45, 'R'], [5.85, .45, 'M'], [6.6, .5, 'A'], [7.6, 1.0, 'SQ']],
    [[4.05, .4, 'A'], [4.5, .4, 'E'], [4.95, .4, 'M'], [5.4, .4, 'R'], [5.85, .4, 'SQ'], [6.3, .45, 'A'], [6.8, .5, 'M'], [7.45, 1.0, 'SQ']]
  ];
  var SETTLED = MORPHS.map(function (ev) { var l = ev[ev.length - 1]; return l[0] + l[1]; });


  // ---------- the train: a smooth speed curve (monotone cubic through key speeds), integrated into distance ----------
  var VEXIT = 400;                     // steady speed while the cars leave the loop
  var VK = [[12.2, 0], [13.0, 40], [13.9, 600], [14.6, 950], [16.4, 950], [17.4, VEXIT]];
  var VM = (function () {
    var n = VK.length, d = [], m = [0], i;
    for (i = 0; i < n - 1; i++) d.push((VK[i + 1][1] - VK[i][1]) / (VK[i + 1][0] - VK[i][0]));
    for (i = 1; i < n - 1; i++) {
      var h0 = VK[i][0] - VK[i - 1][0], h1 = VK[i + 1][0] - VK[i][0];
      m.push(d[i - 1] * d[i] <= 0 ? 0 : 3 * (h0 + h1) / ((2 * h1 + h0) / d[i - 1] + (h1 + 2 * h0) / d[i]));
    }
    m.push(0);
    return m;
  })();
  var TK0 = VK[0][0], TK1 = VK[VK.length - 1][0];
  function speed(t) {
    if (t <= TK0) return 0;
    if (t >= TK1) return VEXIT;
    for (var i = 0; i < VK.length - 1; i++) {
      if (t > VK[i + 1][0]) continue;
      var h = VK[i + 1][0] - VK[i][0], x = (t - VK[i][0]) / h, x2 = x * x, x3 = x2 * x;
      return (2 * x3 - 3 * x2 + 1) * VK[i][1] + (x3 - 2 * x2 + x) * h * VM[i] + (-2 * x3 + 3 * x2) * VK[i + 1][1] + (x3 - x2) * h * VM[i + 1];
    }
    return VEXIT;
  }
  var DT = 1 / 1200, NT = Math.ceil((TK1 - TK0) / DT) + 1, DTAB = [0];
  for (var di = 1; di < NT; di++) DTAB.push(DTAB[di - 1] + (speed(TK0 + (di - 1) * DT) + speed(TK0 + di * DT)) / 2 * DT);
  var DEND = DTAB[NT - 1], TEND = TK0 + (NT - 1) * DT;
  function dist(t) {
    var f = (t - TK0) / DT;
    if (f <= 0) return 0;
    if (f >= NT - 1) return DEND + VEXIT * (t - TEND);
    var i = Math.floor(f);
    return DTAB[i] + (DTAB[i + 1] - DTAB[i]) * (f - i);
  }
  var E0 = 18.0;                                        // the front car (first M) passes the bottom of the ring
  var DE0 = dist(E0);
  function base(t) { return dist(t) - DE0; }            // track position of the front car; 0 = bottom of the ring

  // ---------- leaving the loop ----------
  // The train holds a steady VEXIT. Each letter car then brakes on its own curve: its speed eases from VEXIT
  // to rest with no jolt at either end, and it never speeds up. Later cars brake longer and more gently,
  // so they come to rest in order, the first M first and the R last, GAP seconds apart.
  var GAP = 0.42, TB0 = 1.6;
  var EXIT = [], SSTOP = [], TB = [], TBS = [], STOP = [];
  for (var li = 0; li < 5; li++) {
    EXIT.push(E0 + (SB + li * SP) / VEXIT);   // reaches the branch point
    SSTOP.push(LC + XL - SLOT_X[li]);         // distance from the branch point to its letter
  }
  var T0S = EXIT[0] + SSTOP[0] / VEXIT + TB0 / 2;
  for (li = 0; li < 5; li++) {
    STOP.push(T0S + li * GAP);
    TB.push(2 * (STOP[li] - EXIT[li] - SSTOP[li] / VEXIT));
    TBS.push(STOP[li] - TB[li]);
  }
  function brakeG(x) { return x - x * x * x + x * x * x * x / 2; }   // distance covered under speed 1 - smoothstep(x)
  function letterSig(k, t) {
    if (t >= STOP[k]) return SSTOP[k];
    if (t <= TBS[k]) return VEXIT * (t - EXIT[k]);
    return VEXIT * (TBS[k] - EXIT[k]) + VEXIT * TB[k] * brakeG((t - TBS[k]) / TB[k]);
  }
  // The three others leave from the top of the ring along the mirrored curve and travel on, out of frame.
  var XEXIT = [], VX2 = 950, TXA = 1.4;
  for (var xi = 5; xi < NCAR; xi++) XEXIT[xi] = E0 + (SB - C / 2 + xi * SP) / VEXIT;
  function travelDist(tau) { return VEXIT * tau + (VX2 - VEXIT) * TXA * eioArea(tau / TXA); }
  // ---------- discovering and boarding ----------
  // Each car drifts to a spot just outside the ring, a little ahead of its place in the train, then eases on.
  // On the track its speed is the train's speed times an easing that rises from 0 to 1, so it never rushes.
  var JOIN = [], JOIN_D = 0.75;
  for (var ji = 0; ji < NCAR; ji++) JOIN.push(12.2 + 0.1 * ji);
  var DRIFT_START = [9.15, 9.0, 9.3, 9.05, 9.25, 9.4, 9.1, 9.2];
  var WANDER = [[-45, 30], [40, -30], [-40, 30], [45, -30], [-40, 30], [40, -30], [-45, 30], [40, -30]];
  var LEAN = [1, -1, 1, -1, 1, -1, 1, -1];
  var APPROACH = [], ROT_OFF = [], PATH = [], MERGE = [];
  var NM = 150;
  function mergeB(k, t) { return eio(prog(t, JOIN[k], JOIN_D)); }
  function bez3(Q, x) {
    var a = 1 - x;
    return [a * a * a * Q[0][0] + 3 * a * a * x * Q[1][0] + 3 * a * x * x * Q[2][0] + x * x * x * Q[3][0],
            a * a * a * Q[0][1] + 3 * a * a * x * Q[1][1] + 3 * a * x * x * Q[2][1] + x * x * x * Q[3][1]];
  }
  (function init() {
    for (var k = 0; k < NCAR; k++) {
      var tab = [0], lead = 0, h = JOIN_D / NM;
      for (var j = 1; j <= NM; j++) {
        var ta = JOIN[k] + (j - 1) * h, tb = JOIN[k] + j * h;
        tab.push(tab[j - 1] + (speed(ta) * mergeB(k, ta) + speed(tb) * mergeB(k, tb)) / 2 * h);
        lead += (speed(ta) * (1 - mergeB(k, ta)) + speed(tb) * (1 - mergeB(k, tb))) / 2 * h;
      }
      var sw = base(JOIN[k]) - k * SP + lead;
      MERGE.push({ sw: sw, tab: tab, lead: lead });
      var p = ringAt(sw);
      var P = [p.x + (p.x - X0) / R0 * OUT, p.y + (p.y - YC) / R0 * OUT];
      APPROACH.push(P);
      ROT_OFF.push(Math.round(p.ph / (Math.PI / 2)) * Math.PI / 2);
      var S = SCATTER[k], dx = P[0] - S[0], dy = P[1] - S[1], dl = Math.hypot(dx, dy) || 1;
      var px = -dy / dl, py = dx / dl, w = WANDER[k];
      PATH.push([S,
        [lerp(S[0], P[0], 0.33) + px * w[0], lerp(S[1], P[1], 0.33) + py * w[0]],
        [lerp(S[0], P[0], 0.66) + px * w[1], lerp(S[1], P[1], 0.66) + py * w[1]],
        P]);
    }
  })();

  // ---------- cut pieces ----------
  function resampleKeep(poly, N) {
    var n = poly.length, L = [], tot = 0, i;
    for (i = 0; i < n; i++) { var a = poly[i], b = poly[(i + 1) % n]; var l = Math.hypot(b[0] - a[0], b[1] - a[1]); L.push(l); tot += l; }
    var c = L.map(function (l) { return Math.max(1, Math.round(N * l / tot)); });
    var sum = c.reduce(function (x, y) { return x + y; }, 0);
    while (sum !== N) {
      var best = -1;
      for (i = 0; i < n; i++) {
        if (sum < N) { if (best < 0 || L[i] / c[i] > L[best] / c[best]) best = i; }
        else if (c[i] > 1) { if (best < 0 || L[i] / c[i] < L[best] / c[best]) best = i; }
      }
      c[best] += sum < N ? 1 : -1; sum += sum < N ? 1 : -1;
    }
    var out = [];
    for (i = 0; i < n; i++) {
      var p0 = poly[i], p1 = poly[(i + 1) % n];
      for (var j = 0; j < c[i]; j++) out.push([p0[0] + (p1[0] - p0[0]) * j / c[i], p0[1] + (p1[1] - p0[1]) * j / c[i]]);
    }
    return out;
  }
  function centred(pts) {
    var mx = 0, my = 0;
    pts.forEach(function (p) { mx += p[0]; my += p[1]; });
    mx /= pts.length; my /= pts.length;
    return { c: [mx, my], pts: pts.map(function (p) { return [p[0] - mx, p[1] - my]; }) };
  }
  var NP = 48;
  var rPiece = [[9, -H], [68, -H], [68, H], [27, 26.07]];
  for (var ai = 1; ai < 24; ai++) { var aa = RA + (-Math.PI / 2 - RA) * ai / 24; rPiece.push([9 + 57 * Math.cos(aa), -28 + 57 * Math.sin(aa)]); }
  var PIECE_DEFS = [
    { k: 0, poly: [[-H, -H], [H, -H], [0, 0]] },
    { k: 1, poly: [[71, -H], [71, H], [-14, 0]] },
    { k: 2, poly: [[-H, -H], [H, -H], [0, 0]] },
    { k: 3, poly: [[-74.5, -H], [-3.5, -H], [-74.5, H]] },
    { k: 3, poly: [[2.5, -H], [74.5, -H], [74.5, H]] },
    { k: 4, poly: rPiece }
  ];
  var TRI = centred(resampleKeep([[447, 237], [495, 285], [447, 333]], NP));
  var TRI_HOME = TRI.c;
  var G = [TRI_HOME[0], 30], GS = 1.8;

  // ---------- timeline after the letters land ----------
  function r2(x) { return Math.round(x * 100) / 100; }
  var TC = STOP[4] + 0.35;                        // cutting starts as the R finishes narrowing
  var CUT = [TC, TC + 0.1, TC + 0.2, TC + 0.3, TC + 0.4];
  var PD = 1.4;                                   // each piece lifts out and arcs up to the stack in one motion
  var T_SET = TC + 0.4 + PD - 0.4;                // the fanned stack closes into one triangle
  var T_LAND = T_SET + 0.8, LAND_D = 1.1;         // the triangle descends into the E
  var T_COLOR = T_LAND + 0.55, COLOR_D = 0.7;     // and turns blue as it settles
  var T_LINES = T_LAND + LAND_D + 0.05;           // construction lines draw out, hold, then fade
  var T_SLIDE = T_LINES + 1.75;                   // the triangle slides right; letters fade as it passes
  var SL_V = 650, SL_A = 1.1;                     // slide speed, reached gradually over SL_A seconds
  var FADE_D = 1.0;
  var T_ZOOM = T_SLIDE + 1.3, ZOOM_D = 3.4;       // the camera slowly closes in on the first M
  var T_MSQ = T_ZOOM + 2.1, MSQ_D = 1.4;          // the M eases back into the opening square
  var DURATION = r2(T_MSQ + MSQ_D + 0.35);
  var T_PAN = EXIT[0] - 0.5, PAN_D = STOP[4] - EXIT[0] + 0.2;

  function slideX(t) { var tau = t - T_SLIDE; return tau <= 0 ? 0 : SL_V * SL_A * eioArea(tau / SL_A); }
  var FADE_T = [Infinity];
  for (var fk = 1; fk < 5; fk++) {               // a letter starts fading when the triangle's tip reaches it
    var edge = SLOT_X[fk] - HALF[fk] - 495, lo = 0, hi = 10;
    if (edge <= 0) { FADE_T.push(T_SLIDE); continue; }
    for (var it = 0; it < 50; it++) { var mid = (lo + hi) / 2; if (slideX(T_SLIDE + mid) < edge) lo = mid; else hi = mid; }
    FADE_T.push(T_SLIDE + hi);
  }

  var PIECES = PIECE_DEFS.map(function (d, i) {
    var cc = centred(resampleKeep(d.poly, NP));
    var len = Math.hypot(cc.c[0], cc.c[1]) || 1;
    return { k: d.k, i: i, rel: cc.pts, c0: [SLOT_X[d.k] + cc.c[0], 285 + cc.c[1]], dir: [cc.c[0] / len, cc.c[1] / len],
      off: [(i - 2.5) * 9, -(5 - i) * 5], tc: CUT[d.k] };
  });

  // ---------- state ----------
  function morphAt(k, t) {
    var cur = SH.SQ, ev = MORPHS[k];
    for (var i = 0; i < ev.length; i++) {
      if (t < ev[i][0]) break;
      cur = mix(cur, SH[ev[i][2]], eio(prog(t, ev[i][0], ev[i][1])));
    }
    return cur;
  }
  function onRing(k, t, st) {
    var b = mergeB(k, t), s;
    if (b < 1) {
      var M = MERGE[k], f = (t - JOIN[k]) / JOIN_D * NM, i0 = Math.min(NM - 1, Math.floor(f));
      s = M.sw + M.tab[i0] + (M.tab[i0 + 1] - M.tab[i0]) * (f - i0);
    } else {
      s = base(t) - k * SP;
    }
    var p = ringAt(s), off = OUT * (1 - b);
    st.x = p.x + (p.x - X0) / R0 * off;
    st.y = p.y + (p.y - YC) / R0 * off;
    st.a = lerp(0, p.ph - ROT_OFF[k], b);
    st.s = RS;
    return st;
  }
  function car(k, t) {
    var st = { x: 0, y: 0, a: 0, s: 1, pts: SH.SQ, al: 1 };
    if (t < SETTLED[k]) {
      st.x = SCATTER[k][0]; st.y = SCATTER[k][1];
      st.pts = morphAt(k, t);
      return st;
    }
    if (t < JOIN[k]) {
      var p = esine(prog(t, DRIFT_START[k], JOIN[k] - DRIFT_START[k]));
      var pos = bez3(PATH[k], p);
      st.x = pos[0]; st.y = pos[1];
      st.a = LEAN[k] * (4 * Math.PI / 180) * Math.sin(Math.PI * p);
      st.s = lerp(1, RS, p);
      return st;
    }
    if (k < 5) {
      if (t < Math.min(EXIT[k], TBS[k])) return onRing(k, t, st);
      var sig = letterSig(k, t);
      if (sig < 0) {                               // the last cars start braking while still on the ring
        var q = ringAt(SB + sig);
        st.x = q.x; st.y = q.y; st.a = q.ph - ROT_OFF[k]; st.s = RS;
        return st;
      }
      var e = exitAt(sig);
      st.x = e.x; st.y = e.y; st.a = e.a;
      st.s = lerp(RS, 1, eio(clamp01(sig / 450)));
      st.pts = t >= CUT[k] ? SH[KIND[k]] : mix(SH.SQ, BLOCK[k], eio(prog(t, STOP[k] - 0.5, 0.85)));
      if (k === 0 && t > T_MSQ) st.pts = mix(SH.M, SH.SQ, eio(prog(t, T_MSQ, MSQ_D)));
      if (k > 0) st.al = 1 - eio(prog(t, FADE_T[k], FADE_D));
      return st;
    }
    if (t < XEXIT[k]) return onRing(k, t, st);
    var x = topExitAt(travelDist(t - XEXIT[k]));
    st.x = x.x; st.y = x.y; st.a = x.a; st.s = RS;
    return st;
  }
  var HERO_XY = SCATTER[HERO];
  var LN3 = Math.log(3);
  function camera(t) {
    var zp = eio(prog(t, 4.3, 1.8));
    var z = Math.exp(LN3 * (1 - zp));            // zoom evenly in scale, so the pull-back never rushes at the end
    var x = lerp(HERO_XY[0], CS[0], zp), y = lerp(HERO_XY[1], CS[1], zp);
    var pp = eio(prog(t, T_PAN, PAN_D));
    x = lerp(x, 655, pp); y = lerp(y, 285, pp);
    var q = eio(prog(t, T_ZOOM, ZOOM_D));
    if (q > 0) {                                   // zoom evenly in scale; the M glides steadily to the centre
      z = Math.exp(LN3 * q);
      x = SLOT_X[0] + (655 - SLOT_X[0]) * (1 - q) / z;
      y = 285;
    }
    return { x: x, y: y, z: z };
  }
  function piece(pc, t) {
    if (t < pc.tc) return null;
    var settle = eio(prog(t, T_SET, 0.7));
    var P3 = [G[0] + pc.off[0] * (1 - settle), G[1] + pc.off[1] * (1 - settle)];
    var P0 = pc.c0;
    var P1 = [P0[0] + pc.dir[0] * 70, P0[1] + pc.dir[1] * 70 - 40];
    var P2 = [P3[0] + (P0[0] - P3[0]) * 0.35, P3[1] - 110];
    var pos = bez3([P0, P1, P2, P3], eio(prog(t, pc.tc, PD)));
    var mo = eio(prog(t, pc.tc + 0.15, PD - 0.15));
    var sc = GS;
    var land = eio(prog(t, T_LAND, LAND_D));
    if (land > 0) { pos = [lerp(G[0], TRI_HOME[0], land), lerp(G[1], TRI_HOME[1], land)]; sc = lerp(GS, 1, land); }
    pos[0] += slideX(t);
    var tri = TRI.pts.map(function (q) { return [q[0] * sc, q[1] * sc]; });
    return { x: pos[0], y: pos[1], pts: mix(pc.rel, tri, mo), col: eio(prog(t, T_COLOR, COLOR_D)) };
  }

  function hex(h) { h = h.replace('#', ''); return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; }
  function mixCol(a, b, x) { var A = hex(a), B = hex(b); return 'rgb(' + Math.round(lerp(A[0], B[0], x)) + ',' + Math.round(lerp(A[1], B[1], x)) + ',' + Math.round(lerp(A[2], B[2], x)) + ')'; }

  function poly(ctx, pts) {
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (var i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.closePath();
    ctx.fill();
  }

  // Blueprint construction lines: the triangle's three edges extend outward like drafting guides, then fade.
  // Pass { lines: false } to render() for a plain, calm settle instead.
  var TA = [447, 237], TB2 = [495, 285], TCC = [447, 333], RT = Math.SQRT1_2;
  function drawLines(ctx, t, colors) {
    var g = eio(prog(t, T_LINES, 0.8)), f = 1 - eio(prog(t, T_LINES + 1.05, 0.7));
    if (g <= 0 || f <= 0) return;
    var L = 210 * g;
    var segs = [
      [TA, [TA[0], TA[1] - L]], [TCC, [TCC[0], TCC[1] + L]],
      [TB2, [TB2[0] + L * RT, TB2[1] + L * RT]], [TA, [TA[0] - L * RT, TA[1] - L * RT]],
      [TB2, [TB2[0] + L * RT, TB2[1] - L * RT]], [TCC, [TCC[0] - L * RT, TCC[1] + L * RT]]
    ];
    ctx.save();
    ctx.strokeStyle = colors.tri;
    ctx.fillStyle = colors.tri;
    ctx.globalAlpha = 0.6 * f;
    ctx.lineWidth = 1.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    segs.forEach(function (s) { ctx.moveTo(s[0][0], s[0][1]); ctx.lineTo(s[1][0], s[1][1]); });
    ctx.stroke();
    [TA, TB2, TCC].forEach(function (v) { ctx.beginPath(); ctx.arc(v[0], v[1], 3.2 * g, 0, Math.PI * 2); ctx.fill(); });
    ctx.restore();
  }

  function render(ctx, t, W, Hh, colors, opts) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.fillStyle = colors.bg;
    ctx.fillRect(0, 0, W, Hh);
    var cam = camera(t), sc = W / VBW * cam.z;
    var halfW = VBW / 2 / cam.z + 200, halfH = VBW * Hh / W / 2 / cam.z + 200;
    ctx.setTransform(sc, 0, 0, sc, W / 2 - cam.x * sc, Hh / 2 - cam.y * sc);
    if (!opts || opts.lines !== false) drawLines(ctx, t, colors);   // behind the letters, like guides under ink
    ctx.fillStyle = colors.shape;
    for (var k = 0; k < NCAR; k++) {
      var c = car(k, t);
      if (c.al <= 0.001) continue;
      if (Math.abs(c.x - cam.x) > halfW || Math.abs(c.y - cam.y) > halfH) continue;
      ctx.save();
      ctx.globalAlpha = c.al;
      ctx.translate(c.x, c.y);
      ctx.rotate(c.a);
      ctx.scale(c.s, c.s);
      poly(ctx, c.pts);
      ctx.restore();
    }
    PIECES.forEach(function (pc) {
      var p = piece(pc, t);
      if (!p) return;
      if (Math.abs(p.x - cam.x) > halfW) return;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.fillStyle = p.col > 0 ? mixCol(colors.shape, colors.tri, p.col) : colors.shape;
      poly(ctx, p.pts);
      ctx.restore();
    });
  }

  global.MemarFilm = {
    DURATION: DURATION,
    STAGES: [
      { name: 'Alone', a: 0, b: 4.3 },
      { name: 'Everyone alone', a: 4.3, b: 7.3 },
      { name: 'Realizing', a: 7.3, b: 9.0 },
      { name: 'Discovering', a: 9.0, b: 12.2 },
      { name: 'Harmony', a: 12.2, b: r2(EXIT[0]) },
      { name: 'Together', a: r2(EXIT[0]), b: r2(TC) },
      { name: 'Meaning', a: r2(TC), b: r2(T_COLOR) },
      { name: 'Activity', a: r2(T_COLOR), b: r2(T_SLIDE) },
      { name: 'Back to one', a: r2(T_SLIDE), b: DURATION }
    ],
    GROUNDS: {
      paper: { bg: '#F3F1EB', shape: '#111418', tri: '#1E6AB6' },
      ink: { bg: '#111418', shape: '#F3F1EB', tri: '#1E6AB6' },
      night: { bg: '#082F54', shape: '#F3F1EB', tri: '#5996D9' }
    },
    render: render
  };
})(typeof window !== 'undefined' ? window : this);
