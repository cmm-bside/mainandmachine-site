#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
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

// Target only the retired blanket one-minute response promise. Layout and
// metadata cannot hide it; qualified workflow descriptions remain allowed.
for (const text of [
  'Every inbound lead gets a real reply in under a minute.',
  'Replies to every inbound lead within one minute.',
  'Answers every enquiry within a minute.',
  'Answers every inquiry within one minute.',
  '<p>Every <strong>inbound lead</strong> gets a real reply within one minute.</p>',
  '<meta name="description" content="Every lead gets a real reply in under a minute.">',
  '<script type="application/ld+json">{"description":"Replies to every inbound lead within one minute."}</script>',
]) assert.deepEqual(claimFindings(text), ['unqualified-lead-speed'], text);
for (const text of [
  'We prepare a reply for review. Your team decides when to send it.',
  'In this illustrative workflow, an acknowledgement can be sent within a minute when the inbox and integrations are available.',
  'We aim to draft a response within one minute; complex inquiries are routed to the team.',
  'Every inbound lead gets a real reply. Review time depends on the request and the team.',
  '<!-- Every inbound lead gets a real reply within one minute. --><p>Current qualified copy.</p>',
  '<style>/* Replies to every inbound lead within one minute. */</style><p>Current qualified copy.</p>',
]) assert.deepEqual(claimFindings(text), [], text);

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
for (const slug of ['how-long-does-ai-implementation-take', 'ai-readiness-audit', 'how-to-measure-ai-roi', 'will-this-replace-my-office-manager']) {
  const source = {slug, title:'Upstream title', bodyHtml:'<p>Upstream body.</p>', url:`/blog/${slug}/`, publishedAt:'2026-08-01T00:00:00Z', source:'soro', sourceId:slug, webUrl:'https://example.invalid/original'};
  const revised=applyPostRevision({...source});
  assert.notEqual(revised.bodyHtml,source.bodyHtml);
  assert.match(revised.bodyHtml, /\/(?:guides|work)\//);
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

// Exercise the actual renderer across approval withdrawal and restoration.
// Its ROOT is process.cwd(), so every generated file lands in this fixture;
// the imported production script and its helpers are read from the checkout.
const proofFixture = fs.mkdtempSync(path.join(os.tmpdir(), 'mm-proof-withdrawal-'));
try {
  const surfaces = {
    'index.html': ['MARCUS-HOME', 'MARCUS-HOME-NOTE', 'MARCUS-504-COMPARISON', 'STATS', 'QUOTES'],
    'work/index.html': ['MARCUS-SCORECARD-COMPACT'],
    'work/marcus/index.html': ['MARCUS-SCORECARD-COMPACT', 'MARCUS-WINDOW'],
    'work/marcus/results/index.html': [
      'MARCUS-SCORECARD', 'MARCUS-WINDOW', 'MARCUS-RESULTS-CONTEXT', 'MARCUS-MEASUREMENT-DETAILS', 'MARCUS-504-COMPARISON',
      ...['01', '02', '03', '04', '05', '06', '07'].map(section => `MARCUS-FIGS-${section}`),
      'MARCUS-BA', 'MARCUS-BOUNDARY',
    ],
    'industries/professional-services/index.html': ['MARCUS-INLINE-PROFESSIONAL-SERVICES'],
    'security/index.html': ['MARCUS-INLINE-SECURITY'],
    'services/index.html': ['MARCUS-HOME'],
    'book/thanks/index.html': ['MARCUS-INLINE-BOOK-THANKS'],
    'guides/private-ai-for-small-business/index.html': ['MARCUS-GUIDE-SUMMARY'],
  };
  const marker = (name, body = '') => `<!-- BUILD-LOG:${name} — fixture -->${body}<!-- /BUILD-LOG:${name} -->`;
  const regionBody = (html, name) => {
    const opening = html.indexOf(`<!-- BUILD-LOG:${name} `);
    assert.notEqual(opening, -1, `retain ${name} opening marker for future builds`);
    const start = html.indexOf('-->', opening) + 3;
    const end = html.indexOf(`<!-- /BUILD-LOG:${name} -->`, start);
    assert.ok(end >= start, `retain matching ${name} closing marker`);
    return html.slice(start, end);
  };
  for (const [page, names] of Object.entries(surfaces)) {
    const destination = path.join(proofFixture, page);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.writeFileSync(destination, `<main><p>Keep surrounding editorial text.</p>\n${names.map(name => marker(name, 'STALE-UNVERIFIED')).join('\n')}\n${marker('UNRELATED-STAT', '<b>2026 unrelated figure</b>')}</main>`);
  }
  fs.mkdirSync(path.join(proofFixture, 'data'), { recursive: true });
  fs.mkdirSync(path.join(proofFixture, 'src/data'), { recursive: true });
  const fixtureLog = {
    week_of: '2026-09-01', requests_handled: 12, drafts_overruled: 2, minutes_saved: 45,
    quotes: [{ signed_off: true, text: 'Approved independent quote.', name: 'Fixture Reviewer' }],
    marcus: {
      signed_off: true, client: 'Fixture operation', measurement_window: 'fixture measurement period',
      window_note: 'Fixture measurement note.', methodology: {staff_denominator: 37, clarified_on: '2026-09-10', limits: 'Fixture method limits.'}, approval: { approved_on: '2026-09-01' },
      scorecard: [
        { key: 'hours-returned', value: '7319', unit: 'hrs', desc: 'Fixture preparation capacity.' },
        { key: 'identifiers-out', value: '0', desc: 'Fixture reported identifier exposures.' },
        { key: 'weekly-adoption', value: '81', unit: '%', desc: 'Fixture weekly use.' },
        { key: 'human-approved', value: '100', unit: '%', desc: 'Fixture approval.' },
      ],
      figures: ['01', '02', '03', '04', '05', '06', '07'].map((section, i) => ({
        key: `section-${section}`, section, value: String(7301 + i), unit: 'units', desc: `Fixture section ${section}.`,
      })),
      highlight_keys: ['hours-returned', 'identifiers-out'],
      before_after: [{ key: 'package-504', what: 'Fixture preparation', before: '92 hours', after: '4 hours', before_pct: 100, after_pct: 4 }],
      boundary: [{ key: 'fixture-approved', label: 'Approve', value: '83', unit: '%', desc: 'Fixture human approval.' }],
      inline: { 'professional-services': 'hours-returned', security: 'identifiers-out', 'book-thanks': 'hours-returned' },
    },
  };
  const buildScript = new URL('build-work.mjs', import.meta.url).href;
  const runProofBuild = () => {
    fs.writeFileSync(path.join(proofFixture, 'data/build-log.json'), JSON.stringify(fixtureLog));
    // Explicitly block fetch in the child, even if a future imported helper
    // starts using it. Current production builder uses only local files.
    return execFileSync(process.execPath, ['--input-type=module', '-e',
      `globalThis.fetch = () => { throw new Error('Proof regression forbids network access'); }; await import(${JSON.stringify(buildScript)});`,
    ], { cwd: proofFixture, encoding: 'utf8' });
  };
  const readPage = page => fs.readFileSync(path.join(proofFixture, page), 'utf8');
  const readRuntime = async state => (await import(`${pathToFileURL(path.join(proofFixture, 'src/data/proof.mjs')).href}?state=${state}`)).MARCUS;
  const readBrief = () => fs.readFileSync(path.join(proofFixture, 'work/marcus/results/evidence.txt'), 'utf8');
  runProofBuild();
  const approvedPages = Object.fromEntries(Object.keys(surfaces).map(page => [page, readPage(page)]));
  const approvedRuntime = await readRuntime('approved');
  const approvedBrief = readBrief();
  assert.equal(approvedRuntime.signedOff, true);
  assert.equal(approvedRuntime.figures['hours-returned'].value, '7319');
  assert.equal(Object.keys(approvedRuntime.figures).length, 11);
  assert.ok(approvedBrief.includes('7319 hrs'));
  for (const [page, names] of Object.entries(surfaces)) {
    assert.ok(!approvedPages[page].includes('STALE-UNVERIFIED'), `${page}: first build replaced stale material`);
    for (const name of names) assert.ok(regionBody(approvedPages[page], name).trim(), `${page}: approved ${name} rendered`);
  }
  // A historical marker not in today's region builders must clear too. This
  // catches implementations that blank only current REGIONS keys.
  const retiredName = 'MARCUS-RETIRED-99';
  fs.appendFileSync(path.join(proofFixture, 'work/marcus/results/index.html'), marker(retiredName, '<b>9827 retired figure</b>'));

  fixtureLog.marcus.signed_off = false;
  const withdrawnOutput = runProofBuild();
  const withdrawnRuntime = await readRuntime('withdrawn');
  assert.match(withdrawnOutput, /figures withheld/);
  assert.equal(withdrawnRuntime.signedOff, false);
  assert.deepEqual(withdrawnRuntime.figures, {});
  assert.equal(withdrawnRuntime.staffDenominator, null);
  assert.match(readBrief(), /withheld pending written approval/);
  assert.ok(!readBrief().includes('7319'));
  for (const [page, names] of Object.entries(surfaces)) {
    const withdrawn = readPage(page);
    for (const name of names.filter(name => name.startsWith('MARCUS-'))) {
      assert.equal(regionBody(withdrawn, name), '', `${page}: approval withdrawal cleared ${name}`);
    }
    assert.ok(withdrawn.includes('Keep surrounding editorial text.'));
    assert.equal(regionBody(withdrawn, 'UNRELATED-STAT'), '<b>2026 unrelated figure</b>');
  }
  assert.equal(regionBody(readPage('work/marcus/results/index.html'), retiredName), '');
  assert.ok(!readPage('work/marcus/results/index.html').includes('9827'));
  for (const name of ['STATS', 'QUOTES']) assert.equal(regionBody(readPage('index.html'), name), regionBody(approvedPages['index.html'], name), `MARCUS withdrawal preserves independent ${name}`);
  const withdrawnPages = Object.fromEntries(Object.keys(surfaces).map(page => [page, readPage(page)]));
  runProofBuild();
  for (const page of Object.keys(surfaces)) assert.equal(readPage(page), withdrawnPages[page], 'repeated withdrawal is stable');

  fixtureLog.marcus.signed_off = true;
  runProofBuild();
  assert.deepEqual(await readRuntime('restored'), approvedRuntime);
  assert.equal(readBrief(), approvedBrief);
  for (const [page, names] of Object.entries(surfaces)) {
    for (const name of names) assert.equal(regionBody(readPage(page), name), regionBody(approvedPages[page], name), `${page}: renewed approval restores ${name} from current data`);
  }
  assert.equal(regionBody(readPage('work/marcus/results/index.html'), retiredName), '', 'unknown retired figure never reappears');
} finally { fs.rmSync(proofFixture, { recursive: true, force: true }); }
console.log('[test:editorial] Actual proof build withdraws static regions, runtime figures, and evidence; renewed approval restores approved data.');
