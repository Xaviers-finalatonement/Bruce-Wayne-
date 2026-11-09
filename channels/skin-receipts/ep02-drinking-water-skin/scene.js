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
const rim = new THREE.DirectionalLight(0xfff0dc, 0); scene.add(rim, rim.target);
const phys = (color, o) => new THREE.MeshPhysicalMaterial(Object.assign({ color: col(color), roughness: .5, metalness: 0 }, o || {}));
const U = (t, a, b) => clamp((t - a) / (b - a));
const L3 = (a, b, u) => a.map((v, i) => lerp(v, b[i], u));
const BEATS = tl.beats.map(b => b.id);
const stageOf = t => { let id = BEATS[0]; for (const b of BEATS) if (t >= S(b)) id = b; return id; };

// ------------------------------------------------------------ STAGE W: bathroom counter (terrazzo), glazed tile wall, glasses of water
const gW = new THREE.Group(); scene.add(gW);
const counterTex = canvasTex(1024, (g, n) => { g.fillStyle = "#cdc5b6"; g.fillRect(0, 0, n, n);
  for (let i = 0; i < 70; i++) { const x = hash(i * 1.9 + 3) * n, y = hash(i * 2.3 + 8) * n, r = 60 + hash(i * 4.1) * 190, k = hash(i * 6.7); wrapBlob(g, x, y, r, (X, Y) => { const gr = g.createRadialGradient(X, Y, 0, X, Y, r); gr.addColorStop(0, k < .5 ? "rgba(112,98,78,.09)" : "rgba(255,250,238,.12)"); gr.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = gr; g.beginPath(); g.arc(X, Y, r, 0, 6.3); g.fill(); }); }
  const cc = ["#c4bcad", "#a79e8e", "#e9e4d8", "#8f8779", "#f4f0e6", "#b5a998", "#d7cdbb", "#7d776c"];
  for (let i = 0; i < 1500; i++) { const x = hash(i * 1.3) * n, y = hash(i * 2.9 + 5) * n, r = 1.6 + Math.pow(hash(i * 5.1), 2.2) * 9, k = Math.floor(hash(i * 7.7) * cc.length), m = 4 + Math.floor(hash(i * 3.3) * 3);
    g.fillStyle = cc[k]; g.beginPath(); for (let j = 0; j < m; j++) { const a = j / m * 6.283 + hash(i * 9.1) * 2, rr = r * (.6 + .6 * hash(i * 4.4 + j)); g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr * .8); } g.closePath(); g.fill(); }
  for (let i = 0; i < 9000; i++) { g.fillStyle = hash(i * 2.2) < .5 ? "rgba(255,255,255,.18)" : "rgba(80,70,55,.08)"; g.fillRect(hash(i * 1.1) * n, hash(i * 3.7 + 2) * n, 1.5, 1.5); } }, [8, 4]);
const counter = new THREE.Mesh(new THREE.PlaneGeometry(8, 4), new THREE.MeshStandardMaterial({ map: counterTex, roughness: .3, metalness: 0, envMapIntensity: 1.0 })); counter.rotation.x = -Math.PI / 2; counter.position.z = 1.66; counter.receiveShadow = true; gW.add(counter);
// glazed tile wall: real tile geometry (per-tile tilt, colour, size and position jitter), uneven grout recess, a mirror opening (filled with tiles except in the mirror shot)
const TP = .05, TX0 = -.6, TCOLS = 44, TROWS = 22, WZ = -.34, MIR = { x0: .15, x1: .55, y0: 0, y1: .30 };
const groutTex = canvasTex(512, (g, n) => { g.fillStyle = "#b9b4a6"; g.fillRect(0, 0, n, n);
  for (let i = 0; i < 40; i++) { const x = hash(i * 3.3) * n, y = hash(i * 5.7 + 1) * n, r = 25 + hash(i * 1.9) * 80; wrapBlob(g, x, y, r, (X, Y) => { const gr = g.createRadialGradient(X, Y, 0, X, Y, r); gr.addColorStop(0, hash(i * 7.1) < .5 ? "rgba(70,62,48,.22)" : "rgba(235,230,215,.2)"); gr.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = gr; g.beginPath(); g.arc(X, Y, r, 0, 6.3); g.fill(); }); }
  for (let i = 0; i < 7000; i++) { g.fillStyle = hash(i * 2.7) < .5 ? "rgba(255,255,255,.14)" : "rgba(60,52,40,.14)"; g.fillRect(hash(i * 1.1) * n, hash(i * 3.9 + 2) * n, 1.6, 1.6); } }, [6, 6]);
{ const shp = new THREE.Shape(); shp.moveTo(TX0, -.05); shp.lineTo(TX0 + TCOLS * TP, -.05); shp.lineTo(TX0 + TCOLS * TP, TROWS * TP); shp.lineTo(TX0, TROWS * TP); shp.closePath();
  const hole = new THREE.Path(); hole.moveTo(MIR.x0, MIR.y0); hole.lineTo(MIR.x0, MIR.y1); hole.lineTo(MIR.x1, MIR.y1); hole.lineTo(MIR.x1, MIR.y0); hole.closePath(); shp.holes.push(hole);
  const gm = new THREE.Mesh(new THREE.ShapeGeometry(shp), new THREE.MeshStandardMaterial({ map: groutTex, roughness: .95 })); gm.position.z = WZ - .0026; gm.receiveShadow = true; gW.add(gm); }
const groutFill = new THREE.Mesh(new THREE.PlaneGeometry(MIR.x1 - MIR.x0, MIR.y1 - MIR.y0), new THREE.MeshStandardMaterial({ map: groutTex, roughness: .95 })); groutFill.position.set((MIR.x0 + MIR.x1) / 2, (MIR.y0 + MIR.y1) / 2, WZ - .0026); groutFill.receiveShadow = true; gW.add(groutFill);
const glazeT = canvasTex(128, (g, n) => { g.fillStyle = "#fff"; g.fillRect(0, 0, n, n); const lg = g.createLinearGradient(0, 0, n, n); lg.addColorStop(0, "rgba(255,255,255,.0)"); lg.addColorStop(1, "rgba(60,70,70,.16)"); g.fillStyle = lg; g.fillRect(0, 0, n, n);
  const eg = g.createRadialGradient(n / 2, n / 2, n * .34, n / 2, n / 2, n * .72); eg.addColorStop(0, "rgba(90,110,105,0)"); eg.addColorStop(1, "rgba(90,110,105,.34)"); g.fillStyle = eg; g.fillRect(0, 0, n, n);
  for (let i = 0; i < 220; i++) { g.fillStyle = hash(i * 2.3) < .5 ? "rgba(255,255,255,.35)" : "rgba(80,90,85,.12)"; g.fillRect(hash(i * 1.3) * n, hash(i * 4.7 + 2) * n, 1.5, 1.5); } }, null);
const tileGeo = roundedBox(.0462, .0462, .007, .0018, 2), tileMat = new THREE.MeshStandardMaterial({ color: 0xffffff, map: glazeT, roughness: .09, envMapIntensity: 1.7 });
const inMir = (x, y) => x > MIR.x0 && x < MIR.x1 && y > MIR.y0 && y < MIR.y1;
const tilePal = ["#ecebe3", "#e4ebe6", "#dae6e3", "#eee8da", "#d3e0dc", "#f3f0e8", "#c9dcd8", "#e8e0cf", "#d9e4dc", "#efece4"].map(col);
function tileSet(inside) { const list = []; for (let j = 0; j < TROWS; j++) for (let i = 0; i < TCOLS; i++) { const cx = TX0 + (i + .5) * TP, cy = (j + .5) * TP; if (inMir(cx, cy) === inside) list.push([i, j, cx, cy]); }
  const im = new THREE.InstancedMesh(tileGeo, tileMat, list.length), M = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), c = new THREE.Color();
  list.forEach(([i, j, cx, cy], k) => { const h = n => hash(i * 7.31 + j * 13.17 + n * 3.7);
    e.set((h(1) - .5) * .09, (h(2) - .5) * .09, (h(3) - .5) * .04); q.setFromEuler(e); const s = .985 + h(4) * .035;
    M.compose(V3(cx + (h(5) - .5) * .0042, cy + (h(6) - .5) * .0042, WZ + (h(7) - .5) * .0022), q, V3(s, s * (.99 + h(8) * .02), 1)); im.setMatrixAt(k, M);
    c.copy(tilePal[Math.floor(h(9) * tilePal.length)]); c.offsetHSL((h(11) - .5) * .03, 0, (h(10) - .5) * .08 + .035 * Math.sin(i * .37 + j * .21)); im.setColorAt(k, c); });
  im.castShadow = true; im.receiveShadow = true; gW.add(im); return im; }
const wallTiles = tileSet(false), holeTiles = tileSet(true);
function windowTex() { const n = 512, c = document.createElement("canvas"); c.width = c.height = n; const g = c.getContext("2d"); g.fillStyle = "#000"; g.fillRect(0, 0, n, n);
  g.save(); g.filter = "blur(9px)"; g.transform(1, 0, -.32, 1, 130, 0); g.fillStyle = "#ffe8c4"; for (let r = 0; r < 2; r++) for (let k = 0; k < 3; k++) g.fillRect(30 + k * 150, 40 + r * 215, 128, 190); g.restore();
  const gr = g.createLinearGradient(0, 0, n, 0); gr.addColorStop(0, "rgba(0,0,0,0)"); gr.addColorStop(1, "rgba(0,0,0,.75)"); g.fillStyle = gr; g.fillRect(0, 0, n, n);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }
const winT = windowTex(), winMat = k => new THREE.MeshBasicMaterial({ map: winT, color: 0xffffff, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: k });
const winWall = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.0), winMat(.2)); winWall.position.set(.1, .5, WZ + .0055); winWall.rotation.z = .05; gW.add(winWall);
const winCounter = new THREE.Mesh(new THREE.PlaneGeometry(1.3, .9), winMat(.26)); winCounter.rotation.x = -Math.PI / 2; winCounter.rotation.z = .12; winCounter.position.set(.5, .0009, -.02); gW.add(winCounter);
// glass: reflection-only shell (black diffuse, additive) over a transmissive water body: refraction of the tile grid + counter
const GH = .115, GB = .009, rin = y => .0268 + (y - GB) / (GH - GB) * .0052, N_SEG = 36;
const shellGeo = new THREE.LatheGeometry([[0, 0], [.027, 0], [.0299, .0022], [.0345, GH - .0008], [.0349, GH], [.0318, GH], [.0316, GH - .001], [rin(.03) + .0004, .03], [rin(GB), GB + .001], [.0225, GB], [0, GB]].map(p => new THREE.Vector2(p[0], p[1])), 48);
const shellMat = new THREE.MeshPhysicalMaterial({ color: 0x000000, roughness: .025, metalness: 0, ior: 1.5, specularIntensity: 1, envMapIntensity: 2.4, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
const waterMat = (att, tint) => new THREE.MeshPhysicalMaterial({ color: col(tint || "#ffffff"), roughness: 0, metalness: 0, transmission: 1, ior: 1.33, thickness: .05, attenuationColor: col(att), attenuationDistance: .6, clearcoat: 1, clearcoatRoughness: 0, specularIntensity: 1, envMapIntensity: 1.6 });
const WATER = waterMat("#cfe6f0"), JUICE = waterMat("#f08a1c", "#ffc070"), SOUP = null;
function makeCaustic() { const n = 256, c = document.createElement("canvas"); c.width = c.height = n; const g = c.getContext("2d"), im = g.createImageData(n, n);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { const u = x / n * 6.283, v = y / n * 6.283, a = Math.sin(u * 2 + Math.sin(v * 3) * 1.3) + Math.sin(v * 2 + Math.sin(u * 3 + 1) * 1.3) + Math.sin((u + v) * 3 + Math.sin((u - v) * 2) * 1.5);
    const w = Math.pow(1 - Math.abs(Math.sin(a * 1.15)), 7), fx = (x / n - .5) / .46, fy = (y / n - .5) / .36, fall = Math.exp(-(fx * fx + fy * fy) * 2.2) * smooth(1 - Math.hypot(fx, fy)), v8 = clamp((.12 + w * .95) * fall * 255, 0, 255), i = (y * n + x) * 4;
    im.data[i] = v8 * 1.0; im.data[i + 1] = v8 * .94; im.data[i + 2] = v8 * .82; im.data[i + 3] = 255; }
  g.putImageData(im, 0, 0); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }
const causticT = makeCaustic();
const rimMat = new THREE.MeshBasicMaterial({ color: 0xffffff, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: .9 }), bubG = new THREE.SphereGeometry(.0011, 8, 6), bubM = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .55, depthWrite: false });
const causticMat = k => new THREE.MeshBasicMaterial({ map: causticT, color: col("#ffffff"), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: k });
// condensation beads (texture is stretched: 1024 px = 0.21 m around, 0.105 m up), soft contact shadow, meniscus ring
const beadT = (() => { const n = 1024, c = document.createElement("canvas"); c.width = c.height = n; const g = c.getContext("2d");
  const bead = (x, y, r) => { g.save(); g.translate(x, y); g.scale(.49, 1); const gr = g.createRadialGradient(-r * .2, -r * .25, 0, 0, 0, r); gr.addColorStop(0, "rgba(240,248,250,.26)"); gr.addColorStop(.8, "rgba(210,228,235,.18)"); gr.addColorStop(1, "rgba(120,150,165,.34)"); g.fillStyle = gr; g.beginPath(); g.arc(0, 0, r, 0, 6.3); g.fill();
    g.strokeStyle = "rgba(28,52,64,.6)"; g.lineWidth = Math.max(1, r * .22); g.beginPath(); g.arc(0, 0, r * .9, .15, 2.6); g.stroke();
    g.fillStyle = "rgba(255,255,255,.95)"; g.beginPath(); g.ellipse(-r * .38, -r * .42, r * .25, r * .2, -.5, 0, 6.3); g.fill(); g.restore(); };
  for (let i = 0; i < 190; i++) bead(hash(i * 1.7 + 4) * n, 40 + Math.pow(hash(i * 2.9 + 1), .8) * (n - 90), 3.5 + Math.pow(hash(i * 4.3), 3) * 15);
  for (let i = 0; i < 480; i++) bead(hash(i * 3.1 + 9) * n, 30 + hash(i * 5.3 + 2) * (n - 70), 1.4 + hash(i * 6.1) * 2.2);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping; t.anisotropy = 4; return t; })();
const condGeo = new THREE.LatheGeometry([[.0301, .012], [.0343, GH - .008]].map(p => new THREE.Vector2(p[0], p[1])), 72);
const condMat = new THREE.MeshBasicMaterial({ map: beadT, transparent: true, depthWrite: false });
const shadowT = (() => { const n = 256, c = document.createElement("canvas"); c.width = c.height = n; const g = c.getContext("2d");
  g.save(); g.translate(n * .66, n * .40); g.rotate(-.5); g.scale(1.9, 1); let gr = g.createRadialGradient(0, 0, 0, 0, 0, n * .17); gr.addColorStop(0, "rgba(10,14,22,.26)"); gr.addColorStop(1, "rgba(10,14,22,0)"); g.fillStyle = gr; g.beginPath(); g.arc(0, 0, n * .17, 0, 6.3); g.fill(); g.restore();
  gr = g.createRadialGradient(n * .5, n * .5, n * .1, n * .5, n * .5, n * .22); gr.addColorStop(0, "rgba(8,12,20,.62)"); gr.addColorStop(.6, "rgba(8,12,20,.3)"); gr.addColorStop(1, "rgba(8,12,20,0)"); g.fillStyle = gr; g.beginPath(); g.arc(n * .5, n * .5, n * .22, 0, 6.3); g.fill();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
const shadowMat = new THREE.MeshBasicMaterial({ map: shadowT, transparent: true, depthWrite: false, opacity: .8 }), shadowGeo = new THREE.PlaneGeometry(.2, .2);
const menGeo = (() => { const g = new THREE.RingGeometry(.86, 1, 56, 1), n = g.attributes.position.count, c = new Float32Array(n * 3); for (let i = 0; i < n; i++) c.fill(i < n / 2 ? 0 : .8, i * 3, i * 3 + 3); g.setAttribute("color", new THREE.BufferAttribute(c, 3)); return g; })();
const menMat = new THREE.MeshBasicMaterial({ vertexColors: true, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false });
const lipGeo = (() => { const g = new THREE.TorusGeometry(.03335, .00075, 8, 72), p = g.attributes.position, c = new Float32Array(p.count * 3); for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), b = .12 + .88 * Math.pow(Math.max(0, (-x * .85 + y * .5) / .0334), 3); c.fill(b, i * 3, i * 3 + 3); } g.setAttribute("color", new THREE.BufferAttribute(c, 3)); return g; })();
const lipMat = new THREE.MeshBasicMaterial({ vertexColors: true, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false });
function makeGlass(mat, o) { o = o || {}; const g = new THREE.Group(); const shell = mesh(shellGeo, shellMat, g, false); shell.renderOrder = 3;
  const N = N_SEG, nv = N * 3 + 1, pos = new Float32Array(nv * 3), idx = []; const A = 0, B = N, Cc = 2 * N, Ce = 3 * N;
  for (let i = 0; i < N; i++) { const j = (i + 1) % N; idx.push(A + i, A + j, B + i, B + i, A + j, B + j, B + i, B + j, Cc + i, Cc + i, B + j, Cc + j, Cc + i, Cc + j, Ce); }
  const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.BufferAttribute(pos, 3)); geo.setIndex(idx);
  const water = mesh(geo, mat, g, true); water.frustumCulled = false;
  const rim = new THREE.Mesh(new THREE.TorusGeometry(1, .0005, 6, 40), rimMat); rim.rotation.x = Math.PI / 2; rim.renderOrder = 4; g.add(rim);
  const men = new THREE.Mesh(menGeo, menMat); men.rotation.x = -Math.PI / 2; men.renderOrder = 4; g.add(men);
  const lip = new THREE.Mesh(lipGeo, lipMat); lip.rotation.x = Math.PI / 2; lip.position.y = GH - .0003; lip.renderOrder = 4; g.add(lip);
  const cond = new THREE.Mesh(condGeo, condMat); cond.renderOrder = 6; cond.rotation.y = hash(o.seed || 0) * 6.3; cond.visible = o.cond !== false; g.add(cond);
  const cs = new THREE.Mesh(shadowGeo, shadowMat); cs.rotation.x = -Math.PI / 2; cs.position.y = .0004; cs.renderOrder = 1; g.add(cs);
  const bubs = Array.from({ length: 9 }, () => { const b = new THREE.Mesh(bubG, bubM); b.visible = false; g.add(b); return b; }); const cl = [0, 1].map(k => { const m = new THREE.Mesh(new THREE.PlaneGeometry(.17, .125), causticMat(0)); m.rotation.x = -Math.PI / 2; m.rotation.z = .0; m.position.set(.062, .0007 + k * .0001, -.036); m.rotation.z = 0.6; g.add(m); return m; });
  g.userData = { f: -1, set(f, rip, ph, cau) { const w = g.userData; water.visible = f > .004; rim.visible = men.visible = bubs.forEach(b => (b.visible = false)) || water.visible; const kc = (cau == null ? 1 : cau) * smooth(f * 4) * (o.cau == null ? 1 : o.cau);
      cl.forEach((m, k) => { m.material.opacity = 1.0 * kc * (k ? .7 : 1) * (1 + .12 * Math.sin(ph * .9 + k * 2)); m.scale.setScalar((1 + .05 * Math.sin(ph * .7 + k * 1.9)) * (.8 + .3 * f)); m.rotation.z = .6 + (k ? .5 : 0) + .03 * Math.sin(ph * .5 + k); m.visible = kc > .01; });
      if (!water.visible) return; const y0 = GB + .0006, y1 = y0 + f * (GH * .9 - y0), r0 = rin(y0) - .0004, r1 = rin(y1) - .0004, p = pos;
      for (let i = 0; i < N; i++) { const a = i / N * 6.2832, c = Math.cos(a), s = Math.sin(a), rp = rip * (Math.sin(3 * a + ph) * .0011 + Math.sin(5 * a - ph * 1.3) * .0006);
        p.set([c * r0, y0, s * r0], (A + i) * 3); p.set([c * r1, y1 + .0012 + rp, s * r1], (B + i) * 3); p.set([c * r1 * .55, y1 - .0003 + rp * .6 + rip * .0014 * Math.sin(2 * a + ph * 1.1), s * r1 * .55], (Cc + i) * 3); }
      p.set([0, y1 - .0008 + rip * .002 * Math.sin(ph * 1.7), 0], Ce * 3); rim.scale.set(r1 * .985, r1 * .985, 1); rim.position.y = y1 + .0013; men.scale.set(r1 * 1.0, r1 * 1.0, 1); men.position.y = y1 + .0014; bubs.forEach((b, i) => { b.visible = rip > .4; if (b.visible) { const u = (ph * .35 + i * .37) % 1; b.position.set((hash(i * 3.1) - .5) * .026, y0 + u * (y1 - y0), (hash(i * 5.3) - .5) * .026); b.scale.setScalar(.6 + hash(i) * .9); } });
      geo.attributes.position.needsUpdate = true; geo.computeVertexNormals(); geo.computeBoundingSphere(); } };
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
const stream = mesh(new THREE.CylinderGeometry(.0017, .0015, 1, 10, 1, true), new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0, transmission: 0, transparent: true, opacity: .72, envMapIntensity: 3, specularIntensity: 1 }), gW, false); stream.visible = false;
function setStream(x, topY, waterY, on, t) { stream.visible = on; if (!on) return; const h = Math.max(.01, topY - waterY); stream.scale.set(1 + .12 * Math.sin(t * 30), h, 1 + .12 * Math.cos(t * 26)); stream.position.set(x, waterY + h / 2, 0); }
const dropsG = new THREE.Group(); gW.add(dropsG); // tiny splash droplets at the impact point
const dropM = phys("#ffffff", { roughness: 0, transmission: 1, ior: 1.33, thickness: .004 }), dropG = new THREE.SphereGeometry(.0016, 8, 6), drops = Array.from({ length: 9 }, (_, i) => { const m = mesh(dropG, dropM, dropsG, false); m.visible = false; return m; });
function splash(x, y, t, on) { drops.forEach((m, i) => { const ph = ((t * 2.4 + hash(i * 3.3)) % 1), a = hash(i * 5.1) * 6.283, v = .014 + hash(i * 7.7) * .012; m.visible = on; if (on) m.position.set(x + Math.cos(a) * v * ph * 1.6, y + .02 * Math.sin(ph * Math.PI) * (.6 + hash(i)), Math.sin(a) * v * ph * 1.6); }); }
// ripple rings on the water surface (additive), and the hook's single drop: falling drop, crown splash with flying droplets, Worthington jet
const RGEO = (() => { const g = new THREE.RingGeometry(.84, 1, 56, 1), n = g.attributes.position.count, c = new Float32Array(n * 3); for (let i = 0; i < n; i++) c.fill(i < n / 2 ? 0 : 1, i * 3, i * 3 + 3); g.setAttribute("color", new THREE.BufferAttribute(c, 3)); return g; })();
const rings = Array.from({ length: 6 }, () => { const m = new THREE.Mesh(RGEO, new THREE.MeshBasicMaterial({ vertexColors: true, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0 })); m.rotation.x = -Math.PI / 2; m.visible = false; m.renderOrder = 5; gW.add(m); return m; });
function setRipples(x, y, z, list) { rings.forEach((m, k) => { const q = list && list[k]; m.visible = !!q && q.u > 0 && q.u < 1; if (!m.visible) return; const r = .0035 + q.u * .0235; m.scale.set(r, r, 1); m.position.set(x, y, z); m.material.opacity = q.amp * Math.pow(1 - q.u, 1.3) * smooth(q.u / .06); }); }
const pourRip = t => [0, 1, 2, 3, 4].map(k => ({ u: (t * 5 + k / 5) % 1, amp: .5 }));
const hookG = new THREE.Group(); gW.add(hookG); hookG.visible = false; const TH_HIT = .36;
const hdropM = phys("#ffffff", { roughness: 0, transmission: 1, ior: 1.33, thickness: .006, envMapIntensity: 2.2 });
const hdrop = mesh(new THREE.SphereGeometry(.0029, 24, 16), hdropM, hookG, false);
const crownM = new THREE.MeshPhysicalMaterial({ color: col("#eaf5f8"), transparent: true, opacity: .5, roughness: .05, envMapIntensity: 3, side: THREE.DoubleSide, depthWrite: false });
const crown = mesh(new THREE.CylinderGeometry(1.35, 1, 1, 36, 1, true), crownM, hookG, false); crown.renderOrder = 4;
const jet = mesh(new THREE.CylinderGeometry(.0011, .0017, 1, 14), crownM, hookG, false), jetTip = mesh(new THREE.SphereGeometry(.0019, 14, 10), hdropM, hookG, false);
const cdrops = Array.from({ length: 16 }, () => mesh(new THREE.SphereGeometry(1, 10, 8), hdropM, hookG, false));
function hookDrop(t, ys, on) { hookG.visible = on; if (!on) return; const a = t - TH_HIT;
  if (a < 0) { const u = (t + .14) / (TH_HIT + .14); hdrop.visible = true; hdrop.position.set(0, ys + .0035 + .05 * (1 - u * u), 0); hdrop.scale.set(.82, 1.35 - .35 * u, .82); } else hdrop.visible = false;
  const cv = a > 0 && a < .42, r = .0032 + .0105 * (1 - Math.exp(-Math.max(0, a) * 16)), h = a < .3 ? .0092 * Math.pow(Math.sin(Math.PI * clamp(a / .3)), .8) : 0;
  crown.visible = cv && h > .0003; crown.scale.set(r, Math.max(.0001, h), r); crown.position.set(0, ys + h / 2, 0); crownM.opacity = .5 * Math.pow(1 - clamp(a / .42), .7);
  cdrops.forEach((m, k) => { const a2 = a - .02, ang = k / 16 * 6.283 + hash(k * 1.7) * .3, rad = (.0043 + .0105 * (1 - Math.exp(-Math.max(0, a) * 16))) * 1.3 + .05 * (.7 + .6 * hash(k * 3.1)) * Math.max(0, a2) * .6, y = ys + h * .9 + .14 * (.6 + .5 * hash(k * 5.3)) * Math.max(0, a2) - .7 * a2 * a2;
    m.visible = a > .02 && y > ys + .0004 && rad < .0245; if (m.visible) { m.position.set(Math.cos(ang) * rad, y, Math.sin(ang) * rad); m.scale.setScalar(.00075 + .0005 * hash(k * 7.7)); } });
  const ja = (a - .1) / .5, jh = ja > 0 && ja < 1 ? .0125 * Math.pow(Math.sin(Math.PI * ja), .9) : 0; jet.visible = jetTip.visible = jh > .0004; jet.scale.set(1, Math.max(.0001, jh), 1); jet.position.set(0, ys + jh / 2, 0); jetTip.position.set(0, ys + jh + .0012, 0); }

// ------------------------------------------------------------ STAGE A: forearm macro (+ hydration probe). Two arms: deep brown (beat 6) and warm tan (beat 12)
const ARM_R = .0525;
function buildArm(x0, hex, seed, rough, o) { o = o || {}; const g = new THREE.Group(); (o.parent || scene).add(g); g.position.x = x0; g.visible = false;
  const geo = new THREE.CylinderGeometry(.055, .05, 1.6, 96, 1, true); geo.rotateY(Math.PI); geo.rotateZ(Math.PI / 2);
  const s11 = seed === 11, skin = skinMat(hex, o.rep || [6, 26], { rough: rough || .46, relief: o.relief || (s11 ? .9 : 1.2), pore: o.pore || (s11 ? 1.1 : 2.2), seed, sssK: o.sssK || (s11 ? 1 : 2.2), freckle: o.freckle, tex: o.tex }); const arm = mesh(geo, skin, g); g.userData.skin = skin;
  const span = o.span || .55;
  g.add(hairs(o.hairN || 1300, hairGeo(.0075, .00019, .5), new THREE.MeshStandardMaterial({ color: col(o.hair || (s11 ? "#1b0e08" : "#4a3020")), roughness: .5 }), i => { const x = -span + hash(i * 1.7 + seed) * span * 2, th = (hash(i * 3.1 + seed) - .5) * 3.4 + .2, R = .0525 - x * .0006, n = V3(0, Math.sin(th), Math.cos(th)), a = (hash(i * 5.3) - .5) * .7;
    const d = V3(Math.cos(a) * .8, 0, 0).addScaledVector(n, .5 + hash(i * 6.1) * .3).addScaledVector(V3(0, 1, 0), Math.sin(a) * .2).normalize(); return { p: V3(x, R * n.y, R * n.z), d, s: .6 + hash(i * 8.3) * .9 }; }, seed));
  if (!o.nobk) { const bk = new THREE.Mesh(new THREE.PlaneGeometry(3, 2), new THREE.MeshBasicMaterial({ map: canvasTex(256, (gg, n) => { const gr = gg.createRadialGradient(n * .55, n * .45, 0, n * .5, n * .5, n * .75); gr.addColorStop(0, s11 ? "#5a3a2a" : "#9a6a4c"); gr.addColorStop(1, s11 ? "#1d110c" : "#4a2c1e"); gg.fillStyle = gr; gg.fillRect(0, 0, n, n); }, null) })); bk.position.set(0, .05, -.16); g.add(bk); }
  return g; }
const A1X = 80, A2X = .35, gA1 = buildArm(A1X, C.skin[3], 11), gA2 = buildArm(A2X, "#CC9068", 23, .5, { nobk: true }); gA2.position.set(A2X, ARM_R, 0);
// the mirror shot: glass standing behind the forearm, and a mirrored copy of arm + glass behind the wall opening
const glassA2 = makeGlass(WATER, { cau: .6, seed: 5 }); glassA2.position.set(A2X + .14, 0, -.085); glassA2.visible = false;
const mirror = new THREE.Group(); gW.add(mirror); mirror.visible = false;
const mArm = buildArm(A2X, "#CC9068", 23, .5, { nobk: true, parent: mirror, tex: [gA2.userData.skin.map, gA2.userData.skin.bumpMap] }); mArm.visible = true; mArm.position.set(A2X, ARM_R, 2 * WZ); mArm.scale.z = -1;
const mGlass = makeGlass(WATER, { cau: .6, seed: 5 }); mirror.add(mGlass); mGlass.position.set(A2X + .14, 0, 2 * WZ + .085); mGlass.scale.z = -1;
{ const mc = new THREE.Mesh(new THREE.PlaneGeometry(3, 4), new THREE.MeshStandardMaterial({ map: counterTex, roughness: .3, envMapIntensity: 1.0, color: col("#e4e6e6") })); mc.rotation.x = -Math.PI / 2; mc.position.set(A2X, 0, WZ - 2); mc.receiveShadow = false; mirror.add(mc);
  const bkT = canvasTex(256, (g, n) => { const gr = g.createLinearGradient(0, 0, 0, n); gr.addColorStop(0, "#f4f1ea"); gr.addColorStop(1, "#d9d5ca"); g.fillStyle = gr; g.fillRect(0, 0, n, n); g.fillStyle = "rgba(255,244,222,.95)"; g.filter = "blur(10px)"; g.fillRect(n * .1, n * .12, n * .34, n * .52); }, null);
  const mb = new THREE.Mesh(new THREE.PlaneGeometry(5, 3), new THREE.MeshBasicMaterial({ map: bkT })); mb.position.set(A2X, 1.3, -1.9); mirror.add(mb);
  const w = MIR.x1 - MIR.x0, h = MIR.y1 - MIR.y0, cx = (MIR.x0 + MIR.x1) / 2, cy = (MIR.y0 + MIR.y1) / 2, fm = phys("#cfd5d6", { metalness: .9, roughness: .25, envMapIntensity: 1.4 });
  [[cx, MIR.y1 + .0045, w + .018, .009], [MIR.x0 - .0045, cy + .002, .009, h + .005], [MIR.x1 + .0045, cy + .002, .009, h + .005]].forEach(([x, y, bw, bh]) => { const f = mesh(new THREE.BoxGeometry(bw, bh, .014), fm, mirror); f.position.set(x, y, WZ + .0045); });
  const pane = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshPhysicalMaterial({ color: col("#a9cbc8"), transparent: true, opacity: .13, roughness: .02, envMapIntensity: 1.6, clearcoat: 1, depthWrite: false })); pane.position.set(cx, cy, WZ + .0035); pane.renderOrder = 7; mirror.add(pane);
  const shT = canvasTex(256, (g, n) => { g.fillStyle = "#000"; g.fillRect(0, 0, n, n); g.save(); g.translate(n / 2, n / 2); g.rotate(-.9); g.filter = "blur(6px)"; g.fillStyle = "#fff"; g.fillRect(-n, -n * .16, 2 * n, n * .08); g.fillStyle = "rgba(255,255,255,.55)"; g.fillRect(-n, n * .02, 2 * n, n * .2); g.restore(); }, null);
  const sheen = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: shT, blending: THREE.AdditiveBlending, transparent: true, opacity: .13, depthWrite: false })); sheen.position.set(cx, cy, WZ + .0038); sheen.renderOrder = 8; mirror.add(sheen);
  mirror.traverse(m => { if (m.isMesh && m.parent !== mirror) { m.castShadow = false; m.receiveShadow = false; } }); mArm.traverse(m => { m.castShadow = false; m.receiveShadow = false; }); mGlass.traverse(m => { m.castShadow = false; m.receiveShadow = false; }); }
// probe: brushed-steel body with a seam and knurled band, black insulating ring, gold-plated concentric electrode sensor face, cable
const probe = new THREE.Group(); scene.add(probe); probe.visible = false;
{ const steel = phys("#c3c8d0", { metalness: 1, roughness: .34, envMapIntensity: 1.6 }), dark = phys("#15181f", { roughness: .6 }), teal = phys("#0B7270", { roughness: .4, metalness: .3 }), rubber = phys("#101216", { roughness: .8 });
  const face = canvasTex(256, (g, n) => { g.fillStyle = "#171a22"; g.fillRect(0, 0, n, n); g.translate(n / 2, n / 2); for (let r = 14; r < n / 2 - 6; r += 11) { g.strokeStyle = (r / 11 | 0) % 2 ? "#d6b45c" : "#a7adb8"; g.lineWidth = 4.5; g.beginPath(); g.arc(0, 0, r, .25, 6.0); g.stroke(); } g.fillStyle = "#d6b45c"; g.beginPath(); g.arc(0, 0, 8, 0, 6.3); g.fill(); }, null);
  mesh(new THREE.CylinderGeometry(.0074, .0074, .0042, 36), steel, probe).position.y = .0021; const sf = mesh(new THREE.CircleGeometry(.0057, 36), new THREE.MeshStandardMaterial({ map: face, roughness: .22, metalness: .75, envMapIntensity: 1.6 }), probe, false); sf.rotation.x = Math.PI / 2; sf.position.y = -.0001;
  mesh(new THREE.CylinderGeometry(.0079, .0079, .0018, 36), rubber, probe).position.y = .0051;
  mesh(lathe([[.0074, .006], [.0074, .017], [.0098, .026], [.0108, .031], [.0108, .108]], 40), steel, probe);
  [.0368, .0615].forEach((y, k) => { const m = mesh(new THREE.CylinderGeometry(.01106, .01106, k ? .0009 : .0032, 40), k ? dark : teal, probe); m.position.y = y; });
  for (let i = 0; i < 16; i++) { const m = mesh(new THREE.CylinderGeometry(.01112, .01112, .00055, 40), dark, probe, false); m.position.y = .071 + i * .0016; }
  mesh(new THREE.CylinderGeometry(.0112, .0092, .014, 40), dark, probe).position.y = .115; mesh(new THREE.CylinderGeometry(.0058, .0058, .012, 24), rubber, probe).position.y = .128;
  const cable = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V3(0, .132, 0), V3(.003, .165, .004), V3(.025, .2, .012), V3(.09, .23, .0), V3(.2, .24, -.02)]), 40, .0017, 8), rubber); cable.castShadow = true; probe.add(cable); }

// ------------------------------------------------------------ STAGE X: skin cross-section (illustration), two panels: start / week 4
const gX = new THREE.Group(); scene.add(gX); const XX = 140; gX.position.x = XX; gX.visible = false;
const PW = .15, PD = .05, PY = [.07, -.06], BR_H = .0075, GAPS = [-.046, .004, .05], GAPW = .0105;
const mol = []; // per panel: instanced molecules (home positions), escapers use the gaps
{ const rb = new THREE.BoxGeometry(1, 1, 1), skinTone = col(C.skin[1]);
  const bd = backdrop => { const m = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.6), new THREE.MeshStandardMaterial({ map: canvasTex(256, (g, n) => { const lg = g.createLinearGradient(0, 0, n, n * .6); lg.addColorStop(0, "#86bab4"); lg.addColorStop(.55, "#b7d3c8"); lg.addColorStop(1, "#e3c0a6"); g.fillStyle = lg; g.fillRect(0, 0, n, n); const rg = g.createRadialGradient(n * .5, n * .45, n * .25, n * .5, n * .5, n * .75); rg.addColorStop(0, "rgba(0,0,0,0)"); rg.addColorStop(1, "rgba(20,40,45,.35)"); g.fillStyle = rg; g.fillRect(0, 0, n, n); }, null), roughness: 1 })); m.position.set(0, 0, -.06); m.receiveShadow = true; gX.add(m); }; bd();
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
const gG = new THREE.Group(); scene.add(gG); const GX = 120; gG.position.x = GX; gG.visible = false; const GW = .125;
{ const bk = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 1.1), new THREE.MeshStandardMaterial({ map: canvasTex(256, (g, n) => { const gr = g.createRadialGradient(n * .5, n * .45, 0, n * .5, n * .5, n * .75); gr.addColorStop(0, "#9cc3be"); gr.addColorStop(1, "#46726e"); g.fillStyle = gr; g.fillRect(0, 0, n, n); }, null), roughness: 1 })); bk.position.set(2 * GW, 0, -.075); bk.receiveShadow = true; gG.add(bk); }
const GHAIR = ["#b49a82", "#7a5a40", "#33200f", "#120a06", "#0a0605"];
C.skin.forEach((h, i) => { const a = buildArm(i * GW, h, 41 + i * 6, .5, { nobk: true, parent: gG, rep: [3, 12], hair: GHAIR[i], hairN: 1900, span: .3, relief: 1.0, pore: 2.0 + i * .12, sssK: i < 2 ? 1.5 : 2.2, freckle: i === 0 ? 1 : i === 1 ? .4 : 0 }); a.visible = true; a.rotation.z = -Math.PI / 2; });


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
  const fd = camera.position.distanceTo(V3(...c.fp)); bokeh.uniforms.focus.value = fd; bokeh.uniforms.aperture.value = c.ap * apK * .0055 / (fd * fd); bokeh.uniforms.maxblur.value = .016;
  return c;
}
let apK = 1;
const px = v => { const p = v.clone().project(camera); return { x: (p.x * .5 + .5) * 1080, y: (-p.y * .5 + .5) * 1920 }; };

const K1 = (p, l, f, o, ap, fp) => [{ t: 0, p, l, f, fp: fp || l, o: o || [0, 0], ap: ap || 1 }];
const HF = .88;                                   // "full" glass
const tapX = [-.13, -.045, .04, .125];
function probeX(t) { const tp = T.probeT; if (t < tp[0] + .3) return lerp(tapX[0] - .08, tapX[0], eo3(U(t, S("b06"), tp[0] - .1))); for (let k = 0; k < 3; k++) if (t < tp[k + 1] + .3) return lerp(tapX[k], tapX[k + 1], eio(U(t, tp[k] + .4, tp[k + 1] - .05))); return tapX[3]; }
function probeP(t) { let p = 0; T.probeT.forEach(tk => { p = Math.max(p, Math.pow(Math.sin(Math.PI * clamp((t - (tk - .12)) / .5)), 2)); }); return p; }
const slideCam = t => { const t0 = S("b15"), t1 = END("b15") + .3, P = (t1 - t0) / 5, MV = .34, tt = clamp(t - t0, 0, t1 - t0), i = Math.min(4, Math.floor(tt / P)), lt = tt - (i * P + P - MV), x = (i + (i < 4 ? eio(lt / MV) : 0)) * GW; return K1([GX + x, .004, .52], [GX + x, 0, 0], 55, [0, 0], .6, [GX + x, 0, .05]); };
function camFor(id, t) {
  const s0 = S(id), e0 = E(id), u = U(t, s0, e0);
  switch (id) {
    case "b01": { const ys = wY(.62); return [
      { t: 0, p: [.012, ys + .034, .11], l: [0, ys + .006, 0], f: 50, fp: [0, ys, 0], o: [70, 110], ap: .03 },
      { t: 1.0, p: [.016, ys + .036, .105], l: [0, ys + .007, 0], f: 50, fp: [0, ys, 0], o: [70, 110], ap: .03 },
      { t: 2.9, p: [-.05, .05, .7], l: [-.015, .058, 0], f: 85, fp: [0, .058, 0], o: [150, 130], ap: 2 },
      { t: S("b02"), p: [.05, .05, .7], l: [.035, .058, 0], f: 85, fp: [0, .058, 0], o: [150, 130], ap: 2 }]; }
    case "b02": { const lv = U(t, T.pour.t0, T.pour.t1); return K1([lerp(.05, .1, u), lerp(.09, .12, u), lerp(.5, .41, u)], [0, lerp(.055, .09, lv), 0], 70, [140, 90], 1.5, [0, .06, 0]); }
    case "b03": { const x = lerp(.06, .56, eio(U(t, T.fill0 - .1, T.fill0 + 7 * T.fillDt + .3))); return K1([x, .14, .95], [x, .06, 0], 70, [330, 60], 1.2, [x, .06, 0]); }
    case "b04": { const q = eio(u), x = lerp(.58, .76, q); return K1([x, lerp(.12, .09, q), lerp(1.2, .55, q)], [x, .03, 0], 70, [130, 40], 1.2, [x, .01, 0]); }
    case "b05": { const x = lerp(.12, .56, eio(u)); return K1([x, .17, 1.0], [x, .04, .1], 60, [150, 20], 1.5, [x, .03, .14]); }
    case "b06": { const x = probeX(t) * .85; return K1([A1X + x + .02, .15, .34], [A1X + x, .015, .03], 85, [190, 60], 1.4, [A1X + x, .02, .05]); }
    case "b07": case "b08": { const q = U(t, S("b07"), E("b08")); return K1([lerp(.26, .34, q), .12, 1.0], [lerp(.26, .34, q), .07, 0], 50, [110, 0], 3.4, [lerp(.26, .34, q), .07, .5]); }
    case "b09": { const q = eio(u); return K1([XX, -.02, lerp(.82, .76, q)], [XX, -.02, 0], 50, [110, -110], 1, [XX, 0, 0]); }
    case "b10": { const q = eio(u); return K1([lerp(.66, .42, q), lerp(.1, .16, q), lerp(.85, 1.95, q)], [lerp(.7, .4, q), .04, 0], 50, [120, 10], 1.2, [lerp(.7, .4, q), .04, 0]); }
    case "b11": return K1([lerp(.3, .44, u), .13, 1.5], [lerp(.3, .44, u), .06, 0], 50, [110, 0], 3.4, [lerp(.3, .44, u), .06, .7]);
    case "b12": return K1([A2X + lerp(-.03, .03, u), lerp(.19, .15, u), lerp(.52, .42, u)], [A2X + lerp(.02, .05, u), .09, -.02], 50, [150, 30], .4, [A2X + lerp(.02, .05, u), .06, .03]);
    case "b13": return K1([lerp(.02, .05, u), .1, lerp(.52, .42, u)], [0, .065, 0], 70, [130, 150], 1.4, [0, .06, 0]);
    case "b14": { const q = eio(u); return K1([lerp(.05, .2, q), lerp(.1, .2, q), lerp(.42, 1.35, q)], [lerp(0, .06, q), .06, 0], 60, [130, 120], 1.3, [lerp(0, .06, q), .06, 0]); }
    case "b15": return slideCam(t);
  }
}
const STAGES = { W: gW, A1: gA1, A2: gA2, X: gX, G: gG };
const BG = { W: "#efece5", A1: "#2b1b14", A2: "#efece5", X: "#9cc5bf", G: "#46726e" };
const stgOf = id => id === "b06" ? "A1" : id === "b12" ? "A2" : id === "b09" ? "X" : id === "b15" ? "G" : "W";
function show(name) { for (const k in STAGES) STAGES[k].visible = k === name; if (name === "A2") gW.visible = true; scene.background.set(BG[name]); }
const prog = (a, b, t) => smooth((t - a) / (b - a));
const wY = f => GB + .0006 + f * (GH * .9 - GB - .0006) + .0012;
const skinOff = () => { skinU.uPress.value.set(9, 9, 9); skinU.uDepth.value = 0; skinU.uAO.value = 0; };
function stage(t) {
  const id = stageOf(t), A = { id }, stg = stgOf(id); show(stg); skinOff(); apK = stg === "W" || stg === "A2" ? 1.7 : 1;
  setRipples(0, 0, 0, null); stream.visible = false; drops.forEach(m => (m.visible = false)); hookG.visible = false;
  mirror.visible = glassA2.visible = stg === "A2"; holeTiles.visible = groutFill.visible = stg !== "A2"; rim.intensity = stg === "G" ? 2.2 : stg === "A1" ? 1.1 : 0;
  const keys = camFor(id, t), cam = applyCam(keys, keys.length > 1 ? t : 0), focus = V3(...cam.fp); rim.position.copy(focus).add(V3(.8, .7, -.9)); rim.target.position.copy(focus); rim.target.updateMatrixWorld();
  const winLight = () => { const dist = camera.position.distanceTo(focus), ext = clamp(dist * .62, .16, 1.0);
    key.position.copy(focus).add(V3(-1.3, 1.5, .85).multiplyScalar(1.2)); key.target.position.copy(focus); key.target.updateMatrixWorld(); key.intensity = 2.3;
    Object.assign(key.shadow.camera, { left: -ext, right: ext, top: ext, bottom: -ext, near: .3, far: 6 }); key.shadow.camera.updateProjectionMatrix(); scene.environmentIntensity = .4; hemi.intensity = .24; };
  if (stg === "A2") { glasses.forEach(g => (g.visible = false)); food.visible = bowl.visible = juice.visible = slot.visible = false; glassA2.userData.set(.72, .05, t * 2, 1); mGlass.userData.set(.72, .05, t * 2, 1);
    const pp = gA2.position.clone().add(V3(.035, ARM_R * Math.sin(.3), ARM_R * Math.cos(.3))), q = px(pp), qx = px(pp.clone().add(V3(.03, 0, 0))); A.patch = { x: q.x, y: q.y, r: Math.min(220, Math.abs(qx.x - q.x)) }; winLight(); }
  if (stg === "W") {
    const only0 = id === "b01" || id === "b02" || id === "b13" || id === "b14";
    // glass levels
    const f = glasses.map(() => 0), rip = glasses.map(() => .08); let sx = 0, on = false, topY = .5;
    let hook = false; const gx = glasses.map(() => 0), gvis = glasses.map(() => true);
    if (id === "b01") { f[0] = .62; rip[0] = .08 + (t > TH_HIT ? .8 * Math.exp(-(t - TH_HIT) * 1.8) : 0); hook = t < 1.9; } else if (id === "b02") { f[0] = lerp(.62, HF, smooth(U(t, T.pour.t0 + .1, T.pour.t1))); on = t > T.pour.t0 && t < T.pour.t1; rip[0] = on ? 1 : .08 + .6 * Math.exp(-(t - T.pour.t1) * 2) * (t > T.pour.t1 ? 1 : 0); }
    else if (id === "b03") { f[0] = HF; glasses.forEach((g, i) => { if (!i) return; const lt = t - (T.fill0 + i * T.fillDt), s0 = T.fill0 + i * T.fillDt - .5; f[i] = HF * eo3(lt / .45); rip[i] = lt > 0 ? .08 + .8 * Math.exp(-Math.max(0, lt - .45) * 3) * (lt < 2 ? 1 : 0) : .08; gvis[i] = t >= s0; gx[i] = (1 - eob(U(t, s0, s0 + .42))) * .13; }); const q = (t - T.fill0 - .1) / T.fillDt; on = q > .7 && q < 7.6; sx = clamp(q, 0, 7) * PITCH; const gi = clamp(Math.round(q), 0, 7); topY = .42; }
    else f.fill(HF);
    if (id === "b13" || id === "b14" || id === "b01" || id === "b02") for (let i = 1; i < 8; i++) f[i] = 0;
    glasses.forEach((g, i) => { g.visible = (i === 0 || !only0) && gvis[i]; g.position.x = i * PITCH + gx[i]; g.userData.set(f[i], rip[i], t * 3 + i * 1.7, id === "b03" ? 1 : 1); });
    if (id === "b13" || id === "b14") { glasses[0].userData.set(HF, .06, t * 2.2, 1); }
    setStream(sx, topY, wY(id === "b03" ? f[clamp(Math.round((t - T.fill0 - .1) / T.fillDt), 0, 7)] : f[0]) , on, t); splash(sx, wY(id === "b03" ? f[clamp(Math.round((t - T.fill0 - .1) / T.fillDt), 0, 7)] : f[0]), t, on);
    if (on) setRipples(sx, wY(id === "b03" ? f[clamp(Math.round((t - T.fill0 - .1) / T.fillDt), 0, 7)] : f[0]) + .0002, 0, pourRip(t));
    hookDrop(t, wY(.62), hook); if (hook && t > TH_HIT) setRipples(0, wY(.62) + .0002, 0, [0, 1, 2, 3, 4].map(k => ({ u: (t - TH_HIT - .06 * k) / .6, amp: .7 })));
    // slot, food
    slot.scale.setScalar(1); slot.visible = ["b04", "b05", "b07", "b08", "b10", "b11"].includes(id); slot.position.set(8 * PITCH, 0, 0);
    if (id === "b04") { const s = eob(U(t, W("b04", "Nobody") - .3, W("b04", "Nobody") + .2)); slot.scale.setScalar(Math.max(.001, s) * 1.7); } else slot.scale.setScalar(1.7);
    const fv = id === "b05"; food.visible = fv; bowl.visible = fv; juice.visible = fv;
    if (fv) { const sl = k => 1 - eo3(U(t, S("b05") + .15 + k * .5, S("b05") + .9 + k * .5)); food.position.set(.17 + sl(0) * .5, 0, FZ0); bowl.position.set(.40 + sl(1) * .5, 0, FZ0); juice.position.set(.60 + sl(2) * .5, 0, FZ0); juice.userData.set(.62, .06, t * 2, 1);
      const q = px(V3(.17, .05, FZ0)); A.food = { x: q.x, y: q.y }; }
    if (slot.visible) { const q = px(V3(8 * PITCH, .01, 0)); A.slot = { x: q.x, y: q.y }; }
    winLight();
  } else if (stg !== "A2") {
    key.position.copy(focus).add(stg === "X" ? V3(-.5, .6, 1.2) : V3(-1.2, .5, .7).multiplyScalar(.6)); key.target.position.copy(focus); key.target.updateMatrixWorld(); key.intensity = stg === "X" ? 1.7 : stg === "G" ? 2.9 : 2.4; scene.environmentIntensity = stg === "X" ? .5 : .45; hemi.intensity = stg === "X" ? .5 : .45;
    const ext = stg === "G" ? .6 : stg === "X" ? .35 : .22; Object.assign(key.shadow.camera, { left: -ext, right: ext, top: ext, bottom: -ext, near: .1, far: 6 }); key.shadow.camera.updateProjectionMatrix();
  }
  probe.visible = stg === "A1"; probe.scale.setScalar(.55);
  if (stg === "A1") { const x = probeX(t), p = probeP(t), th = .25, n = V3(0, Math.sin(th), Math.cos(th)), P = V3(x, ARM_R * Math.sin(th), ARM_R * Math.cos(th)), qn = new THREE.Quaternion().setFromUnitVectors(V3(0, 1, 0), V3(-.55, .75, -.2).normalize());
    probe.quaternion.copy(qn); const hover = (1 - p) * .03; probe.position.copy(P).addScaledVector(n, hover - .0016 * p).add(gA1.position).addScaledVector(V3(.05, 0, 0).applyQuaternion(probe.quaternion), 0); probe.updateMatrixWorld(true);
    skinU.uPress.value.copy(P); skinU.uDepth.value = .0042 * Math.pow(p, 1.4); skinU.uAO.value = .6 * Math.pow(p, 1.2);
    const q = px(probe.position.clone()); A.tip = { x: q.x, y: q.y }; }
  if (stg === "X") { updMol(t); A.xp = PY.map(py => { const q = px(V3(XX - PW / 2 + .035, py + .03, 0)); return { x: Math.max(q.x + 60, 500), y: q.y }; }); }
  A.stg = stg; return A;
}

window.__seek = function (t) {
  if (COVER) { // cover: glass of water on the counter, a forearm lying behind it, headline plate + receipt total drawn by the overlay
    const ts = T.probeT[1] + .12; stage(ts); composer.render(); const cp = document.createElement("canvas"); cp.width = 1080; cp.height = 1920; cp.getContext("2d").drawImage(glc, 0, 0); // forearm + probe macro, drawn as an inset by the overlay
    show("W"); skinOff(); apK = 1.7; glasses.forEach((g, i) => { g.visible = i === 0; }); glasses[0].userData.set(.9, .08, 1.3, 1.3); slot.visible = false; food.visible = bowl.visible = juice.visible = false; stream.visible = false; drops.forEach(m => (m.visible = false)); probe.visible = false;
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
