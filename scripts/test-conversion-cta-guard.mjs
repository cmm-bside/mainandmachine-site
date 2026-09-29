// /books/ shares a prefix with /book/ but must not be classified as a
// booking CTA. Exercise the actual build guard against an isolated fixture.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = new URL('../', import.meta.url);
const guard = fileURLToPath(new URL('scripts/check-cta.mjs', root));

test('booking CTA guard ignores Books links and still requires placement on booking routes', () => {
  const fixture = mkdtempSync(path.join(tmpdir(), 'mm-cta-guard-'));
  try {
    mkdirSync(path.join(fixture, 'book'), { recursive: true });
    mkdirSync(path.join(fixture, 'scripts/lib'), { recursive: true });
    writeFileSync(path.join(fixture, 'book/index.html'), readFileSync(new URL('book/index.html', root)));
    const template = readFileSync(new URL('scripts/lib/templates.mjs', root), 'utf8');
    writeFileSync(path.join(fixture, 'scripts/lib/templates.mjs'), template + '\n<a href="/books/">Books</a>');
    const page = path.join(fixture, 'index.html');
    const check = () => spawnSync(process.execPath, [guard], { cwd: fixture, encoding: 'utf8' });

    writeFileSync(page, '<a href="/books/">Books</a><a href="/books/#reading">Read</a><a href="/bookish/">Other</a>');
    let result = check();
    assert.equal(result.status, 0, result.stdout + result.stderr);

    for (const href of ['/book', '/book/', '/book?source=books', '/book/#schedule', '/book/thanks/']) {
      writeFileSync(page, `<a href="${href}">Book</a>`);
      result = check();
      assert.equal(result.status, 1, `Untagged ${href} must fail: ${result.stdout + result.stderr}`);
      assert.match(result.stderr, /booking CTA has no data-cta/);
      writeFileSync(page, `<a href="${href}" data-cta="books-final">Book</a>`);
      result = check();
      assert.equal(result.status, 0, result.stdout + result.stderr);
    }
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
});
