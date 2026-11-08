// engine/film/solids.js: "filmed CG" solids that read as objects, not outlines (round-3 additions).
// createSolids(P) with P = createProps(renderer). Everything is a pure function of t (call .userData.update(t) where noted).
//   loft(pts, prof, o)        smooth tube/limb with an elliptical section that varies along a centre-line (no capsules)
//   makeSolidFigure(o)        sculpted mannequin: lit by real lights, Horizon/Ultraviolet rim, breathing; pose: SOLID_POSE.stand/hop
//   contactShadow(w, d, a)    soft dark floor shadow + faint light pool
//   makeDarkEarth(R, sun)     night-side Earth: near-black, Horizon city speckle, thin Ultraviolet rim, hard terminator
//   foilMaps()                crinkled gold/black foil colour + normal maps; panelMaps(): near-black solar cells + glint band
//   makePhone(screenTex)      black-glass handset;  makeHand()  dark stylised hand that holds it
import * as THREE from "three";
import { hash } from "./timing.js";

export function createSolids(P) {
  const { envMap, mat, canvasTex, NOISE } = P;
  const V = (x, y, z) => new THREE.Vector3(x, y, z);

  function loft(pts, prof, o = {}) {
    const curve = new THREE.CatmullRomCurve3(pts.map(p => V(...p)), false, "centripetal");
    const pc = new THREE.SplineCurve(prof.map(p => new THREE.Vector2(p[0], p[1])));
    const N = o.rings || 28, M = o.seg || 24, cap = o.cap == null ? .12 : o.cap, ref = o.ref || V(1, 0, 0);
    const pos = [], idx = [];
    for (let i = 0; i <= N; i++) {
      const u = i / N, c = curve.getPoint(u), t = curve.getTangent(u).normalize();
      let a1 = ref.clone().addScaledVector(t, -ref.dot(t)); if (a1.lengthSq() < .01) a1 = V(0, 0, 1); a1.normalize();
      const a2 = new THREE.Vector3().crossVectors(t, a1), r = pc.getPoint(u);
      let e = 1; if (u < cap) e = Math.sqrt(Math.max(0, 1 - Math.pow((cap - u) / cap, 2))); else if (u > 1 - cap) e = Math.sqrt(Math.max(0, 1 - Math.pow((u - 1 + cap) / cap, 2)));
      for (let j = 0; j < M; j++) { const a = j / M * Math.PI * 2; pos.push(c.x + (a1.x * Math.cos(a) * r.x + a2.x * Math.sin(a) * r.y) * e, c.y + (a1.y * Math.cos(a) * r.x + a2.y * Math.sin(a) * r.y) * e, c.z + (a1.z * Math.cos(a) * r.x + a2.z * Math.sin(a) * r.y) * e); }
    }
    for (let i = 0; i < N; i++) for (let j = 0; j < M; j++) { const a = i * M + j, b = i * M + (j + 1) % M, c = (i + 1) * M + j, d = (i + 1) * M + (j + 1) % M; idx.push(a, b, c, b, d, c); }
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return g;
  }
  const ell = (rx, ry, rz, x, y, z) => { const g = new THREE.SphereGeometry(1, 40, 28); g.scale(rx, ry, rz); g.translate(x, y, z); return g; };

  // ---------- the solid figure ----------
  const figMat = k => { const m = mat({ color: 0x14111e, roughness: .5, metalness: .1, envMap, envMapIntensity: .3 });
    m.onBeforeCompile = sh => { sh.fragmentShader = sh.fragmentShader.replace("#include <emissivemap_fragment>", `#include <emissivemap_fragment>
      vec3 wn = inverseTransformDirection(normal, viewMatrix); float fr = pow(1.0 - abs(dot(normalize(normal), normalize(vViewPosition))), 3.0);
      totalEmissiveRadiance += vec3(1.0,.45,.1) * fr * smoothstep(-.1,.9,wn.x) * ${(2.6 * k).toFixed(2)} + vec3(.55,.4,1.) * fr * smoothstep(-.1,.9,-wn.x) * ${(1.7 * k).toFixed(2)};`); }; return m; };
  const SOLID_POSE = {
    stand: { legs: [[[.09, .95, 0], [.095, .52, .012], [.1, .1, 0]], [[-.09, .95, 0], [-.095, .52, .012], [-.1, .1, 0]]], arms: [[[.205, 1.42, 0], [.235, 1.16, -.01], [.245, .9, .03]], [[-.205, 1.42, 0], [-.235, 1.16, -.01], [-.245, .9, .03]]] },
    hop: { legs: [[[.09, .95, 0], [.09, .74, .3], [.09, .5, .34]], [[-.09, .95, 0], [-.09, .55, -.1], [-.09, .17, -.3]]], arms: [[[.205, 1.42, 0], [.22, 1.17, .16], [.22, 1.0, .3]], [[-.205, 1.42, 0], [-.22, 1.17, -.14], [-.22, 1.0, -.26]]] },
  };
  function makeSolidFigure(o = {}) {
    const pose = o.pose || SOLID_POSE.stand, m = figMat(o.rim == null ? 1 : o.rim), g = new THREE.Group(), upper = new THREE.Group(), inner = new THREE.Group();
    const add = (geo, parent) => { const me = new THREE.Mesh(geo, m); me.castShadow = true; me.receiveShadow = true; (parent || g).add(me); return me; };
    // upper body about the pelvis (breathing pivot)
    upper.position.y = .95; inner.position.y = -.95; upper.add(inner); g.add(upper);
    add(loft([[0, .86, 0], [0, 1.2, 0], [0, 1.52, 0]], [[.15, .1], [.168, .105], [.15, .095], [.138, .09], [.158, .103], [.185, .11], [.17, .095], [.1, .075], [.055, .05]], { cap: .03, seg: 40, rings: 44 }), inner);
    add(loft([[0, 1.43, 0], [0, 1.53, .008], [0, 1.6, .014]], [[.062, .058], [.05, .048], [.05, .05]], { cap: .04 }), inner);
    const head = add(ell(.09, .116, .102, 0, 1.625, .012), inner); add(ell(.066, .062, .082, 0, 1.572, .028), inner);
    pose.arms.forEach(a => {
      add(ell(.05, .075, .058, a[0][0] * .95, a[0][1] - .03, 0), inner);
      add(loft([[a[0][0] * .88, a[0][1] + .01, a[0][2]], a[1], a[2]], [[.066, .062], [.052, .05], [.039, .041], [.031, .031]], { cap: .03 }), inner);
      const w = a[2]; add(ell(.03, .058, .024, w[0], w[1] - .045, w[2] + .005), inner); });
    // legs + shoes (static)
    pose.legs.forEach(l => { const top = [l[0][0], l[0][1] + .05, l[0][2]], ank = [l[2][0], l[2][1] - .02, l[2][2]];
      add(loft([top, l[1], ank], [[.102, .106], [.088, .09], [.056, .058], [.062, .064], [.038, .04]], { cap: .03 })); const a = l[2]; add(ell(.055, .045, .125, a[0], a[1] - .06, a[2] + .05)); });
    g.userData.update = t => { const b = Math.sin(t * 1.9); upper.scale.set(1 - .004 * b, 1 + .007 * b, 1 - .004 * b); upper.rotation.z = .012 * Math.sin(t * .7); upper.rotation.x = .006 * Math.sin(t * .5); head.rotation.y = .1 * Math.sin(t * .4); };
    g.userData.update(0); return g;
  }
  function contactShadow(w = .6, d = .35, a = .9) {
    const tex = canvasTex(128, 128, (x) => { const gr = x.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, `rgba(0,0,0,${a})`); gr.addColorStop(.45, `rgba(0,0,0,${a * .55})`); gr.addColorStop(1, "rgba(0,0,0,0)"); x.fillStyle = gr; x.fillRect(0, 0, 128, 128); });
    const g = new THREE.Group();
    const pool = new THREE.Mesh(new THREE.CircleGeometry(1, 48), new THREE.MeshBasicMaterial({ color: 0x3a3358, transparent: true, opacity: .28, depthWrite: false, blending: THREE.AdditiveBlending, map: P.glowTex }));
    pool.rotation.x = -Math.PI / 2; pool.scale.set(2.1, 2.1, 1); pool.position.y = .003; g.add(pool);
    const sh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: true })); sh.rotation.x = -Math.PI / 2; sh.scale.set(w * 2, d * 2, 1); sh.position.y = .006; g.add(sh); return g;
  }

  // ---------- night-side Earth ----------
  function makeDarkEarth(R, sun) {
    const g = new THREE.Group(), s = sun.clone().normalize();
    const m = new THREE.ShaderMaterial({ uniforms: { sun: { value: s }, t: { value: 0 }, R: { value: R } },
      vertexShader: "varying vec3 vN; varying vec3 vO; varying vec3 vW; varying vec3 vC; void main(){ vC=(modelMatrix*vec4(0.,0.,0.,1.)).xyz; vO=position; vN=normalize(mat3(modelMatrix)*normal); vec4 w=modelMatrix*vec4(position,1.); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }",
      fragmentShader: NOISE + `uniform vec3 sun; uniform float t, R; varying vec3 vN; varying vec3 vO; varying vec3 vW; varying vec3 vC;
        void main(){ vec3 N=normalize(vN), V=normalize(cameraPosition-vW); vec3 p=normalize(vO)*3.2;
          float land=smoothstep(.5,.56,fbm(p)); float d=dot(N,sun); float lit=smoothstep(-.006,.006,d);
          vec3 night=mix(vec3(.003,.003,.007), vec3(.012,.010,.016), land);
          vec3 day=mix(vec3(.006,.007,.012), vec3(.05,.042,.044)*(.5+fbm(p*3.)), land)*(.25+1.1*max(d,0.));
          vec3 c=mix(night,day,lit);
          float cl=smoothstep(.5,.68,fbm(p*2.3+3.));
          float sp=vn(p*190.)*.55+vn(p*330.+5.)*.45; float dots=smoothstep(.62,.74,sp);
          float glow=smoothstep(.55,.9,fbm(p*7.+9.))*cl;
          float city=land*(1.-lit)*(cl*dots*5.5+glow*.35);
          c+=vec3(1.,.54,.16)*city;
          float nv=max(dot(N,V),0.); float px=nv/max(fwidth(nv),1e-6); float fr=1.-smoothstep(0.,16.,px); fr*=fr; c+=vec3(.66,.52,1.)*fr*.9*(1.-.4*lit);
          gl_FragColor=vec4(c,1.); }` });
    g.add(new THREE.Mesh(new THREE.SphereGeometry(R, 160, 96), m));
    const am = new THREE.ShaderMaterial({ transparent: true, side: THREE.BackSide, blending: THREE.AdditiveBlending, depthWrite: false,
      vertexShader: "varying vec3 vN; varying vec3 vW; void main(){ vN=normalize(mat3(modelMatrix)*normal); vec4 w=modelMatrix*vec4(position,1.); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }",
      fragmentShader: "varying vec3 vN; varying vec3 vW; void main(){ vec3 V=normalize(cameraPosition-vW); float f=pow(max(dot(-vN,V),0.),9.); gl_FragColor=vec4(vec3(.55,.4,1.)*f*.5,1.); }" });
    g.add(new THREE.Mesh(new THREE.SphereGeometry(R * 1.018, 96, 64), am)); g.userData.m = m; return g;
  }

  // ---------- satellite materials ----------
  function foilMaps() {
    const S = 512, hc = document.createElement("canvas"); hc.width = hc.height = S; const hx = hc.getContext("2d");
    hx.fillStyle = "#808080"; hx.fillRect(0, 0, S, S);
    for (let i = 0; i < 1100; i++) { const cx = hash(i * 3.1) * S, cy = hash(i * 5.3) * S, r = 7 + hash(i * 7.7) * 38, a0 = hash(i * 9.1) * 6.28;
      hx.fillStyle = `rgb(${60 + hash(i * 11.3) * 140 | 0},${60 + hash(i * 11.3) * 140 | 0},${60 + hash(i * 11.3) * 140 | 0})`; hx.globalAlpha = .5; hx.beginPath();
      for (let k = 0; k < 3 + (hash(i * 13) * 3 | 0); k++) { const a = a0 + k * 6.28 / 4 + hash(i * 17 + k) - .5, rr = r * (.5 + hash(i * 19 + k)); hx[k ? "lineTo" : "moveTo"](cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); }
      hx.closePath(); hx.fill(); }
    hx.globalAlpha = 1; const blur = document.createElement("canvas"); blur.width = blur.height = S; const bx = blur.getContext("2d"); bx.filter = "blur(1.6px)"; bx.drawImage(hc, 0, 0);
    const hd = bx.getImageData(0, 0, S, S).data, nm = document.createElement("canvas"); nm.width = nm.height = S; const nx = nm.getContext("2d"), ni = nx.createImageData(S, S), H = (x, y) => hd[(((y + S) % S) * S + ((x + S) % S)) * 4] / 255;
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) { const dx = (H(x + 1, y) - H(x - 1, y)) * 5, dy = (H(x, y + 1) - H(x, y - 1)) * 5, l = Math.hypot(dx, dy, 1), k = (y * S + x) * 4; ni.data[k] = (-dx / l * .5 + .5) * 255; ni.data[k + 1] = (dy / l * .5 + .5) * 255; ni.data[k + 2] = (1 / l * .5 + .5) * 255; ni.data[k + 3] = 255; }
    nx.putImageData(ni, 0, 0);
    const normalMap = new THREE.CanvasTexture(nm); normalMap.wrapS = normalMap.wrapT = THREE.RepeatWrapping; normalMap.anisotropy = 4;
    const map = canvasTex(S, S, (x, w, h) => { x.fillStyle = "#a98238"; x.fillRect(0, 0, w, h);
      for (let i = 0; i < 14; i++) { x.fillStyle = `rgba(${140 + hash(i) * 50 | 0},${100 + hash(i * 3) * 40 | 0},45,.28)`; x.fillRect(hash(i * 8.3) * w - 20, hash(i * 10.1) * h - 20, 80 + hash(i * 4.1) * 200, 60 + hash(i * 6.7) * 160); }
      x.fillStyle = "rgba(14,12,18,.9)"; x.fillRect(0, 0, w, 54); x.fillRect(0, h - 70, w, 70);
      x.globalCompositeOperation = "overlay"; x.globalAlpha = .9; x.drawImage(blur, 0, 0); });
    map.wrapS = map.wrapT = THREE.RepeatWrapping; return { map, normalMap };
  }
  function panelMaps() {
    const map = canvasTex(512, 256, (x, w, h) => { x.fillStyle = "#06050b"; x.fillRect(0, 0, w, h);
      for (let i = 0; i < 8; i++) for (let j = 0; j < 4; j++) { const g2 = x.createLinearGradient(i * 64, j * 64, i * 64 + 64, j * 64 + 64); g2.addColorStop(0, "#0b0a1a"); g2.addColorStop(1, "#14122a"); x.fillStyle = g2; x.fillRect(i * 64 + 2, j * 64 + 2, 60, 60);
        x.strokeStyle = "rgba(150,140,200,.22)"; x.lineWidth = 1; for (let k = 1; k < 6; k++) { x.beginPath(); x.moveTo(i * 64 + 2 + k * 10, j * 64 + 2); x.lineTo(i * 64 + 2 + k * 10, j * 64 + 62); x.stroke(); } x.strokeStyle = "rgba(190,180,230,.35)"; x.strokeRect(i * 64 + 2, j * 64 + 2, 60, 60); } });
    const glint = canvasTex(256, 64, (x, w, h) => { const gr = x.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, "rgba(255,255,255,0)"); gr.addColorStop(.46, "rgba(255,225,190,0)"); gr.addColorStop(.5, "rgba(255,240,215,1)"); gr.addColorStop(.54, "rgba(255,225,190,0)"); gr.addColorStop(1, "rgba(255,255,255,0)"); x.fillStyle = gr; x.fillRect(0, 0, w, h); });
    glint.wrapS = THREE.RepeatWrapping; glint.repeat.set(.5, 1); return { map, glint };
  }

  // ---------- phone + hand ----------
  function roundedSlab(w, h, d, r, bev) {
    const s = new THREE.Shape(), x = -w / 2, y = -h / 2; s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h); s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r); s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
    const g = new THREE.ExtrudeGeometry(s, { depth: d - 2 * bev, bevelEnabled: true, bevelThickness: bev, bevelSize: bev, bevelSegments: 4, curveSegments: 10 }); g.translate(0, 0, -d / 2 + bev); return g;
  }
  function makePhone(screenTex) {
    const g = new THREE.Group();
    const frame = new THREE.Mesh(roundedSlab(.27, .54, .03, .045, .006), mat({ color: 0x24212c, metalness: 1, roughness: .28, envMap, envMapIntensity: 1.1 })); frame.castShadow = true; g.add(frame);
    const glass = new THREE.Mesh(roundedSlab(.256, .526, .004, .04, .002), mat({ color: 0x030204, metalness: .6, roughness: .08, envMap, envMapIntensity: 1.4 })); glass.position.z = .0165; g.add(glass);
    const sc = canvasTex(256, 512, (x, w, h) => { x.fillStyle = "#000"; x.fillRect(0, 0, w, h); x.save(); x.beginPath(); const r = 24; x.roundRect(14, 14, w - 28, h - 28, r); x.clip(); x.drawImage(screenTex.image, 0, 0, w, h); x.restore(); x.fillStyle = "#000"; x.beginPath(); x.roundRect(w / 2 - 28, 22, 56, 16, 8); x.fill(); });
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(.236, .5), new THREE.MeshBasicMaterial({ map: sc, transparent: false })); scr.position.z = .0195; g.add(scr);
    const cam = new THREE.Mesh(new THREE.CircleGeometry(.004, 16), new THREE.MeshBasicMaterial({ color: 0x15122a })); cam.position.set(.04, .234, .0198); g.add(cam);
    return g;
  }
  function makeHand() {
    const g = new THREE.Group(), m = mat({ color: 0x120f1a, roughness: .6, metalness: .1, envMap, envMapIntensity: .2 });
    m.onBeforeCompile = figMat(.9).onBeforeCompile;
    const add = geo => { const me = new THREE.Mesh(geo, m); me.castShadow = true; g.add(me); return me; };
    add(ell(.15, .17, .06, 0, -.17, -.075));
    add(loft([[0, -.28, -.09], [.02, -.52, -.14], [.04, -.8, -.2]], [[.07, .055], [.06, .05], [.058, .05]], { cap: .08 }));
    [-.15, -.07, .01, .09].forEach((y, i) => add(loft([[.05, y, -.085], [.17, y + .004, -.07], [.205, y + .006, -.02], [.172, y + .004, .018]], [[.03, .03], [.029, .029], [.027, .027], [.025, .025]], { cap: .1, ref: V(0, 1, 0) })));
    add(loft([[-.12, -.34, -.085], [-.2, -.2, -.04], [-.175, -.06, .0], [-.12, .01, .026]], [[.045, .04], [.04, .037], [.036, .034], [.033, .03]], { cap: .1, ref: V(0, 0, 1) }));
    return g;
  }
  return { loft, makeSolidFigure, SOLID_POSE, contactShadow, makeDarkEarth, foilMaps, panelMaps, makePhone, makeHand, roundedSlab };
}
