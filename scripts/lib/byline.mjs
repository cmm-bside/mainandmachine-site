// Explicit guide content dates keep rebuilds and navigation changes from
// pretending to be new editorial reviews. Existing publication dates are kept.
import fs from "node:fs";
import path from "node:path";
import { COMPANY, ROOT } from "./config.mjs";

const MONTHS = [
	"January", "February", "March", "April", "May", "June",
	"July", "August", "September", "October", "November", "December",
];

const EDITORIAL_DATES = JSON.parse(fs.readFileSync(path.join(ROOT, "src/data/guide-editorial-dates.json"), "utf8"));
let DATES = null;
function pageDates() {
	if (DATES) return DATES;
	try {
		DATES = JSON.parse(fs.readFileSync(path.join(ROOT, "src", "data", "page-dates.json"), "utf8"));
	} catch {
		DATES = {};
	}
	return DATES;
}

/** Explicit guide content date, with recorded page metadata for other routes. */
export function modifiedIso(route) {
	return EDITORIAL_DATES[route] || pageDates()[route] || null;
}

/**
 * "August 2026". MONTH GRANULARITY IS DELIBERATE. A day-level stamp on an
 * evergreen guide invites the reader to read a one-line typo fix as a revision,
 * and it churns the visible diff on every commit. The JSON-LD keeps full
 * precision because machines want it; humans get the month.
 */
export function updatedLabel(route) {
	const iso = modifiedIso(route);
	if (!iso) return null;
	const [y, m] = iso.split("-");
	return `${MONTHS[Number(m) - 1]} ${y}`;
}

export const AUTHOR_NAME = COMPANY.founder.name;
export const AUTHOR_ROLE = `Founder, ${COMPANY.name}`;

/**
 * The byline component. One <p>, no card, no avatar — the site has no author
 * photo idiom and inventing one for this would be a new component to maintain.
 *
 * rel="author" is on the link so the author relationship is machine-readable
 * from the markup as well as from the Person node in the graph.
 */
export function bylineHtml(route) {
	const label = updatedLabel(route);
	const parts = [
		`<a href="/about/" rel="author">${AUTHOR_NAME}</a> &mdash; ${AUTHOR_ROLE}`,
	];
	if (label) parts.push(`<span class="byline__updated">Updated <time datetime="${modifiedIso(route)}">${label}</time></span>`);
	const line = parts.join(` <span class="byline__sep" aria-hidden="true">&middot;</span> `);
	return `<p class="byline">${line}</p>`;
}

// Only remove the retired labeled metadata row, not dates within guide prose.
export function removeLegacyGuideUpdatedRow(html) {
  return html.replace(/<div class="statrail__row">\s*<span class="statrail__k">Updated<\/span>\s*<span class="statrail__v">[\s\S]*?<\/span>\s*<\/div>/g, "");
}
