// Pan Theory ep01: what sautéing does to your veggies. three.js 0.169 (vendored). Pure function of t: window.__seek(t) renders the frame.
// Kitchen (overhead, warm window light) <-> molecule worlds (carotenoids in carrot, oil droplets on a cell wall, vitamin C in pepper cells).
import * as THREE from "three";
import { createPost } from "../../../engine/film/post.js";
import * as K from "../../../engine/film/kitchen.js";
import { clamp, smooth, eio, eo3, eob, lerp, hash, makeTiming } from "./timing.js";
import { createOverlay } from "./overlay.js";

const TH = window.THEME, C = TH.colors;
const COVER = new URLSearchParams(location.search).has("cover");
{ let css = ""; for (const k in TH.fonts) for (const f of TH.fonts[k].faces) css += `@font-face{font-family:"${TH.fonts[k].family}";font-weight:${f.weight};src:url(${f.url}) format("woff2");}\n`;
  css += `:root{--bg:${C.bg};--key:${TH.caption.keyColor}}\n`; document.getElementById("theme-css").textContent = css; }
await Promise.all([`800 60px "Rubik"`, `500 30px "Rubik"`, `800 60px "Nunito"`, `400 30px "Nunito"`].map(f => document.fonts.load(f))); await document.fonts.ready;
const tl = await (await fetch("out/timeline.json")).json();
const T = makeTiming(tl), { S, E, END, W, DUR } = T;
const ov = createOverlay(T, TH, document.getElementById("fx")); ov.initCaps(tl);

const { renderer, scene, camera, composer, bokeh, bloom, filmPass } = createPost({ canvas: document.getElementById("gl"), theme: TH });
renderer.toneMapping = THREE.NeutralToneMapping; renderer.toneMappingExposure = 1.38;
scene.background = new THREE.Color(C.countertop);
scene.environment = K.makeEnv(renderer); scene.environmentIntensity = .3;
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const PI = Math.PI, ez = (t, a, b, f = 0, g = 1, fn = smooth) => lerp(f, g, fn(clamp((t - a) / (b - a))));
// transparent glow/steam objects must not enter the DOF depth pass
const noDepth = []; { const br = bokeh.render.bind(bokeh); bokeh.render = function (...a) { const v = noDepth.map(o => o.visible); noDepth.forEach(o => (o.visible = false)); br(...a); noDepth.forEach((o, i) => (o.visible = v[i])); }; }

// ---------- lights ----------
const key = new THREE.DirectionalLight(0xffe0b4, 1.25); key.castShadow = true; key.shadow.mapSize.set(2048, 2048);
Object.assign(key.shadow.camera, { left: -7.5, right: 7.5, top: 7.5, bottom: -7.5, near: .5, far: 40 }); key.shadow.bias = -.0005; key.shadow.normalBias = .025; key.shadow.radius = 5;
scene.add(key, key.target, new THREE.HemisphereLight(0xfff3e2, 0xe6d3b4, .22));
const mLight = new THREE.PointLight(0xffc27a, 0, 0, 2); scene.add(mLight); // molecule-world key
const heatLight = new THREE.PointLight(0xff5a2a, 0, 0, 2); scene.add(heatLight);

// ---------- soft sprite textures (as meshes: sprites would break the DOF depth pass) ----------
const softTex = (() => { const c = document.createElement("canvas"); c.width = c.height = 128; const x = c.getContext("2d"); const g = x.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, "rgba(255,255,255,1)"); g.addColorStop(.35, "rgba(255,255,255,.5)"); g.addColorStop(1, "rgba(255,255,255,0)"); x.fillStyle = g; x.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c); })();
const puffTex = (() => { const c = document.createElement("canvas"); c.width = c.height = 128; const x = c.getContext("2d"); for (let i = 0; i < 9; i++) { const px = 64 + (hash(i) - .5) * 44, py = 64 + (hash(i * 3) - .5) * 44, r = 20 + hash(i * 5) * 22, g = x.createRadialGradient(px, py, 0, px, py, r); g.addColorStop(0, "rgba(255,255,255,.55)"); g.addColorStop(1, "rgba(255,255,255,0)"); x.fillStyle = g; x.fillRect(0, 0, 128, 128); } return new THREE.CanvasTexture(c); })();
const quad = (tex, color, add, op = 1) => new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: tex, color, transparent: true, opacity: op, depthWrite: false, blending: add ? THREE.AdditiveBlending : THREE.NormalBlending, toneMapped: true }));

// ============================================================ KITCHEN ============================================================
const X_BOARD = 7, X_TRIO = 24, X_CMP = 40, X_BAL = 56;
const GK = new THREE.Group(); scene.add(GK);
const counter = K.makeCounter(260); counter.position.set(30, 0, 0); GK.add(counter);
const pan = K.makePan(); GK.add(pan); pan.userData.mat.envMapIntensity = .55; pan.rotation.y = .9;
const cast = o => { o.traverse(m => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } }); return o; };
// materials
const coinMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .78, metalness: 0 });
const coinMatRaw = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .72, metalness: 0 });
const stripMat = new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: .42, metalness: 0, clearcoat: .0, clearcoatRoughness: .3 });
const stripMatRaw = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .4, metalness: 0 });
const leafMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .6, metalness: 0, side: THREE.DoubleSide });
const florMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .8, metalness: 0 });
const coinGeos = [0, 1, 2, 3].map(i => K.makeCoin(i + 1)), stripGeos = [0, 1, 2, 3].map(i => K.makeStrip(i + 3)), leafGeos = [0, 1, 2].map(i => K.makeLeaf(i + 1)), florGeos = [0, 1, 2].map(i => K.makeFloret(i + 1));
const mesh = (g, m, par, x, y, z, rx = 0, ry = 0, rz = 0, s = 1) => { const o = new THREE.Mesh(g, m); o.position.set(x, y, z); o.rotation.set(rx, ry, rz, "YXZ"); o.scale.setScalar(s); o.castShadow = o.receiveShadow = true; par.add(o); return o; };
// pan contents
const FL = .095;
const panCoins = [[-.42, -.15], [.62, -.5], [.6, .42], [-.72, .5], [.0, .38], [-.12, -.8], [.9, -.05], [-.3, .98]].map((p, i) => { const o = mesh(coinGeos[i % 4], i ? coinMat : coinMat, GK, p[0], FL + .085 + (i ? .0 : .0), p[1], (hash(i) - .5) * .18, hash(i * 3) * 6.28, (hash(i * 5) - .5) * .18); o.userData.rest = o.position.clone(); return o; });
panCoins[0].position.y += .0; panCoins[0].userData.rest.copy(panCoins[0].position);
const panStrips = [[.38, -.02, .5], [-.5, .28, -.4], [.12, .78, 1.2], [-.2, -.62, 2.3]].map((p, i) => { const o = mesh(stripGeos[i], stripMat, GK, p[0], FL + .1, p[1], 0, p[2], 0); o.userData.rest = o.position.clone(); return o; });
// piles at the hook
const pileC = new THREE.Group(), pileP = new THREE.Group(); GK.add(pileC, pileP);
for (let i = 0; i < 24; i++) { const a = hash(i * 2.3) * 6.28, r = Math.sqrt(hash(i * 1.7)) * .62; mesh(coinGeos[i % 4], coinMatRaw, pileC, Math.cos(a) * r, .075 + .2 * (1 - r / .62) * hash(i * 9) + (i % 3) * .02, Math.sin(a) * r, (hash(i * 4) - .5) * .7, hash(i) * 6.28, (hash(i * 6) - .5) * .7); }
for (let i = 0; i < 9; i++) mesh(stripGeos[i % 4], stripMatRaw, pileP, (hash(i * 2) - .5) * .8, .13 + .075 * (i % 3), (hash(i * 3) - .5) * .8, 0, hash(i * 5) * 6.28, 0);
pileC.position.set(-2.05, 0, .1); pileP.position.set(2.05, 0, .1);
// spinach + broccoli (drop into the pan during b07)
const dropIns = [];
[[-.55, -.35, .3], [.3, .15, 2.2], [-.1, .7, 4.0], [.55, -.6, 5.2], [-.8, .1, 1.0]].forEach((p, i) => { const o = mesh(leafGeos[i % 3], leafMat, GK, p[0], FL + .15 + i * .015, p[1], 0, p[2], 0); o.userData = { rest: o.position.clone(), t0: T.tSpin - .1 + i * .22, ry: p[2] }; o.visible = false; dropIns.push(o); });
[[.3, -.1, 0.5], [-.45, .72, 3.2], [.75, .55, 5.0]].forEach((p, i) => { const o = mesh(florGeos[i], florMat, GK, p[0], FL + .01, p[1], .15, p[2], .1, 1); o.userData = { rest: o.position.clone(), t0: T.tSpin + .3 + i * .28, ry: p[2] }; o.visible = false; dropIns.push(o); });
// oil: glossy dome puddle + a ribbon that slides in
const oilMat = new THREE.MeshPhysicalMaterial({ color: "#D9981C", roughness: .04, metalness: 0, transparent: true, opacity: .34, clearcoat: 1, clearcoatRoughness: .02, envMapIntensity: 1.3, ior: 1.47 });
const oilGeo = (() => { const g = new THREE.SphereGeometry(1, 56, 14, 0, PI * 2, 0, PI / 2); K.mapVerts(g, (x, y, z) => { const r = Math.hypot(x, z), an = Math.atan2(z, x), w = 1 + .1 * K.vn(Math.cos(an) * 1.4, Math.sin(an) * 1.4, 4.1); return [x * w, y * .06 * (1 + .6 * K.vn(x * 2, 3.3, z * 2)) , z * w]; }); g.computeVertexNormals(); return g; })();
const oil = new THREE.Mesh(oilGeo, oilMat); oil.position.set(-.05, FL + .004, .02); oil.receiveShadow = true; GK.add(oil);
const ribbonCurve = new THREE.CatmullRomCurve3([V(-1.72, .52, -1.2), V(-1.25, .36, -.85), V(-.8, .16, -.35), V(-.35, .125, .05), V(.0, .115, .02)]);
const ribbon = new THREE.Mesh(new THREE.TubeGeometry(ribbonCurve, 40, .07, 10, false), oilMat); GK.add(ribbon);
const ribbonCount = ribbon.geometry.index.count;
// steam + heat (transparent, kept out of the depth pass)
const Gfx = new THREE.Group(); GK.add(Gfx); noDepth.push(Gfx);
const steam = []; for (let i = 0; i < 34; i++) { const q = quad(puffTex, "#FFF8EC", false, 0); q.rotation.x = -PI / 2; Gfx.add(q); steam.push(q); }
const heatQ = []; for (let i = 0; i < 7; i++) { const q = quad(softTex, "#C4381E", true, 0); q.rotation.x = -PI / 2; Gfx.add(q); heatQ.push(q); }
const gleams = [[-.62, -.5, .9, .22, .6], [-.9, .05, .5, .14, 1.2], [.7, .62, .45, .12, -.5]].map(g => { const q = quad(softTex, "#FFF1CC", true, 0); q.rotation.x = -PI / 2; q.rotation.z = g[4]; q.scale.set(g[2], g[3], 1); q.position.set(g[0], .17, g[1]); Gfx.add(q); return q; });
const glowRight = quad(softTex, "#E0451F", true, 0); glowRight.rotation.x = -PI / 2; glowRight.scale.set(3.4, 3.4, 1); glowRight.position.set(.9, .5, 0); Gfx.add(glowRight);
// board with raw peppers, broccoli, tomato halves
const board = new THREE.Group(); board.position.set(X_BOARD, 0, 0); GK.add(board);
{ const bt = K.woodTex(); bt.repeat.set(2, 1); const bm = new THREE.Mesh(K.roundBox(3.8, .22, 2.6, .07), new THREE.MeshStandardMaterial({ map: bt, roughness: .62 })); bm.position.y = .11; bm.castShadow = bm.receiveShadow = true; board.add(bm); }
const boardStrips = [[-1.0, -.55, .15], [-.6, -.62, .05], [-.2, -.55, -.1], [-.8, .75, 1.4]].map((p, i) => mesh(stripGeos[i], stripMatRaw, board, p[0], .22 + .1, p[1], 0, p[2], 0));
[[-.55, .15, 0], [.45, .75, .9]].forEach(p => { const h = K.makeHalfTomato(); h.position.set(p[0], .22, p[1]); h.rotation.y = p[2]; cast(h); board.add(h); });
[[1.0, -.45, 1.0], [1.35, .4, 2.6]].forEach((p, i) => mesh(florGeos[i], florMat, board, p[0], .22, p[1], .15, p[2], .1, 1.0));
// tiles (vitamins)
const tiles = {}; const mkT = (k, l, bg, fg, s, par, x, y, z) => { const g = K.makeTile(l, bg, fg, s); g.position.set(x, y, z); g.visible = false; (par || GK).add(g); tiles[k] = g; return g; };
const vitX = [-1.45, -.65, .15, .95]; ["A", "D", "E", "K"].forEach((l, i) => mkT("v" + l, l, C.butter, C.cast, .68, GK, vitX[i], .15, 2.2));
const tileC = mkT("c", "C", C.herb, C.countertop, .95, GK, X_BOARD + .1, 1.5, -.1);
// trio: microwave plate, steamer, pan
const trio = new THREE.Group(); trio.position.set(X_TRIO, 0, 0); GK.add(trio);
{ const plate = new THREE.Mesh(new THREE.CylinderGeometry(1.55, 1.55, .08, 56), new THREE.MeshPhysicalMaterial({ color: "#E4ECEA", roughness: .12, metalness: 0, transparent: true, opacity: .72, clearcoat: 1, envMapIntensity: 1.6 })); plate.position.set(-1.75, .06, -2.6); plate.castShadow = plate.receiveShadow = true; trio.add(plate);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(.75, .045, 10, 48), new THREE.MeshStandardMaterial({ color: "#2A2724", roughness: .5 })); ring.rotation.x = PI / 2; ring.position.set(-1.75, .11, -2.6); trio.add(ring);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(1.55, .04, 8, 56), new THREE.MeshStandardMaterial({ color: "#F4F8F6", roughness: .2 })); rim.rotation.x = PI / 2; rim.position.set(-1.75, .1, -2.6); trio.add(rim);
  const wt = K.woodTex(); wt.repeat.set(3, 1); const wm = new THREE.MeshStandardMaterial({ map: wt, roughness: .7, color: "#E7C58A" });
  const sb = new THREE.Mesh(new THREE.LatheGeometry([[1.5, 0], [1.62, .02], [1.62, .55], [1.5, .55], [1.5, .1], [0, .1]].map(a => new THREE.Vector2(a[0], a[1])), 56), wm); sb.position.set(1.75, 0, -2.6); sb.castShadow = sb.receiveShadow = true; trio.add(sb);
  for (let i = -4; i <= 4; i++) { const s = new THREE.Mesh(K.roundBox(.1, .08, 2.7 * Math.sqrt(1 - (i / 4.6) ** 2), .03), wm); s.position.set(1.75 + i * .33, .13, -2.6); s.castShadow = true; trio.add(s); }
  const p2 = K.makePan(); p2.position.set(0, 0, .9); p2.rotation.y = -.9; trio.add(p2); trio.userData.pan2 = p2;
  [[-2.2, -2.9, 0.3], [-1.3, -2.1, 1.7]].forEach((p, i) => mesh(stripGeos[i], stripMatRaw, trio, p[0], .2, p[1], 0, p[2], 0));
  [[1.4, -2.3, 0.2], [2.1, -3.0, 1.1]].forEach((p, i) => mesh(stripGeos[i + 2], stripMatRaw, trio, p[0], .32, p[1], 0, p[2], 0));
  [[.3, .5, .4], [-.5, 1.1, 1.8]].forEach((p, i) => mesh(stripGeos[i + 1], stripMat, trio, p[0], FL + .1, p[1], 0, p[2], 0)); }
const trioTiles = { mic: [], ste: [], pan: [] };
{ const grid = [[-.42, -.34], [.42, -.34], [-.42, .34], [.42, .34]], place = (arr, cx, cz, y) => grid.forEach((g, i) => { const t = K.makeTile("C", C.herb, C.countertop, .5); t.position.set(cx + g[0], y, cz + g[1]); t.rotation.y = (hash(cx + i) - .5) * .4; trio.add(t); cast(t); arr.push(t); });
  place(trioTiles.mic, -1.75, -2.6, .25); place(trioTiles.ste, 1.75, -2.6, .65); place(trioTiles.pan, 0, .9, .22 + .08); }
// raw vs cooked
const cmp = new THREE.Group(); cmp.position.set(X_CMP, 0, 0); GK.add(cmp);
const rawPepperMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .32, metalness: 0 }), cookedPepperMat = new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: .36, metalness: 0, clearcoat: .6, clearcoatRoughness: .25 });
const pepRaw = mesh(K.makePepper(1, false), rawPepperMat, cmp, -1.55, .62, -2.1, 0, .3, 0, 1.15), pepCooked = mesh(K.makePepper(2, true), cookedPepperMat, cmp, 1.55, .5, -2.1, 0, -.4, 0, 1.15);
const cmpTiles = { raw: [], cooked: [] };
{ const place = (arr, cx, n, ghosts) => { for (let i = 0; i < n; i++) { const t = K.makeTile("C", C.herb, C.countertop, .66); t.position.set(cx + (i % 2 ? .4 : -.4), .15, .3 + Math.floor(i / 2) * .8); t.rotation.y = (hash(cx + i) - .5) * .25; cmp.add(t); cast(t); arr.push(t); if (ghosts && i >= 2) { t.userData.body.material.transparent = true; t.userData.ghost = true; } } };
  place(cmpTiles.raw, -1.55, 6, false); place(cmpTiles.cooked, 1.55, 6, true); }
// balance
const bal = new THREE.Group(); bal.position.set(X_BAL, 0, 0); GK.add(bal);
const balMat = new THREE.MeshStandardMaterial({ color: "#2A2724", metalness: .8, roughness: .45 }), balWood = new THREE.MeshStandardMaterial({ color: "#C99B63", roughness: .6, map: (() => { const t = K.woodTex(); return t; })() });
const beam = new THREE.Group(); beam.position.set(0, 1.25, 0); bal.add(beam);
{ const base = new THREE.Mesh(K.roundBox(3.0, .28, 1.0, .1), balWood); base.position.set(0, .14, 1.3); base.castShadow = base.receiveShadow = true; bal.add(base);
  const post = new THREE.Mesh(new THREE.CylinderGeometry(.14, .22, 1.2, 20), balMat); post.position.set(0, .8, 1.3 - .0); post.castShadow = true; bal.add(post);
  const post2 = new THREE.Mesh(new THREE.CylinderGeometry(.12, .12, .3, 16), balMat); post2.position.set(0, 1.25, 0); post2.rotation.x = PI / 2; bal.add(post2);
  const arm = new THREE.Mesh(K.roundBox(.22, .22, 1.3, .08), balMat); arm.position.set(0, 1.0, .65); arm.rotation.x = .0; arm.castShadow = true; bal.add(arm);
  const bm = new THREE.Mesh(K.roundBox(4.4, .18, .26, .07), balMat); bm.castShadow = true; beam.add(bm);
  const pans = [-1.8, 1.8].map(x => { const g = new THREE.Group(); const dish = new THREE.Mesh(new THREE.LatheGeometry([[0, 0], [.85, 0], [.95, .04], [1.0, .16], [.94, .17], [.82, .06], [0, .06]].map(a => new THREE.Vector2(a[0], a[1])), 48), new THREE.MeshStandardMaterial({ color: "#B8B1A4", metalness: .75, roughness: .35 })); dish.castShadow = dish.receiveShadow = true; g.add(dish);
    [[-.6, -.6], [.6, -.6], [0, .8]].forEach(c => { const cord = new THREE.Mesh(new THREE.CylinderGeometry(.012, .012, 1, 4), balMat); const a = V(c[0], .1, c[1]), b = V(0, 1.0, 0), d = b.clone().sub(a); cord.position.copy(a).addScaledVector(d, .5); cord.scale.y = d.length(); cord.quaternion.setFromUnitVectors(V(0, 1, 0), d.normalize()); g.add(cord); });
    g.position.set(x, .45, 0); bal.add(g); return g; });
  bal.userData.pans = pans;
  const drop = new THREE.Mesh(new THREE.SphereGeometry(.55, 40, 24), new THREE.MeshPhysicalMaterial({ color: "#EDB63A", roughness: .04, transparent: true, opacity: .8, clearcoat: 1, envMapIntensity: 3.2 })); drop.scale.set(1, .7, 1); drop.position.set(0, .35, 0); drop.castShadow = true; pans[0].add(drop);
  const sm = new THREE.Mesh(new THREE.SphereGeometry(.12, 16, 12), new THREE.MeshBasicMaterial({ color: "#FFF4D8" })); sm.position.set(-.2, .62, -.2); pans[0].add(sm);
  const ember = new THREE.Mesh(new THREE.IcosahedronGeometry(.46, 2), new THREE.MeshStandardMaterial({ color: "#7A1D10", emissive: "#E0451F", emissiveIntensity: 1.4, roughness: .55 })); K.mapVerts(ember.geometry, (x, y, z) => { const s = 1 + .18 * K.vn(x * 5, y * 5, z * 5); return [x * s, y * s * .85, z * s]; }); ember.geometry.computeVertexNormals(); ember.position.set(0, .4, 0); pans[1].add(ember);
  const hg = quad(softTex, "#E0451F", true, .0); hg.rotation.x = -PI / 2; hg.scale.set(3.2, 3.2, 1); hg.position.set(1.8, .9, 0); Gfx.add(hg); bal.userData.hg = hg; bal.userData.ember = ember;
  bal.userData.shim = []; for (let i = 0; i < 6; i++) { const q = quad(puffTex, "#C4381E", true, 0); q.rotation.x = -PI / 2; Gfx.add(q); bal.userData.shim.push(q); } }

// ============================================================ MOLECULE WORLDS ============================================================
const MY = { m1: -200, m2: -300, m3: -400 };
const gM1 = new THREE.Group(), gM2 = new THREE.Group(), gM3 = new THREE.Group(); [gM1, gM2, gM3].forEach(g => scene.add(g)); gM2.position.y = MY.m2;
const Gm = new THREE.Group(); scene.add(Gm); noDepth.push(Gm); // blobs/glows for molecule worlds (world space)
function cellsTex(c0, c1, line, seed) { const S_ = 1024, c = document.createElement("canvas"); c.width = c.height = S_; const x = c.getContext("2d");
  const g = x.createRadialGradient(512, 460, 40, 512, 512, 760); g.addColorStop(0, c1); g.addColorStop(1, c0); x.fillStyle = g; x.fillRect(0, 0, S_, S_);
  x.strokeStyle = line; x.lineWidth = 9; for (let i = 0; i < 46; i++) { const px = hash(i + seed) * S_, py = hash(i * 3 + seed) * S_, r = 70 + hash(i * 7 + seed) * 130; x.globalAlpha = .12 + .22 * hash(i * 5); x.beginPath(); for (let k = 0; k < 7; k++) { const a = k / 7 * 6.283 + hash(i + k) * .4, rr = r * (.85 + .3 * hash(i * 11 + k)); const qx = px + Math.cos(a) * rr, qy = py + Math.sin(a) * rr; k ? x.lineTo(qx, qy) : x.moveTo(qx, qy); } x.closePath(); x.stroke(); }
  x.globalAlpha = 1; const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }
const bgPlane = (g, tex, w, h, z, y = 0) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, toneMapped: true })); m.position.set(0, y, z); g.add(m); return m; };
const blobs = (par, n, col, seed, box, op, y0 = 0) => { const r = []; for (let i = 0; i < n; i++) { const q = quad(softTex, col, true, op * (.4 + .6 * hash(i + seed))); const s = 1.6 + hash(i * 3 + seed) * 3.6; q.scale.set(s, s, 1); q.position.set((hash(i * 5 + seed) - .5) * box[0], y0 + (hash(i * 7 + seed) - .5) * box[1], -2 - hash(i * 9 + seed) * 8); q.userData.b = q.position.clone(); Gm.add(q); r.push(q); } return r; };
// ---- M1: carotenoid pigments in carrot flesh ----
bgPlane(gM1, cellsTex("#5E2004", "#C25A12", "#F0A050", 3), 60, 60, -16, MY.m1);
const capGeo = new THREE.CapsuleGeometry(.07, .3, 4, 10);
const NP1 = 230, pig1 = new THREE.InstancedMesh(capGeo, new THREE.MeshStandardMaterial({ color: "#ffffff", emissive: "#E8700F", emissiveIntensity: 1.3, roughness: .35 }), NP1); pig1.frustumCulled = false; gM1.add(pig1);
const pigCols = ["#FFA02A", "#FFC45A", "#FFD56E", "#FF8A1F"].map(c => new THREE.Color(c)); for (let i = 0; i < NP1; i++) pig1.setColorAt(i, pigCols[i % 4]);
const blobs1 = blobs(gM1, 16, "#FFB259", 11, [10, 16], .22, MY.m1);
const tileA = K.makeTile("A", C.butter, C.cast, 1.7); tileA.rotation.x = PI / 2; gM1.add(tileA); tileA.visible = false;
// ---- M2: oil droplets carrying pigments along a cell wall (top: no fat, bottom: with fat) ----
bgPlane(gM2, cellsTex("#5A2412", "#B8582A", "#F0A06A", 8), 70, 50, -14);
const wallMat = new THREE.MeshStandardMaterial({ color: "#EDB49A", roughness: .5, metalness: 0 });
function makeWall(par, y) { const NC = 28, g = new THREE.SphereGeometry(.52, 26, 18), im = new THREE.InstancedMesh(g, wallMat, NC * 3), m = new THREE.Matrix4(), cl = new THREE.Color(); let k = 0;
  for (let r = 0; r < 3; r++) for (let i = 0; i < NC; i++) { const x = (i - NC / 2) * .86 + (r % 2) * .43, z = -r * .6, sy = .72 + .14 * hash(i + r * 40); m.compose(V(x, y - r * .05 - 0.12 * (r > 0 ? 1 : 0), z), new THREE.Quaternion(), V(1 + .06 * hash(i * 3 + r), sy, 1)); im.setMatrixAt(k, m); cl.set("#EDB49A").lerp(new THREE.Color("#D98E78"), hash(i * 5 + r * 9) * .6).multiplyScalar(1 - r * .12); im.setColorAt(k, cl); k++; }
  im.castShadow = false; im.frustumCulled = false; par.add(im); return im; }
const dropMat = new THREE.MeshPhysicalMaterial({ color: "#F3C54B", roughness: .04, metalness: 0, transparent: true, opacity: .5, clearcoat: 1, envMapIntensity: 3, ior: 1.46 });
const pigMat2 = new THREE.MeshStandardMaterial({ color: "#ffffff", emissive: "#D2540A", emissiveIntensity: 1.0, roughness: .35 });
function makePanel(par, y, withOil, n) { const o = { y, withOil, pig: [], drops: [], wall: makeWall(par, y) };
  const NP = withOil ? n * 3 : 12; for (let i = 0; i < NP; i++) { const m = new THREE.Mesh(capGeo, pigMat2.clone()); m.material.color.copy(pigCols[i % 4]); par.add(m); o.pig.push(m); }
  if (withOil) for (let j = 0; j < n; j++) { const d = new THREE.Mesh(new THREE.SphereGeometry(.72, 36, 24), dropMat); par.add(d); o.drops.push(d); }
  o.glow = []; for (let j = 0; j < 5; j++) { const q = quad(softTex, "#FF8A1F", true, 0); q.scale.set(1.6, 1.0, 1); Gm.add(q); o.glow.push(q); }
  return o; }
const panTop = makePanel(gM2, 3.3, false, 0), panBot = makePanel(gM2, -1.6, true, 5), panFol = makePanel(gM2, -7.5, true, 6);
// ---- M3: vitamin C in watery pepper cells ----
const bgM3 = bgPlane(gM3, cellsTex("#5C1409", "#C23A24", "#FF9A7A", 21), 60, 60, -16, MY.m3);
const NC3 = 96, c3 = new THREE.InstancedMesh(new THREE.SphereGeometry(.15, 18, 14), new THREE.MeshStandardMaterial({ color: "#ffffff", emissive: "#3E8F36", emissiveIntensity: .9, roughness: .3 }), NC3); c3.frustumCulled = false; gM3.add(c3);
for (let i = 0; i < NC3; i++) c3.setColorAt(i, new THREE.Color(["#6FBF5A", "#8FD36B", "#4FA24A"][i % 3]));
const bubbles = []; for (let i = 0; i < 26; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(.25 + hash(i) * .5, 24, 16), new THREE.MeshPhysicalMaterial({ color: "#F7F1E6", roughness: .05, transparent: true, opacity: .16, clearcoat: 1, envMapIntensity: 2.2 })); m.userData = { p: V((hash(i * 3) - .5) * 8, (hash(i * 5) - .5) * 14, -3 + hash(i * 7) * 7), s: hash(i * 11) }; gM3.add(m); bubbles.push(m); }
const blobs3 = blobs(gM3, 14, "#FF7A55", 31, [10, 16], .18, MY.m3);
const tileC3 = K.makeTile("C", C.herb, C.countertop, 1.5); tileC3.rotation.x = PI / 2; gM3.add(tileC3);
const mshim = []; for (let i = 0; i < 8; i++) { const q = quad(puffTex, "#FF5A2A", true, 0); q.scale.set(4, 6, 1); Gm.add(q); mshim.push(q); }

// ============================================================ CAMERA / ZONES ============================================================
const FOV = f => 2 * Math.atan(18 / f) * 180 / PI;
function setCam(p, l, f, fp, ap, up) { camera.up.set(...(up || [0, 1, 0])); camera.position.set(p[0], p[1], p[2]); camera.lookAt(l[0], l[1], l[2]); camera.fov = FOV(f); camera.updateProjectionMatrix(); camera.updateMatrixWorld(true);
  bokeh.uniforms.focus.value = camera.position.distanceTo(V(...fp)); bokeh.uniforms.aperture.value = ap; bokeh.uniforms.maxblur.value = .014; }
// overhead camera keys: [t, x, z0 (look z), h]; height interpolated in log space, eased
const HERO = [-.42, -.15];
const camKeys = [
  [0, 0, .16, 11.5], [S("b02") - .05, 0, .16, 11.5], [E("b02") - .3, 0, .55, 8.6],
  [T.diveFrom, 0, .55, 8.6], [T.dive1, HERO[0], HERO[1], .8],
  [S("b06"), HERO[0], HERO[1], .8], [S("b06") + 1.6, 0, .55, 8.6], [S("b07") - .9, 0, .55, 8.6], [S("b07") + .5, 0, 1.19, 9.8], [E("b07") - .5, 0, 1.19, 9.8],
  [S("b08") + .15, 0, .5, 8.6], [S("b08") + 1.45, X_BOARD, .5, 8.6], [T.diveFrom2 = S("b09") - 1.7, X_BOARD, .5, 8.6], [T.dive2, X_BOARD - .8, -.6, .8],
  [S("b10"), X_TRIO, .9, 15], [S("b11"), X_CMP, .5, 11], [S("b12"), X_BAL, 1.15, 12.5], [E("b12"), X_BAL, 1.0, 10.2],
  [S("b13"), 0, .55, 8.6], [DUR, 0, .55, 8.2]];
function camAt(t) { let i = 0; for (let k = 0; k < camKeys.length; k++) if (camKeys[k][0] <= t) i = k; const a = camKeys[i], b = camKeys[Math.min(i + 1, camKeys.length - 1)];
  const cutNext = [S("b10"), S("b11"), S("b12"), S("b13")].includes(b[0]); const u = cutNext || b === a ? 0 : eio((t - a[0]) / (b[0] - a[0])); // cuts hold the old key until the cut
  return [lerp(a[1], b[1], u), lerp(a[2], b[2], u), Math.exp(lerp(Math.log(a[3]), Math.log(b[3]), u))]; }
// veils (fade-through colour at molecule transitions / quick flash at cuts)
const VEIL = [[T.dive1, .55, .45, C.carrot], [S("b04"), .25, .3, "#E39A4A"], [S("b06"), .5, .5, C.carrot], [T.dive2, .5, .45, "#B53A25"], [S("b10"), .25, .25, C.countertop], [S("b11"), .2, .2, C.countertop], [S("b12"), .2, .2, C.countertop], [S("b13"), .2, .2, C.countertop]];
function veilAt(t) { let a = 0, col = C.countertop; for (const [c, pre, post, color] of VEIL) { const u = t < c ? (t - (c - pre)) / pre : 1 - (t - c) / post; const v = clamp(u * 1.0) ; const pl = clamp(v * 1.5); if (pl > a) { a = pl; col = color; } } return { a, col }; }
function zoneAt(t) { if (t < T.dive1) return "K"; if (t < S("b04")) return "M1"; if (t < S("b05")) return "M2a"; if (t < S("b06")) return "M2b"; if (t < T.dive2) return "K"; if (t < S("b10")) return "M3"; return "K"; }

// ---------- per-frame animation of kitchen content ----------
const cookU = t => clamp((t - T.tOil - 1.5) / 36); // browning amount: grows through the film
function animKitchen(t, A) {
  const oilU = eo3(clamp((t - T.tOil) / 1.6)), rib = clamp((t - T.tOil) / 1.1);
  // ribbon slides in then thins out
  ribbon.visible = t >= T.tOil - .02 && t < T.tOil + 2.2; ribbon.geometry.setDrawRange(Math.floor(clamp((rib - .3 * smooth(clamp((t - T.tOil - .9) / .9))) , 0, 1) * 0 + ribbonCount * clamp(smooth(rib) * 1.0) * 0 + ribbonCount * Math.max(0, smooth(clamp((t - T.tOil + .02) / .9)) ) * 0), 0);
  const head = smooth(clamp((t - T.tOil + .02) / 1.0)), tail = smooth(clamp((t - T.tOil - .9) / 1.0));
  const iStart = Math.floor(tail * .96 * (ribbonCount / 6)) * 6, iEnd = Math.floor(head * (ribbonCount / 6)) * 6; ribbon.geometry.setDrawRange(iStart, Math.max(0, iEnd - iStart));
  const rr = 1.28 * oilU; oil.visible = oilU > .001; oil.scale.set(rr, 1, rr * .98);
  // cooking: browning tint, oil sheen on coins
  const cu = cookU(t), sheen = smooth(clamp((t - T.tOil - 1.2) / 2.5));
  coinMat.color.setRGB(lerp(1, .78, cu), lerp(1, .6, cu), lerp(1, .42, cu)); coinMat.roughness = lerp(.78, .42, sheen); coinMat.clearcoat = .45 * sheen;
  stripMat.color.setRGB(lerp(1, .74, cu), lerp(1, .62, cu), lerp(1, .6, cu)); stripMat.clearcoat = .4 * sheen;
  // spinach / broccoli drop in
  for (const o of dropIns) { const u = (t - o.userData.t0) / .5; o.visible = u >= 0 && t < T.dive1 + 1e6 && (zoneAt(t) === "K"); if (u < 0) continue; const e = eo3(clamp(u)), bounce = u > 1 ? Math.exp(-(u - 1) * 5) * Math.sin((u - 1) * 14) * .06 : 0;
    o.position.set(o.userData.rest.x, o.userData.rest.y + 4.5 * (1 - e) + Math.abs(bounce), o.userData.rest.z); o.rotation.y = o.userData.ry + (1 - e) * 2.4; o.rotation.x = (1 - e) * .8 + (o.userData.rest.y > FL + .05 && o.geometry.attributes.color && o.material === florMat ? .15 : 0); }
  // tiles A D E K land beside the pan
  ["A", "D", "E", "K"].forEach((l, i) => { const g = tiles["v" + l], t0 = T.tVit + .2 + i * .24, u = (t - t0) / .5; g.visible = t >= t0 && t < S("b08") + 1.2; const e = u < 0 ? 0 : eob(clamp(u)); g.position.y = .15 + 3.4 * (1 - e) + (u > 1 ? 0 : 0); g.rotation.y = (1 - e) * 1.3; g.userData.glow(.38 * smooth(clamp((t - t0 - .45) / .4)) * (.75 + .25 * Math.sin(t * 5 + i))); });
  // C tile pops above the board
  { const t0 = T.tVC - .05, u = (t - t0) / .55; tileC.visible = t >= t0 && t < T.diveFrom2 + 1.2; const e = u < 0 ? 0 : eob(clamp(u)); tileC.scale.setScalar(1.25 * Math.max(.001, e)); tileC.position.set(X_BOARD + .15, .95 + .25 * Math.sin(t * 2.2) * smooth(u) + .6 * e, -.2); tileC.rotation.y = .3 * Math.sin(t * 1.5); tileC.rotation.x = -.2 * (1 - e); }
  // steam
  const sk = clamp((t - T.tOil - 1.6) / 2.5) * (t > S("b13") - .1 ? 1.35 : 1) * (.7 + .3 * smooth(cu * 3));
  steam.forEach((q, i) => { const per = 3.8 + hash(i) * 2, ph = (t / per + hash(i * 3)) % 1, bx = (hash(i * 5) - .5) * 2.3, bz = (hash(i * 7) - .5) * 2.0;
    const h = .35 + ph * 3.6; q.position.set(bx + Math.sin(t * .6 + i) * .3 * ph + ph * .4, h, bz - ph * .35 + Math.cos(t * .5 + i * 2) * .25 * ph); const s = .7 + ph * 1.9 * (.7 + hash(i * 9)); q.scale.set(s, s, 1); q.rotation.z = i + t * .1 * (i % 2 ? 1 : -1);
    q.material.opacity = .06 * sk * Math.sin(PI * ph) ** 1.2 * (.6 + .4 * hash(i * 13)); q.visible = q.material.opacity > .004; });
  gleams.forEach((q, i) => { q.material.opacity = .55 * oilU * (.8 + .2 * Math.sin(t * 1.3 + i * 2)); q.visible = oilU > .02 && pan.visible; });
  // heat shimmer on the right half (b02)
  const hk = smooth(clamp((t - T.tHeat + .3) / .8)) * (1 - smooth(clamp((t - E("b02") - .4) / .8))), hk2 = hk;
  glowRight.material.opacity = .34 * hk2 * (.85 + .15 * Math.sin(t * 6)); glowRight.visible = hk2 > .01;
  heatQ.forEach((q, i) => { const ph = (t * .5 + hash(i * 3)) % 1; q.position.set(.35 + hash(i) * 1.1, .6 + ph * 2.4, (hash(i * 5) - .5) * 1.8); const s = 1 + ph * 1.2; q.scale.set(s * .8, s * 1.4, 1); q.material.opacity = .22 * hk2 * Math.sin(PI * ph); q.visible = hk2 > .01; });
}
function animBalance(t) { const pans = bal.userData.pans, settle = Math.exp(-(t - S("b12")) * 1.6) * Math.sin((t - S("b12")) * 5) * .035; beam.rotation.z = settle; pans[0].position.y = .45 - settle * 1.8 * 0 + Math.sin(beam.rotation.z) * 1.8; pans[1].position.y = .45 - Math.sin(beam.rotation.z) * 1.8;
  const hk = smooth(clamp((t - S("b12") - .2) / .6)); bal.userData.hg.material.opacity = .32 * hk * (.85 + .15 * Math.sin(t * 5)); bal.userData.ember.material.emissiveIntensity = (1.0 + .5 * Math.sin(t * 7)) * hk + .3;
  bal.userData.shim.forEach((q, i) => { const ph = (t * .55 + hash(i * 3)) % 1; q.position.set(X_BAL + 1.8 + (hash(i) - .5) * 1.1, .8 + ph * 2.2, (hash(i * 5) - .5) * 1.2); const s = .9 + ph; q.scale.set(s * .7, s * 1.3, 1); q.material.opacity = .2 * hk * Math.sin(PI * ph); }); }

// ---------- molecule worlds ----------
const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), Eu = new THREE.Euler();
function animM1(t, A) {
  const lt = t - T.dive1, u = smooth(lt / (S("b04") - T.dive1)); const cz = lerp(13, 9.5, u);
  setCam([Math.sin(lt * .25) * .4, MY.m1 + Math.cos(lt * .2) * .3, cz], [0, MY.m1 - .2, 0], 35, [0, MY.m1, 0], .0042);
  mLight.position.set(2, MY.m1 + 3, cz - 2); mLight.intensity = 60; mLight.color.set(0xffb06a);
  const tp = V(0, MY.m1 + .45, 4.2), arrive = T.tBody + .55; // the A tile
  for (let i = 0; i < NP1; i++) { const bx = (hash(i * 3) - .5) * 9, by = (hash(i * 5) - .5) * 17, bz = -7 + hash(i * 7) * 13, ph = hash(i * 11) * 6.28, sp = .25 + .4 * hash(i * 13);
    let x = bx + Math.sin(t * sp + ph) * .6, y = MY.m1 + by + Math.cos(t * sp * .8 + ph) * .7 + Math.sin(t * .3 + i) * .2, z = bz + Math.sin(t * sp * .6 + ph * 2) * .5, s = (.7 + .7 * hash(i * 17)) * smooth(clamp((lt - .05 - hash(i) * .5) / .5));
    if (i % 5 === 0 && t > arrive) { const k = eio(clamp((t - arrive - hash(i * 19) * 1.0) / 1.4)); x = lerp(x, tp.x + (hash(i) - .5) * .4, k); y = lerp(y, tp.y, k); z = lerp(z, tp.z, k); s *= 1 - smooth(clamp((k - .8) / .2)); }
    Eu.set(ph + t * .3 * sp, t * .4 * sp + i, ph * 2); Q.setFromEuler(Eu); M.compose(V(x, y, z), Q, V(s, s, s)); pig1.setMatrixAt(i, M); }
  pig1.instanceMatrix.needsUpdate = true;
  const ta = smooth(clamp((t - T.tBody - .1) / .5)); tileA.visible = ta > .001; tileA.scale.setScalar(.85 * Math.max(.001, eob(clamp((t - T.tBody - .05) / .55)))); tileA.position.set(0, MY.m1 + .45, 4.2 + .1 * Math.sin(t * 2)); tileA.userData.glow(.4 + .25 * Math.sin(t * 4));
  blobs1.forEach((q, i) => { q.position.x = q.userData.b.x + Math.sin(t * .2 + i) * .6; q.position.y = q.userData.b.y + Math.cos(t * .15 + i) * .5; q.visible = true; });
  A.proj = projector(); A.tileA = A.proj(0, MY.m1 - 1.2, 4.2);
}
function animPanel(o, t, speedScale, camx, mode) { // drives one wall panel
  const y = o.y, top = y + .45, P = 4.6;
  if (!o.withOil) { o.pig.forEach((m, i) => { const per = 5.6 + hash(i) * 1.6, u = ((t + hash(i * 3) * per) / per) % 1, x = -5.4 + 10.8 * u, wob = Math.abs(Math.sin(u * 9 + i)), yy = top + .32 + 1.7 * (1 - Math.min(1, u * 1.4)) * (.5 + hash(i * 5)) * (1 - .0) ; const nearWall = u > .35 && u < .75 ? .1 + .5 * wob : yy - top;
      m.position.set(x, top + .28 + Math.max(.0, u < .35 ? (yy - top - .28) * (1 - u / .35) : nearWall - .28) + .12 * Math.sin(t * 2 + i), -.2 + hash(i * 7) * 1.2); m.rotation.set(t * .6 + i, t * .4, i + u * 5); m.scale.setScalar(1.5 + .5 * hash(i * 9)); m.visible = true; }); return; }
  o.drops.forEach((d, j) => { const u = ((t + j * (P / o.drops.length) + .7 * hash(j)) / P) % 1, xd = [-2.9, -1.2, .4, 2.0, 3.5, 4.6][j % 6]; let x, yy, sc = 1, sink = 0;
    if (mode === "follow") { x = -3 + (j * 2.7) + t * 1.5; x = ((x + 14) % 28) - 14; yy = top + .95 + .25 * Math.sin(t * 1.6 + j * 2); } else {
      if (u < .55) { const k = eio(u / .55); x = lerp(-5.2, xd, k); yy = top + 1.0 + .25 * Math.sin(u * 8 + j) + (1 - k) * .3; sc = smooth(u / .08); } else if (u < .75) { const k = smooth((u - .55) / .2); x = xd; yy = lerp(top + 1.2, top + .6, k); sc = 1 + .06 * Math.sin(k * 3); } else if (u < .93) { const k = smooth((u - .75) / .18); x = xd; yy = top + .6 - k * .4; sc = 1 - k; sink = k; } else { x = xd; yy = top; sc = 0; sink = 1; } }
    d.position.set(x, yy, 0); const sq = u > .6 && u < .75 && mode !== "follow" ? 1 - .22 * Math.sin(smooth((u - .6) / .15) * PI) : 1; d.scale.set(sc * (2 - sq) * 1.0, sc * sq, sc); d.visible = sc > .01;
    for (let k = 0; k < 3; k++) { const m = o.pig[j * 3 + k], a = k / 3 * 6.283 + t * 1.2 + j; const pr = .26, px = x + Math.cos(a) * pr, py = yy + Math.sin(a * 1.3) * pr * .8 - sink * .55, ps = (1 - .9 * sink) * Math.max(.01, sc) * 1.25; m.position.set(px, py, Math.sin(a) * pr * .6); m.rotation.set(a, t, k); m.scale.setScalar(ps); m.visible = ps > .02; }
    if (mode !== "follow") { const g = o.glow[j % 5], gk = u > .72 && u < .95 ? Math.sin(((u - .72) / .23) * PI) : 0; g.position.set(x, top + .15, .6); g.material.opacity = .55 * gk; g.visible = gk > .01; } else o.glow.forEach(g => (g.visible = false)); });
}
function animM2(t, A, follow) {
  const lt = t - S("b04");
  mLight.position.set(-3, MY.m2 + 3, 12); mLight.intensity = 90; mLight.color.set(0xffc58a);
  panTop.glow.forEach(g => (g.visible = false));
  if (!follow) { setCam([0, MY.m2 + .5, 22], [0, MY.m2 + .5, 0], 50, [0, MY.m2, 0], .0035);
    gM2.position.y = MY.m2; panTop.wall.parent.visible = true; panBot.wall.visible = true; panFol.wall.visible = false; panFol.pig.forEach(m => (m.visible = false)); panFol.drops.forEach(m => (m.visible = false));
    animPanel(panTop, t, 1, 0, "plain"); animPanel(panBot, t, 1, 0, "oil"); panTop.wall.visible = true; }
  else { const cx = 1.5 + t * 1.5 - S("b05") * 1.5 * 0; const x0 = -1.2 + (t - S("b05")) * 1.5; setCam([x0, MY.m2 + panFol.y + 1.9, 13], [x0 + .6, MY.m2 + panFol.y + 1.2, 0], 50, [x0, MY.m2 + panFol.y + 1.1, 0], .004);
    panTop.wall.visible = false; panBot.wall.visible = false; panTop.pig.forEach(m => (m.visible = false)); panBot.pig.forEach(m => (m.visible = false)); panBot.drops.forEach(m => (m.visible = false)); panFol.wall.visible = true;
    animPanel(panFol, t, 1, x0, "follow"); }
  A.proj = projector();
}
function animM3(t, A) {
  const lt = t - T.dive2, heat = smooth(clamp((t - T.tLower) / 1.4)), cz = lerp(12.5, 9.8, smooth(lt / (S("b10") - T.dive2)));
  setCam([Math.sin(lt * .22) * .3, MY.m3 + Math.cos(lt * .17) * .3, cz], [0, MY.m3, 0], 35, [0, MY.m3, 0], .004);
  mLight.position.set(1, MY.m3 + 3, cz - 2); mLight.intensity = lerp(50, 80, heat); mLight.color.set(heat > .5 ? 0xff9a60 : 0xffc9a0);
  heatLight.position.set(5, MY.m3 - 4, 3); heatLight.intensity = 140 * heat;
  const fadeStart = T.tLower + .2;
  for (let i = 0; i < NC3; i++) { const bx = (hash(i * 3) - .5) * 8, by = (hash(i * 5) - .5) * 15, bz = -5 + hash(i * 7) * 11, ph = hash(i * 11) * 6.28, sp = .3 + .4 * hash(i * 13);
    let x = bx + Math.sin(t * sp + ph) * .8, y = MY.m3 + by + Math.cos(t * sp * .8 + ph) * .8, z = bz + Math.sin(t * sp * .6 + ph * 2) * .6, s = (.8 + .8 * hash(i * 17)) * smooth(clamp((lt - .05 - hash(i) * .5) / .5));
    if (i % 3 === 0 && t > fadeStart) { const k = clamp((t - fadeStart - hash(i * 19) * 1.6) / 1.6); y += k * k * 5; x += k * 1.2; s *= 1 - smooth(k); }
    Eu.set(ph, t * .3, 0); Q.setFromEuler(Eu); M.compose(V(x, y, z), Q, V(s, s, s)); c3.setMatrixAt(i, M); }
  c3.instanceMatrix.needsUpdate = true;
  bubbles.forEach((b, i) => { const p = b.userData.p; b.position.set(p.x + Math.sin(t * .3 + i) * .5, MY.m3 + p.y + Math.cos(t * .25 + i * 2) * .6 + heat * 1.5 * b.userData.s, p.z); });
  const hs = tileC3.userData; tileC3.position.set(-.1 + Math.sin(t * .5) * .2, MY.m3 + .8 + Math.cos(t * .6) * .15, 5.2); tileC3.scale.setScalar(1.5 * Math.max(.001, eob(clamp((lt - .3) / .6)))); hs.dimTo(.55 * heat); hs.glow(.25 * (1 - heat));
  blobs3.forEach((q, i) => { q.position.x = q.userData.b.x + Math.sin(t * .2 + i) * .6; q.position.y = q.userData.b.y + Math.cos(t * .15 + i) * .5; q.material.color.set(heat > .3 ? "#FF6A3A" : "#FF8A6A"); });
  mshim.forEach((q, i) => { const ph = (t * .35 + hash(i * 3)) % 1; q.position.set(-4 + hash(i) * 8, MY.m3 - 6 + ph * 12, 1 + hash(i * 5) * 3); q.material.opacity = .22 * heat * Math.sin(PI * ph); });
  A.proj = projector(); A.heat = heat; A.tileC = A.proj(tileC3.position.x, tileC3.position.y, 5.2);
}
function projector() { const v = new THREE.Vector3(); return (x, y, z) => { v.set(x, y, z).project(camera); return { x: (v.x * .5 + .5) * 1080, y: (-v.y * .5 + .5) * 1920 }; }; }

// ============================================================ STAGE ============================================================
function show(zone) { // visibility per zone (keeps render + depth passes cheap)
  const k = zone === "K"; GK.visible = k; Gfx.visible = k; gM1.visible = zone === "M1"; gM2.visible = zone === "M2a" || zone === "M2b"; gM3.visible = zone === "M3"; Gm.visible = !k;
  blobs1.forEach(q => (q.visible = zone === "M1")); blobs3.forEach(q => (q.visible = zone === "M3")); mshim.forEach(q => (q.visible = zone === "M3")); panTop.glow.concat(panBot.glow, panFol.glow).forEach(q => { if (zone[0] !== "M" || zone === "M1" || zone === "M3") q.visible = false; });
  if (!k) { key.visible = false; } else key.visible = true;
  trio.visible = bal.visible = cmp.visible = board.visible = true;
  tileA.visible = zone === "M1" && tileA.visible;
}
function stage(t, A) {
  const z = zoneAt(t); show(z); A.zone = z; mLight.intensity = 0; heatLight.intensity = 0;
  if (z === "K") {
    camera.up.set(0, 0, -1); const [cx, cz, h] = camAt(t);
    // which world part is in view decides lights + visibility of heavy groups
    const inTrio = t >= S("b10") && t < S("b11"), inCmp = t >= S("b11") && t < S("b12"), inBal = t >= S("b12") && t < S("b13");
    const px = inTrio ? X_TRIO : inCmp ? X_CMP : inBal ? X_BAL : cx;
    pan.visible = !(inTrio || inCmp || inBal) || false; pileC.visible = pileP.visible = t < S("b04") + 1; panCoins.forEach(o => (o.visible = pan.visible)); panStrips.forEach(o => (o.visible = pan.visible)); oil.visible = pan.visible && oil.visible; ribbon.visible = ribbon.visible && pan.visible;
    steam.forEach(q => (q.visible = pan.visible && q.visible)); heatQ.forEach(q => (q.visible = pan.visible && q.visible)); glowRight.visible = glowRight.visible && pan.visible;
    animKitchen(t, A); animBalance(t);
    pan.visible = !(inTrio || inCmp || inBal); panCoins.forEach(o => (o.visible = pan.visible)); panStrips.forEach(o => (o.visible = pan.visible));
    dropIns.forEach(o => { if (!pan.visible) o.visible = false; });
    pan.userData; const G = (g, v) => (g.visible = v); G(trio, inTrio); G(cmp, inCmp); G(bal, inBal); G(board, t >= S("b08") - .5 && t < S("b10")); tileC.visible = tileC.visible && (t >= S("b08") - .5 && t < S("b10"));
    ["vA", "vD", "vE", "vK"].forEach(k => (tiles[k].visible = tiles[k].visible && !(inTrio || inCmp || inBal) && t < S("b08") + 1.2));
    // tile states
    trioTiles.mic.forEach((tt, i) => tt.userData.dimTo(smooth(clamp((t - T.tMicro - i * .18) / .5)))); trioTiles.ste.forEach((tt, i) => tt.userData.dimTo(smooth(clamp((t - T.tSteam - i * .18) / .5)))); trioTiles.pan.forEach((tt, i) => tt.userData.dimTo(smooth(clamp((t - T.tPan - i * .15) / .5)) * .75));
    cmpTiles.raw.forEach((tt, i) => { const u = eob(clamp((t - S("b11") - .2 - i * .08) / .4)); tt.scale.setScalar(.66 * Math.max(.001, u)); }); cmpTiles.cooked.forEach((tt, i) => { const u = eob(clamp((t - S("b11") - .5 - i * .08) / .4)); tt.scale.setScalar(.66 * Math.max(.001, u)); if (tt.userData.ghost) { tt.userData.body.material.opacity = lerp(1, .13, smooth(clamp((t - T.tTop) / .6))); tt.userData.lt.material.opacity = lerp(1, .0, smooth(clamp((t - T.tTop) / .6))); } });
    const f = 40, fa = inBal ? .0 : 0;
    // light follows the camera
    key.position.set(px - 5.5, 10.5, (cz || 0) + 3.5); key.target.position.set(px, 0, cz); key.target.updateMatrixWorld();
    setCam([cx + Math.sin(t * .3) * .02, h, cz + Math.cos(t * .27) * .015], [cx, 0, cz], h < 2 ? 50 : f, [cx, h < 2 ? .15 : .12, cz], h < 2 ? .012 : .0085, [0, 0, -1]);
    bloom.strength = .2; bloom.radius = .5; bloom.threshold = 1.1; A.proj = projector(); A.cam = { cx, cz, h };
  } else {
    bloom.strength = .6; bloom.radius = .7; bloom.threshold = .8;
    if (z === "M1") animM1(t, A); else if (z === "M2a") animM2(t, A, false); else if (z === "M2b") animM2(t, A, true); else animM3(t, A);
    key.visible = false;
  }
}

window.__seek = function (t) {
  const A = { t };
  if (COVER) { // cover: overhead pan with carrots + oil gleam
    const tt = T.tOil + 6; show("K"); trio.visible = bal.visible = cmp.visible = false; board.visible = false; tileC.visible = false; pileC.visible = pileP.visible = false;
    animKitchen(tt, A); Object.values(tiles).forEach(g => (g.visible = false));
    key.position.set(-4.5, 10.5, 4); key.target.position.set(0, 0, -.75); key.target.updateMatrixWorld();
    setCam([0, 9.4, -.75], [0, 0, -.75], 40, [0, .12, -.75], .0085, [0, 0, -1]); bloom.strength = .25; filmPass.uniforms.time.value = .5; composer.render(); ov.drawCover(); return;
  }
  stage(t, A);
  filmPass.uniforms.time.value = (t * 30 | 0) * .017;
  composer.render();
  A.veil = veilAt(t); ov.draw(t, A); ov.captions(t);
};
window.__cues = T.cues; window.__duration = DUR;
window.__seek(0); window.__ready = true;
