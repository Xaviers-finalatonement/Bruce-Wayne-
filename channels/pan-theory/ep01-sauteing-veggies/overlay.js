// Pan Theory ep01 type overlay: hook headline, sticker labels, heat waves, veil, end card. Captions come from engine/film/type.js.
import { clamp, smooth, eio, eo3, eob, lerp } from "./timing.js";
import { createType } from "../../../engine/film/type.js";

export function createOverlay(T, TH, cv) {
  const C = TH.colors, { S, E, END, W } = T, Ty = createType(cv, TH), { ctx } = Ty;
  const RUB = `"Rubik", sans-serif`, NUN = `"Nunito", sans-serif`, CX = 505;
  const captions = t => Ty.captions(t, T.tSign + 5, () => false), initCaps = Ty.initCaps;
  const rgba = (h, a) => `rgba(${parseInt(h.slice(1, 3), 16)},${parseInt(h.slice(3, 5), 16)},${parseInt(h.slice(5, 7), 16)},${a})`;
  const mw = (s, size, f = RUB, w = 800, ls = 0) => { ctx.save(); ctx.font = `${w} ${size}px ${f}`; ctx.letterSpacing = ls + "px"; const r = ctx.measureText(s).width; ctx.restore(); return r; };
  function text(s, x, y, o) { ctx.save(); ctx.font = `${o.w || 800} ${o.size || 48}px ${o.f || RUB}`; ctx.letterSpacing = (o.ls || 0) + "px"; ctx.textAlign = o.align || "center"; ctx.globalAlpha = o.a == null ? 1 : o.a; ctx.fillStyle = o.color || C.cast;
    if (o.sc || o.rot) { ctx.translate(x, y); if (o.rot) ctx.rotate(o.rot); if (o.sc) ctx.scale(o.sc, o.sc); ctx.fillText(s, 0, 0); } else ctx.fillText(s, x, y); ctx.restore(); }
  const rr = (x, y, w, h, r) => { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); };
  // sticker: parts = [[text, color]]; fill = panel colour
  function sticker(parts, cx, cy, o) {
    o = o || {}; const size = o.size || 54, f = o.f || RUB, w = o.w || 800, ws = parts.map(p => mw(p[0], size, f, w)), tot = ws.reduce((a, b) => a + b, 0), padX = o.padX || 32, h = size * 1.56, bw = tot + 2 * padX;
    ctx.save(); ctx.globalAlpha = o.a == null ? 1 : o.a; ctx.translate(cx, cy); ctx.rotate(o.rot || 0); ctx.scale(o.sc || 1, o.sc || 1);
    ctx.shadowColor = "rgba(31,29,27,.28)"; ctx.shadowBlur = 22; ctx.shadowOffsetY = 9; rr(-bw / 2, -h / 2, bw, h, h * .3); ctx.fillStyle = o.fill || rgba(C.countertop, .97); ctx.fill(); ctx.shadowColor = "transparent";
    if (o.stroke) { ctx.lineWidth = 4; ctx.strokeStyle = o.stroke; ctx.stroke(); }
    let x = -tot / 2; parts.forEach((p, i) => { ctx.font = `${w} ${size}px ${f}`; ctx.fillStyle = p[1]; ctx.textAlign = "left"; ctx.fillText(p[0], x, size * .36); x += ws[i]; }); ctx.restore();
  }
  // entry/exit envelope for a label shown [t0, t1)
  const env = (t, t0, t1) => t < t0 || t > t1 ? null : { a: smooth((t - t0) / .12) * (1 - smooth((t - t1 + .3) / .3)), sc: .72 + .28 * eob((t - t0) / .35) };
  const st = (t, t0, t1, parts, cx, cy, o) => { const e = env(t, t0, t1); if (e) sticker(parts, cx, cy, Object.assign({ a: e.a, sc: e.sc }, o)); };
  const BUT = C.butter, TOM = C.tomato, HERB = C.herb, CAST = C.cast, CT = C.countertop;

  // ---- hook headline: four big Rubik lines, all in by ~0.3 s ----
  const HL = [["OIL HELPS", CAST], ["YOUR CARROTS.", CAST], ["HEAT COSTS", TOM], ["YOUR PEPPERS.", CAST]];
  const hookSize = () => Math.min(124, ...HL.map(l => 860 * 100 / mw(l[0], 100)));
  function hook(t) {
    if (t > T.hookEnd + .5) return; const size = hookSize(), exit = smooth((t - T.hookEnd) / .4); ctx.save(); ctx.globalAlpha = 1 - exit; ctx.translate(0, -exit * 150);
    HL.forEach((l, i) => { const t0 = .02 + i * .05, u = (t - t0) / .14; if (u < 0) return; const sc = 1 + .45 * (1 - eo3(u)), base = 160 + size * .78 + i * size * 1.04;
      let pulse = 1; if (i === 2) pulse = 1 + .05 * Math.sin(clamp((t - T.W("b01", "Heat costs")) / .35) * Math.PI);
      ctx.save(); ctx.translate(CX, base); ctx.scale(sc * pulse, sc * pulse); text(l[0], 0, 0, { size, color: l[1], a: .4 + .6 * clamp(u * 3) , ls: -1 }); ctx.restore(); });
    ctx.restore();
  }
  // ---- heat waves (b02): wavy Tomato strokes rising from the right half of the pan ----
  function heatWaves(t, A) {
    const hk = smooth(clamp((t - T.tHeat + .3) / .6)) * (1 - smooth(clamp((t - E("b02") - .2) / .6))); if (hk < .01 || !A.proj) return;
    const p0 = A.proj(.2, .5, -1.1), p1 = A.proj(1.4, .5, 1.1), span = Math.abs(p1.y - p0.y); ctx.save(); ctx.lineCap = "round"; ctx.strokeStyle = TOM;
    for (let i = 0; i < 5; i++) { const bx = lerp(p0.x, p1.x, i / 4), ph = (t * .45 + i * .21) % 1, y0 = lerp(p1.y, p0.y - 160, ph); ctx.globalAlpha = hk * .55 * Math.sin(Math.PI * ph); ctx.lineWidth = 9 - ph * 4; ctx.beginPath();
      for (let k = 0; k <= 14; k++) { const yy = y0 - k * 14, xx = bx + Math.sin(k * .7 + t * 4 + i) * (10 + k * 1.6); k ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy); } ctx.stroke(); }
    ctx.restore();
  }
  function arrowDown(x, y0, y1, a) { return; ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = C.cast; ctx.fillStyle = C.cast; ctx.lineWidth = 12; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(x, y1 - 14); ctx.stroke(); ctx.beginPath(); ctx.moveTo(x - 26, y1 - 32); ctx.lineTo(x, y1 + 4); ctx.lineTo(x + 26, y1 - 32); ctx.closePath(); ctx.fill(); ctx.restore(); }

  // ---- per-beat labels ----
  function labels(t, A) {
    const z = A.zone;
    // b02
    st(t, T.tOil + .5, E("b02"), [["+ oil", CAST]], 285, 300, { fill: rgba(BUT, 1), size: 62, rot: -.04 });
    st(t, T.tHeat + .05, E("b02"), [["− heat", CT]], 745, 300, { fill: rgba(TOM, 1), size: 62, rot: .04 });
    // b03: carotenoids -> vitamin A (molecule view)
    st(t, T.tCaro - .1, E("b03") - .1, [["carotenoids", TOM]], CX, 260, { size: 64, fill: rgba(CT, .97) });
    { const e = env(t, T.tBody + .3, E("b03") - .1); if (e) { arrowDown(CX, 1010, 1075, e.a); sticker([["→ vitamin A", CAST]], CX, 1190, { a: e.a, sc: e.sc, size: 60, fill: rgba(BUT, 1) }); } }
    // b04: split frame
    if (t >= S("b04") && t < S("b05")) { const a = smooth((t - S("b04")) / .3) * (1 - smooth((t - E("b04") + .3) / .3));
      ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = rgba(CT, .96); ctx.fillRect(0, 742, 1080, 10); ctx.restore();
      sticker([["no oil", CAST]], 215, 205, { a, size: 38, fill: rgba(CT, .95) }); sticker([["with oil", CAST]], 223, 800, { a, size: 38, fill: rgba(BUT, 1) });
      st(t, T.tFat, E("b04") + .2, [["better with a little fat", CAST]], CX, 747, { size: 50, fill: rgba(BUT, 1), stroke: rgba(CAST, 1) }); }
    // b07
    st(t, T.tVit - .1, E("b07") + .3, [["vitamins A · D · E · K", CAST]], CX, 232, { size: 58, fill: rgba(BUT, 1) });
    st(t, T.tFatH - .1, E("b07") + .3, [["absorbed more easily with ", CAST], ["fat", TOM]], CX, 330, { size: 40, f: NUN, fill: rgba(CT, .97) });
    // b08
    st(t, T.tVC - .1, T.diveFrom2 + 1.2, [["vitamin C", CT]], CX, 250, { size: 70, fill: rgba(HERB, 1) });
    // b09
    st(t, T.tWater - .15, E("b09") - .1, [["water-soluble", CT]], CX, 250, { size: 56, fill: rgba(HERB, 1) });
    st(t, T.tLower + .15, E("b09") - .1, [["cooking can lower it", CT]], CX, 345, { size: 50, fill: rgba(TOM, 1) });
    // b10
    st(t, S("b10") + .15, E("b10") - .1, [["also: microwaving · steaming", CAST]], CX, 170, { size: 42, fill: rgba(BUT, 1) });
    if (z === "K" && t >= S("b10") && t < S("b11") && A.proj) { const a = smooth((t - S("b10") - .3) / .3) * (1 - smooth((t - E("b10") + .3) / .3)), X = 24;
      [["microwave", -1.75, -.55], ["steamer", 1.75, -.55], ["pan", -.1, 2.55]].forEach(([n, x, z2]) => { const p = A.proj(X + x, .2, z2 + (n === "pan" ? 0 : -2.6 + 2.6)); sticker([[n, CAST]], p.x, p.y, { a, size: 34, fill: rgba(CT, .96) }); }); }
    // b11
    st(t, T.tRaw - .1, E("b11") - .05, [["raw = best sources", CAST]], CX, 190, { size: 48, fill: rgba(BUT, 1) });
    if (z === "K" && t >= S("b11") && t < S("b12") && A.proj) { const a = smooth((t - S("b11") - .1) / .3) * (1 - smooth((t - E("b11") + .3) / .3)), X = 40;
      const pl = A.proj(X - 1.55, .5, -.2), pr = A.proj(X + 1.55, .5, -.2); sticker([["raw", CAST]], pl.x, pl.y, { a, size: 40, fill: rgba(CT, .96) }); sticker([["cooked", CT]], pr.x, pr.y, { a, size: 40, fill: rgba(TOM, 1) }); }
    // b12
    st(t, T.tTrade - .05, E("b12") + .2, [["a trade", CAST]], CX, 262, { size: 92, fill: rgba(BUT, 1), padX: 44, rot: -.03 });
    // b13
    st(t, T.tDiet - .15, E("b13") - .05, [["education, not a diet rule", CAST]], CX, 235, { size: 44, f: RUB, fill: rgba(CT, .97) });
  }
  // ---- end card ----
  function card(t) {
    if (t < T.tCard) return; const lt = t - T.tCard, u = smooth(lt / .45); ctx.save(); ctx.globalAlpha = u * .84; ctx.fillStyle = C.countertop; ctx.fillRect(0, 0, 1080, 1920); ctx.restore();
    const line = (s, base, size, color, d) => { const k = clamp((t - T.tCard - d) / .3); if (k <= 0) return; text(s, CX, base, { size, color, a: smooth(k * 2), sc: 1 + .3 * (1 - eob(k)) * 0 + .35 * (1 - eo3(k)) }); };
    line("THE PAN", 420, 150, CAST, .1); line("THEORY:", 575, 150, TOM, .22);
    const k2 = clamp((t - T.tCard - .5) / .35); if (k2 > 0) { const e = eob(k2);
      [["carrots +", 720, 94], ["a little oil", 835, 94]].forEach(([s, y, size], i) => { const w = mw(s, size) + 56, kk = clamp((t - T.tCard - .5 - i * .12) / .35); if (kk <= 0) return; ctx.save(); ctx.globalAlpha = smooth(kk * 2); ctx.translate(CX, y - 30); ctx.rotate(-.018 + i * .02); ctx.scale(.85 + .15 * eob(kk), .85 + .15 * eob(kk));
        ctx.fillStyle = C.butter; ctx.shadowColor = "rgba(31,29,27,.22)"; ctx.shadowBlur = 18; ctx.shadowOffsetY = 8; rr(-w / 2, -size * .72, w, size * 1.26, 24); ctx.fill(); ctx.restore(); text(s, CX, y, { size, color: CAST, a: smooth(kk * 2), rot: -.018 + i * .02 }); }); }
    const k3 = smooth((t - T.tCard - 1.0) / .4); text("Food education, not diet advice.", CX, 1000, { f: NUN, size: 36, color: CAST, a: k3 });
    const k4 = smooth((t - T.tSign) / .4); if (k4 > 0) { ctx.save(); ctx.globalAlpha = k4; ctx.fillStyle = CAST; ctx.beginPath(); ctx.arc(CX - 118, 1128, 15, 0, 6.3); ctx.fill(); ctx.fillRect(CX - 106, 1124, 34, 8); ctx.restore(); text("Pan Theory", CX + 30, 1146, { size: 46, w: 500, color: CAST, a: k4, ls: 1 }); }
  }
  function draw(t, A) {
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, 1080, 1920);
    if (A.veil && A.veil.a > .002) { ctx.save(); ctx.globalAlpha = A.veil.a; ctx.fillStyle = A.veil.col; ctx.fillRect(0, 0, 1080, 1920); ctx.restore(); }
    hook(t); heatWaves(t, A); labels(t, A); card(t);
    ctx.getImageData(0, 0, 1, 1);
  }
  function drawCover() {
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, 1080, 1920);
    const lines = [["WHAT SAUTÉING", CAST], ["DOES TO YOUR", CAST], ["VEGGIES", CAST]], size = Math.min(112, ...lines.map(l => 880 * 100 / mw(l[0], 100)));
    lines.forEach((l, i) => text(l[0], CX, 375 + i * size * 1.05, { size, color: l[1], ls: -1 }));
    sticker([["it’s a ", CAST], ["TRADE", TOM]], CX, 375 + 3 * size * 1.05 + 20, { size: 78, fill: rgba(BUT, 1), padX: 44, rot: -.03 });
    sticker([["PAN THEORY", CT]], 258, 190, { size: 36, fill: rgba(CAST, 1), padX: 30 });
    ctx.save(); ctx.fillStyle = C.tomato; ctx.beginPath(); ctx.arc(133, 190, 11, 0, 6.3); ctx.fill(); ctx.restore();
  }
  return { draw, drawCover, captions, initCaps };
}
