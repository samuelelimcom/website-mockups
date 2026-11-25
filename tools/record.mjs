#!/usr/bin/env node
// Records a narrated-by-motion walkthrough of a built mockup: a desktop pass
// and a phone pass, joined into one MP4 small enough to attach to an email.
//
//   node tools/record.mjs --site sites/<slug> [--port 4321] [--out walkthrough.mp4]
//
// The site must already be built (dist/). The tour itself lives in
// sites/<slug>/tour.mjs so each mockup can show off its own best moments.
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { serve } from './serve.mjs';
import { mkdtempSync, readdirSync, rmSync, statSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > -1 ? process.argv[i + 1] : d; };
const site = path.resolve(arg('site', '.'));
const port = Number(arg('port', 4321));
const out = path.resolve(site, arg('out', 'walkthrough.mp4'));
const base = `http://127.0.0.1:${port}`;
if (!existsSync(path.join(site, 'dist'))) { console.error('Build the site first (npm run build).'); process.exit(1); }

const { desktop, mobile } = await import(pathToFileURL(path.join(site, 'tour.mjs')).href);

// ---- helpers handed to the tour ------------------------------------------
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function helpers(page) {
  return {
    base, sleep,
    go: async (p, wait = 2500) => { await page.goto(base + p, { waitUntil: 'load' }); await sleep(wait); },
    // eased scroll to an absolute Y, a selector, or 'bottom'
    scrollTo: async (target, ms = 2500) => {
      await page.evaluate(async ({ target, ms }) => {
        const max = document.documentElement.scrollHeight - innerHeight;
        let y = target === 'bottom' ? max : typeof target === 'number' ? target
          : document.querySelector(target).getBoundingClientRect().top + scrollY - 90;
        y = Math.max(0, Math.min(max, y));
        const from = scrollY, t0 = performance.now();
        document.documentElement.style.scrollBehavior = 'auto';
        await new Promise((done) => {
          const step = (now) => {
            const t = Math.min(1, (now - t0) / ms), e = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
            scrollTo(0, from + (y - from) * e);
            t < 1 ? requestAnimationFrame(step) : done();
          };
          requestAnimationFrame(step);
        });
      }, { target, ms });
    },
    // glide the (visible) cursor between two points given as fractions of the viewport
    glide: async (x0, y0, x1, y1, ms = 1500) => {
      const { width, height } = page.viewportSize();
      const steps = Math.round(ms / 30);
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        await page.mouse.move((x0 + (x1 - x0) * t) * width, (y0 + (y1 - y0) * t) * height);
        await sleep(30);
      }
    },
    click: async (sel, wait = 700) => { const l = page.locator(sel).first(); await l.scrollIntoViewIfNeeded(); await l.hover().catch(() => {}); await sleep(250); await l.click(); await sleep(wait); },
    type: async (sel, text) => { await page.locator(sel).first().pressSequentially(text, { delay: 55 }); await sleep(300); },
  };
}

const cursorScript = () => {
  addEventListener('DOMContentLoaded', () => {
    const c = document.createElement('div');
    c.style.cssText = 'position:fixed;z-index:99999;left:0;top:0;width:22px;height:22px;margin:-11px 0 0 -11px;border-radius:50%;background:rgba(255,255,255,.55);border:2px solid rgba(0,0,0,.65);pointer-events:none;transform:translate(-50px,-50px)';
    document.body.appendChild(c);
    addEventListener('mousemove', (e) => { c.style.transform = `translate(${e.clientX}px,${e.clientY}px)`; }, true);
  });
};

// ---- run ------------------------------------------------------------------
const server = await serve(path.join(site, 'dist'), port);
const stop = () => server.close();

const tmp = mkdtempSync(path.join(tmpdir(), 'walk-'));
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });

async function pass(name, viewport, opts, tour) {
  const dir = path.join(tmp, name);
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1, recordVideo: { dir, size: viewport }, ...opts });
  if (!opts.isMobile) await ctx.addInitScript(cursorScript);
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await tour(page, helpers(page));
  await ctx.close();
  if (errors.length) console.warn(`[${name}] page errors:`, errors);
  return path.join(dir, readdirSync(dir).find((f) => f.endsWith('.webm')));
}

const d = await pass('desktop', { width: 1280, height: 720 }, {}, desktop);
const m = await pass('mobile', { width: 390, height: 780 }, { isMobile: true, hasTouch: true }, mobile);
await browser.close(); stop();

// Phone footage is centred on a dark 1280x720 frame so both halves share one size.
const vf = '[0:v]fps=25,scale=1280:720,setsar=1[a];[1:v]fps=25,scale=-2:720,pad=1280:720:(ow-iw)/2:0:color=0x07212e,setsar=1[b];[a][b]concat=n=2:v=1:a=0[v]';
// Uploads through Claude's Google connectors are capped at about 3.1 MB per file, so the
// video is encoded at the best quality that stays under LIMIT.
const LIMIT = 2_950_000;
let crf = 28;
for (;;) {
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', d, '-i', m, '-filter_complex', vf, '-map', '[v]', '-c:v', 'libx264', '-preset', 'veryslow', '-crf', String(crf), '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out]);
  if (statSync(out).size <= LIMIT || crf >= 36) break;
  crf++;
}
rmSync(tmp, { recursive: true, force: true });
const size = statSync(out).size;
console.log(`${out}  ${(size / 1048576).toFixed(2)} MB (crf ${crf})${size > LIMIT ? '  STILL OVER 3 MB: shorten the tour' : ''}`);
process.exit(0);
