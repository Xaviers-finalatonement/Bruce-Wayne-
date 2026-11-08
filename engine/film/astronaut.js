// EVA-suit astronaut (about 1 unit tall, feet at y~.07, +z front). Sculpted from lathes / extrusions / tubes (no capsule or sphere silhouettes):
// layered torso with chest control box, metal neck ring, bubble helmet with a gold reflective visor that mirrors the accretion disk, bellows joints,
// layered cuffs + gloves, boots, PLSS backpack with hoses. Fabric folds, seams and roughness variation come from a procedural bump/roughness map.
// Per-instance uniforms: stretch (spaghettification), tear, redshift, alpha, dark. Pose API unchanged: userData.pose({reach, flail, phase}).
import * as THREE from "three";
import { hash } from "./timing.js";

const V2 = (a) => a.map(p => new THREE.Vector2(p[0], p[1]));
// value noise, periodic in x (period px) so the texture tiles around the lathe seam
const vn = (x, y, px) => { const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi, sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy), h = (a, b) => hash((((a % px) + px) % px) * 31.7 + b * 17.3 + 5);
  return (h(xi, yi) * (1 - sx) + h(xi + 1, yi) * sx) * (1 - sy) + (h(xi, yi + 1) * (1 - sx) + h(xi + 1, yi + 1) * sx) * sy; };
let TEX = null;
function fabricTex() { // R = bump height (weave + folds + stitched seams), G = roughness multiplier (scuffs, smudges)
  if (TEX) return TEX;
  const W = 512, H = 512, c = document.createElement("canvas"); c.width = W; c.height = H; const x = c.getContext("2d"), im = x.createImageData(W, H), d = im.data, cl = v => Math.max(0, Math.min(255, v));
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    const k = (j * W + i) * 4, u = i / W, v = j / H, wv = ((i >> 1) + (j >> 1)) & 1 ? 7 : -7;
    const fold = Math.sin(v * 6.2832 * 7 + Math.sin(u * 6.2832 * 3) * 1.7 + vn(u * 4, v * 8, 4) * 3.2) * 26 + Math.sin(v * 6.2832 * 19 + Math.sin(u * 6.2832 * 5 + 1) * 1.3) * 9;
    let r = 128 + wv + fold + (hash(i * 7.1 + j * 13.7) - .5) * 16;
    const du = Math.min(u, Math.abs(u - .5), 1 - u); if (du < .005 && ((j >> 2) & 1)) r -= 38; if (du < .0016) r -= 34;           // stitched vertical seams
    const dv = Math.abs(v - .5); if (dv < .004) r -= 30;                                                                          // horizontal seam
    const g = 238 - vn(u * 6, v * 6, 6) * 60 - (hash(i * 3.3 + j * 1.9) > .994 ? 70 : 0) - Math.max(0, vn(u * 3, v * 3, 3) - .62) * 160;
    d[k] = cl(r); d[k + 1] = cl(g); d[k + 2] = 0; d[k + 3] = 255;
  }
  x.putImageData(im, 0, 0); TEX = new THREE.CanvasTexture(c); TEX.wrapS = TEX.wrapT = THREE.RepeatWrapping; TEX.anisotropy = 4; return TEX;
}

// ---------- geometry helpers ----------
function fixSeam(g, segs) { const n = g.attributes.normal, rows = n.count / (segs + 1); for (let j = 0; j < rows; j++) { const a = j * (segs + 1), b = a + segs; const x = n.getX(a) + n.getX(b), y = n.getY(a) + n.getY(b), z = n.getZ(a) + n.getZ(b), l = Math.hypot(x, y, z) || 1; n.setXYZ(a, x / l, y / l, z / l); n.setXYZ(b, x / l, y / l, z / l); } }
// lathe with radial fold displacement, non-uniform cross-section (sx, sz), uv tiling
function lathe(pts, o = {}) {
  if (pts[0][1] > pts[pts.length - 1][1]) pts = pts.slice().reverse(); // LatheGeometry faces outward only for ascending-y profiles
  const segs = o.segs || 40, g = new THREE.LatheGeometry(V2(pts), segs, o.phi0 || 0, o.phiLen || 6.2831853), p = g.attributes.position, amp = o.fold || 0, fy = o.fy || 40, sd = o.seed || 0;
  if (amp) for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), a = Math.atan2(x, z); const dd = amp * (Math.sin(y * fy + 1.8 * Math.sin(a * 2 + sd)) * .55 + (vn(a * 1.3 + 8, y * fy * .35 + sd, 64) - .5) * .9); p.setXYZ(i, x * (1 + dd), y, z * (1 + dd)); }
  g.scale(o.sx || 1, 1, o.sz || 1); g.computeVertexNormals(); if (!o.phiLen) fixSeam(g, segs);
  if (o.uv) { const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * o.uv[0], uv.getY(i) * o.uv[1]); }
  if (o.tx || o.ty || o.tz) g.translate(o.tx || 0, o.ty || 0, o.tz || 0);
  return g;
}
function rrect(w, h, r) { const s = new THREE.Shape(), x = -w / 2, y = -h / 2; s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h); s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r); s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y); return s; }
function ext(shape, depth, bev, o = {}) { const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: bev, bevelSize: bev, bevelSegments: 3, curveSegments: 10, steps: 1 }); g.translate(0, 0, -depth / 2); if (o.rx) g.rotateX(o.rx); if (o.ry) g.rotateY(o.ry); g.computeVertexNormals(); if (o.uv) { const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * o.uv, uv.getY(i) * o.uv); } return g; }
const tube = (pts, r, seg = 36) => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p))), seg, r, 8, false);
// bellows radius profile: r(y) with convolutions between y0..y1
const bellows = (y0, y1, r, n, amp, k = 24) => Array.from({ length: k + 1 }, (_, i) => { const t = i / k, y = y0 + (y1 - y0) * t; return [r * (1 + amp * Math.sin(t * n * 6.2832)) * (i === 0 || i === k ? .96 : 1), y]; });

// mitten glove silhouette (fingers toward -y), extruded; fingers curl toward +z
function gloveGeo() {
  const s = new THREE.Shape();
  s.moveTo(-.027, 0); s.lineTo(.027, 0); s.bezierCurveTo(.034, -.02, .036, -.05, .031, -.072);
  [[.031, .026], [.0095, .0225], [-.012, .0235], [-.031, .0215]].forEach(([x0, w], i) => { /* four finger lobes along the tip */ });
  s.bezierCurveTo(.029, -.088, .02, -.098, .012, -.1); s.bezierCurveTo(.004, -.106, -.006, -.106, -.012, -.1); s.bezierCurveTo(-.02, -.098, -.03, -.088, -.032, -.07);
  s.bezierCurveTo(-.036, -.05, -.034, -.02, -.027, 0);
  const g = new THREE.ExtrudeGeometry(s, { depth: .028, bevelEnabled: true, bevelThickness: .011, bevelSize: .0085, bevelSegments: 4, curveSegments: 14 });
  g.translate(0, 0, -.014); const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i); if (y < -.045) p.setZ(i, p.getZ(i) + Math.pow((-y - .045) / .06, 2) * .03); } // finger curl
  g.rotateY(-Math.PI / 2); g.computeVertexNormals(); return g;
}
function thumbGeo() { const s = new THREE.Shape(); s.moveTo(-.012, 0); s.lineTo(.012, 0); s.bezierCurveTo(.015, -.02, .013, -.04, .006, -.052); s.bezierCurveTo(.0, -.058, -.008, -.054, -.012, -.044); s.bezierCurveTo(-.016, -.03, -.014, -.012, -.012, 0);
  const g = new THREE.ExtrudeGeometry(s, { depth: .014, bevelEnabled: true, bevelThickness: .008, bevelSize: .006, bevelSegments: 3, curveSegments: 10 }); g.translate(0, 0, -.007); g.computeVertexNormals(); return g; }
// boot in side profile (y up, z forward), extruded across x
function bootGeo() {
  const s = new THREE.Shape(); s.moveTo(-.052, .06); s.lineTo(-.052, -.005); s.bezierCurveTo(-.056, -.03, -.05, -.06, -.04, -.062); s.lineTo(.085, -.062); s.bezierCurveTo(.118, -.058, .126, -.04, .118, -.028);
  s.bezierCurveTo(.108, -.006, .082, -.002, .062, .006); s.bezierCurveTo(.05, .02, .045, .04, .05, .06); s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: .052, bevelEnabled: true, bevelThickness: .014, bevelSize: .012, bevelSegments: 4, curveSegments: 16 }); g.translate(0, 0, -.026); g.rotateY(-Math.PI / 2); g.computeVertexNormals(); return g;
}
function soleGeo() { const s = new THREE.Shape(); s.moveTo(-.058, -.058); s.lineTo(-.058, -.07); s.lineTo(.12, -.07); s.bezierCurveTo(.136, -.066, .138, -.05, .128, -.044); s.lineTo(-.05, -.044); s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: .068, bevelEnabled: true, bevelThickness: .008, bevelSize: .007, bevelSegments: 2 }); g.translate(0, 0, -.034); g.rotateY(-Math.PI / 2); g.computeVertexNormals(); return g; }

// ---------- the suit ----------
export function makeAstronaut(envMap) {
  const root = new THREE.Group(), U = { uRoot: { value: new THREE.Matrix4() }, uRootInv: { value: new THREE.Matrix4() }, uK: { value: 0 }, uGap: { value: 0 }, uTearY: { value: .5 }, uRed: { value: 0 }, uAlpha: { value: 1 }, uDark: { value: 0 } };
  const tex = fabricTex();
  const mk = (color, rough, metal, envI, o = {}) => {
    const m = new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal, envMap, envMapIntensity: envI, transparent: true });
    if (o.bump) { m.bumpMap = tex; m.bumpScale = o.bump; m.roughnessMap = tex; }
    const extra = o.visor ? `
         vec3 rv = reflect(-normalize(vViewPosition), normal);
         float hh = rv.y + 0.06 - 0.22 * rv.x * rv.x - 0.10 * rv.x;
         float core = exp(-pow(hh * 9.0, 2.0)), glow = exp(-pow(hh * 2.6, 2.0));
         float side = smoothstep(-0.55, 0.75, rv.x);
         vec3 disc = vec3(1.0, .52, .15) * glow * (.55 + 1.6 * side) + vec3(1.0, .88, .62) * core * (1.2 + 4.0 * side);
         disc += vec3(.55, .42, 1.0) * smoothstep(.15, .85, rv.y) * .45 * (1.0 - side * .5);
         float fres = pow(1.0 - clamp(dot(normal, normalize(vViewPosition)), 0.0, 1.0), 2.2);
         gl_FragColor.rgb += disc * vec3(1.0, .84, .52) * (0.8 + 1.4 * fres) + vec3(1.0, .7, .3) * fres * .35;` : "";
    m.customProgramCacheKey = () => "astro-" + (o.visor ? "v" : "s");
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
         ${extra}
         float lum = dot(gl_FragColor.rgb, vec3(.3, .55, .15));
         gl_FragColor.rgb = mix(gl_FragColor.rgb, lum * vec3(1.0, .20, .06) * 1.3, uRed) * (1.0 - .6 * uRed);
         gl_FragColor.rgb *= (1.0 - uDark);
         gl_FragColor.a *= uAlpha;`);
    };
    return m;
  };
  const suit = mk(0xdcd9e6, .66, .03, .28, { bump: 2.6 }), suit2 = mk(0xc9c5d6, .72, .03, .25, { bump: 3.4 }), glove = mk(0x2f2d3b, .9, .05, .15, { bump: 2.2 }), dark = mk(0x1a1824, .55, .35, .25),
    trim = mk(0x9c99b4, .3, .85, 1.1, { bump: .8 }), visor = mk(0xd2a24a, .06, 1, 1.9, { visor: true }), frame = mk(0x15131d, .35, .6, .5), stripe = mk(0xff7a22, .55, .05, .2), lamp = mk(0xfff3d8, .3, .1, .4),
    panel = mk(0x3b384c, .5, .4, .5), hose = mk(0x585568, .6, .2, .4, { bump: 3 }), screen = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.0, .52, .16).multiplyScalar(1.6) });
  const add = (parent, geo, m, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) => { const me = new THREE.Mesh(geo, m); me.position.set(x, y, z); me.rotation.set(rx, ry, rz); parent.add(me); return me; };
  const J = (parent, x, y, z) => { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); return g; };
  const body = J(root, 0, 0, 0);

  // --- torso: chest, waist ring, brief; shoulders; neck ring ---
  add(body, lathe([[.001, .495], [.066, .5], [.076, .53], [.074, .575], [.082, .63], [.096, .69], [.104, .74], [.098, .79], [.082, .82], [.06, .835], [.056, .846], [.001, .846]], { segs: 56, sx: 1.2, sz: .8, fold: .014, fy: 55, uv: [1, 1.3] }), suit);
  add(body, lathe([[.07, .5], [.086, .505], [.09, .525], [.09, .545], [.077, .552]], { segs: 48, sx: 1.2, sz: .84 }), trim);                       // waist bearing ring
  add(body, lathe([[.062, .525], [.07, .52], [.086, .5], [.095, .47], [.092, .445], [.05, .44]], { segs: 48, sx: 1.2, sz: .86, fold: .02, fy: 40, uv: [1, .6] }), suit2); // brief
  add(body, lathe([[.052, .826], [.07, .83], [.074, .843], [.068, .858], [.056, .86], [.054, .846]], { segs: 48 }), trim);                          // neck ring (metal)
  add(body, lathe([[.059, .858], [.062, .864], [.057, .87]], { segs: 48 }), stripe);
  // chest control box + switches + display + hose ports
  const cb = J(body, 0, .742, .094);
  add(cb, ext(rrect(.118, .074, .012), .02, .006, { uv: 1 }), panel); add(cb, ext(rrect(.092, .018, .004), .004, .002), screen, -.006, .022, .014);
  [[-.04, -.01], [-.014, -.01], [.012, -.01], [.038, -.01]].forEach(([x, y], i) => { add(cb, new THREE.CylinderGeometry(.0065, .0075, .014, 12), i % 2 ? trim : stripe, x, y - .006, .018, Math.PI / 2); });
  [[-.034, -.03], [-.006, -.03], [.022, -.03]].forEach(([x, y]) => add(cb, new THREE.BoxGeometry(.016, .007, .01), dark, x, y, .016));
  add(cb, new THREE.CylinderGeometry(.011, .011, .016, 16), trim, -.074, 0, .006, 0, 0, Math.PI / 2); add(cb, new THREE.CylinderGeometry(.011, .011, .016, 16), trim, .074, 0, .006, 0, 0, Math.PI / 2);
  add(body, ext(rrect(.05, .02, .006), .008, .003), dark, .05, .66, .088); // small patch
  // --- backpack (PLSS) + tanks + hoses ---
  const bp = J(body, 0, .705, -.1);
  add(bp, ext(rrect(.178, .232, .026), .07, .014, { uv: 1 }), suit2, 0, 0, -.012); add(bp, ext(rrect(.15, .05, .016), .05, .01), panel, 0, .095, -.052);
  add(bp, ext(rrect(.13, .06, .012), .02, .006), dark, 0, -.045, -.05); add(bp, ext(rrect(.06, .008, .003), .004, .002), stripe, 0, .004, -.056);
  [-.05, .05].forEach(x => { add(bp, lathe([[.001, -.11], [.018, -.105], [.02, -.09], [.02, .06], [.017, .085], [.008, .095], [.001, .098]], { segs: 20 }), trim, x, -.09, -.052); });
  add(bp, new THREE.CylinderGeometry(.016, .016, .05, 14), dark, -.07, .14, -.01, 0, 0, Math.PI / 2); add(bp, new THREE.CylinderGeometry(.016, .016, .05, 14), dark, .07, .14, -.01, 0, 0, Math.PI / 2);
  [-1, 1].forEach(s => {
    add(body, tube([[s * .048, .742, .106], [s * .078, .73, .112], [s * .112, .715, .075], [s * .122, .712, .0], [s * .108, .708, -.07], [s * .09, .7, -.108]], .0075, 40), hose);
    add(body, tube([[s * .06, .812, -.104], [s * .075, .865, -.06], [s * .05, .92, -.07], [s * .03, .936, -.09]], .0062, 30), hose);
  });
  // --- head: helmet shell, visor frame + gold visor, comm caps, lamp, neck dam ---
  const head = J(body, 0, .905, 0), R = .106, hy = .036;
  const hp = (a0, a1, k, n = 22) => Array.from({ length: n + 1 }, (_, i) => { const a = a0 + (a1 - a0) * i / n; return [R * k * Math.sin(a) * (1 + .05 * Math.pow(Math.max(0, Math.cos(a)), 2)), hy + R * 1.07 * k * Math.cos(a)]; });
  add(head, lathe(hp(.001, 2.62, 1), { segs: 56, sz: .96, fold: .004, fy: 30, uv: [1, .7] }), suit);
  add(head, lathe(hp(.5, 2.1, 1.026, 16), { segs: 40, phi0: -1.12, phiLen: 2.24, sz: .96 }), frame);
  add(head, lathe(hp(.58, 2.0, 1.05, 16), { segs: 40, phi0: -1.0, phiLen: 2.0, sz: .96 }), visor);
  add(head, lathe([[.0, -.07], [.066, -.07], [.07, -.052], [.064, -.04]].map(p => [p[0], p[1] + hy * .2 + .0]), { segs: 40 }), trim, 0, -.012, 0);
  [-1, 1].forEach(s => { add(head, new THREE.CylinderGeometry(.015, .016, .012, 18), trim, s * (R * .97), hy - .006, -.004, 0, 0, Math.PI / 2); });
  add(head, ext(rrect(.05, .02, .006), .022, .005), dark, .052, hy + R * 1.0, .035, -.55, .4, 0); add(head, new THREE.CylinderGeometry(.007, .007, .004, 12), lamp, .052, hy + R * 1.0 + .013, .047, -.55, .4, 0);
  add(head, ext(rrect(.09, .016, .006), .01, .003), stripe, 0, hy + R * 1.05, -.03, 1.1, 0, 0);
  // --- arms: shoulder bearing, bellows upper arm, elbow, forearm, cuff, glove ---
  const arm = side => {
    const sh = J(body, side * .138, .778, 0);
    add(sh, lathe([[.001, .045], [.032, .04], [.05, .022], [.056, .0], [.056, -.04]], { segs: 32, fold: .01, fy: 44, uv: [1, .6] }), suit);                                                  // shoulder yoke
    add(sh, lathe([[.054, -.014], [.062, -.018], [.062, -.032], [.054, -.036]], { segs: 36 }), trim); add(sh, lathe([[.058, -.036], [.064, -.04], [.064, -.047], [.058, -.05]], { segs: 36 }), stripe);
    const up = J(sh, 0, 0, 0);
    add(up, lathe([[.054, -.05], [.05, -.08], [.046, -.11], [.042, -.135], [.04, -.148]], { segs: 32, fold: .03, fy: 60, seed: 1 + side, uv: [1, .45] }), suit2);
    const el = J(up, 0, -.15, 0);
    add(el, lathe(bellows(.012, -.026, .041, 2.5, .09, 20), { segs: 28, uv: [1, .4] }), dark);                                                                                      // elbow bellows
    add(el, lathe([[.04, -.024], [.038, -.05], [.036, -.08], [.0335, -.108], [.032, -.122]], { segs: 32, fold: .028, fy: 55, seed: 3 + side, uv: [1, .45] }), suit);                                // forearm
    add(el, lathe([[.0345, -.118], [.043, -.121], [.045, -.126], [.045, -.137], [.0425, -.141], [.0345, -.143]], { segs: 36 }), trim);                                                       // wrist ring
    add(el, lathe([[.038, -.136], [.0345, -.15], [.031, -.164]], { segs: 32, fold: .03, fy: 70, uv: [1, .4] }), glove);                                                                  // glove over-cuff
    const hand = J(el, 0, -.152, 0);
    add(hand, gloveGeo(), glove, 0, -.004, 0, 0, 0, 0); add(hand, thumbGeo(), glove, side > 0 ? 0 : 0, -.016, .03, .35, 0, .5 * side);
    add(hand, ext(rrect(.03, .02, .006), .004, .002), stripe, 0, -.054, .0, 0, 0, 0).visible = false;
    return { sh, el, hand };
  };
  // --- legs ---
  const leg = side => {
    const hp_ = J(body, side * .056, .52, 0), th = J(hp_, 0, 0, 0);
    add(th, lathe([[.052, .03], [.058, .0], [.056, -.05], [.05, -.11], [.046, -.16], [.044, -.188]], { segs: 36, fold: .024, fy: 50, seed: 5 + side, uv: [1, .45] }), suit2);
    const kn = J(th, 0, -.2, 0);
    add(kn, lathe(bellows(.014, -.03, .047, 3, .1, 22), { segs: 28, uv: [1, .4] }), dark);
    add(kn, lathe([[.044, -.028], [.043, -.06], [.04, -.1], [.037, -.145], [.036, -.17]], { segs: 36, fold: .024, fy: 55, seed: 9 + side, uv: [1, .45] }), suit);
    add(kn, lathe([[.0345, -.16], [.042, -.163], [.045, -.168], [.045, -.18], [.04, -.184]], { segs: 36 }), trim);
    add(kn, lathe([[.0, -.002], [.048, .0], [.052, -.012], [.046, -.026], [.0, -.03]].map(p => [p[0], p[1]]), { segs: 24, sz: .6, tz: .012, ty: .0 }), suit);                              // knee pad
    const ft = J(kn, 0, -.2, 0);
    add(ft, bootGeo(), suit2, 0, 0, 0); add(ft, soleGeo(), dark, 0, 0, 0); add(ft, lathe([[.04, .06], [.046, .052], [.05, .035], [.044, .018]], { segs: 32, fold: .02, fy: 70 }), glove, 0, .0, 0);
    return { hp: hp_, kn, ft };
  };
  const A = arm(-1), B = arm(1), L = leg(-1), R_ = leg(1);
  root.userData = { U, body, head, armL: A, armR: B, legL: L, legR: R_ };
  root.userData.update = () => { root.updateMatrixWorld(true); U.uRoot.value.copy(root.matrixWorld); U.uRootInv.value.copy(root.matrixWorld).invert(); };
  // pose: reach in [0,1] (arms up/forward), spread (legs), tumble flail amplitude
  root.userData.pose = (o = {}) => {
    const r = o.reach || 0, fl = o.flail || 0, ph = o.phase || 0;
    A.sh.rotation.set(-1.9 * r + Math.sin(ph) * .5 * fl, 0, .25 + .5 * r * 0); B.sh.rotation.set(-1.35 * r + Math.sin(ph + 1.7) * .5 * fl, 0, -.25);
    A.el.rotation.x = -.35 * r - .2 * fl; B.el.rotation.x = -.5 * r - .2 * fl;
    L.hp.rotation.set(.2 * r + Math.sin(ph + .6) * .4 * fl, 0, .12); R_.hp.rotation.set(-.15 * r + Math.sin(ph + 2.6) * .4 * fl, 0, -.12);
    L.kn.rotation.x = .35 * r + .3 * fl * (1 + Math.sin(ph)); R_.kn.rotation.x = .5 * r + .3 * fl * (1 + Math.sin(ph + 2));
  };
  return root;
}
