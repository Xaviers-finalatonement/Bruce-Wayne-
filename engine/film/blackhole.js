// Physically-motivated black hole as a screen-space shader (Schwarzschild null geodesics, precomputed LUT) + inside-the-horizon streaks.
//   createBlackHoles(THREE, scene) -> { make(), makeFall(), lut }
// A "BH layer" is a full-screen quad: for each pixel the impact parameter b gives the exact photon orbit (u'' = -u + 3u^2, M = 1), so the
// disc is lensed over the top / under the bottom, the thin photon ring and the gravitationally smeared star field come out of the same maths.
// Doppler beaming + gravitational redshift tint the disc; the brighter side is screen-right (rotation flip: uFlip).
import * as THREE from "three";

export const BCRIT = 3 * Math.sqrt(3);
const NB = 1024, NP = 512, PH = 4 * Math.PI, VMAX = 0.92;

function f16(val) { // float -> half
  const f32 = new Float32Array(1), u32 = new Uint32Array(f32.buffer); f32[0] = val; const x = u32[0];
  const s = (x >>> 16) & 0x8000; let e = ((x >>> 23) & 0xff) - 112, m = x & 0x7fffff;
  if (e <= 0) return s; if (e >= 31) return s | 0x7bff; return s | (e << 10) | (m >> 13);
}

export function buildLUT() {
  const half = new Uint16Array(NB * NP * 4), end = new Float32Array(NB * 4);
  const F = (u, w) => [w, -u + 3 * u * u];
  for (let j = 0; j < NB; j++) {
    const v = VMAX * j / (NB - 1), b = Math.max(8 * v / (1 - v), 1e-3);
    let u = 0, w = 1 / b, dead = 0, phiEnd = 0; // dead: 1 absorbed, 2 escaped
    const hstep = (PH / (NP - 1)) / 10;
    for (let i = 0; i < NP; i++) {
      const phi = PH * i / (NP - 1), o = (j * NP + i) * 4;
      half[o] = f16(dead === 1 ? 1.0 : dead === 2 ? -0.1 : u); half[o + 1] = f16(dead ? 0 : w); half[o + 2] = 0; half[o + 3] = f16(1);
      for (let s = 0; s < 10 && !dead; s++) {
        const k1 = F(u, w), k2 = F(u + hstep / 2 * k1[0], w + hstep / 2 * k1[1]), k3 = F(u + hstep / 2 * k2[0], w + hstep / 2 * k2[1]), k4 = F(u + hstep * k3[0], w + hstep * k3[1]);
        u += hstep / 6 * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]); w += hstep / 6 * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]);
        if (!(u < 0.5)) { dead = 1; } else if (u <= 0 && phi + (s + 1) * hstep > 0.05) { dead = 2; phiEnd = phi + (s + 1) * hstep; }
      }
    }
    end[j * 4] = dead === 2 ? phiEnd : (dead === 1 ? 0 : PH);
  }
  const lut = new THREE.DataTexture(half, NP, NB, THREE.RGBAFormat, THREE.HalfFloatType);
  lut.minFilter = lut.magFilter = THREE.LinearFilter; lut.wrapS = lut.wrapT = THREE.ClampToEdgeWrapping; lut.generateMipmaps = false; lut.needsUpdate = true;
  const et = new THREE.DataTexture(end, NB, 1, THREE.RGBAFormat, THREE.FloatType);
  et.minFilter = et.magFilter = THREE.NearestFilter; et.generateMipmaps = false; et.needsUpdate = true;
  return { lut, end: et };
}

const VERT = "void main(){ gl_Position = vec4(position.xy, 0., 1.); }";
const HASH = `
float h11(float n){ return fract(sin(n*127.1+311.7)*43758.5453); }
float h21(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
vec3 h33(vec3 p){ p=vec3(dot(p,vec3(127.1,311.7,74.7)),dot(p,vec3(269.5,183.3,246.1)),dot(p,vec3(113.5,271.9,124.6))); return fract(sin(p)*43758.5453); }
float vn(vec3 x){ vec3 i=floor(x), f=fract(x); f=f*f*(3.-2.*f);
  return mix(mix(mix(h21(i.xy+i.z*17.),h21(i.xy+vec2(1,0)+i.z*17.),f.x),mix(h21(i.xy+vec2(0,1)+i.z*17.),h21(i.xy+vec2(1,1)+i.z*17.),f.x),f.y),
             mix(mix(h21(i.xy+(i.z+1.)*17.),h21(i.xy+vec2(1,0)+(i.z+1.)*17.),f.x),mix(h21(i.xy+vec2(0,1)+(i.z+1.)*17.),h21(i.xy+vec2(1,1)+(i.z+1.)*17.),f.x),f.y),f.z); }
float fbm(vec3 p){ float a=.5, s=0.; for(int i=0;i<4;i++){ s+=a*vn(p); p=p*2.03+7.1; a*=.5; } return s; }`;

const BH_FRAG = `precision highp float;
uniform sampler2D uLUT, uEnd; uniform vec2 uCenter; uniform vec4 uClip;
uniform float uScale, uTheta, uRoll, uTime, uDisc, uStars, uRing, uSpin, uOpacity, uFlip, uDobs, uStarK, uHeat, uNeb, uSeed;
const float BC = 5.196152, PI = 3.14159265, PH = ${PH.toFixed(6)}, VMAX = ${VMAX.toFixed(3)};
${HASH}
vec2 lut(float b, float phi){ float v = b/(b+8.); float tv = (min(v/VMAX,1.)*${NB - 1}.+.5)/${NB}.; float tu = (clamp(phi,0.,PH)/PH*${NP - 1}.+.5)/${NP}.; return texture2D(uLUT, vec2(tu, tv)).rg; }
float phiEnd(float b){ float v = min(b/(b+8.)/VMAX,1.)*${NB - 1}.; float i0=floor(v), f=v-i0; float a = texelFetch(uEnd, ivec2(int(i0),0),0).r, c = texelFetch(uEnd, ivec2(int(min(i0+1.,${NB - 1}.)),0),0).r; return mix(a,c,f); }
vec3 starLayer(vec3 d, float sc, float rad, float dens, float seed){
  vec3 p = d*sc, c = floor(p); vec3 h = h33(c + seed); if(h.x > dens) return vec3(0.);
  vec3 q = fract(p) - (.2 + .6*h.yzx); float dd = length(q);
  float br = pow(h.z, 3.) * smoothstep(rad, 0., dd);
  vec3 tint = mix(vec3(1.,.72,.5), vec3(.7,.72,1.), h.y);
  return tint*br*(1.4 + 4.*step(.93,h.z));
}
vec3 sky(vec3 d){
  vec3 col = vec3(0.);
  float k = uStarK;
  col += starLayer(d, 1500.*k, .2, .30, 1.) * .8;
  col += starLayer(d, 720.*k, .18, .24, 7.) * 1.1;
  col += starLayer(d, 300.*k, .14, .20, 13.) * 1.7;
  float n = fbm(d*5. + vec3(3.,1.,uSeed)); float band = smoothstep(.35,.95,n) * (.6 + .4*fbm(d*22.+9.));
  col += (vec3(.30,.20,.55)*.8 + vec3(.5,.18,.04)*.3) * band * .04 * uNeb;
  return col * uStars;
}
vec3 ramp(float I, float g, float r){
  vec3 hz = vec3(1.0, .26, .025), cool = vec3(.42, .20, .95);
  vec3 base = mix(hz, cool, smoothstep(9.,26.,r)*.75);
  vec3 c = base * I; c += vec3(.60,.34,.12) * max(I-1.1, 0.) * .7;
  return c;
}
void main(){
  vec2 fr = vec2(gl_FragCoord.x, 1920. - gl_FragCoord.y);
  if(fr.x < uClip.x || fr.x > uClip.z || fr.y < uClip.y || fr.y > uClip.w) discard;
  vec2 s = (fr - uCenter)/uScale; s.y = -s.y;
  float cr = cos(uRoll), sr = sin(uRoll); s = vec2(cr*s.x - sr*s.y, sr*s.x + cr*s.y);
  float b = length(s); vec2 e2 = s/max(b,1e-4);
  float ct = cos(uTheta), st = sin(uTheta);
  vec3 no = vec3(0., ct, st), us = vec3(0., st, -ct), eh = vec3(e2.x, 0., 0.) + e2.y*us;
  float ey = eh.y; float phi1 = atan(ct, -ey);
  vec3 col = vec3(0.); float T = 1.; bool absorbed = b < BC, escaped = false;
  float rot = uTime*uSpin;
  if(!absorbed || true){
    for(int k=0; k<4; k++){
      float phi = phi1 + float(k)*PI; vec2 uw = lut(b, phi); float u = uw.x;
      if(u >= .5){ absorbed = true; break; }
      if(u <= 0.){ escaped = true; break; }
      float r = 1./u;
      if(r > 5.8 && r < 27. && uDisc > 0.){
        float cp = cos(phi), sp = sin(phi);
        vec3 P = r*(cp*no + sp*eh), Ph = normalize(P);
        float dr = -uw.y/(u*u);
        vec3 kk = -normalize(dr*(cp*no + sp*eh) + r*(-sp*no + cp*eh));
        vec3 tdir = normalize(cross(Ph, vec3(0.,1.,0.)))*uFlip;
        float v = sqrt(1./max(r-2.,.5)); v = min(v,.85);
        float gam = 1./sqrt(1.-v*v); float g = (1./(gam*(1. - v*dot(tdir,kk))))*sqrt(max(1.-2./r,.05));
        float ang = atan(P.z, P.x);
        float om = 2.2*pow(6./r, 1.5);
        float a = ang - om*rot;
        float tb = fbm(vec3(log(r)*13., cos(a)*1.7, sin(a)*1.7));
        float tf = vn(vec3(log(r)*70., cos(a*2.)*3.2, sin(a*2.)*3.2) + 4.);
        float turb = (.12 + 1.9*smoothstep(.22,.78,tb)) * (.5 + 1.0*tf);
        float em = pow(6./r, 2.5) * smoothstep(5.8,7.0,r) * smoothstep(24.,12.,r);
        float I = 2.6 * em * turb * pow(g, 3.4) * uDisc * uHeat;
        float alpha = .9 * smoothstep(5.8,7.0,r);
        col += T*ramp(I, g, r)*alpha; T *= (1.-alpha);
        if(T < .02) break;
      }
    }
  }
  if(!absorbed){
    float pe = escaped ? phiEnd(b) : PH;
    float eps = b/uDobs, dlt = pe - PI, ang = eps - dlt;
    vec3 d = cos(ang)*(-no) + sin(ang)*eh;
    col += T*sky(d);
  }
  // thin photon ring + soft halo (n=inf images), Doppler-lopsided
  float lop = .2 + 1.0*smoothstep(-.8,.8, (e2.x*cr + e2.y*sr)*uFlip);
  float bb = (b - BC)/BC;
  float ring = exp(-pow((bb-.004)/.0042, 2.)) * 1.5 + exp(-pow((bb-.025)/.03, 2.)) * .16;
  if(bb < -.02) ring *= exp(-pow((bb+.02)/.02, 2.));
  col += vec3(1.,.50,.16) * ring * lop * uRing * (.7 + .3*uHeat) ;
  gl_FragColor = vec4(col*uOpacity, uOpacity > .999 ? 1. : uOpacity);
}`;

const FALL_FRAG = `precision highp float;
uniform vec2 uCenter; uniform vec4 uClip; uniform float uTime, uSpeed, uOpacity, uDens, uCore;
${HASH}
void main(){
  vec2 fr = vec2(gl_FragCoord.x, 1920. - gl_FragCoord.y);
  if(fr.x < uClip.x || fr.x > uClip.z || fr.y < uClip.y || fr.y > uClip.w) discard;
  vec2 q = (fr - uCenter)/960.; float r = length(q), a = atan(q.y, q.x) / 6.2831853 + .5;
  vec3 col = vec3(0.);
  for(int L=0; L<5; L++){
    float N = 40. + float(L)*55.; float x = a*N; float id = floor(x), f = fract(x) - .5;
    float h1 = h21(vec2(id, float(L)*3.1)), h2 = h21(vec2(id+.5, float(L)*7.7)), h3 = h21(vec2(id+9.1, float(L)*1.3));
    if(h3 > uDens) continue;
    float perp = abs(f) * 6.2831853 * r / N;
    float rh = fract(h1*5.3 + h2 - uTime*uSpeed*(.35 + .9*h2));
    float rr = mix(.015, 1.9, rh*rh);
    float len = (.10 + .55*h1) * (.3 + rr);
    float xx = (r - rr)/len; // 0 at head, 1 at tail (outward)
    float w = .0009 + .0016*h2;
    float lines = smoothstep(w, 0., perp) * step(0.,xx) * step(xx,1.) * pow(1.-xx, 1.6);
    float bright = (.5 + 2.2*h1) * smoothstep(.0,.25, rr) * (.35 + rr);
    vec3 tint = mix(vec3(.8,.78,1.), vec3(1.,.62,.28), h2*h2);
    col += tint*lines*bright;
  }
  float core = exp(-r*r*10.)*uCore; col *= (1. - .85*core); col += vec3(.16,.09,.42)*exp(-r*r*70.)*uCore*.35;
  gl_FragColor = vec4(col*uOpacity, 1.);
}`;

export function createBlackHoles(scene) {
  const { lut, end } = buildLUT();
  const geo = new THREE.PlaneGeometry(2, 2);
  const layers = [];
  const bhUniforms = () => ({ uLUT: { value: lut }, uEnd: { value: end }, uCenter: { value: new THREE.Vector2(540, 960) }, uClip: { value: new THREE.Vector4(0, 0, 1080, 1920) },
    uScale: { value: 30 }, uTheta: { value: 1.47 }, uRoll: { value: -.12 }, uTime: { value: 0 }, uDisc: { value: 1 }, uStars: { value: 1 }, uRing: { value: 1 }, uSpin: { value: .07 },
    uOpacity: { value: 1 }, uFlip: { value: 1 }, uDobs: { value: 220 }, uStarK: { value: 1 }, uHeat: { value: 1 }, uNeb: { value: 1 }, uSeed: { value: 0 } });
  function make(order = -10) {
    const m = new THREE.ShaderMaterial({ uniforms: bhUniforms(), vertexShader: VERT, fragmentShader: BH_FRAG, depthTest: false, depthWrite: false, transparent: true });
    const me = new THREE.Mesh(geo, m); me.frustumCulled = false; me.renderOrder = order; scene.add(me); layers.push(me); me.visible = false; return me;
  }
  function makeFall(order = -9) {
    const m = new THREE.ShaderMaterial({ uniforms: { uCenter: { value: new THREE.Vector2(540, 960) }, uClip: { value: new THREE.Vector4(0, 0, 1080, 1920) }, uTime: { value: 0 }, uSpeed: { value: .5 }, uOpacity: { value: 1 }, uDens: { value: .8 }, uCore: { value: 1 } },
      vertexShader: VERT, fragmentShader: FALL_FRAG, depthTest: false, depthWrite: false, transparent: true, blending: THREE.AdditiveBlending });
    const me = new THREE.Mesh(geo, m); me.frustumCulled = false; me.renderOrder = order; scene.add(me); me.visible = false; return me;
  }
  return { make, makeFall, lut, layers };
}
