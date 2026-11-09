// Skin Receipts type overlay: hook headline, the thermal receipt that prints down the left side (Courier Prime, Navy), rubber stamps,
// number labels, end card. DOM captions come from engine/film/type.js.
import { clamp, smooth, eio, eo3, lerp, hash } from "./timing.js";
import { createType } from "../../../engine/film/type.js";

export function createOverlay(T, TH, cv) {
  const C = TH.colors, { S, E, END, W } = T;
  const Ty = createType(cv, TH), { ctx, col, rrect, initCaps } = Ty;
  const ALB = `"Albert Sans", sans-serif`, MONO = `"Courier Prime", monospace`;
  const NAVY = C.navy, TEAL = C.teal, ROSE = C.rose, SLATE = C.slate, REC = C.receipt;
  const STC = { teal: TEAL, rose: ROSE, slate: SLATE };
  const SX = 505;
  const captions = t => Ty.captions(t, T.tEnd - .05, c => c.beat === "b01");

  function txt(s, x, y, o) {
    o = o || {}; ctx.save(); ctx.font = `${o.w || 700} ${o.size || 40}px ${o.f || ALB}`; ctx.textAlign = o.align || "center"; ctx.letterSpacing = (o.ls || 0) + "px";
    ctx.globalAlpha = o.a == null ? 1 : o.a; ctx.translate(x, y); if (o.rot) ctx.rotate(o.rot); if (o.sc) ctx.scale(o.sc, o.sc);
    ctx.fillStyle = o.color || NAVY; ctx.fillText(s, 0, 0); ctx.restore();
  }
  const mw = (s, size, w = 700, f = ALB, ls = 0) => { ctx.save(); ctx.font = `${w} ${size}px ${f}`; ctx.letterSpacing = ls + "px"; const r = ctx.measureText(s).width; ctx.restore(); return r; };
  // multi-colour single line: parts = [[text, colour], ...]
  function mix(parts, cx, y, size, o) {
    o = o || {}; const ws = parts.map(p => mw(p[0], size, o.w || 700, ALB, o.ls || 0)), tot = ws.reduce((a, b) => a + b, 0); let x = o.left != null ? o.left : cx - tot / 2;
    parts.forEach((p, i) => { txt(p[0], x, y, { size, color: p[1], align: "left", a: o.a, w: o.w, ls: o.ls }); x += ws[i]; }); return tot;
  }

  // ------------------------------------------------------------ receipt layout
  const PX = 54, PW = 376, ROWH = 48, TOP = 175, CLIPB = 690, VIS = 430, FS = 36;
  const wrap = (s, n) => { const out = []; let c = ""; for (const w of s.split(" ")) { if (c && (c + " " + w).length > n) { out.push(c); c = w; } else c = c ? c + " " + w : w; } if (c) out.push(c); return out; };
  const items = []; { let y = 0;
    T.items.forEach((it, i) => {
      const st = it[3], rows = st === "hdr" ? it[2] : [].concat(...it[2].map(r => wrap(r, 14)));
      if (st === "head" || st === "total") y += 20;
      const o = { i, beat: it[0], t: it[1], rows, st, y0: y }; y += st === "hdr" ? 90 : rows.length * ROWH + 12; if (st === "head" || st === "total") y -= 0;
      o.y1 = y; o.yEnd = y; items.push(o);
    }); }
  let cum = 0; items.forEach(o => { o.need = Math.max(cum, o.yEnd - VIS); cum = o.need; });
  function scrollAt(t) { let s = 0, prev = 0; for (const o of items) { if (t >= o.t) s = lerp(prev, o.need, smooth((t - o.t) / .4)); prev = o.need; } return s; }

  // rubber stamps, pre-rendered with a worn-rubber speckle
  const stampImg = {};
  function buildStamp(s) {
    const w = s.big ? 560 : 300, h = s.big ? 160 : 92, m = 14, c = document.createElement("canvas"); c.width = w + m * 2; c.height = h + m * 2; const g = c.getContext("2d"), color = STC[s.color];
    g.strokeStyle = color; g.fillStyle = color; g.lineWidth = s.big ? 9 : 5; g.beginPath(); g.roundRect(m, m, w, h, 10); g.stroke();
    g.lineWidth = s.big ? 3 : 2; g.beginPath(); g.roundRect(m + (s.big ? 14 : 8), m + (s.big ? 14 : 8), w - (s.big ? 28 : 16), h - (s.big ? 28 : 16), 6); g.stroke();
    g.font = `700 ${s.big ? 92 : 50}px ${MONO}`; g.textAlign = "center"; g.textBaseline = "middle"; g.letterSpacing = (s.big ? 6 : 3) + "px"; g.fillText(s.text, m + w / 2 + 2, m + h / 2 + 4);
    g.globalCompositeOperation = "destination-out"; for (let k = 0; k < (s.big ? 18 : 130); k++) { g.globalAlpha = .2 + .35 * hash(k * 3.1 + s.text.length); const r = .8 + 1.8 * hash(k * 7.7); g.beginPath(); g.arc(hash(k * 1.7) * c.width, hash(k * 5.3 + 2) * c.height, r, 0, 6.3); g.fill(); }
    for (let k = 0; k < (s.big ? 0 : 14); k++) { g.globalAlpha = .5; g.fillRect(hash(k * 9.1) * c.width, hash(k * 4.4 + 1) * c.height, 14 + hash(k) * 30, 1.5); }
    return c;
  }
  const stampDefs = T.stamps.map(s => Object.assign({}, s, { big: false }));
  let stampsReady = false;
  const ensureStamps = () => { if (stampsReady) return; stampDefs.forEach(s => (stampImg[s.id] = buildStamp(s))); stampImg.end = buildStamp({ text: "UNKNOWN", color: "slate", big: true }); stampImg.weak = buildStamp({ text: "WEAK", color: "slate", big: true }); stampsReady = true; };

  function paperPath(x, y, w, h, zig) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w, y); if (zig) { const n = Math.round(w / 14); for (let i = 0; i < n; i++) { ctx.lineTo(x + w - (i + .5) * w / n, y + h + 9); ctx.lineTo(x + w - (i + 1) * w / n, y + h); } } else { ctx.lineTo(x + w, y + h); ctx.lineTo(x, y + h); } ctx.closePath(); }
  function paper(x, y, w, h, zig) {
    ctx.save(); ctx.shadowColor = "rgba(27,36,64,.22)"; ctx.shadowBlur = 34; ctx.shadowOffsetY = 12; ctx.fillStyle = C.paper; paperPath(x, y, w, h, zig); ctx.fill(); ctx.restore();
    ctx.save(); ctx.fillStyle = C.paper; paperPath(x, y, w, h, zig); ctx.fill(); ctx.strokeStyle = "rgba(90,98,117,.16)"; ctx.lineWidth = 1.5; ctx.stroke();
    const gr = ctx.createLinearGradient(x, 0, x + w, 0); gr.addColorStop(0, "rgba(27,36,64,.04)"); gr.addColorStop(.12, "rgba(27,36,64,0)"); gr.addColorStop(.88, "rgba(27,36,64,0)"); gr.addColorStop(1, "rgba(27,36,64,.05)"); ctx.fillStyle = gr; paperPath(x, y, w, h, zig); ctx.fill(); ctx.restore();
  }
  function dashed(x0, x1, y, a) { ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = SLATE; ctx.lineWidth = 2; ctx.setLineDash([8, 7]); ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke(); ctx.restore(); }

  function receipt(t, o) {
    o = o || {}; ensureStamps();
    const slide = 0;
    const scroll = o.cover ? 0 : scrollAt(t);
    // stamp jolt
    let jolt = 0; for (const s of stampDefs) { const a = t - s.t; if (a > 0 && a < .4) jolt += 5 * Math.exp(-a * 16) * Math.cos(a * 55); }
    ctx.save(); ctx.translate(-slide * (PW + 80), jolt);
    let bot = 0; items.slice(0, o.limit == null ? items.length : o.limit).forEach(it => { const lt = t - it.t; if (lt < 0) return; const r = it.st === "hdr" ? 1 : Math.min(it.rows.length, Math.floor(lt / .1) + 1); bot = Math.max(bot, it.st === "hdr" ? it.y1 : it.y0 + r * ROWH + 10); });
    stampDefs.forEach(st => { if (t >= st.t && st.id === "unk" && o.limit == null) bot = Math.max(bot, items.find(i => i.st === "total").y1 + 20); });
    const scr = scroll, full = bot - scr + TOP + 40 >= CLIPB, pb = Math.min(CLIPB, bot - scr + TOP + 40);
    paper(PX, -30, PW, pb + 30, !full);
    ctx.save(); ctx.beginPath(); ctx.rect(PX, TOP - 24, PW, CLIPB - TOP + 24); ctx.clip(); ctx.translate(0, TOP - scroll);
    const lim = o.limit == null ? items.length : o.limit; let cur = -1; items.forEach(q => { if (q.st !== "hdr" && t >= q.t) cur = q.i; });
    items.slice(0, lim).forEach(it => {
      const lt = t - it.t; if (lt < 0) return; const dimA = it.i === cur ? 1 : .5;
      if (it.st === "hdr") {
        const a = smooth(lt / .3); txt("SKIN RECEIPTS", PX + PW / 2, it.y0 + 24, { f: MONO, size: 36, color: NAVY, ls: 1, a });
        ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = TEAL; ctx.beginPath(); ctx.arc(PX + 20, it.y0 + 12, 7, 0, 6.3); ctx.fill(); ctx.restore();
        txt("No. 002 · water", PX + PW / 2, it.y0 + 58, { f: MONO, w: 400, size: 26, color: SLATE, a }); dashed(PX + 22, PX + PW - 22, it.y0 + 80, a); return;
      }
      if (it.st === "head" || it.st === "total") dashed(PX + 22, PX + PW - 22, it.y0 - 12, smooth(lt / .2));
      it.rows.forEach((r, k) => {
        const rt = lt - k * .1; if (rt < 0) return; const f = clamp(rt / .12), y = it.y0 + k * ROWH + 33;
        const colr = it.st === "slate" ? SLATE : NAVY; ctx.save(); ctx.beginPath(); ctx.rect(PX, y - 36, PX + PW, 52); ctx.clip();
        const wv = mw(r, FS, 700, MONO); ctx.beginPath(); ctx.rect(PX + 22, y - 38, (wv + 6) * f + 1, 58); ctx.clip();
        txt(r, PX + 24, y, { f: MONO, w: 700, size: FS, color: colr, align: "left", ls: 0, a: dimA });
        // print head glint
        if (f < 1) { ctx.fillStyle = "rgba(11,114,112,.25)"; ctx.fillRect(PX + 22 + wv * f, y - 36, 6, 46); }
        ctx.restore();
        if (it.st === "sum" && k === 0) { /* small tick dot */ }
      });
      if (it.st === "sum") { ctx.save(); ctx.globalAlpha = smooth(lt / .2); ctx.fillStyle = TEAL; ctx.fillRect(PX + 22, it.y0 + 2, 0, 0); ctx.restore(); }
    });
    ctx.restore();
    if (scroll > 2) { const tg = ctx.createLinearGradient(0, TOP - 24, 0, TOP + 40); tg.addColorStop(0, "rgba(255,255,255,1)"); tg.addColorStop(1, "rgba(255,255,255,0)"); ctx.fillStyle = tg; ctx.fillRect(PX + 1, TOP - 26, PW - 2, 68); }
    // stamps land in the clear margin beside their line (screen space)
    stampDefs.forEach(s => {
      const a = t - s.t; if (a < 0 || s.id === "unk") return;
      const anchor = s.at === "total" ? items.find(i => i.st === "total") : items.find(i => i.beat === s.at && i.st === "head"); if (!anchor) return;
      const cy = TOP + (s.id === "hold" ? anchor.y0 + 56 : anchor.y1 + 18) - scroll, vis = smooth((cy - TOP + 20) / 70) * (1 - smooth((cy - (CLIPB - 20)) / 60)); if (vis <= 0.01) return;
      const img = stampImg[s.id], cx = PX + PW + 112, u = clamp(a / .13), sc = 1 + .42 * (1 - eo3(u));
      ctx.save(); ctx.globalAlpha = vis; ctx.translate(cx, cy); ctx.rotate(s.id === "hold" ? -.1 : -.07); ctx.scale(sc, sc); ctx.globalCompositeOperation = "multiply"; ctx.globalAlpha = vis * clamp(a / .06) * .94;
      ctx.drawImage(img, -img.width / 2, -img.height / 2);
      ctx.restore();
      if (a < .5) { ctx.save(); ctx.globalAlpha = vis * (1 - a / .5) * .35; ctx.strokeStyle = STC[s.color]; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(cx, cy, 170 + 120 * eo3(a / .5), 70 + 50 * eo3(a / .5), -.08, 0, 6.3); ctx.stroke(); ctx.restore(); }
    });
    // paper fades out toward the caption band
    if (full) { const fg = ctx.createLinearGradient(0, CLIPB - 70, 0, CLIPB); fg.addColorStop(0, "rgba(255,255,255,0)"); fg.addColorStop(1, "rgba(255,255,255,1)"); ctx.fillStyle = fg; ctx.fillRect(PX, CLIPB - 70, PW, 72); }
    ctx.restore();
  }

  // ------------------------------------------------------------ plate, tags
  function plate(x, y, w, h, a) { ctx.save(); ctx.globalAlpha = a; ctx.shadowColor = "rgba(27,36,64,.14)"; ctx.shadowBlur = 40; ctx.shadowOffsetY = 8; ctx.fillStyle = "rgba(251,250,246,.90)"; rrect(x, y, w, h, 34); ctx.fill(); ctx.restore(); }
  function tag(s, x, y, o) { o = o || {}; const size = o.size || 40, w = mw(s, size, 700) + 44, sc = o.sc || 1; ctx.save(); ctx.globalAlpha = o.a == null ? 1 : o.a; ctx.translate(x, y); ctx.scale(sc, sc); ctx.translate(-x, -y);
    ctx.fillStyle = "rgba(251,250,246,.95)"; ctx.shadowColor = "rgba(27,36,64,.18)"; ctx.shadowBlur = 16; rrect(x - w / 2, y - size * .95, w, size * 1.5, size * .75); ctx.fill(); ctx.shadowBlur = 0; ctx.strokeStyle = o.line || SLATE; ctx.lineWidth = 2.5; ctx.stroke(); txt(s, x, y, { size, color: o.color || NAVY }); ctx.restore(); return w; }
  function leader(x0, y0, x1, y1, a) { ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = SLATE; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke(); ctx.fillStyle = SLATE; ctx.beginPath(); ctx.arc(x0, y0, 6, 0, 6.3); ctx.fill(); ctx.restore(); }
  const LX = 700; // centre of the free area right of the receipt
  const prog01 = (t, a, b) => smooth((t - a) / (b - a));
  function hook(t) {
    if (t > T.hookEnd + .4) return; const fade = 1 - smooth((t - T.hookEnd) / .3), size = 78;
    const L = [[["Drinking ", NAVY], ["water", TEAL]], [["for skin?", NAVY]]], wmax = Math.max(...L.map(ln => ln.reduce((a, p) => a + mw(p[0], size, 700, ALB, -2), 0)));
    ctx.save(); ctx.globalAlpha = fade; plate(462, 176, Math.min(560, wmax + 64), 214, 1);
    L.forEach((ln, i) => mix(ln, 0, 270 + i * 90, size, { left: 494, ls: -2 }));
    ctx.restore();
  }
  // paper card with a faint print texture (shared by slips)
  function slipPaper(X, Y, w, h, zig, a) { ctx.save(); ctx.globalAlpha = a; paper(X, Y, w, h, zig); ctx.save(); ctx.beginPath(); ctx.rect(X, Y, w, h); ctx.clip(); for (let q = 0; q < 420; q++) { ctx.fillStyle = `rgba(120,112,100,${.03 + .05 * hash(q * 1.9)})`; ctx.fillRect(X + hash(q * 3.3) * w, Y + hash(q * 7.1 + 1) * h, 1 + hash(q) * 6, 1); } for (let yy = Y + 8; yy < Y + h; yy += 9) { ctx.fillStyle = "rgba(27,36,64,.022)"; ctx.fillRect(X, yy, w, 2); } ctx.restore(); ctx.restore(); }
  const dots = (n, perRow, x0, y0, pitch, r, color, a) => { ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = color; for (let i = 0; i < n; i++) { ctx.beginPath(); ctx.arc(x0 + (i % perRow) * pitch, y0 + Math.floor(i / perRow) * pitch, r, 0, 6.3); ctx.fill(); } ctx.restore(); };
  // beats 7-8: one slip prints the two groups. Figures: 38 and 11 people (tallies), 54 -> 76 probe units (zero-based bars, real ratio). Group 2: no numbers, a fuzzy "not clear" bar.
  function groupSlip(t) {
    const t0 = S("b07") + .08, t1 = END("b08") + .4; if (t < t0 || t > t1 + .4) return;
    const out = 1 - smooth((t - t1) / .35), inn = eo3((t - t0) / .5), X = 440, Y = 190, WS = 500, p2 = prog01(t, S("b08") + .05, S("b08") + .55), HS = lerp(590, 1040, p2);
    ctx.save(); ctx.globalAlpha = out * Math.min(1, inn * 1.4); ctx.translate(0, (1 - inn) * -60); slipPaper(X, Y, WS, HS, true, 1);
    txt("38 · less water overall", X + 28, Y + 56, { align: "left", f: MONO, size: 30, color: NAVY }); dots(38, 19, X + 36, Y + 100, 24, 8, TEAL, 1);
    const base = Y + 482, sc = 2.9, bw = 104, cx0 = X + 100, cx1 = X + 236, gB = prog01(t, W("b07", "forty") - .5, W("b07", "forty") + .2);
    ctx.strokeStyle = SLATE; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(X + 28, base); ctx.lineTo(X + WS - 28, base); ctx.stroke();
    [[cx0, 54, NAVY, 1], [cx1, 76, TEAL, eo3(gB)]].forEach(([cx, v, colr, g]) => { const h = v * sc * g; ctx.save(); ctx.fillStyle = colr; ctx.globalAlpha *= colr === NAVY ? .85 : 1; ctx.fillRect(cx - bw / 2, base - h, bw, h); ctx.fillStyle = "rgba(255,255,255,.2)"; for (let yy = base - h; yy < base; yy += 5) ctx.fillRect(cx - bw / 2, yy, bw, 1.5); ctx.restore();
      if (g > .5) txt(String(v), cx, base - v * sc - 14, { size: 46, color: colr, w: 700 }); });
    txt("start", cx0, base + 42, { size: 36, color: SLATE }); txt("week 4", cx1, base + 42, { size: 36, color: TEAL });
    const au = smooth((t - W("b07", "forty")) / .22); if (au > 0) { txt("about", X + 392, base - 178, { size: 34, color: TEAL, a: au, w: 400 }); txt("+40%", X + 392, base - 122, { size: 64, color: TEAL, sc: 1 + .2 * (1 - eo3((t - W("b07", "forty")) / .25)), a: au }); }
    txt("forehead reading · probe units", X + 28, base + 84, { align: "left", size: 32, w: 400, color: SLATE });
    if (p2 > 0) { const Y2 = Y + 610; ctx.save(); ctx.globalAlpha = p2; ctx.strokeStyle = "rgba(90,98,117,.5)"; ctx.setLineDash([8, 7]); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(X + 28, Y2 - 22); ctx.lineTo(X + WS - 28, Y2 - 22); ctx.stroke(); ctx.setLineDash([]);
      txt("11 · more water overall", X + 28, Y2 + 30, { align: "left", f: MONO, size: 30, color: NAVY }); dots(11, 11, X + 36, Y2 + 70, 24, 8, SLATE, 1);
      const b2 = Y2 + 330, h0 = 148, h1 = 178, wf = prog01(t, S("b08") + .6, S("b08") + 1.1);
      ctx.strokeStyle = SLATE; ctx.lineWidth = 3; ctx.setLineDash([]); ctx.beginPath(); ctx.moveTo(X + 28, b2); ctx.lineTo(X + WS - 28, b2); ctx.stroke();
      ctx.fillStyle = SLATE; ctx.globalAlpha = p2 * .8; ctx.fillRect(cx0 - bw / 2, b2 - h0, bw, h0);
      ctx.globalAlpha = p2 * wf * .8; ctx.fillRect(cx1 - bw / 2, b2 - h0, bw, h0); const fg = ctx.createLinearGradient(0, b2 - h1, 0, b2 - h0); fg.addColorStop(0, "rgba(90,98,117,0)"); fg.addColorStop(1, "rgba(90,98,117,.55)"); ctx.fillStyle = fg; ctx.fillRect(cx1 - bw / 2, b2 - h1, bw, h1 - h0);
      ctx.globalAlpha = p2 * wf; ctx.strokeStyle = SLATE; ctx.lineWidth = 3; ctx.setLineDash([7, 6]); ctx.strokeRect(cx1 - bw / 2, b2 - h1, bw, h1); ctx.setLineDash([]); txt("?", cx1, b2 - h1 - 14, { size: 46, color: SLATE });
      txt("start", cx0, b2 + 42, { size: 36, color: SLATE }); txt("week 4", cx1, b2 + 42, { size: 36, color: SLATE }); ctx.globalAlpha = p2 * wf; txt("not clear", X + 392, b2 - 100, { size: 40, color: SLATE, w: 700 }); ctx.restore(); }
    ctx.restore();
  }
  // beat 9: labels over the cross-section illustration
  function crossLabels(t, A) { if (!A.xp) return; const a = prog01(t, S("b09") + .15, S("b09") + .5) * (1 - prog01(t, END("b09") + .1, END("b09") + .4));
    ["start", "week 4"].forEach((s, i) => txt(s, A.xp[i].x, A.xp[i].y, { size: 46, color: NAVY, a, w: 700 }));
    tag("illustration, not to scale", 700, 300, { size: 38, a, color: NAVY }); }
  // beat 10, "Sounds like a win": the +40 % bar comes back; the "one small study" tag lands over it
  function winBar(t) {
    const t0 = S("b10") - .05, t1 = E("b10") + .15; if (t < t0 || t > t1 + .4) return; const inn = eo3((t - t0) / .35), out = 1 - smooth((t - t1) / .35), gB = prog01(t, t0 + .1, t0 + .6);
    const X = 458, Y = 200, WS = 470, base = Y + 400;
    ctx.save(); ctx.globalAlpha = out * Math.min(1, inn * 1.4); ctx.translate(0, (1 - inn) * -50); slipPaper(X, Y, WS, 560, true, 1);
    txt("forehead reading", X + 28, Y + 54, { align: "left", f: MONO, size: 32, color: NAVY });
    ctx.strokeStyle = SLATE; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(X + 28, base); ctx.lineTo(X + WS - 28, base); ctx.stroke();
    [[X + 100, 54, NAVY, 1], [X + 236, 76, TEAL, eo3(gB)]].forEach(([cx, v, colr, g]) => { const h = v * 3.1 * g; ctx.save(); ctx.fillStyle = colr; ctx.globalAlpha *= colr === NAVY ? .85 : 1; ctx.fillRect(cx - 52, base - h, 104, h); ctx.restore(); if (g > .5) txt(String(v), cx, base - v * 3.1 - 14, { size: 44, color: colr }); });
    txt("start", X + 100, base + 40, { size: 34, color: SLATE }); txt("week 4", X + 236, base + 40, { size: 34, color: TEAL });
    txt("about", X + 392, base - 186, { size: 34, color: TEAL, w: 400, a: gB }); txt("+40%", X + 392, base - 130, { size: 64, color: TEAL, a: gB });
    ctx.restore();
  }
  // beat 11: five slips printed one by one, WEAK note inked on a paper patch
  function reviewSlips(t) {
    const t0 = S("b11") + .1, t1 = END("b11") + .45; if (t < t0 || t > t1 + .4) return; const out = 1 - smooth((t - t1) / .35), sl = lerp(0, -46, prog01(t, t0, t1));
    ctx.save(); ctx.globalAlpha = out;
    for (let i = 0; i < 5; i++) { const lt = t - T.slipT[i]; if (lt < 0) continue; const X = 462, Y = 205 + i * 200 + sl, WS = 470, HS = 168, pr = eo3(lt / .35); ctx.save(); ctx.translate(X + WS / 2, Y + HS / 2); ctx.rotate((i % 2 ? .014 : -.012)); ctx.translate(-WS / 2, -HS / 2);
      ctx.beginPath(); ctx.rect(-20, -20, WS + 40, HS * pr + 40); ctx.clip(); slipPaper(0, 0, WS, HS, true, 1); txt("study " + (i + 1), 26, 58, { align: "left", f: MONO, size: 40, color: NAVY });
      [0, 1].forEach(k => { ctx.fillStyle = "rgba(90,98,117,.28)"; ctx.fillRect(26, 88 + k * 28, [330, 250][k], 10); }); ctx.fillStyle = TEAL; ctx.beginPath(); ctx.arc(WS - 40, 40, 8, 0, 6.3); ctx.fill(); ctx.restore(); }
    const a = t - T.weakT; if (a >= 0) { ensureStamps(); const u = clamp(a / .13), sc = (1 + .42 * (1 - eo3(u))) * .74, img = stampImg.weak;
      ctx.save(); ctx.translate(700, 610); ctx.rotate(-.07); ctx.scale(sc, sc); ctx.shadowColor = "rgba(20,26,50,.35)"; ctx.shadowBlur = 30; ctx.shadowOffsetY = 10; ctx.fillStyle = "#FBFAF6"; rrect(-img.width / 2 - 22, -img.height / 2 - 22, img.width + 44, img.height + 44, 20); ctx.fill(); ctx.shadowColor = "transparent";
      ctx.globalCompositeOperation = "multiply"; ctx.globalAlpha = clamp(a / .06); ctx.drawImage(img, -img.width / 2, -img.height / 2); ctx.drawImage(img, -img.width / 2, -img.height / 2); ctx.restore(); }
    ctx.restore();
  }
  function calendar(t) { // 4 weeks x 7 days (a count of days: 28, nothing animated but the week rows being ticked)
    const t0 = W("b03", "They added") - .1, t1 = S("b04") + .25; if (t < t0 || t > t1) return; const inn = eo3((t - t0) / .4), out = 1 - prog01(t, t1 - .3, t1), a = inn * out, X = 458, Y = 190, WS = 480;
    ctx.save(); ctx.globalAlpha = a; ctx.translate(0, (1 - inn) * -50); slipPaper(X, Y, WS, 420, true, 1);
    mix([["4 weeks", TEAL]], 0, Y + 70, 56, { left: X + 28, ls: -1 }); txt("about", X + WS - 28, Y + 40, { size: 28, color: SLATE, align: "right", w: 400 }); txt("+2 L a day", X + WS - 28, Y + 76, { size: 36, color: NAVY, align: "right" });
    for (let r = 0; r < 4; r++) { const fr = prog01(t, W("b03", "four weeks") - .2 + r * .22, W("b03", "four weeks") + .1 + r * .22); for (let c = 0; c < 7; c++) { const x = X + 30 + c * 62, y = Y + 110 + r * 66; ctx.fillStyle = "rgba(90,98,117,.14)"; rrect(x, y, 54, 54, 10); ctx.fill(); if (fr > 0) { ctx.save(); ctx.globalAlpha = a * fr; ctx.fillStyle = TEAL; rrect(x, y, 54, 54, 10); ctx.fill(); ctx.strokeStyle = REC; ctx.lineWidth = 5; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(x + 14, y + 28); ctx.lineTo(x + 23, y + 38); ctx.lineTo(x + 41, y + 16); ctx.stroke(); ctx.restore(); } } }
    ctx.restore();
  }
  function labels(t, A) {
    calendar(t);
    if (A.slot && t >= W("b04", "Nobody") - .1 && t < E("b04") + .3) { const a = prog01(t, W("b04", "Nobody"), W("b04", "Nobody") + .25), out = 1 - prog01(t, E("b04") - .2, E("b04") + .1); leader(A.slot.x, A.slot.y, 660, A.slot.y - 190, a * out); tag("no comparison group", 660, A.slot.y - 230, { size: 44, a: a * out, color: NAVY, sc: 1 + .15 * (1 - eo3((t - W("b04", "Nobody")) / .25)) }); }
    if (A.food && t >= W("b05", "Over half") - .1 && t < E("b05") + .3) { const w0 = W("b05", "Over half"), a = prog01(t, w0, w0 + .2) * (1 - prog01(t, E("b05") - .15, E("b05") + .15)); tag("over half", 700, 330, { size: 62, a, color: TEAL, line: TEAL, sc: 1 + .18 * (1 - eo3((t - w0) / .25)) }); }
    if (A.id === "b06") { const out = 1 - prog01(t, E("b06") - .2, E("b06") + .1), pa = prog01(t, S("b06") + .2, S("b06") + .5) * out; if (A.tip && pa > 0) { const tx = Math.min(A.tip.x + 120, 640); leader(A.tip.x, A.tip.y, tx, A.tip.y - 150, pa); tag("skin hydration probe", tx, A.tip.y - 190, { size: 40, a: pa, color: NAVY }); }
      [["face", 0], ["arm", 1], ["hand", 2], ["leg", 3]].forEach(([s, k]) => { const a = prog01(t, T.probeT[k] - .05, T.probeT[k] + .15) * out; if (a > 0) tag(s, 530 + (k % 2) * 200, 270 + Math.floor(k / 2) * 84, { size: 44, a, color: k === 1 ? TEAL : NAVY, line: k === 1 ? TEAL : SLATE, sc: 1 + .15 * (1 - eo3((t - T.probeT[k]) / .25)) }); }); }
    groupSlip(t); crossLabels(t, A);
    winBar(t); // drawn first so the "one small study" tag sits on top of the bar card (reviewer r2 note)
    if (t >= W("b10", "one small") - .1 && t < E("b10") + .2) { const a = prog01(t, W("b10", "one small"), W("b10", "one small") + .2) * (1 - prog01(t, E("b10") - .1, E("b10") + .2)); tag("one small study", 540, 830, { size: 60, a, color: NAVY, sc: 1 + .15 * (1 - eo3((t - W("b10", "one small")) / .25)) }); }
    reviewSlips(t);
    if (A.patch && t >= S("b12")) { const a = prog01(t, W("b12", "unclear") - .5, W("b12", "unclear") - .1) * (1 - prog01(t, E("b12") - .1, E("b12") + .2)), c = A.patch; ctx.save(); ctx.globalAlpha = a; ctx.setLineDash([16, 12]); ctx.strokeStyle = NAVY; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(c.x, c.y, c.r, 0, 6.3); ctx.stroke(); ctx.restore(); tag("noticeable? unclear", c.x, c.y - c.r - 60, { size: 46, a, color: SLATE }); }
  }
  // big UNKNOWN stamp over the picture on "unknown" (>= 50 % of the frame width)
  function bigStamp(t) {
    const t0 = T.stamps[0].t, a = t - t0, tf = S("b14") + .35; if (a < 0 || t > tf + .5) return; ensureStamps();
    const u = clamp(a / .12), sc = (1 + .5 * (1 - eo3(u))) * 1.14, fade = 1 - smooth((t - tf) / .45), img = stampImg.end;
    ctx.save(); if (a < .12) { ctx.globalAlpha = .22 * (1 - a / .12); ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, 1080, 1920); } ctx.restore();
    ctx.save(); ctx.translate(540, 940); ctx.rotate(-.07); const k2 = sc * (1 - .1 * (1 - fade)); ctx.scale(k2, k2); ctx.globalAlpha = clamp(a / .06) * fade;
    ctx.shadowColor = "rgba(14,20,36,.5)"; ctx.shadowBlur = 64 - 30 * smooth(a / .25); ctx.shadowOffsetX = 14; ctx.shadowOffsetY = 34 - 20 * smooth(a / .25); ctx.fillStyle = "#FBFAF6"; rrect(-img.width / 2 - 22, -img.height / 2 - 22, img.width + 44, img.height + 44, 20); ctx.fill(); ctx.shadowColor = "transparent";
    ctx.globalCompositeOperation = "multiply"; ctx.globalAlpha *= 1; ctx.drawImage(img, -img.width / 2, -img.height / 2); ctx.drawImage(img, -img.width / 2, -img.height / 2); ctx.restore();
    if (a < .6) { ctx.save(); ctx.globalAlpha = (1 - a / .6) * .4; ctx.strokeStyle = SLATE; ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(540, 940, 330 + 200 * eo3(a / .6), 100 + 70 * eo3(a / .6), -.07, 0, 6.3); ctx.stroke(); ctx.restore(); }
  }


  // ------------------------------------------------------------ end card
  function endCard(t) {
    if (t < T.tEnd - .1) return; const k = smooth((t - (T.tEnd - .1)) / .4); ensureStamps();
    ctx.save(); ctx.globalAlpha = k * .96; ctx.fillStyle = REC; ctx.fillRect(0, 0, 1080, 1920); ctx.restore();
    ctx.save(); ctx.globalAlpha = k;
    txt("RECEIPT TOTAL", SX, 300, { f: MONO, size: 44, color: SLATE, ls: 6 }); dashed(150, 860, 340, .8 * k);
    const a = t - (T.tEnd + .15), u = clamp(a / .13);
    if (a >= 0) { const img = stampImg.end, sc = 1 + .42 * (1 - eo3(u)); ctx.save(); ctx.translate(SX, 480); ctx.rotate(-.06); ctx.scale(sc, sc); ctx.globalCompositeOperation = "multiply"; ctx.globalAlpha = clamp(a / .06) * .95; ctx.drawImage(img, -img.width / 2, -img.height / 2); ctx.restore(); }
    const lines = [[["In one small study,", NAVY]], [["skin hydration readings", NAVY]], [["rose after extra ", NAVY], ["water,", TEAL]], [["mostly in people who", NAVY]], [["took in less water.", NAVY]], [["A 2018 review called", NAVY]], [["the evidence ", NAVY], ["weak.", SLATE]]];
    lines.forEach((ln, i) => { const aa = smooth((t - T.tEnd - .4 - i * .09) / .25); if (aa > 0) mix(ln, SX, 668 + i * 72 + (i > 0 ? 14 : 0), 54, { a: aa * k, ls: -.5 }); });
    const as = smooth((t - T.tEnd - .95) / .3);
    ctx.save(); ctx.globalAlpha = as; ctx.fillStyle = TEAL; ctx.beginPath(); ctx.arc(SX - 192, 1243, 11, 0, 6.3); ctx.fill(); ctx.restore();
    txt("Skin Receipts", SX + 20, 1260, { size: 64, color: NAVY, a: as, ls: -1 });
    ctx.restore();
  }
  function edu(t) { // persistent line, 36 px (in the end card it is the closing line)
    if (t < .05) return; const s = "Education, not medical advice.", w = mw(s, 36, 400) + 40; ctx.save(); ctx.fillStyle = "rgba(251,250,246,.84)"; rrect(SX - w / 2, 1466, w, 56, 28); ctx.fill(); ctx.restore();
    txt(s, SX, 1506, { size: 36, w: 400, color: SLATE });
  }
  function draw(t, A) { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, 1080, 1920); labels(t, A || {}); { const ra = 1 - smooth((t - (T.tEnd - .55)) / .3); if (ra > .003) { ctx.save(); ctx.globalAlpha = ra; receipt(t); ctx.restore(); } } hook(t); bigStamp(t); endCard(t); edu(t); }

  function drawCover(inset) { // headline, receipt with the UNKNOWN total; the picture (glass + forearm) is 3D
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, 1080, 1920); ensureStamps();
    paper(PX, -30, PW, 470, true); const cx = PX + PW / 2;
    txt("SKIN RECEIPTS", cx, 130, { f: MONO, size: 36, color: NAVY, ls: 1 }); ctx.save(); ctx.fillStyle = TEAL; ctx.beginPath(); ctx.arc(PX + 20, 118, 7, 0, 6.3); ctx.fill(); ctx.restore();
    txt("No. 002 · water", cx, 172, { f: MONO, w: 400, size: 26, color: SLATE }); dashed(PX + 22, PX + PW - 22, 198, 1);
    txt("RECEIPT TOTAL", cx, 262, { f: MONO, size: 36, color: NAVY }); dashed(PX + 22, PX + PW - 22, 290, 1);
    ctx.save(); ctx.translate(cx + 70, 370); ctx.rotate(-.07); ctx.scale(.86, .86); ctx.globalCompositeOperation = "multiply"; ctx.globalAlpha = .96; ctx.drawImage(stampImg.end, -stampImg.end.width / 2, -stampImg.end.height / 2); ctx.restore();
    if (inset) { const cx2 = 790, cy2 = 330, r = 175; ctx.save(); ctx.shadowColor = "rgba(27,36,64,.3)"; ctx.shadowBlur = 30; ctx.shadowOffsetY = 10; ctx.fillStyle = REC; ctx.beginPath(); ctx.arc(cx2, cy2, r + 12, 0, 6.3); ctx.fill(); ctx.restore();
      ctx.save(); ctx.beginPath(); ctx.arc(cx2, cy2, r, 0, 6.3); ctx.clip(); ctx.drawImage(inset, 140, 640, 760, 760, cx2 - r, cy2 - r, 2 * r, 2 * r); ctx.restore(); ctx.strokeStyle = NAVY; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(cx2, cy2, r + 12, 0, 6.3); ctx.stroke(); }
    plate(40, 950, 900, 560, 1);
    mix([["Does drinking", NAVY]], 0, 1080, 112, { left: 80, ls: -3 }); mix([["water", TEAL], [" hydrate", NAVY]], 0, 1205, 112, { left: 80, ls: -3 }); mix([["your skin?", NAVY]], 0, 1330, 112, { left: 80, ls: -3 });
    ctx.save(); ctx.fillStyle = NAVY; rrect(80, 1382, 380, 76, 38); ctx.fill(); ctx.fillStyle = "#5FC1BC"; ctx.beginPath(); ctx.arc(120, 1420, 10, 0, 6.3); ctx.fill(); ctx.restore();
    txt("Skin Receipts", 150, 1442, { size: 44, color: REC, align: "left" });
    edu(1);
  }
  return { draw, captions, initCaps, drawCover };
}
