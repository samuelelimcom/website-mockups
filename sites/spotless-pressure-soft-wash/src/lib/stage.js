// Generic WebGL stage shared by every 3D scene in a mockup.
// Handles: capped pixel ratio, studio lighting with no HDR download, resizing,
// pausing when off-screen or the tab is hidden, and reduced-motion.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

export { THREE };

export function createStage(host, canvas, opts = {}) {
  const coarse = matchMedia('(pointer: coarse)').matches;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const dprCap = opts.dprCap ?? (coarse ? 1.5 : 1.75);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, dprCap));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = opts.exposure ?? 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = opts.envIntensity ?? 0.85;
  pmrem.dispose();

  const camera = new THREE.PerspectiveCamera(opts.fov ?? 32, 1, 0.1, 60);

  const key = new THREE.DirectionalLight(0xfff4e2, 2.6);
  key.position.set(-4, 7, 3.5);
  key.castShadow = true;
  key.shadow.mapSize.set(coarse ? 512 : 1024, coarse ? 512 : 1024);
  Object.assign(key.shadow.camera, { left: -5, right: 5, top: 5, bottom: -5, near: 0.5, far: 20 });
  key.shadow.bias = -0.0005; key.shadow.radius = 4;
  scene.add(key);

  const size = { w: 1, h: 1, aspect: 1 };
  const resizeFns = [], frameFns = [];
  function resize() {
    const r = host.getBoundingClientRect();
    size.w = Math.max(1, Math.round(r.width)); size.h = Math.max(1, Math.round(r.height));
    size.aspect = size.w / size.h;
    renderer.setSize(size.w, size.h, false);
    camera.aspect = size.aspect;
    camera.updateProjectionMatrix();
    resizeFns.forEach((f) => f(size));
    renderOnce();
  }
  const ro = new ResizeObserver(resize);
  ro.observe(host);

  let visible = false, running = false, last = 0, time = 0;
  function tick(now) {
    const dt = Math.min(0.05, (now - last) / 1000 || 0.016);
    last = now; time += dt;
    frameFns.forEach((f) => f(dt, time));
    renderer.render(scene, camera);
  }
  function renderOnce() { frameFns.forEach((f) => f(0, time)); renderer.render(scene, camera); }
  function update() {
    const should = visible && !document.hidden;
    if (should && !running) { running = true; last = performance.now(); renderer.setAnimationLoop(tick); }
    else if (!should && running) { running = false; renderer.setAnimationLoop(null); }
  }
  const io = new IntersectionObserver((e) => { visible = e[0].isIntersecting; update(); }, { rootMargin: '80px' });
  io.observe(host);
  document.addEventListener('visibilitychange', update);

  return {
    THREE, renderer, scene, camera, key, size, coarse, reduced,
    onFrame: (f) => frameFns.push(f),
    onResize: (f) => { resizeFns.push(f); f(size); },
    start: () => { resize(); update(); },
  };
}

export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const smoothstep = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
// Frame-rate independent damping toward a target.
export const damp = (cur, target, lambda, dt) => lerp(cur, target, 1 - Math.exp(-lambda * dt));

// 0..1 progress of the viewport travelling through a tall wrapper element.
export function scrollProgress(el) {
  const r = el.getBoundingClientRect();
  const span = r.height - window.innerHeight;
  return span <= 0 ? 0 : clamp(-r.top / span);
}
