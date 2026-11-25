// "The clean line": a real-time 3D sample of the customer's own surface
// (driveway concrete, lap siding or roof shingles) that gets washed as the
// visitor scrolls, or by their own pointer / finger.
import { createStage, THREE, clamp, lerp, smoothstep, damp, scrollProgress } from '../lib/stage.js';
import { surfaceMaps, grimeMap, softDot } from '../lib/textures.js';

const W = 4.2, H = 2.8;

const CFG = {
  concrete: {
    thick: 0.3, rot: [0, -0.42], side: 0x9a978f, rough: 0.93, bump: 0.05, rows: 5, ground: -0.75,
    fan: 0.26, sprayOpacity: 0.62,
    cams: [
      { p: [3.6, 3.3, 5.4], t: [0, 0, 0], fit: 2.7 },
      { p: [-1.9, 0.8, 2.3], t: [-0.8, 0, 0.1], fit: 1.0 },
      { p: [2.9, 3.3, 4.4], t: [0, 0, 0], fit: 2.6 },
      { p: [0.2, 7.6, 2.6], t: [0, 0, 0], fit: 3.1 },
    ],
  },
  siding: {
    thick: 0.14, rot: [Math.PI / 2 - 0.05, -0.36], side: 0xd9d6cc, rough: 0.62, bump: 0.09, rows: 5, ground: -1.75,
    fan: 0.5, sprayOpacity: 0.42,
    cams: [{ p: [2.6, 0.5, 7.2], t: [0, -0.05, 0], fit: 2.6 }],
  },
  roof: {
    thick: 0.16, rot: [0.6, -0.34], side: 0x2a2826, rough: 0.96, bump: 0.08, rows: 5, ground: -1.35,
    fan: 0.5, sprayOpacity: 0.4,
    cams: [{ p: [2.4, 2.2, 6.8], t: [0, -0.1, 0], fit: 2.6 }],
  },
};

function buildWand() {
  const g = new THREE.Group();
  const metal = new THREE.MeshStandardMaterial({ color: 0xdfe3e8, metalness: 1, roughness: 0.24 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x14181c, metalness: 0.3, roughness: 0.55 });
  const accent = new THREE.MeshStandardMaterial({ color: 0x22c3d6, metalness: 0.2, roughness: 0.4 });
  const add = (geo, mat, x, y, z, rx = 0) => {
    const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.x = rx; m.castShadow = true; g.add(m); return m;
  };
  add(new THREE.CylinderGeometry(0.014, 0.034, 0.07, 20), dark, 0, 0.035, 0);
  add(new THREE.CylinderGeometry(0.036, 0.036, 0.1, 20), dark, 0, 0.12, 0);
  add(new THREE.CylinderGeometry(0.026, 0.026, 1.45, 16), metal, 0, 0.89, 0);
  add(new THREE.CylinderGeometry(0.034, 0.034, 0.07, 20), accent, 0, 1.56, 0);
  add(new THREE.BoxGeometry(0.085, 0.36, 0.12), dark, 0, 1.78, 0);
  add(new THREE.BoxGeometry(0.075, 0.3, 0.095), dark, 0, 1.76, 0.15, -0.55);
  add(new THREE.CylinderGeometry(0.026, 0.026, 0.3, 14), dark, 0, 2.08, 0);
  return g;
}

function buildSpray(cfg) {
  const h = 0.62;
  const c = document.createElement('canvas'); c.width = 4; c.height = 64;
  const ctx = c.getContext('2d');
  const grad = ctx.createLinearGradient(0, 0, 0, 64);
  grad.addColorStop(0, '#fff'); grad.addColorStop(0.5, '#999'); grad.addColorStop(1, '#222');
  ctx.fillStyle = grad; ctx.fillRect(0, 0, 4, 64);
  const mat = new THREE.MeshBasicMaterial({
    color: 0xa9e3f2, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide,
    alphaMap: new THREE.CanvasTexture(c),
  });
  const cone = new THREE.Mesh(new THREE.ConeGeometry(cfg.fan, h, 28, 1, true), mat);
  cone.position.y = -h / 2; cone.scale.z = 0.28; cone.renderOrder = 3;
  return { cone, mat, h };
}

export function mount(el) {
  const canvas = el.querySelector('canvas');
  const kind = el.dataset.surface in CFG ? el.dataset.surface : 'concrete';
  const cfg = CFG[kind];
  const mode = el.dataset.mode === 'scroll' ? 'scroll' : 'auto';
  const track = mode === 'scroll' ? document.querySelector(el.dataset.track) : null;

  let stage;
  try { stage = createStage(el, canvas); } catch (e) { return; }
  const { scene, camera, renderer } = stage;
  const aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());

  // ---- surface sample -------------------------------------------------
  const group = new THREE.Group();
  group.rotation.order = 'YXZ';
  group.rotation.set(cfg.rot[0], cfg.rot[1], 0);
  scene.add(group);

  const maps = surfaceMaps(THREE, kind, W / H, aniso);
  const top = new THREE.Mesh(
    new THREE.PlaneGeometry(W, H),
    new THREE.MeshStandardMaterial({ map: maps.map, bumpMap: maps.bumpMap, bumpScale: cfg.bump * 20, roughness: cfg.rough, metalness: 0 }),
  );
  top.rotation.x = -Math.PI / 2; top.receiveShadow = true; group.add(top);

  const body = new THREE.Mesh(
    new THREE.BoxGeometry(W, cfg.thick, H),
    new THREE.MeshStandardMaterial({ color: cfg.side, roughness: 0.95 }),
  );
  body.position.y = -cfg.thick / 2 - 0.002; body.castShadow = true; group.add(body);

  // grime sits a hair above the surface; its alphaMap is the "wash mask"
  const mw = 256, mh = Math.round(256 / (W / H));
  const mcan = document.createElement('canvas'); mcan.width = mw; mcan.height = mh;
  const mctx = mcan.getContext('2d');
  const maskTex = new THREE.CanvasTexture(mcan);
  const grimeMat = new THREE.MeshStandardMaterial({
    map: grimeMap(THREE, kind, W / H, aniso), alphaMap: maskTex, transparent: true, roughness: 1, depthWrite: false,
    polygonOffset: true, polygonOffsetFactor: -2,
  });
  const grime = new THREE.Mesh(new THREE.PlaneGeometry(W, H), grimeMat);
  grime.rotation.x = -Math.PI / 2; grime.position.y = 0.003; grime.receiveShadow = true; grime.renderOrder = 1;
  group.add(grime);

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.ShadowMaterial({ opacity: 0.2 }));
  ground.rotation.x = -Math.PI / 2; ground.position.y = cfg.ground; ground.receiveShadow = true; scene.add(ground);

  // ---- wand, spray, mist ----------------------------------------------
  const wand = buildWand();
  const spray = buildSpray(cfg);
  wand.add(spray.cone);
  group.add(wand);
  const away = new THREE.Vector3(0.22, 1, 0.42).normalize();
  wand.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), away);

  const N = stage.reduced ? 0 : (stage.coarse ? 60 : 110);
  const mpos = new Float32Array(N * 3).fill(-99), mvel = new Float32Array(N * 3), mlife = new Float32Array(N);
  const mgeo = new THREE.BufferGeometry();
  mgeo.setAttribute('position', new THREE.BufferAttribute(mpos, 3));
  const mist = new THREE.Points(mgeo, new THREE.PointsMaterial({
    size: 0.2, map: softDot(THREE), transparent: true, opacity: 0.7, depthWrite: false, color: 0xcdeff7,
  }));
  mist.frustumCulled = false; mist.renderOrder = 4; group.add(mist);

  // ---- wash mask ---------------------------------------------------------
  const rows = cfg.rows, rowH = mh / rows;
  let strokes = [], strokePts = 0, maskDirty = true, drawn = -1;
  function drawMask(p) {
    mctx.shadowBlur = 0; mctx.fillStyle = '#fff'; mctx.fillRect(0, 0, mw, mh);
    mctx.strokeStyle = '#000'; mctx.lineCap = 'round'; mctx.lineJoin = 'round';
    mctx.shadowColor = '#000'; mctx.shadowBlur = 7; mctx.lineWidth = rowH * 1.04;
    const t = p * rows, full = Math.min(rows, Math.floor(t + 1e-6));
    for (let k = 0; k < rows; k++) {
      const y = (k + 0.5) * rowH; let a, b;
      if (k < full) { a = -20; b = mw + 20; }
      else if (k === full && t - full > 0.004) {
        const f = t - full;
        if (k % 2 === 0) { a = -20; b = f * mw; } else { a = mw + 20; b = (1 - f) * mw; }
      } else continue;
      mctx.beginPath(); mctx.moveTo(a, y); mctx.lineTo(b, y); mctx.stroke();
    }
    mctx.lineWidth = rowH * 0.85;
    for (const s of strokes) {
      mctx.beginPath(); mctx.moveTo(s[0], s[1]);
      if (s.length === 2) mctx.lineTo(s[0] + 0.1, s[1]);
      for (let i = 2; i < s.length; i += 2) mctx.lineTo(s[i], s[i + 1]);
      mctx.stroke();
    }
    maskTex.needsUpdate = true; drawn = p; maskDirty = false;
  }
  function headUV(p) {
    const t = clamp(p) * rows, row = Math.min(rows - 1, Math.floor(t));
    const f = clamp(t - row);
    return [row % 2 === 0 ? f : 1 - f, (row + 0.5) / rows];
  }

  // ---- pointer washing ------------------------------------------------
  let clock = 0;
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  let pointerAt = -10, pointerUV = [0.5, 0.5], newStroke = true, touched = false;
  const hint = el.querySelector('[data-hint]');
  function onPointer(e) {
    if (e.pointerType === 'touch' && e.type === 'pointermove' && !e.isPrimary) return;
    const r = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -(((e.clientY - r.top) / r.height) * 2 - 1));
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObject(top, false)[0];
    if (!hit) { newStroke = true; return; }
    const x = hit.uv.x * mw, y = (1 - hit.uv.y) * mh;
    if (newStroke || !strokes.length) { strokes.push([x, y]); newStroke = false; }
    else strokes[strokes.length - 1].push(x, y);
    strokePts++;
    if (strokePts > 700) { strokePts -= strokes[0].length / 2; strokes.shift(); }
    pointerUV = [hit.uv.x, 1 - hit.uv.y]; pointerAt = clock; maskDirty = true;
    if (!touched) { touched = true; hint && hint.classList.add('is-done'); }
  }
  canvas.addEventListener('pointermove', onPointer, { passive: true });
  canvas.addEventListener('pointerdown', (e) => { newStroke = true; onPointer(e); }, { passive: true });
  canvas.addEventListener('pointerleave', () => { newStroke = true; }, { passive: true });

  // ---- camera ----------------------------------------------------------
  const camPos = new THREE.Vector3(), camTgt = new THREE.Vector3(), a = new THREE.Vector3(), b = new THREE.Vector3();
  // In the scroll story the copy sits beside the model on desktop and in a
  // card under it on phones/tablets, so the model is shifted out of its way.
  let layout = 'box', lastShift = -1, cFloat = 0;
  function applyOffset(force) {
    const { w, h } = stage.size;
    if (layout === 'side') { if (force) camera.setViewOffset(w, h, -w * 0.2, 0, w, h); }
    else if (layout === 'bottom') {
      const shift = lerp(0.3, 0.17, clamp(cFloat));
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
    // pull back until `fit` world-units of half-width are in frame (matters on phones)
    const need = (fit * (layout === 'side' ? 1.5 : 1)) / (Math.tan((camera.fov * Math.PI) / 360) * stage.size.aspect);
    a.sub(camTgt);
    const d = a.length();
    camPos.copy(camTgt).addScaledVector(a.normalize(), Math.max(d, need));
  }

  // ---- frame loop ------------------------------------------------------
  let wash = mode === 'auto' && stage.reduced ? 0.55 : 0, sprayAmt = 0, first = true;
  const head = new THREE.Vector3(-W / 2, 0, -H / 2 + rowH / mh * H / 2), tgt = new THREE.Vector3();
  const CYCLE = 15;
  stage.onFrame((dt) => {
    clock += dt;
    let target = wash, active = false;
    if (mode === 'scroll' && track) {
      const p = scrollProgress(track);
      target = p < 0.3 ? 0 : p < 0.5 ? lerp(0, 0.1, (p - 0.3) / 0.2) : p < 0.8 ? lerp(0.1, 0.86, (p - 0.5) / 0.3) : lerp(0.86, 1, clamp((p - 0.8) / 0.1));
      active = target > 0.004 && target < 0.996;
      cFloat = damp(cFloat, p * (cfg.cams.length - 1), 5, dt || 1);
    } else if (!stage.reduced) {
      const t = clock % CYCLE;
      if (t < 1.4) { target = 0; grimeMat.opacity = 1; }
      else if (t < 10.4) { target = (t - 1.4) / 9; active = true; grimeMat.opacity = 1; }
      else if (t < 13.6) { target = 1; }
      else {
        if (wash !== 0) { wash = 0; strokes = []; strokePts = 0; maskDirty = true; }
        target = 0; grimeMat.opacity = (t - 13.6) / 1.4;
      }
    }
    if (mode === 'auto' && !stage.reduced) wash = target > wash ? Math.min(target, wash + dt * 0.5 + (target - wash)) : target;
    else if (mode === 'scroll') wash = first ? target : damp(wash, target, 7, dt);
    if (maskDirty || Math.abs(wash - drawn) > 0.0015) drawMask(wash);

    const byPointer = clock - pointerAt < 1.1;
    const uv = byPointer ? pointerUV : headUV(wash);
    tgt.set((uv[0] - 0.5) * W, 0, (uv[1] - 0.5) * H);
    if (first) head.copy(tgt); else head.lerp(tgt, 1 - Math.exp(-(byPointer ? 16 : 9) * dt));
    const spraying = (byPointer || active) && !stage.reduced;
    sprayAmt = damp(sprayAmt, spraying ? 1 : 0, 6, dt);
    wand.position.copy(head).addScaledVector(away, spray.h + (1 - sprayAmt) * 1.3);
    wand.visible = sprayAmt > 0.02 || spraying;
    spray.mat.opacity = cfg.sprayOpacity * sprayAmt * (0.85 + 0.15 * Math.sin(clock * 40));
    spray.cone.scale.x = 1 + 0.05 * Math.sin(clock * 23);

    for (let i = 0; i < N; i++) {
      const j = i * 3;
      mlife[i] -= dt;
      if (mlife[i] <= 0) {
        if (spraying && Math.random() < 0.5) {
          mlife[i] = 0.35 + Math.random() * 0.5;
          mpos[j] = head.x + (Math.random() - 0.5) * 0.3; mpos[j + 1] = 0.03; mpos[j + 2] = head.z + (Math.random() - 0.5) * 0.14;
          mvel[j] = (Math.random() - 0.5) * 1.5; mvel[j + 1] = 0.5 + Math.random() * 1.1; mvel[j + 2] = (Math.random() - 0.5) * 1.5;
        } else { mpos[j + 1] = -99; }
      } else {
        mvel[j + 1] -= 2.2 * dt;
        mpos[j] += mvel[j] * dt; mpos[j + 1] += mvel[j + 1] * dt; mpos[j + 2] += mvel[j + 2] * dt;
      }
    }
    if (N) mgeo.attributes.position.needsUpdate = true;

    if (!stage.reduced) group.position.y = Math.sin(clock * 0.7) * 0.03;
    applyOffset(false);
    camFor(mode === 'scroll' ? cFloat : 0);
    if (mode === 'auto' && !stage.reduced) camPos.x += Math.sin(clock * 0.25) * 0.35;
    camera.position.copy(camPos); camera.lookAt(camTgt);
    if (dt > 0) first = false;
  });

  stage.start();
  el.classList.add('is-live');
}
