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
  const PX = 28, PW = 392, ROWH = 42, CLIPB = 1236, VIS = 1150, FS = 31;
  const wrap = (s, n) => { const out = []; let c = ""; for (const w of s.split(" ")) { if (c && (c + " " + w).length > n) { out.push(c); c = w; } else c = c ? c + " " + w : w; } if (c) out.push(c); return out; };
  const items = []; { let y = 86;
    T.items.forEach((it, i) => {
      const st = it[3], rows = st === "hdr" ? it[2] : [].concat(...it[2].map(r => wrap(r, 18)));
      if (st === "head" || st === "total") y += 20;
      const o = { i, beat: it[0], t: it[1], rows, st, y0: y }; y += st === "hdr" ? 90 : rows.length * ROWH + 12; if (st === "head" || st === "total") y -= 0;
      o.y1 = y; if (st === "total") y += 150; o.yEnd = y; items.push(o);
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
    g.globalCompositeOperation = "destination-out"; for (let k = 0; k < 130; k++) { g.globalAlpha = .2 + .35 * hash(k * 3.1 + s.text.length); const r = .8 + 1.8 * hash(k * 7.7); g.beginPath(); g.arc(hash(k * 1.7) * c.width, hash(k * 5.3 + 2) * c.height, r, 0, 6.3); g.fill(); }
    for (let k = 0; k < 14; k++) { g.globalAlpha = .5; g.fillRect(hash(k * 9.1) * c.width, hash(k * 4.4 + 1) * c.height, 14 + hash(k) * 30, 1.5); }
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
    let bot = 0; items.slice(0, o.limit == null ? items.length : o.limit).forEach(it => { const lt = t - it.t; if (lt < 0) return; const r = it.st === "hdr" ? 1 : Math.min(it.rows.length, Math.floor(lt / .1) + 1); bot = Math.max(bot, it.st === "hdr" ? it.y1 : it.y0 + r * ROWH + 6); });
    stampDefs.forEach(st => { if (t >= st.t && st.id === "unk" && o.limit == null) bot = Math.max(bot, items.find(i => i.st === "total").y1 + 135); if (t >= st.t && st.id === "hold") bot = Math.max(bot, 0); });
    const scr = scroll, full = bot - scr + 40 >= CLIPB, pb = Math.min(CLIPB, bot - scr + 40);
    paper(PX, -30, PW, pb + 30, !full);
    ctx.save(); ctx.beginPath(); ctx.rect(PX, 0, PW, CLIPB); ctx.clip(); ctx.translate(0, -scroll);
    const lim = o.limit == null ? items.length : o.limit;
    items.slice(0, lim).forEach(it => {
      const lt = t - it.t; if (lt < 0) return;
      if (it.st === "hdr") {
        const a = smooth(lt / .3); txt("SKIN RECEIPTS", PX + PW / 2, it.y0 + 24, { f: MONO, size: 36, color: NAVY, ls: 1, a });
        ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = TEAL; ctx.beginPath(); ctx.arc(PX + 20, it.y0 + 12, 7, 0, 6.3); ctx.fill(); ctx.restore();
        txt("No. 001 · towel", PX + PW / 2, it.y0 + 58, { f: MONO, w: 400, size: 26, color: SLATE, a }); dashed(PX + 22, PX + PW - 22, it.y0 + 80, a); return;
      }
      if (it.st === "head" || it.st === "total") dashed(PX + 22, PX + PW - 22, it.y0 - 12, smooth(lt / .2));
      it.rows.forEach((r, k) => {
        const rt = lt - k * .1; if (rt < 0) return; const f = clamp(rt / .12), y = it.y0 + k * ROWH + 28;
        const colr = it.st === "slate" ? SLATE : NAVY; ctx.save(); ctx.beginPath(); ctx.rect(PX, y - 30, PX + PW, 44); ctx.clip();
        const wv = mw(r, FS, 700, MONO); ctx.beginPath(); ctx.rect(PX + 22, y - 32, (wv + 6) * f + 1, 50); ctx.clip();
        txt(r, PX + 24, y, { f: MONO, w: it.st === "line" || it.st === "sum" || it.st === "slate" ? 400 : 700, size: FS, color: colr, align: "left", ls: 0 });
        // print head glint
        if (f < 1) { ctx.fillStyle = "rgba(11,114,112,.25)"; ctx.fillRect(PX + 22 + wv * f, y - 30, 6, 38); }
        ctx.restore();
        if (it.st === "sum" && k === 0) { /* small tick dot */ }
      });
      if (it.st === "sum") { ctx.save(); ctx.globalAlpha = smooth(lt / .2); ctx.fillStyle = TEAL; ctx.fillRect(PX + 22, it.y0 + 2, 0, 0); ctx.restore(); }
    });
    // stamps (anchored to their line)
    stampDefs.forEach(s => {
      const a = t - s.t; if (a < 0 || (o.limit != null && s.id === "unk")) return;
      const anchor = s.at === "total" ? items.find(i => i.st === "total") : items.find(i => i.beat === s.at && i.st === "head"); if (!anchor) return;
      const img = stampImg[s.id], cx = PX + PW / 2 + (s.id === "hold" ? 22 : 4), cy = s.id === "hold" ? anchor.y0 + 64 : anchor.y1 + 70, u = clamp(a / .13), sc = 1 + .42 * (1 - eo3(u));
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(s.id === "hold" ? -.1 : -.07); ctx.scale(sc, sc); ctx.globalCompositeOperation = "multiply"; ctx.globalAlpha = clamp(a / .06) * .94;
      ctx.drawImage(img, -img.width / 2, -img.height / 2);
      ctx.restore();
      if (a < .5) { ctx.save(); ctx.globalAlpha = (1 - a / .5) * .35; ctx.strokeStyle = STC[s.color]; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(cx, cy, 170 + 120 * eo3(a / .5), 70 + 50 * eo3(a / .5), -.08, 0, 6.3); ctx.stroke(); ctx.restore(); }
    });
    ctx.restore();
    // paper fades out toward the caption band
    const fg = ctx.createLinearGradient(0, CLIPB - 90, 0, CLIPB + 4); fg.addColorStop(0, "rgba(255,255,255,0)"); fg.addColorStop(1, "rgba(251,250,246,1)");
    ctx.fillStyle = fg; ctx.fillRect(PX - 30, CLIPB - 90, PW + 60, 100);
    ctx.restore();
  }

  // ------------------------------------------------------------ hook + labels
  function plate(x, y, w, h, a) { ctx.save(); ctx.globalAlpha = a; ctx.shadowColor = "rgba(27,36,64,.14)"; ctx.shadowBlur = 40; ctx.shadowOffsetY = 8; ctx.fillStyle = "rgba(251,250,246,.90)"; rrect(x, y, w, h, 34); ctx.fill(); ctx.restore(); }
  function hook(t) {
    if (t > T.hookEnd + .4) return; const fade = 1 - smooth((t - T.hookEnd) / .3), k = eo3(t / .22);
    ctx.save(); ctx.globalAlpha = fade; plate(40, 170, 880, 505, 1);
    const L = [[["Your towel", NAVY]], [["grows a ", NAVY], ["film", TEAL]], [["of bacteria.", NAVY]]];
    L.forEach((ln, i) => { const y = 335 + i * 150; ctx.save(); ctx.translate(0, (1 - k) * 14); mix(ln, 0, y, 134, { left: 78, ls: -3, a: .55 + .45 * k }); ctx.restore(); });
    txt("SKIN RECEIPTS · No. 001", 78, 215, { f: MONO, size: 28, color: SLATE, align: "left", ls: 3 });
    ctx.restore();
  }
  function tag(s, x, y, o) { o = o || {}; const size = o.size || 36, w = mw(s, size, 700) + 44; ctx.save(); ctx.globalAlpha = o.a == null ? 1 : o.a; ctx.fillStyle = "rgba(251,250,246,.92)"; ctx.shadowColor = "rgba(27,36,64,.15)"; ctx.shadowBlur = 16; rrect(x - w / 2, y - size * .95, w, size * 1.5, size * .75); ctx.fill(); ctx.shadowBlur = 0; ctx.strokeStyle = o.line || SLATE; ctx.lineWidth = 2.5; ctx.stroke(); txt(s, x, y, { size, color: o.color || NAVY }); ctx.restore(); }
  function leader(x0, y0, x1, y1, a) { ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = SLATE; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke(); ctx.fillStyle = SLATE; ctx.beginPath(); ctx.arc(x1, y1, 6, 0, 6.3); ctx.fill(); ctx.restore(); }
  const LX = 700; // centre of the free area right of the receipt
  function labels(t, A) {
    const inB = (id, a = 0, b = 0) => t >= S(id) + a && t < END(id) + .3 + b;
    if (inB("b03", .9) ) { // household counter
      const a = smooth((t - S("b03") - .9) / .3) * (1 - smooth((t - END("b03") - .1) / .3)); const n = A.houses | 0;
      ctx.save(); ctx.globalAlpha = a; plate(470, 190, 460, 250, 1); ctx.globalAlpha = a;
      txt(String(n), LX, 335, { size: 170, color: TEAL, w: 700, ls: -4 }); txt("households", LX, 400, { size: 46, color: SLATE, w: 700 }); ctx.restore();
    }
    if (inB("b04", .0)) {
      const a = smooth((t - W("b04", "Six months")) / .3) * (1 - smooth((t - END("b04") - .1) / .3));
      ctx.save(); ctx.globalAlpha = a; plate(450, 190, 480, 230, 1); ctx.globalAlpha = a;
      mix([["6 ", TEAL], ["months", NAVY]], LX, 330, 110, { ls: -2 }); txt("tested every 2 months", LX, 392, { size: 38, color: SLATE });
      ctx.restore();
      (A.ticks || []).forEach((k, i) => { const aa = smooth((t - k.t) / .25) * a; if (aa <= 0) return; txt(String(i * 2), k.x, k.y, { size: 76, color: i === 3 ? TEAL : NAVY, a: aa, ls: -1 }); });
    }
    if (inB("b05", .0) && t < END("b05") + .1) {
      const a1 = smooth((t - W("b05", "By month")) / .25), a2 = smooth((t - W("b05", "Under a microscope")) / .25), out = 1 - smooth((t - END("b05") - .05) / .25);
      if (A.cmp) { // bright vs dull tags above the two towels
        txt("new", A.cmp[0], A.cmp[2], { size: 40, color: SLATE, a: a1 * out * A.cmpA }); txt("month 2", A.cmp[1], A.cmp[2], { size: 40, color: NAVY, a: a1 * out * A.cmpA });
      }
      tag("biofilm", 770, 300, { size: 52, a: a2 * out, color: TEAL, line: TEAL });
    }
    if (inB("b06", .0) && t < END("b07") + .3 && A.bars) {
      const out = 1 - smooth((t - END("b07") - .1) / .25);
      A.bars.forEach((b, i) => { const a = smooth((t - S("b06") - .3 - i * .25) / .3) * out; txt(["month 2", "month 4", "month 6"][i], b.x, b.y, { size: 40, color: i === 2 ? TEAL : SLATE, a }); });
      const ah = smooth((t - W("b06", "highest")) / .3) * out; if (ah > 0) tag("highest", A.bars[2].tx, A.bars[2].ty, { size: 46, a: ah, color: TEAL, line: TEAL });
    }
    if (inB("b08", .0) && t < END("b08") + .2 && A.discs) {
      const out = 1 - smooth((t - END("b08") - .0) / .25);
      const a = smooth((t - A.discT) / .3) * out;
      txt("your skin", A.discs[0].x, A.discs[0].y, { size: 42, color: NAVY, a }); txt("your towel", A.discs[1].x, A.discs[1].y, { size: 42, color: NAVY, a });
      const as = smooth((t - W("b08", "Staph")) / .3) * out; if (as > 0) { leader(A.sliver.x, A.sliver.y, A.sliver.x + 20, A.sliver.y + 70, as); tag("Staph: under 1%", A.sliver.x + 40, A.sliver.y + 112, { size: 36, a: as, color: NAVY }); }
    }
    if (inB("b10", .6) && t < END("b10") + .2 && A.cheek) {
      const out = 1 - smooth((t - END("b10") + .05) / .3), a = smooth((t - W("b10", "The study never")) / .35) * out, c = A.cheek;
      ctx.save(); ctx.globalAlpha = a; ctx.setLineDash([16, 12]); ctx.strokeStyle = SLATE; ctx.lineWidth = 5; ctx.beginPath(); ctx.ellipse(c.x, c.y, c.rx, c.ry, -.3, 0, 6.3); ctx.stroke(); ctx.restore();
      txt("?", c.x, c.y + 70, { size: 200, color: SLATE, a: a * .9 });
    }
    if (inB("b11", .5) && t < END("b11") + .2 && A.nt) {
      const a = smooth((t - W("b11", "This study")) / .3) * (1 - smooth((t - END("b11")) / .25)); tag("not tested here", A.nt.x, A.nt.y, { size: 42, a, color: SLATE });
    }
  }

  // ------------------------------------------------------------ end card
  function endCard(t) {
    if (t < T.tEnd - .1) return; const k = smooth((t - (T.tEnd - .1)) / .4); ensureStamps();
    ctx.save(); ctx.globalAlpha = k * .93; ctx.fillStyle = REC; ctx.fillRect(0, 0, 1080, 1920); ctx.restore();
    ctx.save(); ctx.globalAlpha = k;
    txt("RECEIPT TOTAL", SX, 330, { f: MONO, size: 44, color: SLATE, ls: 6 }); dashed(150, 860, 372, .8 * k);
    const a = t - (T.tEnd + .15), u = clamp(a / .13);
    if (a >= 0) { const img = stampImg.end, sc = 1 + .42 * (1 - eo3(u)); ctx.save(); ctx.translate(SX, 520); ctx.rotate(-.06); ctx.scale(sc, sc); ctx.globalCompositeOperation = "multiply"; ctx.globalAlpha = clamp(a / .06) * .95; ctx.drawImage(img, -img.width / 2, -img.height / 2); ctx.restore(); }
    const lines = [[["A ", NAVY], ["film", TEAL], [" of bacteria does grow", NAVY]], [["on towels in daily use.", NAVY]], [["Harm to your skin? ", NAVY], ["Unproven.", TEAL]], [["Dermatologists say: clean,", NAVY]], [["and not shared.", NAVY]]];
    lines.forEach((ln, i) => { const aa = smooth((t - T.tEnd - .5 - i * .12) / .3); if (aa > 0) mix(ln, SX, 770 + i * 78 + (i > 1 ? 30 : 0) + (i > 2 ? 0 : 0), 54, { a: aa * k, ls: -.5 }); });
    const as = smooth((t - T.tEnd - 1.0) / .35);
    ctx.save(); ctx.globalAlpha = as; ctx.fillStyle = TEAL; ctx.beginPath(); ctx.arc(SX - 150, 1243, 11, 0, 6.3); ctx.fill(); ctx.restore();
    txt("Skin Receipts", SX + 20, 1260, { size: 64, color: NAVY, a: as, ls: -1 });
    ctx.restore();
  }
  function edu(t) { // persistent small line (in the end card it is the closing line)
    if (t < .05) return; ctx.save(); ctx.fillStyle = "rgba(251,250,246,.80)"; const w = mw("Education, not medical advice.", 30, 400) + 36; rrect(SX - w / 2, 1470, w, 46, 23); ctx.fill(); ctx.restore();
    txt("Education, not medical advice.", SX, 1503, { size: 30, w: 400, color: SLATE });
  }
  function draw(t, A) { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, 1080, 1920); labels(t, A || {}); receipt(t); hook(t); endCard(t); edu(t); }

  function drawCover() {
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, 1080, 1920);
    const t = T.stamps[0].t + .8; receipt(t, { cover: true, limit: 5 });
    plate(40, 1000, 900, 440, 1);
    mix([["What's growing", NAVY]], 0, 1130, 116, { left: 80, ls: -3 }); mix([["on your ", NAVY], ["towel", TEAL], ["?", NAVY]], 0, 1270, 116, { left: 80, ls: -3 });
    ctx.save(); ctx.fillStyle = NAVY; rrect(80, 1318, 380, 76, 38); ctx.fill(); ctx.fillStyle = "#5FC1BC"; ctx.beginPath(); ctx.arc(120, 1356, 10, 0, 6.3); ctx.fill(); ctx.restore();
    txt("Skin Receipts", 150, 1378, { size: 44, color: REC, align: "left" });
    txt("Education, not medical advice.", SX, 1503, { size: 30, w: 400, color: SLATE });
  }
  return { draw, captions, initCaps, drawCover };
}
