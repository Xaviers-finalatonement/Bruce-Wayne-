// ep02 type overlay: hook headline, per-beat labels, 12.8 s + real-time timer, case-file claim/verdict + end card. Generic helpers live in engine/film/type.js.
import { clamp, smooth, eio, eo3, lerp, hash } from "./timing.js";
import { createType } from "../../../engine/film/type.js";

export function createOverlay(T, TH, cv) {
  const C = TH.colors, { S, E, END, W } = T;
  const HOT = C.horizon, UV = C.ultraviolet, TXT = C.static, HAZE = C.haze, ABY = C.abyss;
  const Ty = createType(cv, TH), { ctx, col, ANTON, BARL, txt, fitSize, slam, ring, rrect, line, tag } = Ty;
  const captions = t => Ty.captions(t, T.tCard - .1, (c, tt) => c.beat === "b01" || (c.text === "Unproven." && tt >= T.tStamp)), initCaps = Ty.initCaps;
  const capR = (() => { ctx.save(); ctx.font = `400 100px ${ANTON}`; const r = ctx.measureText("H").actualBoundingBoxAscent / 100; ctx.restore(); return r || .73; })();
  const mw = (s, size, ls = 0) => { ctx.save(); ctx.font = `400 ${size}px ${ANTON}`; ctx.letterSpacing = ls + "px"; const w = ctx.measureText(s).width; ctx.restore(); return w; };
  const SX = 505; // text centre (safe area 70..940)

  function mixLine(parts, cx, base, size, ls, sl, ex) {
    const ws = parts.map(p => mw(p[0], size, ls)), tot = ws.reduce((a, b) => a + b, 0); let x = cx - tot / 2;
    ctx.save(); ctx.translate(0, ex || 0); ctx.translate(cx, base); ctx.scale(sl.sc, sl.sc); ctx.translate(-cx, -base);
    parts.forEach((p, i) => { txt(p[0], x, base, { size, color: p[1], align: "left", ls, a: sl.a, glow: p[2] ? 34 : 0, gcol: HOT }); x += ws[i]; }); ctx.restore();
  }
  function hook(t) { // fades out in place (never slides into the top 8 %)
    if (t > T.hookEnd + .4) return;
    const fade = 1 - smooth((t - T.hookEnd) / .3); ctx.save(); ctx.globalAlpha = fade;
    let y = 190, s1 = fitSize("TO ANYONE FAR AWAY,", 840, 62), base = y + capR * s1; const k = slam(t, .02, .13);
    if (k) txt("TO ANYONE FAR AWAY,", SX, base, { size: s1, color: TXT, ls: 6, sc: k.sc, a: k.a });
    y = base + 34; const s2 = fitSize("YOU'D FREEZE", 850, 250); base = y + capR * s2; const l2 = slam(t, .08, .13);
    if (l2) mixLine([["YOU'D ", TXT, 0], ["FREEZE", HOT, 1]], SX, base, s2, 2, l2, 0);
    y = base + 34; const s3 = fitSize("AT THE EDGE", 640, 124); base = y + capR * s3; const l3 = slam(t, .16, .13);
    if (l3) txt("AT THE EDGE", SX, base, { size: s3, color: TXT, ls: 10, sc: l3.sc, a: l3.a });
    ctx.restore();
  }
  const coverLines = () => {
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, 1080, 1920);
    ctx.save(); rrect(90, 250, 420, 62, 31); ctx.fillStyle = col(ABY, .85); ctx.fill(); ctx.strokeStyle = HOT; ctx.lineWidth = 3; ctx.stroke(); ctx.restore();
    txt("UNREAL, ACTUALLY", 305, 294, { f: BARL, w: 800, size: 30, ls: 5 }); ctx.fillStyle = HOT; ctx.beginPath(); ctx.arc(120, 281, 6, 0, 6.3); ctx.fill();
    let y = 350; const s1 = fitSize("TO ANYONE FAR AWAY,", 860, 96); let b = y + capR * s1; txt("TO ANYONE FAR AWAY,", SX, b, { size: s1, color: TXT, ls: 4 });
    y = b + 30; const s2 = fitSize("YOU'D FREEZE", 860, 220); b = y + capR * s2; mixLine([["YOU'D ", TXT, 0], ["FREEZE", HOT, 1]], SX, b, s2, 3, { sc: 1, a: 1 }, 0);
    y = b + 30; const s3 = fitSize("AT THE EDGE", 700, 120); b = y + capR * s3; txt("AT THE EDGE", SX, b, { size: s3, color: TXT, ls: 8 });
    y = b + 26; const s4 = fitSize("OF A BLACK HOLE", 640, 70); b = y + capR * s4; txt("OF A BLACK HOLE", SX, b, { size: s4, color: HAZE, ls: 8 });
  };

  const lab = (s, x, y, a, o) => tag(s, x, y, Object.assign({ a, size: 40, ls: 3 }, o || {}));
  function gauge(x, y, r, tau, a, frozen) { // analogue ring clock; hand angle follows tau
    ctx.save(); ctx.globalAlpha = a; ctx.translate(x, y); ctx.fillStyle = col(ABY, .72); ctx.beginPath(); ctx.arc(0, 0, r + 14, 0, 6.3); ctx.fill();
    ctx.strokeStyle = col(frozen ? HAZE : HOT, .9); ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(0, 0, r, 0, 6.3); ctx.stroke();
    for (let i = 0; i < 12; i++) { const an = i / 12 * 6.2832, l = i % 3 ? 14 : 22; ctx.strokeStyle = col(TXT, .7); ctx.lineWidth = i % 3 ? 2 : 4; ctx.beginPath(); ctx.moveTo(Math.sin(an) * (r - 6), -Math.cos(an) * (r - 6)); ctx.lineTo(Math.sin(an) * (r - l), -Math.cos(an) * (r - l)); ctx.stroke(); }
    const an = tau * 6.2832; ctx.strokeStyle = frozen ? HAZE : HOT; ctx.lineWidth = 5; ctx.lineCap = "round"; ctx.shadowColor = HOT; ctx.shadowBlur = frozen ? 0 : 12; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.sin(an) * (r - 14), -Math.cos(an) * (r - 14)); ctx.stroke(); ctx.restore();
  }
  const corners = () => [[90, 250, 1, 1], [930, 250, -1, 1], [90, 1330, 1, -1], [930, 1330, -1, -1]].forEach(([x, y, sx, sy]) => { ctx.beginPath(); ctx.moveTo(x, y + sy * 60); ctx.lineTo(x, y); ctx.lineTo(x + sx * 60, y); ctx.stroke(); });

  // b13: the claim on trial, then the single UNPROVEN stamp
  function verdict(t) {
    const lt = t - S("b13"), tS = T.tStamp, cy = 800;
    ctx.save(); ctx.globalAlpha = smooth(lt / .3); ctx.strokeStyle = col(TXT, .5); ctx.lineWidth = 3; corners(); ctx.restore();
    txt("CASE FILE 002", SX, 340, { f: BARL, w: 800, size: 46, ls: 14, color: HAZE, a: smooth(lt / .25), glow: 6 }); line([[170, 378], [840, 378]], col(HAZE, .6), 2, 0, smooth(lt / .4));
    const ca = smooth((lt - .15) / .3); const CL = "CLAIM: far away, you'd seem to freeze"; ctx.save(); ctx.font = `800 50px ${BARL}`; const clw = ctx.measureText(CL).width; ctx.restore();
    txt(CL, SX, 470, { f: BARL, w: 800, size: Math.min(50, Math.floor(50 * 840 / clw)), color: TXT, ls: 0, a: ca, glow: 8, gcol: ABY });
    const sl = slam(t, tS, .16), sz = fitSize("UNPROVEN", 760, 280);
    if (!sl) { ctx.save(); ctx.globalAlpha = .5 + .3 * Math.sin(t * 20); ctx.setLineDash([16, 14]); ctx.strokeStyle = UV; ctx.lineWidth = 5; ctx.shadowColor = UV; ctx.shadowBlur = 16; rrect(150, cy - 175, 710, 330, 14); ctx.stroke(); ctx.restore(); txt("VERDICT", SX, cy + 30, { size: 110, color: col(HAZE, .9), ls: 14 }); return; }
    const age = t - tS;
    if (age < .8) { ring(SX, cy - 10, 150, 700, age / .7, UV, 10); ring(SX, cy - 10, 100, 520, (age - .08) / .6, TXT, 4); ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.fillStyle = col(UV, .4 * Math.max(0, 1 - age / .25)); ctx.fillRect(0, 0, 1080, 1920); ctx.restore(); }
    txt("UNPROVEN", SX, cy - 10 + sz * capR * .5, { size: sz, color: UV, sc: sl.sc, a: sl.a, rot: -.04, glow: 26, ls: 5 });
    if (sl.sc < 1.02) { ctx.save(); ctx.translate(SX, cy - 10); ctx.rotate(-.04); ctx.strokeStyle = UV; ctx.lineWidth = 8; ctx.shadowColor = UV; ctx.shadowBlur = 20; rrect(-415, -160, 830, 320, 14); ctx.stroke(); ctx.lineWidth = 3; rrect(-430, -176, 860, 352, 18); ctx.stroke(); ctx.restore(); }
  }
  function endCard(t) { // end card: status line, the reason nobody can check, sign-off (the stamp is not repeated)
    const t0 = T.tCard, lt = t - t0;
    ctx.save(); ctx.globalAlpha = smooth(lt / .3); ctx.strokeStyle = col(TXT, .5); ctx.lineWidth = 3; corners(); ctx.restore();
    txt("CASE FILE 002", SX, 420, { f: BARL, w: 800, size: 46, ls: 14, color: HAZE, a: smooth(lt / .25), glow: 6 }); line([[170, 458], [840, 458]], col(HAZE, .6), 2, 0, smooth(lt / .4));
    txt("UNPROVEN", SX, 640, { size: fitSize("UNPROVEN", 600, 190), color: UV, ls: 6, a: smooth((lt - .1) / .3), glow: 14 });
    const u = smooth((lt - .3) / .4); line([[170, 720], [840, 720]], col(HAZE, .6), 2, 0, u);
    txt("Nothing from inside", SX, 830, { f: BARL, w: 800, size: 64, a: u, glow: 6, gcol: ABY }); txt("can reach us.", SX, 908, { f: BARL, w: 800, size: 64, a: u, glow: 6, gcol: ABY });
    const u2 = smooth((lt - .55) / .4); ctx.save(); ctx.globalAlpha = u2; ctx.font = `800 64px ${BARL}`; const a1 = "This is ", a2 = "math", a3 = ", not a memory.", w1 = ctx.measureText(a1).width, w2 = ctx.measureText(a2).width, w3 = ctx.measureText(a3).width, x0 = SX - (w1 + w2 + w3) / 2;
    ctx.textAlign = "left"; ctx.fillStyle = TXT; ctx.fillText(a1, x0, 1030); ctx.fillStyle = UV; ctx.shadowColor = UV; ctx.shadowBlur = 16; ctx.fillText(a2, x0 + w1, 1030); ctx.shadowBlur = 0; ctx.fillStyle = TXT; ctx.fillText(a3, x0 + w1 + w2, 1030); ctx.fillStyle = UV; ctx.fillRect(x0 + w1, 1044, w2 * u2, 6); ctx.restore();
    const us = smooth((t - T.tSign) / .4); txt("UNREAL, ACTUALLY", SX, 1230, { size: 58, color: TXT, ls: 12, a: us, glow: 12, gcol: UV }); ctx.save(); ctx.globalAlpha = us; ctx.fillStyle = HOT; ctx.beginPath(); ctx.arc(SX, 1272, 5, 0, 6.3); ctx.fill(); ctx.restore();
  }

  function draw(t, A, shk) {
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, 1080, 1920); ctx.translate(shk[0], shk[1]);
    hook(t);
    if (t >= S("b02") && t < S("b03")) { const lt = t - S("b02"), out = 1 - smooth((t - END("b02") + .3) / .3);
      if (A.win) { const w = A.win, hx = -40, hy = 962, hw = 470, hh = 480, hole = () => { ctx.moveTo(w.x + 44, w.y); ctx.arcTo(w.x + w.w, w.y, w.x + w.w, w.y + w.h, 44); ctx.arcTo(w.x + w.w, w.y + w.h, w.x, w.y + w.h, 44); ctx.arcTo(w.x, w.y + w.h, w.x, w.y, 44); ctx.arcTo(w.x, w.y, w.x + w.w, w.y, 44); ctx.closePath(); };
        ctx.save(); ctx.globalAlpha = out; const g = ctx.createLinearGradient(hx, hy, hx + hw, hy + hh); g.addColorStop(0, col(C.panel2, 1)); g.addColorStop(1, col(ABY, 1)); ctx.fillStyle = g;
        ctx.beginPath(); ctx.moveTo(hx, hy + 30); ctx.arcTo(hx, hy, hx + 30, hy, 30); ctx.arcTo(hx + hw, hy, hx + hw, hy + 30, 30); ctx.arcTo(hx + hw, hy + hh, hx + hw - 30, hy + hh, 30); ctx.lineTo(hx, hy + hh); ctx.closePath(); hole(); ctx.fill("evenodd");
        ctx.strokeStyle = col(HOT, .7); ctx.lineWidth = 3; ctx.shadowColor = HOT; ctx.shadowBlur = 12; ctx.beginPath(); ctx.moveTo(hx, hy + 30); ctx.arcTo(hx, hy, hx + 30, hy, 30); ctx.arcTo(hx + hw, hy, hx + hw, hy + 30, 30); ctx.lineTo(hx + hw, hy + 200); ctx.stroke(); ctx.shadowBlur = 0;
        ctx.strokeStyle = col(HAZE, .28); ctx.lineWidth = 2; [[hx, 1015, hx + hw, 1015], [hx, 1390, hx + hw, 1390], [400, 1015, 400, 1390]].forEach(l => { ctx.beginPath(); ctx.moveTo(l[0], l[1]); ctx.lineTo(l[2], l[3]); ctx.stroke(); });
        ctx.fillStyle = col(HAZE, .4); for (let i = 0; i < 9; i++) { ctx.beginPath(); ctx.arc(20 + i * 48, 990, 4, 0, 6.3); ctx.fill(); ctx.beginPath(); ctx.arc(20 + i * 48, 1415, 4, 0, 6.3); ctx.fill(); }
        ctx.strokeStyle = col(C.panel2, 1); ctx.lineWidth = 16; ctx.beginPath(); hole(); ctx.stroke(); ctx.strokeStyle = col(HAZE, .75); ctx.lineWidth = 3; ctx.beginPath(); hole(); ctx.stroke();
        ctx.save(); ctx.beginPath(); hole(); ctx.clip(); const gl = ctx.createLinearGradient(w.x, w.y, w.x + w.w * .6, w.y + w.h); gl.addColorStop(0, "rgba(255,255,255,.0)"); gl.addColorStop(.35, "rgba(255,255,255,.10)"); gl.addColorStop(.5, "rgba(255,255,255,0)"); gl.addColorStop(.7, "rgba(255,200,140,.12)"); gl.addColorStop(1, "rgba(255,255,255,0)"); ctx.fillStyle = gl; ctx.fillRect(w.x, w.y, w.w, w.h); ctx.restore(); ctx.restore(); }
      lab("WHAT THEY SEE", SX, 262, smooth(lt / .3) * out * (1 - smooth((t - T.tSlow + .3) / .2)), { color: TXT, ls: 8 });
      const g = smooth((t - S("b02") - .2) / .3) * out; if (g > 0 && A.tau != null) { gauge(800, 430, 66, A.tau, g, t > T.tStop + .2); lab("YOUR CLOCK", 800, 560, g, { color: A.rate < .08 ? HAZE : HOT, ls: 4 }); }
      const a1 = smooth((t - T.tSlow) / .15) * (1 - smooth((t - T.tStop + .05) / .12)); if (a1 > 0) txt("SLOWS", SX, 372, { size: 130, color: HOT, glow: 28, ls: 8, a: a1, sc: 1 + .35 * (1 - eo3((t - T.tSlow) / .16)) });
      const sl = slam(t, T.tStop, .16); if (sl) txt("STOPS", SX, 392, { size: 150, color: TXT, glow: 24, gcol: HOT, ls: 8, a: sl.a * out, sc: sl.sc });
    }
    if (t >= S("b03") && t < S("b04")) { const out = 1 - smooth((t - E("b03") + .35) / .3), a1 = smooth((t - T.tHorizon) / .3) * out;
      if (a1 > 0) { txt("EVENT HORIZON", SX, 330, { size: 92, color: TXT, ls: 16, a: a1, glow: 14, gcol: HOT }); line([[300, 352], [710, 352]], col(HOT, .8), 2, 8, a1); if (A.edge) line([[A.edge.x, 366], [A.edge.x, A.edge.y - 14]], col(HOT, .7), 2, 8, a1 * .8); } }
    if (t >= S("b05") && t < S("b06")) { const a = smooth((t - T.tHours) / .25) * (1 - smooth((t - E("b05") + .3) / .3)), sl = slam(t, T.tHours + .02, .15);
      if (a > 0 && sl) { txt("≈ 3 HOURS", SX, 360, { size: 150, color: TXT, glow: 24, gcol: HOT, ls: 6, a: sl.a * a, sc: sl.sc }); lab("(NASA simulation)", SX, 430, a * smooth((t - T.tHours - .2) / .3), { color: TXT, ls: 3 }); } }
    if (t >= S("b06") && t < S("b07")) { const a = smooth((t - T.tBig) / .2) * (1 - smooth((t - E("b06") + .3) / .3)), sl = slam(t, T.tBig + .02, .15);
      if (a > 0 && sl) { txt("≈ 4.3 MILLION SUNS", SX, 336, { size: fitSize("≈ 4.3 MILLION SUNS", 800, 130), color: TXT, glow: 22, gcol: HOT, ls: 4, a: sl.a * a, sc: sl.sc }); lab("(NASA simulation)", SX, 404, a * smooth((t - T.tBig - .2) / .3), { color: TXT, ls: 3 }); }
      if (A.sun) { const u = smooth((t - T.tBig - .5) / .4) * (1 - smooth((t - E("b06") + .3) / .3));
        if (u > 0) { ctx.save(); ctx.globalAlpha = u; ctx.fillStyle = "#FFD23F"; ctx.shadowColor = "#FFD23F"; ctx.shadowBlur = 14; ctx.beginPath(); ctx.arc(A.sun.x, A.sun.y, A.sun.r, 0, 6.3); ctx.fill(); ctx.restore(); ctx.save(); ctx.globalAlpha = u * .9; ctx.strokeStyle = col(TXT, .9); ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(A.sun.x, A.sun.y, 24, 0, 6.3); ctx.stroke(); ctx.beginPath(); ctx.moveTo(A.sun.x + 17, A.sun.y + 17); ctx.lineTo(A.sun.x + 62, A.sun.y + 46); ctx.stroke(); ctx.restore();
          lab("the Sun", A.sun.x + 70, A.sun.y + 60, u, { align: "left", ls: 3, color: TXT }); } } }
    if (t >= S("b07") && t < S("b08")) { const a = smooth((t - T.tFlow) / .3) * (1 - smooth((t - E("b07") + .3) / .3)); if (a > 0) lab("space flows inward at light speed", SX, 300, a, { color: TXT, ls: 1, size: 40 }); }
    if (A.flash > 0) { ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.fillStyle = col(HOT, .55 * A.flash); ctx.fillRect(0, 0, 1080, 1920); ctx.restore(); }
    // b08: 12.8 s holds (no fake fast countdown); then it settles into a corner timer that runs in real time through the stretch
    if (t >= S("b08") && t < S("b11")) { const sl = slam(t, T.tSlam8, .16), v = Math.max(0, 12.8 - Math.max(0, t - T.tT0)), mv = smooth((t - T.tT0) / .5), out = 1 - smooth((t - S("b11") + .3) / .3);
      if (sl) { ctx.save(); ctx.globalAlpha = out;
        if (mv < 1) { const g = ctx.createRadialGradient(SX, 470, 20, SX, 470, 440); g.addColorStop(0, col(ABY, .7 * (1 - mv))); g.addColorStop(1, col(ABY, 0)); ctx.fillStyle = g; ctx.fillRect(0, 100, 1080, 800); }
        const cx = lerp(SX, 235, eio(mv)), cy = lerp(470, 300, eio(mv)), k = lerp(1, .4, eio(mv)), zoom = 1 + .06 * smooth((t - T.tSlam8) / 2) * (1 - mv);
        ctx.save(); ctx.translate(cx, cy); ctx.scale(sl.sc * k * zoom, sl.sc * k * zoom); ctx.translate(-cx, -cy);
        const sz = 330; ctx.save(); ctx.font = `400 ${sz}px ${ANTON}`; ctx.letterSpacing = "4px"; const wn = ctx.measureText("12.8").width; ctx.restore();
        const s = v.toFixed(1); ctx.save(); ctx.globalAlpha = sl.a; ctx.font = `400 ${sz}px ${ANTON}`; ctx.letterSpacing = "4px"; ctx.fillStyle = HOT; ctx.shadowColor = HOT; ctx.shadowBlur = 40; ctx.textAlign = "left";
        const pitch = ctx.measureText("0").width, adv = [...s].map(ch => /[0-9]/.test(ch) ? pitch : ctx.measureText(ch).width), w = adv.reduce((p, q) => p + q, 0); let x = cx - (w + 150) / 2; [...s].forEach((ch, i) => { ctx.fillText(ch, x, cy + 130); x += adv[i]; });
        ctx.font = `400 140px ${ANTON}`; ctx.fillStyle = HAZE; ctx.shadowBlur = 0; ctx.fillText("s", x + 10, cy + 130); ctx.restore(); ctx.restore();
        if (mv < 1) lab("(NASA simulation)", SX, 640, (1 - mv) * smooth((t - T.tSlam8 - .3) / .3), { color: TXT, ls: 3 });
        else lab("NASA simulation", 235, 385, out, { size: 40, ls: 2, color: TXT });
        ctx.restore(); } }
    if (t >= S("b10") && t < S("b11")) { const sl = slam(t, T.tSpag, .16), out = 1 - smooth((t - E("b10") + .15) / .25);
      if (sl) { const age = t - T.tSpag, st = 1 + 1.0 * smooth(age / 1.5), sz = fitSize("SPAGHETTIFICATION", 830, 150);
        ctx.save(); ctx.globalAlpha = out; ctx.translate(SX, 640); ctx.scale(sl.sc * (1 - .06 * smooth(age / 1.5)), sl.sc * st); ctx.translate(-SX, -640);
        txt("SPAGHETTIFICATION", SX, 640, { size: sz, color: TXT, ls: 2, a: sl.a, glow: 30, gcol: HOT }); ctx.restore(); } }
    if (t >= S("b11") && t < S("b12")) { const out = 1 - smooth((t - E("b11") + .3) / .3), lt = t - S("b11");
      split(A.sx, smooth(lt / .3) * out);
      lab("giant black hole", 290, 420, smooth((t - S("b11") - .3) / .3) * out, { ls: 1, color: TXT }); lab("small black hole", 745, 420, smooth((t - T.tSmall) / .25) * out, { ls: 1, color: HOT });
      const a = smooth((t - T.tTear + .1) / .2) * out; if (a > 0) { lab("can tear you", 745, 1010, a, { ls: 1, color: HOT }); lab("apart early", 745, 1070, a, { ls: 1, color: HOT }); } }
    if (t >= S("b12") && t < S("b14") && A.pin) { const u = clamp((t - T.tQ + .3) / 1.1), out = 1 - smooth((t - E("b12") + .3) / .3);
      if (u > 0) { ctx.save(); ctx.globalAlpha = smooth(u * 1.6) * out; const bl = (1 - eo3(u)) * 26; ctx.filter = `blur(${bl.toFixed(1)}px)`;
        const q = qMark(); ctx.font = `400 ${q.size}px ${ANTON}`; ctx.textAlign = "center"; ctx.fillStyle = UV; ctx.shadowColor = UV; ctx.shadowBlur = 30;
        const base = A.pin.y + q.dotC; ctx.beginPath(); ctx.rect(0, 0, 1080, base - q.cutUp); ctx.clip(); ctx.fillText("?", A.pin.x, base); ctx.restore(); }
      lab("singularity = ?", SX, 1120, smooth((t - T.tPin) / .3) * out, { size: 44, ls: 3, color: TXT }); }
    if (t >= S("b14") && t < S("b13") && A.pulses) A.pulses.forEach(p => { if (p.u <= 0 || p.u >= 1.25) return; const r = p.R * .985 * eo3(Math.min(p.u, 1)), a = p.u < 1 ? .8 * (1 - p.u * .5) : .8 * (1 - (p.u - 1) / .25) * .5;
      ctx.save(); ctx.globalAlpha = Math.max(0, a); ctx.strokeStyle = UV; ctx.lineWidth = 4; ctx.shadowColor = UV; ctx.shadowBlur = 20; ctx.beginPath(); ctx.arc(p.cx, p.cy, r, 0, 6.3); ctx.stroke();
      if (p.u > .85 && p.u < 1.25) { ctx.globalAlpha = Math.max(0, (1.25 - p.u) / .4) * .5; ctx.lineWidth = 9; ctx.strokeStyle = HOT; ctx.beginPath(); ctx.arc(p.cx, p.cy, p.R * 1.0, 0, 6.3); ctx.stroke(); } ctx.restore(); });
    if (t >= S("b13") && t < S("b15")) verdict(t);
    if (t >= S("b15") && t < T.tCard + .15) { const lt = t - S("b15"); split(A.sx, smooth(lt / .3));
      lab("FAR AWAY", 295, 400, smooth(lt / .3), { size: 44, ls: 5, color: TXT }); lab("TO YOU", 745, 400, smooth((t - T.tYou + .1) / .3), { size: 44, ls: 5, color: HOT });
      if (A.gL) { gauge(A.gL.x + 40, A.gL.y, 50, A.gL.tau, smooth(lt / .5), A.gL.frozen); gauge(A.gR.x, A.gR.y, 50, A.gR.tau * 9, smooth((t - T.tYou) / .4), false); } }
    if (t >= T.tCard - .1) { const u = smooth((t - (T.tCard - .1)) / .25); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.save(); ctx.globalAlpha = u * .94; ctx.fillStyle = ABY; ctx.fillRect(0, 0, 1080, 1920); ctx.restore(); ctx.translate(shk[0], shk[1]);
      ctx.save(); ctx.globalAlpha = u; endCard(t); ctx.restore(); }
    ctx.getImageData(0, 0, 1, 1);
  }
  let qm = null;
  function qMark() { // measure the "?" glyph once: where the stem ends and the dot starts, so the singularity itself can be the dot
    if (qm) return qm; const size = 520, c = document.createElement("canvas"); c.width = 400; c.height = 800; const x = c.getContext("2d", { willReadFrequently: true });
    x.font = `400 ${size}px ${ANTON}`; x.textAlign = "center"; x.fillStyle = "#fff"; x.fillText("?", 200, 650);
    const d = x.getImageData(0, 0, 400, 800).data, rowOn = y => { for (let i = 0; i < 400; i++) if (d[(y * 400 + i) * 4 + 3] > 40) return true; return false; };
    let top = 0, bot = 799; while (!rowOn(top)) top++; while (!rowOn(bot)) bot--;
    let y = bot; while (rowOn(y)) y--; const dotTop = y + 1; let gy = y; while (!rowOn(gy)) gy--;
    const dotCenter = (dotTop + bot) / 2; qm = { size, dotC: 650 - dotCenter, cutUp: 650 - (gy + dotTop) / 2 }; return qm; }
  function split(x, a) { if (a <= 0) return; x = x || 530; ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = col(TXT, .55); ctx.lineWidth = 2; ctx.shadowColor = UV; ctx.shadowBlur = 12; ctx.beginPath(); ctx.moveTo(x, 190); ctx.lineTo(x, 1400); ctx.stroke(); ctx.restore(); }
  return { draw, drawCover: coverLines, captions, initCaps };
}
