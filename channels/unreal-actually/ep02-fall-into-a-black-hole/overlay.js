// ep02 type overlay: hook headline, per-beat labels, countdown, case-file verdict + end card. Generic helpers live in engine/film/type.js.
import { clamp, smooth, eio, eo3, lerp, hash } from "./timing.js";
import { createType } from "../../../engine/film/type.js";

export function createOverlay(T, TH, cv) {
  const C = TH.colors, { S, E, END, W } = T;
  const HOT = C.horizon, UV = C.ultraviolet, TXT = C.static, HAZE = C.haze, ABY = C.abyss;
  const Ty = createType(cv, TH), { ctx, col, ANTON, BARL, txt, fitSize, tabText, slam, ring, rrect, line, tag } = Ty;
  const captions = t => Ty.captions(t, T.tSign - .15, c => false), initCaps = Ty.initCaps;
  const capR = (() => { ctx.save(); ctx.font = `400 100px ${ANTON}`; const r = ctx.measureText("H").actualBoundingBoxAscent / 100; ctx.restore(); return r || .73; })();
  const mw = (s, size, ls = 0) => { ctx.save(); ctx.font = `400 ${size}px ${ANTON}`; ctx.letterSpacing = ls + "px"; const w = ctx.measureText(s).width; ctx.restore(); return w; };

  // mixed-colour Anton line, slammed as a unit: parts = [[text, color, glow]]
  function mixLine(parts, cx, base, size, ls, sl, ex) {
    const ws = parts.map(p => mw(p[0], size, ls)), tot = ws.reduce((a, b) => a + b, 0); let x = cx - tot / 2;
    ctx.save(); ctx.translate(0, ex || 0); ctx.translate(cx, base); ctx.scale(sl.sc, sl.sc); ctx.translate(-cx, -base);
    parts.forEach((p, i) => { txt(p[0], x, base, { size, color: p[1], align: "left", ls, a: sl.a, glow: p[2] ? 34 : 0, gcol: HOT }); x += ws[i]; }); ctx.restore();
  }
  function hook(t) {
    if (t > T.hookEnd + .5) return;
    const exit = smooth((t - T.hookEnd) / .35), ex = -exit * 170; ctx.save(); ctx.globalAlpha = 1 - exit;
    let y = 178;
    const k = slam(t, .02, .13); let base = y + capR * 58;
    if (k) { ctx.save(); ctx.translate(0, ex); txt("TO EVERYONE WATCHING,", 505, base, { size: 58, color: TXT, ls: 7, sc: k.sc, a: k.a }); ctx.restore(); }
    y = base + 34;
    const s2 = fitSize("YOU'D FREEZE", 900, 250); base = y + capR * s2; const l2 = slam(t, .08, .13);
    if (l2) mixLine([["YOU'D ", TXT, 0], ["FREEZE", HOT, 1]], 505, base, s2, 2, l2, ex);
    y = base + 34; const s3 = fitSize("AT THE EDGE", 640, 124); base = y + capR * s3; const l3 = slam(t, .16, .13);
    if (l3) { ctx.save(); ctx.translate(0, ex); txt("AT THE EDGE", 505, base, { size: s3, color: TXT, ls: 10, sc: l3.sc, a: l3.a }); ctx.restore(); }
    ctx.restore();
  }
  const coverLines = () => {
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, 1080, 1920);
    let y = 270; const one = s => { const sz = fitSize(s, 860, 150); const b = y + capR * sz; y = b + 30; return [sz, b]; };
    let [sz, b] = one("FALL INTO"); txt("FALL INTO", 505, b, { size: sz, color: TXT, ls: 4 });
    [sz, b] = one("A BLACK HOLE"); txt("A BLACK HOLE", 505, b, { size: sz, color: TXT, ls: 4 });
    const s2 = fitSize("AND FREEZE", 880, 190); b = y + capR * s2; mixLine([["AND ", TXT, 0], ["FREEZE", HOT, 1]], 505, b, s2, 3, { sc: 1, a: 1 }, 0);
    ctx.save(); rrect(90, 170, 420, 62, 31); ctx.fillStyle = col(ABY, .85); ctx.fill(); ctx.strokeStyle = HOT; ctx.lineWidth = 3; ctx.stroke(); ctx.restore();
    txt("UNREAL, ACTUALLY", 305, 214, { f: BARL, w: 800, size: 30, ls: 5 }); ctx.fillStyle = HOT; ctx.beginPath(); ctx.arc(120, 201, 6, 0, 6.3); ctx.fill();
  };

  const lab = (s, x, y, a, o) => tag(s, x, y, Object.assign({ a, size: 34, ls: 4 }, o || {}));
  function gauge(x, y, r, tau, a, frozen) { // analogue ring clock; hand angle follows tau
    ctx.save(); ctx.globalAlpha = a; ctx.translate(x, y); ctx.fillStyle = col(ABY, .72); ctx.beginPath(); ctx.arc(0, 0, r + 14, 0, 6.3); ctx.fill();
    ctx.strokeStyle = col(frozen ? HAZE : HOT, .9); ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(0, 0, r, 0, 6.3); ctx.stroke();
    for (let i = 0; i < 12; i++) { const an = i / 12 * 6.2832; ctx.strokeStyle = col(TXT, .7); ctx.lineWidth = i % 3 ? 2 : 4; ctx.beginPath(); ctx.moveTo(Math.sin(an) * (r - 6), -Math.cos(an) * (r - 6)); ctx.lineTo(Math.sin(an) * (r - (i % 3 ? 14 : 22)), -Math.cos(an) * (r - (i % 3 ? 14 : 22))); ctx.stroke(); }
    const an = tau * 6.2832; ctx.strokeStyle = frozen ? HAZE : HOT; ctx.lineWidth = 5; ctx.lineCap = "round"; ctx.shadowColor = HOT; ctx.shadowBlur = frozen ? 0 : 12; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.sin(an) * (r - 14), -Math.cos(an) * (r - 14)); ctx.stroke(); ctx.restore();
  }

  // case-file card. o: { t0, tStamp, lines (u), sign (time|null), ghost (0..1 stamp alpha), scale, cy }
  function card(t, o) {
    const lt = t - o.t0, A0 = o.alpha == null ? 1 : o.alpha;
    ctx.save(); ctx.globalAlpha = A0;
    if (o.frame !== false) { ctx.save(); ctx.globalAlpha = A0 * smooth(lt / .3); ctx.strokeStyle = col(TXT, .5); ctx.lineWidth = 3;
      [[90, 250, 1, 1], [990, 250, -1, 1], [90, 1330, 1, -1], [990, 1330, -1, -1]].forEach(([x, y, sx, sy]) => { ctx.beginPath(); ctx.moveTo(x, y + sy * 60); ctx.lineTo(x, y); ctx.lineTo(x + sx * 60, y); ctx.stroke(); }); ctx.restore(); }
    ctx.save(); const sc = o.scale || 1, ccx = 505, ccy = o.cy == null ? 800 : o.cy; ctx.translate(ccx, ccy); ctx.scale(sc, sc); ctx.translate(-ccx, -ccy - (o.dy || 0));
    txt("CASE FILE 002", 505, 392, { f: BARL, w: 800, size: 46, ls: 14, color: HAZE, a: smooth(lt / .25), glow: 6 });
    line([[170, 430], [840, 430]], col(HAZE, .6), 2, 0, smooth(lt / .4));
    const sl = slam(t, o.tStamp, .16), cy = 740, sz = fitSize("UNPROVEN", 830, 290);
    if (!sl) { ctx.save(); ctx.globalAlpha = .5 + .3 * Math.sin(t * 20); ctx.setLineDash([16, 14]); ctx.strokeStyle = UV; ctx.lineWidth = 5; ctx.shadowColor = UV; ctx.shadowBlur = 16; rrect(150, cy - 200, 710, 310, 14); ctx.stroke(); ctx.restore();
      txt("VERDICT", 505, cy + 4, { size: 110, color: col(HAZE, .9), ls: 14 }); }
    else { const age = t - o.tStamp;
      if (age < .8) { ring(505, cy - 30, 150, 700, age / .7, UV, 10); ring(505, cy - 30, 100, 520, (age - .08) / .6, TXT, 4);
        ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.fillStyle = col(UV, .4 * Math.max(0, 1 - age / .25)); ctx.fillRect(0, 0, 1080, 1920); ctx.restore(); }
      txt("UNPROVEN", 505, cy + sz * capR * .5, { size: sz, color: UV, sc: sl.sc, a: sl.a, rot: -.04, glow: 46, ls: 5 });
      if (sl.sc < 1.02) { ctx.save(); ctx.translate(505, cy - 30); ctx.rotate(-.04); ctx.strokeStyle = UV; ctx.lineWidth = 8; ctx.shadowColor = UV; ctx.shadowBlur = 24; rrect(-425, -190, 850, 340, 14); ctx.stroke(); ctx.lineWidth = 3; rrect(-443, -208, 886, 376, 18); ctx.stroke(); ctx.restore(); } }
    if (o.lines != null && o.lines > 0) { const u = smooth(o.lines);
      line([[170, 1000], [840, 1000]], col(HAZE, .6), 2, 0, u);
      txt("Nobody has fallen in.", 505, 1090, { f: BARL, w: 800, size: 66, a: u, glow: 6, gcol: ABY });
      ctx.save(); ctx.globalAlpha = u; ctx.font = `800 66px ${BARL}`; const a1 = "This is ", a2 = "math", a3 = ", not a memory.", w1 = ctx.measureText(a1).width, w2 = ctx.measureText(a2).width, w3 = ctx.measureText(a3).width, x0 = 505 - (w1 + w2 + w3) / 2;
      ctx.textAlign = "left"; ctx.fillStyle = TXT; ctx.fillText(a1, x0, 1182); ctx.fillStyle = UV; ctx.shadowColor = UV; ctx.shadowBlur = 16; ctx.fillText(a2, x0 + w1, 1182); ctx.shadowBlur = 0; ctx.fillStyle = TXT; ctx.fillText(a3, x0 + w1 + w2, 1182);
      ctx.fillStyle = UV; ctx.fillRect(x0 + w1, 1196, w2 * u, 6); ctx.restore(); }
    ctx.restore();
    if (o.sign != null) { const u = smooth((t - o.sign) / .4); txt("UNREAL, ACTUALLY", 505, 1350, { size: 56, color: TXT, ls: 12, a: u, glow: 12, gcol: UV }); ctx.save(); ctx.globalAlpha = u; ctx.fillStyle = HOT; ctx.beginPath(); ctx.arc(505, 1392, 5, 0, 6.3); ctx.fill(); ctx.restore(); }
    ctx.restore();
  }

  function draw(t, A, shk) {
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, 1080, 1920); ctx.translate(shk[0], shk[1]);
    hook(t);
    // b02: far observer
    if (t >= S("b02") && t < S("b03")) { const lt = t - S("b02");
      lab("WHAT THEY SEE", 505, 262, smooth(lt / .3) * (1 - smooth((t - END("b02") + .3) / .3)), { color: HAZE, size: 30, ls: 8 });
      const g = smooth((t - S("b02") - .2) / .3) * (1 - smooth((t - END("b02") + .3) / .3)); if (g > 0 && A.tau != null) { gauge(850, 400, 62, A.tau, g, t > T.tStop + .2); lab("HIS CLOCK", 850, 520, g, { color: A.rate < .08 ? HAZE : HOT, size: 26, ls: 5 }); }
      const a1 = smooth((t - T.tSlow) / .15) * (1 - smooth((t - T.tStop + .05) / .12)); if (a1 > 0) txt("SLOWS", 505, 372, { size: 130, color: HOT, glow: 28, ls: 8, a: a1, sc: 1 + .35 * (1 - eo3((t - T.tSlow) / .16)) });
      const sl = slam(t, T.tStop, .16); if (sl) txt("STOPS", 505, 372, { size: 150, color: TXT, glow: 24, gcol: HOT, ls: 8, a: sl.a * (1 - smooth((t - END("b02") + .4) / .3)), sc: sl.sc });
    }
    // b03: event horizon
    if (t >= S("b03") && t < S("b04")) { const lt = t - S("b03"), out = 1 - smooth((t - E("b03") + .35) / .3);
      const a1 = smooth((t - T.tHorizon) / .3) * out;
      if (a1 > 0) { txt("EVENT HORIZON", 505, 330, { size: 92, color: TXT, ls: 16, a: a1, glow: 14, gcol: HOT }); line([[300, 352], [710, 352]], col(HOT, .8), 2, 8, a1);
        if (A.edge) line([[A.edge.x, 366], [A.edge.x, A.edge.y - 14]], col(HOT, .7), 2, 8, a1 * .8); }
      const a2 = smooth((t - T.tNoRet) / .25) * out; if (a2 > 0) lab("point of no return", 505, 430, a2, { color: HOT, size: 36, ls: 6 });
    }
    // b04: nothing but captions (the picture does the work)
    // b05: three hours
    if (t >= S("b05") && t < S("b06")) { const a = smooth((t - T.tHours) / .25) * (1 - smooth((t - E("b05") + .3) / .3)), sl = slam(t, T.tHours + .02, .15);
      if (a > 0 && sl) { txt("≈ 3 HOURS", 505, 360, { size: 150, color: TXT, glow: 24, gcol: HOT, ls: 6, a: sl.a * a, sc: sl.sc }); lab("(NASA simulation)", 505, 428, a * smooth((t - T.tHours - .2) / .3), { color: HAZE, size: 32, ls: 4 }); } }
    // b06: giant, 4.3 million Suns, the Sun to scale
    if (t >= S("b06") && t < S("b07")) { const a = smooth((t - T.tBig) / .2) * (1 - smooth((t - E("b06") + .3) / .3)), sl = slam(t, T.tBig + .02, .15);
      if (a > 0 && sl) { txt("≈ 4.3 MILLION SUNS", 505, 336, { size: fitSize("≈ 4.3 MILLION SUNS", 880, 130), color: TXT, glow: 22, gcol: HOT, ls: 4, a: sl.a * a, sc: sl.sc }); lab("(NASA simulation)", 505, 402, a * smooth((t - T.tBig - .2) / .3), { color: HAZE, size: 30, ls: 4 }); }
      if (A.sun) { const u = smooth((t - T.tBig - .5) / .4) * (1 - smooth((t - E("b06") + .3) / .3));
        if (u > 0) { ctx.save(); ctx.globalAlpha = u; ctx.fillStyle = "#FFD23F"; ctx.shadowColor = "#FFD23F"; ctx.shadowBlur = 14; ctx.beginPath(); ctx.arc(A.sun.x, A.sun.y, A.sun.r, 0, 6.3); ctx.fill(); ctx.restore();
          lab("the Sun, to scale", A.sun.x + 22, A.sun.y + 11, u, { align: "left", size: 28, ls: 3, color: TXT }); } } }
    // b07: space flows inward
    if (t >= S("b07") && t < S("b08")) { const a = smooth((t - T.tFlow) / .3) * (1 - smooth((t - E("b07") + .3) / .3));
      if (a > 0) lab("space flows inward at light speed", 505, 330, a, { color: TXT, size: 36, ls: 3 }); }
    // b08: countdown
    if (t >= S("b08") && t < S("b09")) { const sl = slam(t, T.tSlam8, .16), out = 1 - smooth((t - E("b08") + .25) / .25);
      if (sl) { const u = clamp((t - T.tCount0) / (T.tCountEnd - T.tCount0)), val = 12.8 * (1 - eio(u)), s = t < T.tCount0 ? "12.8" : val.toFixed(1), zoom = 1 + .1 * smooth((t - T.tSlam8) / 2.2);
        ctx.save(); ctx.globalAlpha = out; const g = ctx.createRadialGradient(505, 700, 20, 505, 700, 440); g.addColorStop(0, col(ABY, .7)); g.addColorStop(1, col(ABY, 0)); ctx.fillStyle = g; ctx.fillRect(0, 300, 1080, 800);
        ctx.translate(505, 700); ctx.scale(zoom, zoom); ctx.translate(-505, -700);
        const sz = 400, wnum = (ctx.save(), ctx.font = `400 ${sz}px ${ANTON}`, ctx.letterSpacing = "4px", (() => { const w = ctx.measureText("12.8").width; ctx.restore(); return w; })());
        const pulse = t >= T.tCount0 ? 1 + .05 * Math.pow(1 - ((t - T.tCount0) * 6 / (T.tCountEnd - T.tCount0) % 1), 3) : 1;
        tabText0(s, 470, 810, sz, HOT, sl.sc * pulse, sl.a, 0);
        txt("s", 505 + wnum / 2 + 22, 810, { size: 150, color: HAZE, align: "left", a: sl.a, ls: 2 });
        lab("(NASA simulation)", 505, 880, smooth((t - T.tSlam8 - .3) / .3), { color: HAZE, size: 32, ls: 4 });
        ctx.restore(); } }
    // b10: SPAGHETTIFICATION
    if (t >= S("b10") && t < S("b11")) { const sl = slam(t, T.tSpag, .16), out = 1 - smooth((t - E("b10") + .15) / .25);
      if (sl) { const age = t - T.tSpag, st = 1 + 1.0 * smooth(age / 1.5), sz = fitSize("SPAGHETTIFICATION", 920, 150);
        ctx.save(); ctx.globalAlpha = out; ctx.translate(505, 640); ctx.scale(sl.sc * (1 - .06 * smooth(age / 1.5)), sl.sc * st); ctx.translate(-505, -640);
        txt("SPAGHETTIFICATION", 505, 640, { size: sz, color: TXT, ls: 2, a: sl.a, glow: 30, gcol: HOT });
        ctx.restore(); } }
    // b11: split
    if (t >= S("b11") && t < S("b12")) { const out = 1 - smooth((t - E("b11") + .3) / .3), lt = t - S("b11");
      split(A.sx, smooth(lt / .3) * out);
      lab("giant black hole", 295, 400, smooth((t - S("b11") - .3) / .3) * out, { size: 28, ls: 3, color: TXT }); lab("small black hole", 770, 400, smooth((t - T.tSmall) / .25) * out, { size: 28, ls: 3, color: HOT });
      const a = smooth((t - T.tTear + .1) / .2) * out; if (a > 0) lab("tears you apart early", 760, 1080, a, { size: 32, ls: 3, color: HOT }); }
    // b12: the question mark whose dot is the singularity
    if (t >= S("b12") && t < S("b13") && A.pin) { const u = clamp((t - T.tQ + .3) / 1.1), out = 1 - smooth((t - E("b12") + .3) / .3);
      if (u > 0) { ctx.save(); ctx.globalAlpha = smooth(u * 1.6) * out; const bl = (1 - eo3(u)) * 26; ctx.filter = `blur(${bl.toFixed(1)}px)`;
        ctx.font = `400 520px ${ANTON}`; ctx.textAlign = "center"; ctx.fillStyle = UV; ctx.shadowColor = UV; ctx.shadowBlur = 30;
        ctx.beginPath(); ctx.rect(0, 0, 1080, A.pin.y - 34); ctx.clip(); ctx.fillText("?", A.pin.x, A.pin.y + 8); ctx.restore(); }
      lab("singularity = ?", 505, 1120, smooth((t - T.tPin) / .3) * out, { size: 38, ls: 4, color: TXT }); }
    // b13 verdict, b14 pull-back, end card
    if (t >= S("b13") && t < S("b15")) { const fade = t < S("b14") ? 1 : 1 - smooth((t - S("b14")) / 1.8), sc = t < S("b14") ? 1 : lerp(1, .5, eio((t - S("b14")) / 2.2));
      if (fade > 0) { ctx.save(); if (t >= S("b14")) { ctx.fillStyle = col(ABY, 0); } card(t, { t0: S("b13"), tStamp: T.tStamp, alpha: fade, scale: sc, cy: 740, dy: 0, frame: t < S("b14") }); ctx.restore(); }
      if (t >= T.tMath && t < S("b15")) lab("math, not a memory", 505, 1090, smooth((t - T.tMath) / .3) * (1 - smooth((t - E("b14") + .3) / .3)), { size: 38, ls: 4, color: UV }); }
    if (t >= S("b15") && t < T.tSign - .35) { const lt = t - S("b15"); split(A.sx, smooth(lt / .3));
      lab("TO THE WORLD", 295, 330, smooth(lt / .3), { size: 30, ls: 5, color: HAZE }); lab("TO YOU", 770, 330, smooth((t - T.tYou + .1) / .3), { size: 30, ls: 5, color: HOT });
      lab("frozen at the edge", 295, 1100, smooth((t - S("b15") - 1.1) / .4), { size: 28, ls: 3, color: TXT }); lab("falls right through", 770, 1100, smooth((t - T.tYou - .3) / .4), { size: 28, ls: 3, color: HOT }); }
    if (t >= T.tSign - .35) { const u = smooth((t - (T.tSign - .35)) / .3); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.save(); ctx.globalAlpha = u * .94; ctx.fillStyle = ABY; ctx.fillRect(0, 0, 1080, 1920); ctx.restore(); ctx.translate(shk[0], shk[1]);
      ctx.save(); ctx.globalAlpha = u; card(t, { t0: T.tSign - .35, tStamp: -1e9, lines: smooth((t - (T.tSign - .15)) / .5), sign: T.tSign, cy: 740 }); ctx.restore(); }
  }
  function split(x, a) { if (a <= 0) return; x = x || 530; ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = col(TXT, .85); ctx.lineWidth = 3; ctx.shadowColor = HOT; ctx.shadowBlur = 14; ctx.beginPath(); ctx.moveTo(x, 190); ctx.lineTo(x, 1400); ctx.stroke(); ctx.restore(); }
  function tabText0(s, cx, y, size, color, sc, a, glowK) { // big tabular Anton numerals (fixed pitch) with a hot glow
    ctx.save(); ctx.globalAlpha = a; ctx.font = `400 ${size}px ${ANTON}`; ctx.textAlign = "left"; ctx.letterSpacing = "4px";
    const pitch = ctx.measureText("0").width, adv = [...s].map(ch => /[0-9]/.test(ch) ? pitch : ctx.measureText(ch).width), w = adv.reduce((p, q) => p + q, 0);
    ctx.translate(505, y - size * .33); ctx.scale(sc, sc); ctx.translate(-505, -(y - size * .33)); let x = 505 - w / 2 - 38;
    ctx.fillStyle = color; ctx.shadowColor = color; ctx.shadowBlur = 40; [...s].forEach((ch, i) => { ctx.fillText(ch, x, y); x += adv[i]; }); ctx.shadowBlur = 20; x = 505 - w / 2 - 38; [...s].forEach((ch, i) => { ctx.fillText(ch, x, y); x += adv[i]; }); ctx.restore(); }

  return { draw, drawCover: coverLines, captions, initCaps };
}
