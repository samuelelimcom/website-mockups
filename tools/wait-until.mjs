#!/usr/bin/env node
// Waits until a UTC time, at most 9 minutes per call (tool calls time out at 10).
//   node tools/wait-until.mjs 2026-11-27T14:32:00Z
// Prints DUE when the time has come, or WAITING <minutes left> after 9 minutes:
// call it again (or do other work and call it again) until it prints DUE.
const target = Date.parse(process.argv[2] || '');
if (Number.isNaN(target)) { console.error('Give an ISO time, e.g. 2026-11-27T14:32:00Z'); process.exit(1); }
const left = target - Date.now();
const wait = Math.max(0, Math.min(left, 9 * 60_000));
setTimeout(() => {
  const rest = target - Date.now();
  console.log(rest <= 1000 ? 'DUE' : `WAITING ${(rest / 60_000).toFixed(1)}`);
}, wait);
