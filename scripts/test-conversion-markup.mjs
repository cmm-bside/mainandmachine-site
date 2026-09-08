// Deployment integration guard, without executing a browser or contacting a
// provider. Run with the behavioral suite: node --test scripts/test-conversion*.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const root = new URL('../', import.meta.url);
for (const route of ['index.html', 'plan/index.html', 'plan/sample/index.html', 'plan/thanks/index.html']) {
  test(`${route}: custom events have the first-party tracker bootstrap and deferred scripts`, () => {
    const html = readFileSync(new URL(route, root), 'utf8');
    assert.ok(/<script\b[^>]*\bsrc="\/js\/pa"[^>]*>/.test(html), 'Missing first-party Plausible loader; custom events otherwise do nothing');
    assert.ok(/plausible\.init\(\s*\{\s*endpoint:\s*"\/api\/event"\s*,\s*formSubmissions:\s*false\s*\}\s*\)/.test(html),
      'Keep the first-party endpoint and disable automatic form-submission events');
    assert.ok(/window\.plausible\s*=\s*window\.plausible\s*\|\|\s*function/.test(html),
      'Queue custom events while the async provider script loads');
    assert.ok(/<script\b(?=[^>]*\bdefer\b)[^>]*\bsrc="\/js\/analytics\.js\?v=[^"]+"[^>]*>/.test(html), 'Missing deferred analytics script/cache version');
    if (route === 'plan/index.html' || route === 'plan/thanks/index.html') {
      assert.ok(/<script\b(?=[^>]*\bdefer\b)[^>]*\bsrc="\/js\/workflow-plan\.js\?v=[^"]+"[^>]*>/.test(html), 'Missing deferred intake script/cache version');
    }
  });
}
