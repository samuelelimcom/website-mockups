// "The terrace roof": a real-time cutaway of an Aspull terrace roof. Brick front
// wall with sandstone sill and lintel, fascia and gutter, then rafters, membrane,
// battens and individual slates in courses, clay ridge tiles and a brick chimney
// stack with pots and lead flashing. Rain falls until the roof is put right.
// Variants, picked by data-surface on the stage:
//   roof    - slipped slates slide back into their course. Pointer lifts slates to inspect.
//   lead    - the lead apron at the chimney is dressed down. Pointer dresses it.
//   chimney - the stack is repointed course by course. Pointer repoints joints.
// data-mode="scroll" runs the whole story from the home page scroll position.
import { createStage, THREE, clamp, lerp, smoothstep, damp, scrollProgress } from '../lib/stage.js';
import { fbm } from '../lib/textures.js';

const PITCH = 0.66;                       // ~38 degrees, typical for a Lancashire terrace
const SIN = Math.sin(PITCH), COS = Math.cos(PITCH), TAN = Math.tan(PITCH);
const L = 2.6, LB = 1.15, W = 3.6;        // front slope length, back slope length, roof width
const RIDGE = new THREE.Vector3(0, L * SIN, 1 - L * COS); // eaves at y=0, z=1
const GAUGE = 0.2, SL = 0.46, SW = 0.3;   // slate course gauge, slate length and width
const CH = { x: 1.0, z: -0.5, w: 0.8, d: 0.55, y0: 0.82, y1: 2.5 };
const WALL_H = 1.35;
const sOf = (z) => (z - RIDGE.z) / COS;   // slope distance from ridge for a world z
const roofY = (z) => (z > RIDGE.z ? (1 - z) * TAN : RIDGE.y - (RIDGE.z - z) * TAN);

const CAMS = {
  story: [
    { p: [-3.4, 2.7, 5.6], t: [0.15, 0.62, -0.05], fit: 3.3 },
    { p: [-2.4, 1.85, 2.5], t: [-0.75, 0.62, 0.2], fit: 1.45 },
    { p: [-0.9, 3.6, 3.0], t: [-0.4, 0.75, 0.05], fit: 2.0 },
    { p: [2.9, 2.35, 2.3], t: [1.0, 1.35, -0.4], fit: 1.45 },
    { p: [3.7, 2.2, 5.6], t: [0.05, 0.55, -0.1], fit: 3.4 },
  ],
  roof: [{ p: [-1.6, 3.3, 4.3], t: [-0.3, 0.7, 0.1], fit: 2.5 }],
  lead: [{ p: [2.5, 2.45, 2.7], t: [1.0, 1.15, -0.3], fit: 1.35 }],
  chimney: [{ p: [3.0, 2.7, 2.7], t: [1.0, 1.45, -0.45], fit: 1.6 }],
};

// ---------------------------------------------------------------- textures
const frac = (v) => v - Math.floor(v);
function hash(x, y, s = 0) {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(s | 0, 1442695041);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}
// fn(u, v, x, y) -> [r, g, b, height]
function paint(w, h, fn) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const hc = document.createElement('canvas'); hc.width = w; hc.height = h;
  const ctx = c.getContext('2d'), hctx = hc.getContext('2d');
  const img = ctx.createImageData(w, h), himg = hctx.createImageData(w, h);
  for (let y = 0, i = 0; y < h; y++) for (let x = 0; x < w; x++, i += 4) {
    const p = fn(x / w, y / h, x, y);
    img.data[i] = clamp(p[0]) * 255; img.data[i + 1] = clamp(p[1]) * 255; img.data[i + 2] = clamp(p[2]) * 255; img.data[i + 3] = 255;
    himg.data[i] = himg.data[i + 1] = himg.data[i + 2] = clamp(p[3]) * 255; himg.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0); hctx.putImageData(himg, 0, 0);
  return [c, hc];
}
function tex(canvas, srgb, aniso, repeat) {
  const t = new THREE.CanvasTexture(canvas);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = aniso;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
  return t;
}

// Natural slate: blue-grey, split along the grain, slightly lighter dressed edges.
function slate(u, v, x, y) {
  const grain = fbm(u * 3, v * 42, 5, 4), cloud = fbm(u * 5, v * 4, 9, 3), sp = hash(x, y, 7);
  const edge = Math.min(u, 1 - u, v * 1.5, (1 - v) * 1.5);
  let b = 0.2 + (cloud - 0.5) * 0.07 + (grain - 0.5) * 0.06 + (sp > 0.985 ? 0.12 : 0);
  if (edge < 0.035) b += 0.05 * (1 - edge / 0.035);
  return [b * 0.92, b * 1.02, b * 1.16, grain * 0.7 + sp * 0.15 + (edge < 0.03 ? -0.2 : 0) + 0.2];
}
function felt(u, v, x, y) {
  const n = fbm(u * 18, v * 30, 3, 3), wr = Math.abs(Math.sin(u * 40 + fbm(u * 4, v * 4, 1, 2) * 6));
  const b = 0.13 + (n - 0.5) * 0.04;
  return [b * 0.95, b * 1.0, b * 1.08, 0.4 + wr * 0.25 + n * 0.2];
}
function lead(u, v, x, y) {
  const n = fbm(u * 9, v * 9, 13, 4), d = fbm(u * 40, v * 40, 2, 2), pat = smoothstep(0.62, 0.8, fbm(u * 6, v * 6, 44, 3));
  const b = 0.5 + (n - 0.5) * 0.12;
  return [lerp(b * 0.96, 0.78, pat * 0.5), lerp(b * 1.0, 0.8, pat * 0.5), lerp(b * 1.04, 0.8, pat * 0.5), 0.5 + (d - 0.5) * 0.7];
}
function timber(u, v, x, y) {
  const g = fbm(u * 2, v * 60, 8, 4), n = fbm(u * 8, v * 8, 2, 2);
  const b = 0.5 + (g - 0.5) * 0.25 + (n - 0.5) * 0.1;
  return [b * 0.78, b * 0.6, b * 0.4, g];
}
// Stretcher-bond brickwork in local red brick. mortar: 'new' | 'old'
function bricks(cols, rows, seed, mortar) {
  return (u, v, x, y) => {
    const rv = v * rows, row = Math.floor(rv), fy = frac(rv);
    const cu = u * cols + (row % 2) * 0.5, col = Math.floor(cu), fx = frac(cu);
    const jy = 0.14, jx = 0.045;
    const speck = hash(x, y, seed), n = fbm(u * cols * 3, v * rows * 0.8, seed, 3);
    const inJoint = fy < jy || fx < jx;
    if (inJoint) {
      if (mortar === 'new') {
        const m = 0.66 + (speck - 0.5) * 0.06;
        return [m, m * 0.96, m * 0.88, 0.62 + speck * 0.05];
      }
      const gone = fbm(u * 30, v * 60, seed + 3, 3) > 0.5;
      const m = gone ? 0.1 : 0.26 + (speck - 0.5) * 0.08;
      const moss = fbm(u * 12, v * 12, seed + 9, 2) > 0.7;
      return moss && !gone ? [0.2, 0.26, 0.12, 0.35] : [m, m * 0.92, m * 0.84, gone ? 0.02 : 0.25 + speck * 0.15];
    }
    const k = hash(col, row, seed);
    const dark = k > 0.86 ? 0.62 : k < 0.1 ? 1.18 : 1;
    const t = (0.85 + (k - 0.5) * 0.3) * dark * (0.9 + (n - 0.5) * 0.3 + (speck - 0.5) * 0.12);
    const soot = mortar === 'old' ? 1 - 0.3 * smoothstep(0.55, 0.0, v) : 1;
    const ex = Math.min(fx - jx, 1 - fx, fy - jy, 1 - fy);
    return [0.5 * t * soot, 0.19 * t * soot, 0.12 * t * soot, 0.78 + n * 0.15 - (ex < 0.03 ? 0.15 : 0)];
  };
}
function sandstone(u, v, x, y) {
  const n = fbm(u * 12, v * 4, 17, 4), sp = hash(x, y, 3);
  const b = 0.66 + (n - 0.5) * 0.14 + (sp - 0.5) * 0.06;
  return [b, b * 0.88, b * 0.68, n * 0.7 + sp * 0.3];
}
function softDot() {
  const c = document.createElement('canvas'); c.width = c.height = 32;
  const ctx = c.getContext('2d'), g = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 32, 32);
  return new THREE.CanvasTexture(c);
}

const std = (color, roughness = 0.8, metalness = 0) => new THREE.MeshStandardMaterial({ color, roughness, metalness });
function shadowy(m) { m.castShadow = m.receiveShadow = true; return m; }

// ================================================================= mount
export function mount(el) {
  const canvas = el.querySelector('canvas');
  const kind = ['roof', 'lead', 'chimney'].includes(el.dataset.surface) ? el.dataset.surface : 'roof';
  const mode = el.dataset.mode === 'scroll' ? 'scroll' : 'auto';
  const track = mode === 'scroll' ? document.querySelector(el.dataset.track) : null;
  const cams = mode === 'scroll' ? CAMS.story : CAMS[kind];

  let stage;
  try { stage = createStage(el, canvas, { exposure: 1.0, envIntensity: 0.7 }); } catch (e) { return; }
  const { scene, camera, renderer, key } = stage;
  const aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const small = Math.min(innerWidth, innerHeight) < 600;
  const R = (a, b) => (small ? a : b);
  const hemi = new THREE.HemisphereLight(0xdfe8ef, 0x3b2c24, 0.55); scene.add(hemi);

  const house = new THREE.Group();
  scene.add(house);

  // ---- materials ------------------------------------------------------------
  const [sc, sh] = paint(R(96, 128), R(144, 192), slate);
  const slateMat = new THREE.MeshStandardMaterial({ map: tex(sc, true, aniso), bumpMap: tex(sh, false, aniso), bumpScale: 1.6, roughness: 0.5, metalness: 0.05 });
  const [fc, fh] = paint(256, 192, felt);
  const feltMat = new THREE.MeshStandardMaterial({ map: tex(fc, true, aniso), bumpMap: tex(fh, false, aniso), bumpScale: 1.2, roughness: 0.75 });
  const [tc, th] = paint(64, 256, timber);
  const timberMat = new THREE.MeshStandardMaterial({ map: tex(tc, true, aniso), bumpMap: tex(th, false, aniso), bumpScale: 1, roughness: 0.85 });
  const battenMat = new THREE.MeshStandardMaterial({ map: tex(tc, true, aniso), roughness: 0.85, color: 0xd9b48a });
  const [lc, lh] = paint(128, 128, lead);
  const leadMat = new THREE.MeshStandardMaterial({ map: tex(lc, true, aniso), bumpMap: tex(lh, false, aniso), bumpScale: 1.4, roughness: 0.5, metalness: 0.45 });
  const [wc, wh] = paint(256, 256, bricks(4, 14, 21, 'new'));
  const wallMat = new THREE.MeshStandardMaterial({ map: tex(wc, true, aniso, [W / 0.9, WALL_H / 1.05]), bumpMap: tex(wh, false, aniso, [W / 0.9, WALL_H / 1.05]), bumpScale: 2.2, roughness: 0.9 });
  const [stc, sth] = paint(128, 64, sandstone);
  const stoneMat = new THREE.MeshStandardMaterial({ map: tex(stc, true, aniso), bumpMap: tex(sth, false, aniso), bumpScale: 1.5, roughness: 0.92 });
  const clayMat = std(0x8a3c27, 0.7);
  const fasciaMat = std(0x1d2226, 0.45);
  const gutterMat = std(0x141719, 0.35, 0.1);

  // ---- front wall, window, fascia, gutter --------------------------------------
  const wall = shadowy(new THREE.Mesh(new THREE.BoxGeometry(W, WALL_H, 0.3), wallMat));
  wall.position.set(0, -WALL_H / 2 - 0.02, 0.92); house.add(wall);
  const win = new THREE.Group(); win.position.set(-0.55, -0.68, 1.07); house.add(win);
  const frame = shadowy(new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.72, 0.05), std(0xf2f0ea, 0.4)));
  win.add(frame);
  const glass = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.62, 0.02), new THREE.MeshStandardMaterial({ color: 0x24333d, roughness: 0.05, metalness: 0.9 }));
  glass.position.z = 0.02; win.add(glass);
  const mull = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.62, 0.03), frame.material); mull.position.z = 0.03; win.add(mull);
  const sill = shadowy(new THREE.Mesh(new THREE.BoxGeometry(1.06, 0.08, 0.16), stoneMat)); sill.position.set(0, -0.4, 0.04); win.add(sill);
  const lintel = shadowy(new THREE.Mesh(new THREE.BoxGeometry(1.06, 0.14, 0.06), stoneMat)); lintel.position.set(0, 0.43, -0.01); win.add(lintel);
  const fascia = shadowy(new THREE.Mesh(new THREE.BoxGeometry(W + 0.04, 0.16, 0.035), fasciaMat));
  fascia.position.set(0, -0.06, 1.1); house.add(fascia);
  const gutter = shadowy(new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, W + 0.1, 20, 1, false), gutterMat));
  gutter.rotation.z = Math.PI / 2; gutter.position.set(0, -0.06, 1.19); house.add(gutter);
  const pipe = shadowy(new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, WALL_H - 0.05, 12), gutterMat));
  pipe.position.set(W / 2 - 0.22, -WALL_H / 2 - 0.08, 1.14); house.add(pipe);

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.ShadowMaterial({ opacity: 0.2 }));
  ground.rotation.x = -Math.PI / 2; ground.position.y = -WALL_H - 0.05; ground.receiveShadow = true; scene.add(ground);

  // ---- slope builder: rafters, membrane, battens, slates ----------------------
  const chimneyS = [sOf(CH.z - CH.d / 2) - 0.06, sOf(CH.z + CH.d / 2) + 0.04];
  const loose = []; // slipped slates (front slope)
  function buildSlope(len, back) {
    const g = new THREE.Group();
    g.position.copy(RIDGE);
    g.rotation.order = 'YXZ';
    if (back) g.rotation.y = Math.PI;
    g.rotation.x = PITCH;
    house.add(g);
    // rafters
    for (let x = -W / 2 + 0.03; x <= W / 2; x += 0.45) {
      const r = shadowy(new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.13, len + 0.12), timberMat));
      r.position.set(x, -0.065, len / 2 + 0.02); g.add(r);
    }
    const memb = new THREE.Mesh(new THREE.PlaneGeometry(W, len + 0.05), feltMat);
    memb.rotation.x = -Math.PI / 2; memb.position.set(0, 0.003, len / 2); memb.receiveShadow = true; g.add(memb);
    // slates: course by course from the eaves
    const mats = [];
    const rows = Math.floor((len - 0.06) / GAUGE) + 1;
    const pick = back ? [] : [[5, -0.95], [5, -0.62], [7, -0.3]];
    for (let r = 0; r < rows; r++) {
      const sb = len - r * GAUGE + 0.04, sc0 = Math.max(0.02, sb - SL), smid = (sb + sc0) / 2, slen = sb - sc0;
      // batten under the slate head
      const bat = new THREE.Mesh(new THREE.BoxGeometry(W, 0.025, 0.045), battenMat);
      bat.position.set(0, 0.016, sc0 + 0.04); bat.castShadow = true; g.add(bat);
      const off = (r % 2) * SW * 0.5;
      for (let x0 = -W / 2 - off; x0 < W / 2 - 0.02; x0 += SW) {
        const a = Math.max(-W / 2, x0), b = Math.min(W / 2, x0 + SW - 0.006);
        if (b - a < 0.05) continue;
        const cx = (a + b) / 2;
        if (!back && cx > CH.x - CH.w / 2 - 0.1 && cx < CH.x + CH.w / 2 + 0.1 && smid > chimneyS[0] - 0.1 && smid < chimneyS[1]) continue;
        const item = { x: cx, w: b - a, s: smid, len: slen, h: 0.04 + r * 0.0004, tilt: -0.035, r, lift: 0, liftT: 0, k: hash(r, Math.round(cx * 100), 5) };
        const p = pick.findIndex(([pr, px]) => pr === r && Math.abs(px - cx) < SW / 2);
        if (p > -1) { loose.push(item); pick.splice(p, 1); } else mats.push(item);
      }
    }
    const inst = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 0.012, 1), slateMat, mats.length);
    inst.castShadow = inst.receiveShadow = true;
    const col = new THREE.Color();
    mats.forEach((m, i) => { const v = 0.82 + m.k * 0.32; inst.setColorAt(i, col.setRGB(v, v, v * (0.97 + m.k * 0.06))); });
    g.add(inst);
    return { g, inst, items: mats };
  }
  const front = buildSlope(L, false);
  const back = buildSlope(LB, true);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), pv = new THREE.Vector3(), sv = new THREE.Vector3();
  function placeSlate(item, out) {
    // hinge at the slate's head (top edge): lifting rotates it up about that line
    const ang = item.tilt - item.lift;
    const half = item.len / 2;
    pv.set(item.x, item.h + Math.sin(-ang) * half, item.s - half + Math.cos(ang) * half);
    e.set(ang, 0, 0); q.setFromEuler(e); sv.set(item.w, 1, item.len);
    out.compose(pv, q, sv);
    return out;
  }
  function writeSlope(sl) { sl.items.forEach((it, i) => sl.inst.setMatrixAt(i, placeSlate(it, m4))); sl.inst.instanceMatrix.needsUpdate = true; }
  writeSlope(front); writeSlope(back);
  const looseMeshes = loose.map((it, i) => {
    const m = shadowy(new THREE.Mesh(new THREE.BoxGeometry(1, 0.012, 1), slateMat));
    m.userData = { it, dz: 0.3 + i * 0.06, rz: [0.18, -0.14, 0.1][i] || 0.1, dx: [0.05, -0.04, 0.03][i] || 0 };
    front.g.add(m); return m;
  });
  function setLoose(fix) {
    looseMeshes.forEach((m, i) => {
      const { it, dz, rz, dx } = m.userData;
      const f = smoothstep(i * 0.18, 0.64 + i * 0.18, fix);
      placeSlate(it, m.matrix);
      m.matrix.decompose(m.position, m.quaternion, m.scale);
      m.position.z += dz * (1 - f); m.position.x += dx * (1 - f); m.position.y += 0.018 * (1 - f);
      m.rotateY(rz * (1 - f));
    });
  }

  // ---- ridge tiles ----------------------------------------------------------------
  // half-round clay ridge: theta 0..PI is the +x half, which faces up once the axis lies along x
  const ridgeGeo = new THREE.CylinderGeometry(0.105, 0.105, 0.44, 18, 1, true, 0, Math.PI);
  const ridgeMat = clayMat.clone(); ridgeMat.side = THREE.DoubleSide;
  for (let x = -W / 2 + 0.22; x < W / 2; x += 0.45) {
    const t = shadowy(new THREE.Mesh(ridgeGeo, ridgeMat));
    t.rotation.z = Math.PI / 2;
    t.position.set(x, RIDGE.y + 0.035, RIDGE.z); house.add(t);
  }

  // ---- chimney stack with repointing mask -----------------------------------------
  const cw = R(192, 256), chh = cw * 2;
  const [oldC, oldH] = paint(cw, chh, bricks(3.5, 22, 33, 'old'));
  const [newC, newH] = paint(cw, chh, bricks(3.5, 22, 33, 'new'));
  const outC = document.createElement('canvas'); outC.width = cw; outC.height = chh;
  const outH = document.createElement('canvas'); outH.width = cw; outH.height = chh;
  const tmp = document.createElement('canvas'); tmp.width = cw; tmp.height = chh;
  const mask = document.createElement('canvas'); mask.width = 64; mask.height = 128;
  const octx = outC.getContext('2d'), hctx = outH.getContext('2d'), tctx = tmp.getContext('2d'), mctx = mask.getContext('2d');
  const chMap = tex(outC, true, aniso), chBump = tex(outH, false, aniso);
  const chFront = new THREE.MeshStandardMaterial({ map: chMap, bumpMap: chBump, bumpScale: 2.6, roughness: 0.9 });
  const sideMap = chMap.clone(), sideBump = chBump.clone();
  [sideMap, sideBump].forEach((t) => { t.wrapS = THREE.RepeatWrapping; t.repeat.set(CH.d / CH.w, 1); });
  const chSide = new THREE.MeshStandardMaterial({ map: sideMap, bumpMap: sideBump, bumpScale: 2.6, roughness: 0.9 });
  const chTop = std(0x8c877d, 0.95);
  const stackH = CH.y1 - CH.y0;
  const stack = shadowy(new THREE.Mesh(new THREE.BoxGeometry(CH.w, stackH, CH.d), [chSide, chSide, chTop, chTop, chFront, chFront]));
  stack.position.set(CH.x, (CH.y0 + CH.y1) / 2, CH.z); house.add(stack);
  const corbel = shadowy(new THREE.Mesh(new THREE.BoxGeometry(CH.w + 0.08, 0.09, CH.d + 0.08), chFront));
  corbel.position.set(CH.x, CH.y1 - 0.17, CH.z); house.add(corbel);
  const flaunch = shadowy(new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.36, 0.08, 4, 1), std(0x9b968c, 0.95)));
  flaunch.rotation.y = Math.PI / 4; flaunch.scale.set(1.25, 1, 0.85); flaunch.position.set(CH.x, CH.y1 + 0.04, CH.z); house.add(flaunch);
  [-0.17, 0.17].forEach((dx) => {
    const pot = shadowy(new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.095, 0.36, 18, 1, true), ridgeMat));
    pot.position.set(CH.x + dx, CH.y1 + 0.24, CH.z); house.add(pot);
    const rim = shadowy(new THREE.Mesh(new THREE.TorusGeometry(0.078, 0.016, 8, 20), clayMat));
    rim.rotation.x = Math.PI / 2; rim.position.set(CH.x + dx, CH.y1 + 0.42, CH.z); house.add(rim);
  });
  let maskP = -1, maskDirty = true;
  const strokes = [];
  function drawChimney(p) {
    mctx.clearRect(0, 0, 64, 128); mctx.fillStyle = '#fff';
    mctx.fillRect(0, 0, 64, 128 * p);
    strokes.forEach(([u, v]) => { mctx.beginPath(); mctx.arc(u * 64, v * 128, 9, 0, Math.PI * 2); mctx.fill(); });
    for (const [ctx, oldI, newI] of [[octx, oldC, newC], [hctx, oldH, newH]]) {
      tctx.globalCompositeOperation = 'source-over'; tctx.clearRect(0, 0, cw, chh);
      tctx.drawImage(newI, 0, 0);
      tctx.globalCompositeOperation = 'destination-in'; tctx.drawImage(mask, 0, 0, cw, chh);
      ctx.drawImage(oldI, 0, 0); ctx.drawImage(tmp, 0, 0);
    }
    chMap.needsUpdate = chBump.needsUpdate = sideMap.needsUpdate = sideBump.needsUpdate = true;
    maskP = p; maskDirty = false;
  }

  // ---- lead flashing: front apron (hinged), side steps, back gutter --------------
  const sFront = sOf(CH.z + CH.d / 2);
  const upstand = shadowy(new THREE.Mesh(new THREE.BoxGeometry(CH.w + 0.06, 0.16, 0.012), leadMat));
  upstand.position.set(CH.x, roofY(CH.z + CH.d / 2) + 0.12, CH.z + CH.d / 2 + 0.008); house.add(upstand);
  const apron = new THREE.Group();
  apron.position.set(CH.x, 0.058, sFront + 0.012);
  front.g.add(apron);
  const flap = shadowy(new THREE.Mesh(new THREE.BoxGeometry(CH.w + 0.14, 0.01, 0.24), leadMat));
  flap.position.z = 0.12; apron.add(flap);
  const roll = shadowy(new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, CH.w + 0.14, 8), leadMat));
  roll.rotation.z = Math.PI / 2; roll.position.set(0, 0.006, 0.24); apron.add(roll);
  const sideLen = sOf(CH.z + CH.d / 2) - sOf(CH.z - CH.d / 2) + 0.06;
  [-1, 1].forEach((sd) => {
    const strip = shadowy(new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.012, sideLen), leadMat));
    strip.position.set(CH.x + sd * (CH.w / 2 + 0.05), 0.06, (chimneyS[0] + chimneyS[1]) / 2 + 0.01); front.g.add(strip);
    for (let i = 0; i < 4; i++) {
      const z = CH.z - CH.d / 2 + 0.06 + i * 0.14;
      const step = shadowy(new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.13, 0.15), leadMat));
      step.position.set(CH.x + sd * (CH.w / 2 + 0.006), roofY(z) + 0.11, z); house.add(step);
    }
  });
  const backGut = shadowy(new THREE.Mesh(new THREE.BoxGeometry(CH.w + 0.12, 0.1, 0.012), leadMat));
  backGut.position.set(CH.x, roofY(CH.z - CH.d / 2) + 0.1, CH.z - CH.d / 2 - 0.008); house.add(backGut);

  // ---- rain ------------------------------------------------------------------------
  const RN = R(380, 760);
  const rpos = new Float32Array(RN * 6), rvel = new Float32Array(RN);
  const box = { x0: -2.6, x1: 2.6, z0: -2.0, z1: 2.4, top: 3.6 };
  function dropAt(i, top) {
    const x = lerp(box.x0, box.x1, Math.random()), z = lerp(box.z0, box.z1, Math.random());
    const y = top ? box.top + Math.random() * 0.6 : lerp(-1.3, box.top, Math.random());
    rpos.set([x, y, z, x - 0.01, y + 0.16, z - 0.02], i * 6); rvel[i] = 6 + Math.random() * 2.5;
  }
  for (let i = 0; i < RN; i++) dropAt(i, false);
  const rgeo = new THREE.BufferGeometry(); rgeo.setAttribute('position', new THREE.BufferAttribute(rpos, 3));
  const rmat = new THREE.LineBasicMaterial({ color: 0xcfdbe4, transparent: true, opacity: 0.5, depthWrite: false });
  const rain = new THREE.LineSegments(rgeo, rmat); rain.frustumCulled = false; house.add(rain);
  // splashes where drops land
  const SN = R(60, 120), spos = new Float32Array(SN * 3), slife = new Float32Array(SN);
  const sgeo = new THREE.BufferGeometry(); sgeo.setAttribute('position', new THREE.BufferAttribute(spos, 3));
  const smat = new THREE.PointsMaterial({ map: softDot(), size: 0.05, color: 0xe6eef3, transparent: true, depthWrite: false, opacity: 0.7 });
  const splash = new THREE.Points(sgeo, smat); splash.frustumCulled = false; house.add(splash);
  let sNext = 0;
  function stepRain(dt, amt) {
    rain.visible = splash.visible = amt > 0.01;
    rmat.opacity = 0.55 * amt; smat.opacity = 0.75 * amt;
    for (let i = 0; i < SN; i++) { slife[i] -= dt * 3; if (slife[i] <= 0) spos[i * 3 + 1] = -99; }
    if (!rain.visible || !dt) { sgeo.attributes.position.needsUpdate = true; return; }
    for (let i = 0; i < RN; i++) {
      const o = i * 6, dy = rvel[i] * dt;
      rpos[o + 1] -= dy; rpos[o + 4] -= dy; rpos[o] -= dy * 0.06; rpos[o + 3] -= dy * 0.06;
      const x = rpos[o], z = rpos[o + 2];
      let floor = -WALL_H - 0.05;
      if (Math.abs(x) < W / 2 && z < 1.12 && z > RIDGE.z - LB * COS) floor = roofY(z) + 0.05;
      if (Math.abs(x - CH.x) < CH.w / 2 && Math.abs(z - CH.z) < CH.d / 2) floor = CH.y1;
      if (rpos[o + 1] < floor) {
        if (Math.random() < amt * 0.5) { const s = sNext++ % SN; spos.set([x, floor + 0.01, z], s * 3); slife[s] = 1; }
        dropAt(i, true);
      }
    }
    rgeo.attributes.position.needsUpdate = true; sgeo.attributes.position.needsUpdate = true;
  }

  // ---- adaptive quality ---------------------------------------------------------------
  let slowFrames = 0, lastNow = 0, lowered = false;
  function realDt() {
    const now = performance.now(), d = lastNow ? (now - lastNow) / 1000 : 0.016; lastNow = now;
    if (!lowered && d > 0.07) { slowFrames++; if (slowFrames > 40) { lowered = true; renderer.setPixelRatio(1); renderer.shadowMap.autoUpdate = false; renderer.shadowMap.needsUpdate = true; } }
    return Math.min(0.05, d);
  }

  // ---- pointer -----------------------------------------------------------------------
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), local = new THREE.Vector3();
  const slopePlane = new THREE.Mesh(new THREE.PlaneGeometry(W, L), new THREE.MeshBasicMaterial({ visible: false }));
  slopePlane.rotation.x = -Math.PI / 2; slopePlane.position.set(0, 0.06, L / 2); front.g.add(slopePlane);
  let clock = 0, pointerAt = -10, touched = false, pS = 0, pX = 0, chimHitAt = -10, leadHitAt = -10;
  const hint = el.querySelector('[data-hint]');
  function onPointer(ev) {
    if (ev.pointerType === 'touch' && ev.type === 'pointermove' && !ev.isPrimary) return;
    const r = canvas.getBoundingClientRect();
    ndc.set(((ev.clientX - r.left) / r.width) * 2 - 1, -(((ev.clientY - r.top) / r.height) * 2 - 1));
    ray.setFromCamera(ndc, camera);
    let hit = false;
    if (kind === 'chimney' || mode === 'scroll') {
      const h = ray.intersectObject(stack, false)[0];
      if (h && h.uv) { strokes.push([h.uv.x, 1 - h.uv.y]); if (strokes.length > 260) strokes.shift(); maskDirty = true; chimHitAt = clock; hit = true; }
    }
    if (!hit && (kind === 'lead' || mode === 'scroll')) {
      const h = ray.intersectObjects([flap, upstand, roll], false)[0];
      if (h) { leadHitAt = clock; hit = true; }
    }
    if (!hit && (kind === 'roof' || mode === 'scroll')) {
      const h = ray.intersectObject(slopePlane, false)[0];
      if (h) { local.copy(h.point); front.g.worldToLocal(local); pX = local.x; pS = local.z; pointerAt = clock; hit = true; }
    }
    if (hit && !touched) { touched = true; hint && hint.classList.add('is-done'); }
  }
  canvas.addEventListener('pointermove', onPointer, { passive: true });
  canvas.addEventListener('pointerdown', (ev) => { lastNow = 0; onPointer(ev); }, { passive: true });

  // ---- camera ------------------------------------------------------------------------
  const camPos = new THREE.Vector3(), camTgt = new THREE.Vector3(), a = new THREE.Vector3(), b = new THREE.Vector3();
  let layout = 'box', lastShift = -1, cFloat = 0;
  function applyOffset(force) {
    const { w, h } = stage.size;
    if (layout === 'side') { if (force) camera.setViewOffset(w, h, -w * 0.17, 0, w, h); }
    else if (layout === 'bottom') {
      const shift = lerp(0.24, 0.14, clamp(cFloat / (cams.length - 1)));
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
    const need = (fit * (layout === 'side' ? 1.45 : 1)) / (Math.tan((camera.fov * Math.PI) / 360) * Math.min(stage.size.aspect, 1.9));
    a.sub(camTgt);
    camPos.copy(camTgt).addScaledVector(a.normalize(), Math.max(a.length() || 1, need));
  }
  let yaw = 0, yawT = 0;
  canvas.addEventListener('pointermove', (ev) => {
    if (ev.pointerType !== 'mouse') return;
    const r = canvas.getBoundingClientRect();
    yawT = ((ev.clientX - r.left) / r.width - 0.5) * 0.16;
  }, { passive: true });

  // ---- the loop ------------------------------------------------------------------------
  const sky = el;
  let fix = 0, dress = 0, point = 0, dry = 0, lastSky = -1;
  const CYCLE = 13;
  stage.onFrame((fdt) => {
    const dt = fdt > 0 ? realDt() : 0;
    clock += dt;
    let tFix = 1, tDress = 1, tPoint = 1, tDry = 1, cam = 0;
    if (mode === 'scroll' && track) {
      const p = scrollProgress(track);
      tFix = smoothstep(0.3, 0.5, p);
      tDress = smoothstep(0.56, 0.7, p);
      tPoint = smoothstep(0.62, 0.8, p);
      tDry = smoothstep(0.8, 0.96, p);
      cFloat = damp(cFloat, p * (cams.length - 1), 5, dt || 1);
      cam = cFloat;
      applyOffset(false);
    } else if (stage.reduced) {
      tDry = 1;
    } else {
      const t = clock % CYCLE;
      const prog = t < 1.5 ? 0 : t < 7.5 ? (t - 1.5) / 6 : t < 11.5 ? 1 : 1 - (t - 11.5) / 1.5;
      if (kind === 'roof') tFix = prog;
      if (kind === 'lead') tDress = prog;
      if (kind === 'chimney') tPoint = prog;
      tDry = smoothstep(0.75, 1, prog);
    }
    if (clock - leadHitAt < 1.2) tDress = 1;
    const k = dt ? 1 : 1000;
    fix = damp(fix, tFix, 4 * k, dt || 1); dress = damp(dress, tDress, 5 * k, dt || 1);
    point = damp(point, tPoint, 4 * k, dt || 1); dry = damp(dry, tDry, 2.5 * k, dt || 1);

    setLoose(fix);
    apron.rotation.x = -(1 - dress) * 0.85;
    if (maskDirty || Math.abs(point - maskP) > 0.004) drawChimney(point);

    // pointer inspection: slates near the pointer lift on their nails
    const lifting = clock - pointerAt < 0.9;
    let moved = false;
    for (const it of front.items) {
      const d = Math.hypot((it.x - pX) / 0.36, (it.s - pS) / 0.3);
      it.liftT = lifting && d < 1 ? 0.32 * (1 - d) : 0;
      if (Math.abs(it.lift - it.liftT) > 0.001) { it.lift = damp(it.lift, it.liftT, 9, dt || 1); moved = true; }
    }
    if (moved) writeSlope(front);

    // weather
    stepRain(dt, 1 - dry);
    slateMat.roughness = lerp(0.34, 0.74, dry);
    slateMat.color.setScalar(lerp(0.78, 1, dry));
    key.intensity = lerp(1.1, 2.7, dry);
    hemi.intensity = lerp(0.75, 0.5, dry);
    if (Math.abs(dry - lastSky) > 0.01) { lastSky = dry; sky.style.setProperty('--dry', dry.toFixed(3)); }

    if (!stage.reduced) house.position.y = Math.sin(clock * 0.5) * 0.02;
    yaw = damp(yaw, yawT, 3, dt || 1); house.rotation.y = yaw;
    camFor(cam);
    if (!stage.reduced && mode !== 'scroll') camPos.x += Math.sin(clock * 0.2) * 0.25;
    camera.position.copy(camPos); camera.lookAt(camTgt);
  });

  stage.start();
  el.classList.add('is-live');
}
