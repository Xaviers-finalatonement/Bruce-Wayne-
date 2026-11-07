// Eased camera paths + impact shake. Keys: {t, p:[x,y,z], l:[x,y,z] (look-at), f (focal length mm, 36 mm sensor height), fp (focus point), ap (aperture)}.
import * as THREE from "three";
import { eio, lerp, hash } from "./timing.js";

export function evalPath(path, t) {
  let i = 0; for (let k = 0; k < path.length; k++) if (path[k].t <= t) i = k; const a = path[i], b = path[Math.min(i + 1, path.length - 1)];
  const u = b === a ? 0 : eio((t - a.t) / (b.t - a.t)), L = (x, y) => x.map((v, j) => lerp(v, y[j], u));
  return { p: L(a.p, b.p), l: L(a.l, b.l), f: lerp(a.f, b.f, u), fp: L(a.fp, b.fp), ap: lerp(a.ap, b.ap, u) };
}
export function shakeAt(shakes, t) { let x = 0, y = 0; for (const [t0, amp, dur] of shakes) { const d = t - t0; if (d < 0 || d > dur) continue; const k = Math.pow(1 - d / dur, 2) * amp, f = Math.floor(d * 60); x += (hash(f * 3 + t0 * 7) - .5) * 2 * k; y += (hash(f * 5 + t0 * 11) - .5) * 2 * k; } return [x, y]; }

// Place the camera for time t from a path; adds a tiny natural drift; sets focus for the Bokeh pass.
export function applyCamera(camera, bokeh, path, t) {
  const c = evalPath(path, t), dr = [Math.sin(t * .7) * .012, Math.cos(t * .53) * .009];
  camera.position.set(c.p[0] + dr[0], c.p[1] + dr[1], c.p[2]); camera.lookAt(c.l[0], c.l[1], c.l[2]);
  camera.fov = 2 * Math.atan(18 / c.f) * 180 / Math.PI; camera.updateProjectionMatrix(); camera.updateMatrixWorld(true);
  bokeh.uniforms.focus.value = camera.position.distanceTo(new THREE.Vector3(...c.fp)); bokeh.uniforms.aperture.value = c.ap; bokeh.uniforms.maxblur.value = .014;
}
