// Episode timing + sound cues for Pan Theory ep01 (generic helpers live in engine/film/timing.js).
import { makeBeatTiming } from "../../../engine/film/timing.js";
export { clamp, smooth, eio, eo3, eob, lerp, hash } from "../../../engine/film/timing.js";

export function makeTiming(tl) {
  const T0 = makeBeatTiming(tl), { B, S, E, END, W, DUR } = T0;
  const T = { B, S, E, END, W, DUR };
  T.hookEnd = END("b01") + .35;
  // hook: oil pours at ~0.3 s ("Oil helps"), the pepper side shimmers + blisters from ~1.5 s ("Heat can cost")
  T.tOil = .3; T.tHeat1 = 1.5; T.tOilS = S("b02") + .35;
  // b02 heat label
  T.tHeat = W("b02", "Two opposite");
  // b03 dive into the carrot: lands on cells holding crystals on "plant pigments"
  T.tPlant = W("b03", "plant pigments"); T.tCaro = W("b03", "carotenoids"); T.tBody = W("b03", "Your body");
  T.dive1 = T.tPlant - .05; T.diveFrom = Math.max(S("b03") + .6, T.dive1 - 1.7);
  // b04 / b05 molecules
  T.tCatch = W("b04", "Here's the catch"); T.tFat = W("b04", "better with"); T.tAbs = W("b04", "absorbed");
  T.tRide = W("b05", "Think of it"); T.tTravel = W("b05", "travel along");
  // b06 rise
  T.tSplash = W("b06", "So a splash"); T.riseEnd = S("b06") + 1.5;
  // b07 spinach / broccoli / E + K tiles
  T.tSpin = W("b07", "spinach"); T.tVit = W("b07", "vitamins E"); T.tFatH = W("b07", "Fat helps");
  // b08 flip side
  T.tFlip = W("b08", "Now the flip"); T.tPep = W("b08", "Peppers"); T.tToms = W("b08", "tomatoes"); T.tVC = W("b08", "vitamin C");
  // b09: lands on water-filled cells holding vitamin C on "dissolves in water"
  T.tVCd = W("b09", "Vitamin C dissolves"); T.tDis = W("b09", "dissolves"); T.tWater = W("b09", "in water"); T.tLower = W("b09", "cooking can lower");
  T.dive2 = T.tDis - .05; T.diveFrom2 = T.dive2 - 1.7;
  // b10 trio (hard cut on "Microwaving"); all three dim together on "can lower it too"
  T.tMicro = W("b10", "Microwaving"); T.tSteam = W("b10", "steaming"); T.tLower2 = W("b10", "can lower"); T.tPan = W("b10", "not just the pan");
  // b11 raw/cooked
  T.tThat = W("b11", "That's why"); T.tRaw = W("b11", "raw fruit"); T.tTop = W("b11", "top the");
  // b12 plates
  T.tGood = W("b12", "good or bad"); T.tTrade = W("b12", "a trade");
  // b13 / b14
  T.tDiet = W("b13", "diet rule"); T.tJust = W("b13", "just what");
  // b13 pan events about every 2 s: spatula in, carrots toss + flip to their browned faces, strips turn + steam burst
  T.tSp = S("b13") + .35; T.tToss = S("b13") + 1.25; T.tToss2 = S("b13") + 2.55; T.tBurst = T.tToss2 + .3;
  T.tCard = S("b14") - .05; T.tTheory = W("b14", "carrots want"); T.tPeppers = W("b14", "Peppers can"); T.tSign = END("b14") + .2;
  // ---- sound cues ----
  const cues = [], cue = (t, type, x) => cues.push(Object.assign({ t, type }, x || {}));
  cue(.05, "hit", { gain: .6 }); cue(.0, "sweep", { dur: .4 });
  cue(T.tOil - .06, "pour", { dur: 1.1 }); cue(T.tHeat1 - .05, "sizzleup", { dur: 2.6 });
  cue(T.tHeat1 + .15, "pop", { gain: .8 }); cue(T.tHeat1 + .55, "pop", { gain: .7 }); cue(T.tHeat1 + .9, "pop", { gain: .8 });
  cue(T.tHeat, "swell", { dur: 1.2 });
  cue(T.tHeat1 + 2.4, "sizzle", { dur: T.diveFrom - T.tHeat1 - 2.0, k: .8 });
  cue(T.diveFrom, "whoosh", { dur: T.dive1 - T.diveFrom + .3 });
  cue(T.dive1, "swell", { dur: 2.4 }); cue(T.dive1 + 1.2, "pop"); cue(T.dive1 + 2.4, "pop", { gain: .8 });
  for (let i = 0; i < 4; i++) cue(T.tBody + .1 + i * .18, "pop", { gain: .8 });
  cue(S("b04"), "sweep", { dur: .4 }); cue(T.tFat + .1, "pop"); cue(T.tAbs + .1, "pop"); cue(S("b05") + .2, "swell", { dur: 2.6 });
  for (let i = 0; i < 4; i++) cue(S("b05") + .6 + i * .75, "pop");
  cue(E("b05") - .3, "whoosh", { dur: S("b06") + 1.5 - E("b05") + .3 }); cue(S("b06") + 1.2, "sizzle", { dur: T.tSpin - S("b06") - .8, k: .9 });
  [0, .45, .9].forEach((d, i) => cue(T.tSpin - .25 + d, "chop")); cue(T.tSpin + .15, "plop"); cue(T.tSpin + .75, "plop", { gain: .8 });
  cue(T.tSpin + .1, "sizzle", { dur: E("b07") - T.tSpin + .6, k: 1.2 });
  for (let i = 0; i < 2; i++) cue(T.tVit + .25 + i * .3, "pop");
  cue(S("b08") + .2, "whoosh", { dur: 1.1 }); [0, .35, .7].forEach(d => cue(S("b08") + 1.1 + d, "chop")); cue(T.tVC, "pop"); cue(T.tVC + .05, "swell", { dur: 1.6 });
  cue(T.dive2 - .4, "whoosh", { dur: .7 }); cue(T.dive2, "swell", { dur: 2.8 }); cue(T.tWater, "pop"); cue(T.tLower, "hiss", { dur: 2.2 });
  cue(S("b10") - .04, "hit", { gain: .7 }); cue(S("b11") - .1, "sweep", { dur: .3 }); cue(S("b12") - .1, "sweep", { dur: .3 }); cue(S("b13") - .1, "sweep", { dur: .3 });
  cue(T.tMicro, "tick", { t1: T.tMicro + .6, rate: 8 }); cue(T.tSteam, "hiss", { dur: 1.2 }); cue(T.tLower2, "swell", { dur: 1.0 }); cue(T.tPan, "sizzle", { dur: 1.3, k: .9 });
  cue(T.tRaw, "pop"); cue(T.tTop, "pop", { gain: .9 });
  cue(S("b12") + .3, "plop", { gain: .6 }); cue(T.tGood - .1, "swell", { dur: 1.2 }); cue(T.tTrade, "clink"); cue(T.tTrade + .5, "clink", { gain: .6 });
  cue(S("b13") + .1, "sizzle", { dur: E("b13") - S("b13"), k: .8 }); cue(T.tDiet, "pop");
  cue(T.tSp, "chop"); cue(T.tToss, "plop", { gain: .8 }); cue(T.tToss + .45, "pop"); cue(T.tToss2, "plop", { gain: .7 }); cue(T.tBurst, "hiss", { dur: 1.0 });
  cue(T.tCard, "whoosh", { dur: .5 }); cue(T.tTheory, "pop"); cue(T.tPeppers, "pop"); cue(T.tSign, "clink", { gain: .7 });
  // music bed: drops out on "Now the flip side" for a bar, and under the first second of the end card
  cue(T.tFlip - .15, "bedgap", { dur: 2.9 }); cue(T.tCard - .1, "bedgap", { dur: 1.5 });
  cues.sort((a, b) => a.t - b.t); T.cues = cues;
  return T;
}
