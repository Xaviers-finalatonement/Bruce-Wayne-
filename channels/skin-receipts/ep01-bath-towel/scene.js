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
  scene.environment = pm.fromScene(es, .03).texture; scene.environmentIntensity = .5; }
const key = new THREE.DirectionalLight(0xffe6c8, 2.8); key.castShadow = true; key.shadow.mapSize.set(1536, 1536); key.shadow.bias = -.0004; key.shadow.normalBias = .0015; key.shadow.radius = 4;
scene.add(key, key.target, new THREE.HemisphereLight(0xe4eeff, 0xf6efe4, .45));
const fill = new THREE.DirectionalLight(0xcfe0ff, .6); fill.position.set(3, 1, 4); scene.add(fill);
const shadowMat = new THREE.ShadowMaterial({ color: col(C.navy), opacity: .16 });
const ground = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), shadowMat); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);

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
function weave(rep) { // irregular woven ground cloth: jittered thread widths, slubs, uneven over/under, dark interstices, loose fibres
  const N = 84, wd = (seed) => { const w = []; let tot = 0; for (let i = 0; i < N; i++) { const v = .7 + hash(i * 3.7 + seed) * .6; w.push(v); tot += v; } let acc = 0; return w.map(v => { const a = acc; acc += v / tot; return [a, v / tot]; }); };
  const X = wd(1.3), Y = wd(8.9);
  const draw = (g, n, isBump) => { g.fillStyle = isBump ? "#202020" : "rgb(88,84,78)"; g.fillRect(0, 0, n, n);
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { const [x0, wx] = X[i], [y0, wy] = Y[j], flip = hash(i * 5.3 + j * 2.1) < .12, over = ((i + j * 2) % 4 < 2) !== flip, v = hash(i * 3.1 + j * 7.7), slub = .5 + .5 * Math.sin(i * .9 + j * .31 + hash(j) * 6);
      const px0 = x0 * n, py0 = y0 * n, w = wx * n, h = wy * n, bb = 205 + v * 38 - (1 - slub) * 14;
      if (isBump) { const gr = over ? g.createLinearGradient(px0, 0, px0 + w, 0) : g.createLinearGradient(0, py0, 0, py0 + h); const hi = over ? 235 : 150; gr.addColorStop(0, "#252525"); gr.addColorStop(.5, `rgb(${hi},${hi},${hi})`); gr.addColorStop(1, "#252525"); g.fillStyle = gr; }
      else { const gr = over ? g.createLinearGradient(px0, 0, px0 + w, 0) : g.createLinearGradient(0, py0, 0, py0 + h), k = over ? 1 : .86; gr.addColorStop(0, `rgb(${(bb - 85) * k},${(bb - 87) * k},${(bb - 94) * k})`); gr.addColorStop(.5, `rgb(${bb * k},${(bb - 2) * k},${(bb - 8) * k})`); gr.addColorStop(1, `rgb(${(bb - 85) * k},${(bb - 87) * k},${(bb - 94) * k})`); g.fillStyle = gr; }
      g.fillRect(px0 + .6, py0 + .6, w - 1.2, h - 1.2); }
    g.lineCap = "round"; for (let k = 0; k < 4200; k++) { const x = hash(k * 1.1) * n, y = hash(k * 2.3 + 4) * n, a = hash(k * 4.9) * 6.3, l = 5 + hash(k * 6.1) * 16; g.strokeStyle = isBump ? (k % 2 ? "rgba(255,255,255,.35)" : "rgba(0,0,0,.3)") : (k % 3 ? "rgba(255,252,244,.22)" : "rgba(60,56,50,.2)"); g.lineWidth = .8 + hash(k * 7.7) * .8;
      g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + Math.cos(a) * l * .5 + 2 * Math.sin(k), y + Math.sin(a) * l * .5, x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); } };
  return [canvasTex(1024, (g, n) => draw(g, n, false), rep), canvasTex(1024, (g, n) => draw(g, n, true), rep, false)];
}
function skinTexes(hex, rep, o = {}) { // pores, jittered relief furrows, tone blotches, optional freckles: colour + bump
  const rel = o.relief == null ? 1 : o.relief, pore = o.pore == null ? 1 : o.pore, seed = o.seed || 0;
  const draw = (g, n, isBump) => { g.fillStyle = isBump ? "#909090" : hex; g.fillRect(0, 0, n, n);
    if (!isBump) for (let i = 0; i < 90; i++) { const x = hash(i * 1.3 + seed) * n, y = hash(i * 2.1 + 7 + seed) * n, r = 50 + hash(i * 4.7 + seed) * 170, k = hash(i * 9.1 + seed);
      wrapBlob(g, x, y, r, (X, Y) => { const gr = g.createRadialGradient(X, Y, 0, X, Y, r); gr.addColorStop(0, k < .34 ? "rgba(170,70,55,.07)" : k < .67 ? "rgba(0,0,0,.09)" : "rgba(255,225,200,.07)"); gr.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = gr; g.beginPath(); g.arc(X, Y, r, 0, 6.3); g.fill(); }); }
    g.strokeStyle = isBump ? "#5c5c5c" : `rgba(0,0,0,${.12 * rel})`; g.lineWidth = isBump ? 3.2 * Math.max(.4, rel) : 1.6;
    for (const ang of [.52, -.52, 1.57]) { g.save(); g.translate(n / 2, n / 2); g.rotate(ang); for (let y = -n; y < n; y += 36) { g.beginPath(); for (let x = -n; x < n; x += 34) { const yy = y + (hash(x * .13 + y * .31 + ang * 9 + seed) - .5) * 12; x === -n ? g.moveTo(x, yy) : g.lineTo(x, yy); } g.stroke(); } g.restore(); }
    const np = Math.round(1100 * pore); for (let i = 0; i < np; i++) { const x = hash(i * 1.7 + seed) * n, y = hash(i * 3.3 + 1 + seed) * n, r = 1.1 + hash(i * 5 + seed) * 2.2; g.fillStyle = isBump ? "#222" : "rgba(40,18,10,.3)"; g.beginPath(); g.arc(x, y, r, 0, 6.3); g.fill(); }
    if (!isBump && o.freckle) for (let i = 0; i < 90 * o.freckle; i++) { const x = hash(i * 2.2 + seed) * n, y = hash(i * 4.1 + 3) * n, r = 3 + hash(i * 6.2) * 6; g.fillStyle = "rgba(150,85,50,.2)"; g.beginPath(); g.arc(x, y, r, 0, 6.3); g.fill(); } };
  return [canvasTex(1024, (g, n) => draw(g, n, false), rep), canvasTex(1024, (g, n) => draw(g, n, true), rep, false)];
}
const skinU = { uPress: { value: V3(9, 9, 9) }, uDepth: { value: 0 }, uAO: { value: 0 } };
const skinMat = (hex, rep, o = {}) => { const [m, b] = skinTexes(hex, rep, o); const mt = new THREE.MeshPhysicalMaterial({ map: m, bumpMap: b, bumpScale: 2.0 * (o.relief == null ? 1 : Math.max(.5, o.relief)), roughness: o.rough || .5, sheen: .7, sheenRoughness: .4, sheenColor: col("#ffe9dc"), clearcoat: .22, clearcoatRoughness: .38, emissive: col(hex).multiplyScalar(.07), emissiveMap: m });
  const sss = col(hex).lerp(col("#c4432f"), .5);
  mt.onBeforeCompile = sh => { Object.assign(sh.uniforms, { uSss: { value: sss }, uPress: skinU.uPress, uDepth: skinU.uDepth, uAO: skinU.uAO });
    sh.vertexShader = "uniform vec3 uPress; uniform float uDepth; varying vec3 vObj;\n" + sh.vertexShader.replace("#include <begin_vertex>", "vObj = position; vec3 dd0 = position - uPress; vec3 transformed = position - normal * uDepth * exp(-dot(dd0, dd0) / 0.0030);");
    sh.fragmentShader = "uniform vec3 uSss, uPress; uniform float uAO; varying vec3 vObj;\n" + sh.fragmentShader.replace("#include <opaque_fragment>", "float fr = pow(1.0 - saturate(dot(normalize(vNormal), normalize(vViewPosition))), 2.0); outgoingLight += uSss * (0.04 + 0.38 * fr) * 0.55; vec3 dd1 = vObj - uPress; outgoingLight *= 1.0 - uAO * exp(-dot(dd1, dd1) / 0.0042);\n#include <opaque_fragment>"); };
  return mt; };
// fine tapered curved hair: 6 segments, 3 sides
function hairGeo(len, r, bend) { const S = 6, pos = [], idx = [], nor = [];
  for (let k = 0; k <= S; k++) { const t = k / S, c = V3(bend * len * t * t, len * t, 0), rr = r * (1 - .85 * t); for (let a = 0; a < 3; a++) { const an = a / 3 * 6.2832; pos.push(c.x + Math.cos(an) * rr, c.y, c.z + Math.sin(an) * rr); nor.push(Math.cos(an), 0, Math.sin(an)); } }
  for (let k = 0; k < S; k++) for (let a = 0; a < 3; a++) { const i0 = k * 3 + a, i1 = k * 3 + (a + 1) % 3; idx.push(i0, i0 + 3, i1, i1, i0 + 3, i1 + 3); }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3)); g.setIndex(idx); return g; }
function hairs(n, geo, mat, place, seed) { const im = new THREE.InstancedMesh(geo, mat, n), M = new THREE.Matrix4(), q = new THREE.Quaternion(), q2 = new THREE.Quaternion(), c = new THREE.Color();
  for (let i = 0; i < n; i++) { const { p, d, s } = place(i); q.setFromUnitVectors(V3(0, 1, 0), d); q2.setFromAxisAngle(V3(0, 1, 0), hash(i * 3.9 + seed) * 6.3); q.multiply(q2); M.compose(p, q, V3(1, s, 1)); im.setMatrixAt(i, M); im.setColorAt(i, c.setScalar(.75 + hash(i * 8.8 + seed) * .5)); }
  im.castShadow = true; return im; }
// plaster wall with a baked soft window-light patch + mullions (gives the "filmed" falloff behind the towels)
const wallTex = canvasTex(1024, (g, n) => { g.fillStyle = "#cfc8bc"; g.fillRect(0, 0, n, n);
  for (let i = 0; i < 500; i++) { const x = hash(i * 1.3) * n, y = hash(i * 2.9 + 5) * n, r = 20 + hash(i * 5.1) * 90, gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, hash(i * 7.7) < .5 ? "rgba(120,108,92,.05)" : "rgba(255,252,244,.06)"); gr.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = gr; g.fillRect(x - r, y - r, 2 * r, 2 * r); }
  g.save(); g.filter = "blur(30px)"; g.fillStyle = "rgba(255,248,232,.85)"; g.beginPath(); g.moveTo(120, 60); g.lineTo(640, 150); g.lineTo(560, 940); g.lineTo(60, 840); g.closePath(); g.fill(); g.restore();
  g.save(); g.filter = "blur(6px)"; g.strokeStyle = "rgba(190,178,160,.6)"; g.lineWidth = 16; g.beginPath(); g.moveTo(380, 100); g.lineTo(310, 890); g.moveTo(90, 450); g.lineTo(600, 540); g.stroke(); g.restore(); }, null);
wallTex.wrapS = wallTex.wrapT = THREE.ClampToEdgeWrapping;
const wall = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 3.8), new THREE.MeshStandardMaterial({ map: wallTex, roughness: .97 })); wall.position.set(.05, 1.0, -.3); wall.receiveShadow = true; scene.add(wall);

// ------------------------------------------------------------ STAGE A: rail + two terry towels
const gA = new THREE.Group(); scene.add(gA);
const RAILY = .75, PWD = .34, PHT = .58, ZF = .022, LS = .0055;
const gRail = new THREE.Group(); gA.add(gRail);
{ const rail = mesh(new THREE.CylinderGeometry(.012, .012, 1.8, 24), std("#c9ced8", { roughness: .35, metalness: .6 }), gRail); rail.rotation.z = Math.PI / 2; rail.position.y = RAILY;
  [-.92, .92].forEach(x => { const b = mesh(new THREE.CylinderGeometry(.016, .016, .05, 16), std("#c9ced8", { roughness: .4, metalness: .5 }), gRail); b.rotation.x = Math.PI / 2; b.position.set(x, RAILY, -.02); const p = mesh(new THREE.BoxGeometry(.04, .07, .012), std("#c9ced8", { roughness: .4, metalness: .5 }), gRail); p.position.set(x, RAILY, -.05); });
  [-.2, .2].forEach(x => { const k = mesh(new THREE.SphereGeometry(.02, 20, 14), std("#aeb6c6", { roughness: .45, metalness: .3 }), gRail); k.position.set(x, RAILY + .03, -.05); k.userData.hook = 1;
    const st = mesh(new THREE.CylinderGeometry(.006, .006, .06, 10), std("#aeb6c6", { roughness: .45, metalness: .3 }), gRail); st.rotation.x = Math.PI / 2; st.position.set(x, RAILY + .03, -.02); }); }
function panelSurf(u, v) { const f = clamp(v / PHT), z = ZF + .011 * Math.sin(u * 13 + 1.3 + f * 2) * Math.pow(f, 1.3) + .006 * Math.sin(u * 5.1 - .7) * f + .024 * Math.sin(Math.PI * Math.pow(f, .8)) * (.5 + .5 * Math.cos(u * 9 + .6)) + .007 * Math.sin(u * 17 + v * 5.5) * smooth(f * 3) * (.4 + f) + .0025 * Math.sin(u * 24 + v * 8) * smooth(f * 4); return V3(u + .012 * f * Math.sin(v * 6 + 1), -v, z); }
function panelFrame(u, v) { const e = .004, p = panelSurf(u, v), du = panelSurf(u + e, v).sub(panelSurf(u - e, v)), dv = panelSurf(u, v + e).sub(panelSurf(u, v - e)); const ex = du.normalize(), n = ex.clone().cross(dv.normalize()).negate().normalize(); /* n points to +z */ if (n.z < 0) n.negate(); const ey = n.clone().cross(ex).normalize(); return { p, ex, ey, n }; }
function loopGeo(plies, segs, radial, rp, rt, hw, hh) {
  const pos = [], nor = [], idx = [], cl = [];
  for (let p = 0; p < plies; p++) { const base = pos.length / 3;
    for (let s = 0; s <= segs; s++) { const th = Math.PI * s / segs, c = V3(-hw * Math.cos(th), 0, hh * Math.sin(th) - .0004), Tg = V3(hw * Math.sin(th), 0, hh * Math.cos(th)).normalize(), N = V3(0, 1, 0), B = Tg.clone().cross(N);
      const ph = p * 2 * Math.PI / plies + th * 4, C0 = plies > 1 ? c.clone().addScaledVector(N, rp * Math.cos(ph)).addScaledVector(B, rp * Math.sin(ph)) : c;
      for (let a = 0; a < radial; a++) { const aa = a / radial * 6.2832, d = N.clone().multiplyScalar(Math.cos(aa)).addScaledVector(B, Math.sin(aa)); pos.push(C0.x + rt * d.x, C0.y + rt * d.y, C0.z + rt * d.z); nor.push(d.x, d.y, d.z); const ao = .72 + .28 * Math.min(1, Math.max(0, (C0.z + rt * d.z) / hh)); cl.push(ao, ao * .985, ao * .96); } }
    for (let s = 0; s < segs; s++) for (let a = 0; a < radial; a++) { const i0 = base + s * radial + a, i1 = base + s * radial + (a + 1) % radial, i2 = i0 + radial, i3 = i1 + radial; idx.push(i0, i2, i1, i1, i2, i3); } }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3)); g.setAttribute("color", new THREE.Float32BufferAttribute(cl, 3)); g.setIndex(idx); return g;
}
const geoHi = loopGeo(3, 10, 4, .00031, .00027, .0026, .0034), geoLo = loopGeo(1, 6, 4, 0, .00105, .0027, .0036);
function buildTowel(x, o) {
  const g = new THREE.Group(); g.position.set(x, RAILY, 0); gA.add(g);
  const [tm, tb] = o.weave ? weave([5, 8.5]) : terry([6, 8]); const LS = o.ls; const fab = new THREE.MeshStandardMaterial({ map: tm, bumpMap: tb, bumpScale: o.weave ? 4 : 2.2, roughness: .95, color: 0xffffff });
  const fm = new THREE.PlaneGeometry(PWD, PHT, 20, 28); { const p = fm.attributes.position; for (let i = 0; i < p.count; i++) { const u = p.getX(i), v = (.5 - p.getY(i) / PHT) * PHT * 1 + 0; const vv = -p.getY(i) + PHT / 2; const q = panelSurf(u, vv); p.setXYZ(i, q.x, q.y, q.z); } fm.computeVertexNormals(); }
  { const p = fm.attributes.position, cl = []; for (let i = 0; i < p.count; i++) { const vv = -p.getY(i) + PHT / 2, a = .66 + .34 * smooth(vv / .075); cl.push(a, a, a); } fm.setAttribute('color', new THREE.Float32BufferAttribute(cl, 3)); fab.vertexColors = true; }
  const front = mesh(fm, fab, g); front.userData.fab = fab;
  const bm = new THREE.PlaneGeometry(PWD, PHT * .94, 4, 4); const white = gg => gg.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(gg.attributes.position.count * 3).fill(.8), 3)); white(bm); const back = mesh(bm, fab, g); back.rotation.y = Math.PI; back.position.set(0, -PHT * .47, -ZF);
  const foldG = new THREE.CylinderGeometry(ZF * 1.15, ZF * 1.15, PWD, 28, 1, true); white(foldG); const fold = mesh(foldG, fab, g); fold.rotation.z = Math.PI / 2; fold.material.side = THREE.DoubleSide;
  // woven border + slate hem band (no loops down here)
  const bandGeo = (v0, h) => { const gm = new THREE.PlaneGeometry(PWD, h, 24, 1), p = gm.attributes.position; for (let i = 0; i < p.count; i++) { const u = p.getX(i), v = v0 + p.getY(i), q = panelFrame(u, v); p.setXYZ(i, q.p.x + q.n.x * .0014, q.p.y + q.n.y * .0014, q.p.z + q.n.z * .0014); } gm.computeVertexNormals(); return gm; };
  const hem = mesh(bandGeo(PHT - .075, .022), std("#aab4c8", { roughness: .9, side: THREE.DoubleSide }), g, false), hem2 = mesh(bandGeo(PHT - .098, .006), std("#aab4c8", { roughness: .9, side: THREE.DoubleSide }), g, false);
  // instanced loops in chunks (hi = 3-ply yarn for macro, lo = single tube for wide)
  const cols = 8, rows = 12, nu = Math.floor((PWD - .014) / LS), nv = Math.floor((PHT - .1) / LS), chunks = [];
  const cells = Array.from({ length: cols * rows }, () => []);
  for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) { const u = -PWD / 2 + .007 + (i + .5 + (hash(i * 7.1 + j * 3.3 + x) - .5) * .5) * LS * (PWD - .014) / (nu * LS), v = .016 + (j + .5 + (hash(i * 2.3 + j * 9.7 + x) - .5) * .5) * LS;
    const cu = Math.min(cols - 1, Math.floor((u + PWD / 2) / PWD * cols)), cv = Math.min(rows - 1, Math.floor(v / (PHT - .06) * rows)); cells[cv * cols + cu].push([u, v, i, j]); }
  const mHi = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: .9, vertexColors: true, sheen: 1, sheenRoughness: .55, sheenColor: col("#ffffff") }), mLo = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .9, vertexColors: true });
  const M = new THREE.Matrix4(), cc = new THREE.Color();
  cells.forEach((cl, ci) => { if (!cl.length) return; const mk = (geo, mat) => { const im = new THREE.InstancedMesh(geo, mat, cl.length); im.castShadow = false; im.receiveShadow = true; g.add(im); return im; };
    const hi = o.hi ? mk(geoHi, mHi) : null, lo = mk(geoLo, mLo); const sumP = V3();
    cl.forEach(([u, v, i, j], k) => { const q = panelFrame(u, v), th = o.weave ? (hash(i * 3.7 + j * 1.9 + x * 5) - .5) * .55 + (hash(j * 1.7 + x) - .5) * .5 : (hash(i * 3.7 + j * 1.9 + x * 5) - .5) * 2.4 + (hash(i + j * 7.7) < .3 ? 1.57 : 0), c = Math.cos(th), s = Math.sin(th);
      const ex = q.ex.clone().multiplyScalar(c).addScaledVector(q.ey, s), ey0 = q.n.clone().cross(ex), lean = o.weave ? (hash(i * 6.7 + j * 2.9 + x) - .5) * .8 : (hash(i * 6.7 + j * 2.9 + x) - .35) * 1.5, up = q.n.clone().multiplyScalar(Math.cos(lean)).addScaledVector(ey0, Math.sin(lean)), ey = up.clone().cross(ex).normalize(), sw = (.95 + hash(i * 5.3 + j * 8.1) * .4) * (o.big || 1), sh = (.75 + hash(i * 1.1 + j * 6.3) * .45) * (o.big || 1);
      M.makeBasis(ex.multiplyScalar(sw), ey, up.multiplyScalar(sh)); M.setPosition(q.p); sumP.add(q.p);
      cc.setScalar((.93 + hash(i * 9.1 + j * 4.7) * .07) * (.7 + .3 * smooth(v / .07))).multiply(col(hash(i + j) < .5 ? "#fffdf8" : "#f7f8fa")); if (hi) { hi.setMatrixAt(k, M); hi.setColorAt(k, cc); } lo.setMatrixAt(k, M); lo.setColorAt(k, cc); });
    [hi, lo].forEach(m => { if (m) { m.instanceMatrix.needsUpdate = true; m.instanceColor.needsUpdate = true; m.computeBoundingSphere(); } });
    chunks.push({ hi, lo, c: sumP.divideScalar(cl.length) }); });
  return { g, fab, mHi, mLo, chunks, front, hem, hem2 };
}
const towelA = buildTowel(-.2, { hi: false, ls: .0075, big: 1.35 }), towelB = buildTowel(.2, { hi: true, ls: .0043, weave: true });
const towelX0 = buildTowel(-.6, { hi: false, ls: .0075, big: 1.35 }), towelX3 = buildTowel(.6, { hi: false, ls: .0075, big: 1.35 });
const DULL = col("#6f7276"), BRIGHT = col("#ffffff"), tmpC = new THREE.Color();
function dullT(tw, d) { tmpC.copy(BRIGHT).lerp(DULL, d); [tw.fab, tw.mHi, tw.mLo].forEach(m => m.color.copy(tmpC)); }
function setDull(d) { dullT(towelB, d); }
function lodTowel(tw, camPos, near) { tw.chunks.forEach(ch => { const wp = ch.c.clone().applyMatrix4(tw.g.matrixWorld), hiOn = !!ch.hi && camPos.distanceTo(wp) < near; if (ch.hi) { ch.hi.visible = hiOn; ch.hi.castShadow = hiOn; } ch.lo.visible = !hiOn; }); }

// -- biofilm patch on towel B (film sheet + bacteria + settlers), local to towelB.g
const PATCH = { u: .01, v: .2, w: .075, h: .1 }, NN = 128, nf = noiseField(NN, 3.7);
const nAt = (a, b) => nf[(Math.min(NN - 1, Math.max(0, Math.round(b * (NN - 1))))) * NN + Math.min(NN - 1, Math.max(0, Math.round(a * (NN - 1))))];
const filmTex = canvasTex(NN, (g, n) => { const id = g.createImageData(n, n); for (let i = 0; i < n * n; i++) { const v = nf[i] * 255; id.data.set([v, v, v, 255], i * 4); } g.putImageData(id, 0, 0); }, null, false);
filmTex.wrapS = filmTex.wrapT = THREE.ClampToEdgeWrapping;
const filmU = { uGrow: { value: 0 } };
const filmMat = new THREE.MeshPhysicalMaterial({ color: col("#4f9a98"), roughness: .25, clearcoat: .8, clearcoatRoughness: .25, transparent: true, depthWrite: false, side: THREE.DoubleSide, alphaMap: filmTex, bumpMap: filmTex, bumpScale: 3, emissive: col("#0b7270"), emissiveIntensity: .06 });
filmMat.onBeforeCompile = sh => { sh.uniforms.uGrow = filmU.uGrow; sh.fragmentShader = "uniform float uGrow;\n" + sh.fragmentShader.replace("#include <alphamap_fragment>", "float nn = texture2D(alphaMap, vAlphaMapUv).g; float th = 1.0 - uGrow * 1.18; diffuseColor.a *= smoothstep(th, th + .1, nn) * .8;"); };
const filmGeo = new THREE.PlaneGeometry(PATCH.w, PATCH.h, 80, 106);
{ const p = filmGeo.attributes.position, uv = filmGeo.attributes.uv; for (let i = 0; i < p.count; i++) { const a = uv.getX(i), b = 1 - uv.getY(i), u = PATCH.u + (a - .5) * PATCH.w, v = PATCH.v + (b - .5) * PATCH.h, q = panelFrame(u, v), h = .0006 + .0007 * nAt(a, b) + .0002 * Math.sin(a * 70); p.setXYZ(i, q.p.x + q.n.x * h, q.p.y + q.n.y * h, q.p.z + q.n.z * h); } filmGeo.computeVertexNormals(); }
const film = new THREE.Mesh(filmGeo, filmMat); film.renderOrder = 3; film.visible = false; towelB.g.add(film);
const NB = 3200, bGeo = new THREE.CapsuleGeometry(.00022, .0007, 3, 7), bMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .55 });
const bact = new THREE.InstancedMesh(bGeo, bMat, NB); bact.castShadow = true; bact.visible = false; towelB.g.add(bact);
const BCOL = ["#0b7270", "#2f7f7c", "#5a6275", "#6d7a92", "#3c8f8b", "#475066"].map(col), bd = [];
for (let i = 0; i < NB; i++) { let a, b, tries = 0; do { a = hash(i * 3.1 + tries * 17.3); b = hash(i * 5.7 + 1.3 + tries * 11.9); tries++; } while (nAt(a, b) < .32 && tries < 8);
  const u = PATCH.u + (a - .5) * PATCH.w, v = PATCH.v + (b - .5) * PATCH.h, q = panelFrame(u, v), h = .0007 + hash(i * 7.3) * .001, ang = hash(i * 9.9) * 6.3, tilt = (hash(i * 2.7) - .5) * .5;
  const ex = q.ex.clone().multiplyScalar(Math.cos(ang)).addScaledVector(q.ey, Math.sin(ang)); // capsule axis (Y) along ex
  const m = new THREE.Matrix4().makeBasis(ex.clone().cross(q.n), ex, q.n); const qu = new THREE.Quaternion().setFromRotationMatrix(m).multiply(new THREE.Quaternion().setFromAxisAngle(V3(1, 0, 0), tilt));
  bd.push({ p: q.p.clone().addScaledVector(q.n, h), q: qu, thr: clamp((1 - nAt(a, b)) / 1.18 + .05 + hash(i) * .05), s: .8 + hash(i * 4.4) * .6, len: hash(i * 6.6) < .35 ? .25 : .7 + hash(i * 2.9) * .8 }); bact.setColorAt(i, BCOL[Math.floor(hash(i * 13.1) * BCOL.length)]); }
const _m = new THREE.Matrix4(), _s = V3(), _p = V3();
function updBact(g) { let any = false; for (let i = 0; i < NB; i++) { const d = bd[i], k = smooth((g - d.thr) / .09) * d.s; if (k > 0) any = true; _s.set(k, k * d.len, k); _m.compose(d.p, d.q, _s); bact.setMatrixAt(i, _m); } bact.instanceMatrix.needsUpdate = true; bact.visible = any; }
const NSET = 520, sMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .5 }), settlers = new THREE.InstancedMesh(new THREE.CapsuleGeometry(.00026, .0008, 3, 7), sMat, NSET), sd = [];
settlers.castShadow = true; settlers.visible = false; towelB.g.add(settlers);
for (let i = 0; i < NSET; i++) { const u = PATCH.u + (hash(i * 1.9) - .5) * .024, v = PATCH.v + (hash(i * 4.1 + 2) - .5) * .04, q = panelFrame(u, v); sd.push({ q, h: .0007 + hash(i * 6.1) * .0009, ang: hash(i * 8.8) * 6.3, delay: hash(i * 3.3) * 2.0, dx: (hash(i * 5.5) - .5) * .004, dy: (hash(i * 2.2) - .5) * .004 }); }
function updSettle(lt) { let any = false; for (let i = 0; i < NSET; i++) { const d = sd[i], u = clamp((lt - d.delay) / .7), e = eo3(u), k = smooth(u * 4); if (k > 0) any = true;
  const q = d.q; _p.copy(q.p).addScaledVector(q.n, d.h + (1 - e) * .014).addScaledVector(q.ex, d.dx * (1 - e)).addScaledVector(q.ey, d.dy * (1 - e));
  const ex = q.ex.clone().multiplyScalar(Math.cos(d.ang)).addScaledVector(q.ey, Math.sin(d.ang)), m = new THREE.Matrix4().makeBasis(ex.clone().cross(q.n), ex, q.n), qu = new THREE.Quaternion().setFromRotationMatrix(m);
  _s.set(k, k * (i % 3 ? 1 : .3), k); _m.compose(_p, qu, _s); settlers.setMatrixAt(i, _m); } settlers.instanceMatrix.needsUpdate = true; settlers.visible = any; }
for (let i = 0; i < NSET; i++) settlers.setColorAt(i, [col("#2f9c97"), col("#4aa6a2"), col("#0b7270")][i % 3]);
// ------------------------------------------------------------ hooks for the "never share" shot (two towels, two hooks)
const hooks = new THREE.Group(); gA.add(hooks); hooks.visible = false;
{ const hm = std("#b9c0cc", { roughness: .35, metalness: .6 });
  [-.3, .3].forEach(x => { const pl = mesh(roundedBox(.05, .09, .012, .004, 2), hm, hooks); pl.position.set(x, RAILY + .02, -.05);
    const ar = mesh(new THREE.CylinderGeometry(.007, .007, .06, 12), hm, hooks); ar.rotation.x = Math.PI / 2; ar.position.set(x, RAILY + .035, -.02);
    const tip = mesh(new THREE.SphereGeometry(.012, 14, 10), hm, hooks); tip.position.set(x, RAILY + .035, .012); }); }

// ------------------------------------------------------------ STAGE H: 26 households = 26 towels on 26 hooks (wall of hooks, 6 columns x 5 rows)
const gH = new THREE.Group(); scene.add(gH); const HX = 20; gH.position.x = HX; gH.visible = false;
const HC = 6, HPX = .13, HPY = .19, hTow = [];
{ const wm = mesh(new THREE.PlaneGeometry(1.8, 2.2), std("#cdd4dc", { roughness: .95, map: wallTex }), gH, false); wm.position.set(0, .8, -.05);
  const [tm, tb] = terry([1.1, 1.5], [244, 242, 236]), tints = ["#ffffff", "#f6f3ec", "#eef2f3", "#f7f1ec", "#fbfaf6"], hm = std("#aeb6c6", { roughness: .4, metalness: .5 }), kg = new THREE.SphereGeometry(.009, 12, 8);
  const mats = tints.map(h => new THREE.MeshStandardMaterial({ map: tm, bumpMap: tb, bumpScale: 2.6, roughness: .95, color: col(h) }));
  for (let k = 0; k < 26; k++) { const cx = k % HC, cy = Math.floor(k / HC), g = new THREE.Group(), x = (cx - (HC - 1) / 2) * HPX, y = 1.05 - cy * HPY; g.position.set(x, y, 0); gH.add(g);
    const hk = mesh(kg, hm, g); hk.position.set(0, 0, .008); const pl = mesh(roundedBox(.02, .022, .006, .002, 2), hm, g); pl.position.set(0, .004, -.02);
    const w = .105, h = .13 + hash(k * 3.3) * .03, geo = new THREE.PlaneGeometry(w, h, 8, 12), p = geo.attributes.position, ph = hash(k * 7.1) * 6;
    for (let i = 0; i < p.count; i++) { const u = p.getX(i), v = h / 2 - p.getY(i), f = clamp(v / h); p.setXYZ(i, u, -v - .004, .014 + .012 * Math.sin(Math.PI * Math.pow(f, .8)) * (.55 + .45 * Math.cos(u * 70 + ph)) + .002 * Math.sin(u * 150 + v * 40) * smooth(f * 4)); }
    geo.computeVertexNormals(); const tw = mesh(geo, mats[k % 5], g); tw.rotation.z = (hash(k * 2.7) - .5) * .05; g.userData.tw = tw; g.visible = k === 0; hTow.push(g); } }

// ------------------------------------------------------------ STAGE D: tabletop, the same clean cotton towel beside a plain paper-towel stack (equal size, weight, light)
const gD = new THREE.Group(); scene.add(gD); const DX = 140; gD.position.x = DX; gD.visible = false;
{ const tbl = mesh(roundedBox(1.6, .04, .8, .01, 2), std("#d9d1c4", { roughness: .8, map: wallTex }), gD); tbl.position.set(0, -.02, 0);
  const bw = mesh(new THREE.PlaneGeometry(3.2, 2.2), std("#dfe3e8", { roughness: .95, map: wallTex }), gD, false); bw.position.set(0, 1.0, -.4);
  const [tm, tb] = terry([2.2, 1.6], [246, 244, 238]); const cot = new THREE.MeshStandardMaterial({ map: tm, bumpMap: tb, bumpScale: 3, roughness: .95 });
  const tw = mesh(roundedBox(.30, .10, .22, .022, 6), cot, gD); tw.position.set(-.21, .05, 0);
  const side = canvasTex(256, (g, n) => { g.fillStyle = "#f5f4f0"; g.fillRect(0, 0, n, n); for (let y = 0; y < n; y += 4) { g.fillStyle = `rgba(150,150,145,${.18 + .1 * hash(y)})`; g.fillRect(0, y, n, 1.2); } });
  const top = canvasTex(256, (g, n) => { g.fillStyle = "#f6f5f1"; g.fillRect(0, 0, n, n); g.strokeStyle = "rgba(160,160,155,.35)"; g.lineWidth = 1.2; for (let i = -n; i < n * 2; i += 16) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + n, n); g.moveTo(i, n); g.lineTo(i + n, 0); g.stroke(); } }, [1, 1]);
  const pm = (m) => new THREE.MeshStandardMaterial({ map: m, roughness: .9 });
  const stack = new THREE.Mesh(roundedBox(.30, .10, .22, .004, 3), [pm(side), pm(side), pm(top), pm(top), pm(side), pm(side)]); stack.castShadow = stack.receiveShadow = true; stack.position.set(.21, .05, 0); gD.add(stack); }

// ------------------------------------------------------------ STAGE E1: forearm (deep brown): curved silhouette, pores, fine curved hairs, raking light
const gE1 = new THREE.Group(); scene.add(gE1); const E1X = 80; gE1.position.x = E1X; gE1.visible = false;
{ const geo = new THREE.CylinderGeometry(.055, .05, 1.6, 96, 1, true); geo.rotateY(Math.PI); const arm = mesh(geo, skinMat(C.skin[3], [6, 26], { rough: .46, relief: .9, pore: 1.1, seed: 11 }), gE1); arm.rotation.z = Math.PI / 2; arm.position.set(.1, 0, 0);
  const hm = new THREE.MeshStandardMaterial({ color: col("#1b0e08"), roughness: .5 });
  gE1.add(hairs(1500, hairGeo(.0075, .00019, .5), hm, i => { const x = -.45 + hash(i * 1.7) * 1.1, th = (hash(i * 3.1) - .5) * 3.4 + .2, R = .0525 - (x - .1) * .0006, n = V3(0, Math.sin(th), Math.cos(th)), a = (hash(i * 5.3) - .5) * .7;
    const d = V3(Math.cos(a) * .8, 0, 0).addScaledVector(n, .5 + hash(i * 6.1) * .3).addScaledVector(V3(0, 1, 0), Math.sin(a) * .2).normalize(); return { p: V3(x, R * n.y, R * n.z), d, s: .6 + hash(i * 8.3) * .9 }; }, 11));
  // soft warm backdrop behind the arm so the upper edge reads against fall-off
  const bk = new THREE.Mesh(new THREE.PlaneGeometry(3, 2), new THREE.MeshBasicMaterial({ map: canvasTex(256, (g, n) => { const gr = g.createRadialGradient(n * .55, n * .45, 0, n * .5, n * .5, n * .75); gr.addColorStop(0, "#5a3a2a"); gr.addColorStop(1, "#1d110c"); g.fillStyle = gr; g.fillRect(0, 0, n, n); }, null) })); bk.position.set(.1, .05, -.16); gE1.add(bk); }

// ------------------------------------------------------------ STAGE E2: two culture dishes seen top-down, micrograph look; microbes differ by COLOUR only (all round colonies)
const gE2 = new THREE.Group(); scene.add(gE2); const E2X = 90; gE2.position.x = E2X; gE2.visible = false;
const discZ = [-.28, .28], sliver = V3();
{ const glass = new THREE.MeshPhysicalMaterial({ color: 0xcfe3ea, roughness: .08, transmission: 0, transparent: true, opacity: .32, clearcoat: 1, side: THREE.DoubleSide });
  const agar = new THREE.MeshStandardMaterial({ color: col("#e9ddb0"), roughness: .3, emissive: col("#d9c98a"), emissiveIntensity: .35 });
  discZ.forEach(z => { const d = mesh(new THREE.CylinderGeometry(.205, .205, .014, 80), agar, gE2); d.position.set(0, .01, z);
    const prof = [new THREE.Vector2(.22, 0), new THREE.Vector2(.225, .028), new THREE.Vector2(.221, .03), new THREE.Vector2(.214, .002)], rim = mesh(new THREE.LatheGeometry(prof, 80), glass, gE2, false); rim.position.set(0, 0, z);
    const bas = mesh(new THREE.CylinderGeometry(.22, .22, .004, 80), glass, gE2, false); bas.position.set(0, .002, z); });
  const sph = new THREE.SphereGeometry(1, 14, 10), mk = (n, hexes, z, spread, clus) => { const im = new THREE.InstancedMesh(sph, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .35, emissive: 0xffffff, emissiveIntensity: .25 }), n), M = new THREE.Matrix4(), cc = new THREE.Color(); im.castShadow = true;
    for (let k = 0; k < n; k++) { const cl = Math.floor(hash(k * 3.7 + z) * clus), ca = hash(cl * 5.3 + z * 9) * 6.3, cr = Math.sqrt(hash(cl * 2.1 + 1 + z)) * spread, a = hash(k * 7.7 + z) * 6.3, r = Math.sqrt(hash(k * 1.9 + 3 + z)) * .036, x = Math.cos(ca) * cr + Math.cos(a) * r, zz = z + Math.sin(ca) * cr + Math.sin(a) * r, s = .0034 + hash(k * 4.1) * .0045;
      if (x * x + (zz - z) * (zz - z) > .19 * .19) { M.compose(V3(0, -1, 0), new THREE.Quaternion(), V3(0, 0, 0)); } else M.compose(V3(x, .019 + s * .3, zz), new THREE.Quaternion(), V3(s, s * .75, s)); im.setMatrixAt(k, M); im.setColorAt(k, cc.set(hexes[k % hexes.length])); } gE2.add(im); return im; };
  mk(520, ["#d98a3d", "#e0a04f", "#c4732f", "#e8b565"], discZ[0], .15, 16);    // skin dish: warm amber colonies
  mk(520, ["#0b7270", "#2f9c97", "#5a6275", "#3c8f8b"], discZ[1], .17, 22);   // towel dish: teal + slate colonies
  const st = mesh(sph, std(C.rose, { roughness: .3, emissive: col(C.rose), emissiveIntensity: .35 }), gE2); st.scale.set(.0075, .0058, .0075); st.position.set(.09, .0225, discZ[1] - .06); sliver.copy(st.position); sliver.x += E2X;
  const ring = mesh(new THREE.TorusGeometry(.03, .0022, 8, 40), std("#ffffff", { roughness: .6, emissive: 0xffffff, emissiveIntensity: .6 }), gE2, false); ring.rotation.x = Math.PI / 2; ring.position.copy(st.position); ring.position.y = .016; }

// ------------------------------------------------------------ STAGE F: a light-skin cheek + jaw (curved), a folded hemmed towel pressing into it (skin dents, contact shadow)
const gF = new THREE.Group(); scene.add(gF); const FX = 100; gF.position.x = FX; gF.visible = false;
const FA = [.19, .27, .17], FC = -.17, FTONE = "#e2b391", FJ = [.17, .15, .17, -.21, -.2];
const ellG = (a, b, c, cy, cz) => { const g = new THREE.SphereGeometry(1, 160, 120); g.scale(a, b, c); g.translate(0, cy, cz); return g; };
const cheekMat = skinMat(FTONE, [34, 20], { rough: .46, relief: .8, pore: 1, seed: 21 });
const cheekSurf = (x, y) => { const e = 1 - (x / FA[0]) ** 2 - (y / FA[1]) ** 2, z = FC + FA[2] * Math.sqrt(Math.max(e, .001)); return { p: V3(x, y, z), n: V3(x / FA[0] ** 2, y / FA[1] ** 2, (z - FC) / FA[2] ** 2).normalize() }; };
{ const cheek = mesh(ellG(FA[0], FA[1], FA[2], 0, FC), cheekMat, gF), jaw = mesh(ellG(FJ[0], FJ[1], FJ[2], FJ[3], FJ[4]), cheekMat, gF);
  gF.add(hairs(2600, hairGeo(.0042, .00011, .6), new THREE.MeshStandardMaterial({ color: col("#cdb299"), roughness: .6, transparent: true, opacity: .7 }), i => { const x = (hash(i * 1.3) - .5) * .3, y = (hash(i * 2.9) - .5) * .38, sf = cheekSurf(x, y), a = hash(i * 4.7) * 6.3, d = sf.n.clone().multiplyScalar(.55).add(V3(Math.cos(a) * .4, -.7 + Math.sin(a) * .3, 0)).normalize(); return { p: sf.p, d, s: .6 + hash(i * 6.1) * .9 }; }, 21)); }
const patTw = new THREE.Group(); gF.add(patTw); patTw.visible = false;
{ const [m, b] = terry([1.5, 1.2], [248, 246, 241]), top = new THREE.MeshStandardMaterial({ map: m, bumpMap: b, bumpScale: 3, roughness: .95 });
  const sideTex = canvasTex(512, (g, n) => { g.fillStyle = "#f3f1ea"; g.fillRect(0, 0, n, n); for (let y = 0; y < n; y += 6) { g.fillStyle = `rgba(120,118,112,${.1 + .14 * hash(y * .7)})`; g.fillRect(0, y + hash(y) * 2, n, 1.6); } // fold plies + woven weft
    g.fillStyle = "#aab4c8"; g.fillRect(0, n * .62, n, n * .13); g.fillStyle = "rgba(255,255,255,.55)"; for (let x = 6; x < n; x += 16) g.fillRect(x, n * .64, 8, 2.2); g.fillRect(0, n * .72, n, 2); // slate hem band + stitch line
    for (let k = 0; k < 900; k++) { g.fillStyle = `rgba(255,255,255,${.1 + .2 * hash(k)})`; g.fillRect(hash(k * 3.1) * n, hash(k * 5.3) * n, 3 + hash(k) * 9, 1); } }, [1, 1]);
  const side = new THREE.MeshStandardMaterial({ map: sideTex, roughness: .95, bumpMap: sideTex, bumpScale: 1.6 });
  const tw = mesh(roundedBox(.13, .036, .09, .011, 8), [side, side, top, top, side, side], patTw); tw.position.set(0, 0, 0); }

// ------------------------------------------------------------ STAGE G: five skin tones, light to deep, matte, convex forms with raking light
const gG = new THREE.Group(); scene.add(gG); const GX = 120; gG.position.x = GX; gG.visible = false; const GW = .2;
C.skin.forEach((h, i) => { const geo = new THREE.PlaneGeometry(GW, 1.1, 40, 60), p = geo.attributes.position; for (let k = 0; k < p.count; k++) { const y = p.getY(k), x = p.getX(k); p.setZ(k, -.35 * y * y - 1.8 * x * x - .006 * Math.cos(x * 15 + i) + .004 * Math.sin(y * 11 + i * 2)); } geo.computeVertexNormals();
  const m = mesh(geo, skinMat(h, [GW / .03, 1.1 / .03], { rough: .5, relief: .85 + .1 * i, pore: .9 + .15 * i, seed: 40 + i * 7, freckle: i === 0 ? 1 : i === 1 ? .5 : 0 }), gG); m.position.set(i * GW, 0, 0);
  const sh = hairs(260, hairGeo(.005, .00015, .5), new THREE.MeshStandardMaterial({ color: col(i < 2 ? "#a58c78" : "#120a06"), roughness: .6, transparent: true, opacity: i < 2 ? .5 : .9 }), k => { const x = (hash(k * 1.3 + i) - .5) * GW * .94, y = (hash(k * 2.9 + i) - .5) * .36, z = -.35 * y * y - 1.8 * x * x, n = V3(3.6 * x, .7 * y, 1).normalize(), a = hash(k * 4.7) * .6; return { p: V3(x + i * GW, y, z), d: n.clone().multiplyScalar(.5).add(V3(Math.sin(a), -.7, 0)).normalize(), s: .6 + hash(k * 6.1) * .9 }; }, 40 + i); gG.add(sh); });

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

// ------------------------------------------------------------ beat shots (each a pure function of t -> camera key list)
const K1 = (p, l, f, o, ap, fp) => [{ t: 0, p, l, f, fp: fp || l, o: o || [0, 0], ap: ap || 1 }];
const L3 = (a, b, u) => a.map((v, i) => lerp(v, b[i], u));
const U = (t, a, b) => clamp((t - a) / (b - a));
const BEATS = tl.beats.map(b => b.id);
const stageOf = t => { let id = BEATS[0]; for (const b of BEATS) if (t >= S(b)) id = b; return id; };
const tDisp = () => W("b14", "Disposable towels") - .1, tDerm = () => W("b14", "Dermatologists say") - .1;
const cut8 = () => W("b08", "Mostly not") - .12, cut10 = () => W("b10", "The study never") - .15, cut12 = () => W("b12", "pat your skin") - .12;
const B4X = [-.6, -.2, .2, .6], B4T = () => { const w0 = W("b04", "Every two months"); return [S("b04") + .35, w0 + .2, w0 + .9, w0 + 1.6]; };
const slideCam = t => { const t0 = tDerm(), t1 = END("b15") + .3, P = (t1 - t0) / 5, MV = .34, tt = clamp(t - t0, 0, t1 - t0), i = Math.min(4, Math.floor(tt / P)), lt = tt - (i * P + P - MV), x = (i + (i < 4 ? eio(lt / MV) : 0)) * GW; return K1([GX + x, .02, .5], [GX + x, 0, 0], 50, [0, 0], 1.2); };
const MACRO = { p: [.205, .55, .15], l: [.215, .545, .02], f: 100 };
function camFor(id, t, stg) {
  const s0 = S(id), e0 = E(id);
  switch (id) {
    case "b01": { const s = U(t, 0, T.hookEnd), q = smooth(U(t, .8, 2.2)), x = lerp(.186, .228, s), y = lerp(.563, .551, s); return K1([x, y, lerp(.175, .105, q)], [x + .012, y - .006, .04], lerp(92, 112, q), [0, -150], 2.2, [x + .012, y - .006, .046]); }
    case "b02": { const u = U(t, s0, e0), q = eio(U(t, 4.6, e0)), p0 = [lerp(.02, .12, u), lerp(.47, .45, u), lerp(1.95, 1.75, u)], l0 = [lerp(.1, .17, u), .42, 0]; return K1(L3(p0, [.29, .4, 1.15], q), L3(l0, [.3, .33, .06], q), 50, L3([190, 170], [60, 170], q), 1.4, L3([.2, .36, .03], [.3, .3, .07], q)); }
    case "b03": { const tp = W("b03", "One study"), tt = W("b03", "twenty-six"), u = eio(U(t, tp - .3, tt + .9)), x0 = HX - (HC - 1) / 2 * HPX, p0 = [x0 + .01, 1.0, .46], l0 = [x0 + .01, .94, 0]; return K1(L3(p0, [HX, .62, 3.1], u), L3(l0, [HX, .62, 0], u), 50, [lerp(0, 170, u), lerp(0, -70, u)], 1.2); }
    case "b04": { const ts = B4T(); let x = B4X[0]; for (let i = 1; i < 4; i++) if (t > ts[i - 1]) x = lerp(B4X[i - 1], B4X[i], eio((t - ts[i - 1]) / (ts[i] - ts[i - 1] + .0001))); return K1([x, .52, 2.3], [x, .47, 0], 50, [215, 50], 1, [x, .47, .03]); }
    case "b05": { const a = S("b05"), m0 = W("b05", "Under a microscope") - .3, k = [{ t: a, p: [0, .46, 3.0], l: [0, .46, 0], f: 50, fp: [0, .46, .02], o: [235, 90] }, { t: a + 1.7, p: [0, .46, 3.0], l: [0, .46, 0], f: 50, fp: [0, .46, .02], o: [235, 90] },
      { t: m0, p: [.21, .52, .45], l: [.21, .52, 0], f: 70, fp: [.21, .52, .04], o: [60, 40] }, { t: e0, p: [.215, .545, .13], l: [.215, .545, .02], f: 100, fp: [.215, .545, .045], o: [60, 30] }]; return k; }
    case "b06": case "b07": { const u = U(t, S("b06"), E("b07")); return K1([lerp(.17, .23, u), lerp(.52, .47, u), lerp(1.3, 1.0, u)], [.2, .42, 0], 50, [160, 30], 1.5, [.2, .4, .03]); }
    case "b08": { if (stg === "E1") { const u = eio(U(t, s0, cut8())), x = lerp(-.1, .1, u); return K1([E1X + x, .12, .2], [E1X + x + .02, .03, .02], 85, [130, 0], 1.9, [E1X + x, .02, .045]); }
      const a = W("b08", "Staph"), b = W("b08", "was typically"), c = cut8(); return [
        { t: c, p: [E2X, 1.1, -.03], l: [E2X, 0, -.28], f: 50, fp: [E2X, .02, -.28], o: [110, 0] }, { t: a - .3, p: [E2X, 1.1, -.03], l: [E2X, 0, -.28], f: 50, fp: [E2X, .02, -.28], o: [110, 0] },
        { t: a + .9, p: [E2X, 1.1, .53], l: [E2X, 0, .28], f: 50, fp: [E2X, .02, .28], o: [110, 0] }, { t: b - .1, p: [E2X, 1.1, .53], l: [E2X, 0, .28], f: 50, fp: [E2X, .02, .28], o: [110, 0] },
        { t: E("b08"), p: [E2X + .08, .6, .4], l: [E2X + .09, .02, .21], f: 62, fp: [E2X + .09, .02, .22], o: [110, -40] }]; }
    case "b09": return [{ t: s0, p: [.198, .552, .14], l: [.205, .55, .02], f: 100, fp: [.205, .55, .045], o: [30, 0], ap: 1.4 }, { t: e0, p: [.213, .549, .122], l: [.212, .55, .02], f: 100, fp: [.212, .55, .045], o: [30, 0], ap: 1.4 }];
    case "b10": { const c = cut10(); if (t < c) { const u = U(t, s0, c); return K1([FX - .16 + .06 * u, .07, .56 - .05 * u], [FX + .01, -.01, 0], 85, [150, 20], 1.9, [FX + .02, 0, 0]); } const u = U(t, c, e0); return K1([FX - .44 + .06 * u, .13, .33], [FX + .0, -.02, -.02], 70, [130, 20], 1.9, [FX, 0, -.01]); }
    case "b11": { const u = U(t, s0, e0); return K1([DX, lerp(.3, .27, u), lerp(2.15, 1.85, u)], [DX, .07, 0], 50, [60, 90], 1.1); }
    case "b12": { if (stg === "A") { const u = U(t, s0, cut12()); return K1([lerp(.0, .03, u), .52, lerp(2.7, 2.45, u)], [0, .47, 0], 50, [40, 130], 1.2, [0, .47, .03]); } const u = U(t, cut12(), e0); return K1([FX + .4 - .05 * u, .1, .3], [FX - .01, -.01, -.02], 70, [120, 20], 1.9, [FX + .02, 0, -.01]); }
    case "b13": { const u = U(t, s0, S("b14")); return K1(L3(MACRO.p, [.212, .548, .14], u), MACRO.l, 100, [60, -100], 1.0, [.215, .545, .045]); }
    case "b14": { if (stg === "D") { const u = U(t, tDisp(), tDerm()); return K1([DX + lerp(.05, -.03, u), lerp(.3, .26, u), lerp(2.0, 1.75, u)], [DX, .07, 0], 50, [60, 90], 1.1); }
      if (stg === "G") return slideCam(t);
      const u = eio(U(t, S("b14"), tDisp())); return K1(L3([.212, .548, .14], [0, .5, 3.4], u), L3(MACRO.l, [0, .5, 0], u), lerp(100, 50, u), [lerp(60, 150, u), lerp(-100, 150, u)], 1.0, L3([.215, .545, .045], [0, .5, .02], u)); }
    case "b15": return slideCam(t);
  }
}

// ------------------------------------------------------------ the frame
const STAGES = { A: gA, H: gH, D: gD, E1: gE1, E2: gE2, F: gF, G: gG };
const BG = { A: C.receipt, H: "#cdd4dc", D: "#dfe3e8", E1: "#2b1b14", E2: "#0c142e", F: "#cfc3b8", G: "#cfc3b8" };
const KEYI = { A: 3.3, H: 2.6, D: 2.8, E1: 2.4, E2: 1.3, F: 2.4, G: 2.4 };
function show(name) { for (const k in STAGES) STAGES[k].visible = k === name; wall.visible = name === "A"; ground.visible = name === "A"; scene.background.set(BG[name]); }
const prog = (a, b, t) => smooth((t - a) / (b - a));
function stage(t) {
  const id = stageOf(t), A = { id };
  let stg = "A"; if (id === "b03") stg = "H"; else if (id === "b08") stg = t < cut8() ? "E1" : "E2"; else if (id === "b10") stg = "F"; else if (id === "b11") stg = "D"; else if (id === "b12") stg = t < cut12() ? "A" : "F"; else if (id === "b14") stg = t < tDisp() ? "A" : t < tDerm() ? "D" : "G"; else if (id === "b15") stg = "G";
  show(stg); const keys = camFor(id, t, stg), cam = applyCam(keys, keys.length > 1 ? t : 0);
  const focus = V3(...cam.fp), macro = camera.position.distanceTo(focus) < .5, ext = macro ? .1 : (stg === "A" || stg === "D" ? 1.1 : stg === "H" || stg === "E2" ? 1.6 : .4);
  key.position.copy(focus).add((stg === "E1" || stg === "F" || stg === "G" ? V3(-1.5, .3, .55).multiplyScalar(.7) : V3(-1.6, .6, .9).multiplyScalar(macro ? .7 : 1.4))); key.target.position.copy(focus); key.target.updateMatrixWorld(); key.intensity = KEYI[stg];
  Object.assign(key.shadow.camera, { left: -ext, right: ext, top: ext, bottom: -ext, near: .1, far: 8 }); key.shadow.camera.updateProjectionMatrix();
  if (stg === "A") {
    const dull = id === "b05" ? prog(W("b05", "looked dull") - .45, W("b05", "looked dull") + .45, t) : (id === "b06" || id === "b07" || id === "b09" || id === "b13" || id === "b14") ? 1 : 0;
    setDull(dull); const sh = id === "b12";
    gRail.visible = !sh; hooks.visible = sh; towelA.g.position.x = sh ? -.3 : -.2; towelX3.g.position.x = sh ? .3 : .6;
    towelB.g.rotation.x = 0; [towelA, towelX0, towelX3].forEach(w => { dullT(w, 0); w.g.rotation.x = 0; });
    towelA.g.visible = true; towelX0.g.visible = id === "b04"; towelX3.g.visible = id === "b04" || sh; towelB.g.visible = !sh;
    if (id === "b04") { const ts = B4T(), dv = [0, .35, .7, 1], tws = [towelX0, towelA, towelB, towelX3]; A.ticks = [];
      tws.forEach((w, i) => { const lt = t - ts[i]; dullT(w, i === 0 ? 0 : dv[i] * smooth(lt / .7)); w.g.rotation.x = lt < 0 ? 0 : -.2 * Math.sin(clamp(lt / 1.0) * Math.PI); const q = px(V3(B4X[i], RAILY + .07, .03)); A.ticks.push({ x: q.x, y: q.y - 14, t: ts[i] }); }); }
    if (id === "b02") { const tL = W("b02", "Let's check"), a = smooth(U(t, tL - .15, tL + 1.0)), ang = -.42 * a - .035 * Math.sin(t * 2.2) * a; towelB.g.rotation.x = ang; }
    towelB.g.updateMatrixWorld(true); [towelA, towelX0, towelX3].forEach(w => w.g.updateMatrixWorld(true));
    lodTowel(towelB, camera.position, .75); [towelA, towelX0, towelX3].forEach(w => lodTowel(w, camera.position, 0));
    const wf = W("b01", "film"); let g = 0, macroOn = false;
    if (id === "b01") { g = .95 * prog(wf - .35, wf + .7, t); macroOn = true; } else if (id === "b05") { g = .62 * prog(W("b05", "Under a microscope") - .2, W("b05", "biofilm") + .4, t); macroOn = t > W("b05", "Under a microscope") - .6; } else if (id === "b13" || id === "b14") { g = .85; macroOn = true; }
    filmU.uGrow.value = g; film.visible = macroOn && g > .005; if (macroOn) updBact(g); else bact.visible = false;
    if (id === "b13" || id === "b14") updSettle(5); else if (id === "b09") { macroOn = true; updSettle(t - (W("b09", "settle") - 2.4)); } else settlers.visible = false;
    if (id === "b05") { const wide = 1 - prog(S("b05") + 1.6, S("b05") + 2.4, t); A.cmpA = wide; const a = px(V3(-.2, RAILY + .1, 0)), b = px(V3(.2, RAILY + .1, 0)); A.cmp = [a.x, b.x, a.y - 4]; }
  }
  if (stg === "H") { const tp = W("b03", "One study"), tt = W("b03", "twenty-six") + .15;
    hTow.forEach((h, k) => { const tk = k === 0 ? -9 : lerp(tp, tt, (k - 1) / 24), lt = t - tk, s = lt < 0 ? 0 : eob(clamp(lt / .3)); h.visible = s > 0; h.scale.setScalar(Math.max(.001, s)); });
    A.h0 = W("b03", "twenty-six") - .05; }
  if (stg === "D") { const q = px(V3(DX, .2, 0)); A.nt = { x: Math.min(q.x + 60, 640), y: Math.max(q.y - 170, 330) }; }
  if (stg === "E2") { const a = px(V3(E2X, .02, discZ[0] + .3)), b = px(V3(E2X, .02, discZ[1] + .3)); A.discs = [{ x: a.x, y: a.y }, { x: b.x, y: b.y }]; A.sliver = px(sliver); A.discT = cut8(); }
  if (stg === "F") { const T0 = id === "b10" ? S("b10") : cut12(), r = .85, cyc = Math.floor(t * r), ph = (t * r) % 1, pat = Math.pow(Math.sin(ph * Math.PI), 2.2), enter = smooth(U(t, T0, T0 + .9)), cx = .045 + .03 * Math.sin(cyc * 2.3), cy = -.02 + .035 * Math.cos(cyc * 1.7), sf = cheekSurf(cx, cy), n = sf.n;
    const qn = new THREE.Quaternion().setFromUnitVectors(V3(0, 1, 0), n), qt = new THREE.Quaternion().setFromAxisAngle(n, .35 + .25 * Math.sin(cyc * 1.3 + 1)); qt.multiply(qn);
    const tex = V3(1, 0, 0).applyQuaternion(qt), drift = (1 - enter) * .35 + (1 - pat) * .05 * Math.sin(cyc * 1.1);
    patTw.visible = true; patTw.quaternion.copy(qt); patTw.position.copy(sf.p).addScaledVector(n, .0185 - .0038 * pat + (1 - pat) * .07 + (1 - enter) * .08).addScaledVector(tex, drift); patTw.updateMatrixWorld(true);
    skinU.uPress.value.copy(sf.p); skinU.uDepth.value = .0042 * Math.pow(pat, 1.5); skinU.uAO.value = .42 * Math.pow(pat, 1.2);
    const q = px(V3(FX, 0, 0)), qx = px(V3(FX + .1, 0, 0)), qy = px(V3(FX, .12, 0)); A.cheek = { x: q.x, y: q.y, rx: Math.abs(qx.x - q.x), ry: Math.abs(qy.y - q.y) }; }
  else { skinU.uDepth.value = 0; skinU.uAO.value = 0; }
  A.stg = stg; return A;
}

window.__seek = function (t) {
  if (COVER) { // cover: towel macro with the film, headline plate below, receipt total + UNKNOWN stamp top-left
    show("A"); setDull(1); towelB.g.rotation.x = 0; gRail.visible = true; hooks.visible = false; towelB.g.visible = true; towelB.g.updateMatrixWorld(true); towelA.g.updateMatrixWorld(true);
    filmU.uGrow.value = .85; film.visible = true; updBact(.85); updSettle(5);
    applyCam([{ t: 0, p: [.205, .55, .15], l: [.215, .545, .02], f: 100, fp: [.215, .545, .045], o: [60, -100] }], 0); lodTowel(towelB, camera.position, .75); lodTowel(towelA, camera.position, 0);
    key.position.set(-.1, .62, .25); key.target.position.set(.21, .55, .03); key.target.updateMatrixWorld(); key.intensity = 2.8;
    Object.assign(key.shadow.camera, { left: -.1, right: .1, top: .1, bottom: -.1, near: .05, far: 2 }); key.shadow.camera.updateProjectionMatrix();
    filmPass.uniforms.time.value = .5; composer.render(); ov.drawCover(); return;
  }
  const A = stage(t);
  filmPass.uniforms.time.value = (t * 30 | 0) * .017;
  composer.render();
  ov.draw(t, A); ov.captions(t);
};
window.__cues = T.cues; window.__duration = DUR;
window.__seek(0); window.__ready = true;
