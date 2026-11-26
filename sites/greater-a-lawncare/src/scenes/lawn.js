// "The block of yard": a real-time 3D slab of Macon lawn (thousands of grass
// blades on thatch, topsoil and red Georgia clay, beside a concrete sidewalk).
// Variants, picked by data-surface on the stage:
//   mow    - a push mower lays down stripes (scroll story or auto loop), an
//            edger cuts the overgrowth back off the sidewalk. Pointer mows.
//   leaves - autumn leaves on a mown lawn; a blower clears them. Pointer gusts.
//   straw  - a planting bed around boxwoods fills with pine straw. Pointer drops straw.
import { createStage, THREE, clamp, lerp, smoothstep, damp, scrollProgress } from '../lib/stage.js';
import { surfaceMaps, softDot, fbm } from '../lib/textures.js';

const W = 4.2, H = 2.8, DEPTH = 0.62, WALK = 0.72;
const TALL = 0.34, SHORT = 0.105;
const BED_Z = -0.12; // straw variant: bed is z < BED_Z

const CAMS = {
  story: [
    { p: [3.5, 2.7, 5.3], t: [0, 0.05, 0.35], fit: 2.95 },
    { p: [-1.75, 0.42, 2.45], t: [-0.75, 0.16, 0.55], fit: 0.95 },
    { p: [3.3, 2.5, 4.6], t: [0, 0, 0.2], fit: 2.55 },
    { p: [1.9, 0.95, 3.35], t: [0.35, 0.02, 1.42], fit: 1.05 },
    { p: [0.15, 7.2, 2.4], t: [0, 0, 0.35], fit: 3.4 },
  ],
  mow: [{ p: [3.1, 2.5, 5.1], t: [0, 0, 0.35], fit: 2.85 }],
  leaves: [{ p: [2.9, 2.7, 4.7], t: [0, 0, 0.3], fit: 2.85 }],
  straw: [{ p: [2.4, 2.6, 4.9], t: [0, 0, 0.05], fit: 2.85 }],
};

// ---------------------------------------------------------------- textures
function canvasTex(w, h, fn, srgb = true) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const ctx = c.getContext('2d'); const img = ctx.createImageData(w, h);
  const hc = document.createElement('canvas'); hc.width = w; hc.height = h;
  const hctx = hc.getContext('2d'); const himg = hctx.createImageData(w, h);
  for (let y = 0, i = 0; y < h; y++) for (let x = 0; x < w; x++, i += 4) {
    const p = fn(x / w, y / h, x, y);
    img.data[i] = clamp(p[0]) * 255; img.data[i + 1] = clamp(p[1]) * 255; img.data[i + 2] = clamp(p[2]) * 255; img.data[i + 3] = 255;
    himg.data[i] = himg.data[i + 1] = himg.data[i + 2] = clamp(p[3]) * 255; himg.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0); hctx.putImageData(himg, 0, 0);
  const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  return { map: t, bumpMap: new THREE.CanvasTexture(hc) };
}

// Cross-section of a Georgia yard: grass roots and thatch, dark topsoil, then red clay.
function soilSection(u, v, x, y) {
  const n = fbm(u * 18, v * 6, 4, 4), sp = fbm(u * 90, v * 40, 9, 2);
  if (v < 0.07) { const g = 0.6 + n * 0.5; return [0.22 * g, 0.24 * g, 0.1 * g, 0.7 + sp * 0.3]; }
  const top = 0.07 + fbm(u * 6, 1, 3, 3) * 0.12 + 0.18;
  // roots: wavy thin lines dropping from the turf
  const ru = u * 46 + fbm(u * 8, v * 3, 2, 3) * 3;
  const root = Math.exp(-(((ru - Math.round(ru)) / 0.05) ** 2)) * smoothstep(top + 0.25, 0.08, v) * 0.9;
  if (v < top) {
    const d = 0.75 + n * 0.45 + (sp - 0.5) * 0.3;
    const c = [0.2 * d, 0.14 * d, 0.09 * d];
    return [lerp(c[0], 0.62, root * 0.6), lerp(c[1], 0.52, root * 0.6), lerp(c[2], 0.36, root * 0.6), 0.45 + n * 0.3 + root * 0.25];
  }
  const blend = smoothstep(top, top + 0.06, v);
  const m = fbm(u * 10, v * 7, 12, 5), pebble = fbm(u * 70, v * 50, 31, 2) > 0.72 ? 1 : 0;
  let r = 0.6 + (m - 0.5) * 0.28, g = 0.25 + (m - 0.5) * 0.12, b = 0.13 + (m - 0.5) * 0.06;
  if (pebble) { r = 0.72; g = 0.58; b = 0.45; }
  r = lerp(0.2, r, blend); g = lerp(0.14, g, blend); b = lerp(0.09, b, blend);
  return [lerp(r, 0.62, root * 0.4), lerp(g, 0.5, root * 0.4), lerp(b, 0.34, root * 0.4), 0.35 + m * 0.4 + pebble * 0.3 + sp * 0.15];
}
function turf(u, v) {
  const n = fbm(u * 30, v * 20, 6, 4), d = fbm(u * 140, v * 95, 2, 2);
  const g = 0.55 + n * 0.5;
  return [0.1 * g + d * 0.05, 0.17 * g + d * 0.05, 0.05 * g, n * 0.6 + d * 0.4];
}
function bedSoil(u, v) {
  const n = fbm(u * 26, v * 14, 14, 5), d = fbm(u * 120, v * 70, 5, 2);
  const g = 0.65 + n * 0.5;
  return [0.17 * g, 0.11 * g, 0.07 * g, n * 0.7 + d * 0.3];
}

// --------------------------------------------------------------- the grass
function tuftGeometry(seed) {
  const pos = [], idx = [];
  const rnd = (k) => { const s = Math.sin(seed * 91.7 + k * 47.3) * 43758.5; return s - Math.floor(s); };
  const blades = 3, seg = 3;
  for (let b = 0; b < blades; b++) {
    const ang = (b / blades) * Math.PI * 2 + rnd(b) * 1.4;
    const ca = Math.cos(ang), sa = Math.sin(ang);
    const lean = 0.1 + rnd(b + 7) * 0.16, w = 0.017 + rnd(b + 3) * 0.008, hb = 0.72 + rnd(b + 11) * 0.28;
    const base = pos.length / 3;
    for (let s = 0; s <= seg; s++) {
      const t = s / seg, half = (w * (1 - t * 0.88)) / 2;
      const cx = ca * (0.006 + lean * t * t), cz = sa * (0.006 + lean * t * t);
      pos.push(cx - sa * half, t * hb, cz + ca * half, cx + sa * half, t * hb, cz - ca * half);
    }
    for (let s = 0; s < seg; s++) { const a = base + s * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

function buildGrass(stage, maskTex, inLawn, overgrowth) {
  const count = Math.round((stage.coarse ? 3000 : 5600) * (inLawn.share ?? 1));
  const over = overgrowth ? Math.round(count * 0.06) : 0;
  const total = count + over;
  const geo = tuftGeometry(3);
  const aUv = new Float32Array(total * 2), aRnd = new Float32Array(total * 4), aOver = new Float32Array(total);
  const mesh = new THREE.InstancedMesh(geo, new THREE.MeshBasicMaterial(), total);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3(1, 1, 1), p = new THREE.Vector3();
  let i = 0, guard = 0;
  for (let k = 0; k < over; k++, i++) {
    // runners creeping over the sidewalk: lean towards the street
    const x = (Math.random() - 0.5) * W * 0.99, z = H / 2 - 0.02 + Math.random() ** 1.7 * 0.26;
    e.set(0, -Math.PI / 2 + (Math.random() - 0.5) * 0.8, 0); q.setFromEuler(e); p.set(x, 0, z);
    m.compose(p, q, s); mesh.setMatrixAt(i, m);
    aUv[i * 2] = x / W + 0.5; aUv[i * 2 + 1] = 0;
    aRnd.set([0.7 + Math.random() * 0.5, Math.random(), 2.2 + Math.random() * 1.6, Math.random()], i * 4);
    aOver[i] = 1;
  }
  while (i < total && guard++ < count * 6) {
    const x = (Math.random() - 0.5) * W * 0.995, z = (Math.random() - 0.5) * H * 0.995;
    if (!inLawn(x, z)) continue;
    e.set(0, Math.random() * Math.PI * 2, 0); q.setFromEuler(e); p.set(x, 0, z);
    m.compose(p, q, s); mesh.setMatrixAt(i, m);
    aUv[i * 2] = x / W + 0.5; aUv[i * 2 + 1] = 1 - (z / H + 0.5);
    aRnd.set([0.78 + Math.random() * 0.4, Math.random(), 0.6 + Math.random() * 0.8, Math.random()], i * 4);
    i++;
  }
  mesh.count = i;
  geo.setAttribute('aUv', new THREE.InstancedBufferAttribute(aUv, 2));
  geo.setAttribute('aRnd', new THREE.InstancedBufferAttribute(aRnd, 4));
  geo.setAttribute('aOver', new THREE.InstancedBufferAttribute(aOver, 1));

  const uniforms = {
    uMask: { value: maskTex }, uTime: { value: 0 }, uEdge: { value: 0 },
    uTall: { value: TALL }, uShort: { value: SHORT },
  };
  const mat = new THREE.MeshStandardMaterial({ roughness: 0.82, metalness: 0, side: THREE.DoubleSide, envMapIntensity: 0.45 });
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, uniforms);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>
        uniform sampler2D uMask; uniform float uTime, uEdge, uTall, uShort;
        attribute vec2 aUv; attribute vec4 aRnd; attribute float aOver;
        varying float vT, vMown, vStripe, vHue;`)
      .replace('#include <beginnormal_vertex>', 'vec3 objectNormal = normalize(vec3(normal.x * 0.35, 1.0, normal.z * 0.35));')
      .replace('#include <begin_vertex>', `
        vec4 mk = texture2D(uMask, aUv);
        float mown = mix(mk.r, 0.0, aOver);
        float cut = aOver * smoothstep(aUv.x - 0.025, aUv.x + 0.005, uEdge);
        float h = mix(uTall, uShort, mown) * aRnd.x * (1.0 - cut);
        float t = position.y;
        vec3 transformed = position;
        transformed.y = t * h;
        transformed.xz *= mix(1.0, h / uTall * 1.6, t);
        float droop = mix(0.05 + 0.13 * aRnd.z, 0.015, mown) * (1.0 + aOver * 1.2);
        float sway = sin(uTime * 1.6 + aRnd.y * 6.283 + aUv.x * 4.0 + aUv.y * 3.0) * 0.022 * (1.0 - mown * 0.7);
        transformed.x += (droop + sway) * t * t;
        vT = t; vMown = mown; vStripe = mk.g; vHue = aRnd.w;`)
      .replace('#include <project_vertex>', `
        vec4 mvPosition = vec4(transformed, 1.0);
        #ifdef USE_INSTANCING
          mvPosition = instanceMatrix * mvPosition;
        #endif
        mvPosition.x += (mk.g * 2.0 - 1.0) * 0.05 * t * t * mown * (1.0 - aOver);
        mvPosition = modelViewMatrix * mvPosition;
        gl_Position = projectionMatrix * mvPosition;`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vT, vMown, vStripe, vHue;')
      .replace('#include <color_fragment>', `
        vec3 gBase = vec3(0.035, 0.085, 0.02);
        vec3 gTip = mix(vec3(0.2, 0.34, 0.06), vec3(0.3, 0.36, 0.09), vHue);
        vec3 gc = mix(gBase, gTip, smoothstep(0.0, 1.0, vT));
        gc = mix(gc, mix(gc * vec3(0.62, 0.66, 0.6), gc * vec3(1.55, 1.5, 1.15), vStripe), vMown);
        gc = mix(gc, gc * vec3(1.1, 1.06, 0.8), (1.0 - vMown) * vT * vHue * 0.6);
        diffuseColor.rgb = gc;`);
  };
  mat.customProgramCacheKey = () => 'lawn-grass-v2';
  mesh.material = mat;
  mesh.receiveShadow = true; mesh.frustumCulled = false;
  return { mesh, uniforms, full: i };
}

// ---------------------------------------------------------------- machines
function std(color, rough, metal = 0) { return new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal }); }
function part(g, geo, mat, x, y, z, rx = 0, ry = 0, rz = 0) {
  const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); m.castShadow = true; g.add(m); return m;
}

function buildMower() {
  const g = new THREE.Group();
  const paint = std(0xb9542e, 0.34, 0.25), black = std(0x17191a, 0.55, 0.2), rubber = std(0x1b1b1b, 0.92);
  const steel = std(0xc9ced3, 0.28, 1), bag = std(0x23402c, 0.95);
  const wheels = [];
  // deck: a round, slightly domed steel deck
  const deck = part(g, new THREE.CylinderGeometry(0.235, 0.255, 0.1, 40), paint, 0, 0.14, 0); deck.scale.set(1.12, 1, 1);
  part(g, new THREE.SphereGeometry(0.235, 40, 12, 0, Math.PI * 2, 0, Math.PI / 2), paint, 0, 0.18, 0).scale.set(1.12, 0.22, 1);
  part(g, new THREE.TorusGeometry(0.25, 0.012, 8, 48), black, 0, 0.092, 0, Math.PI / 2).scale.set(1.12, 1, 1);
  // engine
  part(g, new THREE.CylinderGeometry(0.105, 0.115, 0.12, 28), black, 0.02, 0.27, 0);
  part(g, new THREE.CylinderGeometry(0.09, 0.105, 0.04, 28), paint, 0.02, 0.35, 0);
  part(g, new THREE.CylinderGeometry(0.022, 0.022, 0.03, 14), black, -0.03, 0.385, 0.04);
  part(g, new THREE.BoxGeometry(0.07, 0.06, 0.09), black, 0.1, 0.3, -0.07);
  // wheels
  for (const [x, z] of [[0.2, 0.25], [0.2, -0.25], [-0.2, 0.25], [-0.2, -0.25]]) {
    const w = new THREE.Group(); w.position.set(x, 0.075, z); g.add(w);
    part(w, new THREE.CylinderGeometry(0.075, 0.075, 0.045, 24), rubber, 0, 0, 0, Math.PI / 2);
    part(w, new THREE.CylinderGeometry(0.04, 0.04, 0.05, 16), steel, 0, 0, 0, Math.PI / 2);
    for (let k = 0; k < 10; k++) part(w, new THREE.BoxGeometry(0.018, 0.012, 0.048), rubber, Math.cos(k * 0.628) * 0.075, Math.sin(k * 0.628) * 0.075, 0, 0, 0, k * 0.628);
    wheels.push(w);
  }
  // handle: two tubes up and back, a crossbar and the bail
  const tube = (len) => new THREE.CylinderGeometry(0.011, 0.011, len, 10);
  for (const z of [0.17, -0.17]) part(g, tube(0.78), steel, -0.43, 0.48, z, 0, 0, 0.9);
  part(g, tube(0.36), black, -0.73, 0.75, 0, Math.PI / 2);
  part(g, tube(0.3), steel, -0.69, 0.71, 0, Math.PI / 2);
  // grass bag
  const b = part(g, new THREE.BoxGeometry(0.3, 0.22, 0.3), bag, -0.37, 0.27, 0, 0, 0, 0.35);
  b.geometry.translate(0, 0, 0);
  return { g, wheels };
}

function buildEdger() {
  const g = new THREE.Group();
  const gold = std(0xe7b448, 0.38, 0.15), black = std(0x17191a, 0.55, 0.2), steel = std(0xc9ced3, 0.25, 1);
  part(g, new THREE.CylinderGeometry(0.014, 0.014, 1.05, 10), steel, -0.33, 0.5, 0, 0, 0, 0.68);
  part(g, new THREE.BoxGeometry(0.16, 0.12, 0.12), gold, -0.66, 0.92, 0);
  part(g, new THREE.CylinderGeometry(0.04, 0.04, 0.12, 14), black, -0.62, 0.98, 0, Math.PI / 2);
  part(g, new THREE.CylinderGeometry(0.012, 0.012, 0.32, 8), black, -0.5, 0.78, 0, Math.PI / 2);
  const guard = part(g, new THREE.CylinderGeometry(0.1, 0.1, 0.04, 24, 1, true, 0, Math.PI), gold, 0, 0.1, 0, Math.PI / 2, 0, 0);
  guard.material = guard.material.clone(); guard.material.side = THREE.DoubleSide;
  const blade = part(g, new THREE.CylinderGeometry(0.085, 0.085, 0.006, 24), steel, 0, 0.09, 0, Math.PI / 2);
  part(g, new THREE.CylinderGeometry(0.045, 0.045, 0.03, 16), black, -0.12, 0.045, 0.07, Math.PI / 2);
  return { g, blade };
}

function buildBlower() {
  const g = new THREE.Group();
  const gold = std(0xe7b448, 0.38, 0.15), black = std(0x17191a, 0.55, 0.2);
  part(g, new THREE.BoxGeometry(0.2, 0.16, 0.12), gold, 0, 0, 0);
  part(g, new THREE.CylinderGeometry(0.07, 0.07, 0.13, 20), black, -0.02, 0, 0, Math.PI / 2);
  part(g, new THREE.CylinderGeometry(0.03, 0.04, 0.55, 16), black, 0.33, -0.06, 0, 0, 0, Math.PI / 2 + 0.25);
  part(g, new THREE.TorusGeometry(0.05, 0.012, 8, 20, Math.PI), black, 0, 0.11, 0);
  return g;
}

// ------------------------------------------------------------ the scene
export function mount(el) {
  const canvas = el.querySelector('canvas');
  const kind = ['mow', 'leaves', 'straw'].includes(el.dataset.surface) ? el.dataset.surface : 'mow';
  const mode = el.dataset.mode === 'scroll' ? 'scroll' : 'auto';
  const track = mode === 'scroll' ? document.querySelector(el.dataset.track) : null;
  const cams = mode === 'scroll' ? CAMS.story : CAMS[kind];

  let stage;
  try { stage = createStage(el, canvas, { exposure: 1.1 }); } catch (e) { return; }
  const { scene, camera, renderer } = stage;
  const aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const small = Math.min(innerWidth, innerHeight) < 600;

  const group = new THREE.Group();
  group.rotation.y = -0.38;
  scene.add(group);

  // ---- the block: soil body, turf, sidewalk ------------------------------
  const soil = canvasTex(small ? 384 : 640, small ? 96 : 160, soilSection);
  [soil.map, soil.bumpMap].forEach((t) => { t.anisotropy = aniso; });
  const soilMat = new THREE.MeshStandardMaterial({ map: soil.map, bumpMap: soil.bumpMap, bumpScale: 2.2, roughness: 0.96 });
  const soilSide = soilMat.clone(); soilSide.map = soil.map.clone(); soilSide.bumpMap = soil.bumpMap.clone();
  soilSide.map.wrapS = soilSide.bumpMap.wrapS = THREE.RepeatWrapping; soilSide.map.repeat.set(H / W, 1); soilSide.bumpMap.repeat.set(H / W, 1);
  soilSide.map.needsUpdate = soilSide.bumpMap.needsUpdate = true;
  const hidden = std(0x2a1d12, 1);
  const body = new THREE.Mesh(new THREE.BoxGeometry(W, DEPTH, H), [soilSide, soilSide, hidden, hidden, soilMat, soilMat]);
  body.position.y = -DEPTH / 2 - 0.001; body.castShadow = body.receiveShadow = true; group.add(body);

  const turfT = canvasTex(small ? 256 : 512, small ? 171 : 341, turf);
  const lawnTop = new THREE.Mesh(new THREE.PlaneGeometry(W, H), new THREE.MeshStandardMaterial({ map: turfT.map, bumpMap: turfT.bumpMap, bumpScale: 3, roughness: 0.95 }));
  lawnTop.rotation.x = -Math.PI / 2; lawnTop.receiveShadow = true; group.add(lawnTop);

  // sidewalk slab along the front edge, with the hairline groove an edger leaves
  const walkMaps = surfaceMaps(THREE, 'concrete', W / WALK, aniso);
  const walkTop = new THREE.MeshStandardMaterial({ map: walkMaps.map, bumpMap: walkMaps.bumpMap, bumpScale: 1, roughness: 0.9 });
  const walkSide = std(0xa7a39b, 0.95);
  const walk = new THREE.Mesh(new THREE.BoxGeometry(W, DEPTH * 0.55, WALK), [walkSide, walkSide, walkTop, walkSide, walkSide, walkSide]);
  walk.position.set(0, -DEPTH * 0.275 + 0.012, H / 2 + WALK / 2 + 0.004); walk.castShadow = walk.receiveShadow = true; group.add(walk);
  const under = new THREE.Mesh(new THREE.BoxGeometry(W, DEPTH * 0.45, WALK), soilMat);
  under.position.set(0, -DEPTH * 0.775, H / 2 + WALK / 2 + 0.004); under.receiveShadow = true; group.add(under);
  const groove = new THREE.Mesh(new THREE.BoxGeometry(W, 0.02, 0.028), std(0x1d140c, 1));
  groove.position.set(0, -0.006, H / 2 - 0.006); group.add(groove);

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.ShadowMaterial({ opacity: 0.18 }));
  ground.rotation.x = -Math.PI / 2; ground.position.y = -DEPTH - 0.25; ground.receiveShadow = true; scene.add(ground);

  // ---- mow mask: red = mown, green = stripe direction ------------------------
  const mw = 256, mh = Math.round(256 * (H / W));
  const mcan = document.createElement('canvas'); mcan.width = mw; mcan.height = mh;
  const mctx = mcan.getContext('2d');
  const maskTex = new THREE.CanvasTexture(mcan);
  maskTex.minFilter = THREE.LinearFilter; maskTex.generateMipmaps = false;
  const rows = 6, rowH = mh / rows;

  // ---- grass -----------------------------------------------------------------
  const inLawn = kind === 'straw' ? Object.assign((x, z) => z > BED_Z + 0.03, { share: 0.55 }) : Object.assign(() => true, { share: 1 });
  const grass = buildGrass(stage, maskTex, inLawn, kind === 'mow');
  group.add(grass.mesh);
  if (kind !== 'mow') grass.uniforms.uEdge.value = 1.1;

  // ---- adaptive quality: slow GPU (old phone, software renderer) gets fewer
  // blades and no grass shadows instead of a stuttering scene -----------------
  let frames = 0, slowSum = 0, tier = 0, lastNow = 0;
  function realDt() {
    const now = performance.now(), d = lastNow ? Math.min(0.12, (now - lastNow) / 1000) : 0;
    lastNow = now;
    if (d > 0 && tier < 3) {
      frames++; slowSum += d;
      if (frames >= 8) {
        const avg = slowSum / frames;
        if (avg > 1 / 24) {
          tier = avg > 1 / 9 ? 3 : tier + 1;
          grass.mesh.count = Math.round(grass.full * (tier === 1 ? 0.55 : 0.35));
          grass.mesh.receiveShadow = false; grass.mesh.material.needsUpdate = true;
          if (tier === 3) { renderer.setPixelRatio(Math.min(renderer.getPixelRatio(), 0.7)); renderer.setSize(stage.size.w, stage.size.h, false); }
        } else tier = 3;
        frames = 0; slowSum = 0; el.dataset.tier = tier;
      }
    }
    return d;
  }
  canvas.addEventListener('pointerdown', () => { lastNow = 0; }, { passive: true });

  // ---- particles (clippings, dust) -------------------------------------------
  const PN = stage.reduced ? 0 : stage.coarse ? 90 : 170;
  const ppos = new Float32Array(PN * 3).fill(-99), pvel = new Float32Array(PN * 3), plife = new Float32Array(PN), pcol = new Float32Array(PN * 3);
  const pgeo = new THREE.BufferGeometry();
  pgeo.setAttribute('position', new THREE.BufferAttribute(ppos, 3));
  pgeo.setAttribute('color', new THREE.BufferAttribute(pcol, 3));
  const pts = new THREE.Points(pgeo, new THREE.PointsMaterial({ size: 0.05, map: softDot(THREE), transparent: true, depthWrite: false, vertexColors: true, opacity: 0.95 }));
  pts.frustumCulled = false; pts.renderOrder = 4; group.add(pts);
  let pNext = 0;
  function emit(x, y, z, vx, vy, vz, spread, col) {
    if (!PN) return;
    const i = pNext; pNext = (pNext + 1) % PN; const j = i * 3;
    ppos[j] = x; ppos[j + 1] = y; ppos[j + 2] = z;
    pvel[j] = vx + (Math.random() - 0.5) * spread; pvel[j + 1] = vy + Math.random() * spread; pvel[j + 2] = vz + (Math.random() - 0.5) * spread;
    plife[i] = 0.5 + Math.random() * 0.5;
    const c = col(); pcol[j] = c[0]; pcol[j + 1] = c[1]; pcol[j + 2] = c[2];
  }
  const clip = () => { const k = Math.random(); return [0.18 + k * 0.2, 0.42 + k * 0.2, 0.08 + k * 0.05]; };
  const dust = () => { const k = Math.random(); return [0.45 + k * 0.15, 0.28 + k * 0.1, 0.16]; };
  function stepParticles(dt) {
    for (let i = 0; i < PN; i++) {
      const j = i * 3;
      if (plife[i] <= 0) continue;
      plife[i] -= dt;
      if (plife[i] <= 0) { ppos[j + 1] = -99; continue; }
      pvel[j + 1] -= 3 * dt;
      ppos[j] += pvel[j] * dt; ppos[j + 1] += pvel[j + 1] * dt; ppos[j + 2] += pvel[j + 2] * dt;
      if (ppos[j + 1] < 0.04) { ppos[j + 1] = 0.04; pvel[j] *= 0.6; pvel[j + 2] *= 0.6; pvel[j + 1] = 0; }
    }
    if (PN) pgeo.attributes.position.needsUpdate = pgeo.attributes.color.needsUpdate = true;
  }

  // ---- pointer -----------------------------------------------------------------
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), local = new THREE.Vector3();
  let clock = 0, pointerAt = -10, pointerUV = [0.5, 0.5], pointerXZ = [0, 0], newStroke = true, touched = false;
  let strokes = [], strokePts = 0, maskDirty = true;
  const hint = el.querySelector('[data-hint]');
  const onHitFns = [];
  function onPointer(e) {
    if (e.pointerType === 'touch' && e.type === 'pointermove' && !e.isPrimary) return;
    const r = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -(((e.clientY - r.top) / r.height) * 2 - 1));
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObject(lawnTop, false)[0];
    if (!hit) { newStroke = true; return; }
    local.copy(hit.point); group.worldToLocal(local);
    pointerXZ = [local.x, local.z];
    pointerUV = [local.x / W + 0.5, local.z / H + 0.5];
    pointerAt = clock;
    onHitFns.forEach((f) => f(local.x, local.z));
    if (!touched) { touched = true; hint && hint.classList.add('is-done'); }
  }
  canvas.addEventListener('pointermove', onPointer, { passive: true });
  canvas.addEventListener('pointerdown', (e) => { newStroke = true; onPointer(e); }, { passive: true });
  canvas.addEventListener('pointerleave', () => { newStroke = true; }, { passive: true });

  // ---- camera ------------------------------------------------------------------
  const camPos = new THREE.Vector3(), camTgt = new THREE.Vector3(), a = new THREE.Vector3(), b = new THREE.Vector3();
  let layout = 'box', lastShift = -1, cFloat = 0;
  function applyOffset(force) {
    const { w, h } = stage.size;
    if (layout === 'side') { if (force) camera.setViewOffset(w, h, w * 0.16, 0, w, h); }
    else if (layout === 'bottom') {
      const shift = lerp(0.27, 0.15, clamp(cFloat));
      if (force || Math.abs(shift - lastShift) > 0.002) { lastShift = shift; camera.setViewOffset(w, h, 0, h * shift, w, h); }
    } else if (force) camera.clearViewOffset();
  }
  stage.onResize((size) => {
    layout = mode !== 'scroll' ? 'box' : window.innerWidth >= 1000 ? 'side' : 'bottom';
    camera.fov = size.aspect < 0.9 ? 42 : 32;
    applyOffset(true);
    camera.updateProjectionMatrix();
  });
  function camFor(c) {
    const n = cams.length;
    const seg = Math.min(Math.max(0, n - 2), Math.floor(c)), f = n > 1 ? smoothstep(0.08, 0.92, c - seg) : 0;
    const k0 = cams[seg], k1 = cams[Math.min(n - 1, seg + 1)];
    a.fromArray(k0.p).lerp(b.fromArray(k1.p), f);
    camTgt.fromArray(k0.t).lerp(b.fromArray(k1.t), f);
    const fit = lerp(k0.fit, k1.fit, f);
    const need = (fit * (layout === 'side' ? 1.5 : 1)) / (Math.tan((camera.fov * Math.PI) / 360) * stage.size.aspect);
    a.sub(camTgt);
    camPos.copy(camTgt).addScaledVector(a.normalize(), Math.max(a.length() || 1, need));
  }
  let yaw = 0, yawT = 0;
  canvas.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    const r = canvas.getBoundingClientRect();
    yawT = (((e.clientX - r.left) / r.width) - 0.5) * 0.14;
  }, { passive: true });

  // ===================================================================== MOW
  if (kind === 'mow') {
    const mower = buildMower(); group.add(mower.g);
    const edger = buildEdger(); group.add(edger.g); edger.g.visible = false;
    edger.g.rotation.y = 0; // travels along +x
    onHitFns.push((x, z) => {
      const px = (x / W + 0.5) * mw, py = (z / H + 0.5) * mh;
      if (newStroke || !strokes.length) { strokes.push([px, py]); newStroke = false; } else strokes[strokes.length - 1].push(px, py);
      strokePts++;
      if (strokePts > 600) { strokePts -= strokes[0].length / 2; strokes.shift(); }
      maskDirty = true;
    });
    let drawn = -1;
    function drawMask(p) {
      mctx.shadowBlur = 0; mctx.fillStyle = 'rgb(0,128,0)'; mctx.fillRect(0, 0, mw, mh);
      mctx.lineCap = 'round'; mctx.lineJoin = 'round'; mctx.lineWidth = rowH * 1.02;
      const t = p * rows, full = Math.min(rows, Math.floor(t + 1e-6));
      for (let k = 0; k < rows; k++) {
        const y = mh - (k + 0.5) * rowH; let x0, x1;
        if (k < full) { x0 = -30; x1 = mw + 30; }
        else if (k === full && t - full > 0.003) { const f = t - full; if (k % 2 === 0) { x0 = -30; x1 = f * mw; } else { x0 = mw + 30; x1 = (1 - f) * mw; } }
        else continue;
        mctx.strokeStyle = k % 2 === 0 ? 'rgb(255,255,0)' : 'rgb(255,0,0)';
        mctx.beginPath(); mctx.moveTo(x0, y); mctx.lineTo(x1, y); mctx.stroke();
      }
      mctx.lineWidth = rowH * 0.95; mctx.strokeStyle = 'rgb(255,200,0)';
      for (const s of strokes) {
        mctx.beginPath(); mctx.moveTo(s[0], s[1]);
        if (s.length === 2) mctx.lineTo(s[0] + 0.1, s[1]);
        for (let i = 2; i < s.length; i += 2) mctx.lineTo(s[i], s[i + 1]);
        mctx.stroke();
      }
      maskTex.needsUpdate = true; drawn = p; maskDirty = false;
    }
    function headUV(p) {
      const t = clamp(p) * rows, row = Math.min(rows - 1, Math.floor(t)), f = clamp(t - row);
      return [row % 2 === 0 ? f : 1 - f, 1 - (row + 0.5) / rows, row];
    }

    let mow = mode === 'auto' && stage.reduced ? 0.6 : 0, edge = 0, first = true, heading = 0, mowAmt = 0;
    const head = new THREE.Vector3(), tgt = new THREE.Vector3(), prev = new THREE.Vector3();
    const CYCLE = 17;
    stage.onFrame((fdt) => {
      const dt = fdt > 0 ? realDt() : 0;
      clock += dt; grass.uniforms.uTime.value = clock;
      let target = mow, eTarget = edge, active = false;
      if (mode === 'scroll' && track) {
        const p = scrollProgress(track);
        target = p < 0.3 ? 0 : p < 0.64 ? (p - 0.3) / 0.34 : 1;
        eTarget = smoothstep(0.66, 0.84, p);
        active = target > 0.003 && target < 0.997;
        cFloat = damp(cFloat, p * (cams.length - 1), 5, dt || 1);
      } else if (!stage.reduced) {
        const t = clock % CYCLE;
        if (t < 1.2) { target = 0; eTarget = 0; }
        else if (t < 11) { target = (t - 1.2) / 9.8; active = true; eTarget = 0; }
        else if (t < 14.4) { target = 1; eTarget = (t - 11.2) / 3; }
        else if (t < 15.6) { target = 1; eTarget = 1; }
        else { if (mow !== 0) { strokes = []; strokePts = 0; maskDirty = true; } target = 0; eTarget = 0; mow = 0; edge = 0; }
      }
      if (mode === 'auto') { mow = target; edge = clamp(eTarget); }
      else { mow = first ? target : damp(mow, target, 7, dt); edge = first ? eTarget : damp(edge, eTarget, 7, dt); }
      if (maskDirty || Math.abs(mow - drawn) > 0.0012) drawMask(mow);
      grass.uniforms.uEdge.value = edge * 1.05;

      const byPointer = clock - pointerAt < 1.1;
      const uv = byPointer ? [pointerUV[0], pointerUV[1], 0] : headUV(mow);
      tgt.set((uv[0] - 0.5) * W, 0, (uv[1] - 0.5) * H);
      prev.copy(head);
      if (first) head.copy(tgt); else head.lerp(tgt, 1 - Math.exp(-(byPointer ? 12 : 10) * dt));
      const mv = Math.hypot(head.x - prev.x, head.z - prev.z);
      if (byPointer && mv > 0.002) heading = Math.atan2(-(head.z - prev.z), head.x - prev.x);
      else if (!byPointer) heading = damp(heading, uv[2] % 2 === 0 ? 0 : Math.PI, 6, dt || 1);
      mower.g.position.copy(head);
      mower.g.rotation.y = byPointer ? damp(mower.g.rotation.y, heading, 10, dt || 1) : heading;
      mower.wheels.forEach((w) => { w.rotation.z -= mv / 0.075; });
      const mowing = (byPointer && mv > 0.001) || active;
      mowAmt = damp(mowAmt, mowing ? 1 : 0, 8, dt || 1);
      if (!stage.reduced && mowAmt > 0.3 && Math.random() < mowAmt * 0.9) {
        const s = Math.sin(mower.g.rotation.y), c = Math.cos(mower.g.rotation.y);
        emit(head.x - c * 0.05 - s * 0.26, 0.12, head.z + s * 0.05 - c * 0.26, -s * 0.9, 0.9, -c * 0.9, 0.7, clip);
      }
      mower.g.position.y = mowing && !stage.reduced ? Math.sin(clock * 38) * 0.003 : 0;

      // edger runs along the sidewalk while the overgrowth is trimmed back
      const edging = edge > 0.004 && edge < 0.996;
      edger.g.visible = edging;
      if (edging) {
        edger.g.position.set((edge * 1.05 - 0.5) * W, 0, H / 2 - 0.005);
        edger.blade.rotation.y += dt * 40;
        if (!stage.reduced) for (let k = 0; k < 2; k++) emit(edger.g.position.x, 0.06, H / 2, -0.6, 1, 0.5, 0.8, k ? dust : clip);
      }
      stepParticles(dt);
      if (!stage.reduced) group.position.y = Math.sin(clock * 0.6) * 0.025;
      yaw = damp(yaw, yawT, 3, dt || 1); group.rotation.y = -0.38 + yaw;
      applyOffset(false);
      camFor(mode === 'scroll' ? cFloat : 0);
      if (mode === 'auto' && !stage.reduced) camPos.x += Math.sin(clock * 0.22) * 0.3;
      camera.position.copy(camPos); camera.lookAt(camTgt);
      if (dt > 0) first = false;
    });
  }

  // ================================================================= LEAVES
  if (kind === 'leaves' || kind === 'straw') {
    // these lawns are already mown, striped and edged
    mctx.fillStyle = 'rgb(0,128,0)'; mctx.fillRect(0, 0, mw, mh);
    for (let k = 0; k < rows; k++) { mctx.fillStyle = k % 2 === 0 ? 'rgb(255,255,0)' : 'rgb(255,0,0)'; mctx.fillRect(0, k * rowH, mw, rowH + 0.5); }
    maskTex.needsUpdate = true;
  }

  if (kind === 'leaves') {
    const N = stage.coarse ? 200 : 340;
    const shape = new THREE.Shape();
    shape.moveTo(0, -0.05);
    shape.bezierCurveTo(0.035, -0.03, 0.045, 0.02, 0, 0.055);
    shape.bezierCurveTo(-0.045, 0.02, -0.035, -0.03, 0, -0.05);
    const lgeo = new THREE.ShapeGeometry(shape, 6);
    const lp = lgeo.attributes.position;
    for (let i = 0; i < lp.count; i++) lp.setZ(i, (lp.getX(i) ** 2) * 6 + Math.sin(lp.getY(i) * 30) * 0.002);
    lgeo.rotateX(-Math.PI / 2); lgeo.computeVertexNormals();
    const leaves = new THREE.InstancedMesh(lgeo, new THREE.MeshStandardMaterial({ roughness: 0.78, side: THREE.DoubleSide }), N);
    leaves.castShadow = true; leaves.receiveShadow = true; leaves.frustumCulled = false;
    const palette = ['#c4562a', '#d9862f', '#e2b03f', '#9c3d22', '#7a4a26', '#b9702c'].map((c) => new THREE.Color(c));
    const L = Array.from({ length: N }, (_, i) => ({
      x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, ry: Math.random() * 6.28, rx: 0, rz: 0, spin: 0, s: 1.2 + Math.random() * 0.8,
      rest: SHORT * 0.9 + (i / N) * 0.03, state: 'rest', alpha: 1,
    }));
    const place = (l, drop) => {
      l.x = (Math.random() - 0.5) * W * 0.96; l.z = (Math.random() - 0.5) * H * 0.96;
      l.y = drop ? 1.2 + Math.random() * 1.4 : l.rest; l.vx = l.vy = l.vz = 0; l.rx = (Math.random() - 0.5) * 0.4; l.rz = (Math.random() - 0.5) * 0.4;
      l.state = drop ? 'fall' : 'rest'; l.s = 1.2 + Math.random() * 0.8;
    };
    L.forEach((l, i) => { place(l, false); leaves.setColorAt(i, palette[i % palette.length].clone().offsetHSL(0, 0, (Math.random() - 0.5) * 0.08)); });
    group.add(leaves);
    const blower = buildBlower(); group.add(blower);
    const blowAt = (l, sx, sz, f) => { l.state = 'fly'; l.vx += sx * f; l.vz += sz * f; l.vy += 0.8 + Math.random() * 1.1; l.spin = (Math.random() - 0.5) * 14; };
    onHitFns.push((x, z) => {
      for (const l of L) {
        const dx = l.x - x, dz = l.z - z, d = Math.hypot(dx, dz);
        if (d < 0.38 && l.state !== 'gone') blowAt(l, dx / (d + 0.05), dz / (d + 0.05), 1.6 * (1 - d / 0.38) + 0.4);
      }
    });
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), sv = new THREE.Vector3(), pv = new THREE.Vector3();
    const CYCLE = 15; let lastPhase = 0;
    stage.onFrame((fdt) => {
      const dt = fdt > 0 ? realDt() : 0;
      clock += dt; grass.uniforms.uTime.value = clock;
      const t = stage.reduced ? 0 : clock % CYCLE;
      if (t < lastPhase) L.forEach((l) => { if (l.state === 'gone') place(l, true); });
      lastPhase = t;
      // blower sweeps the lawn from left to right, fanning across the depth
      const sweeping = t > 1.5 && t < 10;
      const bx = lerp(-W / 2 - 0.5, W / 2 + 0.2, clamp((t - 1.5) / 8.5)), bz = Math.sin(clock * 2.4) * H * 0.4;
      blower.visible = sweeping;
      blower.position.set(bx, 0.42, bz); blower.rotation.y = Math.sin(clock * 2.4 + 1.2) * 0.35;
      if (sweeping) for (const l of L) {
        if (l.state === 'gone') continue;
        const dx = l.x - bx, dz = l.z - bz;
        if (dx > 0 && dx < 0.95 && Math.abs(dz) < 0.45 && Math.random() < 0.25) blowAt(l, 1.6, dz * 0.8, 1 - dx);
      }
      if (sweeping && !stage.reduced && Math.random() < 0.5) emit(bx + 0.5, 0.12, bz, 1.4, 0.4, 0, 0.6, dust);
      // phase 2: autumn keeps falling
      if (t > 11 && t < 11.1) L.forEach((l) => { if (l.state === 'gone') place(l, true); });
      for (let i = 0; i < N; i++) {
        const l = L[i];
        if (l.state === 'fly' || l.state === 'fall') {
          const fall = l.state === 'fall';
          l.vy -= (fall ? 0.9 : 3.2) * dt;
          if (fall) { l.vy = Math.max(l.vy, -0.45); l.vx = Math.sin(clock * 2 + i) * 0.25; l.vz = Math.cos(clock * 1.7 + i) * 0.2; }
          l.vx *= 1 - 0.8 * dt; l.vz *= 1 - 0.8 * dt;
          l.x += l.vx * dt; l.y += l.vy * dt; l.z += l.vz * dt;
          l.ry += l.spin * dt; l.rx += l.spin * 0.6 * dt; l.spin *= 1 - 1.2 * dt;
          if (fall) { l.rx = Math.sin(clock * 3 + i) * 0.6; l.rz = Math.cos(clock * 2.5 + i) * 0.5; }
          const out = Math.abs(l.x) > W / 2 + 0.05 || Math.abs(l.z) > H / 2 + WALK;
          if (out && l.y < -0.2) { l.state = 'gone'; }
          else if (!out && l.y <= l.rest && l.vy <= 0) { l.y = l.rest; l.state = 'rest'; l.vx = l.vz = 0; l.rx *= 0.3; l.rz *= 0.3; }
          else if (out && Math.abs(l.z) < H / 2 + WALK && Math.abs(l.x) < W / 2 + 0.05 && l.y <= 0.012) { l.y = 0.012; l.state = 'rest'; }
        }
        e.set(l.rx, l.ry, l.rz); q.setFromEuler(e);
        const sc = l.state === 'gone' ? 0 : l.s;
        m.compose(pv.set(l.x, l.y, l.z), q, sv.set(sc, sc, sc)); leaves.setMatrixAt(i, m);
      }
      leaves.instanceMatrix.needsUpdate = true;
      stepParticles(dt);
      if (!stage.reduced) group.position.y = Math.sin(clock * 0.6) * 0.025;
      yaw = damp(yaw, yawT, 3, dt || 1); group.rotation.y = -0.38 + yaw;
      camFor(0);
      if (!stage.reduced) camPos.x += Math.sin(clock * 0.22) * 0.3;
      camera.position.copy(camPos); camera.lookAt(camTgt);
    });
  }

  // ================================================================== STRAW
  if (kind === 'straw') {
    const bedT = canvasTex(small ? 256 : 512, small ? 96 : 192, bedSoil);
    const bed = new THREE.Mesh(new THREE.PlaneGeometry(W, BED_Z + H / 2), new THREE.MeshStandardMaterial({ map: bedT.map, bumpMap: bedT.bumpMap, bumpScale: 3, roughness: 1 }));
    bed.rotation.x = -Math.PI / 2; bed.position.set(0, 0.004, (-H / 2 + BED_Z) / 2); bed.receiveShadow = true; group.add(bed);
    const cutEdge = new THREE.Mesh(new THREE.BoxGeometry(W, 0.03, 0.035), std(0x1d140c, 1));
    cutEdge.position.set(0, 0.0, BED_Z + 0.01); group.add(cutEdge);
    // boxwoods: clusters of lumpy leafy spheres
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x2f5a24, roughness: 0.85, vertexColors: true });
    const shrubs = [];
    const bush = (cx, cz, r, n) => {
      const g = new THREE.Group(); g.position.set(cx, 0, cz); group.add(g);
      for (let k = 0; k < n; k++) {
        const geo = new THREE.IcosahedronGeometry(r * (0.42 + Math.random() * 0.25), 3);
        const p = geo.attributes.position, col = [];
        for (let i = 0; i < p.count; i++) {
          const x = p.getX(i), y = p.getY(i), z = p.getZ(i), nn = fbm(x * 40 + k, z * 40 + y * 13, 7, 3);
          const f = 1 + (nn - 0.5) * 0.32; p.setXYZ(i, x * f, y * f, z * f);
          const c = 0.75 + nn * 0.5; col.push(0.5 * c, 0.75 * c, 0.4 * c);
        }
        geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); geo.computeVertexNormals();
        const a = (k / n) * Math.PI * 2, rr = k === 0 ? 0 : r * 0.42;
        const mesh = new THREE.Mesh(geo, leafMat);
        mesh.position.set(Math.cos(a) * rr, r * (k === 0 ? 0.75 : 0.5) + Math.random() * 0.05, Math.sin(a) * rr);
        mesh.castShadow = mesh.receiveShadow = true; g.add(mesh);
      }
      shrubs.push(g);
    };
    bush(-1.05, -0.78, 0.42, 6); bush(0.55, -0.82, 0.36, 5); bush(1.55, -0.62, 0.26, 4);

    const N = stage.coarse ? 1300 : 2400;
    const ngeo = new THREE.CylinderGeometry(0.006, 0.0045, 1, 4, 1); ngeo.rotateZ(Math.PI / 2);
    const needles = new THREE.InstancedMesh(ngeo, new THREE.MeshStandardMaterial({ roughness: 0.7 }), N);
    needles.castShadow = !stage.coarse; needles.receiveShadow = true; needles.frustumCulled = false;
    const straw = ['#b07a42', '#9a5f30', '#c4914f', '#7d4a24', '#a86b38'].map((c) => new THREE.Color(c));
    const S = Array.from({ length: N }, (_, i) => {
      leavesColor(i);
      return { x: 0, z: 0, y: 0, vy: 0, ry: 0, rz: 0, len: 0.12 + Math.random() * 0.12, rest: 0.012 + (i / N) * 0.035, state: 'wait' };
    });
    function leavesColor(i) { needles.setColorAt(i, straw[i % straw.length].clone().offsetHSL(0, 0, (Math.random() - 0.5) * 0.06)); }
    const bedArea = (n) => {
      const x = (Math.random() - 0.5) * W * 0.97, z = -H / 2 + 0.04 + Math.random() * (BED_Z + H / 2 - 0.07);
      n.x = x; n.z = z;
    };
    const drop = (n, x, z) => {
      if (x === undefined) bedArea(n); else { n.x = clamp(x, -W / 2 + 0.05, W / 2 - 0.05); n.z = clamp(z, -H / 2 + 0.04, BED_Z - 0.03); }
      n.y = 0.7 + Math.random() * 0.5; n.vy = 0; n.ry = Math.random() * 6.28; n.rz = (Math.random() - 0.5) * 0.25; n.state = 'fall';
    };
    let nextIdx = 0;
    onHitFns.push((x, z) => {
      if (z > BED_Z) return;
      for (let k = 0; k < 7 && nextIdx < N; k++, nextIdx++) drop(S[nextIdx], x + (Math.random() - 0.5) * 0.3, z + (Math.random() - 0.5) * 0.3);
    });
    group.add(needles);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), sv = new THREE.Vector3(), pv = new THREE.Vector3();
    const CYCLE = 15; let lastT = 0;
    if (stage.reduced) { S.forEach((n) => { drop(n); n.y = n.rest; n.state = 'rest'; }); nextIdx = N; }
    stage.onFrame((fdt) => {
      const dt = fdt > 0 ? realDt() : 0;
      clock += dt; grass.uniforms.uTime.value = clock;
      const t = clock % CYCLE;
      if (!stage.reduced) {
        if (t < lastT) { S.forEach((n) => { n.state = 'wait'; }); nextIdx = 0; }
        lastT = t;
        const fill = clamp((t - 0.8) / 8.5);
        while (nextIdx < N && nextIdx / N < fill) drop(S[nextIdx++]);
      }
      const fade = !stage.reduced && t > 13.4 ? 1 - (t - 13.4) / 1.6 : 1;
      for (let i = 0; i < N; i++) {
        const n = S[i];
        if (n.state === 'fall') {
          n.vy -= 4 * dt; n.y += n.vy * dt; n.ry += dt * 2;
          if (n.y <= n.rest) { n.y = n.rest; n.state = 'rest'; }
        }
        const sc = n.state === 'wait' ? 0 : fade;
        e.set(0, n.ry, n.rz); q.setFromEuler(e);
        m.compose(pv.set(n.x, n.y, n.z), q, sv.set(n.len * sc, sc, sc)); needles.setMatrixAt(i, m);
      }
      needles.instanceMatrix.needsUpdate = true;
      shrubs.forEach((s, k) => { s.rotation.z = Math.sin(clock * 0.9 + k) * 0.012; });
      stepParticles(dt);
      if (!stage.reduced) group.position.y = Math.sin(clock * 0.6) * 0.025;
      yaw = damp(yaw, yawT, 3, dt || 1); group.rotation.y = -0.38 + yaw;
      camFor(0);
      if (!stage.reduced) camPos.x += Math.sin(clock * 0.22) * 0.3;
      camera.position.copy(camPos); camera.lookAt(camTgt);
    });
  }

  stage.start();
  el.classList.add('is-live');
}
