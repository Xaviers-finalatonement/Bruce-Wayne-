// Episode timing + sound cues for ep01 (generic helpers live in engine/film/timing.js).
import { makeBeatTiming } from "../../../engine/film/timing.js";
export { clamp, smooth, eio, eo3, eob, lerp, hash } from "../../../engine/film/timing.js";

export function makeTiming(tl) {
  const T0 = makeBeatTiming(tl), { B, S, E, END, W, DUR } = T0;
  const T = { B, S, E, END, W, DUR };
  T.hookEnd = END("b01") + .1;
  T.tSag = W("b03", "It slows");
  T.tRaise0 = W("b07", "raised"); T.tRaise1 = W("b07", "Two steps") - .1;
  T.tl0 = W("b09", "Over a whole"); T.tl1 = W("b09", "those two steps");
  T.tSlow0 = W("b12", "set them"); T.tSlow1 = W("b12", "on the ground");
  T.th0 = W("b12", "Without"); T.tDrift0 = W("b12", "your map"); T.tDrift1 = W("b12", "would be wrong") + .5; T.tSnap = E("b12") - .45;
  T.tTrue = W("b13", "True"); T.tRule = W("b13", "The higher");
  T.tSign = END("b15") + .35;
  T.tj0 = S("b14"); T.arr = i => T.tj0 + .55 + i * .92; T.NST = 5;
  T.cuts = [S("b03"), S("b04"), S("b05"), S("b06"), S("b09"), S("b11"), S("b12"), T.th0, S("b13"), S("b14"), S("b15")];
  const cues = [], cue = (t, type, x) => cues.push(Object.assign({ t, type }, x || {}));
  cue(.12, "hit"); cue(0, "sweep", { dur: .5 });
  cue(S("b03") + .05, "swell", { dur: 2.2 }); cue(T.tSag - 1.4, "swell", { dur: 1.6 });
  cue(W("b06", "in 2010") + .1, "hit");
  cue(W("b09", "about ninety") - .9, "swell", { dur: 1.8 }); cue(W("b10", "But real") + .02, "hit");
  cue(S("b11") + .3, "swell", { dur: 2.4 }); cue(W("b11", "GPS") + .05, "hit");
  cue(T.tSlow0, "swell", { dur: 1.4 }); cue(T.tSlow1 + .05, "hit");
  cue(T.tDrift1 - .9, "hit", { gain: .8 }); cue(T.tSnap + .05, "pop");
  cue(T.tTrue + .02, "hit", { gain: 1.2 }); cue(T.tTrue - 2.2, "riser", { dur: 2.2 });
  cue(END("b15") + .25, "hit", { gain: .55 });
  for (let i = 1; i < T.NST; i++) cue(T.arr(i), "pop");
  T.cuts.forEach(c => cue(c - .02, "sweep", { dur: .45 }));
  cue(.3, "tick", { t1: S("b03"), rate: 1 }); cue(S("b03") + 1.2, "tick", { t1: E("b03"), rate: 1.6 });
  cue(S("b04"), "tick", { t1: E("b04"), rate: 2.4 }); cue(S("b05"), "tick", { t1: E("b05"), rate: 1.2 });
  cue(S("b06") + 2.4, "tick", { t1: E("b08"), rate: 1.4 }); cue(S("b11") + 1.2, "tick", { t1: E("b11"), rate: 4 });
  cue(S("b12") + .8, "tick", { t1: T.tSlow1, rate: 3 }); cue(S("b15"), "tick", { t1: T.tSign, rate: 1.2 });
  cues.sort((a, b) => a.t - b.t); T.cues = cues;
  // shake impulses (impacts only)
  T.shakes = [[.14, 14, .35], [.26, 8, .3], [W("b03", "Gravity") + .05, 6, .3], [W("b06", "in 2010") + .12, 16, .4], [W("b10", "But real") + .02, 8, .3],
    [W("b11", "GPS") + .05, 10, .3], [T.tTrue + .04, 26, .55]];
  return T;
}
