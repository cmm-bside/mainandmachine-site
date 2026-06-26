// scripts/educate-quotes.mjs — replace straight quotes/apostrophes with
// typographic ones (“ ” ‘ ’) in VISIBLE HTML text only.
//
//   node scripts/educate-quotes.mjs <file.html> [more.html ...]
//   node scripts/educate-quotes.mjs --check <file.html>   (report, don't write)
//
// Safety: a tokenizer walks the document and educates ONLY text nodes. Tags
// (so all attribute values), <script> (so JSON-LD + JS), <style>, <pre>,
// <code>, <textarea>, and <!-- comments --> are passed through untouched.
// Quote direction is decided from the previous visible character, carried
// across inline tags (<a>, <em>, …) and reset at block boundaries so a quote
// opening a new paragraph curls the right way.

import fs from "node:fs";

const INLINE = new Set([
  "a", "b", "i", "em", "strong", "span", "small", "sup", "sub", "u", "mark",
  "q", "cite", "time", "abbr", "s", "del", "ins", "big", "label", "wbr",
]);
const SKIP_BLOCKS = "script|style|pre|code|textarea";
const TOKEN = new RegExp(
  `<!--[\\s\\S]*?-->` +              // comments
  `|<(${SKIP_BLOCKS})\\b[\\s\\S]*?</\\1\\s*>` + // skipped blocks (with content)
  `|<[^>]+>` +                       // any tag
  `|[^<]+`,                          // text node
  "gi"
);

const isAlnum = (c) => c !== undefined && /[A-Za-z0-9]/.test(c);
const isSpace = (c) => c === undefined || /\s/.test(c);
const OPENERS = "([{<“‘—– -/"; // after these, " opens

function educateText(text, prevChar) {
  let out = "";
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    const prev = i > 0 ? text[i - 1] : prevChar;
    const next = i < text.length - 1 ? text[i + 1] : undefined;
    if (c === '"') {
      out += prev === undefined || isSpace(prev) || OPENERS.includes(prev)
        ? "“" : "”";                 // “ : ”
    } else if (c === "'") {
      if (isAlnum(prev)) out += "’";       // it’s, teams’ (contraction/possessive)
      else if (isAlnum(next)) out += /[0-9]/.test(next) ? "’" : "‘"; // ’90s : ‘open
      else out += "’";                     // default closing
    } else {
      out += c;
    }
  }
  return out;
}

export function educateHtml(html) {
  let prevChar; // last visible char, carried across inline tags
  let changed = 0;
  const result = html.replace(TOKEN, (tok) => {
    if (tok.startsWith("<!--")) { prevChar = undefined; return tok; }
    if (tok[0] === "<") {
      const m = /^<\/?\s*([a-zA-Z0-9]+)/.exec(tok);
      const name = m ? m[1].toLowerCase() : "";
      // skipped block (matched whole element) or block-level tag → reset context
      if (new RegExp(`^<(${SKIP_BLOCKS})\\b`, "i").test(tok) || !INLINE.has(name)) {
        prevChar = undefined;
      }
      return tok; // attributes never touched
    }
    // text node
    const educated = educateText(tok, prevChar);
    if (educated !== tok) changed++;
    prevChar = tok[tok.length - 1];
    return educated;
  });
  return { result, changed };
}

// --- CLI ------------------------------------------------------------------
if (process.argv[1] && process.argv[1].endsWith("educate-quotes.mjs")) {
const args = process.argv.slice(2);
const checkOnly = args[0] === "--check";
const files = (checkOnly ? args.slice(1) : args).filter((a) => !a.startsWith("--"));
if (files.length === 0) {
  console.error("usage: node scripts/educate-quotes.mjs [--check] <file.html> ...");
  process.exit(2);
}
let totalChanged = 0;
for (const file of files) {
  const html = fs.readFileSync(file, "utf8");
  const { result, changed } = educateHtml(html);
  if (result !== html) {
    totalChanged += changed;
    if (!checkOnly) fs.writeFileSync(file, result);
    console.log(`  ${checkOnly ? "would edit" : "educated"} ${file}  (${changed} text node(s))`);
  }
}
console.log(`${checkOnly ? "would change" : "changed"} ${totalChanged} text node(s) across ${files.length} file(s)`);
}
