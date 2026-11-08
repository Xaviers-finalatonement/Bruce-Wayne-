// Pan Theory ep02 type overlay: hook headline, term stickers, HUDs, end card. Captions come from engine/film/type.js.
import { clamp, smooth, eio, eo3, eob, lerp } from "./timing.js";
import { createType } from "../../../engine/film/type.js";

export function createOverlay(T, TH, cv) {
  const C = TH.colors, { S, E, END, W } = T, Ty = createType(cv, TH), { ctx } = Ty;
  const RUB = `"Rubik", sans-serif`, NUN = `"Nunito", sans-serif`, CX = 505;
  const capEl = document.getElementById("cap");
  // caption hidden while the hook title is up; once a caption shows it is always fully opaque
  const captions = t => { Ty.captions(t, T.tSign + 5, (c, tt) => tt < T.hookEnd); if (capEl.style.opacity !== "0") capEl.style.opacity = 1; }, initCaps = Ty.initCaps;
  const rgba = (h, a) => `rgba(${parseInt(h.slice(1, 3), 16)},${parseInt(h.slice(3, 5), 16)},${parseInt(h.slice(5, 7), 16)},${a})`;
  const mw = (s, size, f = RUB, w = 800, ls = 0) => { ctx.save(); ctx.font = `${w} ${size}px ${f}`; ctx.letterSpacing = ls + "px"; const r = ctx.measureText(s).width; ctx.restore(); return r; };
  function text(s, x, y, o) { ctx.save(); ctx.font = `${o.w || 800} ${o.size || 48}px ${o.f || RUB}`; ctx.letterSpacing = (o.ls || 0) + "px"; ctx.textAlign = o.align || "center"; ctx.globalAlpha = o.a == null ? 1 : o.a; ctx.fillStyle = o.color || C.cast;
    if (o.sc || o.rot) { ctx.translate(x, y); if (o.rot) ctx.rotate(o.rot); if (o.sc) ctx.scale(o.sc, o.sc); ctx.fillText(s, 0, 0); } else ctx.fillText(s, x, y); ctx.restore(); }
  const rr = (x, y, w, h, r) => { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); };
  function sticker(parts, cx, cy, o) {
    o = o || {}; const size = o.size || 54, f = o.f || RUB, w = o.w || 800, ws = parts.map(p => mw(p[0], size, f, w)), tot = ws.reduce((a, b) => a + b, 0), padX = o.padX || 32, h = size * 1.56, bw = tot + 2 * padX;
    ctx.save(); ctx.globalAlpha = o.a == null ? 1 : o.a; ctx.translate(cx, cy); ctx.rotate(o.rot || 0); ctx.scale(o.sc || 1, o.sc || 1);
    ctx.shadowColor = "rgba(31,29,27,.28)"; ctx.shadowBlur = 22; ctx.shadowOffsetY = 9; rr(-bw / 2, -h / 2, bw, h, h * .3); ctx.fillStyle = o.fill || rgba(C.countertop, .97); ctx.fill(); ctx.shadowColor = "transparent";
    if (o.stroke) { ctx.lineWidth = 4; ctx.strokeStyle = o.stroke; ctx.stroke(); }
    let x = -tot / 2; parts.forEach((p, i) => { ctx.font = `${w} ${size}px ${f}`; ctx.fillStyle = p[1]; ctx.textAlign = "left"; ctx.fillText(p[0], x, size * .36); x += ws[i]; }); ctx.restore();
  }
  const env = (t, t0, t1) => t < t0 || t > t1 ? null : { a: smooth((t - t0) / .12) * (1 - smooth((t - t1 + .3) / .3)), sc: .72 + .28 * eob((t - t0) / .35) };
  const st = (t, t0, t1, parts, cx, cy, o) => { const e = env(t, t0, t1); if (e) sticker(parts, cx, cy, Object.assign({ a: e.a, sc: e.sc }, o)); };
  const BUT = C.butter, TOM = C.tomato, CAST = C.cast, CT = C.countertop;
  const clampX = (x, w) => Math.min(950 - w / 2, Math.max(70 + w / 2, x));

  // ---- hook headline: three big Rubik lines ----
  const HL = [[["YOUR ONION", CAST]], [["SHOOTS TINY", CAST]], [["DROPLETS", TOM]]];
  const lw = parts => parts.reduce((a, p) => a + mw(p[0], 100), 0);
  const hookSize = () => Math.min(138, ...HL.map(l => 860 * 100 / lw(l)));
  function hook(t) {
    if (t > T.hookEnd + .5) return; const size = hookSize(), exit = smooth((t - T.hookEnd) / .4); ctx.save(); ctx.globalAlpha = 1 - exit; ctx.translate(0, -exit * 150);
    HL.forEach((l, i) => { const t0 = .02 + i * .06, u = (t - t0) / .14; if (u < 0) return; const sc = 1 + .45 * (1 - eo3(u)), base = 160 + size * .78 + i * size * 1.04;
      ctx.save(); ctx.translate(CX, base); ctx.scale(sc, sc); const tot = l.reduce((a, p) => a + mw(p[0], size, RUB, 800, -1), 0); let x = -tot / 2;
      l.forEach(p => { text(p[0], x, 0, { size, color: p[1], a: .4 + .6 * clamp(u * 3), ls: -1, align: "left" }); x += mw(p[0], size, RUB, 800, -1); }); ctx.restore(); });
    ctx.restore();
  }
  // two-line card sticker (big number line + small unit line)
  function card2(l1, l2, cx, cy, a, sc, o) { o = o || {}; const s1 = o.s1 || 76, s2 = o.s2 || 48, w = Math.max(mw(l1, s1), mw(l2, s2, NUN)) + 70, h = s1 * 1.1 + s2 * 1.3 + 26;
    ctx.save(); ctx.globalAlpha = a; ctx.translate(cx, cy); ctx.rotate(o.rot || 0); ctx.scale(sc, sc); ctx.shadowColor = "rgba(31,29,27,.28)"; ctx.shadowBlur = 22; ctx.shadowOffsetY = 9; rr(-w / 2, -h / 2, w, h, 34); ctx.fillStyle = o.fill || BUT; ctx.fill(); ctx.restore();
    text(l1, cx, cy - h / 2 + s1 * .98 + 8, { size: s1, color: CAST, a, sc, rot: o.rot }); }
  const illus = (t, t0, t1, y) => st(t, t0, t1, [["illustration, not to scale", CAST]], CX, y, { size: 46, f: NUN, fill: rgba(CT, .97), padX: 26 });
  const dotLine = (x0, y0, x1, y1, a, color, dash) => { ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = color; ctx.lineWidth = 8; ctx.lineCap = "round"; ctx.setLineDash(dash || []); ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke(); ctx.restore(); };
  function eyeGlyph(cx, cy, a, sc) { ctx.save(); ctx.globalAlpha = a; ctx.translate(cx, cy); ctx.scale(sc, sc); ctx.shadowColor = "rgba(31,29,27,.28)"; ctx.shadowBlur = 20; ctx.shadowOffsetY = 8; ctx.beginPath(); ctx.arc(0, 0, 112, 0, 6.3); ctx.fillStyle = BUT; ctx.fill(); ctx.shadowColor = "transparent";
    ctx.strokeStyle = CAST; ctx.lineWidth = 9; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.beginPath(); ctx.moveTo(-76, 0); ctx.quadraticCurveTo(0, -78, 76, 0); ctx.quadraticCurveTo(0, 78, -76, 0); ctx.stroke(); ctx.beginPath(); ctx.arc(0, 0, 27, 0, 6.3); ctx.fillStyle = CAST; ctx.fill(); ctx.restore(); }

  function labels(t, A) {
    const z = A.zone;
    // b02: slow-motion frame counter (the playback frame number) + the fps range
    if (t >= S("b02") && t < E("b02") - .05) { const a = smooth((t - S("b02")) / .2) * (1 - smooth((t - E("b02") + .3) / .3)), n = 100 + Math.floor((t - S("b02")) * 30);
      sticker([["● ", TOM], ["slow motion · frame " + String(n).padStart(4, "0"), CAST]], 470, 1150, { a, size: 46, f: NUN, fill: rgba(CT, .96), padX: 28 }); }
    { const e = env(t, T.tFps - .15, E("b02") - .05); if (e) card2("5,000 – 20,000", "frames per second", CX, 300, e.a, e.sc, { s1: 76, s2: 48 }); if (e) text("frames per second", CX, 300 + 76 * .55 + 28, { size: 48, f: NUN, color: CAST, a: e.a, sc: e.sc }); }
    // b03: speed counter beside the tracked droplet
    if (t >= S("b03") && t < E("b03") && A.drop) { const a = smooth((t - T.C3 - .25) / .2) * (1 - smooth((t - E("b03") + .3) / .3)), n = Math.round(40 * eo3((t - T.C3 - .3) / 1.3)), w = 640;
      const x = clampX(A.drop.x + 40, w), y = Math.max(240, Math.min(900, A.drop.y - 250)); sticker([["up to ", CAST], [String(n) + " m/s", TOM]], x, y, { a, size: 62, fill: rgba(CT, .97), padX: 36 });
      const e = env(t, T.tMph - .05, E("b03") - .05); if (e) sticker([["≈ 90 mph", CAST]], clampX(x, 520), y + 118, { a: e.a, sc: e.sc, size: 70, fill: rgba(BUT, 1), padX: 40, rot: -.03 }); }
    // b04
    st(t, T.tRig - .1, E("b04") - .05, [["lab rig", CAST], [" · not a chef", TOM]], CX, 270, { size: 62, fill: rgba(BUT, 1), padX: 40, rot: -.025 });
    // b05: stopwatch + the two figures
    if (t >= S("b05") && t < E("b05")) { const a = smooth((t - T.f1 + .3) / .2) * (1 - smooth((t - E("b05") + .3) / .3)), el = .02 * clamp((t - T.f1) / 1.0);
      sticker([["after the burst starts  ", CAST], [el.toFixed(3) + " s", TOM]], 505, 1150, { a, size: 46, f: NUN, fill: rgba(CT, .96), padX: 28 }); }
    st(t, T.tFift, T.f2 + .1, [["< 0.02 s", CAST]], CX, 270, { size: 90, fill: rgba(BUT, 1), padX: 46, rot: -.03 });
    st(t, T.f2 + .1, E("b05") - .05, [["hundreds → thousands", CAST]], CX, 270, { size: 58, fill: rgba(BUT, 1), padX: 40, rot: -.02 });
    // b06: cell-scale view
    if (z === "cells") { st(t, T.tSulf - .1, T.tIrr + .2, [["sulfur compounds", CAST]], CX, 330, { size: 62, fill: rgba(BUT, 1), padX: 38 });
      st(t, T.tIrr + .1, E("b06") - .05, [["→ propanethial S-oxide", TOM]], CX, 330, { size: 50, fill: rgba(CT, .97), padX: 30 }); }
    if (t >= T.cellIn && t < S("b08")) illus(t, T.cellIn + .1, S("b08") - .2, 1262);
    // b07: cornea + tears
    if (z === "eye" && A.cornea) {
      const e = env(t, T.tCor - .05, E("b07") - .05); if (e) { dotLine(CX, 410, A.cornea.x, A.cornea.y - 40, e.a * .9, CAST, [1, 16]); sticker([["cornea", CAST]], CX, 340, { a: e.a, sc: e.sc, size: 64, fill: rgba(BUT, 1), padX: 40 }); }
      const e2 = env(t, T.tTear, E("b07") - .05); if (e2) sticker([["→ tears", TOM]], CX, 1190, { a: e2.a, sc: e2.sc, size: 64, fill: rgba(CT, .97), padX: 40 }); }
    // b08: the theory is a dashed arrow to an eye line at the frame edge
    if (t >= S("b08") && t < S("b09")) { const a = smooth((t - T.tChem) / .3) * (1 - smooth((t - S("b09") + .3) / .3)), p = clamp((t - T.tChem) / 1.1);
      if (a > .01) { const x0 = 560, y0 = 880, x1 = 300, y1 = 470; dotLine(x0, y0, lerp(x0, x1, eo3(p)), lerp(y0, y1, eo3(p)), a, TOM, [4, 22]); eyeGlyph(215, 360, a, .75 + .25 * eob(p)); }
      st(t, T.tChem + .3, S("b09") - .05, [["suggested, not shown here", CAST]], CX, 1170, { size: 52, fill: rgba(BUT, 1), padX: 36, rot: -.015 }); }
    // b09: three stage tags pointing at the section
    if (z === "slab" && A.proj) { const tags = [[T.sSkin, T.sFlesh, "skin holds", CAST, [0, 1.28 + .05, 0]], [T.sFlesh, T.sBurst, "flesh squeezed", CAST, [0, .55, 0]], [T.sBurst, E("b09") - .05, "bursts", TOM, [0, 1.3, 0]]];
      tags.forEach(([t0, t1, s_, col, wp]) => { const e = env(t, t0 - .05, t1); if (!e) return; const p = A.proj(wp[0] + .9, wp[1], 30); dotLine(CX, 400, p.x, p.y, e.a * .9, CAST, [1, 16]); sticker([[s_, col]], CX, 330, { a: e.a, sc: e.sc, size: 64, fill: rgba(BUT, 1), padX: 40 }); }); }
    // b10 / b11 split
    if (z === "split" && A.split) { const a = smooth((t - S("b10")) / .25) * (1 - smooth((t - E("b11") + .3) / .3));
      text("the study's comparison", CX, 215, { size: 46, f: NUN, color: CAST, a }); 
      const bl = env(t, S("b10") + .05, S("b11") - .05); if (bl) sticker([["blunt", CAST]], A.split.L.x, 330, { a: bl.a, sc: bl.sc, size: 62, fill: rgba(CT, .97), padX: 36 });
      const sh = env(t, S("b10") + .05, E("b11") - .05); if (sh && t < S("b11")) sticker([["sharp", CAST]], A.split.R.x, 330, { a: sh.a, sc: sh.sc, size: 62, fill: rgba(CT, .97), padX: 36 });
      const fa = env(t, T.tFast - .1, S("b11") - .05); if (fa) sticker([["fast", TOM]], A.split.L.x, 430, { a: fa.a, sc: fa.sc, size: 62, fill: rgba(BUT, 1), padX: 36 });
      const ma = env(t, T.tFast + .5, S("b11") - .05); if (ma) sticker([["more droplets", CAST]], A.split.L.x, 1130, { a: ma.a, sc: ma.sc, size: 54, fill: rgba(BUT, 1), padX: 32 });
      st(t, S("b11") + .1, E("b11") - .05, [["sharp = fewer, slower", CAST]], CX, 330, { size: 58, fill: rgba(BUT, 1), padX: 38 }); }
  }
  // ---- end card ----
  function card(t) {
    if (t < T.tCard) return; const u = smooth((t - T.tCard) / .45); ctx.save(); ctx.globalAlpha = u * .8; ctx.fillStyle = C.countertop; ctx.fillRect(0, 0, 1080, 1920); ctx.restore();
    const line = (s, base, size, color, d) => { const k = clamp((t - T.tCard - d) / .3); if (k <= 0) return; text(s, CX, base, { size, color, a: smooth(k * 2), sc: 1 + .35 * (1 - eo3(k)) }); };
    line("THE PAN", 420, 150, CAST, .1); line("THEORY:", 575, 150, TOM, .22);
    const L = [[[["sharpen", TOM], [" your knife", CAST]], 725], [[["sharp knife → fewer droplets", CAST]], 850]];
    L.forEach(([parts, y], i) => { const sz = i ? 50 : 82, kk = clamp((t - T.tCard - .5 - i * .25) / .35); if (kk <= 0) return; const tot = parts.reduce((a, p) => a + mw(p[0], sz), 0), w = tot + 56; ctx.save(); ctx.globalAlpha = smooth(kk * 2); ctx.translate(CX, y - sz * .3); ctx.rotate(-.018 + i * .02); ctx.scale(.85 + .15 * eob(kk), .85 + .15 * eob(kk));
      ctx.fillStyle = C.butter; ctx.shadowColor = "rgba(31,29,27,.22)"; ctx.shadowBlur = 18; ctx.shadowOffsetY = 8; rr(-w / 2, -sz * .72, w, sz * 1.26, 24); ctx.fill(); ctx.shadowColor = "transparent";
      let x = -tot / 2; parts.forEach(p => { ctx.font = `800 ${sz}px ${RUB}`; ctx.fillStyle = p[1]; ctx.textAlign = "left"; ctx.fillText(p[0], x, sz * .3); x += mw(p[0], sz); }); ctx.restore(); });
    const k3 = smooth((t - T.tCard - 1.2) / .4); text("Food education, not diet advice.", CX, 1000, { f: NUN, size: 46, color: CAST, a: k3 });
    const k4 = smooth((t - T.tSign) / .4); if (k4 > 0) { ctx.save(); ctx.globalAlpha = k4; ctx.fillStyle = CAST; ctx.beginPath(); ctx.arc(CX - 160, 1128, 15, 0, 6.3); ctx.fill(); ctx.fillRect(CX - 148, 1124, 34, 8); ctx.restore(); text("Pan Theory", CX + 40, 1146, { size: 46, w: 500, color: CAST, a: k4, ls: 1 }); }
  }
  function draw(t, A) {
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, 1080, 1920);
    if (A.veil && A.veil.a > .002) { ctx.save(); ctx.globalAlpha = A.veil.a; ctx.fillStyle = A.veil.col; ctx.fillRect(0, 0, 1080, 1920); ctx.restore(); }
    hook(t); labels(t, A); card(t);
    ctx.getImageData(0, 0, 1, 1);
  }
  function drawCover() {
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, 1080, 1920);
    const lines = [["WHY ONIONS", CAST], ["MAKE YOU", CAST], ["CRY", CAST]], size = Math.min(138, ...lines.map(l => 880 * 100 / mw(l[0], 100)));
    ctx.save(); const g = ctx.createLinearGradient(0, 230, 0, 840); g.addColorStop(0, "rgba(247,241,230,.7)"); g.addColorStop(.8, "rgba(247,241,230,.5)"); g.addColorStop(1, "rgba(247,241,230,0)"); ctx.fillStyle = g; ctx.fillRect(0, 230, 1080, 640); ctx.restore();
    lines.forEach((l, i) => text(l[0], CX, 385 + i * size * 1.05, { size, color: l[1], ls: -1 }));
    sticker([["it’s the ", CAST], ["DROPLETS", TOM]], CX, 385 + 3 * size * 1.05 + 10, { size: 78, fill: rgba(BUT, 1), padX: 44, rot: -.03 });
    sticker([["PAN THEORY", CT]], 285, 205, { size: 46, fill: rgba(CAST, 1), padX: 30 });
    ctx.save(); ctx.fillStyle = C.tomato; ctx.beginPath(); ctx.arc(133, 205, 11, 0, 6.3); ctx.fill(); ctx.restore();
  }
  return { draw, drawCover, captions, initCaps };
}
