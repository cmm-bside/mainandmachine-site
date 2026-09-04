// The breadcrumb model: one definition of every trail on the site.
//
// STRUCTURE IS DERIVED FROM THE URL, LABELS ARE DATA. Walking the path gives
// the ancestor chain for free — /work/marcus/results/ yields /, /work/,
// /work/marcus/ — so no page states its own parents and a trail cannot
// disagree with the site's shape. What a URL cannot give is a good NAME:
// "/industries/" is "Who this is for" and "/work/" is "Proof", which no
// slugifier will ever produce. So the segment labels live here, in one map,
// instead of being hand-written into 39 pages twice each (once visibly, once
// in JSON-LD).
//
// Every label below was HARVESTED from the crumb already on the page — none is
// invented. The site's voice choices ("Proof", not "Case studies"; "The Field
// Guide", not "Guides") are preserved exactly.
//
// Shared by the WRITER (scripts/render-breadcrumbs.mjs, which stamps both the
// visible <nav> and the BreadcrumbList JSON-LD) and the READER
// (scripts/check-breadcrumbs.mjs). Same split as fact-values.mjs and jsonld.mjs,
// for the same reason: the visible trail and the structured trail must come
// from ONE derivation or they drift — and they had, on 16 pages.
import { COMPANY } from "../../src/data/company.mjs";

const origin = COMPANY.origin;

// Home is the brand, not the word "Home" — that is what all 39 crumbs say, and
// it comes from the facts file so it cannot drift from the wordmark.
export const HOME_LABEL = COMPANY.name;

/**
 * route -> visible crumb label. The label is what a VISITOR sees, and the
 * JSON-LD is built from the same string, because Google's guidance is that
 * BreadcrumbList describes the breadcrumb trail shown on the page.
 *
 * That resolves the 16 mismatches measured 2026-08-09: the guides carried a
 * short visible label ("What it costs") and a long JSON-LD one ("What an AI
 * consultant costs"). The SHORT form wins — it is the one that is actually on
 * the page, it is what the narrow crumb bar was designed for, and it is what
 * survives a 320px viewport. The long form still reaches search through the
 * <title> and the Article headline, which is where a full title belongs.
 */
export const CRUMB_LABELS = {
	"/": HOME_LABEL,

	// Top-level pages and hubs
	"/about/": "Who we are",
	"/book/": "Book an assessment",
	"/calculator/": "Calculator",
	"/careers/": "Careers",
	"/contact/": "Contact",
	"/denver/": "Denver",
	"/guides/": "The Field Guide",
	"/industries/": "Who this is for",
	"/method/": "The method",
	"/phoenix/": "Phoenix",
	"/pricing/": "Pricing",
	"/privacy/": "Privacy",
	"/security/": "Security & data handling",
	"/services/": "Services",
	"/terms/": "Terms",
	"/work/": "Proof",

	// The Field Guide
	"/guides/ai-agents-vs-automations-vs-integrations/": "Agents vs. automations",
	"/guides/ai-consultant-cost/": "What it costs",
	"/guides/ai-consultant-vs-in-house/": "Consultant vs. in-house",
	"/guides/ai-data-cloud-vs-on-prem/": "Where your data goes",
	"/guides/ai-for-the-skeptical-owner/": "For the skeptic",
	"/guides/ai-readiness-checklist/": "Readiness checklist",
	"/guides/ai-roi-math-small-business/": "The ROI math",
	"/guides/chatgpt-vs-custom-ai/": "ChatGPT vs. custom",
	"/guides/how-long-ai-implementation-takes/": "How long it takes",
	"/guides/how-to-choose-an-ai-consultant/": "How to choose",
	"/guides/how-to-scope-an-ai-project/": "Scoping a project",
	"/guides/signs-you-are-not-ready-for-ai/": "Not ready yet",
	"/guides/what-ai-automation-costs-to-run/": "Running costs",
	"/guides/what-is-an-ai-readiness-audit/": "What an audit is",
	"/guides/private-ai-for-small-business/": "Private AI",

	// Who this is for
	"/industries/construction/": "Construction & trades",
	"/industries/healthcare/": "Healthcare & wellness",
	"/industries/hospitality/": "Hospitality & food service",
	"/industries/professional-services/": "Professional services",
	"/industries/retail/": "Retail & e-commerce",

	// Services
	"/services/ai-readiness-audit/": "AI Readiness Audit",
	"/services/ai-implementation/": "AI Implementation",
	"/services/managed-ai-services/": "Managed AI Services",
	"/services/builds/": "The Build Catalog",
	"/services/builds/instant-lead-response/": "Instant Lead Response",
	"/services/builds/missed-call-text-back/": "Missed-Call Text-Back",
	"/services/builds/review-reputation-agent/": "Review & Reputation Agent",
	"/services/builds/private-ai-server/": "Private AI Server",
	"/services/builds/data-privacy-filter/": "Data Privacy Filter",
	"/services/builds/company-knowledge-base/": "Company Knowledge Base",
	"/services/builds/slack-teams-integration/": "Slack & Teams Integration",
	"/services/builds/private-company-chat/": "Private Company Chat",
	"/services/builds/business-system-connectors/": "Business System Connectors",
	"/services/builds/testing-and-monitoring/": "Testing & Monitoring",
	"/services/sample-audit/": "Sample audit",
	"/services/builds/ai-receptionist/": "24/7 AI receptionist",
	"/services/builds/website-chat-booking-agent/": "Website chat & booking agent",

	// Proof
	"/work/marcus/": "MARCUS",
	"/work/marcus/results/": "Measured results",

	// Post-conversion (noindex, but it carries a crumb like every other page)
	"/book/thanks/": "You're booked",
};

/**
 * Ancestor chain for a route, derived from its path segments.
 * "/work/marcus/results/" -> ["/", "/work/", "/work/marcus/", "/work/marcus/results/"]
 *
 * A prefix is only included if it is a route we actually have a label for, so
 * an intermediate directory that is not a real page cannot appear as a dead
 * crumb.
 */
export function ancestorsOf(route) {
	const segs = route.split("/").filter(Boolean);
	const out = ["/"];
	let acc = "";
	for (const s of segs) {
		acc += `/${s}`;
		const r = `${acc}/`;
		if (CRUMB_LABELS[r]) out.push(r);
	}
	return out;
}

/**
 * The full trail for a route, as [{ route, label, isCurrent }].
 * Returns null where a breadcrumb would be redundant — the homepage, whose
 * trail is just itself.
 */
export function trailFor(route) {
	if (route === "/") return null;
	const chain = ancestorsOf(route);
	if (chain.length < 2) return null;
	return chain.map((r, i) => ({
		route: r,
		label: CRUMB_LABELS[r],
		isCurrent: i === chain.length - 1,
	}));
}

/**
 * Every internal /book link must carry a non-empty data-cta — cta:check fails
 * the build otherwise, because booking placement used to be INFERRED from
 * ancestor classes and inference failed silently in both directions.
 *
 * A breadcrumb hop to /book/ is navigation rather than a call to action, but it
 * is still a link into the funnel and it still deserves to be counted as what
 * it is. `breadcrumb` is its own placement so it can never be mistaken in the
 * analytics for a hero or pre-footer CTA. This is generated rather than
 * stamped by cta:stamp so a new crumb through /book/ can never arrive
 * untagged. (Currently one instance: /book/thanks/, whose trail passes back
 * through /book/.)
 */
function ctaAttr(route) {
	return route === "/book/" ? ' data-cta="breadcrumb"' : "";
}

/** Visible markup. <nav aria-label> + <ol>, separators drawn in CSS. */
export function breadcrumbHtml(route, { className = "crumb" } = {}) {
	const trail = trailFor(route);
	if (!trail) return null;
	const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
	const items = trail
		.map(({ route: r, label, isCurrent }) =>
			isCurrent
				// The current page is NOT a link — a link to where you already are
				// is noise for everyone and a wasted stop for a screen-reader user.
				// aria-current="page" is what announces it as the current position.
				? `      <li><span aria-current="page">${esc(label)}</span></li>`
				: `      <li><a href="${r}"${ctaAttr(r)}>${esc(label)}</a></li>`,
		)
		.join("\n");
	// The separator is a CSS ::before on li + li, never a text node. A literal
	// "/" in the markup gets announced by screen readers ("slash") on every
	// item, which is exactly the noise aria-label="Breadcrumb" is meant to
	// replace. This is the accessibility fix: the old markup was a bare <div>
	// of links with <span class="sep">/</span> between them, so assistive tech
	// had no way to know it was a trail at all.
	return `<nav class="${className}" aria-label="Breadcrumb">
    <ol class="crumb__list">
${items}
    </ol>
  </nav>`;
}

/** BreadcrumbList JSON-LD, from the SAME trail as the visible markup. */
export function breadcrumbJsonLd(route) {
	const trail = trailFor(route);
	if (!trail) return null;
	return {
		"@type": "BreadcrumbList",
		itemListElement: trail.map(({ route: r, label }, i) => ({
			"@type": "ListItem",
			position: i + 1,
			name: label,
			item: `${origin}${r}`,
		})),
	};
}
