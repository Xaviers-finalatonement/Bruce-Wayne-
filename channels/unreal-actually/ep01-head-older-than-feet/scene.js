// Episode scene ("Unreal, Actually" look). Canvas 2D, a pure function of time: window.__seek(t) draws the whole frame.
// Look (colours, fonts, caption style, grain/vignette) comes from THEME in theme.js; this file holds layout + timing.
(async function () {
  const TH = window.THEME, C = TH.colors;
  const params = new URLSearchParams(location.search);
  const COVER = params.has("cover");

  // ---------- fonts ----------
  let css = "";
  for (const k in TH.fonts) for (const f of TH.fonts[k].faces)
    css += `@font-face{font-family:"${TH.fonts[k].family}";font-weight:${f.weight};src:url(${f.url}) format("woff2");}\n`;
  css += `:root{--bg:${C.bg};--key:${TH.caption.keyColor}}\n`;
  document.getElementById("theme-css").textContent = css;
  const ANTON = `"${TH.fonts.display.family}", sans-serif`, BARL = `"${TH.fonts.body.family}", sans-serif`;
  await Promise.all([`400 100px ${ANTON}`, `800 60px ${BARL}`, `500 30px ${BARL}`].map(f => document.fonts.load(f)));
  await document.fonts.ready;

  const tl = await (await fetch("out/timeline.json")).json();
  const B = {}; tl.beats.forEach(b => (B[b.id] = b));
  const S = id => B[id].start, E = id => B[id].next, END = id => B[id].end;
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
  const eo3 = x => 1 - Math.pow(1 - clamp(x), 3);
  const eob = x => { x = clamp(x); const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
  const lerp = (a, b, u) => a + (b - a) * u;
  const hash = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  const hexRGB = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const col = (h, a = 1) => { const c = hexRGB(h); return `rgba(${c[0]},${c[1]},${c[2]},${a})`; };
  const HOT = C.horizon, UV = C.ultraviolet, TXT = C.static, HAZE = C.haze, ABY = C.abyss;

  const cv = document.getElementById("stage"), ctx = cv.getContext("2d");
  const cues = [];
  const cue = (t, type, extra) => cues.push(Object.assign({ t, type }, extra || {}));

  // ---------- camera ----------
  const kfs = []; let curK;
  const cut = (t, s) => { curK = Object.assign({ x: 540, y: 700, z: 1 }, s); kfs.push(Object.assign({ t, cut: true }, curK)); };
  const move = (t0, t1, d) => { kfs.push(Object.assign({ t: t0 }, curK)); curK = Object.assign({}, curK, d); kfs.push(Object.assign({ t: t1 }, curK)); };
  const cuts = [];
  function camAt(t) {
    if (!kfs.sorted) { kfs.forEach((k, i) => (k.i = i)); kfs.sort((a, b) => a.t - b.t || a.i - b.i); kfs.sorted = true; }
    let i = 0; for (let k = 0; k < kfs.length; k++) { if (kfs[k].t <= t) i = k; else break; }
    const a = kfs[i], b = kfs[i + 1];
    if (!b || b.cut || t <= a.t) return a;
    const u = eio((t - a.t) / (b.t - a.t));
    return { x: lerp(a.x, b.x, u), y: lerp(a.y, b.y, u), z: lerp(a.z, b.z, u) };
  }
  const shakes = [];
  const shake = (t, amp, dur) => shakes.push({ t, amp, dur: dur || .4 });
  function shakeAt(t) {
    let x = 0, y = 0;
    for (const s of shakes) { const d = t - s.t; if (d < 0 || d > s.dur) continue; const k = Math.pow(1 - d / s.dur, 2) * s.amp, f = Math.floor(d * 60);
      x += (hash(f * 3 + s.t * 7) - .5) * 2 * k; y += (hash(f * 5 + s.t * 11) - .5) * 2 * k; }
    return [x, y];
  }
  let SHK = [0, 0], CAM = { x: 540, y: 700, z: 1 };
  function useCam(par) {
    const z = Math.pow(CAM.z, par);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.translate(540 + SHK[0], 700 + SHK[1]); ctx.scale(z, z); ctx.translate(-CAM.x * par - (1 - par) * 540 * 0, -CAM.y * par);
    // for par<1 the layer's own origin sits at the screen pivot, so shift it back
    if (par < 1) ctx.translate(0, 0);
  }
  const screenSpace = () => { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.translate(SHK[0], SHK[1]); };

  // ---------- drawing primitives ----------
  function add(fn) { ctx.save(); ctx.globalCompositeOperation = "lighter"; fn(); ctx.restore(); }
  function glowLine(pts, color, w, glow, alpha) {
    ctx.save(); ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
    if (glow) { ctx.globalAlpha = (alpha == null ? 1 : alpha) * .35; ctx.strokeStyle = color; ctx.lineWidth = w + glow; ctx.shadowColor = color; ctx.shadowBlur = glow * 1.6; ctx.stroke(); }
    ctx.globalAlpha = alpha == null ? 1 : alpha; ctx.shadowBlur = 0; ctx.strokeStyle = color; ctx.lineWidth = w; ctx.stroke();
    ctx.restore();
  }
  function disc(x, y, r, color, alpha) { ctx.save(); ctx.globalAlpha = alpha == null ? 1 : alpha; ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y, r, 0, 6.2832); ctx.fill(); ctx.restore(); }
  function bloom(x, y, r, color, a) {
    add(() => { const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, col(color, a)); g.addColorStop(.35, col(color, a * .35)); g.addColorStop(1, col(color, 0));
      ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2); });
  }
  function rrect(x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }
  function txt(s, x, y, o) {
    o = o || {}; ctx.save();
    ctx.font = `${o.w || 400} ${o.size || 40}px ${o.f || ANTON}`;
    ctx.textAlign = o.align || "center"; ctx.textBaseline = o.base || "alphabetic"; ctx.letterSpacing = (o.ls || 0) + "px";
    ctx.globalAlpha = o.a == null ? 1 : o.a;
    ctx.translate(x, y); if (o.rot) ctx.rotate(o.rot); if (o.sc) ctx.scale(o.sc, o.sc);
    if (o.glow) { ctx.shadowColor = o.gcol || o.color || TXT; ctx.shadowBlur = o.glow; }
    ctx.fillStyle = o.color || TXT; ctx.fillText(s, 0, 0);
    if (o.glow) { ctx.shadowBlur = o.glow * .5; ctx.fillText(s, 0, 0); }
    ctx.restore();
  }
  // fit a headline line to a target width -> font size
  function fitSize(s, targetW, maxSize) { ctx.save(); ctx.font = `400 100px ${ANTON}`; ctx.letterSpacing = "0px"; const w = ctx.measureText(s).width; ctx.restore(); return Math.min(maxSize || 999, 100 * targetW / w); }
  // fixed-pitch numbers (Barlow tabular): draws char by char, digits on a fixed pitch
  function tabText(s, x, y, size, color, align, weight) {
    ctx.save(); ctx.font = `${weight || 800} ${size}px ${BARL}`; ctx.textBaseline = "alphabetic"; ctx.fillStyle = color;
    const pitch = ctx.measureText("0").width; let w = 0; const adv = [];
    for (const ch of s) { const a = /[0-9]/.test(ch) ? pitch : ctx.measureText(ch).width; adv.push(a); w += a; }
    let cx = align === "center" ? x - w / 2 : align === "right" ? x - w : x; ctx.textAlign = "center";
    [...s].forEach((ch, i) => { ctx.fillText(ch, cx + adv[i] / 2, y); cx += adv[i]; });
    ctx.restore(); return w;
  }
  const slam = (t, t0, d) => { const u = (t - t0) / (d || .16); return u < 0 ? null : { sc: 1 + 1.5 * (1 - eo3(u)), a: .35 + .65 * clamp((t - t0) / .05) }; };
  function ringPulse(x, y, r0, r1, u, color, w) { if (u <= 0 || u >= 1) return; ctx.save(); ctx.globalAlpha = (1 - u) * .9; ctx.strokeStyle = color; ctx.lineWidth = (w || 5) * (1 - u * .6); ctx.shadowColor = color; ctx.shadowBlur = 24;
    ctx.beginPath(); ctx.arc(x, y, lerp(r0, r1, eo3(u)), 0, 6.2832); ctx.stroke(); ctx.restore(); }

  // ---------- ambience: dust, beams, backdrop dial ----------
  const DUST = []; for (let i = 0; i < 110; i++) DUST.push({ x: hash(i) * 1500 - 210, y: hash(i + 300) * 2300 - 200, r: .8 + hash(i + 600) * 2.2, p: hash(i + 900), sp: 6 + hash(i + 1200) * 16, c: hash(i + 1500) });
  function dust(t, par, count, alpha) {
    ctx.save(); useCam(par);
    for (let i = 0; i < count && i < DUST.length; i++) { const d = DUST[i]; if ((i % 2 === 0) !== (par > .35)) continue;
      const y = ((d.y - t * d.sp * par) % 2300 + 2300) % 2300 - 200, tw = .5 + .5 * Math.sin(t * 1.5 + d.p * 20);
      disc(d.x, y, d.r * (par > .35 ? 1.4 : 1), d.c > .8 ? HOT : d.c > .4 ? UV : TXT, alpha * (.35 + .65 * tw) * (.4 + par)); }
    ctx.restore();
  }
  function beam(x0, y0, x1, y1, w0, w1, color, a) {
    add(() => { const ang = Math.atan2(y1 - y0, x1 - x0), nx = -Math.sin(ang), ny = Math.cos(ang);
      const g = ctx.createLinearGradient(x0, y0, x1, y1); g.addColorStop(0, col(color, a)); g.addColorStop(1, col(color, 0));
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x0 + nx * w0, y0 + ny * w0); ctx.lineTo(x1 + nx * w1, y1 + ny * w1); ctx.lineTo(x1 - nx * w1, y1 - ny * w1); ctx.lineTo(x0 - nx * w0, y0 - ny * w0); ctx.fill(); });
  }
  function backdrop(cx, cy, r, color, a) { const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r); g.addColorStop(0, col(color, a)); g.addColorStop(1, col(color, 0)); ctx.fillStyle = g; ctx.fillRect(cx - r, cy - r, r * 2, r * 2); }
  // big ghost dial used as a backdrop (rotating ticks)
  function ghostDial(cx, cy, r, t, a, color) {
    ctx.save(); ctx.translate(cx, cy); ctx.strokeStyle = color || UV; ctx.globalAlpha = a; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, 6.2832); ctx.stroke(); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(0, 0, r * .86, 0, 6.2832); ctx.stroke();
    ctx.rotate(t * .03); for (let i = 0; i < 120; i++) { ctx.rotate(6.2832 / 120); const L = i % 10 === 0 ? r * .12 : i % 5 === 0 ? r * .07 : r * .035; ctx.beginPath(); ctx.moveTo(r * .98, 0); ctx.lineTo(r * (.98) - L, 0); ctx.lineWidth = i % 10 === 0 ? 4 : 2; ctx.stroke(); }
    ctx.restore();
  }

  // ---------- the human silhouette (pre-rendered, rim-lit) ----------
  function catmull(pts) {
    const n = pts.length, p = new Path2D(), P = i => pts[(i + n * 4) % n];
    p.moveTo(P(0)[0], P(0)[1]);
    for (let i = 0; i < n; i++) { const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
      p.bezierCurveTo(p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6, p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6, p2[0], p2[1]); }
    p.closePath(); return p;
  }
  const mir = pts => pts.map(p => [-p[0], p[1]]).reverse();
  const PARTS = (() => {
    const head = [[0, -702], [26, -694], [39, -668], [36, -636], [21, -611], [0, -603], [-21, -611], [-36, -636], [-39, -668], [-26, -694]];
    const neck = [[-17, -625], [17, -625], [21, -572], [-21, -572]];
    const torso = [[-17, -592], [-52, -586], [-88, -572], [-102, -544], [-98, -506], [-82, -470], [-72, -420], [-63, -370], [-67, -330], [-73, -296], [-40, -282], [0, -279], [40, -282], [73, -296], [67, -330], [63, -370], [72, -420], [82, -470], [98, -506], [102, -544], [88, -572], [52, -586], [17, -592]];
    const armL = [[-90, -566], [-108, -546], [-116, -490], [-121, -420], [-125, -352], [-123, -308], [-118, -280], [-106, -268], [-95, -278], [-91, -312], [-90, -360], [-87, -420], [-84, -474], [-82, -520]];
    const legL = [[-72, -300], [-3, -300], [-4, -250], [-9, -190], [-16, -110], [-22, -34], [-58, -34], [-61, -100], [-67, -170], [-73, -240]];
    const footL = [[-61, -40], [-22, -40], [-18, -14], [-26, -2], [-70, -1], [-74, -14]];
    return [head, neck, torso, armL, mirArm(armL), legL, mirArm(legL), footL, mirArm(footL)];
    function mirArm(a) { return mir(a); }
  })();
  const HUM = { S: 2, w: 330, h: 760, ox: 165, oy: 736 };
  const humanCanvas = (() => {
    const mk = () => { const c = document.createElement("canvas"); c.width = HUM.w * HUM.S; c.height = HUM.h * HUM.S; const x = c.getContext("2d"); x.setTransform(HUM.S, 0, 0, HUM.S, HUM.ox * HUM.S, HUM.oy * HUM.S); return [c, x]; };
    const shape = (x, dx, dy, style) => { x.save(); x.translate(dx, dy); x.fillStyle = style; PARTS.forEach(pp => x.fill(catmull(pp))); x.restore(); };
    const [body, bx] = mk(), [rim, rx] = mk(), [uv, ux] = mk(), [out, ox] = mk();
    const g = bx.createLinearGradient(0, -700, 0, 0); g.addColorStop(0, "#1f1832"); g.addColorStop(.5, "#130f20"); g.addColorStop(1, "#0b0914");
    shape(bx, 0, 0, g);
    // orange hard rim on the right (and a touch on the head top), violet rim low-left
    shape(rx, 0, 0, HOT); rx.globalCompositeOperation = "destination-out"; shape(rx, -9, 3, "#000");
    shape(ux, 0, 0, UV); ux.globalCompositeOperation = "destination-out"; shape(ux, 6, -3, "#000");
    // composite: glow, body, violet, rim
    ox.setTransform(1, 0, 0, 1, 0, 0);
    ox.filter = "blur(16px)"; ox.globalAlpha = .75; ox.drawImage(rim, 0, 0); ox.filter = "none"; ox.globalAlpha = 1;
    ox.drawImage(body, 0, 0); ox.globalAlpha = .55; ox.drawImage(uv, 0, 0); ox.globalAlpha = 1; ox.drawImage(rim, 0, 0);
    return out;
  })();
  const reflCanvas = (() => { const c = document.createElement("canvas"); c.width = HUM.w * HUM.S; c.height = 420 * HUM.S; const x = c.getContext("2d");
    x.scale(1, -1); x.drawImage(humanCanvas, 0, -HUM.oy * HUM.S); x.setTransform(1, 0, 0, 1, 0, 0);
    x.globalCompositeOperation = "destination-in"; const g = x.createLinearGradient(0, 0, 0, c.height); g.addColorStop(0, "rgba(0,0,0,.32)"); g.addColorStop(1, "rgba(0,0,0,0)"); x.fillStyle = g; x.fillRect(0, 0, c.width, c.height); return c; })();
  // feet at (x,y), scale s
  function human(x, y, s, o) {
    o = o || {}; ctx.save(); ctx.globalAlpha = o.a == null ? 1 : o.a;
    ctx.translate(x, y); ctx.scale(s * (o.flip ? -1 : 1), s * (o.sy || 1));
    ctx.drawImage(humanCanvas, -HUM.ox, -HUM.oy, HUM.w, HUM.h); ctx.restore();
  }

  // ---------- luminous clock ----------
  const tickEase = f => (f < .16 ? eob(f / .16) : 1);
  const secAngle = s => 6 * (Math.floor(s) + tickEase(s - Math.floor(s)));
  function clock(cx, cy, r, o) {
    o = o || {}; const ac = o.color || HOT, s = o.s || 0, hot = o.hot == null ? 1 : o.hot, al = o.a == null ? 1 : o.a;
    ctx.save(); ctx.globalAlpha = al;
    bloom(cx, cy, r * 2.2, ac, .22 * hot);
    // bezel
    ctx.shadowColor = ac; ctx.shadowBlur = r * .55 * hot; ctx.lineWidth = r * .1; ctx.strokeStyle = ac;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, 6.2832); ctx.stroke(); ctx.shadowBlur = 0;
    // face
    const g = ctx.createRadialGradient(cx - r * .25, cy - r * .3, r * .05, cx, cy, r);
    g.addColorStop(0, "#2a2142"); g.addColorStop(.7, "#120e1f"); g.addColorStop(1, "#0a0812");
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, r * .95, 0, 6.2832); ctx.fill();
    ctx.strokeStyle = col(TXT, .16); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(cx, cy, r * .72, 0, 6.2832); ctx.stroke();
    // ticks
    for (let i = 0; i < 60; i++) { const a = i * Math.PI / 30, big = i % 5 === 0, r1 = r * (big ? .76 : .84), r2 = r * .9;
      ctx.strokeStyle = big ? TXT : col(HAZE, .85); ctx.lineWidth = big ? Math.max(2, r * .05) : Math.max(1, r * .018);
      ctx.beginPath(); ctx.moveTo(cx + r1 * Math.sin(a), cy - r1 * Math.cos(a)); ctx.lineTo(cx + r2 * Math.sin(a), cy - r2 * Math.cos(a)); ctx.stroke(); }
    // hands
    const hand = (ang, len, w, color, tail, glow) => { const a = ang * Math.PI / 180; ctx.save(); ctx.lineCap = "round"; ctx.strokeStyle = color; ctx.lineWidth = w;
      if (glow) { ctx.shadowColor = color; ctx.shadowBlur = glow; }
      ctx.beginPath(); ctx.moveTo(cx - tail * Math.sin(a), cy + tail * Math.cos(a)); ctx.lineTo(cx + len * Math.sin(a), cy - len * Math.cos(a)); ctx.stroke(); ctx.restore(); };
    const m0 = o.min0 == null ? 70 : o.min0, h0 = o.hr0 == null ? 300 : o.hr0;
    hand(h0 + s * .02, r * .44, r * .075, TXT, r * .06, 0);
    hand(m0 + s * .15, r * .66, r * .052, TXT, r * .08, 0);
    const sa = o.angle != null ? o.angle : secAngle(s);
    if (o.trail) { ctx.save(); ctx.strokeStyle = col(ac, .35); ctx.lineWidth = r * .1; ctx.lineCap = "butt"; ctx.beginPath(); const a1 = (sa - 90) * Math.PI / 180; ctx.arc(cx, cy, r * .5, a1 - o.trail, a1); ctx.stroke(); ctx.restore(); }
    hand(sa, r * .84, Math.max(2.5, r * .028), ac, r * .2, r * .3 * hot);
    disc(cx, cy, r * .07, ac); disc(cx, cy, r * .03, ABY);
    // glass sheen
    ctx.globalAlpha = al * .07; ctx.fillStyle = TXT; ctx.beginPath(); ctx.ellipse(cx - r * .2, cy - r * .5, r * .6, r * .25, -.5, 0, 6.2832); ctx.fill();
    ctx.restore();
  }

  // ---------- scene-time constants ----------
  const tHookEnd = END("b01") + .1;
  const FX = 410, FY = 1240, FS = .74;                // figure: feet position + scale
  const HEADC = [FX, FY - 648 * FS];                  // head centre
  const CLH = [815, 830], CLF = [815, 1135], CLR = 90; // head / feet clocks
  const sFeet = t => 3.3 + t, boost = t => Math.max(0, t - W("b05", "faster")) * .9;
  const sHead = t => 9.6 + t * 1.15 + boost(t) + (t > S("b05") ? (t - S("b05")) * .3 : 0);
  const tIn = (t, a, b) => t >= a && t < b;

  // =====================================================================
  //  SHOT A: the figure with head and feet clocks (b01, b02, b05, b15)
  // =====================================================================
  function stageFloor(y, t, a) {
    ctx.save(); useCam(1);
    // floor glow + receding lines
    add(() => { const g = ctx.createRadialGradient(FX, y, 10, FX, y, 520); g.addColorStop(0, col(HOT, .26 * a)); g.addColorStop(.4, col(UV, .1 * a)); g.addColorStop(1, col(UV, 0));
      ctx.save(); ctx.translate(0, y); ctx.scale(1, .22); ctx.translate(0, -y); ctx.fillStyle = g; ctx.fillRect(-100, y - 560, 1300, 1120); ctx.restore(); });
    ctx.lineWidth = 2;
    for (let i = 0; i < 12; i++) { const yy = y + 6 + Math.pow(i, 1.9) * 15; const g = ctx.createLinearGradient(80, 0, 1000, 0); g.addColorStop(0, col(UV, 0)); g.addColorStop(.5, col(UV, Math.max(0, .5 - i * .04) * a)); g.addColorStop(1, col(UV, 0));
      ctx.strokeStyle = g; ctx.beginPath(); ctx.moveTo(60, yy); ctx.lineTo(1020, yy); ctx.stroke(); }
    for (let i = -6; i <= 6; i++) { const g = ctx.createLinearGradient(0, y, 0, y + 700); g.addColorStop(0, col(UV, .35 * a)); g.addColorStop(1, col(UV, 0));
      ctx.strokeStyle = g; ctx.beginPath(); ctx.moveTo(FX + i * 30, y + 4); ctx.lineTo(FX + i * 170, y + 700); ctx.stroke(); }
    ctx.restore();
  }
  function sceneA(t, mode) {
    // back layer: soft violet haze + beam from the upper right, ghost dial
    ctx.save(); useCam(.5); backdrop(560, 760, 900, C.deep, .6);
    ghostDial(FX + 40, 760, 560, t, .09, UV); ctx.restore();
    ctx.save(); useCam(.8); beam(1000, -200, 520, 1000, 90, 260, TXT, .07); beam(900, -200, 300, 900, 40, 160, UV, .06); ctx.restore();
    ctx.save(); useCam(1);
    stageFloor(FY, t, 1);
    // reflection
    ctx.drawImage(reflCanvas, FX - HUM.ox * FS, FY + 3, HUM.w * FS, 420 * FS);
    human(FX, FY, FS);
    // light flare on the head rim
    bloom(FX + 24 * FS, HEADC[1] - 20, 130, HOT, .22 + .05 * Math.sin(t * 3));
    // connector + ruler
    ctx.setLineDash([6, 10]); glowLine([[FX + 52, HEADC[1]], [CLH[0] - CLR - 190, CLH[1]]], col(HAZE, .7), 2, 0);
    glowLine([[FX + 48, FY - 24], [CLF[0] - CLR - 190, CLF[1] + 10]], col(HAZE, .7), 2, 0); ctx.setLineDash([]);
    glowLine([[CLH[0], CLH[1] + CLR + 16], [CLH[0], CLF[1] - CLR - 16]], col(UV, .55), 3, 8);
    for (let i = 0; i <= 8; i++) { const yy = lerp(CLH[1] + CLR + 16, CLF[1] - CLR - 16, i / 8); glowLine([[CLH[0] - (i % 4 ? 8 : 15), yy], [CLH[0] + (i % 4 ? 8 : 15), yy]], col(UV, .6), 2, 0); }
    // clocks
    const rise = tIn(t, W("b05", "Your head is"), W("b05", "So your head's"));
    const sh = sHead(t), sf = sFeet(t);
    clock(CLH[0], CLH[1], CLR, { s: sh, color: HOT, hot: 1, min0: 70, hr0: 20, trail: t > W("b05", "faster") ? 1.1 : 0 });
    clock(CLF[0], CLF[1], CLR, { s: sf, color: UV, hot: .75, min0: 70, hr0: 20 });
    txt("HEAD", CLH[0] - CLR - 34, CLH[1] + 14, { f: BARL, w: 800, size: 40, ls: 6, color: HOT, align: "right", glow: 10 });
    txt("FEET", CLF[0] - CLR - 34, CLF[1] + 14, { f: BARL, w: 800, size: 40, ls: 6, color: UV, align: "right", glow: 10 });
    // lead arc on the head clock: how far ahead the head hand is
    { const a0 = secAngle(sf), a1 = secAngle(sh), diff = (((a1 - a0) % 360) + 360) % 360, R = CLR * 1.2, an = x => (x - 90) * Math.PI / 180;
      ctx.save(); ctx.strokeStyle = HOT; ctx.lineWidth = 6; ctx.lineCap = "round"; ctx.shadowColor = HOT; ctx.shadowBlur = 16; ctx.beginPath(); ctx.arc(CLH[0], CLH[1], R, an(a1 - diff), an(a1)); ctx.stroke(); ctx.restore();
      const aT = tIn(t, 0, S("b03")) ? 1 : 0;
      if (aT) { const pa = an(a1 - diff / 2); const px = CLH[0] + (R + 62) * Math.cos(pa), py = CLH[1] + (R + 62) * Math.sin(pa);
        const ya = (CLH[1] + CLF[1]) / 2 + 12;
        txt("AHEAD", CLH[0] - 44, ya, { f: BARL, w: 800, size: 36, ls: 5, color: HOT, glow: 10, align: "right", a: smooth((t - .5) / .3) });
        } }
    // pulses on b05 words
    ringPulse(CLF[0], CLF[1], CLR, CLR + 90, (t - W("b05", "Your feet")) / .8, UV, 6);
    ringPulse(CLH[0], CLH[1], CLR, CLR + 90, (t - W("b05", "Your head is")) / .8, HOT, 6);
    ringPulse(CLH[0], CLH[1], CLR, CLR + 130, (t - W("b05", "faster")) / .9, HOT, 7);
    // b02 counter
    if (tIn(t, S("b02") + .05, S("b03"))) {
      const u = smooth((t - S("b02") - .05) / .25), a = u * (1 - smooth((t - (S("b03") - .3)) / .3));
      const roll = t >= W("b02", "a tiny bit"), cy = CLH[1] - CLR - 138;
      ctx.save(); ctx.globalAlpha = a; rrect(640 - 300, cy - 50, 600, 88, 14); ctx.fillStyle = col(ABY, .85); ctx.fill(); ctx.strokeStyle = col(HOT, .8); ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
      ctx.save(); ctx.globalAlpha = a;
      const str = "head +0.000 000 000 00" + (roll ? "1" : "0") + " s";
      tabText(str, 640, cy + 14, 42, roll && t < W("b02", "a tiny bit") + .25 ? TXT : HOT, "center"); ctx.restore();
      ringPulse(640 + 175, cy - 6, 8, 70, (t - W("b02", "a tiny bit")) / .6, HOT, 4);
    }
    // b15 hair
    if (t >= W("b15", "By a hair") - .2) {
      const u = eo3((t - W("b15", "By a hair") + .2) / .7), hx = HEADC[0], hy = HEADC[1] - 46 * FS * 1.3;
      const pts = []; for (let i = 0; i <= 24; i++) { const k = i / 24 * u; pts.push([hx + 3 + Math.sin(k * 5.2) * 14 * k + k * 8, hy - k * 150]); }
      glowLine(pts, HOT, 4, 14, 1); bloom(pts[pts.length - 1][0], pts[pts.length - 1][1], 60, HOT, .5 * u);
    }
    ctx.restore();
  }

  // hook headline overlay (screen space)
  function hookHeadline(t) {
    if (t > tHookEnd + .5) return;
    const exit = smooth((t - tHookEnd) / .35);
    screenSpace();
    const spec = [["YOUR HEAD IS", TXT, 0, 800, 140], ["OLDER", HOT, .1, 680, 300], ["THAN YOUR FEET", TXT, .2, 840, 140]];
    ctx.save(); ctx.font = `400 100px ${ANTON}`; const capR = ctx.measureText("H").actualBoundingBoxAscent / 100; ctx.restore();
    let yy = 178;
    spec.forEach(([s, color, d, w, max]) => {
      const size = fitSize(s, w, max), base = yy + capR * size; yy = base + 30;
      const sl = slam(t, d + .02, .13); if (!sl) return;
      ctx.save(); ctx.translate(0, -exit * 160);
      txt(s, 505, base, { size, color, sc: sl.sc, a: sl.a, glow: color === HOT ? 30 : 0, gcol: HOT, ls: 2 });
      ctx.restore();
    });
    if (t > .1 && t < .5) { const u = (t - .1) / .4; ctx.globalAlpha = (1 - u) * .5; ctx.strokeStyle = HOT; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(100, 410); ctx.lineTo(100 + 880 * eo3(u * 2), 410); ctx.stroke(); }
    ctx.globalAlpha = 1;
  }
  shake(.14, 14, .35); shake(.26, 8, .3);
  cue(.12, "hit", { gain: 1 }); cue(.0, "sweep", { dur: .5 });

  // =====================================================================
  //  SHOT B: gravity bends the grid (b03)
  // =====================================================================
  const EARTH = { x: 540, y: 1760, r: 780 };
  function earthBall(cx, cy, r, t, glowA) {
    // atmosphere glow
    add(() => { const g = ctx.createRadialGradient(cx, cy, r * .98, cx, cy, r * 1.16); g.addColorStop(0, col(UV, .55 * glowA)); g.addColorStop(.35, col(HOT, .12 * glowA)); g.addColorStop(1, col(UV, 0)); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, r * 1.16, 0, 6.2832); ctx.fill(); });
    const g = ctx.createRadialGradient(cx + r * .35, cy - r * .55, r * .1, cx, cy, r);
    g.addColorStop(0, "#2d2260"); g.addColorStop(.45, "#150f2c"); g.addColorStop(1, "#0a0813");
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, r, 0, 6.2832); ctx.fill();
    // limb rim light
    ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, r, 0, 6.2832); ctx.clip();
    const rg = ctx.createRadialGradient(cx + r * .12, cy + r * .05, r * .93, cx + r * .12, cy + r * .05, r * 1.03);
    rg.addColorStop(0, col(UV, 0)); rg.addColorStop(.7, col(UV, .5 * glowA)); rg.addColorStop(1, col(HOT, .9 * glowA)); ctx.fillStyle = rg; ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    // continents / cloud bands (soft violet blobs) + city lights
    ctx.globalAlpha = .13; ctx.fillStyle = UV;
    for (let i = 0; i < 9; i++) { ctx.beginPath(); ctx.ellipse(cx - 360 + i * 95 + (t * 3) % 40, cy - r + 60 + hash(i * 3) * 120, 90 + hash(i) * 80, 14 + hash(i + 4) * 14, hash(i + 9) * .5 - .25, 0, 6.2832); ctx.fill(); }
    ctx.globalAlpha = 1;
    for (let i = 0; i < 70; i++) { const x = cx - 420 + hash(i + 40) * 840, y = cy - r + 18 + hash(i + 80) * 150; if (Math.hypot(x - cx, y - cy) > r - 6) continue; disc(x, y, 1.6 + hash(i) * 1.6, HOT, .35 + .5 * hash(i + 7) * (.6 + .4 * Math.sin(t * 2 + i))); }
    ctx.restore();
  }
  function gridWarp(t, k) {
    const cols = 15, rows = 24, x0 = -120, dx = 90, y0 = 150, dy = 38, ex = 540;
    const P = (i, j) => { const x = x0 + i * dx, y = y0 + j * dy; const dep = Math.pow(j / rows, 1.1), g = Math.exp(-Math.pow((x - ex) / 430, 2));
      return [x + (ex - x) * .36 * k * g * dep, y + k * 420 * g * dep]; };
    ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.lineCap = "round";
    const depthA = j => .18 + .5 * (j / rows);
    for (let pass = 0; pass < 2; pass++) {
      for (let i = 0; i <= cols; i++) { ctx.beginPath(); for (let j = 0; j <= rows; j++) { const p = P(i, j); j ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); }
        const near = 1 - Math.min(1, Math.abs(x0 + i * dx - ex) / 500);
        ctx.strokeStyle = pass ? col(TXT, .22 + .3 * near * k) : col(UV, .35); ctx.lineWidth = pass ? 1.6 : 7; if (!pass) { ctx.shadowColor = UV; ctx.shadowBlur = 14; } else ctx.shadowBlur = 0; ctx.stroke(); }
      for (let j = 0; j <= rows; j++) { ctx.beginPath(); for (let i = 0; i <= cols; i++) { const p = P(i, j); i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); }
        ctx.strokeStyle = pass ? col(TXT, depthA(j) * .6) : col(UV, depthA(j) * .6); ctx.lineWidth = pass ? 1.6 : 7; if (!pass) { ctx.shadowColor = UV; ctx.shadowBlur = 14; } else ctx.shadowBlur = 0; ctx.stroke(); }
    }
    ctx.restore(); return P;
  }
  const tSag = W("b03", "It slows");
  function sceneB(t) {
    ctx.save(); useCam(.4); backdrop(540, 900, 1000, C.deep, .55); ctx.restore();
    ctx.save(); useCam(1);
    const k = eio((t - (tSag - 1.5)) / 2.2) * .85 + smooth((t - S("b03")) / 3) * .15;
    gridWarp(t, k);
    // gravity streaks: light falling into the well
    for (let i = 0; i < 9; i++) { const x = 140 + i * 100, ph = ((t * .9 + i * .37) % 1), y = lerp(180, 960, ph * ph);
      const cxn = lerp(x, 540, .3 * ph); add(() => { const g = ctx.createLinearGradient(0, y - 120, 0, y); g.addColorStop(0, col(HOT, 0)); g.addColorStop(1, col(HOT, .8 * Math.sin(ph * 3.14) * smooth((t - W("b03", "Gravity")) / .4))); ctx.fillStyle = g; ctx.fillRect(cxn - 2.5, y - 120, 5, 120); }); }
    earthBall(EARTH.x, EARTH.y, EARTH.r, t, 1);
    txt("GRAVITY", 540, 330, { size: 76, color: HOT, ls: 8, glow: 24, a: smooth((t - W("b03", "Gravity")) / .25) });
    // two mini clocks: high one ticks fast, the low one at the bottom of the well ticks slow
    const sB = t - S("b03");
    const hi = [250, 520], lo = [540, 870];
    clock(hi[0], hi[1], 66, { s: sB * 1.6, color: UV, hot: .8, a: smooth((t - tSag) / .4) });
    clock(lo[0], lo[1], 66, { s: sB * .5, color: HOT, hot: 1, a: smooth((t - tSag) / .4) });
    txt("FAST", hi[0], hi[1] + 118, { f: BARL, w: 800, size: 34, ls: 6, color: UV, a: smooth((t - tSag - .3) / .3) });
    txt("SLOW", lo[0], lo[1] - 100, { f: BARL, w: 800, size: 34, ls: 6, color: HOT, a: smooth((t - tSag - .3) / .3) });
    ctx.restore();
  }
  shake(W("b03", "Gravity") + .05, 6, .3);
  cue(S("b03") + .05, "swell", { dur: 2.2 }); cue(tSag - 1.4, "swell", { dur: 1.6 });

  // =====================================================================
  //  SHOT C: column of four clocks at rising heights (b04)
  // =====================================================================
  const CC = { ys: [980, 750, 520, 290], sp: [.4, 1.1, 2.1, 3.4], r: 92 };
  function sceneC(t) {
    const lt = t - S("b04");
    ctx.save(); useCam(.4); backdrop(540, 500, 1000, C.deep, .5); ghostDial(540, 560, 700, t, .07, UV); ctx.restore();
    ctx.save(); useCam(1);
    // altitude spine + gradient bar
    const g = ctx.createLinearGradient(0, 180, 0, 1130); g.addColorStop(0, col(HOT, .55)); g.addColorStop(1, col(UV, .45));
    glowLine([[540, 120], [540, 1100]], col(UV, .4), 3, 8, 1);
    add(() => { ctx.fillStyle = g; ctx.fillRect(850, 180, 10, 950); });
    for (let i = 0; i < 20; i++) glowLine([[838, 190 + i * 49], [i % 5 ? 852 : 872, 190 + i * 49]], col(TXT, .6), 2, 0);
    // earth glow at the bottom
    ctx.save(); const eg = ctx.createRadialGradient(540, 1500, 100, 540, 1500, 900); eg.addColorStop(0, col(HOT, .35)); eg.addColorStop(.4, col(UV, .13)); eg.addColorStop(1, col(UV, 0)); ctx.fillStyle = eg; ctx.fillRect(-200, 900, 1500, 1000); ctx.restore();
    earthBall(540, 2300, 1180, t, .9);
    CC.ys.forEach((y, i) => {
      const a = smooth((lt - .1 - i * .35) / .35);
      glowLine([[540, y + CC.r + 6], [540, i < 3 ? CC.ys[i + 1] - CC.r - 6 : 120]], col(UV, .45), 3, 0, a);
      clock(540, y, CC.r, { s: (lt) * CC.sp[i] * 1.4, color: i === 3 ? HOT : i === 0 ? UV : lerpCol(UV, HOT, i / 3), hot: .5 + i * .17, a, trail: i * .35 });
      // tick train: marks stream left from the clock; spacing shows how often it ticks
      { const rate = CC.sp[i], gap = 95 / rate; ctx.save(); ctx.globalAlpha = a;
        for (let k = 0; k < 14; k++) { const x = 440 - ((lt * 95 + k * gap) % (gap * 14)); if (x < 70 || x > 440) continue; const fade = clamp((x - 70) / 120) * clamp((445 - x) / 40);
          glowLine([[x, y - 22], [x, y + 22]], i === 3 ? HOT : lerpCol(UV, HOT, i / 3), 5, 10, fade); }
        ctx.restore(); }
      // tick-rate LED ladder to the right of each clock
      for (let k = 0; k < 4; k++) { const on = k <= i; ctx.save(); ctx.globalAlpha = a; rrect(650 + k * 34, y - 12, 24, 24, 5); ctx.fillStyle = on ? HOT : col(HAZE, .3); if (on) { ctx.shadowColor = HOT; ctx.shadowBlur = 14; } ctx.fill(); ctx.restore(); }
    });
    txt("faster".toUpperCase(), 860, 160, { size: 52, color: HOT, align: "right", ls: 5, glow: 18, a: smooth((lt - 1.4) / .3), f: ANTON });
    txt("SLOWER", 920, 1160, { size: 52, color: UV, align: "right", ls: 5, glow: 18, a: smooth((lt - .3) / .3) });
    txt("speeds exaggerated", 330, 1130, { f: BARL, w: 500, size: 28, color: HAZE, ls: 2, a: smooth((lt - 1) / .4) });
    ctx.restore();
  }
  const lerpCol = (a, b, u) => { const A = hexRGB(a), Bc = hexRGB(b); return "#" + [0, 1, 2].map(i => Math.round(lerp(A[i], Bc[i], u)).toString(16).padStart(2, "0")).join(""); };

  // =====================================================================
  //  SHOT D: the NIST lab (b06, b07, b08)
  // =====================================================================
  const t6 = S("b06"), tRaise0 = W("b07", "raised"), tRaise1 = W("b07", "Two steps") - .1;
  const BY = 1010; // bench top
  const unitPos = (which, t) => {
    if (which === "A") return [260, BY];
    const u = clamp((t - tRaise0) / (tRaise1 - tRaise0));
    const seg = u < .5 ? [480, BY, 700, BY - 60, eio(u / .5), u / .5] : [700, BY - 60, 860, BY - 120, eio((u - .5) / .5), (u - .5) / .5];
    if (u <= 0) return [480, BY]; if (u >= 1) return [860, BY - 120];
    return [lerp(seg[0], seg[2], seg[4]), lerp(seg[1], seg[3], seg[4]) - Math.sin(seg[5] * Math.PI) * 36];
  };
  function unit(x, y, t, s, hot, appear) {
    const a = eo3(appear); if (a <= 0) return;
    ctx.save(); ctx.globalAlpha = a; ctx.translate(x, y); ctx.scale(.85 + .15 * a, .85 + .15 * a);
    // cabinet
    const g = ctx.createLinearGradient(-80, 0, 80, 0); g.addColorStop(0, "#15111f"); g.addColorStop(1, "#0d0a15");
    rrect(-80, -190, 160, 190, 10); ctx.fillStyle = g; ctx.fill();
    ctx.save(); rrect(-80, -190, 160, 190, 10); ctx.clip(); ctx.fillStyle = hot ? HOT : UV; ctx.globalAlpha = a * (hot ? .95 : .6); ctx.fillRect(76, -190, 4, 190); ctx.fillRect(-80, -190, 160, 3); ctx.restore();
    ctx.strokeStyle = col(HAZE, .35); ctx.lineWidth = 2; rrect(-80, -190, 160, 190, 10); ctx.stroke();
    // LEDs + vents
    for (let i = 0; i < 4; i++) { disc(-56 + i * 16, -22, 3.5, i === 0 ? (hot ? HOT : UV) : HAZE, i === 0 ? .6 + .4 * Math.sin(t * 6 + i) : .5); }
    for (let i = 0; i < 4; i++) glowLine([[18, -34 + i * 0], [64, -34]], col(HAZE, .0), 1, 0);
    ctx.restore();
    clock(x, y - 108, 54, { s, color: hot ? HOT : UV, hot: hot ? 1 : .7, a, min0: 40 });
  }
  function sceneD(t) {
    const lt = t - t6;
    ctx.save(); useCam(.35); backdrop(540, 560, 1000, C.deep, .55);
    // back wall: vertical light slats
    for (let i = 0; i < 9; i++) { const x = 40 + i * 125; add(() => { const g = ctx.createLinearGradient(0, 180, 0, 980); g.addColorStop(0, col(UV, 0)); g.addColorStop(.6, col(UV, .07 + .03 * Math.sin(t + i))); g.addColorStop(1, col(UV, .14)); ctx.fillStyle = g; ctx.fillRect(x, 180, 5, 800); }); }
    ghostDial(560, 560, 620, t, .07, HOT); ctx.restore();
    ctx.save(); useCam(1);
    // wall scopes: two traces, the upper clock's a touch faster
    { const px = 110, py = 380, pw = 800, ph = 300, pa = smooth((lt - .6) / .5); ctx.save(); ctx.globalAlpha = pa; rrect(px, py, pw, ph, 18); ctx.fillStyle = col(ABY, .7); ctx.fill(); ctx.strokeStyle = col(UV, .5); ctx.lineWidth = 2; ctx.stroke();
      ctx.save(); rrect(px, py, pw, ph, 18); ctx.clip();
      for (let i = 1; i < 8; i++) glowLine([[px + i * 100, py], [px + i * 100, py + ph]], col(UV, .13), 1.5, 0, 1);
      for (let j = 1; j < 4; j++) glowLine([[px, py + j * 75], [px + pw, py + j * 75]], col(UV, .13), 1.5, 0, 1);
      [[UV, 1.0, 0], [HOT, 1.0 + (t > tRaise1 ? .22 : 0), 1]].forEach(([c, f, k]) => { const pts = []; for (let x = 0; x <= pw; x += 8) pts.push([px + x, py + ph / 2 + (k ? -28 : 28) + Math.sin((x * .03 + t * 5) * f) * 52 * (k ? 1 : .8)]); glowLine(pts, c, 4, 12, 1); });
      ctx.restore(); ctx.restore(); }
    // bench
    add(() => { const g = ctx.createLinearGradient(0, BY - 3, 0, BY + 170); g.addColorStop(0, col(HOT, .28)); g.addColorStop(.25, col(UV, .08)); g.addColorStop(1, col(UV, 0)); ctx.fillStyle = g; ctx.fillRect(-100, BY, 1300, 200); });
    const bg = ctx.createLinearGradient(0, BY, 0, BY + 150); bg.addColorStop(0, "#161122"); bg.addColorStop(1, "#08070D"); ctx.fillStyle = bg; ctx.fillRect(-100, BY, 1300, 200);
    glowLine([[-100, BY], [1200, BY]], HOT, 3, 14, .95 * smooth((lt - .15) / .5));
    // reflections of the dials on the bench
    // units
    const tFast = tRaise1;
    const sA = lt * 1.0, sBt = lt * 1.0 + Math.max(0, t - tFast) * 1.8;
    // stairs (step glow)
    const stA = smooth((t - tRaise0 + .2) / .6);
    if (stA > 0) { ctx.save(); ctx.globalAlpha = stA;
      [[620, BY, 150, 60], [770, BY - 60, 190, 60]].forEach(([x, y, w, h], i) => { const g = ctx.createLinearGradient(0, y - h, 0, y); g.addColorStop(0, "#1d1730"); g.addColorStop(1, "#0d0a16"); ctx.fillStyle = g; ctx.fillRect(x, y - h, w, h);
        glowLine([[x, y - h], [x + w, y - h]], UV, 3, 12, 1); glowLine([[x + w, y - h], [x + w, y]], col(UV, .6), 2, 0); });
      ctx.restore(); }
    const pa = unitPos("A", t), pb = unitPos("B", t);
    unit(pa[0], pa[1], t, sA, false, (lt - 1.2) / .5);
    unit(pb[0], pb[1], t, sBt, true, (lt - 1.7) / .5);
    // dimension marker
    const tDim = W("b07", "Two steps") + .2, dd = smooth((t - tDim) / .4);
    if (dd > 0) { ctx.save(); ctx.globalAlpha = dd; ctx.setLineDash([8, 10]); glowLine([[330, BY - 190], [700, BY - 190]], col(HAZE, .8), 2, 0); glowLine([[330 + 0, BY - 310], [700, BY - 310]], col(HAZE, .0), 2, 0); ctx.setLineDash([]);
      const x = 640; glowLine([[x, BY - 190], [x, BY - 310]], TXT, 3, 8, 1);
      glowLine([[x - 12, BY - 202], [x, BY - 190], [x + 12, BY - 202]], TXT, 3, 0, 1); glowLine([[x - 12, BY - 298], [x, BY - 310], [x + 12, BY - 298]], TXT, 3, 0, 1);
      txt("33 cm ≈ 1 ft", 640, BY - 340, { f: BARL, w: 800, size: 42, color: TXT, glow: 10 }); ctx.restore(); }
    // b08 tick spray from each clock
    if (t >= S("b08") - .1 && t < S("b09")) {
      [[pa, 1.6, 0], [pb, 3.2, 1]].forEach(([p, rate, k]) => { const cx = p[0], cy = p[1] - 108; const t8 = S("b08"), n = Math.floor((t - t8) * rate) + 1;
        for (let i = Math.max(0, n - 4); i < n; i++) { const ti = t8 + i / rate, u = (t - ti) / .8; if (u < 0 || u > 1) continue; const ang = (-100 + (hash(i * 3 + k * 17) - .5) * 120) * Math.PI / 180, r1 = 66 + u * 90;
          glowLine([[cx + r1 * Math.cos(ang), cy + r1 * Math.sin(ang)], [cx + (r1 + 24) * Math.cos(ang), cy + (r1 + 24) * Math.sin(ang)]], k ? HOT : UV, 5, 10, 1 - u * u); } });
      const ua = smooth((t - W("b08", "higher clock")) / .4);
      glowLine([[pb[0] - 70, pb[1] - 215], [pb[0] + 70, pb[1] - 215]], HOT, 6, 14, ua);
    }
    // stamp
    const tS = W("b06", "in 2010"), sl = slam(t, tS, .16);
    ctx.restore(); screenSpace();
    if (sl && t < S("b07") + 1.6) {
      ctx.save(); ctx.globalAlpha = 1 - smooth((t - (S("b07") + 1.2)) / .4); const bx = 505, by = 360;
      txt("2010 · NIST", bx, by, { size: 124, color: HOT, sc: sl.sc, a: sl.a, glow: 28, ls: 2, rot: -.04 });
      if (sl.sc < 1.05) { ctx.save(); ctx.translate(bx, by - 46); ctx.rotate(-.04); ctx.strokeStyle = HOT; ctx.lineWidth = 6; ctx.shadowColor = HOT; ctx.shadowBlur = 20; rrect(-330, -100, 660, 170, 10); ctx.stroke(); ctx.restore(); }
      ctx.restore();
      ringPulse(540, 300, 150, 560, (t - tS) / .6, HOT, 7);
    }
  }
  shake(W("b06", "in 2010") + .12, 16, .4); cue(W("b06", "in 2010") + .1, "hit");

  // =====================================================================
  //  SHOT E: 79 years, the tiny gap (b09, b10)
  // =====================================================================
  const LY = 700, L0 = 90, L1 = 890;
  const tl0 = S("b09") + .2, tl1 = W("b09", "those two steps");
  function sceneE(t) {
    const lt = t - S("b09");
    ctx.save(); useCam(.3); backdrop(560, 700, 1000, C.deep, .5); ghostDial(540, 700, 760, t, .06, UV); ctx.restore();
    ctx.save(); useCam(1);
    const drawn = eo3((t - tl0) / (tl1 - tl0)), xe = lerp(L0, L1, drawn);
    // life bar: gradient from UV to HOT
    add(() => { const g = ctx.createLinearGradient(L0, 0, L1, 0); g.addColorStop(0, col(UV, .5)); g.addColorStop(1, col(HOT, .8)); ctx.fillStyle = g; ctx.fillRect(L0, LY - 13, xe - L0, 26); });
    ctx.save(); ctx.shadowColor = UV; ctx.shadowBlur = 20; ctx.fillStyle = col(TXT, .9); ctx.fillRect(L0, LY - 2, xe - L0, 4); ctx.restore();
    // year ticks
    for (let y = 0; y <= 79; y++) { const x = lerp(L0, L1 - 8, y / 79); if (x > xe) break; const big = y % 10 === 0; glowLine([[x, LY - (big ? 56 : 24)], [x, LY + (big ? 56 : 24)]], big ? TXT : col(HAZE, .8), big ? 3 : 1.5, 0, 1); }
    glowLine([[L0, LY - 40], [L0, LY + 40]], UV, 5, 14, smooth((t - tl0) / .2));
    txt("BORN", L0, LY + 100, { f: BARL, w: 800, size: 32, ls: 6, color: UV, align: "center", a: smooth((t - tl0) / .3) });
    // the gap
    const tGap = W("b09", "about ninety") - .6, sh0 = S("b10") + .15, sh1 = S("b10") + 1.4, k = smooth((t - sh0) / (sh1 - sh0)), L = 7 * (1 - k) + .001;
    if (t >= tGap) { ctx.save(); ctx.globalAlpha = smooth((t - tGap) / .2); add(() => { ctx.fillStyle = col(HOT, .9); ctx.shadowColor = HOT; ctx.shadowBlur = 30; ctx.fillRect(L1, LY - 3, L + 1, 6); }); disc(L1 + L, LY, 2.6 + 3 * k, HOT, 1); ctx.restore(); bloom(L1 + L / 2, LY, 26 + 20 * k, HOT, .5); }
    const zz = CAM.z;
    txt("≈ 0.000 000 09 s", L1 + 3, LY - 14, { size: 10, f: ANTON, color: HOT, glow: 6, a: smooth((t - W("b09", "about ninety")) / .3) * (1 - smooth((t - sh0) / .3)) });
    txt("90 billionths of a second", L1 + 3, LY + 22, { size: 5.6, f: BARL, w: 800, color: TXT, ls: .5, a: smooth((t - W("b09", "ninety")) / .3) * (1 - smooth((t - sh0) / .3)) });
    // dot highlight in b10
    if (t >= sh0) { ringPulse(L1, LY, 4, 40, (t - sh1) / .9, HOT, 2); }
    ctx.restore();
    { const a = smooth((t - W("b09", "seventy")) / .3) * (1 - smooth((t - W("b09", "about ninety") + .3) / .4)); if (a > 0) { screenSpace(); txt("79 YEARS", 505, 480, { size: 230, color: TXT, ls: 4, glow: 26, gcol: UV, a, sc: 1 + .2 * (1 - eo3((t - W("b09", "seventy")) / .2)) }); } }
    // "real" payoff in screen space
    if (t >= W("b10", "But real")) { const u = (t - W("b10", "But real")) / 1.1; screenSpace(); txt("REAL", 505, 560, { size: 250, color: HOT, glow: 40, a: smooth(u * 3) * (1 - smooth((t - E("b10") + .5) / .4)), sc: 1 + .12 * (1 - eo3(u * 1.6)) }); }
  }
  cue(S("b09") - .1, "sweep", { dur: .5 }); cue(W("b09", "about ninety") - .9, "swell", { dur: 1.8 }); cue(W("b10", "But real") + .02, "hit");
  shake(W("b10", "But real") + .02, 8, .3);

  // =====================================================================
  //  SHOT F: GPS satellite high above a glowing Earth (b11)
  // =====================================================================
  const EF = { x: 540, y: 2440, r: 1420 };
  function panel(x, y, w, h, t, flip) {
    // solar array: cells with specular sweep, rim light on the sun-facing edge
    ctx.save(); ctx.translate(x, y);
    const g = ctx.createLinearGradient(0, 0, w, 0); g.addColorStop(flip ? 1 : 0, "#18163f"); g.addColorStop(flip ? 0 : 1, "#2b2a78");
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    const cols_ = 6, rows_ = 3;
    ctx.strokeStyle = col(UV, .55); ctx.lineWidth = 2;
    for (let i = 0; i <= cols_; i++) { ctx.beginPath(); ctx.moveTo(w * i / cols_, 0); ctx.lineTo(w * i / cols_, h); ctx.stroke(); }
    for (let j = 0; j <= rows_; j++) { ctx.beginPath(); ctx.moveTo(0, h * j / rows_); ctx.lineTo(w, h * j / rows_); ctx.stroke(); }
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, w, h); ctx.clip(); ctx.globalCompositeOperation = "lighter";
    const sx = ((t * .45) % 1.6 - .3) * w, sg = ctx.createLinearGradient(sx - 60, 0, sx + 60, 0); sg.addColorStop(0, col(TXT, 0)); sg.addColorStop(.5, col(TXT, .28)); sg.addColorStop(1, col(TXT, 0)); ctx.fillStyle = sg; ctx.fillRect(0, 0, w, h); ctx.restore();
    ctx.strokeStyle = HOT; ctx.lineWidth = 4; ctx.shadowColor = HOT; ctx.shadowBlur = 14; ctx.beginPath(); ctx.moveTo(flip ? 0 : w, 0); ctx.lineTo(flip ? 0 : w, h); ctx.stroke();
    ctx.shadowBlur = 0; ctx.strokeStyle = col(TXT, .7); ctx.lineWidth = 2; ctx.strokeRect(0, 0, w, h);
    ctx.restore();
  }
  function satellite(cx, cy, s, t, lt) {
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(-.1); ctx.scale(s, s);
    bloom(0, 0, 420, UV, .16);
    // booms + panels
    ctx.fillStyle = "#2b2547"; ctx.fillRect(-250, -6, 190, 12); ctx.fillRect(60, -6, 190, 12);
    glowLine([[-250, -6], [-60, -6]], col(HOT, .8), 2, 6, 1); glowLine([[60, -6], [250, -6]], col(HOT, .8), 2, 6, 1);
    panel(-640, -100, 390, 200, t, true); panel(250, -100, 390, 200, t, false);
    // bus: gold foil body
    const g = ctx.createLinearGradient(-70, -90, 70, 90); g.addColorStop(0, "#5a3a14"); g.addColorStop(.5, "#2d1d0d"); g.addColorStop(1, "#1a1008");
    rrect(-70, -95, 140, 190, 8); ctx.fillStyle = g; ctx.fill();
    ctx.save(); rrect(-70, -95, 140, 190, 8); ctx.clip();
    ctx.strokeStyle = col(HOT, .22); ctx.lineWidth = 1.5; for (let i = -6; i < 8; i++) { ctx.beginPath(); ctx.moveTo(-70, i * 28 - 30); ctx.lineTo(70, i * 28 + 30); ctx.stroke(); }
    ctx.fillStyle = HOT; ctx.fillRect(66, -95, 4, 190); ctx.fillRect(-70, -95, 140, 3); ctx.restore();
    ctx.strokeStyle = col(TXT, .5); ctx.lineWidth = 2; rrect(-70, -95, 140, 190, 8); ctx.stroke();
    // antenna dish (top) and array (bottom)
    glowLine([[0, -95], [0, -150]], TXT, 5, 0, 1);
    ctx.save(); ctx.translate(0, -160); ctx.fillStyle = "#1d1830"; ctx.strokeStyle = TXT; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(0, 0, 60, 18, 0, 0, 6.2832); ctx.fill(); ctx.stroke();
    glowLine([[0, 0], [0, -34]], HOT, 4, 10, 1); disc(0, -36, 6, HOT, 1); ctx.restore();
    rrect(-34, 95, 68, 26, 4); ctx.fillStyle = "#1d1830"; ctx.fill(); ctx.strokeStyle = col(UV, .8); ctx.stroke();
    for (let i = 0; i < 4; i++) glowLine([[-24 + i * 16, 103], [-24 + i * 16, 114]], UV, 3, 6, 1);
    ctx.restore();
  }
  const tGPS = W("b11", "GPS satellites"), tClk = W("b11", "clocks run");
  function sceneF(t) {
    const lt = t - S("b11"), SAT = [540, 480], sc = .82 * eo3((lt - .35) / .9 + .1);
    ctx.save(); useCam(.3); backdrop(540, 500, 1100, C.deep, .55); ctx.restore();
    ctx.save(); useCam(1);
    // orbit
    ctx.save(); ctx.setLineDash([26, 22]); ctx.lineDashOffset = -t * 30; ctx.strokeStyle = col(HAZE, .55); ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(EF.x, EF.y, EF.y - SAT[1], 0, 6.2832); ctx.stroke(); ctx.restore();
    earthBall(EF.x, EF.y, EF.r, t, 1.1);
    // phone on the ground
    const PH = [540, EF.y - EF.r + 2];
    bloom(PH[0], PH[1], 90, HOT, .35);
    rrect(PH[0] - 18, PH[1] - 50, 36, 62, 6); ctx.fillStyle = "#0c0a14"; ctx.fill(); ctx.strokeStyle = TXT; ctx.lineWidth = 3; ctx.stroke(); disc(PH[0], PH[1] - 6, 5, HOT, 1);
    // signal pulses between phone and satellite
    const sa = smooth((t - W("b11", "your phone")) / .5);
    for (let i = 0; i < 5; i++) { const u = ((t * .5 + i / 5) % 1), y = lerp(PH[1] - 56, SAT[1] + 150 * sc, 1 - u); disc(540 + Math.sin(u * 9) * 3, y, 5, HOT, sa * Math.sin(u * 3.14)); bloom(540, y, 26, HOT, sa * .3 * Math.sin(u * 3.14)); }
    glowLine([[540, PH[1] - 56], [540, SAT[1] + 150 * sc]], col(HOT, .35), 2, 0, sa);
    if (sc > .01) {
      satellite(SAT[0], SAT[1], sc, t, lt);
      // fast clock on the satellite body
      const ca = smooth((t - tClk + .6) / .4);
      ctx.save(); ctx.translate(SAT[0], SAT[1]); ctx.rotate(-.1); ctx.scale(sc, sc);
      clock(0, -2, 46, { s: lt * 5.4, color: HOT, hot: 1, a: ca, min0: 20, trail: 1.5 }); ctx.restore();
      txt("GPS", 118, 330, { size: 150, color: TXT, glow: 24, gcol: HOT, align: "left", ls: 6, a: smooth((t - W("b11", "GPS")) / .15), sc: 1 + .4 * (1 - eo3((t - W("b11", "GPS")) / .16)) });
    }
    ctx.restore();
  }
  cue(S("b11") - .05, "sweep", { dur: .6 }); cue(S("b11") + .3, "swell", { dur: 2.4 }); cue(W("b11", "GPS") + .05, "hit");
  shake(W("b11", "GPS") + .05, 10, .3);

  // =====================================================================
  //  SHOT G: set slow before launch (b12, first half)
  // =====================================================================
  const tg0 = S("b12"), tSlow0 = W("b12", "set them"), tSlow1 = W("b12", "on the ground");
  const dialS = t => { let a = 0; for (let s = tg0 + .6; s < t; s += 1 / 60) { const k = smooth((s - tSlow0) / (tSlow1 - tSlow0)); a += lerp(5.2, 1.0, k) / 60; } return a; };
  function sceneG(t) {
    const lt = t - tg0, ka = smooth((t - tSlow0) / (tSlow1 - tSlow0));
    ctx.save(); useCam(.35); backdrop(540, 700, 1000, C.deep, .55); ghostDial(540, 690, 640, t, .06, HOT); ctx.restore();
    ctx.save(); useCam(1);
    // rack panel
    const px = 130, py = 400, pw = 820, ph = 640;
    const g = ctx.createLinearGradient(px, py, px, py + ph); g.addColorStop(0, "#1b1629"); g.addColorStop(1, "#0d0a16");
    const ap = eo3((lt - .1) / .5); ctx.save(); ctx.globalAlpha = ap; ctx.translate(0, (1 - ap) * 40);
    rrect(px, py, pw, ph, 22); ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = col(HAZE, .4); ctx.lineWidth = 2; ctx.stroke();
    ctx.save(); rrect(px, py, pw, ph, 22); ctx.clip(); ctx.fillStyle = HOT; ctx.fillRect(px + pw - 5, py, 5, ph); ctx.fillRect(px, py, pw, 4); ctx.restore();
    // screws + LEDs + vents
    [[px + 30, py + 30], [px + pw - 40, py + 30], [px + 30, py + ph - 30], [px + pw - 40, py + ph - 30]].forEach(p => { disc(p[0], p[1], 8, "#2a2440", 1); glowLine([[p[0] - 5, p[1]], [p[0] + 5, p[1]]], HAZE, 2, 0, 1); });
    for (let i = 0; i < 8; i++) glowLine([[px + 60, py + ph - 70 + (i % 2) * 0], [px + 60, py + ph - 70]], HAZE, 1, 0, 0);
    for (let i = 0; i < 6; i++) disc(px + 70 + i * 26, py + 66, 6, i < 2 ? HOT : UV, .45 + .5 * Math.max(0, Math.sin(t * 5 + i * 1.7)));
    txt("SATELLITE CLOCK", px + pw - 60, py + 76, { f: BARL, w: 800, size: 30, ls: 6, color: HAZE, align: "right" });
    ctx.restore();
    // big dial
    clock(400, 740, 190, { s: dialS(t), color: HOT, hot: 1 + .3 * (1 - ka), a: ap, min0: 10, trail: (1 - ka) * 1.4 });
    // knob with gauge
    const kx = 810, ky = 790, ang = (-150 * ka - 40) * Math.PI / 180;
    ctx.save(); ctx.globalAlpha = ap;
    ctx.strokeStyle = col(UV, .6); ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(kx, ky, 78, -Math.PI * .95, -Math.PI * .05); ctx.stroke();
    for (let i = 0; i <= 10; i++) { const a = -Math.PI * .95 + i / 10 * Math.PI * .9; glowLine([[kx + 70 * Math.cos(a), ky + 70 * Math.sin(a)], [kx + 88 * Math.cos(a), ky + 88 * Math.sin(a)]], col(TXT, .8), 2, 0, 1); }
    const kg = ctx.createRadialGradient(kx - 12, ky - 14, 4, kx, ky, 54); kg.addColorStop(0, "#3a3158"); kg.addColorStop(1, "#14101f");
    ctx.shadowColor = HOT; ctx.shadowBlur = 20 * ka; disc(kx, ky, 54, kg, 1); ctx.shadowBlur = 0; ctx.strokeStyle = col(TXT, .6); ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(kx, ky, 54, 0, 6.2832); ctx.stroke();
    glowLine([[kx, ky], [kx + 46 * Math.cos(ang - Math.PI / 2 + 0.4 + Math.PI / 2 * 0), ky + 46 * Math.sin(ang)]], HOT, 7, 14, 1);
    txt("FAST", kx - 66, ky + 120, { f: BARL, w: 800, size: 28, ls: 4, color: UV, a: 1 - ka * .7 });
    txt("SLOW", kx + 70, ky + 120, { f: BARL, w: 800, size: 28, ls: 4, color: HOT, a: .4 + .6 * ka });
    ctx.restore();
    ctx.restore();
    // headline text
    const ta = smooth((t - tSlow0 + .2) / .25);
    ctx.save(); ctx.globalAlpha = ta; screenSpace();
    txt("SET SLOW", 505, 262, { size: 118, color: HOT, glow: 26, ls: 4, sc: 1 + .25 * (1 - eo3((t - tSlow0 + .2) / .2)) });
    txt("BEFORE LAUNCH", 505, 352, { size: 76, color: TXT, ls: 6 });
    ctx.restore();
  }
  cue(tSlow0, "swell", { dur: 1.4 }); cue(tSlow1 + .05, "hit");

  // =====================================================================
  //  SHOT H: the map pin drifts off the street and snaps back (b12, second half)
  // =====================================================================
  const th0 = W("b12", "Without"), tDrift0 = W("b12", "your map"), tDrift1 = W("b12", "would be wrong") + .5, tSnap = E("b12") - .45;
  const XS = [-40, 150, 330, 540, 730, 920, 1120], YS = [140, 330, 530, 700, 900, 1060, 1230];
  function sceneH(t) {
    const lt = t - th0;
    ctx.save(); useCam(1);
    ctx.fillStyle = "#0c0a14"; ctx.fillRect(-300, -300, 1700, 2400);
    // blocks
    for (let i = 0; i < XS.length - 1; i++) for (let j = 0; j < YS.length - 1; j++) {
      const x = XS[i] + 16, y = YS[j] + 16, w = XS[i + 1] - XS[i] - 32, h = YS[j + 1] - YS[j] - 32, a = smooth((lt - (i + j) * .06) / .3);
      ctx.globalAlpha = a; rrect(x, y, w, h, 8); ctx.fillStyle = ((i * 7 + j * 3) % 4 === 0) ? "#17122a" : "#110e1d"; ctx.fill(); ctx.strokeStyle = col(UV, .13); ctx.lineWidth = 1.5; ctx.stroke(); ctx.globalAlpha = 1;
    }
    // streets: glowing centre lines
    const sa = smooth(lt / .5);
    XS.forEach((x, i) => glowLine([[x, -300], [x, 2100]], col(UV, .16 + (i === 3 ? .3 : 0)), i === 3 ? 4 : 2, i === 3 ? 12 : 0, sa));
    YS.forEach((y, j) => glowLine([[-300, y], [1400, y]], col(UV, .16 + (j === 3 ? .3 : 0)), j === 3 ? 4 : 2, j === 3 ? 12 : 0, sa));
    glowLine([[-100, 1250], [380, 760], [760, 340], [1180, -60]], col(HAZE, .7), 5, 12, sa * .8);   // diagonal avenue
    // river
    ctx.save(); ctx.globalAlpha = sa * .22; ctx.strokeStyle = UV; ctx.lineWidth = 34; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(-100, 1130); ctx.bezierCurveTo(300, 1020, 700, 1260, 1200, 1100); ctx.stroke(); ctx.restore();
    // route highlight along street x=540
    const P0 = [540, 700], P1 = [650, 790];
    glowLine([[540, 1100], [540, 700]], col(TXT, .85), 4, 10, smooth((lt - .4) / .5));
    const kd = smooth((t - tDrift0) / (tDrift1 - tDrift0)), ks = eio((t - tSnap) / .35), k = kd * (1 - ks);
    const px = lerp(P0[0], P1[0], k), py = lerp(P0[1], P1[1], k) - 14 * Math.sin(Math.PI * clamp((t - tSnap) / .35));
    // error circle
    ctx.save(); ctx.globalAlpha = k * .9; ctx.strokeStyle = HOT; ctx.lineWidth = 3; ctx.setLineDash([10, 10]); ctx.beginPath(); ctx.arc(px, py, 20 + 120 * k, 0, 6.2832); ctx.stroke(); ctx.fillStyle = col(HOT, .08); ctx.fill(); ctx.restore();
    // dashed ghost trail
    ctx.save(); ctx.setLineDash([12, 12]); glowLine([[P0[0], P0[1]], [px, py]], HOT, 5, 10, kd > 0 && t < tSnap + .35 ? 1 : 0); ctx.restore();
    // pin
    const pa = smooth((lt - .7) / .3), pinS = 1 + .25 * Math.sin(Math.PI * clamp((t - tSnap) / .3)) * (t > tSnap ? 1 : 0);
    ctx.save(); ctx.globalAlpha = pa; ctx.translate(px, py); ctx.scale(pinS, pinS);
    bloom(0, -40, 110, HOT, .5);
    ctx.shadowColor = HOT; ctx.shadowBlur = 30; ctx.fillStyle = HOT; ctx.beginPath(); ctx.moveTo(0, 0); ctx.bezierCurveTo(-46, -50, -44, -100, 0, -100); ctx.bezierCurveTo(44, -100, 46, -50, 0, 0); ctx.fill();
    ctx.shadowBlur = 0; disc(0, -66, 15, ABY, 1); ctx.restore();
    ringPulse(P0[0], P0[1], 8, 120, (t - (tSnap + .3)) / .7, TXT, 5);
    ctx.restore();
    // "WRONG" tag on drift
    const wa = smooth((t - tDrift1 + .9) / .2) * (1 - smooth((t - tSnap + .1) / .2));
    if (wa > 0) { screenSpace(); txt("WRONG", 505, 360, { size: 170, color: HOT, glow: 34, a: wa, ls: 6, sc: 1 + .2 * (1 - eo3((t - tDrift1 + .9) / .18)) }); }
  }
  cue(th0 - .05, "sweep", { dur: .5 }); cue(tDrift1 - .9, "hit", { gain: .8 }); cue(tSnap + .05, "pop");

  // =====================================================================
  //  VERDICT card (b13) and end card
  // =====================================================================
  const tTrue = W("b13", "True"), tRule = W("b13", "The higher");
  function frameMarks(a) {
    ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = col(TXT, .5); ctx.lineWidth = 3;
    [[90, 250, 1, 1], [990, 250, -1, 1], [90, 1330, 1, -1], [990, 1330, -1, -1]].forEach(([x, y, sx, sy]) => { ctx.beginPath(); ctx.moveTo(x, y + sy * 60); ctx.lineTo(x, y); ctx.lineTo(x + sx * 60, y); ctx.stroke(); });
    ctx.restore();
  }
  function verdict(t, tStamp, o) {
    const lt = t - o.t0;
    screenSpace();
    backdrop(540, 760, 900, C.deep, .6 * (o.bg == null ? 1 : o.bg));
    ghostDial(540, 740, 600, t, .08, UV);
    frameMarks(smooth(lt / .3));
    // header
    txt("CASE FILE 001", 505, 392, { f: BARL, w: 800, size: 46, ls: 14, color: HAZE, a: smooth(lt / .25) });
    glowLine([[170, 430], [840, 430]], col(HAZE, .6), 2, 0, smooth(lt / .4));
    const sl = slam(t, tStamp, .16);
    const cy = 740;
    if (!sl) {
      // pre-stamp: dashed empty stamp frame, flickering
      ctx.save(); ctx.globalAlpha = .5 + .3 * Math.sin(t * 20); ctx.setLineDash([16, 14]); ctx.strokeStyle = HOT; ctx.lineWidth = 5; ctx.shadowColor = HOT; ctx.shadowBlur = 16; rrect(180, cy - 200, 650, 310, 14); ctx.stroke(); ctx.restore();
      txt("VERDICT", 505, cy + 4, { size: 110, color: col(HAZE, .85), ls: 14 });
    } else {
      const age = t - tStamp;
      ringPulse(505, cy - 40, 150, 700, age / .7, HOT, 10); ringPulse(505, cy - 40, 100, 520, (age - .08) / .6, TXT, 4);
      add(() => { ctx.fillStyle = col(HOT, .5 * Math.max(0, 1 - age / .25)); ctx.fillRect(-50, -50, 1200, 2000); });
      bloom(505, cy - 40, 520, HOT, .3 + .1 * Math.max(0, 1 - age));
      txt("TRUE", 505, cy + 110, { size: 350, color: HOT, sc: sl.sc, a: sl.a, rot: -.05, glow: 60, ls: 6 });
      if (sl.sc < 1.02) { ctx.save(); ctx.translate(505, cy - 40); ctx.rotate(-.05); ctx.strokeStyle = HOT; ctx.lineWidth = 8; ctx.shadowColor = HOT; ctx.shadowBlur = 24; rrect(-390, -200, 780, 360, 14); ctx.stroke();
        ctx.lineWidth = 3; rrect(-408, -218, 816, 396, 18); ctx.stroke(); ctx.restore(); }
    }
    // rule line, once
    if (o.rule != null && t >= o.rule) {
      const u = smooth((t - o.rule) / .35), y0 = 1060;
      glowLine([[170, 1000], [840, 1000]], col(HAZE, .6), 2, 0, u);
      txt("The higher you are,", 505, y0 + 30, { f: BARL, w: 800, size: 68, color: TXT, a: u });
      ctx.save(); ctx.globalAlpha = u; ctx.font = `800 68px ${BARL}`; const a1 = "the ", a2 = "faster", a3 = " your time runs.";
      const w1 = ctx.measureText(a1).width, w2 = ctx.measureText(a2).width, w3 = ctx.measureText(a3).width, x0 = 505 - (w1 + w2 + w3) / 2;
      ctx.textAlign = "left"; ctx.fillStyle = TXT; ctx.fillText(a1, x0, y0 + 118); ctx.fillStyle = HOT; ctx.shadowColor = HOT; ctx.shadowBlur = 16; ctx.fillText(a2, x0 + w1, y0 + 118); ctx.shadowBlur = 0; ctx.fillStyle = TXT; ctx.fillText(a3, x0 + w1 + w2, y0 + 118);
      ctx.fillStyle = HOT; ctx.shadowColor = HOT; ctx.shadowBlur = 14; ctx.fillRect(x0 + w1, y0 + 132, w2 * u, 6); ctx.restore();
    }
    if (o.sign != null) { const u = smooth((t - o.sign) / .4); txt("UNREAL, ACTUALLY", 505, 1350, { size: 56, color: TXT, ls: 12, a: u, glow: 12, gcol: UV }); disc(505, 1392, 5, HOT, u); }
  }
  shake(tTrue + .04, 26, .55); cue(tTrue + .02, "hit", { gain: 1.2 });
  cue(tTrue - 2.2, "riser", { dur: 2.2 });
  const tSign = END("b15") + .35;
  cue(END("b15") + .25, "hit", { gain: .55 });

  // =====================================================================
  //  SHOT J: taking the stairs (b14)
  // =====================================================================
  const NST = 5, tj0 = S("b14");
  const stepY = i => 1110 - i * 108, stepW = i => 780 - i * 80;
  const arr = i => tj0 + .55 + i * .92;
  function sceneJ(t) {
    const lt = t - tj0;
    ctx.save(); useCam(.3); backdrop(540, 400, 1100, C.deep, .6); ghostDial(540, 420, 640, t, .06, HOT); ctx.restore();
    ctx.save(); useCam(1);
    // light spilling from the top of the stairs
    beam(540, 280, 540, 1200, 40, 420, HOT, .1); bloom(540, 300, 360, HOT, .28);
    // steps far to near
    for (let i = NST; i >= 0; i--) {
      const y = stepY(i), w = stepW(i), a = smooth((lt - (NST - i) * .08) / .3);
      ctx.save(); ctx.globalAlpha = a;
      const g = ctx.createLinearGradient(0, y, 0, y + 90); g.addColorStop(0, "#1f1934"); g.addColorStop(1, "#0b0913"); ctx.fillStyle = g; ctx.fillRect(540 - w / 2, y, w, 90);
      ctx.fillStyle = "#2a2144"; ctx.fillRect(540 - w / 2, y - 16, w, 16);
      glowLine([[540 - w / 2, y - 16], [540 + w / 2, y - 16]], i % 2 ? UV : HOT, 3, 12, 1);
      ctx.restore();
    }
    // figure position
    let idx = 0; for (let i = 0; i < NST; i++) if (t >= arr(i)) idx = i;
    let fy = stepY(idx) - 16, sc = .62 - .045 * idx;
    if (idx < NST - 1 && t > arr(idx + 1) - .35) { const u = eio((t - (arr(idx + 1) - .35)) / .35); fy = lerp(stepY(idx) - 16, stepY(idx + 1) - 16, u) - Math.sin(u * Math.PI) * 60; sc = lerp(.62 - .045 * idx, .62 - .045 * (idx + 1), u); }
    if (t < arr(0) - .35) { fy = stepY(0) - 16; sc = .62; }
    human(540, fy, sc, { a: smooth(lt / .25) });
    // + marks and the aging clock
    for (let i = 0; i < NST - 1; i++) { const a = arr(i + 1), u = (t - a) / 1.0; if (u < 0 || u > 1) continue; const yy = stepY(i + 1) - 16 - 700 * (.62 - .045 * (i + 1)) - 50 - 60 * u;
      txt("+", 540 + 90, yy, { size: 130, color: HOT, glow: 24, a: 1 - u * u, sc: 1 + .5 * (1 - eo3(u * 4)), f: ANTON }); }
    ctx.restore();
  }
  for (let i = 1; i < NST; i++) cue(arr(i), "pop");
  cue(tj0, "sweep", { dur: .5 });

  // =====================================================================
  //  cover
  // =====================================================================
  function drawCover() {
    ctx.fillStyle = ABY; ctx.fillRect(0, 0, 1080, 1920);
    CAM = { x: 540, y: 700, z: 1 }; SHK = [0, 0];
    backdrop(600, 1100, 1000, C.deep, .75); backdrop(820, 960, 500, HOT, .12);
    ghostDial(560, 1060, 680, 12, .1, UV);
    beam(1000, -200, 540, 1300, 80, 300, TXT, .08);
    dust(3, .5, 60, .8); dust(3, .15, 50, .6);
    // headline
    const lines = [["YOUR HEAD IS", TXT, 840, 160, 330], ["OLDER", HOT, 820, 440, 625], ["THAN YOUR FEET", TXT, 840, 160, 770]];
    lines.forEach(([s, c, w, mx, base]) => { txt(s, 505, base, { size: fitSize(s, w, mx), color: c, glow: c === HOT ? 46 : 0, gcol: HOT, ls: 2 }); });
    // badge
    ctx.save(); rrect(90, 178, 360, 62, 31); ctx.fillStyle = col(ABY, .85); ctx.fill(); ctx.strokeStyle = HOT; ctx.lineWidth = 3; ctx.stroke(); ctx.restore();
    txt("UNREAL, ACTUALLY", 270, 222, { f: BARL, w: 800, size: 30, ls: 5, color: TXT });
    disc(120, 209, 6, HOT, 1);
    // figure + clocks
    const fx = 440, fy = 1500, s = .98;
    ctx.save(); const rg = ctx.createRadialGradient(fx, fy, 10, fx, fy, 520); rg.addColorStop(0, col(HOT, .3)); rg.addColorStop(1, col(UV, 0)); ctx.translate(0, fy); ctx.scale(1, .2); ctx.translate(0, -fy); ctx.globalCompositeOperation = "lighter"; ctx.fillStyle = rg; ctx.fillRect(-100, fy - 560, 1300, 1120); ctx.restore();
    glowLine([[40, fy + 4], [1040, fy + 4]], col(HOT, .9), 3, 14, 1);
    human(fx, fy, s);
    const hc = [fx + 330, fy - 648 * s - 30];
    bloom(fx + 20, fy - 648 * s, 200, HOT, .25);
    glowLine([[fx + 60, fy - 640 * s], [hc[0] - 120, hc[1]]], col(HAZE, .7), 2, 0, 1);
    clock(hc[0], hc[1], 150, { s: 21, color: HOT, hot: 1.2, min0: 80, hr0: 20, angle: 54, trail: 1.2 });
    clock(fx + 330, fy - 90, 80, { s: 15, color: UV, hot: .7, angle: 20, min0: 80, hr0: 20 });
    txt("HEAD", hc[0], hc[1] + 220, { f: BARL, w: 800, size: 36, ls: 8, color: HOT, glow: 10 });
    txt("FEET", fx + 330, fy + 10, { f: BARL, w: 800, size: 30, ls: 8, color: UV });
  }

  // ---------- post: sweeps, glitch, vignette, grain ----------
  const vig = (() => { const c = document.createElement("canvas"); c.width = 1080; c.height = 1920; const x = c.getContext("2d");
    const g = x.createRadialGradient(540, 960, 620, 540, 960, 1500); g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(1, `rgba(3,2,6,${TH.look.vignette})`); x.fillStyle = g; x.fillRect(0, 0, 1080, 1920); return c; })();
  const grainTiles = [0, 1, 2].map(k => { const c = document.createElement("canvas"); c.width = 600; c.height = 1040; const x = c.getContext("2d"), im = x.createImageData(600, 1040);
    for (let i = 0; i < im.data.length; i += 4) { const v = Math.floor(hash(i * .37 + k * 91) * 255); im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255; } x.putImageData(im, 0, 0); return c; });
  const glitchBuf = document.createElement("canvas"); glitchBuf.width = 1080; glitchBuf.height = 1920; const gctx = glitchBuf.getContext("2d");
  function glitch(t, amt) {
    gctx.clearRect(0, 0, 1080, 1920); gctx.drawImage(cv, 0, 0);
    const f = Math.floor(t * 30);
    for (let i = 0; i < 9; i++) { const y = hash(f * 7 + i) * 1800, h = 14 + hash(f * 3 + i * 5) * 90, dx = (hash(f * 11 + i * 2) - .5) * 160 * amt;
      ctx.drawImage(glitchBuf, 0, y, 1080, h, dx, y, 1080, h); }
    ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = .35 * amt; ctx.drawImage(glitchBuf, 6 * amt, 0); ctx.restore();
  }
  function post(t) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    // light sweeps: slow ambient + one at each cut
    const sw = (u, a, w) => { if (u <= 0 || u >= 1) return; const x = lerp(-300, 1500, u); add(() => { const g = ctx.createLinearGradient(x - w, 0, x + w, 0); g.addColorStop(0, col(TXT, 0)); g.addColorStop(.5, col(TXT, a * Math.sin(u * Math.PI))); g.addColorStop(1, col(TXT, 0));
      ctx.save(); ctx.transform(1, 0, -.35, 1, 0, 0); ctx.fillStyle = g; ctx.fillRect(x - w, 0, w * 2, 1920); ctx.restore(); }); };
    sw(((t + 3) % 8.5) / 2.4, .035, 160);
    cuts.forEach(c => sw((t - c) / .35, .22, 220));
    ctx.drawImage(vig, 0, 0);
    const fr = Math.floor(t * 30), k = fr % 3; ctx.save(); ctx.globalCompositeOperation = "overlay"; ctx.globalAlpha = TH.look.grain; ctx.imageSmoothingEnabled = false;
    ctx.drawImage(grainTiles[k], -Math.floor(hash(fr) * 110), -Math.floor(hash(fr + 99) * 150), 1200, 2080);
    ctx.restore();
  }

  // ---------- camera plan ----------
  cut(0, { x: 540, y: 700, z: 1 });
  move(0, tHookEnd, { z: 1.05 });
  move(S("b02"), S("b02") + .8, { x: 640, y: 790, z: 1.05 });
  move(S("b02") + .8, END("b02"), { z: 1.55 });
  cut(S("b03"), { x: 540, y: 700, z: 1 }); move(S("b03") + .2, END("b03") + .2, { y: 760, z: 1.12 });
  cut(S("b04"), { x: 540, y: 830, z: 1 }); move(S("b04") + .6, END("b04"), { y: 480 });
  cut(S("b05"), { x: 640, y: 1130, z: 1.25 });
  move(W("b05", "Your head is") - .3, W("b05", "So your head's"), { y: 800, z: 1.28 });
  move(W("b05", "So your head's") + .1, END("b05"), { x: 600, y: 760, z: 1.0 });
  cut(S("b06"), { x: 400, y: 900, z: 1.45 }); move(S("b06"), END("b06"), { x: 440, z: 1.55 });
  move(S("b07"), S("b08"), { x: 600, y: 880, z: 1.3 });
  move(S("b08") + .2, S("b09") - .1, { x: 640, y: 860, z: 1.4 });
  cut(S("b09"), { x: 540, y: LY, z: 1 }); move(tl0, tl1, { x: 893 }); move(tl1 + .1, W("b09", "ninety") + .5, { z: 5.2 });
  move(W("b10", "But real"), W("b10", "But real") + 1.0, { z: 1, x: 540 });
  cut(S("b11"), { x: 540, y: 1000, z: 1.9 });
  move(S("b11") + .4, W("b11", "GPS satellites"), { z: .85 });
  move(W("b11", "GPS satellites") + .1, END("b11"), { y: 560 });
  cut(S("b12"), { x: 540, y: 700, z: 1 }); move(S("b12"), th0, { z: 1.08 });
  cut(th0, { x: 540, y: 760, z: 1.18 }); move(th0 + .4, tDrift1, { x: 580, y: 720, z: 1.04 }); move(tSnap - .2, E("b12"), { x: 540, y: 700, z: 1 });
  cut(S("b13"), { x: 540, y: 700, z: 1 });
  cut(S("b14"), { x: 540, y: 820, z: 1 }); move(S("b14") + .5, END("b14"), { y: 520 });
  cut(S("b15"), { x: 560, y: 760, z: 1.0 }); move(S("b15"), W("b15", "By a hair") - .3, { x: 520, y: 700, z: 1.12 });
  move(W("b15", "By a hair") - .3, END("b15") + .2, { x: 480, y: 600, z: 1.35 });
  [S("b03"), S("b04"), S("b05"), S("b06"), S("b09"), S("b11"), S("b12"), th0, S("b13"), S("b14"), S("b15")].forEach(c => cuts.push(c));
  cuts.forEach(c => { if (c !== S("b09")) cue(c - .02, "sweep", { dur: .45 }); });

  // ---------- sound: ticks where clocks are on screen ----------
  cue(.3, "tick", { t1: S("b03"), rate: 1 });
  cue(S("b03") + 1.2, "tick", { t1: E("b03"), rate: 1.6 });
  cue(S("b04"), "tick", { t1: E("b04"), rate: 2.4 });
  cue(S("b05"), "tick", { t1: E("b05"), rate: 1.2 });
  cue(S("b06") + 2.4, "tick", { t1: E("b08"), rate: 1.4 });
  cue(S("b11") + 1.2, "tick", { t1: E("b11"), rate: 4 });
  cue(S("b12") + .8, "tick", { t1: tSlow1, rate: 3 });
  cue(S("b15"), "tick", { t1: tSign, rate: 1.2 });

  // ---------- captions (DOM) ----------
  const CP = TH.caption, capEl = document.getElementById("cap");
  const allCaps = [];
  tl.beats.forEach(b => b.captions.forEach(c => allCaps.push(Object.assign({ beat: b.id }, c))));
  // the verdict card carries "True." and the rule line itself; the end card replaces the last words
  const capHidden = c => (c.beat === "b13" && (/^True/.test(c.text) || /^The higher/.test(c.text)));
  const NUMW = /^(\d[\d.,]*|two|seventy-nine|ninety|2010)$/i;
  function wrapLines(words) {
    const lines = []; let c = "";
    for (const w of words) { if (c && (c + " " + w).length > CP.maxLineChars) { lines.push(c); c = w; } else c = c ? c + " " + w : w; }
    if (c) lines.push(c); return lines;
  }
  let capCache = null;
  function buildCaption(c) {
    const words = c.text.split(" "); let idx = 0, html = "";
    wrapLines(words).forEach(ln => {
      html += '<span class="ln"><span class="bk">';
      ln.split(" ").forEach((w, wi) => {
        const bare = w.replace(/[^\w-]/g, ""), isNum = NUMW.test(bare);
        const cls = [isNum ? "num" : "", idx === c.key ? "key" : ""].join(" ").trim();
        html += (wi ? " " : "") + (cls ? `<span class="${cls}">${w}</span>` : w); idx++;
      });
      html += "</span></span>";
    });
    capEl.innerHTML = html;
    capEl.style.fontFamily = BARL; capEl.style.fontWeight = CP.weight; capEl.style.color = CP.color;
    capEl.style.left = CP.left + "px"; capEl.style.width = (1080 - CP.left - CP.right) + "px";
    let size = CP.size; capEl.style.fontSize = size + "px"; capEl.style.lineHeight = CP.lineHeight;
    capEl.querySelectorAll(".bk").forEach(b => { b.style.background = CP.backing; b.style.padding = `${CP.padY}px ${CP.padX}px`; b.style.borderRadius = CP.radius + "px"; b.style.boxDecorationBreak = "clone"; });
    const maxW = 1080 - CP.left - CP.right;
    while (size > 44 && Math.max(...[...capEl.querySelectorAll(".bk")].map(b => b.getBoundingClientRect().width)) > maxW) { size -= 2; capEl.style.fontSize = size + "px"; }
    capEl.style.top = (CP.bottomY - capEl.getBoundingClientRect().height) + "px";
  }
  function setCaption(t) {
    let c = null;
    for (const k of allCaps) if (t >= k.start && t < k.end + .12) c = k;
    if (!c || capHidden(c) || t >= tSign - .15) { capEl.style.opacity = 0; capCache = null; return; }
    if (capCache !== c) { buildCaption(c); capCache = c; }
    capEl.style.opacity = clamp((t - c.start) / .09);
  }

  // ---------- seek ----------
  const SHOTS = [
    { t0: 0, t1: S("b03"), fn: sceneA }, { t0: S("b03"), t1: S("b04"), fn: sceneB }, { t0: S("b04"), t1: S("b05"), fn: sceneC },
    { t0: S("b05"), t1: S("b06"), fn: sceneA }, { t0: S("b06"), t1: S("b09"), fn: sceneD }, { t0: S("b09"), t1: S("b11"), fn: sceneE },
    { t0: S("b11"), t1: S("b12"), fn: sceneF }, { t0: S("b12"), t1: th0, fn: sceneG }, { t0: th0, t1: S("b13"), fn: sceneH },
    { t0: S("b14"), t1: S("b15"), fn: sceneJ }, { t0: S("b15"), t1: 1e9, fn: sceneA },
  ];
  window.__seek = function (t) {
    if (COVER) { ctx.setTransform(1, 0, 0, 1, 0, 0); drawCover(); post(0); return; }
    CAM = camAt(t); SHK = shakeAt(t);
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 1; ctx.fillStyle = ABY; ctx.fillRect(0, 0, 1080, 1920);
    dust(t, .2, 110, .8);
    if (t >= S("b13") && t < S("b14")) { verdict(t, tTrue, { t0: S("b13"), rule: tRule }); }
    else for (const s of SHOTS) if (t >= s.t0 && t < s.t1) s.fn(t);
    dust(t, .75, 110, .9);
    if (t < tHookEnd + .8) hookHeadline(t);
    // end card over the last scene
    if (t >= tSign - .35) { const u = smooth((t - (tSign - .35)) / .3); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.save(); ctx.globalAlpha = u; ctx.fillStyle = ABY; ctx.fillRect(0, 0, 1080, 1920); ctx.restore();
      ctx.save(); ctx.globalAlpha = 1; verdict(t, -1e9 + 0, { t0: tSign - .35, rule: tSign - .35, sign: tSign, bg: 1 }); ctx.restore(); }
    // glitch: the riser into the verdict, and the stamp impact
    let gl = 0;
    if (t > tTrue - .45 && t < tTrue) gl = .5 + (t - (tTrue - .45)) / .45 * .5;
    else if (t >= tTrue && t < tTrue + .14) gl = .7;
    else if (t >= S("b13") && t < S("b13") + .12) gl = .5;
    if (gl > 0) glitch(t, gl);
    post(t);
    setCaption(t);
  };
  cues.sort((a, b) => a.t - b.t);
  window.__cues = cues;
  window.__duration = DUR;
  window.__seek(0);
  window.__ready = true;
})();
