// Pan Theory ep02: why onions make you cry. three.js 0.169 (vendored). Pure function of t: window.__seek(t) renders the frame.
// Look: a real half onion (papery skin, layered translucent flesh) and a steel blade with a bevel on an oak counter, window key + cool fill + grain + vignette + DOF;
// slow-motion droplet sprays (the lab's high-speed cameras are the reason for the slow motion); cell-scale view in the PT ep01 plant-cell look; a respectful stylised cornea.
import * as THREE from "three";
import { createPost } from "../../../engine/film/post.js";
import * as K from "../../../engine/film/kitchen.js";
import * as O from "../../../engine/film/onion.js";
import { evalPath } from "../../../engine/film/camera.js";
import { clamp, smooth, eio, eo3, eob, lerp, hash, makeTiming } from "./timing.js";
import { createOverlay } from "./overlay.js";

const TH = window.THEME, C = TH.colors, PI = Math.PI;
const COVER = new URLSearchParams(location.search).has("cover");
{ let css = ""; for (const k in TH.fonts) for (const f of TH.fonts[k].faces) css += `@font-face{font-family:"${TH.fonts[k].family}";font-weight:${f.weight};src:url(${f.url}) format("woff2");}\n`;
  css += `:root{--bg:${C.bg};--key:${TH.caption.keyColor}}\n`; document.getElementById("theme-css").textContent = css; }
await Promise.all([`800 60px "Rubik"`, `500 30px "Rubik"`, `800 60px "Nunito"`, `400 30px "Nunito"`].map(f => document.fonts.load(f))); await document.fonts.ready;
const tl = await (await fetch("out/timeline.json")).json();
const T = makeTiming(tl), { S, E, END, W, DUR } = T;
const ov = createOverlay(T, TH, document.getElementById("fx")); ov.initCaps(tl);

const { renderer, scene, camera, composer, bokeh, bloom, filmPass } = createPost({ canvas: document.getElementById("gl"), theme: TH });
renderer.toneMapping = THREE.NeutralToneMapping; renderer.toneMappingExposure = 1.3;
scene.background = new THREE.Color("#2B2119");
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const noDepth = []; { const br = bokeh.render.bind(bokeh); bokeh.render = function (...a) { const v = noDepth.map(o => o.visible); noDepth.forEach(o => (o.visible = false)); br(...a); noDepth.forEach((o, i) => (o.visible = v[i])); }; }
const FOV = f => 2 * Math.atan(18 / f) * 180 / PI;
function setCam(p, l, f, fp, ap, up) { camera.up.set(...(up || [0, 1, 0])); camera.position.set(p[0], p[1], p[2]); camera.lookAt(l[0], l[1], l[2]); camera.fov = FOV(f); camera.updateProjectionMatrix(); camera.updateMatrixWorld(true);
  bokeh.uniforms.focus.value = camera.position.distanceTo(V(...fp)); bokeh.uniforms.aperture.value = ap; bokeh.uniforms.maxblur.value = .014; }
const path = (keys, t, up) => { const c = evalPath(keys, t); setCam(c.p, c.l, c.f, c.fp, c.ap, up); return c; };
function projector() { const v = new THREE.Vector3(); return (x, y, z) => { v.set(x, y, z).project(camera); return { x: (v.x * .5 + .5) * 1080, y: (-v.y * .5 + .5) * 1920 }; }; }
const softTex = (() => { const c = document.createElement("canvas"); c.width = c.height = 128; const x = c.getContext("2d"), g = x.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, "rgba(255,255,255,1)"); g.addColorStop(.35, "rgba(255,255,255,.35)"); g.addColorStop(1, "rgba(255,255,255,0)"); x.fillStyle = g; x.fillRect(0, 0, 128, 128); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
const quad = (tex, color, add, op = 1) => new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: tex, color, transparent: true, opacity: op, depthWrite: false, blending: add ? THREE.AdditiveBlending : THREE.NormalBlending, toneMapped: false }));

// ---------- environment: big window (camera-left, +z), overhead soft box, a soft panel behind the camera so steel faces catch it ----------
scene.environment = (() => { const pm = new THREE.PMREMGenerator(renderer), s = new THREE.Scene(); s.background = new THREE.Color(0x85735f);
  const panel = (col, k, p, sz) => { const m = new THREE.Mesh(new THREE.BoxGeometry(...sz), new THREE.MeshBasicMaterial({ color: new THREE.Color(col).multiplyScalar(k) })); m.position.set(...p); s.add(m); };
  panel(0xfff1dc, 14, [-2, 6, 9], [8, 9, 1]); panel(0xfff4e6, 3.4, [0, 11, 0], [14, 1, 14]); panel(0xffe2bd, 7, [9, 4, 0], [1, 9, 12]); panel(0xf2dfc0, 2, [0, -7, 0], [14, 1, 14]); panel(0xffeed2, 7, [-9, 5, -3], [1, 6, 4]);
  const tx_ = pm.fromScene(s, .035).texture; pm.dispose(); return tx_; })();
scene.environmentIntensity = .42;

// ---------- lights ----------
const key = new THREE.DirectionalLight(0xffd29a, 2.1); key.castShadow = true; key.shadow.mapSize.set(1536, 1536);
Object.assign(key.shadow.camera, { left: -7.5, right: 7.5, top: 7.5, bottom: -7.5, near: .5, far: 40 }); key.shadow.bias = -.0005; key.shadow.normalBias = .025; key.shadow.radius = 6;
const rim = new THREE.DirectionalLight(0xffe2b0, 2.3); // window behind the rig: rim light on droplets and blade tops
scene.add(key, key.target, rim, rim.target, new THREE.HemisphereLight(0xc4d6f4, 0xe0cba8, .32));
const mLight = new THREE.PointLight(0xffe8b0, 0, 0, 2); scene.add(mLight);

// ============================================================ KITCHEN ============================================================
const KZ = { hero: 0, slab: 30, split: 60, over: 90 };
const GK = new THREE.Group(); scene.add(GK);
const counter = K.makeCounterWood(260, 5); counter.position.set(0, 0, 45); GK.add(counter);
// back wall: warm walnut cabinets with a bright window strip behind each set (bokeh + rim)
const wallMat = new THREE.MeshStandardMaterial({ map: K.woodTex(), color: "#8A6A4C", roughness: .6, metalness: 0 });
const wall = new THREE.Mesh(new THREE.PlaneGeometry(220, 40), wallMat); wall.rotation.y = PI / 2; wall.position.set(-9.5, 12, 45); wall.receiveShadow = true; GK.add(wall);
// a real window: sky + soft trees outside, painted mullions and a sill, a curtain edge; lit from behind so it rims the droplets and blade
const winTex = (() => { const W_ = 1024, H_ = 768, c = document.createElement("canvas"); c.width = W_; c.height = H_; const x = c.getContext("2d"), g = x.createLinearGradient(0, 0, 0, H_); g.addColorStop(0, "#FFF6E2"); g.addColorStop(.55, "#FFE6B8"); g.addColorStop(1, "#F2CF98"); x.fillStyle = g; x.fillRect(0, 0, W_, H_);
  for (let i = 0; i < 26; i++) { const px = hash(i * 3) * W_, py = H_ * (.55 + .4 * hash(i * 5)), r = 70 + 110 * hash(i * 7), gg = x.createRadialGradient(px, py, 0, px, py, r); gg.addColorStop(0, `rgba(${150 + 40 * hash(i)},${140 + 30 * hash(i * 2)},${100 + 30 * hash(i * 3)},.5)`); gg.addColorStop(1, "rgba(150,140,100,0)"); x.fillStyle = gg; x.fillRect(px - r, py - r, 2 * r, 2 * r); }
  x.fillStyle = "#3A2A1E"; x.fillRect(0, 0, W_, 30); x.fillRect(0, H_ - 70, W_, 70); x.fillRect(0, 0, 30, H_); x.fillRect(W_ - 30, 0, 30, H_); x.fillRect(W_ / 2 - 15, 0, 30, H_); x.fillRect(0, H_ * .42, W_, 24);
  x.fillStyle = "rgba(255,246,226,.55)"; x.fillRect(W_ - 150, 30, 120, H_ - 100); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
const glowMat = new THREE.MeshBasicMaterial({ map: winTex, color: new THREE.Color(2.5, 2.4, 2.2), toneMapped: false });
Object.values(KZ).forEach(z => { const w = new THREE.Mesh(new THREE.PlaneGeometry(11, 8.2), glowMat); w.rotation.y = PI / 2; w.position.set(-9.4, 6.6, z - .4); GK.add(w); });
const cast = o => { o.traverse(m => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } }); return o; };
const setG = z => { const g = new THREE.Group(); g.position.z = z; GK.add(g); return g; };
const GH = setG(KZ.hero), GS = setG(KZ.slab), GP = setG(KZ.split), GO = setG(KZ.over);
const csh = (par, rx, rz, x, z, op = .5) => { const s = K.makeContactShadow(rx, rz, op); s.position.set(x, .007, z); par.add(s); return s; };

// ---------- HERO SET: steel rig, half onion on the plate, window rim ----------
const rigH = O.mkRig({ blunt: false, base: true, L: 2.7, H: 1.15 }); GH.add(rigH.g);
const PLY = .14, TOPY = PLY + O.OH; // dome apex
const onionH = O.mkOnion(false, 1); onionH.position.y = PLY; GH.add(onionH);
csh(GH, 3.1, 2.8, -.8, 0, .35);
const slitG = new THREE.Mesh(new THREE.BoxGeometry(.05, .03, 1), new THREE.MeshStandardMaterial({ color: "#3D3314", roughness: .5 })), slitF = new THREE.Mesh(new THREE.BoxGeometry(.05, .02, 1), new THREE.MeshPhysicalMaterial({ color: "#EFEBC4", roughness: .22, clearcoat: .8, emissive: "#E8E3B8", emissiveIntensity: .12 }));
GH.add(slitG, slitF);
const sprH = O.makeSpray(2600, noDepth, camera); GH.add(sprH.g);
// cut spray: a fan from the cut line (x ~ 0, along z), mostly up, wider and faster for a blunt blade
function cutBurst(sp, t0, zc, zlen, n, mul, spread, seed, s1, y0) {
  sp.burst({ t0, n, seed, s0: .009, s1: s1 || .04, pow: 3.0, dt: .09, k: .22, g: 2.3, life: 2.9,
    org: (i, r) => [(r(1) - .5) * .2, y0, zc + (r(2) - .5) * zlen * .55],
    vel: (i, r) => { const a = (r(3) - .5) * spread, v = (2.2 + 6.4 * Math.pow(r(4), 1.2)) * mul; return [(r(6) - .5) * .9, Math.cos(a) * v, Math.sin(a) * v * .95 + (r(7) - .5) * .5]; } }); }
cutBurst(sprH, T.C1 + .02, 0, 2.0, 700, 1.25, 1.9, 1, .075, TOPY); cutBurst(sprH, T.C1 + .28, 0, 1.4, 240, .6, 1.9, 2, .03, TOPY);
cutBurst(sprH, T.C2 + .02, 0, 2.0, 420, 1.05, 1.5, 3, .028, TOPY);
cutBurst(sprH, T.C3 + .02, 0, 2.0, 360, 1, 1.5, 4, .04, TOPY);
// the tracked droplet (b03): one big drop thrown across the frame
const TRK = { t0: T.C3 + .03, p: [.1, TOPY, -.2], v: [.4, 4.6, -3.4], s: .085, k: .5, g: 2.0, life: 7, tw: 1, gl: 1, gy: .12, f: 4 }; sprH.D.push(TRK);
cutBurst(sprH, T.C4 + .02, 0, 2.0, 420, 1, 1.5, 5, .042, TOPY);
cutBurst(sprH, T.C8 + .02, 0, 2.0, 520, 1.05, 1.6, 6, .042, TOPY); cutBurst(sprH, T.C8 + .3, 0, 1.4, 220, .6, 1.9, 7, .03, TOPY);
{ // lab context (out of focus): high-speed camera body + lens on a tripod, soft practical lights, more rig uprights
  const anod = new THREE.MeshStandardMaterial({ color: "#2D3035", metalness: .6, roughness: .4, envMapIntensity: 1.5 }), glass = new THREE.MeshPhysicalMaterial({ color: "#0B1218", metalness: 0, roughness: .03, clearcoat: 1, envMapIntensity: 4 });
  const hs = new THREE.Group(); hs.position.set(-6.4, 3.2, -3.4); GH.add(hs); var hsG = hs;
  const body = new THREE.Mesh(K.roundBox(1.9, 1.15, 1.3, .1, 4), anod), lens = new THREE.Mesh(new THREE.CylinderGeometry(.46, .52, 1.1, 32), anod), lg = new THREE.Mesh(new THREE.CircleGeometry(.4, 32), glass), ring = new THREE.Mesh(new THREE.TorusGeometry(.5, .05, 10, 32), new THREE.MeshStandardMaterial({ color: "#C8CDD3", metalness: 1, roughness: .25 }));
  lens.rotation.z = -PI / 2; lens.position.x = 1.45; lg.rotation.y = PI / 2; lg.position.x = 2.01; ring.rotation.y = PI / 2; ring.position.x = 2.0; hs.add(body, lens, lg, ring);
  const led = new THREE.Mesh(new THREE.SphereGeometry(.06, 8, 8), new THREE.MeshBasicMaterial({ color: "#FF5A3A" })); led.position.set(.7, .5, .66); hs.add(led);
  [[-.7, -3.2], [.7, -3.8]].forEach(([dz, dy]) => { const l = new THREE.Mesh(new THREE.CylinderGeometry(.05, .05, 3.3, 8), anod); l.position.set(-6.4 + dz * 1.2, 1.6, -3.4 + dz); l.rotation.z = dz * .12; GH.add(l); });
  [[-8.6, 4.6, -6.2, 2.2], [-8.4, 2.2, -.8, 1.4], [-8.4, 3.2, 2.6, 1.8], [-7.5, 1.4, -5.6, 1.0]].forEach(([x, y, z, w]) => { const q = quad(softTex, "#FFE2AE", true, .5); q.rotation.y = PI / 2; q.scale.set(w, w, 1); q.position.set(x, y, z); noDepth.push(q); GH.add(q); });
  [[-5.2, -5.4], [-5.2, 4.6]].forEach(([x, z]) => { const r = new THREE.Mesh(new THREE.CylinderGeometry(.07, .07, 7.5, 12), rigH.g.children[1].material); r.position.set(x, 3.75, z); GH.add(r); }); }
const ribTex = (() => { const c = document.createElement("canvas"); c.width = 256; c.height = 64; const x = c.getContext("2d"), g = x.createLinearGradient(0, 0, 256, 0); g.addColorStop(0, "rgba(255,236,190,0)"); g.addColorStop(.7, "rgba(255,240,205,.55)"); g.addColorStop(1, "rgba(255,252,235,1)"); x.fillStyle = g; x.fillRect(0, 0, 256, 64);
  x.globalCompositeOperation = "destination-in"; const gv = x.createLinearGradient(0, 0, 0, 64); gv.addColorStop(0, "rgba(0,0,0,0)"); gv.addColorStop(.5, "rgba(0,0,0,1)"); gv.addColorStop(1, "rgba(0,0,0,0)"); x.fillStyle = gv; x.fillRect(0, 0, 256, 64); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
const trail = quad(ribTex, "#FFFFFF", true, 0); trail.visible = false; noDepth.push(trail); GH.add(trail); const _bm = new THREE.Matrix4();
function ribbon(q, P0, P1, w, op) { const d = V(0, 0, 0).subVectors(P1, P0), len = d.length(); if (len < 1e-4 || op <= 0) { q.visible = false; return; } const x_ = d.clone().divideScalar(len), mid = P0.clone().add(P1).multiplyScalar(.5), tc = V(0, 0, 0).subVectors(camera.position, mid), z_ = tc.sub(x_.clone().multiplyScalar(tc.dot(x_))).normalize(), y_ = V(0, 0, 0).crossVectors(z_, x_);
  _bm.makeBasis(x_, y_, z_); q.quaternion.setFromRotationMatrix(_bm); q.position.copy(mid); q.scale.set(len, w, 1); q.material.opacity = op; q.visible = true; }
// b05 macro: one large droplet stretches, then bursts into fine satellite drops, which split again
const PM = [.35, 2.95, .1], sprM = O.makeSpray(1600, noDepth, camera); GH.add(sprM.g);
const bigDrop = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 28), new THREE.MeshPhysicalMaterial({ color: "#F6EBC6", roughness: .02, transparent: true, opacity: .72, clearcoat: 1, clearcoatRoughness: .02, envMapIntensity: 5.5, ior: 1.34, emissive: "#FFE2A0", emissiveIntensity: .1 })); GH.add(bigDrop);
sprM.streak = .9; sprM.burst({ t0: T.f1, n: 900, seed: 11, s0: .002, s1: .014, pow: 2.4, dt: .05, k: 1.6, g: .25, life: 4.5,
  org: (i, r) => { const a = r(1) * 6.28, b = Math.acos(2 * r(2) - 1), rr = .22 * Math.cbrt(r(3)); return [PM[0] + rr * Math.sin(b) * Math.cos(a) * 1.5, PM[1] + rr * Math.cos(b) * .8, PM[2] + rr * Math.sin(b) * Math.sin(a)]; },
  vel: (i, r) => { const a = r(4) * 6.28, b = Math.acos(2 * r(5) - 1), v = .5 + 2.6 * Math.pow(r(6), 1.2); return [Math.sin(b) * Math.cos(a) * v * 1.3, Math.cos(b) * v * .8, Math.sin(b) * Math.sin(a) * v]; } });
sprM.glAll = 1; sprM.burst({ t0: T.f2, n: 600, seed: 12, s0: .0015, s1: .009, pow: 2.0, dt: .35, k: 1.8, g: .2, life: 3.6,
  org: (i, r) => { const a = r(1) * 6.28, b = Math.acos(2 * r(2) - 1), rr = .15 + .55 * Math.cbrt(r(3)); return [PM[0] + rr * Math.sin(b) * Math.cos(a) * 1.5, PM[1] + rr * Math.cos(b) * .8, PM[2] + rr * Math.sin(b) * Math.sin(a)]; },
  vel: (i, r) => { const a = r(4) * 6.28, b = Math.acos(2 * r(5) - 1), v = .15 + .9 * r(6); return [Math.sin(b) * Math.cos(a) * v, Math.cos(b) * v * .8, Math.sin(b) * Math.sin(a) * v]; } });
// blade y (edge height) for a cut event: held high, falls, bites .5 into the dome, rises again
const PARK = 4.2, BITE = .52;
function bladeEdge(t, evs, top) { let y = PARK; for (const c of evs) { const tau = t - c; if (tau < -.65 || tau > 2.4) continue;
  if (tau < 0) y = Math.min(y, lerp(PARK, top + .02, Math.pow(clamp((tau + .65) / .65), 2.2))); else if (tau < .3) y = Math.min(y, top + .02 - BITE * eo3(tau / .3)); else if (tau < 1.2) y = Math.min(y, top + .02 - BITE); else y = Math.min(y, lerp(top + .02 - BITE, PARK, eio((tau - 1.2) / 1.2))); } return y; }
const slitAt = (t, evs) => { let a = 0; for (const c of evs) { const tau = t - c; if (tau > 0 && tau < 3) a = Math.max(a, smooth(tau / .2) * (1 - smooth((tau - 2.2) / .6))); } return a; };

// ---------- SLAB SET (b09): a cross-section of one onion layer: tough skin over soft flesh, pressed by a blade edge ----------
const SW = 4.8, SHF = 1.15, SHS = .26;
const skinSlabMat = new THREE.MeshPhysicalMaterial({ color: "#2C1A0C", roughness: .36, clearcoat: .7, clearcoatRoughness: .25, envMapIntensity: 1.6, bumpMap: new THREE.CanvasTexture((() => { const c = document.createElement("canvas"); c.width = 256; c.height = 32; const x = c.getContext("2d"); x.fillStyle = "#888"; x.fillRect(0, 0, 256, 32); for (let i = 0; i < 80; i++) { x.strokeStyle = `rgba(${hash(i) > .5 ? 40 : 200},${hash(i) > .5 ? 40 : 200},${hash(i) > .5 ? 40 : 200},.35)`; x.beginPath(); x.moveTo(0, hash(i * 3) * 32); x.lineTo(256, hash(i * 3) * 32 + 2); x.stroke(); } return c; })()), bumpScale: 1.2 });
const fleshTexC = (() => { const c = document.createElement("canvas"); c.width = 512; c.height = 256; const x = c.getContext("2d"), g = x.createLinearGradient(0, 0, 0, 256); g.addColorStop(0, "#F2F0CD"); g.addColorStop(1, "#E3E6B8"); x.fillStyle = g; x.fillRect(0, 0, 512, 256);
  for (let i = 0; i < 7; i++) { const r = 60 + i * 34; x.strokeStyle = `rgba(120,100,40,${.95 - i * .04})`; x.lineWidth = 5 + (i % 2) * 3; x.beginPath(); x.ellipse(256, 330, r * 1.9, r, 0, PI, 2 * PI); x.stroke(); x.strokeStyle = "rgba(255,255,240,.45)"; x.lineWidth = 6; x.beginPath(); x.ellipse(256, 330, r * 1.9 + 7, r + 7, 0, PI, 2 * PI); x.stroke(); }
  for (let i = 0; i < 900; i++) { x.fillStyle = `rgba(${hash(i * 2) > .5 ? "255,255,235" : "170,160,100"},${.05 + .06 * hash(i)})`; x.fillRect(hash(i * 3) * 512, hash(i * 5) * 256, 3 + 14 * hash(i * 7), 1.2); } const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
const fleshCT = K.cellTexture({ n: 7, seed: 4, wall: "#FFF8E2", wallIn: "#F3E8C2", c0: "#F8EFD4", c1: "#E9DAAE", vac: "#FBF4DC", wallW: .06 }); fleshCT.tex.repeat.set(2.4, .6);
const fleshMat = new THREE.MeshPhysicalMaterial({ map: fleshCT.tex, roughness: .3, clearcoat: .6, clearcoatRoughness: .2, emissive: "#EFDFAE", emissiveMap: fleshCT.tex, emissiveIntensity: .22 });
const skinGeo = new THREE.BoxGeometry(SW, SHS, 1.3, 81, 1, 1), fleshGeo = new THREE.BoxGeometry(SW, SHF, 1.3, 81, 8, 1);
const skinM = new THREE.Mesh(skinGeo, skinSlabMat), fleshM = new THREE.Mesh(fleshGeo, fleshMat); skinM.castShadow = fleshM.castShadow = skinM.receiveShadow = fleshM.receiveShadow = true; GS.rotation.y = PI / 2; GS.add(skinM, fleshM); { const sk2 = new THREE.Mesh(new THREE.BoxGeometry(SW, SHS * .6, 1.3), skinSlabMat); sk2.position.y = -.1; sk2.receiveShadow = true; GS.add(sk2); }
[skinGeo, fleshGeo].forEach(g => (g.userData.o = g.attributes.position.array.slice()));
const bladeS = O.mkBlade({ L: 1.9, H: 1.6, t: .1, tE: .004, bev: .26 }), holderS = new THREE.Group(); holderS.rotation.y = PI / 2; bladeS.position.x = -.95; holderS.add(bladeS); GS.add(holderS);
const sprS = O.makeSpray(700, noDepth, camera); GS.add(sprS.g);
const SKY = SHF + SHS / 2 + .02; // skin top y when flat
function defSlab(t) { // returns dimple depth, rupture opening, rise
  const press = smooth((t - T.sSkin) / (T.sFlesh - T.sSkin + .6)) * .12 + smooth((t - T.sFlesh) / (T.sBurst - T.sFlesh)) * .34, open = smooth((t - T.sBurst) / .22);
  return { d: press * (1 - .3 * open), open, rise: open * smooth((t - T.sBurst) / .5) * (1 - .5 * smooth((t - T.sBurst - 1.4) / 1)) }; }
function animSlab(t) {
  const { d, open, rise } = defSlab(t), gap = open * .26, sg = .55 + .35 * open;
  const run = (geo, isSkin) => { const o = geo.userData.o, p = geo.attributes.position, h = isSkin ? SHS : SHF;
    for (let i = 0; i < p.count; i++) { let x = o[i * 3], y = o[i * 3 + 1], z = o[i * 3 + 2]; const f = isSkin ? 1 : (y + h / 2) / h, gx = Math.exp(-Math.pow(x / sg, 2)), base = isSkin ? SHF : 0;
      let dy = -d * gx * (isSkin ? 1 : .15 + .85 * f * f); const sq = isSkin ? 0 : (1 - f) * 0; x += Math.sign(x) * (isSkin ? gap * Math.exp(-Math.pow(x / .5, 2)) : gap * .5 * Math.exp(-Math.pow(x / .6, 2)) * f) + (isSkin ? 0 : x * .05 * smooth(d * 3) * f * (1 - Math.abs(x) / (SW / 2)));
      if (!isSkin) dy += rise * .45 * gx * f * f;
      p.setXYZ(i, x, y + base + (isSkin ? SHS / 2 : h / 2) + dy, z); } p.needsUpdate = true; geo.computeVertexNormals(); };
  run(skinGeo, true); run(fleshGeo, false);
  const by = SKY + (1 - smooth((t - S("b09")) / 1.2)) * 1.6 - d * 1.0 * (1 - smooth((t - T.sBurst - .6) / .8)) - .02;
  holderS.position.set(0, by + (smooth((t - T.sBurst - 1.1) / 1.3)) * 2.6, 0); }
sprS.burst({ t0: T.sBurst + .02, n: 420, seed: 21, s0: .012, s1: .05, pow: 2.2, dt: .07, k: .3, g: 2.6, life: 2.6,
  org: (i, r) => [(r(1) - .5) * .5, SKY + .05, (r(2) - .5) * 1.0], vel: (i, r) => { const a = (r(3) - .5) * 2.2, v = 1.6 + 4.6 * Math.pow(r(4), 1.2); return [Math.sin(a) * v, Math.cos(a) * v, (r(7) - .5) * 1.4]; } });

const eyeSet = (t, a, p) => { // small grounded eye: placed on screen at (215, 360) of the b08 camera, shaded by the scene lights
  eyeS.visible = a > .01; if (!eyeS.visible) return; camera.updateMatrixWorld(true); const f = V(0, 0, -1).applyQuaternion(camera.quaternion), rt_ = V(1, 0, 0).applyQuaternion(camera.quaternion), up_ = V(0, 1, 0).applyQuaternion(camera.quaternion), d = 7, th = Math.tan(camera.fov * PI / 360);
  eyeS.position.copy(camera.position).addScaledVector(f, d).addScaledVector(rt_, -.6 * th * d * 1080 / 1920).addScaledVector(up_, .625 * th * d); eyeS.quaternion.copy(camera.quaternion); eyeS.scale.setScalar(.4 * a * (.75 + .25 * eob(p))); };
// ---------- SPLIT SET (b10-b11): blunt (screen-left, +z) vs sharp (screen-right, -z) ----------
const ZB = 1.5, ZSH = -1.5;
const rigB = O.mkRig({ blunt: true, base: false }), rigSh = O.mkRig({ blunt: false, base: false }); rigB.g.position.z = ZB; rigSh.g.position.z = ZSH; GP.add(rigB.g, rigSh.g);
const onB = O.mkOnion(false, 3), onSh = O.mkOnion(false, 4); onB.position.set(0, 0, ZB); onSh.position.set(0, 0, ZSH); GP.add(onB, onSh); csh(GP, 1.9, 1.7, 0, ZB, .4); csh(GP, 1.9, 1.7, 0, ZSH, .4);
const sprB = O.makeSpray(1800, noDepth, camera), sprSh = O.makeSpray(900, noDepth, camera); GP.add(sprB.g, sprSh.g); const TOP2 = O.OH;
cutBurst(sprB, T.D1 + .02, ZB, 2.2, 640, 1.35, 2.1, 31, .052, TOP2); cutBurst(sprSh, T.D1 + .02, ZSH, 1.6, 150, .62, 1.0, 32, .028, TOP2);
cutBurst(sprB, T.D2 + .02, ZB, 2.2, 880, 1.55, 2.3, 33, .055, TOP2); cutBurst(sprSh, T.D3 + .02, ZSH, 1.6, 160, .6, 1.0, 34, .028, TOP2);
const slit2 = [0, 1].map(() => { const a = new THREE.Mesh(new THREE.BoxGeometry(.05, .03, 1), slitG.material), b = new THREE.Mesh(new THREE.BoxGeometry(.05, .02, 1), slitF.material); GP.add(a, b); return [a, b]; });

// ---------- OVERHEAD SET (dive in b06, then b12-b14 + cover) ----------
const place = (o, x, z, ry) => { o.position.x = x; o.position.z = z; o.rotation.y += ry; return o; };
const onCut = place(O.mkOnion(true, 5), -.75, -2.5, .35), onDome = place(O.mkOnion(false, 6), 1.1, -1.9, -.5); GO.add(onCut, onDome); const shC = csh(GO, 1.7, 1.6, -.75, -2.5, .38), shD = csh(GO, 1.7, 1.6, 1.1, -1.9, .38);
const chef = O.mkChef(true); chef.rotation.set(-PI / 2, -PI / 2 - .15, 0); chef.position.set(-1.9, .1, 1.7); GO.add(cast(chef)); chef.visible = false;
const chefFlat = new THREE.Group(), chefFl = O.mkChef(true); chefFl.rotation.x = -PI / 2; chefFlat.add(chefFl); chefFlat.scale.setScalar(.6); chefFlat.rotation.y = PI / 2 - .12; chefFlat.position.set(1.55, .1, 3.1); chefFl.traverse(m => { if (m.material && m.material.metalness === 1 && m.material.roughnessMap) m.material.envMapIntensity = 1.5; }); GO.add(cast(chefFlat)); // the sharp knife, flat on the counter, edge toward the viewer
const chefC = new THREE.Group(), chefIn = O.mkChef(true); chefIn.rotation.y = PI; chefC.add(chefIn); chefC.visible = false; GO.add(cast(chefC)); chefC.scale.setScalar(.8);
const spillG = []; // a few settled droplets near the cut half
const spillGrp = new THREE.Group(); GO.add(spillGrp); for (let i = 0; i < 14; i++) { const d = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10), sprH.im.material); d.scale.set(.03 + .04 * hash(i), .014 + .01 * hash(i * 3), .03 + .04 * hash(i * 5)); d.position.set(-.1 + (hash(i * 7) - .5) * 2.8, .02, -1.9 + (hash(i * 9) - .5) * 2.2); spillGrp.add(d); }
// the card (b12 / b13): Butter, "droplets ✓ / tears ?", then a stamp under it
const cardG = new THREE.Group(); GO.add(cardG);
{ const base = new THREE.Mesh(K.roundBox(3.9, .1, 2.6, .06, 4), new THREE.MeshStandardMaterial({ color: "#E9B535", roughness: .6 })); base.position.y = .05; base.castShadow = base.receiveShadow = true; cardG.add(base);
  const mkTex = (w, h, fn) => { const c = document.createElement("canvas"); c.width = w; c.height = h; const x = c.getContext("2d"); fn(x, w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; };
  const t1 = mkTex(1024, 640, (x, w, h) => { x.fillStyle = C.cast; x.textBaseline = "alphabetic"; x.font = `800 150px "Rubik"`; x.fillText("droplets", 70, 190); x.strokeStyle = C.herb; x.lineWidth = 34; x.lineCap = x.lineJoin = "round"; x.beginPath(); x.moveTo(790, 120); x.lineTo(842, 172); x.lineTo(940, 60); x.stroke();
    x.fillStyle = C.cast; x.fillText("tears", 70, 420); x.fillStyle = C.tomato; x.fillText("?", 640, 420); });
  const pl1 = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 2.25), new THREE.MeshBasicMaterial({ map: t1, transparent: true, toneMapped: false })); pl1.rotation.x = -PI / 2; pl1.position.set(0, .104, -.15); cardG.add(pl1);
  const t2 = mkTex(1024, 220, (x, w, h) => { x.strokeStyle = C.tomato; x.lineWidth = 12; x.beginPath(); x.roundRect(14, 14, w - 28, h - 28, 34); x.stroke(); x.fillStyle = C.tomato; x.font = `800 84px "Rubik"`; x.textAlign = "center"; x.fillText("one study · one lab", w / 2, 142); });
  const pl2 = new THREE.Mesh(new THREE.PlaneGeometry(3.4, .73), new THREE.MeshBasicMaterial({ map: t2, transparent: true, toneMapped: false })); pl2.rotation.x = -PI / 2; pl2.position.set(0, .106, .86); cardG.add(pl2); cardG.userData = { pl1, pl2 }; }
const sprO = O.makeSpray(700, noDepth, camera); GO.add(sprO.g);
sprO.burst({ t0: 0, n: 460, seed: 41, s0: .012, s1: .05, pow: 2.3, dt: .05, k: .3, g: 2.0, life: 3,
  org: (i, r) => [-.75 + (r(1) - .5) * 1.6, O.OH + .05, -2.5 + (r(2) - .5) * 2.2], vel: (i, r) => { const a = (r(3) - .5) * 1.9, v = 1.2 + 4.2 * Math.pow(r(4), 1.3); return [Math.sin(a) * v * .8 + (r(6) - .5), Math.cos(a) * v, (r(7) - .5) * 1.8]; } });

// ============================================================ CELL WORLD (b06) ============================================================
const MY = { cell: -200, eye: -300 };
const gC = new THREE.Group(); scene.add(gC); gC.position.y = MY.cell; const Gm = new THREE.Group(); gC.add(Gm); noDepth.push(Gm);
const cellT = K.cellTexture({ n: 5, seed: 8, wall: "#FFF8E4", wallIn: "#F3E8C6", c0: "#F8EFD6", c1: "#EAD9AE", vac: "#FBF4DE", wallW: .07 }); cellT.tex.repeat.set(3, 3);
{ const p = new THREE.Mesh(new THREE.PlaneGeometry(48, 48), new THREE.MeshStandardMaterial({ map: cellT.tex, emissiveMap: cellT.tex, emissive: "#ffffff", emissiveIntensity: .6, roughness: .8 })); p.position.set(0, 0, -6); gC.add(p); }
function cellCentres(cell, W_, H_) { const Ts = 16, out = []; for (let cj = 0; cj < 3; cj++) for (const ci of [1]) cell.pts.forEach((p, k) => { const x = (ci - 1.5 + p[0]) * Ts, y = (1.5 - cj - p[1]) * Ts; if (Math.abs(x) < W_ && Math.abs(y) < H_) out.push([x, y, k]); }); return out; }
const cc = cellCentres(cellT, 6.6, 11.5);
const molGeo = (cols) => { const parts = [[0, 0, 0, 1], [1.05, .35, .1, .68], [-.7, .8, .2, .58]].map(([x, y, z, r]) => { const g = new THREE.SphereGeometry(r * .5, 20, 14); g.translate(x * .5, y * .5, z * .5); return g; }); const g = K.merge(parts); g.computeVertexNormals(); return g; };
const shardGeo = molGeo(); // smooth ball cluster = a sulfur compound
const sulfMat = new THREE.MeshPhysicalMaterial({ color: "#F0B400", emissive: "#9A6400", emissiveIntensity: .45, roughness: .18, metalness: .05, clearcoat: 1, clearcoatRoughness: .1 });
const irrGeo = (() => { const g = molGeo(); K.mapVerts(g, (x, y, z) => [x * 1.7, y * 1.3, z * 1.3]); g.computeVertexNormals(); return g; })();
const irrMat = new THREE.MeshPhysicalMaterial({ color: "#C8412A", emissive: "#B53A25", emissiveIntensity: .6, roughness: .16, clearcoat: 1, clearcoatRoughness: .08 });
// crack site: the two cells closest to the origin, plus the ring of neighbours whose sulfur compounds run to it
const nearC = cc.map(c => ({ c, d: Math.hypot(c[0], c[1] + 1) })).sort((a, b) => a.d - b.d); const cA = nearC[0].c, cB = nearC[1].c;
const CK = [(cA[0] + cB[0]) / 2, (cA[1] + cB[1]) / 2], ckDir = [-(cB[1] - cA[1]), cB[0] - cA[0]], ckL = Math.hypot(...ckDir); ckDir[0] /= ckL; ckDir[1] /= ckL;
const SHARDS = []; cc.forEach((c, ci) => { for (let k = 0; k < 4; k++) { const a = hash(ci * 7 + k) * 6.28, r = .15 + .6 * hash(ci * 11 + k * 3); SHARDS.push({ x: c[0] + Math.cos(a) * r, y: c[1] + Math.sin(a) * r * .9, z: -5.4 + hash(ci * 13 + k) * 1.2, s: .7 + .45 * hash(ci * 5 + k * 9), ph: hash(ci * 3 + k), cell: ci }); } });
for (let i = 0; i < 8; i++) SHARDS.push({ x: (hash(i * 3) - .5) * 11, y: (hash(i * 5) - .5) * 18, z: 3 + hash(i * 7) * 3, s: .3 + .3 * hash(i * 9), ph: hash(i * 11), cell: -1, fg: true });
const near = SHARDS.map((s, i) => ({ i, d: Math.hypot(s.x - CK[0], s.y - CK[1]) })).filter(o => !SHARDS[o.i].fg).sort((a, b) => a.d - b.d).slice(0, 16); near.forEach((o, k) => { const s = SHARDS[o.i]; s.conv = k; s.tx = CK[0] + ckDir[0] * (hash(k * 3) - .5) * 2.2 + (hash(k * 5) - .5) * .5; s.ty = CK[1] + ckDir[1] * (hash(k * 3) - .5) * 2.2 + (hash(k * 7) - .5) * .5; s.tz = -5.1 + hash(k) * .5; });
const NS_ = SHARDS.length, shardIM = new THREE.InstancedMesh(shardGeo, sulfMat, NS_), irrIM = new THREE.InstancedMesh(irrGeo, irrMat, near.length); shardIM.frustumCulled = irrIM.frustumCulled = false; gC.add(shardIM, irrIM);
const crackPts = []; for (let k = 0; k <= 10; k++) { const u = (k / 10 - .5) * 3.4; crackPts.push(V(CK[0] + ckDir[0] * u + (hash(k * 3) - .5) * .35 * (k % 2 ? 1 : -1), CK[1] + ckDir[1] * u + (hash(k * 5) - .5) * .35, -5.5)); }
const crackMat = new THREE.MeshBasicMaterial({ color: new THREE.Color("#FFF4C8").multiplyScalar(2), toneMapped: false }); const crack = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(crackPts), 60, .075, 6, false), crackMat); gC.add(crack);
const crackN = crack.geometry.index.count, crackGlow = quad(softTex, "#FFE9A8", true, 0); crackGlow.position.set(CK[0], CK[1], -5.3); crackGlow.scale.set(5, 5, 1); Gm.add(crackGlow);
const gapG = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ color: "#8E8A55", transparent: true, opacity: 0, depthWrite: false })); gapG.position.set(CK[0], CK[1], -5.7); gapG.rotation.z = Math.atan2(ckDir[1], ckDir[0]); gapG.scale.set(3.6, .001, 1); gC.add(gapG);
const flashes = near.map((o, k) => { const q = quad(softTex, "#FFE08A", true, 0); q.scale.set(1.6, 1.6, 1); Gm.add(q); return q; });
const blobsC = []; for (let i = 0; i < 8; i++) { const q = quad(softTex, "#FFF1BE", true, .12 + .1 * hash(i)); const s = 2 + hash(i * 3) * 3; q.scale.set(s, s, 1); q.position.set((hash(i * 5) - .5) * 10, (hash(i * 7) - .5) * 14, -2 - hash(i) * 3); q.userData.b = q.position.clone(); Gm.add(q); blobsC.push(q); }
const Mx = new THREE.Matrix4(), Qq = new THREE.Quaternion(), Eu = new THREE.Euler();
function animCells(t, A) {
  const lt = t - T.cellIn, cz = lerp(11.8, 9.6, smooth(lt / (S("b07") - T.cellIn))), grow = smooth((t - T.tBreak) / .9), reactU = smooth((t - T.tReact) / 1.0), conv = smooth((t - T.tReact + .1) / .9);
  setCam([Math.sin(lt * .25) * .3, MY.cell + Math.cos(lt * .2) * .25, cz], [0, MY.cell + .4, -4.5], 35, [0, MY.cell, -5.2], .004);
  mLight.position.set(1.5, MY.cell + 3, cz - 2); mLight.intensity = 55;
  crack.geometry.setDrawRange(0, Math.floor(crackN * grow / 3) * 3); crackGlow.material.opacity = .55 * grow * (1 - .5 * smooth((t - T.tReact - 1) / 1)) + .5 * Math.exp(-Math.pow((t - T.tReact - .9) / .25, 2));
  gapG.scale.y = .02 + .35 * grow; gapG.material.opacity = .5 * grow;
  let ki = 0;
  for (let i = 0; i < NS_; i++) { const s = SHARDS[i]; let x = s.x + Math.sin(t * .5 + s.ph * 6) * .08, y = s.y + Math.cos(t * .4 + s.ph * 5) * .08, z = s.z, sc = s.s * (s.fg ? 1 : 1) * smooth((t - T.cellIn + hash(i) * .3) / .4);
    if (s.conv != null) { const u = conv * (0.75 + .25 * hash(i)); x = lerp(x, s.tx, u); y = lerp(y, s.ty, u); z = lerp(z, s.tz, u); if (t > T.tReact + .85 + s.conv * .02) sc = 0; }
    Eu.set(s.ph * 6, t * .3 + s.ph * 3, s.ph * 2); Qq.setFromEuler(Eu); Mx.compose(V(x, y, z), Qq, V(sc, sc, sc)); shardIM.setMatrixAt(i, Mx); }
  shardIM.instanceMatrix.needsUpdate = true;
  near.forEach((o, k) => { const s = SHARDS[o.i], tc = T.tReact + .85 + s.conv * .02, u = clamp((t - tc) / .5), rise = Math.max(0, t - tc);
    const x = s.tx + Math.sin(rise * .8 + k) * .5 + rise * (s.conv % 2 ? .3 : -.3), y = s.ty + rise * 1.2, z = s.tz + rise * 1.1, sc = .62 * eob(u) * (1 + .08 * Math.sin(t * 5 + k));
    Eu.set(k, t * .6 + k, k * .3); Qq.setFromEuler(Eu); Mx.compose(V(x, y, z), Qq, V(sc, sc, sc)); irrIM.setMatrixAt(k, Mx);
    const fl = flashes[k]; fl.position.set(s.tx, s.ty, s.tz + .3); fl.material.opacity = .85 * Math.exp(-Math.pow((t - tc) / .18, 2)); });
  irrIM.instanceMatrix.needsUpdate = true;
  blobsC.forEach((q, i) => { q.position.x = q.userData.b.x + Math.sin(t * .2 + i) * .6; q.position.y = q.userData.b.y + Math.cos(t * .15 + i) * .5; });
  A.proj = projector(); A.sulf = A.proj(SHARDS[near[0].i].x, MY.cell + SHARDS[near[0].i].y, SHARDS[near[0].i].z); A.irr = A.proj(CK[0], MY.cell + CK[1] + 1.2, -3.8); A.cell = { x: A.proj(cA[0], MY.cell + cA[1] - 1.6, -6) };
}

// ============================================================ EYE WORLD (b07): stylised cornea macro ============================================================
const gE = new THREE.Group(); scene.add(gE); gE.position.y = MY.eye;
const eyeG = new THREE.Group(); gE.add(eyeG); eyeG.rotation.set(.1, -.42, 0);
{ const irisC = document.createElement("canvas"); irisC.width = irisC.height = 512; const x = irisC.getContext("2d"), g = x.createRadialGradient(256, 256, 40, 256, 256, 256); g.addColorStop(0, "#5B7A5A"); g.addColorStop(.45, "#7C8F5A"); g.addColorStop(.8, "#8A6A3A"); g.addColorStop(1, "#2C2A25"); x.fillStyle = g; x.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 520; i++) { const a = hash(i * 2.1) * 6.28, r0 = 50 + 40 * hash(i * 3), r1 = 190 + 60 * hash(i * 5); x.strokeStyle = `rgba(${hash(i) > .5 ? "230,220,170" : "40,50,30"},${.08 + .2 * hash(i * 7)})`; x.lineWidth = .8 + 1.4 * hash(i * 9); x.beginPath(); x.moveTo(256 + Math.cos(a) * r0, 256 + Math.sin(a) * r0); x.lineTo(256 + Math.cos(a + (hash(i * 11) - .5) * .12) * r1, 256 + Math.sin(a + (hash(i * 11) - .5) * .12) * r1); x.stroke(); }
  x.fillStyle = "#0A0908"; x.beginPath(); x.arc(256, 256, 74, 0, 6.3); x.fill(); const it = new THREE.CanvasTexture(irisC); it.colorSpace = THREE.SRGBColorSpace;
  const sclera = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 48, 0, PI * 2, .49, PI - .49).rotateX(PI / 2), new THREE.MeshPhysicalMaterial({ color: "#EFE9DF", roughness: .34, clearcoat: .5, clearcoatRoughness: .3 })); eyeG.add(sclera);
  const irisGeo = new THREE.CircleGeometry(.48, 64); K.mapVerts(irisGeo, (px, py, pz) => [px, py, .78 + .06 * (1 - Math.hypot(px, py) / .48)]);
  const iris = new THREE.Mesh(irisGeo, new THREE.MeshStandardMaterial({ map: it, roughness: .45, emissive: "#ffffff", emissiveMap: it, emissiveIntensity: .12 })); eyeG.add(iris);
  const cornea = new THREE.Mesh(new THREE.SphereGeometry(.62, 72, 56), new THREE.MeshPhysicalMaterial({ color: "#ffffff", transparent: true, opacity: .17, roughness: .015, metalness: 0, clearcoat: 1, clearcoatRoughness: .01, envMapIntensity: 3.8, ior: 1.376, depthWrite: false })); cornea.position.z = .38; eyeG.add(cornea); noDepth.push(cornea);
  const skin = new THREE.MeshStandardMaterial({ color: "#DDA98A", roughness: .55, emissive: "#7A3F30", emissiveIntensity: .08 });
  const up = new THREE.Mesh(new THREE.SphereGeometry(1.07, 64, 40, 0, PI * 2, 0, 1.0), skin); up.rotation.x = -.36; eyeG.add(up);
  const lo = new THREE.Mesh(new THREE.SphereGeometry(1.07, 64, 40, 0, PI * 2, PI - .85, .85), skin); lo.rotation.x = .1; eyeG.add(lo);
  cast(eyeG); var eyeS = eyeG.clone(true); eyeS.traverse(m => { if (m.isMesh && m.material.color && m.material.color.getHexString() === "dda98a") m.visible = false; }); eyeS.traverse(m => { if (m.isMesh && m.material.transparent) noDepth.push(m); });
  var tearM = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 20), new THREE.MeshPhysicalMaterial({ color: "#CFE3F0", roughness: .0, transparent: true, opacity: .8, clearcoat: 1, clearcoatRoughness: 0, envMapIntensity: 9, ior: 1.33, emissive: "#9DB9CC", emissiveIntensity: .12 })); eyeG.add(tearM);
  tearM.material.onBeforeCompile = sh => { sh.fragmentShader = sh.fragmentShader.replace("#include <opaque_fragment>", `#include <opaque_fragment>
    { float fr = pow(1.0 - abs(dot(normalize(normal), normalize(vViewPosition))), 1.6); gl_FragColor.a = clamp(mix(.28, 1.0, fr), 0., 1.); gl_FragColor.rgb *= mix(.7, 1.3, fr); }`); };
  var lidWet = new THREE.Mesh(new THREE.TorusGeometry(.8, .014, 8, 64, 1.9), new THREE.MeshPhysicalMaterial({ color: "#DCEBF4", roughness: 0, transparent: true, opacity: .55, clearcoat: 1, envMapIntensity: 7 })); lidWet.rotation.set(0, 0, PI + (PI - 1.9) / 2 + 0); lidWet.position.z = .6; eyeG.add(lidWet);
  var irrE = new THREE.Mesh(irrGeo, irrMat); eyeG.add(irrE);
  var ripple = new THREE.Mesh(new THREE.TorusGeometry(1, .02, 8, 48), new THREE.MeshBasicMaterial({ color: new THREE.Color("#FFF1B8").multiplyScalar(1.6), transparent: true, opacity: 0, toneMapped: false, depthWrite: false })); eyeG.add(ripple); noDepth.push(ripple);
  var nerves = [], nerveMat = new THREE.MeshBasicMaterial({ color: new THREE.Color("#F3C54B"), transparent: true, opacity: .2, toneMapped: false, depthWrite: false });
  for (let i = 0; i < 6; i++) { const a = i * 1.05 + .3, pts = []; for (let k = 0; k <= 12; k++) { const ph = lerp(.85, .15, k / 12), wob = Math.sin(k * 1.3 + i * 2) * .05 * (k / 12), aa = a + wob; pts.push(V(Math.sin(ph) * Math.cos(aa) * .64, Math.sin(ph) * Math.sin(aa) * .64, .38 + Math.cos(ph) * .64)); }
    const cu = new THREE.CatmullRomCurve3(pts), m = new THREE.Mesh(new THREE.TubeGeometry(cu, 36, .0065, 5, false), nerveMat); eyeG.add(m); noDepth.push(m); nerves.push(cu); }
  var pulses = []; for (let i = 0; i < 12; i++) { const p = new THREE.Mesh(new THREE.SphereGeometry(.024, 10, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color("#FFE9A0").multiplyScalar(2.2), transparent: true, opacity: 0, toneMapped: false, depthWrite: false })); eyeG.add(p); noDepth.push(p); pulses.push(p); }
}
GH.add(eyeS); eyeS.visible = false;
const eyeCam = [{ t: 0, p: [.5, MY.eye + .15, 5.4], l: [0, MY.eye, .9], f: 70, fp: [0, MY.eye, 1], ap: .004 }];
function animEye(t, A) {
  const lt = t - S("b07"), push = eio(lt / (S("b08") - S("b07")));
  eyeG.updateMatrixWorld(true); const tg = eyeG.localToWorld(V(0, 0, .9)), pull = smooth((t - (T.tTear - .7)) / .9); setCam([tg.x + lerp(.9, .35, push), tg.y + lerp(.3, .08, push) - .35 * pull, tg.z + lerp(4.7, 2.2, push) + 3.0 * pull], [tg.x, tg.y - .6 * pull, tg.z - .3 * pull], lerp(66, 84, push) - 10 * pull, [tg.x, tg.y - .5 * pull, tg.z], .01);
  mLight.position.set(2, MY.eye + 3, 4); mLight.intensity = 38;
  const tTouch = T.tSw + .6, ap = clamp((t - S("b07") - .15) / (tTouch - S("b07") - .15)), ia = eio(ap);
  const ip = V(lerp(.7, 0, ia), lerp(1.1, .02, ia), lerp(3.3, 1.07, ia)); irrE.position.copy(ip); irrE.scale.setScalar(.16 * (1 - smooth((t - tTouch - .35) / .5))); irrE.rotation.set(t * .7, t * .5, 0);
  const rp = clamp((t - tTouch) / .9); ripple.position.set(0, 0, 1.012); ripple.scale.setScalar(.04 + .55 * eo3(rp)); ripple.material.opacity = (1 - rp) * .9 * (rp > 0 ? 1 : 0);
  const lit = smooth((t - tTouch) / .4); nerveMat.opacity = .2 + .55 * lit;
  pulses.forEach((p, i) => { const k = i % 6, u = ((t - tTouch) * 1.5 + Math.floor(i / 6) * .5 + k * .05) % 1; if (t < tTouch) { p.material.opacity = 0; return; } p.position.copy(nerves[k].getPoint(1 - u)); p.material.opacity = Math.sin(PI * u) * lit; });
  const tu = clamp((t - (T.tTear - .25)) / .5), roll = clamp((t - T.tTear - .3) / 1.25), psi = lerp(-.6, -1.2, eio(roll)), rr_ = 1.1 + .05 * (1 - roll);
  tearM.position.set(.16 + .06 * roll, rr_ * Math.sin(psi), rr_ * Math.cos(psi)); const sz = .11 * eob(tu) * (1 + .25 * roll); tearM.scale.set(sz, sz * (1 + .9 * roll), sz); tearM.rotation.x = -psi; tearM.visible = tu > 0;
  A.proj = projector(); A.cornea = (() => { const e_ = eyeG.localToWorld(V(-.36, .3, .74)); return A.proj(e_.x, e_.y, e_.z); })(); A.tear = A.proj(tearM.position.x, MY.eye + tearM.position.y, tearM.position.z);
}

// ============================================================ STAGE ============================================================
const zoneAt = t => t < S("b06") ? "hero" : t < T.cellIn ? "over" : t < S("b07") ? "cells" : t < S("b08") ? "eye" : t < S("b09") ? "hero" : t < S("b10") ? "slab" : t < S("b12") ? "split" : "over";
const setKey = (x, z, hi = 8.4) => { key.position.set(x - 3, hi, z + 8); key.target.position.set(x, 0, z); key.target.updateMatrixWorld(); rim.position.set(x - 10, 7, z - 3); rim.target.position.set(x, 1.5, z); rim.target.updateMatrixWorld(); };
const HC = (k) => k; // hero camera keys (camera on +x looking toward the wall, onion axis horizontal)
const camHero = [{ t: 0, p: [5.9, 2.0, 2.7], l: [0, 1.8, -.1], f: 38, fp: [0, 1.4, 0], ap: .006 }, { t: 3.4, p: [5.1, 1.9, 2.3], l: [0, 1.9, -.1], f: 42, fp: [0, 1.5, 0], ap: .007 }];
function stage(t, A) {
  const z = zoneAt(t), kz = z === "hero" || z === "slab" || z === "split" || z === "over"; A.zone = z;
  GK.visible = kz; GH.visible = z === "hero"; GS.visible = z === "slab"; GP.visible = z === "split"; GO.visible = z === "over"; gC.visible = z === "cells"; gE.visible = z === "eye"; key.visible = rim.visible = kz; mLight.intensity = 0;
  filmPass.uniforms.fall.value = kz ? .06 : .12; filmPass.uniforms.vig.value = kz ? .12 : TH.look.vig; filmPass.uniforms.halK.value = kz ? .05 : TH.look.hal; bloom.strength = kz ? .12 : .45; bloom.radius = .55; bloom.threshold = kz ? 1.0 : .85; bokeh.enabled = true;
  renderer.toneMappingExposure = z === "over" ? .95 : 1.08; scene.background.set(kz ? "#2B2119" : z === "cells" ? "#CFC9A0" : "#4A2E26");
  const evs = [T.C1, T.C2, T.C3, T.C4, T.C8];
  if (z === "hero") {
    setKey(0, 0); const ed = bladeEdge(t, evs, TOPY); rigH.carr.position.y = ed; const sl = slitAt(t, evs); slitG.visible = slitF.visible = sl > .01; slitG.scale.set(1, 1, 1.9 * sl); slitG.scale.x = .5 + 1.8 * sl; slitF.scale.set(1.2 + 1.8 * sl, 1, 1.9 * sl); slitG.position.set(0, TOPY, 0); slitF.position.set(0, TOPY + .008, 0);
    sprH.update(t); sprM.update(t);
    const mac = t >= S("b05") && t < S("b06"); sprM.g.visible = mac; bigDrop.visible = mac;
    // macro droplet: stretches into a ligament, then bursts
    { const u = clamp((t - T.f0) / (T.f1 - T.f0)), sw = Math.sin(t * 9) * .02 * u; bigDrop.position.set(PM[0], PM[1], PM[2]); bigDrop.scale.set(.34 * (1 + .55 * eio(u)) , .34 * (1 - .22 * eio(u)) * (1 + sw), .34 * (1 - .15 * eio(u))); bigDrop.visible = mac && t < T.f1 + .02; }
    // tracked drop trail
    const tp = V(0, 0, 0); sprH.pos(TRK, t - TRK.t0, tp); const trk = t > TRK.t0 && t < S("b04");
    if (trk) ribbon(trail, sprH.pos(TRK, Math.max(0, t - TRK.t0 - .16), V(0, 0, 0)), sprH.pos(TRK, t - TRK.t0, V(0, 0, 0)), .16, .8 * smooth((t - TRK.t0) / .1)); else trail.visible = false;
    hsG.visible = t >= S("b04") && t < S("b05"); if (t < S("b08") || t >= S("b09")) eyeS.visible = false;
    let c;
    if (t < S("b02")) { c = path(camHero, t); const sh = Math.exp(-(t - T.C1) * 7) * (t > T.C1 ? 1 : 0) * .035; camera.position.y += Math.sin(t * 90) * sh; camera.position.x += Math.cos(t * 70) * sh; camera.updateMatrixWorld(true); }
    else if (t < S("b03")) { const u = eio((t - S("b02")) / (T.C2 - .15 - S("b02"))); c = { p: [lerp(2.2, .3, u), lerp(3.6, 1.12, u), lerp(8.6, 7.6, u)] }; setCam(c.p, [0, lerp(1.7, 1.18, u), 0], lerp(46, 58, u), [0, 1.1, 0], lerp(.006, .01, u)); const sh = Math.exp(-(t - T.C2) * 7) * (t > T.C2 ? 1 : 0) * .02; camera.position.y += Math.sin(t * 90) * sh; camera.updateMatrixWorld(true); }
    else if (t < S("b04")) { const lag = clamp((t - TRK.t0) / .5), tt_ = Math.max(t, TRK.t0), P = sprH.pos(TRK, tt_ - TRK.t0, V(0, 0, 0)), L0 = V(0, TOPY + .3, 0), Lk = L0.clone().lerp(P, .97 * lag); Lk.y = Math.max(Lk.y, 1.5); const cp_ = Lk.clone().add(V(3.7 + 1.3 * (1 - lag), .5, 0)), cp = Lk.clone().add(V(3.7 + 1.3 * (1 - lag), .5, 0));
      setCam([cp.x, cp.y, cp.z], [Lk.x, Lk.y, Lk.z], lerp(46, 60, lag), [P.x, P.y, P.z], .01); A.drop = projector()(P.x, P.y, P.z); }
    else if (t < S("b05")) { const u = eio((t - S("b04")) / (T.C4 - 1.2 - S("b04"))); c = path([{ t: S("b04"), p: [3.6, 1.9, 2.0], l: [0, 1.4, .3], f: 62, fp: [0, 1.2, 0], ap: .01 }, { t: T.C4 - 1.2, p: [10.2, 4.4, 3.9], l: [-1.2, 2.5, .1], f: 32, fp: [-.8, 1.8, 0], ap: .005 }], t); }
    else if (t < S("b06")) { setCam([PM[0] + 3.1 + .12 * Math.sin(t * .4), PM[1] + .1, PM[2] + .12 * Math.cos(t * .3)], [PM[0] - .1, PM[1] - .02, PM[2]], 92, [PM[0], PM[1], PM[2]], .02); }
    else { setCam([5.8, 1.7, 2.6], [0, 2.3, -.1], 40, [0, 1.6, 0], .006); { const a = smooth((t - T.tChem) / .3) * (1 - smooth((t - S("b09") + .3) / .3)); eyeSet(t, t >= S("b08") && t < S("b09") ? a : 0, clamp((t - T.tChem) / 1.1)); } }
    A.proj = projector();
  } else if (z === "over") {
    setKey(0, KZ.over - 1); GO.position.z = KZ.over; const dive = t < T.cellIn;
    const lay = dive ? 0 : 1; onCut.scale.setScalar(lay ? .78 : 1); onDome.scale.setScalar(lay ? .78 : 1); onCut.position.set(lay ? -1.6 : -.75, O.OH * (lay ? .78 : 1), lay ? 3.15 : -2.5); onCut.rotation.y = PI / 2 + (lay ? .15 : .35); onDome.position.set(lay ? -.1 : 1.1, 0, lay ? 3.25 : -1.9); shC.position.set(onCut.position.x, .007, onCut.position.z); shD.position.set(onDome.position.x, .007, onDome.position.z); spillGrp.position.set(lay ? -.2 : 0, 0, lay ? 5.2 : 0); chefFlat.visible = !!lay; chefC.visible = false;
    sprO.g.visible = COVER; cardG.visible = !dive && t >= S("b12") - .3 && t < T.tCard + .3;
    if (dive) { const u = eio((t - T.dive0) / (T.cellIn - T.dive0)); setCam([-.75, lerp(8, 2.0, u), KZ.over - 2.5 + 1.3 + lerp(3.1, 0, u)], [-.75, 0, KZ.over - 2.5], lerp(34, 38, u), [-.75, .9, KZ.over - 2.5], lerp(.006, .012, u), [0, 0, -1]); }
    else { const dr = t - S("b12"); setCam([Math.sin(dr * .3) * .08, 9.6 - .15 * smooth(dr / 8) - .9 * smooth((t - T.tCard) / 7), KZ.over + .35 + 9.6 * .1 + Math.cos(dr * .2) * .05], [0, 0, KZ.over + .35], 40, [0, .2, KZ.over], .007, [0, 0, -1]);
      const su = eo3((t - S("b12") + .05) / .5), sd = smooth((t - T.tCard + .1) / .4); cardG.position.set(lerp(5.2, 0, su) + sd * -6, 0, .45); cardG.rotation.y = (1 - su) * .12 - .02; cardG.userData.pl2.visible = t >= T.tStudy - .05; const st = 1 + .35 * (1 - eob((t - T.tStudy) / .25)) ; cardG.userData.pl2.scale.set(st, st, st); cardG.userData.pl2.material.opacity = smooth((t - T.tStudy) / .08); }
    sprO.update(COVER ? .8 : 99); A.proj = projector();
  } else if (z === "slab") {
    setKey(0, KZ.slab); animSlab(t); sprS.update(t); const b = Math.sin(t * .3) * .05;
    setCam([8.4, 1.5, KZ.slab + b], [0, 1.35, KZ.slab], 44, [0, 1.2, KZ.slab], .006); A.proj = projector();
  } else if (z === "split") {
    setKey(0, KZ.split + 0); const edB = bladeEdge(t, [T.D1, T.D2], TOP2), edS = bladeEdge(t, [T.D1, T.D3], TOP2); rigB.carr.position.y = edB; rigSh.carr.position.y = edS;
    sprB.update(t); sprSh.update(t); [[ZB, [T.D1, T.D2]], [ZSH, [T.D1, T.D3]]].forEach(([zz, ev], i) => { const sl = slitAt(t, ev), [a, b] = slit2[i]; a.visible = b.visible = sl > .01; a.scale.set(.5 + 1.6 * sl, 1, 1.9 * sl); b.scale.set(1.2 + 1.6 * sl, 1, 1.9 * sl); a.position.set(0, TOP2, zz); b.position.set(0, TOP2 + .008, zz); });
    if (t < S("b11")) setCam([11.6, 3.6, KZ.split + .1], [0, 1.3, KZ.split], 38, [0, 1.2, KZ.split], .004);
    else { const u = eio((t - S("b11")) / 1.2); setCam([lerp(11.6, 8.0, u), lerp(3.6, 2.4, u), KZ.split + lerp(.1, ZSH, u)], [0, lerp(1.3, 1.0, u), KZ.split + lerp(0, ZSH, u)], lerp(38, 42, u), [0, 1.2, KZ.split + lerp(0, ZSH, u)], lerp(.004, .007, u)); }
    A.proj = projector(); A.split = { L: A.proj(0, 2.6, KZ.split + ZB), R: A.proj(0, 2.6, KZ.split + ZSH) };
  } else if (z === "cells") { key.visible = rim.visible = false; animCells(t, A); }
  else { key.visible = rim.visible = false; animEye(t, A); }
}
const veilAt = t => { let a = 0; [T.cellIn, S("b07"), S("b08")].forEach(tc => (a = Math.max(a, 1 - smooth(Math.abs(t - tc) / .1)))); return { a: a * .85, col: "#F7F1E6" }; };

window.__seek = function (t) {
  const A = { t };
  if (COVER) { // cover: cut half onion + knife + droplet spray from the cut face
    GK.visible = true; GH.visible = GS.visible = GP.visible = false; GO.visible = true; gC.visible = gE.visible = false; sprO.g.visible = true; cardG.visible = false; key.visible = rim.visible = true;
    setKey(-.5, KZ.over - 2.2); onCut.position.set(-.3, O.OH, -2.2 + 0); onCut.rotation.y = PI / 2 + .35 + PI; counter.material.color.set("#A98E68"); renderer.toneMappingExposure = .82; chef.visible = false; chefC.visible = true; chefC.position.set(1.6, 3.2, -2.5); chefC.rotation.z = .55; onDome.position.set(1.8, 0, -3.5);
    sprO.update(.5); setCam([4.6, 3.5, KZ.over + 2.6], [-.2, 2.3, KZ.over - 2.1], 44, [-.3, .8, KZ.over - 2.2], .006);
    bloom.strength = .24; bloom.threshold = 1.0; bokeh.enabled = true; filmPass.uniforms.time.value = .5; filmPass.uniforms.fall.value = .34; scene.background.set("#2B2119"); A.proj = projector(); composer.render(); ov.drawCover(); return;
  }
  stage(t, A);
  filmPass.uniforms.time.value = (t * 30 | 0) * .017;
  composer.render();
  A.veil = veilAt(t); ov.draw(t, A); ov.captions(t);
};
window.__cues = T.cues; window.__duration = DUR;
window.__seek(0); window.__ready = true;
