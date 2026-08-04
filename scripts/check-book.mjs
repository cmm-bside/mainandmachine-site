#!/usr/bin/env node
// /book regression test — the conversion page's load-bearing elements.
// FAQ item 01 went missing once (June review); this keeps it fixed, and
// catches any rebuild that drops the page's labels or numbering.
import fs from "node:fs";
import path from "node:path";
import { ROOT } from "./lib/config.mjs";

const errors = [];
const html = fs.readFileSync(path.join(ROOT, "book", "index.html"), "utf8");

const REQUIRED = [
  "What exactly is the assessment?",
  "Is it really free?",
  "Fair questions.",
  "What happens · 30 minutes",
  "Who you’ll talk to", // typographic apostrophe — page copy is educated (“ ” ‘ ’)
  "Christopher Myers",
  // Booking banner (delivery framing). Assert the structural hook, never the
  // quarter itself — a literal "Q4" here would need editing at every rollover
  // and would fail the build for the wrong reason when it was forgotten.
  // The hook moved from class="js-book-quarter" to data-fact="booking-quarter"
  // on 2026-08-04, when the client-side auto-advance was removed: the value is
  // now stated in site-facts.json and stamped by facts:render, so the span is a
  // fact target rather than a JS target. check-facts verifies the VALUE;
  // check-booking-quarter verifies it has not rolled over; this asserts only
  // that /book/ still carries the chip at all.
  '<span data-fact="booking-quarter">',
];
for (const s of REQUIRED) {
  if (!html.includes(s)) errors.push(`/book: missing required text "${s}"`);
}

// FAQ numbering: six complete items, 01–06, in order, each with a summary header.
const nums = [...html.matchAll(/<summary><span class="q-no">(\d{2})<\/span>/g)].map((m) => m[1]);
if (nums.join(",") !== "01,02,03,04,05,06")
  errors.push(`/book: FAQ numbering is [${nums.join(",")}], expected [01..06]`);

// Old-build markers must never reappear.
for (const bad of ["limited slots", 'href="/#work"', "<title>Book an Assessment"]) {
  if (html.includes(bad)) errors.push(`/book: contains old-build marker "${bad}"`);
}

// Phone must not be hard-required (it's conditional on preferred contact).
if (/name="phone"[^>]*\brequired\b/.test(html)) errors.push("/book: phone input is hard-required");

if (errors.length) {
  console.error(`[book:check] FAILED with ${errors.length} issue(s):`);
  for (const e of errors) console.error("  - " + e);
  process.exit(1);
}
console.log("[book:check] OK — /book carries all load-bearing elements, FAQ 01–06 intact.");
