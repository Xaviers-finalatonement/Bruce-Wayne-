// Episode timing + sound cues for Pan Theory ep02 (generic helpers live in engine/film/timing.js).
import { makeBeatTiming } from "../../../engine/film/timing.js";
export { clamp, smooth, eio, eo3, eob, lerp, hash } from "../../../engine/film/timing.js";

export function makeTiming(tl) {
  const T0 = makeBeatTiming(tl), { B, S, E, END, W, DUR } = T0;
  const T = { B, S, E, END, W, DUR };
  T.hookEnd = END("b01") + .3;
  // blade drops on the rig (hero set): each is one cut event; the camera cuts between angles of the same rig
  T.C1 = .7; T.C2 = S("b02") + 1.0; T.C3 = S("b03") + .3; T.C4 = S("b04") + 2.9; T.C8 = S("b08") + .75;
  // b02 labels
  T.tFps = W("b02", "far faster");
  // b03: the tracked droplet, speed label, mph
  T.tSpeed = W("b03", "up to about"); T.tMph = W("b03", "ninety");
  // b04 lab rig
  T.tRig = W("b04", "lab rig"); T.tChef = W("b04", "not a chef");
  // b05 macro: one big drop stretches, bursts, then the fragments split again
  T.f0 = S("b05") + .15; T.f1 = W("b05", "they split") - .1; T.f2 = W("b05", "hundreds"); T.tTh = W("b05", "thousands"); T.tFift = W("b05", "Within a fiftieth");
  // b06 dive into the cut face, cells, reaction
  T.dive0 = S("b06") - .05; T.cellIn = W("b06", "Cutting") - .1; T.tBreak = W("b06", "breaks open"); T.tReact = W("b06", "A reaction"); T.tSulf = W("b06", "sulfur"); T.tIrr = W("b06", "eye irritant");
  // b07 eye
  T.tSw = W("b07", "It switches"); T.tCor = W("b07", "cornea"); T.tClear = W("b07", "the clear"); T.tTear = W("b07", "Tears");
  // b08 theory
  T.tChem = W("b08", "One chemist"); T.tCarry = W("b08", "carry");
  // b09 cross-section
  T.sSkin = W("b09", "The tough"); T.sFlesh = W("b09", "get squeezed"); T.sBurst = W("b09", "Then it bursts");
  // b10 / b11 split
  T.tBlunt = W("b10", "A blunter"); T.tFast = W("b10", "faster cuts"); T.D1 = S("b10") + .55; T.D2 = T.tFast - .1; T.D3 = S("b11") + .55;
  // b12 / b13 / b14
  T.tTrk = W("b12", "tracked"); T.tNotT = W("b12", "not tears"); T.tStudy = W("b13", "one study"); T.tPre = W("b13", "preprint");
  T.tCard = S("b14") - .05; T.tTheory = W("b14", "sharpen your"); T.tFewer = W("b14", "Fewer"); T.tSign = END("b14") + .2;
  // ---- sound cues ----
  const cues = [], cue = (t, type, x) => cues.push(Object.assign({ t, type }, x || {}));
  cue(0, "sweep", { dur: .4 });
  [[T.C1], [T.C2], [T.C3], [T.C4], [T.C8], [T.D1], [T.D2], [T.D3]].forEach(([c], i) => { cue(c - .08, "chop", { gain: .85 }); cue(c, "spray", { dur: 1.5 }); cue(c + .3, "pop", { gain: .5 }); });
  cue(S("b02") - .05, "whoosh", { dur: .8 }); cue(T.tFps, "tick", { t1: T.tFps + .8, rate: 14 });
  cue(T.C3 + .1, "whoosh", { dur: 1.4 }); cue(T.tMph, "pop");
  cue(S("b04") + .1, "whoosh", { dur: 2.2 }); cue(T.tChef, "clink", { gain: .6 });
  cue(T.f0, "swell", { dur: T.f1 - T.f0 }); cue(T.f1, "spray", { dur: 1.2 }); cue(T.f2, "spray", { dur: 1.4 }); [0, .2, .4, .6].forEach(d => cue(T.f1 + .15 + d, "pop", { gain: .5 }));
  cue(S("b06"), "whoosh", { dur: T.cellIn - S("b06") + .1 }); cue(T.cellIn, "hit", { gain: .55 }); cue(T.tBreak, "pop"); cue(T.tBreak + .12, "pop", { gain: .8 }); cue(T.tReact + .5, "swell", { dur: 1.6 }); cue(T.tSulf + .3, "pop"); cue(T.tIrr, "hiss", { dur: 1.2 });
  cue(S("b07") - .08, "sweep", { dur: .4 }); cue(T.tSw + .1, "swell", { dur: 1.6 }); cue(T.tSw + .9, "pop", { gain: .8 }); cue(T.tTear - .2, "pop", { gain: .7 }); cue(T.tTear, "plop", { gain: .7 });
  cue(S("b08") - .1, "sweep", { dur: .3 }); cue(T.tChem, "swell", { dur: 1.4 });
  cue(S("b09") - .1, "sweep", { dur: .3 }); cue(T.sBurst - .08, "chop", { gain: .8 }); cue(T.sBurst, "spray", { dur: 1.4 });
  cue(S("b10") - .08, "sweep", { dur: .3 }); cue(S("b11") - .1, "sweep", { dur: .3 });
  cue(S("b12") - .1, "sweep", { dur: .3 }); cue(S("b12") + .2, "plop", { gain: .5 }); cue(T.tStudy, "chop", { gain: .8 });
  cue(T.tCard, "whoosh", { dur: .5 }); cue(T.tTheory, "pop"); cue(T.tSign, "clink", { gain: .7 });
  cue(T.tCard - .1, "bedgap", { dur: 1.5 });
  cues.sort((a, b) => a.t - b.t); T.cues = cues;
  return T;
}
