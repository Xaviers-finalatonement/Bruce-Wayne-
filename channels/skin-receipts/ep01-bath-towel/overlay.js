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
  const PX = 54, PW = 376, ROWH = 48, TOP = 175, CLIPB = 690, VIS = 470, FS = 36;
  const wrap = (s, n) => { const out = []; let c = ""; for (const w of s.split(" ")) { if (c && (c + " " + w).length > n) { out.push(c); c = w; } else c = c ? c + " " + w : w; } if (c) out.push(c); return out; };
  const items = []; { let y = 0;
    T.items.forEach((it, i) => {
      const st = it[3], rows = st === "hdr" ? it[2] : [].concat(...it[2].map(r => wrap(r, 14)));
      if (st === "head" || st === "total") y += 20;
      const o = { i, beat: it[0], t: it[1], rows, st, y0: y }; y += st === "hdr" ? 90 : rows.length * ROWH + 12; if (st === "head" || st === "total") y -= 0;
      o.y1 = y; o.yEnd = y; items.push(o);
    }); }
  let cum = 0; items.forEach(o => { o.need = Math.max(cum, o.yEnd - VIS); cum = o.need; });
  function scrollAt(t) { let s = 0, prev = 0; for (const o of items) { if (t >= o.t) s = lerp(prev, o.need, smooth((t - o.t) / .4)); prev = o.need; }
    const h1 = items.find(i => i.beat === "b03" && i.st === "head"), w = smooth((t - (S("b07") - .25)) / .45) * (1 - smooth((t - (E("b07") - .15)) / .45)); // feed back so the stamp lands on line 1
    return lerp(s, Math.max(0, h1.y0 - 70), w); }

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
  const ensureStamps = () => { if (stampsReady) return; stampDefs.forEach(s => (stampImg[s.id] = buildStamp(s))); stampImg.end = buildStamp({ text: "UNKNOWN", color: "slate", big: true }); stampsReady = true; };

  function paperPath(x, y, w, h, zig) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w, y); if (zig) { const n = Math.round(w / 14); for (let i = 0; i < n; i++) { ctx.lineTo(x + w - (i + .5) * w / n, y + h + 9); ctx.lineTo(x + w - (i + 1) * w / n, y + h); } } else { ctx.lineTo(x + w, y + h); ctx.lineTo(x, y + h); } ctx.closePath(); }
  function paper(x, y, w, h, zig) {
    ctx.save(); ctx.shadowColor = "rgba(27,36,64,.22)"; ctx.shadowBlur = 34; ctx.shadowOffsetY = 12; ctx.fillStyle = C.paper; paperPath(x, y, w, h, zig); ctx.fill(); ctx.restore();
    ctx.save(); ctx.fillStyle = C.paper; paperPath(x, y, w, h, zig); ctx.fill(); ctx.strokeStyle = "rgba(90,98,117,.16)"; ctx.lineWidth = 1.5; ctx.stroke();
    const gr = ctx.createLinearGradient(x, 0, x + w, 0); gr.addColorStop(0, "rgba(27,36,64,.04)"); gr.addColorStop(.12, "rgba(27,36,64,0)"); gr.addColorStop(.88, "rgba(27,36,64,0)"); gr.addColorStop(1, "rgba(27,36,64,.05)"); ctx.fillStyle = gr; paperPath(x, y, w, h, zig); ctx.fill(); ctx.restore();
  }
  function dashed(x0, x1, y, a) { ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = SLATE; ctx.lineWidth = 2; ctx.setLineDash([8, 7]); ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke(); ctx.restore(); }

  function receipt(t, o) {
    o = o || {}; ensureStamps();
    const slide = o.cover ? 0 : 1 - eo3((t - (T.hookEnd - .05)) / .55); if (slide >= 1) return;
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
        txt("No. 001 · towel", PX + PW / 2, it.y0 + 58, { f: MONO, w: 400, size: 26, color: SLATE, a }); dashed(PX + 22, PX + PW - 22, it.y0 + 80, a); return;
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
      const a = t - s.t; if (a < 0 || (o.limit != null && s.id === "unk")) return;
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

  // ------------------------------------------------------------ hook + labels
  function plate(x, y, w, h, a) { ctx.save(); ctx.globalAlpha = a; ctx.shadowColor = "rgba(27,36,64,.14)"; ctx.shadowBlur = 40; ctx.shadowOffsetY = 8; ctx.fillStyle = "rgba(251,250,246,.90)"; rrect(x, y, w, h, 34); ctx.fill(); ctx.restore(); }
  function hook(t) {
    if (t > T.hookEnd + .4) return; const fade = 1 - smooth((t - T.hookEnd) / .3), k = 1, size = 124;
    const L = [[["Your towel", NAVY]], [["grows a ", NAVY], ["film", TEAL], ["?", NAVY]]], wmax = Math.max(...L.map(ln => ln.reduce((a, p) => a + mw(p[0], size, 700, ALB, -3), 0)));
    ctx.save(); ctx.globalAlpha = fade; plate(40, 170, Math.min(900, wmax + 80), 345, 1);
    L.forEach((ln, i) => { const y = 340 + i * 140; ctx.save(); ctx.translate(0, (1 - k) * 14); mix(ln, 0, y, size, { left: 78, ls: -3, a: .55 + .45 * k }); ctx.restore(); });
    txt("SKIN RECEIPTS · No. 001", 78, 215, { f: MONO, size: 28, color: SLATE, align: "left", ls: 3 });
    ctx.restore();
  }
  function tag(s, x, y, o) { o = o || {}; const size = o.size || 40, w = mw(s, size, 700) + 44, sc = o.sc || 1; ctx.save(); ctx.globalAlpha = o.a == null ? 1 : o.a; ctx.translate(x, y); ctx.scale(sc, sc); ctx.translate(-x, -y);
    ctx.fillStyle = "rgba(251,250,246,.95)"; ctx.shadowColor = "rgba(27,36,64,.18)"; ctx.shadowBlur = 16; rrect(x - w / 2, y - size * .95, w, size * 1.5, size * .75); ctx.fill(); ctx.shadowBlur = 0; ctx.strokeStyle = o.line || SLATE; ctx.lineWidth = 2.5; ctx.stroke(); txt(s, x, y, { size, color: o.color || NAVY }); ctx.restore(); return w; }
  function leader(x0, y0, x1, y1, a) { ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = SLATE; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke(); ctx.fillStyle = SLATE; ctx.beginPath(); ctx.arc(x0, y0, 6, 0, 6.3); ctx.fill(); ctx.restore(); }
  const LX = 700; // centre of the free area right of the receipt
  // bars printed on a thermal slip: ILLUSTRATION (even 1.3x step, not the study's counts), labelled as such
  function barsSlip(t) {
    const t0 = S("b06") + .1, t1 = END("b07") + .45; if (t < t0 || t > t1 + .4) return;
    const out = 1 - smooth((t - t1) / .35), inn = eo3((t - t0) / .55), X = 430, Y = 330, WS = 520, HS = 800, base = Y + 560, bw = 112, pitch = 168, x0 = X + WS / 2 - pitch, H = [230, 300, 390];
    ctx.save(); ctx.globalAlpha = out * Math.min(1, inn * 1.4); ctx.translate(0, (1 - inn) * -70);
    paper(X, Y, WS, HS, true); ctx.save(); ctx.beginPath(); ctx.rect(X, Y, WS, HS); ctx.clip(); for (let q = 0; q < 700; q++) { ctx.fillStyle = `rgba(120,112,100,${.03 + .05 * hash(q * 1.9)})`; ctx.fillRect(X + hash(q * 3.3) * WS, Y + hash(q * 7.1 + 1) * HS, 1 + hash(q) * 6, 1); } for (let yy = Y + 8; yy < Y + HS; yy += 9) { ctx.fillStyle = "rgba(27,36,64,.022)"; ctx.fillRect(X, yy, WS, 2); } ctx.fillStyle = "rgba(27,36,64,.07)"; ctx.fillRect(X + 30, Y + 78, WS - 60, 2); ctx.restore();
    txt("live bacteria", X + 30, Y + 60, { align: "left", f: MONO, size: 36, color: NAVY });
    const gr = [prog01(t, t0 + .25, t0 + .8), prog01(t, t0 + .5, t0 + 1.05), prog01(t, W("b06", "highest") - .5, W("b06", "highest") + .55)];
    ctx.save(); ctx.strokeStyle = SLATE; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(X + 30, base); ctx.lineTo(X + WS - 30, base); ctx.stroke(); ctx.restore();
    H.forEach((h, i) => { const hh = h * eo3(gr[i]); if (hh < 2) return; const bx = x0 + i * pitch - bw / 2, colr = i === 2 ? TEAL : NAVY;
      ctx.save(); ctx.beginPath(); ctx.rect(bx, base - hh, bw, hh); ctx.clip(); ctx.fillStyle = colr; ctx.globalAlpha *= i === 2 ? 1 : .82; ctx.fillRect(bx, base - hh, bw, hh);
      ctx.fillStyle = "rgba(255,255,255,.22)"; for (let yy = base - hh; yy < base; yy += 5) ctx.fillRect(bx, yy, bw, 1.6);
      for (let q = 0; q < 70; q++) { ctx.fillStyle = "rgba(255,255,255,.35)"; ctx.fillRect(bx + hash(q * 3.1 + i) * bw, base - hash(q * 5.7 + i * 2) * hh, 2, 2); } ctx.restore();
      txt(["month 2", "month 4", "month 6"][i], x0 + i * pitch, base + 50, { size: 36, color: i === 2 ? TEAL : SLATE }); });
    // illustration label (Receipt pill, 40 px)
    ctx.save(); ctx.fillStyle = REC; ctx.strokeStyle = SLATE; ctx.lineWidth = 2.5; rrect(X + 55, base + 82, WS - 110, 116, 30); ctx.fill(); ctx.stroke(); ctx.restore();
    txt("illustration,", X + WS / 2, base + 133, { size: 40, color: NAVY }); txt("not to scale", X + WS / 2, base + 180, { size: 40, color: NAVY });
    const ah = smooth((t - W("b06", "highest")) / .22); if (ah > 0 && out > 0) tag("highest", x0 + 2 * pitch, base - H[2] - 40, { size: 46, a: ah, color: TEAL, line: TEAL, sc: 1 + .15 * (1 - eo3((t - W("b06", "highest")) / .25)) });
    ctx.restore();
  }
  const prog01 = (t, a, b) => smooth((t - a) / (b - a));
  function labels(t, A) {
    if (A.h0 != null) { // household counter: the final number is up before "twenty-six" is finished, held until the next beat
      const a = prog01(t, A.h0, A.h0 + .16) * (1 - prog01(t, S("b04") + .0, S("b04") + .3));
      if (a > 0) { ctx.save(); ctx.globalAlpha = a; plate(470, 190, 460, 250, 1); ctx.globalAlpha = a; txt("26", LX, 335, { size: 170, color: TEAL, w: 700, ls: -4 }); txt("households", LX, 400, { size: 46, color: SLATE, w: 700 }); ctx.restore(); }
    }
    if (t >= S("b04") && t < END("b04") + .4) {
      const a = prog01(t, S("b04") + .15, S("b04") + .45) * (1 - prog01(t, END("b04") + .1, END("b04") + .4));
      ctx.save(); ctx.globalAlpha = a; plate(450, 190, 480, 230, 1); ctx.globalAlpha = a;
      mix([["6 ", TEAL], ["months", NAVY]], LX, 330, 110, { ls: -2 }); txt("tested every 2 months", LX, 392, { size: 38, color: SLATE });
      ctx.restore();
      (A.ticks || []).forEach((k, i) => { const aa = smooth((t - k.t) / .25) * a * (a > 0 ? 1 : 0); if (aa <= 0) return; const x = Math.max(k.x, 135), y = Math.max(k.y, 250);
        txt(String(i * 2), x, y, { size: 84, color: i === 3 ? TEAL : NAVY, a: aa, ls: -1 }); txt(i === 0 ? "month" : "months", x, y + 38, { size: 36, w: 400, color: SLATE, a: aa }); });
    }
    if (t >= S("b05") && t < END("b05") + .4) {
      const a1 = smooth((t - W("b05", "By month")) / .25), out = 1 - smooth((t - END("b05") - .05) / .25), wb = W("b05", "biofilm") - .05;
      if (A.cmp) { txt("new", A.cmp[0], A.cmp[2], { size: 40, color: SLATE, a: a1 * out * A.cmpA }); txt("month 2", A.cmp[1], A.cmp[2], { size: 40, color: NAVY, a: a1 * out * A.cmpA }); }
      if (t >= wb) tag("biofilm", 770, 300, { size: 52, a: out, color: TEAL, line: TEAL, sc: 1 + .2 * (1 - eo3((t - wb) / .22)) });
    }
    barsSlip(t);
    if (A.discs) {
      const out = 1 - smooth((t - END("b08")) / .25), a = smooth((t - A.discT) / .3) * out;
      tag("illustration", 770, 250, { size: 40, a: a, color: SLATE });
      tag("your skin", A.discs[0].x, A.discs[0].y, { size: 40, a }); tag("your towel", A.discs[1].x, A.discs[1].y, { size: 40, a });
      const as = smooth((t - W("b08", "Staph")) / .25) * out; if (as > 0) { const s = "Staph: typically < 1 %", w = mw(s, 40, 700) + 44, below = A.sliver.y < 1000, ty = below ? A.sliver.y + 118 : A.sliver.y - 100, tx = Math.min(A.sliver.x + 40, 940 - w / 2);
        leader(A.sliver.x, A.sliver.y, tx, below ? ty - 40 : ty + 20, as); tag(s, tx, ty, { size: 40, a: as, color: NAVY }); }
    }
    if (A.cheek && (A.id === "b10" || A.id === "b12" && false)) {
      const out = 1 - smooth((t - END("b10") + .05) / .3), a = smooth((t - W("b10", "The study never")) / .35) * out, c = A.cheek;
      ctx.save(); ctx.globalAlpha = a; ctx.setLineDash([16, 12]); ctx.strokeStyle = SLATE; ctx.lineWidth = 5; ctx.beginPath(); ctx.ellipse(c.x, c.y, c.rx, c.ry, -.3, 0, 6.3); ctx.stroke(); ctx.restore();
    }
    if (A.nt) { const t0 = W("b11", "This study"), u = (t - t0) / .22; if (u >= 0 && t < END("b11") + .2) tag("not tested here", A.nt.x, A.nt.y, { size: 46, color: SLATE, sc: 1 + .18 * (1 - eo3(u)), a: 1 - smooth((t - END("b11")) / .2) }); }
  }
  // big UNKNOWN stamp over the picture on "unknown" (>= 50 % of the frame width)
  function bigStamp(t) {
    const t0 = T.stamps[1].t, a = t - t0, tf = S("b14") + .35; if (a < 0 || t > tf + .5) return; ensureStamps();
    const u = clamp(a / .12), sc = (1 + .5 * (1 - eo3(u))) * 1.14, fade = 1 - smooth((t - tf) / .45), img = stampImg.end;
    ctx.save(); if (a < .12) { ctx.globalAlpha = .22 * (1 - a / .12); ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, 1080, 1920); } ctx.restore();
    ctx.save(); ctx.globalAlpha = .42 * smooth(a / .15) * fade; ctx.fillStyle = "#141a30"; ctx.fillRect(0, 0, 1080, 1920); ctx.restore(); // dim the picture while the stamp lands
    ctx.save(); ctx.translate(540, 940); ctx.rotate(-.07); const k2 = sc * (1 - .1 * (1 - fade)); ctx.scale(k2, k2); ctx.globalAlpha = clamp(a / .06) * fade;
    ctx.shadowColor = "rgba(20,26,50,.35)"; ctx.shadowBlur = 30; ctx.shadowOffsetY = 10; ctx.fillStyle = "#FBFAF6"; rrect(-img.width / 2 - 22, -img.height / 2 - 22, img.width + 44, img.height + 44, 20); ctx.fill(); ctx.shadowColor = "transparent";
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
    const lines = [[["A ", NAVY], ["film", TEAL], [" of bacteria does grow", NAVY]], [["on towels in daily use.", NAVY]], [["Harm to your skin? ", NAVY], ["Unproven.", TEAL]], [["Disposable towels? ", NAVY], ["Not tested.", SLATE]], [["Dermatologists say: clean,", NAVY]], [["and not shared.", NAVY]]];
    lines.forEach((ln, i) => { const aa = smooth((t - T.tEnd - .4 - i * .09) / .25); if (aa > 0) mix(ln, SX, 690 + i * 76 + (i > 1 ? 24 : 0) + (i > 3 ? 18 : 0), 54, { a: aa * k, ls: -.5 }); });
    const as = smooth((t - T.tEnd - .95) / .3);
    ctx.save(); ctx.globalAlpha = as; ctx.fillStyle = TEAL; ctx.beginPath(); ctx.arc(SX - 150, 1243, 11, 0, 6.3); ctx.fill(); ctx.restore();
    txt("Skin Receipts", SX + 20, 1260, { size: 64, color: NAVY, a: as, ls: -1 });
    ctx.restore();
  }
  function edu(t) { // persistent line, 36 px (in the end card it is the closing line)
    if (t < .05) return; const s = "Education, not medical advice.", w = mw(s, 36, 400) + 40; ctx.save(); ctx.fillStyle = "rgba(251,250,246,.84)"; rrect(SX - w / 2, 1466, w, 56, 28); ctx.fill(); ctx.restore();
    txt(s, SX, 1506, { size: 36, w: 400, color: SLATE });
  }
  function draw(t, A) { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, 1080, 1920); labels(t, A || {}); { const ra = 1 - smooth((t - (T.tEnd - .55)) / .3); if (ra > .003) { ctx.save(); ctx.globalAlpha = ra; receipt(t); ctx.restore(); } } hook(t); bigStamp(t); endCard(t); edu(t); }

  function drawCover() { // UNKNOWN total only: no claim line, no HOLDS UP (never reads as endorsing a product)
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, 1080, 1920); ensureStamps();
    paper(PX, -30, PW, 470, true); const cx = PX + PW / 2;
    txt("SKIN RECEIPTS", cx, 130, { f: MONO, size: 36, color: NAVY, ls: 1 }); ctx.save(); ctx.fillStyle = TEAL; ctx.beginPath(); ctx.arc(PX + 20, 118, 7, 0, 6.3); ctx.fill(); ctx.restore();
    txt("No. 001 · towel", cx, 172, { f: MONO, w: 400, size: 26, color: SLATE }); dashed(PX + 22, PX + PW - 22, 198, 1);
    txt("RECEIPT TOTAL", cx, 262, { f: MONO, size: 36, color: NAVY }); dashed(PX + 22, PX + PW - 22, 290, 1);
    ctx.save(); ctx.translate(cx + 70, 370); ctx.rotate(-.07); ctx.scale(.86, .86); ctx.globalCompositeOperation = "multiply"; ctx.globalAlpha = .96; ctx.drawImage(stampImg.end, -stampImg.end.width / 2, -stampImg.end.height / 2); ctx.restore();
    plate(40, 1000, 900, 440, 1);
    mix([["What's growing", NAVY]], 0, 1130, 116, { left: 80, ls: -3 }); mix([["on your ", NAVY], ["towel", TEAL], ["?", NAVY]], 0, 1270, 116, { left: 80, ls: -3 });
    ctx.save(); ctx.fillStyle = NAVY; rrect(80, 1318, 380, 76, 38); ctx.fill(); ctx.fillStyle = "#5FC1BC"; ctx.beginPath(); ctx.arc(120, 1356, 10, 0, 6.3); ctx.fill(); ctx.restore();
    txt("Skin Receipts", 150, 1378, { size: 44, color: REC, align: "left" });
    edu(1);
  }
  return { draw, captions, initCaps, drawCover };
}
