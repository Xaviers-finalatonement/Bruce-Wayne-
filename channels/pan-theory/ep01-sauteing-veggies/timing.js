// Episode timing + sound cues for Pan Theory ep01 (generic helpers live in engine/film/timing.js).
import { makeBeatTiming } from "../../../engine/film/timing.js";
export { clamp, smooth, eio, eo3, eob, lerp, hash } from "../../../engine/film/timing.js";

export function makeTiming(tl) {
  const T0 = makeBeatTiming(tl), { B, S, E, END, W, DUR } = T0;
  const T = { B, S, E, END, W, DUR };
  T.hookEnd = END("b01") + .35;
  // b02 oil + heat
  T.tOil = S("b02") + .35; T.tHeat = W("b02", "Two opposite");
  // b03 dive into the carrot
  T.tPlant = W("b03", "plant pigments"); T.tCaro = W("b03", "carotenoids"); T.tBody = W("b03", "Your body");
  T.dive1 = T.tCaro + .1; T.diveFrom = S("b03") + .15;
  // b04 / b05 molecules
  T.tCatch = W("b04", "Here's the catch"); T.tFat = W("b04", "better with"); T.tAbs = W("b04", "absorbed");
  T.tRide = W("b05", "Think of it"); T.tTravel = W("b05", "travel along");
  // b06 rise
  T.tSplash = W("b06", "So a splash"); T.riseEnd = S("b06") + 1.5;
  // b07 spinach / broccoli / tiles
  T.tSpin = W("b07", "spinach"); T.tVit = W("b07", "vitamins E"); T.tFatH = W("b07", "Fat helps");
  // b08 flip side
  T.tFlip = W("b08", "Now the flip"); T.tPep = W("b08", "Peppers"); T.tToms = W("b08", "tomatoes"); T.tVC = W("b08", "vitamin C");
  // b09
  T.tVCd = W("b09", "Vitamin C dissolves"); T.tWater = W("b09", "water"); T.tLower = W("b09", "cooking can lower");
  T.dive2 = S("b09") - .05;
  // b10 trio
  T.tMicro = W("b10", "Microwaving"); T.tSteam = W("b10", "steaming"); T.tPan = W("b10", "not just the pan");
  // b11 raw/cooked
  T.tRaw = W("b11", "raw fruit"); T.tTop = W("b11", "top the");
  // b12 trade
  T.tGood = W("b12", "good or bad"); T.tTrade = W("b12", "a trade");
  // b13 / b14
  T.tDiet = W("b13", "diet rule"); T.tJust = W("b13", "just what");
  T.tCard = S("b14") - .05; T.tTheory = W("b14", "carrots like"); T.tTonight = W("b14", "Tonight"); T.tSign = END("b14") + .2;
  // hard cuts that get a quick countertop flash (molecular transitions have their own veils)
  T.flashes = [S("b10"), S("b11"), S("b12"), S("b13")];
  // ---- sound cues ----
  const cues = [], cue = (t, type, x) => cues.push(Object.assign({ t, type }, x || {}));
  cue(.05, "hit", { gain: .8 }); cue(.0, "sweep", { dur: .5 });
  cue(T.tOil - .05, "pour", { dur: 1.7 }); cue(T.tOil + 1.1, "sizzle", { dur: T.dive1 - T.tOil - 1.1 + .6, k: .8 });
  cue(T.tHeat, "swell", { dur: 1.2 });
  cue(T.diveFrom, "whoosh", { dur: T.dive1 - T.diveFrom + .3 });
  cue(T.dive1, "swell", { dur: 2.4 });
  cue(S("b04"), "sweep", { dur: .4 }); cue(T.tFat + .1, "pop"); cue(S("b05") + .2, "swell", { dur: 2.6 });
  for (let i = 0; i < 4; i++) cue(S("b05") + .6 + i * .75, "pop");
  cue(E("b05") - .3, "whoosh", { dur: S("b06") + 1.5 - E("b05") + .3 }); cue(S("b06") + 1.2, "sizzle", { dur: T.tSpin - S("b06") - .8, k: .9 });
  [0, .45, .9].forEach((d, i) => cue(T.tSpin - .25 + d, "chop")); cue(T.tSpin + .15, "plop"); cue(T.tSpin + .75, "plop", { gain: .8 });
  cue(T.tSpin + .1, "sizzle", { dur: E("b07") - T.tSpin + .6, k: 1.2 });
  for (let i = 0; i < 4; i++) cue(T.tVit + .25 + i * .22, "pop");
  cue(S("b08") + .2, "whoosh", { dur: 1.1 }); [0, .35, .7].forEach(d => cue(S("b08") + 1.1 + d, "chop")); cue(T.tVC, "pop"); cue(T.tVC + .05, "swell", { dur: 1.6 });
  cue(T.dive2 - .4, "whoosh", { dur: .7 }); cue(S("b09") + .1, "swell", { dur: 2.8 }); cue(T.tLower, "hiss", { dur: 2.2 });
  T.flashes.forEach(c => cue(c - .12, "sweep", { dur: .3 }));
  cue(T.tMicro, "tick", { t1: T.tMicro + .5, rate: 8 }); cue(T.tSteam, "hiss", { dur: 1.2 }); cue(T.tPan, "sizzle", { dur: 1.3, k: .9 });
  cue(T.tRaw, "pop"); cue(T.tTop, "pop", { gain: .9 });
  cue(T.tGood - .1, "swell", { dur: 1.2 }); cue(T.tTrade, "clink"); cue(T.tTrade + .5, "clink", { gain: .6 });
  cue(S("b13") + .1, "sizzle", { dur: E("b13") - S("b13"), k: .8 }); cue(T.tDiet, "pop");
  cue(T.tCard, "whoosh", { dur: .5 }); cue(T.tTheory, "pop"); cue(T.tSign, "clink", { gain: .7 });
  cues.sort((a, b) => a.t - b.t); T.cues = cues;
  return T;
}
