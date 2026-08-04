#!/usr/bin/env node
/**
 * Build guard: the capacity quarter in the top utility bar cannot go stale.
 *
 * The bar says "Booking Q4 delivery", and /pricing/ and /book/ point at it as
 * evidence that we mean what we say about capacity. That makes a stale quarter
 * worse here than on a normal site — it would falsify the very sentence
 * claiming the number is real. So:
 *
 *   build date past the end of booking.quarter   -> FAIL the build
 *   build date within 30 days of that end        -> loud warning
 *   otherwise                                    -> quiet
 *
 * IT DOES NOT ADVANCE THE QUARTER, deliberately. Capacity is a business fact
 * and a human states it; the guard's job is to make forgetting impossible, not
 * to guess. This replaced a client-side auto-advance in js/nav.js that rewrote
 * the chip to the next calendar quarter on every page load — never stale, but
 * capable of announcing next year's capacity in October with nobody deciding
 * anything.
 *
 * Testing:
 *   BOOKING_QUARTER_NOW=2027-01-05 npm run quarter:check   # past  -> fails
 *   BOOKING_QUARTER_NOW=2026-12-20 npm run quarter:check   # near  -> warns
 */
import { COMPANY } from "../src/data/company.mjs";
import { parseBookingQuarter } from "./lib/fact-values.mjs";

const WARN_WINDOW_DAYS = 30;
const DAY = 86_400_000;

// An explicit override so the two branches are testable without touching the
// clock. Anything unparseable is a hard error rather than a silent fallback to
// "now" — a typo here would quietly disable the guard.
const override = process.env.BOOKING_QUARTER_NOW;
let now;
if (override) {
	const t = Date.parse(/^\d{4}-\d{2}-\d{2}$/.test(override) ? `${override}T00:00:00Z` : override);
	if (Number.isNaN(t)) {
		console.error(`[quarter:check] BOOKING_QUARTER_NOW is not a date: ${JSON.stringify(override)}`);
		process.exit(2);
	}
	now = t;
} else {
	now = Date.now();
}

let parsed;
try {
	parsed = parseBookingQuarter(COMPANY.booking?.quarter);
} catch (err) {
	console.error(`\n[quarter:check] FAILED — ${err.message}\n`);
	process.exit(1);
}

const { label, year, endsAt } = parsed;
const stated = `${label} ${year}`;
const endsOn = new Date(endsAt - DAY).toISOString().slice(0, 10); // last day, inclusive
const daysLeft = Math.floor((endsAt - now) / DAY);
const asOf = new Date(now).toISOString().slice(0, 10);

const FIX =
	`  Fix (one line, one deploy):\n` +
	`    1. Confirm capacity with a human. Do not guess — this is a business fact.\n` +
	`    2. Edit  src/data/site-facts.json  ->  booking.quarter  (currently "${stated}")\n` +
	`    3. npm run facts:render   (restamps every data-fact="booking-quarter" span)\n` +
	`    4. Commit and deploy.\n` +
	`  See README.md -> "Booking quarter".`;

if (daysLeft <= 0) {
	console.error(
		`\n[quarter:check] BUILD FAILED — the booking quarter has ended.\n\n` +
			`  site-facts.json booking.quarter = "${stated}", which ended ${endsOn}.\n` +
			`  Build date ${asOf} is ${Math.abs(daysLeft)} day(s) past it.\n\n` +
			`  The top utility bar would ship "Booking ${label} delivery" for a quarter that\n` +
			`  is over, and /pricing/ and /book/ point at that bar as proof the number is\n` +
			`  real. Shipping this makes those pages untrue.\n\n${FIX}\n`,
	);
	process.exit(1);
}

if (daysLeft <= WARN_WINDOW_DAYS) {
	// stderr, not stdout: this must survive a piped/quiet build log.
	console.error(
		`\n[quarter:check] ================================================================\n` +
			`[quarter:check]  bookingQuarter rolls over soon — confirm capacity and update.\n` +
			`[quarter:check] ================================================================\n` +
			`  booking.quarter = "${stated}" ends ${endsOn} — ${daysLeft} day(s) from this build (${asOf}).\n` +
			`  The build still passes. It will FAIL once the quarter has ended.\n\n${FIX}\n`,
	);
	process.exit(0);
}

console.log(
	`quarter:check — booking.quarter "${stated}" ends ${endsOn}, ${daysLeft} days out (as of ${asOf}). ` +
		`Warns at ${WARN_WINDOW_DAYS} days, fails after.`,
);
