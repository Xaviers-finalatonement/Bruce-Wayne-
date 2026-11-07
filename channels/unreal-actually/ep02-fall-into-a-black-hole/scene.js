// "Unreal, Actually" ep02: fall into a black hole. three.js 0.169 (vendored). Pure function of t: window.__seek(t) renders the frame.
// Black hole = screen-space geodesic shader (engine/film/blackhole.js) -> astronaut / clock / particles in 3D -> bloom -> ACES -> film pass; Anton/Barlow type is a 2D overlay + DOM captions.
import * as THREE from "three";
import { createPost } from "../../../engine/film/post.js";
import { createProps } from "../../../engine/film/props.js";
import { createBlackHoles } from "../../../engine/film/blackhole.js";
import { makeAstronaut } from "../../../engine/film/astronaut.js";
import { shakeAt as shakeAtF } from "../../../engine/film/camera.js";
import { clamp, smooth, eio, eo3, lerp, hash, makeTiming } from "./timing.js";
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

const HOT = new THREE.Color(C.horizon), UV = new THREE.Color(C.ultraviolet);
const glc = document.getElementById("gl");
const { renderer, scene, camera, composer, bokeh, bloom, filmPass } = createPost({ canvas: glc, theme: TH });
bokeh.enabled = false; camera.fov = 20; camera.position.set(0, 0, 20); camera.lookAt(0, 0, 0); camera.updateProjectionMatrix(); camera.updateMatrixWorld(true);
const PXU = 1920 / (2 * 20 * Math.tan(THREE.MathUtils.degToRad(10))); // px per world unit at z = 0
const wx = px => (px - 540) / PXU, wy = py => (960 - py) / PXU;
const { envMap, glowTex, makeClock } = createProps(renderer);
const BHs = createBlackHoles(scene), bh1 = BHs.make(-10), bh2 = BHs.make(-9), fall = BHs.makeFall(-8);

// ---- lights: orange key from the disk side, violet fill, a whisper of front light so the white suit reads ----
const keyL = new THREE.DirectionalLight(0xff8a2a, 4), fillL = new THREE.DirectionalLight(0xa98bff, 1), frontL = new THREE.DirectionalLight(0xfff0e8, .2);
scene.add(keyL, fillL, frontL, new THREE.HemisphereLight(0x2a2250, 0x05040a, .12));
const rig = (k, f, fr, kp = [6, 2.5, -4], fp = [-6, 1, -3]) => { keyL.intensity = k; fillL.intensity = f; frontL.intensity = fr; keyL.position.set(...kp); fillL.position.set(...fp); frontL.position.set(1, 2, 8); };

// ---- astronauts (pool) ----
const NAS = 8, astro = [], hold = [];
for (let i = 0; i < NAS; i++) { const a = makeAstronaut(envMap), h = new THREE.Group(); a.position.y = -.5; h.add(a); h.visible = false; scene.add(h); astro.push(a); hold.push(h); }
// x, y = pixel centre of the figure; h = pixel height; rz/ry = rotation; K = stretch; gap = tear; red/alpha
function place(i, o) {
  const a = astro[i], h = hold[i], U = a.userData.U; h.visible = true;
  h.position.set(wx(o.x), wy(o.y), o.z || 0); h.scale.setScalar(o.h / PXU); h.rotation.set(o.rx || 0, o.ry || 0, o.rz || 0, "YXZ");
  a.userData.pose(o.pose || {}); U.uK.value = o.K || 0; U.uGap.value = o.gap || 0; U.uTearY.value = o.tearY == null ? .5 : o.tearY; U.uRed.value = o.red || 0; U.uAlpha.value = o.alpha == null ? 1 : o.alpha;
  h.updateMatrixWorld(true); a.userData.update();
}
// ---- glow points (photon streaks, sparks) ----
const NPT = 220, pPos = new Float32Array(NPT * 3), pSz = new Float32Array(NPT), pA = new Float32Array(NPT), pC = new Float32Array(NPT * 3);
const pGeo = new THREE.BufferGeometry(); pGeo.setAttribute("position", new THREE.BufferAttribute(pPos, 3)); pGeo.setAttribute("aSize", new THREE.BufferAttribute(pSz, 1)); pGeo.setAttribute("aAlpha", new THREE.BufferAttribute(pA, 1)); pGeo.setAttribute("aCol", new THREE.BufferAttribute(pC, 3));
const pMat = new THREE.ShaderMaterial({ transparent: true, blending: THREE.AdditiveBlending, depthTest: false, depthWrite: false,
  vertexShader: "attribute float aSize; attribute float aAlpha; attribute vec3 aCol; varying float vA; varying vec3 vC; void main(){ vA=aAlpha; vC=aCol; gl_PointSize=aSize; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }",
  fragmentShader: "varying float vA; varying vec3 vC; void main(){ float d=length(gl_PointCoord-.5)*2.; float g=exp(-d*d*4.)*(1.-smoothstep(.85,1.,d)); gl_FragColor=vec4(vC*vA*g,1.); }" });
const pts = new THREE.Points(pGeo, pMat); pts.frustumCulled = false; pts.renderOrder = 6; scene.add(pts); pts.visible = false;
let npt = 0; const ptsBegin = () => { npt = 0; }; 
function ptAdd(x, y, size, a, c) { if (npt >= NPT) return; pPos.set([wx(x), wy(y), 1], npt * 3); pSz[npt] = size; pA[npt] = a; pC.set(c, npt * 3); npt++; }
function ptsEnd() { pts.visible = npt > 0; pGeo.setDrawRange(0, npt); ["position", "aSize", "aAlpha", "aCol"].forEach(k => (pGeo.attributes[k].needsUpdate = true)); }
// ---- sprites ----
const spr = (color, op = 1) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color, transparent: true, blending: THREE.AdditiveBlending, depthTest: false, depthWrite: false, opacity: op })); s.renderOrder = 7; s.visible = false; scene.add(s); return s; };
const sprFlare = spr(0xffa860), sprFlare2 = spr(0xa98bff), sprPin = spr(0xe9e0ff), sprPinHalo = spr(0xa98bff), sprPinHalo2 = spr(0xa98bff);
const sprPlace = (s, x, y, wpx, hpx, op) => { s.visible = op > 0; s.position.set(wx(x), wy(y), 2); s.scale.set(wpx / PXU, hpx / PXU, 1); s.material.opacity = op; };
// ---- foreground wrist rig for b05 ----
const wrist = new THREE.Group(); wrist.visible = false; scene.add(wrist);
const suitM = new THREE.MeshStandardMaterial({ color: 0xd8d4e6, roughness: .5, metalness: .05, envMap, envMapIntensity: .25 });
const clock = makeClock(.36, HOT); clock.position.set(wx(610), wy(1005), 3.2); wrist.add(clock);
{ const a0 = new THREE.Vector3(-3.4, -3.3, 3.1), a1 = new THREE.Vector3(wx(610) - .5, wy(1005) - .1, 2.9), d = a1.clone().sub(a0), len = d.length();
  const arm = new THREE.Mesh(new THREE.CapsuleGeometry(.2, len - .4, 8, 20), suitM); arm.position.copy(a0.clone().add(a1).multiplyScalar(.5)); arm.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); wrist.add(arm);
  const cuff = new THREE.Mesh(new THREE.TorusGeometry(.215, .05, 12, 32), new THREE.MeshStandardMaterial({ color: 0x8d8aa6, metalness: .6, roughness: .35, envMap, envMapIntensity: .6 })); cuff.position.copy(a1); cuff.quaternion.copy(arm.quaternion); cuff.quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2)); wrist.add(cuff); }

// ---- helpers ----
const EASE = eio, ez = (t, t0, t1, a, b, f = eio) => lerp(a, b, f((t - t0) / (t1 - t0)));
const hotC = [1.0, .62, .25], whiteC = [1, .9, .75], uvC = [.66, .55, 1];
function bhSet(L, o) {
  const u = L.material.uniforms; L.visible = true;
  u.uCenter.value.set(o.cx, o.cy); u.uScale.value = o.p; u.uTheta.value = o.th == null ? 1.485 : o.th; u.uRoll.value = o.roll == null ? -.1 : o.roll;
  u.uTime.value = o.time == null ? tNow : o.time; u.uDisc.value = o.disc == null ? 1 : o.disc; u.uStars.value = o.stars == null ? 1 : o.stars; u.uRing.value = o.ring == null ? 1 : o.ring;
  u.uOpacity.value = o.op == null ? 1 : o.op; u.uHeat.value = o.heat == null ? 1 : o.heat; u.uNeb.value = o.neb == null ? 1 : o.neb; u.uSpin.value = o.spin == null ? .09 : o.spin; u.uFlip.value = o.flip == null ? 1 : o.flip;
  u.uStarK.value = o.starK == null ? 1 : o.starK; u.uSeed.value = o.seed || 0; u.uClip.value.set(...(o.clip || [0, 0, 1080, 1920]));
}
const fallSet = (o) => { const u = fall.material.uniforms; fall.visible = true; u.uCenter.value.set(o.cx, o.cy); u.uTime.value = tNow; u.uSpeed.value = o.speed == null ? .5 : o.speed; u.uOpacity.value = o.op == null ? 1 : o.op; u.uDens.value = o.dens == null ? .8 : o.dens; u.uCore.value = o.core == null ? 1 : o.core; u.uClip.value.set(...(o.clip || [0, 0, 1080, 1920])); };
let tNow = 0;
// gravitational time dilation for a distant watcher: proper-time rate falls to zero, progress saturates
const rateF = x => Math.exp(-Math.pow(Math.max(x, 0) / 1.25, 1.6));
const tauF = x => { let s = 0; const n = 60; for (let i = 0; i < n; i++) s += rateF((i + .5) * x / n) * x / n; return s; };
const TAUMAX = 1.12;

// ================= the shots =================
function shotHook(t, A) { // b01 (0 .. S(b02)): hard push-in, the reach stalls
  const u = EASE(t / S("b02")), p = lerp(30, 40, u), cx = lerp(530, 548, u), cy = lerp(1010, 1000, u);
  bhSet(bh1, { cx, cy, p, stars: 1.1, th: 1.49, roll: -.14 });
  const rr = t < 1.7 ? 1 - Math.pow(1 - clamp(t / 1.75), 3) : 1, stut = t > 1.1 ? Math.floor(rr * 14) / 14 : rr; // frame-rate drop into a hold
  const hh = lerp(250, 300, u);
  rig(7, 1.2, .1); place(0, { x: lerp(585, 570, u), y: lerp(752, 745, u), h: hh, ry: -.5, rz: -.14, red: .25 * smooth((t - 1.5) / 1.5), pose: { reach: .88 * stut, flail: .25 * (1 - stut) * 0, phase: 1 } });
  A.astro = { x: 585, y: 750 };
}
function shotFar(t, A) { // b02: far observer on a ledge, long lens, the astronaut slows to a hold
  const lt = t - S("b02"), tau = tauF(lt) / TAUMAX, rate = rateF(lt);
  const cx = 540, cy = 770, p = 18.5, Rsh = p * 5.196;
  bhSet(bh1, { cx, cy, p, stars: 1.2, th: 1.5, roll: -.07 });
  const x0 = 95, y0 = 612, xe = cx - Rsh * 1.22, ye = cy - 26, s = tau, px = lerp(x0, xe, s), py = lerp(y0, ye, s) + Math.sin(tau * 9) * 4 * rate;
  rig(5, 1.2, .5); place(0, { x: px, y: py, h: 128, ry: .4, rz: -.2 + .35 * Math.sin(tau * 5) * rate, red: .88 * (1 - Math.pow(rate, .5)), alpha: .5 + .5 * Math.pow(rate, .4) + 0 * 0, pose: { reach: .5, flail: .9 * rate, phase: tau * 16 } });
  // the watcher on the ledge, seen from behind
  rig(5, 1.2, .5); place(1, { x: 215, y: 1560, h: 150, ry: Math.PI + .25, rz: 0, pose: { reach: 0 } });
  const fl = .8 + .2 * Math.sin(t * 3.1);
  sprPlace(sprFlare, cx, cy, 1500, 24, .85 * fl); sprPlace(sprFlare2, cx, cy, 1000, 14, .5 * fl);
  A.tau = tau * 1.0; A.rate = rate; A.ledge = true;
}
function photon(t, t0, t1, th0, dir, turns, A, Rsh, cx, cy, k = 1) {
  if (t < t0 - .05 || t > t1 + .5) return null;
  const s = clamp((t - t0) / (t1 - t0)), r = s2 => Rsh * (1.015 + 2.5 * Math.pow(1 - s2, 1.8)), th = s2 => th0 + dir * Math.pow(s2, .82) * Math.PI * 2 * turns;
  const P = s2 => [cx + Math.cos(th(s2)) * r(s2), cy - Math.sin(th(s2)) * r(s2)];
  const n = 70, fade = 1 - smooth((s - .93) / .07);
  for (let i = n; i >= 0; i--) { const q = Math.max(0, s - i / n * .3), pp = P(q), f = 1 - i / n; ptAdd(pp[0], pp[1], 5 + 22 * f * f * f, .05 + .95 * f * f * f * fade * k, i < 3 ? whiteC.map(v => v * 2.5) : f > .5 ? whiteC.map(v => v * 1.6) : hotC.map(v => v * 1.2)); }
  const h = P(s); return { x: h[0], y: h[1], s };
}
function shotHorizon(t, A) { // b03: a streak of light curves into the dark and vanishes at the razor-thin edge; the camera tracks it
  const lt = t - S("b03"), p0 = lerp(36, 58, EASE(lt / (E("b03") - S("b03")))), Rsh = p0 * 5.196;
  const h1 = photon(t, S("b03") + .15, T.tHorizon + .65, 2.7, -1, 1.05, A, Rsh, 540, 820, 1) , h2 = photon(t, T.tNoRet + .1, T.tNoRet + 1.35, 2.2, -1, .8, A, Rsh, 540, 820, .9);
  const h3 = photon(t, T.tNoLight - .1, T.tNoLight + 1.3, 3.5, -1, .9, A, Rsh, 540, 820, .85);
  // follow: the BH centre shifts so the light head stays near the middle of the frame
  let hd = h3 && t > T.tNoLight - .1 ? h3 : h2 && t > T.tNoRet + .1 ? h2 : h1; let fx = 0, fy = 0;
  if (hd) { const dx = hd.x - 540, dy = hd.y - 820; fx = -dx * .45; fy = -dy * .3; }
  // smooth the follow with its own ease so the pan is never a pop
  const cx = 540 + fx, cy = 830 + fy;
  ptsBegin(); [[S("b03") + .15, T.tHorizon + .65, 2.7, 1, 1.05, 1], [T.tNoRet + .1, T.tNoRet + 1.35, 2.2, 1, .8, .9], [T.tNoLight - .1, T.tNoLight + 1.3, 3.5, 1, .9, .85]].forEach(([a, b, th, d, tu, k]) => photon(t, a, b, th, -1, tu, A, Rsh, cx, cy, k));
  bhSet(bh1, { cx, cy, p: p0, stars: .9, th: 1.49, roll: -.1, ring: 1.15 });
  A.edge = { x: cx, y: cy - Rsh };
  const pulse = Math.max(smooth(1 - Math.abs(t - (T.tHorizon + .65)) / .22), smooth(1 - Math.abs(t - (T.tNoRet + 1.35)) / .22), smooth(1 - Math.abs(t - (T.tNoLight + 1.3)) / .22));
  bh1.material.uniforms.uRing.value = 1.15 + 1.4 * pulse; rig(0, 0, 0);
}
function shotWarp(t, A) { // b04: stars warp into arcs and double images, slow lateral slide, then the image smears and holds
  const lt = t - S("b04"), d = E("b04") - S("b04"), u = EASE(lt / d), cx = lerp(880, 380, u), cy = 810, p = lerp(24, 30, u);
  const gw = smooth((t - T.tBend + .2) / 1.2);
  bhSet(bh1, { cx, cy, p, stars: 1.7 + 1.0 * gw, neb: 2.4 + 1.8 * gw, starK: 1.0, th: 1.49, roll: -.09, disc: .7, heat: .8, seed: 2 });
  const Rsh = p * 5.196, a = smooth((t - T.tPic + .3) / .5);
  if (a > 0) { // the astronaut's image smears along the rim and holds
    rig(5, 1.2, .35); const ang0 = 2.6, N = 6;
    for (let i = 0; i < N; i++) { const k = i / (N - 1), sm = (1 - smooth((t - (T.tPic + 1.2)) / 1.0)), ang = ang0 - k * 0.55 * sm, rad = Rsh * (1.28 + .0 * k), q = 1 - k;
      place(i, { x: cx + Math.cos(ang) * rad, y: cy - Math.sin(ang) * rad * .8 - 30, h: 150, ry: .4, rz: -.2 + (ang - ang0) * 1.2, red: .35 + .55 * k, alpha: a * (i === 0 ? 1 : .42 * q), pose: { reach: .6, flail: .15, phase: 1 } }); } }
}
function shotClock(t, A) { // b05: over the shoulder, a steady wrist clock in sharp foreground
  const lt = t - S("b05"), u = EASE(lt / (E("b05") - S("b05")));
  bhSet(bh1, { cx: lerp(790, 770, u), cy: lerp(610, 600, u), p: lerp(20, 24, u), stars: 1, th: 1.49, roll: -.2, seed: 5 });
  rig(5, 1.0, .25, [7, 2, -4], [-6, 1, -3]);
  place(0, { x: lerp(255, 245, u), y: 1150, h: lerp(980, 1030, u), ry: Math.PI - .35, rz: .08, pose: { reach: 0 } });
  wrist.visible = true; clock.userData.set(lt * 1.0 + .0, { hot: 1.3 }); wrist.position.set(0, lerp(0, .05, u), 0); wrist.scale.setScalar(1);
  A.clock = true;
}
function shotGiant(t, A) { // b06: pull back; the astronaut shrinks to a speck against the huge disc
  const lt = t - S("b06"), d = E("b06") - S("b06"), u = EASE(clamp(lt / (d - .3))), p = lerp(54, 15.5, u), cx = 540, cy = lerp(780, 770, u), Rsh = p * 5.196;
  bhSet(bh1, { cx, cy, p, stars: 1, th: 1.49, roll: -.12, seed: 3 });
  const h = lerp(150, 12, Math.pow(u, .62)), ox = lerp(-.95, -1.12, u) * Rsh, oy = lerp(-1.18, -1.28, u) * Rsh;
  rig(4, .8, .25); place(0, { x: cx + ox, y: cy + oy + (-0.5 * h) * 0, h, ry: -.4, rz: -.2, pose: { reach: .7, flail: .0 } });
  const sr = Math.max(1.6, Rsh * .0211);
  A.sun = { x: 135, y: 1085, r: sr + 1.1 };
}
function shotCross(t, A) { // b07: dive over the edge, then the whole sky streams inward
  const T0 = S("b07");
  if (t < T.tCross) { const u = EASE((t - T0) / (T.tCross - T0)), p = lerp(24, 62, u * u * .6 + u * .4), Rsh = p * 5.196, dd = lerp(.62, .0, u * u);
    const ax = 540, ay = 780, cy = ay + 30 + (1 + dd) * Rsh;
    bhSet(bh1, { cx: 540, cy, p, stars: 1, th: 1.49, roll: lerp(-.12, 0, u), seed: 3, ring: 1 + 1.5 * smooth((u - .7) / .3) });
    rig(5, 1, .3); place(0, { x: ax, y: ay, h: lerp(120, 200, u), ry: -.3, rz: -.1, pose: { reach: .4 + .3 * u, flail: .35, phase: t * 4 } });
    A.flash = 0; }
  else { const lt = t - T.tCross, fl = Math.pow(Math.max(0, 1 - lt / .45), 2);
    fallSet({ cx: 540, cy: 780, speed: lerp(.5, .9, smooth(lt / 2)), op: 1, dens: .85 });
    rig(2.5, 1.6, .5, [4, 3, -6], [-5, 1, -4]);
    place(0, { x: 540, y: lerp(860, 900, smooth(lt / 3)), h: lerp(190, 150, smooth(lt / 3)), ry: Math.PI - .2, rz: .1 * Math.sin(lt * 1.5), pose: { reach: .55 + .2 * Math.sin(lt * 2), flail: .5, phase: lt * 3 } });
    A.flash = fl; }
}
function shotCount(t, A) { // b08: dark inner view, the countdown slams in
  const lt = t - S("b08");
  fallSet({ cx: 540, cy: 760, speed: lerp(.7, 1.3, smooth((t - T.tCount0) / (T.tCountEnd - T.tCount0))), op: .55, dens: .7, core: 1.3 });
  const gone = smooth((t - S("b08")) / 1.2);
  rig(2, 1.2, .4, [4, 3, -6], [-5, 1, -4]); place(0, { x: 540, y: 1000, h: 130, ry: Math.PI, rz: .15, alpha: .55 * (1 - gone), pose: { reach: .6, flail: .6, phase: lt * 3 } });
}
function shotNoodle(t, A) { // b09 + b10: side view, the nearer end is pulled harder, the silhouette stretches toward the hole
  const lt = t - S("b09"), cx = lerp(1030, 990, EASE(lt / 6)), cy = lerp(840, 900, smooth((t - S("b10")) / 2.2)) , p = lerp(43, 47, EASE(lt / 6));
  bhSet(bh1, { cx, cy, p, stars: .9, th: 1.49, roll: -.04, disc: .85, seed: 4 });
  const K = ez(t, S("b09") + .15, T.tNoodle + 1.6, 0, 2.3, eio) + (t > S("b10") ? ez(t, S("b10"), E("b10"), 0, 1.0, eio) : 0);
  const h = 230, ax = lerp(310, 285, EASE(lt / 6)), ay = cy + lerp(0, 10, 0);
  rig(5.5, 1.5, .25, [5, 3, -3], [-5, 1, 1]); place(0, { x: ax, y: ay, h, rz: Math.PI / 2 - .02, ry: .1, K, alpha: 1 - smooth((t - E("b10") + .5) / .5) * .8, pose: { reach: 0, flail: .12 * (1 - smooth(K / 2)), phase: lt * 2 } });
}
function shotSplit(t, A) { // b11: giant (calm) vs small (tears early)
  const lt = t - S("b11"), sx = 530; A.sx = sx;
  const Lc = [262, 790], Rc = [772, 790], pl = 19, pr = 7.4, Rl = pl * 5.196, Rr = pr * 5.196;
  bhSet(bh1, { cx: Lc[0], cy: Lc[1], p: pl, stars: 1, th: 1.49, roll: -.1, clip: [0, 0, sx, 1920], seed: 6 });
  bhSet(bh2, { cx: Rc[0], cy: Rc[1], p: pr, stars: 1, th: 1.49, roll: -.1, clip: [sx, 0, 1080, 1920], seed: 7, spin: .2 });
  const d = E("b11") - S("b11"), u = EASE(lt / d), mu = lt / d;
  rig(5, 1.2, .35);
  // left: calm, drifts toward the edge
  place(0, { x: Lc[0] + lerp(-1.7, -.35, u) * Rl, y: Lc[1] + lerp(-1.6, -1.15, u) * Rl, h: 100, ry: .3, rz: -.15, pose: { reach: .45, flail: .15, phase: lt * 2 } });
  // right: stretched hard while still far from the edge, then torn
  const Kr = ez(t, S("b11") + .5, T.tTear, 0, 1.5, eio) + (t > T.tTear ? (t - T.tTear) * 1.2 : 0), gap = t > T.tTear ? ez(t, T.tTear, T.tTear + .4, 0, .45, eo3) : 0;
  const rx = Rc[0] + lerp(-3.0, -1.55, EASE((t - S("b11")) / (T.tTear + 0.2 - S("b11")))) * Rr * 1.0 + (t > T.tTear ? (t - T.tTear) * 3 : 0), ry = Rc[1] + lerp(-3.0, -1.6, EASE((t - S("b11")) / (T.tTear + .2 - S("b11")))) * Rr + (t > T.tTear ? (t - T.tTear) * 6 : 0);
  place(1, { x: rx, y: ry, h: 120, rz: lerp(.5, 1.0, u) - .3, ry: .3, K: Kr, gap, tearY: .52, pose: { reach: .4, flail: .1, phase: lt * 2 }, red: .0 });
  ptsBegin(); if (t > T.tTear && t < T.tTear + 1.2) { const a = t - T.tTear; for (let i = 0; i < 90; i++) { const ang = hash(i) * 6.283, sp = 40 + hash(i * 3) * 330, r0 = sp * (1 - Math.exp(-a * 3.2)) / 3.2 * 1.0; ptAdd(rx + Math.cos(ang) * r0, ry + Math.sin(ang) * r0 * .8 + a * 40, 4 + 10 * hash(i * 5) * (1 - a / 1.2), (1 - a / 1.2) * (.4 + .6 * hash(i * 7)), i % 3 ? hotC.map(v => v * 1.6) : whiteC.map(v => v * 2)); } }
}
function shotPin(t, A) { // b12: a single pinprick of violet light; slow push-in
  const lt = t - S("b12"), d = E("b12") - S("b12"), u = EASE(lt / d), px = 505, py = 880;
  fallSet({ cx: px, cy: py, speed: lerp(.08, .45, u * u), op: lerp(.3, .55, u), dens: .55, core: 1.8 });
  const g = 1 + 1.9 * u; sprPlace(sprPin, px, py, 16 * g, 16 * g, 1); sprPlace(sprPinHalo, px, py, 150 * g, 150 * g, .7); sprPlace(sprPinHalo2, px, py, 620 * g, 620 * g, .22 + .12 * u);
  A.pin = { x: px, y: py };
}
function shotVerdictBG(t, A) { // b13/b14: the empty dark ring with a single faint photon ring
  const up = EASE((t - S("b14")) / (E("b14") - S("b14")));
  const op = t < S("b14") ? .22 : lerp(.22, 1, smooth((t - S("b14")) / 2.0)), p = t < S("b14") ? 36 : lerp(40, 31, up);
  bhSet(bh1, { cx: 505, cy: 740, p, disc: 0, ring: t < S("b14") ? .5 : lerp(.5, .85, smooth((t - S("b14")) / 2)), stars: .28, neb: .4, op, th: 1.49, roll: -.1, seed: 8 });
}
function shotFinal(t, A) { // b15: the same fall, two ways
  const lt = t - S("b15"), d = E("b15") - S("b15"), u = EASE(lt / d), sx = 530; A.sx = sx;
  const Lc = [lerp(262, 300, u), 800], Rc = [lerp(772, 740, u), 800], p = lerp(19, 23, u), Rs = p * 5.196;
  bhSet(bh1, { cx: Lc[0], cy: Lc[1], p, stars: 1, th: 1.49, roll: -.1, clip: [0, 0, sx, 1920], seed: 6 });
  bhSet(bh2, { cx: Rc[0], cy: Rc[1], p, stars: 1, th: 1.49, roll: -.1, clip: [sx, 0, 1080, 1920], seed: 6 });
  rig(5, 1.2, .3);
  // left: frozen at the rim, dim and red. right: slides through the edge
  const rl = rateF(lt * 1.4 + 1.2), tauL = tauF(lt * 1.4 + 1.2) / TAUMAX;
  place(0, { x: Lc[0] + lerp(-.55, -.18, tauL) * Rs, y: Lc[1] - 1.12 * Rs - 6, h: 140, ry: .3, rz: -.2, red: .8 * (1 - Math.pow(rl, .5)), alpha: .55 + .45 * Math.pow(rl, .4), pose: { reach: .6, flail: .2 * rl, phase: tauL * 10 } });
  const s = EASE(clamp((t - S("b15") - .2) / (d - .4)));
  place(1, { x: Rc[0] + lerp(-.55, .55, s) * Rs, y: Rc[1] + lerp(-1.12, -.15, s) * Rs, h: lerp(140, 112, s), ry: .3, rz: lerp(-.2, -.8, s), pose: { reach: .6, flail: .5, phase: lt * 5 }, alpha: 1 });
}

let lastShot = "";
function stage(t, A) {
  [bh1, bh2, fall, pts].forEach(o => (o.visible = false)); hold.forEach(h => (h.visible = false)); [sprFlare, sprFlare2, sprPin, sprPinHalo, sprPinHalo2].forEach(s => (s.visible = false)); wrist.visible = false;
  ptsBegin(); tNow = t;
  const s2 = S("b02");
  if (t >= T.tSign - .35) { shotVerdictBG(S("b13") + 1, A); bh1.material.uniforms.uOpacity.value = .18; bloom.strength = .4; }
  else if (t < s2) shotHook(t, A);
  else if (t < S("b03")) shotFar(t, A);
  else if (t < S("b04")) shotHorizon(t, A);
  else if (t < S("b05")) shotWarp(t, A);
  else if (t < S("b06")) shotClock(t, A);
  else if (t < S("b07")) shotGiant(t, A);
  else if (t < S("b08")) shotCross(t, A);
  else if (t < S("b09")) shotCount(t, A);
  else if (t < S("b11")) shotNoodle(t, A);
  else if (t < S("b12")) shotSplit(t, A);
  else if (t < S("b13")) shotPin(t, A);
  else if (t < S("b15")) shotVerdictBG(t, A);
  else shotFinal(t, A);
  if (t < T.tSign - .35) bloom.strength = .5 + (t > T.tStamp && t < T.tStamp + .4 ? .0 : 0);
  ptsEnd();
}

window.__seek = function (t) {
  const A = {};
  if (COVER) { // cover: black hole, tiny astronaut at the glowing edge, headline
    tNow = 3.1; [bh1, bh2, fall, pts].forEach(o => (o.visible = false)); hold.forEach(h => (h.visible = false)); ptsBegin();
    bhSet(bh1, { cx: 540, cy: 1180, p: 40, stars: 1.1, th: 1.49, roll: -.12, time: 3.1, ring: 1.2 });
    rig(5.5, 1.3, .4); place(0, { x: 640, y: 905, h: 150, ry: -.5, rz: -.14, red: .15, pose: { reach: .88 } });
    ptsEnd(); bloom.strength = .5; filmPass.uniforms.time.value = .5; composer.render(); ov.drawCover(); return;
  }
  const shk = shakeAt(t);
  stage(t, A);
  filmPass.uniforms.time.value = (t * 30 | 0) * .017;
  composer.render();
  ov.draw(t, A, shk); ov.captions(t);
  glc.style.transform = `translate(${shk[0]}px,${shk[1]}px)`;
};
window.__cues = T.cues; window.__duration = DUR;
window.__seek(0); window.__ready = true;
