// Renderer + cinematic post stack: MSAA half-float target -> depth of field (BokehPass) -> bloom -> ACES (OutputPass) -> film pass
// (lateral chroma, warm halation, vignette, grain). Deterministic: grain is seeded by film.uniforms.time.
import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { BokehPass } from "three/addons/postprocessing/BokehPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";

export function createPost({ canvas, theme }) {
// ---------------- renderer + post ----------------
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true, powerPreference: "high-performance" });
renderer.setPixelRatio(1); renderer.setSize(1080, 1920, false); renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.NoToneMapping; // ACES is applied by the OutputPass
const scene = new THREE.Scene(); scene.background = new THREE.Color(theme.colors.abyss);
const camera = new THREE.PerspectiveCamera(40, 1080 / 1920, .05, 300);
const rt = new THREE.WebGLRenderTarget(1080, 1920, { type: THREE.HalfFloatType, samples: 2 });
const composer = new EffectComposer(renderer, rt); composer.setSize(1080, 1920);
composer.addPass(new RenderPass(scene, camera));
const bokeh = new BokehPass(scene, camera, { focus: 8, aperture: .0004, maxblur: .012 }); composer.addPass(bokeh);
const bloom = new UnrealBloomPass(new THREE.Vector2(540, 960), .5, .55, .9); composer.addPass(bloom);
const outp = new OutputPass(); composer.addPass(outp);
renderer.toneMappingExposure = 1.0;
const filmPass = new ShaderPass({
  uniforms: { tDiffuse: { value: null }, time: { value: 0 }, grain: { value: theme.look.grain * 1.6 }, vig: { value: theme.look.vig ?? .8 }, halK: { value: theme.look.hal ?? .9 }, fall: { value: theme.look.fall ?? 0 }, cool: { value: theme.look.cool ?? 0 } },
  vertexShader: "varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }",
  fragmentShader: `uniform sampler2D tDiffuse; uniform float time, grain, vig, halK, fall, cool; varying vec2 vUv;
    float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)))*43758.5453); }
    void main(){
      vec2 c = vUv-.5; float r = dot(c,c);
      vec2 off = c*r*.012;                                  // slight lateral chroma
      vec3 col = vec3(texture2D(tDiffuse, vUv+off).r, texture2D(tDiffuse, vUv).g, texture2D(tDiffuse, vUv-off).b);
      // halation: warm bleed around bright areas (cheap 8-tap)
      vec3 hal = vec3(0.);
      for(int i=0;i<8;i++){ float a=float(i)*.785398; vec2 d=vec2(cos(a),sin(a))*vec2(.006,.0034)*(1.+float(i%2)); hal += texture2D(tDiffuse, vUv+d).rgb; }
      hal/=8.; col += max(hal-.55,0.)*vec3(.55,.2,.05)*halK;
      float fx = smoothstep(.0,1.,vUv.x); col *= 1.-fall*fx; col *= mix(vec3(1.), mix(vec3(1.05,1.,.93), vec3(.93,.99,1.09), fx), cool); // window key falls off left->right, fill cools
      col *= 1.-vig*smoothstep(.12,.62,r*1.6);               // vignette
      float g = h(vUv*vec2(1080.,1920.)+time*91.)-.5; col += g*grain*(.5+.8*(1.-dot(col,vec3(.33))));
      gl_FragColor = vec4(col,1.);
    }` });
composer.addPass(filmPass);
const QP = new URLSearchParams(location.search); if (QP.has("nobokeh")) bokeh.enabled = false; if (QP.has("nobloom")) bloom.enabled = false; if (QP.has("nofilm")) filmPass.enabled = false;

  bloom.threshold = .85;
  return { renderer, scene, camera, composer, bokeh, bloom, filmPass };
}
