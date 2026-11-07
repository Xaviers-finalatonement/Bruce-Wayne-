// ep01 type overlay: per-beat labels anchored to the 3D camera; generic type/captions live in engine/film/type.js.
import { clamp, smooth, eio, eo3, lerp, hash } from "./timing.js";
import { createType } from "../../../engine/film/type.js";

export function createOverlay(T, TH, cv) {
  const C = TH.colors, { S, E, END, W } = T;
  const HOT = C.horizon, UV = C.ultraviolet, TXT = C.static, HAZE = C.haze, ABY = C.abyss;
  const Ty = createType(cv, TH), { ctx, col, ANTON, BARL, txt, fitSize, tabText, slam, ring, rrect, line, tag, stampCard } = Ty;
  const HOOK = [["YOUR HEAD IS", TXT, 0, 760, 130], ["OLDER", HOT, .1, 620, 250], ["THAN YOUR FEET", TXT, .2, 800, 130]];
  const hook = t => Ty.hookHeadline(t, T.hookEnd, HOOK, 178);
  const capHidden = c => c.beat === "b13" && (/^True/.test(c.text) || /^The higher/.test(c.text));
  const captions = t => Ty.captions(t, T.tSign - .15, capHidden), initCaps = Ty.initCaps;
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
        if (a1 > 0) { txt("≈ 0.000 000 09 s", A.gap.x, A.gap.y - 270 * k, { size: 72, color: HOT, glow: 20, a: a1 }); }
        const a2 = smooth((t - W("b09", "ninety")) / .3) * (1 - smooth((t - sh0) / .3));
        if (a2 > 0) txt("90 billionths of a second", A.gap.x, A.gap.y + 300 * k, { f: BARL, w: 800, size: 40, color: TXT, ls: 1, a: a2, glow: 8, gcol: ABY }); }
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
    ctx.save(); ctx.font = `400 100px ${ANTON}`; const capR = ctx.measureText("H").actualBoundingBoxAscent / 100; ctx.restore(); let yy = 262;
    [["YOUR HEAD IS", TXT, 780, 125], ["OLDER", HOT, 700, 280], ["THAN YOUR FEET", TXT, 840, 125]].forEach(([s, c, w, mx]) => { const size = fitSize(s, w, mx), base = yy + capR * size; yy = base + 32; txt(s, 505, base, { size, color: c, glow: c === HOT ? 46 : 0, gcol: HOT, ls: 2 }); });
    ctx.save(); rrect(90, 170, 420, 62, 31); ctx.fillStyle = col(ABY, .85); ctx.fill(); ctx.strokeStyle = HOT; ctx.lineWidth = 3; ctx.stroke(); ctx.restore();
    txt("UNREAL, ACTUALLY", 305, 214, { f: BARL, w: 800, size: 30, ls: 5 }); ctx.fillStyle = HOT; ctx.beginPath(); ctx.arc(120, 201, 6, 0, 6.3); ctx.fill();
    if (A && A.head) { tag("HEAD", A.head.x - A.head.r - 20, A.head.y + 14, { color: HOT, align: "right", size: 34 }); tag("FEET", A.feet.x - A.feet.r - 20, A.feet.y + 14, { color: UV, align: "right", size: 30 }); }
  }

  return { draw, drawCover, captions, initCaps };
}
