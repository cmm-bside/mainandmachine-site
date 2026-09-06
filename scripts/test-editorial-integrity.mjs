#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { marcusMeasuredSummary } from '../src/data/approved-claims.mjs';
import { claimFindings } from './lib/claim-rules.mjs';
import { applyBlogEditorialCache } from './lib/blog-editorial-cache.mjs';
import { POST_EXCERPTS } from './lib/post-seo.mjs';
import { bylineHtml, modifiedIso, removeLegacyGuideUpdatedRow } from './lib/byline.mjs';
import { editorialSignature, lastEditorialCommitDate } from './lib/page-editorial-date.mjs';

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
// Real history demonstrates that repeated navigation-only releases do not
// claim a new editorial date, while a changed destination or offer does.
const dateRepo = fs.mkdtempSync(path.join(os.tmpdir(), 'mm-page-dates-'));
try {
  const git = (args, env = {}) => execFileSync('git', args, { cwd: dateRepo, stdio: 'ignore', env: { ...process.env, ...env } });
  git(['init']);
  const original = '<html><head><title>Workflow plan</title><meta name="description" content="A preliminary recommendation."><link rel="stylesheet" href="/styles.css?v=1"></head><body><header>Old menu</header><main><h1>One task</h1><a href="/plan/">Get a free workflow plan</a><img src="/diagram.svg" alt="Workflow"></main><footer>Old footer</footer></body></html>';
  const commit = (html, day) => {
    fs.writeFileSync(path.join(dateRepo, 'index.html'), html);
    git(['add', 'index.html']);
    git(['-c', 'user.name=Editorial QA', '-c', 'user.email=qa@example.invalid', '-c', 'commit.gpgsign=false', 'commit', '-m', 'fixture'], { GIT_AUTHOR_DATE: `${day}T12:00:00Z`, GIT_COMMITTER_DATE: `${day}T12:00:00Z` });
  };
  commit(original, '2026-09-01');
  const chrome = original.replace('Old menu', 'Short menu').replace('Old footer', 'Short footer').replace('v=1', 'v=2').replace('Get a free workflow plan', 'Get my free plan');
  commit(chrome, '2026-09-02');
  assert.equal(lastEditorialCommitDate(dateRepo, 'index.html'), '2026-09-01', 'shared chrome, equivalent CTA labels and cache versions cannot manufacture freshness');
  const linked = chrome.replace('href="/plan/"', 'href="/plan/sample/"');
  commit(linked, '2026-09-03');
  assert.equal(lastEditorialCommitDate(dateRepo, 'index.html'), '2026-09-03', 'a changed main-content destination is substantive');
  const described = linked.replace('A preliminary recommendation.', 'A free preliminary recommendation.');
  commit(described, '2026-09-04');
  commit(described.replace('Short menu', 'Latest menu'), '2026-09-05');
  assert.equal(lastEditorialCommitDate(dateRepo, 'index.html'), '2026-09-04', 'metadata changes survive a later chrome-only release');
  assert.notEqual(editorialSignature(original), editorialSignature(original.replace('One task', 'One reviewed task')));
  assert.notEqual(editorialSignature(original), editorialSignature(original.replace('/diagram.svg', '/new-diagram.svg')));
  assert.notEqual(editorialSignature(original), editorialSignature(original.replace('</head>', '<script type="application/ld+json">{"@type":"Offer","price":0}</script></head>')));
} finally { fs.rmSync(dateRepo, { recursive: true, force: true }); }
console.log('[test:editorial] OK — claim scope, byline dates, feed preservation, and content-based sitemap dates.');

// Website revisions survive both cached builds and a fresh upstream edition.
const { applyPostRevision } = await import('./lib/post-revisions.mjs');
const { proofBrief } = await import('./lib/proof-brief.mjs');
for (const slug of ['how-long-does-ai-implementation-take', 'ai-readiness-audit', 'how-to-measure-ai-roi']) {
  const source = {slug, title:'Upstream title', bodyHtml:'<p>Upstream body.</p>', url:`/blog/${slug}/`, publishedAt:'2026-08-01T00:00:00Z', source:'soro', sourceId:slug, webUrl:'https://example.invalid/original'};
  const revised=applyPostRevision({...source});
  assert.notEqual(revised.bodyHtml,source.bodyHtml);
  assert.ok(revised.bodyHtml.includes('/guides/'));
  for (const field of ['url','publishedAt','source','sourceId','webUrl']) assert.equal(revised[field],source[field]);
  assert.deepEqual(applyPostRevision({...revised}),revised,'repeated build is stable');
  assert.deepEqual(applyPostRevision({...source,updatedAt:'2026-09-20'}),revised,'upstream refresh cannot overwrite the website edition or invent freshness');
}
const unknown={slug:'unrelated',title:'Keep',bodyHtml:'<p>Keep.</p>'};
assert.deepEqual(applyPostRevision({...unknown}),unknown);
const briefLog={marcus:{signed_off:true,measurement_window:'verified test window',approval:{approved_on:'2026-09-01'},scorecard:[{value:'321',unit:'hrs',desc:'Test figure.'}]}};
assert.ok(proofBrief(briefLog).includes('321 hrs'));
assert.ok(proofBrief(briefLog).includes('founder-affiliated'));
assert.ok(!proofBrief({marcus:{...briefLog.marcus,signed_off:false}}).includes('321'));
assert.ok(!proofBrief({}).includes('1,240'));
console.log('[test:editorial] Website revision persistence and evidence withdrawal pass.');
