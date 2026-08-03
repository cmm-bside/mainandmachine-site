#!/usr/bin/env node
// css:check — structural validation of styles.css.
//
// Added 2026-08-03 after the same failure mode cost two round-trips: an edit
// left an orphaned `*/`, which put prose at stylesheet top level. CSS error
// recovery then discards everything up to the next recognisable construct, so
// the RULE THAT FOLLOWED vanished — silently. Nothing objected: tokens:check
// only resolves var() references, and qa:matrix measures rendered output, so a
// dropped rule just looks like a design that was never applied. Both times it
// surfaced only because a measurement came back unchanged.
//
// Deliberately dependency-free and structural, not a full parser. It catches
// the classes of damage that are silent in the browser:
//   1. unclosed  /* … EOF
//   2. orphaned  */  outside any comment
//   3. unbalanced { } (with the depth at EOF, and the line where it went wrong)
//   4. a stray `}` that closes past top level
//
// Strings and url() are respected so a `/*` or a brace inside content:"…" does
// not trip it.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FILES = ["styles.css"];

const errors = [];
const lineAt = (src, i) => src.slice(0, i).split("\n").length;

for (const rel of FILES) {
	const file = path.join(ROOT, rel);
	if (!fs.existsSync(file)) { errors.push(`${rel}: missing`); continue; }
	const src = fs.readFileSync(file, "utf8");

	let i = 0, depth = 0, openedAt = [];
	let inComment = false, commentStart = 0;
	let quote = null;

	while (i < src.length) {
		const c = src[i], next = src[i + 1];

		if (inComment) {
			if (c === "*" && next === "/") { inComment = false; i += 2; continue; }
			i++; continue;
		}
		if (quote) {
			if (c === "\\") { i += 2; continue; }
			if (c === quote) quote = null;
			i++; continue;
		}
		if (c === '"' || c === "'") { quote = c; i++; continue; }
		if (c === "/" && next === "*") { inComment = true; commentStart = i; i += 2; continue; }
		if (c === "*" && next === "/") {
			errors.push(`${rel}:${lineAt(src, i)}: orphaned "*/" outside a comment — everything after it up to the next rule is discarded by the parser`);
			i += 2; continue;
		}
		if (c === "{") { depth++; openedAt.push(lineAt(src, i)); i++; continue; }
		if (c === "}") {
			depth--;
			if (depth < 0) {
				errors.push(`${rel}:${lineAt(src, i)}: "}" with no matching "{"`);
				depth = 0;
			} else openedAt.pop();
			i++; continue;
		}
		i++;
	}

	if (inComment) errors.push(`${rel}:${lineAt(src, commentStart)}: unclosed "/*" — the rest of the file is a comment`);
	if (quote) errors.push(`${rel}: unterminated ${quote} string`);
	if (depth > 0) errors.push(`${rel}: ${depth} unclosed "{" — outermost opened at line ${openedAt[0]}`);
}

if (errors.length) {
	console.error(`[css:check] FAILED — ${errors.length} structural problem(s):`);
	for (const e of errors) console.error(`  ${e}`);
	console.error(`\n  These are SILENT in a browser: the parser discards the damaged\n  region and keeps going, so the next rule simply never applies.`);
	process.exit(1);
}
console.log(`[css:check] OK — ${FILES.join(", ")} structurally sound (comments, strings and braces balanced).`);
