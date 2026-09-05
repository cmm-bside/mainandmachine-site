#!/usr/bin/env node
// Generate a page per named build under /services/builds/<slug>/.
//
//   npm run builds:pages
//
// CHROME IS CLONED FROM A DONOR PAGE, NOT RE-AUTHORED. The static pages hand-
// write their topbar, nav and footer, and qa:matrix compares that DOM across
// every route and fails on any shape that is not the majority. Generating
// fresh chrome — even from templates.mjs, which exists for the blog — would
// produce a 44th variant and break parity. So the donor's chrome is copied
// byte-for-byte and only the <main> and the head are authored.
//
// The head follows the established static-page pattern (canonical, full og/
// twitter set, one @graph). Prices are data-fact spans, never literals, so
// facts:render owns them and numbers:check can see them.
import fs from "node:fs";
import path from "node:path";
import { COMPANY, SITE_ORIGIN } from "./lib/config.mjs";
import { BUILDS, INDUSTRY_NAMES, routeOf, tierOf } from "./lib/builds.mjs";
import { ID, ref, breadcrumbList } from "./lib/jsonld.mjs";

const ROOT = process.cwd();
const DONOR = path.join(ROOT, "services", "sample-audit", "index.html");
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const attr = (s) => esc(s).replace(/"/g, "&quot;");

const donor = fs.readFileSync(DONOR, "utf8");
// Slice the donor at its structural boundaries.
const chrome = {
	afterBody: donor.slice(donor.indexOf("<body>"), donor.indexOf('<main id="main"')),
	afterMain: donor.slice(donor.indexOf("</main>")),
};
const assetV = /styles\.css\?v=(\d+)/.exec(donor)[1];
const headTail = donor.slice(
	donor.indexOf('<link rel="preload"'),
	donor.indexOf("</head>"),
).replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>\s*/g, "");

function graphFor(b) {
	const route = routeOf(b);
	const tier = tierOf(b);
	return {
		"@context": "https://schema.org",
		"@graph": [
			{ "@type": "ProfessionalService", "@id": ID.org },
			{ "@type": "WebSite", "@id": ID.website },
			{ "@type": "Person", "@id": ID.person },
			{
				"@type": "Service",
				"@id": `${SITE_ORIGIN}${route}#service`,
				name: b.name,
				serviceType: b.name,
				description: b.definition,
				url: `${SITE_ORIGIN}${route}`,
				provider: ref(ID.org),
				areaServed: "US",
				offers: {
					"@type": "Offer",
					priceSpecification: {
						"@type": "PriceSpecification",
						minPrice: tier.priceLow,
						...(tier.priceHigh ? { maxPrice: tier.priceHigh } : {}),
						priceCurrency: "USD",
					},
					url: `${SITE_ORIGIN}/pricing/`,
				},
			},
			breadcrumbList([
				[COMPANY.name, "/"],
				["Services", "/services/"],
				["The Build Catalog", "/services/builds/"],
				[b.name, route],
			]),
		],
	};
}

function faqGraph(b) {
	return {
		"@context": "https://schema.org",
		"@type": "FAQPage",
		mainEntity: b.faq.map(([q, a]) => ({
			"@type": "Question",
			name: q,
			acceptedAnswer: { "@type": "Answer", text: a },
		})),
	};
}

/**
 * The fourth spec row is an assurance, and WHICH assurance depends on the
 * delivering service — it is not one sentence for every build.
 *
 * The 90-day guarantee is a DELIVERY promise: a scoped workflow goes live in
 * the client's operation or we keep building at no charge. That is what a
 * sprint sells. Managed Services sells the opposite shape — it is ongoing,
 * there is nothing to "go live", and a page that offers to keep building until
 * a retainer is live is promising something incoherent. Its assurance is the
 * one that actually applies, and it is already canonical in site-facts.json as
 * the managed note ("No lock-in · annual pays for 10 months, not 12").
 *
 * Keyed off b.tier rather than the slug so a build that is re-tiered later
 * moves to the right row without anyone remembering this exists.
 *
 * Both this row and "Delivered through" carry .statrail__v--sm. The spec sheet
 * is a one-line-per-row rhythm and a service name or an assurance clause is a
 * phrase, not a figure: at TIER 2's 22px "Live in 90 days or we keep building"
 * needed 259px of a ~250px column and wrapped, which also squeezed the label
 * until "No lock-in" broke at its own hyphen. --sm is the component's existing
 * answer for a long value (see /'s "Agents · Automations"); the price and the
 * timeline stay at 22px because those are the figures the card is for.
 */
function assuranceFor(tierKey) {
	return tierKey === "managed"
		? { label: "No lock-in", value: "Leave whenever it stops paying" }
		: { label: "Guarantee", value: "Live in 90 days or we keep building" };
}

function page(b) {
	const route = routeOf(b);
	const tier = tierOf(b);
	// The price sentence in PRICE CONTEXT below opens on the stamped price
	// rather than splicing it after "at". Managed Services' canonical price is
	// the string "From $1,500/month" — the word is part of the fact — so
	// "delivered in Managed Services at From $1,500/month" was the rendered
	// result, and the stamp cannot be lowercased to fix it (check-facts compares
	// the span byte-for-byte against site-facts.json). Starting a sentence with
	// it is how /services/builds/ already handles the same string.
	const priceFact = `price-${b.tier}`;
	const assurance = assuranceFor(b.tier);
	const inds = b.industries
		.map((k) => `<li><a href="/industries/${k}/">${esc(INDUSTRY_NAMES[k])}</a></li>`)
		.join("\n            ");
	const faqHtml = b.faq
		// The canonical FAQ row, identical to the 28 hand-written pages. This used
		// to emit .faq__item / .faq__n / .faq__a — three classes with NO rule
		// anywhere in styles.css — so every build page rendered its index numbers
		// in body ink instead of accent and, because the "+" was authored markup
		// back then, showed no expand affordance at all.
		.map(([q, a], i) => `        <details>
          <summary><span class="q-no">0${i + 1}</span><span class="q-tx">${esc(q)}</span></summary>
          <p>${esc(a)}</p>
        </details>`)
		.join("\n");

	return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(b.title)}</title>
<meta name="description" content="${attr(b.description)}" />
<link rel="canonical" href="${SITE_ORIGIN}${route}" />

<!-- Open Graph -->
<meta property="og:type" content="website" />
<meta property="og:site_name" content="${esc(COMPANY.name)}" />
<meta property="og:title" content="${attr(b.title)}" />
<meta property="og:description" content="${attr(b.description)}" />
<meta property="og:url" content="${SITE_ORIGIN}${route}" />
<meta property="og:image" content="${SITE_ORIGIN}/images/og/services-builds-${b.slug}.png" />
<meta property="og:image:type" content="image/png" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:image:alt" content="${attr(b.name)} &mdash; ${esc(COMPANY.name)}" />

<!-- Twitter -->
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${attr(b.title)}" />
<meta name="twitter:description" content="${attr(b.description)}" />
<meta name="twitter:image" content="${SITE_ORIGIN}/images/og/services-builds-${b.slug}.png" />
<meta name="twitter:image:alt" content="${attr(b.name)} &mdash; ${esc(COMPANY.name)}" />

${headTail}<script type="application/ld+json">
${JSON.stringify(graphFor(b), null, 2)}
</script>
<script type="application/ld+json">
${JSON.stringify(faqGraph(b), null, 2)}
</script>
</head>
${chrome.afterBody}<main id="main" tabindex="-1">

<!-- ============ HERO ============ -->
<section class="section paper pagehero">
  <div class="wrap">
    <nav class="crumb" aria-label="Breadcrumb"></nav>
    <div class="pagehero__grid">
      <div>
        <span class="kicker">${esc(b.kicker)}</span>
        <h1 class="h1">${esc(b.name)}</h1>
        <p class="lead">${esc(b.definition)}</p>
        <div class="hero__cta">
          <a class="btn btn--primary" href="/book/" data-cta="build-page-hero">Book a free assessment <span class="arr">&#8594;</span></a>
          <a class="btn btn--secondary" href="/score/">Get your AI-Ready Score</a>
        </div>
      </div>
      <div class="statrail crop">
        <div class="statrail__bar"><span>The build</span><span><b>Spec</b></span></div>
        <div class="statrail__row"><span class="statrail__k">Delivered through</span><span class="statrail__v statrail__v--sm">${esc(tier.name)}</span></div>
        <div class="statrail__row"><span class="statrail__k">Service range</span><span class="statrail__v"><span data-fact="${priceFact}">${esc(tier.price)}</span></span></div>
        <div class="statrail__row"><span class="statrail__k">Timeline</span><span class="statrail__v"><span data-fact="timeline-${b.tier}">${esc(tier.timeline)}</span></span></div>
        <div class="statrail__row"><span class="statrail__k">${esc(assurance.label)}</span><span class="statrail__v statrail__v--sm">${esc(assurance.value)}</span></div>
      </div>
    </div>
  </div>
</section>

<!-- ============ WHO IT IS FOR ============ -->
<section class="section paper-2">
  <div class="wrap">
    <div class="head-block">
      <div>
        <span class="kicker">Who feels it most</span>
        <h2 class="h2 mt-s">Where this one earns its keep.</h2>
      </div>
      <p>These industries commonly have this workflow. Fit depends on your volume, tools, exceptions, and the cost of the manual work; these links are examples of suitability, not a list of customer deployments.</p>
    </div>
    <ul class="buildpage__inds">
            ${inds}
    </ul>
  </div>
</section>

<!-- ============ THE PAIN ============ -->
<section class="section paper">
  <div class="wrap">
    <div class="head-block">
      <div>
        <span class="kicker">The arithmetic</span>
        <h2 class="h2 mt-s">${esc(b.painHeading)}</h2>
      </div>
      <p>Start with your actual workload and costs. Treat the calculation as a way to test the opportunity, not a promise of revenue or savings.</p>
    </div>
    <div class="prose-2">
      <p><strong>What to count.</strong> ${b.countThis}. Use gross profit rather than total revenue when valuing recovered business. Subtract software, maintenance, and human review costs, and avoid counting the same saved time twice.</p>
      <p>The <a href="/calculator/">ROI calculator</a> models the same shape across a whole team, and its assumptions are published in full underneath it. The number that actually matters comes out of an <a href="/services/#audit">AI Readiness Audit</a>, which measures your workflows instead of averaging them.</p>
    </div>
    <!-- BUILD-PAGE:WORKED-EXAMPLE ${b.slug} -->
    <!-- NEEDS-INPUT (${b.slug}.workedExample): the worked example is deliberately
         NOT generated. A realistic before/after needs a real intake volume, a
         real close rate and a real ticket size for this build, and inventing
         them would put fabricated arithmetic on a page that quotes fixed
         prices. Supply the three inputs and this section gets written. -->
    <!-- /BUILD-PAGE:WORKED-EXAMPLE -->
  </div>
</section>

<!-- ============ HOW WE BUILD IT ============ -->
<section class="section ink">
  <div class="wrap">
    <div class="head-block">
      <div>
        <span class="kicker">How it gets built</span>
        <h2 class="h2 mt-s">Discover, build, evolve.</h2>
      </div>
      <p>Define the operating boundary before choosing a model or a tool. Your written scope connects the workflow to the systems, decisions, and people it depends on.</p>
    </div>
    <div class="prose-2">
      <p><strong>Discover.</strong> We review the workflow, its volume, the tools involved, and what happens when an exception arrives. Use an AI Readiness Audit when that needs investigation, or discuss direct sprint scoping if it is already defined.</p>
      <p><strong>Build.</strong> Agree the scope and fixed quote before work begins. Define routine actions that may run automatically, decisions requiring human approval, and the tests the workflow must pass.</p>
      <p><strong>Evolve.</strong> Once it is live it needs watching: what it handles, what it escalates, what changed in your business since. That is Managed Services, and it is optional.</p>
      <p class="section-action"><a href="/method/">How we work <span class="arr">&#8594;</span></a></p>
    </div>
  </div>
</section>

<!-- ============ PRICE CONTEXT ============ -->
<!-- .section--close-96: the section now ends on a lone action link, which is
     the rhythm layer's terminal-element rule. qa:matrix re-derives that shape
     and fails the build if the class and the markup disagree either way. -->
<section class="section paper-2 section--close-96">
  <div class="wrap">
    <div class="head-block">
      <div>
        <span class="kicker">What it costs</span>
        <h2 class="h2 mt-s">Delivered through ${esc(tier.name)}.</h2>
      </div>
      <p>The range below is for the delivering service, not a per-feature price. Your quote identifies the capabilities, integrations, and operating requirements included in the engagement.</p>
    </div>
    <p class="buildpage__price">An <a href="/services/#audit">AI Readiness Audit</a> runs <span data-fact="price-audit">${esc(COMPANY.services.find((s) => s.key === "audit").price)}</span> and tells you whether this build is the right first move. This capability is delivered through ${esc(tier.name)}; several related capabilities may share one scoped engagement. <span data-fact="${priceFact}">${esc(tier.price)}</span>, quoted fixed in writing before work begins.</p>
    <p class="section-action"><a href="/pricing/">Read the price list&nbsp;<span class="arr">&#8594;</span></a></p>
  </div>
</section>

<!-- ============ FAQ ============ -->
<section class="section paper">
  <div class="wrap">
    <div class="head-block">
      <div>
        <span class="kicker">Fair questions</span>
        <h2 class="h2 mt-s">${esc(b.name)}, asked plainly.</h2>
      </div>
    </div>
    <div class="faq__list">
${faqHtml}
    </div>
  </div>
</section>

<!-- ============ CTA ============ -->
<section class="section ink final">
  <div class="wrap">
    <div>
      <span class="kicker">Next step</span>
      <h2 class="h2 mt-s">30 minutes. A straight answer.</h2>
      <p>Bring one workflow to the free assessment. We will discuss whether this build fits, what needs scoping, and when the better answer is not yet.</p>
    </div>
    <div class="hero__cta">
      <a class="btn btn--primary" href="/book/" data-cta="build-page-final">Book a free assessment <span class="arr">&#8594;</span></a>
      <a class="btn btn--secondary" href="/score/">Get your AI-Ready Score</a>
    </div>
  </div>
</section>

${chrome.afterMain}`.replace(/styles\.css\?v=\d+/g, `styles.css?v=${assetV}`);
}

/**
 * Register every build route in the three places a static page has to appear:
 * STATIC_ROUTES (sitemap + seo:check disk parity), ALL_PAGES (facts:check), and
 * CRUMB_LABELS (breadcrumbs, both visible and JSON-LD).
 *
 * Done here rather than by hand because forgetting one is silent in a
 * different way each time: miss STATIC_ROUTES and the page never reaches the
 * sitemap; miss ALL_PAGES and no fact on it is ever checked; miss CRUMB_LABELS
 * and crumbs:render aborts the whole pass. Three failure modes, one cause.
 */
function registerRoutes() {
	const edits = [];
	const patch = (file, anchor, lines, has) => {
		const p = path.join(ROOT, file);
		let s = fs.readFileSync(p, "utf8");
		const add = lines.filter((l) => !s.includes(has(l)));
		if (!add.length) return;
		s = s.replace(anchor, anchor + "\n" + add.join("\n"));
		fs.writeFileSync(p, s);
		edits.push(`${file} +${add.length}`);
	};
	patch(
		"scripts/lib/config.mjs",
		'\t"/services/builds/",',
		BUILDS.map((b) => `\t"${routeOf(b)}",`),
		(l) => l.trim().replace(/,$/, ""),
	);
	patch(
		"scripts/check-facts.mjs",
		'  "services/builds/index.html",',
		BUILDS.map((b) => `  "services/builds/${b.slug}/index.html",`),
		(l) => l.trim().replace(/,$/, ""),
	);
	patch(
		"scripts/lib/breadcrumbs.mjs",
		'\t"/services/builds/": "The Build Catalog",',
		BUILDS.map((b) => `\t"${routeOf(b)}": ${JSON.stringify(b.name)},`),
		(l) => l.split(":")[0].trim(),
	);
	if (edits.length) console.log(`  registered routes — ${edits.join(", ")}`);
}
registerRoutes();

let written = 0;
for (const b of BUILDS) {
	const dir = path.join(ROOT, "services", "builds", b.slug);
	fs.mkdirSync(dir, { recursive: true });
	const file = path.join(dir, "index.html");
	const html = page(b);
	const prev = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : null;
	if (prev !== html) { fs.writeFileSync(file, html); written++; console.log(`  ${prev ? "updated" : "created"} ${routeOf(b)}`); }
}
console.log(`[builds:pages] ${written} page(s) written of ${BUILDS.length} modelled`);
