// Single derivation of every data-fact value.
//
// Shared by the WRITER (scripts/render-facts.mjs, which stamps the values into
// committed HTML) and the READER (scripts/check-facts.mjs, which re-derives
// them and fails the build if any stamped span disagrees). Keeping one
// definition here is the whole point: if the two sides derived values
// separately, editing site-facts.json without re-running facts:render would
// look clean to the guard — which is exactly how the "Four taken per year"
// note drifted to "Two" in the 2026-07-31 audit.
//
// Takes COMPANY explicitly rather than importing it, because render-facts.mjs
// GENERATES src/data/company.mjs and so must read the JSON directly.

export const NUMBER_WORDS = [
	"One", "Two", "Three", "Four", "Five", "Six",
	"Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve",
];

export function factValues(COMPANY) {
	const svc = (key) => COMPANY.services.find((s) => s.key === key);
	const usd = (n) => "$" + n.toLocaleString("en-US");

	return {
		"price-audit": svc("audit").price,
		"price-sprint": svc("sprint").price,
		"price-managed": svc("managed").price,
		"price-backoffice": svc("backoffice").price,
		"timeline-audit": svc("audit").timeline,
		"timeline-sprint": svc("sprint").timeline,
		"timeline-backoffice": svc("backoffice").timeline,
		"audit-floor": usd(svc("audit").priceLow) + "+",
		"sprint-ceiling": usd(svc("sprint").priceHigh),
		"guarantee": COMPANY.guarantee,
		"rollover": COMPANY.rollover,
		"annual-managed": COMPANY.annualManaged,
		// Dated so the scarcity claim is verifiable rather than atmospheric —
		// the site's own guide red-flags an undated slot count. check-facts.mjs
		// fails the build once buildSlots.countedOn is more than 21 days stale.
		"build-slots": `${COMPANY.buildSlots.line} (counted ${COMPANY.buildSlots.countedOn})`,
		"phone": COMPANY.phone,
		"email": COMPANY.email,
		// The named-offer layer (audit/NAMING-MEMO-2026-08-01.md). Stamped so a
		// name can never drift from site-facts.json — the SKU names in
		// `services` are a separate, unchanged set and are NOT stamped here.
		//
		// REVERSIBILITY IS THE DESIGN CONTRACT: delete `namedOffers` from
		// site-facts.json and every stamped span falls back to its SKU name, so
		// `facts:render` strips the layer out of the HTML and the build stays
		// green with SKU names only. Reading the object unguarded would have
		// thrown a TypeError instead, which would have made the layer
		// un-deletable — the opposite of what the memo promised.
		"name-audit": COMPANY.namedOffers?.audit ?? svc("audit").name,
		"name-sprint": COMPANY.namedOffers?.sprint ?? svc("sprint").name,
		"name-managed": COMPANY.namedOffers?.managed ?? svc("managed").name,
	};
}

// Every service `note` in site-facts.json, as [key, text] pairs. Notes are
// prose embedded in longer sentences (JSON-LD descriptions, list items), so
// they cannot be stamped into a data-fact span — check-facts asserts they
// appear verbatim somewhere instead, and hunts for contradicting variants.
export function serviceNotes(COMPANY) {
	return COMPANY.services
		.filter((s) => s.note)
		.map((s) => ({ key: s.key, name: s.name, note: s.note }));
}

// Split a note into clauses ("A MARCUS-class build. Four taken per year." →
// two) and keep only those that open with a number word. Prose may legitimately
// paraphrase a note's descriptive half, but a COUNT is either right or wrong —
// so only countable clauses are held to verbatim presence.
export function countableClauses(note) {
	return note
		.split(/(?:\.\s+|\s+·\s+|;\s+)/)
		.map((c) => c.trim().replace(/\.$/, ""))
		.filter((c) => c && contradictionPattern(c));
}

// A phrase like "Four taken per year" or "Four Q4 build slots remain" is a
// countable claim: same words, different number = a contradiction, not a
// variant. Returns a regex matching the phrase with ANY number word other
// than the canonical one, or null when the phrase does not start with a count.
export function contradictionPattern(phrase) {
	const trimmed = phrase.trim();
	const esc = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");

	// Digit-led claims — "100% of your audit fee credits toward…", "25% of the
	// sprint price". These were invisible to this function, which only knew
	// number WORDS, so the most-quoted number on the site (the rollover
	// percentage) had no contradiction guard at all.
	const digits = /^(\d[\d,]*%?)\b([\s\S]*)$/.exec(trimmed);
	if (digits) {
		const [, canonical, rest] = digits;
		// Same sentence, any other leading number = a contradiction.
		return new RegExp(`\\b(?!${esc(canonical)}\\b)\\d[\\d,]*%?${esc(rest)}`, "i");
	}

	const m = /^([A-Z][a-z]+)\b(.*)$/.exec(trimmed);
	if (!m) return null;
	const [, first, rest] = m;
	const canonical = NUMBER_WORDS.find((w) => w.toLowerCase() === first.toLowerCase());
	if (!canonical) return null;
	const others = NUMBER_WORDS.filter((w) => w !== canonical);
	return new RegExp(`\\b(${others.join("|")})${esc(rest)}`, "i");
}
