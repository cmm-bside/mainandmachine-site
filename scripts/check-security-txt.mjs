#!/usr/bin/env node
/**
 * Build guard: /.well-known/security.txt cannot silently lapse.
 *
 * RFC 9116 §2.5.5 is unusually strict about Expires — a consumer MUST ignore
 * the whole file once the date has passed. So an expired security.txt is not
 * a degraded security.txt, it is NO security.txt, while still sitting there
 * looking answered. That is the exact failure mode of a file nobody revisits,
 * and it is why this is a build guard rather than a calendar reminder.
 *
 *   build date past Expires              -> FAIL the build
 *   build date within 30 days of Expires -> loud warning
 *   otherwise                            -> quiet
 *
 * IT DOES NOT ADVANCE THE DATE, deliberately — same reasoning as
 * check-booking-quarter.mjs, which this is modelled on. Renewing the contact
 * window is a statement that someone will still be reading that inbox in a
 * year; a script cannot make that promise on your behalf.
 *
 * It also holds Contact to `email` in site-facts.json. security.txt is a
 * fourth place the address appears, and facts:check cannot see this file (it
 * walks HTML), so the check lives here.
 *
 * Testing both branches without touching the clock:
 *   SECURITY_TXT_NOW=2027-09-01 npm run security:check   # past -> fails
 *   SECURITY_TXT_NOW=2027-07-20 npm run security:check   # near -> warns
 */
import fs from "node:fs";
import path from "node:path";
import { ROOT } from "./lib/config.mjs";
import { COMPANY } from "../src/data/company.mjs";

const WARN_WINDOW_DAYS = 30;
const DAY = 86_400_000;
const REL = ".well-known/security.txt";
const FILE = path.join(ROOT, REL);

function fail(msg) {
	console.error(`[security:check] ${msg}`);
	process.exit(1);
}

// An explicit override so both branches are testable. Anything unparseable is
// a hard error, never a silent fallback to "now" — a typo in the override
// would otherwise quietly disable the guard it is meant to exercise.
const override = process.env.SECURITY_TXT_NOW;
let now;
if (override) {
	const t = Date.parse(/^\d{4}-\d{2}-\d{2}$/.test(override) ? `${override}T00:00:00Z` : override);
	if (Number.isNaN(t)) fail(`SECURITY_TXT_NOW is not a date: ${JSON.stringify(override)}`);
	now = new Date(t);
} else {
	now = new Date();
}

if (!fs.existsSync(FILE)) fail(`${REL} is missing. RFC 9116 file expected at the repo root.`);
const raw = fs.readFileSync(FILE, "utf8");

// RFC 9116 fields are "Name: value", case-insensitive, one per line, and '#'
// starts a comment line. Parsed rather than regex-grepped so a field commented
// out during editing reads as ABSENT instead of matching anyway.
const fields = [];
for (const line of raw.split(/\r?\n/)) {
	const s = line.trim();
	if (!s || s.startsWith("#")) continue;
	const m = s.match(/^([A-Za-z-]+)\s*:\s*(.+)$/);
	if (!m) fail(`unparseable line in ${REL}: ${JSON.stringify(line)}`);
	fields.push([m[1].toLowerCase(), m[2].trim()]);
}
const get = (name) => fields.filter(([k]) => k === name).map(([, v]) => v);

// --- required fields -------------------------------------------------------
const contacts = get("contact");
const expires = get("expires");
if (!contacts.length) fail(`${REL} has no Contact field (RFC 9116 requires at least one).`);
if (expires.length !== 1) fail(`${REL} must have exactly one Expires field; found ${expires.length}.`);

// --- Contact agrees with the canonical fact --------------------------------
const wantContact = `mailto:${COMPANY.email}`;
if (!contacts.includes(wantContact)) {
	fail(
		`${REL} Contact does not match src/data/site-facts.json.\n` +
			`  expected: ${wantContact}\n` +
			`  found:    ${contacts.join(", ") || "(none)"}`,
	);
}

// --- Expires ---------------------------------------------------------------
// RFC 9116 requires an ISO 8601 / RFC 3339 timestamp. Date.parse accepts a lot
// more than that, so the shape is asserted before the value is trusted.
const rawExpires = expires[0];
if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/.test(rawExpires)) {
	fail(`${REL} Expires is not an RFC 3339 timestamp: ${JSON.stringify(rawExpires)}`);
}
const exp = new Date(Date.parse(rawExpires));
const days = Math.floor((exp.getTime() - now.getTime()) / DAY);
const stamp = now.toISOString().slice(0, 10);

if (days < 0) {
	fail(
		`${REL} EXPIRED ${-days} day(s) ago (Expires ${rawExpires}, as of ${stamp}).\n` +
			`  RFC 9116 says a consumer MUST ignore this file past Expires, so the\n` +
			`  disclosure route is currently advertised to nobody.\n` +
			`  Fix: set Expires ~12 months out in ${REL}, then re-run npm run security:check.`,
	);
}

// RFC 9116 §2.5.5 recommends a value less than a year out. Longer is legal but
// defeats the point of the field, so it is surfaced rather than enforced.
if (days > 400) {
	console.warn(
		`[security:check] WARNING — Expires is ${days} days out (${rawExpires}). ` +
			`RFC 9116 recommends less than a year; consider shortening.`,
	);
}

if (days <= WARN_WINDOW_DAYS) {
	console.warn(
		`[security:check] WARNING — ${REL} expires in ${days} day(s) (${rawExpires}).\n` +
			`  Renew it: set Expires ~12 months out, confirm ${COMPANY.email} is still\n` +
			`  monitored, then re-run npm run security:check. This FAILS the build once\n` +
			`  the date passes.`,
	);
} else {
	console.log(
		`security:check — ${REL} valid: Contact ${COMPANY.email}, ` +
			`Expires ${rawExpires}, ${days} days out (as of ${stamp}). ` +
			`Warns at ${WARN_WINDOW_DAYS} days, fails after.`,
	);
}
