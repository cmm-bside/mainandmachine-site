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

function page(b) {
	const route = routeOf(b);
	const tier = tierOf(b);
	const priceFact = `price-${b.tier}`;
	const inds = b.industries
		.map((k) => `<li><a href="/industries/${k}/">${esc(INDUSTRY_NAMES[k])}</a></li>`)
		.join("\n            ");
	const faqHtml = b.faq
		.map(([q, a], i) => `        <details class="faq__item">
          <summary><span class="faq__n">0${i + 1}</span>${esc(q)}</summary>
          <div class="faq__a"><p>${esc(a)}</p></div>
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
        <div class="statrail__row"><span class="statrail__k">Delivered through</span><span class="statrail__v">${esc(tier.name)}</span></div>
        <div class="statrail__row"><span class="statrail__k">Price</span><span class="statrail__v"><span data-fact="${priceFact}">${esc(tier.price)}</span></span></div>
        <div class="statrail__row"><span class="statrail__k">Timeline</span><span class="statrail__v"><span data-fact="timeline-${b.tier}">${esc(tier.timeline)}</span></span></div>
        <div class="statrail__row"><span class="statrail__k">Guarantee</span><span class="statrail__v">Live in 90 days or we keep building</span></div>
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
      <p>Every sector we work in has a version of this problem. These four feel it hardest, and they are where we have built it most often.</p>
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
      <p>No invented example here. The method is below; the numbers are yours to put into it.</p>
    </div>
    <div class="prose-2">
      <p><strong>What to count.</strong> ${b.countThis}. That is the arithmetic, and it is yours to run &mdash; we would rather hand you the method than a number invented for a page.</p>
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
      <p>The same three phases as every other engagement. Nothing about this build gets its own process.</p>
    </div>
    <div class="prose-2">
      <p><strong>Discover.</strong> We walk the workflow as it runs today &mdash; who touches it, where it stalls, what it costs when it slips. That is the AI Readiness Audit, and it ends in a written document you own.</p>
      <p><strong>Build.</strong> A fixed quote in writing before work begins, then the system goes into your real operation rather than a demo environment. A person stays in the loop on anything a customer sees.</p>
      <p><strong>Evolve.</strong> Once it is live it needs watching: what it handles, what it escalates, what changed in your business since. That is Managed Services, and it is optional.</p>
      <p class="section-action"><a href="/method/">How we work <span class="arr">&#8594;</span></a></p>
    </div>
  </div>
</section>

<!-- ============ PRICE CONTEXT ============ -->
<section class="section paper-2">
  <div class="wrap">
    <div class="head-block">
      <div>
        <span class="kicker">What it costs</span>
        <h2 class="h2 mt-s">Delivered through ${esc(tier.name)}.</h2>
      </div>
      <p>This build has no price of its own. It is scoped and delivered inside a published service, at the published price.</p>
    </div>
    <p class="buildpage__price">An <a href="/services/#audit">AI Readiness Audit</a> runs <span data-fact="price-audit">${esc(COMPANY.services.find((s) => s.key === "audit").price)}</span> and tells you whether this build is the right first move. The build itself is delivered in ${esc(tier.name)} at <span data-fact="${priceFact}">${esc(tier.price)}</span>, quoted fixed in writing before work begins. <a href="/pricing/">Read the price list <span class="arr">&#8594;</span></a></p>
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
      <p>A senior advisor walks your workflows and tells you whether this build is worth doing &mdash; including when the answer is not yet.</p>
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
