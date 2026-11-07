// A small suited astronaut (about 1 unit tall) built from primitives: white suit, dark visor, backpack, jointed limbs.
// Lit only by the scene's lights (rim from the accretion disk). Per-instance uniforms: stretch (spaghettification), tear, redshift, alpha.
import * as THREE from "three";

export function makeAstronaut(envMap) {
  const root = new THREE.Group(), U = { uRoot: { value: new THREE.Matrix4() }, uRootInv: { value: new THREE.Matrix4() }, uK: { value: 0 }, uGap: { value: 0 }, uTearY: { value: .5 }, uRed: { value: 0 }, uAlpha: { value: 1 }, uDark: { value: 0 } };
  const mk = (color, rough, metal, envI) => {
    const m = new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal, envMap, envMapIntensity: envI, transparent: true });
    m.onBeforeCompile = sh => {
      Object.assign(sh.uniforms, U);
      sh.vertexShader = "uniform mat4 uRoot, uRootInv; uniform float uK, uGap, uTearY;\n" + sh.vertexShader.replace("#include <project_vertex>",
        `vec4 wp = modelMatrix * vec4(transformed, 1.0);
         vec4 lp = uRootInv * wp;
         float f = 1.0 - clamp(lp.y, 0.0, 1.0);
         lp.y -= uK * pow(f, 1.35);
         float tz = smoothstep(uTearY + 0.03, uTearY - 0.03, lp.y) * step(0.0001, uGap);
         lp.y -= uGap * tz;
         float neck = exp(-pow((lp.y - (uTearY - uGap * 0.5)) / (0.03 + uGap * 0.5), 2.0)) * step(0.0001, uGap);
         float sq = 1.0 / (1.0 + uK * 0.5 * pow(f, 0.7));
         lp.x *= sq * (1.0 - 0.8 * neck); lp.z *= sq * (1.0 - 0.8 * neck);
         wp = uRoot * lp;
         vec4 mvPosition = viewMatrix * wp;
         gl_Position = projectionMatrix * mvPosition;`);
      sh.fragmentShader = "uniform float uRed, uAlpha, uDark;\n" + sh.fragmentShader.replace("#include <opaque_fragment>",
        `#include <opaque_fragment>
         float lum = dot(gl_FragColor.rgb, vec3(.3, .55, .15));
         gl_FragColor.rgb = mix(gl_FragColor.rgb, lum * vec3(1.0, .20, .06) * 1.3, uRed) * (1.0 - .6 * uRed);
         gl_FragColor.rgb *= (1.0 - uDark);
         gl_FragColor.a *= uAlpha;`);
    };
    return m;
  };
  const suit = mk(0xb9b5c9, .5, .05, .2), dark = mk(0x16131f, .6, .2, .1), visor = mk(0x050309, .08, .9, 1.4), trim = mk(0x8d8aa6, .4, .5, .3);
  const add = (parent, geo, m, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1) => { const me = new THREE.Mesh(geo, m); me.position.set(x, y, z); me.scale.set(sx, sy, sz); parent.add(me); return me; };
  const J = (parent, x, y, z) => { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); return g; };
  const body = J(root, 0, 0, 0);
  add(body, new THREE.CapsuleGeometry(.082, .15, 6, 16), suit, 0, .69, 0, 1.18, 1, .8);       // torso
  add(body, new THREE.CapsuleGeometry(.072, .06, 6, 12), suit, 0, .55, 0, 1.2, 1, .85);       // hips
  add(body, new THREE.CapsuleGeometry(.055, .12, 5, 12), suit, 0, .72, -.1, 1.55, 1, 1);                // backpack
  add(body, new THREE.BoxGeometry(.12, .07, .02), dark, 0, .74, .075);               // chest box
  add(body, new THREE.CylinderGeometry(.05, .06, .04, 16), trim, 0, .83, 0);                  // neck ring
  const head = J(body, 0, .905, 0);
  add(head, new THREE.SphereGeometry(.098, 28, 20), suit);
  add(head, new THREE.SphereGeometry(.092, 28, 18, Math.PI / 2 - 1.0, 2.0, .5, 1.5), visor, 0, .0, .014);
  const arm = side => { const sh = J(body, side * .125, .775, 0); add(sh, new THREE.SphereGeometry(.04, 12, 10), suit);
    const up = J(sh, 0, 0, 0); add(up, new THREE.CapsuleGeometry(.034, .1, 5, 10), suit, 0, -.075, 0);
    const el = J(up, 0, -.15, 0); add(el, new THREE.SphereGeometry(.034, 10, 8), suit); add(el, new THREE.CapsuleGeometry(.03, .09, 5, 10), suit, 0, -.07, 0);
    const hand = J(el, 0, -.15, 0); add(hand, new THREE.SphereGeometry(.036, 12, 10), dark); return { sh, el, hand }; };
  const leg = side => { const hp = J(body, side * .055, .52, 0); const th = J(hp, 0, 0, 0); add(th, new THREE.CapsuleGeometry(.05, .12, 5, 12), suit, 0, -.095, 0);
    const kn = J(th, 0, -.2, 0); add(kn, new THREE.SphereGeometry(.045, 10, 8), suit); add(kn, new THREE.CapsuleGeometry(.043, .12, 5, 12), suit, 0, -.095, 0);
    const ft = J(kn, 0, -.2, 0); add(ft, new THREE.BoxGeometry(.075, .05, .13), dark, 0, -.02, .025); return { hp, kn, ft }; };
  const A = arm(-1), B = arm(1), L = leg(-1), R = leg(1);
  root.userData = { U, body, head, armL: A, armR: B, legL: L, legR: R };
  root.userData.update = () => { root.updateMatrixWorld(true); U.uRoot.value.copy(root.matrixWorld); U.uRootInv.value.copy(root.matrixWorld).invert(); };
  // pose: reach in [0,1] (arms up/forward), spread (legs), tumble flail amplitude
  root.userData.pose = (o = {}) => {
    const r = o.reach || 0, fl = o.flail || 0, ph = o.phase || 0;
    A.sh.rotation.set(-1.9 * r + Math.sin(ph) * .5 * fl, 0, .25 + .5 * r * 0); B.sh.rotation.set(-1.35 * r + Math.sin(ph + 1.7) * .5 * fl, 0, -.25);
    A.el.rotation.x = -.35 * r - .2 * fl; B.el.rotation.x = -.5 * r - .2 * fl;
    L.hp.rotation.set(.2 * r + Math.sin(ph + .6) * .4 * fl, 0, .12); R.hp.rotation.set(-.15 * r + Math.sin(ph + 2.6) * .4 * fl, 0, -.12);
    L.kn.rotation.x = .35 * r + .3 * fl * (1 + Math.sin(ph)); R.kn.rotation.x = .5 * r + .3 * fl * (1 + Math.sin(ph + 2));
  };
  return root;
}
