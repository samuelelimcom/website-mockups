#!/usr/bin/env node
// Prints how many days the Vercel token has left (auth is added by the environment).
//   node tools/token-check.mjs      -> "DAYS_LEFT=<n>" | "NO_EXPIRY" | "UNKNOWN"
// Exit code 0 always; the caller decides what to do with the number.
import { execFileSync } from 'node:child_process';
let out = '';
try { out = execFileSync('curl', ['-s', '-m', '20', 'https://api.vercel.com/v5/user/tokens'], { encoding: 'utf8' }); } catch {}
try {
  const tokens = JSON.parse(out).tokens || [];
  // The token this request used is the one flagged current, else the soonest-expiring one.
  const mine = tokens.find((t) => t.isCurrent) || tokens.filter((t) => t.expiresAt).sort((a, b) => a.expiresAt - b.expiresAt)[0] || tokens[0];
  if (!mine) console.log('UNKNOWN');
  else if (!mine.expiresAt) console.log('NO_EXPIRY');
  else console.log(`DAYS_LEFT=${Math.floor((mine.expiresAt - Date.now()) / 86400000)}`);
} catch { console.log('UNKNOWN'); }
