// The city-page model: NAP, the city×industry strip, and the local-operations
// facts, for /denver/ and /phoenix/.
//
// WHY A MODEL AND NOT JUST COPY. Two things on these pages must be identical
// to something else and cannot be left to hand-editing:
//
//   NAP        — name + phone + "City, ST" has to match the LocalBusiness
//                JSON-LD on the same page, or the two disagree about the
//                business in the exact way local search penalises. Both now
//                derive from COMPANY.
//   industries — the strip must link ALL FIVE industry pages from BOTH cities.
//                It did not: Denver linked 2 of 5, Phoenix 3 of 5, measured
//                2026-08-09. A count that has to stay at five is a guard's job.
//
// The prose is authored, not generated — it is copy, and the site's voice is
// not something to template. What the model owns is the SET (five industries,
// two cities, ten paragraphs) so a missing one fails the build.
//
// CONSTRAINT, enforced by review not by code: no invented clients, no invented
// testimonials, no invented specifics. Every paragraph below is grounded in
// what the linked industry page already publishes plus verifiable public facts
// about the market (Arizona's 20-day preliminary notice, Colorado prevailing
// wage). Anything needing a real local detail we do not have is an HTML
// comment marked NEEDS-INPUT, never visible text — see the note in
// render-cities.mjs about why comments and not prose.
import { COMPANY } from "../../src/data/company.mjs";

/** The five industries, in the order the strip renders them. */
export const INDUSTRIES = [
	{ key: "professional-services", path: "/industries/professional-services/", name: "Professional services" },
	{ key: "retail",                path: "/industries/retail/",                name: "Retail & e-commerce" },
	{ key: "healthcare",            path: "/industries/healthcare/",            name: "Healthcare & wellness" },
	{ key: "construction",          path: "/industries/construction/",          name: "Construction & trades" },
	{ key: "hospitality",           path: "/industries/hospitality/",           name: "Hospitality & food service" },
];

/** Hub lookup by city slug, from the canonical facts file. */
export function hub(slug) {
	const h = COMPANY.hubs.find((x) => x.path === `/${slug}/`);
	if (!h) throw new Error(`cities.mjs: no hub in site-facts.json for /${slug}/`);
	return h;
}

/**
 * The NAP line, one derivation used by both the visible block and the guard.
 * "Main & Machine · 480-805-9983 · Denver, CO".
 *
 * Deliberately the SHORT state code, matching the LocalBusiness node's
 * addressRegion and the site's own "Denver, CO / Phoenix, AZ" in
 * COMPANY.locations. The pages also say "Denver, Colorado" in prose, which is
 * fine — prose is prose. The NAP is the citation-shaped one, and a citation
 * has to be byte-stable.
 */
export function napParts(slug) {
	const h = hub(slug);
	return {
		name: COMPANY.name,
		phone: COMPANY.phone,
		phoneHref: COMPANY.phoneHref,
		locality: h.city,
		region: h.stateCode,
		locationLine: `${h.city}, ${h.stateCode}`,
	};
}

/** Descriptive cross-link anchor. "AI consulting in Denver". */
export function cityAnchor(slug) {
	return `AI consulting in ${hub(slug).city}`;
}

/**
 * The city×industry strip. Ten authored paragraphs, grounded in the linked
 * page's own published scope plus public market facts. No client is named or
 * implied in any of them.
 */
export const INDUSTRY_COPY = {
	denver: {
		"professional-services":
			"Law, accounting, insurance and advisory firms cluster downtown, through the Tech Center and out along the US-36 corridor — the twelve-to-eighty-person shops this work is built for. The bottleneck is almost never the advice; it is intake, matter setup and the billing narrative that gets written twice.",
		retail:
			"Front Range retail runs split between a storefront and a webstore that disagree about stock by Tuesday. One count, every channel, every morning is the build — and it is the same build whether the second channel is a marketplace, a wholesale line or a second location in Boulder.",
		healthcare:
			"Practices and clinics across the metro carry scheduling, intake and coding on staff who were hired to do something else. The record never leaves the practice: models run on hardware in your building, which is the architecture Colorado operators ask about first.",
		construction:
			"This is the most common first build we scope on the Front Range. Pay applications assembled on the cycle, lien waivers tracked across every tier of sub, and Colorado prevailing-wage and certified-payroll records built from the same source data rather than rebuilt by hand.",
		hospitality:
			"Restaurants, hotels and venues from LoDo out to the mountain corridor run on staffing sheets, reservations and a supplier invoice pile that lands weekly in three formats. The back office is what gets automated; service stays human.",
	},
	phoenix: {
		"professional-services":
			"The Valley's professional bench — law, accounting, insurance, advisory — has grown with the metro, and intake is where that growth shows up first. Firms of twelve to eighty carry matter setup and billing narrative by hand long after the headcount says they should not.",
		retail:
			"Retail across Scottsdale, Tempe and Chandler runs a storefront and a webstore that disagree about stock by mid-week, with seasonal swing on top of it. One count, every channel, every morning — the same build whether the second channel is a marketplace or a second location.",
		healthcare:
			"The Valley's population growth shows up first in medical and dental practices: new locations, new providers, and scheduling and intake that were sized for a smaller practice. The patient record stays in the practice — models run on hardware in your building.",
		construction:
			"Arizona's preliminary-notice window is twenty days, which is tighter than most states and is the reason contractors call. The twenty-day notice, pay applications, waivers per tier and certified payroll all assembled from one source, with a person signing everything.",
		hospitality:
			"Metro Phoenix adds restaurants, resorts and event venues faster than most markets, and every one of them runs on a weekly invoice pile arriving as email, PDF and photographs. That stack is read, coded and staged; the floor stays the floor.",
	},
};

/**
 * Local-operations facts. These are COMMITMENTS — what we promise a client in
 * that metro — so every value we have not been told is null and renders as an
 * HTML comment for the owner to fill, never as invented prose.
 *
 * `areas` are the neighbourhoods each page ALREADY claims in its live copy, so
 * carrying them forward is not a new claim. Everything else is unset.
 */
export const LOCAL_OPS = {
	denver: {
		areas: ["RiNo", "the Tech Center", "Lakewood"],
		radiusNote: "Front Range, Boulder down to Colorado Springs",
		kickoff: null,        // NEEDS-INPUT: kickoff format/duration
		cadence: null,        // NEEDS-INPUT: on-site workshop cadence
		responseTime: null,   // NEEDS-INPUT: committed response time
		communities: null,    // NEEDS-INPUT: chambers / trade associations
	},
	phoenix: {
		areas: ["Tempe", "Old Town", "Chandler"],
		radiusNote: "the Valley, East Valley through the West Valley",
		kickoff: null,
		cadence: null,
		responseTime: null,
		communities: null,
	},
};

export const CITY_SLUGS = ["denver", "phoenix"];
