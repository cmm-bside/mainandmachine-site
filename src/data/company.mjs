// CANONICAL BUSINESS FACTS — thin module wrapper over site-facts.json,
// which is THE single source of truth (edit prices/contact/timelines there,
// nowhere else). Every fact must be byte-identical wherever it appears:
// page copy, meta tags, JSON-LD, llms.txt, /facts.json, footers, emails.
// Generated surfaces import this module; committed HTML carries data-fact
// spans stamped by scripts/render-facts.mjs; scripts/check-facts.mjs and
// scripts/check-llms.mjs fail the build if anything drifts. See CLAUDE.md.
//
// Keep this file runtime-agnostic (no Node or Worker globals): it is
// imported by build scripts, Cloudflare Pages Functions, and email
// templates. The JSON import attribute below works in Node ESM and in the
// esbuild bundle Pages Functions use.
import FACTS from "./site-facts.json" with { type: "json" };

export const COMPANY = FACTS;
