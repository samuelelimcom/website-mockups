// "In pieces, not in one go": a real-time 3D Kentucky yard with a mature
// hardwood whose heavy limb reaches over the roof. The job plays out on a
// single timeline t (0..1): the limb is cut and lowered on a rope, the crown
// comes down, the trunk is cut into rounds, then a grinder takes the stump
// below the grass. The home page drives t with scroll; service pages loop
// their own part of it. Drag or swipe sideways to walk around the tree.
import { createStage, THREE, clamp, lerp, smoothstep, damp, scrollProgress } from '../lib/stage.js';
import { surfaceMaps, softDot } from '../lib/textures.js';
import { barkMaps, ringMaps, grassMaps, leafMaps, chipMap } from './tree-tex.js';
import { fbm } from '../lib/textures.js';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// ---- the job timeline ----------------------------------------------------
const T = {
  glow: [0.16, 0.3], limb: [0.28, 0.42], limbHaul: [0.42, 0.48],
  crown: [0.48, 0.58], crownHaul: [0.58, 0.62],
  seg0: 0.6, segStep: 0.03, segDur: 0.045,
  grinderIn: [0.77, 0.8], grind: [0.8, 0.95], grinderOut: [0.95, 0.99],
};
const span = (r, t) => smoothstep(r[0], r[1], t);

// Scroll position -> job progress for the home page story (hero, problem, turn, result).
const STORY = [[0, 0], [0.14, 0], [0.33, 0.2], [0.5, 0.45], [0.66, 0.62], [0.82, 0.8], [0.96, 1], [1, 1]];
function storyT(p) {
  for (let i = 1; i < STORY.length; i++) {
    if (p <= STORY[i][0]) { const [p0, t0] = STORY[i - 1], [p1, t1] = STORY[i]; return lerp(t0, t1, (p - p0) / (p1 - p0 || 1)); }
  }
  return 1;
}

// Camera keys along the job timeline.
const CAMS = [
  { t: 0, p: [5.4, 3.6, 7.6], c: [-0.5, 2.05, 0], fit: 3.7 },
  { t: 0.33, p: [2.6, 3.4, 6.0], c: [-0.9, 2.5, 0], fit: 2.6 },
  { t: 0.66, p: [5.2, 3.0, 6.6], c: [0.5, 1.1, -0.2], fit: 3.1 },
  { t: 0.9, p: [3.4, 2.3, 4.2], c: [0.5, 0.3, 0], fit: 2.1 },
];
const MODES = {
  removal: { from: 0, to: 0.77, dur: 12, hold: 2.2, still: 0, cam: { p: [5.6, 3.5, 7.4], c: [-0.3, 2.0, -0.2], fit: 3.8 } },
  trim: { from: 0.1, to: 0.48, dur: 7.5, hold: 1.6, still: 0.2, cam: { p: [3.0, 3.4, 6.6], c: [-0.8, 2.6, 0.2], fit: 3.1 } },
  stump: { from: 0.765, to: 0.99, dur: 8, hold: 1.6, still: 0.9, cam: { p: [3.6, 2.4, 3.2], c: [0.6, 0.3, -0.3], fit: 2.1 } },
};

const ROUND_SPOTS = [[1.05, -1.25], [1.7, -0.75], [1.55, -1.75], [2.3, -1.25], [0.55, -2.0]];
const SEG_H = 0.56, STUMP_H = 0.4, SEGS = 5;

export function mount(el) {
  const canvas = el.querySelector('canvas');
  const modeName = el.dataset.scene in MODES ? el.dataset.scene : 'story';
  const story = modeName === 'story';
  const track = story ? document.querySelector(el.dataset.track) : null;
  const M = MODES[modeName];

  let stage;
  try { stage = createStage(el, canvas, { exposure: 1.0, envIntensity: 0.7 }); } catch (e) { return; }
  const { scene, camera, renderer, key } = stage;
  const aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  key.position.set(4.5, 8, 4.5);
  key.intensity = 2.8;
  Object.assign(key.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6 });
  key.shadow.camera.updateProjectionMatrix();
  const hemi = new THREE.HemisphereLight(0xdcebff, 0x5a4a2c, 0.55);
  scene.add(hemi);

  // ---- materials --------------------------------------------------------
  const bark = barkMaps(THREE, aniso), rings = ringMaps(THREE, aniso), grass = grassMaps(THREE, aniso);
  const leaf = leafMaps(THREE, aniso), chips = chipMap(THREE, aniso);
  const barkMat = new THREE.MeshStandardMaterial({ map: bark.map, bumpMap: bark.bumpMap, bumpScale: 3, roughness: 0.95 });
  const ringMat = new THREE.MeshStandardMaterial({ map: rings.map, bumpMap: rings.bumpMap, bumpScale: 1.2, roughness: 0.8 });
  const leafMat = new THREE.MeshStandardMaterial({ map: leaf.map, bumpMap: leaf.bumpMap, bumpScale: 4, roughness: 0.82 });
  const grassMat = new THREE.MeshStandardMaterial({ map: grass.map, bumpMap: grass.bumpMap, bumpScale: 1.5, roughness: 0.97 });
  const soilMat = new THREE.MeshStandardMaterial({ color: 0x5b3f27, roughness: 1 });
  const chipMat = new THREE.MeshStandardMaterial({ map: chips.map, bumpMap: chips.bumpMap, bumpScale: 2, roughness: 0.95, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
  const siding = surfaceMaps(THREE, 'siding', 3 / 1.8, aniso);
  const roof = surfaceMaps(THREE, 'roof', 1.6, aniso);
  const sidingMat = new THREE.MeshStandardMaterial({ map: siding.map, bumpMap: siding.bumpMap, bumpScale: 1.5, roughness: 0.7, color: 0xf2ead8 });
  const roofMat = new THREE.MeshStandardMaterial({ map: roof.map, bumpMap: roof.bumpMap, bumpScale: 1.5, roughness: 0.95, color: 0x8a7f78 });
  const trimMat = new THREE.MeshStandardMaterial({ color: 0xf7f3ea, roughness: 0.6 });
  const steel = new THREE.MeshStandardMaterial({ color: 0xc9ced3, metalness: 1, roughness: 0.3 });
  const orange = new THREE.MeshStandardMaterial({ color: 0xf26a1b, roughness: 0.45, metalness: 0.1 });
  const black = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.8 });
  const ropeMat = new THREE.MeshStandardMaterial({ color: 0xf0d27a, roughness: 0.7 });
  const glowMat = new THREE.MeshBasicMaterial({ color: 0xff8a3d, transparent: true, opacity: 0, depthWrite: false });
  const shadow = (m) => { m.castShadow = true; m.receiveShadow = true; return m; };

  const world = new THREE.Group();
  scene.add(world);

  // ---- yard: a round slice of lawn and soil ------------------------------
  const lawn = new THREE.Mesh(new THREE.CircleGeometry(5.2, 64), grassMat);
  lawn.rotation.x = -Math.PI / 2; lawn.receiveShadow = true; world.add(lawn);
  const soil = new THREE.Mesh(new THREE.CylinderGeometry(5.2, 5.05, 0.5, 64, 1, true), soilMat);
  soil.position.y = -0.25; world.add(soil);

  // ---- house corner, so the limb has something to threaten -----------------
  const house = new THREE.Group();
  house.position.set(-2.75, 0, -0.9);
  world.add(house);
  const hw = 2.4, hd = 3.2, hh = 1.8;
  house.add(shadow(new THREE.Mesh(new THREE.BoxGeometry(hw, hh, hd), sidingMat))).position.y = hh / 2;
  const pitch = 0.62, run = hw / 2 + 0.28, slope = run / Math.cos(pitch);
  for (const s of [-1, 1]) {
    const r = shadow(new THREE.Mesh(new THREE.BoxGeometry(slope, 0.07, hd + 0.4), roofMat));
    r.rotation.z = -s * pitch;
    r.position.set(s * (run / 2 - 0.02), hh + Math.tan(pitch) * run / 2 - 0.12, 0);
    house.add(r);
  }
  const gable = new THREE.Shape([new THREE.Vector2(-hw / 2, 0), new THREE.Vector2(hw / 2, 0), new THREE.Vector2(0, Math.tan(pitch) * hw / 2)]);
  for (const z of [-hd / 2, hd / 2]) {
    const g = new THREE.Mesh(new THREE.ShapeGeometry(gable), sidingMat);
    g.position.set(0, hh, z); if (z < 0) g.rotation.y = Math.PI; house.add(g);
  }
  const fascia = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.16, hd + 0.4), trimMat);
  fascia.position.set(run - 0.02, hh - 0.08, 0); house.add(fascia);
  const win = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.6, 0.8), new THREE.MeshStandardMaterial({ color: 0x2a3a44, roughness: 0.15, metalness: 0.4 }));
  win.position.set(hw / 2 + 0.01, 1.05, 0.5); house.add(win);
  const winTrim = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.72, 0.92), trimMat);
  winTrim.position.set(hw / 2, 1.05, 0.5); house.add(winTrim);

  // ---- tree -----------------------------------------------------------------
  const tree = new THREE.Group();
  world.add(tree);

  function lumpy(radius, seed) {
    let g = new THREE.IcosahedronGeometry(radius, 3);
    g.deleteAttribute('normal'); g.deleteAttribute('uv');
    g = mergeVertices(g);
    const p = g.attributes.position, v = new THREE.Vector3();
    const uv = new Float32Array(p.count * 2);
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i);
      const n = fbm(v.x * 1.6 + seed, v.y * 1.6 + v.z * 0.7, seed, 3);
      v.multiplyScalar(0.78 + n * 0.5);
      if (v.y < -radius * 0.25) v.y = lerp(v.y, -radius * 0.25, 0.55);
      p.setXYZ(i, v.x, v.y, v.z);
      uv[i * 2] = 0.5 + Math.atan2(v.z, v.x) / (2 * Math.PI); uv[i * 2 + 1] = 0.5 + v.y / (radius * 2.4);
    }
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    g.computeVertexNormals();
    return g;
  }
  const clumps = [];
  function clump(parent, r, x, y, z, seed) {
    const m = shadow(new THREE.Mesh(lumpy(r, seed), leafMat));
    m.position.set(x, y, z); m.userData.base = m.position.clone(); m.userData.seed = seed;
    parent.add(m); clumps.push(m); return m;
  }
  const Y = new THREE.Vector3(0, 1, 0);
  function branch(parent, from, dir, len, r0, r1) {
    const g = new THREE.CylinderGeometry(r1, r0, len, 10, 1);
    g.translate(0, len / 2, 0);
    const m = shadow(new THREE.Mesh(g, barkMat));
    m.position.copy(from); m.quaternion.setFromUnitVectors(Y, dir.clone().normalize());
    parent.add(m); return m;
  }

  // stump with root flare
  const stump = new THREE.Group(); tree.add(stump);
  const sg = new THREE.CylinderGeometry(0.3, 0.42, STUMP_H, 28, 1); sg.translate(0, STUMP_H / 2, 0);
  stump.add(shadow(new THREE.Mesh(sg, [barkMat, ringMat, ringMat])));
  for (let i = 0; i < 5; i++) {
    const a = i * 1.26 + 0.4;
    const root = shadow(new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 8), barkMat));
    root.scale.set(2.6, 0.6, 0.9); root.position.set(Math.cos(a) * 0.45, 0.03, Math.sin(a) * 0.45); root.rotation.y = -a;
    stump.add(root);
  }

  // trunk in rounds, so it can come down in rounds
  const segs = [];
  for (let j = 0; j < SEGS; j++) {
    const rb = 0.3 - j * 0.026, rt = 0.3 - (j + 1) * 0.026;
    const g = new THREE.CylinderGeometry(rt, rb, SEG_H, 26, 1);
    const m = shadow(new THREE.Mesh(g, [barkMat, ringMat, ringMat]));
    const home = new THREE.Vector3(0, STUMP_H + SEG_H * (j + 0.5), 0);
    m.position.copy(home); m.userData.home = home; tree.add(m); segs.push(m);
  }
  const TOP = STUMP_H + SEG_H * SEGS;

  // the heavy limb over the roof (its own group so it can be lowered)
  const limb = new THREE.Group(); tree.add(limb);
  const limbBase = new THREE.Vector3(-0.12, 2.25, 0.02);
  const limbDir = new THREE.Vector3(-1, 0.42, 0.12).normalize();
  const LIMB_L = 2.05;
  const limbInner = new THREE.Group(); limb.add(limbInner);
  branch(limbInner, new THREE.Vector3(), new THREE.Vector3(0, 1, 0), LIMB_L, 0.13, 0.06);
  branch(limbInner, new THREE.Vector3(0, LIMB_L * 0.55, 0), new THREE.Vector3(0.55, 1, 0.35), 0.8, 0.06, 0.03);
  clump(limbInner, 0.62, 0.05, LIMB_L + 0.12, 0, 3);
  clump(limbInner, 0.46, 0.4, LIMB_L * 0.55 + 0.75, 0.25, 7);
  clump(limbInner, 0.4, -0.25, LIMB_L * 0.75, -0.3, 11);
  const limbHomeQ = new THREE.Quaternion().setFromUnitVectors(Y, limbDir);
  const limbDownQ = new THREE.Quaternion().setFromUnitVectors(Y, new THREE.Vector3(1, 0.05, 0.55).normalize());
  const limbDown = new THREE.Vector3(-1.75, 0.16, 1.15);
  const cutRing = new THREE.Mesh(new THREE.TorusGeometry(0.135, 0.018, 8, 28), glowMat);
  cutRing.rotation.x = Math.PI / 2; cutRing.position.y = 0.3; limbInner.add(cutRing);

  // crown: upper limbs and the main canopy
  const crown = new THREE.Group(); tree.add(crown);
  const crownBase = new THREE.Vector3(0, TOP - 0.05, 0);
  branch(crown, new THREE.Vector3(0, -0.1, 0), new THREE.Vector3(0.5, 1, 0.2), 1.25, 0.15, 0.06);
  branch(crown, new THREE.Vector3(0, -0.2, 0), new THREE.Vector3(-0.35, 1, -0.4), 1.05, 0.13, 0.05);
  branch(crown, new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.05, 1, 0.05), 1.1, 0.16, 0.07);
  clump(crown, 0.95, 0.05, 1.35, 0.05, 1);
  clump(crown, 0.75, 0.7, 1.05, 0.35, 5);
  clump(crown, 0.7, -0.55, 0.95, -0.45, 9);
  clump(crown, 0.6, 0.35, 0.65, -0.65, 13);
  clump(crown, 0.55, -0.2, 0.75, 0.7, 17);
  const crownDownQ = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0.2, 0, 1).normalize(), -1.45);
  const crownDown = new THREE.Vector3(1.3, 0.35, -1.7);

  // rope used to lower pieces
  const rope = shadow(new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 1, 6), ropeMat));
  rope.visible = false; world.add(rope);
  const ropeAnchor = new THREE.Vector3(0.05, TOP + 0.05, 0);
  function setRope(a, b) {
    const d = new THREE.Vector3().subVectors(b, a), len = d.length();
    rope.position.copy(a).addScaledVector(d, 0.5);
    rope.scale.set(1, len, 1);
    rope.quaternion.setFromUnitVectors(Y, d.normalize());
    rope.visible = true;
  }

  // ---- stump grinder ----------------------------------------------------------
  const grinder = new THREE.Group(); world.add(grinder);
  const body = shadow(new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.42, 0.5), orange));
  body.position.set(1.55, 0.42, 0); grinder.add(body);
  const engine = shadow(new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.26, 0.36), black));
  engine.position.set(1.65, 0.75, 0); grinder.add(engine);
  for (const z of [-0.3, 0.3]) {
    const wheel = shadow(new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.12, 20), black));
    wheel.rotation.x = Math.PI / 2; wheel.position.set(1.7, 0.2, z); grinder.add(wheel);
  }
  const handle = shadow(new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.9, 8), steel));
  handle.rotation.z = -0.9; handle.position.set(2.15, 0.85, 0); grinder.add(handle);
  const boom = shadow(new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.12, 0.14), orange));
  boom.position.set(0.85, 0.42, 0); boom.rotation.z = 0.08; grinder.add(boom);
  const head = new THREE.Group(); head.position.set(0.32, 0.36, 0); grinder.add(head);
  const cutter = new THREE.Group(); head.add(cutter);
  const disc = shadow(new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.05, 32), steel));
  disc.rotation.x = Math.PI / 2; cutter.add(disc);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.05, 0.09), black);
    tooth.position.set(Math.cos(a) * 0.31, Math.sin(a) * 0.31, 0); tooth.rotation.z = a; cutter.add(tooth);
  }
  const guard = shadow(new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.14, 24, 1, true, 0, Math.PI), orange));
  guard.rotation.x = Math.PI / 2; guard.material = orange; head.add(guard);
  grinder.visible = false;

  // chip patch left where the stump was
  const patch = new THREE.Mesh(new THREE.CircleGeometry(1, 40), chipMat);
  patch.rotation.x = -Math.PI / 2; patch.position.y = 0.012; patch.receiveShadow = true; patch.scale.setScalar(0.001);
  world.add(patch);

  // flying chips / sawdust
  const N = stage.reduced ? 0 : stage.coarse ? 70 : 140;
  const pos = new Float32Array(N * 3).fill(-99), vel = new Float32Array(N * 3), life = new Float32Array(N);
  const pgeo = new THREE.BufferGeometry(); pgeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const dust = new THREE.Points(pgeo, new THREE.PointsMaterial({ size: 0.075, map: softDot(THREE), color: 0xd9a566, transparent: true, depthWrite: false }));
  dust.frustumCulled = false; world.add(dust);
  function emit(at, spread, up, dt, rate) {
    for (let i = 0; i < N; i++) {
      const j = i * 3;
      if (life[i] > 0 || Math.random() > rate * dt) continue;
      life[i] = 0.5 + Math.random() * 0.6;
      pos[j] = at.x + (Math.random() - 0.5) * 0.1; pos[j + 1] = at.y; pos[j + 2] = at.z + (Math.random() - 0.5) * 0.1;
      vel[j] = (Math.random() - 0.5) * spread + spread * 0.4; vel[j + 1] = up * (0.5 + Math.random()); vel[j + 2] = (Math.random() - 0.5) * spread;
    }
  }

  // ---- pose everything for a given t ------------------------------------------------
  const tmpV = new THREE.Vector3(), tmpQ = new THREE.Quaternion(), mid = new THREE.Vector3();
  const ease = (x) => x * x * (3 - 2 * x);
  let stumpH = 1, cutAt = new THREE.Vector3(), grindAt = new THREE.Vector3(), phase = '';
  function pose(t, clock) {
    // limb
    const g = span(T.glow, t) * (1 - smoothstep(T.limb[0], T.limb[0] + 0.02, t));
    glowMat.opacity = g * (0.65 + 0.35 * Math.sin(clock * 9));
    const fl = span(T.limb, t), hl = span(T.limbHaul, t);
    limb.position.lerpVectors(limbBase, limbDown, ease(fl));
    limb.position.y += Math.sin(Math.PI * fl) * 0.25 - hl * 0.6;
    limb.quaternion.slerpQuaternions(limbHomeQ, limbDownQ, ease(fl));
    limb.scale.setScalar(Math.max(0.001, 1 - hl));
    limb.visible = hl < 0.999;
    // crown
    const fc = span(T.crown, t), hc = span(T.crownHaul, t);
    crown.position.lerpVectors(crownBase, crownDown, ease(fc));
    crown.position.y += Math.sin(Math.PI * fc) * 0.3 - hc * 0.5;
    crown.quaternion.slerpQuaternions(tmpQ.identity(), crownDownQ, ease(fc));
    crown.scale.setScalar(Math.max(0.001, 1 - hc));
    crown.visible = hc < 0.999;
    // rope while something is being lowered
    rope.visible = false;
    if (fl > 0.001 && fl < 0.999) { mid.set(0, LIMB_L * 0.55, 0).applyQuaternion(limb.quaternion).add(limb.position); setRope(ropeAnchor, mid); }
    else if (fc > 0.001 && fc < 0.999) { mid.set(0, 0.7, 0).applyQuaternion(crown.quaternion).add(crown.position); setRope(tmpV.set(0.05, 3.9, 0.8), mid); }
    // trunk rounds, top first
    for (let k = 0; k < SEGS; k++) {
      const s = segs[SEGS - 1 - k], s0 = T.seg0 + k * T.segStep;
      const f = smoothstep(s0, s0 + T.segDur, t), [sx, sz] = ROUND_SPOTS[k];
      s.position.set(lerp(s.userData.home.x, sx, ease(f)), lerp(s.userData.home.y, SEG_H / 2, ease(f)) + Math.sin(Math.PI * f) * 0.35, lerp(0, sz, ease(f)));
      s.rotation.y = f * (1.2 + k * 0.7);
    }
    // grinder and stump
    const gi = span(T.grinderIn, t), go = span(T.grinderOut, t), gr = span(T.grind, t);
    grinder.visible = gi > 0.001 && go < 0.999;
    stumpH = Math.max(0.02, 1 - gr);
    stump.scale.set(1, stumpH, 1);
    const sweep = gr > 0 && gr < 1 ? Math.sin(gr * Math.PI * 7) * 0.32 : 0;
    grinder.position.set((1 - ease(gi)) * 2.6 + ease(go) * 2.6, 0, sweep);
    head.position.y = lerp(0.36, 0.06, gr) + STUMP_H * stumpH * 0.55;
    patch.scale.setScalar(Math.max(0.001, ease(gr) * 0.95));
    cutAt.copy(limbBase).addScaledVector(limbDir, 0.3);
    grindAt.set(0.02, STUMP_H * stumpH + 0.02, sweep);
    phase = g > 0.4 && t > T.glow[0] + 0.06 ? 'cut' : gr > 0.01 && gr < 0.99 ? 'grind' : '';
  }

  // ---- pointer: walk around the tree --------------------------------------------------
  let yaw = 0, yawT = 0, lastX = null, touched = false;
  const hint = el.querySelector('[data-hint]');
  const done = () => { if (!touched) { touched = true; hint && hint.classList.add('is-done'); } };
  canvas.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'mouse') {
      const r = canvas.getBoundingClientRect();
      yawT = (((e.clientX - r.left) / r.width) - 0.5) * 0.9; done();
    } else if (lastX !== null) { yawT = clamp(yawT + (e.clientX - lastX) * 0.006, -1.1, 1.1); lastX = e.clientX; done(); }
  }, { passive: true });
  canvas.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse') lastX = e.clientX; }, { passive: true });
  const up = () => { lastX = null; };
  canvas.addEventListener('pointerup', up, { passive: true });
  canvas.addEventListener('pointercancel', up, { passive: true });
  canvas.addEventListener('pointerleave', () => { up(); }, { passive: true });

  // ---- camera ---------------------------------------------------------------------
  let layout = 'box', lastShift = -1, shiftT = 0;
  function applyOffset(force) {
    const { w, h } = stage.size;
    if (layout === 'side') { if (force) camera.setViewOffset(w, h, -w * 0.2, 0, w, h); }
    else if (layout === 'bottom') {
      const shift = lerp(0.24, 0.16, clamp(shiftT));
      if (force || Math.abs(shift - lastShift) > 0.002) { lastShift = shift; camera.setViewOffset(w, h, 0, h * shift, w, h); }
    } else if (force) camera.clearViewOffset();
  }
  stage.onResize((size) => {
    layout = !story ? 'box' : window.innerWidth >= 1000 ? 'side' : 'bottom';
    camera.fov = size.aspect < 0.9 ? 40 : 32;
    applyOffset(true);
    camera.updateProjectionMatrix();
  });
  const camPos = new THREE.Vector3(), camTgt = new THREE.Vector3(), A = new THREE.Vector3(), B = new THREE.Vector3();
  function camAt(t) {
    let fit;
    if (!story) { A.fromArray(M.cam.p); camTgt.fromArray(M.cam.c); fit = M.cam.fit; }
    else {
      let i = 1; while (i < CAMS.length - 1 && t > CAMS[i].t) i++;
      const k0 = CAMS[i - 1], k1 = CAMS[i], f = smoothstep(k0.t, k1.t, t);
      A.fromArray(k0.p).lerp(B.fromArray(k1.p), f);
      camTgt.fromArray(k0.c).lerp(B.fromArray(k1.c), f);
      fit = lerp(k0.fit, k1.fit, f);
    }
    const need = (fit * (layout === 'side' ? 1.45 : 1)) / (Math.tan((camera.fov * Math.PI) / 360) * Math.min(stage.size.aspect, 1.35));
    A.sub(camTgt);
    A.applyAxisAngle(Y, yaw);
    const d = A.length();
    camPos.copy(camTgt).addScaledVector(A.normalize(), Math.max(d * 0.85, need));
  }

  // ---- frame loop -----------------------------------------------------------------
  let clock = 0, t = story ? 0 : stage.reduced ? M.still : M.from, first = true, regrow = 1, cycleAt = 0, lastT = t, movedAt = -9;
  stage.onFrame((dt) => {
    clock += dt;
    if (story && track) {
      const p = scrollProgress(track);
      const target = storyT(p);
      t = first ? target : damp(t, target, 6, dt || 1);
      shiftT = damp(shiftT, p * 3, 5, dt || 1);
    } else if (!stage.reduced) {
      const c = clock - cycleAt;
      if (c < M.dur) t = lerp(M.from, M.to, c / M.dur);
      else if (c < M.dur + M.hold) t = M.to;
      else { cycleAt = clock; t = M.from; regrow = 0; }
      regrow = Math.min(1, regrow + dt / 1.1);
    }
    if (Math.abs(t - lastT) > 1e-4) movedAt = clock;
    lastT = t;
    pose(t, clock);
    // a fresh cycle grows back in, rather than snapping
    const rg = 1 - (1 - regrow) ** 3;
    if (modeName === 'removal') tree.scale.set(1, Math.max(0.001, rg), 1);
    if (modeName === 'trim') limbInner.scale.setScalar(Math.max(0.001, rg));
    if (modeName === 'stump') stump.scale.y = Math.max(0.02, stumpH * rg);

    // wind in the canopy
    if (!stage.reduced) for (const m of clumps) {
      const s = m.userData.seed;
      m.position.x = m.userData.base.x + Math.sin(clock * 1.3 + s) * 0.025;
      m.rotation.z = Math.sin(clock * 0.9 + s * 2) * 0.03;
    }

    // chips and sawdust
    const working = clock - movedAt < 0.35;
    if (N) {
      if (working && phase === 'cut') emit(tmpV.copy(cutAt), 0.8, 0.6, dt, 40);
      if (working && phase === 'grind') emit(tmpV.copy(grindAt), 2.2, 2.2, dt, 90);
      for (let i = 0; i < N; i++) {
        const j = i * 3;
        if (life[i] <= 0) { pos[j + 1] = -99; continue; }
        life[i] -= dt; vel[j + 1] -= 5 * dt;
        pos[j] += vel[j] * dt; pos[j + 1] = Math.max(0.02, pos[j + 1] + vel[j + 1] * dt); pos[j + 2] += vel[j + 2] * dt;
      }
      pgeo.attributes.position.needsUpdate = true;
    }
    cutter.rotation.z -= dt * (phase === 'grind' ? 26 : 2);

    yaw = damp(yaw, yawT, 4, dt || 1);
    if (!story && !stage.reduced && !touched) yawT = Math.sin(clock * 0.22) * 0.35;
    applyOffset(false);
    camAt(t);
    camera.position.copy(camPos); camera.lookAt(camTgt);
    if (dt > 0) first = false;
  });

  stage.start();
  el.classList.add('is-live');
}
