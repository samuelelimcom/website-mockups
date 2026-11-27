// Procedural PBR textures drawn on a <canvas>. Nothing is downloaded, so a
// 3D scene costs zero image requests. Each generator returns three.js textures.

function hash(x, y, s = 0) {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(s | 0, 1442695041);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

function vnoise(x, y, s) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi, s), b = hash(xi + 1, yi, s);
  const c = hash(xi, yi + 1, s), d = hash(xi + 1, yi + 1, s);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

export function fbm(x, y, s = 0, oct = 4) {
  let amp = 0.5, f = 1, sum = 0, norm = 0;
  for (let i = 0; i < oct; i++) {
    sum += amp * vnoise(x * f, y * f, s + i * 17);
    norm += amp; amp *= 0.5; f *= 2;
  }
  return sum / norm;
}

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const frac = (v) => v - Math.floor(v);

// fn(u, v, x, y) -> [r, g, b, a, height]   (all 0..1)
function paint(w, h, fn, wantHeight) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(w, h);
  let hc, hctx, himg;
  if (wantHeight) {
    hc = document.createElement('canvas'); hc.width = w; hc.height = h;
    hctx = hc.getContext('2d'); himg = hctx.createImageData(w, h);
  }
  for (let y = 0, i = 0; y < h; y++) {
    for (let x = 0; x < w; x++, i += 4) {
      const p = fn(x / w, y / h, x, y);
      img.data[i] = clamp(p[0]) * 255; img.data[i + 1] = clamp(p[1]) * 255;
      img.data[i + 2] = clamp(p[2]) * 255; img.data[i + 3] = clamp(p[3]) * 255;
      if (wantHeight) {
        const g = clamp(p[4]) * 255;
        himg.data[i] = himg.data[i + 1] = himg.data[i + 2] = g; himg.data[i + 3] = 255;
      }
    }
  }
  ctx.putImageData(img, 0, 0);
  if (wantHeight) hctx.putImageData(himg, 0, 0);
  return [c, hc];
}

function toTex(THREE, canvas, srgb, aniso) {
  const t = new THREE.CanvasTexture(canvas);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = aniso;
  return t;
}

const SURFACE = {
  concrete(u, v, x, y) {
    const n = fbm(u * 7, v * 5, 3, 5);
    const sp = hash(x, y, 1);
    let base = 0.74 + (n - 0.5) * 0.17 + (sp - 0.5) * 0.1;
    if (hash(x, y, 5) > 0.993) base -= 0.2;
    let height = n * 0.55 + sp * 0.45;
    const joint = Math.abs(u - 0.5);
    if (joint < 0.006) { base *= 0.55 + joint * 60; height = 0; }
    return [base, base * 0.985, base * 0.95, 1, height];
  },
  siding(u, v, x, y) {
    const t = frac(v * 9);
    const shade = 1 - 0.3 * Math.exp(-t * 16) + 0.03 * t;
    const grain = (fbm(u * 46, v * 2.2, 8, 3) - 0.5) * 0.035;
    const b = shade + grain;
    return [0.95 * b, 0.945 * b, 0.91 * b, 1, t * 0.9 + grain];
  },
  roof(u, v, x, y) {
    const rows = 10, tabs = 7;
    const row = Math.floor(v * rows), t = frac(v * rows);
    const tu = frac(u * tabs + (row % 2) * 0.5);
    const tab = Math.floor(u * tabs + (row % 2) * 0.5);
    let b = 0.25 + (hash(tab, row, 9) - 0.5) * 0.09 + (hash(x, y, 2) - 0.5) * 0.11;
    let height = t * 0.7 + hash(x, y, 4) * 0.25;
    if (tu < 0.035) { b *= 0.45; height = 0; }
    b *= 1 - 0.5 * Math.exp(-t * 14);
    return [b * 1.02, b * 0.98, b * 0.95, 1, height];
  },
};

const GRIME = {
  concrete(u, v, x, y) {
    const blot = smooth(0.25, 0.75, fbm(u * 4, v * 3, 9, 5));
    const fine = fbm(u * 46, v * 30, 6, 3), sp = hash(x, y, 3);
    const track = Math.exp(-(((v - 0.32) / 0.06) ** 2)) + Math.exp(-(((v - 0.7) / 0.06) ** 2));
    const g = smooth(0.35, 0.7, fbm(u * 5, v * 4, 21, 4));
    const a = clamp((0.5 + blot * 0.36 + track * 0.3 * fbm(u * 12, v * 2, 5, 3)) * (0.74 + fine * 0.4 + sp * 0.16), 0, 0.95);
    const d = 0.75 + fine * 0.5;
    return [(0.11 + g * 0.07) * d, (0.105 + g * 0.14) * d, (0.08 + g * 0.02) * d, a];
  },
  siding(u, v) {
    const t = frac(v * 9);
    const streak = fbm(u * 34, v * 2.4, 12, 3);
    const patch = fbm(u * 5, v * 4, 31, 3);
    const a = clamp((0.18 + 0.62 * v + streak * 0.3 + 0.25 * Math.exp(-t * 10)) * (0.55 + 0.6 * patch), 0, 0.9);
    const g = fbm(u * 8, v * 8, 2, 2);
    return [0.2 + g * 0.1, 0.3 + g * 0.12, 0.13 + g * 0.04, a];
  },
  roof(u, v) {
    const s = fbm(u * 24, v * 1.5, 4, 4);
    let a = smooth(0.4, 0.66, s) * 0.86 * (0.45 + 0.55 * v) + 0.14;
    let col = [0.05, 0.05, 0.045];
    if (fbm(u * 9, v * 9, 77, 3) > 0.68) { col = [0.22, 0.3, 0.1]; a = 0.92; }
    return [col[0], col[1], col[2], clamp(a, 0, 0.94)];
  },
};

export function surfaceMaps(THREE, kind, aspect, aniso = 4) {
  const small = Math.min(window.innerWidth, window.innerHeight) < 600;
  const w = small ? 512 : 768, h = Math.round(w / aspect);
  const [c, hc] = paint(w, h, SURFACE[kind], true);
  return { map: toTex(THREE, c, true, aniso), bumpMap: toTex(THREE, hc, false, aniso) };
}

export function grimeMap(THREE, kind, aspect, aniso = 4) {
  const w = Math.min(window.innerWidth, window.innerHeight) < 600 ? 448 : 640, h = Math.round(w / aspect);
  const [c] = paint(w, h, GRIME[kind], false);
  return toTex(THREE, c, true, aniso);
}

// Soft round sprite for mist / dust particles.
export function softDot(THREE) {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.4, 'rgba(255,255,255,.45)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}
