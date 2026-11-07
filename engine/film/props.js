// Reusable 3D props + procedural textures: PMREM studio env, scratched metal, luminous clock, rim-lit extruded figure, procedural Earth,
// light cones, dust. Create once per page: const P = createProps(renderer).
import * as THREE from "three";
import { clamp, smooth, eio, eo3, eob, lerp, hash } from "./timing.js";

export function createProps(renderer) {
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
  const pl = new THREE.PointLight(ac, .22, R * 6, 2); pl.position.set(0, 0, R * 1.5); g.add(pl);
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
float fbm(vec3 p){ float a=.5, s=0.; for(int i=0;i<4;i++){ s+=a*vn(p); p=p*2.03+7.1; a*=.5; } return s; }`;
function makeEarth(R, sun, opts) {
  opts = opts || {};
  const g = new THREE.Group();
  const m = new THREE.ShaderMaterial({ uniforms: { sun: { value: sun.clone().normalize() }, t: { value: 0 }, nightK: { value: opts.night ? 1 : 0 } },
    vertexShader: "varying vec3 vN; varying vec3 vO; varying vec3 vW; void main(){ vO=position; vN=normalize(mat3(modelMatrix)*normal); vec4 w=modelMatrix*vec4(position,1.); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }",
    fragmentShader: NOISE + `uniform vec3 sun; uniform float t, nightK; varying vec3 vN; varying vec3 vO; varying vec3 vW;
      void main(){ vec3 N=normalize(vN), V=normalize(cameraPosition-vW); vec3 p=normalize(vO)*3.2;
        float land=smoothstep(.5,.56,fbm(p)); float cl=smoothstep(.5,.8,fbm(p*1.7+vec3(t*.01,0.,0.)+9.));
        float d=dot(N,sun); float day=smoothstep(-.12,.25,d);
        vec3 ocean=mix(vec3(.01,.02,.06),vec3(.03,.07,.2),pow(max(d,0.),.6)); vec3 ground=mix(vec3(.02,.015,.04),vec3(.12,.1,.2),fbm(p*3.)) ;
        vec3 c=mix(ocean,ground,land)*(.1+(1.6-nightK*1.35)*day);
        vec3 R=reflect(-sun,N); float spec=pow(max(dot(R,V),0.),50.)*(1.-land)*day; c+=vec3(1.,.7,.5)*spec*.9;
        c+=vec3(.55,.55,.65)*cl*.38*day;
        float city=step(.62-nightK*.1,fbm(p*9.))*land*(1.-day)*smoothstep(.5-nightK*.1,.8,fbm(p*4.+3.)); c+=vec3(1.,.55,.18)*city*(1.6+nightK*2.2);
        float fr=pow(1.-max(dot(N,V),0.),3.+nightK*2.5); vec3 atm=mix(vec3(.45,.35,1.),vec3(1.,.45,.12),smoothstep(.2,.9,d)); c+=atm*fr*(.3+1.3*smoothstep(-.3,.7,d))*(1.-nightK*.75);
        gl_FragColor=vec4(c,1.); }` });
  g.add(new THREE.Mesh(new THREE.SphereGeometry(R, 160, 96), m));
  const am = new THREE.ShaderMaterial({ transparent: true, side: THREE.BackSide, blending: THREE.AdditiveBlending, depthWrite: false, uniforms: { sun: { value: sun.clone().normalize() }, nk: { value: opts.night ? 1 : 0 } },
    vertexShader: "varying vec3 vN; varying vec3 vW; void main(){ vN=normalize(mat3(modelMatrix)*normal); vec4 w=modelMatrix*vec4(position,1.); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }",
    fragmentShader: "uniform vec3 sun; uniform float nk; varying vec3 vN; varying vec3 vW; void main(){ vec3 V=normalize(cameraPosition-vW); float f=pow(max(dot(-vN,V),0.),2.2+nk*2.); float d=dot(normalize(vW-vec3(0.)),sun); gl_FragColor=vec4(mix(vec3(.4,.3,1.),vec3(1.,.5,.15),.5)*f*(1.4-nk*.7),1.); }" });
  const atm = new THREE.Mesh(new THREE.SphereGeometry(R * (opts.night ? 1.012 : 1.05), 96, 64), am); g.add(atm);
  g.userData.m = m; return g;
}

  return { canvasTex, noiseTex, scratchTex, glowTex, envMap, mat, emis, addMat, glowSprite, lightCone, dustField, makeClock, makeFigure, makeEarth, rimMat, NOISE };
}
