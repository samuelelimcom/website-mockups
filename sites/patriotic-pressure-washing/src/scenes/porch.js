// "Back to its color": a corner of a real back porch. Weathered, silver-grey
// deck boards are washed along the grain, one board at a time, until the warm
// cedar comes back. Scroll drives it on the home page; visitors can also drag
// the wand along any board (it snaps to the board, like the real technique).
// Service pages reuse the stage for vinyl siding over brick and a concrete walk.
import { createStage, THREE, clamp, lerp, smoothstep, damp, scrollProgress } from '../lib/stage.js';
import { surfaceMaps, grimeMap, softDot, fbm } from '../lib/textures.js';

// ---------------------------------------------------------------- textures
function hash(x, y, s = 0) {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(s | 0, 1442695041);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}
const frac = (v) => v - Math.floor(v);
const small = () => Math.min(window.innerWidth, window.innerHeight) < 600;

// fn(u, v, x, y) -> [r, g, b, a, height]
function paint(w, h, fn, wantHeight) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const ctx = c.getContext('2d'), img = ctx.createImageData(w, h);
  let hc, hctx, himg;
  if (wantHeight) { hc = document.createElement('canvas'); hc.width = w; hc.height = h; hctx = hc.getContext('2d'); himg = hctx.createImageData(w, h); }
  for (let y = 0, i = 0; y < h; y++) {
    for (let x = 0; x < w; x++, i += 4) {
      const p = fn(x / w, y / h, x, y);
      img.data[i] = clamp(p[0]) * 255; img.data[i + 1] = clamp(p[1]) * 255; img.data[i + 2] = clamp(p[2]) * 255; img.data[i + 3] = clamp(p[3]) * 255;
      if (wantHeight) { const g = clamp(p[4]) * 255; himg.data[i] = himg.data[i + 1] = himg.data[i + 2] = g; himg.data[i + 3] = 255; }
    }
  }
  ctx.putImageData(img, 0, 0);
  if (wantHeight) hctx.putImageData(himg, 0, 0);
  return [c, hc];
}
function tex(c, srgb, aniso, wrap) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = aniso;
  if (wrap) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

const GAP = 0.035; // fraction of a board's width that is gap (each side)
function cedar(B) {
  return (u, v, x, y) => {
    const k = Math.floor(v * B), t = frac(v * B);
    if (t < GAP || t > 1 - GAP) return [0.07, 0.05, 0.035, 1, 0];
    const seed = k * 13 + 5;
    const warp = fbm(u * 2.2, t * 1.4 + k, seed, 3) * 2.6;
    const ring = Math.sin((t * 3.2 + warp + u * 0.35 + hash(k, 0, 9) * 4) * Math.PI * 6);
    const fibre = fbm(u * 90, t * 7 + k * 3, seed + 1, 2);
    const tone = 0.86 + hash(k, 1, 2) * 0.24;
    const lt = (0.5 + 0.5 * ring) ** 3;
    let r = (0.62 - lt * 0.14 + (fibre - 0.5) * 0.08) * tone;
    let g = (0.36 - lt * 0.1 + (fibre - 0.5) * 0.05) * tone;
    let b = (0.19 - lt * 0.06 + (fibre - 0.5) * 0.03) * tone;
    let h = 0.55 + lt * 0.25 + (fibre - 0.5) * 0.4;
    // screw heads over the joists
    for (const j of [0.08, 0.5, 0.92]) for (const s of [0.3, 0.7]) {
      const d = Math.hypot((u - j) * 4.4, (t - s) * (1 / B) * 2.6 * 1.0);
      if (d < 0.012) { r = g = b = 0.12; h = 0.2; }
    }
    // soft roll-off at the board edges
    const e = Math.min(t - GAP, 1 - GAP - t);
    if (e < 0.06) { const f = 0.75 + (e / 0.06) * 0.25; r *= f; g *= f; b *= f; h *= f; }
    return [r, g, b, 1, h];
  };
}
function weathered(B) {
  return (u, v) => {
    const k = Math.floor(v * B), t = frac(v * B);
    if (t < GAP || t > 1 - GAP) return [0, 0, 0, 0];
    const streak = fbm(u * 70, t * 5 + k * 7, 41, 3);
    const blot = fbm(u * 3, v * 3, 77, 4);
    const edge = Math.exp(-(t - GAP) * 14) + Math.exp(-(1 - GAP - t) * 14);
    const mildew = clamp(edge * 0.9 + (blot > 0.6 ? (blot - 0.6) * 3 : 0));
    const grey = 0.5 + (streak - 0.5) * 0.22 + hash(k, 3, 3) * 0.08;
    const r = lerp(grey, 0.16, mildew * 0.75), g = lerp(grey * 0.99, 0.17, mildew * 0.75), b = lerp(grey * 0.95, 0.12, mildew * 0.75);
    return [r, g, b, clamp(0.86 + streak * 0.12 + mildew * 0.1, 0, 0.97)];
  };
}
function brick(u, v, x, y) {
  const courses = 9, per = 3;
  const row = Math.floor(v * courses), t = frac(v * courses);
  const s = u * per + (row % 2) * 0.5, col = Math.floor(s), q = frac(s);
  const mortar = t < 0.1 || q < 0.035;
  if (mortar) { const m = 0.6 + fbm(u * 40, v * 40, 3, 2) * 0.12; return [m, m * 0.96, m * 0.9, 1, 0.1]; }
  const tone = hash(col, row, 4), n = fbm(u * 30, v * 30, 8, 3), sp = hash(x, y, 6);
  const r = 0.5 + tone * 0.16 + (n - 0.5) * 0.12 - (sp > 0.97 ? 0.15 : 0);
  return [r, r * 0.42 + tone * 0.04, r * 0.3, 1, 0.6 + n * 0.35];
}
function grass(u, v, x, y) {
  const n = fbm(u * 14, v * 14, 5, 4), blade = hash(x, y, 2);
  const g = 0.32 + n * 0.16 + (blade - 0.5) * 0.12;
  return [g * 0.55, g, g * 0.32, 1, blade * 0.8 + n * 0.2];
}

// ------------------------------------------------------------------ props
function std(o) { return new THREE.MeshStandardMaterial(o); }
function box(w, h, d, mat, x, y, z, parent, cast = true) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z); m.castShadow = cast; m.receiveShadow = true; parent.add(m); return m;
}

function buildWand() {
  const g = new THREE.Group();
  const steel = std({ color: 0xd9dcdf, metalness: 1, roughness: 0.22 });
  const black = std({ color: 0x15161a, metalness: 0.2, roughness: 0.6 });
  const red = std({ color: 0xa8322a, metalness: 0.15, roughness: 0.38 });
  const brass = std({ color: 0xc9a15a, metalness: 1, roughness: 0.3 });
  const add = (geo, mat, x, y, z, rx = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.x = rx; m.castShadow = true; g.add(m); return m; };
  add(new THREE.BoxGeometry(0.05, 0.05, 0.03), black, 0, 0.025, 0);                 // flat-fan tip
  add(new THREE.CylinderGeometry(0.022, 0.022, 0.06, 16), brass, 0, 0.08, 0);        // quick connect
  add(new THREE.CylinderGeometry(0.016, 0.016, 1.3, 14), steel, 0, 0.76, 0);         // lance
  add(new THREE.CylinderGeometry(0.03, 0.03, 0.14, 18), black, 0, 1.36, 0);          // handle
  add(new THREE.BoxGeometry(0.08, 0.3, 0.11), red, 0, 1.58, 0);                       // gun body
  add(new THREE.BoxGeometry(0.068, 0.26, 0.085), black, 0, 1.56, 0.14, -0.5);        // grip
  add(new THREE.BoxGeometry(0.02, 0.09, 0.03), black, 0, 1.6, 0.07, -0.3);           // trigger
  const hose = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 1.72, 0.18), new THREE.Vector3(0, 1.95, 0.42), new THREE.Vector3(0.25, 2.1, 0.9), new THREE.Vector3(0.9, 1.9, 1.6),
  ]);
  add(new THREE.TubeGeometry(hose, 24, 0.022, 8), black, 0, 0, 0);
  return g;
}

function buildFan(width, h) {
  const c = document.createElement('canvas'); c.width = 4; c.height = 64;
  const ctx = c.getContext('2d'), grad = ctx.createLinearGradient(0, 0, 0, 64);
  grad.addColorStop(0, '#fff'); grad.addColorStop(0.6, '#888'); grad.addColorStop(1, '#333');
  ctx.fillStyle = grad; ctx.fillRect(0, 0, 4, 64);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 0, -h, -width / 2, 0, -h, width / 2], 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute([0.5, 1, 0, 0, 1, 0], 2));
  const mat = new THREE.MeshBasicMaterial({ color: 0xe9f6fb, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide, alphaMap: new THREE.CanvasTexture(c) });
  const fan = new THREE.Mesh(geo, mat); fan.renderOrder = 3;
  return { fan, mat, h };
}

// ---------------------------------------------------------------- variants
function buildDeck(group, aniso) {
  const W = 4.4, H = 2.6, B = 8, bw = H / B;
  const w = small() ? 640 : 896, h = Math.round(w / (W / H));
  const [wc, wh] = paint(w, h, cedar(B), true);
  const [gc] = paint(Math.round(w * 0.7), Math.round(h * 0.7), weathered(B), false);
  const top = new THREE.Mesh(new THREE.PlaneGeometry(W, H), std({ map: tex(wc, true, aniso), bumpMap: tex(wh, false, aniso), bumpScale: 1.6, roughness: 0.78 }));
  top.rotation.x = -Math.PI / 2; top.receiveShadow = true; group.add(top);

  const endWood = std({ color: 0x8d8a83, roughness: 0.9 });
  for (let k = 0; k < B; k++) box(W, 0.035, bw * (1 - GAP * 2), endWood, 0, -0.019, -H / 2 + (k + 0.5) * bw, group);
  const frame = std({ color: 0x7c766d, roughness: 0.92 });
  box(W + 0.04, 0.2, 0.04, frame, 0, -0.14, H / 2 + 0.02, group);       // rim joist, front
  box(0.04, 0.2, H, frame, W / 2 + 0.02, -0.14, 0, group);              // rim joist, side
  for (const [x, z] of [[-W / 2 + 0.06, H / 2 - 0.06], [W / 2 - 0.06, H / 2 - 0.06], [0, H / 2 - 0.06]]) box(0.1, 0.55, 0.1, frame, x, -0.5, z, group);

  // railing along the back and left side
  const rail = std({ color: 0x8d8a83, roughness: 0.85 });
  const RH = 0.95;
  for (const [x, z] of [[-W / 2 + 0.05, -H / 2 + 0.05], [W / 2 - 0.05, -H / 2 + 0.05], [-W / 2 + 0.05, H / 2 - 0.05], [0.2, -H / 2 + 0.05]]) box(0.09, RH, 0.09, rail, x, RH / 2, z, group);
  box(W, 0.04, 0.14, rail, 0, RH + 0.02, -H / 2 + 0.05, group);
  box(W, 0.04, 0.06, rail, 0, 0.12, -H / 2 + 0.05, group);
  box(0.14, 0.04, H, rail, -W / 2 + 0.05, RH + 0.02, 0, group);
  box(0.06, 0.04, H, rail, -W / 2 + 0.05, 0.12, 0, group);
  const bal = [];
  for (let x = -W / 2 + 0.2; x < W / 2 - 0.12; x += 0.14) bal.push([x, -H / 2 + 0.05]);
  for (let z = -H / 2 + 0.2; z < H / 2 - 0.12; z += 0.14) bal.push([-W / 2 + 0.05, z]);
  const inst = new THREE.InstancedMesh(new THREE.BoxGeometry(0.035, RH - 0.14, 0.035), rail, bal.length);
  const m4 = new THREE.Matrix4();
  bal.forEach(([x, z], i) => inst.setMatrixAt(i, m4.makeTranslation(x, 0.14 + (RH - 0.14) / 2 - 0.02, z)));
  inst.castShadow = true; inst.receiveShadow = true; group.add(inst);

  // brick steps
  const [bc, bh] = paint(256, 256, brick, true);
  const bmap = tex(bc, true, aniso, true), bbump = tex(bh, false, aniso, true);
  const cap = std({ color: 0xb9b3a8, roughness: 0.92 });
  const step = (sw, sh, sd, y, z) => {
    const mat = std({ map: bmap.clone(), bumpMap: bbump.clone(), bumpScale: 2, roughness: 0.9 });
    mat.map.repeat.set(sw / 0.6, sh / 0.6); mat.bumpMap.repeat.copy(mat.map.repeat);
    mat.map.needsUpdate = mat.bumpMap.needsUpdate = true;
    const m = new THREE.Mesh(new THREE.BoxGeometry(sw, sh, sd), [mat, mat, cap, mat, mat, mat]);
    m.position.set(1.15, y, z); m.castShadow = m.receiveShadow = true; group.add(m);
  };
  step(1.3, 0.27, 0.42, -0.415, H / 2 + 0.66);
  step(1.3, 0.27, 0.3, -0.145, H / 2 + 0.19);

  // a planter in the back corner
  const pot = new THREE.Mesh(new THREE.LatheGeometry([[0.001, 0], [0.16, 0], [0.2, 0.05], [0.24, 0.34], [0.27, 0.36], [0.27, 0.4], [0.001, 0.4]].map(([a, b]) => new THREE.Vector2(a, b)), 28), std({ color: 0xb4603d, roughness: 0.8 }));
  pot.position.set(1.55, 0, -0.78); pot.castShadow = pot.receiveShadow = true; group.add(pot);
  const leaf = std({ color: 0x4f7a35, roughness: 0.7, flatShading: true });
  for (let i = 0; i < 7; i++) {
    const a = i * 2.4, r = i ? 0.13 : 0;
    const l = new THREE.Mesh(new THREE.IcosahedronGeometry(0.17 - i * 0.006, 0), leaf);
    l.position.set(1.55 + Math.cos(a) * r, 0.52 + (i ? 0.02 : 0.12) + hash(i, 2, 1) * 0.08, -0.78 + Math.sin(a) * r);
    l.rotation.set(a, a * 0.7, 0); l.castShadow = true; group.add(l);
  }

  return {
    W, H, top, rows: B, snap: true, grime: tex(gc, true, aniso), ground: -0.775, fanW: bw * 0.85, sprayOpacity: 0.55,
    tint: [endWood, frame, rail].map((m) => [m, new THREE.Color(0x8d8a83).multiplyScalar(m === frame ? 0.88 : 1), new THREE.Color(0xa86a3a).multiplyScalar(m === frame ? 0.8 : 1)]),
    rot: [0, -0.38],
    cams: [
      { p: [4.4, 3.5, 5.8], t: [0, -0.1, 0.3], fit: 3.3 },
      { p: [-0.9, 1.0, 2.6], t: [-0.6, 0, 0], fit: 1.15 },
      { p: [3.0, 3.0, 4.6], t: [0.1, 0, 0.2], fit: 2.8 },
      { p: [0.8, 6.8, 4.6], t: [0, 0, 0.4], fit: 3.4 },
    ],
  };
}

function buildSiding(group, aniso) {
  const W = 4.0, H = 2.5;
  const maps = surfaceMaps(THREE, 'siding', W / H, aniso);
  const top = new THREE.Mesh(new THREE.PlaneGeometry(W, H), std({ map: maps.map, bumpMap: maps.bumpMap, bumpScale: 1.8, roughness: 0.6 }));
  top.rotation.x = -Math.PI / 2; top.receiveShadow = true; group.add(top);
  box(W, 0.12, H, std({ color: 0xd9d6cc, roughness: 0.9 }), 0, -0.061, 0, group);
  const trim = std({ color: 0xf4f2ec, roughness: 0.5 });
  box(0.14, 0.05, H + 0.1, trim, -W / 2 - 0.07, 0.02, 0, group);
  box(0.14, 0.05, H + 0.1, trim, W / 2 + 0.07, 0.02, 0, group);
  // window
  const wx = 0.85, wz = -0.2, ww = 0.9, wh = 1.05;
  box(ww + 0.16, 0.05, 0.08, trim, wx, 0.03, wz - wh / 2 - 0.04, group);
  box(ww + 0.26, 0.07, 0.1, trim, wx, 0.04, wz + wh / 2 + 0.05, group);
  box(0.08, 0.05, wh, trim, wx - ww / 2 - 0.04, 0.03, wz, group);
  box(0.08, 0.05, wh, trim, wx + ww / 2 + 0.04, 0.03, wz, group);
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(ww, wh), std({ color: 0x1d2a3a, roughness: 0.05, metalness: 0.7 }));
  glass.rotation.x = -Math.PI / 2; glass.position.set(wx, 0.006, wz); group.add(glass);
  box(0.03, 0.04, wh, trim, wx, 0.02, wz, group); box(ww, 0.04, 0.03, trim, wx, 0.02, wz, group);
  // brick skirt below the siding
  const [bc, bh] = paint(256, 256, brick, true);
  const bm = std({ map: tex(bc, true, aniso, true), bumpMap: tex(bh, false, aniso, true), bumpScale: 2, roughness: 0.9 });
  bm.map.repeat.set((W + 0.3) / 0.6, 0.55 / 0.6); bm.bumpMap.repeat.copy(bm.map.repeat);
  box(W + 0.3, 0.2, 0.55, bm, 0, 0.0, H / 2 + 0.29, group);
  return {
    W, H, top, rows: 6, snap: false, grime: grimeMap(THREE, 'siding', W / H, aniso), ground: -1.85, fanW: 0.5, sprayOpacity: 0.4,
    tint: [], rot: [Math.PI / 2 - 0.05, -0.34],
    cams: [{ p: [2.2, 0.4, 7.2], t: [-0.1, -0.2, 0], fit: 2.95 }],
  };
}

function buildWalk(group, aniso) {
  const W = 4.4, H = 1.7;
  const maps = surfaceMaps(THREE, 'concrete', W / H, aniso);
  const top = new THREE.Mesh(new THREE.PlaneGeometry(W, H), std({ map: maps.map, bumpMap: maps.bumpMap, bumpScale: 1, roughness: 0.93 }));
  top.rotation.x = -Math.PI / 2; top.receiveShadow = true; group.add(top);
  box(W, 0.18, H, std({ color: 0x9a978f, roughness: 0.95 }), 0, -0.091, 0, group);
  const [bc, bh] = paint(256, 256, brick, true);
  const edge = std({ map: tex(bc, true, aniso, true), bumpMap: tex(bh, false, aniso, true), bumpScale: 2, roughness: 0.9 });
  edge.map.repeat.set(W / 0.6, 0.22 / 0.6 * 3); edge.bumpMap.repeat.copy(edge.map.repeat);
  for (const s of [-1, 1]) box(W, 0.2, 0.22, edge, 0, -0.08, s * (H / 2 + 0.11), group);
  const [gc, gh] = paint(256, 256, grass, true);
  const lawn = std({ map: tex(gc, true, aniso, true), bumpMap: tex(gh, false, aniso, true), bumpScale: 3, roughness: 1 });
  lawn.map.repeat.set(5, 1.2); lawn.bumpMap.repeat.copy(lawn.map.repeat);
  for (const s of [-1, 1]) box(W, 0.16, 0.9, lawn, 0, -0.105, s * (H / 2 + 0.22 + 0.45), group, false);
  return {
    W, H, top, rows: 4, snap: false, grime: grimeMap(THREE, 'concrete', W / H, aniso), ground: -0.2, fanW: 0.34, sprayOpacity: 0.6,
    tint: [], rot: [0, -0.42],
    cams: [{ p: [3.6, 3.4, 5.2], t: [0, 0, 0], fit: 2.75 }],
  };
}

const BUILD = { deck: buildDeck, siding: buildSiding, walk: buildWalk };

// ------------------------------------------------------------------- mount
export function mount(el) {
  const canvas = el.querySelector('canvas');
  const kind = el.dataset.surface in BUILD ? el.dataset.surface : 'deck';
  const mode = el.dataset.mode === 'scroll' ? 'scroll' : 'auto';
  const track = mode === 'scroll' ? document.querySelector(el.dataset.track) : null;

  let stage;
  try { stage = createStage(el, canvas, { exposure: 1.0 }); } catch (e) { return; }
  const { scene, camera, renderer } = stage;
  stage.key.color.set(0xffe9c9); stage.key.intensity = 2.9;
  const aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());

  const group = new THREE.Group();
  group.rotation.order = 'YXZ';
  scene.add(group);
  const cfg = BUILD[kind](group, aniso);
  group.rotation.set(cfg.rot[0], cfg.rot[1], 0);
  const { W, H, top, rows } = cfg;

  // the weathered layer sits a hair above; its alphaMap is the wash mask
  const mw = 384, mh = Math.round(384 / (W / H)), rowH = mh / rows;
  const mcan = document.createElement('canvas'); mcan.width = mw; mcan.height = mh;
  const mctx = mcan.getContext('2d');
  const maskTex = new THREE.CanvasTexture(mcan);
  const grimeMat = std({ map: cfg.grime, alphaMap: maskTex, transparent: true, roughness: 1, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
  const grime = new THREE.Mesh(new THREE.PlaneGeometry(W, H), grimeMat);
  grime.rotation.x = -Math.PI / 2; grime.position.y = 0.003; grime.receiveShadow = true; grime.renderOrder = 1;
  group.add(grime);

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.ShadowMaterial({ opacity: 0.22, color: 0x3a2a14 }));
  ground.rotation.x = -Math.PI / 2; ground.position.y = cfg.ground; ground.receiveShadow = true; scene.add(ground);

  // wand + flat fan + mist
  const wand = buildWand();
  const spray = buildFan(cfg.fanW, 0.5);
  spray.fan.position.y = 0;
  wand.add(spray.fan);
  group.add(wand);
  const away = new THREE.Vector3(-0.28, 1, 0.5).normalize();
  wand.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), away);

  const N = stage.reduced ? 0 : (stage.coarse ? 50 : 100);
  const mpos = new Float32Array(N * 3).fill(-99), mvel = new Float32Array(N * 3), mlife = new Float32Array(N);
  const mgeo = new THREE.BufferGeometry();
  mgeo.setAttribute('position', new THREE.BufferAttribute(mpos, 3));
  const mist = new THREE.Points(mgeo, new THREE.PointsMaterial({ size: 0.16, map: softDot(THREE), transparent: true, opacity: 0.65, depthWrite: false, color: 0xf2f7f8 }));
  mist.frustumCulled = false; mist.renderOrder = 4; group.add(mist);

  // ---- wash mask: serpentine passes; deck passes are clipped to one board
  let strokes = [], strokePts = 0, maskDirty = true, drawn = -1;
  function stroke(k, x0, x1) {
    mctx.save();
    if (cfg.snap) { mctx.beginPath(); mctx.rect(-30, k * rowH + 0.5, mw + 60, rowH - 1); mctx.clip(); }
    mctx.beginPath(); mctx.moveTo(x0, (k + 0.5) * rowH); mctx.lineTo(x1, (k + 0.5) * rowH); mctx.stroke();
    mctx.restore();
  }
  function drawMask(p) {
    mctx.shadowBlur = 0; mctx.fillStyle = '#fff'; mctx.fillRect(0, 0, mw, mh);
    mctx.strokeStyle = '#000'; mctx.lineCap = 'round'; mctx.lineJoin = 'round';
    mctx.shadowColor = '#000'; mctx.shadowBlur = cfg.snap ? 10 : 7; mctx.lineWidth = rowH * (cfg.snap ? 1.2 : 1.04);
    const t = p * rows, full = Math.min(rows, Math.floor(t + 1e-6));
    for (let k = 0; k < rows; k++) {
      if (k < full) stroke(k, -30, mw + 30);
      else if (k === full && t - full > 0.004) {
        const f = t - full;
        if (k % 2 === 0) stroke(k, -30, f * mw); else stroke(k, mw + 30, (1 - f) * mw);
      }
    }
    mctx.lineWidth = rowH * (cfg.snap ? 1.2 : 0.85);
    for (const s of strokes) {
      if (cfg.snap) {
        const xs = s.slice(1);
        stroke(s[0], Math.min(...xs) - 4, Math.max(...xs) + 4);
      } else {
        mctx.beginPath(); mctx.moveTo(s[0], s[1]);
        if (s.length === 2) mctx.lineTo(s[0] + 0.1, s[1]);
        for (let i = 2; i < s.length; i += 2) mctx.lineTo(s[i], s[i + 1]);
        mctx.stroke();
      }
    }
    maskTex.needsUpdate = true; drawn = p; maskDirty = false;
  }
  function headUV(p) {
    const t = clamp(p) * rows, row = Math.min(rows - 1, Math.floor(t)), f = clamp(t - row);
    return [row % 2 === 0 ? f : 1 - f, (row + 0.5) / rows];
  }

  // ---- pointer / touch washing
  let clock = 0;
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  let pointerAt = -10, pointerUV = [0.5, 0.5], newStroke = true, touched = false, lastK = -1;
  const hint = el.querySelector('[data-hint]');
  function onPointer(e) {
    if (e.pointerType === 'touch' && e.type === 'pointermove' && !e.isPrimary) return;
    const r = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -(((e.clientY - r.top) / r.height) * 2 - 1));
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObject(top, false)[0];
    if (!hit) { newStroke = true; return; }
    const x = hit.uv.x * mw, y = (1 - hit.uv.y) * mh;
    if (cfg.snap) {
      // stay on the board you started on unless you clearly move off it
      let k = Math.min(rows - 1, Math.max(0, Math.floor(y / rowH)));
      if (!newStroke && lastK >= 0 && Math.abs(y / rowH - (lastK + 0.5)) < 1.7) k = lastK;
      if (newStroke || k !== lastK || !strokes.length) { strokes.push([k, x]); newStroke = false; lastK = k; }
      else strokes[strokes.length - 1].push(x);
      pointerUV = [hit.uv.x, (k + 0.5) / rows];
    } else {
      if (newStroke || !strokes.length) { strokes.push([x, y]); newStroke = false; }
      else strokes[strokes.length - 1].push(x, y);
      pointerUV = [hit.uv.x, 1 - hit.uv.y];
    }
    strokePts++;
    if (strokePts > 600) { strokePts -= strokes[0].length / 2; strokes.shift(); }
    pointerAt = clock; maskDirty = true;
    if (!touched) { touched = true; hint && hint.classList.add('is-done'); }
  }
  canvas.addEventListener('pointermove', onPointer, { passive: true });
  canvas.addEventListener('pointerdown', (e) => { newStroke = true; onPointer(e); }, { passive: true });
  canvas.addEventListener('pointerleave', () => { newStroke = true; }, { passive: true });

  // ---- camera; in the story the copy sits beside (desktop) or under (phone) the model
  const camPos = new THREE.Vector3(), camTgt = new THREE.Vector3(), a = new THREE.Vector3(), b = new THREE.Vector3();
  let layout = 'box', lastShift = -1, cFloat = 0;
  function applyOffset(force) {
    const { w, h } = stage.size;
    if (layout === 'side') { if (force) camera.setViewOffset(w, h, -w * 0.21, 0, w, h); }
    else if (layout === 'bottom') {
      const shift = lerp(0.3, 0.2, clamp(cFloat / 3));
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
    const n = cfg.cams.length;
    const seg = Math.min(Math.max(0, n - 2), Math.floor(c)), f = n > 1 ? smoothstep(0.1, 0.9, c - seg) : 0;
    const k0 = cfg.cams[seg], k1 = cfg.cams[Math.min(n - 1, seg + 1)];
    a.fromArray(k0.p).lerp(b.fromArray(k1.p), f);
    camTgt.fromArray(k0.t).lerp(b.fromArray(k1.t), f);
    const fit = lerp(k0.fit, k1.fit, f);
    const need = (fit * (layout === 'side' ? 1.5 : 1)) / (Math.tan((camera.fov * Math.PI) / 360) * stage.size.aspect);
    a.sub(camTgt);
    camPos.copy(camTgt).addScaledVector(a.normalize(), Math.max(a.length(), need));
  }

  // ---- frame loop
  let wash = mode === 'auto' && stage.reduced ? 0.55 : 0, sprayAmt = 0, first = true, warm = 0;
  const head = new THREE.Vector3(), tgt = new THREE.Vector3(), cTmp = new THREE.Color();
  const CYCLE = 16;
  stage.onFrame((dt) => {
    clock += dt;
    let target = wash, active = false;
    if (mode === 'scroll' && track) {
      const p = scrollProgress(track);
      target = clamp((p - 0.4) / 0.48);
      active = target > 0.004 && target < 0.996;
      cFloat = damp(cFloat, p * (cfg.cams.length - 1), 5, dt || 1);
    } else if (!stage.reduced) {
      const t = clock % CYCLE;
      if (t < 1.4) { target = 0; grimeMat.opacity = 1; }
      else if (t < 11.4) { target = (t - 1.4) / 10; active = true; grimeMat.opacity = 1; }
      else if (t < 14.4) target = 1;
      else {
        if (wash !== 0) { wash = 0; strokes = []; strokePts = 0; maskDirty = true; }
        target = 0; grimeMat.opacity = (t - 14.4) / 1.6;
      }
    }
    if (mode === 'auto' && !stage.reduced) wash = target > wash ? Math.min(target, wash + dt * 0.5 + (target - wash)) : target;
    else if (mode === 'scroll') wash = first ? target : damp(wash, target, 7, dt);
    if (maskDirty || Math.abs(wash - drawn) > 0.0015) drawMask(wash);

    // railing and board ends warm up once the deck is done
    const warmT = smoothstep(0.82, 1, wash) * (grimeMat.opacity >= 1 ? 1 : 1 - grimeMat.opacity);
    warm = first ? warmT : damp(warm, warmT, 4, dt);
    for (const [m, c0, c1] of cfg.tint) m.color.copy(cTmp.copy(c0).lerp(c1, warm));

    const byPointer = clock - pointerAt < 1.1;
    const uv = byPointer ? pointerUV : headUV(wash);
    tgt.set((uv[0] - 0.5) * W, 0, (uv[1] - 0.5) * H);
    if (first) head.copy(tgt); else head.lerp(tgt, 1 - Math.exp(-(byPointer ? 16 : 9) * dt));
    const spraying = (byPointer || active) && !stage.reduced;
    sprayAmt = damp(sprayAmt, spraying ? 1 : 0, 6, dt);
    wand.position.copy(head).addScaledVector(away, spray.h + (1 - sprayAmt) * 1.4);
    wand.visible = sprayAmt > 0.02 || spraying;
    spray.mat.opacity = cfg.sprayOpacity * sprayAmt * (0.85 + 0.15 * Math.sin(clock * 41));

    for (let i = 0; i < N; i++) {
      const j = i * 3;
      mlife[i] -= dt;
      if (mlife[i] <= 0) {
        if (spraying && Math.random() < 0.5) {
          mlife[i] = 0.3 + Math.random() * 0.45;
          mpos[j] = head.x + (Math.random() - 0.5) * 0.2; mpos[j + 1] = 0.03; mpos[j + 2] = head.z + (Math.random() - 0.5) * cfg.fanW;
          mvel[j] = (Math.random() - 0.2) * 1.4; mvel[j + 1] = 0.4 + Math.random() * 0.9; mvel[j + 2] = (Math.random() - 0.5) * 1.2;
        } else mpos[j + 1] = -99;
      } else {
        mvel[j + 1] -= 2.2 * dt;
        mpos[j] += mvel[j] * dt; mpos[j + 1] += mvel[j + 1] * dt; mpos[j + 2] += mvel[j + 2] * dt;
      }
    }
    if (N) mgeo.attributes.position.needsUpdate = true;

    applyOffset(false);
    camFor(mode === 'scroll' ? cFloat : 0);
    if (mode === 'auto' && !stage.reduced) camPos.x += Math.sin(clock * 0.25) * 0.4;
    camera.position.copy(camPos); camera.lookAt(camTgt);
    if (dt > 0) first = false;
  });

  stage.start();
  el.classList.add('is-live');
}
