// Episode scene. Pure function of time: window.__seek(t) sets the whole frame. No real-time animation.
// Look (colours, fonts, caption style) comes from THEME in theme.js; this file holds layout + timing only.
(async function () {
  const TH = window.THEME, C = TH.colors, NS = "http://www.w3.org/2000/svg";
  const params = new URLSearchParams(location.search);
  const COVER = params.has("cover");

  // ---------- theme -> CSS (fonts, vars) ----------
  let css = "";
  for (const k in TH.fonts) for (const f of TH.fonts[k].faces)
    css += `@font-face{font-family:"${TH.fonts[k].family}";font-weight:${f.weight};src:url(${f.url}) format("woff2");}\n`;
  const DISP = `"${TH.fonts.display.family}", sans-serif`, MONO = `"${TH.fonts.mono.family}", monospace`;
  css += `:root{--bg:${C.bg};--ink:${C.line};--key:${TH.caption.keyColor};--marker:${C.highlight};--numfont:${MONO}}\n`;
  document.getElementById("theme-css").textContent = css;
  await Promise.all([`700 64px ${DISP}`, `500 30px ${DISP}`, `700 30px ${MONO}`, `400 30px ${MONO}`].map(f => document.fonts.load(f)));
  await document.fonts.ready;

  const tl = await (await fetch("out/timeline.json")).json();
  const B = {}; tl.beats.forEach(b => (B[b.id] = b));
  const S = id => B[id].start, E = id => B[id].next;
  const W = (id, phrase) => {
    const b = B[id], i = b.vo.toLowerCase().indexOf(phrase.toLowerCase());
    if (i < 0) throw new Error("phrase not found: " + phrase);
    return b.start + (b.end - b.start) * i / b.vo.length;
  };
  const DUR = tl.duration;

  // ---------- helpers ----------
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const smooth = x => { x = clamp(x); return x * x * (3 - 2 * x); };
  const eio = x => { x = clamp(x); return x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
  const lerp = (a, b, u) => a + (b - a) * u;
  let seed = TH.ink.seed;
  const rnd = () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const svg = (tag, attrs, parent) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; };
  const f1 = n => n.toFixed(1);

  const stage = document.getElementById("stage");
  const items = [], dyns = [], layers = [], cues = [];
  const cue = (t, type, dur, extra) => cues.push(Object.assign({ t, type, dur }, extra || {}));

  // ---------- hand-inked geometry ----------
  function sub(a, b, step) {
    const n = Math.max(1, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / step)), out = [];
    for (let i = 0; i < n; i++) out.push([lerp(a[0], b[0], i / n), lerp(a[1], b[1], i / n)]);
    return out;
  }
  function wobble(pts, amp) { return pts.map(p => [p[0] + (rnd() - .5) * 2 * amp, p[1] + (rnd() - .5) * 2 * amp]); }
  function polyD(pts, closed, amp) {
    amp = amp == null ? TH.ink.wobble : amp;
    let out = [];
    const n = pts.length, segs = closed ? n : n - 1;
    for (let i = 0; i < segs; i++) out = out.concat(sub(pts[i], pts[(i + 1) % n], 60));
    if (!closed) out.push(pts[n - 1]);
    out = wobble(out, amp);
    if (!closed) { out[0] = pts[0]; out[out.length - 1] = pts[n - 1]; }
    return "M" + out.map(p => f1(p[0]) + " " + f1(p[1])).join("L") + (closed ? "Z" : "");
  }
  function smoothD(pts, closed) {
    const n = pts.length, P = i => closed ? pts[(i + n * 4) % n] : pts[Math.max(0, Math.min(n - 1, i))];
    let d = "M" + f1(P(0)[0]) + " " + f1(P(0)[1]);
    const segs = closed ? n : n - 1;
    for (let i = 0; i < segs; i++) {
      const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
      d += `C${f1(p1[0] + (p2[0] - p0[0]) / 6)} ${f1(p1[1] + (p2[1] - p0[1]) / 6)} ${f1(p2[0] - (p3[0] - p1[0]) / 6)} ${f1(p2[1] - (p3[1] - p1[1]) / 6)} ${f1(p2[0])} ${f1(p2[1])}`;
    }
    return d + (closed ? "Z" : "");
  }
  function circD(cx, cy, r, amp) {
    amp = amp == null ? TH.ink.wobble * .6 : amp;
    const n = Math.max(16, Math.min(40, Math.round(r / 5))), pts = [];
    const ph = rnd() * 6.28;
    for (let i = 0; i < n; i++) { const a = ph + i / n * 6.2832, rr = r + (rnd() - .5) * 2 * amp; pts.push([cx + rr * Math.cos(a), cy + rr * Math.sin(a)]); }
    return smoothD(pts, true);
  }

  // ---------- ink items (draw-on by stroke-dashoffset) ----------
  // o: t0,dur (draw-on; omit t0 for static), t1 (disappear), fill, color, w, dashed, sfx
  function raw(parent, d, o) {
    o = o || {};
    const p = svg("path", { d, fill: o.fill || "none", stroke: o.color || C.line, "stroke-width": o.w || TH.ink.width, "stroke-linecap": "round", "stroke-linejoin": "round" }, parent);
    const it = { el: p, t0: o.t0, dur: o.dur || .6, t1: o.t1, fill: !!o.fill, dashed: o.dashed, len: 0 };
    if (o.dashed) p.setAttribute("stroke-dasharray", o.dashed);
    it.len = p.getTotalLength();
    items.push(it);
    if (o.t0 != null && o.sfx !== false && it.dur >= .3 && it.len > 60) cue(o.t0, "scratch", Math.min(it.dur, 1.1));
    return it;
  }
  const Ln = (par, pts, o) => raw(par, polyD(pts, false), o);
  const Pg = (par, pts, o) => raw(par, polyD(pts, true), o);
  const Cc = (par, x, y, r, o) => raw(par, circD(x, y, r), o);
  const Rc = (par, x, y, w, h, o) => Pg(par, [[x, y], [x + w, y], [x + w, y + h], [x, y + h]], o);
  function Ar(par, x1, y1, x2, y2, o) {
    const a = Math.atan2(y2 - y1, x2 - x1), h = (o && o.head) || 26;
    const d = polyD([[x1, y1], [x2, y2]], false) +
      `M${f1(x2 - h * Math.cos(a - .45))} ${f1(y2 - h * Math.sin(a - .45))}L${f1(x2)} ${f1(y2)}L${f1(x2 - h * Math.cos(a + .45))} ${f1(y2 - h * Math.sin(a + .45))}`;
    return raw(par, d, o);
  }
  // text: o.t0 fade-in (pop = scale slam), o.t1 hide, o.fn(t)->string
  function Tx(par, str, x, y, o) {
    o = o || {};
    const e = svg("text", { x, y, "text-anchor": o.anchor || "middle", "font-family": o.mono ? MONO : DISP, "font-weight": o.weight || (o.mono ? 700 : 700),
      "font-size": o.size || 32, fill: o.color || C.line }, par);
    e.textContent = str;
    const it = { text: e, t0: o.t0, t1: o.t1, pop: o.pop, x, y, fn: o.fn, rot: o.rot || 0 };
    items.push(it);
    return e;
  }
  const grp = (par, attrs) => svg("g", attrs || {}, par);
  function layer(ranges) { const g = grp(world); layers.push({ g, ranges }); return g; }

  function updateItems(t) {
    for (const it of items) {
      const vis = (it.t0 == null || t >= it.t0) && (it.t1 == null || t < it.t1);
      if (it.text) {
        const e = it.text;
        if (!vis) { e.setAttribute("opacity", 0); continue; }
        if (it.fn) e.textContent = it.fn(t);
        let a = it.t0 == null ? 1 : clamp((t - it.t0) / (it.pop ? .08 : .25));
        e.setAttribute("opacity", a);
        if (it.pop) {
          const s = it.t0 == null ? 1 : lerp(2.2, 1, 1 - Math.pow(1 - clamp((t - it.t0) / .14), 3));
          e.setAttribute("transform", `translate(${it.x} ${it.y}) rotate(${it.rot}) scale(${s}) translate(${-it.x} ${-it.y})`);
        } else if (it.rot) e.setAttribute("transform", `rotate(${it.rot} ${it.x} ${it.y})`);
        continue;
      }
      const e = it.el;
      if (!vis) { e.setAttribute("opacity", 0); continue; }
      e.setAttribute("opacity", 1);
      const p = it.t0 == null ? 1 : clamp((t - it.t0) / it.dur);
      if (it.dashed) { e.setAttribute("opacity", it.t0 == null ? 1 : smooth(p)); }
      else { const q = it.t0 == null ? 1 : 1 - Math.pow(1 - p, 2); e.style.strokeDasharray = it.len + 1; e.style.strokeDashoffset = (it.len + 1) * (1 - q); }
      if (it.fill) e.setAttribute("fill-opacity", it.t0 == null ? 1 : smooth((p - .5) / .5));
    }
  }

  // ---------- world, background grid, camera ----------
  const bgRect = svg("rect", { x: 0, y: 0, width: 1080, height: 1920, fill: C.bg }, stage);
  const world = svg("g", {}, stage);
  const overlay = svg("g", {}, stage);
  {
    const g = TH.background.grid, sz = g.size; let d = "";
    for (let x = -1800; x <= 3000; x += sz) d += `M${x} -3000L${x} 4200`;
    for (let y = -3000; y <= 4200; y += sz) d += `M-1800 ${y}L3000 ${y}`;
    svg("path", { d, stroke: g.color, "stroke-width": g.width, fill: "none" }, world);
  }
  const kfs = []; let cur;
  const cut = (t, s) => { cur = Object.assign({ x: 540, y: 740, z: 1 }, s); kfs.push(Object.assign({ t, cut: true }, cur)); };
  const move = (t0, t1, d) => { kfs.push(Object.assign({ t: t0 }, cur)); cur = Object.assign({}, cur, d); kfs.push(Object.assign({ t: t1 }, cur)); };
  function camAt(t) {
    if (!kfs.sorted) { kfs.forEach((k, i) => (k.i = i)); kfs.sort((a, b) => a.t - b.t || a.i - b.i); kfs.sorted = true; }
    let i = 0; for (let k = 0; k < kfs.length; k++) { if (kfs[k].t <= t) i = k; else break; }
    const a = kfs[i], b = kfs[i + 1];
    if (!b || b.cut || t <= a.t) return a;
    const u = eio((t - a.t) / (b.t - a.t));
    return { x: lerp(a.x, b.x, u), y: lerp(a.y, b.y, u), z: lerp(a.z, b.z, u) };
  }

  // ---------- reusable drawings ----------
  // clock: face + 12 ticks + hands. o.phase(t)->deg for second hand; o.min = static minute-hand angle
  function clock(par, cx, cy, r, o) {
    const g = grp(par), t0 = o.t0;
    Cc(g, cx, cy, r, { fill: C.faceFill, t0, dur: o.dur || .5, w: o.w });
    let d = "";
    for (let i = 0; i < 12; i++) {
      const a = i * Math.PI / 6, r1 = r * (i % 3 ? .82 : .74), r2 = r * .93;
      d += `M${f1(cx + r1 * Math.sin(a))} ${f1(cy - r1 * Math.cos(a))}L${f1(cx + r2 * Math.sin(a))} ${f1(cy - r2 * Math.cos(a))}`;
    }
    raw(g, d, { t0: t0 == null ? null : t0 + .2, dur: .4, w: 3, sfx: false });
    const tH = t0 == null ? null : t0 + .45;
    const mh = svg("line", { x1: cx, y1: cy, x2: cx, y2: cy - r * .5, stroke: C.line, "stroke-width": Math.max(4, r * .07), "stroke-linecap": "round", transform: `rotate(${o.min || 40} ${cx} ${cy})` }, g);
    const sh = svg("line", { x1: cx, y1: cy + r * .12, x2: cx, y2: cy - r * .8, stroke: o.handColor || C.line, "stroke-width": Math.max(3, r * .045), "stroke-linecap": "round" }, g);
    const dot = svg("circle", { cx, cy, r: Math.max(4, r * .07), fill: C.line }, g);
    dyns.push(t => {
      const v = tH == null || t >= tH;
      mh.setAttribute("opacity", v ? 1 : 0); sh.setAttribute("opacity", v ? 1 : 0); dot.setAttribute("opacity", v ? 1 : 0);
      sh.setAttribute("transform", `rotate(${f1(o.phase(t))} ${cx} ${cy})`);
    });
    return g;
  }
  const hand = (cx, cy, r, a, k) => [cx + r * Math.sin(a * Math.PI / 180), cy - r * Math.cos(a * Math.PI / 180)];

  // figure in local coords: feet at (0,0), head centre (0,-545) r58. o.t0 draw-on start or undefined = static
  function figure(par, o) {
    const g = grp(par, { transform: `translate(${o.x} ${o.y}) scale(${o.s || 1})` }), t0 = o.t0, d = o.dur || .8;
    const T = k => t0 == null ? undefined : t0 + k * d;
    Ln(g, [[-22, -200], [-28, -100], [-30, -22]], { w: 22, color: C.pants, t0: T(0), dur: d * .3, sfx: false });
    Ln(g, [[22, -200], [28, -100], [36, -22]], { w: 22, color: C.pants, t0: T(0), dur: d * .3, sfx: false });
    Pg(g, [[-48, -22], [6, -22], [38, -10], [38, 2], [-48, 2]], { fill: C.line, t0: T(.1), dur: d * .3, sfx: false });
    Pg(g, [[-30, -22], [24, -22], [54, -10], [54, 2], [-30, 2]].map(p => [p[0] + 10, p[1]]), { fill: C.line, t0: T(.1), dur: d * .3, sfx: false });
    Pg(g, [[-42, -482], [42, -482], [52, -250], [42, -190], [-42, -190], [-52, -250]], { fill: C.shirt, t0: T(.25), dur: d * .5, sfx: o.sfx });
    Ln(g, [[0, -460], [34, -340], [78, -280]], { w: 14, t0: T(.5), dur: d * .3, sfx: false });
    Ln(g, [[0, -490], [0, -480]], { w: 6, t0: T(.4), dur: .1, sfx: false });
    Cc(g, 0, -545, 58, { fill: C.faceFill, t0: T(.6), dur: d * .4, sfx: false });
    Cc(g, 20, -552, 4, { fill: C.line, t0: T(.9), dur: .2, sfx: false, w: 2 });
    return g;
  }
  function stairs(par, x0, yBase, n, w, h, o) {
    const pts = [[x0, yBase]];
    for (let i = 0; i < n; i++) { pts.push([x0 + w * i, yBase - h * (i + 1)], [x0 + w * (i + 1), yBase - h * (i + 1)]); }
    pts.push([x0 + w * n, yBase]);
    return Pg(par, pts, o);
  }
  function ruleCard(par, x, y, w, h, o) {
    // o.stampT, o.l1T, o.l2T, o.l3T, o.ulT or all undefined for static; o.sign
    const st = o.static ? undefined : null;
    Rc(par, x, y, w, h, { fill: C.faceFill, t0: o.cardT, dur: .6, w: 6 });
    const sx = x + 50, sy = y + 120;
    Rc(par, sx - 20, sy - 62, 392, 84, { color: C.red, w: 6, t0: o.stampT, dur: .25, sfx: false });
    Tx(par, "RULE NO. 1", sx + 176, sy, { mono: true, size: 56, color: C.red, anchor: "middle", t0: o.stampT, pop: true });
    if (o.stampT != null) cue(o.stampT, "thud", .4);
    const lines = [["The higher you are,", o.l1T], ["the faster your time", o.l2T], ["runs.", o.l3T]];
    const fs = 66, base = y + 250, lh = 100;
    lines.forEach((ln, i) => {
      const e = Tx(par, ln[0], x + 50, base + i * lh, { anchor: "start", size: fs, t0: ln[1] });
      const maxW = w - 100, tl_ = e.getComputedTextLength();
      if (tl_ > maxW) e.setAttribute("font-size", fs * maxW / tl_);
      if (i === 1) { // colour + underline "faster"
        const idx = ln[0].indexOf("faster");
        const a = e.getStartPositionOfChar(idx).x, b = e.getEndPositionOfChar(idx + 5).x;
        const it = items.find(z => z.text === e);
        e.textContent = ""; // rebuild with tspans for colour
        const t1 = svg("tspan", {}, e); t1.textContent = ln[0].slice(0, idx);
        const t2 = svg("tspan", { fill: C.red }, e); t2.textContent = "faster";
        const t3 = svg("tspan", {}, e); t3.textContent = ln[0].slice(idx + 6);
        it.fn = null;
        Ln(par, [[a, base + lh + 14], [b, base + lh + 12]], { color: C.red, w: 9, t0: o.ulT, dur: .5 });
      }
    });
    if (o.sign) Tx(par, TH.brand, x + w - 40, y + h - 36, { anchor: "end", size: 34, weight: 500, color: C.graphite, t0: o.signT });
  }

  // ======================================================================
  //  COVER MODE
  // ======================================================================
  if (COVER) {
    const L = layer([[0, 1e9]]);
    const hl = [["Your head is", 0], ["older", 1], ["than your feet", 2]];
    const sz = 138; let lx = 70;
    hl.forEach((h, i) => {
      const e = Tx(L, h[0], lx, 410 + i * 160, { anchor: "start", size: sz, color: i === 1 ? C.red : C.line });
      const w = e.getComputedTextLength(); if (lx + w > TH.safe.right) e.setAttribute("font-size", sz * (TH.safe.right - lx) / w);
      if (i === 1) { const wd = e.getComputedTextLength(); Ln(L, [[lx, 410 + 160 + 26], [lx + wd, 410 + 160 + 22]], { color: C.red, w: 16 }); }
    });
    Rc(L, 70, 190, 372, 56, { w: 4, color: C.line });
    Tx(L, TH.brand.toUpperCase(), 256, 229, { mono: true, size: 28 });
    const fx = 540, fy = 1390;
    figure(L, { x: fx, y: fy, s: .62 });
    clock(L, fx, fy - 603 * .62 - 130, 96, { phase: t => 300, min: 200 });
    window.__cues = []; window.__seek = t => { layers.forEach(l => l.g.setAttribute("display", "inline")); world.setAttribute("transform", "translate(540 740) translate(-540 -740)"); updateItems(1e9); dyns.forEach(f => f(0)); document.getElementById("cap").style.opacity = 0; };
    // feet clock beside the foot, hands set to show head ahead
    const fcl = clock(L, fx + 190, fy - 70, 70, { phase: t => 100, min: 160 });
    Tx(L, "HEAD", fx - 130, fy - 603 * .62 - 120, { mono: true, size: 26, color: C.graphite, anchor: "end" });
    Tx(L, "FEET", fx + 190, fy + 40, { mono: true, size: 26, color: C.graphite });
    window.__ready = true; return;
  }

  // ======================================================================
  //  EPISODE
  // ======================================================================
  // ---- scene A: figure + head/feet clocks (b01-b02, b05, b15) ----
  const HX = 540, HCY = 300, FCY = 1160, FIGY = 1010;
  const A = layer([[0, S("b03")], [S("b05"), S("b06")], [S("b15"), 1e9]]);
  const phHead = t => 75 + 6 * 1.35 * t * 1.0 + 0, phFeet = t => 10 + 6 * t;
  figure(A, { x: HX, y: FIGY });
  clock(A, HX, HCY, 80, { phase: phHead, min: 90, w: 5 });
  clock(A, HX, FCY, 80, { phase: phFeet, min: 90 });
  Tx(A, "HEAD", HX - 105, HCY + 10, { mono: true, size: 28, color: C.graphite, anchor: "end" });
  Tx(A, "FEET", HX - 105, FCY + 10, { mono: true, size: 28, color: C.graphite, anchor: "end" });
  Ln(A, [[HX, HCY + 82], [HX, FIGY - 603 + 5]], { w: 3, color: C.graphite, dashed: "8 8" });
  Ln(A, [[HX, FIGY + 12], [HX, FCY - 82]], { w: 3, color: C.graphite, dashed: "8 8" });
  // red lead arc on the head clock: how far the head hand is ahead of the feet hand
  const lead = svg("path", { fill: "none", stroke: C.red, "stroke-width": 7, "stroke-linecap": "round" }, A);
  dyns.push(t => {
    const a0 = phFeet(t), a1 = phHead(t), diff = ((a1 - a0) % 360 + 360) % 360, R = 80 * .6;
    const p0 = hand(HX, HCY, R, a0), p1 = hand(HX, HCY, R, a1);
    lead.setAttribute("d", `M${f1(p0[0])} ${f1(p0[1])}A${R} ${R} 0 ${diff > 180 ? 1 : 0} 1 ${f1(p1[0])} ${f1(p1[1])}`);
  });
  Tx(A, "ahead", HX + 118, HCY - 30, { mono: true, size: 28, color: C.red, anchor: "start" });
  // b02 counter above head clock
  const cdig = t => (t >= W("b02", "a tiny bit") ? "1" : "0");
  Tx(A, "", HX, HCY - 108, { mono: true, size: 30, color: C.line, t0: S("b02") + .1, t1: S("b03"),
    fn: t => "head +0.000 000 000 00" + cdig(t) + " s" });
  // b05 underline under HEAD label on "faster"
  Ln(A, [[HX - 168, HCY + 26], [HX - 105, HCY + 24]], { color: C.red, w: 8, t0: W("b05", "faster"), dur: .35, t1: S("b06") });
  // b15 hair
  Ln(A, [[HX - 4, FIGY - 603], [HX - 14, FIGY - 640], [HX + 10, FIGY - 668], [HX - 2, FIGY - 700]].map(p => p), { w: 5, t0: W("b15", "By a hair"), dur: .35 });
  cut(0, { x: 540, y: 740, z: 1 });
  move(S("b02"), S("b02") + .7, { y: 340 });
  move(S("b02") + .7, E("b02") - .1, { z: 1.8 });
  cut(S("b05"), { x: 540, y: 1100, z: 1 });
  move(W("b05", "Your head is"), W("b05", "So your head's"), { y: 420 });

  // ---- scene B: Earth + gravity + compressing grid (b03) ----
  const Bl = layer([[S("b03"), S("b04")]]);
  svg("rect", { x: -200, y: -200, width: 1500, height: 1700, fill: C.bg }, Bl);
  const GY = 1120;
  const hl_ = []; const N = 15;
  for (let i = 1; i <= N; i++) hl_.push(svg("line", { x1: -100, x2: 1200, stroke: C.graphite, "stroke-width": 2.5, opacity: .6 }, Bl));
  for (let x = 0; x <= 1080; x += 90) svg("line", { x1: x, x2: x, y1: 100, y2: GY, stroke: C.grid, "stroke-width": 3 }, Bl);
  const tc = W("b03", "It slows");
  dyns.push(t => {
    const k = smooth((t - tc) / 1.5);
    hl_.forEach((l, j) => { const s = (j + 1) / N, yu = GY - 1000 * s, yb = GY - 1000 * Math.pow(s, 2.1), y = lerp(yu, yb, k); l.setAttribute("y1", y); l.setAttribute("y2", y); });
  });
  raw(Bl, circD(540, GY + 1580, 1580, 2), { fill: C.ground, w: 6, t0: S("b03") + .1, dur: 1.0 });
  Tx(Bl, "EARTH", 540, GY + 90, { mono: true, size: 34, color: C.line, t0: S("b03") + 1.0 });
  [300, 540, 780].forEach((x, i) => {
    Ar(Bl, x, 470, x, 1040, { w: 8, head: 40, t0: W("b03", "Gravity") + i * .18, dur: .7 });
  });
  Tx(Bl, "GRAVITY", 540, 420, { mono: true, size: 34, color: C.graphite, t0: W("b03", "Gravity") });
  Tx(Bl, "time runs slower here", 540, GY - 40, { mono: true, size: 26, color: C.red, weight: 700, t0: tc + 1.2 });
  cut(S("b03"), { x: 540, y: 740, z: 1 });

  // ---- scene C: column of 4 clocks (b04) ----
  const Cl = layer([[S("b04"), S("b05")]]);
  const cys = [1100, 820, 540, 260], speeds = [80, 160, 270, 420];
  Ln(Cl, [[100, 1210], [980, 1210]], { w: 6, t0: S("b04") });
  for (let i = 0; i < 6; i++) Ln(Cl, [[130 + i * 150, 1214], [100 + i * 150, 1250]], { w: 3, color: C.graphite, t0: S("b04") + .2 });
  cys.forEach((y, i) => {
    const t0 = S("b04") + .15 + i * .5;
    clock(Cl, 540, y, 88, { t0, phase: t => speeds[i] * (t - S("b04")), min: 60 + i * 20 });
    Ln(Cl, [[540, y + 90], [540, i ? y + 190 - 0 : 1210]], { w: 3, color: C.graphite, dashed: "8 8", t0: t0 + .3 });
  });
  Ar(Cl, 790, 1150, 790, 230, { w: 5, color: C.graphite, t0: S("b04") + .3, dur: 1.6 });
  Tx(Cl, "faster", 770, 190, { mono: true, size: 38, color: C.line, anchor: "end", t0: W("b04", "the slower") });
  Tx(Cl, "slower", 810, 1170, { mono: true, size: 38, color: C.line, anchor: "start", t0: S("b04") + .5 });
  Tx(Cl, "speeds exaggerated", 540, 1320, { mono: true, size: 26, color: C.graphite, weight: 400, t0: S("b04") + 1.2 });
  cut(S("b04"), { x: 540, y: 900, z: 1 });
  move(S("b04") + 1.0, E("b04") - .2, { y: 470 });

  // ---- scene D: lab bench, clocks, stairs (b06-b08) ----
  const D = layer([[S("b06"), S("b09")]]);
  const TY = 1010;
  const t6 = S("b06");
  Ln(D, [[80, TY], [960, TY]], { w: 8, t0: t6 + .3, dur: .8 });
  Ln(D, [[80, TY], [80, TY + 44], [960, TY + 44], [960, TY]], { w: 4, t0: t6 + .8, dur: .8 });
  Ln(D, [[150, TY + 44], [150, TY + 190]], { w: 6, t0: t6 + 1.3, dur: .4 });
  Ln(D, [[560, TY + 44], [560, TY + 190]], { w: 6, t0: t6 + 1.5, dur: .4 });
  const tRaise0 = W("b07", "raised"), tRaise1 = W("b07", "Two steps") - .2, tFast = tRaise1;
  const boxW = 150, boxH = 130;
  function atomic(par, cxFn, cyFn, t0, phaseFn, tag) {
    const g = grp(par);
    Rc(g, -boxW / 2, -boxH, boxW, boxH, { fill: C.faceFill, t0, dur: .7, sfx: true });
    Cc(g, 0, -boxH / 2 - 8, 38, { t0: t0 + .5, dur: .4, w: 4, fill: C.faceFill });
    const sh = svg("line", { x1: 0, y1: -boxH / 2 - 8, x2: 0, y2: -boxH / 2 - 8 - 32, stroke: C.line, "stroke-width": 4, "stroke-linecap": "round" }, g);
    Ln(g, [[-boxW / 2 + 16, -18], [boxW / 2 - 16, -18]], { w: 4, color: C.graphite, t0: t0 + .7, dur: .3, sfx: false });
    dyns.push(t => { g.setAttribute("transform", `translate(${f1(cxFn(t))} ${f1(cyFn(t))})`); sh.setAttribute("transform", `rotate(${f1(phaseFn(t))} 0 ${-boxH / 2 - 8})`); sh.setAttribute("opacity", t >= t0 + .8 ? 1 : 0); });
    return g;
  }
  const xA = 280, xB0 = 450;
  const bx = t => { const u = eio((t - tRaise0) / (tRaise1 - tRaise0)); return u; };
  const posB = t => { const u = clamp((t - tRaise0) / (tRaise1 - tRaise0)); const e = eio(u);
    // two hops: floor -> step1 -> step2
    if (u <= 0) return [xB0, TY]; if (u >= 1) return [830, TY - 120];
    const seg = u < .5 ? [xB0, TY, 690, TY - 60, eio(u / .5)] : [690, TY - 60, 830, TY - 120, eio((u - .5) / .5)];
    const hop = Math.sin(((u < .5 ? u / .5 : (u - .5) / .5)) * Math.PI) * 24;
    return [lerp(seg[0], seg[2], seg[4]), lerp(seg[1], seg[3], seg[4]) - hop]; };
  atomic(D, () => xA, () => TY, t6 + 2.2, t => 120 + 70 * (t - t6), "A");
  atomic(D, t => posB(t)[0], t => posB(t)[1], t6 + 3.0, t => 60 + 70 * (t - t6) + 70 * 0.8 * Math.max(0, t - tFast), "B");
  // stairs + dimension line in b07
  stairs(D, 620, TY, 2, 140, 60, { fill: C.ground, w: 5, t0: W("b07", "raised"), dur: .8, t1: 1e9 });
  const tDim = W("b07", "Two steps") + .3;
  Ar(D, 915, TY - 120, 915, TY - 6, { w: 4, color: C.graphite, head: 16, t0: tDim, dur: .5 });
  Ar(D, 915, TY - 6, 915, TY - 120, { w: 4, color: C.graphite, head: 16, t0: tDim, dur: .5, sfx: false });
  Tx(D, "33 cm ≈ 1 ft", 930, TY + 85, { mono: true, size: 30, color: C.line, anchor: "end", t0: tDim + .4 });
  // b06 stamp
  Rc(D, 250, 240, 580, 120, { color: C.red, w: 8, t0: W("b06", "in 2010"), dur: .15, t1: S("b07") + 1.5, sfx: false });
  Tx(D, "2010 · NIST", 540, 322, { mono: true, size: 62, color: C.red, t0: W("b06", "in 2010"), t1: S("b07") + 1.5, pop: true, rot: -2 });
  cue(W("b06", "in 2010"), "thud", .4);
  // b08 tick spray
  [["A", xA, TY - boxH, 1.6], ["B", 830, TY - 120 - boxH, 3.0]].forEach(([nm, cx, cy, rate]) => {
    const t8 = S("b08"), n = Math.floor((E("b08") - t8) * rate) + 1;
    for (let i = 0; i < n; i++) {
      const ti = t8 + i / rate, ang = (-90 + (rnd() - .5) * 110) * Math.PI / 180;
      const l = svg("line", { stroke: C.line, "stroke-width": 5, "stroke-linecap": "round" }, D);
      const x0 = cx + (nm === "A" ? 0 : 0), y0 = cy - 4;
      dyns.push(t => { const p = (t - ti) / .8; if (p < 0 || p > 1) { l.setAttribute("opacity", 0); return; }
        const r1 = 20 + p * 90, r2 = r1 + 22;
        l.setAttribute("x1", x0 + r1 * Math.cos(ang)); l.setAttribute("y1", y0 + r1 * Math.sin(ang));
        l.setAttribute("x2", x0 + r2 * Math.cos(ang)); l.setAttribute("y2", y0 + r2 * Math.sin(ang));
        l.setAttribute("opacity", 1 - p * p); });
    }
  });
  Ln(D, [[740, TY - 100], [920, TY - 104]], { color: C.red, w: 9, t0: W("b08", "higher clock"), dur: .5, t1: S("b09") });
  cut(t6, { x: 540, y: 740, z: 1 });

  // ---- scene E: 79-year timeline, zoom to the gap (b09-b10) ----
  const Ee = layer([[S("b09"), S("b11")]]);
  const LY = 700, tl0 = S("b09") + .25, tl1 = W("b09", "those two steps");
  Ln(Ee, [[90, LY], [890, LY]], { w: 5, t0: tl0, dur: tl1 - tl0 });
  Ln(Ee, [[90, LY - 24], [90, LY + 24]], { w: 5, t0: tl0, dur: .2, sfx: false });
  Tx(Ee, "79 years", 490, LY - 50, { mono: true, size: 46, t0: W("b09", "seventy"), });
  // gap segment: red, shrinks to a dot in b10
  const gap = svg("path", { stroke: C.red, "stroke-width": 5, "stroke-linecap": "round", fill: "none" }, Ee);
  const tShrink0 = S("b10") + .1, tShrink1 = S("b10") + 1.3, tGap = W("b09", "about ninety") - .6;
  dyns.push(t => { const k = smooth((t - tShrink0) / (tShrink1 - tShrink0)), L_ = 7 * (1 - k);
    gap.setAttribute("d", `M890 ${LY}L${890 + L_} ${LY}`); gap.setAttribute("opacity", t >= tGap ? 1 : 0); });
  Tx(Ee, "≈ 0.000 000 09 s", 893, LY - 16, { mono: true, size: 7, color: C.line, t0: W("b09", "about ninety"), t1: tShrink0 });
  Tx(Ee, "90 billionths of a second", 893, LY + 24, { mono: true, size: 5, color: C.graphite, weight: 400, t0: W("b09", "ninety"), t1: tShrink0 });
  cut(S("b09"), { x: 540, y: LY, z: 1 });
  move(tl0, tl1, { x: 893 });
  move(tl1 + .1, W("b09", "ninety") + .5, { z: 5 });
  move(W("b10", "But real"), W("b10", "But real") + 1.0, { z: 1 });

  // ---- scene F: GPS satellite (b11) ----
  const F = layer([[S("b11"), S("b12")]]);
  const EC = [540, 2750];
  raw(F, circD(EC[0], EC[1], 1650, 2), { fill: C.ground, w: 6, t0: S("b11") + .1, dur: 1.0 });
  raw(F, circD(EC[0], EC[1], 2330, 0), { color: C.graphite, w: 5, dashed: "26 20", t0: S("b11") + .5, dur: 1.0 });
  // phone on ground
  Rc(F, 515, 1032, 50, 72, { fill: C.faceFill, t0: S("b11") + .1, dur: .5, sfx: false });
  Ln(F, [[523, 1090], [557, 1090]], { w: 3, t0: S("b11") + .5, dur: .1, sfx: false });
  Ln(F, [[540, 1020], [540, 500]], { w: 5, color: C.red, dashed: "10 16", t0: W("b11", "your phone"), dur: .8, sfx: false });
  const SX = 540, SY = 420;
  Rc(F, SX - 45, SY - 35, 90, 70, { fill: C.faceFill, t0: W("b11", "GPS"), dur: .8 });
  Rc(F, SX - 190, SY - 22, 130, 44, { fill: C.shirt, t0: W("b11", "GPS") + .3, dur: .5, sfx: false });
  Rc(F, SX + 60, SY - 22, 130, 44, { fill: C.shirt, t0: W("b11", "GPS") + .3, dur: .5, sfx: false });
  Ln(F, [[SX - 45, SY], [SX - 60, SY]], { w: 4, t0: W("b11", "GPS") + .3, dur: .1, sfx: false });
  Ln(F, [[SX + 45, SY], [SX + 60, SY]], { w: 4, t0: W("b11", "GPS") + .3, dur: .1, sfx: false });
  clock(F, SX, SY, 26, { t0: W("b11", "clocks run"), dur: .4, phase: t => 700 * (t - S("b11")), w: 4 });
  Tx(F, "GPS", SX + 215, SY + 18, { mono: true, size: 58, anchor: "start", t0: W("b11", "GPS") });
  cut(S("b11"), { x: 540, y: 1000, z: 1.5 });
  move(S("b11") + .3, W("b11", "GPS satellites"), { z: .8 });
  move(W("b11", "GPS satellites") + .1, W("b11", "clocks run") - .1, { y: 560 });

  // ---- scene G: set slow before launch (b12a) ----
  const G = layer([[S("b12"), W("b12", "Without")]]);
  const g0 = S("b12");
  Ln(G, [[80, 1000], [960, 1000]], { w: 8, t0: g0, dur: .6 });
  Ln(G, [[80, 1000], [80, 1044], [960, 1044], [960, 1000]], { w: 4, t0: g0 + .3, dur: .6, sfx: false });
  Rc(G, 290, 760, 270, 240, { fill: C.faceFill, t0: g0 + .4, dur: .8 });
  const tSlow0 = W("b12", "set them"), tSlow1 = W("b12", "on the ground");
  const dialPhase = t => { let a = 0; const t0_ = g0 + 1.2; for (let s = t0_; s < t; s += 1 / 60) { const k = smooth((s - tSlow0) / (tSlow1 - tSlow0)); a += lerp(480, 100, k) / 60; } return a; };
  clock(G, 425, 860, 70, { t0: g0 + 1.0, phase: dialPhase, min: 30 });
  // knob + hand
  const kx = 495, ky = 960;
  Cc(G, kx, ky, 26, { fill: C.marker, t0: g0 + 1.4, dur: .4, sfx: false });
  const notch = svg("line", { x1: kx, y1: ky, x2: kx, y2: ky - 24, stroke: C.line, "stroke-width": 5, "stroke-linecap": "round" }, G);
  const hg = grp(G); // ink hand reaching the knob from the right, rotating with it
  Pg(hg, [[0, -22], [78, -26], [96, -10], [96, 22], [66, 30], [0, 24]], { fill: C.faceFill, w: 4, sfx: false });
  Ln(hg, [[60, -22], [88, -2]], { w: 3, sfx: false }); Ln(hg, [[64, 6], [92, 6]], { w: 3, sfx: false });
  Ln(hg, [[96, 40], [180, 60]], { w: 22, color: C.shirt, sfx: false });
  dyns.push(t => { const k = smooth((t - tSlow0) / (tSlow1 - tSlow0)), a = -150 * k; const vis = t >= g0 + 1.6;
    notch.setAttribute("transform", `rotate(${f1(a)} ${kx} ${ky})`); notch.setAttribute("opacity", t >= g0 + 1.4 ? 1 : 0);
    hg.setAttribute("opacity", vis ? 1 : 0);
    hg.setAttribute("transform", `translate(${kx} ${ky}) rotate(${f1(a * .5 + 40)}) translate(34 0)`); });
  Tx(G, "set slow before launch", 520, 690, { mono: true, size: 36, t0: W("b12", "before launch") - 1.0 });
  // ---- scene H: street-grid map with pin (b12b) ----
  const Hh = layer([[W("b12", "Without"), S("b13")]]);
  const h0 = W("b12", "Without");
  svg("rect", { x: -200, y: -200, width: 1500, height: 2200, fill: C.bg }, Hh);
  [100, 400, 700].forEach((x, i) => [330, 630, 930].forEach((y, j) => Rc(Hh, x, y, 230, 230, { fill: C.ground, w: 4, t0: h0 + .05 * (i * 3 + j), dur: .35, sfx: i + j === 0 })));
  const tDrift0 = W("b12", "your map"), tDrift1 = W("b12", "would be wrong") + .5, tSnap = E("b12") - .45;
  const pin = grp(Hh);
  Pg(pin, [[0, 0], [-24, -46], [-18, -72], [0, -82], [18, -72], [24, -46]], { fill: C.red, w: 4, sfx: false });
  Cc(pin, 0, -56, 8, { fill: C.faceFill, w: 2, sfx: false });
  const ghost = svg("path", { stroke: C.red, "stroke-width": 5, "stroke-dasharray": "10 12", "stroke-linecap": "round", fill: "none" }, Hh);
  const P0 = [365, 790], P1 = [530, 760];
  dyns.push(t => {
    const kd = smooth((t - tDrift0) / (tDrift1 - tDrift0)), ks = eio((t - tSnap) / .35);
    const k = kd * (1 - ks);
    pin.setAttribute("transform", `translate(${f1(lerp(P0[0], P1[0], k))} ${f1(lerp(P0[1], P1[1], k) - 10 * Math.sin(Math.PI * clamp((t - tSnap) / .35)))})`);
    pin.setAttribute("opacity", t >= h0 + .8 ? 1 : 0);
    ghost.setAttribute("d", `M${P0[0]} ${P0[1]}L${f1(lerp(P0[0], P1[0], kd))} ${f1(lerp(P0[1], P1[1], kd))}`);
    ghost.setAttribute("opacity", (kd > 0 && t < tSnap + .35) ? 1 : 0);
  });
  cut(S("b12"), { x: 540, y: 740, z: 1 });

  // ---- scene I: rule card (b13) ----
  const I = layer([[S("b13"), S("b14")]]);
  svg("rect", { x: -200, y: -200, width: 1500, height: 2200, fill: C.bg }, I);
  ruleCard(I, 70, 360, 880, 520, { cardT: S("b13"), h2: 1, stampT: S("b13") + .1, l1T: W("b13", "The higher"), l2T: W("b13", "the faster"), l3T: W("b13", "time runs"), ulT: W("b13", "faster") + .05 });
  cut(S("b13"), { x: 540, y: 740, z: 1 });

  // ---- scene J: climbing stairs (b14) ----
  const J = layer([[S("b14"), S("b15")]]);
  svg("rect", { x: -200, y: -200, width: 1500, height: 2200, fill: C.bg }, J);
  const SB = 1150, SW = 150, SH = 80, SX0 = 140, nst = 4;
  stairs(J, SX0, SB, nst, SW, SH, { fill: C.ground, w: 6, t0: S("b14"), dur: .9 });
  Ln(J, [[SX0 - 30, SB], [SX0 + SW * nst + 60, SB]], { w: 6, t0: S("b14"), dur: .5, sfx: false });
  const arr = i => S("b14") + .5 + i * .95;
  const figJ = figure(J, { x: 0, y: 0, s: 1 });
  figJ.setAttribute("transform", "translate(0 0)");
  const stepPos = i => [SX0 + SW * i + SW / 2, SB - SH * (i + 1)];
  dyns.push(t => {
    let i = 0; while (i < nst - 1 && t >= arr(i + 1) - .4) i++;
    let x, y; const p = stepPos(i);
    if (i < nst - 1 && t > arr(i + 1) - .4 - 0) { x = p[0]; y = p[1]; } else { x = p[0]; y = p[1]; }
    // hop between steps
    let j = -1; for (let k = 0; k < nst - 1; k++) if (t >= arr(k + 1) - .4 && t < arr(k + 1)) j = k;
    if (j >= 0) { const u = eio((t - (arr(j + 1) - .4)) / .4), a = stepPos(j), b = stepPos(j + 1); x = lerp(a[0], b[0], u); y = lerp(a[1], b[1], u) - Math.sin(u * Math.PI) * 30; }
    else if (i === nst - 1 || t >= arr(i + 1) - .4) { const q = stepPos(Math.min(i, nst - 1)); x = q[0]; y = q[1]; }
    figJ.setAttribute("transform", `translate(${f1(x)} ${f1(y)}) scale(.36)`);
  });
  for (let i = 0; i < nst; i++) {
    const a = arr(i), pp = stepPos(i), e = Tx(J, "+", pp[0] + 62, pp[1] - 150, { mono: true, size: 64, color: C.red, t0: a, t1: a + 1.0, pop: true });
    cue(a, "pop", .1);
    dyns.push(t => { const u = clamp((t - a) / 1.0); e.setAttribute("y", pp[1] - 150 - 40 * u); });
  }
  cut(S("b14"), { x: 540, y: 740, z: 1 });

  // scene A again for b15
  cut(S("b15"), { x: 540, y: 740, z: 1 });
  move(W("b15", "By a hair") - .6, W("b15", "By a hair") + .2, { y: 560 });

  // ---- end card overlay ----
  const tEnd = DUR - 1.0;
  const endBg = svg("rect", { x: 0, y: 0, width: 1080, height: 1920, fill: C.bg }, overlay);
  ruleCard(overlay, 70, 330, 880, 600, { sign: true });

  // ---- sound cues for ticking clocks ----
  cue(0.3, "tick", 0, { t1: E("b03"), rate: 2 });
  cue(S("b04"), "tick", 0, { t1: E("b04"), rate: 3 });
  cue(S("b05"), "tick", 0, { t1: E("b05"), rate: 2 });
  cue(S("b07") + 3, "tick", 0, { t1: E("b08"), rate: 2 });
  cue(S("b11") + 1.5, "tick", 0, { t1: E("b11"), rate: 4 });
  cue(S("b12") + 1.5, "tick", 0, { t1: W("b12", "Without"), rate: 2 });
  cue(S("b15"), "tick", 0, { t1: DUR - 1.0, rate: 2 });

  // ---------- captions ----------
  const CP = TH.caption, capEl = document.getElementById("cap");
  const allCaps = [];
  tl.beats.forEach(b => b.captions.forEach(c => allCaps.push(Object.assign({ beat: b.id }, c))));
  const NUMW = /^(\d[\d.,]*|two|seventy-nine|ninety|2010)$/i;
  function wrapLines(words) {
    const lines = []; let c = "";
    for (const w of words) { if (c && (c + " " + w).length > CP.maxLineChars) { lines.push(c); c = w; } else c = c ? c + " " + w : w; }
    if (c) lines.push(c); return lines;
  }
  let capCache = null;
  function buildCaption(c) {
    const words = c.text.split(" "); let idx = 0, html = "";
    const lines = wrapLines(words);
    lines.forEach(ln => {
      html += '<span class="ln"><span class="bk">';
      ln.split(" ").forEach((w, wi) => {
        const bare = w.replace(/[^\w-]/g, "");
        const prev = idx > 0 ? words[idx - 1].toLowerCase() : "";
        const isNum = NUMW.test(bare) || (bare.toLowerCase() === "one" && prev === "number");
        const cls = [isNum ? "num" : "", idx === c.key ? "key " + (CP.variants[c.beat] || "") : ""].join(" ").trim();
        html += (wi ? " " : "") + (cls ? `<span class="${cls}">${w}</span>` : w);
        idx++;
      });
      html += "</span></span>";
    });
    capEl.innerHTML = html;
    const fam = TH.fonts[CP.font].family;
    capEl.style.fontFamily = `"${fam}", sans-serif`; capEl.style.fontWeight = CP.weight; capEl.style.color = CP.color;
    capEl.style.left = CP.left + "px"; capEl.style.width = (1080 - CP.left - CP.right) + "px";
    let size = CP.size; capEl.style.fontSize = size + "px"; capEl.style.lineHeight = CP.lineHeight;
    capEl.querySelectorAll(".bk").forEach(b => { b.style.background = CP.backing; b.style.padding = `${CP.padY}px ${CP.padX}px`; b.style.borderRadius = CP.radius + "px"; b.style.boxDecorationBreak = "clone"; });
    const maxW = 1080 - CP.left - CP.right;
    while (size > 44 && Math.max(...[...capEl.querySelectorAll(".bk")].map(b => b.getBoundingClientRect().width)) > maxW) { size -= 2; capEl.style.fontSize = size + "px"; }
    const h = capEl.getBoundingClientRect().height;
    capEl.style.top = (CP.bottomY - h) + "px";
  }
  function setCaption(t) {
    let c = null;
    for (const k of allCaps) if (t >= k.start && t < k.end + .12) c = k;
    if (!c) { capEl.style.opacity = 0; capCache = null; return; }
    if (capCache !== c) { buildCaption(c); capCache = c; }
    capEl.style.opacity = clamp((t - c.start) / .09);
  }

  // ---------- seek ----------
  window.__seek = function (t) {
    const cam = camAt(t);
    world.setAttribute("transform", `translate(540 740) scale(${cam.z.toFixed(4)}) translate(${(-cam.x).toFixed(2)} ${(-cam.y).toFixed(2)})`);
    layers.forEach(l => l.g.setAttribute("display", l.ranges.some(r => t >= r[0] && t < r[1]) ? "inline" : "none"));
    updateItems(t);
    dyns.forEach(f => f(t));
    const ok = clamp((t - tEnd) / .3);
    overlay.setAttribute("display", ok > 0 ? "inline" : "none"); overlay.setAttribute("opacity", ok);
    setCaption(t);
  };
  // thin the cue list: no two scratches within 0.3 s
  cues.sort((a, b) => a.t - b.t);
  const thin = []; let lastS = -9;
  for (const c of cues) { if (c.type === "scratch") { if (c.t - lastS < .3) continue; lastS = c.t; } thin.push(c); }
  window.__cues = thin;
  window.__duration = DUR;
  window.__seek(0);
  window.__ready = true;
})();
