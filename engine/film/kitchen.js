// Kitchen / food building blocks (Pan Theory look): chunky matte vegetables from displaced geometry, cast-iron pan, stone counter,
// wood board, letter tiles, warm window environment. All deterministic (seeded), no assets. ES module over three.js 0.169.
import * as THREE from "three";
import { hash, lerp, clamp, smooth } from "./timing.js";

// ---------- noise + geometry helpers ----------
export const vn = (x, y, z) => { // smooth 3D value noise in [-1, 1]
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z), s = t => t * t * (3 - 2 * t), a = s(x - xi), b = s(y - yi), c = s(z - zi);
  const h = (i, j, k) => hash(i * 12.9898 + j * 78.233 + k * 37.719) * 2 - 1, l = (p, q, r) => p + (q - p) * r;
  return l(l(l(h(xi, yi, zi), h(xi + 1, yi, zi), a), l(h(xi, yi + 1, zi), h(xi + 1, yi + 1, zi), a), b), l(l(h(xi, yi, zi + 1), h(xi + 1, yi, zi + 1), a), l(h(xi, yi + 1, zi + 1), h(xi + 1, yi + 1, zi + 1), a), b), c);
};
export function mapVerts(geo, fn) { const p = geo.attributes.position; for (let i = 0; i < p.count; i++) { const r = fn(p.getX(i), p.getY(i), p.getZ(i), i); p.setXYZ(i, r[0], r[1], r[2]); } p.needsUpdate = true; return geo; }
export function colorize(geo, fn) { // fn(color, x, y, z, nx, ny, nz) writes into color (linear working space)
  const p = geo.attributes.position, n = geo.attributes.normal, c = new Float32Array(p.count * 3), col = new THREE.Color();
  for (let i = 0; i < p.count; i++) { fn(col, p.getX(i), p.getY(i), p.getZ(i), n.getX(i), n.getY(i), n.getZ(i)); c[i * 3] = col.r; c[i * 3 + 1] = col.g; c[i * 3 + 2] = col.b; }
  geo.setAttribute("color", new THREE.BufferAttribute(c, 3)); return geo;
}
export function merge(geos) { // concatenate non-indexed geometries (position, normal, color)
  const gs = geos.map(g => (g.index ? g.toNonIndexed() : g)); let n = 0; gs.forEach(g => (n += g.attributes.position.count));
  const P = new Float32Array(n * 3), N = new Float32Array(n * 3), C = new Float32Array(n * 3); let o = 0;
  gs.forEach(g => { P.set(g.attributes.position.array, o * 3); N.set(g.attributes.normal.array, o * 3); if (g.attributes.color) C.set(g.attributes.color.array, o * 3); else C.fill(1, o * 3, (o + g.attributes.position.count) * 3); o += g.attributes.position.count; });
  const r = new THREE.BufferGeometry(); r.setAttribute("position", new THREE.BufferAttribute(P, 3)); r.setAttribute("normal", new THREE.BufferAttribute(N, 3)); r.setAttribute("color", new THREE.BufferAttribute(C, 3)); return r;
}
const xf = (g, p, rot, s) => { g.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(...p), new THREE.Quaternion().setFromEuler(new THREE.Euler(...(rot || [0, 0, 0]))), new THREE.Vector3(...(s || [1, 1, 1])))); return g; };
export function roundBox(w, h, d, r, seg = 5) { // box with rounded edges (push vertices out from the inner box)
  const g = new THREE.BoxGeometry(w, h, d, seg, seg, seg), ix = w / 2 - r, iy = h / 2 - r, iz = d / 2 - r, v = new THREE.Vector3(), q = new THREE.Vector3();
  mapVerts(g, (x, y, z) => { q.set(clamp(x, -ix, ix), clamp(y, -iy, iy), clamp(z, -iz, iz)); v.set(x, y, z).sub(q); if (v.lengthSq() > 1e-9) v.normalize().multiplyScalar(r); return [q.x + v.x, q.y + v.y, q.z + v.z]; });
  g.computeVertexNormals(); return g;
}
const C_ = hex => new THREE.Color(hex);

// ---------- vegetables ----------
export function makeCoin(seed = 0, R = .3, T = .07) { // carrot coin: lathe, wobbly rim, pale core + darker ring
  const k = R / .3, pts = [new THREE.Vector2(0, -T)];
  [.06, .12, .18, .24].forEach(r => pts.push(new THREE.Vector2(r * k, -T)));
  for (let a = 0; a <= 8; a++) { const th = a / 8 * Math.PI; pts.push(new THREE.Vector2((.26 + .04 * Math.sin(th)) * k, -T * Math.cos(th))); }
  [.22, .19, .16, .13, .10, .07, .04, 0].forEach(r => pts.push(new THREE.Vector2(r * k, T)));
  const g = new THREE.LatheGeometry(pts, 40);
  mapVerts(g, (x, y, z) => { const r = Math.hypot(x, z), an = Math.atan2(z, x), w = 1 + .05 * vn(Math.cos(an) * 1.6 + seed * 7, Math.sin(an) * 1.6, seed * 3.1) + .02 * vn(Math.cos(an) * 4 + seed, Math.sin(an) * 4, 2.2);
    return [x * w, y + (y > 0 ? .02 : .008) * vn(x * 5 + seed, 1.3, z * 5) - (y > 0 ? .012 * (1 - Math.min(1, r / R) ** 2) : 0), z * w]; });
  g.computeVertexNormals();
  const cx = C_("#F2892A"), core = C_("#F8B866"), ring = C_("#DB6A14"), edge = C_("#D96F1C");
  colorize(g, (c, x, y, z, nx, ny) => { const r = Math.hypot(x, z) / k, an = Math.atan2(z, x);
    if (ny < .55 || y < 0) c.copy(edge); else { c.copy(cx); const streak = .5 + .5 * vn(an * 3 + seed, r * 12, 1.7); c.lerp(core, smooth((.17 - r) / .05) * .95); c.lerp(ring, Math.exp(-Math.pow((r - .205) / .018, 2)) * .85); c.multiplyScalar(.94 + .06 * streak); } });
  return g;
}
export function makeStrip(seed = 0, L = 1.15, W = .27) { // bell-pepper strip: curved, lens cross-section, skin outside / pale flesh inside
  const g = new THREE.BoxGeometry(W, .09, L, 3, 2, 18), hw = W / 2, bend = .5 + .5 * hash(seed), tw = (hash(seed * 3) - .5) * .5;
  const skin = C_("#C22A18"), skin2 = C_("#D2401F"), flesh = C_("#F2D79A");
  colorize(g, (c, x, y, z, nx, ny) => { if (ny > .5) c.copy(skin).lerp(skin2, .5 + .5 * vn(x * 6 + seed, z * 3, 0)); else if (ny < -.5) c.copy(flesh); else c.copy(skin).lerp(flesh, .5); });
  mapVerts(g, (x, y, z) => { const zn = z / (L / 2), ang = tw * zn; let xx = x * Math.cos(ang) - y * Math.sin(ang), yy = x * Math.sin(ang) + y * Math.cos(ang);
    yy *= 1 - .3 * (x / hw) ** 2; yy += -.12 * bend * zn * zn + .05 * (1 - (x / hw) ** 2) * .5 + .012 * vn(x * 5, z * 4, seed); xx += .02 * vn(z * 3 + seed, 4, 0);
    return [xx, yy, z * (1 + .03 * vn(x * 4, z, seed))]; });
  g.computeVertexNormals(); return g;
}
export function makeLeaf(seed = 0, L = .95, Wd = .74) { // spinach leaf: cupped, ruffled, double sided, light midrib
  const g = new THREE.PlaneGeometry(1, 1, 8, 14), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const u = p.getX(i) * 2, v = p.getY(i) + .5; // u -1..1, v 0..1
    const hwv = .5 * Wd * Math.pow(Math.sin(Math.PI * Math.pow(v, .72)), .85) + .015, x = u * hwv, z = (v - .5) * L;
    const y = .11 * u * u * Math.sin(Math.PI * v) + .07 * Math.sin(v * 2.4) + .04 * vn(x * 7 + seed, z * 7, seed) * (Math.abs(u) + .3) - .03 * (1 - v);
    p.setXYZ(i, x, y, z); }
  g.computeVertexNormals();
  const dark = C_("#2C6A2B"), mid = C_("#3A7235"), rib = C_("#8DB866");
  colorize(g, (c, x, y, z) => { const u = Math.abs(x) / (.5 * Wd), v = z / L + .5; c.copy(dark).lerp(mid, .5 + .5 * vn(x * 5, z * 5, seed)); c.lerp(rib, Math.exp(-Math.pow(Math.abs(x) / .018, 2)) * .8 * (1 - v * .6)); c.multiplyScalar(.9 + .2 * y * 4); });
  return g;
}
export function makeFloret(seed = 0) { // broccoli: pale stem + branches, dark bumpy crown of buds
  const parts = [], stem = C_("#9DBE6E"), stemL = C_("#C4D98F"), dk = C_("#2B5E2A"), lt = C_("#5E9A3C");
  const cyl = (r0, r1, h, pos, rot) => { const g = new THREE.CylinderGeometry(r1, r0, h, 10, 1); xf(g, pos, rot); colorize(g, (c, x, y) => c.copy(stem).lerp(stemL, .5 + .5 * vn(x * 8, y * 4, seed))); parts.push(g); };
  cyl(.13, .09, .42, [0, .21, 0], [0, 0, 0]);
  const nb = 5; for (let i = 0; i < nb; i++) { const a = i / nb * 6.283 + hash(seed + i) * .5, tilt = .6 + .2 * hash(seed * 2 + i); cyl(.07, .045, .34, [Math.cos(a) * .12, .5, Math.sin(a) * .12], [Math.sin(a) * tilt, 0, -Math.cos(a) * tilt]); }
  for (let i = 0; i < 17; i++) { const a = hash(seed * 5 + i) * 6.283, el = Math.acos(1 - hash(seed * 7 + i) * .9), R = .3, g = new THREE.IcosahedronGeometry(.1 + .05 * hash(seed + i * 3), 3), pc = [Math.sin(el) * Math.cos(a) * R, .66 + Math.cos(el) * R * .62, Math.sin(el) * Math.sin(a) * R];
    mapVerts(g, (x, y, z) => { const s = 1 + .22 * vn(x * 26 + i, y * 26, z * 26) + .08 * vn(x * 70, y * 70, z * 70); return [x * s, y * s, z * s]; }); xf(g, pc); g.computeVertexNormals();
    colorize(g, (c, x, y) => c.copy(dk).lerp(lt, clamp((y - .55) * 1.6 + .5 * vn(x * 30, y * 30, i)) * .8)); parts.push(g); }
  const m = merge(parts); m.computeVertexNormals(); return m;
}
export function makePepper(seed = 0, cooked = false) { // whole bell pepper from above: 4 lobes, dip at the top, stem
  const g = new THREE.SphereGeometry(.8, 56, 36), amp = cooked ? .09 : .02;
  mapVerts(g, (x, y, z) => { const an = Math.atan2(z, x), r = Math.hypot(x, z), lobe = .9 + .1 * Math.abs(Math.cos(2 * an + .4)), yy = y * (cooked ? .72 : .86), top = y > .55 ? -.22 * smooth((y - .55) / .25) * .9 : 0;
    const w = 1 + amp * vn(x * 5 + seed, y * 5, z * 5) + (cooked ? .05 * vn(x * 14, y * 14, z * 14) : 0); return [x * lobe * w, yy + top, z * lobe * w]; });
  g.computeVertexNormals();
  const a = cooked ? C_("#A7301C") : C_("#C8301D"), b = cooked ? C_("#7E2415") : C_("#E04A27");
  colorize(g, (c, x, y, z) => c.copy(a).lerp(b, clamp(.5 + .6 * vn(x * 3 + seed, y * 3, z * 3))));
  const st = new THREE.CylinderGeometry(.07, .1, .3, 10, 3); mapVerts(st, (x, y, z) => [x + .05 * (y + .15) * (y + .15) * 3, y, z]); xf(st, [0, .64, 0], [.25, 0, .3]); colorize(st, c => c.set("#4F7D34"));
  const m = merge([g, st]); m.computeVertexNormals(); return m;
}
export function halfTomatoTex() { // cut face: flesh, jelly pockets with seeds, pale walls
  const c = document.createElement("canvas"); c.width = c.height = 256; const x = c.getContext("2d");
  const g = x.createRadialGradient(128, 128, 10, 128, 128, 126); g.addColorStop(0, "#E56C4E"); g.addColorStop(1, "#C23A24"); x.fillStyle = g; x.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 4; i++) { const a = i / 4 * 6.283 + .4; x.save(); x.translate(128 + Math.cos(a) * 52, 128 + Math.sin(a) * 52); x.rotate(a); x.fillStyle = "#F1A08A"; x.beginPath(); x.ellipse(0, 0, 46, 30, 0, 0, 6.3); x.fill(); x.fillStyle = "#F6D9A0";
    for (let s = 0; s < 9; s++) { x.beginPath(); x.ellipse(-20 + s * 6 + hash(s + i) * 4, (hash(s * 3 + i) - .5) * 30, 5, 3, hash(s) * 3, 0, 6.3); x.fill(); } x.restore(); }
  x.strokeStyle = "#F4B7A4"; x.lineWidth = 6; for (let i = 0; i < 4; i++) { const a = i / 4 * 6.283 + 1.18; x.beginPath(); x.moveTo(128, 128); x.lineTo(128 + Math.cos(a) * 110, 128 + Math.sin(a) * 110); x.stroke(); }
  x.beginPath(); x.arc(128, 128, 10, 0, 6.3); x.fillStyle = "#F4B7A4"; x.fill();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
export function makeHalfTomato() {
  const grp = new THREE.Group(), dome = new THREE.SphereGeometry(.6, 32, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
  mapVerts(dome, (x, y, z) => { const w = 1 + .02 * vn(x * 4, y * 4, z * 4); return [x * w, y * .8, z * w]; }); dome.computeVertexNormals();
  const skin = new THREE.Mesh(dome, new THREE.MeshStandardMaterial({ color: "#B53A25", roughness: .38, metalness: 0 })), cap = new THREE.Mesh(new THREE.CircleGeometry(.6, 40), new THREE.MeshStandardMaterial({ map: halfTomatoTex(), roughness: .32 }));
  cap.rotation.x = -Math.PI / 2; cap.position.y = .002; skin.castShadow = cap.receiveShadow = true; skin.castShadow = true; grp.add(skin, cap); grp.userData = { skin, cap }; return grp;
}

// ---------- pan ----------
export function makePan(R = 1.6, H = .44) { // cast-iron skillet, handle toward +z
  const pts = [[0, 0], [R * .75, 0], [R * .82, .02], [R * .93, .2], [R * .985, H * .8], [R, H], [R - .06, H + .005], [R - .09, H * .88], [R - .2, .2], [R - .36, .1], [R - .5, .095], [0, .095]].map(a => new THREE.Vector2(a[0], a[1]));
  const g = new THREE.LatheGeometry(pts, 72);
  const tex = (() => { const c = document.createElement("canvas"); c.width = c.height = 256; const x = c.getContext("2d"); x.fillStyle = "#808080"; x.fillRect(0, 0, 256, 256); const im = x.getImageData(0, 0, 256, 256);
    for (let i = 0; i < 256 * 256; i++) { const v = 128 + (hash(i * .37) - .5) * 70 + (hash(i * 1.7 + 4) - .5) * 40; im.data[i * 4] = im.data[i * 4 + 1] = im.data[i * 4 + 2] = v; } x.putImageData(im, 0, 0); const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(6, 3); return t; })();
  const mat = new THREE.MeshStandardMaterial({ color: "#2A2724", metalness: .85, roughness: .5, roughnessMap: tex, bumpMap: tex, bumpScale: .4 });
  const body = new THREE.Mesh(g, mat); body.castShadow = body.receiveShadow = true;
  const hg = roundBox(.34, .13, 1.55, .05); xf(hg, [0, H * .72, R + .62], [-.06, 0, 0]);
  const handle = new THREE.Mesh(hg, mat); handle.castShadow = true;
  const hole = new THREE.Mesh(new THREE.CylinderGeometry(.065, .065, .14, 14), new THREE.MeshStandardMaterial({ color: "#0E0D0C", roughness: .9 })); hole.position.set(0, H * .72 - .01, R + 1.2);
  const grp = new THREE.Group(); grp.add(body, handle, hole); grp.userData = { mat, R, H }; return grp;
}

// ---------- surfaces ----------
export function counterTex() {
  const S = 1024, c = document.createElement("canvas"); c.width = c.height = S; const x = c.getContext("2d");
  x.fillStyle = "#F7F1E6"; x.fillRect(0, 0, S, S);
  for (let i = 0; i < 70; i++) { const px = hash(i) * S, py = hash(i * 3) * S, r = 60 + hash(i * 5) * 180, g = x.createRadialGradient(px, py, 0, px, py, r); const w = hash(i * 7) > .5; g.addColorStop(0, w ? "rgba(255,252,244,.22)" : "rgba(196,170,132,.12)"); g.addColorStop(1, "rgba(255,255,255,0)"); x.fillStyle = g; x.fillRect(0, 0, S, S); }
  for (let i = 0; i < 6; i++) { x.strokeStyle = `rgba(190,165,130,${.05 + .04 * hash(i)})`; x.lineWidth = 1 + 3 * hash(i * 2); x.beginPath(); let px = hash(i * 9) * S, py = 0; x.moveTo(px, py); for (let s = 1; s <= 12; s++) { px += (hash(i * 31 + s) - .5) * 160; py = s / 12 * S; x.lineTo(px, py); } x.stroke(); }
  for (let i = 0; i < 9000; i++) { const dark = hash(i * 1.7) > .45; x.fillStyle = dark ? `rgba(120,98,70,${.05 + .18 * hash(i * 3)})` : `rgba(255,255,255,${.15 + .35 * hash(i * 3)})`; const r = .6 + 1.8 * hash(i * 5) ** 2; x.beginPath(); x.arc(hash(i) * S, hash(i * 11 + 1) * S, r, 0, 6.3); x.fill(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; return t;
}
export function woodTex() {
  const W = 512, c = document.createElement("canvas"); c.width = c.height = W; const x = c.getContext("2d"); x.fillStyle = "#C99B63"; x.fillRect(0, 0, W, W);
  for (let i = 0; i < 90; i++) { const px = hash(i) * W; x.strokeStyle = `rgba(${hash(i * 3) > .5 ? "110,70,35" : "235,200,150"},${.08 + .18 * hash(i * 2)})`; x.lineWidth = .8 + 3 * hash(i * 5); x.beginPath(); x.moveTo(px, 0); for (let s = 1; s <= 8; s++) x.lineTo(px + (hash(i * 7 + s) - .5) * 18, s / 8 * W); x.stroke(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}
export function makeCounter(size = 140) {
  const tex = counterTex(); tex.repeat.set(size / 6, size / 6);
  const bump = tex.clone(); bump.colorSpace = THREE.NoColorSpace; bump.needsUpdate = true;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshStandardMaterial({ map: tex, bumpMap: bump, bumpScale: .5, roughness: .62, metalness: 0 }));
  m.rotation.x = -Math.PI / 2; m.receiveShadow = true; return m;
}

// ---------- letter tiles (chunky) ----------
export function makeTile(letter, bg, fg, size = 1) {
  const c = document.createElement("canvas"); c.width = c.height = 256; const x = c.getContext("2d"); x.clearRect(0, 0, 256, 256);
  x.fillStyle = fg; x.font = `800 ${letter.length > 1 ? 150 : 190}px Rubik, sans-serif`; x.textAlign = "center"; x.textBaseline = "alphabetic"; const m = x.measureText(letter), h = m.actualBoundingBoxAscent; x.fillText(letter, 128, 128 + h / 2);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  const body = new THREE.Mesh(roundBox(1, .26, 1, .11, 5), new THREE.MeshStandardMaterial({ color: bg, roughness: .55, metalness: 0, emissive: bg, emissiveIntensity: 0 }));
  const lt = new THREE.Mesh(new THREE.PlaneGeometry(.78, .78), new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false })); lt.rotation.x = -Math.PI / 2; lt.position.y = .1305;
  body.castShadow = body.receiveShadow = true; const g = new THREE.Group(); g.add(body, lt); g.scale.setScalar(size);
  const base = new THREE.Color(bg), dim = new THREE.Color("#CDC3AF");
  g.userData = { body, lt, glow: v => (body.material.emissiveIntensity = v), dimTo: u => { body.material.color.copy(base).lerp(dim, u); body.material.emissive.copy(base).lerp(dim, u); lt.material.opacity = 1 - .62 * u; } };
  return g;
}

// ---------- warm window environment for reflections ----------
export function makeEnv(renderer) {
  const pm = new THREE.PMREMGenerator(renderer), s = new THREE.Scene(); s.background = new THREE.Color(0x5a4b3b);
  const panel = (col, k, p, sz) => { const m = new THREE.Mesh(new THREE.BoxGeometry(...sz), new THREE.MeshBasicMaterial({ color: new THREE.Color(col).multiplyScalar(k) })); m.position.set(...p); s.add(m); };
  panel(0xfff1dc, 16, [-9, 6, 1], [1, 9, 8]);   // big window camera-left
  panel(0xfff4e6, 7, [0, 11, 0], [14, 1, 14]);  // overhead soft box
  panel(0xffd9b0, 3, [9, 3, -3], [1, 6, 6]);    // warm bounce right
  panel(0xf7e6cb, 2.2, [0, -7, 0], [14, 1, 14]); // counter bounce
  const tx = pm.fromScene(s, .035).texture; pm.dispose(); return tx;
}
