// 2D type overlay (Anton / Barlow) drawn over the 3D render. Pure function of t; anchors come from the 3D camera.
import { clamp, smooth, eio, eo3, lerp, hash } from "./timing.js";

export function createOverlay(T, TH, cv) {
  const C = TH.colors, ctx = cv.getContext("2d"), { S, E, END, W } = T;
  const HOT = C.horizon, UV = C.ultraviolet, TXT = C.static, HAZE = C.haze, ABY = C.abyss;
  const ANTON = `"${TH.fonts.display.family}", sans-serif`, BARL = `"${TH.fonts.body.family}", sans-serif`;
  const col = (h, a = 1) => `rgba(${parseInt(h.slice(1, 3), 16)},${parseInt(h.slice(3, 5), 16)},${parseInt(h.slice(5, 7), 16)},${a})`;
  let SH = [0, 0];
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

  function hook(t) {
    if (t > T.hookEnd + .5) return;
    const exit = smooth((t - T.hookEnd) / .35), spec = [["YOUR HEAD IS", TXT, 0, 800, 140], ["OLDER", HOT, .1, 680, 300], ["THAN YOUR FEET", TXT, .2, 840, 140]];
    ctx.save(); ctx.font = `400 100px ${ANTON}`; const capR = ctx.measureText("H").actualBoundingBoxAscent / 100; ctx.restore();
    let yy = 178; ctx.globalAlpha = 1 - exit;
    spec.forEach(([s, color, d, w, max]) => { const size = fitSize(s, w, max), base = yy + capR * size; yy = base + 30; const sl = slam(t, d + .02, .13); if (!sl) return;
      ctx.save(); ctx.translate(0, -exit * 160); txt(s, 505, base, { size, color, sc: sl.sc, a: sl.a, glow: color === HOT ? 30 : 0, gcol: HOT, ls: 2 }); ctx.restore(); });
    ctx.globalAlpha = 1;
  }

  function stampCard(t, tStamp, o) {
    const lt = t - o.t0;
    ctx.save(); ctx.globalAlpha = smooth(lt / .3); ctx.strokeStyle = col(TXT, .5); ctx.lineWidth = 3;
    [[90, 250, 1, 1], [990, 250, -1, 1], [90, 1330, 1, -1], [990, 1330, -1, -1]].forEach(([x, y, sx, sy]) => { ctx.beginPath(); ctx.moveTo(x, y + sy * 60); ctx.lineTo(x, y); ctx.lineTo(x + sx * 60, y); ctx.stroke(); }); ctx.restore();
    txt("CASE FILE 001", 505, 392, { f: BARL, w: 800, size: 46, ls: 14, color: HAZE, a: smooth(lt / .25), glow: 6 });
    line([[170, 430], [840, 430]], col(HAZE, .6), 2, 0, smooth(lt / .4));
    const sl = slam(t, tStamp, .16), cy = 740;
    if (!sl) { ctx.save(); ctx.globalAlpha = .5 + .3 * Math.sin(t * 20); ctx.setLineDash([16, 14]); ctx.strokeStyle = HOT; ctx.lineWidth = 5; ctx.shadowColor = HOT; ctx.shadowBlur = 16; rrect(180, cy - 200, 650, 310, 14); ctx.stroke(); ctx.restore();
      txt("VERDICT", 505, cy + 4, { size: 110, color: col(HAZE, .9), ls: 14 }); }
    else { const age = t - tStamp; ring(505, cy - 40, 150, 700, age / .7, HOT, 10); ring(505, cy - 40, 100, 520, (age - .08) / .6, TXT, 4);
      ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.fillStyle = col(HOT, .45 * Math.max(0, 1 - age / .25)); ctx.fillRect(0, 0, 1080, 1920); ctx.restore();
      txt("TRUE", 505, cy + 110, { size: 350, color: HOT, sc: sl.sc, a: sl.a, rot: -.05, glow: 50, ls: 6 });
      if (sl.sc < 1.02) { ctx.save(); ctx.translate(505, cy - 40); ctx.rotate(-.05); ctx.strokeStyle = HOT; ctx.lineWidth = 8; ctx.shadowColor = HOT; ctx.shadowBlur = 24; rrect(-390, -200, 780, 360, 14); ctx.stroke(); ctx.lineWidth = 3; rrect(-408, -218, 816, 396, 18); ctx.stroke(); ctx.restore(); } }
    if (o.rule != null && t >= o.rule) { const u = smooth((t - o.rule) / .35), y0 = 1060; line([[170, 1000], [840, 1000]], col(HAZE, .6), 2, 0, u);
      txt("The higher you are,", 505, y0 + 30, { f: BARL, w: 800, size: 68, a: u, glow: 6, gcol: ABY });
      ctx.save(); ctx.globalAlpha = u; ctx.font = `800 68px ${BARL}`; const a1 = "the ", a2 = "faster", a3 = " your time runs.", w1 = ctx.measureText(a1).width, w2 = ctx.measureText(a2).width, w3 = ctx.measureText(a3).width, x0 = 505 - (w1 + w2 + w3) / 2;
      ctx.textAlign = "left"; ctx.fillStyle = TXT; ctx.fillText(a1, x0, y0 + 118); ctx.fillStyle = HOT; ctx.shadowColor = HOT; ctx.shadowBlur = 16; ctx.fillText(a2, x0 + w1, y0 + 118); ctx.shadowBlur = 0; ctx.fillStyle = TXT; ctx.fillText(a3, x0 + w1 + w2, y0 + 118);
      ctx.fillStyle = HOT; ctx.fillRect(x0 + w1, y0 + 132, w2 * u, 6); ctx.restore(); }
    if (o.sign != null) { const u = smooth((t - o.sign) / .4); txt("UNREAL, ACTUALLY", 505, 1350, { size: 56, color: TXT, ls: 12, a: u, glow: 12, gcol: UV }); ctx.save(); ctx.globalAlpha = u; ctx.fillStyle = HOT; ctx.beginPath(); ctx.arc(505, 1392, 5, 0, 6.3); ctx.fill(); ctx.restore(); }
  }

  // A = anchors from the 3D camera (pixels): headClock, feetClock {x,y,r}, lowClock, highClock, clk[4], gap {x,y,s}, bench..., pin
  function draw(t, A, shk) {
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, 1080, 1920); ctx.translate(shk[0], shk[1]);
    const inA = t < S("b03") || (t >= S("b05") && t < S("b06")) || t >= S("b15");
    hook(t);
    if (inA && A.head && t < T.tSign - .35) {
      const a = smooth(t / .4);
      tag("HEAD", A.head.x - A.head.r - 22, A.head.y + 14, { color: HOT, align: "right", a });
      if (A.feet.y < 1230) tag("FEET", A.feet.x - A.feet.r - 22, A.feet.y + 14, { color: UV, align: "right", a });
      if (t < S("b03")) tag("AHEAD", (A.head.x + A.feet.x) / 2 - 20, (A.head.y + A.feet.y) / 2 + 12, { color: HOT, align: "right", a: smooth((t - .5) / .3), size: 34 });
      const g = W("b05", "Your feet"); ring(A.feet.x, A.feet.y, A.feet.r, A.feet.r + 90, (t - g) / .8, UV, 6);
      ring(A.head.x, A.head.y, A.head.r, A.head.r + 90, (t - W("b05", "Your head is")) / .8, HOT, 6); ring(A.head.x, A.head.y, A.head.r, A.head.r + 130, (t - W("b05", "faster")) / .9, HOT, 7);
    }
    if (t >= S("b02") + .05 && t < S("b03") && A.head) { // b02 counter
      const u = smooth((t - S("b02") - .05) / .25), a = u * (1 - smooth((t - (S("b03") - .3)) / .3)), roll = t >= W("b02", "a tiny bit"), cy = 470;
      ctx.save(); ctx.globalAlpha = a; rrect(505 - 310, cy - 52, 620, 90, 14); ctx.fillStyle = col(ABY, .85); ctx.fill(); ctx.strokeStyle = col(HOT, .8); ctx.lineWidth = 2; ctx.stroke();
      tabText("head +0.000 000 000 00" + (roll ? "1" : "0") + " s", 505, cy + 14, 42, roll && t < W("b02", "a tiny bit") + .25 ? TXT : HOT); ctx.restore();
      ring(505 + 175, cy - 6, 8, 70, (t - W("b02", "a tiny bit")) / .6, HOT, 4);
    }
    if (t >= S("b03") && t < S("b04")) {
      txt("GRAVITY", 505, 330, { size: 96, color: HOT, ls: 8, glow: 24, a: smooth((t - W("b03", "Gravity")) / .25) });
      if (A.high) { tag("FAST", A.high.x, A.high.y + A.high.r + 64, { color: UV, a: smooth((t - T.tSag - .3) / .3), size: 32 }); tag("SLOW", A.low.x, A.low.y - A.low.r - 22, { color: HOT, a: smooth((t - T.tSag - .3) / .3), size: 32 }); }
    }
    if (t >= S("b04") && t < S("b05")) { const lt = t - S("b04");
      txt("FASTER", 910, 200, { size: 64, color: HOT, align: "right", ls: 5, glow: 18, a: smooth((lt - 1.4) / .3) });
      txt("SLOWER", 910, 1160, { size: 64, color: UV, align: "right", ls: 5, glow: 18, a: smooth((lt - .3) / .3) * (1 - smooth((lt - 2.4) / .3)) });
      tag("speeds exaggerated", 505, 1200, { size: 28, ls: 2, color: HAZE, a: smooth((lt - 1) / .4) * (1 - smooth((lt - 2.6) / .3)) }); }
    if (t >= S("b06") && t < S("b09")) {
      const tS = W("b06", "in 2010"), sl = slam(t, tS, .16);
      if (sl && t < S("b07") + 1.6) { ctx.save(); ctx.globalAlpha = 1 - smooth((t - (S("b07") + 1.2)) / .4);
        txt("2010 · NIST", 505, 360, { size: 124, color: HOT, sc: sl.sc, a: sl.a, glow: 28, ls: 2, rot: -.04 });
        if (sl.sc < 1.05) { ctx.save(); ctx.translate(505, 314); ctx.rotate(-.04); ctx.strokeStyle = HOT; ctx.lineWidth = 6; ctx.shadowColor = HOT; ctx.shadowBlur = 20; rrect(-330, -100, 660, 170, 10); ctx.stroke(); ctx.restore(); }
        ctx.restore(); ring(505, 300, 150, 560, (t - tS) / .6, HOT, 7); }
      if (A.dim) { const dd = smooth((t - (W("b07", "Two steps") + .2)) / .4); if (dd > 0) tag("33 cm ≈ 1 ft", A.dim.x, A.dim.y, { a: dd, size: 40, ls: 1 }); }
    }
    if (t >= S("b09") && t < S("b11")) {
      const a = smooth((t - W("b09", "seventy")) / .3) * (1 - smooth((t - W("b09", "about ninety") + .3) / .4));
      if (a > 0) txt("79 YEARS", 505, 480, { size: 230, color: TXT, ls: 4, glow: 26, gcol: UV, a, sc: 1 + .2 * (1 - eo3((t - W("b09", "seventy")) / .2)) });
      const sh0 = S("b10") + .15;
      if (A.gap) { const k = A.gap.s;
        const a1 = smooth((t - W("b09", "about ninety")) / .3) * (1 - smooth((t - sh0) / .3));
        if (a1 > 0) { txt("≈ 0.000 000 09 s", A.gap.x, A.gap.y - 190 * k, { size: 72, color: HOT, glow: 20, a: a1 }); }
        const a2 = smooth((t - W("b09", "ninety")) / .3) * (1 - smooth((t - sh0) / .3));
        if (a2 > 0) txt("90 billionths of a second", A.gap.x, A.gap.y + 210 * k, { f: BARL, w: 800, size: 40, color: TXT, ls: 1, a: a2, glow: 8, gcol: ABY }); }
      if (t >= W("b10", "But real")) { const u = (t - W("b10", "But real")) / 1.1; txt("REAL", 505, 560, { size: 250, color: HOT, glow: 40, a: smooth(u * 3) * (1 - smooth((t - E("b10") + .5) / .4)), sc: 1 + .12 * (1 - eo3(u * 1.6)) }); }
    }
    if (t >= S("b11") && t < S("b12")) { const g = W("b11", "GPS"); txt("GPS", 130, 330, { size: 150, color: TXT, glow: 24, gcol: HOT, align: "left", ls: 6, a: smooth((t - g) / .15), sc: 1 + .4 * (1 - eo3((t - g) / .16)) }); }
    if (t >= S("b12") && t < T.th0) { const ta = smooth((t - T.tSlow0 + .2) / .25), sc = 1 + .25 * (1 - eo3((t - T.tSlow0 + .2) / .2));
      txt("SET SLOW", 505, 262, { size: 118, color: HOT, glow: 26, ls: 4, a: ta, sc }); txt("BEFORE LAUNCH", 505, 352, { size: 76, color: TXT, ls: 6, a: ta });
      if (A.knob) { tag("FAST", A.knob.x - 60, A.knob.y - A.knob.r - 30, { color: UV, size: 28, ls: 4 }); tag("SLOW", A.knob.x + 70, A.knob.y - A.knob.r - 30, { color: HOT, size: 28, ls: 4 }); } }
    if (t >= T.th0 && t < S("b13")) { const wa = smooth((t - T.tDrift1 + .9) / .2) * (1 - smooth((t - T.tSnap + .1) / .2));
      if (wa > 0) txt("WRONG", 505, 360, { size: 170, color: HOT, glow: 34, a: wa, ls: 6, sc: 1 + .2 * (1 - eo3((t - T.tDrift1 + .9) / .18)) }); }
    if (t >= S("b14") && t < S("b15") && A.plus) for (let i = 1; i < T.NST; i++) { const u = (t - T.arr(i)) / 1.0; if (u < 0 || u > 1) continue;
      txt("+", A.plus.x + 60, A.plus.y - 120 * u - 40, { size: 130, color: HOT, glow: 24, a: 1 - u * u, sc: 1 + .5 * (1 - eo3(u * 4)) }); }
    if (t >= S("b13") && t < S("b14")) stampCard(t, T.tTrue, { t0: S("b13"), rule: T.tRule });
    if (t >= T.tSign - .35) { const u = smooth((t - (T.tSign - .35)) / .3); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.save(); ctx.globalAlpha = u * .9; ctx.fillStyle = ABY; ctx.fillRect(0, 0, 1080, 1920); ctx.restore(); ctx.translate(shk[0], shk[1]); ctx.save(); ctx.globalAlpha = u; stampCard(t, -1e9, { t0: T.tSign - .35, rule: T.tSign - .35, sign: T.tSign }); ctx.restore(); }
  }

  function drawCover(A) {
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, 1080, 1920);
    ctx.save(); ctx.font = `400 100px ${ANTON}`; const capR = ctx.measureText("H").actualBoundingBoxAscent / 100; ctx.restore(); let yy = 290;
    [["YOUR HEAD IS", TXT, 840, 150], ["OLDER", HOT, 780, 340], ["THAN YOUR FEET", TXT, 880, 150]].forEach(([s, c, w, mx]) => { const size = fitSize(s, w, mx), base = yy + capR * size; yy = base + 32; txt(s, 505, base, { size, color: c, glow: c === HOT ? 46 : 0, gcol: HOT, ls: 2 }); });
    ctx.save(); rrect(90, 178, 360, 62, 31); ctx.fillStyle = col(ABY, .85); ctx.fill(); ctx.strokeStyle = HOT; ctx.lineWidth = 3; ctx.stroke(); ctx.restore();
    txt("UNREAL, ACTUALLY", 282, 222, { f: BARL, w: 800, size: 30, ls: 5 }); ctx.fillStyle = HOT; ctx.beginPath(); ctx.arc(116, 209, 6, 0, 6.3); ctx.fill();
    if (A && A.head) { tag("HEAD", A.head.x - A.head.r - 20, A.head.y + 14, { color: HOT, align: "right", size: 34 }); tag("FEET", A.feet.x - A.feet.r - 20, A.feet.y + 14, { color: UV, align: "right", size: 30 }); }
  }

  // ---------- captions (DOM) ----------
  const CP = TH.caption, capEl = document.getElementById("cap"), allCaps = [];
  T.beats_ = null; 
  function initCaps(tl) { tl.beats.forEach(b => b.captions.forEach(c => allCaps.push(Object.assign({ beat: b.id }, c)))); }
  const capHidden = c => c.beat === "b13" && (/^True/.test(c.text) || /^The higher/.test(c.text));
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
  function captions(t) {
    let c = null; for (const k of allCaps) if (t >= k.start && t < k.end + .12) c = k;
    if (!c || capHidden(c) || t >= T.tSign - .15) { capEl.style.opacity = 0; capCache = null; return; }
    if (capCache !== c) { build(c); capCache = c; } capEl.style.opacity = clamp((t - c.start) / .09);
  }
  return { draw, drawCover, captions, initCaps };
}
