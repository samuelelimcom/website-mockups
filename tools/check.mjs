#!/usr/bin/env node
// Loads every page of a built mockup at phone, tablet and desktop widths.
// Fails on console errors or sideways scrolling and saves screenshots to
// sites/<slug>/shots/ so the agent can LOOK at the result before publishing.
//   node tools/check.mjs --site sites/<slug> [--port 4322]
import { createRequire } from 'node:module';
import { serve } from './serve.mjs';
import { mkdirSync, readdirSync, statSync, existsSync } from 'node:fs';
import path from 'node:path';
const { chromium } = createRequire(import.meta.url)('playwright');
const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > -1 ? process.argv[i + 1] : d; };
const site = path.resolve(arg('site', '.')), port = Number(arg('port', 4322)), base = `http://127.0.0.1:${port}`;
const dist = path.join(site, 'dist');
if (!existsSync(dist)) { console.error('Build the site first.'); process.exit(1); }
const pages = [];
(function walk(d, rel) { for (const f of readdirSync(d)) { const p = path.join(d, f); if (statSync(p).isDirectory()) walk(p, `${rel}${f}/`); else if (f === 'index.html') pages.push(rel); } })(dist, '/');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const server = await serve(dist, port);
const shots = path.join(site, 'shots'); mkdirSync(shots, { recursive: true });
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const sizes = { phone: [390, 844], tablet: [820, 1180], desktop: [1440, 900] };
const problems = [];
for (const [name, [width, height]] of Object.entries(sizes)) {
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1, hasTouch: name !== 'desktop', isMobile: name === 'phone' });
  const page = await ctx.newPage();
  let where = '';
  page.on('console', (m) => { if (m.type() === 'error') problems.push(`${name} ${where}: ${m.text()}`); });
  page.on('pageerror', (e) => problems.push(`${name} ${where}: ${e.message}`));
  for (const p of pages) {
    where = p;
    await page.goto(base + p, { waitUntil: 'load' });
    await sleep(3500);
    const file = `${name}${p.replace(/\//g, '_')}`;
    await page.screenshot({ path: path.join(shots, `${file}top.png`) });
    await page.evaluate(() => scrollTo(0, (document.documentElement.scrollHeight - innerHeight) * 0.45));
    await sleep(1800);
    await page.screenshot({ path: path.join(shots, `${file}mid.png`) });
    const over = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    if (over > 1) problems.push(`${name} ${p}: page scrolls sideways by ${over}px`);
    const webgl = await page.evaluate(() => [...document.querySelectorAll('[data-stage]')].map((s) => s.classList.contains('is-live')));
    if (webgl.includes(false)) problems.push(`${name} ${p}: a 3D stage did not start`);
  }
  await ctx.close();
}
await browser.close(); server.close();
// rough weight report: what a first visit downloads before the lazy 3D chunk
let html = 0, eager = 0, lazy = 0;
(function walk(d) { for (const f of readdirSync(d)) { const p = path.join(d, f), s = statSync(p); if (s.isDirectory()) walk(p); else if (f.endsWith('.html')) html = Math.max(html, s.size); else if (/\.(js)$/.test(f) && s.size > 200000) lazy += s.size; else if (/\.(js|css)$/.test(f)) eager += s.size; } })(dist);
console.log(`pages: ${pages.length}  largest html: ${(html / 1024).toFixed(0)} KB  eager js/css: ${(eager / 1024).toFixed(0)} KB  lazy 3D: ${(lazy / 1024).toFixed(0)} KB (uncompressed)`);
console.log(problems.length ? `PROBLEMS\n${problems.join('\n')}` : `OK: no errors. Screenshots in ${shots}`);
process.exit(problems.length ? 1 : 0);
