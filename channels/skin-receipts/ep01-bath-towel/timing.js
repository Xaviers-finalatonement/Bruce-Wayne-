// Episode timing + sound cues for Skin Receipts ep01 (generic helpers live in engine/film/timing.js).
import { makeBeatTiming } from "../../../engine/film/timing.js";
export { clamp, smooth, eio, eo3, eob, lerp, hash } from "../../../engine/film/timing.js";

export function makeTiming(tl) {
  const T0 = makeBeatTiming(tl), { B, S, E, END, W, DUR } = T0;
  const T = { B, S, E, END, W, DUR };
  T.hookEnd = END("b01") + .1;
  T.tEnd = END("b15") + .05;            // end card appears; held to the end of the film
  // receipt content: [beat, time, rows (wrapped later), style]. Overlay lays these out; the cues come from the same table.
  T.items = [
    ["hdr", .05, ["SKIN RECEIPTS", "No. 001 · towel"], "hdr"],
    ["b01", T.hookEnd + .15, ["Your towel grows a film?"], "line"],
    ["b02", W("b02", "The claim"), ["CLAIM: disposable towels for ideal skin"], "line"],
    ["b03", S("b03") + .05, ["LINE 1 · does the film form?"], "head"],
    ["b03", W("b03", "twenty-six"), ["26 households"], "line"],
    ["b04", W("b04", "Six months"), ["6 months"], "line"],
    ["b04", W("b04", "Every two months"), ["tested every 2 months"], "line"],
    ["b05", W("b05", "By month"), ["month 2: odour + dullness"], "line"],
    ["b05", W("b05", "Under a microscope"), ["biofilm seen"], "line"],
    ["b06", W("b06", "Live bacteria"), ["live bacteria: highest at month 6"], "line"],
    ["b08", S("b08") + .05, ["LINE 2 · from your skin?"], "head"],
    ["b08", W("b08", "Staph"), ["Staph: typically < 1 %"], "line"],
    ["b09", S("b09") + .3, ["towel-loving bacteria?"], "line"],
    ["b10", S("b10") + .05, ["LINE 3 · harm to skin?"], "head"],
    ["b10", W("b10", "The study never"), ["not measured"], "line"],
    ["b11", W("b11", "didn't test"), ["disposable: not tested here"], "slate"],
    ["b12", W("b12", "never share"), ["never share towels"], "line"],
    ["b12", W("b12", "pat your skin"), ["pat dry · clean towel"], "line"],
    ["b13", S("b13") + .05, ["RECEIPT TOTAL"], "total"],
    ["b14", W("b14", "The film is real"), ["film: real"], "sum"],
    ["b14", W("b14", "Harm to your skin"), ["harm to skin: unproven"], "sum"],
    ["b14", W("b14", "Disposable towels"), ["disposable: not tested"], "sum"],
    ["b14", W("b14", "Dermatologists say"), ["clean · not shared"], "sum"],
  ];
  T.stamps = [
    { id: "hold", text: "HOLDS UP", color: "teal", t: W("b07", "holds up") - .02, at: "b03" },
    { id: "unk", text: "UNKNOWN", color: "slate", t: W("b13", "unknown") - .05, at: "total" },
  ];
  const cues = [], cue = (t, type, x) => cues.push(Object.assign({ t, type }, x || {}));
  cue(0.05, "swell", { dur: 2.2 });
  T.items.forEach(it => { const n = it[2].length; cue(it[1], "tick", { t1: it[1] + .08 + n * .1, rate: 16 }); });
  T.stamps.forEach(s => cue(s.t, "hit", { gain: 1 }));
  [S("b02"), S("b03"), S("b04"), S("b05"), S("b06"), S("b08"), S("b09"), S("b10"), S("b11"), S("b12"), S("b13"), S("b14"), S("b15")].forEach(c => cue(c - .05, "sweep", { dur: .5 }));
  cue(S("b05") + 1.4, "swell", { dur: 3 }); cue(S("b09") + .2, "swell", { dur: 3 }); cue(S("b10") + 1, "swell", { dur: 2 });
  cue(T.tEnd + .05, "hit", { gain: .6 });
  cues.sort((a, b) => a.t - b.t); T.cues = cues;
  return T;
}
