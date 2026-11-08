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
  mapVerts(g, (x, y, z) => { const r = Math.hypot(x, z), an = Math.atan2(z, x), w = 1 + .08 * vn(Math.cos(an) * 1.6 + seed * 7, Math.sin(an) * 1.6, seed * 3.1) + .035 * vn(Math.cos(an) * 4 + seed, Math.sin(an) * 4, 2.2) + .012 * vn(Math.cos(an) * 11 + seed, Math.sin(an) * 11, 5.5);
    return [x * w, y + (y > 0 ? .03 : .01) * vn(x * 5 + seed, 1.3, z * 5) + (y > 0 ? .008 * vn(x * 22, 2.1, z * 22) : 0) - (y > 0 ? .012 * (1 - Math.min(1, r / R) ** 2) : 0), z * w]; });
  g.computeVertexNormals();
  const cx = C_("#F2892A"), core = C_("#F8B866"), ring = C_("#DB6A14"), edge = C_("#D96F1C");
  const caramel = C_("#9A4D14"), dkb = C_("#6E3410");
  colorize(g, (c, x, y, z, nx, ny) => { const r = Math.hypot(x, z) / k, an = Math.atan2(z, x);
    if (ny < .55 || y < 0) { c.copy(edge).lerp(caramel, clamp(.55 - y / T * .55 + .15 * vn(an * 5, 1, seed))); if (y < -T * .5) c.lerp(dkb, .5); }
    else { c.copy(cx); const fibre = vn(an * 16 + seed, r * 4, 1.7), streak = .5 + .5 * vn(an * 3 + seed, r * 12, 1.7);
      c.lerp(core, smooth((.17 - r) / .05) * .95); c.lerp(ring, Math.exp(-Math.pow((r - .205) / .016, 2)) * .9); c.lerp(ring, Math.exp(-Math.pow((r - .11) / .01, 2)) * .45); c.lerp(ring, Math.exp(-Math.pow((r - .255) / .02, 2)) * .5);
      c.multiplyScalar(.9 + .1 * streak + .09 * fibre * smooth((r - .06) / .1)); c.lerp(caramel, smooth((r - .21) / .06) * .35 + .12 * (.5 + .5 * vn(x * 9, 4, z * 9))); } });
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
  const mat = new THREE.MeshPhysicalMaterial({ color: "#24211F", metalness: .7, roughness: .6, roughnessMap: tex, bumpMap: tex, bumpScale: .9, clearcoat: .35, clearcoatRoughness: .42 });
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
  g.userData = { body, lt, glow: v => (body.material.emissiveIntensity = v), dimTo: u => { body.material.color.copy(base).lerp(dim, u * .6); body.material.emissive.copy(base).lerp(dim, u * .6); lt.material.opacity = 1 - .5 * u; } };
  return g;
}

// ---------- warm window environment for reflections ----------
export function makeEnv(renderer) {
  const pm = new THREE.PMREMGenerator(renderer), s = new THREE.Scene(); s.background = new THREE.Color(0x5a4b3b);
  const panel = (col, k, p, sz) => { const m = new THREE.Mesh(new THREE.BoxGeometry(...sz), new THREE.MeshBasicMaterial({ color: new THREE.Color(col).multiplyScalar(k) })); m.position.set(...p); s.add(m); };
  panel(0xfff1dc, 16, [-9, 6, 1], [1, 9, 8]);   // big window camera-left
  panel(0xfff4e6, 3.2, [0, 11, 0], [14, 1, 14]);  // overhead soft box
  panel(0xffd9b0, 3, [9, 3, -3], [1, 6, 6]);    // warm bounce right
  panel(0xf7e6cb, 2.2, [0, -7, 0], [14, 1, 14]); // counter bounce
  const tx = pm.fromScene(s, .035).texture; pm.dispose(); return tx;
}

// =====================================================================================================================
// v2 (round 2): matte, filmed-looking food. Cut-face carrot coins (textured, sear-able), cupped pepper strips with white pith,
// lobed bell peppers (raw / slumped + blistered), seasoned cast iron, wood-plank counter, ceramic plates, soft contact shadows,
// plant-cell textures (Voronoi) and gut-lining villi for the molecule worlds. Everything procedural + deterministic.
// =====================================================================================================================
const cv2 = (w, h = w) => { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; };
const tex2 = (c, srgb = true, rep) => { const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; if (rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep[0], rep[1]); } return t; };

// ---- carrot cut face: cortex, paler core, cambium ring, radial fibres, damp specks. mode: fresh | sear | bump
export function coinFaceTex(mode = "fresh") {
  const S = 512, c = cv2(S), x = c.getContext("2d"), m = S / 2; const bump = mode === "bump";
  x.fillStyle = bump ? "#808080" : "#C25E16"; x.fillRect(0, 0, S, S);
  const R = S * .43;
  if (!bump) {
    // rim gradient (skin edge) then the cut face
    const rim = x.createRadialGradient(m, m, R * .94, m, m, S * .5); rim.addColorStop(0, "#D96F1C"); rim.addColorStop(1, "#A8480F"); x.fillStyle = rim; x.fillRect(0, 0, S, S);
    const g = x.createRadialGradient(m, m, 0, m, m, R); g.addColorStop(0, mode === "sear" ? "#E9A24A" : "#F6B866"); g.addColorStop(.3, mode === "sear" ? "#E58A2E" : "#F4A140"); g.addColorStop(.42, mode === "sear" ? "#C9701E" : "#EC8625"); g.addColorStop(.5, "#D96A14"); g.addColorStop(.58, mode === "sear" ? "#D2761F" : "#EE7E1E"); g.addColorStop(1, mode === "sear" ? "#B45A14" : "#E26F16");
    x.fillStyle = g; x.beginPath(); x.arc(m, m, R, 0, 6.3); x.fill();
  } else { x.fillStyle = "#808080"; x.beginPath(); x.arc(m, m, R, 0, 6.3); x.fill(); }
  // radial fibres (xylem rays)
  x.save(); x.beginPath(); x.arc(m, m, R, 0, 6.3); x.clip();
  for (let i = 0; i < 220; i++) { const a = hash(i * 1.7) * 6.283, r0 = R * (.12 + .5 * hash(i * 3)), r1 = r0 + R * (.15 + .4 * hash(i * 5)); x.strokeStyle = bump ? `rgba(${hash(i) > .5 ? "40,40,40" : "220,220,220"},.35)` : `rgba(${hash(i * 7) > .5 ? "150,70,10" : "255,205,130"},${.10 + .12 * hash(i * 9)})`; x.lineWidth = 1 + 2 * hash(i * 11); x.beginPath(); x.moveTo(m + Math.cos(a) * r0, m + Math.sin(a) * r0); x.lineTo(m + Math.cos(a + (hash(i) - .5) * .06) * r1, m + Math.sin(a + (hash(i) - .5) * .06) * r1); x.stroke(); }
  // core ring + cambium ring
  x.lineWidth = 7; x.strokeStyle = bump ? "rgba(60,60,60,.8)" : "rgba(196,92,16,.65)"; x.beginPath(); x.arc(m, m, R * .43, 0, 6.3); x.stroke();
  x.lineWidth = 4; x.strokeStyle = bump ? "rgba(70,70,70,.7)" : "rgba(180,80,12,.45)"; x.beginPath(); x.arc(m, m, R * .86, 0, 6.3); x.stroke();
  // moisture specks / granules
  for (let i = 0; i < 700; i++) { const a = hash(i * 2.3) * 6.283, r = R * Math.sqrt(hash(i * 4.1)), s = .8 + 2.4 * hash(i * 6) ** 2; x.fillStyle = bump ? `rgba(${hash(i) > .5 ? 200 : 60},${hash(i) > .5 ? 200 : 60},${hash(i) > .5 ? 200 : 60},.35)` : (hash(i * 8) > .55 ? `rgba(255,226,170,${.12 + .2 * hash(i * 3)})` : `rgba(140,60,8,${.08 + .12 * hash(i * 3)})`); x.beginPath(); x.arc(m + Math.cos(a) * r, m + Math.sin(a) * r, s, 0, 6.3); x.fill(); }
  if (mode === "sear") { // Maillard: caramel blotches, strongest toward the rim and in patches
    for (let i = 0; i < 38; i++) { const a = hash(i * 9) * 6.283, r = R * (.25 + .75 * Math.sqrt(hash(i * 13))), rr = 22 + 56 * hash(i * 17), gg = x.createRadialGradient(m + Math.cos(a) * r, m + Math.sin(a) * r, 0, m + Math.cos(a) * r, m + Math.sin(a) * r, rr); gg.addColorStop(0, `rgba(${88 + 40 * hash(i)},${40 + 18 * hash(i * 3)},10,${.55 + .3 * hash(i * 5)})`); gg.addColorStop(1, "rgba(120,60,10,0)"); x.fillStyle = gg; x.fillRect(0, 0, S, S); }
    const rg = x.createRadialGradient(m, m, R * .55, m, m, R); rg.addColorStop(0, "rgba(100,50,10,0)"); rg.addColorStop(1, "rgba(86,40,8,.55)"); x.fillStyle = rg; x.fillRect(0, 0, S, S);
  }
  x.restore();
  return tex2(c, !bump);
}
// Coin material whose cut face blends from fresh to seared (uniform uSear; vertex-colour alpha = how much that face touches the pan).
export function makeCoinMaterial(fresh, sear, bumpT) {
  const mat = new THREE.MeshStandardMaterial({ map: fresh, bumpMap: bumpT, bumpScale: 1.4, vertexColors: true, roughness: .66, metalness: 0 });
  mat.userData.sear = { value: 0 }; mat.userData.map2 = { value: sear };
  mat.onBeforeCompile = sh => { sh.uniforms.uSear = mat.userData.sear; sh.uniforms.map2 = mat.userData.map2;
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nuniform float uSear; uniform sampler2D map2;")
      .replace("#include <map_fragment>", "{ vec4 s1 = texture2D( map, vMapUv ); vec4 s2 = texture2D( map2, vMapUv ); diffuseColor *= mix( s1, s2, clamp( uSear * vColor.a, 0., 1. ) ); }"); };
  return mat;
}
export function makeCoin2(seed = 0, R = .3, T = .1) { // chunky irregular coin: planar UV on both cut faces, rim UV on the side
  const k = R / .3, pts = [new THREE.Vector2(0, -T)];
  [.06, .12, .18, .22].forEach(r => pts.push(new THREE.Vector2(r * k, -T)));
  for (let a = 0; a <= 10; a++) { const th = a / 10 * Math.PI; pts.push(new THREE.Vector2((.245 + .05 * Math.sin(th)) * k, -T * Math.cos(th))); }
  [.22, .18, .14, .10, .06, 0].forEach(r => pts.push(new THREE.Vector2(r * k, T)));
  const g = new THREE.LatheGeometry(pts, 56), ox = 1 + .12 * hash(seed * 3.3), oz = 1 - .06 * hash(seed * 5.1);
  mapVerts(g, (x, y, z) => { const r = Math.hypot(x, z), an = Math.atan2(z, x), w = 1 + .1 * vn(Math.cos(an) * 1.5 + seed * 7, Math.sin(an) * 1.5, seed * 3.1) + .04 * vn(Math.cos(an) * 4.5 + seed, Math.sin(an) * 4.5, 2.2) + .012 * vn(Math.cos(an) * 12 + seed, Math.sin(an) * 12, 5.5);
    const edge = Math.min(1, r / (.2 * k)); return [x * w * ox, y + .02 * edge * vn(x * 6 + seed, 1.3, z * 6) * (y > 0 ? 1 : .5), z * w * oz]; });
  g.computeVertexNormals();
  const p = g.attributes.position, n = g.attributes.normal, uv = new Float32Array(p.count * 2), col = new Float32Array(p.count * 4), Rm = R * 1.12;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), ny = n.getY(i), r = Math.hypot(x, z);
    const face = Math.abs(ny) > .62 && r < .27 * k; let u, v;
    if (face) { u = .5 + x / (2 * Rm); v = .5 + z / (2 * Rm); } else { const a = Math.atan2(z, x); u = .5 + Math.cos(a) * .485; v = .5 + Math.sin(a) * .485; }
    uv[i * 2] = u; uv[i * 2 + 1] = v;
    const ao = face ? 1 : .78 + .22 * (y / T * .5 + .5); col[i * 4] = col[i * 4 + 1] = col[i * 4 + 2] = ao; col[i * 4 + 3] = y < 0 ? 1 : (face ? .38 : .7); }
  g.setAttribute("uv", new THREE.BufferAttribute(uv, 2)); g.setAttribute("color", new THREE.BufferAttribute(col, 4)); return g;
}

// ---- bell-pepper strip: cupped, soft-edged, satin skin outside, white pith + ribs inside (cup opens toward +y)
export function makeStrip2(seed = 0, L = 1.1, W = .36) {
  const g = new THREE.BoxGeometry(W, .09, L, 6, 2, 26), hw = W / 2, bend = .35 + .65 * hash(seed), tw = (hash(seed * 3) - .5) * .5, sk = hash(seed * 7);
  const skinA = C_("#B3190F"), skinB = C_("#D93A1B"), skinC = C_("#E5671F"), pith = C_("#F6F0DA"), pith2 = C_("#E3E0A8"), cut = C_("#EBDDA8");
  colorize(g, (c, x, y, z, nx, ny) => { const u = x / hw, s = .5 + .5 * vn(x * 7 + seed, z * 1.6, 0);
    if (ny < -.5) { c.copy(skinA).lerp(skinB, s); c.lerp(skinC, smooth((vn(z * 2.2 + seed, 3, 1) + .3) * .8) * .35); c.lerp(skinA, Math.abs(u) ** 3 * .5); c.multiplyScalar(.92 + .16 * vn(x * 30, z * 2, seed)); }
    else if (ny > .5) { c.copy(pith).lerp(pith2, Math.abs(u) ** 2 * .7); c.multiplyScalar(.93 + .07 * Math.sin(x * 120 + vn(z * 3, 1, seed) * 4)); c.lerp(cut, smooth(Math.abs(z) / (L / 2) - .88) * .5); }
    else c.copy(cut); });
  mapVerts(g, (x, y, z) => { const zn = z / (L / 2), u = x / hw, ang = tw * zn; let xx = x * Math.cos(ang) - y * Math.sin(ang), yy = x * Math.sin(ang) + y * Math.cos(ang);
    yy *= 1 - .6 * Math.pow(Math.abs(u), 4); yy += .11 * u * u * (1 - .3 * zn * zn) - .15 * bend * zn * zn + .008 * vn(x * 5, z * 4, seed); xx += .03 * vn(z * 3 + seed, 4, 0);
    return [xx * (1 - .1 * Math.pow(zn, 4)), yy, z * (1 + .02 * vn(x * 4, z, seed)) + u * .06 * (sk - .5)]; });
  g.computeVertexNormals(); return g;
}

// ---- whole bell pepper: four broad lobes with sharp creases, top dimple + stem; cooked = slumped, wrinkled, blistered skin
export function makePepper2(seed = 0, cooked = false) {
  const g = new THREE.SphereGeometry(1, 120, 84), skinA = C_(cooked ? "#9C2A14" : "#BE2115"), skinB = C_(cooked ? "#C4421C" : "#E0471F"), blis = C_("#3B160A"), hi = C_("#E8782A");
  const H = cooked ? .6 : .84, Wd = cooked ? 1.1 : 1;
  const blister = (x, y, z) => { const b = vn(x * 7 + seed * 3, y * 7, z * 7), d = vn(x * 16, y * 16 + 3, z * 16); return cooked ? smooth((b + .25 * d - .18) / .3) : 0; };
  mapVerts(g, (x, y, z) => { const an = Math.atan2(z, x), s = y, lobeW = Math.pow(Math.abs(Math.cos(2 * an + .35)), .42), crease = .82 + .18 * lobeW;
    const belly = .92 + .1 * Math.cos(s * 1.3 - .25) , shoulder = 1 - .35 * smooth((s - .45) / .55), foot = s < -.55 ? 1 - .14 * smooth((-s - .55) / .45) * (1 - lobeW) : 1;
    let r = crease * belly * shoulder * foot * Wd, yy = s * H;
    if (s > .5) yy -= .26 * smooth((s - .5) / .5) * (1 + .15 * lobeW); // top dimple
    const w = 1 + (cooked ? .05 * vn(x * 4 + seed, y * 4, z * 4) + .02 * vn(x * 12, y * 12, z * 12) + .035 * blister(x, y, z) : .012 * vn(x * 5 + seed, y * 5, z * 5));
    if (cooked) yy -= .1 * Math.max(0, s) * Math.abs(vn(x * 3, 1, z * 3));
    return [x * r * w * .9, yy, z * r * w * .9]; });
  g.computeVertexNormals();
  colorize(g, (c, x, y, z) => { const s = .5 + .5 * vn(x * 3.2 + seed, y * 2.4, z * 3.2); c.copy(skinA).lerp(skinB, s * .8); c.lerp(hi, smooth(y * 1.2 - .1) * .22 + (cooked ? 0 : .06 * vn(x * 6, y * 6, z * 6))); c.multiplyScalar(.93 + .12 * vn(x * 24, y * 18, z * 24)); const b = blister(x / .9, y / (H || 1), z / .9); if (b > 0) c.lerp(blis, b * .85); });
  const stem = new THREE.CylinderGeometry(.075, .12, .34, 14, 4); mapVerts(stem, (x, y, z) => [x + .1 * (y + .17) ** 2 * 3.2, y, z]); xf(stem, [0, H * .86 - .08, 0], [.12, 0, .22]); colorize(stem, (c, x, y) => c.copy(C_("#5C8A36")).lerp(C_("#8EB35A"), .5 + .5 * vn(x * 9, y * 9, 1)));
  const cap = new THREE.SphereGeometry(.2, 20, 10, 0, 6.3, 0, 1.2); xf(cap, [0, H * .86 - .22, 0], [Math.PI, 0, 0], [1, .5, 1]); colorize(cap, c => c.copy(C_("#4F7D34")));
  const m = merge([g, stem, cap]); m.computeVertexNormals(); return m;
}

// ---- seasoned cast-iron skillet (spun rings, bronze patina, worn bright spots)
export function makePan2(R = 1.6, H = .44) {
  const grp = makePan(R, H), c = cv2(512, 512), x = c.getContext("2d");
  x.fillStyle = "#1B1816"; x.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 160; i++) { const y = hash(i) * 512, h = 2 + 12 * hash(i * 3); x.fillStyle = `rgba(${hash(i * 5) > .5 ? "62,44,30" : "6,5,4"},${.1 + .22 * hash(i * 7)})`; x.fillRect(0, y, 512, h); }
  for (let i = 0; i < 900; i++) { x.fillStyle = `rgba(${hash(i * 3) > .6 ? "88,66,48" : "30,22,16"},${.04 + .12 * hash(i * 5)})`; x.beginPath(); x.arc(hash(i) * 512, hash(i * 11 + 2) * 512, 1 + 6 * hash(i * 7) ** 2, 0, 6.3); x.fill(); }
  const t = tex2(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1, 1);
  const mat = grp.userData.mat; mat.map = t; mat.color.set("#CFC4BA"); mat.metalness = .5; mat.roughness = .5; mat.clearcoat = .55; mat.clearcoatRoughness = .32; mat.needsUpdate = true; return grp;
}

// ---- warm pale-oak plank counter ----
export function makeCounterWood(size = 140, tile = 5) {
  const S = 1024, c = cv2(S), x = c.getContext("2d"), tones = ["#D6C0A0", "#CCB594", "#DDC9AA", "#D1BA98", "#D9C4A4"], N = 4, pw = S / N;
  for (let p = 0; p < N; p++) { x.fillStyle = tones[p % 5]; x.fillRect(p * pw, 0, pw, S);
    for (let i = 0; i < 70; i++) { const px = p * pw + hash(p * 100 + i) * pw; x.strokeStyle = `rgba(${hash(i * 3 + p) > .45 ? "128,86,48" : "250,226,190"},${.05 + .12 * hash(i * 2 + p)})`; x.lineWidth = .6 + 2.2 * hash(i * 5 + p); x.beginPath(); x.moveTo(px, 0); for (let s = 1; s <= 10; s++) x.lineTo(px + Math.sin(s * .9 + p * 3 + i) * (3 + 6 * hash(i * 7)) + (hash(i * 11 + s) - .5) * 4, s / 10 * S); x.stroke(); }
    const kx = p * pw + pw * (.25 + .5 * hash(p * 7)), ky = S * hash(p * 13 + 1); for (let r = 0; r < 5; r++) { x.strokeStyle = `rgba(110,72,38,${.12 - r * .02})`; x.lineWidth = 2; x.beginPath(); x.ellipse(kx, ky, 8 + r * 7, 20 + r * 16, 0, 0, 6.3); x.stroke(); }
    x.fillStyle = "rgba(96,62,30,.55)"; x.fillRect(p * pw - 1, 0, 3, S); x.fillStyle = "rgba(255,238,210,.25)"; x.fillRect(p * pw + 2, 0, 2, S); }
  for (let i = 0; i < 6; i++) { const y = hash(i * 17) * S; x.fillStyle = "rgba(96,62,30,.35)"; x.fillRect(Math.floor(hash(i * 19) * N) * pw, y, pw, 2); } // butt joints
  const t = tex2(c, true, [size / tile, size / tile]); const bump = t.clone(); bump.colorSpace = THREE.NoColorSpace; bump.needsUpdate = true;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshStandardMaterial({ map: t, bumpMap: bump, bumpScale: .35, roughness: .66, metalness: 0 }));
  m.rotation.x = -Math.PI / 2; m.receiveShadow = true; return m;
}
// soft dark blob on the counter (cheap ambient occlusion under objects). Add as a child at y~0.004; keep it out of the DOF depth pass.
export function makeContactShadow(rx, rz, op = .4) {
  const c = cv2(128), x = c.getContext("2d"), g = x.createRadialGradient(64, 64, 8, 64, 64, 62); g.addColorStop(0, "rgba(30,18,8,1)"); g.addColorStop(.55, "rgba(30,18,8,.5)"); g.addColorStop(1, "rgba(30,18,8,0)"); x.fillStyle = g; x.fillRect(0, 0, 128, 128);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, opacity: op, depthWrite: false, toneMapped: true }));
  m.rotation.x = -Math.PI / 2; m.scale.set(rx * 2, rz * 2, 1); m.position.y = .006; return m;
}
export function makePlate(R = 1.35) { // shallow ceramic plate, creamy white, glazed
  const pts = [[0, .02], [R * .52, .02], [R * .62, .05], [R * .9, .12], [R, .16], [R + .03, .17], [R + .03, .185], [R * .98, .19], [R * .86, .15], [R * .58, .085], [R * .5, .07], [0, .07]].map(a => new THREE.Vector2(a[0], a[1]));
  const m = new THREE.Mesh(new THREE.LatheGeometry(pts, 72), new THREE.MeshPhysicalMaterial({ color: "#F2EBDD", roughness: .28, clearcoat: .7, clearcoatRoughness: .15, metalness: 0 })); m.castShadow = m.receiveShadow = true; return m;
}

// ---------- molecule worlds: plant-cell texture (Voronoi, filled, no line-network) ----------
// opts: { n cells across, seed, wall, wallIn, c0 (cell centre), c1 (cell edge), vac (vacuole tint or null), wallW }
// returns { tex, pts: [[u,v,r]] } where pts are cell centres in 0..1 (for placing crystals / molecules).
export function cellTexture(o) {
  const S = o.size || 1024, n = o.n || 8, c = cv2(S), x = c.getContext("2d"), im = x.createImageData(S, S), d = im.data, seed = o.seed || 1;
  const col = h => { const q = C_(h); return [q.r * 255, q.g * 255, q.b * 255]; }, W = col(o.wall), WI = col(o.wallIn), C0 = col(o.c0), C1 = col(o.c1), VA = o.vac ? col(o.vac) : null;
  const P = []; for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) P.push([(i + .5 + (hash(seed * 31 + j * 17 + i * 5) - .5) * .8) / n, (j + .5 + (hash(seed * 37 + i * 13 + j * 7) - .5) * .8) / n]);
  const wW = o.wallW || .075, tint = []; P.forEach((p, k) => tint.push(.85 + .3 * hash(k * 3 + seed)));
  for (let py = 0; py < S; py++) for (let px = 0; px < S; px++) { const u = px / S, v = py / S, ci = Math.floor(u * n), cj = Math.floor(v * n); let f1 = 9, f2 = 9, k1 = 0;
    for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) { const ii = ((ci + di) % n + n) % n, jj = ((cj + dj) % n + n) % n, p = P[jj * n + ii], ox = ci + di < 0 ? -1 : ci + di >= n ? 1 : 0, oy = cj + dj < 0 ? -1 : cj + dj >= n ? 1 : 0, dx = u - (p[0] + ox), dy = v - (p[1] + oy), dd = Math.hypot(dx, dy);
      if (dd < f1) { f2 = f1; f1 = dd; k1 = jj * n + ii; } else if (dd < f2) f2 = dd; }
    const e = (f2 - f1) * n, wall = smooth(1 - e / wW), inner = smooth(1 - e / (wW * 2.6)) - wall * .0, cc = clamp(f1 * n * 1.7), vac = VA ? smooth(1 - cc * 1.5) * .55 : 0;
    let r = lerp(C0[0], C1[0], cc * cc) * tint[k1], g_ = lerp(C0[1], C1[1], cc * cc) * tint[k1], b = lerp(C0[2], C1[2], cc * cc) * tint[k1];
    if (VA) { r = lerp(r, VA[0], vac); g_ = lerp(g_, VA[1], vac); b = lerp(b, VA[2], vac); }
    r = lerp(r, WI[0], inner * .55); g_ = lerp(g_, WI[1], inner * .55); b = lerp(b, WI[2], inner * .55);
    r = lerp(r, W[0], wall); g_ = lerp(g_, W[1], wall); b = lerp(b, W[2], wall);
    const sh = 1 - .22 * smooth(e / (wW * 3)) * 0 + .06 * (hash(px * .91 + py * 3.7) - .5); const o4 = (py * S + px) * 4; d[o4] = r * sh; d[o4 + 1] = g_ * sh; d[o4 + 2] = b * sh; d[o4 + 3] = 255; }
  x.putImageData(im, 0, 0); const t = tex2(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return { tex: t, pts: P };
}

// ---------- gut lining: rows of soft, rounded villi (matte, pink), extruded from a smooth outline ----------
export function makeVilli(width, seed = 1, hMin = 1.2, hMax = 2.0, w = 1.0, base = "#EDAA9A", dark = "#B2605A", body = 1.4) {
  const sh = new THREE.Shape(), G = .05, N = Math.ceil(width / (w + G)), x0 = -width / 2; sh.moveTo(x0 - .2, -body); sh.lineTo(x0 - .2, 0);
  for (let i = 0; i < N; i++) { const xi = x0 + i * (w + G), h = hMin + (hMax - hMin) * hash(seed * 11 + i * 3.1), ww = w * (.8 + .4 * hash(seed * 5 + i)), lean = (hash(seed * 7 + i) - .5) * .3;
    sh.bezierCurveTo(xi + ww * .02, h * .45, xi + ww * .14 + lean * .5, h * .96, xi + ww * .5 + lean, h); sh.bezierCurveTo(xi + ww * .86 + lean * .5, h * .96, xi + ww * .98, h * .45, xi + ww, 0); sh.lineTo(xi + ww + G, 0); }
  sh.lineTo(x0 + width + .2, 0); sh.lineTo(x0 + width + .2, -body); sh.closePath();
  const g = new THREE.ExtrudeGeometry(sh, { depth: 1.1, bevelEnabled: true, bevelThickness: .3, bevelSize: .16, bevelSegments: 4, curveSegments: 12 });
  const b = C_(base), dk = C_(dark); colorize(g, (c, x, y, z, nx, ny, nz) => { c.copy(dk).lerp(b, smooth((y + .1) / 1.4)); c.multiplyScalar(.9 + .14 * vn(x * 2.5 + seed, y * 3, z * 2)); c.lerp(C_("#F6CDBE"), smooth(y - 1.1) * .4 * Math.max(0, nz)); });
  return g;
}
export function villiTips(width, seed = 1, hMin = 1.2, hMax = 2.0, w = 1.0) { // [x, height] of each finger tip (matches makeVilli)
  const G = .05, N = Math.ceil(width / (w + G)), x0 = -width / 2, r = [];
  for (let i = 0; i < N; i++) { const xi = x0 + i * (w + G), ww = w * (.8 + .4 * hash(seed * 5 + i)), lean = (hash(seed * 7 + i) - .5) * .3; r.push([xi + ww * .5 + lean, hMin + (hMax - hMin) * hash(seed * 11 + i * 3.1)]); }
  return r;
}
