// Episode timing + sound cues for ep02 (generic helpers live in engine/film/timing.js).
import { makeBeatTiming } from "../../../engine/film/timing.js";
export { clamp, smooth, eio, eo3, eob, lerp, hash } from "../../../engine/film/timing.js";

export function makeTiming(tl) {
  const T0 = makeBeatTiming(tl), { B, S, E, END, W, DUR } = T0;
  const T = { B, S, E, END, W, DUR };
  T.hookEnd = END("b01") + .1;
  T.tSlow = W("b02", "slow down"); T.tStop = W("b02", "Then stop");
  T.tHorizon = W("b03", "event horizon"); T.tNoRet = W("b03", "Point of no"); T.tNoLight = W("b03", "Not even");
  T.tWhy = S("b04"); T.tBend = W("b04", "Gravity bends"); T.tPic = W("b04", "your picture");
  T.tHours = W("b05", "fall take"); T.tBig = W("b06", "about four"); T.tLike = W("b06", "Like the one");
  T.tCross = W("b07", "and space"); T.tFlow = W("b07", "rushes");
  T.tSlam8 = W("b08", "twelve point"); T.tT0 = END("b08") + .05; T.tCorner = T.tT0 + .5;
  T.tNoodle = W("b09", "You stretch");
  T.tSpag = W("b10", "spaghettification");
  T.tSmall = W("b11", "small black"); T.tTear = W("b11", "tear you apart") + .1;
  T.tPin = W("b12", "a point of endless"); T.tQ = W("b12", "Nobody knows"); T.tNoth = S("b14") + .3; T.tInfo = W("b14", "This is math");
  T.tStamp = W("b13", "Unproven");
  T.tMath = W("b14", "This is math");
  T.tCard = END("b15") + .4; T.tSign = T.tCard + .8; // end card cuts in only after the fall and the VO have finished
  T.tWorld = S("b15"); T.tYou = W("b15", "To you");
  T.cuts = [S("b02"), S("b03"), S("b04"), S("b05"), S("b06"), S("b07"), S("b09"), S("b11"), S("b12"), S("b14"), S("b13"), S("b15")];
  const cues = [], cue = (t, type, x) => cues.push(Object.assign({ t, type }, x || {}));
  cue(.1, "hit", { gain: .9 }); cue(0, "sweep", { dur: .5 }); cue(.2, "swell", { dur: 2.6 });
  cue(T.tSlow - .1, "swell", { dur: 1.8 }); cue(T.tStop, "hit", { gain: .6 });
  cue(S("b03") + .05, "swell", { dur: 2.2 }); cue(T.tHorizon, "hit", { gain: .8 }); cue(T.tNoRet + .05, "pop"); cue(T.tNoLight, "hit", { gain: .7 });
  cue(T.tBend - .5, "riser", { dur: 1.2 }); cue(T.tPic, "hit", { gain: .5 });
  cue(T.tHours, "pop");
  cue(S("b06") + .1, "swell", { dur: 3 }); cue(T.tBig, "hit", { gain: .9 });
  cue(S("b07") + .1, "riser", { dur: T.tCross - S("b07") }); cue(T.tCross, "hit", { gain: 1.3 }); cue(T.tFlow, "swell", { dur: 2.5 });
  cue(T.tSlam8, "hit", { gain: 1.2 }); cue(T.tCorner, "pop");
  cue(S("b09") + .1, "swell", { dur: 3 }); cue(T.tSpag, "hit", { gain: 1.3 });
  cue(S("b11") + .1, "swell", { dur: T.tTear - S("b11") }); cue(T.tTear, "hit", { gain: 1.2 });
  cue(S("b12") + .2, "swell", { dur: 4 }); cue(T.tQ, "pop");
  cue(T.tStamp - 1.8, "riser", { dur: 1.8 }); cue(T.tStamp + .02, "hit", { gain: 1.4 });
  cue(S("b15") + .1, "swell", { dur: 2.8 }); cue(T.tCard + .05, "hit", { gain: .6 });
  T.cuts.forEach(c => cue(c - .02, "sweep", { dur: .4 }));
  cue(S("b05"), "tick", { t1: E("b05"), rate: 1 });
  cue(T.tCorner, "tick", { t1: S("b11"), rate: 1 }); cue(T.tNoth, "pop"); cue(T.tNoth + 1.8, "pop", {});
  cues.sort((a, b) => a.t - b.t); T.cues = cues;
  T.shakes = [[.12, 12, .3], [T.tCross + .02, 18, .45], [T.tSlam8 + .03, 14, .35], [T.tSpag + .03, 12, .35], [T.tTear + .02, 26, .5], [T.tStamp + .03, 26, .55], [T.tNoLight + .02, 5, .3]];
  return T;
}
