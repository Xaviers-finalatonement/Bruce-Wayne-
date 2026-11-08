// "Unreal, Actually" ep01 in real 3D (three.js 0.169, vendored). Pure function of t: window.__seek(t) renders the frame.
// 3D image -> bloom -> filmic output -> film pass (grain/vignette/halation); Anton/Barlow type is a 2D overlay + DOM captions.
import * as THREE from "three";
import { createPost } from "../../../engine/film/post.js";
import { createProps } from "../../../engine/film/props.js";
import { createSolids } from "../../../engine/film/solids.js";
import { shakeAt as shakeAtF, applyCamera } from "../../../engine/film/camera.js";
import { clamp, smooth, eio, eo3, eob, lerp, hash, makeTiming } from "./timing.js";
import { createOverlay } from "./overlay.js";
const shakeAt = t => shakeAtF(T.shakes, t);

const TH = window.THEME, C = TH.colors;
const COVER = new URLSearchParams(location.search).has("cover");
{ let css = ""; for (const k in TH.fonts) for (const f of TH.fonts[k].faces) css += `@font-face{font-family:"${TH.fonts[k].family}";font-weight:${f.weight};src:url(${f.url}) format("woff2");}\n`;
  css += `:root{--bg:${C.bg};--key:${TH.caption.keyColor}}\n`; document.getElementById("theme-css").textContent = css; }
await Promise.all([`400 100px "Anton"`, `800 60px "Barlow"`, `500 30px "Barlow"`].map(f => document.fonts.load(f))); await document.fonts.ready;
const tl = await (await fetch("out/timeline.json")).json();
const T = makeTiming(tl), { S, E, END, W, DUR } = T;
const ov = createOverlay(T, TH, document.getElementById("fx")); ov.initCaps(tl);

const HOT = new THREE.Color(C.horizon), UV = new THREE.Color(C.ultraviolet), TXT = new THREE.Color(C.static), ABY = new THREE.Color(C.abyss), HAZE = new THREE.Color(C.haze);
const hot = (k = 1) => HOT.clone().multiplyScalar(k), uv = (k = 1) => UV.clone().multiplyScalar(k);
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);

const glc = document.getElementById("gl");
const { renderer, scene, camera, composer, bokeh, bloom, filmPass } = createPost({ canvas: glc, theme: TH });
const QP = new URLSearchParams(location.search); if (QP.has("nobokeh")) bokeh.enabled = false; if (QP.has("nobloom")) bloom.enabled = false; if (QP.has("nofilm")) filmPass.enabled = false;
const P = createProps(renderer);
const { canvasTex, noiseTex, scratchTex, glowTex, envMap, mat, emis, addMat, glowSprite, lightCone, dustField, makeClock } = P;
const { makeSolidFigure, SOLID_POSE, contactShadow, makeDarkEarth, foilMaps, panelMaps, makePhone, makeHand, loft, roundedSlab } = createSolids(P);

// ---------------- shot groups ----------------
const shots = {}; // id -> {g, path, update, fog}
function shot(id, fog) { const g = new THREE.Group(); g.visible = false; scene.add(g); const sh = { id, g, fog: fog || [0x08070d, .02], update: () => { }, A: {} }; shots[id] = sh; return sh; }
const proj = (v, ) => { const p = v.clone().project(camera); return [(p.x * .5 + .5) * 1080, (-p.y * .5 + .5) * 1920]; };
const pxR = (R, wp) => { const d = camera.position.distanceTo(wp), h = 2 * d * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)); return R / h * 1920; };
const anchorOf = (obj, R) => { const wp = new THREE.Vector3(); obj.getWorldPosition(wp); const p = proj(wp); return { x: p[0], y: p[1], r: pxR(R, wp) }; };
const spot = (c, k, pos, tgt, ang, shadow) => { const l = new THREE.SpotLight(c, k, 40, ang, .6, 1.2); l.position.set(...pos); const tg = new THREE.Object3D(); tg.position.set(...tgt); l.target = tg; l.castShadow = !!shadow; if (shadow) { l.shadow.mapSize.set(1024, 1024); l.shadow.bias = -.0005; } const gg = new THREE.Group(); gg.add(l, tg); return gg; };
const dir = (c, k, pos, tgt) => { const l = new THREE.DirectionalLight(c, k); l.position.set(...pos); l.target.position.set(...tgt); const gg = new THREE.Group(); gg.add(l, l.target); return gg; };
const floorMesh = (r, y, rough) => { const m = new THREE.Mesh(new THREE.CircleGeometry(r, 64), mat({ color: 0x14102a, roughness: rough == null ? .42 : rough, metalness: .5, envMap, envMapIntensity: .05, roughnessMap: scratchTex(9) })); m.rotation.x = -Math.PI / 2; m.position.y = y; m.receiveShadow = true; return m; };

// ===== A: the figure with head and feet clocks (b01, b02, b05, b15) =====
const A = shot("A", [0x08070d, .035]);
const fig = makeSolidFigure(); A.g.add(fig); const shA = contactShadow(.55, .32, .9); A.g.add(shA);
const HC = makeClock(.30, HOT), FC = makeClock(.30, UV); HC.position.set(1.12, 1.60, .05); FC.position.set(1.12, .32, .05); A.g.add(HC, FC);
A.g.add(floorMesh(30, 0));
A.g.add(dir(0xff8a2a, 5, [4, 3.2, -4.5], [0, 1, 0]), dir(0xa98bff, 3, [-5, 2.6, -3.5], [0, 1, 0]), dir(0xf3f1ff, .08, [0, 5, 6], [0, 1, 0]));
A.g.add(new THREE.HemisphereLight(0x2a2250, 0x05040a, .12));
{ const sp = spot(0xfff0dd, 70, [-2.2, 5.5, 3.2], [0, 1.0, 0], .32, true); A.g.add(sp); }
const coneA = lightCone(TXT.clone(), 9, .15, 2.6, .35); coneA.position.set(2.5, 8, -2.5); coneA.rotation.z = .3; A.g.add(coneA);
const coneB = lightCone(UV.clone(), 9, .1, 2, .3); coneB.position.set(-3, 8, -3); coneB.rotation.z = -.25; A.g.add(coneB);
const dustA = dustField(260, [9, 5, 8], 0xffd9b0, .1, 3); dustA.position.set(.5, 1.8, 0); A.g.add(dustA);
// a ruler beside the clocks and a glowing floor line
const ruler = new THREE.Mesh(new THREE.BoxGeometry(.012, .58, .012), emis(UV, 1.6)); ruler.position.set(1.12, .96, .05); A.g.add(ruler);
for (let i = 0; i <= 8; i++) { const tk = new THREE.Mesh(new THREE.BoxGeometry(i % 4 ? .07 : .13, .008, .008), emis(UV, 1.4)); tk.position.set(1.12, .67 + i * .0725, .05); A.g.add(tk); }
const hairGeo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V3(-.01, 1.69, 0), V3(.03, 1.84, 0), V3(-.02, 2.0, 0), V3(.04, 2.12, 0), V3(0, 2.25, 0)]), 60, .006, 6), hair = new THREE.Mesh(hairGeo, emis(HOT, 3)); A.g.add(hair);
const hairIdx = hairGeo.index.count;
const sFeet = t => 3.3 + t, boost = t => Math.max(0, t - W("b05", "faster")) * .9;
const sHead = t => 9.6 + t * 1.15 + boost(t) + (t > S("b05") ? (t - S("b05")) * .3 : 0);
A.update = t => {
  fig.userData.update(t);
  HC.userData.set(sHead(t), { hot: 1.2 }); FC.userData.set(sFeet(t), { hot: .8 });
  const hu = eo3((t - W("b15", "By a hair") + .2) / .7); hairGeo.setDrawRange(0, Math.floor(hairIdx * (t >= W("b15", "By a hair") - .2 ? hu : 0)));
  A.A = { head: anchorOf(HC, .3), feet: anchorOf(FC, .3) };
};
const pathA = [
  { t: 0, p: [.3, 1.15, 8.4], l: [.55, 1.19, 0], f: 60, fp: [.5, 1.2, 0], ap: .00025 },
  { t: T.hookEnd, p: [.45, 1.15, 7.9], l: [.6, 1.19, 0], f: 60, fp: [.5, 1.2, 0], ap: .00025 },
  { t: S("b02"), p: [.45, 1.15, 7.8], l: [.6, 1.2, 0], f: 60, fp: [.5, 1.2, 0], ap: .0003 },
  { t: S("b02") + .9, p: [.8, 1.15, 5.7], l: [.95, 1.1, 0], f: 60, fp: [1.1, 1.6, 0], ap: .0006 },
  { t: END("b02"), p: [.95, 1.2, 5.1], l: [1.05, 1.25, 0], f: 60, fp: [1.1, 1.6, 0], ap: .0009 },
];
const pathA2 = [
  { t: S("b05"), p: [1.0, .38, 7.4], l: [1.1, .34, 0], f: 70, fp: [1.1, .32, 0], ap: .0009 },
  { t: W("b05", "Your head is") - .2, p: [1.0, .38, 7.4], l: [1.1, .34, 0], f: 70, fp: [1.1, .32, 0], ap: .0009 },
  { t: W("b05", "Your head is") + .4, p: [1.0, .57, 7.2], l: [1.1, .57, 0], f: 70, fp: [1.12, 1.0, 0], ap: .0009 },
  { t: W("b05", "So your head's") - .1, p: [1.0, .57, 7.2], l: [1.1, .57, 0], f: 70, fp: [1.12, 1.0, 0], ap: .0009 },
  { t: END("b05"), p: [.5, 1.15, 7.8], l: [.6, 1.19, 0], f: 60, fp: [.6, 1.2, 0], ap: .0004 },
];
const pathA3 = [
  { t: S("b15"), p: [.5, 1.15, 7.8], l: [.6, 1.19, 0], f: 60, fp: [.5, 1.2, 0], ap: .0003 },
  { t: W("b15", "By a hair") - .3, p: [.5, 1.15, 7.8], l: [.6, 1.19, 0], f: 60, fp: [.5, 1.2, 0], ap: .0003 },
  { t: W("b15", "By a hair") + .5, p: [.8, 1.55, 6.6], l: [.8, 1.62, 0], f: 70, fp: [0, 1.75, 0], ap: .0007 },
  { t: DUR, p: [.8, 1.6, 6.0], l: [.8, 1.65, 0], f: 70, fp: [0, 1.75, 0], ap: .0008 },
];

// ===== B: gravity warps spacetime toward Earth (b03) =====
const B = shot("B", [0x08070d, .02]);
const earthB = makeDarkEarth(6.8, V3(-.8, -.1, -.5)); earthB.position.set(0, -9.8, -4); B.g.add(earthB);
const gridMats = [];
function gridMesh(cols, rows, x0, x1, z0, z1, col, w) {
  const geos = [], segs = 90;
  const strip = (pts) => { const pos = [], idx = []; pts.forEach((p, i) => { pos.push(p[0], 0, p[1], p[0], 0, p[1]); }); const a = []; for (let i = 0; i < pts.length; i++) { a.push(pts[i][0], pts[i][1], -1, pts[i][0], pts[i][1], 1); } for (let i = 0; i < pts.length - 1; i++) { const k = i * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); } return { a, idx }; };
  const pos = [], idx = [], side = [], la = []; let base = 0, lnum = 0;
  const addLine = (pts, vertical) => { for (let i = 0; i < pts.length; i++) { for (const s of [-1, 1]) { pos.push(pts[i][0], 0, pts[i][1]); side.push(vertical ? s : 0, vertical ? 0 : s); la.push(lnum); } } for (let i = 0; i < pts.length - 1; i++) { const k = base + i * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); } base += pts.length * 2; lnum++; };
  for (let i = 0; i <= cols; i++) { const x = lerp(x0, x1, i / cols), pts = []; for (let j = 0; j <= segs; j++) pts.push([x, lerp(z0, z1, j / segs)]); addLine(pts, true); }
  for (let j = 0; j <= rows; j++) { const z = lerp(z0, z1, j / rows), pts = []; for (let i = 0; i <= segs; i++) pts.push([lerp(x0, x1, i / segs), z]); addLine(pts, false); }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("side", new THREE.Float32BufferAttribute(side, 2)); g.setAttribute("la", new THREE.Float32BufferAttribute(la, 1)); g.setIndex(idx);
  const m = new THREE.ShaderMaterial({ transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, uniforms: { k: { value: 0 }, w: { value: w }, c: { value: col } },
    vertexShader: `uniform float k,w; attribute vec2 side; attribute float la; varying float vD; varying float vZ; varying float vA;
      void main(){ vec3 p=position; p.x+=side.x*w; p.z+=side.y*w; float d=length(vec2(p.x,p.z+4.));
        float well=exp(-d*d/26.); float dep=smoothstep(-14.,-2.,p.z); p.y-=k*3.4*well*dep; vec2 toC=normalize(vec2(-p.x,-4.-p.z)+1e-4); p.xz+=toC*k*1.1*well*dep; vD=well*k; vZ=p.z; vA=.12+.88*fract(sin(la*91.7)*437.5);
        gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.); }`,
    fragmentShader: "uniform vec3 c; varying float vD; varying float vZ; varying float vA; void main(){ float f=smoothstep(-16.,-2.,vZ); gl_FragColor=vec4(mix(c,vec3(1.,.55,.2),vD*1.1)*(.24+vD*1.1)*f*vA,1.); }" });
  const mesh = new THREE.Mesh(g, m); gridMats.push(m); return mesh;
}
const gridB = gridMesh(22, 28, -11, 11, -16, 4, HAZE.clone().lerp(UV, .4), .007); B.g.add(gridB);
const fall = []; for (let i = 0; i < 14; i++) { const m = new THREE.Mesh(new THREE.BoxGeometry(.02, .9, .02), emis(HOT, 2.5)); fall.push(m); B.g.add(m); }
const lowC = makeClock(.5, HOT), highC = makeClock(.5, UV); B.g.add(lowC, highC); highC.position.set(-3.6, 1.5, -5); lowC.position.set(0, -.9, -2.2);
B.g.add(dir(0xff8a2a, 1.2, [3, 4, -2], [0, -2, -4]), new THREE.HemisphereLight(0x3a2a70, 0x05040a, .6));
B.g.add(dustField(160, [16, 8, 16], 0xc9b8ff, .04, 8));
B.update = t => {
  const k = eio((t - (T.tSag - 1.5)) / 2.2) * .85 + smooth((t - S("b03")) / 3) * .15; gridMats[0].uniforms.k.value = k; earthB.userData.m.uniforms.t.value = t;
  const lt = t - S("b03"); lowC.userData.set(lt * .5, { hot: 1 }); highC.userData.set(lt * 1.7, { hot: .8 });
  const sp = smooth((t - T.tSag) / .4); lowC.scale.setScalar(.01 + sp); highC.scale.setScalar(.01 + sp);
  lowC.position.y = -.2 - k * 1.2; lowC.position.z = -3.2;
  fall.forEach((m, i) => { const ph = (t * .5 + i * .31) % 1; const x = -4.5 + (i / 13) * 9, z = -4 + (hash(i) - .5) * 5; const d = Math.hypot(x, z + 4); const y = lerp(4, -2.4 - k * 1.2 * Math.exp(-d * d / 26), ph * ph); m.position.set(x * (1 - .25 * ph * ph), y, z); m.material.color.copy(HOT).multiplyScalar(2.5 * Math.sin(ph * 3.14)); });
  B.A = { high: anchorOf(highC, .5), low: anchorOf(lowC, .5) };
};
const pathB = [{ t: S("b03"), p: [0, 2.6, 9], l: [0, -.7, -4], f: 32, fp: [0, -1, -3.5], ap: .0004 }, { t: E("b03"), p: [0, 1.9, 5.8], l: [0, -1.2, -4], f: 32, fp: [0, -1, -3.5], ap: .0006 }];

// ===== C: a column of clocks at rising heights (b04) =====
const Cs = shot("C", [0x08070d, .02]);
const earthC = makeDarkEarth(16, V3(-.8, -.15, -.45)); earthC.position.set(0, -22.5, -10); Cs.g.add(earthC);
const colClocks = [0, 1, 2, 3].map(i => { const c = makeClock(.46, lerpCol(UV, HOT, i / 3)); c.position.set(0, i * 1.2, 0); Cs.g.add(c); return c; });
function lerpCol(a, b, u) { return a.clone().lerp(b, u); }
const spine = new THREE.Mesh(new THREE.BoxGeometry(.014, 6.4, .014), emis(UV, 1.3)); spine.position.set(0, 2.1, -.05); Cs.g.add(spine);
const barC = new THREE.Mesh(new THREE.PlaneGeometry(.1, 6.4), new THREE.ShaderMaterial({ vertexShader: "varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }", fragmentShader: `varying vec2 vUv; void main(){ gl_FragColor=vec4(mix(vec3(.5,.4,1.),vec3(1.4,.6,.15),vUv.y)*1.6,1.); }` })); barC.position.set(2.5, 2.1, 0); Cs.g.add(barC);
const trainN = 16, trains = []; for (let i = 0; i < 4; i++) { const im = new THREE.InstancedMesh(new THREE.BoxGeometry(.04, .38, .04), emis(lerpCol(UV, HOT, i / 3), 2.6), trainN); trains.push(im); Cs.g.add(im); }
const leds = []; for (let i = 0; i < 4; i++) for (let k = 0; k < 4; k++) { const m = new THREE.Mesh(new THREE.BoxGeometry(.16, .16, .05), emis(k <= i ? HOT : HAZE, k <= i ? 2.6 : .35)); m.position.set(.85 + k * .26, i * 1.2, 0); Cs.g.add(m); }
Cs.g.add(dir(0xff8a2a, 1.6, [3, 2, -3], [0, 2, 0]), dir(0xa98bff, 1.4, [-4, 3, 2], [0, 2, 0]), new THREE.HemisphereLight(0x3a2a70, 0x05040a, .8));
Cs.g.add(dustField(180, [10, 10, 10], 0xc9b8ff, .04, 21)); Cs.g.position.y = 0;
const dm = new THREE.Object3D();
Cs.update = t => {
  const lt = t - S("b04"), rates = [.4, 1.1, 2.1, 3.4];
  colClocks.forEach((c, i) => { c.userData.set(lt * rates[i] * 1.4, { hot: .6 + i * .2 }); c.scale.setScalar(.01 + smooth((lt - .1 - i * .3) / .35)); });
  trains.forEach((im, i) => { const gap = .9 / rates[i]; for (let k = 0; k < trainN; k++) { const x = -.8 - ((lt * .9 + k * gap) % (gap * trainN)); const vis = x > -3.6; dm.position.set(x, i * 1.2, 0); dm.scale.setScalar(vis ? 1 : 0); dm.updateMatrix(); im.setMatrixAt(k, dm.matrix); } im.instanceMatrix.needsUpdate = true; });
  Cs.A = {};
};
const pathC = [{ t: S("b04"), p: [0, .1, 6.4], l: [0, .15, 0], f: 42, fp: [0, 0, 0], ap: .0005 }, { t: S("b04") + .5, p: [0, .1, 6.4], l: [0, .15, 0], f: 42, fp: [0, 0, 0], ap: .0005 }, { t: END("b04") - .1, p: [0, 1.0, 9.6], l: [0, .9, 0], f: 35, fp: [0, 1.8, 0], ap: .0005 }];

// ===== D: the NIST optical-clock bench (b06-b08) =====
const D = shot("D", [0x08070d, .03]);
const tUnits = W("b07", "two super");
const holeTex = canvasTex(512, 512, (x, w, h) => { x.fillStyle = "#1b1826"; x.fillRect(0, 0, w, h);
  for (let i = 0; i < 16; i++) for (let j = 0; j < 16; j++) { const cx = i * 32 + 16, cy = j * 32 + 16; x.fillStyle = "#020104"; x.beginPath(); x.arc(cx, cy, 7, 0, 6.3); x.fill(); x.strokeStyle = "rgba(190,185,215,.55)"; x.lineWidth = 2; x.beginPath(); x.arc(cx, cy, 8.5, .2, 2.4); x.stroke(); x.strokeStyle = "rgba(0,0,0,.6)"; x.beginPath(); x.arc(cx, cy, 8.5, 3.4, 5.5); x.stroke(); }
  for (let i = 0; i < 2500; i++) { x.fillStyle = `rgba(255,255,255,${hash(i) * .035})`; x.fillRect(hash(i * 3) * w, hash(i * 5) * h, 1.5, 1); } });
holeTex.wrapS = holeTex.wrapT = THREE.RepeatWrapping; holeTex.repeat.set(7.5, 3.3); holeTex.anisotropy = 8;
const tableTop = new THREE.Mesh(new THREE.BoxGeometry(12, .16, 5.2), mat({ color: 0xffffff, map: holeTex, bumpMap: holeTex, bumpScale: 1.2, roughness: .42, metalness: .75, envMap, envMapIntensity: .55 })); tableTop.position.set(0, -.08, 0); tableTop.receiveShadow = true; D.g.add(tableTop);
const steelM = mat({ color: 0x8f8ca2, metalness: 1, roughness: .3, envMap, envMapIntensity: 1.3, bumpMap: scratchTex(3), bumpScale: 1.2 });
const darkM = mat({ color: 0x15121f, metalness: .8, roughness: .35, envMap, envMapIntensity: .9, bumpMap: scratchTex(2), bumpScale: 1 });
const tableSkirt = new THREE.Mesh(new THREE.BoxGeometry(12, .5, 5.0), darkM); tableSkirt.position.set(0, -.41, 0); D.g.add(tableSkirt);
const tableLip = new THREE.Mesh(new THREE.BoxGeometry(12.02, .035, .02), steelM); tableLip.position.set(0, -.14, 2.6); D.g.add(tableLip);
[[-5.5, 2.2], [5.5, 2.2], [-5.5, -2.2], [5.5, -2.2]].forEach(([x, z]) => { const lg = new THREE.Mesh(new THREE.BoxGeometry(.3, 1.4, .3), darkM); lg.position.set(x, -1.35, z); D.g.add(lg); });
D.g.add(floorMesh(30, -2.05, .45));
const wallD = new THREE.Mesh(new THREE.PlaneGeometry(40, 14), mat({ color: 0x0b0914, roughness: .9, metalness: 0 })); wallD.position.set(0, 3, -4.4); wallD.receiveShadow = true; D.g.add(wallD);
// optics: posts, holders, mirrors, lenses on the table
const addTo = (m, x, y, z, parent) => { m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; (parent || D.g).add(m); return m; };
const post = (x, z, h, y0 = 0) => { addTo(new THREE.Mesh(new THREE.CylinderGeometry(.07, .08, .035, 24), steelM), x, y0 + .0175, z); addTo(new THREE.Mesh(new THREE.CylinderGeometry(.026, .026, h, 20), steelM), x, y0 + .035 + h / 2, z);
  addTo(new THREE.Mesh(new THREE.CylinderGeometry(.045, .045, .1, 20), darkM), x, y0 + .035 + h - .05, z); };
const mirrorM = mat({ color: 0xffffff, metalness: 1, roughness: .05, envMap, envMapIntensity: 2.2 });
const mount = (x, y, z, rotY, r = .12) => { const gp = new THREE.Group(); gp.position.set(x, y, z); gp.rotation.y = rotY; D.g.add(gp);
  addTo(new THREE.Mesh(new THREE.CylinderGeometry(r * 1.25, r * 1.25, .05, 40).rotateX(Math.PI / 2), darkM), 0, 0, -.03, gp); addTo(new THREE.Mesh(new THREE.CylinderGeometry(r, r, .016, 40).rotateX(Math.PI / 2), mirrorM), 0, 0, .006, gp);
  for (const [dx, dy] of [[r * 1.3, 0], [-r * .65, r * 1.12], [-r * .65, -r * 1.12]]) addTo(new THREE.Mesh(new THREE.CylinderGeometry(.012, .012, .06, 10).rotateX(Math.PI / 2), steelM), dx, dy, -.06, gp); };
post(-3.0, .02, .42); mount(-3.0, .42 + .035 + .02, .02, 0, .1);
post(-2.35, .02, .42); post(-1.7, .02, .42);
[[-1.7, .75], [3.0, -1.05], [-2.2, -1.2], [2.2, 1.35], [-3.6, 1.4], [3.5, 1.1], [.6, -1.7], [-.6, 1.9]].forEach(([x, z], i) => { post(x, z, .2 + hash(i) * .35); mount(x, .2 + hash(i) * .35 + .035 + .02, z, hash(i * 3) * 6, .08); });
for (let i = 0; i < 6; i++) { const bx = -4.2 + i * 1.6, bz = -1.8 + (i % 2) * .5; addTo(new THREE.Mesh(new THREE.BoxGeometry(.5, .12, .35), i % 2 ? darkM : steelM), bx, .06, bz); }
// laser heads (left one lights the lower clock; right one the raised clock once it is up)
const laserHead = (x, y, flip) => { const gp = new THREE.Group(); gp.position.set(x, y, .02); D.g.add(gp);
  addTo(new THREE.Mesh(new THREE.BoxGeometry(1.0, .3, .34), darkM), 0, 0, 0, gp); addTo(new THREE.Mesh(new THREE.BoxGeometry(.04, .32, .36), steelM), flip * .5, 0, 0, gp); addTo(new THREE.Mesh(new THREE.CylinderGeometry(.045, .05, .1, 20).rotateZ(Math.PI / 2), steelM), flip * .56, 0, 0, gp);
  const led = new THREE.Mesh(new THREE.SphereGeometry(.02, 10, 10), emis(flip < 0 ? HOT : UV, 3)); led.position.set(-flip * .3, .1, .18); gp.add(led); return gp; };
const BEAM_Y = .5;
laserHead(-4.2, BEAM_Y, 1); post(-4.5, 0, BEAM_Y - .2 - .035 - .05 + .1); post(-3.9, 0, BEAM_Y - .2 - .035 - .05 + .1);
const lhR = laserHead(4.4, BEAM_Y + .55, -1); post(4.6, 0, BEAM_Y + .55 - .2, 0); post(4.0, 0, BEAM_Y + .55 - .2, 0);
// haze-lit beam: a hot core plus a soft scatter sheath
const beamShell = (c) => new THREE.ShaderMaterial({ transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, uniforms: { c: { value: c.clone() }, k: { value: 0 } },
  vertexShader: "varying vec3 vN; varying vec3 vV; void main(){ vN=normalize(normalMatrix*normal); vec4 mv=modelViewMatrix*vec4(position,1.); vV=normalize(-mv.xyz); gl_Position=projectionMatrix*mv; }",
  fragmentShader: "uniform vec3 c; uniform float k; varying vec3 vN; varying vec3 vV; void main(){ float f=pow(abs(dot(vN,vV)),2.2); gl_FragColor=vec4(c*f*k,1.); }" });
const beams = [[V3(-3.62, BEAM_Y, .02), 0, UV], [V3(3.8, BEAM_Y + .55, .02), 1, HOT]].map(([from, k, c]) => {
  const core = new THREE.Mesh(new THREE.CylinderGeometry(.011, .011, 1, 8), emis(c.clone().lerp(TXT, .45), 3)), sheath = new THREE.Mesh(new THREE.CylinderGeometry(.075, .075, 1, 20, 1, true), beamShell(c));
  core.userData = sheath.userData = { from, k, c }; D.g.add(core, sheath);
  const dn = 70, dpos = new Float32Array(dn * 3), dg = new THREE.BufferGeometry(); dg.setAttribute("position", new THREE.BufferAttribute(dpos, 3));
  const dp = new THREE.Points(dg, new THREE.PointsMaterial({ map: glowTex, color: c.clone().lerp(TXT, .5), size: .05, transparent: true, opacity: .8, blending: THREE.AdditiveBlending, depthWrite: false })); dp.frustumCulled = false; D.g.add(dp);
  return { core, sheath, dp, from, k, c }; });
// the two clocks
const caseM = mat({ color: 0x77748a, metalness: 1, roughness: .38, envMap, envMapIntensity: 1.2, bumpMap: scratchTex(12), bumpScale: 1.1 });
function unitMesh(accent) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(solids_rb(.9, 1.15, .8, .07), caseM); body.position.y = .575; body.castShadow = body.receiveShadow = true; g.add(body);
  const face = new THREE.Mesh(solids_rb(.78, 0.9, .03, .02), darkM); face.position.set(0, .64, .405); g.add(face);
  const clk = makeClock(.34, accent); clk.position.set(0, .64, .425); g.add(clk);
  const port = new THREE.Mesh(new THREE.CylinderGeometry(.07, .07, .06, 24).rotateZ(Math.PI / 2), darkM); port.position.set(accent === HOT ? .45 : -.45, .45 + .0, 0); g.add(port);
  const strip = new THREE.Mesh(new THREE.BoxGeometry(.8, .02, .02), emis(accent, 2.2)); strip.position.set(0, 1.13, .41); g.add(strip);
  const topMod = new THREE.Mesh(solids_rb(.86, .3, .6, .04), darkM); topMod.position.y = 1.3; topMod.castShadow = true; g.add(topMod);
  for (let i = 0; i < 4; i++) { const l = new THREE.Mesh(new THREE.SphereGeometry(.018, 8, 8), emis(i ? HAZE : accent, i ? .8 : 3)); l.position.set(-.3 + i * .08, .1, .43); g.add(l); }
  const foot = new THREE.Mesh(new THREE.BoxGeometry(.96, .03, .86), steelM); foot.position.y = .015; foot.castShadow = foot.receiveShadow = true; g.add(foot);
  g.userData.clk = clk; return g;
}
function solids_rb(w, h, d, r) { return roundedSlab(w, h, d, r, Math.min(.03, d / 4)); }
const UX = 0.92, unitA = unitMesh(UV), unitB = unitMesh(HOT); unitA.position.x = -UX; unitB.position.x = UX; D.g.add(unitA, unitB);

const plate1 = new THREE.Mesh(new THREE.BoxGeometry(1.04, .3, .9), steelM), plate2 = new THREE.Mesh(new THREE.BoxGeometry(1.0, .3, .86), steelM);
[plate1, plate2].forEach(p => { p.castShadow = p.receiveShadow = true; D.g.add(p); });
const plateEdge = [0, 1].map(i => { const e = new THREE.Mesh(new THREE.BoxGeometry(1.04, .014, .014), emis(HOT, 1.8)); D.g.add(e); return e; });
// dimension line (vertical, arrowed, label drawn in the 2D overlay in the gap)
const DY0 = .64, DY1 = .64 + .6, DZ = .5, dimG = new THREE.Group(); D.g.add(dimG);
const dimM = emis(TXT, 2.2);
const dimLo = new THREE.Mesh(new THREE.BoxGeometry(.012, 1, .012), dimM), dimHi = new THREE.Mesh(new THREE.BoxGeometry(.012, 1, .012), dimM), arLo = new THREE.Mesh(new THREE.ConeGeometry(.032, .1, 14), dimM), arHi = new THREE.Mesh(new THREE.ConeGeometry(.032, .1, 14), dimM);
const extLo = new THREE.Mesh(new THREE.BoxGeometry(1, .007, .007), emis(HAZE, 1.4)), extHi = new THREE.Mesh(new THREE.BoxGeometry(1, .007, .007), emis(HAZE, 1.4));
dimG.add(dimLo, dimHi, arLo, arHi, extLo, extHi);
// rate bars: 4 big slots above each clock (b08): upper clock 3 lit, lower clock 2 lit
const slotDim = new THREE.InstancedMesh(new THREE.BoxGeometry(.19, .19, .05), emis(HAZE, .45), 8), slotLit = new THREE.InstancedMesh(new THREE.BoxGeometry(.19, .19, .06), emis(HOT, 3.4), 8); D.g.add(slotDim, slotLit);
const ionB = glowSprite(HOT, 1.0, .0), ionA = glowSprite(UV, 1.0, .0); D.g.add(ionA, ionB);
D.g.add(spot(0xfff1dd, 105, [-2.6, 6.8, 4.4], [0, .5, 0], .5, true), dir(0xff8a2a, 2.6, [6, 2.4, -3], [1, .8, 0]), dir(0xa98bff, 2.0, [-6, 3, -3], [0, .8, 0]), new THREE.HemisphereLight(0x2a2250, 0x05040a, .28));
const coneD = lightCone(TXT.clone(), 8, .15, 2.2, .06); coneD.position.set(-1.2, 8, 1.8); coneD.rotation.z = -.1; D.g.add(coneD);
D.g.add(dustField(220, [9, 4, 7], 0xffd9b0, .035, 31));
const unitH = t => { const u = clamp((t - T.tRaise0) / (T.tRaise1 - T.tRaise0)); return .3 * eio(u * 2) + .3 * eio(u * 2 - 1); };
const ldraw = (t, i) => { const b = beams[i], p = b.from, onT = i ? T.tRaise1 : S("b06") + 1.2, on = smooth((t - onT) / .3);
  const h = unitH(t), tgt = i ? V3(UX - .45 - .03, .45 + h, .02) : V3(-UX + .45 + .03 - .0, .45, .02); tgt.x = i ? UX + .49 : -UX - .49;
  const d = tgt.clone().sub(p), len = d.length(), flick = .85 + .15 * Math.sin(t * 37 + i * 2);
  [b.core, b.sheath].forEach(m => { m.position.copy(p).addScaledVector(d, .5); m.scale.set(1, Math.max(.001, len * (on > 0 ? 1 : 0)), 1); m.quaternion.setFromUnitVectors(V3(0, 1, 0), d.clone().normalize()); });
  b.core.material.color.copy(b.c).lerp(TXT, .45).multiplyScalar(3 * on * flick); b.sheath.material.uniforms.k.value = .55 * on;
  const pa = b.dp.geometry.attributes.position; for (let k = 0; k < pa.count; k++) { const u = hash(k * 3 + i * 11), w = .06; pa.setXYZ(k, p.x + d.x * u + (hash(k * 5 + i) - .5) * w * 2, p.y + d.y * u + (hash(k * 7 + i) - .5) * w * 2 + Math.sin(t * .8 + k) * .01, p.z + (hash(k * 9 + i) - .5) * w * 2); } pa.needsUpdate = true; b.dp.material.opacity = .75 * on; return on; };
D.update = t => {
  const lt = t - S("b06"), h = unitH(t), ap = s => eo3((t - tUnits - s) / .5);
  unitA.position.y = 0; unitB.position.y = h; unitA.scale.setScalar(.01 + ap(0)); unitB.scale.setScalar(.01 + ap(.3));
  unitA.visible = t > tUnits - .02; unitB.visible = t > tUnits + .28;
  plate1.visible = plate2.visible = plateEdge[0].visible = plateEdge[1].visible = h > .004 && unitB.visible;
  const h1 = Math.min(h, .3), h2 = Math.max(0, h - .3); plate1.scale.y = Math.max(.001, h1 / .3); plate1.position.set(UX, h1 / 2, 0); plate2.scale.y = Math.max(.001, h2 / .3); plate2.position.set(UX, h1 + h2 / 2, 0); plate2.visible = h2 > .004;
  plateEdge[0].position.set(UX, h1, .45); plateEdge[1].position.set(UX, h1 + h2, .44); plateEdge[1].visible = h2 > .004;
  unitA.userData.clk.userData.set(Math.max(0, t - tUnits) * 1.0, { hot: .8 }); unitB.userData.clk.userData.set(Math.max(0, t - tUnits) * 1.0 + Math.max(0, t - T.tRaise1) * 1.8, { hot: 1.2 });
  const onA = ldraw(t, 0), onB = ldraw(t, 1);
  ionA.position.set(-UX - .5, .45, .1); ionA.material.opacity = .5 * onA * smooth((t - tUnits) / .4); ionB.position.set(UX + .5, .45 + h, .1); ionB.material.opacity = .5 * onB;
  const dd = smooth((t - (W("b07", "Two steps") + .2)) / .4), mid = (DY0 + DY1) / 2, gap = .13, half = (DY1 - DY0) / 2, seg = half - gap, ee = UX - .45;
  dimG.visible = dd > .01;
  dimLo.scale.y = dimHi.scale.y = Math.max(.001, seg * dd); dimLo.position.set(0, DY0 + seg * dd / 2, DZ); dimHi.position.set(0, DY1 - seg * dd / 2, DZ);
  arLo.rotation.z = Math.PI; arLo.position.set(0, DY0 + .05, DZ); arHi.position.set(0, DY1 - .05, DZ); arLo.scale.setScalar(dd + .001); arHi.scale.setScalar(dd + .001);
  extLo.scale.x = extHi.scale.x = Math.max(.001, ee * dd); extLo.position.set(-ee / 2, DY0, DZ); extHi.position.set(ee / 2, DY1, DZ);
  { const t8 = S("b08") - .1, ln = [[unitA.position, 2, -UX], [unitB.position, 3, UX]]; let n = 0;
    ln.forEach(([p, lit, cx], j) => { for (let i = 0; i < 4; i++) { dm.position.set(cx - .35 + i * .233, p.y + 1.3, .32); dm.scale.setScalar((t > t8 ? 1 : .0001) * smooth((t - t8 - i * .05) / .2) + .0001); dm.rotation.set(0, 0, 0); dm.updateMatrix(); slotDim.setMatrixAt(n, dm.matrix);
      const on = i < lit && t > S("b08") + .12 + i * .16 + j * .02; dm.scale.setScalar(on ? 1 + .1 * Math.sin(t * 10 - i) * 0 + .001 : .0001); dm.updateMatrix(); slotLit.setMatrixAt(n, dm.matrix); n++; } });
    dm.scale.setScalar(1); slotDim.instanceMatrix.needsUpdate = slotLit.instanceMatrix.needsUpdate = true; }
  const dp = new THREE.Vector3(0, mid, DZ); D.A = { dim: { x: proj(dp)[0], y: proj(dp)[1] } };
};
const pathD = [
  { t: S("b06"), p: [2.8, 3.4, 12.6], l: [0, 1.2, 0], f: 28, fp: [0, .4, 0], ap: .0005 },
  { t: W("b06", "in 2010"), p: [2.0, 3.2, 11.6], l: [0, 1.0, 0], f: 35, fp: [0, .4, 0], ap: .0005 },
  { t: tUnits - .4, p: [.6, 3.0, 8.6], l: [0, .75, 0], f: 50, fp: [0, .85, 0], ap: .0005 },
  { t: tUnits + .5, p: [0, 2.9, 7.9], l: [0, .85, 0], f: 50, fp: [0, .85, 0], ap: .0005 },
  { t: S("b08"), p: [.05, 2.85, 7.8], l: [0, .9, 0], f: 50, fp: [0, .9, 0], ap: .0006 },
  { t: S("b09") - .1, p: [.1, 2.8, 7.7], l: [0, .95, 0], f: 50, fp: [0, .95, 0], ap: .0006 }];

// ===== E: 79 years as a light filament receding in deep perspective; the microscopic gap at its end (b09, b10) =====
const Es = shot("E", [0x08070d, .028]);
const LZ = 36;
const revU = { value: 0 };
const fil = new THREE.Mesh(new THREE.TubeGeometry(new THREE.LineCurve3(V3(0, 0, 0), V3(0, 0, -LZ)), 1, .0035, 8), new THREE.ShaderMaterial({ uniforms: { rev: revU }, transparent: true,
  vertexShader: "varying float vz; void main(){ vz=position.z; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }",
  fragmentShader: "uniform float rev; varying float vz; void main(){ if(-vz>rev || -vz>" + (LZ - .006).toFixed(3) + ") discard; float u=clamp(-vz/" + LZ.toFixed(1) + ",0.,1.); gl_FragColor=vec4(mix(vec3(.62,.52,1.),vec3(1.,.46,.1),pow(u,1.4))*(1.6+u*1.2),1.); }" })); Es.g.add(fil);
const haloN = 420, haloPos = new Float32Array(haloN * 3), haloCol = new Float32Array(haloN * 3);
for (let i = 0; i < haloN; i++) { const u = i / (haloN - 1), c = UV.clone().lerp(HOT, Math.pow(u, 1.4)); haloPos.set([(hash(i) - .5) * .02, (hash(i + 9) - .5) * .02, -u * LZ], i * 3); haloCol.set([c.r, c.g, c.b], i * 3); }
const haloG = new THREE.BufferGeometry(); haloG.setAttribute("position", new THREE.BufferAttribute(haloPos, 3)); haloG.setAttribute("color", new THREE.BufferAttribute(haloCol, 3));
const halo = new THREE.Points(haloG, new THREE.PointsMaterial({ map: glowTex, vertexColors: true, size: .34, transparent: true, opacity: .55, blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true })); Es.g.add(halo);
const ringsE = new THREE.InstancedMesh(new THREE.TorusGeometry(1, .02, 6, 40), emis(TXT, .55), 80); Es.g.add(ringsE);
const bornE = new THREE.Mesh(new THREE.TorusGeometry(.32, .012, 8, 48), emis(UV, 3)); Es.g.add(bornE);
const gapMesh = new THREE.Mesh(new THREE.CylinderGeometry(.0035, .0035, 1, 12), emis(HOT, 3.2)); gapMesh.rotation.x = Math.PI / 2; Es.g.add(gapMesh);
const gapGlow = glowSprite(HOT, .5, .55); Es.g.add(gapGlow);
const dustE = dustField(520, [7, 3.5, 46], 0xffd9b0, .05, 41); dustE.position.z = -18; Es.g.add(dustE);
Es.g.add(new THREE.HemisphereLight(0x3a2a70, 0x05040a, .4));
Es.update = t => {
  const drawn = eo3((t - T.tl0) / (T.tl1 - T.tl0)); revU.value = LZ * drawn + .001; halo.geometry.setDrawRange(0, Math.max(1, Math.floor(haloN * drawn)));
  for (let y = 0; y < 80; y++) { const big = y % 10 === 0, z = -y * (LZ / 79); dm.position.set(0, 0, z); dm.scale.setScalar(-z > LZ * drawn || -z > LZ - 2.5 ? 0 : (big ? .2 : .085)); dm.rotation.set(0, 0, 0); dm.updateMatrix(); ringsE.setMatrixAt(y, dm.matrix); } dm.scale.setScalar(1); ringsE.instanceMatrix.needsUpdate = true;
  const tGap = W("b09", "about ninety") - .6, sh0 = S("b10") + .15, sh1 = S("b10") + 1.4, k = smooth((t - sh0) / (sh1 - sh0)), L = .014 * (1 - k) + .0004;
  gapMesh.position.set(0, 0, -LZ + .002 - L / 2); gapMesh.scale.set(1, t >= tGap ? L : .0001, 1); gapGlow.position.set(0, 0, -LZ - L / 2); gapGlow.scale.setScalar((t >= tGap ? .09 : .0001) * (1 - k * .7) + .01);
  const p = proj(V3(0, 0, -LZ - .007)); Es.A = { gap: { x: p[0], y: p[1], s: 1 } };
};
const pE = z => [.0, .12, z];
const pathE = [{ t: S("b09"), p: [2.1, .9, 4.5], l: [0, 0, -16], f: 32, fp: [0, 0, -6], ap: .0008 }, { t: T.tl1, p: [1.3, .5, 6.0], l: [0, 0, -30], f: 32, fp: [0, 0, -8], ap: .0008 },
  { t: T.tl1 + .15, p: [1.3, .5, 6.0], l: [0, 0, -30], f: 32, fp: [0, 0, -8], ap: .0008 },
  { t: W("b09", "ninety") - .5, p: [.3, .08, -LZ + 4], l: [0, 0, -LZ], f: 50, fp: [0, 0, -LZ], ap: .0016 },
  { t: W("b09", "ninety") + .5, p: [.3, .045, -LZ + .8], l: [0, 0, -LZ], f: 85, fp: [0, 0, -LZ], ap: .0030 },
  { t: W("b10", "But real") + .2, p: [.3, .045, -LZ + .8], l: [0, 0, -LZ], f: 85, fp: [0, 0, -LZ], ap: .0030 },
  { t: W("b10", "But real") + 1.2, p: [.5, .08, -LZ + 2.2], l: [0, 0, -LZ], f: 70, fp: [0, 0, -LZ], ap: .0020 }];

// ===== F: GPS satellite above Earth (b11) =====
const F = shot("F", [0x08070d, .006]);
const earthF = makeDarkEarth(18, V3(-.9, -.2, -.4)); earthF.position.set(0, -20, -8); F.g.add(earthF);
const steelF = mat({ color: 0xaaa7bb, metalness: 1, roughness: .3, envMap });
const sat = new THREE.Group();
const glintTexs = [];
{ const fm = foilMaps(), pm = panelMaps(); fm.map.repeat.set(1.3, 1.6); fm.normalMap.repeat.set(1.3, 1.6);
  const busM = mat({ map: fm.map, normalMap: fm.normalMap, normalScale: new THREE.Vector2(1.5, 1.5), color: 0xffffff, metalness: .92, roughness: .35, envMap, envMapIntensity: 1.5 });
  const bus = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.5, 1.1), busM); bus.castShadow = true; sat.add(bus);
  const wrap = new THREE.Mesh(new THREE.BoxGeometry(1.14, .1, 1.14), mat({ color: 0x0c0a10, roughness: .6, metalness: .4, normalMap: fm.normalMap, envMap, envMapIntensity: .6 })); wrap.position.y = .3; sat.add(wrap); const wrap2 = wrap.clone(); wrap2.position.y = -.4; sat.add(wrap2);
  const panM = mat({ map: pm.map, color: 0xffffff, metalness: .7, roughness: .24, envMap, envMapIntensity: 1.7 });
  const frM = mat({ color: 0x2a2630, metalness: 1, roughness: .3, envMap, envMapIntensity: 1 });
  const glintM = new THREE.MeshBasicMaterial({ map: pm.glint, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: .5 }); pm.glint.center.set(.5, .5); pm.glint.rotation = .55; glintTexs.push(pm.glint);
  [-1, 1].forEach(sd => { const pn = new THREE.Mesh(new THREE.BoxGeometry(3.0, 1.35, .04), panM); pn.position.set(sd * 3.05, 0, 0); pn.castShadow = true; sat.add(pn);
    const fr = new THREE.Mesh(new THREE.BoxGeometry(3.08, 1.43, .03), frM); fr.position.set(sd * 3.05, 0, -.005); sat.add(fr);
    const gl = new THREE.Mesh(new THREE.PlaneGeometry(3.0, 1.35), glintM); gl.position.set(sd * 3.05, 0, .025); sat.add(gl);
    const bm = new THREE.Mesh(new THREE.CylinderGeometry(.04, .04, .65, 12), steelF); bm.rotation.z = Math.PI / 2; bm.position.set(sd * .88, 0, 0); sat.add(bm); });
  const dish = new THREE.Mesh(new THREE.LatheGeometry([[0, 0], [.12, .02], [.3, .08], [.5, .2], [.52, .21], [.5, .19], [.3, .06], [.12, 0], [0, -.02]].map(p => new THREE.Vector2(p[0], p[1])), 40), mat({ color: 0x8d8aa0, metalness: 1, roughness: .42, envMap, envMapIntensity: 1.0, side: THREE.DoubleSide })); dish.position.set(0, 1.2, 0); dish.rotation.x = .35; dish.castShadow = true; sat.add(dish);
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(.03, .03, .45, 8), steelF); mast.position.y = .95; sat.add(mast);
  for (let i = 0; i < 4; i++) { const a = new THREE.Mesh(new THREE.CylinderGeometry(.04, .07, .26, 12), steelF); a.position.set(-.3 + (i % 2) * .6, -.88, -.3 + Math.floor(i / 2) * .6); sat.add(a); } }
sat.position.set(0, 3.8, -6); sat.rotation.set(.12, -.35, -.12); F.g.add(sat);
const phoneRig = new THREE.Group();
{ const mapTex = canvasTex(256, 512, (x, w, h) => { x.fillStyle = "#0a0813"; x.fillRect(0, 0, w, h); x.strokeStyle = "rgba(169,139,255,.45)"; x.lineWidth = 3; for (let i = 0; i < 7; i++) { x.beginPath(); x.moveTo(i * 44 - 10, 0); x.lineTo(i * 44 + 14, h); x.stroke(); } for (let j = 0; j < 12; j++) { x.beginPath(); x.moveTo(0, j * 46 + 10); x.lineTo(w, j * 46); x.stroke(); }
    x.strokeStyle = "rgba(243,241,255,.8)"; x.lineWidth = 5; x.beginPath(); x.moveTo(128, h); x.lineTo(128, 250); x.stroke();
    x.fillStyle = "#ff8a2a"; x.shadowColor = "#ff8a2a"; x.shadowBlur = 24; x.beginPath(); x.moveTo(128, 262); x.bezierCurveTo(78, 205, 82, 130, 128, 130); x.bezierCurveTo(174, 130, 178, 205, 128, 262); x.fill(); x.shadowBlur = 0; x.fillStyle = "#08070d"; x.beginPath(); x.arc(128, 190, 16, 0, 6.3); x.fill(); });
  phoneRig.add(makePhone(mapTex)); const hand = makeHand(); phoneRig.add(hand); }
phoneRig.position.set(0, -1.72, -8); phoneRig.rotation.set(-.12, .1, 0); F.g.add(phoneRig);
const sigN = 7, sig = new THREE.InstancedMesh(new THREE.SphereGeometry(.035, 8, 8), emis(HOT, 4), sigN); F.g.add(sig);
F.g.add(dir(0xfff0d8, 3.4, [7, 4.5, 4], [0, 3.8, -6]), dir(0xa98bff, 2.4, [-8, 2, -4], [0, 3, -6]), dir(0xff8a2a, 1.2, [5, -1, -4], [0, 0, -6]), new THREE.HemisphereLight(0x2a2250, 0x05040a, .25), dustField(120, [20, 12, 16], 0xffffff, .035, 51));
F.update = t => {
  const lt = t - S("b11"), sc = .5 + .5 * eo3((lt - .3) / 1.0); sat.scale.setScalar(sc); sat.position.y = 3.8 + Math.sin(t * .5) * .05; sat.rotation.y = -.35 + Math.sin(t * .3) * .06;
  glintTexs.forEach(g => (g.offset.x = (t * .22) % 1)); earthF.userData.m.uniforms.t.value = t; phoneRig.position.y = -1.72 + Math.sin(t * 1.3) * .006;
  const sa = smooth((t - W("b11", "your phone")) / .5);
  for (let i = 0; i < sigN; i++) { const u = (t * .45 + i / sigN) % 1; dm.position.set(Math.sin(u * 9) * .04, lerp(-1.85, 3.2, u), -7.6 + u * 1.6); dm.scale.setScalar(sa * Math.sin(u * 3.14) + .0001); dm.rotation.z = 0; dm.updateMatrix(); sig.setMatrixAt(i, dm.matrix); } sig.instanceMatrix.needsUpdate = true;
  F.A = { sat: anchorOf(sat, 1.1) };
};
const pathF = [{ t: S("b11"), p: [.5, -1.3, -6.1], l: [0, -1.65, -8], f: 50, fp: [0, -1.72, -8], ap: .0012 }, { t: S("b11") + 1.3, p: [.45, -1.2, -5.7], l: [0, -1.6, -8], f: 50, fp: [0, -1.72, -8], ap: .0012 },
  { t: W("b11", "GPS satellites"), p: [0, 1.0, 5.4], l: [0, .9, -6], f: 32, fp: [0, 3.8, -6], ap: .0006 }, { t: W("b11", "clocks run"), p: [0, 2.6, 3.4], l: [0, 3.4, -6], f: 40, fp: [0, 3.9, -6], ap: .0007 }, { t: END("b11") + .2, p: [.2, 3.3, 1.2], l: [0, 3.8, -6], f: 50, fp: [0, 3.9, -6], ap: .0008 }];

// ===== G: set slow before launch (b12, first half) =====
const G = shot("G", [0x08070d, .04]);
const panelG = new THREE.Mesh(new THREE.BoxGeometry(3.6, 2.7, .2), mat({ color: 0x17122a, roughness: .35, metalness: .85, envMap, envMapIntensity: 1, bumpMap: scratchTex(4), bumpScale: 1.4 })); panelG.castShadow = panelG.receiveShadow = true; G.g.add(panelG);
const edgeG = new THREE.Mesh(new THREE.BoxGeometry(.03, 2.7, .22), emis(HOT, 2.2)); edgeG.position.x = 1.8; G.g.add(edgeG);
const bigC = makeClock(.95, HOT); bigC.position.set(-.5, .1, .2); G.g.add(bigC);
const knob = new THREE.Group(); const kn = new THREE.Mesh(new THREE.CylinderGeometry(.36, .4, .28, 48), mat({ color: 0x35304a, metalness: 1, roughness: .3, envMap, envMapIntensity: 1.4, bumpMap: scratchTex(6), bumpScale: 2 })); kn.rotation.x = Math.PI / 2; kn.position.z = .24; knob.add(kn);
for (let i = 0; i < 24; i++) { const rb = new THREE.Mesh(new THREE.BoxGeometry(.03, .03, .26), mat({ color: 0x57516f, metalness: 1, roughness: .35, envMap })); const a = i / 24 * 6.28; rb.position.set(Math.cos(a) * .39, Math.sin(a) * .39, .24); knob.add(rb); }
const notch = new THREE.Mesh(new THREE.BoxGeometry(.05, .24, .02), emis(HOT, 3.5)); notch.position.set(0, .2, .39); knob.add(notch); knob.position.set(1.15, -.7, .1); G.g.add(knob);
const gauge = new THREE.Mesh(new THREE.TorusGeometry(.62, .012, 8, 64, 2.8), emis(UV, 1.6)); gauge.position.set(1.15, -.7, .12); gauge.rotation.z = .17; G.g.add(gauge);
for (let i = 0; i < 6; i++) { const l = new THREE.Mesh(new THREE.SphereGeometry(.035, 10, 10), emis(i < 2 ? HOT : UV, 3)); l.position.set(-1.55 + i * .16, 1.1, .12); G.g.add(l); }
G.g.add(floorMesh(30, -1.6, .4), dir(0xff8a2a, 2.8, [5, 2, 3], [0, 0, 0]), dir(0xa98bff, 2.0, [-5, 3, 2], [0, 0, 0]), spot(0xffe6cc, 90, [0, 5, 5], [0, 0, 0], .6, true), new THREE.HemisphereLight(0x2a2250, 0x05040a, .5));
G.g.add(lightCone(TXT.clone(), 8, .2, 2.4, .08)); G.g.children[G.g.children.length - 1].position.set(-.5, 7, 1.5);
G.g.add(dustField(150, [8, 5, 5], 0xffd9b0, .04, 61));
const dialS = t => { let a = 0; for (let s = S("b12") + .6; s < t; s += 1 / 30) { const k = smooth((s - T.tSlow0) / (T.tSlow1 - T.tSlow0)); a += lerp(5.2, 1.0, k) / 30; } return a; };
G.update = t => { const ka = smooth((t - T.tSlow0) / (T.tSlow1 - T.tSlow0)); bigC.userData.set(dialS(t), { hot: 1 + .3 * (1 - ka) }); knob.rotation.z = ka * 2.6; const kp = anchorOf(knob, .4); G.A = { knob: kp }; };
const pathG = [{ t: S("b12"), p: [.2, -.4, 11], l: [.2, -.6, 0], f: 50, fp: [1.15, -.7, .2], ap: .0010 }, { t: T.tSlow0, p: [.2, -.4, 10.6], l: [.2, -.6, 0], f: 50, fp: [1.15, -.7, .2], ap: .0010 }, { t: T.tSlow1, p: [.2, -.4, 10.2], l: [.2, -.6, 0], f: 50, fp: [-.5, .1, .2], ap: .0010 }, { t: T.th0, p: [.2, -.4, 10], l: [.2, -.6, 0], f: 50, fp: [-.5, .1, .2], ap: .0010 }];

// ===== H: flat dark phone-map street grid; the Horizon pin drifts off the street and snaps back (b12 second half) =====
const Hh = shot("H", [0x08070d, .012]);
{ const gnd = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.MeshStandardMaterial({ color: 0x0b0914, roughness: .8, metalness: .1 })); gnd.rotation.x = -Math.PI / 2; Hh.g.add(gnd);
  const blocks = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: 0x1d1838, roughness: .7, metalness: .1, emissive: 0x15112e }), 600); let n = 0; const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), ps = new THREE.Vector3();
  for (let i = -8; i <= 8; i++) for (let j = -8; j <= 8; j++) { const w = 1.5 + hash(i * 7 + j * 3) * .5, h_ = 1.5 + hash(i * 5 + j * 11) * .5; ps.set(i * 2.4 + 1.2, .015, j * 2.4 + 1.2); sc.set(w, .03, h_); m4.compose(ps, q, sc); if (n < 600) blocks.setMatrixAt(n++, m4); }
  blocks.count = n; Hh.g.add(blocks);
  const mk = (x0, z0, x1, z1, w, c, k) => { const L = Math.hypot(x1 - x0, z1 - z0), m = new THREE.Mesh(new THREE.BoxGeometry(L, .012, w), emis(c, k)); m.position.set((x0 + x1) / 2, .035, (z0 + z1) / 2); m.rotation.y = -Math.atan2(z1 - z0, x1 - x0); Hh.g.add(m); return m; };
  for (let i = -8; i <= 9; i++) { mk(i * 2.4, -20, i * 2.4, 20, i % 3 ? .02 : .05, i % 3 ? UV : HAZE, i % 3 ? .5 : .8); mk(-20, i * 2.4, 20, i * 2.4, i % 3 ? .02 : .05, i % 3 ? UV : HAZE, i % 3 ? .5 : .8); }
  mk(-14, 10, 14, -10, .1, HAZE, .9);
  const river = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V3(-14, .02, 4.5), V3(-6, .02, 3.2), V3(2, .02, 5.4), V3(10, .02, 3.6), V3(16, .02, 4.4)]), 60, .42, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(0x2a1f4d) })); river.scale.y = .05; Hh.g.add(river);
  const route = mk(0, 0, 0, 6, .05, TXT, 1.3); Hh.userData = { route }; }
const pin = new THREE.Group(); { const pm_ = emis(HOT, 1.5); const head = new THREE.Mesh(new THREE.SphereGeometry(.3, 32, 24), pm_); head.position.y = .95; const cone = new THREE.Mesh(new THREE.ConeGeometry(.23, .7, 28), pm_); cone.rotation.x = Math.PI; cone.position.y = .42; pin.add(head, cone);
  const dot = new THREE.Mesh(new THREE.SphereGeometry(.11, 16, 12), new THREE.MeshBasicMaterial({ color: 0xf3f1ff })); dot.position.set(0, .95, .22); pin.add(dot); const pl = new THREE.PointLight(0xff8a2a, 6, 5, 2); pl.position.y = 1.1; pin.add(pl); const gs = glowSprite(HOT, 1.6, .35); gs.position.y = .95; pin.add(gs); }
Hh.g.add(pin);
const errRing = new THREE.Mesh(new THREE.RingGeometry(.97, 1, 64), addMat(HOT, { opacity: .9, side: THREE.DoubleSide })); errRing.rotation.x = -Math.PI / 2; errRing.position.y = .04; Hh.g.add(errRing);
const errFill = new THREE.Mesh(new THREE.CircleGeometry(1, 64), addMat(HOT, { opacity: .1, side: THREE.DoubleSide })); errFill.rotation.x = -Math.PI / 2; errFill.position.y = .038; Hh.g.add(errFill);
const trailN = 16, trailM = new THREE.InstancedMesh(new THREE.SphereGeometry(.05, 8, 8), emis(HOT, 3), trailN); Hh.g.add(trailM);
const rip = new THREE.Mesh(new THREE.RingGeometry(.97, 1, 64), addMat(TXT, { opacity: .9, side: THREE.DoubleSide })); rip.rotation.x = -Math.PI / 2; rip.position.y = .045; Hh.g.add(rip);
Hh.g.add(dir(0xa98bff, 1.2, [-3, 9, 4], [0, 0, 0]), new THREE.HemisphereLight(0x2a2250, 0x05040a, .8), dustField(80, [14, 4, 12], 0xc9b8ff, .03, 71));
Hh.update = t => {
  const lt = t - T.th0, kd = smooth((t - T.tDrift0) / (T.tDrift1 - T.tDrift0)), ks = eio((t - T.tSnap) / .35), k = kd * (1 - ks);
  const P0 = [0, 0], P1 = [1.25, .7], px = lerp(P0[0], P1[0], k), pz = lerp(P0[1], P1[1], k); pin.position.set(px, Math.sin(Math.PI * clamp((t - T.tSnap) / .35)) * .25, pz); pin.scale.setScalar(smooth((lt - .7) / .3) * (1 + .15 * Math.sin(Math.PI * clamp((t - T.tSnap) / .3))) + .001);
  errRing.position.set(px, .04, pz); errRing.scale.setScalar(.15 + 1.1 * k); errRing.material.opacity = k * .9; errFill.position.set(px, .038, pz); errFill.scale.copy(errRing.scale); errFill.material.opacity = k * .12;
  for (let i = 0; i < trailN; i++) { const u = i / (trailN - 1); dm.position.set(lerp(P0[0], px, u), .06, lerp(P0[1], pz, u)); dm.scale.setScalar(kd > 0 && t < T.tSnap + .35 && i % 2 === 0 ? 1 : 0); dm.rotation.set(0, 0, 0); dm.updateMatrix(); trailM.setMatrixAt(i, dm.matrix); } trailM.instanceMatrix.needsUpdate = true; dm.scale.setScalar(1);
  const ru = (t - (T.tSnap + .3)) / .7; rip.visible = ru > 0 && ru < 1; rip.scale.setScalar(.15 + 1.2 * eo3(ru)); rip.material.opacity = (1 - ru) * .9;
  Hh.userData.route.scale.x = smooth((lt - .4) / .5) + .001; Hh.A = {};
};
const pathH = [{ t: T.th0, p: [-.2, 8.2, 5.6], l: [.3, 0, .6], f: 40, fp: [0, 0, 0], ap: .0006 }, { t: T.tDrift1, p: [.3, 7.6, 5.0], l: [.6, 0, .6], f: 40, fp: [.6, 0, .3], ap: .0006 }, { t: E("b12"), p: [0, 7.9, 5.3], l: [.3, 0, .5], f: 40, fp: [0, 0, 0], ap: .0006 }];

// ===== I: verdict void (b13) and end card =====
const I = shot("I", [0x08070d, .03]);
{ const ringV = new THREE.Mesh(new THREE.TorusGeometry(2.2, .035, 16, 180), emis(UV, .5)); ringV.position.set(0, -3.3, -6); I.g.add(ringV); I.userData = { ringV };
  const tk = new THREE.InstancedMesh(new THREE.BoxGeometry(.04, .3, .04), emis(UV, .45), 60); const o = new THREE.Object3D(); for (let i = 0; i < 60; i++) { const a = i / 60 * 6.283; o.position.set(Math.sin(a) * 1.98, Math.cos(a) * 1.98 - 3.3, -6); o.rotation.z = -a; o.scale.setScalar(i % 5 ? .6 : 1.3); o.updateMatrix(); tk.setMatrixAt(i, o.matrix); } I.g.add(tk);
  const cone = lightCone(TXT.clone(), 12, .1, 3.0, .16); cone.position.set(.6, 8, -4); cone.rotation.z = .08; I.g.add(cone); I.userData.cone = cone; I.g.add(floorMesh(40, -2.2, .28), dustField(260, [12, 8, 10], 0xffd9b0, .05, 81), new THREE.HemisphereLight(0x3a2a70, 0x05040a, .6), dir(0xff8a2a, 1.4, [3, 3, -3], [0, 0, 0])); }
I.update = t => { I.userData.ringV.rotation.z = t * .04; I.A = {}; };
const pathI = [{ t: S("b13"), p: [0, 0, 8.5], l: [0, .1, 0], f: 50, fp: [0, .2, -4], ap: .0004 }, { t: T.tTrue, p: [0, 0, 8.5], l: [0, .1, 0], f: 50, fp: [0, .2, -4], ap: .0004 }, { t: S("b14"), p: [0, 0, 7.3], l: [0, .1, 0], f: 50, fp: [0, .2, -4], ap: .0004 }];
const pathIend = [{ t: 0, p: [0, 0, 7.3], l: [0, .1, 0], f: 50, fp: [0, .2, -4], ap: .0004 }];

// ===== J: taking the stairs, side-on (b14) =====
const J = shot("J", [0x08070d, .02]);
const SW = .9, SH_ = .4;
const treadM = mat({ color: 0x15102a, roughness: .45, metalness: .6, envMap, envMapIntensity: .5 });
for (let i = 0; i < T.NST; i++) { const top = (i + 1) * SH_, st = new THREE.Mesh(new THREE.BoxGeometry(SW, top, 1.8), treadM); st.position.set(i * SW + SW / 2, top / 2, 0); st.castShadow = st.receiveShadow = true; J.g.add(st);
  const e = new THREE.Mesh(new THREE.BoxGeometry(SW, .018, .02), emis(i % 2 ? UV : HOT, 2.4)); e.position.set(i * SW + SW / 2, top + .009, .9); J.g.add(e);
  const e2 = new THREE.Mesh(new THREE.BoxGeometry(.018, SH_, .02), emis(UV, 1.2)); e2.position.set(i * SW, top - SH_ / 2, .9); J.g.add(e2); }
{ const fl = new THREE.Mesh(new THREE.PlaneGeometry(40, 8), mat({ color: 0x0c0a16, roughness: .35, metalness: .7, envMap, envMapIntensity: .15 })); fl.rotation.x = -Math.PI / 2; fl.receiveShadow = true; J.g.add(fl);
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(40, 14), mat({ color: 0x050409, roughness: 1 })); wall.position.set(6, 5, -3); J.g.add(wall); }
const figA = makeSolidFigure({ pose: SOLID_POSE.hop }), figB = makeSolidFigure(), figJ = new THREE.Group(); figA.rotation.y = figB.rotation.y = Math.PI / 2; figJ.add(figA, figB); J.g.add(figJ);
const shJ = contactShadow(.5, .3, .85); shJ.children[0].visible = false; figJ.add(shJ);
J.g.add(spot(0xfff0dd, 110, [-1.5, 5.5, 3.5], [1.5, 1.2, 0], .7, true));
J.g.add(dir(0xff8a2a, 5, [6, 4, -4], [2, 1, 0]), dir(0xa98bff, 3, [-6, 3, -3], [2, 1, 0]), dir(0xf3f1ff, .12, [2, 3, 8], [2, 1, 0]), new THREE.HemisphereLight(0x2a2250, 0x05040a, .18));
J.g.add(dustField(200, [10, 6, 8], 0xffd9b0, .08, 91));
const standAt = i => [i < 0 ? -.55 : i * SW + SW / 2, i < 0 ? 0 : (i + 1) * SH_];
J.update = t => {
  let idx = -1; for (let i = 0; i < T.NST; i++) if (t >= T.arr(i)) idx = i;
  let a = standAt(idx), x = a[0], y = a[1], hop = false;
  const nx = idx + 1 < T.NST ? idx + 1 : -9; if (nx >= 0 && t > T.arr(nx) - .4) { const u = eio((t - (T.arr(nx) - .4)) / .4), b = standAt(nx); x = lerp(a[0], b[0], u); y = lerp(a[1], b[1], u) + Math.sin(u * Math.PI) * .25; hop = true; }
  figJ.position.set(x, y, 0); figA.visible = hop; figB.visible = !hop; figA.userData.update(t); figB.userData.update(t); shJ.visible = !hop;
  const p = proj(V3(x, y + 1.9, 0)); J.A = { plus: { x: p[0], y: p[1] } };
};
const pathJ = []; for (let i = -1; i < T.NST; i++) { const pp = standAt(i), tt = i < 0 ? S("b14") : T.arr(i) - .4; pathJ.push({ t: tt, p: [pp[0] + .35, pp[1] + .3, 7.2], l: [pp[0] + .35, pp[1] + .3, 0], f: 40, fp: [pp[0], pp[1] + .9, 0], ap: .0006 }); }
pathJ.push({ t: END("b14"), p: [standAt(T.NST - 1)[0] + .35, standAt(T.NST - 1)[1] + .3, 7.2], l: [standAt(T.NST - 1)[0] + .35, standAt(T.NST - 1)[1] + .3, 0], f: 40, fp: [4, 2, 0], ap: .0006 });

// ---------------- camera + shot control ----------------
const SH = [
  [0, S("b03"), A, [pathA, 0]], [S("b03"), S("b04"), B, [pathB, 0]], [S("b04"), S("b05"), Cs, [pathC, 0]], [S("b05"), S("b06"), A, [pathA2, 0]],
  [S("b06"), S("b09"), D, [pathD, 0]], [S("b09"), S("b11"), Es, [pathE, 0]], [S("b11"), S("b12"), F, [pathF, 0]], [S("b12"), T.th0, G, [pathG, 0]],
  [T.th0, S("b13"), Hh, [pathH, 0]], [S("b13"), S("b14"), I, [pathI, 0]], [S("b14"), S("b15"), J, [pathJ, 0]], [S("b15"), 1e9, A, [pathA3, 0]],
];
const glitchBuf = document.createElement("canvas");
const DOF = new Set(["A", "D", "E", "F", "G"]);
function setShot(sh, path, t, tt) {
  bokeh.enabled = DOF.has(sh.id) && !QP.has("nobokeh");
  Object.values(shots).forEach(s => (s.g.visible = s === sh));
  scene.fog = new THREE.FogExp2(sh.fog[0], sh.fog[1]);
  applyCamera(camera, bokeh, path, tt == null ? t : tt);
  sh.update(t);
}
window.__seek = function (t) {
  if (COVER) { setShot(A, [{ t: 0, p: [.55, 1.35, 8.2], l: [.6, 1.45, 0], f: 60, fp: [.6, 1.2, 0], ap: .0002 }], 0.5); HC.userData.set(21.2, { angle: 54, hot: 1.4 }); FC.userData.set(15, { angle: 20, hot: .8 });
    A.A = { head: anchorOf(HC, .3), feet: anchorOf(FC, .3) }; filmPass.uniforms.time.value = .5; composer.render(); ov.drawCover(A.A); return; }
  const shk = shakeAt(t);
  let cur = SH[SH.length - 1]; for (const s of SH) if (t >= s[0] && t < s[1]) { cur = s; break; }
  let sh = cur[2], path = cur[3][0];
  if (t >= T.tSign - .35) { sh = I; path = pathIend; }
  Object.values(shots).forEach(s => s.g.dispatchEvent && 0);
  [coneA, coneB, coneD].forEach(c => (c.material.uniforms.t.value = t)); dustA.userData.update(t);
  setShot(sh, path, t);
  bloom.strength = .45 + (t >= T.tTrue && t < T.tTrue + .5 ? .4 * (1 - (t - T.tTrue) / .5) : 0);
  filmPass.uniforms.time.value = (t * 30 | 0) * .017;
  composer.render();
  // glitch strips: the riser into the verdict and the stamp impact
  let gl = 0; if (t > T.tTrue - .45 && t < T.tTrue) gl = .5 + (t - (T.tTrue - .45)) / .45 * .5; else if (t >= T.tTrue && t < T.tTrue + .14) gl = .7;
  if (gl > 0) { glitchBuf.width = 1080; glitchBuf.height = 1920; }
  ov.draw(t, sh.A, shk); ov.captions(t);
  glc.style.transform = `translate(${shk[0]}px,${shk[1]}px)`;
};
window.__cues = T.cues; window.__duration = DUR;
window.__seek(COVER ? 0 : 0); window.__ready = true;
