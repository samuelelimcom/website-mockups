#!/usr/bin/env node
// Random send times for one run, so emails go out at irregular gaps.
//   node tools/send-plan.mjs --count <1-4> [--last <ISO time of the most recent send>]
// Prints SEND1=... up to SEND<count>=... (UTC).
//   SEND1 is 3 to 15 minutes from now and at least 6 minutes after --last.
//   Every later gap is random (at least 6 minutes), no two consecutive gaps are
//   within 3 minutes of each other, and the last send is within 56 minutes of now.
const arg = (k, d = '') => { const i = process.argv.indexOf(`--${k}`); return i > -1 ? process.argv[i + 1] : d; };
const MIN = 60_000, now = Date.now(), END = now + 56 * MIN;
const rnd = (a, b) => a + Math.random() * (b - a);
const count = Math.max(1, Math.min(4, Number(arg('count', '2')) || 2));
const last = arg('last') ? Date.parse(arg('last')) : NaN;
const iso = (t) => new Date(t).toISOString().replace(/\.\d+Z$/, 'Z');
for (let attempt = 0; attempt < 500; attempt++) {
  let t = now + rnd(3, 15) * MIN;
  if (!Number.isNaN(last)) t = Math.max(t, last + rnd(6, 14) * MIN);
  const times = [t];
  let prevGap = Number.isNaN(last) ? null : (t - last) / MIN, ok = true;
  for (let i = 1; i < count; i++) {
    const room = (END - t) / MIN - 6 * (count - 1 - i);   // leave room for the sends still to come
    if (room < 6) { ok = false; break; }
    let gap, tries = 0;
    do { gap = rnd(6, Math.min(room, 30)); } while (prevGap !== null && Math.abs(gap - prevGap) <= 3 && ++tries < 50);
    if (prevGap !== null && Math.abs(gap - prevGap) <= 3) { ok = false; break; }
    t += gap * MIN; times.push(t); prevGap = gap;
  }
  if (ok && times[times.length - 1] <= END) { times.forEach((x, i) => console.log(`SEND${i + 1}=${iso(x)}`)); process.exit(0); }
}
// Could not fit them all (e.g. a very recent --last): send fewer this run.
console.log(`SEND1=${iso(Math.max(now + rnd(3, 15) * MIN, Number.isNaN(last) ? 0 : last + 7 * MIN))}`);
