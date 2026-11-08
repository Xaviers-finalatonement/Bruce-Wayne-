// "Skin Receipts" ep02: does drinking water hydrate your skin. three.js 0.169 (vendored). Pure function of t: window.__seek(t) renders the frame.
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
const skinMat = (hex, rep, o = {}) => { const [m, b] = o.tex || skinTexes(hex, rep, o); const mt = new THREE.MeshPhysicalMaterial({ vertexColors: !!o.vc, map: m, bumpMap: b, bumpScale: 2.0 * (o.relief == null ? 1 : Math.max(.5, o.relief)), roughness: o.rough || .5, sheen: o.sheen == null ? .7 : o.sheen, sheenRoughness: .4, sheenColor: col("#ffe9dc"), clearcoat: o.cc == null ? .22 : o.cc, clearcoatRoughness: .38, emissive: col(hex).multiplyScalar(.035), emissiveMap: m });
  const sss = col(hex).lerp(col("#c4432f"), .5);
  mt.onBeforeCompile = sh => { Object.assign(sh.uniforms, { uSssK: { value: o.sssK == null ? 1 : o.sssK }, uSss: { value: sss }, uPress: skinU.uPress, uDepth: skinU.uDepth, uAO: skinU.uAO });
    sh.vertexShader = "uniform vec3 uPress; uniform float uDepth; varying vec3 vObj;\n" + sh.vertexShader.replace("#include <begin_vertex>", "vObj = position; vec3 dd0 = position - uPress; vec3 transformed = position - normal * uDepth * exp(-dot(dd0, dd0) / 0.0030);");
    sh.fragmentShader = "uniform vec3 uSss, uPress; uniform float uAO, uSssK; varying vec3 vObj;\n" + sh.fragmentShader.replace("#include <opaque_fragment>", "float fr = pow(1.0 - saturate(dot(normalize(vNormal), normalize(vViewPosition))), 2.0); outgoingLight += uSss * (0.03 + 0.3 * fr) * 0.4 * uSssK; vec3 dd1 = vObj - uPress; outgoingLight *= 1.0 - uAO * exp(-dot(dd1, dd1) / 0.0042);\n#include <opaque_fragment>"); };
  return mt; };
// fine tapered curved hair: 6 segments, 3 sides
function hairGeo(len, r, bend) { const S = 6, pos = [], idx = [], nor = [];
  for (let k = 0; k <= S; k++) { const t = k / S, c = V3(bend * len * t * t, len * t, 0), rr = r * (1 - .85 * t); for (let a = 0; a < 3; a++) { const an = a / 3 * 6.2832; pos.push(c.x + Math.cos(an) * rr, c.y, c.z + Math.sin(an) * rr); nor.push(Math.cos(an), 0, Math.sin(an)); } }
  for (let k = 0; k < S; k++) for (let a = 0; a < 3; a++) { const i0 = k * 3 + a, i1 = k * 3 + (a + 1) % 3; idx.push(i0, i0 + 3, i1, i1, i0 + 3, i1 + 3); }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3)); g.setIndex(idx); return g; }
function hairs(n, geo, mat, place, seed) { const im = new THREE.InstancedMesh(geo, mat, n), M = new THREE.Matrix4(), q = new THREE.Quaternion(), q2 = new THREE.Quaternion(), c = new THREE.Color();
  for (let i = 0; i < n; i++) { const { p, d, s } = place(i); q.setFromUnitVectors(V3(0, 1, 0), d); q2.setFromAxisAngle(V3(0, 1, 0), hash(i * 3.9 + seed) * 6.3); q.multiply(q2); M.compose(p, q, V3(1, s, 1)); im.setMatrixAt(i, M); im.setColorAt(i, c.setScalar(.75 + hash(i * 8.8 + seed) * .5)); }
  im.castShadow = true; return im; }

// ------------------------------------------------------------ light: bright bathroom window, soft
{ const pm = new THREE.PMREMGenerator(renderer), es = new THREE.Scene();
  es.add(new THREE.Mesh(new THREE.BoxGeometry(12, 12, 12), new THREE.MeshBasicMaterial({ color: 0xe6e3dc, side: THREE.BackSide })));
  const win = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 5), new THREE.MeshBasicMaterial({ color: new THREE.Color(6.5, 6.3, 5.8) })); win.position.set(-5.8, 1.6, 1.2); win.rotation.y = Math.PI / 2; es.add(win);
  const bars = new THREE.Mesh(new THREE.PlaneGeometry(.18, 5), new THREE.MeshBasicMaterial({ color: new THREE.Color(.6, .6, .62) })); bars.position.set(-5.78, 1.6, 1.2); bars.rotation.y = Math.PI / 2; es.add(bars); // window mullion: gives the glass a clean highlight stripe
  const top = new THREE.Mesh(new THREE.PlaneGeometry(8, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 2.4, 2.4) })); top.position.set(0, 5.8, 0); top.rotation.x = Math.PI / 2; es.add(top);
  scene.environment = pm.fromScene(es, .03).texture; scene.environmentIntensity = .4; }
const key = new THREE.DirectionalLight(0xffe9cf, 2.2); key.castShadow = true; key.shadow.mapSize.set(1536, 1536); key.shadow.bias = -.0004; key.shadow.normalBias = .001; key.shadow.radius = 5; key.shadow.intensity = .62;
const hemi = new THREE.HemisphereLight(0xe8f0ff, 0xf6efe4, .32); scene.add(key, key.target, hemi);
const fill = new THREE.DirectionalLight(0xd5e4ff, .55); fill.position.set(3, 1, 4); scene.add(fill);
const phys = (color, o) => new THREE.MeshPhysicalMaterial(Object.assign({ color: col(color), roughness: .5, metalness: 0 }, o || {}));
const U = (t, a, b) => clamp((t - a) / (b - a));
const L3 = (a, b, u) => a.map((v, i) => lerp(v, b[i], u));
const BEATS = tl.beats.map(b => b.id);
const stageOf = t => { let id = BEATS[0]; for (const b of BEATS) if (t >= S(b)) id = b; return id; };

// ------------------------------------------------------------ STAGE W: bathroom counter (terrazzo), glazed tile wall, glasses of water
const gW = new THREE.Group(); scene.add(gW);
const counterTex = canvasTex(1024, (g, n) => { g.fillStyle = "#cdc5b6"; g.fillRect(0, 0, n, n);
  const cc = ["#c4bcad", "#a79e8e", "#e9e4d8", "#8f8779", "#f4f0e6", "#b5a998"];
  for (let i = 0; i < 1700; i++) { const x = hash(i * 1.3) * n, y = hash(i * 2.9 + 5) * n, r = 1.6 + Math.pow(hash(i * 5.1), 2.2) * 8, k = Math.floor(hash(i * 7.7) * cc.length), m = 4 + Math.floor(hash(i * 3.3) * 3);
    g.fillStyle = cc[k]; g.beginPath(); for (let j = 0; j < m; j++) { const a = j / m * 6.283 + hash(i * 9.1) * 2, rr = r * (.6 + .6 * hash(i * 4.4 + j)); g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr * .8); } g.closePath(); g.fill(); }
  for (let i = 0; i < 9000; i++) { g.fillStyle = hash(i * 2.2) < .5 ? "rgba(255,255,255,.18)" : "rgba(80,70,55,.08)"; g.fillRect(hash(i * 1.1) * n, hash(i * 3.7 + 2) * n, 1.5, 1.5); } }, [14, 14]);
const counter = new THREE.Mesh(new THREE.PlaneGeometry(8, 8), new THREE.MeshStandardMaterial({ map: counterTex, roughness: .36, metalness: 0, envMapIntensity: .9 })); counter.rotation.x = -Math.PI / 2; counter.receiveShadow = true; gW.add(counter);
const tileTex = (bump) => canvasTex(1024, (g, n) => { g.fillStyle = bump ? "#101010" : "#8f897c"; g.fillRect(0, 0, n, n); const tn = 4, ts = n / tn;
  for (let j = 0; j < tn; j++) for (let i = 0; i < tn; i++) { const x = i * ts + 6, y = j * ts + 6, w = ts - 12, v = hash(i * 3.1 + j * 7.7);
    if (bump) { g.fillStyle = "#e0e0e0"; g.beginPath(); g.roundRect(x, y, w, w, 18); g.fill(); continue; }
    const gr = g.createLinearGradient(x, y, x + w, y + w); gr.addColorStop(0, `rgb(${248 - v * 6},${246 - v * 6},${241 - v * 6})`); gr.addColorStop(.55, `rgb(${240 - v * 8},${238 - v * 8},${233 - v * 8})`); gr.addColorStop(1, `rgb(${232 - v * 8},${231 - v * 8},${226 - v * 8})`);
    g.fillStyle = gr; g.beginPath(); g.roundRect(x, y, w, w, 18); g.fill(); g.strokeStyle = "rgba(255,255,255,.7)"; g.lineWidth = 3; g.stroke(); } }, [20, 12], !bump);
const wallM = new THREE.MeshStandardMaterial({ map: tileTex(false), bumpMap: tileTex(true), bumpScale: 2.2, roughness: .22, envMapIntensity: .8 });
const wall = new THREE.Mesh(new THREE.PlaneGeometry(4, 2.4), wallM); wall.position.set(.4, 1.1, -.34); wall.receiveShadow = true; gW.add(wall);
// glass: reflection-only shell (black diffuse, additive) over a transmissive water body: refraction of the tile grid + counter
const GH = .115, GB = .009, rin = y => .0268 + (y - GB) / (GH - GB) * .0052, N_SEG = 36;
const shellGeo = new THREE.LatheGeometry([[0, 0], [.027, 0], [.0299, .0022], [.0345, GH - .0008], [.0349, GH], [.0318, GH], [.0316, GH - .001], [rin(.03) + .0004, .03], [rin(GB), GB + .001], [.0225, GB], [0, GB]].map(p => new THREE.Vector2(p[0], p[1])), 48);
const shellMat = new THREE.MeshPhysicalMaterial({ color: 0x000000, roughness: .025, metalness: 0, ior: 1.5, specularIntensity: 1, envMapIntensity: 2.4, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
const waterMat = (att, tint) => new THREE.MeshPhysicalMaterial({ color: col(tint || "#ffffff"), roughness: 0, metalness: 0, transmission: 1, ior: 1.33, thickness: .05, attenuationColor: col(att), attenuationDistance: .09, specularIntensity: 1, envMapIntensity: 1.6 });
const WATER = waterMat("#8fc9e4"), JUICE = waterMat("#f08a1c", "#ffc070"), SOUP = null;
function makeCaustic() { const n = 256, c = document.createElement("canvas"); c.width = c.height = n; const g = c.getContext("2d"), im = g.createImageData(n, n);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { const u = x / n * 6.283, v = y / n * 6.283, a = Math.sin(u * 2 + Math.sin(v * 3) * 1.3) + Math.sin(v * 2 + Math.sin(u * 3 + 1) * 1.3) + Math.sin((u + v) * 3 + Math.sin((u - v) * 2) * 1.5);
    const w = Math.pow(1 - Math.abs(Math.sin(a * 1.15)), 7), fx = (x / n - .5) / .46, fy = (y / n - .5) / .36, fall = Math.exp(-(fx * fx + fy * fy) * 2.2) * smooth(1 - Math.hypot(fx, fy)), v8 = clamp((.12 + w * .95) * fall * 255, 0, 255), i = (y * n + x) * 4;
    im.data[i] = v8 * 1.0; im.data[i + 1] = v8 * .94; im.data[i + 2] = v8 * .82; im.data[i + 3] = 255; }
  g.putImageData(im, 0, 0); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }
const causticT = makeCaustic();
const causticMat = k => new THREE.MeshBasicMaterial({ map: causticT, color: col("#ffffff"), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: k });
function makeGlass(mat, o) { o = o || {}; const g = new THREE.Group(); const shell = mesh(shellGeo, shellMat, g, false); shell.renderOrder = 3;
  const N = N_SEG, nv = N * 3 + 1, pos = new Float32Array(nv * 3), idx = []; const A = 0, B = N, Cc = 2 * N, Ce = 3 * N;
  for (let i = 0; i < N; i++) { const j = (i + 1) % N; idx.push(A + i, A + j, B + i, B + i, A + j, B + j, B + i, B + j, Cc + i, Cc + i, B + j, Cc + j, Cc + i, Cc + j, Ce); }
  const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.BufferAttribute(pos, 3)); geo.setIndex(idx);
  const water = mesh(geo, mat, g, true); water.frustumCulled = false; const cl = [0, 1].map(k => { const m = new THREE.Mesh(new THREE.PlaneGeometry(.17, .125), causticMat(0)); m.rotation.x = -Math.PI / 2; m.rotation.z = .0; m.position.set(.062, .0007 + k * .0001, -.036); m.rotation.z = 0.6; g.add(m); return m; });
  g.userData = { f: -1, set(f, rip, ph, cau) { const w = g.userData; water.visible = f > .004; const kc = (cau == null ? 1 : cau) * smooth(f * 4) * (o.cau == null ? 1 : o.cau);
      cl.forEach((m, k) => { m.material.opacity = .46 * kc * (k ? .7 : 1) * (1 + .12 * Math.sin(ph * .9 + k * 2)); m.scale.setScalar((1 + .05 * Math.sin(ph * .7 + k * 1.9)) * (.8 + .3 * f)); m.rotation.z = .6 + (k ? .5 : 0) + .03 * Math.sin(ph * .5 + k); m.visible = kc > .01; });
      if (!water.visible) return; const y0 = GB + .0006, y1 = y0 + f * (GH * .9 - y0), r0 = rin(y0) - .0004, r1 = rin(y1) - .0004, p = pos;
      for (let i = 0; i < N; i++) { const a = i / N * 6.2832, c = Math.cos(a), s = Math.sin(a), rp = rip * (Math.sin(3 * a + ph) * .0011 + Math.sin(5 * a - ph * 1.3) * .0006);
        p.set([c * r0, y0, s * r0], (A + i) * 3); p.set([c * r1, y1 + .0012 + rp, s * r1], (B + i) * 3); p.set([c * r1 * .55, y1 - .0003 + rp * .6 + rip * .0014 * Math.sin(2 * a + ph * 1.1), s * r1 * .55], (Cc + i) * 3); }
      p.set([0, y1 - .0008 + rip * .002 * Math.sin(ph * 1.7), 0], Ce * 3); geo.attributes.position.needsUpdate = true; geo.computeVertexNormals(); geo.computeBoundingSphere(); } };
  gW.add(g); return g; }

// row of eight tumblers (x = i * PITCH), a hero glass is glass 0; extras for the food beat; the empty "no comparison" slot
const PITCH = .095, glasses = Array.from({ length: 8 }, (_, i) => { const g = makeGlass(WATER); g.position.set(i * PITCH, 0, 0); return g; });
const lathe = (pts, seg = 48) => new THREE.LatheGeometry(pts.map(p => new THREE.Vector2(p[0], p[1])), seg);
const ceramic = phys("#f6f3ec", { roughness: .2, clearcoat: .7, clearcoatRoughness: .1 });
const FZ0 = .14, food = new THREE.Group(); gW.add(food); food.visible = false;
const plate = mesh(lathe([[0, .0026], [.052, .0026], [.074, .0035], [.0835, .0125], [.0865, .0165], [.0855, .0172], [.082, .0136], [.0715, .0064], [.054, .0054], [0, .0054]]), ceramic, food); plate.position.set(0, 0, 0);
{ const tomMat = phys("#c4301f", { roughness: .32, clearcoat: .9, clearcoatRoughness: .12 }), calyx = std("#3f7a3a", { roughness: .6 }), cuc = canvasTex(256, (g, n) => { g.fillStyle = "#cfe0a8"; g.fillRect(0, 0, n, n); const gr = g.createRadialGradient(n / 2, n / 2, 0, n / 2, n / 2, n / 2); gr.addColorStop(0, "#e8f0cc"); gr.addColorStop(.72, "#dbe9b6"); gr.addColorStop(.84, "#6f9a4a"); gr.addColorStop(1, "#4d7a37"); g.fillStyle = gr; g.beginPath(); g.arc(n / 2, n / 2, n / 2 - 2, 0, 6.3); g.fill();
    for (let i = 0; i < 22; i++) { const a = i / 22 * 6.283, r = 46 + 6 * hash(i); g.fillStyle = "#f6f8e4"; g.beginPath(); g.ellipse(n / 2 + Math.cos(a) * r, n / 2 + Math.sin(a) * r, 7, 4, a, 0, 6.3); g.fill(); } }, null);
  [[-.028, .008, 0], [.012, -.026, .3], [.03, .018, 1.1], [-.004, .024, 2], [-.026, -.022, 2.6]].forEach(([x, z, r], i) => { const tm = mesh(new THREE.SphereGeometry(.0165, 20, 14), tomMat, food); tm.scale.y = .9; tm.position.set(x, .0215, z); const c = mesh(new THREE.CylinderGeometry(.006, .004, .002, 6), calyx, food); c.position.set(x, .0355, z); c.rotation.y = r; });
  [[.014, .0, 0], [.02, .002, .25]].forEach(([x, z], i) => { const sl = mesh(new THREE.CylinderGeometry(.022, .022, .004, 26), [std("#7aa157"), new THREE.MeshStandardMaterial({ map: cuc, roughness: .35 }), std("#7aa157")], food); sl.position.set(-.012 + i * .052, .0072 + i * .0042, -.044 + i * .01); sl.rotation.y = i; }); }
const bowl = new THREE.Group(); gW.add(bowl); bowl.visible = false;
{ mesh(lathe([[0, .0], [.03, .0], [.054, .014], [.07, .042], [.0725, .052], [.0708, .0526], [.0685, .042], [.052, .016], [.03, .006], [0, .006]]), ceramic, bowl);
  const sp = canvasTex(512, (g, n) => { const gr = g.createRadialGradient(n * .5, n * .5, 0, n * .5, n * .5, n * .5); gr.addColorStop(0, "#e9852a"); gr.addColorStop(1, "#d0661a"); g.fillStyle = gr; g.fillRect(0, 0, n, n);
    g.strokeStyle = "rgba(255,238,210,.85)"; g.lineWidth = 7; g.lineCap = "round"; g.beginPath(); for (let a = 0; a < 7; a += .1) { const r = 20 + a * 30; g.lineTo(n / 2 + Math.cos(a) * r * .9, n / 2 + Math.sin(a) * r * .9); } g.stroke();
    for (let i = 0; i < 160; i++) { g.fillStyle = hash(i * 1.9) < .5 ? "rgba(70,110,40,.8)" : "rgba(255,200,130,.5)"; g.beginPath(); g.arc(hash(i * 2.3) * n, hash(i * 5.7 + 1) * n, 2 + hash(i * 3.1) * 3, 0, 6.3); g.fill(); } }, null);
  const surf = mesh(new THREE.CircleGeometry(.0655, 48), new THREE.MeshPhysicalMaterial({ map: sp, roughness: .3, clearcoat: .6, clearcoatRoughness: .25, bumpMap: sp, bumpScale: .6 }), bowl, false); surf.rotation.x = -Math.PI / 2; surf.position.y = .0418; }
const juice = makeGlass(JUICE, { cau: .7 }); juice.visible = false;
// the empty slot: a paper chit with a Slate dashed ring and "?" printed on it
const slot = new THREE.Group(); gW.add(slot); slot.visible = false;
{ const t = canvasTex(512, (g, n) => { g.fillStyle = "#fffefb"; g.fillRect(0, 0, n, n); g.strokeStyle = "rgba(90,98,117,.25)"; g.lineWidth = 6; g.strokeRect(3, 3, n - 6, n - 6); g.strokeStyle = "#5A6275"; g.lineWidth = 12; g.setLineDash([34, 24]); g.lineCap = "round"; g.beginPath(); g.arc(n / 2, n / 2, n * .34, 0, 6.3); g.stroke();
    g.setLineDash([]); g.fillStyle = "#5A6275"; g.font = `700 ${n * .34}px "Courier Prime"`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("?", n / 2, n / 2 + 10); }, null);
  const chit = mesh(new THREE.BoxGeometry(.105, .0014, .105), [std("#fffefb"), std("#fffefb"), new THREE.MeshStandardMaterial({ map: t, roughness: .9 }), std("#fffefb"), std("#fffefb"), std("#fffefb")], slot); chit.position.y = .0008; slot.rotation.y = .12; }
// pour stream
const stream = mesh(new THREE.CylinderGeometry(.0017, .0015, 1, 10, 1, true), new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0, transmission: 0, transparent: true, opacity: .55, envMapIntensity: 3, specularIntensity: 1 }), gW, false); stream.visible = false;
function setStream(x, topY, waterY, on, t) { stream.visible = on; if (!on) return; const h = Math.max(.01, topY - waterY); stream.scale.set(1 + .12 * Math.sin(t * 30), h, 1 + .12 * Math.cos(t * 26)); stream.position.set(x, waterY + h / 2, 0); }
const dropsG = new THREE.Group(); gW.add(dropsG); // tiny splash droplets at the impact point
const dropM = phys("#ffffff", { roughness: 0, transmission: 1, ior: 1.33, thickness: .004 }), dropG = new THREE.SphereGeometry(.0016, 8, 6), drops = Array.from({ length: 9 }, (_, i) => { const m = mesh(dropG, dropM, dropsG, false); m.visible = false; return m; });
function splash(x, y, t, on) { drops.forEach((m, i) => { const ph = ((t * 2.4 + hash(i * 3.3)) % 1), a = hash(i * 5.1) * 6.283, v = .014 + hash(i * 7.7) * .012; m.visible = on; if (on) m.position.set(x + Math.cos(a) * v * ph * 1.6, y + .02 * Math.sin(ph * Math.PI) * (.6 + hash(i)), Math.sin(a) * v * ph * 1.6); }); }

// ------------------------------------------------------------ STAGE A: forearm macro (+ hydration probe). Two arms: deep brown (beat 6) and warm tan (beat 12)
const ARM_R = .0525;
function buildArm(x0, hex, seed, rough) { const g = new THREE.Group(); scene.add(g); g.position.x = x0; g.visible = false;
  const geo = new THREE.CylinderGeometry(.055, .05, 1.6, 96, 1, true); geo.rotateY(Math.PI); geo.rotateZ(Math.PI / 2);
  const skin = skinMat(hex, [6, 26], { rough: rough || .46, relief: .9, pore: 1.1, seed }); const arm = mesh(geo, skin, g);
  g.add(hairs(1300, hairGeo(.0075, .00019, .5), new THREE.MeshStandardMaterial({ color: col(seed === 11 ? "#1b0e08" : "#2a1a10"), roughness: .5 }), i => { const x = -.55 + hash(i * 1.7 + seed) * 1.1, th = (hash(i * 3.1 + seed) - .5) * 3.4 + .2, R = .0525 - x * .0006, n = V3(0, Math.sin(th), Math.cos(th)), a = (hash(i * 5.3) - .5) * .7;
    const d = V3(Math.cos(a) * .8, 0, 0).addScaledVector(n, .5 + hash(i * 6.1) * .3).addScaledVector(V3(0, 1, 0), Math.sin(a) * .2).normalize(); return { p: V3(x, R * n.y, R * n.z), d, s: .6 + hash(i * 8.3) * .9 }; }, seed));
  const bk = new THREE.Mesh(new THREE.PlaneGeometry(3, 2), new THREE.MeshBasicMaterial({ map: canvasTex(256, (gg, n) => { const gr = gg.createRadialGradient(n * .55, n * .45, 0, n * .5, n * .5, n * .75); gr.addColorStop(0, "#5a3a2a"); gr.addColorStop(1, "#1d110c"); gg.fillStyle = gr; gg.fillRect(0, 0, n, n); }, null) })); bk.position.set(0, .05, -.16); g.add(bk); return g; }
const A1X = 80, A2X = 100, gA1 = buildArm(A1X, C.skin[3], 11), gA2 = buildArm(A2X, "#B27A55", 23, .5);
{ const g12 = makeGlass(WATER, { cau: .6 }); gW.remove(g12); gA2.add(g12); g12.position.set(.17, -.045, -.07); g12.scale.setScalar(1); g12.userData.set(.72, .1, 0.3, .0); gA2.userData.glass = g12; g12.userData.set(.72, .05, 1, 0); }
// probe: matte white body, navy grip with a teal band, steel ring, sensor face with fine electrode lines
const probe = new THREE.Group(); scene.add(probe); probe.visible = false;
{ const steel = phys("#b9bfca", { metalness: 1, roughness: .28 }), body = phys("#f2f0ea", { roughness: .45, clearcoat: .3 }), grip = phys("#222b48", { roughness: .55, clearcoat: .25 }), band = phys("#0B7270", { roughness: .4 });
  const face = canvasTex(128, (g, n) => { g.fillStyle = "#1a1d26"; g.fillRect(0, 0, n, n); g.fillStyle = "#c9a45c"; for (let x = 6; x < n; x += 8) g.fillRect(x, 0, 4, n); }, null);
  mesh(new THREE.CylinderGeometry(.0072, .0072, .004, 28), steel, probe).position.y = .002; const sf = mesh(new THREE.CircleGeometry(.0056, 28), new THREE.MeshStandardMaterial({ map: face, roughness: .25, metalness: .4 }), probe, false); sf.rotation.x = Math.PI / 2; sf.position.y = -.0001;
  const nk = mesh(lathe([[.0072, .004], [.0072, .02], [.0085, .028], [.0098, .034]], 28), body, probe); const gr = mesh(new THREE.CylinderGeometry(.0108, .0108, .09, 28), grip, probe); gr.position.y = .079; const bd = mesh(new THREE.CylinderGeometry(.0112, .0112, .006, 28), band, probe); bd.position.y = .04;
  const cap = mesh(new THREE.SphereGeometry(.0108, 20, 10, 0, 6.3, 0, 1.57), grip, probe); cap.position.y = .124; }

// ------------------------------------------------------------ STAGE X: skin cross-section (illustration), two panels: start / week 4
const gX = new THREE.Group(); scene.add(gX); const XX = 140; gX.position.x = XX; gX.visible = false;
const PW = .15, PD = .05, PY = [.07, -.06], BR_H = .0075, GAPS = [-.046, .004, .05], GAPW = .0105;
const mol = []; // per panel: instanced molecules (home positions), escapers use the gaps
{ const rb = new THREE.BoxGeometry(1, 1, 1), skinTone = col(C.skin[1]);
  const bd = backdrop => { const m = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.6), new THREE.MeshStandardMaterial({ color: col("#f6f4ee"), roughness: 1 })); m.position.set(0, 0, -.06); m.receiveShadow = true; gX.add(m); }; bd();
  PY.forEach((py, pi) => { const pg = new THREE.Group(); pg.position.y = py; gX.add(pg);
    const derm = mesh(roundedBox(PW, .03, PD, .004, 3), new THREE.MeshStandardMaterial({ color: skinTone.clone().multiplyScalar(.8), roughness: .8, map: canvasTex(256, (g, n) => { g.fillStyle = "#edc9ad"; g.fillRect(0, 0, n, n); g.strokeStyle = "rgba(170,100,70,.22)"; g.lineWidth = 3; for (let i = 0; i < 40; i++) { g.beginPath(); const y = hash(i * 1.7 + pi) * n; g.moveTo(0, y); for (let x = 0; x <= n; x += 32) g.lineTo(x, y + (hash(x * .1 + i) - .5) * 26); g.stroke(); } }, [1, 1]) }), pg); derm.position.y = -.05;
    for (let r = 0; r < 3; r++) for (let c = 0; c < 5; c++) { const w = PW / 5 - .003; const cell = mesh(roundedBox(w - .001, .0105, PD * .92, .0035, 3), std(r === 0 ? "#f1c6a2" : "#f6d3b4", { roughness: .65 }), pg); cell.position.set(-PW / 2 + (c + .5 + (r % 2) * .5) * (PW / 5) - (r % 2 ? 0 : 0), -.0335 + r * .0125 + .0, 0); if (r % 2 && c === 4) cell.visible = false; cell.material.color.offsetHSL(0, 0, (hash(c * 3.1 + r * 7 + pi * 0) - .5) * .03); }
    const wallG = new THREE.Group(); pg.add(wallG); // stratum corneum: one row of bricks with three gaps (the exits)
    const edges = [-PW / 2, ...GAPS.flatMap(x => [x - GAPW / 2, x + GAPW / 2]), PW / 2]; for (let k = 0; k < edges.length; k += 2) { const a = edges[k], b = edges[k + 1], n = Math.max(1, Math.round((b - a) / .0215)), w = (b - a) / n; for (let j = 0; j < n; j++) { const br = mesh(roundedBox(w - .0014, BR_H, PD * .94, .0022, 2), std("#d9a766", { roughness: .55 }), wallG); br.position.set(a + (j + .5) * w, BR_H / 2 + .0015, 0); br.material.color.offsetHSL(.0, 0, (hash(j * 4.7 + k * 2.1 + pi * 0) - .5) * .05); } }
    const im = new THREE.InstancedMesh(new THREE.SphereGeometry(.0034, 14, 10), phys("#2aa7d8", { roughness: .18, clearcoat: 1, clearcoatRoughness: .05, emissive: col("#0a4e75"), emissiveIntensity: .35 }), 30); im.castShadow = true; pg.add(im);
    const homes = []; for (let i = 0; i < 30; i++) { const esc = i < 3; homes.push({ x: esc ? GAPS[i] + (hash(i * 3.1) - .5) * .004 : -PW / 2 + .012 + hash(i * 7.3) * (PW - .024), y: esc ? -.012 + hash(i * 2.2) * .008 : -.026 + hash(i * 5.9) * .028, ph: hash(i * 9.7) * 6.28, esc }); }
    mol.push({ im, homes }); }); }
const _m = new THREE.Matrix4(), _s = V3(1, 1, 1), _q = new THREE.Quaternion();
function updMol(t) { mol.forEach((M, pi) => { M.homes.forEach((h, i) => { let x = h.x + .0022 * Math.sin(t * 3.1 + h.ph) + .0012 * Math.sin(t * 7.3 + h.ph * 2), y = h.y + .0022 * Math.cos(t * 2.7 + h.ph * 1.3), s = 1;
    if (h.esc) { const cyc = ((t * .26 + h.ph / 6.28) % 1), u = clamp(cyc / .8); y = lerp(h.y, BR_H + .045, eio(u)); x = h.x + .002 * Math.sin(u * 9 + h.ph); s = u < .08 ? smooth(u / .08) : 1 - smooth((u - .78) / .22) * .95; s = Math.max(.001, s); }
    _m.compose(V3(x, y, 0), _q, _s.set(s, s, s)); M.im.setMatrixAt(i, _m); }); M.im.instanceMatrix.needsUpdate = true; }); }

// ------------------------------------------------------------ STAGE G: five skin tones, light to deep (end slide)
const gG = new THREE.Group(); scene.add(gG); const GX = 120; gG.position.x = GX; gG.visible = false; const GW = .2;
C.skin.forEach((h, i) => { const geo = new THREE.PlaneGeometry(GW, 1.1, 40, 60), p = geo.attributes.position, cv = []; for (let k = 0; k < p.count; k++) { const y = p.getY(k), x = p.getX(k); p.setZ(k, -.35 * y * y - 6 * x * x - .006 * Math.cos(x * 15 + i) + .004 * Math.sin(y * 11 + i * 2)); const ex = smooth((Math.abs(x) / (GW / 2) - .45) / .55), ey = smooth((Math.abs(y) - .3) / .25), vv = 1 - .3 * ex - .22 * ey, mt = .5 + .5 * Math.sin(x * 23 + y * 9 + i * 3.1) * Math.cos(y * 6 - i); cv.push(vv * (1 - .06 * mt), vv * (1 - .3 * ex * .6 - .06 * ey - .04 * mt), vv * (1 - .36 * ex * .6 - .08 * ey - .06 * mt)); } geo.setAttribute("color", new THREE.Float32BufferAttribute(cv, 3)); geo.computeVertexNormals(); // curved panel + edge falloff
  const m = mesh(geo, skinMat(col(h).lerp(col("#8a7466"), .14).getStyle(), [GW / .013, 1.1 / .013], { vc: 1, rough: .62, cc: .05, sheen: .25, sssK: .35, relief: .1 + .03 * i, pore: 2.2 + .15 * i, seed: 40 + i * 7, freckle: i === 0 ? 1 : i === 1 ? .5 : 0 }), gG); m.position.set(i * GW, 0, 0);
  const sh = hairs(260, hairGeo(.005, .00015, .5), new THREE.MeshStandardMaterial({ color: col(i < 2 ? "#a58c78" : "#120a06"), roughness: .6, transparent: true, opacity: i < 2 ? .5 : .9 }), k => { const x = (hash(k * 1.3 + i) - .5) * GW * .94, y = (hash(k * 2.9 + i) - .5) * .36, z = -.35 * y * y - 6 * x * x, n = V3(12 * x, .7 * y, 1).normalize(), a = hash(k * 4.7) * .6; return { p: V3(x + i * GW, y, z), d: n.clone().multiplyScalar(.5).add(V3(Math.sin(a), -.7, 0)).normalize(), s: .6 + hash(k * 6.1) * .9 }; }, 40 + i); gG.add(sh); });


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

const K1 = (p, l, f, o, ap, fp) => [{ t: 0, p, l, f, fp: fp || l, o: o || [0, 0], ap: ap || 1 }];
const HF = .88;                                   // "full" glass
const tapX = [-.13, -.045, .04, .125];
function probeX(t) { const tp = T.probeT; if (t < tp[0] + .3) return lerp(tapX[0] - .08, tapX[0], eo3(U(t, S("b06"), tp[0] - .1))); for (let k = 0; k < 3; k++) if (t < tp[k + 1] + .3) return lerp(tapX[k], tapX[k + 1], eio(U(t, tp[k] + .4, tp[k + 1] - .05))); return tapX[3]; }
function probeP(t) { let p = 0; T.probeT.forEach(tk => { p = Math.max(p, Math.pow(Math.sin(Math.PI * clamp((t - (tk - .12)) / .5)), 2)); }); return p; }
const tilt = .28, slideCam = t => { const t0 = S("b15"), t1 = END("b15") + .3, P = (t1 - t0) / 5, MV = .34, tt = clamp(t - t0, 0, t1 - t0), i = Math.min(4, Math.floor(tt / P)), lt = tt - (i * P + P - MV), x = (i + (i < 4 ? eio(lt / MV) : 0)) * GW; return K1([GX + x, .02, .5], [GX + x, 0, 0], 50, [0, 0], 1.2); };
const patchPt = V3(A2X + .035, ARM_R * Math.sin(.25), ARM_R * Math.cos(.25));
function camFor(id, t) {
  const s0 = S(id), e0 = E(id), u = U(t, s0, e0);
  switch (id) {
    case "b01": { const q = U(t, 0, S("b02")); return K1([lerp(-.06, .05, q), .05, .7], [lerp(-.02, .035, q), .058, 0], 85, [150, 130], 2, [0, .058, 0]); }
    case "b02": { const lv = U(t, T.pour.t0, T.pour.t1); return K1([lerp(.05, .1, u), lerp(.09, .12, u), lerp(.5, .41, u)], [0, lerp(.055, .09, lv), 0], 70, [140, 90], 1.5, [0, .06, 0]); }
    case "b03": { const x = lerp(.06, .56, eio(U(t, T.fill0 - .1, T.fill0 + 7 * T.fillDt + .3))); return K1([x, .14, .95], [x, .06, 0], 70, [150, 60], 1.2, [x, .06, 0]); }
    case "b04": { const q = eio(u), x = lerp(.58, .76, q); return K1([x, lerp(.12, .09, q), lerp(1.2, .55, q)], [x, .03, 0], 70, [130, 40], 1.2, [x, .01, 0]); }
    case "b05": { const x = lerp(.12, .56, eio(u)); return K1([x, .17, 1.0], [x, .04, .1], 60, [150, 20], 1.5, [x, .03, .14]); }
    case "b06": { const x = probeX(t) * .85; return K1([A1X + x + .03, .17, .42], [A1X + x, .015, .03], 85, [190, 60], 1.4, [A1X + x, .02, .05]); }
    case "b07": case "b08": { const q = U(t, S("b07"), E("b08")); return K1([lerp(.26, .34, q), .12, 1.0], [lerp(.26, .34, q), .07, 0], 50, [110, 0], 3.4, [lerp(.26, .34, q), .07, .5]); }
    case "b09": { const q = eio(u); return K1([XX, -.02, lerp(.82, .76, q)], [XX, -.02, 0], 50, [110, -110], 1, [XX, 0, 0]); }
    case "b10": { const q = eio(u); return K1([lerp(.66, .42, q), lerp(.1, .16, q), lerp(.85, 1.95, q)], [lerp(.7, .4, q), .04, 0], 50, [120, 10], 1.2, [lerp(.7, .4, q), .04, 0]); }
    case "b11": return K1([lerp(.3, .44, u), .13, 1.5], [lerp(.3, .44, u), .06, 0], 50, [110, 0], 3.4, [lerp(.3, .44, u), .06, .7]);
    case "b12": return K1([A2X + lerp(.0, .05, u), lerp(.15, .12, u), lerp(.36, .28, u)], [A2X + lerp(.03, .06, u), .01, .01], 70, [150, 20], 1.4, [A2X + lerp(.03, .06, u), .02, .04]);
    case "b13": return K1([lerp(.02, .05, u), .1, lerp(.52, .42, u)], [0, .065, 0], 70, [130, 150], 1.4, [0, .06, 0]);
    case "b14": { const q = eio(u); return K1([lerp(.05, .2, q), lerp(.1, .2, q), lerp(.42, 1.35, q)], [lerp(0, .06, q), .06, 0], 60, [130, 120], 1.3, [lerp(0, .06, q), .06, 0]); }
    case "b15": return slideCam(t);
  }
}
const STAGES = { W: gW, A1: gA1, A2: gA2, X: gX, G: gG };
const BG = { W: "#efece5", A1: "#2b1b14", A2: "#2b1b14", X: "#f3f1ea", G: "#cfc3b8" };
const stgOf = id => id === "b06" ? "A1" : id === "b12" ? "A2" : id === "b09" ? "X" : id === "b15" ? "G" : "W";
function show(name) { for (const k in STAGES) STAGES[k].visible = k === name; scene.background.set(BG[name]); }
const prog = (a, b, t) => smooth((t - a) / (b - a));
const wY = f => GB + .0006 + f * (GH * .9 - GB - .0006) + .0012;
const skinOff = () => { skinU.uPress.value.set(9, 9, 9); skinU.uDepth.value = 0; skinU.uAO.value = 0; };
function stage(t) {
  const id = stageOf(t), A = { id }, stg = stgOf(id); show(stg); skinOff();
  const keys = camFor(id, t), cam = applyCam(keys, keys.length > 1 ? t : 0), focus = V3(...cam.fp);
  if (stg === "W") {
    const only0 = id === "b01" || id === "b02" || id === "b13" || id === "b14";
    // glass levels
    const f = glasses.map(() => 0), rip = glasses.map(() => .08); let sx = 0, on = false, topY = .5;
    if (id === "b01") f[0] = .62; else if (id === "b02") { f[0] = lerp(.62, HF, smooth(U(t, T.pour.t0 + .1, T.pour.t1))); on = t > T.pour.t0 && t < T.pour.t1; rip[0] = on ? 1 : .08 + .6 * Math.exp(-(t - T.pour.t1) * 2) * (t > T.pour.t1 ? 1 : 0); }
    else if (id === "b03") { glasses.forEach((g, i) => { const lt = t - (T.fill0 + i * T.fillDt); f[i] = HF * eo3(lt / .45); rip[i] = lt > 0 ? .08 + .8 * Math.exp(-Math.max(0, lt - .45) * 3) * (lt < 2 ? 1 : 0) : .08; }); const q = (t - T.fill0 - .1) / T.fillDt; on = q > -.3 && q < 7.6; sx = clamp(q, 0, 7) * PITCH; const gi = clamp(Math.round(q), 0, 7); topY = .42; }
    else f.fill(HF);
    if (id === "b13" || id === "b14" || id === "b01" || id === "b02") for (let i = 1; i < 8; i++) f[i] = 0;
    glasses.forEach((g, i) => { g.visible = i === 0 || !only0; g.userData.set(f[i], rip[i], t * 3 + i * 1.7, id === "b03" ? 1 : 1); });
    if (id === "b13" || id === "b14") { glasses[0].userData.set(HF, .06, t * 2.2, 1); }
    setStream(sx, topY, wY(id === "b03" ? f[clamp(Math.round((t - T.fill0 - .1) / T.fillDt), 0, 7)] : f[0]) , on, t); splash(sx, wY(id === "b03" ? f[clamp(Math.round((t - T.fill0 - .1) / T.fillDt), 0, 7)] : f[0]), t, on);
    // slot, food
    slot.scale.setScalar(1); slot.visible = ["b04", "b05", "b07", "b08", "b10", "b11"].includes(id); slot.position.set(8 * PITCH, 0, 0);
    if (id === "b04") { const s = eob(U(t, W("b04", "Nobody") - .3, W("b04", "Nobody") + .2)); slot.scale.setScalar(Math.max(.001, s) * 1.7); } else slot.scale.setScalar(1.7);
    const fv = id === "b05"; food.visible = fv; bowl.visible = fv; juice.visible = fv;
    if (fv) { const sl = k => 1 - eo3(U(t, S("b05") + .15 + k * .5, S("b05") + .9 + k * .5)); food.position.set(.17 + sl(0) * .5, 0, FZ0); bowl.position.set(.40 + sl(1) * .5, 0, FZ0); juice.position.set(.60 + sl(2) * .5, 0, FZ0); juice.userData.set(.62, .06, t * 2, 1);
      const q = px(V3(.17, .05, FZ0)); A.food = { x: q.x, y: q.y }; }
    if (slot.visible) { const q = px(V3(8 * PITCH, .01, 0)); A.slot = { x: q.x, y: q.y }; }
    // light
    const dist = camera.position.distanceTo(focus), ext = clamp(dist * .62, .16, 1.0);
    key.position.copy(focus).add(V3(-1.3, 1.5, .85).multiplyScalar(1.2)); key.target.position.copy(focus); key.target.updateMatrixWorld(); key.intensity = 2.2;
    Object.assign(key.shadow.camera, { left: -ext, right: ext, top: ext, bottom: -ext, near: .3, far: 6 }); key.shadow.camera.updateProjectionMatrix(); scene.environmentIntensity = .4; hemi.intensity = .32;
  } else {
    key.position.copy(focus).add(stg === "X" ? V3(-.5, .6, 1.2) : V3(-1.2, .5, .7).multiplyScalar(.6)); key.target.position.copy(focus); key.target.updateMatrixWorld(); key.intensity = stg === "X" ? 2.3 : stg === "G" ? 1.9 : 2.4; scene.environmentIntensity = stg === "X" ? .7 : .45; hemi.intensity = stg === "X" ? .7 : .45;
    const ext = stg === "G" ? .6 : stg === "X" ? .35 : .22; Object.assign(key.shadow.camera, { left: -ext, right: ext, top: ext, bottom: -ext, near: .1, far: 6 }); key.shadow.camera.updateProjectionMatrix();
  }
  probe.visible = stg === "A1";
  if (stg === "A1") { const x = probeX(t), p = probeP(t), th = .25, n = V3(0, Math.sin(th), Math.cos(th)), P = V3(x, ARM_R * Math.sin(th), ARM_R * Math.cos(th)), qn = new THREE.Quaternion().setFromUnitVectors(V3(0, 1, 0), V3(-.55, .75, -.2).normalize());
    probe.quaternion.copy(qn); const hover = (1 - p) * .03; probe.position.copy(P).addScaledVector(n, hover - .0016 * p).add(gA1.position).addScaledVector(V3(.05, 0, 0).applyQuaternion(probe.quaternion), 0); probe.updateMatrixWorld(true);
    skinU.uPress.value.copy(P); skinU.uDepth.value = .0042 * Math.pow(p, 1.4); skinU.uAO.value = .6 * Math.pow(p, 1.2);
    const q = px(probe.position.clone()); A.tip = { x: q.x, y: q.y }; }
  if (stg === "A2") { const q = px(patchPt.clone().add(gA2.position)), qx = px(patchPt.clone().add(gA2.position).add(V3(.03, 0, 0))); A.patch = { x: q.x, y: q.y, r: Math.min(220, Math.abs(qx.x - q.x)) }; }
  if (stg === "X") { updMol(t); A.xp = PY.map(py => { const q = px(V3(XX - PW / 2 + .035, py + .03, 0)); return { x: Math.max(q.x + 60, 500), y: q.y }; }); }
  A.stg = stg; return A;
}

window.__seek = function (t) {
  if (COVER) { // cover: glass of water on the counter, a forearm lying behind it, headline plate + receipt total drawn by the overlay
    const ts = T.probeT[1] + .12; stage(ts); composer.render(); const cp = document.createElement("canvas"); cp.width = 1080; cp.height = 1920; cp.getContext("2d").drawImage(glc, 0, 0); // forearm + probe macro, drawn as an inset by the overlay
    show("W"); skinOff(); glasses.forEach((g, i) => { g.visible = i === 0; }); glasses[0].userData.set(.9, .08, 1.3, 1.3); slot.visible = false; food.visible = bowl.visible = juice.visible = false; stream.visible = false; drops.forEach(m => (m.visible = false)); probe.visible = false;
    applyCam([{ t: 0, p: [.05, .13, .72], l: [.0, .058, 0], f: 62, fp: [0, .06, 0], o: [20, -250], ap: 1.6 }], 0);
    key.position.set(-.9, 1.3, .8); key.target.position.set(.01, .05, 0); key.target.updateMatrixWorld(); key.intensity = 3.2; Object.assign(key.shadow.camera, { left: -.35, right: .35, top: .35, bottom: -.35, near: .3, far: 4 }); key.shadow.camera.updateProjectionMatrix();
    filmPass.uniforms.time.value = .5; composer.render(); ov.drawCover(cp); return;
  }
  const A = stage(t);
  filmPass.uniforms.time.value = (t * 30 | 0) * .017;
  composer.render();
  ov.draw(t, A); ov.captions(t);
};
window.__cues = T.cues; window.__duration = DUR;
window.__seek(0); window.__ready = true;
