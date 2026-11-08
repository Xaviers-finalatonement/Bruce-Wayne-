// Onion + knife + droplet-spray building blocks (Pan Theory ep02). Procedural, deterministic, no assets. ES module over three.js 0.169.
// mkOnion(cutUp): half onion (papery skin, root tuft, dry neck; cut face with nested translucent layers), axis along world z.
// mkBlade / mkChef: steel blade with a real bevel (flat faces + polished bevel facets); mkRig: guillotine slider rig.
// makeSpray(noDepth): closed-form droplet system (pure function of t): glassy spheres + camera-facing specular glints.
import * as THREE from "three";
import { hash, lerp, clamp, smooth } from "./timing.js";
import { vn, roundBox } from "./kitchen.js";

const PI = Math.PI;
const cv = (w, h = w) => { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; };
const tx = (c, srgb = true) => { const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; };

// ---------------- onion ----------------
export const OL = 1.35, OR = 1.0, OH = 1.08; // half length, radius, depth of the half
export const prof = s => Math.pow(Math.max(0, 1 - s * s), .58) * (1 - .22 * Math.max(0, s)); // radius factor along the axis s in [-1,1]

function skinTex() {
  const W = 1024, H = 512, c = cv(W, H), x = c.getContext("2d"), g = x.createLinearGradient(0, 0, W, 0);
  g.addColorStop(0, "#8A5622"); g.addColorStop(.12, "#B4772F"); g.addColorStop(.5, "#D39A40"); g.addColorStop(.85, "#B87A30"); g.addColorStop(1, "#7A4C1E"); x.fillStyle = g; x.fillRect(0, 0, W, H);
  for (let i = 0; i < 520; i++) { const y = hash(i * 1.7) * H, dark = hash(i * 3.1) > .45, w = .5 + 2.6 * hash(i * 5.3), ph = hash(i * 7.7) * 6; x.strokeStyle = dark ? `rgba(92,52,16,${.05 + .16 * hash(i * 2.3)})` : `rgba(246,214,140,${.05 + .15 * hash(i * 2.9)})`; x.lineWidth = w; x.beginPath();
    const x0 = hash(i * 9.1) * W * .3, x1 = W - hash(i * 4.4) * W * .3; for (let k = 0; k <= 12; k++) { const xx = lerp(x0, x1, k / 12); const yy = y + Math.sin(k * .8 + ph) * 3.5 * hash(i); k ? x.lineTo(xx, yy) : x.moveTo(xx, yy); } x.stroke(); }
  for (let i = 0; i < 26; i++) { const px = hash(i * 13.3) * W, py = hash(i * 17.1) * H, r = 18 + 50 * hash(i * 3.3); const gg = x.createRadialGradient(px, py, 0, px, py, r); gg.addColorStop(0, "rgba(250,226,160,.26)"); gg.addColorStop(1, "rgba(250,226,160,0)"); x.fillStyle = gg; x.fillRect(px - r, py - r, 2 * r, 2 * r); }
  return c;
}
function cutCanvas() {
  const W = 768, Hh = 384, c = cv(W, Hh), x = c.getContext("2d"), im = x.createImageData(W, Hh), d = im.data, NL = 11;
  for (let py = 0; py < Hh; py++) for (let px = 0; px < W; px++) {
    const s = 2 * (px + .5) / W - 1, u = 2 * (py + .5) / Hh - 1, w = Math.abs(u) * prof(s); let lo = Math.abs(s), hi = 1;
    for (let k = 0; k < 13; k++) { const m = (lo + hi) / 2; if (m * prof(s / m) > w) hi = m; else lo = m; }
    const rho = (lo + hi) / 2, q = rho * NL, li = Math.floor(q), fr = q - li, n1 = hash(px * .73 + py * 1.9) - .5, fib = hash(li * 13 + Math.floor(s * 70)) - .5;
    let r, g, b;
    if (rho > .945) { const k = clamp((rho - .945) / .055); r = 190 - 40 * k; g = 128 - 30 * k; b = 54 - 14 * k; }
    else {
      const alt = (li % 2) ? 1 : 0; r = 232 - 18 * alt; g = 236 - 10 * alt; b = 196 - 6 * alt; // translucent cream with a green-white cast
      const line = Math.exp(-Math.pow((fr - .03) / .05, 2)), hi_ = Math.exp(-Math.pow((fr - .16) / .07, 2)), edgeL = smooth((fr - .75) / .25) * .25;
      r = r - 86 * line + 12 * hi_ - 26 * edgeL; g = g - 80 * line + 8 * hi_ - 24 * edgeL; b = b - 150 * line + 6 * hi_ - 48 * edgeL;
      r += fib * 10; g += fib * 9; b += fib * 12;
      if (rho < .1) { const k = 1 - rho / .1; r = r - 14 * k; g = g - 10 * k; b = b - 26 * k; }
    }
    const sh = 1 + n1 * .045, o = (py * W + px) * 4; d[o] = r * sh; d[o + 1] = g * sh; d[o + 2] = b * sh; d[o + 3] = 255;
  }
  x.putImageData(im, 0, 0); return c;
}
let _skin, _cut;
export function mkOnion(cutUp, seed = 1) {
  const g = new THREE.Group(), inn = new THREE.Group(); g.add(inn); g.userData.inn = inn;
  _skin = _skin || skinTex(); _cut = _cut || cutCanvas();
  const st = tx(_skin), sb = tx(_skin, false), ct = tx(_cut), cb = tx(_cut, false);
  const NS = 56, NT = 28, pos = [], uv = [], idx = [];
  for (let i = 0; i <= NS; i++) { const s = -1 + 2 * i / NS, r = prof(s); for (let j = 0; j <= NT; j++) { const th = PI * j / NT;
    const lump = 1 + .035 * vn(s * 2.6 + seed, th * 1.1, 1.7) + .012 * vn(s * 9, th * 3, 4.1), pinch = Math.max(0, Math.abs(s) - .86) * .0;
    pos.push(s * OL, -OH * r * Math.sin(th) * lump, OR * r * Math.cos(th) * lump + pinch); uv.push((s + 1) / 2, j / NT); } }
  for (let i = 0; i < NS; i++) for (let j = 0; j < NT; j++) { const a = i * (NT + 1) + j, b = a + NT + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
  const bg = new THREE.BufferGeometry(); bg.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); bg.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); bg.setIndex(idx); bg.computeVertexNormals();
  const body = new THREE.Mesh(bg, new THREE.MeshPhysicalMaterial({ map: st, bumpMap: sb, bumpScale: 1.4, roughness: .5, clearcoat: .22, clearcoatRoughness: .45, sheen: .4, sheenColor: new THREE.Color("#F2D49A"), side: THREE.DoubleSide, envMapIntensity: .9 }));
  const NU = 22, cp = [], cu = [], ci = [];
  for (let i = 0; i <= 64; i++) { const s = -1 + 2 * i / 64, r = prof(s); for (let j = 0; j <= NU; j++) { const u = -1 + 2 * j / NU; cp.push(s * OL, .012 * (1 - u * u) * (1 - s * s), u * OR * r); cu.push((s + 1) / 2, 1 - (u + 1) / 2); } }
  for (let i = 0; i < 64; i++) for (let j = 0; j < NU; j++) { const a = i * (NU + 1) + j, b = a + NU + 1; ci.push(a, a + 1, b, b, a + 1, b + 1); }
  const cg = new THREE.BufferGeometry(); cg.setAttribute("position", new THREE.Float32BufferAttribute(cp, 3)); cg.setAttribute("uv", new THREE.Float32BufferAttribute(cu, 2)); cg.setIndex(ci); cg.computeVertexNormals();
  const cut = new THREE.Mesh(cg, new THREE.MeshPhysicalMaterial({ map: ct, bumpMap: cb, bumpScale: 1.2, roughness: .3, clearcoat: .75, clearcoatRoughness: .18, emissive: "#E8E3B8", emissiveMap: ct, emissiveIntensity: .03, side: THREE.DoubleSide, envMapIntensity: .8 }));
  inn.add(body, cut);
  // dry neck (papery, striped) at +s, root disc + whiskers at -s
  const neck = new THREE.Mesh(new THREE.ConeGeometry(.1, .34, 10, 1, true), new THREE.MeshStandardMaterial({ map: st, color: "#E0B168", roughness: .6, side: THREE.DoubleSide })); neck.rotation.z = -PI / 2 + .05; neck.position.set(OL + .12, -.02, 0); inn.add(neck);
  const rootM = new THREE.MeshStandardMaterial({ color: "#C7A878", roughness: .8 }); const rd = new THREE.Mesh(new THREE.CylinderGeometry(.17, .15, .06, 14), new THREE.MeshStandardMaterial({ color: "#7A5326", roughness: .7 })); rd.rotation.z = PI / 2; rd.position.set(-OL + .01, -.04, 0); inn.add(rd);
  for (let i = 0; i < 14; i++) { const a = hash(i * 3.3 + seed) * 6.28, ln = .16 + .2 * hash(i * 5.1), w = new THREE.Mesh(new THREE.CylinderGeometry(.006, .012, ln, 4), rootM); w.position.set(-OL - ln * .4, -.04 + Math.cos(a) * .1, Math.sin(a) * .1); w.rotation.set(0, 0, PI / 2 + (hash(i) - .5) * .5); w.rotation.y = a * .2; inn.add(w); }
  inn.rotation.x = cutUp ? 0 : PI; g.rotation.y = PI / 2; g.position.y = cutUp ? OH : 0;
  g.traverse(m => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
  return g;
}

// ---------------- steel blades ----------------
let _brush;
function brushTex() { if (_brush) return _brush; const c = cv(256, 256), x = c.getContext("2d"); x.fillStyle = "#888"; x.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 700; i++) { const y = hash(i * 1.3) * 256, v = 120 + 90 * hash(i * 2.9); x.strokeStyle = `rgba(${v},${v},${v},${.12 + .25 * hash(i * 4.1)})`; x.lineWidth = .6 + hash(i * 6.1) * 1.2; x.beginPath(); x.moveTo(0, y); x.lineTo(256, y + (hash(i) - .5) * 3); x.stroke(); }
  _brush = tx(c, false); _brush.wrapS = _brush.wrapT = THREE.RepeatWrapping; return _brush; }
// blade lies in x (length) and y (height, edge at the low side), thickness along z. tip>0: chef's-knife point over the last `tip` fraction.
export function bladeGeos({ L = 2.6, H = 1.5, t = .07, tE = .004, bev = .2, tip = 0, N = 44 } = {}) {
  const fl = [], bv = [], ring = i => { const u = i / N, tp = tip ? Math.pow(smooth((u - (1 - tip)) / tip), 1.6) : 0, yE = H * .55 * tp * tp, ySp = H - H * .45 * tp, yb = Math.min(yE + bev, ySp - .02), x = L * u;
    return [[x, ySp, t / 2], [x, yb, t * .4], [x, yE, tE / 2], [x, yE, -tE / 2], [x, yb, -t * .4], [x, ySp, -t / 2]]; };
  let R0 = ring(0);
  for (let i = 1; i <= N; i++) { const R1 = ring(i); for (let j = 0; j < 6; j++) { const a = R0[j], b = R1[j], c = R1[(j + 1) % 6], d = R0[(j + 1) % 6], arr = (j === 1 || j === 2 || j === 3) ? bv : fl; arr.push(...a, ...b, ...c, ...a, ...c, ...d); } R0 = R1; }
  const mk = a => { const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(a, 3)); g.computeVertexNormals(); return g; };
  const bs = brushTex(); const gF = mk(fl); const p = gF.attributes.position, uv = new Float32Array(p.count * 2); for (let i = 0; i < p.count; i++) { uv[i * 2] = p.getX(i) * .6; uv[i * 2 + 1] = p.getY(i) * .6; } gF.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  return { flat: gF, bevel: mk(bv), bs };
}
export function mkBlade(o = {}, blunt = false) {
  const { flat, bevel, bs } = bladeGeos(o), g = new THREE.Group();
  const mf = new THREE.MeshStandardMaterial({ color: "#D6DADF", metalness: .95, roughness: .3, roughnessMap: bs, bumpMap: bs, bumpScale: .15, envMapIntensity: 3.4, side: THREE.DoubleSide });
  const mb = new THREE.MeshStandardMaterial({ color: blunt ? "#8E949B" : "#F4F6F8", metalness: 1, roughness: blunt ? .42 : .13, envMapIntensity: blunt ? 2.2 : 4.2, side: THREE.DoubleSide });
  const a = new THREE.Mesh(flat, mf), b = new THREE.Mesh(bevel, mb); a.castShadow = b.castShadow = true; g.add(a, b); g.userData = { L: o.L || 2.6, H: o.H || 1.5 }; return g;
}
export function mkChef(sharp = true) { // chef's knife: blade along +x (edge down, y), handle toward -x
  const g = new THREE.Group(), bl = mkBlade({ L: 3.2, H: 1.0, t: .06, tE: .004, bev: .16, tip: .3 }, !sharp); g.add(bl);
  const hm = new THREE.MeshPhysicalMaterial({ color: "#2B2420", roughness: .42, clearcoat: .35, clearcoatRoughness: .4 }), hd = new THREE.Mesh(roundBox(1.45, .2, .17, .07, 5), hm); hd.position.set(-.68, .84, 0); hd.castShadow = true; g.add(hd);
  const bol = new THREE.Mesh(new THREE.CylinderGeometry(.115, .115, .14, 20), new THREE.MeshStandardMaterial({ color: "#C9CED4", metalness: 1, roughness: .3 })); bol.rotation.x = PI / 2; bol.position.set(-.02, .86, 0); g.add(bol);
  for (let i = 0; i < 3; i++) { const rv = new THREE.Mesh(new THREE.CylinderGeometry(.03, .03, .19, 10), new THREE.MeshStandardMaterial({ color: "#C8A05A", metalness: 1, roughness: .3 })); rv.rotation.x = PI / 2; rv.position.set(-.35 - i * .42, .84, 0); g.add(rv); }
  return g;
}
// guillotine rig: base plate, two posts behind the onion (x = -2.2), a carriage that holds the blade. carr.position.y = blade edge height.
export function mkRig({ blunt = false, base = true, L = 2.7 } = {}) {
  const g = new THREE.Group(), steel = new THREE.MeshStandardMaterial({ color: "#C4C9CF", metalness: .95, roughness: .34, roughnessMap: brushTex(), envMapIntensity: 3.2 }), anod = new THREE.MeshStandardMaterial({ color: "#4A4F55", metalness: .6, roughness: .42, envMapIntensity: 2 });
  const add = (m, par = g) => { m.castShadow = m.receiveShadow = true; par.add(m); return m; };
  if (base) { const bp = add(new THREE.Mesh(roundBox(5.4, .14, 4.8, .035, 3), steel)); bp.position.set(-.8, .07, 0); }
  [-1, 1].forEach(s => { const p = add(new THREE.Mesh(new THREE.CylinderGeometry(.07, .07, 8.6, 16), steel)); p.position.set(-2.2, 4.4, s * (L / 2 + .3)); const f = add(new THREE.Mesh(new THREE.CylinderGeometry(.2, .22, .1, 20), anod)); f.position.set(-2.2, .17, s * (L / 2 + .3)); });
  const carr = new THREE.Group(); g.add(carr);
  const bar = add(new THREE.Mesh(roundBox(.26, .3, L + .6, .04, 3), anod), carr); bar.position.set(-2.2, 1.62, 0);
  [-1, 1].forEach(s => { const bk = add(new THREE.Mesh(roundBox(.4, .6, .3, .05, 3), anod), carr); bk.position.set(-2.2, 1.62, s * (L / 2 + .3)); });
  const arm = add(new THREE.Mesh(roundBox(2.2, .24, .7, .04, 3), steel), carr); arm.position.set(-1.1, 1.62, 0);
  const cl = add(new THREE.Mesh(roundBox(.28, .5, 1.2, .04, 3), anod), carr); cl.position.set(-.08, 1.5, 0);
  const bl = mkBlade({ L, H: 1.5, t: .07, tE: blunt ? .05 : .004, bev: blunt ? .1 : .22 }, blunt); bl.position.set(0, 0, 0); const holder = new THREE.Group(); holder.rotation.y = PI / 2; bl.position.x = -L / 2; holder.add(bl); holder.position.x = -.02; carr.add(holder);
  return { g, carr };
}

// ---------------- droplet spray ----------------
export function glintTex() { const c = cv(64), x = c.getContext("2d"), g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, "rgba(255,255,255,1)"); g.addColorStop(.12, "rgba(255,250,235,.85)"); g.addColorStop(.4, "rgba(255,240,210,.12)"); g.addColorStop(1, "rgba(255,240,210,0)"); x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  x.fillStyle = "rgba(255,248,225,.5)"; x.fillRect(4, 31, 56, 2); x.fillRect(31, 4, 2, 56);
  return tx(c); }
export function makeSpray(cap, noDepth, camera) {
  const geo = new THREE.SphereGeometry(1, 7, 5), mat = new THREE.MeshPhysicalMaterial({ color: "#F3F0E2", roughness: .03, metalness: 0, transparent: true, opacity: .42, clearcoat: 1, clearcoatRoughness: .02, envMapIntensity: 5, ior: 1.34, emissive: "#FFE9B8", emissiveIntensity: .05 });
  const im = new THREE.InstancedMesh(geo, mat, cap); im.frustumCulled = false; im.count = 0;
  const gq = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: glintTex(), color: "#FFF3D2", transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }), cap); gq.frustumCulled = false; gq.count = 0; noDepth.push(gq);
  const g = new THREE.Group(); g.add(im, gq); const D = [], M = new THREE.Matrix4(), Q = new THREE.Quaternion(), P = new THREE.Vector3(), S = new THREE.Vector3(), Z = new THREE.Matrix4().makeScale(0, 0, 0);
  const sp = { g, D, im, gq, bursts: [] };
  sp.burst = o => { // o: t0 n org(i,r)->[x,y,z] vel(i,r)->[x,y,z] s0 s1 pow dt k g life seed gy
    const r0 = o.seed || 1; for (let i = 0; i < o.n && D.length < cap; i++) { const r = k => hash(r0 * 131.7 + i * 7.13 + k * 3.71), org = o.org(i, r), v = o.vel(i, r);
      D.push({ t0: o.t0 + (o.dt == null ? .06 : o.dt) * r(5), p: org, v, s: o.s0 + (o.s1 - o.s0) * Math.pow(r(9), o.pow || 2.2), k: o.k || .25, g: o.g == null ? 2.4 : o.g, life: o.life || 2.6, tw: r(11) * 6.28, gl: r(13) > .55 ? 1 : 0, gy: o.gy == null ? -1e9 : o.gy, f: 2.5 + 5 * r(15) }); } };
  sp.pos = (d, tau, out) => { const k = d.k, e = (1 - Math.exp(-k * tau)) / k; return out.set(d.p[0] + d.v[0] * e, d.p[1] + d.v[1] * e - .5 * d.g * tau * tau, d.p[2] + d.v[2] * e); };
  sp.update = t => {
    let end = 0; const cq = camera.quaternion;
    for (let i = 0; i < D.length; i++) { const d = D[i], tau = t - d.t0; if (tau < 0 || tau > d.life) { im.setMatrixAt(i, Z); gq.setMatrixAt(i, Z); continue; }
      sp.pos(d, tau, P); let sc = d.s * smooth(tau / .05) * (1 - smooth((tau - d.life + .3) / .3)); if (P.y < d.gy) { sc *= clamp(1 - (d.gy - P.y) / .12); P.y = Math.max(P.y, d.gy - .06); }
      end = i + 1; S.set(sc, sc, sc); M.compose(P, Q.identity(), S); im.setMatrixAt(i, M);
      const tw = d.gl ? Math.pow(Math.max(0, Math.sin(tau * d.f + d.tw)), 22) : 0, gs = sc * (1.6 + 6.5 * tw); S.set(gs, gs, gs); M.compose(P, cq, S); gq.setMatrixAt(i, tw > .02 ? M : Z); }
    im.count = gq.count = end; im.instanceMatrix.needsUpdate = gq.instanceMatrix.needsUpdate = true; };
  return sp;
}
