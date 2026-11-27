#!/usr/bin/env node
// Random send times for one run, so outreach emails go out at irregular gaps.
//   node tools/send-plan.mjs [--last <ISO time of the most recent outreach send>]
// Prints two UTC times: SEND1=... SEND2=...
//   SEND1: 3 to 22 minutes from now, and at least 6 minutes after --last
//   SEND2: 9 to 41 minutes after SEND1, never more than 56 minutes from now
// The gap between the two is never within 3 minutes of the gap since --last,
// so consecutive gaps always differ.
const arg = (k) => { const i = process.argv.indexOf(`--${k}`); return i > -1 ? process.argv[i + 1] : ''; };
const min = 60_000, now = Date.now();
const rnd = (a, b) => a + Math.random() * (b - a);
const last = arg('last') ? Date.parse(arg('last')) : NaN;
let s1 = now + rnd(3, 22) * min;
if (!Number.isNaN(last)) s1 = Math.max(s1, last + rnd(6, 14) * min);
const prevGap = Number.isNaN(last) ? null : (s1 - last) / min;
let gap;
for (let i = 0; i < 50; i++) { gap = rnd(9, 41); if (prevGap === null || Math.abs(gap - prevGap) > 3) break; }
let s2 = Math.min(s1 + gap * min, now + 56 * min);
if (s2 - s1 < 6 * min) s2 = s1 + rnd(6, 9) * min;
const iso = (t) => new Date(t).toISOString().replace(/\.\d+Z$/, 'Z');
console.log(`SEND1=${iso(s1)}\nSEND2=${iso(s2)}`);
