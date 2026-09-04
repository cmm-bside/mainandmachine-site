#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { transform } from "esbuild";
import { minifyCss, resolveOutput, buildCssFile } from "./minify-css.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourcePath = path.join(ROOT, "styles.css");
const source = await fs.readFile(sourcePath, "utf8");
const output = await minifyCss(source);

// Formatting-only output must round-trip to exactly the same parsed CSS.
// No syntax minification, selector renaming, rule merging, or target lowering.
async function canonical(css) {
	const result = await transform(css, { loader: "css", minify: false, legalComments: "none", charset: "utf8", logLevel: "silent" });
	assert.equal(result.warnings.length, 0, "CSS must parse without warnings");
	return result.code;
}
assert.equal(await canonical(output), await canonical(source), "Minification must preserve parsed CSS and declaration order");
assert.ok(Buffer.byteLength(output) <= Buffer.byteLength(source), "The deployment file must not grow");
assert.equal(await minifyCss(output), output, "Minification should be deterministic and idempotent");
await assert.rejects(minifyCss(".broken { color: red;"), /CSS parser warnings/, "Malformed CSS must fail the build");

// Strings, custom properties, data URLs, and calc spacing must survive.
const fixture = `/* comment */ :root { --literal: "a  b"; --size: calc(100% - 2px); }
@media (min-width: 700px) { .a/**/.b > .c::before { content: "/* literal */ { }"; background: url("data:image/svg+xml,%3Csvg%3E%3C/svg%3E"); width: var(--size); } }`;
const compactFixture = await minifyCss(fixture);
assert.equal(await canonical(compactFixture), await canonical(fixture));
assert.ok(compactFixture.includes('"a  b"'));
assert.ok(compactFixture.includes("calc(100% - 2px)"));
assert.ok(compactFixture.includes("/* literal */ { }"));

// Ordinary builds cannot replace the source; only the Pages build default can.
assert.equal(resolveOutput([], {}, ROOT), null);
assert.equal(resolveOutput([], { CF_PAGES: "1" }, ROOT), sourcePath);
assert.throws(() => resolveOutput(["--output", sourcePath], {}, ROOT), /must not replace/);

const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "mm-css-build-"));
try {
	const separate = path.join(temporary, "styles.css");
	assert.equal(resolveOutput(["--output", separate], {}, ROOT), separate);
	await buildCssFile(sourcePath, separate);
	assert.equal(await fs.readFile(separate, "utf8"), output);
	assert.equal(await fs.readFile(sourcePath, "utf8"), source, "Local output must leave the source unchanged");
	const deployCopy = path.join(temporary, "deploy-styles.css");
	await fs.writeFile(deployCopy, source);
	await buildCssFile(deployCopy, deployCopy);
	assert.equal(await fs.readFile(deployCopy, "utf8"), output, "Deploy checkout replacement must be complete");
} finally {
	await fs.rm(temporary, { recursive: true, force: true });
}
console.log(`[test:css-build] OK — parsed CSS, order, strings, local-source protection, and deploy-copy replacement; ${Buffer.byteLength(source)} → ${Buffer.byteLength(output)} bytes.`);
