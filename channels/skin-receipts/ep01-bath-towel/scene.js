// "Skin Receipts" ep01: what's growing on your towel. three.js 0.169 (vendored). Pure function of t: window.__seek(t) renders the frame.
// High-key Receipt-white world: ShadowMaterial ground/wall (the white is the page), instanced terry loops, translucent biofilm + soft bacteria,
// paper-craft houses / calendar / bars, stylised skin. Type (thermal receipt, stamps, captions) is the 2D overlay in overlay.js.
import * as THREE from "three";
import { createPost } from "../../../engine/film/post.js";
import { clamp, smooth, eio, eo3, eob, lerp, hash, makeTiming } from "./timing.js";
import { createOverlay } from "./overlay.js";

const TH = window.THEME, C = TH.colors;
const COVER = new URLSearchParams(location.search).has("cover");
{ let css = ""; for (const k in TH.fonts) for (const f of TH.fonts[k].faces) css += `@font-face{font-family:"${TH.fonts[k].family}";font-weight:${f.weight};src:url(${f.url}) format("woff2");}\n`;
  css += `:root{--bg:${C.bg};--key:${TH.caption.keyColor}}\n`; document.getElementById("theme-css").textContent = css; }
await Promise.all([`700 60px "Albert Sans"`, `400 30px "Albert Sans"`, `400 30px "Courier Prime"`, `700 30px "Courier Prime"`].map(f => document.fonts.load(f))); await document.fonts.ready;
const tl = await (await fetch("out/timeline.json")).json();
const T = makeTiming(tl), { S, E, END, W, DUR } = T;
const ov = createOverlay(T, TH, document.getElementById("fx")); ov.initCaps(tl);

const glc = document.getElementById("gl");
const { renderer, scene, camera, composer, bokeh, bloom, filmPass } = createPost({ canvas: glc, theme: TH });
bloom.enabled = false; renderer.toneMapping = THREE.NoToneMapping; camera.near = .02; camera.far = 40;
scene.background = new THREE.Color(C.receipt);
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const col = h => new THREE.Color(h);

// ------------------------------------------------------------ light: soft daylight + bright studio environment
{ const pm = new THREE.PMREMGenerator(renderer), es = new THREE.Scene();
  es.add(new THREE.Mesh(new THREE.BoxGeometry(12, 12, 12), new THREE.MeshBasicMaterial({ color: 0xe8e5de, side: THREE.BackSide })));
  const win = new THREE.Mesh(new THREE.PlaneGeometry(5, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(5.5, 5.3, 4.9) })); win.position.set(-5.8, 1.5, 1); win.rotation.y = Math.PI / 2; es.add(win);
  const top = new THREE.Mesh(new THREE.PlaneGeometry(8, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 2.2, 2.2) })); top.position.set(0, 5.8, 0); top.rotation.x = Math.PI / 2; es.add(top);
  scene.environment = pm.fromScene(es, .03).texture; scene.environmentIntensity = .6; }
const key = new THREE.DirectionalLight(0xffe6c8, 2.8); key.castShadow = true; key.shadow.mapSize.set(1536, 1536); key.shadow.bias = -.0004; key.shadow.normalBias = .0015; key.shadow.radius = 4;
scene.add(key, key.target, new THREE.HemisphereLight(0xe4eeff, 0xf6efe4, .6));
const fill = new THREE.DirectionalLight(0xcfe0ff, .6); fill.position.set(3, 1, 4); scene.add(fill);
const shadowMat = new THREE.ShadowMaterial({ color: col(C.navy), opacity: .28 });
const ground = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), shadowMat); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
const wall = new THREE.Mesh(new THREE.PlaneGeometry(6, 4), shadowMat); wall.position.set(0, 1.4, -.3); wall.receiveShadow = true; scene.add(wall);

// ------------------------------------------------------------ helpers
function roundedBox(w, h, d, r, seg = 5) {
  const g = new THREE.BoxGeometry(w, h, d, seg, seg, seg), p = g.attributes.position, v = new THREE.Vector3(), hw = w / 2 - r, hh = h / 2 - r, hd = d / 2 - r;
  for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); const c = V3(clamp(v.x, -hw, hw), clamp(v.y, -hh, hh), clamp(v.z, -hd, hd)); const dir = v.clone().sub(c); if (dir.lengthSq() > 0) dir.normalize().multiplyScalar(r); p.setXYZ(i, c.x + dir.x, c.y + dir.y, c.z + dir.z); }
  g.computeVertexNormals(); return g;
}
const std = (color, o) => new THREE.MeshStandardMaterial(Object.assign({ color: col(color), roughness: .85, metalness: 0 }, o || {}));
function mesh(geo, mat, parent, shadow = true) { const m = new THREE.Mesh(geo, mat); m.castShadow = shadow; m.receiveShadow = true; if (parent) parent.add(m); return m; }
function noiseField(n, seed) { // value-noise fbm, n x n, tileable-ish, values 0..1
  const g = [], K = 5; for (let o = 0; o < K; o++) { const s = 4 << o, a = new Float32Array((s + 1) * (s + 1)); for (let i = 0; i < a.length; i++) a[i] = hash(i * 1.37 + o * 19.1 + seed); g.push([s, a]); }
  const f = new Float32Array(n * n); let mx = 0, mn = 9;
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { let v = 0, amp = 1, tot = 0;
    for (let o = 0; o < K; o++) { const [s, a] = g[o], fx = x / n * s, fy = y / n * s, ix = Math.floor(fx), iy = Math.floor(fy), tx = smooth(fx - ix), ty = smooth(fy - iy), q = (i, j) => a[Math.min(s, iy + j) * (s + 1) + Math.min(s, ix + i)];
      v += amp * lerp(lerp(q(0, 0), q(1, 0), tx), lerp(q(0, 1), q(1, 1), tx), ty); tot += amp; amp *= .55; }
    v /= tot; f[y * n + x] = v; mx = Math.max(mx, v); mn = Math.min(mn, v); }
  for (let i = 0; i < f.length; i++) f[i] = (f[i] - mn) / (mx - mn); return f;
}
function canvasTex(n, draw, rep, srgb = true) { const c = document.createElement("canvas"); c.width = c.height = n; draw(c.getContext("2d"), n); const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; if (rep) t.repeat.set(rep[0], rep[1]); t.anisotropy = 4; if (srgb) t.colorSpace = THREE.SRGBColorSpace; return t; }
const wrapBlob = (g, x, y, r, fn) => { for (const dx of [-1024, 0, 1024]) for (const dy of [-1024, 0, 1024]) if (x + dx > -r * 2 && x + dx < 1024 + r * 2 && y + dy > -r * 2 && y + dy < 1024 + r * 2) fn(x + dx, y + dy); };
function terry(rep, base = [242, 240, 235]) { // soft looped cotton, seen from afar
  const draw = (g, n, isBump) => { g.fillStyle = isBump ? "#303030" : `rgb(${base})`; g.fillRect(0, 0, n, n);
    for (let i = 0; i < 2600; i++) { const x = hash(i * 1.3) * n, y = hash(i * 2.9 + 5) * n, r = 11 + hash(i * 5.1) * 15; wrapBlob(g, x, y, r, (X, Y) => {
      const gr = g.createRadialGradient(X - r * .2, Y - r * .25, r * .1, X, Y, r);
      if (isBump) { gr.addColorStop(0, "rgba(255,255,255,.9)"); gr.addColorStop(1, "rgba(255,255,255,0)"); } else { gr.addColorStop(0, "rgba(255,255,252,.95)"); gr.addColorStop(.6, `rgba(${base.map(v => v - 6)},.8)`); gr.addColorStop(1, `rgba(${base.map(v => v - 30)},0)`); }
      g.fillStyle = gr; g.beginPath(); g.arc(X, Y, r, 0, 6.3); g.fill(); }); } };
  return [canvasTex(1024, (g, n) => draw(g, n, false), rep), canvasTex(1024, (g, n) => draw(g, n, true), rep, false)];
}
function weave(rep) {
  const draw = (g, n, isBump) => { g.fillStyle = isBump ? "#505050" : "rgb(222,218,208)"; g.fillRect(0, 0, n, n); const c = n / 128;
    for (let j = 0; j < 128; j++) for (let i = 0; i < 128; i++) { const over = (i + j) % 2, v = hash(i * 3.1 + j * 7.7); const gr = isBump ? (over ? 140 : 120) : (over ? 238 : 228) + v * 5; g.fillStyle = isBump ? `rgb(${gr},${gr},${gr})` : `rgb(${gr},${gr - 3},${gr - 10})`; g.fillRect(i * c + 1, j * c + 1, c - 1, c - 1); } };
  return [canvasTex(1024, (g, n) => draw(g, n, false), rep), canvasTex(1024, (g, n) => draw(g, n, true), rep, false)];
}
function skinTexes(hex, rep, soft = 1) { // pores + fine relief lines, as colour + bump
  const draw = (g, n, isBump) => { g.fillStyle = isBump ? "#9a9a9a" : hex; g.fillRect(0, 0, n, n);
    g.strokeStyle = isBump ? "#4a4a4a" : `rgba(0,0,0,${.2 * soft})`; g.lineWidth = isBump ? 3 * Math.max(.5, soft) : 2;
    for (const ang of [.52, -.52, 1.57]) { g.save(); g.translate(n / 2, n / 2); g.rotate(ang); for (let y = -n; y < n; y += 34) { g.beginPath(); for (let x = -n; x < n; x += 40) { const yy = y + (hash(x * .13 + y * .31 + ang * 9) - .5) * 9; x === -n ? g.moveTo(x, yy) : g.lineTo(x, yy); } g.stroke(); } g.restore(); }
    for (let i = 0; i < 520; i++) { const x = hash(i * 1.7) * n, y = hash(i * 3.3 + 1) * n, r = 1.5 + hash(i * 5) * 2.8; g.fillStyle = isBump ? "#222" : "rgba(40,20,10,.28)"; g.beginPath(); g.arc(x, y, r, 0, 6.3); g.fill(); }
    if (!isBump) for (let i = 0; i < 160; i++) { const x = hash(i * 2.2) * n, y = hash(i * 4.1 + 3) * n, a = hash(i * 8) * 6.3; g.strokeStyle = "rgba(30,15,8,.35)"; g.lineWidth = 1.5; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + Math.cos(a) * 12, y + Math.sin(a) * 12, x + Math.cos(a + .5) * 26, y + Math.sin(a + .5) * 26); g.stroke(); } };
  return [canvasTex(1024, (g, n) => draw(g, n, false), rep), canvasTex(1024, (g, n) => draw(g, n, true), rep, false)];
}
const skinMat = (hex, rep, rough = .55, soft = 1) => { const [m, b] = skinTexes(hex, rep, soft); return new THREE.MeshPhysicalMaterial({ map: m, bumpMap: b, bumpScale: 1.6 * soft, roughness: rough, sheen: .6, sheenRoughness: .5, sheenColor: col("#fff0e6"), clearcoat: .12, clearcoatRoughness: .5 }); };

// ------------------------------------------------------------ STAGE A: rail + two terry towels
const gA = new THREE.Group(); scene.add(gA);
const RAILY = .75, PWD = .34, PHT = .58, ZF = .022, LS = .0055;
{ const rail = mesh(new THREE.CylinderGeometry(.012, .012, 1.3, 24), std("#c9ced8", { roughness: .35, metalness: .6 }), gA); rail.rotation.z = Math.PI / 2; rail.position.y = RAILY;
  [-.62, .62].forEach(x => { const b = mesh(new THREE.CylinderGeometry(.016, .016, .05, 16), std("#c9ced8", { roughness: .4, metalness: .5 }), gA); b.rotation.x = Math.PI / 2; b.position.set(x, RAILY, -.02); const p = mesh(new THREE.BoxGeometry(.04, .07, .012), std("#c9ced8", { roughness: .4, metalness: .5 }), gA); p.position.set(x, RAILY, -.05); });
  [-.2, .2].forEach(x => { const k = mesh(new THREE.SphereGeometry(.02, 20, 14), std("#aeb6c6", { roughness: .45, metalness: .3 }), gA); k.position.set(x, RAILY + .03, -.05); k.userData.hook = 1;
    const st = mesh(new THREE.CylinderGeometry(.006, .006, .06, 10), std("#aeb6c6", { roughness: .45, metalness: .3 }), gA); st.rotation.x = Math.PI / 2; st.position.set(x, RAILY + .03, -.02); }); }
function panelSurf(u, v) { const f = clamp(v / PHT), z = ZF + .016 * Math.sin(Math.PI * Math.pow(f, .8)) * (.55 + .45 * Math.cos(u * 7)) + .0025 * Math.sin(u * 24 + v * 8) * smooth(f * 4); return V3(u, -v, z); }
function panelFrame(u, v) { const e = .004, p = panelSurf(u, v), du = panelSurf(u + e, v).sub(panelSurf(u - e, v)), dv = panelSurf(u, v + e).sub(panelSurf(u, v - e)); const ex = du.normalize(), n = ex.clone().cross(dv.normalize()).negate().normalize(); /* n points to +z */ if (n.z < 0) n.negate(); const ey = n.clone().cross(ex).normalize(); return { p, ex, ey, n }; }
function loopGeo(plies, segs, radial, rp, rt, hw, hh) {
  const pos = [], nor = [], idx = [], cl = [];
  for (let p = 0; p < plies; p++) { const base = pos.length / 3;
    for (let s = 0; s <= segs; s++) { const th = Math.PI * s / segs, c = V3(-hw * Math.cos(th), 0, hh * Math.sin(th) - .0004), Tg = V3(hw * Math.sin(th), 0, hh * Math.cos(th)).normalize(), N = V3(0, 1, 0), B = Tg.clone().cross(N);
      const ph = p * 2 * Math.PI / plies + th * 4, C0 = plies > 1 ? c.clone().addScaledVector(N, rp * Math.cos(ph)).addScaledVector(B, rp * Math.sin(ph)) : c;
      for (let a = 0; a < radial; a++) { const aa = a / radial * 6.2832, d = N.clone().multiplyScalar(Math.cos(aa)).addScaledVector(B, Math.sin(aa)); pos.push(C0.x + rt * d.x, C0.y + rt * d.y, C0.z + rt * d.z); nor.push(d.x, d.y, d.z); const ao = .8 + .2 * Math.min(1, Math.max(0, (C0.z + rt * d.z) / hh)); cl.push(ao, ao * .985, ao * .96); } }
    for (let s = 0; s < segs; s++) for (let a = 0; a < radial; a++) { const i0 = base + s * radial + a, i1 = base + s * radial + (a + 1) % radial, i2 = i0 + radial, i3 = i1 + radial; idx.push(i0, i2, i1, i1, i2, i3); } }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3)); g.setAttribute("color", new THREE.Float32BufferAttribute(cl, 3)); g.setIndex(idx); return g;
}
const geoHi = loopGeo(3, 10, 4, .00031, .00027, .0026, .0034), geoLo = loopGeo(1, 6, 4, 0, .00105, .0027, .0036);
function buildTowel(x, o) {
  const g = new THREE.Group(); g.position.set(x, RAILY, 0); gA.add(g);
  const [tm, tb] = o.weave ? weave([5, 7]) : terry([6, 8]); const LS = o.ls; const fab = new THREE.MeshStandardMaterial({ map: tm, bumpMap: tb, bumpScale: 2.2, roughness: .95, color: 0xffffff });
  const fm = new THREE.PlaneGeometry(PWD, PHT, 20, 28); { const p = fm.attributes.position; for (let i = 0; i < p.count; i++) { const u = p.getX(i), v = (.5 - p.getY(i) / PHT) * PHT * 1 + 0; const vv = -p.getY(i) + PHT / 2; const q = panelSurf(u, vv); p.setXYZ(i, q.x, q.y, q.z); } fm.computeVertexNormals(); }
  const front = mesh(fm, fab, g); front.userData.fab = fab;
  const bm = new THREE.PlaneGeometry(PWD, PHT * .94, 4, 4); const back = mesh(bm, fab, g); back.rotation.y = Math.PI; back.position.set(0, -PHT * .47, -ZF);
  const fold = mesh(new THREE.CylinderGeometry(ZF * 1.15, ZF * 1.15, PWD, 28, 1, true), fab, g); fold.rotation.z = Math.PI / 2; fold.material.side = THREE.DoubleSide;
  // woven border + slate hem band (no loops down here)
  const hem = mesh(new THREE.PlaneGeometry(PWD, .022), std("#aab4c8", { roughness: .9 }), g, false); { const q = panelFrame(0, PHT - .075); hem.position.copy(q.p).addScaledVector(q.n, .0012); hem.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(q.ex, q.ey, q.n)); }
  const hem2 = mesh(new THREE.PlaneGeometry(PWD, .006), std("#aab4c8", { roughness: .9 }), g, false); { const q = panelFrame(0, PHT - .098); hem2.position.copy(q.p).addScaledVector(q.n, .0012); hem2.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(q.ex, q.ey, q.n)); }
  // instanced loops in chunks (hi = 3-ply yarn for macro, lo = single tube for wide)
  const cols = 8, rows = 12, nu = Math.floor((PWD - .014) / LS), nv = Math.floor((PHT - .1) / LS), chunks = [];
  const cells = Array.from({ length: cols * rows }, () => []);
  for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) { const u = -PWD / 2 + .007 + (i + .5 + (hash(i * 7.1 + j * 3.3 + x) - .5) * .5) * LS * (PWD - .014) / (nu * LS), v = .016 + (j + .5 + (hash(i * 2.3 + j * 9.7 + x) - .5) * .5) * LS;
    const cu = Math.min(cols - 1, Math.floor((u + PWD / 2) / PWD * cols)), cv = Math.min(rows - 1, Math.floor(v / (PHT - .06) * rows)); cells[cv * cols + cu].push([u, v, i, j]); }
  const mHi = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: .9, vertexColors: true, sheen: 1, sheenRoughness: .55, sheenColor: col("#ffffff") }), mLo = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .9, vertexColors: true });
  const M = new THREE.Matrix4(), cc = new THREE.Color();
  cells.forEach((cl, ci) => { if (!cl.length) return; const mk = (geo, mat) => { const im = new THREE.InstancedMesh(geo, mat, cl.length); im.castShadow = false; im.receiveShadow = true; g.add(im); return im; };
    const hi = o.hi ? mk(geoHi, mHi) : null, lo = mk(geoLo, mLo); const sumP = V3();
    cl.forEach(([u, v, i, j], k) => { const q = panelFrame(u, v), th = (hash(i * 3.7 + j * 1.9 + x * 5) - .5) * 2.4 + (hash(i + j * 7.7) < .3 ? 1.57 : 0), c = Math.cos(th), s = Math.sin(th);
      const ex = q.ex.clone().multiplyScalar(c).addScaledVector(q.ey, s), ey0 = q.n.clone().cross(ex), lean = (hash(i * 6.7 + j * 2.9 + x) - .35) * 1.5, up = q.n.clone().multiplyScalar(Math.cos(lean)).addScaledVector(ey0, Math.sin(lean)), ey = up.clone().cross(ex).normalize(), sw = (.95 + hash(i * 5.3 + j * 8.1) * .4) * (o.big || 1), sh = (.75 + hash(i * 1.1 + j * 6.3) * .45) * (o.big || 1);
      M.makeBasis(ex.multiplyScalar(sw), ey, up.multiplyScalar(sh)); M.setPosition(q.p); sumP.add(q.p);
      cc.setScalar(.93 + hash(i * 9.1 + j * 4.7) * .07).multiply(col(hash(i + j) < .5 ? "#fffdf8" : "#f7f8fa")); if (hi) { hi.setMatrixAt(k, M); hi.setColorAt(k, cc); } lo.setMatrixAt(k, M); lo.setColorAt(k, cc); });
    [hi, lo].forEach(m => { if (m) { m.instanceMatrix.needsUpdate = true; m.instanceColor.needsUpdate = true; m.computeBoundingSphere(); } });
    chunks.push({ hi, lo, c: sumP.divideScalar(cl.length) }); });
  return { g, fab, mHi, mLo, chunks, front, hem, hem2 };
}
const towelA = buildTowel(-.2, { hi: false, ls: .0075, big: 1.35 }), towelB = buildTowel(.2, { hi: true, ls: .0046, weave: true });
const DULL = col("#aeb0b3"), BRIGHT = col("#ffffff"), tmpC = new THREE.Color();
function setDull(d) { tmpC.copy(BRIGHT).lerp(DULL, d); [towelB.fab, towelB.mHi, towelB.mLo].forEach(m => m.color.copy(tmpC)); }
function lodTowel(tw, camPos, near) { tw.chunks.forEach(ch => { const wp = ch.c.clone().applyMatrix4(tw.g.matrixWorld), hiOn = !!ch.hi && camPos.distanceTo(wp) < near; if (ch.hi) { ch.hi.visible = hiOn; ch.hi.castShadow = hiOn; } ch.lo.visible = !hiOn; }); }

// -- biofilm patch on towel B (film sheet + bacteria + settlers), local to towelB.g
const PATCH = { u: .01, v: .2, w: .075, h: .1 }, NN = 128, nf = noiseField(NN, 3.7);
const nAt = (a, b) => nf[(Math.min(NN - 1, Math.max(0, Math.round(b * (NN - 1))))) * NN + Math.min(NN - 1, Math.max(0, Math.round(a * (NN - 1))))];
const filmTex = canvasTex(NN, (g, n) => { const id = g.createImageData(n, n); for (let i = 0; i < n * n; i++) { const v = nf[i] * 255; id.data.set([v, v, v, 255], i * 4); } g.putImageData(id, 0, 0); }, null, false);
filmTex.wrapS = filmTex.wrapT = THREE.ClampToEdgeWrapping;
const filmU = { uGrow: { value: 0 } };
const filmMat = new THREE.MeshPhysicalMaterial({ color: col("#79a9ab"), roughness: .25, clearcoat: .8, clearcoatRoughness: .25, transparent: true, depthWrite: false, side: THREE.DoubleSide, alphaMap: filmTex, bumpMap: filmTex, bumpScale: 3, emissive: col("#0b7270"), emissiveIntensity: .06 });
filmMat.onBeforeCompile = sh => { sh.uniforms.uGrow = filmU.uGrow; sh.fragmentShader = "uniform float uGrow;\n" + sh.fragmentShader.replace("#include <alphamap_fragment>", "float nn = texture2D(alphaMap, vAlphaMapUv).g; float th = 1.0 - uGrow * 1.18; diffuseColor.a *= smoothstep(th, th + .1, nn) * .6;"); };
const filmGeo = new THREE.PlaneGeometry(PATCH.w, PATCH.h, 80, 106);
{ const p = filmGeo.attributes.position, uv = filmGeo.attributes.uv; for (let i = 0; i < p.count; i++) { const a = uv.getX(i), b = 1 - uv.getY(i), u = PATCH.u + (a - .5) * PATCH.w, v = PATCH.v + (b - .5) * PATCH.h, q = panelFrame(u, v), h = .0014 + .0009 * nAt(a, b) + .0003 * Math.sin(a * 70); p.setXYZ(i, q.p.x + q.n.x * h, q.p.y + q.n.y * h, q.p.z + q.n.z * h); } filmGeo.computeVertexNormals(); }
const film = new THREE.Mesh(filmGeo, filmMat); film.renderOrder = 3; film.visible = false; towelB.g.add(film);
const NB = 3200, bGeo = new THREE.CapsuleGeometry(.00022, .0007, 3, 7), bMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .55 });
const bact = new THREE.InstancedMesh(bGeo, bMat, NB); bact.castShadow = true; bact.visible = false; towelB.g.add(bact);
const BCOL = ["#0b7270", "#2f7f7c", "#5a6275", "#6d7a92", "#3c8f8b", "#475066"].map(col), bd = [];
for (let i = 0; i < NB; i++) { let a, b, tries = 0; do { a = hash(i * 3.1 + tries * 17.3); b = hash(i * 5.7 + 1.3 + tries * 11.9); tries++; } while (nAt(a, b) < .32 && tries < 8);
  const u = PATCH.u + (a - .5) * PATCH.w, v = PATCH.v + (b - .5) * PATCH.h, q = panelFrame(u, v), h = .0013 + hash(i * 7.3) * .0012, ang = hash(i * 9.9) * 6.3, tilt = (hash(i * 2.7) - .5) * .5;
  const ex = q.ex.clone().multiplyScalar(Math.cos(ang)).addScaledVector(q.ey, Math.sin(ang)); // capsule axis (Y) along ex
  const m = new THREE.Matrix4().makeBasis(ex.clone().cross(q.n), ex, q.n); const qu = new THREE.Quaternion().setFromRotationMatrix(m).multiply(new THREE.Quaternion().setFromAxisAngle(V3(1, 0, 0), tilt));
  bd.push({ p: q.p.clone().addScaledVector(q.n, h), q: qu, thr: clamp((1 - nAt(a, b)) / 1.18 + .05 + hash(i) * .05), s: .8 + hash(i * 4.4) * .6, len: hash(i * 6.6) < .35 ? .25 : .7 + hash(i * 2.9) * .8 }); bact.setColorAt(i, BCOL[Math.floor(hash(i * 13.1) * BCOL.length)]); }
const _m = new THREE.Matrix4(), _s = V3(), _p = V3();
function updBact(g) { let any = false; for (let i = 0; i < NB; i++) { const d = bd[i], k = smooth((g - d.thr) / .09) * d.s; if (k > 0) any = true; _s.set(k, k * d.len, k); _m.compose(d.p, d.q, _s); bact.setMatrixAt(i, _m); } bact.instanceMatrix.needsUpdate = true; bact.visible = any; }
const NSET = 380, sMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .5 }), settlers = new THREE.InstancedMesh(new THREE.CapsuleGeometry(.00026, .0008, 3, 7), sMat, NSET), sd = [];
settlers.castShadow = true; settlers.visible = false; towelB.g.add(settlers);
for (let i = 0; i < NSET; i++) { const u = PATCH.u + (hash(i * 1.9) - .5) * .06 - .005, v = PATCH.v + (hash(i * 4.1 + 2) - .5) * .09 - .02, q = panelFrame(u, v); sd.push({ q, h: .0008 + hash(i * 6.1) * .0018, ang: hash(i * 8.8) * 6.3, delay: hash(i * 3.3) * 2.0, dx: (hash(i * 5.5) - .5) * .004, dy: (hash(i * 2.2) - .5) * .004 }); }
function updSettle(lt) { let any = false; for (let i = 0; i < NSET; i++) { const d = sd[i], u = clamp((lt - d.delay) / .7), e = eo3(u), k = smooth(u * 4); if (k > 0) any = true;
  const q = d.q; _p.copy(q.p).addScaledVector(q.n, d.h + (1 - e) * .014).addScaledVector(q.ex, d.dx * (1 - e)).addScaledVector(q.ey, d.dy * (1 - e));
  const ex = q.ex.clone().multiplyScalar(Math.cos(d.ang)).addScaledVector(q.ey, Math.sin(d.ang)), m = new THREE.Matrix4().makeBasis(ex.clone().cross(q.n), ex, q.n), qu = new THREE.Quaternion().setFromRotationMatrix(m);
  _s.set(k, k * (i % 3 ? 1 : .3), k); _m.compose(_p, qu, _s); settlers.setMatrixAt(i, _m); } settlers.instanceMatrix.needsUpdate = true; settlers.visible = any; }
for (let i = 0; i < NSET; i++) settlers.setColorAt(i, [col("#2f9c97"), col("#4aa6a2"), col("#0b7270")][i % 3]);

// -- prop: plain paper-towel roll (no print, no brand), only in b11
const gRoll = new THREE.Group(); gA.add(gRoll);
{ const r = mesh(new THREE.CylinderGeometry(.052, .052, .26, 40), std("#f6f5f1", { roughness: .95 }), gRoll); r.position.set(.45, .18 + .13, .05);
  const core = mesh(new THREE.CylinderGeometry(.017, .017, .264, 20), std("#d9c9b0", { roughness: .9 }), gRoll); core.position.copy(r.position);
  for (let k = 0; k < 3; k++) { const ring = mesh(new THREE.TorusGeometry(.0525, .0006, 6, 48), std("#dfe0e3"), gRoll, false); ring.rotation.x = Math.PI / 2; ring.position.set(.45, .18 + .05 + k * .08, .05); }
  const plank = mesh(roundedBox(.5, .02, .22, .006), std("#e9e6dd", { roughness: .8 }), gRoll); plank.position.set(.5, .17, .05); }
gRoll.visible = false;

// -- hand (stylised, mid-brown) that lifts towel B's hem in b02
const gHand = new THREE.Group(); scene.add(gHand); gHand.visible = false;
{ const sm = skinMat(C.skin[2], [2, 2], .5), fing = (x, y, z, len, rot) => { const f = new THREE.Group(); f.position.set(x, y, z); gHand.add(f); let par = f, L = len;
    [0, 1, 2].forEach(k => { const seg = mesh(new THREE.CapsuleGeometry(.0085 - k * .0007, L * .34, 6, 12), sm, par); seg.position.y = L * .22; const j = new THREE.Group(); j.position.y = L * .4; seg.add(j); par = k < 2 ? (() => { const grp = new THREE.Group(); grp.position.y = L * .22; seg.add(grp); return grp; })() : par; grp0(seg); }); return f; };
  function grp0() {}
  const palm = mesh(roundedBox(.085, .095, .028, .012, 6), sm, gHand); palm.position.set(0, 0, 0);
  const fingers = []; [-.031, -.0105, .0105, .031].forEach((x, i) => { const L = [.07, .078, .072, .058][i]; const f = new THREE.Group(); f.position.set(x, .047, 0); gHand.add(f); fingers.push(f); let par = f;
    for (let k = 0; k < 3; k++) { const l = L / 3; const seg = mesh(new THREE.CapsuleGeometry(.0086 - k * .0007, l * .78, 6, 12), sm, par); seg.position.y = l / 2; const nx = new THREE.Group(); nx.position.y = l; par.add(nx); nx.userData.k = k; par = nx; nx.rotation.x = 0; f.userData["j" + k] = nx; } f.userData.base = f; });
  const th = new THREE.Group(); th.position.set(.046, -.012, .004); th.rotation.z = -.9; gHand.add(th); let tp = th; for (let k = 0; k < 2; k++) { const l = .034; const seg = mesh(new THREE.CapsuleGeometry(.0105 - k * .001, l * .8, 6, 12), sm, tp); seg.position.y = l / 2; const nx = new THREE.Group(); nx.position.y = l; tp.add(nx); th.userData["j" + k] = nx; tp = nx; }
  const wr = mesh(new THREE.CapsuleGeometry(.032, .12, 6, 16), sm, gHand); wr.position.set(0, -.12, -.004); wr.rotation.z = .12;
  gHand.userData = { fingers, th }; }
function poseHand(curl) { const { fingers, th } = gHand.userData; fingers.forEach((f, i) => { f.rotation.x = -curl * .25; f.userData.j0.rotation.x = -curl * 1.15; f.userData.j1.rotation.x = -curl * 1.25; f.userData.j2.rotation.x = -curl * .55; }); th.rotation.x = -curl * .4; th.userData.j0.rotation.x = -curl * .6; th.userData.j1.rotation.x = -curl * .5; }

// ------------------------------------------------------------ STAGE H: 26 households (paper-craft houses with a folded towel)
const gH = new THREE.Group(); scene.add(gH); const HX = 20; gH.position.x = HX; gH.visible = false;
const houses = []; mesh(roundedBox(4.6, .02, .75, .006, 2), std("#d5d9e0", { roughness: .9 }), gH).position.set(1.0, -.01, -.09);
{ const roofCols = ["#8a93a8", "#5e9c99", "#aab4c6"], tri = new THREE.Shape(); tri.moveTo(-.062, 0); tri.lineTo(.062, 0); tri.lineTo(0, .05); tri.closePath();
  const roofGeo = new THREE.ExtrudeGeometry(tri, { depth: .088, bevelEnabled: true, bevelSize: .003, bevelThickness: .003, bevelSegments: 2 }); roofGeo.translate(0, 0, -.044);
  const bodyGeo = roundedBox(.1, .068, .08, .005, 3), towelGeo = roundedBox(.034, .012, .024, .004, 3), doorGeo = roundedBox(.02, .036, .004, .002, 2);
  for (let k = 0; k < 26; k++) { const g = new THREE.Group(), col2 = k % 2, cx = (k >> 1) * .17, cz = col2 ? -.2 : 0.02; g.position.set(cx, 0, cz);
    mesh(bodyGeo, std("#f4f2ec", { roughness: .9 }), g).position.y = .034; const rf = mesh(roofGeo, std(roofCols[(k * 7) % 3], { roughness: .8 }), g); rf.position.y = .066;
    mesh(doorGeo, std(roofCols[(k * 5 + 1) % 3], { roughness: .8 }), g).position.set(0, .018, .041);
    const tw = mesh(towelGeo, std("#fbfaf6", { roughness: .95 }), g); tw.position.set(0, .006, .075); tw.userData.tw = 1; g.userData.tw = tw; houses.push(g); gH.add(g); g.visible = false; } }

// ------------------------------------------------------------ STAGE K: 6-month calendar strip with three baskets
const gK = new THREE.Group(); scene.add(gK); const KX = 40; gK.position.x = KX; gK.visible = false;
const KST = [0, .62, 1.24, 1.86], baskets = [];
{ mesh(roundedBox(3.2, .02, .75, .006, 2), std("#d5d9e0", { roughness: .9 }), gK).position.set(.9, -.01, .1); mesh(roundedBox(2.5, .006, .24, .002, 2), std("#ffffff", { roughness: .9 }), gK).position.set(.9, .003, 0);
  KST.forEach((x, i) => { const tk = mesh(new THREE.BoxGeometry(.012, .006, .17), std(i === 3 ? C.teal : C.navy, { roughness: .8 }), gK, false); tk.position.set(x, .008, 0); tk.userData.tick = i; houses.length;
    if (i) { const b = new THREE.Group(); b.position.set(x, 0, -.17); gK.add(b); const bm = std("#bfc6d4", { roughness: .85 });
      [[0, .0, .06, .13, .008], [0, .0, -.06, .13, .008]].forEach(() => 0); const w1 = mesh(roundedBox(.13, .07, .01, .003, 2), bm, b), w2 = w1.clone(), w3 = mesh(roundedBox(.01, .07, .12, .003, 2), bm, b), w4 = w3.clone(); b.add(w2, w4); w1.position.set(0, .038, .06); w2.position.set(0, .038, -.06); w3.position.set(.06, .038, 0); w4.position.set(-.06, .038, 0); mesh(roundedBox(.12, .006, .12, .002, 2), bm, b).position.y = .006;
      const tw = mesh(roundedBox(.1, .03, .08, .008, 4), std("#fbfaf6", { roughness: .95 }), b); tw.position.set(0, .04, 0); b.userData.tw = tw; baskets.push(b); } }); }

// ------------------------------------------------------------ STAGE C: three bars
const gC = new THREE.Group(); scene.add(gC); const CX = 60; gC.position.x = CX; gC.visible = false;
const BARX = [-.22, 0, .22], BARH = [.26, .30, .78], bars = [];
BARX.forEach((x, i) => { const m = mesh(roundedBox(.15, 1, .15, .02, 4), std(i === 2 ? C.teal : "#b6bdcc", { roughness: .6 }), gC); m.position.x = x; bars.push(m); });
{ const base = mesh(roundedBox(1.3, .02, .6, .006, 2), std("#d5d9e0", { roughness: .9 }), gC); base.position.set(0, -.01, 0); }

// ------------------------------------------------------------ STAGE E1: forearm (deep brown) / E2: two microbe swatches
const gE1 = new THREE.Group(); scene.add(gE1); const E1X = 80; gE1.position.x = E1X; gE1.visible = false;
{ const geo = new THREE.PlaneGeometry(2.4, .9, 90, 40), p = geo.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i); p.setZ(i, -.5 * (1 - Math.cos(y * 1.6)) + .004 * Math.sin(p.getX(i) * 40)); } geo.computeVertexNormals();
  const arm = mesh(geo, skinMat(C.skin[3], [26, 10], .5, .4), gE1); arm.position.set(.5, .3, 0); arm.rotation.x = -.4; }
const gE2 = new THREE.Group(); scene.add(gE2); const E2X = 90; gE2.position.x = E2X; gE2.visible = false; mesh(roundedBox(.62, .02, 1.28, .008, 2), std("#d5d9e0", { roughness: .9 }), gE2).position.set(0, -.01, 0);
const discZ = [-.28, .28], sliver = V3();
{ const dm = std("#ffffff", { roughness: .8 }), rm = std("#dfe3ea", { roughness: .7 }); discZ.forEach(z => { const d = mesh(new THREE.CylinderGeometry(.22, .22, .012, 72), dm, gE2); d.position.set(0, .006, z); const r = mesh(new THREE.TorusGeometry(.22, .006, 10, 80), rm, gE2); r.rotation.x = Math.PI / 2; r.position.set(0, .012, z); });
  const cm = std("#6fa9a6", { roughness: .35 }), cm2 = std("#0b7270", { roughness: .35 }), rmM = std("#5a6275", { roughness: .4 }), rmM2 = std("#8d97ad", { roughness: .4 });
  const sph = new THREE.SphereGeometry(.0095, 16, 12), cap = new THREE.CapsuleGeometry(.0065, .03, 4, 10);
  // skin disc: clusters of round cocci; towel disc: scattered rods + exactly one staph (<1%)
  for (let c = 0; c < 14; c++) { const ca = hash(c * 5.3) * 6.3, cr = Math.sqrt(hash(c * 2.1 + 1)) * .15, cx = Math.cos(ca) * cr, cz = discZ[0] + Math.sin(ca) * cr; for (let k = 0; k < 9; k++) { const a = hash(c * 17 + k) * 6.3, r = Math.sqrt(hash(c * 3 + k * 7)) * .04; const s = mesh(sph, (c + k) % 4 ? cm : cm2, gE2); s.position.set(cx + Math.cos(a) * r, .02 + hash(k + c) * .012, cz + Math.sin(a) * r); } }
  for (let k = 0; k < 140; k++) { const a = hash(k * 4.7) * 6.3, r = Math.sqrt(hash(k * 1.9 + 3)) * .195; const s = mesh(cap, k % 3 ? rmM : rmM2, gE2); s.rotation.z = Math.PI / 2; s.rotation.y = hash(k * 8.1) * 6.3; s.position.set(Math.cos(a) * r, .02, discZ[1] + Math.sin(a) * r); s.rotation.set(0, 0, 0); s.rotateY(hash(k * 8.1) * 6.3); s.rotateX(Math.PI / 2); }
  const st = mesh(sph, std(C.rose, { roughness: .35 }), gE2); st.scale.setScalar(1.15); st.position.set(.09, .022, discZ[1] - .06); sliver.copy(st.position); sliver.x += E2X;
  const ring = mesh(new THREE.TorusGeometry(.03, .0025, 8, 40), std(C.navy, { roughness: .6 }), gE2, false); ring.rotation.x = Math.PI / 2; ring.position.copy(st.position); ring.position.y = .016; }

// ------------------------------------------------------------ STAGE F: cheek + patting towel
const gF = new THREE.Group(); scene.add(gF); const FX = 100; gF.position.x = FX; gF.visible = false;
{ const cheek = mesh(new THREE.SphereGeometry(.7, 96, 72), skinMat(C.skin[1], [16, 16], .55, .35), gF); cheek.position.set(0, .0, -.7); cheek.scale.set(1.15, 1.35, 1); }
const patTw = mesh(roundedBox(.2, .05, .15, .02, 6), (() => { const [m, b] = terry([2, 2]); return new THREE.MeshStandardMaterial({ map: m, bumpMap: b, bumpScale: 2.5, roughness: .95 }); })(), gF); patTw.visible = false;

// ------------------------------------------------------------ STAGE G: a range of skin tones
const gG = new THREE.Group(); scene.add(gG); const GX = 120; gG.position.x = GX; gG.visible = false;
C.skin.forEach((h, i) => { const m = mesh(new THREE.SphereGeometry(.13, 64, 48), skinMat(h, [5, 4], .5, .35), gG); m.scale.set(1.25, .72, .8); m.position.set(Math.sin(i * 2.1) * .07, .1 + i * .19, 0); m.rotation.z = (i - 2) * .05; });
{ const slab = mesh(roundedBox(.8, .02, .5, .006, 2), std("#d5d9e0", { roughness: .9 }), gG); slab.position.set(0, -.01, 0); }

// ------------------------------------------------------------ cameras
const FOV = f => 2 * Math.atan(18 / f) * 180 / Math.PI;
function evalCam(keys, t) {
  let i = 0; for (let k = 0; k < keys.length; k++) if (keys[k].t <= t) i = k; const a = keys[i], b = keys[Math.min(i + 1, keys.length - 1)];
  const u = b === a ? 0 : eio((t - a.t) / (b.t - a.t)), L = (x, y) => x.map((v, j) => lerp(v, y[j], u)), o0 = a.o || [0, 0], o1 = b.o || [0, 0];
  return { p: L(a.p, b.p), l: L(a.l, b.l), f: lerp(a.f, b.f, u), fp: L(a.fp || a.l, b.fp || b.l), ap: lerp(a.ap || 1, b.ap || 1, u), o: L(o0, o1) };
}
function applyCam(keys, t) {
  const c = evalCam(keys, t), dr = [Math.sin(t * .7) * .0015, Math.cos(t * .53) * .0012].map(v => v * (c.p[2] < .3 ? .15 : 1));
  camera.position.set(c.p[0] + dr[0], c.p[1] + dr[1], c.p[2]); camera.lookAt(c.l[0], c.l[1], c.l[2]); camera.fov = FOV(c.f); camera.aspect = 1080 / 1920;
  camera.setViewOffset(1080, 1920, -c.o[0], -c.o[1], 1080, 1920); camera.updateProjectionMatrix(); camera.updateMatrixWorld(true);
  const fd = camera.position.distanceTo(V3(...c.fp)); bokeh.uniforms.focus.value = fd; bokeh.uniforms.aperture.value = c.ap * .0055 / (fd * fd); bokeh.uniforms.maxblur.value = .016;
  return c;
}
const px = v => { const p = v.clone().project(camera); return { x: (p.x * .5 + .5) * 1080, y: (-p.y * .5 + .5) * 1920 }; };

// ---- beat shots: stage + camera keys (times absolute) + key light placement
const BEATS = tl.beats.map(b => b.id);
const stageOf = t => { let id = BEATS[0]; for (const b of BEATS) if (t >= S(b)) id = b; return id; };
const tkB = T.hookEnd;
const HH = { // handy macro/wide points
  bx: .2, patchP: [.21, RAILY - .2, .03] };
const SHOTS = {
  b01: { st: "A", keys: [{ t: 0, p: [.47, .52, .40], l: [.12, .46, 0], f: 62, fp: [.12, .46, 0], o: [0, -150], ap: 1.6 }, { t: E("b01"), p: [.36, .50, .33], l: [.07, .44, 0], f: 62, fp: [.07, .44, 0], o: [0, -150], ap: 1.6 }] },
  b02: { st: "A", keys: [{ t: S("b02"), p: [.02, .40, .95], l: [.02, .34, 0], f: 52, fp: [.1, .3, .03], o: [230, 60] }, { t: E("b02"), p: [.14, .36, 1.2], l: [.14, .31, 0], f: 52, fp: [.2, .25, .03], o: [230, 60] }] },
  b03: { st: "H" }, b04: { st: "K" }, b06: { st: "C" }, b07: { st: "C" }, b08: { st: "E" }, b10: { st: "F" }, b15: { st: "G" },
  b05: { st: "A", keys: [{ t: S("b05"), p: [0, .46, 3.0], l: [0, .46, 0], f: 50, fp: [0, .46, .02], o: [235, 90] }, { t: S("b05") + 1.7, p: [0, .46, 3.0], l: [0, .46, 0], f: 50, fp: [0, .46, .02], o: [235, 90] },
    { t: W("b05", "Under a microscope") - .3, p: [.21, .52, .45], l: [.21, .52, 0], f: 70, fp: [.21, .52, .03], o: [60, 40] }, { t: E("b05"), p: [.215, .545, .12], l: [.215, .545, .02], f: 100, fp: [.215, .545, .03], o: [60, 30] }] },
  b09: { st: "A", keys: [{ t: S("b09"), p: [.18, .53, .135], l: [.18, .53, .02], f: 100, fp: [.18, .53, .028], o: [70, 30] }, { t: E("b09"), p: [.235, .56, .125], l: [.235, .56, .02], f: 100, fp: [.235, .56, .028], o: [70, 30] }] },
  b11: { st: "A", keys: [{ t: S("b11"), p: [.265, .38, 1.95], l: [.265, .38, 0], f: 50, fp: [.265, .38, .03], o: [200, 60] }, { t: E("b11"), p: [.265, .38, 1.65], l: [.265, .38, 0], f: 50, fp: [.265, .38, .03], o: [200, 60] }] },
  b12: { st: "A", keys: [{ t: S("b12"), p: [0, .46, 3.0], l: [0, .46, 0], f: 50, fp: [0, .46, .02], o: [235, 90] }, { t: E("b12"), p: [0, .46, 2.9], l: [0, .46, 0], f: 50, fp: [0, .46, .02], o: [235, 90] }] },
  b13: { st: "A", keys: [{ t: S("b13"), p: [0, .46, 2.9], l: [0, .46, 0], f: 50, fp: [0, .46, .02], o: [150, 120] }, { t: E("b13"), p: [0, .46, 2.85], l: [0, .46, 0], f: 50, fp: [0, .46, .02], o: [150, 120] }] },
  b14: { st: "A", keys: [{ t: S("b14"), p: [.2, .42, 1.0], l: [.2, .38, 0], f: 60, fp: [.2, .38, .03], o: [140, 120] }, { t: E("b14"), p: [0, .5, 3.4], l: [0, .5, 0], f: 50, fp: [0, .5, .02], o: [150, 150] }] },
};
// non-keyed stages: camera built from the beat's local time
function stageCam(id, t, A) {
  const s0 = S(id), lt = t - s0;
  if (id === "b03") { const tk = W("b03", "One study"), tz = END("b03") - .15, hx = k => (k >> 1) * .17, xs = lerp(.1, hx(25) - .05, eio((t - tk) / (tz - tk))); return [{ t: 0, p: [HX + xs, .62, .95], l: [HX + xs + .05, .03, -.02], f: 45, fp: [HX + xs, .04, 0], o: [140, 40] }]; }
  if (id === "b04") { const w0 = W("b04", "Every two months"), k = KST, x = t < w0 + .1 ? lerp(-.05, k[1] - .12, eio((t - s0) / (w0 + .1 - s0))) : lerp(k[1] - .12, k[3] - .02, eio((t - w0 - .1) / (E("b04") - w0 - .3))); return [{ t: 0, p: [KX + x, .34, .85], l: [KX + x + .02, .03, -.02], f: 45, fp: [KX + x, .05, 0], o: [190, 0] }]; }
  if (id === "b06" || id === "b07") { const z = lerp(2.7, 2.5, eio((t - s0) / 5.5)); return [{ t: 0, p: [CX, .55, z], l: [CX, .27, 0], f: 50, fp: [CX, .3, 0], o: [200, 0] }]; }
  if (id === "b08") { const cut = W("b08", "Mostly not") - .12;
    if (t < cut) { const x = lerp(0, .9, eio((t - s0) / (cut - s0))); return [{ t: 0, p: [E1X + x, .22, .42], l: [E1X + x + .06, .22, 0], f: 85, fp: [E1X + x, .22, .0], o: [140, 0] }]; }
    return [{ t: 0, p: [E2X, 2.9, .5], l: [E2X, 0, 0], f: 50, fp: [E2X, .02, 0], o: [210, -215] }]; }
  if (id === "b10") { const x = Math.sin(lt * 1.2) * .06; return [{ t: 0, p: [FX + x * .5, .12, .9], l: [FX + x * .5, .03, 0], f: 60, fp: [FX, .03, 0], o: [170, 0] }]; }
  if (id === "b15") { const x = lerp(.09, -.02, eio(lt / (END("b15") - s0 + 1))); return [{ t: 0, p: [GX + x, .5, 2.0], l: [GX + x, .46, 0], f: 50, fp: [GX, .46, 0], o: [150, 40] }]; }
}

// ------------------------------------------------------------ the frame
const STAGES = { A: gA, H: gH, K: gK, C: gC, E1: gE1, E2: gE2, F: gF, G: gG };
function show(name) { for (const k in STAGES) STAGES[k].visible = k === name; wall.visible = name === "A"; ground.visible = true; }
const prog = (a, b, t) => smooth((t - a) / (b - a));
let lastLabel = {};
function stage(t) {
  const id = stageOf(t), A = {}; const sh = SHOTS[id]; let keys, stg = sh.st, focusC = null;
  if (stg === "E") stg = t < W("b08", "Mostly not") - .12 ? "E1" : "E2";
  show(stg); keys = sh.keys || stageCam(id, t, A); const cam = applyCam(keys, sh.keys ? t : 0.0); // stageCam keys are already absolute (single key)
  // key light follows the stage; shadow box tight for macro
  const focus = V3(...cam.fp), macro = camera.position.distanceTo(focus) < .5, ext = macro ? .1 : (stg === "A" ? 1.1 : 1.6);
  key.position.copy(focus).add(V3(-1.5, 1.1, 1.0).multiplyScalar(macro ? .7 : 1.4)); key.target.position.copy(focus); key.target.updateMatrixWorld(); key.intensity = stg === "A" ? 2.8 : 1.6;
  Object.assign(key.shadow.camera, { left: -ext, right: ext, top: ext, bottom: -ext, near: .1, far: 8 }); key.shadow.camera.updateProjectionMatrix();
  A.id = id;
  // ---- A: towels, dullness, hand, macro biofilm
  if (stg === "A") {
    const dull = id === "b05" ? prog(W("b05", "looked dull") - .1, W("b05", "looked dull") + .9, t) : (id === "b09" || id === "b11" || id === "b10") ? 1 : (id === "b06" || id === "b07" || id === "b08") ? 1 : id === "b12" || id === "b13" || id === "b14" ? 0 : 0;
    setDull(dull);
    towelB.g.rotation.x = 0; gHand.visible = false;
    if (id === "b02") { const tl0 = W("b02", "use disposable"), t1 = W("b02", "Let's check"), a = smooth((t - tl0) / .9) * (1 - smooth((t - t1 + .2) / .8)), ang = -.42 * a; towelB.g.rotation.x = ang;
      const hemLocal = V3(.1, -PHT + .03, ZF + .012).applyMatrix4(towelB.g.matrixWorld.clone().identity().makeRotationX(ang)).add(V3(towelB.g.position.x, RAILY, 0));
      const enter = smooth((t - tl0 + 0.7) / .8) * (1 - smooth((t - t1 + .25) / .7)); gHand.visible = enter > .01; gHand.position.copy(hemLocal).add(V3(.075 + (1 - enter) * .35, -.13 - (1 - enter) * .22, .055 + (1 - enter) * .1)); gHand.rotation.set(-.15 - ang * .5, -.25, .45); poseHand(.9 * smooth((t - tl0 + .2) / .5)); gHand.updateMatrixWorld(true); }
    towelB.g.updateMatrixWorld(true); towelA.g.updateMatrixWorld(true);
    const nearB = camera.position.distanceTo(V3(.2, .5, .03)) < .9; lodTowel(towelB, camera.position, .75); lodTowel(towelA, camera.position, 0);
    gRoll.visible = id === "b11"; towelA.g.visible = true;
    // biofilm months: grows b05 (month 2) -> b06 over; held afterwards
    const g = id === "b05" ? .62 * prog(W("b05", "Under a microscope") - .2, W("b05", "biofilm") + .4, t) : (id === "b09" ? .8 : 0); const macroOn = id === "b05" && t > W("b05", "Under a microscope") - .6 || id === "b09";
    filmU.uGrow.value = g; film.visible = macroOn && g > .005; if (macroOn) updBact(g); else bact.visible = false;
    if (id === "b09") updSettle(t - S("b09") - .15); else settlers.visible = false;
    if (id === "b05") { const wide = 1 - prog(S("b05") + 1.6, S("b05") + 2.4, t); A.cmpA = wide; const a = px(V3(-.2, RAILY + .1, 0)), b = px(V3(.2, RAILY + .1, 0)); A.cmp = [a.x, b.x, a.y - 4]; }
    if (id === "b11") { const q = px(V3(.45, .5, .05)); A.nt = { x: Math.min(q.x, 800), y: q.y - 90 }; }
  }
  // ---- H: houses pop in one after another
  if (stg === "H") { const t0 = W("b03", "One study") + .05, t1 = END("b03") - .25, dt = (t1 - t0) / 26; let n = 0;
    houses.slice(0, 26).forEach((h, k) => { if (!h.parent || h.parent !== gH) return; const lt = t - (t0 + k * dt), u = clamp(lt / .28), s = lt < 0 ? 0 : eob(u); h.visible = lt >= 0; h.scale.set(s, s, s); if (lt >= 0) n++; h.userData.tw.visible = true; });
    A.houses = Math.max(1, n); A.h0 = t0; }
  // ---- K: baskets, towels lifted at months 2, 4, 6
  if (stg === "K") { const w0 = W("b04", "Every two months"), ts = [w0 + .35, w0 + 1.0, w0 + 1.65]; A.ticks = [];
    baskets.forEach((b, i) => { const lt = t - ts[i], up = lt < 0 ? 0 : Math.sin(clamp(lt / 1.0) * Math.PI) * .6 + (lt > 0 ? smooth(lt / .3) * .4 * (1 - smooth((lt - .9) / .4)) : 0); b.userData.tw.position.y = .04 + up * .14; b.userData.tw.rotation.z = up * .5; });
    [0, 1, 2, 3].forEach(i => { const tp = i === 0 ? S("b04") + .35 : ts[i - 1], q = px(V3(KX + KST[i], .0, .13)); A.ticks.push({ x: q.x, y: q.y + 62, t: tp }); }); }
  // ---- C: bars
  if (stg === "C") { const g0 = S("b06") + .35, k = [prog(g0, g0 + .7, t), prog(g0 + .3, g0 + 1.0, t), prog(W("b06", "highest") - .1, W("b06", "highest") + .9, t)]; A.bars = [];
    bars.forEach((m, i) => { const h = Math.max(.001, BARH[i] * (i === 2 ? lerp(.3, 1, k[2]) * prog(g0, g0 + .5, t) : k[i])); m.scale.y = h; m.position.y = .01 + h / 2; });
    BARX.forEach((x, i) => { const q = px(V3(CX + x, 0, .14)), tq = px(V3(CX + x, .01 + BARH[2] * .98 + .1, 0)); A.bars.push({ x: q.x, y: q.y + 52, tx: tq.x, ty: tq.y - 12 }); }); }
  if (stg === "E2") { const a = px(V3(E2X, .02, discZ[0] + .25)), b = px(V3(E2X, .02, discZ[1] + .25)); A.discs = [{ x: a.x, y: a.y + 26 }, { x: b.x, y: b.y + 26 }]; A.sliver = px(sliver); A.discT = W("b08", "Mostly not") - .12; }
  // ---- F: patting towel + dashed question outline
  if (stg === "F") { const lt = t - S("b10"), ph = (lt * 1.9) % 1, pat = Math.pow(Math.sin(ph * Math.PI), 2), ax = Math.sin(lt * .9) * .06;
    patTw.visible = true; patTw.position.set(ax * .5 + .05, .0 + Math.sin(lt * 1.1) * .02, .05 + (1 - pat) * .08); patTw.rotation.set(-.1, .3 + Math.sin(lt) * .1, .3); patTw.scale.setScalar(.7);
    const q = px(V3(FX - .02, .0, .0)); A.cheek = { x: q.x, y: q.y, rx: 170, ry: 115 }; }
  if (stg === "G") { /* nothing animated */ }
  A.stg = stg; return A;
}

window.__seek = function (t) {
  const A = stage(COVER ? 0 : t);
  if (COVER) { // cover: towel macro, headline plate below, receipt + stamp left
    show("A"); setDull(1); towelB.g.rotation.x = 0; gHand.visible = false; gRoll.visible = false; towelB.g.updateMatrixWorld(true); towelA.g.updateMatrixWorld(true);
    filmU.uGrow.value = .85; film.visible = true; updBact(.85); updSettle(5);
    applyCam([{ t: 0, p: [.205, .55, .15], l: [.215, .545, .02], f: 100, fp: [.215, .545, .03], o: [60, -100] }], 0); lodTowel(towelB, camera.position, .75); lodTowel(towelA, camera.position, 0);
    key.position.set(-.1, .62, .25); key.target.position.set(.21, .55, .03); key.target.updateMatrixWorld(); key.intensity = 2.8;
    Object.assign(key.shadow.camera, { left: -.1, right: .1, top: .1, bottom: -.1, near: .05, far: 2 }); key.shadow.camera.updateProjectionMatrix();
    filmPass.uniforms.time.value = .5; composer.render(); ov.drawCover(); return;
  }
  filmPass.uniforms.time.value = (t * 30 | 0) * .017;
  composer.render();
  ov.draw(t, A); ov.captions(t);
};
window.__cues = T.cues; window.__duration = DUR;
window.__seek(0); window.__ready = true;
