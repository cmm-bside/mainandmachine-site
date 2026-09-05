#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, LOCAL_SCRATCH_DIRS } from './lib/config.mjs';
import { FAQ } from './lib/faq-data.mjs';
import { BUILDS } from './lib/builds.mjs';
import { APPROVED_CLAIMS } from '../src/data/approved-claims.mjs';
import { claimFindings } from './lib/claim-rules.mjs';

const issues = [];
let count = 0;
function check(label, text) {
  count++;
  for (const id of claimFindings(text)) issues.push(`${label}: retired claim ${id}`);
}
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || entry.name === 'emails') continue;
    if (dir === ROOT && LOCAL_SCRATCH_DIRS.has(entry.name)) continue;
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(file);
    else if (entry.name.endsWith('.html')) check(path.relative(ROOT, file), fs.readFileSync(file, 'utf8'));
  }
}
walk(ROOT);
check('FAQ source', JSON.stringify(FAQ));
check('build catalog source', JSON.stringify(BUILDS));
for (const file of ['llms.txt', 'llms-full.txt', 'facts.json']) {
  if (!fs.existsSync(path.join(ROOT, file))) issues.push(`${file}: missing generated artifact`);
  else check(file, fs.readFileSync(path.join(ROOT, file), 'utf8'));
}
if (fs.existsSync(path.join(ROOT, 'design/home-reference.html')))
  issues.push('design/home-reference.html: retired design reference must stay outside the deployment root');
const sheet = fs.readFileSync(path.join(ROOT, 'llms.txt'), 'utf8');
for (const key of ['marcusArchitecture', 'privacyFilter', 'auditLog', 'evidenceLimits', 'timeValue']) {
  if (!sheet.includes(APPROVED_CLAIMS[key].text)) issues.push(`llms.txt: missing qualified ${key} claim`);
}
const facts = JSON.parse(fs.readFileSync(path.join(ROOT, 'facts.json'), 'utf8'));
if (JSON.stringify(facts.approvedClaims) !== JSON.stringify(APPROVED_CLAIMS))
  issues.push('facts.json: approvedClaims differ from the sourced registry');
for (const [key, claim] of Object.entries(APPROVED_CLAIMS)) {
  if (!claim.sources.length) issues.push(`${key}: missing source`);
  for (const source of claim.sources.filter(url => url.startsWith('/'))) {
    const file = source.endsWith('/') ? `${source.slice(1)}index.html` : source.slice(1);
    if (!fs.existsSync(path.join(ROOT, file))) issues.push(`${key}: source ${source} does not resolve`);
  }
}
if (issues.length) {
  console.error(`[claims:check] FAILED (${issues.length})\n${issues.map(issue => '  - ' + issue).join('\n')}`);
  process.exit(1);
}
console.log(`[claims:check] OK — ${count} HTML, FAQ, catalog, and generated surfaces; qualified registry and source links agree.`);
