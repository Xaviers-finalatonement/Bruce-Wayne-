// Type + caption building blocks drawn on a transparent 2D canvas over the 3D image (Anton titles / Barlow captions).
// createType(canvas, theme) -> { txt, fitSize, tabText, slam, ring, tag, line, hookHeadline, stampCard, captions, initCaps, ... }
import { clamp, smooth, eio, eo3, lerp, hash } from "./timing.js";

export function createType(cv, TH) {
  const C = TH.colors, ctx = cv.getContext("2d");
  const HOT = C.horizon, UV = C.ultraviolet, TXT = C.static, HAZE = C.haze, ABY = C.abyss;
  const ANTON = `"${TH.fonts.display.family}", sans-serif`, BARL = `"${TH.fonts.body.family}", sans-serif`;
  const col = (h, a = 1) => `rgba(${parseInt(h.slice(1, 3), 16)},${parseInt(h.slice(3, 5), 16)},${parseInt(h.slice(5, 7), 16)},${a})`;
  function txt(s, x, y, o) {
    o = o || {}; ctx.save();
    ctx.font = `${o.w || 400} ${o.size || 40}px ${o.f || ANTON}`; ctx.textAlign = o.align || "center"; ctx.letterSpacing = (o.ls || 0) + "px";
    ctx.globalAlpha = o.a == null ? 1 : o.a; ctx.translate(x, y); if (o.rot) ctx.rotate(o.rot); if (o.sc) ctx.scale(o.sc, o.sc);
    if (o.glow) { ctx.shadowColor = o.gcol || o.color || TXT; ctx.shadowBlur = o.glow; }
    ctx.fillStyle = o.color || TXT; ctx.fillText(s, 0, 0);
    if (o.glow) { ctx.shadowBlur = o.glow * .5; ctx.fillText(s, 0, 0); }
    ctx.restore();
  }
  const fitSize = (s, w, max) => { ctx.save(); ctx.font = `400 100px ${ANTON}`; ctx.letterSpacing = "0px"; const m = ctx.measureText(s).width; ctx.restore(); return Math.min(max || 999, 100 * w / m); };
  function tabText(s, x, y, size, color) {
    ctx.save(); ctx.font = `800 ${size}px ${BARL}`; ctx.fillStyle = color; ctx.textAlign = "center";
    const pitch = ctx.measureText("0").width, adv = [...s].map(ch => /[0-9]/.test(ch) ? pitch : ctx.measureText(ch).width), w = adv.reduce((a, b) => a + b, 0);
    let cx = x - w / 2; [...s].forEach((ch, i) => { ctx.fillText(ch, cx + adv[i] / 2, y); cx += adv[i]; }); ctx.restore();
  }
  const slam = (t, t0, d) => { const u = (t - t0) / (d || .16); return u < 0 ? null : { sc: 1 + 1.5 * (1 - eo3(u)), a: .35 + .65 * clamp((t - t0) / .05) }; };
  function ring(x, y, r0, r1, u, color, w) { if (u <= 0 || u >= 1) return; ctx.save(); ctx.globalAlpha = (1 - u) * .9; ctx.strokeStyle = color; ctx.lineWidth = (w || 5) * (1 - u * .6); ctx.shadowColor = color; ctx.shadowBlur = 24; ctx.beginPath(); ctx.arc(x, y, lerp(r0, r1, eo3(u)), 0, 6.2832); ctx.stroke(); ctx.restore(); }
  function rrect(x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }
  function line(pts, color, w, glow, a) { ctx.save(); ctx.lineCap = "round"; ctx.globalAlpha = a == null ? 1 : a; ctx.strokeStyle = color; ctx.lineWidth = w; if (glow) { ctx.shadowColor = color; ctx.shadowBlur = glow; }
    ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.stroke(); ctx.restore(); }
  // thin label with a dark pill so it stays legible over the 3D image
  function tag(s, x, y, o) { o = o || {}; ctx.save(); ctx.font = `800 ${o.size || 38}px ${BARL}`; ctx.letterSpacing = (o.ls == null ? 6 : o.ls) + "px"; const w = ctx.measureText(s).width + 36; ctx.restore();
    ctx.save(); ctx.globalAlpha = o.a == null ? 1 : o.a; const al = o.align || "center", x0 = al === "right" ? x - w : al === "left" ? x : x - w / 2;
    rrect(x0, y - (o.size || 38) - 4, w, (o.size || 38) + 22, 10); ctx.fillStyle = col(ABY, .62); ctx.fill(); ctx.restore();
    txt(s, al === "right" ? x - 18 : al === "left" ? x + 18 : x, y, { f: BARL, w: 800, size: o.size || 38, ls: o.ls == null ? 6 : o.ls, color: o.color || TXT, align: al, glow: 8, a: o.a }); }


  // Headline slam: lines = [[text, color, delay, targetWidth, maxSize]]; tEnd = when it exits upward.
  function hookHeadline(t, tEnd, lines, top) {
    if (t > tEnd + .5) return;
    const exit = smooth((t - tEnd) / .35);
    ctx.save(); ctx.font = `400 100px ${ANTON}`; const capR = ctx.measureText("H").actualBoundingBoxAscent / 100; ctx.restore();
    let yy = top == null ? 178 : top; ctx.globalAlpha = 1 - exit;
    lines.forEach(([s, color, d, w, max]) => { const size = fitSize(s, w, max), base = yy + capR * size; yy = base + 30; const sl = slam(t, d + .02, .13); if (!sl) return;
      ctx.save(); ctx.translate(0, -exit * 160); txt(s, 505, base, { size, color, sc: sl.sc, a: sl.a, glow: color === HOT ? 30 : 0, gcol: HOT, ls: 2 }); ctx.restore(); });
    ctx.globalAlpha = 1;
  }

  // Verdict / case-file stamp: header, rule, huge slamming stamp word + shockwave, rule line once, optional sign-off.
  // o: { t0, rule (time or null), sign (time or null), word }
  function stampCard(t, tStamp, o) {
    const lt = t - o.t0;
    ctx.save(); ctx.globalAlpha = smooth(lt / .3); ctx.strokeStyle = col(TXT, .5); ctx.lineWidth = 3;
    [[90, 250, 1, 1], [990, 250, -1, 1], [90, 1330, 1, -1], [990, 1330, -1, -1]].forEach(([x, y, sx, sy]) => { ctx.beginPath(); ctx.moveTo(x, y + sy * 60); ctx.lineTo(x, y); ctx.lineTo(x + sx * 60, y); ctx.stroke(); }); ctx.restore();
    txt((o.header || "CASE FILE 001"), 505, 392, { f: BARL, w: 800, size: 46, ls: 14, color: HAZE, a: smooth(lt / .25), glow: 6 });
    line([[170, 430], [840, 430]], col(HAZE, .6), 2, 0, smooth(lt / .4));
    const sl = slam(t, tStamp, .16), cy = 740;
    if (!sl) { ctx.save(); ctx.globalAlpha = .5 + .3 * Math.sin(t * 20); ctx.setLineDash([16, 14]); ctx.strokeStyle = HOT; ctx.lineWidth = 5; ctx.shadowColor = HOT; ctx.shadowBlur = 16; rrect(180, cy - 200, 650, 310, 14); ctx.stroke(); ctx.restore();
      txt("VERDICT", 505, cy + 4, { size: 110, color: col(HAZE, .9), ls: 14 }); }
    else { const age = t - tStamp; ring(505, cy - 40, 150, 700, age / .7, HOT, 10); ring(505, cy - 40, 100, 520, (age - .08) / .6, TXT, 4);
      ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.fillStyle = col(HOT, .45 * Math.max(0, 1 - age / .25)); ctx.fillRect(0, 0, 1080, 1920); ctx.restore();
      txt((o.word || "TRUE"), 505, cy + 110, { size: 350, color: HOT, sc: sl.sc, a: sl.a, rot: -.05, glow: 50, ls: 6 });
      if (sl.sc < 1.02) { ctx.save(); ctx.translate(505, cy - 40); ctx.rotate(-.05); ctx.strokeStyle = HOT; ctx.lineWidth = 8; ctx.shadowColor = HOT; ctx.shadowBlur = 24; rrect(-390, -200, 780, 360, 14); ctx.stroke(); ctx.lineWidth = 3; rrect(-408, -218, 816, 396, 18); ctx.stroke(); ctx.restore(); } }
    if (o.rule != null && t >= o.rule) { const u = smooth((t - o.rule) / .35), y0 = 1060; line([[170, 1000], [840, 1000]], col(HAZE, .6), 2, 0, u);
      txt("The higher you are,", 505, y0 + 30, { f: BARL, w: 800, size: 68, a: u, glow: 6, gcol: ABY });
      ctx.save(); ctx.globalAlpha = u; ctx.font = `800 68px ${BARL}`; const a1 = "the ", a2 = "faster", a3 = " your time runs.", w1 = ctx.measureText(a1).width, w2 = ctx.measureText(a2).width, w3 = ctx.measureText(a3).width, x0 = 505 - (w1 + w2 + w3) / 2;
      ctx.textAlign = "left"; ctx.fillStyle = TXT; ctx.fillText(a1, x0, y0 + 118); ctx.fillStyle = HOT; ctx.shadowColor = HOT; ctx.shadowBlur = 16; ctx.fillText(a2, x0 + w1, y0 + 118); ctx.shadowBlur = 0; ctx.fillStyle = TXT; ctx.fillText(a3, x0 + w1 + w2, y0 + 118);
      ctx.fillStyle = HOT; ctx.fillRect(x0 + w1, y0 + 132, w2 * u, 6); ctx.restore(); }
    if (o.sign != null) { const u = smooth((t - o.sign) / .4); txt((o.signText || TH.brand.toUpperCase()), 505, 1350, { size: 56, color: TXT, ls: 12, a: u, glow: 12, gcol: UV }); ctx.save(); ctx.globalAlpha = u; ctx.fillStyle = HOT; ctx.beginPath(); ctx.arc(505, 1392, 5, 0, 6.3); ctx.fill(); ctx.restore(); }
  }

  // ---------- captions (DOM) ----------
  const CP = TH.caption, capEl = document.getElementById("cap"), allCaps = [];
  function initCaps(tl) { tl.beats.forEach(b => b.captions.forEach(c => allCaps.push(Object.assign({ beat: b.id }, c)))); }
  const NUMW = /^(\d[\d.,]*|two|seventy-nine|ninety|2010)$/i;
  function wrapLines(words) { const lines = []; let c = ""; for (const w of words) { if (c && (c + " " + w).length > CP.maxLineChars) { lines.push(c); c = w; } else c = c ? c + " " + w : w; } if (c) lines.push(c); return lines; }
  let capCache = null;
  function build(c) {
    const words = c.text.split(" "); let idx = 0, html = "";
    wrapLines(words).forEach(ln => { html += '<span class="ln"><span class="bk">'; ln.split(" ").forEach((w, wi) => { const cls = [NUMW.test(w.replace(/[^\w-]/g, "")) ? "num" : "", idx === c.key ? "key" : ""].join(" ").trim(); html += (wi ? " " : "") + (cls ? `<span class="${cls}">${w}</span>` : w); idx++; }); html += "</span></span>"; });
    capEl.innerHTML = html; capEl.style.fontFamily = BARL; capEl.style.fontWeight = CP.weight; capEl.style.color = CP.color;
    capEl.style.left = CP.left + "px"; capEl.style.width = (1080 - CP.left - CP.right) + "px";
    let size = CP.size; capEl.style.fontSize = size + "px"; capEl.style.lineHeight = CP.lineHeight;
    capEl.querySelectorAll(".bk").forEach(b => { b.style.background = CP.backing; b.style.padding = `${CP.padY}px ${CP.padX}px`; b.style.borderRadius = CP.radius + "px"; b.style.boxDecorationBreak = "clone"; });
    const maxW = 1080 - CP.left - CP.right;
    while (size > 44 && Math.max(...[...capEl.querySelectorAll(".bk")].map(b => b.getBoundingClientRect().width)) > maxW) { size -= 2; capEl.style.fontSize = size + "px"; }
    capEl.style.top = (CP.bottomY - capEl.getBoundingClientRect().height) + "px";
  }
  function captions(t, until, hide) {
    let c = null; for (const k of allCaps) if (t >= k.start && t < k.end + .12) c = k;
    if (!c || (hide && hide(c)) || t >= (until == null ? 1e9 : until)) { capEl.style.opacity = 0; capCache = null; return; }
    if (capCache !== c) { build(c); capCache = c; } capEl.style.opacity = clamp((t - c.start) / .09);
  }

  return { ctx, col, ANTON, BARL, txt, fitSize, tabText, slam, ring, rrect, line, tag, hookHeadline, stampCard, captions, initCaps };
}
