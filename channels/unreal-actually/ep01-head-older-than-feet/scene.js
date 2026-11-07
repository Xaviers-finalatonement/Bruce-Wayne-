// "Unreal, Actually" ep01 in real 3D (three.js 0.169, vendored). Pure function of t: window.__seek(t) renders the frame.
// 3D image -> bloom -> filmic output -> film pass (grain/vignette/halation); Anton/Barlow type is a 2D overlay + DOM captions.
import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { BokehPass } from "three/addons/postprocessing/BokehPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { clamp, smooth, eio, eo3, eob, lerp, hash, makeTiming } from "./timing.js";
import { createOverlay } from "./overlay.js";

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

// ---------------- renderer + post ----------------
const glc = document.getElementById("gl");
const renderer = new THREE.WebGLRenderer({ canvas: glc, antialias: false, preserveDrawingBuffer: true, powerPreference: "high-performance" });
renderer.setPixelRatio(1); renderer.setSize(1080, 1920, false); renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.NoToneMapping; // ACES is applied by the OutputPass
const scene = new THREE.Scene(); scene.background = ABY.clone();
const camera = new THREE.PerspectiveCamera(40, 1080 / 1920, .05, 300);
const rt = new THREE.WebGLRenderTarget(1080, 1920, { type: THREE.HalfFloatType, samples: 4 });
const composer = new EffectComposer(renderer, rt); composer.setSize(1080, 1920);
composer.addPass(new RenderPass(scene, camera));
const bokeh = new BokehPass(scene, camera, { focus: 8, aperture: .0004, maxblur: .012 }); composer.addPass(bokeh);
const bloom = new UnrealBloomPass(new THREE.Vector2(540, 960), .5, .55, .9); composer.addPass(bloom);
const outp = new OutputPass(); composer.addPass(outp);
renderer.toneMappingExposure = 1.0;
const filmPass = new ShaderPass({
  uniforms: { tDiffuse: { value: null }, time: { value: 0 }, grain: { value: TH.look.grain * 1.6 }, vig: { value: .8 } },
  vertexShader: "varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }",
  fragmentShader: `uniform sampler2D tDiffuse; uniform float time, grain, vig; varying vec2 vUv;
    float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)))*43758.5453); }
    void main(){
      vec2 c = vUv-.5; float r = dot(c,c);
      vec2 off = c*r*.012;                                  // slight lateral chroma
      vec3 col = vec3(texture2D(tDiffuse, vUv+off).r, texture2D(tDiffuse, vUv).g, texture2D(tDiffuse, vUv-off).b);
      // halation: warm bleed around bright areas (cheap 8-tap)
      vec3 hal = vec3(0.);
      for(int i=0;i<8;i++){ float a=float(i)*.785398; vec2 d=vec2(cos(a),sin(a))*vec2(.006,.0034)*(1.+float(i%2)); hal += texture2D(tDiffuse, vUv+d).rgb; }
      hal/=8.; col += max(hal-.55,0.)*vec3(.55,.2,.05)*.9;
      col *= 1.-vig*smoothstep(.12,.62,r*1.6);               // vignette
      float g = h(vUv*vec2(1080.,1920.)+time*91.)-.5; col += g*grain*(.5+.8*(1.-dot(col,vec3(.33))));
      gl_FragColor = vec4(col,1.);
    }` });
composer.addPass(filmPass);
bloom.threshold = .85;

// ---------------- procedural textures ----------------
function canvasTex(w, h, fn, srgb = true) { const c = document.createElement("canvas"); c.width = w; c.height = h; const x = c.getContext("2d"); fn(x, w, h); const t = new THREE.CanvasTexture(c); t.anisotropy = 4; if (srgb) t.colorSpace = THREE.SRGBColorSpace; return t; }
const noiseTex = (w, h, k = 1, seed = 1) => canvasTex(w, h, (x, W_, H_) => { const im = x.createImageData(W_, H_); for (let i = 0; i < im.data.length; i += 4) { const v = 128 + (hash(i * .13 + seed) - .5) * 255 * k; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255; } x.putImageData(im, 0, 0); }, false);
const scratchTex = (seed) => canvasTex(512, 512, (x, w, h) => { x.fillStyle = "#808080"; x.fillRect(0, 0, w, h);
  for (let i = 0; i < 260; i++) { const a = hash(i + seed) * 6.28, l = 10 + hash(i * 3 + seed) * 70, px = hash(i * 7 + seed) * w, py = hash(i * 11 + seed) * h; x.strokeStyle = `rgba(${hash(i) > .5 ? 255 : 0},${hash(i) > .5 ? 255 : 0},${hash(i) > .5 ? 255 : 0},${.08 + hash(i * 5) * .2})`; x.lineWidth = .5 + hash(i * 13) * 1.2; x.beginPath(); x.moveTo(px, py); x.lineTo(px + Math.cos(a) * l, py + Math.sin(a) * l); x.stroke(); }
  for (let i = 0; i < 4000; i++) { x.fillStyle = `rgba(128,128,128,${hash(i + seed) * .3})`; x.fillRect(hash(i * 2 + seed) * w, hash(i * 3 + seed) * h, 1.5, 1.5); } }, false);
const glowTex = canvasTex(128, 128, (x) => { const g = x.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, "rgba(255,255,255,1)"); g.addColorStop(.25, "rgba(255,255,255,.35)"); g.addColorStop(1, "rgba(255,255,255,0)"); x.fillStyle = g; x.fillRect(0, 0, 128, 128); });

// environment for metal reflections: a tiny studio of emissive panels
const pm = new THREE.PMREMGenerator(renderer);
const envScene = new THREE.Scene(); envScene.background = new THREE.Color(0x05040a);
[[0xff8a2a, 14, [8, 2, 3], [3, 8, 1]], [0xa98bff, 6, [-8, 1, 2], [2, 10, 1]], [0xf3f1ff, 9, [0, 9, 2], [10, 1, 6]], [0xf3f1ff, 3, [0, -1, 9], [8, 3, 1]]].forEach(([c, k, p, s]) => { const m = new THREE.Mesh(new THREE.BoxGeometry(...s), new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(k) })); m.position.set(...p); envScene.add(m); });
const envMap = pm.fromScene(envScene, .02).texture;

// ---------------- reusable builders ----------------
const mat = (o) => new THREE.MeshStandardMaterial(o);
const emis = (c, k = 3) => new THREE.MeshBasicMaterial({ color: c.clone ? c.clone().multiplyScalar(k) : new THREE.Color(c).multiplyScalar(k), toneMapped: true });
const addMat = (c, o = {}) => new THREE.MeshBasicMaterial(Object.assign({ color: c, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }, o));

function glowSprite(color, size, a = 1) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: a })); s.scale.set(size, size, 1); return s; }
function lightCone(color, len, r0, r1, a = .15) {
  const g = new THREE.CylinderGeometry(r1, r0, len, 40, 1, true); g.translate(0, -len / 2, 0);
  const m = new THREE.ShaderMaterial({ transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, uniforms: { c: { value: color }, a: { value: a }, t: { value: 0 } },
    vertexShader: "varying vec3 vP; varying vec3 vN; varying vec3 vV; void main(){ vP=position; vN=normalize(normalMatrix*normal); vec4 mv=modelViewMatrix*vec4(position,1.); vV=normalize(-mv.xyz); gl_Position=projectionMatrix*mv; }",
    fragmentShader: "uniform vec3 c; uniform float a,t; varying vec3 vP; varying vec3 vN; varying vec3 vV; void main(){ float f=pow(abs(dot(vN,vV)),1.6); float y=clamp(-vP.y/" + len.toFixed(2) + ",0.,1.); float band=.8+.2*sin(vP.x*9.+t*.6+vP.z*7.); gl_FragColor=vec4(c*a*f*(1.-y)*(1.-y)*band,1.); }" });
  return new THREE.Mesh(g, m);
}
function dustField(n, box, color, size, seed) {
  const pos = new Float32Array(n * 3); for (let i = 0; i < n; i++) { pos[i * 3] = (hash(i + seed) - .5) * box[0]; pos[i * 3 + 1] = (hash(i * 3 + seed) - .5) * box[1]; pos[i * 3 + 2] = (hash(i * 7 + seed) - .5) * box[2]; }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const p = new THREE.Points(g, new THREE.PointsMaterial({ map: glowTex, color, size, transparent: true, opacity: .75, blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true }));
  p.userData.update = t => { p.position.y = Math.sin(t * .15 + seed) * .3 + t * .02 % 1 * 0; p.rotation.y = t * .01; p.position.x = Math.sin(t * .1 + seed) * .25; }; return p;
}

// --- clock: bezel, scratched face, glass dome, hands ---
function makeClock(R, accent) {
  const g = new THREE.Group(), ac = accent.clone();
  const face = canvasTex(1024, 1024, (x, w, h) => {
    const gr = x.createRadialGradient(480, 440, 40, 512, 512, 512); gr.addColorStop(0, "#2a2142"); gr.addColorStop(.7, "#0f0b1a"); gr.addColorStop(1, "#07060d"); x.fillStyle = gr; x.fillRect(0, 0, w, h);
    for (let i = 0; i < 3000; i++) { x.fillStyle = `rgba(255,255,255,${hash(i) * .05})`; x.fillRect(hash(i * 3) * w, hash(i * 5) * h, 2, 1); }
    x.translate(512, 512); for (let i = 0; i < 60; i++) { x.save(); x.rotate(i * Math.PI / 30); const big = i % 5 === 0; x.fillStyle = big ? "#f3f1ff" : "#8d8aa6"; x.fillRect(-(big ? 9 : 4), -470, big ? 18 : 8, big ? 78 : 36); x.restore(); }
    x.fillStyle = "#f3f1ff"; x.font = "400 96px Anton"; x.textAlign = "center"; x.textBaseline = "middle"; [["12", 0, -330], ["3", 330, 0], ["6", 0, 330], ["9", -330, 0]].forEach(([s, px, py]) => x.fillText(s, px, py));
    x.strokeStyle = "rgba(243,241,255,.14)"; x.lineWidth = 3; x.beginPath(); x.arc(0, 0, 350, 0, 6.3); x.stroke(); });
  const fm = new THREE.Mesh(new THREE.CircleGeometry(R * .96, 64), new THREE.MeshStandardMaterial({ map: face, emissiveMap: face, emissive: 0xffffff, emissiveIntensity: .32, roughness: .5, metalness: .2, envMap, envMapIntensity: .3 }));
  g.add(fm);
  const prof = [[R * .97, -.02], [R * 1.03, -.02], [R * 1.12, .01], [R * 1.14, .05], [R * 1.1, .085], [R * 1.0, .09], [R * .97, .06]].map(p => new THREE.Vector2(p[0], p[1] * R * 1.3));
  const bez = new THREE.Mesh(new THREE.LatheGeometry(prof, 72), new THREE.MeshStandardMaterial({ color: 0x9a97aa, metalness: 1, roughness: .26, envMap, envMapIntensity: 1.4, bumpMap: scratchTex(5), bumpScale: 1.5, side: THREE.DoubleSide }));
  bez.rotation.x = Math.PI / 2; bez.position.z = 0; g.add(bez);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(R * 1.0, R * .018, 12, 96), emis(ac, 4)); ring.position.z = .1 * R * .7; g.add(ring);
  const glass = new THREE.Mesh(new THREE.SphereGeometry(R * 3.2, 48, 16, 0, 6.2832, 0, .32), new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: .04, roughness: .03, metalness: 0, envMap, envMapIntensity: .6, clearcoat: 1, depthWrite: false }));
  glass.rotation.x = Math.PI / 2; glass.position.z = -R * 3.2 + R * .13; g.add(glass);
  const handShape = (len, w, tail) => { const s = new THREE.Shape(); s.moveTo(-w, -tail); s.lineTo(w, -tail); s.lineTo(w * .6, len * .8); s.lineTo(0, len); s.lineTo(-w * .6, len * .8); s.closePath(); return new THREE.ExtrudeGeometry(s, { depth: R * .012, bevelEnabled: false }); };
  const hm = new THREE.MeshStandardMaterial({ color: 0xf3f1ff, metalness: .9, roughness: .3, envMap, envMapIntensity: 1, emissive: 0x302a50 });
  const hr = new THREE.Group(), mn = new THREE.Group(), sc = new THREE.Group();
  const hrM = new THREE.Mesh(handShape(R * .5, R * .045, R * .06), hm), mnM = new THREE.Mesh(handShape(R * .74, R * .032, R * .08), hm);
  const scM = new THREE.Mesh(handShape(R * .88, R * .012, R * .22), emis(ac, 3.2));
  hr.add(hrM); mn.add(mnM); sc.add(scM); hr.position.z = R * .03; mn.position.z = R * .05; sc.position.z = R * .07; g.add(hr, mn, sc);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(R * .05, R * .05, R * .1, 24), new THREE.MeshStandardMaterial({ color: 0xc8c4d8, metalness: 1, roughness: .2, envMap })); cap.rotation.x = Math.PI / 2; cap.position.z = R * .08; g.add(cap);
  const pl = new THREE.PointLight(ac, .22, R * 14, 2); pl.position.set(0, 0, R * 1.5); g.add(pl);
  const halo = glowSprite(ac, R * 5, .4); halo.position.z = -R * .2; g.add(halo);
  const sec = s => { const f = s - Math.floor(s), a = 6 * (Math.floor(s) + (f < .16 ? eob(f / .16) : 1)); return a; };
  g.userData.set = (s, o = {}) => { const a = o.angle != null ? o.angle : sec(s); sc.rotation.z = -a * Math.PI / 180; mn.rotation.z = -(70 + s * .15) * Math.PI / 180; hr.rotation.z = -(20 + s * .02) * Math.PI / 180; pl.intensity = .22 * (o.hot == null ? 1 : o.hot); halo.material.opacity = .1 * (o.hot == null ? 1 : o.hot); };
  g.userData.R = R; g.userData.light = pl; return g;
}

// --- human silhouette: extruded stylised figure in deep shadow with a hard orange rim ---
const FIG = (() => {
  const mir = pts => pts.map(p => [-p[0], p[1]]).reverse();
  const head = [[0, -702], [26, -694], [39, -668], [36, -636], [21, -611], [0, -603], [-21, -611], [-36, -636], [-39, -668], [-26, -694]];
  const neck = [[-17, -625], [17, -625], [21, -572], [-21, -572]];
  const torso = [[-17, -592], [-52, -586], [-88, -572], [-102, -544], [-98, -506], [-82, -470], [-72, -420], [-63, -370], [-67, -330], [-73, -296], [-40, -282], [0, -279], [40, -282], [73, -296], [67, -330], [63, -370], [72, -420], [82, -470], [98, -506], [102, -544], [88, -572], [52, -586], [17, -592]];
  const armL = [[-90, -566], [-108, -546], [-116, -490], [-121, -420], [-125, -352], [-123, -308], [-118, -280], [-106, -268], [-95, -278], [-91, -312], [-90, -360], [-87, -420], [-84, -474], [-82, -520]];
  const legL = [[-72, -300], [-3, -300], [-4, -250], [-9, -190], [-16, -110], [-22, -34], [-58, -34], [-61, -100], [-67, -170], [-73, -240]];
  const footL = [[-61, -40], [-22, -40], [-18, -14], [-26, -2], [-70, -1], [-74, -14]];
  return [head, neck, torso, armL, mir(armL), legL, mir(legL), footL, mir(footL)];
})();
const rimMat = (strength) => { const m = new THREE.MeshStandardMaterial({ color: 0x0a0812, roughness: .5, metalness: .1, envMap, envMapIntensity: .06 });
  m.onBeforeCompile = sh => { sh.uniforms.rimK = { value: strength || 1 }; sh.fragmentShader = "uniform float rimK;\n" + sh.fragmentShader.replace("#include <emissivemap_fragment>",
    `#include <emissivemap_fragment>
     vec3 wn = inverseTransformDirection(normal, viewMatrix); float fr = pow(1.0 - abs(dot(normalize(normal), normalize(vViewPosition))), 2.4);
     float side = smoothstep(-0.15, 0.9, wn.x), sideL = smoothstep(-0.1, 0.9, -wn.x);
     totalEmissiveRadiance += vec3(1.0,0.45,0.1) * fr * side * 9.0 * rimK + vec3(0.55,0.4,1.0) * fr * sideL * 3.0 * rimK;`); }; return m; };
function makeFigure() {
  const g = new THREE.Group(), m = rimMat(1);
  FIG.forEach(pts => { const cur = new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(p[0], -p[1], 0)), true, "catmullrom", .5);
    const shape = new THREE.Shape(cur.getPoints(70).map(v => new THREE.Vector2(v.x, v.y)));
    const geo = new THREE.ExtrudeGeometry(shape, { depth: 26, bevelEnabled: true, bevelThickness: 14, bevelSize: 13, bevelSegments: 5, curveSegments: 6 });
    geo.translate(0, 0, -13); const me = new THREE.Mesh(geo, m); me.castShadow = true; g.add(me); });
  g.scale.setScalar(.0025); const w = new THREE.Group(); w.add(g); return w;
}

// --- procedural Earth ---
const NOISE = `
float hs(vec3 p){ p=fract(p*.3183099+.1); p*=17.; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
float vn(vec3 x){ vec3 i=floor(x), f=fract(x); f=f*f*(3.-2.*f);
  return mix(mix(mix(hs(i),hs(i+vec3(1,0,0)),f.x),mix(hs(i+vec3(0,1,0)),hs(i+vec3(1,1,0)),f.x),f.y),
             mix(mix(hs(i+vec3(0,0,1)),hs(i+vec3(1,0,1)),f.x),mix(hs(i+vec3(0,1,1)),hs(i+vec3(1,1,1)),f.x),f.y),f.z); }
float fbm(vec3 p){ float a=.5, s=0.; for(int i=0;i<5;i++){ s+=a*vn(p); p=p*2.03+7.1; a*=.5; } return s; }`;
function makeEarth(R, sun) {
  const g = new THREE.Group();
  const m = new THREE.ShaderMaterial({ uniforms: { sun: { value: sun.clone().normalize() }, t: { value: 0 } },
    vertexShader: "varying vec3 vN; varying vec3 vO; varying vec3 vW; void main(){ vO=position; vN=normalize(mat3(modelMatrix)*normal); vec4 w=modelMatrix*vec4(position,1.); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }",
    fragmentShader: NOISE + `uniform vec3 sun; uniform float t; varying vec3 vN; varying vec3 vO; varying vec3 vW;
      void main(){ vec3 N=normalize(vN), V=normalize(cameraPosition-vW); vec3 p=normalize(vO)*3.2;
        float land=smoothstep(.5,.56,fbm(p)); float cl=smoothstep(.5,.8,fbm(p*1.7+vec3(t*.01,0.,0.)+9.));
        float d=dot(N,sun); float day=smoothstep(-.12,.25,d);
        vec3 ocean=mix(vec3(.01,.02,.06),vec3(.03,.07,.2),pow(max(d,0.),.6)); vec3 ground=mix(vec3(.02,.015,.04),vec3(.12,.1,.2),fbm(p*3.)) ;
        vec3 c=mix(ocean,ground,land)*(.25+1.6*day);
        vec3 R=reflect(-sun,N); float spec=pow(max(dot(R,V),0.),50.)*(1.-land)*day; c+=vec3(1.,.7,.5)*spec*.9;
        c+=vec3(.5,.5,.62)*cl*.55*day;
        float city=step(.62,fbm(p*9.))*land*(1.-day)*smoothstep(.55,.8,fbm(p*4.+3.)); c+=vec3(1.,.55,.18)*city*1.6;
        float fr=pow(1.-max(dot(N,V),0.),3.); vec3 atm=mix(vec3(.45,.35,1.),vec3(1.,.45,.12),smoothstep(.2,.9,d)); c+=atm*fr*(.4+1.6*smoothstep(-.3,.7,d));
        gl_FragColor=vec4(c,1.); }` });
  g.add(new THREE.Mesh(new THREE.SphereGeometry(R, 160, 96), m));
  const am = new THREE.ShaderMaterial({ transparent: true, side: THREE.BackSide, blending: THREE.AdditiveBlending, depthWrite: false, uniforms: { sun: { value: sun.clone().normalize() } },
    vertexShader: "varying vec3 vN; varying vec3 vW; void main(){ vN=normalize(mat3(modelMatrix)*normal); vec4 w=modelMatrix*vec4(position,1.); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }",
    fragmentShader: "uniform vec3 sun; varying vec3 vN; varying vec3 vW; void main(){ vec3 V=normalize(cameraPosition-vW); float f=pow(max(dot(-vN,V),0.),2.2); float d=dot(normalize(vW-vec3(0.)),sun); gl_FragColor=vec4(mix(vec3(.4,.3,1.),vec3(1.,.5,.15),.5)*f*1.4,1.); }" });
  const atm = new THREE.Mesh(new THREE.SphereGeometry(R * 1.05, 96, 64), am); g.add(atm);
  g.userData.m = m; return g;
}

// ---------------- shot groups ----------------
const shots = {}; // id -> {g, path, update, fog}
function shot(id, fog) { const g = new THREE.Group(); g.visible = false; scene.add(g); const sh = { id, g, fog: fog || [0x08070d, .02], update: () => { }, A: {} }; shots[id] = sh; return sh; }
const proj = (v, ) => { const p = v.clone().project(camera); return [(p.x * .5 + .5) * 1080, (-p.y * .5 + .5) * 1920]; };
const pxR = (R, wp) => { const d = camera.position.distanceTo(wp), h = 2 * d * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)); return R / h * 1920; };
const anchorOf = (obj, R) => { const wp = new THREE.Vector3(); obj.getWorldPosition(wp); const p = proj(wp); return { x: p[0], y: p[1], r: pxR(R, wp) }; };
const spot = (c, k, pos, tgt, ang, shadow) => { const l = new THREE.SpotLight(c, k, 40, ang, .6, 1.2); l.position.set(...pos); const tg = new THREE.Object3D(); tg.position.set(...tgt); l.target = tg; l.castShadow = !!shadow; if (shadow) { l.shadow.mapSize.set(1024, 1024); l.shadow.bias = -.0005; } const gg = new THREE.Group(); gg.add(l, tg); return gg; };
const dir = (c, k, pos, tgt) => { const l = new THREE.DirectionalLight(c, k); l.position.set(...pos); l.target.position.set(...tgt); const gg = new THREE.Group(); gg.add(l, l.target); return gg; };
const floorMesh = (r, y, rough) => { const m = new THREE.Mesh(new THREE.CircleGeometry(r, 64), mat({ color: 0x14102a, roughness: rough == null ? .42 : rough, metalness: .7, envMap, envMapIntensity: .8, roughnessMap: scratchTex(9) })); m.rotation.x = -Math.PI / 2; m.position.y = y; m.receiveShadow = true; return m; };

// ===== A: the figure with head and feet clocks (b01, b02, b05, b15) =====
const A = shot("A", [0x08070d, .035]);
const fig = makeFigure(); A.g.add(fig);
const HC = makeClock(.30, HOT), FC = makeClock(.30, UV); HC.position.set(1.12, 1.46, .05); FC.position.set(1.12, .38, .05); A.g.add(HC, FC);
A.g.add(floorMesh(30, 0));
A.g.add(dir(0xff8a2a, 5, [4, 3.2, -4.5], [0, 1, 0]), dir(0xa98bff, 3, [-5, 2.6, -3.5], [0, 1, 0]), dir(0xf3f1ff, .08, [0, 5, 6], [0, 1, 0]));
A.g.add(new THREE.HemisphereLight(0x2a2250, 0x05040a, .12));
{ const sp = spot(0xffeedd, 40, [-1.2, 6, 2.5], [.3, 0, 0], .5, true); A.g.add(sp); }
const coneA = lightCone(TXT.clone(), 9, .15, 2.6, .35); coneA.position.set(2.5, 8, -2.5); coneA.rotation.z = .3; A.g.add(coneA);
const coneB = lightCone(UV.clone(), 9, .1, 2, .3); coneB.position.set(-3, 8, -3); coneB.rotation.z = -.25; A.g.add(coneB);
const dustA = dustField(260, [9, 5, 8], 0xffd9b0, .1, 3); dustA.position.set(.5, 1.8, 0); A.g.add(dustA);
// a ruler beside the clocks and a glowing floor line
const ruler = new THREE.Mesh(new THREE.BoxGeometry(.012, .62, .012), emis(UV, 1.6)); ruler.position.set(1.12, .92, .05); A.g.add(ruler);
for (let i = 0; i <= 8; i++) { const tk = new THREE.Mesh(new THREE.BoxGeometry(i % 4 ? .07 : .13, .008, .008), emis(UV, 1.4)); tk.position.set(1.12, .61 + i * .0775 + .0, .05); A.g.add(tk); }
const hairGeo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V3(-.02, 1.76, 0), V3(.03, 1.88, 0), V3(-.02, 2.0, 0), V3(.04, 2.12, 0), V3(0, 2.25, 0)]), 60, .006, 6), hair = new THREE.Mesh(hairGeo, emis(HOT, 3)); A.g.add(hair);
const hairIdx = hairGeo.index.count;
const sFeet = t => 3.3 + t, boost = t => Math.max(0, t - W("b05", "faster")) * .9;
const sHead = t => 9.6 + t * 1.15 + boost(t) + (t > S("b05") ? (t - S("b05")) * .3 : 0);
A.update = t => {
  HC.userData.set(sHead(t), { hot: 1.2 }); FC.userData.set(sFeet(t), { hot: .8 });
  const hu = eo3((t - W("b15", "By a hair") + .2) / .7); hairGeo.setDrawRange(0, Math.floor(hairIdx * (t >= W("b15", "By a hair") - .2 ? hu : 0)));
  A.A = { head: anchorOf(HC, .3), feet: anchorOf(FC, .3) };
};
const pathA = [
  { t: 0, p: [.3, 1.05, 12.6], l: [.55, 1.0, 0], f: 60, fp: [.5, 1.2, 0], ap: .00025 },
  { t: T.hookEnd, p: [.5, 1.05, 11.4], l: [.6, 1.0, 0], f: 60, fp: [.5, 1.2, 0], ap: .00025 },
  { t: S("b02"), p: [.5, 1.1, 11.2], l: [.6, 1.1, 0], f: 60, fp: [.5, 1.2, 0], ap: .0003 },
  { t: S("b02") + .9, p: [.75, 1.3, 9.4], l: [.85, 1.25, 0], f: 70, fp: [1.1, 1.46, 0], ap: .0006 },
  { t: END("b02"), p: [.95, 1.3, 7.4], l: [1.0, 1.22, 0], f: 70, fp: [1.1, 1.46, 0], ap: .0009 },
];
const pathA2 = [
  { t: S("b05"), p: [1.0, .3, 7.4], l: [1.1, .22, 0], f: 70, fp: [1.1, .38, 0], ap: .0009 },
  { t: W("b05", "Your head is") - .2, p: [1.0, .3, 7.4], l: [1.1, .22, 0], f: 70, fp: [1.1, .38, 0], ap: .0009 },
  { t: W("b05", "Your head is") + .4, p: [1.0, 1.4, 7.4], l: [1.1, 1.22, 0], f: 70, fp: [1.12, 1.46, 0], ap: .0009 },
  { t: W("b05", "So your head's") - .1, p: [1.0, 1.4, 7.4], l: [1.1, 1.22, 0], f: 70, fp: [1.12, 1.46, 0], ap: .0009 },
  { t: END("b05"), p: [.5, 1.1, 11.0], l: [.6, 1.0, 0], f: 60, fp: [.6, 1.2, 0], ap: .0004 },
];
const pathA3 = [
  { t: S("b15"), p: [.6, 1.1, 10.5], l: [.7, 1.1, 0], f: 60, fp: [.5, 1.2, 0], ap: .0003 },
  { t: W("b15", "By a hair") - .3, p: [.2, 1.6, 6], l: [.2, 1.65, 0], f: 85, fp: [0, 1.75, 0], ap: .0007 },
  { t: DUR, p: [.05, 1.95, 3.6], l: [.05, 1.95, 0], f: 85, fp: [0, 1.9, 0], ap: .0009 },
];

// ===== B: gravity warps spacetime toward Earth (b03) =====
const B = shot("B", [0x08070d, .02]);
const earthB = makeEarth(6.8, V3(.5, .6, .3)); earthB.position.set(0, -9.8, -4); B.g.add(earthB);
const gridMats = [];
function gridMesh(cols, rows, x0, x1, z0, z1, col, w) {
  const geos = [], segs = 90;
  const strip = (pts) => { const pos = [], idx = []; pts.forEach((p, i) => { pos.push(p[0], 0, p[1], p[0], 0, p[1]); }); const a = []; for (let i = 0; i < pts.length; i++) { a.push(pts[i][0], pts[i][1], -1, pts[i][0], pts[i][1], 1); } for (let i = 0; i < pts.length - 1; i++) { const k = i * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); } return { a, idx }; };
  const pos = [], idx = [], side = []; let base = 0;
  const addLine = (pts, vertical) => { for (let i = 0; i < pts.length; i++) { for (const s of [-1, 1]) { pos.push(pts[i][0], 0, pts[i][1]); side.push(vertical ? s : 0, vertical ? 0 : s); } } for (let i = 0; i < pts.length - 1; i++) { const k = base + i * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); } base += pts.length * 2; };
  for (let i = 0; i <= cols; i++) { const x = lerp(x0, x1, i / cols), pts = []; for (let j = 0; j <= segs; j++) pts.push([x, lerp(z0, z1, j / segs)]); addLine(pts, true); }
  for (let j = 0; j <= rows; j++) { const z = lerp(z0, z1, j / rows), pts = []; for (let i = 0; i <= segs; i++) pts.push([lerp(x0, x1, i / segs), z]); addLine(pts, false); }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("side", new THREE.Float32BufferAttribute(side, 2)); g.setIndex(idx);
  const m = new THREE.ShaderMaterial({ transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, uniforms: { k: { value: 0 }, w: { value: w }, c: { value: col } },
    vertexShader: `uniform float k,w; attribute vec2 side; varying float vD; varying float vZ;
      void main(){ vec3 p=position; p.x+=side.x*w; p.z+=side.y*w; float d=length(vec2(p.x,p.z+4.));
        float well=exp(-d*d/26.); float dep=smoothstep(-14.,-2.,p.z); p.y-=k*3.4*well*dep; vec2 toC=normalize(vec2(-p.x,-4.-p.z)+1e-4); p.xz+=toC*k*1.1*well*dep; vD=well*k; vZ=p.z;
        gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.); }`,
    fragmentShader: "uniform vec3 c; varying float vD; varying float vZ; void main(){ float f=smoothstep(-16.,-3.,vZ); gl_FragColor=vec4(mix(c,vec3(1.,.55,.2),vD*1.4)*(.5+vD*2.2)*f,1.); }" });
  const mesh = new THREE.Mesh(g, m); gridMats.push(m); return mesh;
}
const gridB = gridMesh(22, 28, -11, 11, -16, 4, UV.clone().multiplyScalar(1.2), .018); B.g.add(gridB);
const fall = []; for (let i = 0; i < 14; i++) { const m = new THREE.Mesh(new THREE.BoxGeometry(.02, .9, .02), emis(HOT, 2.5)); fall.push(m); B.g.add(m); }
const lowC = makeClock(.5, HOT), highC = makeClock(.5, UV); B.g.add(lowC, highC); highC.position.set(-3.6, 1.5, -5); lowC.position.set(0, -.9, -2.2);
B.g.add(dir(0xff8a2a, 1.2, [3, 4, -2], [0, -2, -4]), new THREE.HemisphereLight(0x3a2a70, 0x05040a, .6));
B.g.add(dustField(160, [16, 8, 16], 0xc9b8ff, .04, 8));
B.update = t => {
  const k = eio((t - (T.tSag - 1.5)) / 2.2) * .85 + smooth((t - S("b03")) / 3) * .15; gridMats[0].uniforms.k.value = k; earthB.userData.m.uniforms.t.value = t;
  const lt = t - S("b03"); lowC.userData.set(lt * .5, { hot: 1 }); highC.userData.set(lt * 1.7, { hot: .8 });
  const sp = smooth((t - T.tSag) / .4); lowC.scale.setScalar(.01 + sp); highC.scale.setScalar(.01 + sp);
  lowC.position.y = -.9 - k * 2.0; lowC.position.z = -3.2;
  fall.forEach((m, i) => { const ph = (t * .5 + i * .31) % 1; const x = -4.5 + (i / 13) * 9, z = -4 + (hash(i) - .5) * 5; const d = Math.hypot(x, z + 4); const y = lerp(4, -2.4 - k * 1.2 * Math.exp(-d * d / 26), ph * ph); m.position.set(x * (1 - .25 * ph * ph), y, z); m.material.color.copy(HOT).multiplyScalar(2.5 * Math.sin(ph * 3.14)); });
  B.A = { high: anchorOf(highC, .5), low: anchorOf(lowC, .5) };
};
const pathB = [{ t: S("b03"), p: [0, 2.6, 9], l: [0, -.7, -4], f: 32, fp: [0, -1, -3.5], ap: .0004 }, { t: E("b03"), p: [0, 1.9, 5.8], l: [0, -1.2, -4], f: 32, fp: [0, -1, -3.5], ap: .0006 }];

// ===== C: a column of clocks at rising heights (b04) =====
const Cs = shot("C", [0x08070d, .02]);
const earthC = makeEarth(16, V3(.5, .5, .4)); earthC.position.set(0, -22.5, -10); Cs.g.add(earthC);
const colClocks = [0, 1, 2, 3].map(i => { const c = makeClock(.46, lerpCol(UV, HOT, i / 3)); c.position.set(0, i * 1.55, 0); Cs.g.add(c); return c; });
function lerpCol(a, b, u) { return a.clone().lerp(b, u); }
const spine = new THREE.Mesh(new THREE.BoxGeometry(.014, 6.4, .014), emis(UV, 1.3)); spine.position.set(0, 2.1, -.05); Cs.g.add(spine);
const barC = new THREE.Mesh(new THREE.PlaneGeometry(.1, 6.4), new THREE.ShaderMaterial({ vertexShader: "varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }", fragmentShader: `varying vec2 vUv; void main(){ gl_FragColor=vec4(mix(vec3(.5,.4,1.),vec3(1.4,.6,.15),vUv.y)*1.6,1.); }` })); barC.position.set(2.5, 2.1, 0); Cs.g.add(barC);
const trainN = 16, trains = []; for (let i = 0; i < 4; i++) { const im = new THREE.InstancedMesh(new THREE.BoxGeometry(.04, .38, .04), emis(lerpCol(UV, HOT, i / 3), 2.6), trainN); trains.push(im); Cs.g.add(im); }
const leds = []; for (let i = 0; i < 4; i++) for (let k = 0; k < 4; k++) { const m = new THREE.Mesh(new THREE.BoxGeometry(.16, .16, .05), emis(k <= i ? HOT : HAZE, k <= i ? 2.6 : .35)); m.position.set(.85 + k * .26, i * 1.55, 0); Cs.g.add(m); }
Cs.g.add(dir(0xff8a2a, 1.6, [3, 2, -3], [0, 2, 0]), dir(0xa98bff, 1.4, [-4, 3, 2], [0, 2, 0]), new THREE.HemisphereLight(0x3a2a70, 0x05040a, .8));
Cs.g.add(dustField(180, [10, 10, 10], 0xc9b8ff, .04, 21)); Cs.g.position.y = 0;
const dm = new THREE.Object3D();
Cs.update = t => {
  const lt = t - S("b04"), rates = [.4, 1.1, 2.1, 3.4];
  colClocks.forEach((c, i) => { c.userData.set(lt * rates[i] * 1.4, { hot: .6 + i * .2 }); c.scale.setScalar(.01 + smooth((lt - .1 - i * .3) / .35)); });
  trains.forEach((im, i) => { const gap = .9 / rates[i]; for (let k = 0; k < trainN; k++) { const x = -.8 - ((lt * .9 + k * gap) % (gap * trainN)); const vis = x > -3.6; dm.position.set(x, i * 1.55, 0); dm.scale.setScalar(vis ? 1 : 0); dm.updateMatrix(); im.setMatrixAt(k, dm.matrix); } im.instanceMatrix.needsUpdate = true; });
  Cs.A = {};
};
const pathC = [{ t: S("b04"), p: [0, .2, 7.2], l: [0, .5, 0], f: 45, fp: [0, .2, 0], ap: .0005 }, { t: S("b04") + .6, p: [0, .3, 7.2], l: [0, .6, 0], f: 45, fp: [0, .2, 0], ap: .0005 }, { t: END("b04"), p: [0, 4.0, 7.6], l: [0, 4.5, 0], f: 42, fp: [0, 4.6, 0], ap: .0006 }];

// ===== D: the NIST lab (b06-b08) =====
const D = shot("D", [0x08070d, .04]);
const benchM = mat({ color: 0x141020, roughness: .38, metalness: .8, envMap, envMapIntensity: .8, roughnessMap: scratchTex(13) });
const bench = new THREE.Mesh(new THREE.BoxGeometry(11, .3, 2.6), benchM); bench.position.set(.8, -.15, 0); bench.receiveShadow = true; D.g.add(bench);
const bedge = new THREE.Mesh(new THREE.BoxGeometry(11, .02, .02), emis(HOT, 2.2)); bedge.position.set(.8, 0, 1.3); D.g.add(bedge);
const floorD = floorMesh(30, -1.6, .45); D.g.add(floorD);
const wall = new THREE.Mesh(new THREE.PlaneGeometry(30, 12), mat({ color: 0x0b0914, roughness: .8, metalness: .1 })); wall.position.set(0, 3, -2.4); wall.receiveShadow = true; D.g.add(wall);
for (let i = 0; i < 14; i++) { const sl = new THREE.Mesh(new THREE.BoxGeometry(.05, 7, .05), emis(UV, .7 + .3 * hash(i))); sl.position.set(-6 + i * .95, 3, -2.3); D.g.add(sl); }
function unitMesh(accent) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(.9, 1.1, .7), mat({ color: 0x14101f, roughness: .35, metalness: .85, envMap, envMapIntensity: 1, bumpMap: scratchTex(2), bumpScale: 1.2 })); body.position.y = .55; body.castShadow = true; g.add(body);
  const rim = new THREE.Mesh(new THREE.BoxGeometry(.02, 1.1, .72), emis(accent, 2.4)); rim.position.set(.45, .55, 0); g.add(rim);
  const top = new THREE.Mesh(new THREE.BoxGeometry(.92, .02, .72), emis(accent, 1.6)); top.position.y = 1.1; g.add(top);
  const clk = makeClock(.34, accent); clk.position.set(0, .64, .36); g.add(clk);
  for (let i = 0; i < 4; i++) { const l = new THREE.Mesh(new THREE.SphereGeometry(.018, 8, 8), emis(i ? HAZE : accent, i ? .8 : 3)); l.position.set(-.3 + i * .08, .12, .36); g.add(l); }
  g.userData.clk = clk; return g;
}
const unitA = unitMesh(UV), unitB = unitMesh(HOT); D.g.add(unitA, unitB);
const stepM = mat({ color: 0x1a1430, roughness: .4, metalness: .6, envMap, envMapIntensity: .7 });
[[1.5, .3, 1.1], [2.65, .6, 1.2]].forEach(([x, h, w], i) => { const st = new THREE.Mesh(new THREE.BoxGeometry(w, h, 1.1), stepM); st.position.set(x, h / 2, 0); st.castShadow = st.receiveShadow = true; D.g.add(st); const e = new THREE.Mesh(new THREE.BoxGeometry(w, .02, .02), emis(UV, 2)); e.position.set(x, h, .56); D.g.add(e); });
const scopeCv = document.createElement("canvas"); scopeCv.width = 768; scopeCv.height = 320; const scx = scopeCv.getContext("2d"), scopeTex = new THREE.CanvasTexture(scopeCv); scopeTex.colorSpace = THREE.SRGBColorSpace;
const scope = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 1.5), new THREE.MeshBasicMaterial({ map: scopeTex, toneMapped: true })); scope.position.set(.2, 2.6, -2.2); D.g.add(scope);
const dimBar = new THREE.Mesh(new THREE.BoxGeometry(.016, .6, .016), emis(TXT, 2)); dimBar.position.set(.55, 1.4, .4); D.g.add(dimBar);
const dimDash = new THREE.Mesh(new THREE.BoxGeometry(2.2, .008, .008), emis(HAZE, 1.2)); dimDash.position.set(-.55, 1.1, .4); D.g.add(dimDash);
D.g.add(spot(0xffe6cc, 120, [.6, 7, 3.5], [.6, 0, 0], .55, true), dir(0xff8a2a, 1.6, [6, 2, -2], [1, 1, 0]), dir(0xa98bff, 1.3, [-6, 3, -2], [0, 1, 0]), new THREE.HemisphereLight(0x2a2250, 0x05040a, .5));
const coneD = lightCone(TXT.clone(), 8, .2, 2.4, .1); coneD.position.set(.6, 8, 1.5); D.g.add(coneD);
D.g.add(dustField(200, [10, 6, 6], 0xffd9b0, .04, 31));
const sprayN = 22, spray = new THREE.InstancedMesh(new THREE.BoxGeometry(.025, .12, .025), emis(HOT, 3), sprayN * 2); D.g.add(spray);
const unitPos = (which, t) => { if (which === "A") return [-1.6, 0]; const u = clamp((t - T.tRaise0) / (T.tRaise1 - T.tRaise0)); if (u <= 0) return [-.3, 0]; if (u >= 1) return [2.65, .6];
  const a = u < .5, e = eio(a ? u / .5 : (u - .5) / .5), s = a ? [-.3, 0, 1.5, .3] : [1.5, .3, 2.65, .6]; return [lerp(s[0], s[2], e), lerp(s[1], s[3], e) + Math.sin((a ? u / .5 : (u - .5) / .5) * Math.PI) * .22]; };
D.update = t => {
  const lt = t - S("b06"), pa = unitPos("A", t), pb = unitPos("B", t);
  unitA.position.set(pa[0], pa[1], 0); unitB.position.set(pb[0], pb[1], 0);
  const ap = s => eo3((lt - s) / .5); unitA.scale.setScalar(.01 + ap(1.2)); unitB.scale.setScalar(.01 + ap(1.7)); unitA.position.y *= 1;
  unitA.userData.clk.userData.set(lt * 1.0, { hot: .8 }); unitB.userData.clk.userData.set(lt * 1.0 + Math.max(0, t - T.tRaise1) * 1.8, { hot: 1.2 });
  scx.fillStyle = "#0a0813"; scx.fillRect(0, 0, 768, 320); scx.strokeStyle = "rgba(169,139,255,.18)"; scx.lineWidth = 2; for (let i = 1; i < 8; i++) { scx.beginPath(); scx.moveTo(i * 96, 0); scx.lineTo(i * 96, 320); scx.stroke(); } for (let j = 1; j < 4; j++) { scx.beginPath(); scx.moveTo(0, j * 80); scx.lineTo(768, j * 80); scx.stroke(); }
  [["#a98bff", 1, -1], ["#ff8a2a", t > T.tRaise1 ? 1.22 : 1, 1]].forEach(([c, f, k]) => { scx.strokeStyle = c; scx.lineWidth = 6; scx.shadowColor = c; scx.shadowBlur = 14; scx.beginPath(); for (let x = 0; x <= 768; x += 6) { const y = 160 + k * 46 + Math.sin((x * .03 + t * 5) * f) * 52; x ? scx.lineTo(x, y) : scx.moveTo(x, y); } scx.stroke(); scx.shadowBlur = 0; }); scopeTex.needsUpdate = true;
  const dd = smooth((t - (W("b07", "Two steps") + .2)) / .4); dimBar.scale.y = dd + .001; dimDash.scale.x = dd + .001;
  const t8 = S("b08"); let n = 0;
  [[pa, 1.6, 0], [pb, 3.2, 1]].forEach(([p, rate, k]) => { const cnt = Math.floor((t - t8) * rate) + 1; for (let i = Math.max(0, cnt - 4); i < cnt; i++) { const ti = t8 + i / rate, u = (t - ti) / .8; if (u < 0 || u > 1 || t < t8) continue;
    const ang = (Math.PI / 2 + (hash(i * 3 + k * 17) - .5) * 2.0), r1 = .45 + u * .7; dm.position.set(p[0] + r1 * Math.cos(ang), p[1] + .64 + r1 * Math.sin(ang), .4); dm.rotation.z = ang - Math.PI / 2; dm.scale.setScalar(1 - u * u); dm.updateMatrix(); spray.setMatrixAt(n++, dm.matrix); } });
  dm.rotation.z = 0; dm.scale.setScalar(0); dm.updateMatrix(); for (; n < sprayN * 2; n++) spray.setMatrixAt(n, dm.matrix); spray.instanceMatrix.needsUpdate = true;
  const dp = new THREE.Vector3(.55, 1.4, .4); D.A = { dim: { x: proj(dp)[0] - 210, y: proj(dp)[1] } };
};
const pathD = [{ t: S("b06"), p: [-.2, 1.2, 7.8], l: [-.1, 1.0, 0], f: 40, fp: [-1, .6, 0], ap: .0007 }, { t: END("b06"), p: [.2, 1.1, 7.0], l: [.3, 1.0, 0], f: 40, fp: [-1, .6, 0], ap: .0007 },
  { t: S("b07"), p: [.6, 1.2, 7.6], l: [.8, 1.0, 0], f: 36, fp: [.6, .7, 0], ap: .0006 }, { t: S("b08"), p: [1.4, 1.3, 6.8], l: [1.2, 1.1, 0], f: 40, fp: [2.4, 1.0, 0], ap: .0008 }, { t: S("b09") - .1, p: [1.6, 1.3, 6.2], l: [1.4, 1.2, 0], f: 40, fp: [2.65, 1.1, 0], ap: .001 }];

// ===== E: 79 years as a light trail; the gap (b09, b10) =====
const Es = shot("E", [0x08070d, .03]);
const LEN = 7;
const barE = new THREE.Mesh(new THREE.BoxGeometry(1, .06, .06), new THREE.ShaderMaterial({ uniforms: { len: { value: LEN } }, vertexShader: "varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }", fragmentShader: "varying vec2 vUv; void main(){ gl_FragColor=vec4(mix(vec3(.55,.45,1.),vec3(1.,.5,.12),vUv.x)*2.2,1.); }" })); barE.geometry.translate(.5, 0, 0); Es.g.add(barE);
const barGlow = new THREE.Mesh(new THREE.BoxGeometry(1, .2, .2), addMat(UV, { opacity: .12 })); barGlow.geometry.translate(.5, 0, 0); Es.g.add(barGlow);
const tickE = new THREE.InstancedMesh(new THREE.BoxGeometry(.014, 1, .014), emis(TXT, 1.8), 80); Es.g.add(tickE);
const gapMesh = new THREE.Mesh(new THREE.BoxGeometry(1, .075, .075), emis(HOT, 4)); gapMesh.geometry.translate(.5, 0, 0); Es.g.add(gapMesh);
const gapGlow = glowSprite(HOT, .6, .8); Es.g.add(gapGlow);
const bornM = new THREE.Mesh(new THREE.BoxGeometry(.03, .7, .03), emis(UV, 3)); Es.g.add(bornM);
Es.g.add(dustField(260, [12, 4, 6], 0xc9b8ff, .03, 41), new THREE.HemisphereLight(0x3a2a70, 0x05040a, .5));
const floorE = floorMesh(40, -.5, .25); Es.g.add(floorE);
Es.update = t => {
  const drawn = eo3((t - T.tl0) / (T.tl1 - T.tl0)), xe = LEN * drawn;
  barE.scale.x = Math.max(.001, xe); barGlow.scale.x = Math.max(.001, xe);
  for (let y = 0; y < 80; y++) { const x = lerp(0, LEN - .05, y / 79), big = y % 10 === 0; dm.position.set(x, 0, 0); dm.scale.set(1, x > xe ? 0 : (big ? .42 : .17), 1); dm.rotation.z = 0; dm.updateMatrix(); tickE.setMatrixAt(y, dm.matrix); } dm.scale.set(1, 1, 1); tickE.instanceMatrix.needsUpdate = true;
  const tGap = W("b09", "about ninety") - .6, sh0 = S("b10") + .15, sh1 = S("b10") + 1.4, k = smooth((t - sh0) / (sh1 - sh0)), L = .012 * (1 - k) + .0006;
  gapMesh.position.set(LEN, 0, 0); gapMesh.scale.set(t >= tGap ? L : .0001, 1, 1); gapGlow.position.set(LEN + L / 2, 0, .02); gapGlow.scale.setScalar(.1 + .5 * (1 - k * .7) * (t >= tGap ? 1 : 0)); bornM.position.set(0, 0, 0);
  const gp = V3(LEN, 0, 0); const p = proj(gp); Es.A = { gap: { x: p[0], y: p[1], s: 1 } };
};
const pathE = [{ t: S("b09"), p: [3.6, .5, 10.5], l: [3.5, 0, 0], f: 35, fp: [3.5, 0, 0], ap: .0004 }, { t: T.tl1, p: [4.5, .5, 9.5], l: [4.2, 0, 0], f: 35, fp: [4.2, 0, 0], ap: .0004 },
  { t: T.tl1 + .15, p: [4.5, .5, 9.5], l: [4.2, 0, 0], f: 35, fp: [4.2, 0, 0], ap: .0004 },
  { t: W("b09", "ninety") + .4, p: [LEN - .18, .015, .48], l: [LEN - .02, 0, 0], f: 85, fp: [LEN, 0, 0], ap: .0030 },
  { t: W("b10", "But real"), p: [LEN - .18, .015, .48], l: [LEN - .02, 0, 0], f: 85, fp: [LEN, 0, 0], ap: .0030 },
  { t: W("b10", "But real") + 1.1, p: [LEN - 1, .3, 6.5], l: [LEN - 1.4, 0, 0], f: 50, fp: [LEN, 0, 0], ap: .0006 }];

// ===== F: GPS satellite above Earth (b11) =====
const F = shot("F", [0x08070d, .006]);
const earthF = makeEarth(18, V3(.8, .55, .2)); earthF.position.set(0, -20, -8); F.g.add(earthF);
const sat = new THREE.Group();
{ const foil = canvasTex(256, 256, (x, w, h) => { x.fillStyle = "#6b4414"; x.fillRect(0, 0, w, h); for (let i = 0; i < 400; i++) { x.strokeStyle = `rgba(${hash(i) > .5 ? 255 : 40},${hash(i) > .5 ? 190 : 20},${hash(i) > .5 ? 100 : 5},.18)`; x.lineWidth = 1 + hash(i * 3) * 3; x.beginPath(); const px = hash(i * 5) * w, py = hash(i * 7) * h; x.moveTo(px, py); x.lineTo(px + (hash(i * 9) - .5) * 70, py + (hash(i * 11) - .5) * 70); x.stroke(); } });
  const foilBump = canvasTex(256, 256, (x, w, h) => { x.fillStyle = "#808080"; x.fillRect(0, 0, w, h); for (let i = 0; i < 500; i++) { x.fillStyle = `rgba(${hash(i) > .5 ? 255 : 0},${hash(i) > .5 ? 255 : 0},${hash(i) > .5 ? 255 : 0},.2)`; const px = hash(i * 5) * w, py = hash(i * 7) * h; x.beginPath(); x.moveTo(px, py); x.lineTo(px + 40 * (hash(i * 3) - .5), py + 40 * (hash(i * 4) - .5)); x.lineTo(px + 30 * (hash(i * 6) - .5), py + 50 * (hash(i * 8) - .5)); x.fill(); } }, false);
  const busM = mat({ map: foil, color: 0xffffff, metalness: .95, roughness: .38, bumpMap: foilBump, bumpScale: 3, envMap, envMapIntensity: 1.6 });
  const bus = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.5, 1.1), busM); bus.castShadow = true; sat.add(bus);
  const cell = canvasTex(512, 256, (x, w, h) => { x.fillStyle = "#101040"; x.fillRect(0, 0, w, h); for (let i = 0; i < 8; i++) for (let j = 0; j < 4; j++) { const g2 = x.createLinearGradient(i * 64, j * 64, i * 64 + 64, j * 64 + 64); g2.addColorStop(0, "#26277a"); g2.addColorStop(1, "#14144a"); x.fillStyle = g2; x.fillRect(i * 64 + 3, j * 64 + 3, 58, 58); x.strokeStyle = "rgba(200,190,255,.35)"; x.lineWidth = 1; x.beginPath(); x.moveTo(i * 64 + 20, j * 64 + 3); x.lineTo(i * 64 + 20, j * 64 + 61); x.moveTo(i * 64 + 42, j * 64 + 3); x.lineTo(i * 64 + 42, j * 64 + 61); x.stroke(); } });
  const panM = mat({ map: cell, metalness: .7, roughness: .22, envMap, envMapIntensity: 1.8, bumpMap: scratchTex(8), bumpScale: .5 });
  [-1, 1].forEach(s => { const pn = new THREE.Mesh(new THREE.BoxGeometry(3.0, 1.35, .04), panM); pn.position.set(s * 3.05, 0, 0); pn.castShadow = true; sat.add(pn); const fr = new THREE.Mesh(new THREE.BoxGeometry(3.06, 1.41, .03), mat({ color: 0x24203a, metalness: .9, roughness: .4, envMap })); fr.position.set(s * 3.05, 0, -.03); sat.add(fr);
    const bm = new THREE.Mesh(new THREE.CylinderGeometry(.04, .04, .65, 12), mat({ color: 0xaaa7bb, metalness: 1, roughness: .3, envMap })); bm.rotation.z = Math.PI / 2; bm.position.set(s * .88, 0, 0); sat.add(bm); const re = new THREE.Mesh(new THREE.BoxGeometry(.02, 1.36, .05), emis(HOT, 1.6)); re.position.set(s * 4.55, 0, 0); sat.add(re); });
  const dish = new THREE.Mesh(new THREE.LatheGeometry([[0, 0], [.12, .02], [.3, .08], [.5, .2], [.52, .21], [.5, .19], [.3, .06], [.12, 0], [0, -.02]].map(p => new THREE.Vector2(p[0], p[1])), 40), mat({ color: 0xcfcbe0, metalness: 1, roughness: .22, envMap, envMapIntensity: 1.5, side: THREE.DoubleSide })); dish.position.set(0, 1.18, 0); dish.rotation.x = -.6; sat.add(dish);
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(.03, .03, .45, 8), mat({ color: 0xaaa7bb, metalness: 1, roughness: .3, envMap })); mast.position.y = .95; sat.add(mast);
  for (let i = 0; i < 4; i++) { const a = new THREE.Mesh(new THREE.CylinderGeometry(.04, .07, .26, 12), mat({ color: 0xcfcbe0, metalness: 1, roughness: .25, envMap })); a.position.set(-.3 + (i % 2) * .6, -.88, -.3 + Math.floor(i / 2) * .6); sat.add(a); const th = new THREE.Mesh(new THREE.ConeGeometry(.05, .12, 12), emis(UV, 1.5)); th.position.set(-.5 + i * .33, -.85, .6); th.rotation.x = Math.PI; sat.add(th); }
  const satClock = makeClock(.4, HOT); satClock.position.set(0, .05, .56); sat.add(satClock); sat.userData.clk = satClock; }
sat.position.set(0, 3.8, -6); sat.rotation.set(.12, -.35, -.12); F.g.add(sat);
const phone = new THREE.Mesh(new THREE.BoxGeometry(.07, .14, .01), emis(HOT, 2.4)); phone.position.set(0, -1.93, -8); F.g.add(phone); const phoneGlow = glowSprite(HOT, 1.0, .9); phoneGlow.position.copy(phone.position); F.g.add(phoneGlow);
const sigN = 7, sig = new THREE.InstancedMesh(new THREE.SphereGeometry(.035, 8, 8), emis(HOT, 4), sigN); F.g.add(sig);
F.g.add(dir(0xffd9b0, 4, [8, 5, 2], [0, 3, -6]), dir(0xa98bff, 1.8, [-8, 3, -2], [0, 3, -6]), new THREE.HemisphereLight(0x2a2250, 0x05040a, .5), dustField(120, [20, 12, 16], 0xffffff, .035, 51));
F.update = t => {
  const lt = t - S("b11"), sc = .5 + .5 * eo3((lt - .3) / 1.0); sat.scale.setScalar(sc); sat.position.y = 3.8 + Math.sin(t * .5) * .05; sat.rotation.y = -.35 + Math.sin(t * .3) * .06;
  sat.userData.clk.userData.set(lt * 5.4, { hot: 1.3 }); earthF.userData.m.uniforms.t.value = t;
  const sa = smooth((t - W("b11", "your phone")) / .5);
  for (let i = 0; i < sigN; i++) { const u = (t * .45 + i / sigN) % 1; dm.position.set(Math.sin(u * 9) * .04, lerp(-1.85, 3.2, u), -7.6 + u * 1.6); dm.scale.setScalar(sa * Math.sin(u * 3.14) + .0001); dm.rotation.z = 0; dm.updateMatrix(); sig.setMatrixAt(i, dm.matrix); } sig.instanceMatrix.needsUpdate = true;
  F.A = {};
};
const pathF = [{ t: S("b11"), p: [.35, -1.35, -2.4], l: [0, -1.75, -8], f: 50, fp: [0, -1.9, -8], ap: .0014 }, { t: S("b11") + .5, p: [.35, -1.3, -2.2], l: [0, -1.7, -8], f: 50, fp: [0, -1.9, -8], ap: .0014 },
  { t: W("b11", "GPS satellites"), p: [0, 1.0, 8.2], l: [0, .9, -6], f: 32, fp: [0, 3.8, -6], ap: .0006 }, { t: W("b11", "clocks run"), p: [0, 2.6, 5.6], l: [0, 3.4, -6], f: 40, fp: [0, 3.9, -6], ap: .0007 }, { t: END("b11") + .2, p: [.2, 3.3, 3.2], l: [0, 3.8, -6], f: 50, fp: [0, 3.9, -6], ap: .0008 }];

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
const pathG = [{ t: S("b12"), p: [.9, .5, 6.4], l: [.9, -.4, 0], f: 50, fp: [1.15, -.7, .2], ap: .0010 }, { t: T.tSlow0, p: [.4, .3, 5.8], l: [.4, -.2, 0], f: 50, fp: [1.15, -.7, .2], ap: .0010 }, { t: T.tSlow1, p: [-.1, .3, 5.4], l: [0, -.1, 0], f: 50, fp: [-.5, .1, .2], ap: .0010 }, { t: T.th0, p: [-.1, .3, 5.0], l: [0, -.1, 0], f: 50, fp: [-.5, .1, .2], ap: .0010 }];

// ===== H: dark 3D city grid, the pin drifts and snaps back (b12 second half) =====
const Hh = shot("H", [0x08070d, .018]);
{ const city = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: 0x15102a, roughness: .5, metalness: .4, envMap, envMapIntensity: .6 }), 900); let n = 0; const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), ps = new THREE.Vector3();
  for (let i = -9; i <= 9; i++) for (let j = -9; j <= 9; j++) { const bx = i * 2.4, bz = j * 2.4; for (let k = 0; k < 4 && n < 900; k++) { const hh = .15 + Math.pow(hash(i * 31 + j * 17 + k), 2.2) * 1.9 * (1 - Math.min(1, Math.hypot(i, j) / 13)) ; const w = .92; ps.set(bx + (k % 2 ? .55 : -.55), hh / 2, bz + (k > 1 ? .55 : -.55)); sc.set(w, hh, w); m4.compose(ps, q, sc); city.setMatrixAt(n++, m4); } }
  city.count = n; city.castShadow = city.receiveShadow = true; Hh.g.add(city);
  const road = new THREE.InstancedMesh(new THREE.BoxGeometry(1, .01, 1), emis(UV, .8), 80); n = 0; for (let i = -9; i <= 9; i++) { ps.set(i * 2.4 + 1.2 - 1.2, .005, 0); sc.set(.035, 1, 46); m4.compose(ps, q, sc); if (n < 80) road.setMatrixAt(n++, m4); ps.set(0, .005, i * 2.4); sc.set(46, 1, .035); m4.compose(ps, q, sc); if (n < 80) road.setMatrixAt(n++, m4); } road.count = n; Hh.g.add(road);
  const grd = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), mat({ color: 0x0a0814, roughness: .5, metalness: .6, envMap, envMapIntensity: .4 })); grd.rotation.x = -Math.PI / 2; grd.receiveShadow = true; Hh.g.add(grd);
  const route = new THREE.Mesh(new THREE.BoxGeometry(.05, .03, 5), emis(TXT, 1.8)); route.position.set(0, .02, 2.5); Hh.g.add(route); Hh.userData = { route }; }
const pin = new THREE.Group(); { const pm_ = emis(HOT, 3); const head = new THREE.Mesh(new THREE.SphereGeometry(.26, 32, 24), pm_); head.position.y = .85; const cone = new THREE.Mesh(new THREE.ConeGeometry(.2, .6, 28), pm_); cone.rotation.x = Math.PI; cone.position.y = .38; pin.add(head, cone);
  const hole = new THREE.Mesh(new THREE.SphereGeometry(.09, 16, 12), new THREE.MeshBasicMaterial({ color: 0x08070d })); hole.position.set(0, .85, .22); pin.add(hole); const pl = new THREE.PointLight(0xff8a2a, 18, 6, 2); pl.position.y = .9; pin.add(pl); const gs = glowSprite(HOT, 2.2, .8); gs.position.y = .85; pin.add(gs); }
Hh.g.add(pin);
const errRing = new THREE.Mesh(new THREE.RingGeometry(.97, 1, 64), addMat(HOT, { opacity: .9, side: THREE.DoubleSide })); errRing.rotation.x = -Math.PI / 2; errRing.position.y = .03; Hh.g.add(errRing);
const errFill = new THREE.Mesh(new THREE.CircleGeometry(1, 64), addMat(HOT, { opacity: .1, side: THREE.DoubleSide })); errFill.rotation.x = -Math.PI / 2; errFill.position.y = .028; Hh.g.add(errFill);
const trailN = 16, trailM = new THREE.InstancedMesh(new THREE.SphereGeometry(.04, 8, 8), emis(HOT, 3), trailN); Hh.g.add(trailM);
const rip = new THREE.Mesh(new THREE.RingGeometry(.97, 1, 64), addMat(TXT, { opacity: .9, side: THREE.DoubleSide })); rip.rotation.x = -Math.PI / 2; rip.position.y = .035; Hh.g.add(rip);
Hh.g.add(spot(0xa98bff, 100, [-4, 9, 3], [0, 0, 0], .7, true), dir(0xff8a2a, 1.2, [4, 3, -3], [0, 0, 0]), new THREE.HemisphereLight(0x2a2250, 0x05040a, .55), dustField(120, [14, 5, 12], 0xc9b8ff, .03, 71));
Hh.update = t => {
  const lt = t - T.th0, kd = smooth((t - T.tDrift0) / (T.tDrift1 - T.tDrift0)), ks = eio((t - T.tSnap) / .35), k = kd * (1 - ks);
  const P0 = [0, 0], P1 = [1.25, .55], px = lerp(P0[0], P1[0], k), pz = lerp(P0[1], P1[1], k); pin.position.set(px, Math.sin(Math.PI * clamp((t - T.tSnap) / .35)) * .25, pz); pin.scale.setScalar(smooth((lt - .7) / .3) * (1 + .15 * Math.sin(Math.PI * clamp((t - T.tSnap) / .3))) + .001);
  errRing.position.set(px, .03, pz); errRing.scale.setScalar(.15 + 1.1 * k); errRing.material.opacity = k * .9; errFill.position.copy(errRing.position); errFill.position.y = .028; errFill.scale.copy(errRing.scale); errFill.material.opacity = k * .12;
  for (let i = 0; i < trailN; i++) { const u = i / (trailN - 1); dm.position.set(lerp(P0[0], px, u), .05, lerp(P0[1], pz, u)); dm.scale.setScalar(kd > 0 && t < T.tSnap + .35 ? 1 : 0); dm.rotation.z = 0; dm.updateMatrix(); trailM.setMatrixAt(i, dm.matrix); } trailM.instanceMatrix.needsUpdate = true;
  const ru = (t - (T.tSnap + .3)) / .7; rip.visible = ru > 0 && ru < 1; rip.scale.setScalar(.15 + 1.2 * eo3(ru)); rip.material.opacity = (1 - ru) * .9;
  Hh.userData.route.scale.z = smooth((lt - .4) / .5);
  Hh.A = {};
};
const pathH = [{ t: T.th0, p: [-.8, 6.6, 6.4], l: [.3, 0, .2], f: 40, fp: [0, 0, 0], ap: .0009 }, { t: T.tDrift1, p: [.2, 6.0, 5.0], l: [.7, 0, .3], f: 40, fp: [.6, 0, .3], ap: .0009 }, { t: E("b12"), p: [-.1, 6.3, 5.4], l: [.1, 0, .1], f: 40, fp: [0, 0, 0], ap: .0009 }];

// ===== I: verdict void (b13) and end card =====
const I = shot("I", [0x08070d, .03]);
{ const ringV = new THREE.Mesh(new THREE.TorusGeometry(3.2, .05, 16, 180), emis(UV, 1.4)); ringV.position.set(0, .2, -6); I.g.add(ringV); I.userData = { ringV };
  const tk = new THREE.InstancedMesh(new THREE.BoxGeometry(.04, .3, .04), emis(UV, 1.2), 60); const o = new THREE.Object3D(); for (let i = 0; i < 60; i++) { const a = i / 60 * 6.283; o.position.set(Math.sin(a) * 2.9, Math.cos(a) * 2.9 + .2, -6); o.rotation.z = -a; o.scale.setScalar(i % 5 ? .6 : 1.3); o.updateMatrix(); tk.setMatrixAt(i, o.matrix); } I.g.add(tk);
  const cone = lightCone(TXT.clone(), 12, .1, 3.0, .16); cone.position.set(.6, 8, -4); cone.rotation.z = .08; I.g.add(cone); I.userData.cone = cone; I.g.add(floorMesh(40, -2.2, .28), dustField(260, [12, 8, 10], 0xffd9b0, .05, 81), new THREE.HemisphereLight(0x3a2a70, 0x05040a, .6), dir(0xff8a2a, 1.4, [3, 3, -3], [0, 0, 0])); }
I.update = t => { I.userData.ringV.rotation.z = t * .04; I.A = {}; };
const pathI = [{ t: S("b13"), p: [0, 0, 8.5], l: [0, .1, 0], f: 50, fp: [0, .2, -4], ap: .0004 }, { t: T.tTrue, p: [0, 0, 8.5], l: [0, .1, 0], f: 50, fp: [0, .2, -4], ap: .0004 }, { t: S("b14"), p: [0, 0, 7.3], l: [0, .1, 0], f: 50, fp: [0, .2, -4], ap: .0004 }];
const pathIend = [{ t: 0, p: [0, 0, 7.3], l: [0, .1, 0], f: 50, fp: [0, .2, -4], ap: .0004 }];

// ===== J: climbing the stairs (b14) =====
const J = shot("J", [0x08070d, .03]);
const stepsJ = []; for (let i = 0; i <= T.NST; i++) { const st = new THREE.Mesh(new THREE.BoxGeometry(4 - i * .3, .45, 1.2), mat({ color: 0x1a1430, roughness: .38, metalness: .6, envMap, envMapIntensity: .8 })); st.position.set(0, .225 + i * .45 - .45, -i * 1.2 - .6); st.castShadow = st.receiveShadow = true; J.g.add(st);
  const e = new THREE.Mesh(new THREE.BoxGeometry(4 - i * .3, .02, .02), emis(i % 2 ? UV : HOT, 2.2)); e.position.set(0, i * .45, -i * 1.2); J.g.add(e); stepsJ.push(st); }
const figJ = makeFigure(); J.g.add(figJ); figJ.rotation.y = Math.PI; // from behind
const doorJ = new THREE.Mesh(new THREE.PlaneGeometry(3, 3.4), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffa860).multiplyScalar(2.6) })); doorJ.position.set(0, 4.0, -8.1); J.g.add(doorJ);
J.g.add(glowSprite(HOT, 9, .9)); J.g.children[J.g.children.length - 1].position.set(0, 4.0, -7.9);
J.g.add(lightCone(0xffa860 && new THREE.Color(0xffa860), 9, .1, 2.8, .12)); { const c = J.g.children[J.g.children.length - 1]; c.position.set(0, 7.4, -5.5); c.rotation.x = .55; }
J.g.add(spot(0xff8a2a, 140, [0, 5, -7], [0, 1, -2], .9, true), dir(0xa98bff, 1.6, [-4, 3, 4], [0, 1, -3]), new THREE.HemisphereLight(0x2a2250, 0x05040a, .5), dustField(180, [8, 8, 12], 0xffd9b0, .045, 91));
const stepTop = i => [0, i * .45, -i * 1.2];
J.update = t => {
  let idx = 0; for (let i = 0; i < T.NST; i++) if (t >= T.arr(i)) idx = i; let a = stepTop(Math.max(0, idx)), y = a[1], z = a[2];
  if (idx < T.NST - 1 && t > T.arr(idx + 1) - .35) { const u = eio((t - (T.arr(idx + 1) - .35)) / .35), b = stepTop(idx + 1); y = lerp(a[1], b[1], u) + Math.sin(u * Math.PI) * .22; z = lerp(a[2], b[2], u); }
  if (t < T.arr(0) - .35) { y = 0; z = 0; } figJ.position.set(0, y, z - .3);
  const hp = V3(0, y + 1.9, z - .3), p = proj(hp); J.A = { plus: { x: p[0], y: p[1] } };
};
const pathJ = [{ t: S("b14"), p: [0, .9, 4.6], l: [0, 1.6, -3], f: 35, fp: [0, .9, -.3], ap: .0006 }, { t: END("b14"), p: [0, 2.3, 1.6], l: [0, 3.2, -5], f: 35, fp: [0, 3.2, -5.5], ap: .0006 }];

// ---------------- camera + shot control ----------------
function evalPath(path, t) {
  let i = 0; for (let k = 0; k < path.length; k++) if (path[k].t <= t) i = k; const a = path[i], b = path[Math.min(i + 1, path.length - 1)];
  const u = b === a ? 0 : eio((t - a.t) / (b.t - a.t)), L = (x, y) => x.map((v, j) => lerp(v, y[j], u));
  return { p: L(a.p, b.p), l: L(a.l, b.l), f: lerp(a.f, b.f, u), fp: L(a.fp, b.fp), ap: lerp(a.ap, b.ap, u) };
}
const SH = [
  [0, S("b03"), A, [pathA, 0]], [S("b03"), S("b04"), B, [pathB, 0]], [S("b04"), S("b05"), Cs, [pathC, 0]], [S("b05"), S("b06"), A, [pathA2, 0]],
  [S("b06"), S("b09"), D, [pathD, 0]], [S("b09"), S("b11"), Es, [pathE, 0]], [S("b11"), S("b12"), F, [pathF, 0]], [S("b12"), T.th0, G, [pathG, 0]],
  [T.th0, S("b13"), Hh, [pathH, 0]], [S("b13"), S("b14"), I, [pathI, 0]], [S("b14"), S("b15"), J, [pathJ, 0]], [S("b15"), 1e9, A, [pathA3, 0]],
];
function shakeAt(t) { let x = 0, y = 0; for (const [t0, amp, dur] of T.shakes) { const d = t - t0; if (d < 0 || d > dur) continue; const k = Math.pow(1 - d / dur, 2) * amp, f = Math.floor(d * 60); x += (hash(f * 3 + t0 * 7) - .5) * 2 * k; y += (hash(f * 5 + t0 * 11) - .5) * 2 * k; } return [x, y]; }
const glitchBuf = document.createElement("canvas");
function setShot(sh, path, t, tt) {
  Object.values(shots).forEach(s => (s.g.visible = s === sh));
  scene.fog = new THREE.FogExp2(sh.fog[0], sh.fog[1]);
  const c = evalPath(path, tt == null ? t : tt);
  const dr = [Math.sin(t * .7) * .012, Math.cos(t * .53) * .009]; // natural camera weight
  camera.position.set(c.p[0] + dr[0], c.p[1] + dr[1], c.p[2]); camera.lookAt(c.l[0], c.l[1], c.l[2]);
  camera.fov = 2 * Math.atan(18 / c.f) * 180 / Math.PI; camera.updateProjectionMatrix();
  bokeh.uniforms.focus.value = camera.position.distanceTo(V3(...c.fp)); bokeh.uniforms.aperture.value = c.ap; bokeh.uniforms.maxblur.value = .014;
  sh.update(t);
}
window.__seek = function (t) {
  if (COVER) { setShot(A, [{ t: 0, p: [.4, 1.2, 8.2], l: [.5, .85, 0], f: 50, fp: [.5, 1.2, 0], ap: .0004 }], 0.5); HC.userData.set(21.2, { angle: 54, hot: 1.4 }); FC.userData.set(15, { angle: 20, hot: .8 });
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
