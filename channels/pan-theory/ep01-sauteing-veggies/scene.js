// Pan Theory ep01: what sautéing does to your veggies. three.js 0.169 (vendored). Pure function of t: window.__seek(t) renders the frame.
// Round 2: filmed-looking matte food (cut-face carrots, cupped pepper strips, seasoned cast iron, oak counter), window light, lens DOF;
// molecule worlds are plant cells with carotenoid crystals, a gut lining of soft villi, and water-filled pepper cells with vitamin C.
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
scene.environment = K.makeEnv(renderer); scene.environmentIntensity = .34;
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const PI = Math.PI;
const LVL = .65; // the ONE partial dim level used by every vitamin C graphic (illustration, not an amount)
// transparent glow/steam objects must not enter the DOF depth pass
const noDepth = []; { const br = bokeh.render.bind(bokeh); bokeh.render = function (...a) { const v = noDepth.map(o => o.visible); noDepth.forEach(o => (o.visible = false)); br(...a); noDepth.forEach((o, i) => (o.visible = v[i])); }; }

// ---------- lights: one low window key from camera-left, soft sky fill ----------
const key = new THREE.DirectionalLight(0xffdfb0, 1.55); key.castShadow = true; key.shadow.mapSize.set(1536, 1536);
Object.assign(key.shadow.camera, { left: -7.5, right: 7.5, top: 7.5, bottom: -7.5, near: .5, far: 40 }); key.shadow.bias = -.0005; key.shadow.normalBias = .025; key.shadow.radius = 6;
scene.add(key, key.target, new THREE.HemisphereLight(0xfff3e2, 0xe6d3b4, .2));
const mLight = new THREE.PointLight(0xffc27a, 0, 0, 2); scene.add(mLight); // molecule-world key
const heatLight = new THREE.PointLight(0xff5a2a, 0, 0, 2); scene.add(heatLight);

// ---------- soft sprite textures (as meshes: sprites would break the DOF depth pass) ----------
const softTex = (() => { const c = document.createElement("canvas"); c.width = c.height = 128; const x = c.getContext("2d"); const g = x.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, "rgba(255,255,255,1)"); g.addColorStop(.35, "rgba(255,255,255,.5)"); g.addColorStop(1, "rgba(255,255,255,0)"); x.fillStyle = g; x.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c); })();
const puffTex = (() => { const c = document.createElement("canvas"); c.width = c.height = 128; const x = c.getContext("2d"); for (let i = 0; i < 9; i++) { const px = 64 + (hash(i) - .5) * 44, py = 64 + (hash(i * 3) - .5) * 44, r = 20 + hash(i * 5) * 22, g = x.createRadialGradient(px, py, 0, px, py, r); g.addColorStop(0, "rgba(255,255,255,.55)"); g.addColorStop(1, "rgba(255,255,255,0)"); x.fillStyle = g; x.fillRect(0, 0, 128, 128); } return new THREE.CanvasTexture(c); })();
const quad = (tex, color, add, op = 1) => new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: tex, color, transparent: true, opacity: op, depthWrite: false, blending: add ? THREE.AdditiveBlending : THREE.NormalBlending, toneMapped: true }));

// ============================================================ KITCHEN ============================================================
const X_BOARD = 7, X_TRIO = 24, X_CMP = 40, X_BAL = 56;
const GK = new THREE.Group(); scene.add(GK);
const counter = K.makeCounterWood(260, 5); counter.position.set(30, 0, 0); GK.add(counter);
const PG = new THREE.Group(); GK.add(PG); // the pan world: pan, contents, oil, piles, steam
const pan = K.makePan2(); PG.add(pan); pan.userData.mat.envMapIntensity = 1.05; pan.rotation.y = .9;
const panSh = K.makeContactShadow(2.7, 2.7, .5); panSh.position.set(.45, .006, .3); PG.add(panSh);
const cast = o => { o.traverse(m => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } }); return o; };
// materials
const faceF = K.coinFaceTex("fresh"), faceS = K.coinFaceTex("sear"), faceB = K.coinFaceTex("bump");
const coinMat = K.makeCoinMaterial(faceF, faceS, faceB), coinMatRaw = K.makeCoinMaterial(faceF, faceS, faceB), coinMatPlate = K.makeCoinMaterial(faceF, faceS, faceB); coinMatPlate.userData.sear.value = .8;
const stripMat = new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: .42, metalness: 0, clearcoat: .22, clearcoatRoughness: .4 });
const stripMatRaw = new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: .4, metalness: 0, clearcoat: .25, clearcoatRoughness: .38 });
const leafMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .6, metalness: 0, side: THREE.DoubleSide });
const florMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .8, metalness: 0 });
const coinGeos = [0, 1, 2, 3].map(i => K.makeCoin2(i + 1)), stripGeos = [0, 1, 2, 3, 4, 5].map(i => K.makeStrip2(i + 3)), leafGeos = [0, 1, 2].map(i => K.makeLeaf(i + 1)), florGeos = [0, 1, 2].map(i => K.makeFloret(i + 1));
const mesh = (g, m, par, x, y, z, rx = 0, ry = 0, rz = 0, s = 1) => { const o = new THREE.Mesh(g, m); o.position.set(x, y, z); o.rotation.set(rx, ry, rz, "YXZ"); o.scale.setScalar(s); o.castShadow = o.receiveShadow = true; par.add(o); return o; };
// pan contents: carrots on the left half, peppers on the right (the hook story), some coins flipped to show the cut face that browns
const FL = .095, CT = .1;
const COINS = [[-.5, -.5, 0, 0], [-.98, -.05, 0, 1], [-.45, .45, 0, 0], [-.14, -.1, 0, 1], [-.78, -.74, 1, 0], [-.3, .82, 0, 1], [-.85, .55, 1, 1]];
const panCoins = COINS.map((p, i) => { const o = mesh(coinGeos[i % 4], coinMat, PG, p[0], FL + CT + .012 + p[2] * .2, p[1], (p[3] ? PI : 0) + (p[2] ? .14 : (hash(i) - .5) * .1), hash(i * 3) * 6.28, (hash(i * 5) - .5) * .1); o.userData.rest = o.position.clone(); return o; });
const STRIPS = [[.28, .08, .1, 1, 0], [.62, -.42, .9, 1, 0], [.62, .45, -.8, 0, 0], [.95, .05, .3, 1, 1], [.3, -.6, -.4, 1, 0]]; // x, z, yaw, skin-up, layer
const panStrips = STRIPS.map((p, i) => { const o = mesh(stripGeos[i], stripMat, PG, p[0], FL + (p[3] ? .17 : .07) + p[4] * .1, p[1], p[3] ? PI : 0, p[2], 0); o.userData.rest = o.position.clone(); return o; });
// blisters on the skin-up pepper strips: appear from ~1.7 s (hook) and keep developing
const blisters = []; { const bg = new THREE.SphereGeometry(1, 14, 10), bm = new THREE.MeshPhysicalMaterial({ color: "#9C3516", roughness: .34, clearcoat: .55, clearcoatRoughness: .3 });
  panStrips.forEach((s, i) => { if (!STRIPS[i][3]) return; const bend = .35 + .65 * hash(i + 3); for (let k = 0; k < 6; k++) { const b = new THREE.Mesh(bg, bm), zn = (hash(i * 9 + k) - .5) * 1.7; b.position.set((hash(i * 13 + k) - .5) * .13, -.05 - .15 * bend * zn * zn, zn * .575); b.userData = { s: .04 + .035 * hash(i * 5 + k), t0: T.tHeat1 + .25 + hash(i * 3 + k) * 1.6 }; b.scale.setScalar(.001); s.add(b); blisters.push(b); } }); }
const ringMat = new THREE.MeshPhysicalMaterial({ color: "#FFE3A0", roughness: .04, metalness: 0, transparent: true, opacity: 0, clearcoat: 1, envMapIntensity: 3 }), bubGeo = new THREE.SphereGeometry(.03, 12, 8), bubMat = new THREE.MeshPhysicalMaterial({ color: "#FFF3D0", roughness: .03, transparent: true, opacity: .0, clearcoat: 1, envMapIntensity: 3.5 });
const filmAll = [], bubs = [];
panCoins.forEach((c, i) => { const r = new THREE.Mesh(new THREE.TorusGeometry(.35, .01, 8, 44), ringMat); r.rotation.x = PI / 2; r.position.set(c.position.x, FL + .04, c.position.z); r.scale.set(1 + .06 * hash(i), 1 + .06 * hash(i * 3), 1); PG.add(r); filmAll.push(r);
  for (let k = 0; k < 5; k++) { const a = hash(i * 7 + k) * 6.28, rad = .38 + .12 * hash(i + k * 3), b = new THREE.Mesh(bubGeo, bubMat); b.position.set(c.position.x + Math.cos(a) * rad, FL + .03, c.position.z + Math.sin(a) * rad); b.userData.s = .5 + 1.1 * hash(i * 3 + k); b.scale.setScalar(b.userData.s); PG.add(b); filmAll.push(b); bubs.push(b); } });
// piles on the counter at the hook
const pileC = new THREE.Group(), pileP = new THREE.Group(); PG.add(pileC, pileP);
for (let i = 0; i < 22; i++) { const a = hash(i * 2.3) * 6.28, r = Math.sqrt(hash(i * 1.7)) * .62; mesh(coinGeos[i % 4], coinMatRaw, pileC, Math.cos(a) * r, .11 + .2 * (1 - r / .62) * hash(i * 9) + (i % 3) * .03, Math.sin(a) * r, (hash(i * 4) - .5) * .7, hash(i) * 6.28, (hash(i * 6) - .5) * .7); }
for (let i = 0; i < 9; i++) mesh(stripGeos[i % 6], stripMatRaw, pileP, (hash(i * 2) - .5) * .8, .13 + .085 * (i % 3), (hash(i * 3) - .5) * .8, i % 4 === 1 ? 0 : PI, hash(i * 5) * 6.28, 0);
pileC.position.set(-2.05, 0, .1); pileP.position.set(2.05, 0, .1);
[[-2.05, .1, .75], [2.05, .1, .75]].forEach(p => { const s = K.makeContactShadow(p[2], p[2], .4); s.position.set(p[0] + .12, .006, p[1] + .06); PG.add(s); });
// spinach + broccoli (drop into the pan during b07)
const dropIns = [];
[[-.55, -.35, .3], [.3, .15, 2.2], [-.1, .7, 4.0], [.55, -.6, 5.2], [-.8, .1, 1.0]].forEach((p, i) => { const o = mesh(leafGeos[i % 3], leafMat, PG, p[0], FL + .2 + i * .015, p[1], 0, p[2], 0); o.userData = { rest: o.position.clone(), t0: T.tSpin - .1 + i * .22, ry: p[2] }; o.visible = false; dropIns.push(o); });
[[.3, -.1, 0.5], [-.45, .72, 3.2], [.75, .55, 5.0]].forEach((p, i) => { const o = mesh(florGeos[i], florMat, PG, p[0], FL + .06, p[1], .15, p[2], .1, 1); o.userData = { rest: o.position.clone(), t0: T.tSpin + .3 + i * .28, ry: p[2] }; o.visible = false; dropIns.push(o); });
// oil: a quick pour from the upper left, then a thin amber film spreading over the pan floor
const oilMat = new THREE.MeshPhysicalMaterial({ color: "#EDBE50", roughness: .04, metalness: 0, transparent: true, opacity: .14, clearcoat: 1, clearcoatRoughness: .03, envMapIntensity: 1.5, ior: 1.47 });
const oilGeo = (() => { const g = new THREE.SphereGeometry(1, 56, 14, 0, PI * 2, 0, PI / 2); K.mapVerts(g, (x, y, z) => { const an = Math.atan2(z, x), w = 1 + .1 * K.vn(Math.cos(an) * 1.4, Math.sin(an) * 1.4, 4.1); return [x * w, y * .045 * (1 + .6 * K.vn(x * 2, 3.3, z * 2)), z * w]; }); g.computeVertexNormals(); return g; })();
const oil = new THREE.Mesh(oilGeo, oilMat); oil.position.set(-.05, FL + .004, .02); oil.receiveShadow = true; PG.add(oil);
const ribbonMat = new THREE.MeshPhysicalMaterial({ color: "#E9B23A", roughness: .05, transparent: true, opacity: .62, clearcoat: 1, envMapIntensity: 2 });
const ribbonCurve = new THREE.CatmullRomCurve3([V(-2.0, 3.1, -1.5), V(-1.55, 2.0, -1.0), V(-1.0, 1.0, -.55), V(-.55, .38, -.18), V(-.2, .13, .0)]);
const ribbon = new THREE.Mesh(new THREE.TubeGeometry(ribbonCurve, 48, .085, 10, false), ribbonMat); PG.add(ribbon);
const ribbonCount = ribbon.geometry.index.count;
// steam + heat (transparent, kept out of the depth pass)
const GfxPan = new THREE.Group(); PG.add(GfxPan); noDepth.push(GfxPan);
const steam = []; for (let i = 0; i < 34; i++) { const q = quad(puffTex, "#FFF8EC", false, 0); q.rotation.x = -PI / 2; GfxPan.add(q); steam.push(q); }
const wisps = []; for (let i = 0; i < 14; i++) { const q = quad(puffTex, "#FFE2B8", true, 0); q.rotation.x = -PI / 2; GfxPan.add(q); wisps.push(q); }
const heatQ = []; for (let i = 0; i < 7; i++) { const q = quad(softTex, "#C4381E", true, 0); q.rotation.x = -PI / 2; GfxPan.add(q); heatQ.push(q); }
const gleams = [[-.62, -.5, .9, .22, .6], [-.9, .05, .5, .14, 1.2], [.7, .62, .45, .12, -.5], [-.3, -.95, .8, .05, .15], [.2, -1.0, .6, .04, .3], [-1.0, .5, .7, .05, 1.3], [.95, -.3, .5, .05, -.9]].map(g => { const q = quad(softTex, "#FFF1CC", true, 0); q.rotation.x = -PI / 2; q.rotation.z = g[4]; q.scale.set(g[2], g[3], 1); q.position.set(g[0], .26, g[1]); GfxPan.add(q); return q; });
const glowRight = quad(softTex, "#E0451F", true, 0); glowRight.rotation.x = -PI / 2; glowRight.scale.set(3.2, 3.2, 1); glowRight.position.set(.9, .5, 0); GfxPan.add(glowRight);
// board with raw peppers, broccoli, tomato halves
const board = new THREE.Group(); board.position.set(X_BOARD, 0, 0); GK.add(board);
{ const bt = K.woodTex(); bt.repeat.set(2, 1); const bm = new THREE.Mesh(K.roundBox(3.8, .22, 2.6, .07), new THREE.MeshStandardMaterial({ map: bt, roughness: .62, color: "#EBDCC0" })); bm.position.y = .11; bm.castShadow = bm.receiveShadow = true; board.add(bm);
  const sh = K.makeContactShadow(2.4, 1.8, .4); sh.position.set(.25, .006, .15); board.add(sh); }
[[-1.0, -.55, .15, 0], [-.6, -.62, .05, 1], [-.2, -.55, -.1, 1], [-.8, .75, 1.4, 0]].forEach((p, i) => mesh(stripGeos[i], stripMatRaw, board, p[0], .22 + (p[3] ? .17 : .07), p[1], p[3] ? PI : 0, p[2], 0));
[[-.55, .15, 0], [.45, .75, .9]].forEach(p => { const h = K.makeHalfTomato(); h.position.set(p[0], .22, p[1]); h.rotation.y = p[2]; cast(h); board.add(h); });
[[1.0, -.45, 1.0], [1.35, .4, 2.6]].forEach((p, i) => mesh(florGeos[i], florMat, board, p[0], .22, p[1], .15, p[2], .1, 1.0));
// tiles (vitamins): only E and K land beside the spinach and broccoli (A stays with the carrots in the molecule world)
const tiles = {}; const mkT = (k, l, bg, fg, s, par, x, y, z) => { const g = K.makeTile(l, bg, fg, s); g.position.set(x, y, z); g.visible = false; (par || GK).add(g); tiles[k] = g; return g; };
["E", "K"].forEach((l, i) => mkT("v" + l, l, C.butter, C.cast, .74, PG, -.75 + i * 1.5, .15, 2.15));
const tileC = mkT("c", "C", C.herb, C.countertop, .95, GK, X_BOARD + .1, 1.5, -.1);
// ----- trio: microwave plate (turns), steamer basket, pan. Same C tiles on all three; they dim TOGETHER to the shared partial level -----
const trio = new THREE.Group(); trio.position.set(X_TRIO, 0, 0); GK.add(trio);
const GfxTrio = new THREE.Group(); trio.add(GfxTrio); noDepth.push(GfxTrio);
const mwTurn = new THREE.Group(); mwTurn.position.set(-1.75, 0, -2.6); trio.add(mwTurn);
{ const plate = new THREE.Mesh(new THREE.CylinderGeometry(1.55, 1.55, .08, 56), new THREE.MeshPhysicalMaterial({ color: "#E4ECEA", roughness: .12, metalness: 0, transparent: true, opacity: .78, clearcoat: 1, envMapIntensity: 1.6 })); plate.position.y = .06; plate.castShadow = plate.receiveShadow = true; mwTurn.add(plate);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(.75, .045, 10, 48), new THREE.MeshStandardMaterial({ color: "#2A2724", roughness: .5 })); ring.rotation.x = PI / 2; ring.position.y = .11; mwTurn.add(ring);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(1.55, .04, 8, 56), new THREE.MeshStandardMaterial({ color: "#F4F8F6", roughness: .2 })); rim.rotation.x = PI / 2; rim.position.y = .1; mwTurn.add(rim);
  [[-.5, -.35, 0.3], [.5, .45, 1.7], [.1, .75, 2.6]].forEach((p, i) => mesh(stripGeos[i], stripMatRaw, mwTurn, p[0], .13 + (i % 2 ? .17 : .07), p[1], i % 2 ? PI : 0, p[2], 0));
  const wt = K.woodTex(); wt.repeat.set(3, 1); const wm = new THREE.MeshStandardMaterial({ map: wt, roughness: .7, color: "#E7C58A" });
  const sb = new THREE.Mesh(new THREE.LatheGeometry([[1.5, 0], [1.62, .02], [1.62, .55], [1.5, .55], [1.5, .1], [0, .1]].map(a => new THREE.Vector2(a[0], a[1])), 56), wm); sb.position.set(1.75, 0, -2.6); sb.castShadow = sb.receiveShadow = true; trio.add(sb);
  for (let i = -4; i <= 4; i++) { const s = new THREE.Mesh(K.roundBox(.1, .08, 2.7 * Math.sqrt(1 - (i / 4.6) ** 2), .03), wm); s.position.set(1.75 + i * .33, .13, -2.6); s.castShadow = true; trio.add(s); }
  [[1.4, -2.3, 0.2], [2.1, -3.0, 1.1], [1.7, -2.0, 2.0]].forEach((p, i) => mesh(stripGeos[i + 2], stripMatRaw, trio, p[0], .2 + (i % 2 ? .17 : .07), p[1], i % 2 ? PI : 0, p[2], 0));
  const p2 = K.makePan2(); p2.position.set(0, 0, 1.6); p2.rotation.y = -.9; trio.add(p2);
  [[.3, 1.2, .4], [-.5, 1.8, 1.8], [-.2, 1.3, 2.6]].forEach((p, i) => mesh(stripGeos[i + 1], stripMat, trio, p[0], FL + (i % 2 ? .17 : .07), p[1], i % 2 ? PI : 0, p[2], 0));
  [[-1.75, -2.6, 1.85], [1.75, -2.6, 1.95], [0, 1.6, 2.7]].forEach(p => { const s = K.makeContactShadow(p[2], p[2], .45); s.position.set(p[0] + .25, .006, p[1] + .15); trio.add(s); }); }
const trioTiles = [];
{ const grid = [[-.42, -.34], [.42, -.34], [-.42, .34], [.42, .34]], place = (cx, cz, y) => grid.forEach((g, i) => { const t = K.makeTile("C", C.herb, C.countertop, .56); t.position.set(cx + g[0], y, cz + g[1]); t.rotation.y = (hash(cx + i) - .5) * .4; trio.add(t); cast(t); trioTiles.push(t); });
  place(-1.75, -2.6, .3); place(1.75, -2.6, .68); place(0, 1.6, .3); }
const trioSteam = []; for (let i = 0; i < 10; i++) { const q = quad(puffTex, "#FFFFFF", false, 0); q.rotation.x = -PI / 2; GfxTrio.add(q); trioSteam.push(q); }
const mwGlow = quad(softTex, "#FFE6B0", true, 0); mwGlow.rotation.x = -PI / 2; mwGlow.scale.set(4, 4, 1); mwGlow.position.set(-1.75, .5, -2.6); GfxTrio.add(mwGlow);
const panGlow = quad(softTex, "#E0451F", true, 0); panGlow.rotation.x = -PI / 2; panGlow.scale.set(3.0, 3.0, 1); panGlow.position.set(.4, .5, 1.6); GfxTrio.add(panGlow);
// ----- raw vs cooked: a real raw bell pepper and a sautéed one (slumped, blistered), six C tiles each -----
const cmp = new THREE.Group(); cmp.position.set(X_CMP, 0, 0); GK.add(cmp);
const rawPepperMat = new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: .32, metalness: 0, clearcoat: .45, clearcoatRoughness: .25 }), cookedPepperMat = new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: .42, metalness: 0, clearcoat: .3, clearcoatRoughness: .3 });
const pepRaw = mesh(K.makePepper2(1, false), rawPepperMat, cmp, -1.5, .84, -1.6, 0, .3, 0, 1.0), pepCooked = mesh(K.makePepper2(2, true), cookedPepperMat, cmp, 1.5, .6, -1.6, 0, -.4, 0, 1.0);
[-1.55, 1.55].forEach(x => { const s = K.makeContactShadow(1.4, 1.4, .5); s.position.set(x * .97 + .25, .006, -1.5); cmp.add(s); });
const cmpTiles = { raw: [], cooked: [] };
{ const place = (arr, cx) => { for (let i = 0; i < 6; i++) { const t = K.makeTile("C", C.herb, C.countertop, .58); t.position.set(cx + (i % 3 - 1) * .66, .15, .35 + Math.floor(i / 3) * .78); t.rotation.y = (hash(cx + i) - .5) * .25; cmp.add(t); cast(t); arr.push(t); } };
  place(cmpTiles.raw, -1.55); place(cmpTiles.cooked, 1.55); }
// ----- the trade: two small plates, raw peppers vs sautéed carrots -----
const bal = new THREE.Group(); bal.position.set(X_BAL, 0, 0); GK.add(bal);
const GfxBal = new THREE.Group(); bal.add(GfxBal); noDepth.push(GfxBal);
const plateL = new THREE.Group(), plateR = new THREE.Group(); plateL.position.set(-1.9, 0, 1.1); plateR.position.set(1.9, 0, 1.1); bal.add(plateL, plateR);
{ [plateL, plateR].forEach(p => { p.add(K.makePlate(1.5)); const s = K.makeContactShadow(2.0, 2.0, .5); s.position.set(.25, .006, .15); p.add(s); });
  [[-.5, -.2, .4, 0], [.3, -.45, 1.3, 1], [.4, .35, -.5, 0], [-.35, .45, 2.2, 1], [0, 0, -1.1, 1], [-.1, .1, .1, 0]].forEach((p, i) => mesh(stripGeos[i % 6], stripMatRaw, plateL, p[0], .1 + (p[3] ? .17 : .07) + (i > 3 ? .1 : 0), p[1], p[3] ? PI : 0, p[2], 0));
  [[-.55, -.4, 0, 0], [.5, -.3, 0, 1], [-.1, .55, 0, 0], [.55, .5, 0, 1], [-.5, .4, 0, 1], [-.1, -.1, 1, 0], [.35, .1, 1, 1], [-.35, -.25, 1, 1]].forEach((p, i) => mesh(coinGeos[i % 4], coinMatPlate, plateR, p[0], .075 + CT + .01 + p[2] * .2, p[1], (p[3] ? PI : 0) + (p[2] ? .12 : 0), hash(i * 3) * 6.28, 0)); }
const balSteam = []; for (let i = 0; i < 8; i++) { const q = quad(puffTex, "#FFF8EC", false, 0); q.rotation.x = -PI / 2; GfxBal.add(q); balSteam.push(q); }

// ============================================================ MOLECULE WORLDS ============================================================
const MY = { m1: -200, m2: -300, m3: -400 };
const gM1 = new THREE.Group(), gM2 = new THREE.Group(), gM3 = new THREE.Group(); [gM1, gM2, gM3].forEach(g => scene.add(g)); gM2.position.y = MY.m2;
const Gm = new THREE.Group(); scene.add(Gm); noDepth.push(Gm); // soft glows for molecule worlds (world space)
const blobs = (par, n, col, seed, box, op, y0 = 0) => { const r = []; for (let i = 0; i < n; i++) { const q = quad(softTex, col, true, op * (.4 + .6 * hash(i + seed))); const s = 1.6 + hash(i * 3 + seed) * 3.2; q.scale.set(s, s, 1); q.position.set((hash(i * 5 + seed) - .5) * box[0], y0 + (hash(i * 7 + seed) - .5) * box[1], -1.5 - hash(i * 9 + seed) * 3.5); q.userData.b = q.position.clone(); Gm.add(q); r.push(q); } return r; };
const shardGeo = (() => { const g = new THREE.OctahedronGeometry(1, 0); K.mapVerts(g, (x, y, z) => [x * .5, y, z * .5]); g.computeVertexNormals(); return g; })();
const shardMat = new THREE.MeshStandardMaterial({ color: "#ffffff", emissive: "#B84E08", emissiveIntensity: .45, roughness: .18, metalness: .15, flatShading: true });
const shardCols = ["#FF9A2E", "#FFB347", "#F57F17", "#FFC266"].map(c => new THREE.Color(c));
// tile placement helper for a Voronoi cell texture repeated 3x3 over a 48-unit plane: cell centres inside a visible box
function cellCentres(cell, W_, H_) { const Ts = 16, out = []; for (let cj = 0; cj < 3; cj++) for (const ci of [1]) cell.pts.forEach((p, k) => { const x = (ci - 1.5 + p[0]) * Ts, y = (1.5 - cj - p[1]) * Ts; if (Math.abs(x) < W_ && Math.abs(y) < H_) out.push([x, y, k]); }); return out; }
// ---- M1: carrot flesh: plant cells holding orange carotenoid crystals ----
const cell1 = K.cellTexture({ n: 5, seed: 3, wall: "#FBDDB0", wallIn: "#E58A36", c0: "#C8651C", c1: "#7E300C", vac: "#E88E3E", wallW: .07 }); cell1.tex.repeat.set(3, 3);
{ const p = new THREE.Mesh(new THREE.PlaneGeometry(48, 48), new THREE.MeshStandardMaterial({ map: cell1.tex, emissiveMap: cell1.tex, emissive: "#ffffff", emissiveIntensity: .62, roughness: .8 })); p.position.set(0, MY.m1, -6); gM1.add(p); }
const cc1 = cellCentres(cell1, 6.6, 11.5), SH1 = [];
cc1.forEach((c, ci) => { const n = 5; for (let k = 0; k < n; k++) { const a = hash(ci * 7 + k) * 6.28, r = .1 + .55 * hash(ci * 11 + k * 3); SH1.push({ x: c[0] + Math.cos(a) * r, y: c[1] + Math.sin(a) * r * .9, z: -5.6 + hash(ci * 13 + k) * 1.4, s: .5 + .45 * hash(ci * 5 + k * 9), ph: hash(ci * 3 + k), fg: false }); } });
for (let i = 0; i < 9; i++) SH1.push({ x: (hash(i * 3) - .5) * 11, y: (hash(i * 5) - .5) * 18, z: 3 + hash(i * 7) * 3, s: .35 + .35 * hash(i * 9), ph: hash(i * 11), fg: true });
const NP1 = SH1.length, pig1 = new THREE.InstancedMesh(shardGeo, shardMat, NP1); pig1.frustumCulled = false; gM1.add(pig1);
for (let i = 0; i < NP1; i++) pig1.setColorAt(i, shardCols[i % 4]);
const blobs1 = blobs(gM1, 10, "#FFB259", 11, [10, 16], .2, MY.m1);
const tileA = K.makeTile("A", C.butter, C.cast, 1.7); tileA.rotation.x = PI / 2; gM1.add(tileA); tileA.visible = false;
// ---- M2: the gut lining: rows of soft villi; pigments slide by without oil, ride oil droplets in with oil ----
{ const c = document.createElement("canvas"); c.width = 16; c.height = 256; const x = c.getContext("2d"), g = x.createLinearGradient(0, 0, 0, 256); g.addColorStop(0, "#3C1712"); g.addColorStop(.5, "#7C3C24"); g.addColorStop(1, "#43190F"); x.fillStyle = g; x.fillRect(0, 0, 16, 256);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; const m = new THREE.Mesh(new THREE.PlaneGeometry(90, 70), new THREE.MeshBasicMaterial({ map: t })); m.position.set(0, 0, -12); gM2.add(m); }
const villiRows = [[0, "#F0B2A2", "#B96C64", .0], [-1.7, "#D98E82", "#94504C", 0], [-3.4, "#B87068", "#703838", 0]];
const dropMat = new THREE.MeshPhysicalMaterial({ color: "#F3C54B", roughness: .04, metalness: 0, transparent: true, opacity: .55, clearcoat: 1, envMapIntensity: 3, ior: 1.46 });
const pigMat2 = new THREE.MeshStandardMaterial({ color: "#FF9A2E", emissive: "#C85A0A", emissiveIntensity: .5, roughness: .25, metalness: .1, flatShading: true });
function makeGutPanel(y, seed, withOil, nDrop) {
  const grp = new THREE.Group(); grp.position.y = y - .2; gM2.add(grp); const o = { y, base: y - .2, grp, withOil, pig: [], drops: [], glow: [], tips: K.villiTips(30, seed) };
  villiRows.forEach((r, ri) => { const g = K.makeVilli(30, seed + ri * 5, 1.2 - ri * .1, 2.0 - ri * .25, 1.0 + ri * .08, r[1], r[2], withOil ? 10 : 1.4); const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .84, metalness: 0, emissive: "#5A231C", emissiveIntensity: .3 })); m.position.set(ri * .45, 0, r[0] - .55); grp.add(m); });
  const NP = withOil ? nDrop * 3 : 14; for (let i = 0; i < NP; i++) { const m = new THREE.Mesh(shardGeo, pigMat2); m.userData.col = shardCols[i % 4]; grp.add(m); o.pig.push(m); }
  if (withOil) for (let j = 0; j < nDrop; j++) { const d = new THREE.Mesh(new THREE.SphereGeometry(.5, 32, 22), dropMat); grp.add(d); o.drops.push(d); }
  for (let j = 0; j < 5; j++) { const q = quad(softTex, "#FF8A1F", true, 0); q.scale.set(1.8, 1.2, 1); q.position.z = .3; grp.add(q); o.glow.push(q); }
  return o; }
const blobs2 = blobs(gM2, 9, "#FFB070", 41, [14, 16], .22, MY.m2 + .5);
const panTop = makeGutPanel(3.3, 2, false, 0), panBot = makeGutPanel(-1.6, 4, true, 5), panFol = makeGutPanel(-7.5, 6, true, 3);
const tipH = (o, x) => { let best = o.tips[0]; for (const t of o.tips) if (Math.abs(t[0] - x) < Math.abs(best[0] - x)) best = t; return best; };
// ---- M3: pepper flesh: water-filled cells holding vitamin C ----
const cell3 = K.cellTexture({ n: 5, seed: 21, wall: "#FCE6D8", wallIn: "#F28C74", c0: "#EE7258", c1: "#B93220", vac: "#F7A38E", wallW: .06 }); cell3.tex.repeat.set(3, 3);
{ const p = new THREE.Mesh(new THREE.PlaneGeometry(48, 48), new THREE.MeshStandardMaterial({ map: cell3.tex, emissiveMap: cell3.tex, emissive: "#ffffff", emissiveIntensity: .6, roughness: .8 })); p.position.set(0, MY.m3, -6); gM3.add(p); }
const cc3 = cellCentres(cell3, 6.6, 11.5);
const waterMat = new THREE.MeshPhysicalMaterial({ color: "#F6FBFF", roughness: .04, metalness: 0, transparent: true, opacity: .2, clearcoat: 1, clearcoatRoughness: .05, envMapIntensity: 2.6, ior: 1.33, depthWrite: false });
const waters = cc3.map((c, i) => { const m = new THREE.Mesh(new THREE.SphereGeometry(1.2, 36, 24), waterMat); m.position.set(c[0], MY.m3 + c[1], -4.9); m.scale.set(1, 1, .8); gM3.add(m); return m; });
const MOL = []; cc3.forEach((c, ci) => { for (let k = 0; k < 6; k++) { const a = hash(ci * 7 + k) * 6.28, r = .25 + .65 * hash(ci * 11 + k * 3); MOL.push({ cx: c[0], cy: c[1], a, r, z: -4.9 + (hash(ci * 5 + k) - .5) * 1.0, s: .8 + .6 * hash(ci * 3 + k * 7), ph: hash(ci + k * 13) * 6.28 }); } });
const NC3 = MOL.length, c3 = new THREE.InstancedMesh(new THREE.SphereGeometry(.17, 18, 14), new THREE.MeshStandardMaterial({ color: "#ffffff", emissive: "#3E8F36", emissiveIntensity: .9, roughness: .25, transparent: true }), NC3); c3.frustumCulled = false; gM3.add(c3);
for (let i = 0; i < NC3; i++) c3.setColorAt(i, new THREE.Color(["#6FBF5A", "#8FD36B", "#4FA24A"][i % 3]));
const bubbles = []; for (let i = 0; i < 12; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(.3 + hash(i) * .6, 24, 16), new THREE.MeshPhysicalMaterial({ color: "#F7F1E6", roughness: .05, transparent: true, opacity: .14, clearcoat: 1, envMapIntensity: 2.2, depthWrite: false })); m.userData = { p: V((hash(i * 3) - .5) * 9, (hash(i * 5) - .5) * 15, 1 + hash(i * 7) * 4), s: hash(i * 11) }; gM3.add(m); bubbles.push(m); }
const blobs3 = blobs(gM3, 8, "#FF7A55", 31, [10, 16], .16, MY.m3);
const tileC3 = K.makeTile("C", C.herb, C.countertop, 1.5); tileC3.rotation.x = PI / 2; gM3.add(tileC3);
const mshim = []; for (let i = 0; i < 8; i++) { const q = quad(puffTex, "#FF5A2A", true, 0); q.scale.set(4, 6, 1); Gm.add(q); mshim.push(q); }

// ============================================================ CAMERA / ZONES ============================================================
const FOV = f => 2 * Math.atan(18 / f) * 180 / PI;
function setCam(p, l, f, fp, ap, up) { camera.up.set(...(up || [0, 1, 0])); camera.position.set(p[0], p[1], p[2]); camera.lookAt(l[0], l[1], l[2]); camera.fov = FOV(f); camera.updateProjectionMatrix(); camera.updateMatrixWorld(true);
  bokeh.uniforms.focus.value = camera.position.distanceTo(V(...fp)); bokeh.uniforms.aperture.value = ap; bokeh.uniforms.maxblur.value = .014; }
// overhead camera keys: [t, x, z0 (look z), h]; height interpolated in log space, eased
const HERO = [-.42, -.15];
const tiltAt = t => t < S("b02") - .05 ? .38 : t < E("b02") - .3 ? .38 * (1 - smooth((t - S("b02") + .05) / (E("b02") - S("b02") - .25))) : t < S("b13") ? 0 : .3 * smooth((t - S("b13")) / 1.2);
const camKeys = [
  [0, 0, .05, 9.0], [S("b02") - .05, 0, .05, 9.0], [E("b02") - .3, 0, .55, 8.6],
  [S("b03") + .2, -.3, .35, 7.4], [T.diveFrom, -.35, .1, 5.2], [T.dive1, HERO[0], HERO[1], .8],
  [S("b06"), HERO[0], HERO[1], .8], [S("b06") + 1.6, 0, .55, 8.6], [S("b07") - .9, 0, .55, 8.6], [S("b07") + .5, 0, 1.19, 9.8], [E("b07") - .5, 0, 1.19, 9.8],
  [S("b08") + .15, 0, .5, 8.6], [S("b08") + 1.45, X_BOARD, .5, 8.6], [T.diveFrom2, X_BOARD, .5, 8.6], [T.dive2, X_BOARD - .8, -.6, .8],
  [S("b10"), X_TRIO, 1.2, 15], [E("b10") - .01, X_TRIO + .35, 1.0, 13], [S("b11"), X_CMP, -.2, 11], [E("b11") - .01, X_CMP, -.2, 10.2], [S("b12"), X_BAL, 1.15, 12.5], [E("b12"), X_BAL, 1.0, 10.2],
  [S("b13"), 0, .55, 8.6], [DUR, 0, .55, 8.2]];
function camAt(t) { let i = 0; for (let k = 0; k < camKeys.length; k++) if (camKeys[k][0] <= t) i = k; const a = camKeys[i], b = camKeys[Math.min(i + 1, camKeys.length - 1)];
  const cutNext = [S("b10"), S("b11"), S("b12"), S("b13")].includes(b[0]); const u = cutNext || b === a ? 0 : eio((t - a[0]) / (b[0] - a[0])); // cuts hold the old key until the cut
  return [lerp(a[1], b[1], u), lerp(a[2], b[2], u), Math.exp(lerp(Math.log(a[3]), Math.log(b[3]), u))]; }
// short, partial veils only at the dives (never a flat colour wall); every cut to the kitchen shots is a hard cut
const VEIL = [[T.dive1, .12, .16, C.carrot], [S("b04"), .1, .16, "#E39A4A"], [S("b06"), .2, .2, C.carrot], [T.dive2, .12, .16, "#B53A25"]];
function veilAt(t) { let a = 0, col = C.countertop; for (const [c, pre, post, color] of VEIL) { const u = t < c ? (t - (c - pre)) / pre : 1 - (t - c) / post; const pl = clamp(u) * .8; if (pl > a) { a = pl; col = color; } } return { a, col }; }
function zoneAt(t) { if (t < T.dive1) return "K"; if (t < S("b04")) return "M1"; if (t < S("b05")) return "M2a"; if (t < S("b06")) return "M2b"; if (t < T.dive2) return "K"; if (t < S("b10")) return "M3"; return "K"; }

// ---------- per-frame animation of kitchen content ----------
const cookU = t => clamp((t - 2.5) / 34); // browning amount: grows through the film
function animKitchen(t, A) {
  const oilU = eo3(clamp((t - T.tOil - .25) / 1.4));
  // the pour: a thin stream that arrives in ~0.3 s and thins out
  const head = smooth(clamp((t - T.tOil) / .28)), tail = smooth(clamp((t - T.tOil - .55) / .4)), nSeg = ribbonCount / 6;
  const iStart = Math.floor(tail * nSeg) * 6, iEnd = Math.floor(head * nSeg) * 6; ribbon.visible = t >= T.tOil - .02 && t < T.tOil + 1.1; ribbon.geometry.setDrawRange(iStart, Math.max(0, iEnd - iStart));
  const rr = 1.28 * oilU; oil.visible = oilU > .001; oil.scale.set(rr, 1, rr * .98);
  // cooking: browning on the pan side, oil sheen on coins, peppers darken
  const cu = cookU(t), sheen = smooth(clamp((t - T.tOil - .8) / 2.5));
  coinMat.userData.sear.value = cu; coinMat.roughness = lerp(.68, .5, sheen);
  stripMat.color.setRGB(lerp(1, .78, cu), lerp(1, .64, cu), lerp(1, .6, cu)); stripMat.clearcoat = .22 + .25 * sheen;
  blisters.forEach(b => { const u = smooth((t - b.userData.t0) / .7); b.scale.set(b.userData.s * u * 1.3, b.userData.s * u * .4, b.userData.s * u * 1.5); b.visible = u > .01; });
  // spinach / broccoli drop in
  for (const o of dropIns) { const u = (t - o.userData.t0) / .5; o.visible = u >= 0 && (zoneAt(t) === "K"); if (u < 0) continue; const e = eo3(clamp(u)), bounce = u > 1 ? Math.exp(-(u - 1) * 5) * Math.sin((u - 1) * 14) * .06 : 0;
    o.position.set(o.userData.rest.x, o.userData.rest.y + 4.5 * (1 - e) + Math.abs(bounce), o.userData.rest.z); o.rotation.y = o.userData.ry + (1 - e) * 2.4; o.rotation.x = (1 - e) * .8 + (o.material === florMat ? .15 : 0); }
  // E and K tiles land beside the spinach / broccoli
  ["E", "K"].forEach((l, i) => { const g = tiles["v" + l], t0 = T.tVit + .2 + i * .3, u = (t - t0) / .5; g.visible = t >= t0 && t < S("b08") + 1.2; const e = u < 0 ? 0 : eob(clamp(u)); g.position.y = .15 + 3.4 * (1 - e); g.rotation.y = (1 - e) * 1.3; g.userData.glow(.38 * smooth(clamp((t - t0 - .45) / .4)) * (.75 + .25 * Math.sin(t * 5 + i))); });
  // C tile pops above the board
  { const t0 = T.tVC - .05, u = (t - t0) / .55; tileC.visible = t >= t0 && t < T.diveFrom2 + 1.2; const e = u < 0 ? 0 : eob(clamp(u)); tileC.scale.setScalar(1.25 * Math.max(.001, e)); tileC.position.set(X_BOARD + .15, .95 + .25 * Math.sin(t * 2.2) * smooth(u) + .6 * e, -.2); tileC.rotation.y = .3 * Math.sin(t * 1.5); tileC.rotation.x = -.2 * (1 - e); }
  // steam
  const sk = clamp((t - T.tOil - 1.6) / 2.5) * (t > S("b13") - .1 ? 1.35 : 1) * (.7 + .3 * smooth(cu * 3));
  steam.forEach((q, i) => { const per = 3.8 + hash(i) * 2, ph = (t / per + hash(i * 3)) % 1, bx = (hash(i * 5) - .5) * 2.3, bz = (hash(i * 7) - .5) * 2.0;
    const h = .35 + ph * 3.6; q.position.set(bx + Math.sin(t * .6 + i) * .3 * ph + ph * .4, h, bz - ph * .35 + Math.cos(t * .5 + i * 2) * .25 * ph); const s = .7 + ph * 1.9 * (.7 + hash(i * 9)); q.scale.set(s, s, 1); q.rotation.z = i + t * .1 * (i % 2 ? 1 : -1);
    q.material.opacity = .06 * sk * Math.sin(PI * ph) ** 1.2 * (.6 + .4 * hash(i * 13)); q.visible = q.material.opacity > .004; });
  filmAll.forEach(o => (o.visible = oilU > .05)); ringMat.opacity = 0; bubMat.opacity = .7 * oilU; bubs.forEach((b, i) => b.scale.setScalar(b.userData.s * (1 + .12 * Math.sin(t * 3 + i * 1.7))));
  gleams.forEach((q, i) => { q.material.opacity = .5 * oilU * (.8 + .2 * Math.sin(t * 1.3 + i * 2)); q.visible = oilU > .02; });
  wisps.forEach((q, i) => { const per = 3.2 + hash(i * 3) * 2.2, ph = (t / per + hash(i * 5)) % 1; q.position.set(-.9 + hash(i * 7) * 1.0 + Math.sin(t * .7 + i) * .25 * ph, .4 + ph * 3.0, (hash(i * 9) - .5) * 1.8 - ph * .3); const s2 = .5 + ph * 1.5; q.scale.set(s2 * .7, s2, 1); q.rotation.z = i * 1.3 + ph; q.material.opacity = .16 * sk * Math.sin(PI * ph); q.visible = q.material.opacity > .004; });
  // heat shimmer on the pepper (right) half: from ~1.5 s in the hook, through b02
  const hk2 = smooth(clamp((t - T.tHeat1) / .6)) * (1 - smooth(clamp((t - E("b02") - .4) / .8)));
  glowRight.material.opacity = .24 * hk2 * (.85 + .15 * Math.sin(t * 6)); glowRight.visible = hk2 > .01;
  heatQ.forEach((q, i) => { const ph = (t * .5 + hash(i * 3)) % 1; q.position.set(.35 + hash(i) * 1.1, .6 + ph * 2.4, (hash(i * 5) - .5) * 1.8); const s = 1 + ph * 1.2; q.scale.set(s * .8, s * 1.4, 1); q.material.opacity = .26 * hk2 * Math.sin(PI * ph); q.visible = hk2 > .01; });
}
function animTrio(t) {
  const dim = smooth(clamp((t - T.tLower2) / .5)) * LVL; trioTiles.forEach(tt => tt.userData.dimTo(dim)); // all three dim together, nothing removed
  mwTurn.rotation.y = (t - S("b10")) * .9;
  const ms = smooth(clamp((t - T.tMicro + .1) / .4)) * (1 - smooth(clamp((t - T.tSteam + .2) / .5))); mwGlow.material.opacity = .22 * ms * (.85 + .15 * Math.sin(t * 22)); mwGlow.visible = ms > .01;
  const sk = smooth(clamp((t - T.tSteam + .3) / .6));
  trioSteam.forEach((q, i) => { const per = 2.6 + hash(i) * 1.6, ph = (t / per + hash(i * 3)) % 1; q.position.set(1.75 + (hash(i * 5) - .5) * 1.5 + Math.sin(t * .7 + i) * .25 * ph, .8 + ph * 3.2, -2.6 + (hash(i * 7) - .5) * 1.2 - ph * .3); const s = .9 + ph * 2.0; q.scale.set(s, s, 1); q.rotation.z = i + t * .1; q.material.opacity = .26 * sk * Math.sin(PI * ph) ** 1.2; q.visible = q.material.opacity > .004; });
  const ps = smooth(clamp((t - T.tPan + .2) / .5)); panGlow.material.opacity = .3 * ps * (.85 + .15 * Math.sin(t * 6)); panGlow.visible = ps > .01;
}
function animCmp(t) {
  cmpTiles.raw.forEach((tt, i) => { const u = eob(clamp((t - S("b11") - i * .05) / .35)); tt.scale.setScalar(.58 * Math.max(.001, u)); });
  const dim = smooth(clamp((t - T.tThat - .2) / .6)) * LVL; // the cooked set dims to the same partial level as the trio
  cmpTiles.cooked.forEach((tt, i) => { const u = eob(clamp((t - S("b11") - .1 - i * .05) / .35)); tt.scale.setScalar(.58 * Math.max(.001, u)); tt.userData.dimTo(dim); });
  pepRaw.rotation.y = .3 + .12 * Math.sin((t - S("b11")) * .6); pepCooked.rotation.y = -.4 - .1 * Math.sin((t - S("b11")) * .5);
}
function animPlates(t) {
  const lt = t - S("b12"), land = eob(clamp(lt / .5)), join = eob(clamp((t - T.tTrade) / .6));
  plateL.position.set(-1.9 + .28 * join, 1.5 * (1 - land) * .0 + .0, 1.1); plateR.position.set(1.9 - .28 * join, 0, 1.1);
  plateL.position.y = 2.2 * (1 - land) * (lt < .5 ? 1 : 0); plateR.position.y = 2.2 * (1 - eob(clamp((lt - .12) / .5))) * (lt < .62 ? 1 : 0);
  balSteam.forEach((q, i) => { const per = 3.0 + hash(i) * 1.4, ph = (t / per + hash(i * 3)) % 1; q.position.set(plateR.position.x + (hash(i * 5) - .5) * 1.2, .5 + ph * 2.6, 1.1 + (hash(i * 7) - .5) * .9 - ph * .3); const s = .8 + ph * 1.7; q.scale.set(s, s, 1); q.rotation.z = i + t * .1; q.material.opacity = .22 * smooth(clamp(lt / .8)) * Math.sin(PI * ph) ** 1.2; q.visible = q.material.opacity > .004; });
}

// ---------- molecule worlds ----------
const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), Eu = new THREE.Euler(), Col = new THREE.Color();
function animM1(t, A) {
  const lt = t - T.dive1, u = smooth(lt / (S("b04") - T.dive1)), cz = lerp(13, 9.5, u), cx = lerp(-.9, .9, u);
  setCam([cx + Math.sin(lt * .3) * .25, MY.m1 + Math.cos(lt * .2) * .3, cz], [cx * .4, MY.m1 - .2, -5], 35, [0, MY.m1, -5], .0042);
  mLight.position.set(2, MY.m1 + 3, cz - 2); mLight.intensity = 70; mLight.color.set(0xffb06a);
  const tp = V(0, MY.m1 + .45, 4.2), arrive = T.tBody + .55, sw = lerp(-14, 14, smooth((lt - .9) / 1.6)); // sparkle sweep crosses the crystals at ~1 s
  for (let i = 0; i < NP1; i++) { const d = SH1[i], x0 = d.x + Math.sin(t * .35 + d.ph * 6) * .12, y0 = MY.m1 + d.y + Math.cos(t * .3 + d.ph * 5) * .14, z0 = d.z;
    let x = x0, y = y0, z = z0, s = d.s * (d.fg ? 1 : smooth(clamp((lt + .1 - d.ph * .25) / .35)) * (1 + .15 * Math.exp(-Math.pow((lt - .2) * 3, 2))));
    if (!d.fg && i % 3 === 0 && t > arrive) { const k = eio(clamp((t - arrive - hash(i * 19) * 1.0) / 1.4)); x = lerp(x, tp.x + (hash(i) - .5) * .5, k); y = lerp(y, tp.y, k); z = lerp(z, tp.z, k); s *= 1 - smooth(clamp((k - .8) / .2)); }
    Eu.set(d.ph * 6 + t * .25, t * .3 + i, d.ph * 3 + Math.sin(t * .4 + i) * .2); Q.setFromEuler(Eu); M.compose(V(x, y, z), Q, V(s, s, s)); pig1.setMatrixAt(i, M);
    const br = 1 + 1.3 * Math.exp(-Math.pow((x * .6 + (y - MY.m1) * .8 - sw) / 1.1, 2)); pig1.setColorAt(i, Col.copy(shardCols[i % 4]).multiplyScalar(d.fg ? .9 : br)); }
  pig1.instanceMatrix.needsUpdate = true; pig1.instanceColor.needsUpdate = true;
  const ta = eob(clamp((t - T.tBody - .05) / .55)); tileA.visible = ta > .001; tileA.scale.setScalar(.85 * Math.max(.001, ta)); tileA.position.set(0, MY.m1 + .45, 4.2 + .1 * Math.sin(t * 2)); tileA.userData.glow(.4 + .25 * Math.sin(t * 4));
  blobs1.forEach((q, i) => { q.position.x = q.userData.b.x + Math.sin(t * .2 + i) * .6; q.position.y = q.userData.b.y + Math.cos(t * .15 + i) * .5; q.visible = true; });
  A.proj = projector();
}
function animGut(o, t, mode, lt) { // drives one lining panel; o.base = finger baseline, travel level sits above every fingertip
  const B0 = 0, TOP = 2.35; // local to the panel group: fingers rise from 0 to ~2, travel level sits above every tip
  if (!o.withOil) { o.pig.forEach((m, i) => { const per = 5.4 + hash(i) * 1.8, u = ((t + hash(i * 3) * per) / per) % 1, x = -6.5 + 13 * u, dip = u > .4 && u < .62 ? Math.sin((u - .4) / .22 * PI) * .35 : 0;
      m.position.set(x, TOP + .35 + 1.3 * hash(i * 5) - dip + .1 * Math.sin(t * 2 + i), -.3 + hash(i * 7) * 1.4); m.rotation.set(t * .6 + i, t * .4, i + u * 5); m.scale.setScalar(.3 + .14 * hash(i * 9)); m.visible = true; }); return; }
  o.glow.forEach(g => (g.visible = false));
  o.drops.forEach((d, j) => { let x, yy, sc = 1, sq = 1, sink = 0, xd, tp, u = 0;
    if (mode === "follow") { // camera rides along: droplets stay in frame, lining slides by underneath; each dips into a villus and passes its pigments in
      const x0 = -1.2 + (t - S("b05")) * 1.5, offs = [-1.25, .25, 1.55][j]; xd = x0 + offs; tp = tipH(o, xd); const dipT = S("b05") + (E("b05") - S("b05")) * (.5 + .22 * j), k = Math.exp(-Math.pow((t - dipT) / .55, 2));
      x = xd + .3 * Math.sin(t * .9 + j * 2); yy = TOP + .1 + .25 * Math.sin(t * 1.6 + j * 2) - k * (TOP - B0 - tp[1] - .45); sq = 1 - .2 * k; sink = smooth(clamp((t - dipT) / .8)) * (1 - smooth(clamp((t - dipT - 1.6) / .5))); sc = 1 - .5 * sink;
      const gl = o.glow[j]; gl.position.set(x, B0 + tp[1] + .05, .6); gl.material.opacity = .6 * k; gl.visible = k > .02; }
    else { const P = 4.6; u = ((t + j * (P / o.drops.length) + .7 * hash(j)) / P) % 1; xd = tipH(o, [-3.0, -1.3, .4, 2.0, 3.6][j % 5])[0]; tp = tipH(o, xd);
      if (u < .55) { const k = eio(u / .55); x = lerp(-5.8, xd, k); yy = TOP + .1 + .25 * Math.sin(u * 8 + j) + (1 - k) * .3; sc = smooth(u / .08); } else if (u < .75) { const k = smooth((u - .55) / .2); x = xd; yy = lerp(TOP + .1, B0 + tp[1] + .45, k); sq = 1 - .22 * Math.sin(k * PI); } else if (u < .93) { const k = smooth((u - .75) / .18); x = xd; yy = B0 + tp[1] + .45 - k * .1; sc = 1 - k; sink = k; } else { x = xd; yy = B0 + tp[1]; sc = 0; sink = 1; }
      const g = o.glow[j % 5], gk = u > .72 && u < .95 ? Math.sin(((u - .72) / .23) * PI) : 0; g.position.set(x, B0 + tp[1] + .1, .6); g.material.opacity = .6 * gk; g.visible = gk > .01; }
    d.position.set(x, yy, 0); d.scale.set(sc * (2 - sq), sc * sq, sc); d.visible = sc > .01;
    for (let k = 0; k < 3; k++) { const m = o.pig[j * 3 + k], a = k / 3 * 6.283 + t * 1.2 + j, pr = .24, ps = (1 - .9 * sink) * Math.max(.01, sc) * .3; m.position.set(x + Math.cos(a) * pr, yy + Math.sin(a * 1.3) * pr * .8 - sink * .5, Math.sin(a) * pr * .6); m.rotation.set(a, t, k); m.scale.setScalar(ps); m.visible = ps > .02; } });
}
function animM2(t, A, follow) {
  const lt = t - S("b04");
  mLight.position.set(-3, MY.m2 + 3, 12); mLight.intensity = 110; mLight.color.set(0xffd2a0);
  if (!follow) { const cz = lerp(23, 20.5, smooth(lt / (S("b05") - S("b04")))); setCam([Math.sin(lt * .35) * .5, MY.m2 + .5, cz], [0, MY.m2 + .5, 0], 50, [0, MY.m2, 0], .0035);
    panTop.grp.visible = panBot.grp.visible = true; panFol.grp.visible = false; animGut(panTop, t, "plain", lt); animGut(panBot, t, "oil", lt); }
  else { const x0 = -1.2 + (t - S("b05")) * 1.5; setCam([x0, MY.m2 + panFol.y + 2.3, 13], [x0 + .5, MY.m2 + panFol.y + 1.5, 0], 50, [x0, MY.m2 + panFol.y + 1.5, 0], .004);
    panTop.grp.visible = panBot.grp.visible = false; panFol.grp.visible = true; animGut(panFol, t, "follow", lt); }
  A.proj = projector();
}
function animM3(t, A) {
  const lt = t - T.dive2, heat = smooth(clamp((t - T.tLower) / 1.4)), cz = lerp(12.5, 9.8, smooth(lt / (S("b10") - T.dive2))), disp = smooth((t - T.tDis - .1) / 1.6); // dissolve: clumps spread out in the cell water
  setCam([Math.sin(lt * .22) * .3 + lerp(-.5, .5, smooth(lt / 5)), MY.m3 + Math.cos(lt * .17) * .3, cz], [0, MY.m3, -4.5], 35, [0, MY.m3, -5], .004);
  mLight.position.set(1, MY.m3 + 3, cz - 2); mLight.intensity = lerp(60, 90, heat); mLight.color.set(heat > .5 ? 0xff9a60 : 0xffc9a0);
  heatLight.position.set(5, MY.m3 - 4, 3); heatLight.intensity = 140 * heat;
  for (let i = 0; i < NC3; i++) { const d = MOL[i], rr = (.1 + (d.r * 1.0 - .1) * disp), a = d.a + t * .15 * (.5 + d.s * .3) * disp, x = d.cx + Math.cos(a) * rr + Math.sin(t * .6 + d.ph) * .06 * disp, y = MY.m3 + d.cy + Math.sin(a) * rr * .9 + Math.cos(t * .5 + d.ph) * .06 * disp + heat * .25 * Math.sin(t * 2 + d.ph);
    const s = d.s * smooth(clamp((lt + .1 - hash(i) * .3) / .4)); Eu.set(d.ph, t * .3, 0); Q.setFromEuler(Eu); M.compose(V(x, y, d.z), Q, V(s, s, s)); c3.setMatrixAt(i, M); }
  c3.instanceMatrix.needsUpdate = true; c3.material.opacity = lerp(1, LVL, heat); // every molecule dims to the shared partial level; none removed
  waters.forEach((w, i) => { const s = 1 + .03 * Math.sin(t * 1.3 + i); w.scale.set(s, s, .8); });
  bubbles.forEach((b, i) => { const p = b.userData.p; b.position.set(p.x + Math.sin(t * .3 + i) * .5, MY.m3 + p.y + Math.cos(t * .25 + i * 2) * .6 + heat * 1.5 * b.userData.s, p.z); });
  const hs = tileC3.userData; tileC3.position.set(-.1 + Math.sin(t * .5) * .2, MY.m3 + .8 + Math.cos(t * .6) * .15, 5.2); tileC3.scale.setScalar(1.5 * Math.max(.001, eob(clamp((lt - .3) / .6)))); hs.dimTo(LVL * heat); hs.glow(.25 * (1 - heat));
  blobs3.forEach((q, i) => { q.position.x = q.userData.b.x + Math.sin(t * .2 + i) * .6; q.position.y = q.userData.b.y + Math.cos(t * .15 + i) * .5; q.material.color.set(heat > .3 ? "#FF6A3A" : "#FF8A6A"); });
  mshim.forEach((q, i) => { const ph = (t * .35 + hash(i * 3)) % 1; q.position.set(-4 + hash(i) * 8, MY.m3 - 6 + ph * 12, 1 + hash(i * 5) * 3); q.material.opacity = .2 * heat * Math.sin(PI * ph); });
  A.proj = projector(); A.heat = heat; A.tileC = A.proj(tileC3.position.x, tileC3.position.y, 5.2);
}
function projector() { const v = new THREE.Vector3(); return (x, y, z) => { v.set(x, y, z).project(camera); return { x: (v.x * .5 + .5) * 1080, y: (-v.y * .5 + .5) * 1920 }; }; }

// ============================================================ STAGE ============================================================
function show(zone) { // visibility per zone (keeps render + depth passes cheap)
  const k = zone === "K"; GK.visible = k; gM1.visible = zone === "M1"; gM2.visible = zone === "M2a" || zone === "M2b"; gM3.visible = zone === "M3"; Gm.visible = !k;
  blobs1.forEach(q => (q.visible = zone === "M1")); blobs3.forEach(q => (q.visible = zone === "M3")); blobs2.forEach(q => (q.visible = zone === "M2a" || zone === "M2b")); mshim.forEach(q => (q.visible = zone === "M3"));
  key.visible = k; tileA.visible = zone === "M1" && tileA.visible;
}
function stage(t, A) {
  const z = zoneAt(t); show(z); A.zone = z; mLight.intensity = 0; heatLight.intensity = 0;
  if (z === "K") {
    camera.up.set(0, 0, -1); const [cx, cz, h] = camAt(t);
    const inTrio = t >= S("b10") && t < S("b11"), inCmp = t >= S("b11") && t < S("b12"), inBal = t >= S("b12") && t < S("b13"), onPan = !(inTrio || inCmp || inBal);
    const px = inTrio ? X_TRIO : inCmp ? X_CMP : inBal ? X_BAL : cx;
    PG.visible = onPan; trio.visible = inTrio; cmp.visible = inCmp; bal.visible = inBal; board.visible = t >= S("b08") - .5 && t < S("b10"); pileC.visible = pileP.visible = t < S("b04") + 1;
    animKitchen(t, A); if (inTrio) animTrio(t); if (inCmp) animCmp(t); if (inBal) animPlates(t);
    tileC.visible = tileC.visible && board.visible;
    ["vE", "vK"].forEach(k => (tiles[k].visible = tiles[k].visible && onPan && t < S("b08") + 1.2));
    // the window key sits low on camera-left and follows the shot
    key.position.set(px - 8.5, 8.4, cz + 2.4); key.target.position.set(px, 0, cz); key.target.updateMatrixWorld();
    const tl_ = tiltAt(t); bokeh.enabled = true;
    setCam([cx + Math.sin(t * .3) * .02, h, cz + Math.cos(t * .27) * .015 + tl_ * h], [cx, 0, cz], h < 2 ? 50 : 40, [cx, h < 2 ? .15 : .25, cz], h < 2 ? .012 : (.007 + .0075 * tl_ / .38 + (inBal || inTrio ? .001 : 0) - (inCmp ? .004 : 0)), [0, 0, -1]);
    bloom.strength = .2; bloom.radius = .5; bloom.threshold = 1.1; A.proj = projector(); A.cam = { cx, cz, h };
  } else {
    bloom.strength = .5; bloom.radius = .7; bloom.threshold = .85;
    bokeh.enabled = z === "M1" || z === "M3";
    if (z === "M1") animM1(t, A); else if (z === "M2a") animM2(t, A, false); else if (z === "M2b") animM2(t, A, true); else animM3(t, A);
    key.visible = false;
  }
}

window.__seek = function (t) {
  const A = { t };
  if (COVER) { // cover: overhead pan with carrots + peppers + oil gleam
    const tt = 14; show("K"); trio.visible = bal.visible = cmp.visible = false; board.visible = false; tileC.visible = false; PG.visible = true; pileC.visible = pileP.visible = false;
    animKitchen(tt, A); Object.values(tiles).forEach(g => (g.visible = false));
    key.position.set(-8, 8.4, 2.4); key.target.position.set(0, 0, -.75); key.target.updateMatrixWorld();
    setCam([0, 9.4, -.45 + 9.4 * .42], [0, 0, -.45], 40, [0, .2, -.45], .012, [0, 0, -1]); bloom.strength = .25; filmPass.uniforms.time.value = .5; composer.render(); ov.drawCover(); return;
  }
  stage(t, A);
  filmPass.uniforms.time.value = (t * 30 | 0) * .017;
  composer.render();
  A.veil = veilAt(t); ov.draw(t, A); ov.captions(t);
};
window.__cues = T.cues; window.__duration = DUR;
window.__seek(0); window.__ready = true;
