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
const BHs = createBlackHoles(scene), bh1 = BHs.make(-10), bh2 = BHs.make(-9), fall = BHs.makeFall(-8), inside = BHs.makeInside(-8);

// ---- lights: orange key from the disk side, violet fill, a whisper of front light so the white suit reads ----
const keyL = new THREE.DirectionalLight(0xff8a2a, 4), fillL = new THREE.DirectionalLight(0xa98bff, 1), frontL = new THREE.DirectionalLight(0xfff0e8, .2);
const clockL = new THREE.PointLight(0xffd9b0, 0, 0, 2); scene.add(clockL);

scene.add(keyL, fillL, frontL, new THREE.HemisphereLight(0x2a2250, 0x05040a, .12));
const rig = (k, f, fr, kp = [6, 2.5, -4], fp = [-6, 1, -3]) => { keyL.intensity = k; fillL.intensity = f; frontL.intensity = fr; keyL.position.set(...kp); fillL.position.set(...fp); frontL.position.set(1, 2, 8); };

// ---- astronauts (pool) ----
const NAS = 8, astro = [], hold = [];
for (let i = 0; i < NAS; i++) { const a = makeAstronaut(envMap), h = new THREE.Group(); a.position.y = -.5; h.add(a); h.visible = false; scene.add(h); astro.push(a); hold.push(h); }
// x, y = pixel centre of the figure; h = pixel height; rz/ry = rotation; K = stretch; gap = tear; red/alpha
function place(i, o) {
  const a = astro[i], h = hold[i], U = a.userData.U; h.visible = true;
  h.position.set(wx(o.x), wy(o.y), o.z || 0); h.scale.setScalar(o.h / PXU); h.rotation.set(o.rx || 0, o.ry || 0, o.rz || 0, "YXZ");
  a.userData.pose(o.pose || {}); U.uK.value = o.K || 0; U.uGap.value = o.gap || 0; U.uTearY.value = o.tearY == null ? .5 : o.tearY; U.uRed.value = o.red || 0; U.uDark.value = o.dark || 0; U.uAlpha.value = o.alpha == null ? 1 : o.alpha;
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
// ---- foreground wrist rig for b05: forearm across the frame, a steadily ticking wrist clock facing the camera ----
const wrist = new THREE.Group(); wrist.visible = false; scene.add(wrist);
const suitM = new THREE.MeshStandardMaterial({ color: 0xa9a5bd, roughness: .5, metalness: .05, envMap, envMapIntensity: .3, emissive: 0x16122a, emissiveIntensity: 1 });
const CKR = .36, ckCv = document.createElement("canvas"); ckCv.width = ckCv.height = 512; const ckTex = new THREE.CanvasTexture(ckCv); ckTex.colorSpace = THREE.SRGBColorSpace; ckTex.anisotropy = 4;
function drawClock(sec) {
  const x = ckCv.getContext("2d"), tk = s => { const f = s - Math.floor(s); return 6 * (Math.floor(s) + (f < .14 ? 1 + 1.7 * Math.pow(f / .14 - 1, 3) + 1.7 * Math.pow(f / .14 - 1, 2) : 1)); };
  const g = x.createRadialGradient(230, 210, 20, 256, 256, 256); g.addColorStop(0, "#3a2d5c"); g.addColorStop(.75, "#16102a"); g.addColorStop(1, "#0b0814"); x.fillStyle = g; x.fillRect(0, 0, 512, 512);
  x.save(); x.translate(256, 256);
  for (let i = 0; i < 60; i++) { x.save(); x.rotate(i * Math.PI / 30); const big = i % 5 === 0; x.fillStyle = big ? "#F3F1FF" : "#9a96b8"; x.fillRect(-(big ? 5 : 2), -238, big ? 10 : 4, big ? 40 : 18); x.restore(); }
  x.fillStyle = "#F3F1FF"; x.font = "400 52px Anton"; x.textAlign = "center"; x.textBaseline = "middle"; [["12", 0, -165], ["3", 165, 3], ["6", 0, 168], ["9", -165, 3]].forEach(([s, px, py]) => x.fillText(s, px, py));
  const hand = (ang, len, w, col, tail, glow) => { x.save(); x.rotate(ang * Math.PI / 180); x.fillStyle = col; if (glow) { x.shadowColor = col; x.shadowBlur = 14; } x.beginPath(); x.moveTo(-w, tail); x.lineTo(w, tail); x.lineTo(w * .55, -len); x.lineTo(-w * .55, -len); x.fill(); x.restore(); };
  hand(sec / 60 * 6 + 70, 120, 9, "#F3F1FF", 24, false); hand(sec / 3600 * 6 + 20, 80, 11, "#F3F1FF", 20, false); hand(tk(sec), 205, 3.5, "#FF8A2A", 46, true);
  x.fillStyle = "#FF8A2A"; x.beginPath(); x.arc(0, 0, 13, 0, 6.3); x.fill(); x.restore(); ckTex.needsUpdate = true;
}
const ckFace = new THREE.Mesh(new THREE.CircleGeometry(CKR, 64), new THREE.MeshBasicMaterial({ map: ckTex })), clock = new THREE.Group(); clock.add(ckFace);
const bez = new THREE.Mesh(new THREE.TorusGeometry(CKR * 1.04, CKR * .1, 20, 72), new THREE.MeshStandardMaterial({ color: 0x8d8aa6, metalness: 1, roughness: .28, envMap, envMapIntensity: 1.6 })); bez.position.z = .01; clock.add(bez);
const bezAc = new THREE.Mesh(new THREE.TorusGeometry(CKR * .97, CKR * .012, 8, 72), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xFF8A2A).multiplyScalar(2.5) })); bezAc.position.z = .02; clock.add(bezAc);
clock.scale.setScalar(.8); scene.add(clock); clock.traverse(o => { if (o.material) { o.material.transparent = true; o.renderOrder = 2; } });
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
const insideSet = o => { const u = inside.material.uniforms; inside.visible = true; u.uCenter.value.set(o.cx, o.cy); u.uR.value = o.R; u.uTime.value = tNow; u.uRip.value = o.rip == null ? 1 : o.rip; u.uRipSpeed.value = o.speed == null ? -3 : o.speed; u.uOpacity.value = o.op == null ? 1 : o.op; u.uHeat.value = o.heat == null ? 1 : o.heat; u.uSeed.value = o.seed || 1; };
const pulseK = (t, t0, k = 4) => t < t0 ? 0 : Math.exp(-(t - t0) * k);
// gravitational time dilation for a distant watcher: proper-time rate falls to zero, progress saturates
const rateF = x => Math.exp(-Math.pow(Math.max(x, 0) / 1.25, 1.6));
const tauF = x => { let s = 0; const n = 60; for (let i = 0; i < n; i++) s += rateF((i + .5) * x / n) * x / n; return s; };
const TAUMAX = 1.12;

// ================= the shots =================
function shotHook(t, A) { // b01: hard push-in; the astronaut floats free in front of the disc and its reach stalls
  const u = EASE(t / S("b02")), p = lerp(30, 40, u), cx = lerp(530, 548, u), cy = lerp(1035, 1025, u);
  bhSet(bh1, { cx, cy, p, stars: 1.1, th: 1.49, roll: -.14 });
  const rr = t < 1.7 ? 1 - Math.pow(1 - clamp(t / 1.75), 3) : 1, stut = t > 1.1 ? Math.floor(rr * 14) / 14 : rr;
  rig(7.5, 1.4, .1, [6, 2.5, -3], [-6, 1, -3]);
  place(0, { x: lerp(430, 420, u) + 14 * (1 - rr), y: lerp(722, 712, u) + 10 * (1 - rr), h: lerp(250, 300, u), ry: -.6, rz: -.7 + .12 * (1 - rr), red: .3 * smooth((t - 1.5) / 1.5), pose: { reach: .88 * stut, flail: .2 * (1 - rr), phase: 1 } });
}
function shotFar(t, A) { // b02: far observer on a ledge, long lens, the astronaut slows to a hold
  const lt = t - S("b02"), tau = tauF(lt) / TAUMAX, rate = rateF(lt);
  const cx = 560, cy = 800, p = 23, Rsh = p * 5.196;
  bhSet(bh1, { cx, cy, p, stars: 1.2, th: 1.5, roll: -.07 });
  const x0 = 90, y0 = 600, xe = cx - Rsh * 1.2, ye = cy - 40, px = lerp(x0, xe, tau), py = lerp(y0, ye, tau) + Math.sin(tau * 9) * 4 * rate;
  rig(7, 1.4, .25); place(0, { x: px, y: py, h: 190, ry: .4, rz: -.2 + .35 * Math.sin(tau * 5) * rate, red: .88 * (1 - Math.pow(rate, .5)), alpha: .5 + .5 * Math.pow(rate, .4), pose: { reach: .5, flail: .9 * rate, phase: tau * 16 } });
  place(1, { x: 150, y: 1135 - 96, h: 190, ry: Math.PI - .6, dark: .25, pose: { reach: 0 } }); // the friend on a ledge, seen from behind
  const fl = .8 + .2 * Math.sin(t * 3.1);
  sprPlace(sprFlare, cx, cy, 1500, 22, .8 * fl); sprPlace(sprFlare2, cx, cy, 900, 12, .45 * fl);
  A.tau = tau; A.rate = rate; A.ledge = 1135;
}
function photon(t, t0, t1, th0, dir, turns, A, Rsh, cx, cy, k = 1) {
  if (t < t0 - .05 || t > t1 + .5) return null;
  const s = clamp((t - t0) / (t1 - t0)), r = s2 => Rsh * (1.015 + 1.5 * Math.pow(1 - s2, 1.8)), th = s2 => th0 + dir * Math.pow(s2, .82) * Math.PI * 2 * turns;
  const P = s2 => [cx + Math.cos(th(s2)) * r(s2), cy - Math.sin(th(s2)) * r(s2)];
  const n = 70, fade = 1 - smooth((s - .93) / .07);
  for (let i = n; i >= 0; i--) { const q = Math.max(0, s - i / n * .3), pp = P(q), f = 1 - i / n; ptAdd(pp[0], pp[1], 5 + 22 * f * f * f, .05 + .95 * f * f * f * fade * k, i < 3 ? whiteC.map(v => v * 2.5) : f > .5 ? whiteC.map(v => v * 1.6) : hotC.map(v => v * 1.2)); }
  const h = P(s); return { x: h[0], y: h[1], s };
}
function shotHorizon(t, A) { // b03: a streak of light curves into the dark and vanishes at the razor-thin edge; the camera tracks it
  const lt = t - S("b03"), p0 = lerp(36, 58, EASE(lt / (E("b03") - S("b03")))), Rsh = p0 * 5.196;
  const h1 = photon(t, S("b03") + .15, T.tHorizon + .65, 3.9, 1, .8, A, Rsh, 540, 820, 1), h2 = photon(t, T.tNoRet + .1, T.tNoRet + 1.35, 5.2, 1, .7, A, Rsh, 540, 820, .9);
  const h3 = photon(t, T.tNoLight - .1, T.tNoLight + 1.3, 3.4, 1, .75, A, Rsh, 540, 820, .85);
  // follow: the BH centre shifts so the light head stays near the middle of the frame
  let hd = h3 && t > T.tNoLight - .1 ? h3 : h2 && t > T.tNoRet + .1 ? h2 : h1; let fx = 0, fy = 0;
  if (hd) { const dx = hd.x - 540, dy = hd.y - 820; fx = -dx * .45; fy = -dy * .3; }
  // smooth the follow with its own ease so the pan is never a pop
  const cx = 540 + fx, cy = 830 + fy;
  ptsBegin(); [[S("b03") + .15, T.tHorizon + .65, 3.9, 1, .8, 1], [T.tNoRet + .1, T.tNoRet + 1.35, 5.2, 1, .7, .9], [T.tNoLight - .1, T.tNoLight + 1.3, 3.4, 1, .75, .85]].forEach(([a, b, th, d, tu, k]) => photon(t, a, b, th, 1, tu, A, Rsh, cx, cy, k));
  bhSet(bh1, { cx, cy, p: p0, stars: .9, th: 1.49, roll: -.1, ring: 1.15 });
  A.edge = { x: cx, y: cy - Rsh };
  const pulse = Math.max(smooth(1 - Math.abs(t - (T.tHorizon + .65)) / .22), smooth(1 - Math.abs(t - (T.tNoRet + 1.35)) / .22), smooth(1 - Math.abs(t - (T.tNoLight + 1.3)) / .22));
  bh1.material.uniforms.uRing.value = 1.15 + 1.4 * pulse; rig(0, 0, 0);
}
function shotWarp(t, A) { // b04: stars warp into arcs and double images, slow lateral slide, then the image smears and holds
  const lt = t - S("b04"), d = E("b04") - S("b04"), u = EASE(lt / d), cx = lerp(880, 380, u), cy = 810, p = lerp(24, 30, u);
  const gw = smooth((t - T.tBend + .2) / 1.2);
  bhSet(bh1, { cx, cy, p, stars: 1.7 + 1.0 * gw, neb: 1.6 + 1.0 * gw, starK: 1.0, th: 1.49, roll: -.09, disc: .7, heat: .8, seed: 2 });
  const Rsh = p * 5.196, a = smooth((t - T.tPic + .3) / .5);
  if (a > 0) { // the astronaut's image smears along the rim and holds
    rig(7, 1.4, .2); const ang0 = 2.55, N = 6;
    for (let i = 0; i < N; i++) { const k = i / (N - 1), sm = (1 - smooth((t - (T.tPic + 1.2)) / 1.0)), ang = ang0 - k * 0.55 * sm, rad = Rsh * (1.28 + .0 * k), q = 1 - k;
      place(i, { x: cx + Math.cos(ang) * rad, y: cy - Math.sin(ang) * rad * .8 - 30, h: 230, ry: .4, rz: -.2 + (ang - ang0) * 1.2, red: .25 + .6 * k, alpha: a * (i === 0 ? 1 : .5 * q), pose: { reach: .6, flail: .15, phase: 1 } }); } }
}
function shotClock(t, A) { // b05: over the shoulder; a chunky wrist clock faces the camera and ticks steadily
  const lt = t - S("b05"), u = EASE(lt / (E("b05") - S("b05")));
  bhSet(bh1, { cx: lerp(800, 780, u), cy: lerp(520, 510, u), p: lerp(20, 24, u), stars: 1, th: 1.49, roll: -.2, seed: 5 });
  rig(7.5, 1.1, .35, [8, 2.5, -3.5], [-7, 1.5, 3]);
  const a = astro[7].userData; place(7, { x: lerp(330, 315, u), y: 1250, h: lerp(900, 940, u), ry: 2.3, rz: .03, dark: .45, pose: { reach: .55 } });
  a.armL.el.rotation.x = -1.35; a.armL.sh.rotation.x = -1.0; a.armL.sh.rotation.z = .5; hold[7].updateMatrixWorld(true);
  const wp = new THREE.Vector3(0, -.15, 0); a.armL.el.localToWorld(wp); clock.position.set(wp.x + .08, wp.y + .1, wp.z + .5); clock.rotation.set(0, 0, 0); clock.scale.setScalar(.8);
  clock.visible = true; drawClock(lt + 5);
}

function shotGiant(t, A) { // b06: pull back; the astronaut shrinks to a speck against the huge disc
  const lt = t - S("b06"), d = E("b06") - S("b06"), u = EASE(clamp(lt / (d - .3))), p = lerp(54, 15.5, u), cx = 540, cy = lerp(780, 770, u), Rsh = p * 5.196;
  bhSet(bh1, { cx, cy, p, stars: 1, th: 1.49, roll: -.12, seed: 3 });
  const h = lerp(150, 20, Math.pow(u, .62)), ox = lerp(-.95, -1.12, u) * Rsh, oy = lerp(-1.18, -1.28, u) * Rsh;
  rig(4, .8, .25); place(0, { x: cx + ox, y: cy + oy + (-0.5 * h) * 0, h, ry: -.4, rz: -.2, pose: { reach: .7, flail: .0 } });
  A.sun = { x: 135, y: 1085, r: Math.max(.9, Rsh * .0211) };
}
function insideShot(t, A) { // inside the horizon: the whole outside universe crushed into a shrinking window of light behind you, space flowing inward
  const lt = t - T.tCross, d = E("b08") - T.tCross, u = smooth(lt / d);
  const heat = 1 + 1.6 * pulseK(t, T.tCross, 3) + .9 * pulseK(t, T.tCross + 2.0, 4) + .9 * pulseK(t, T.tCross + 4.0, 4) + .9 * pulseK(t, T.tSlam8, 4);
  insideSet({ cx: 540, cy: 930, R: lerp(400, 140, u) - 12 * pulseK(t, T.tCross + 2.0, 5) - 12 * pulseK(t, T.tCross + 4.0, 5), rip: lerp(.7, 1.1, u), speed: -3.4, heat });
  rig(8, 1.6, 0, [0, 1.5, -8], [-6, 1, -4]);
  place(0, { x: 540, y: lerp(960, 990, u), h: lerp(300, 230, u), ry: .25 * Math.sin(lt * .9), rz: .35 * Math.sin(lt * .7), rx: .2 * Math.sin(lt * .6 + 1), pose: { reach: .5 + .25 * Math.sin(lt * 1.6), flail: .45, phase: lt * 3 } });
}
function shotCross(t, A) { // b07: dive over the edge, then the sky shrinks to a window behind you
  const T0 = S("b07");
  if (t < T.tCross) { const u = EASE((t - T0) / (T.tCross - T0)), p = lerp(24, 62, u * u * .6 + u * .4), Rsh = p * 5.196, dd = lerp(.62, .0, u * u);
    const ax = 540, ay = 700, cy = ay + 70 + (1 + dd) * Rsh;
    bhSet(bh1, { cx: 540, cy, p, stars: 1, th: 1.49, roll: lerp(-.12, 0, u), seed: 3, ring: 1 + 1.5 * smooth((u - .7) / .3) });
    rig(7.5, 1, .2); place(0, { x: ax, y: ay, h: lerp(130, 220, u), ry: -.3, rz: -.5, pose: { reach: .4 + .3 * u, flail: .35, phase: t * 4 } });
    A.flash = 0; }
  else { insideShot(t, A); A.flash = Math.pow(Math.max(0, 1 - (t - T.tCross) / .45), 2); }
}
function shotCount(t, A) { insideShot(t, A); }
function shotNoodle(t, A) { // b09 + b10: side view, the nearer end is pulled harder, the silhouette stretches toward the hole
  const lt = t - S("b09"), cx = lerp(1030, 990, EASE(lt / 6)), cy = 880 + 170 * smooth((t - S("b10") + .1) / 1.3), p = lerp(43, 47, EASE(lt / 6));
  bhSet(bh1, { cx, cy, p, stars: .9, th: 1.49, roll: -.04, disc: .85, seed: 4 });
  const K = ez(t, S("b09") + .15, T.tNoodle + 1.6, 0, 1.7, eio) + (t > S("b10") ? ez(t, S("b10"), E("b10"), 0, .7, eio) : 0);
  const h = 340, ax = lerp(330, 310, EASE(lt / 6)), ay = cy;
  rig(5.5, 1.5, .25, [5, 3, -3], [-5, 1, 1]); place(0, { x: ax, y: ay, h, rz: Math.PI / 2 - .02, ry: .55, rx: .1, K, dark: .35, alpha: 1 - smooth((t - E("b10") + .5) / .5) * .8, pose: { reach: 0, flail: .12 * (1 - smooth(K / 2)), phase: lt * 2 } });
}
function shotSplit(t, A) { // b11: giant (calm) vs small (tears early)
  const lt = t - S("b11"), sx = 530; A.sx = sx;
  const Lc = [262, 840], Rc = [772, 840], pl = 21, pr = 9.5, Rl = pl * 5.196, Rr = pr * 5.196;
  bhSet(bh1, { cx: Lc[0], cy: Lc[1], p: pl, stars: 1, th: 1.49, roll: -.1, clip: [0, 0, sx, 1920], seed: 6 });
  bhSet(bh2, { cx: Rc[0], cy: Rc[1], p: pr, stars: 1, th: 1.49, roll: -.1, clip: [sx, 0, 1080, 1920], seed: 7, spin: .2 });
  const d = E("b11") - S("b11"), u = EASE(lt / d), mu = lt / d;
  rig(5, 1.2, .35);
  // left: calm, drifts toward the edge
  place(0, { x: Lc[0] + lerp(-1.7, -.35, u) * Rl, y: Lc[1] + lerp(-1.6, -1.15, u) * Rl, h: 130, ry: .3, rz: -.15, pose: { reach: .45, flail: .15, phase: lt * 2 } });
  // right: stretched hard while still far from the edge, then torn
  const Kr = ez(t, S("b11") + .6, T.tTear, 0, 1.0, eio) + (t > T.tTear ? (t - T.tTear) * .5 : 0), gap = t > T.tTear ? ez(t, T.tTear, T.tTear + .45, 0, .5, eo3) : 0;
  const rx = Rc[0] + lerp(-3.0, -1.55, EASE((t - S("b11")) / (T.tTear + 0.2 - S("b11")))) * Rr * 1.0 + (t > T.tTear ? (t - T.tTear) * 3 : 0), ry = Rc[1] + lerp(-3.0, -1.6, EASE((t - S("b11")) / (T.tTear + .2 - S("b11")))) * Rr + (t > T.tTear ? (t - T.tTear) * 6 : 0);
  place(1, { x: rx, y: ry, h: 175, rz: lerp(.35, .75, u) - .3, ry: .3, K: Kr, gap, tearY: .52, pose: { reach: .4, flail: .1, phase: lt * 2 }, red: .0 });
  ptsBegin(); if (t > T.tTear && t < T.tTear + 1.2) { const a = t - T.tTear; for (let i = 0; i < 90; i++) { const ang = hash(i) * 6.283, sp = 40 + hash(i * 3) * 330, r0 = sp * (1 - Math.exp(-a * 3.2)) / 3.2 * 1.0; ptAdd(rx + Math.cos(ang) * r0, ry + Math.sin(ang) * r0 * .8 + a * 40, 4 + 10 * hash(i * 5) * (1 - a / 1.2), (1 - a / 1.2) * (.4 + .6 * hash(i * 7)), i % 3 ? hotC.map(v => v * 1.6) : whiteC.map(v => v * 2)); } }
}
function shotPin(t, A) { // b12: a single pinprick of violet light at the end of flowing space; slow push-in
  const lt = t - S("b12"), d = E("b12") - S("b12"), u = EASE(lt / d), px = 505, py = 880;
  insideSet({ cx: px, cy: py, R: 0, rip: lerp(.5, 1.5, u), speed: -lerp(2, 6, u), op: .9 });
  const pk = Math.exp(-(((lt - .2) % 1.8 + 1.8) % 1.8) * 3), g = (1 + 1.9 * u) * (1 + .3 * pk);
  sprPlace(sprPin, px, py, 16 * g, 16 * g, 1); sprPlace(sprPinHalo, px, py, 110 * g, 110 * g, .6); sprPlace(sprPinHalo2, px, py, 420 * g, 420 * g, .12 + .08 * u);
  A.pin = { x: px, y: py };
}
function shotVerdictBG(t, A) { // b14 / b13 / end: the empty dark ring with a single faint photon ring; b14 sends pulses that never get out
  const b14 = t >= S("b14") && t < S("b13"), lt = t - S("b14");
  const p = b14 ? lerp(60, 50, EASE(lt / (E("b14") - S("b14")))) : 44, op = b14 ? lerp(.3, 1, smooth(lt / 1.6)) : .22;
  bhSet(bh1, { cx: 505, cy: 800, p, disc: 0, ring: b14 ? lerp(.6, 1.1, smooth(lt / 2)) : .5, stars: .5, neb: .7, op, th: 1.49, roll: -.1, seed: 8 });
  if (b14) { A.pulses = [T.tNoth, T.tNoth + 1.9].map(t0 => ({ u: (t - t0) / 1.4, cx: 505, cy: 800, R: p * 5.196 })); }
}
function shotFinal(t, A) { // b15: the same fall, two ways: frozen at the rim vs sliding through
  const lt = t - S("b15"), d = E("b15") - S("b15"), u = EASE(lt / d), sx = 530; A.sx = sx;
  const Lc = [lerp(262, 290, u), 860], Rc = [lerp(772, 750, u), 860], p = lerp(21, 25, u), Rs = p * 5.196;
  bhSet(bh1, { cx: Lc[0], cy: Lc[1], p, stars: 1, th: 1.49, roll: -.1, clip: [0, 0, sx, 1920], seed: 6 });
  bhSet(bh2, { cx: Rc[0], cy: Rc[1], p, stars: 1, th: 1.49, roll: -.1, clip: [sx, 0, 1080, 1920], seed: 6 });
  rig(7.5, 1.3, .2);
  const rl = rateF(lt * 1.4 + 1.2), tauL = tauF(lt * 1.4 + 1.2) / TAUMAX;
  place(0, { x: Lc[0] + lerp(-.65, -.2, tauL) * Rs, y: Lc[1] - 1.3 * Rs, h: 215, ry: .3, rz: -.6, red: .6 * (1 - Math.pow(rl, .5)), alpha: .85 + .15 * Math.pow(rl, .4), pose: { reach: .6, flail: .2 * rl, phase: tauL * 10 } });
  const f = clamp((t - T.tYou - .2) / 1.9), fe = f * f * (3 - 2 * f), fall1 = lt < 1 ? 0 : fe;
  place(1, { x: Rc[0] + lerp(-.65, .1, fall1) * Rs + 8 * Math.sin(lt * 1.3), y: Rc[1] + lerp(-1.3, .15, fall1) * Rs, h: lerp(215, 120, fall1), ry: .3, rz: lerp(-.6, -.2, fall1) + .2 * Math.sin(lt * 2), pose: { reach: .6, flail: .55, phase: lt * 5 }, alpha: 1 });
  A.gL = { x: 150, y: 560, tau: tauL, frozen: rl < .12 }; A.gR = { x: 830, y: 560, tau: lt * .09 + (t - T.tYou) * .0 };
}

let lastShot = "";
function stage(t, A) {
  [bh1, bh2, fall, inside, pts].forEach(o => (o.visible = false)); hold.forEach(h => (h.visible = false)); [sprFlare, sprFlare2, sprPin, sprPinHalo, sprPinHalo2].forEach(s => (s.visible = false)); clockL.intensity = 0;
  ptsBegin(); tNow = t; clock.visible = false;
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
  else if (t < S("b14")) shotPin(t, A);
  else if (t < S("b15")) shotVerdictBG(t, A);
  else shotFinal(t, A);
  if (t < T.tSign - .35) bloom.strength = .5 + (t > T.tStamp && t < T.tStamp + .4 ? .0 : 0);
  ptsEnd();
}

window.__seek = function (t) {
  const A = {};
  if (COVER) { // cover: black hole, tiny astronaut at the glowing edge, headline
    tNow = 3.1; clock.visible = false; [bh1, bh2, fall, inside, pts].forEach(o => (o.visible = false)); hold.forEach(h => (h.visible = false)); ptsBegin();
    bhSet(bh1, { cx: 540, cy: 1390, p: 46, stars: 1.1, th: 1.49, roll: -.12, time: 3.1, ring: 1.2 });
    rig(5.5, 1.3, .4); place(0, { x: 470, y: 1090, h: 210, ry: -.6, rz: -.7, red: .15, pose: { reach: .88 } });
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
