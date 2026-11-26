// "The front of a Potteries terrace": a real-time 3D slice of red-brick wall
// with a white uPVC casement window, sill, soldier-course lintel, Staffordshire
// blue plinth, fascia, gutter and slate roof edge. A water-fed pole brush comes
// up from the pavement, scrubs, rinses with pure water, and the surface dries clear.
// Variants, picked by data-surface on the stage:
//   glass  - the panes are grimy (home story + window cleaning page)
//   frames - the uPVC frame and sill are green-grey (frames page)
//   fascia - the fascia board and gutter carry black streaks (roofline page)
// Pointer or finger scrubs whatever is under it.
import { createStage, THREE, clamp, lerp, smoothstep, damp, scrollProgress } from '../lib/stage.js';
import { softDot, fbm } from '../lib/textures.js';

// ------------------------------------------------------------------ layout
const WALL_X = 2.3, WALL_Y0 = -1.9, WALL_Y1 = 1.75, WALL_D = 0.45;
const OW = 1.05, OH = 0.775;            // half-size of the window opening
const MULL = 0.045, TRANS_Y = 0.42;     // mullion half-width, transom height
const FR = 0.075;                        // frame member width
const GLASS_Z = -0.075, FRAME_Z = -0.02, SILL_Z = 0.13, FASCIA_Z = 0.37, GUTTER_Z = 0.535;
// the dirt mask covers this rectangle of the wall plane (x0, y0, w, h)
const MX0 = -2.45, MY0 = -2.0, MW = 4.9, MH = 4.3;

const PARK = [1.55, -1.55];
const KINDS = {
  glass: {
    width: 0.36,
    rect: [-0.92, 0.92, -0.7, 0.7],
    path: (() => { const p = []; for (let r = 0; r < 5; r++) { const y = 0.62 - r * 0.31; p.push(r % 2 ? [0.92, y] : [-0.92, y], r % 2 ? [-0.92, y] : [0.92, y]); } return p; })(),
    dirt: { glass: 1, frame: 0.35, fascia: 0, gutter: 0 },
  },
  frames: {
    width: 0.2,
    rect: [-1.0, 1.0, -0.82, 0.74],
    path: [[-1.0, 0.73], [1.0, 0.73], [1.0, -0.73], [-1.0, -0.73], [-1.0, 0.73], [0, 0.73], [0, -0.73], [-1.15, -0.82], [1.15, -0.82], [1.0, TRANS_Y], [-1.0, TRANS_Y]],
    dirt: { glass: 0.3, frame: 1, fascia: 0, gutter: 0 },
  },
  fascia: {
    width: 0.3,
    rect: [-2.2, 2.2, 1.66, 2.0],
    path: [[-2.25, 1.9], [2.25, 1.9], [2.25, 1.71], [-2.25, 1.71]],
    dirt: { glass: 0, frame: 0, fascia: 1, gutter: 1 },
  },
};

const CAMS = {
  story: [
    { p: [-1.6, -0.3, 3.4], t: [-0.15, 0.05, 0], fit: 2.9 },
    { p: [1.3, 0.25, 4.3], t: [0, 0.05, 0], fit: 2.7 },
    { p: [-0.9, 0.55, 4.1], t: [0, 0.0, 0], fit: 2.7 },
    { p: [2.3, 0.6, 6.6], t: [0, 0.15, 0], fit: 5.0 },
  ],
  glass: [{ p: [1.5, 0.35, 5.0], t: [0, 0.0, 0], fit: 2.95 }],
  frames: [{ p: [-1.7, 0.1, 4.8], t: [0, -0.12, 0], fit: 3.0 }],
  fascia: [{ p: [1.4, -0.7, 4.4], t: [0, 1.35, 0.2], fit: 3.6 }],
};

// ---------------------------------------------------------------- textures
function hash(x, y, s = 0) {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(s | 0, 1442695041);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}
// fn(u, v) -> [r, g, b, a, height]
function paint(w, h, fn, { srgb = true, height = false, repeat = true } = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const ctx = c.getContext('2d'); const img = ctx.createImageData(w, h);
  let hc, hctx, himg;
  if (height) { hc = document.createElement('canvas'); hc.width = w; hc.height = h; hctx = hc.getContext('2d'); himg = hctx.createImageData(w, h); }
  for (let y = 0, i = 0; y < h; y++) for (let x = 0; x < w; x++, i += 4) {
    const p = fn(x / w, y / h, x, y);
    img.data[i] = clamp(p[0]) * 255; img.data[i + 1] = clamp(p[1]) * 255; img.data[i + 2] = clamp(p[2]) * 255; img.data[i + 3] = clamp(p[3] ?? 1) * 255;
    if (height) { himg.data[i] = himg.data[i + 1] = himg.data[i + 2] = clamp(p[4] ?? 0.5) * 255; himg.data[i + 3] = 255; }
  }
  ctx.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  if (!height) return { map: t };
  hctx.putImageData(himg, 0, 0);
  const b = new THREE.CanvasTexture(hc); if (repeat) b.wrapS = b.wrapT = THREE.RepeatWrapping;
  return { map: t, bumpMap: b };
}

// Brick bond. cols x rows bricks per tile; stagger = half-brick offset per course.
const RED = [[0.5, 0.25, 0.18], [0.42, 0.21, 0.17], [0.55, 0.29, 0.2], [0.37, 0.21, 0.19], [0.47, 0.26, 0.2]];
const BLUE = [[0.2, 0.21, 0.25], [0.16, 0.17, 0.21], [0.25, 0.25, 0.28], [0.19, 0.18, 0.22]];
function brick(cols, rows, stagger, mx, my, pal, seed) {
  return (u, v, x, y) => {
    const row = Math.floor(v * rows), tv = v * rows - row;
    const off = stagger && row % 2 ? 0.5 : 0;
    const cu = u * cols + off, col = Math.floor(cu), tu = cu - col;
    const k = pal[Math.floor(hash(col % cols, row, seed) * pal.length)];
    const n = fbm(u * 40, v * 40, seed, 3), sp = hash(x, y, seed + 3);
    const edge = Math.min(tu / mx, (1 - tu) / mx, tv / my, (1 - tv) / my);
    if (edge < 1) {
      const m = 0.6 + (sp - 0.5) * 0.12 + (n - 0.5) * 0.1;
      return [m, m * 0.95, m * 0.86, 1, 0.12 + sp * 0.1];
    }
    const shade = 0.86 + (n - 0.5) * 0.35 + (sp - 0.5) * 0.12 + (hash(col, row, seed + 9) - 0.5) * 0.12;
    const burn = smoothstep(0.7, 1, fbm(u * 9 + col, v * 6, seed + 5, 3)) * 0.35;
    return [k[0] * shade * (1 - burn), k[1] * shade * (1 - burn * 0.8), k[2] * shade, 1, 0.65 + n * 0.25 + sp * 0.1 - smoothstep(1, 2.2, edge) * -0.05];
  };
}
function slate(u, v, x, y) {
  const rows = 6, row = Math.floor(v * rows), t = v * rows - row;
  const cols = 9, cu = u * cols + (row % 2) * 0.5, col = Math.floor(cu), tu = cu - col;
  let b = 0.2 + (hash(col, row, 4) - 0.5) * 0.06 + (fbm(u * 30, v * 30, 2, 3) - 0.5) * 0.08;
  let hgt = t * 0.6 + hash(x, y, 7) * 0.2;
  if (tu < 0.03) { b *= 0.5; hgt = 0; }
  b *= 1 - 0.45 * Math.exp(-t * 12);
  return [b * 0.92, b * 0.97, b * 1.08, 1, hgt];
}
function concrete(u, v, x, y) {
  const n = fbm(u * 8, v * 6, 3, 4), sp = hash(x, y, 1);
  let b = 0.66 + (n - 0.5) * 0.16 + (sp - 0.5) * 0.1;
  let h = n * 0.5 + sp * 0.5;
  if (Math.abs(u - 0.5) < 0.004 || v < 0.006) { b *= 0.6; h = 0; }
  return [b, b * 0.985, b * 0.96, 1, h];
}
// glass reflection: overcast Staffordshire sky over the street
function glassSky(u, v) {
  const sky = smoothstep(0.0, 1.0, 1 - v);
  let r = lerp(0.36, 0.7, sky), g = lerp(0.42, 0.78, sky), b = lerp(0.47, 0.85, sky);
  const streak = Math.exp(-(((u * 1.2 + v * 0.8 - 0.75) / 0.09) ** 2)) * 0.25 + Math.exp(-(((u * 1.2 + v * 0.8 - 0.98) / 0.04) ** 2)) * 0.18;
  const roofs = 1 - smoothstep(0.7, 1.0, v) * 0.18 * (0.6 + fbm(u * 5, 1, 3, 3) * 0.8);
  return [(r + streak) * roofs, (g + streak) * roofs, (b + streak) * roofs, 1];
}
// grime: rgb = colour of the dirt, a = how much of it
function glassGrime(u, v, x, y) {
  const film = fbm(u * 6, v * 6, 11, 4), fine = fbm(u * 60, v * 60, 3, 2);
  const cu = u * 7, cv = v * 7, cx = Math.floor(cu), cy = Math.floor(cv);
  const ox = hash(cx, cy, 2), oy = hash(cx, cy, 5), rad = 0.12 + hash(cx, cy, 8) * 0.22;
  const d = Math.hypot(cu - cx - ox * 0.6 - 0.2, cv - cy - oy * 0.6 - 0.2);
  const ring = hash(cx, cy, 9) > 0.55 ? Math.exp(-(((d - rad) / 0.05) ** 2)) * 0.16 : 0;
  const drip = smoothstep(0.58, 0.75, fbm(u * 26 + fbm(u * 4, v * 4, 2, 2) * 3, v * 1.6, 17, 3)) * 0.22;
  const a = clamp(0.48 + film * 0.32 + fine * 0.14 + ring + drip + smoothstep(0.5, 0.8, fbm(u * 3, v * 3, 41, 3)) * 0.15, 0, 0.94);
  const c = 0.37 + film * 0.08 - drip * 0.15;
  return [c * 1.04, c, c * 0.9, a];
}
function frameGrime(u, v) {
  const patch = fbm(u * 5, v * 5, 23, 4), streak = fbm(u * 30, v * 2, 41, 3), fine = fbm(u * 70, v * 70, 6, 2);
  const green = smoothstep(0.4, 0.7, patch);
  const a = clamp(0.62 + green * 0.3 + smoothstep(0.55, 0.7, streak) * 0.3 + fine * 0.1, 0, 0.95);
  return [lerp(0.48, 0.3, green) + fine * 0.05, lerp(0.47, 0.37, green) + fine * 0.05, lerp(0.4, 0.22, green), a];
}
function fasciaGrime(u, v) {
  const s = fbm(u * 16, v * 0.9, 13, 4), fine = fbm(u * 80, v * 20, 8, 2);
  const a = clamp(smoothstep(0.42, 0.62, s) * 0.85 + 0.22 + fine * 0.1, 0, 0.95);
  return [0.1 + fine * 0.04, 0.1 + fine * 0.04, 0.09, a];
}
function gutterGrime(u, v) {
  const s = fbm(u * 10, v * 3, 29, 4), fine = fbm(u * 70, v * 30, 12, 2);
  const a = clamp(smoothstep(0.38, 0.6, s) * 0.8 + 0.15 + fine * 0.1, 0, 0.9);
  return [0.36 + fine * 0.05, 0.37 + fine * 0.05, 0.32, a];
}

// Bake world-scale UVs into a box so bricks line up across separate blocks.
function boxAt(x0, x1, y0, y1, z0, z1, tile = [1, 1]) {
  const g = new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0);
  g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  const p = g.attributes.position, n = g.attributes.normal, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) {
    const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i));
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    if (ax > 0.5) uv.setXY(i, z / tile[0], y / tile[1]);
    else if (ay > 0.5) uv.setXY(i, x / tile[0], z / tile[1]);
    else uv.setXY(i, x / tile[0], y / tile[1]);
  }
  return g;
}

function starTex() {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 30);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.15, 'rgba(255,255,255,.6)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 64, 64);
  ctx.globalCompositeOperation = 'lighter';
  for (const [w, h] of [[60, 3], [3, 60]]) {
    const lg = ctx.createLinearGradient(32 - w / 2, 32 - h / 2, 32 + w / 2, 32 + h / 2);
    lg.addColorStop(0, 'rgba(255,255,255,0)'); lg.addColorStop(0.5, 'rgba(255,255,255,.95)'); lg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = lg; ctx.fillRect(32 - w / 2, 32 - h / 2, w, h);
  }
  return new THREE.CanvasTexture(c);
}

function std(color, rough, metal = 0) { return new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal }); }

// ------------------------------------------------------------------ mount
export function mount(el) {
  const canvas = el.querySelector('canvas');
  const kind = KINDS[el.dataset.surface] ? el.dataset.surface : 'glass';
  const K = KINDS[kind];
  const mode = el.dataset.mode === 'scroll' ? 'scroll' : 'auto';
  const track = mode === 'scroll' ? document.querySelector(el.dataset.track) : null;
  const cams = mode === 'scroll' ? CAMS.story : CAMS[kind];

  let stage;
  try { stage = createStage(el, canvas, { exposure: 1.05, envIntensity: 0.9 }); } catch (e) { return; }
  const { scene, camera, renderer } = stage;
  const aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const small = Math.min(innerWidth, innerHeight) < 600;
  const q = small ? 0.5 : 1;
  stage.key.position.set(-3.5, 6, 5);
  const fill = new THREE.HemisphereLight(0xdfeaf2, 0x6b5a4c, 0.55); scene.add(fill);

  const group = new THREE.Group();
  group.rotation.y = -0.3;
  scene.add(group);

  // ---- dirt + wet masks (canvas in wall-plane space) ------------------------
  const cw = Math.round(480 * (small ? 0.75 : 1)), ch = Math.round(cw * (MH / MW));
  const mk = () => { const c = document.createElement('canvas'); c.width = cw; c.height = ch; const t = new THREE.CanvasTexture(c); t.minFilter = THREE.LinearFilter; t.generateMipmaps = false; return [c, c.getContext('2d'), t]; };
  const [, dctx, dirtTex] = mk();
  const [, wctx, wetTex] = mk();
  const px = (x, y) => [((x - MX0) / MW) * cw, (1 - (y - MY0) / MH) * ch];
  const pxScale = cw / MW;

  const shared = {
    uMask: { value: dirtTex }, uWet: { value: wetTex },
    uRect: { value: new THREE.Vector4(MX0, MY0, MW, MH) },
    uGroupInv: { value: new THREE.Matrix4() }, uFade: { value: 1 },
  };
  function dirtable(mat, grime, scale, amount, wetRough) {
    const uDirt = { value: amount };
    mat.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, shared, { uGrime: { value: grime }, uGScale: { value: new THREE.Vector2(scale[0], scale[1]) }, uDirt });
      sh.vertexShader = 'varying vec3 vDirtP;\nuniform mat4 uGroupInv;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n  vDirtP = (uGroupInv * modelMatrix * vec4(transformed, 1.0)).xyz;');
      sh.fragmentShader = 'varying vec3 vDirtP;\nuniform sampler2D uMask;\nuniform sampler2D uWet;\nuniform sampler2D uGrime;\nuniform vec4 uRect;\nuniform vec2 uGScale;\nuniform float uDirt;\nuniform float uFade;\nfloat dirtK;\nfloat wetK;\n' + sh.fragmentShader
        .replace('#include <map_fragment>', `#include <map_fragment>
  vec2 duv = (vDirtP.xy - uRect.xy) / uRect.zw;
  vec4 gr = texture2D(uGrime, vDirtP.xy * uGScale);
  dirtK = clamp(texture2D(uMask, duv).r * gr.a * uDirt * uFade, 0.0, 1.0);
  wetK = texture2D(uWet, duv).r * (1.0 - dirtK);
  diffuseColor.rgb = mix(diffuseColor.rgb, gr.rgb, dirtK);
  diffuseColor.rgb *= 1.0 - wetK * 0.1;`)
        .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
  roughnessFactor = mix(roughnessFactor, 0.88, dirtK);
  roughnessFactor = mix(roughnessFactor, ${wetRough.toFixed(2)}, wetK);`)
        .replace('#include <metalnessmap_fragment>', `#include <metalnessmap_fragment>
  metalnessFactor *= 1.0 - dirtK;`);
    };
    mat.customProgramCacheKey = () => `dirt-${wetRough}`;
    return mat;
  }

  // ---- textures --------------------------------------------------------------
  const tx = (t) => { Object.values(t).forEach((m) => { m.anisotropy = aniso; }); return t; };
  const brickT = tx(paint(Math.round(512 * q) || 256, Math.round(256 * q) || 128, brick(5, 8, true, 0.045, 0.13, RED, 1), { height: true }));
  const soldierT = tx(paint(Math.round(512 * q), Math.round(160 * q), brick(10, 1, false, 0.06, 0.04, RED, 7), { height: true }));
  const blueT = tx(paint(Math.round(512 * q), Math.round(128 * q), brick(5, 3, true, 0.045, 0.13, BLUE, 3), { height: true }));
  const slateT = tx(paint(Math.round(512 * q), Math.round(256 * q), slate, { height: true }));
  const concT = tx(paint(Math.round(512 * q), Math.round(256 * q), concrete, { height: true }));
  const skyT = paint(64, 256, glassSky, { repeat: false });
  const gs = small ? 192 : 320;
  const gGlass = paint(gs, gs, glassGrime).map, gFrame = paint(gs, gs, frameGrime).map;
  const gFascia = paint(gs, gs, fasciaGrime).map, gGutter = paint(gs, gs, gutterGrime).map;

  // ---- wall ----------------------------------------------------------------------
  const BT = [1.2, 0.6];
  const brickMat = new THREE.MeshStandardMaterial({ map: brickT.map, bumpMap: brickT.bumpMap, bumpScale: 2.4, roughness: 0.92 });
  const wallPieces = [
    boxAt(-WALL_X, -OW, WALL_Y0 + 0.2, WALL_Y1, -WALL_D, 0, BT),
    boxAt(OW, WALL_X, WALL_Y0 + 0.2, WALL_Y1, -WALL_D, 0, BT),
    boxAt(-OW, OW, OH + 0.225, WALL_Y1, -WALL_D, 0, BT),
    boxAt(-OW, OW, WALL_Y0 + 0.2, -OH - 0.09, -WALL_D, 0, BT),
  ];
  wallPieces.forEach((g) => { const m = new THREE.Mesh(g, brickMat); m.castShadow = m.receiveShadow = true; group.add(m); });
  // brick reveal under the sill and the soldier-course lintel
  const lintel = new THREE.Mesh(boxAt(-OW - 0.12, OW + 0.12, OH, OH + 0.225, -WALL_D, 0.006, [0.6, 0.225]), new THREE.MeshStandardMaterial({ map: soldierT.map, bumpMap: soldierT.bumpMap, bumpScale: 2.4, roughness: 0.9 }));
  lintel.castShadow = lintel.receiveShadow = true; group.add(lintel);
  const plinth = new THREE.Mesh(boxAt(-WALL_X, WALL_X, WALL_Y0, WALL_Y0 + 0.2, -WALL_D, 0.012, [1.2, 0.225]), new THREE.MeshStandardMaterial({ map: blueT.map, bumpMap: blueT.bumpMap, bumpScale: 2, roughness: 0.55 }));
  plinth.castShadow = plinth.receiveShadow = true; group.add(plinth);
  // back of the reveal (the room behind is never seen: the glass sits in front)
  const back = new THREE.Mesh(new THREE.PlaneGeometry(OW * 2, OH * 2), std(0x2a2522, 1)); back.position.z = -0.2; group.add(back);

  // pavement
  const pave = new THREE.Mesh(boxAt(-WALL_X - 0.1, WALL_X + 0.1, WALL_Y0 - 0.12, WALL_Y0, 0, 1.25, [2.4, 1.25]),
    [std(0x8f8b84, 0.95), std(0x8f8b84, 0.95), new THREE.MeshStandardMaterial({ map: concT.map, bumpMap: concT.bumpMap, bumpScale: 1, roughness: 0.92 }), std(0x8f8b84, 0.95), std(0x8f8b84, 0.95), std(0x8f8b84, 0.95)]);
  pave.receiveShadow = true; group.add(pave);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.ShadowMaterial({ opacity: 0.16 }));
  ground.rotation.x = -Math.PI / 2; ground.position.y = WALL_Y0 - 0.45; ground.receiveShadow = true; scene.add(ground);

  // ---- window ----------------------------------------------------------------------
  const D = K.dirt;
  const upvc = dirtable(std(0xf4f3ef, 0.32), gFrame, [0.9, 0.9], D.frame, 0.12);
  const fz0 = FRAME_Z - 0.12, fz1 = FRAME_Z;
  const frameBits = [
    [-OW, OW, OH - FR, OH], [-OW, OW, -OH, -OH + FR], [-OW, -OW + FR, -OH, OH], [OW - FR, OW, -OH, OH],
    [-MULL, MULL, -OH, OH], [-OW, OW, TRANS_Y - 0.035, TRANS_Y + 0.035],
  ];
  // opening casement: its own sash ring inside the left main pane, slightly proud
  const sx0 = -OW + FR, sx1 = -MULL, sy0 = -OH + FR, sy1 = TRANS_Y - 0.035, sw = 0.05;
  const sashBits = [[sx0, sx1, sy1 - sw, sy1], [sx0, sx1, sy0, sy0 + sw], [sx0, sx0 + sw, sy0, sy1], [sx1 - sw, sx1, sy0, sy1]];
  frameBits.forEach(([a, b, c, d]) => { const m = new THREE.Mesh(boxAt(a, b, c, d, fz0, fz1), upvc); m.castShadow = m.receiveShadow = true; group.add(m); });
  sashBits.forEach(([a, b, c, d]) => { const m = new THREE.Mesh(boxAt(a, b, c, d, fz0, fz1 + 0.012), upvc); m.castShadow = m.receiveShadow = true; group.add(m); });
  // handle on the casement
  const handle = new THREE.Group(); group.add(handle);
  const hb = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.07, 0.015), std(0xe8e6e0, 0.35)); hb.position.set(sx1 - 0.04, -0.15, fz1 + 0.02); handle.add(hb);
  const hl = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.12, 0.018), std(0xe8e6e0, 0.35)); hl.position.set(sx1 - 0.04, -0.21, fz1 + 0.035); handle.add(hl);
  handle.children.forEach((m) => { m.castShadow = true; });

  const glassMat = dirtable(new THREE.MeshStandardMaterial({ map: skyT.map, roughness: 0.06, metalness: 0.35, color: 0xffffff }), gGlass, [1, 1], D.glass, 0.03);
  const panes = [
    [-OW + FR, -MULL, TRANS_Y + 0.035, OH - FR], [MULL, OW - FR, TRANS_Y + 0.035, OH - FR],
    [-OW + FR, -MULL, -OH + FR, TRANS_Y - 0.035], [MULL, OW - FR, -OH + FR, TRANS_Y - 0.035],
  ];
  panes.forEach(([a, b, c, d]) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(b - a, d - c), glassMat);
    m.position.set((a + b) / 2, (c + d) / 2, GLASS_Z); m.receiveShadow = true; group.add(m);
  });
  // sill
  const sill = new THREE.Mesh(boxAt(-OW - 0.13, OW + 0.13, -OH - 0.09, -OH, -0.16, SILL_Z), upvc);
  sill.castShadow = sill.receiveShadow = true; group.add(sill);

  // ---- roofline: soffit, fascia, gutter, downpipe, slate ------------------------------
  const white = std(0xf2f1ec, 0.36);
  const soffit = new THREE.Mesh(boxAt(-WALL_X, WALL_X, WALL_Y1, WALL_Y1 + 0.03, -WALL_D, FASCIA_Z - 0.02), white);
  soffit.castShadow = soffit.receiveShadow = true; group.add(soffit);
  const fasciaMat = dirtable(std(0xf4f3ef, 0.3), gFascia, [0.8, 1.2], D.fascia, 0.12);
  const fascia = new THREE.Mesh(boxAt(-WALL_X - 0.02, WALL_X + 0.02, WALL_Y1 - 0.05, WALL_Y1 + 0.28, FASCIA_Z - 0.03, FASCIA_Z), fasciaMat);
  fascia.castShadow = fascia.receiveShadow = true; group.add(fascia);
  const gutterMat = dirtable(new THREE.MeshStandardMaterial({ color: 0x1b1d20, roughness: 0.38, side: THREE.DoubleSide }), gGutter, [0.7, 1.4], D.gutter, 0.08);
  const gGeo = new THREE.CylinderGeometry(0.085, 0.085, WALL_X * 2 + 0.04, 28, 1, true, 0, Math.PI); gGeo.rotateZ(-Math.PI / 2);
  const gutter = new THREE.Mesh(gGeo, gutterMat); gutter.position.set(0, WALL_Y1 - 0.01, GUTTER_Z - 0.085); gutter.castShadow = true; group.add(gutter);
  const lip = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, WALL_X * 2 + 0.04, 8), gutterMat); lip.rotation.z = Math.PI / 2; lip.position.set(0, WALL_Y1 - 0.01, GUTTER_Z); group.add(lip);
  const pipeMat = std(0x1b1d20, 0.4);
  const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, WALL_Y1 - WALL_Y0 - 0.1, 16), pipeMat);
  pipe.position.set(WALL_X - 0.28, (WALL_Y1 + WALL_Y0) / 2 - 0.08, 0.08); pipe.castShadow = true; group.add(pipe);
  const elbow = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.42, 16), pipeMat);
  elbow.rotation.x = 0.95; elbow.position.set(WALL_X - 0.28, WALL_Y1 - 0.12, 0.25); elbow.castShadow = true; group.add(elbow);
  for (const y of [-1.2, -0.1, 1.0]) { const c = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.04, 0.1), pipeMat); c.position.set(WALL_X - 0.28, y, 0.04); group.add(c); }
  const roofLen = 1.15, roofAng = Math.atan2(0.75, 0.88);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(WALL_X * 2 + 0.16, 0.05, roofLen), [std(0x2b2f36, 0.8), std(0x2b2f36, 0.8),
    new THREE.MeshStandardMaterial({ map: slateT.map, bumpMap: slateT.bumpMap, bumpScale: 2, roughness: 0.6, metalness: 0.05 }), std(0x2b2f36, 0.8), std(0x2b2f36, 0.8), std(0x2b2f36, 0.8)]);
  slateT.map.repeat.set(2.4, 1); slateT.bumpMap.repeat.set(2.4, 1);
  roof.rotation.x = roofAng; roof.position.set(0, WALL_Y1 + 0.28 + Math.sin(roofAng) * roofLen / 2 - 0.02, FASCIA_Z + 0.04 - Math.cos(roofAng) * roofLen / 2);
  roof.castShadow = roof.receiveShadow = true; group.add(roof);

  // ---- the water-fed pole ------------------------------------------------------------
  const carbon = new THREE.MeshStandardMaterial({ color: 0x23262b, roughness: 0.32, metalness: 0.25 });
  const pole = new THREE.Group(); group.add(pole);
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.019, 0.026, 1, 14).translate(0, 0.5, 0), carbon); shaft.castShadow = true; pole.add(shaft);
  const hoseMat = std(0x3d6f8f, 0.5);
  const hose = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 1, 6).translate(0.034, 0.5, 0), hoseMat); pole.add(hose);
  const clampMat = std(0xc9ccd0, 0.3, 0.8);
  const collars = [0.28, 0.52, 0.74].map(() => { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.05, 14), clampMat); c.castShadow = true; group.add(c); return c; });
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 1, 10).translate(0, 0.5, 0), clampMat); neck.castShadow = true; group.add(neck);

  const brush = new THREE.Group(); group.add(brush);
  const bBack = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.1, 0.05), std(0x2f6f92, 0.45)); bBack.position.z = 0.07; bBack.castShadow = true; brush.add(bBack);
  const NB = 22 * 4;
  const bristle = new THREE.InstancedMesh(new THREE.BoxGeometry(0.014, 0.012, 0.064), std(0xd9d6cf, 0.7), NB);
  const bm = new THREE.Matrix4();
  for (let i = 0; i < NB; i++) {
    const cx = i % 22, cy = Math.floor(i / 22);
    bm.makeTranslation(-0.2 + cx * (0.4 / 21), -0.033 + cy * 0.022, 0.032 + (hash(i, 1, 3) - 0.5) * 0.01);
    bristle.setMatrixAt(i, bm);
    bristle.setColorAt(i, new THREE.Color(cy === 0 || cy === 3 ? 0x2b2b2b : 0xdedbd2));
  }
  bristle.castShadow = true; brush.add(bristle);
  const jets = [-0.14, 0.14].map((x) => { const j = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.05, 8), clampMat); j.rotation.x = -0.6; j.position.set(x, 0.07, 0.07); brush.add(j); return j; });

  // ---- hit plane for the pointer ---------------------------------------------------------
  const hitPlane = new THREE.Mesh(new THREE.PlaneGeometry(MW, MH), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, colorWrite: false }));
  hitPlane.position.set(MX0 + MW / 2, MY0 + MH / 2, 0.02); group.add(hitPlane);

  // ---- water: jets and drops that run down the surface -----------------------------------
  const PN = stage.reduced ? 0 : stage.coarse ? 160 : 300;
  const ppos = new Float32Array(PN * 3).fill(-99), pvel = new Float32Array(PN * 3), plife = new Float32Array(PN), pmode = new Uint8Array(PN);
  const pgeo = new THREE.BufferGeometry(); pgeo.setAttribute('position', new THREE.BufferAttribute(ppos, 3));
  const pts = new THREE.Points(pgeo, new THREE.PointsMaterial({ size: 0.04, map: softDot(THREE), transparent: true, depthWrite: false, color: 0xe6f6ff, opacity: 0.9 }));
  pts.frustumCulled = false; pts.renderOrder = 4; group.add(pts);
  let pNext = 0;
  function emit(x, y, z, vx, vy, vz, m) {
    if (!PN) return;
    const i = pNext; pNext = (pNext + 1) % PN; const j = i * 3;
    ppos[j] = x; ppos[j + 1] = y; ppos[j + 2] = z; pvel[j] = vx; pvel[j + 1] = vy; pvel[j + 2] = vz;
    plife[i] = 1 + Math.random() * 0.6; pmode[i] = m;
  }
  function stepParticles(dt) {
    for (let i = 0; i < PN; i++) {
      if (plife[i] <= 0) continue;
      const j = i * 3;
      plife[i] -= dt;
      if (plife[i] <= 0) { ppos[j + 1] = -99; continue; }
      if (pmode[i] === 1) { // running down the surface
        ppos[j] += Math.sin((ppos[j + 1] + i) * 9) * 0.02 * dt; ppos[j + 1] += pvel[j + 1] * dt;
        const sz = surfaceZ(ppos[j], ppos[j + 1]);
        if (sz > ppos[j + 2] + 0.02 || ppos[j + 1] < WALL_Y0) { pmode[i] = 0; pvel[j] = 0; pvel[j + 2] = 0.4; pvel[j + 1] = -0.2; }
        else ppos[j + 2] = sz + 0.006;
      } else { // flying
        pvel[j + 1] -= 4.5 * dt;
        ppos[j] += pvel[j] * dt; ppos[j + 1] += pvel[j + 1] * dt; ppos[j + 2] += pvel[j + 2] * dt;
        const sz = surfaceZ(ppos[j], ppos[j + 1]);
        if (pvel[j + 2] < 0 && ppos[j + 2] <= sz + 0.006) { pmode[i] = 1; ppos[j + 2] = sz + 0.006; pvel[j + 1] = -(0.25 + Math.random() * 0.35); plife[i] = 0.9 + Math.random() * 0.8; }
        if (ppos[j + 1] < WALL_Y0 - 0.1) plife[i] = 0;
      }
    }
    if (PN) pgeo.attributes.position.needsUpdate = true;
  }

  // ---- glints when it is clean --------------------------------------------------------------
  const st = starTex();
  const glints = [[-0.55, 0.15, 0.9], [0.62, -0.38, 0.7], [0.4, 0.6, 0.55], [-0.7, -0.55, 0.6]].map(([x, y, s], k) => {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: st, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 }));
    const at = kind === 'fascia' ? [lerp(-1.8, 1.8, k / 3), k % 2 ? 1.72 : 1.92, k % 2 ? GUTTER_Z + 0.01 : FASCIA_Z + 0.01] : kind === 'frames' ? [[-OW + 0.04, 0.1], [OW - 0.04, -0.4], [0, 0.6], [-0.6, -OH - 0.04]][k].concat([FRAME_Z + 0.02]) : [x, y, GLASS_Z + 0.01];
    sp.position.set(at[0], at[1], at[2]); sp.scale.setScalar(0.3 * s); sp.renderOrder = 5; group.add(sp);
    return sp;
  });

  // ---- surfaces ------------------------------------------------------------------------------
  function surfaceZ(x, y) {
    if (y > WALL_Y1 - 0.08 && Math.abs(x) < WALL_X + 0.02) return y < WALL_Y1 + 0.06 ? GUTTER_Z : FASCIA_Z;
    if (Math.abs(x) < OW && y > -OH && y < OH) {
      const onFrame = Math.abs(x) > OW - FR || Math.abs(y) > OH - FR || Math.abs(x) < MULL || Math.abs(y - TRANS_Y) < 0.035;
      return onFrame ? FRAME_Z : GLASS_Z;
    }
    if (Math.abs(x) < OW + 0.13 && y <= -OH && y > -OH - 0.09) return SILL_Z;
    if (Math.abs(x) < OW + 0.12 && y >= OH && y < OH + 0.225) return 0.006;
    return 0;
  }

  // ---- the cleaning path -----------------------------------------------------------------------
  const P = K.path, cum = [0];
  for (let i = 1; i < P.length; i++) cum.push(cum[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]));
  const L = cum[cum.length - 1];
  function along(s) {
    const d = clamp(s) * L; let i = 1;
    while (i < P.length - 1 && cum[i] < d) i++;
    const f = clamp((d - cum[i - 1]) / (cum[i] - cum[i - 1] || 1));
    return [lerp(P[i - 1][0], P[i][0], f), lerp(P[i - 1][1], P[i][1], f), i];
  }
  let strokes = [], newStroke = true;
  let drawn = { s: -1, r: -2 }, maskDirty = true;
  const [rx0, rx1, ry0, ry1] = K.rect;
  function drawMasks(s, r) {
    const lw = K.width * pxScale;
    dctx.fillStyle = '#fff'; dctx.fillRect(0, 0, cw, ch);
    wctx.fillStyle = '#000'; wctx.fillRect(0, 0, cw, ch);
    for (const [ctx, col, w] of [[dctx, '#000', lw], [wctx, '#fff', lw * 1.08]]) {
      ctx.strokeStyle = col; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      if (s > 0.0005) {
        const end = along(s);
        ctx.beginPath(); ctx.moveTo(...px(P[0][0], P[0][1]));
        for (let i = 1; i < end[2]; i++) ctx.lineTo(...px(P[i][0], P[i][1]));
        ctx.lineTo(...px(end[0], end[1])); ctx.stroke();
      }
      for (const st of strokes) {
        ctx.beginPath(); ctx.moveTo(...px(st[0], st[1]));
        if (st.length === 2) ctx.lineTo(...px(st[0] + 0.001, st[1]));
        for (let i = 2; i < st.length; i += 2) ctx.lineTo(...px(st[i], st[i + 1]));
        ctx.stroke();
      }
    }
    // the rinse passes top to bottom: everything above the line has dried clear
    if (r > 0) { const yLine = lerp(ry1 + 0.25, ry0 - 0.25, r); wctx.fillStyle = '#000'; wctx.fillRect(0, 0, cw, px(0, yLine)[1]); }
    dirtTex.needsUpdate = wetTex.needsUpdate = true;
    drawn = { s, r }; maskDirty = false;
  }

  // ---- pointer -----------------------------------------------------------------------------------
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), local = new THREE.Vector3();
  let clock = 0, pointerAt = -10, pointerXY = [0, 0], touched = false, strokePts = 0;
  const hint = el.querySelector('[data-hint]');
  function onPointer(e) {
    if (e.pointerType === 'touch' && e.type === 'pointermove' && !e.isPrimary) return;
    const r = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -(((e.clientY - r.top) / r.height) * 2 - 1));
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObject(hitPlane, false)[0];
    if (!hit) { newStroke = true; return; }
    local.copy(hit.point); group.worldToLocal(local);
    pointerXY = [clamp(local.x, -WALL_X, WALL_X), clamp(local.y, WALL_Y0 + 0.2, WALL_Y1 + 0.3)];
    pointerAt = clock;
    if (newStroke || !strokes.length) { strokes.push([pointerXY[0], pointerXY[1]]); newStroke = false; } else strokes[strokes.length - 1].push(pointerXY[0], pointerXY[1]);
    if (++strokePts > 700) { strokePts -= strokes[0].length / 2; strokes.shift(); }
    maskDirty = true;
    if (!touched) { touched = true; hint && hint.classList.add('is-done'); }
  }
  canvas.addEventListener('pointermove', onPointer, { passive: true });
  canvas.addEventListener('pointerdown', (e) => { newStroke = true; onPointer(e); }, { passive: true });
  canvas.addEventListener('pointerleave', () => { newStroke = true; }, { passive: true });
  let yaw = 0, yawT = 0;
  canvas.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    const r = canvas.getBoundingClientRect();
    yawT = (((e.clientX - r.left) / r.width) - 0.5) * 0.12;
  }, { passive: true });

  // ---- camera --------------------------------------------------------------------------------------
  const camPos = new THREE.Vector3(), camTgt = new THREE.Vector3(), a = new THREE.Vector3(), b = new THREE.Vector3();
  let layout = 'box', lastShift = -1, cFloat = 0;
  function applyOffset(force) {
    const { w, h } = stage.size;
    if (layout === 'side') { if (force) camera.setViewOffset(w, h, -w * 0.17, 0, w, h); }
    else if (layout === 'bottom') {
      const shift = lerp(0.26, 0.14, clamp(cFloat / (cams.length - 1)));
      if (force || Math.abs(shift - lastShift) > 0.002) { lastShift = shift; camera.setViewOffset(w, h, 0, h * shift, w, h); }
    } else if (force) camera.clearViewOffset();
  }
  stage.onResize((size) => {
    layout = mode !== 'scroll' ? 'box' : window.innerWidth >= 1000 ? 'side' : 'bottom';
    camera.fov = size.aspect < 0.9 ? 40 : 30;
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
    const need = (fit * (layout === 'side' ? 1.45 : 1)) / (Math.tan((camera.fov * Math.PI) / 360) * Math.min(stage.size.aspect, 1.6) * 2) * 1.0;
    a.sub(camTgt);
    camPos.copy(camTgt).addScaledVector(a.normalize(), Math.max(a.length() || 1, need));
  }

  // ---- the timeline: p 0..1 drives everything ----------------------------------------------------------
  // 0-.12 dirty and still, .12-.22 the brush rises from the pavement, .22-.58 scrub,
  // .6-.8 rinse top to bottom, .8-.92 the brush is lowered away, then it glints.
  const start = P[0], endScrub = P[P.length - 1];
  function timeline(p) {
    const scrub = clamp((p - 0.22) / 0.36), rinse = clamp((p - 0.6) / 0.2);
    let x, y, act = 0;
    if (p < 0.22) { const f = smoothstep(0.1, 0.22, p); x = lerp(PARK[0], start[0], f); y = lerp(PARK[1], start[1], f); }
    else if (p < 0.6) { const q2 = along(scrub); x = q2[0]; y = q2[1]; act = scrub < 1 ? 1 : 0; if (scrub >= 1) { const f = smoothstep(0.58, 0.6, p); x = lerp(endScrub[0], (rx0 + rx1) / 2, f); y = lerp(endScrub[1], ry1, f); } }
    else if (p < 0.8) { const cx = (rx0 + rx1) / 2, hw = (rx1 - rx0) / 2; x = cx + Math.sin(rinse * Math.PI * 7) * hw * 0.85; y = lerp(ry1, ry0, rinse); act = 2; }
    else { const f = smoothstep(0.8, 0.92, p); x = lerp((rx0 + rx1) / 2 + Math.sin(Math.PI * 7) * 0, PARK[0], f); y = lerp(ry0, PARK[1], f); }
    return { scrub, rinse: p >= 0.6 ? rinse : -1, x, y, act, shine: smoothstep(0.84, 0.97, p) };
  }

  // ---- frame loop ----------------------------------------------------------------------------------
  const head = new THREE.Vector3(PARK[0], PARK[1], 0.3), prev = new THREE.Vector3(), base = new THREE.Vector3(), tip = new THREE.Vector3(), dir = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0), quat = new THREE.Quaternion();
  let first = true, pState = 0, tilt = 0, scrubAmt = 0, lastT = 0;
  const CYCLE = 16;
  function autoP(t) {
    if (t < 1) return 0.1;
    if (t < 2) return lerp(0.1, 0.22, t - 1);
    if (t < 9.5) return lerp(0.22, 0.58, (t - 2) / 7.5);
    if (t < 10) return lerp(0.58, 0.6, (t - 9.5) / 0.5);
    if (t < 13) return lerp(0.6, 0.8, (t - 10) / 3);
    if (t < 14) return lerp(0.8, 0.94, t - 13);
    return 1;
  }
  stage.onFrame((dt) => {
    clock += dt;
    let p;
    if (mode === 'scroll' && track) {
      const sp = scrollProgress(track);
      p = first ? sp : damp(pState, sp, 6, dt || 1);
      cFloat = damp(cFloat, sp * (cams.length - 1), 5, dt || 1);
      if (first) cFloat = sp * (cams.length - 1);
    } else if (stage.reduced) {
      p = 0.5; shared.uFade.value = 1;
    } else {
      const t = clock % CYCLE;
      if (t < lastT) { strokes = []; strokePts = 0; maskDirty = true; }
      lastT = t;
      p = autoP(t);
      shared.uFade.value = t < 1 ? smoothstep(0, 1, t) : 1;
    }
    pState = p;
    const T = timeline(p);
    if (maskDirty || Math.abs(T.scrub - drawn.s) > 0.001 || Math.abs(T.rinse - drawn.r) > 0.001) drawMasks(T.scrub, T.rinse);

    // brush: follows the pointer for a moment after it moves, otherwise the timeline
    const byPointer = clock - pointerAt < 1.1;
    const tx2 = byPointer ? pointerXY[0] : T.x, ty2 = byPointer ? pointerXY[1] : T.y;
    const tz = surfaceZ(tx2, ty2) + 0.004;
    prev.copy(head);
    if (first) head.set(tx2, ty2, tz);
    else { const k = 1 - Math.exp(-(byPointer ? 14 : 12) * dt); head.x += (tx2 - head.x) * k; head.y += (ty2 - head.y) * k; head.z = damp(head.z, tz, 18, dt || 1); }
    const mv = Math.hypot(head.x - prev.x, head.y - prev.y);
    const working = (byPointer && mv > 0.0015) || T.act > 0;
    scrubAmt = damp(scrubAmt, working ? 1 : 0, 8, dt || 1);
    const jig = stage.reduced ? 0 : Math.sin(clock * 26) * 0.012 * scrubAmt;
    brush.position.set(head.x + jig, head.y, head.z);
    tilt = damp(tilt, clamp((head.x - prev.x) / Math.max(dt, 0.001) * -0.05, -0.25, 0.25), 6, dt || 1);
    brush.rotation.set(0, 0, tilt + (stage.reduced ? 0 : Math.sin(clock * 13) * 0.03 * scrubAmt));

    // pole: from a hand on the pavement up to the gooseneck behind the brush
    base.set(0.75 + head.x * 0.35, WALL_Y0 - 3.0, 3.4);
    tip.set(head.x, head.y - 0.2, head.z + 0.3);
    dir.subVectors(tip, base); const len = dir.length(); dir.normalize();
    quat.setFromUnitVectors(up, dir);
    pole.position.copy(base); pole.quaternion.copy(quat); pole.scale.set(1, len, 1);
    collars.forEach((c, i) => { c.position.copy(base).addScaledVector(dir, len * [0.28, 0.52, 0.74][i] + len * 0.2); c.quaternion.copy(quat); });
    a.set(head.x, head.y - 0.02, head.z + 0.1).sub(tip); const nl = a.length(); a.normalize();
    neck.position.copy(tip); neck.quaternion.setFromUnitVectors(up, a); neck.scale.set(1, nl, 1);

    // water
    if (PN && dt > 0 && scrubAmt > 0.3) {
      const n = T.act === 2 ? 4 : 2;
      for (let k = 0; k < n; k++) {
        const jx = jets[k % 2].position.x;
        emit(head.x + jx + (Math.random() - 0.5) * 0.04, head.y + 0.08, head.z + 0.08, (Math.random() - 0.5) * 0.3, 0.3 + Math.random() * 0.4, -1.4 - Math.random() * 0.5, 0);
      }
      if (Math.random() < 0.6 * scrubAmt) emit(head.x + (Math.random() - 0.5) * 0.4, head.y - 0.06, surfaceZ(head.x, head.y - 0.06) + 0.006, 0, -0.4 - Math.random() * 0.3, 0, 1);
    }
    stepParticles(dt);

    // glints
    glints.forEach((g, k) => { g.material.opacity = T.shine * (0.45 + 0.55 * Math.max(0, Math.sin(clock * 2.2 + k * 1.7))); g.material.rotation = clock * 0.3 + k; });

    if (!stage.reduced) group.position.y = Math.sin(clock * 0.5) * 0.02;
    yaw = damp(yaw, yawT, 3, dt || 1); group.rotation.y = -0.3 + yaw;
    group.updateMatrixWorld();
    shared.uGroupInv.value.copy(group.matrixWorld).invert();
    applyOffset(false);
    camFor(mode === 'scroll' ? cFloat : 0);
    if (mode === 'auto' && !stage.reduced) camPos.x += Math.sin(clock * 0.2) * 0.25;
    camera.position.copy(camPos); camera.lookAt(camTgt);
    if (dt > 0) first = false;
  });

  stage.start();
  el.classList.add('is-live');
}
