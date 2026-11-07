// Generic, deterministic timeline helpers shared by every episode (easing + beat/phrase timing from timeline.json).
// Timing helpers + sound cues, shared by the 3D scene and the 2D type overlay.
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const smooth = x => { x = clamp(x); return x * x * (3 - 2 * x); };
export const eio = x => { x = clamp(x); return x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
export const eo3 = x => 1 - Math.pow(1 - clamp(x), 3);
export const eob = x => { x = clamp(x); const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
export const lerp = (a, b, u) => a + (b - a) * u;
export const hash = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

export function makeBeatTiming(tl) {
  const B = {}; tl.beats.forEach(b => (B[b.id] = b));
  const S = id => B[id].start, E = id => B[id].next, END = id => B[id].end;
  // time a spoken phrase starts: character fraction mapped onto the voiced (non-pause) part of the beat when timeline.json has segs
  const W = (id, phrase) => {
    const b = B[id], i = b.vo.toLowerCase().indexOf(phrase.toLowerCase());
    if (i < 0) throw new Error("phrase not found: " + phrase);
    if (b.sents && b.sents.length) { const x = b.sents.find(q => i < q.c1) || b.sents[b.sents.length - 1]; return x.s + (x.e - x.s) * clamp((i - x.c0) / Math.max(1, x.c1 - x.c0)); }
    return b.start + (b.end - b.start) * i / b.vo.length;
  };
  const DUR = tl.duration;
  return { B, S, E, END, W, DUR };
}
