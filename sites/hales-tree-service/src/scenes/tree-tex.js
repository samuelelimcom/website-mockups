// Procedural textures for the tree scene: bark, end-grain rings, lawn, leaves
// and wood chips. Drawn on <canvas>, so the 3D scene downloads no images.
import { fbm } from '../lib/textures.js';

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const frac = (v) => v - Math.floor(v);
function h2(x, y, s) {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(s | 0, 1442695041);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

function paint(w, h, fn) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const hc = document.createElement('canvas'); hc.width = w; hc.height = h;
  const ctx = c.getContext('2d'), hctx = hc.getContext('2d');
  const img = ctx.createImageData(w, h), him = hctx.createImageData(w, h);
  for (let y = 0, i = 0; y < h; y++) {
    for (let x = 0; x < w; x++, i += 4) {
      const p = fn(x / w, y / h, x, y);
      img.data[i] = clamp(p[0]) * 255; img.data[i + 1] = clamp(p[1]) * 255; img.data[i + 2] = clamp(p[2]) * 255;
      img.data[i + 3] = clamp(p[3] ?? 1) * 255;
      const g = clamp(p[4] ?? 0.5) * 255;
      him.data[i] = him.data[i + 1] = him.data[i + 2] = g; him.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0); hctx.putImageData(him, 0, 0);
  return [c, hc];
}

function tex(THREE, canvas, srgb, aniso, repeat) {
  const t = new THREE.CanvasTexture(canvas);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = aniso;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
  return t;
}

const small = () => Math.min(window.innerWidth, window.innerHeight) < 600;

// Ridged hardwood bark (oak-like): vertical plates split by deep furrows.
export function barkMaps(THREE, aniso) {
  const w = small() ? 256 : 384, h = w * 2;
  const [c, hc] = paint(w, h, (u, v, x, y) => {
    const warp = fbm(u * 3, v * 2, 4, 3) * 3.2;
    const plates = Math.abs(Math.sin((u * 10 + warp) * Math.PI));
    const breaks = fbm(u * 10, v * 4, 9, 3);
    let ridge = Math.pow(plates, 0.55) * (0.65 + 0.35 * breaks);
    const grain = fbm(u * 60, v * 6, 2, 2);
    ridge = ridge * 0.85 + grain * 0.15;
    const lichen = clamp((fbm(u * 8, v * 6, 31, 4) - 0.6) * 4) * 0.5;
    const b = 0.13 + ridge * 0.24 + (h2(x, y, 5) - 0.5) * 0.04;
    let col = [b * 1.08, b * 0.95, b * 0.82];
    if (ridge > 0.55) col = [col[0] + lichen * 0.04, col[1] + lichen * 0.07, col[2] + lichen * 0.02];
    return [col[0], col[1], col[2], 1, ridge];
  });
  return { map: tex(THREE, c, true, aniso, [1, 0.45]), bumpMap: tex(THREE, hc, false, aniso, [1, 0.45]) };
}

// End grain: heartwood, growth rings, sapwood, a thin bark rim and drying checks.
export function ringMaps(THREE, aniso) {
  const w = small() ? 256 : 384;
  const [c, hc] = paint(w, w, (u, v) => {
    const dx = u - 0.5, dy = v - 0.5;
    const r = Math.sqrt(dx * dx + dy * dy) * 2;
    const a = Math.atan2(dy, dx);
    const wob = fbm(Math.cos(a) * 2 + 3, Math.sin(a) * 2 + 3, 7, 3) * 0.08;
    const rr = r + wob;
    const ring = frac(rr * 17);
    const late = Math.exp(-(((ring - 0.85) / 0.07) ** 2));
    const heart = clamp(1 - rr / 0.62);
    let col = [0.88 - heart * 0.18, 0.7 - heart * 0.2, 0.46 - heart * 0.2];
    col = col.map((c0) => c0 * (1 - late * 0.32));
    const saw = (fbm(u * 80, v * 80, 3, 2) - 0.5) * 0.06;
    col = col.map((c0) => c0 + saw);
    const crack = Math.abs(Math.sin(a * 3 + 1.3)) < 0.03 && rr > 0.3 && rr < 0.85 ? 1 : 0;
    if (crack) col = col.map((c0) => c0 * 0.55);
    if (rr > 0.93) col = [0.2, 0.15, 0.11];
    else if (rr > 0.88) col = [0.62, 0.46, 0.3];
    return [col[0], col[1], col[2], 1, 0.6 - late * 0.3 - crack * 0.4 + saw * 2];
  });
  return { map: tex(THREE, c, true, aniso), bumpMap: tex(THREE, hc, false, aniso) };
}

// Kentucky lawn: mixed greens with blade-level speckle.
export function grassMaps(THREE, aniso) {
  const w = small() ? 768 : 1024, k = w / 512;
  const [c, hc] = paint(w, w, (u, v, x, y) => {
    x = Math.floor(x / k * 2); y = Math.floor(y / k * 2);
    const patch = fbm(u * 14, v * 14, 12, 4);
    const blade = h2(x, y, 7), blade2 = h2(x >> 1, y * 3, 8);
    const g = 0.36 + patch * 0.18 + (blade - 0.5) * 0.16;
    const dry = clamp((fbm(u * 6, v * 6, 41, 3) - 0.6) * 3) * 0.7;
    return [g * (0.42 + dry * 0.35), g * (0.82 - dry * 0.12), g * (0.3 + dry * 0.05), 1, blade * 0.6 + blade2 * 0.4];
  });
  return { map: tex(THREE, c, true, aniso), bumpMap: tex(THREE, hc, false, aniso) };
}

// Dappled leaf mass for the canopy clumps.
export function leafMaps(THREE, aniso) {
  const w = small() ? 256 : 384;
  const [c, hc] = paint(w, w, (u, v, x, y) => {
    const n = fbm(u * 60, v * 40, 5, 3);
    const leaf = h2(x >> 1, y >> 1, 3);
    const gap = n < 0.36 ? 0.5 : 1;
    const warm = clamp((fbm(u * 5, v * 5, 19, 3) - 0.55) * 2) * 0.6;
    const b = (0.32 + leaf * 0.2 + n * 0.16 + fbm(u * 3, v * 3, 23, 2) * 0.1) * gap;
    return [b * (0.38 + warm * 0.4), b * (0.68 - warm * 0.08), b * 0.22, 1, n * gap];
  });
  return { map: tex(THREE, c, true, aniso), bumpMap: tex(THREE, hc, false, aniso) };
}

// Fresh wood chips with a soft round edge (alpha) for the ground patch.
export function chipMap(THREE, aniso) {
  const w = 256;
  const [c, hc] = paint(w, w, (u, v, x, y) => {
    const r = Math.hypot(u - 0.5, v - 0.5) * 2;
    const edge = clamp((1 - r) * 4) * (0.7 + 0.3 * fbm(u * 9, v * 9, 4, 3));
    const chip = h2(x >> 1, y >> 1, 11);
    const b = 0.5 + chip * 0.35;
    const dark = h2(x >> 2, y >> 2, 13) > 0.8 ? 0.6 : 1;
    return [b * 0.9 * dark, b * 0.68 * dark, b * 0.42 * dark, clamp(edge * 1.6), chip];
  });
  return { map: tex(THREE, c, true, aniso), bumpMap: tex(THREE, hc, false, aniso) };
}
