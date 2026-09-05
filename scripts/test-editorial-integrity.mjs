#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { marcusMeasuredSummary } from '../src/data/approved-claims.mjs';
import { claimFindings } from './lib/claim-rules.mjs';
import { applyBlogEditorialCache } from './lib/blog-editorial-cache.mjs';
import { POST_EXCERPTS } from './lib/post-seo.mjs';
import { bylineHtml, modifiedIso, removeLegacyGuideUpdatedRow } from './lib/byline.mjs';

assert.deepEqual(claimFindings('<p>No borrower <em>file</em> leaves the building.</p>'), ['borrower-boundary']);
assert.deepEqual(claimFindings('<meta name="description" content="No borrower file leaves the building.">'), ['borrower-boundary']);
assert.deepEqual(claimFindings('<script type="application/ld+json">{"description":"PII is stripped before any model reads a document."}</script>'), ['perfect-filter']);
assert.deepEqual(claimFindings('MARCUS processes documents locally. Selected tasks use external models on filtered text; filtering can miss identifiers. A verified hash chain can detect changes.'), []);
assert.deepEqual(claimFindings('For this fictional example, a $18,000 build and assumed $3,600 annual running cost produce a modeled result. This is not a quote or guarantee.'), []);
assert.deepEqual(claimFindings('A fully local deployment can prohibit external calls. Confirm the approved data boundary in scope.'), []);
assert.deepEqual(claimFindings('<!-- no borrower file leaves the building --><p>Current qualified copy.</p>'), []);

assert.deepEqual(claimFindings('Running on their own hardware with no borrower file leaving the building.'), ['borrower-boundary']);
assert.deepEqual(claimFindings('A Presidio-class filter strips identifiers before any model reads a document.'), ['perfect-filter']);
assert.deepEqual(claimFindings('Identifiers are stripped before any model reads a document.'), ['perfect-filter']);
assert.deepEqual(claimFindings('Log entries can be added, never edited or deleted.'), ['immutable-log-absolute']);
assert.deepEqual(claimFindings('A fixed-scope build of the highest-payback workflow: agents and integrations.'), ['unvalidated-priority']);

const evidence = { signedOff: true, figures: Object.fromEntries(['hours-returned', 'weekly-adoption', 'identifiers-out', 'human-approved'].map((key, i) => [key, { value: [1200, 91, 0, 100][i] }])) };
assert.ok(marcusMeasuredSummary(evidence).includes('1200 staff hours'));
assert.ok(marcusMeasuredSummary(evidence).includes('0 borrower identifiers'));
assert.ok(!marcusMeasuredSummary({ ...evidence, signedOff: false }).includes('1200'));
assert.ok(!marcusMeasuredSummary({ signedOff: true, figures: {} }).includes('1,240'), 'no remembered number for missing proof');

const retired = '<div class="statrail__row"><span class="statrail__k">Updated</span><span class="statrail__v"><time datetime="2026-07-29">July 2026</time></span></div>';
const keep = '<div class="statrail__row"><span class="statrail__k">Timeline</span><span class="statrail__v">2–4 weeks</span></div><p>Updated records help the reviewer.</p>';
assert.equal(removeLegacyGuideUpdatedRow(retired + keep), keep);
assert.equal(removeLegacyGuideUpdatedRow(removeLegacyGuideUpdatedRow(retired + keep)), keep);
const byline = bylineHtml('/guides/ai-consultant-cost/', { reviewed: true });
assert.ok(!byline.includes('Reviewed by'), 'a route category must not invent a named review');
assert.ok(byline.includes(`datetime="${modifiedIso('/guides/ai-consultant-cost/')}"`));
assert.equal((byline.match(/Updated /g) || []).length, 1);

const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'mm-editorial-'));
try {
  fs.mkdirSync(path.join(temp, 'src/data'), { recursive: true });
  fs.mkdirSync(path.join(temp, 'blog-data'));
  const post = { slug: 'ai-managed-services', excerpt: 'without adding full-time AI staff daily.', seoDescription: 'Old feed text.', bodyHtml: '<p>The original body and <a href="https://example.com/source">source</a>.</p>', publishedAt: '2026-08-01', updatedAt: '2026-08-02', webUrl: 'https://example.com/source' };
  const untouched = { slug: 'other-essay', excerpt: 'An existing excerpt.', bodyHtml: '<p>Keep.</p>' };
  const modulePath = path.join(temp, 'src/data/blog-posts.js');
  fs.writeFileSync(modulePath, `export const meta = {"count":2};\nexport const posts = ${JSON.stringify([post, untouched])};\n`);
  fs.writeFileSync(path.join(temp, 'blog-data/index.json'), JSON.stringify({ meta: { count: 2 }, posts: [post, untouched] }));
  fs.writeFileSync(path.join(temp, 'blog-data/ai-managed-services.json'), JSON.stringify(post));
  assert.equal(applyBlogEditorialCache(temp), 3);
  const after = JSON.parse(fs.readFileSync(path.join(temp, 'blog-data/ai-managed-services.json')));
  assert.equal(after.excerpt, POST_EXCERPTS[post.slug]);
  for (const field of ['bodyHtml', 'publishedAt', 'updatedAt', 'webUrl']) assert.equal(after[field], post[field], `preserve ${field}`);
  const index = JSON.parse(fs.readFileSync(path.join(temp, 'blog-data/index.json')));
  assert.equal(index.posts.length, 2);
  assert.deepEqual(index.posts[1], untouched);
  assert.equal(applyBlogEditorialCache(temp), 0, 'idempotent cache update');
  // A later fetch can reintroduce its own excerpt. Applying the same cache
  // boundary must restore the reviewed summary without dropping the article.
  fs.writeFileSync(path.join(temp, 'blog-data/ai-managed-services.json'), JSON.stringify(post));
  assert.equal(applyBlogEditorialCache(temp), 1);
  assert.equal(JSON.parse(fs.readFileSync(path.join(temp, 'blog-data/ai-managed-services.json'))).excerpt, POST_EXCERPTS[post.slug]);
} finally { fs.rmSync(temp, { recursive: true, force: true }); }
console.log('[test:editorial] OK — claim scope, byline deduplication, explicit dates, and feed override preservation.');
