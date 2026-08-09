// Reusable JSON-LD node builders — one helper per node type, every value
// derived from src/data/site-facts.json. Shared by the WRITER
// (scripts/render-jsonld.mjs, which patches the hand-embedded graphs in
// committed HTML) and the READER (scripts/check-jsonld-presence.mjs), the same
// split fact-values.mjs uses for data-fact spans and for the same reason: two
// separate derivations would let the pages and the guard drift together.
//
// WHY THIS PATCHES RATHER THAN REGENERATES. The shared #org / #website /
// #person-cmyers nodes are hand-embedded on ~40 pages and are NOT uniform —
// measured 2026-08-09: 7 distinct org shapes, 6 person shapes, 2 website
// shapes. The variance is deliberate: /about/ carries `affiliation` and
// `knowsAbout`, 11 pages carry `hasOfferCatalog`, / carries `contactPoint` and
// `numberOfEmployees`, /blog/ carries a SearchAction. Regenerating whole nodes
// from one template would silently DELETE all of that. So these helpers return
// the fields that must be canonical, and the renderer merges them in.
import { COMPANY } from "../../src/data/company.mjs";
import { priceRange } from "./fact-values.mjs";

const origin = COMPANY.origin;

export const ID = {
	org: `${origin}/#org`,
	website: `${origin}/#website`,
	person: `${origin}/#person-cmyers`,
	local: (path) => `${origin}${path}#local`,
};

/** A pointer to another node. One @id is one entity; never restate its fields. */
export const ref = (id) => ({ "@id": id });

/**
 * areaServed for the top-level org: both hub metros plus the remote coverage.
 *
 * The brief asked for "Denver metro, Phoenix metro, US remote" against a
 * standing `"areaServed": "US"`. Both halves are true and they are not
 * redundant — the metros are where we have people, "US" is where we deliver.
 * Dropping "US" for the metros would narrow a real claim.
 */
export function orgAreaServed() {
	return [
		...COMPANY.hubs.map((h) => ({
			"@type": "City",
			name: h.city,
			containedInPlace: { "@type": "State", name: h.state },
		})),
		{ "@type": "Country", name: "United States" },
	];
}

/**
 * areaServed for a city page's LocalBusiness node: the city, plus the Census
 * CBSA metro it anchors. `AdministrativeArea` rather than `City` for the metro
 * — a metropolitan statistical area spans many municipalities and is not one.
 */
export function hubAreaServed(hub) {
	return [
		{
			"@type": "City",
			name: hub.city,
			containedInPlace: { "@type": "State", name: hub.state },
		},
		{ "@type": "AdministrativeArea", name: hub.metro },
	];
}

/** Fields every #org node must carry, whatever else a page adds. */
export function orgCanonicalFields() {
	return {
		name: COMPANY.name,
		url: `${origin}/`,
		logo: `${origin}/icon-512.png`,
		email: COMPANY.email,
		telephone: COMPANY.phoneE164,
		priceRange: priceRange(COMPANY),
		areaServed: orgAreaServed(),
		founder: ref(ID.person),
		sameAs: COMPANY.sameAs.org,
	};
}

/** Fields every #website node must carry. */
export function websiteCanonicalFields() {
	return {
		name: COMPANY.name,
		alternateName: COMPANY.alternateName,
		url: `${origin}/`,
	};
}

/**
 * Fields every #person-cmyers node must carry.
 *
 * `sameAs` is the load-bearing one: check-facts.mjs holds all ~40 hand-embedded
 * Person blocks to COMPANY.sameAs.person exactly AND in order, because one @id
 * is one entity and the pages must not disagree about it.
 */
export function personCanonicalFields() {
	return {
		name: COMPANY.founder.name,
		jobTitle: COMPANY.founder.title,
		worksFor: ref(ID.org),
		sameAs: COMPANY.sameAs.person,
	};
}

/** Fields every city #local node must carry. */
export function hubCanonicalFields(hub) {
	return {
		name: COMPANY.name,
		url: `${origin}${hub.path}`,
		email: COMPANY.email,
		telephone: COMPANY.phoneE164,
		priceRange: priceRange(COMPANY),
		areaServed: hubAreaServed(hub),
		parentOrganization: ref(ID.org),
		// NO address / streetAddress. Service-area business, no verified public
		// address. Inventing one would be a fabricated fact in machine-readable
		// form — the worst place to put one.
	};
}

/**
 * A minimal WebPage + BreadcrumbList graph, for pages that carry no
 * page-specific entity of their own (/privacy/, /terms/). They were the only
 * indexable pages on the site with no JSON-LD at all, which left them
 * unattached to the entity graph.
 */
export function simplePageGraph({ path, name, description, breadcrumb }) {
	return {
		"@context": "https://schema.org",
		"@graph": [
			{
				"@type": "WebPage",
				"@id": `${origin}${path}#webpage`,
				name,
				description,
				url: `${origin}${path}`,
				isPartOf: ref(ID.website),
				publisher: ref(ID.org),
				about: ref(ID.org),
			},
			{
				"@type": "WebSite",
				"@id": ID.website,
				...websiteCanonicalFields(),
			},
			{
				"@type": "ProfessionalService",
				"@id": ID.org,
				...orgCanonicalFields(),
			},
			// The Person is carried here too, even though a legal page is not
			// about the founder. orgCanonicalFields() emits `founder` as a
			// pointer to #person-cmyers, and a pointer whose target no page in
			// the same document defines is a dangling reference — the exact
			// defect this layer just fixed on /work/marcus/.
			{
				"@type": "Person",
				"@id": ID.person,
				...personCanonicalFields(),
				image: `${origin}/images/christopher-myers-hedcut.png`,
			},
			breadcrumbList(breadcrumb),
		],
	};
}

/** BreadcrumbList from [[name, path], …]. Absolute URLs, 1-indexed. */
export function breadcrumbList(pairs) {
	return {
		"@type": "BreadcrumbList",
		itemListElement: pairs.map(([name, path], i) => ({
			"@type": "ListItem",
			position: i + 1,
			name,
			item: `${origin}${path}`,
		})),
	};
}
