#!/usr/bin/env node
// Publishes a built mockup (sites/<slug>/dist) to Vercel as its own project
// and prints the public link.
//   node tools/deploy.mjs --site sites/<slug>
//
// Auth: the cloud environment holds the Vercel token as a network secret for
// api.vercel.com and adds it to requests itself, so no token is stored here.
// (If VERCEL_TOKEN is set it is used; VERCEL_TEAM_ID is optional.)
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync, existsSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > -1 ? process.argv[i + 1] : d; };
const site = path.resolve(arg('site', '.'));
const dist = path.join(site, 'dist');
if (!existsSync(dist)) { console.error('Build the site first.'); process.exit(1); }
const name = arg('name', `preview-${path.basename(site)}`).toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 52);
const team = process.env.VERCEL_TEAM_ID ? `teamId=${process.env.VERCEL_TEAM_ID}` : '';
const auth = `Authorization: Bearer ${process.env.VERCEL_TOKEN || 'set-by-environment'}`;
const tmp = mkdtempSync(path.join(tmpdir(), 'deploy-'));

function api(method, url, { body, file, headers = [] } = {}) {
  const args = ['-sS', '-m', '120', '-X', method, '-H', auth, '-w', '\n%{http_code}'];
  for (const h of headers) args.push('-H', h);
  if (body) { const f = path.join(tmp, 'body.json'); writeFileSync(f, JSON.stringify(body)); args.push('-H', 'Content-Type: application/json', '--data-binary', `@${f}`); }
  if (file) args.push('-H', 'Content-Type: application/octet-stream', '--data-binary', `@${file}`);
  const q = team ? (url.includes('?') ? `&${team}` : `?${team}`) : '';
  const res = execFileSync('curl', [...args, `https://api.vercel.com${url}${q}`], { encoding: 'utf8', maxBuffer: 1 << 26 });
  const i = res.lastIndexOf('\n'), status = Number(res.slice(i + 1));
  let json = {}; try { json = JSON.parse(res.slice(0, i)); } catch {}
  return { status, json };
}

const who = api('GET', '/v2/user');
if (who.status !== 200) {
  console.error(`Vercel refused the request (HTTP ${who.status}). The Vercel token is missing or invalid in this environment's network secrets for api.vercel.com.`);
  process.exit(2);
}

const files = [];
(function walk(d, rel) {
  for (const f of readdirSync(d)) {
    const p = path.join(d, f);
    if (statSync(p).isDirectory()) walk(p, `${rel}${f}/`);
    else files.push({ file: rel + f, abs: p, sha: createHash('sha1').update(readFileSync(p)).digest('hex'), size: statSync(p).size });
  }
})(dist, '');

for (const f of files) {
  const r = api('POST', '/v2/files', { file: f.abs, headers: [`x-vercel-digest: ${f.sha}`, `Content-Length: ${f.size}`] });
  if (r.status >= 300) { console.error(`Upload failed for ${f.file}: HTTP ${r.status} ${JSON.stringify(r.json.error || {})}`); process.exit(3); }
}

const dep = api('POST', '/v13/deployments?skipAutoDetectionConfirmation=1', {
  body: { name, target: 'production', files: files.map(({ file, sha, size }) => ({ file, sha, size })), projectSettings: { framework: null, buildCommand: null, installCommand: null, outputDirectory: null } },
});
if (dep.status >= 300) { console.error(`Deploy failed: HTTP ${dep.status} ${JSON.stringify(dep.json.error || dep.json)}`); process.exit(4); }

let d = dep.json;
for (let i = 0; i < 60 && !['READY', 'ERROR', 'CANCELED'].includes(d.readyState); i++) {
  execFileSync('sleep', ['3']);
  d = api('GET', `/v13/deployments/${dep.json.id}`).json;
}
if (d.readyState !== 'READY') { console.error(`Deployment ended as ${d.readyState}`); process.exit(5); }

// Mockups must open without a Vercel login, so switch off deployment protection for this project.
if (d.projectId) {
  api('PATCH', `/v9/projects/${d.projectId}`, { body: { ssoProtection: null } });
  const proj = api('GET', `/v9/projects/${d.projectId}`).json;
  if (proj.ssoProtection || proj.passwordProtection) { console.error('Deployed, but the project still requires a login to view.'); process.exit(6); }
}

const alias = (d.alias || []).find((a) => a.endsWith('.vercel.app')) || d.url;
console.log(`https://${alias}`);
