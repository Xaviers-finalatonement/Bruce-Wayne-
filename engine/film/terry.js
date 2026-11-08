// engine/film/terry.js: closed-loop terry geometry shared by film episodes.
// loopArchGeo: one terry loop = an upright arch of 2-ply twisted yarn; BOTH feet end below the ground plane (z < 0), so nothing floats.
// Local frame: x = foot to foot, y = across the arch, z = up (away from the ground cloth). Vertex colours carry a baked contact-AO (dark at the feet).
import * as THREE from "three";
export function loopArchGeo({ plies = 2, segs = 18, radial = 5, hw = .0013, hh = .0027, depth = .0014, rp = .00026, rt = .00037, twist = 3.2, aoMin = .38, shoulder = .8 } = {}) {
  const pos = [], nor = [], idx = [], cl = [];
  for (let p = 0; p < plies; p++) {
    const base = pos.length / 3;
    for (let s = 0; s <= segs; s++) {
      const th = Math.PI * s / segs, st = Math.max(0, Math.sin(th)), z0 = -depth + (hh + depth) * Math.pow(st, shoulder);
      const c = new THREE.Vector3(-hw * Math.cos(th), 0, z0), e = 1e-3, th2 = Math.min(Math.PI, th + e), th1 = Math.max(0, th - e);
      const c2 = new THREE.Vector3(-hw * Math.cos(th2), 0, -depth + (hh + depth) * Math.pow(Math.max(0, Math.sin(th2)), shoulder)), c1 = new THREE.Vector3(-hw * Math.cos(th1), 0, -depth + (hh + depth) * Math.pow(Math.max(0, Math.sin(th1)), shoulder));
      const Tg = c2.sub(c1).normalize(), N = new THREE.Vector3(0, 1, 0), B = Tg.clone().cross(N).normalize();
      const ph = p * 2 * Math.PI / plies + th * twist, C0 = plies > 1 ? c.clone().addScaledVector(N, rp * Math.cos(ph)).addScaledVector(B, rp * Math.sin(ph)) : c;
      const rr = rt * (1 - .25 * (1 - st));
      for (let a = 0; a < radial; a++) {
        const aa = a / radial * 6.2832, d = N.clone().multiplyScalar(Math.cos(aa)).addScaledVector(B, Math.sin(aa));
        pos.push(C0.x + rr * d.x, C0.y + rr * d.y, C0.z + rr * d.z); nor.push(d.x, d.y, d.z);
        const h = (C0.z + rr * d.z) / hh, ao = aoMin + (1 - aoMin) * Math.min(1, Math.max(0, h * 1.25)) * (.82 + .18 * Math.max(0, d.z)); cl.push(ao, ao * .985, ao * .96);
      }
    }
    for (let s = 0; s < segs; s++) for (let a = 0; a < radial; a++) { const i0 = base + s * radial + a, i1 = base + s * radial + (a + 1) % radial, i2 = i0 + radial, i3 = i1 + radial; idx.push(i0, i2, i1, i1, i2, i3); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3)); g.setAttribute("color", new THREE.Float32BufferAttribute(cl, 3)); g.setIndex(idx); return g;
}
// fine tapered curved fibre (fuzz / vellus hair): grows along +y, tip bends along +x
export function fibreGeo(len, r, bend, S = 4, sides = 3) {
  const pos = [], idx = [], nor = [];
  for (let k = 0; k <= S; k++) { const t = k / S, cx = bend * len * t * t, cy = len * t, rr = r * (1 - .85 * t); for (let a = 0; a < sides; a++) { const an = a / sides * 6.2832; pos.push(cx + Math.cos(an) * rr, cy, Math.sin(an) * rr); nor.push(Math.cos(an), 0, Math.sin(an)); } }
  for (let k = 0; k < S; k++) for (let a = 0; a < sides; a++) { const i0 = k * sides + a, i1 = k * sides + (a + 1) % sides; idx.push(i0, i0 + sides, i1, i1, i0 + sides, i1 + sides); }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3)); g.setIndex(idx); return g;
}
// centre point + outward unit normal of the arch's yarn at parameter t in (0,1) (local loop frame), used to plant fuzz on the yarn
export function archPoint(t, { hw = .0013, hh = .0027, depth = .0014, shoulder = .8 } = {}) {
  const th = Math.PI * t, st = Math.sin(th), p = new THREE.Vector3(-hw * Math.cos(th), 0, -depth + (hh + depth) * Math.pow(st, shoulder));
  const tg = new THREE.Vector3(hw * Math.sin(th), 0, (hh + depth) * shoulder * Math.pow(Math.max(1e-3, st), shoulder - 1) * Math.cos(th)).normalize();
  return { p, tg, nrm: new THREE.Vector3(-tg.z, 0, tg.x) };
}
