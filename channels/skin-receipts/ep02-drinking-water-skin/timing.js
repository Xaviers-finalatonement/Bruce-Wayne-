// Episode timing + sound cues for Skin Receipts ep02 (generic helpers live in engine/film/timing.js).
import { makeBeatTiming } from "../../../engine/film/timing.js";
export { clamp, smooth, eio, eo3, eob, lerp, hash } from "../../../engine/film/timing.js";

export function makeTiming(tl) {
  const T0 = makeBeatTiming(tl), { B, S, E, END, W, DUR } = T0;
  const T = { B, S, E, END, W, DUR };
  T.hookEnd = END("b01") + .1;
  T.tEnd = END("b15") + .05;            // end card appears; held to the end of the film (>= 3 s)
  // receipt content: [beat, time, rows (wrapped later), style]. Overlay lays these out; the cues come from the same table.
  T.items = [
    ["hdr", .05, ["SKIN RECEIPTS", "No. 002 · water"], "hdr"],
    ["b01", W("b01", "Forty-nine") + .1, ["49 women tested it"], "line"],
    ["b02", W("b02", "drink more") + .05, ["CLAIM: more water, hydrated skin"], "line"],
    ["b03", S("b03") + .05, ["LINE 1 · 49 healthy women"], "head"],
    ["b03", W("b03", "two liters") + .1, ["+2 L a day · 4 weeks"], "line"],
    ["b04", W("b04", "Nobody") + .05, ["no comparison group"], "line"],
    ["b05", W("b05", "Over half") + .05, ["over half of their water: food, soup, juice"], "line"],
    ["b06", S("b06") + .1, ["skin hydration probe"], "line"],
    ["b06", W("b06", "Forehead") + .1, ["face · arm · hand · leg"], "line"],
    ["b07", S("b07") + .05, ["38 lighter drinkers"], "head"],
    ["b07", W("b07", "forehead reading"), ["forehead hydration reading: +40%"], "line"],
    ["b08", S("b08") + .05, ["11 heavy drinkers"], "head"],
    ["b08", W("b08", "wasn't clear"), ["change not clear"], "line"],
    ["b09", S("b09") + .15, ["water loss through skin: no relevant change"], "line"],
    ["b10", W("b10", "one small") + .05, ["one small study"], "line"],
    ["b11", S("b11") + .25, ["2018 review · 5 studies"], "line"],
    ["b11", W("b11", "weak"), ["evidence: weak"], "line"],
    ["b12", W("b12", "unclear") - .1, ["noticeable? unclear"], "line"],
    ["b13", S("b13") + .05, ["RECEIPT TOTAL"], "total"],
    ["b14", W("b14", "might nudge"), ["might help · mostly if you drink little"], "sum"],
    ["b14", W("b14", "Proven"), ["proven? not yet"], "sum"],
  ];
  T.stamps = [{ id: "unk", text: "UNKNOWN", color: "slate", t: W("b13", "unknown") - .05, at: "total" }];
  T.weakT = W("b11", "weak") - .12;
  T.slipT = [0, 1, 2, 3, 4].map(i => S("b11") + .2 + i * .5);
  // glass fill times in beat 3 (one per printer tick) and the b02 pour
  T.fill0 = W("b03", "two liters") - .05; T.fillDt = .3;
  T.pour = { t0: W("b02", "drink more") - .1, t1: W("b02", "hydrate") + .5 };
  T.probeT = [W("b06", "Forehead"), W("b06", "forearm"), W("b06", "hand"), W("b06", "leg")];
  const cues = [], cue = (t, type, x) => cues.push(Object.assign({ t, type }, x || {}));
  cue(.1, "drop", { gain: .9 }); cue(1.2, "swell", { dur: 1.5 });
  cue(T.pour.t0, "pour", { dur: T.pour.t1 - T.pour.t0 });
  for (let i = 0; i < 8; i++) cue(T.fill0 + i * T.fillDt, "pour", { dur: .4 });
  T.probeT.forEach(p => cue(p + .1, "pop"));
  [0, 1, 2].forEach(i => cue(S("b09") + .9 + i * 1.1, "drop", { gain: .7 }));
  cue(S("b12") + .3, "swell", { dur: 2.2 }); cue(S("b14") + .3, "swell", { dur: 3 }); cue(S("b05") + .1, "swell", { dur: 1.6 });
  T.slipT.forEach(s => cue(s, "tick", { t1: s + .3, rate: 16 }));
  const tk = []; T.items.forEach(it => { if (tk.some(x => Math.abs(x - it[1]) < .12)) return; tk.push(it[1]); const n = it[2].length; cue(it[1], "tick", { t1: it[1] + .08 + n * .1, rate: 16 }); });
  T.stamps.forEach(s => cue(s.t, "hit", { gain: 1 })); cue(T.weakT, "hit", { gain: .7 });
  [S("b02"), S("b03"), S("b04"), S("b05"), S("b06"), S("b07"), S("b08"), S("b09"), S("b10"), S("b11"), S("b12"), S("b13"), S("b14"), S("b15")].forEach(c => cue(c - .05, "sweep", { dur: .5 }));
  cue(T.tEnd + .05, "hit", { gain: .6 });
  cues.sort((a, b) => a.t - b.t); T.cues = cues;
  return T;
}
