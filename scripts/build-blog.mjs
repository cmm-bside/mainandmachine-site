#!/usr/bin/env node
// Prerender the blog from the generated index + per-post bodies.
//
//   /blog               -> featured hero + recent essays + search
//   /blog/archive       -> Latest (by month) + Top (by popularity) tabs + search
//   /blog/<slug>        -> full article (prose + drop-cap), share, read-next, CTA
//   /blog/rss.xml       -> RSS 2.0
//   /sitemap.xml        -> static routes + every blog route
//   /blog-data/index.json (kept in sync with the module)
//
// SEO/JSON-LD is built ONLY from post metadata, never the body. Reads nothing
// from the network. Tolerates a missing data module (fresh clone) -> empty blog.
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
	ROOT,
	SITE_ORIGIN,
	BRAND,
	BLOG_NAME,
	BLOG_DESCRIPTION,
	AUTHOR,
	DEFAULT_OG_IMAGE,
	DATA_MODULE_PATH,
	BLOG_DATA_DIR,
	BLOG_INDEX_JSON,
	BLOG_DIR,
	ARCHIVE_DIR,
	RSS_PATH,
	SITEMAP_PATH,
	STATIC_ROUTES,
	EXCLUDED_POST_SLUGS,
} from "./lib/config.mjs";
import {
	esc,
	attr,
	formatDate,
	monthLabel,
	head,
	topbar,
	nav,
	footer,
	subscribeBand,
	pageScripts,
	orgJsonLd,
} from "./lib/templates.mjs";
import { structureArticle, renderToc, renderArticleBody } from "./lib/article.mjs";

const RECENT_ON_HOME = 6;
const ARCHIVE_BATCH = 12;

async function main() {
	const { posts, meta } = await loadData();
	const subscribeUrl = meta.subscribeUrl || "";
	const publicationUrl = meta.publicationUrl || "";

	fs.mkdirSync(BLOG_DIR, { recursive: true });
	fs.mkdirSync(BLOG_DATA_DIR, { recursive: true });

	// Keep the client JSON in sync with the module (covers the postinstall
	// path, where fetch may not have run).
	if (!fs.existsSync(BLOG_INDEX_JSON)) {
		fs.writeFileSync(BLOG_INDEX_JSON, JSON.stringify({ meta, posts }));
	}

	writeFile(path.join(BLOG_DIR, "index.html"), renderHome(posts, { subscribeUrl, publicationUrl }));
	writeFile(path.join(ARCHIVE_DIR, "index.html"), renderArchive(posts, { subscribeUrl, publicationUrl }));

	const slugs = new Set();
	for (const post of posts) {
		slugs.add(post.slug);
		const body = loadBody(post.slug);
		writeFile(
			path.join(BLOG_DIR, post.slug, "index.html"),
			renderPost(post, body, posts, { subscribeUrl, publicationUrl }),
		);
	}
	pruneStalePostDirs(slugs);

	writeFile(RSS_PATH, renderRss(posts, meta));
	writeFile(SITEMAP_PATH, renderSitemap(posts));

	console.log(`[blog:build] Prerendered ${posts.length} post(s) + home, archive, rss, sitemap.`);
}

// ---------------------------------------------------------------------------
// Data loading
// ---------------------------------------------------------------------------
async function loadData() {
	try {
		const mod = await import(`${pathToFileURL(DATA_MODULE_PATH).href}?t=${Date.now()}`);
		const excluded = new Set(EXCLUDED_POST_SLUGS.map((s) => s.toLowerCase()));
		const posts = (mod.posts || []).filter(
			(p) => p && p.slug && !excluded.has(String(p.slug).toLowerCase()),
		);
		const dropped = (mod.posts || []).length - posts.length;
		if (dropped > 0) console.log(`[blog:build] Excluded ${dropped} post(s) by slug denylist.`);
		return { posts, meta: mod.meta || {} };
	} catch {
		console.warn("[blog:build] No data module yet — building an empty blog.");
		return { posts: [], meta: { name: BLOG_NAME, description: BLOG_DESCRIPTION } };
	}
}

function loadBody(slug) {
	try {
		const json = JSON.parse(fs.readFileSync(path.join(BLOG_DATA_DIR, `${slug}.json`), "utf8"));
		return json.bodyHtml || "";
	} catch {
		return "";
	}
}

// ---------------------------------------------------------------------------
// Shared fragments
// ---------------------------------------------------------------------------
// Self-hosted images are stored as root-relative paths (/images/blog/…).
// og:image and JSON-LD image must be absolute, so promote any local path to
// the canonical origin; already-absolute (or remote-fallback) URLs pass through.
function absUrl(u) {
	return u && u.startsWith("/") ? `${SITE_ORIGIN}${u}` : u;
}

function ogImageFor(post) {
	return absUrl(
		(post.socialImage && post.socialImage.assetUrl) ||
			(post.heroImage && post.heroImage.assetUrl) ||
			DEFAULT_OG_IMAGE,
	);
}

function thumb(post, cls) {
	const hi = post.heroImage;
	const img = hi && hi.assetUrl;
	if (!img) return `<div class="${cls} is-empty"></div>`;
	const dims = hi.width && hi.height ? ` width="${hi.width}" height="${hi.height}"` : "";
	return `<div class="${cls}"><img loading="lazy" decoding="async"${dims} alt="${attr(hi.alt || `${post.title} — illustrated diagram from ${BLOG_NAME}`)}" src="${attr(img)}" /></div>`;
}

function card(post) {
	return `<a class="feed__card" href="${attr(post.url)}">
  ${thumb(post, "feed__card-img")}
  <div class="feed__card-body">
    <span class="feed__date">${esc(formatDate(post.publishedAt))}</span>
    <h3 class="feed__card-title">${esc(post.title)}</h3>
    ${post.excerpt ? `<p class="feed__card-excerpt">${esc(post.excerpt)}</p>` : ""}
  </div>
</a>`;
}

function featured(post) {
	return `<a class="feed__featured crop" href="${attr(post.url)}">
  ${thumb(post, "feed__featured-img")}
  <div class="feed__featured-body">
    <span class="tick-lbl">Latest dispatch · ${esc(formatDate(post.publishedAt))}</span>
    <h2 class="feed__featured-title">${esc(post.title)}</h2>
    ${post.excerpt ? `<p class="feed__excerpt">${esc(post.excerpt)}</p>` : ""}
    <span class="feed__read">Read the essay →</span>
  </div>
</a>`;
}

function searchBar(placeholder) {
	return `<div class="blogsearch">
  <input type="search" id="blog-search" autocomplete="off" placeholder="${attr(placeholder)}" aria-label="Search The Ampersand" />
  <span class="blogsearch__hint tick-lbl">Search title, summary &amp; text</span>
</div>
<div id="blog-results" class="feed" hidden></div>`;
}

function emptyState(subscribeUrl) {
	const cta = subscribeUrl
		? `<a class="btn btn--accent btn--lg" data-beehiiv-subscribe href="${attr(subscribeUrl)}" target="_blank" rel="noopener">Get the weekly essay →</a>`
		: "";
	return `<div class="feed__empty crop">
  <span class="kicker kicker--plain">${esc(BLOG_NAME)}</span>
  <h2 class="h2 mt-s">The first dispatch is on its way.</h2>
  <p class="lead">Free weekly essays on building durable things in a noisy time — no hype, no funnels. Subscribe and you'll get the first one the moment it's out.</p>
  ${cta}
</div>`;
}

// ---------------------------------------------------------------------------
// /blog
// ---------------------------------------------------------------------------
function renderHome(posts, { subscribeUrl, publicationUrl }) {
	const blogLd = {
		"@context": "https://schema.org",
		"@type": "Blog",
		name: BLOG_NAME,
		description: BLOG_DESCRIPTION,
		url: `${SITE_ORIGIN}/blog/`,
		inLanguage: "en-US",
		publisher: { "@id": `${SITE_ORIGIN}/#org` },
		author: { "@id": `${SITE_ORIGIN}/#person-cmyers` },
		blogPost: posts.slice(0, RECENT_ON_HOME + 1).map((p) => ({
			"@type": "BlogPosting",
			headline: p.title,
			url: `${SITE_ORIGIN}${p.url}`,
			datePublished: p.publishedAt || undefined,
		})),
	};

	let feed;
	if (!posts.length) {
		feed = emptyState(subscribeUrl);
	} else {
		const rest = posts.slice(1, 1 + RECENT_ON_HOME);
		feed = `${featured(posts[0])}
${rest.length
	? `<div class="feed__bar"><span class="tick-lbl">Recent dispatches</span><a class="tick-lbl" href="/blog/archive/" style="color:var(--accent)">Full archive →</a></div>
<div class="feed__grid">${rest.map(card).join("\n")}</div>`
	: ""}
<a class="feed__archive" href="/blog/archive/">View the full archive →</a>`;
	}

	const body = `${topbar()}
${nav()}
<section class="section section--tight paper" data-screen-label="${esc(BLOG_NAME)}">
  <div class="wrap">
    <div class="head-block" style="align-items:flex-end;">
      <div>
        <span class="kicker">Writing / ${esc(BLOG_NAME)}</span>
        <h1 class="h-hero" style="font-size:clamp(40px,6vw,76px);margin-top:14px;">${esc(BLOG_NAME)}.</h1>
      </div>
      <p class="lead">A newsletter about building durable things in a noisy time. No hype, no countdown timers, no ten-step funnel. If you want to understand how we think before you ever talk to us, start here.</p>
    </div>
    ${searchBar("Search the essays…")}
  </div>
</section>

<section class="section paper-2" data-screen-label="Recent writing">
  <div class="wrap">
    <div id="blog-feed" class="feed">${feed}</div>
  </div>
</section>

${subscribeBand(subscribeUrl, publicationUrl)}
${footer()}
${pageScripts()}`;

	return `${head({
		title: `${BLOG_NAME} — Plain-English AI Essays for Business Owners | ${BRAND}`,
		description: `${BLOG_NAME} — ${BLOG_DESCRIPTION} Human-centric AI, small business, and the judgment no model has.`,
		canonical: `${SITE_ORIGIN}/blog/`,
		ogImage: `${SITE_ORIGIN}/images/og/blog.png`,
		jsonLd: [blogLd, orgJsonLd()],
	})}
<body>
${body}
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// /blog/archive
// ---------------------------------------------------------------------------
function renderArchive(posts, { subscribeUrl, publicationUrl }) {
	const collectionLd = {
		"@context": "https://schema.org",
		"@type": "CollectionPage",
		name: `${BLOG_NAME} — Archive`,
		description: `Every essay from ${BLOG_NAME}.`,
		url: `${SITE_ORIGIN}/blog/archive/`,
		isPartOf: { "@type": "Blog", name: BLOG_NAME, url: `${SITE_ORIGIN}/blog/` },
		breadcrumb: breadcrumbLd([
			["Home", `${SITE_ORIGIN}/`],
			["Writing", `${SITE_ORIGIN}/blog/`],
			["Archive", `${SITE_ORIGIN}/blog/archive/`],
		]),
	};

	let content;
	if (!posts.length) {
		content = emptyState(subscribeUrl);
	} else {
		// Latest — grouped by month.
		const groups = [];
		let current = null;
		for (const p of posts) {
			const label = monthLabel(p.publishedAt);
			if (!current || current.label !== label) {
				current = { label, items: [] };
				groups.push(current);
			}
			current.items.push(p);
		}
		const monthBlock = (g) => `<div class="arch__month">
  <h3 class="arch__month-label">${esc(g.label)}</h3>
  <div class="feed__grid">${g.items.map(card).join("\n")}</div>
</div>`;

		// Batch the archive so the page doesn't render every cover up front.
		// Latest batches by WHOLE month groups (~ARCHIVE_BATCH cards each) so a
		// month header is never split; later batches ship as inert <template>s
		// that blog.js reveals via "Load more". Search is unaffected — it runs
		// over /blog-data/index.json, not the DOM.
		const latestBatches = [];
		let bucket = [];
		let bucketCount = 0;
		for (const g of groups) {
			bucket.push(g);
			bucketCount += g.items.length;
			if (bucketCount >= ARCHIVE_BATCH) {
				latestBatches.push(bucket);
				bucket = [];
				bucketCount = 0;
			}
		}
		if (bucket.length) latestBatches.push(bucket);
		const latestFirst = (latestBatches[0] || []).map(monthBlock).join("\n");
		const latestRest = latestBatches
			.slice(1)
			.map((b) => `<template class="archmore-batch" data-pane="latest">${b.map(monthBlock).join("\n")}</template>`)
			.join("\n");

		// Top — by popularity, plain batches of ARCHIVE_BATCH cards. The first
		// batch also ships as a template; blog.js fills the grid when the tab
		// is first opened, so the hidden pane costs no initial DOM.
		const sortedTop = [...posts].sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
		const topBatches = [];
		for (let i = 0; i < sortedTop.length; i += ARCHIVE_BATCH) {
			topBatches.push(sortedTop.slice(i, i + ARCHIVE_BATCH));
		}
		const topTemplates = topBatches
			.map((b) => `<template class="archmore-batch" data-pane="top">${b.map(card).join("\n")}</template>`)
			.join("\n");

		const moreBtn = (pane) =>
			`<button type="button" class="feed__archive archmore" data-pane="${pane}">Load more →</button>`;

		content = `<div class="archtabs" role="tablist">
  <button class="archtab is-active" role="tab" aria-selected="true" data-tab="latest">Latest</button>
  <button class="archtab" role="tab" aria-selected="false" data-tab="top">Top</button>
</div>
<div id="tab-latest" class="archpane">${latestFirst}
${latestRest}
${latestBatches.length > 1 ? moreBtn("latest") : ""}</div>
<div id="tab-top" class="archpane" hidden><div class="feed__grid"></div>
${topTemplates}
${topBatches.length > 1 ? moreBtn("top") : ""}</div>`;
	}

	const body = `${topbar()}
${nav()}
<section class="section section--tight paper" data-screen-label="Archive">
  <div class="wrap">
    <div class="head-block" style="align-items:flex-end;">
      <div>
        <span class="kicker">Writing / Archive</span>
        <h1 class="h-hero" style="font-size:clamp(36px,5vw,64px);margin-top:14px;">The full archive.</h1>
      </div>
      <p class="lead">Everything from ${esc(BLOG_NAME)}, in order — or sorted by what's been read most. Search across every essay below.</p>
    </div>
    ${searchBar("Search the archive…")}
  </div>
</section>

<section class="section paper-2" data-screen-label="Archive">
  <div class="wrap">
    <div id="blog-feed">${content}</div>
  </div>
</section>

${subscribeBand(subscribeUrl, publicationUrl)}
${footer()}
${pageScripts()}`;

	return `${head({
		title: `Archive — ${BLOG_NAME}`,
		description: `Every essay from ${BLOG_NAME} — ${BLOG_DESCRIPTION}`,
		canonical: `${SITE_ORIGIN}/blog/archive/`,
		ogImage: `${SITE_ORIGIN}/images/og/blog.png`,
		jsonLd: [collectionLd, orgJsonLd()],
	})}
<body>
${body}
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// /blog/<slug>
// ---------------------------------------------------------------------------
function renderPost(post, bodyHtml, allPosts, { subscribeUrl, publicationUrl }) {
	const canonical = `${SITE_ORIGIN}${post.url}`;
	const og = ogImageFor(post);
	const minutes = readingMinutes(post.searchText, bodyHtml);

	const blogPostingLd = {
		"@context": "https://schema.org",
		"@type": "BlogPosting",
		headline: post.title,
		description: post.seoDescription || post.excerpt,
		url: canonical,
		mainEntityOfPage: canonical,
		datePublished: post.publishedAt || undefined,
		dateModified: post.updatedAt || post.publishedAt || undefined,
		author: { "@id": `${SITE_ORIGIN}/#person-cmyers` },
		publisher: { "@id": `${SITE_ORIGIN}/#org` },
		image: absUrl(post.heroImage ? post.heroImage.assetUrl : DEFAULT_OG_IMAGE),
		isPartOf: { "@type": "Blog", name: BLOG_NAME, url: `${SITE_ORIGIN}/blog/` },
	};
	const breadcrumbLdObj = breadcrumbLd([
		["Home", `${SITE_ORIGIN}/`],
		["Writing", `${SITE_ORIGIN}/blog/`],
		[post.title, canonical],
	]);

	// Read-next: the two most recent other posts.
	const readNext = allPosts.filter((p) => p.slug !== post.slug).slice(0, 2);

	// Derive the chaptered structure + TOC from the flat body (never hardcoded).
	const structured = structureArticle(bodyHtml);
	const tocHtml = renderToc(structured.chapters);
	const hasToc = !!tocHtml;
	const proseInner = bodyHtml
		? renderArticleBody(structured)
		: `<p>This essay is being mirrored from beehiiv. <a href="${attr(post.webUrl || "/blog/")}">Read it here</a>.</p>`;

	// Lead figure — framed, caption optional (caption left, source/credit right).
	// Images stay natural (Main & Machine doesn't grayscale its art).
	const hero = post.heroImage;
	const heroCap = hero && (hero.caption || hero.credit)
		? `<figcaption class="essay__cap">${hero.caption ? `<span class="essay__cap-txt">${esc(hero.caption)}</span>` : "<span></span>"}${hero.credit ? `<span class="essay__cap-src">${esc(hero.credit)}</span>` : ""}</figcaption>`
		: "";
	const heroDims = hero && hero.width && hero.height ? ` width="${hero.width}" height="${hero.height}"` : "";
	const heroBlock = hero
		? `<figure class="essay__hero"><img src="${attr(hero.assetUrl)}"${heroDims} decoding="async" alt="${attr(hero.alt || `${post.title} — illustrated diagram from ${BLOG_NAME}`)}" />${heroCap}</figure>`
		: "";

	const shareUrl = encodeURIComponent(canonical);
	const shareText = encodeURIComponent(post.title);
	const topic = post.topic || (Array.isArray(post.contentTags) && post.contentTags[0]) || "";
	const metaRow = [esc(AUTHOR), esc(formatDate(post.publishedAt)), `${minutes} min read`, topic ? esc(topic) : ""]
		.filter(Boolean)
		.map((part) => `<span>${part}</span>`)
		.join("");

	const body = `<div class="reading-progress" aria-hidden="true"><span class="reading-progress__bar" id="reading-progress-bar"></span></div>
${topbar()}
${nav()}
<article class="section paper" data-screen-label="${esc(BLOG_NAME)}">
  <div class="wrap essay${hasToc ? "" : " essay--solo"}">
    <a class="essay__back" href="/blog/">← ${esc(BLOG_NAME)}</a>
    <header class="essay__head">
      <span class="kicker">${esc(BLOG_NAME)} · ${esc(formatDate(post.publishedAt))}</span>
      <h1 class="essay__title">${esc(post.title)}</h1>
      ${post.excerpt ? `<p class="essay__dek">${esc(post.excerpt)}</p>` : ""}
      <div class="essay__meta">${metaRow}</div>
    </header>
    ${heroBlock}
    <div class="essay__grid${hasToc ? "" : " essay__grid--solo"}">
      ${hasToc ? tocHtml : ""}
      <div class="essay__col">
        <div class="prose">
${proseInner}
        </div>
        <div class="essay__share">
          <span class="tick-lbl">Share</span>
          <a href="https://twitter.com/intent/tweet?url=${shareUrl}&text=${shareText}" target="_blank" rel="noopener noreferrer" aria-label="Share on X">X</a>
          <a href="https://www.linkedin.com/sharing/share-offsite/?url=${shareUrl}" target="_blank" rel="noopener noreferrer" aria-label="Share on LinkedIn">LinkedIn</a>
          <a href="mailto:?subject=${shareText}&body=${shareUrl}" aria-label="Share by email">Email</a>
          <button type="button" class="essay__copy" data-copy="${attr(canonical)}">Copy link</button>
        </div>
      </div>
    </div>
  </div>
</article>

${readNext.length
	? `<section class="section paper-2" data-screen-label="Keep reading">
  <div class="wrap">
    <div class="essay__next">
      <div class="feed__bar"><span class="tick-lbl">Keep reading</span><a class="tick-lbl" href="/blog/archive/" style="color:var(--accent)">Archive →</a></div>
      <div class="feed__grid">${readNext.map(card).join("\n")}</div>
    </div>
  </div>
</section>`
	: ""}

<section class="section paper" data-screen-label="Work with us">
  <div class="wrap">
    <div class="essay__cta essay__cta--panel crop">
      <span class="kicker kicker--plain">Main &amp; Machine</span>
      <h2 class="h2 mt-s">Like how we think? Put it to work.</h2>
      <p class="lead">This is the kind of workflow the free assessment maps. Thirty minutes, no pitch.</p>
      <div class="essay__cta-actions">
        <a class="btn btn--accent btn--lg" href="/book/">Book a free assessment →</a>
      </div>
    </div>
  </div>
</section>

${subscribeBand(subscribeUrl, publicationUrl)}
${footer()}
${pageScripts()}`;

	return `${head({
		title: `${post.seoTitle || post.title} — ${BLOG_NAME} | ${BRAND}`,
		description: post.seoDescription || post.excerpt,
		canonical,
		ogImage: og,
		ogType: "article",
		jsonLd: [blogPostingLd, breadcrumbLdObj, orgJsonLd()],
	})}
<body>
${body}
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// RSS + sitemap
// ---------------------------------------------------------------------------
function renderRss(posts, meta) {
	const items = posts
		.map((p) => {
			const link = `${SITE_ORIGIN}${p.url}`;
			const pub = p.publishedAt ? new Date(p.publishedAt).toUTCString() : "";
			return `    <item>
      <title>${cdata(p.title)}</title>
      <link>${esc(link)}</link>
      <guid isPermaLink="true">${esc(link)}</guid>
      ${pub ? `<pubDate>${pub}</pubDate>` : ""}
      <description>${cdata(p.excerpt || "")}</description>
    </item>`;
		})
		.join("\n");

	return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${cdata(BLOG_NAME)}</title>
    <link>${SITE_ORIGIN}/blog/</link>
    <atom:link href="${SITE_ORIGIN}/blog/rss.xml" rel="self" type="application/rss+xml" />
    <description>${cdata(meta.description || BLOG_DESCRIPTION)}</description>
    <language>en-us</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${items}
  </channel>
</rss>
`;
}

// changefreq + priority per route. Home and /book/ (the conversion page)
// are highest; legal pages lowest. Posts sit in the middle.
function seoMeta(route, isPost) {
	if (route === "/") return { changefreq: "weekly", priority: "1.0" };
	if (route === "/book/") return { changefreq: "monthly", priority: "1.0" };
	if (route === "/blog/") return { changefreq: "weekly", priority: "0.8" };
	if (route === "/blog/archive/") return { changefreq: "monthly", priority: "0.5" };
	if (route === "/privacy/" || route === "/terms/") return { changefreq: "yearly", priority: "0.3" };
	if (isPost) return { changefreq: "monthly", priority: "0.7" };
	return { changefreq: "monthly", priority: "0.5" };
}

// Real last-modified dates for static routes, generated from git history by
// `npm run seo:dates` (committed). Read here so sitemap <lastmod> is accurate
// without depending on build-time git (Cloudflare uses a shallow clone).
function loadPageDates() {
	try {
		return JSON.parse(fs.readFileSync(path.join(ROOT, "src", "data", "page-dates.json"), "utf8"));
	} catch {
		return {};
	}
}

function renderSitemap(posts) {
	// Only real, published posts reach here (loadPosts/fetch exclude drafts and
	// the beehiiv test post), so the sitemap never lists a non-public URL.
	const pageDates = loadPageDates();
	// /blog and /blog/archive track the newest post's date.
	const newestPost = posts.reduce(
		(acc, p) => (p.updatedAt || p.publishedAt || "") > acc ? (p.updatedAt || p.publishedAt) : acc,
		"",
	) || null;
	const entries = [
		...STATIC_ROUTES.map((route) => ({ route, isPost: false, lastmod: pageDates[route] || null })),
		{ route: "/blog/", isPost: false, lastmod: newestPost },
		{ route: "/blog/archive/", isPost: false, lastmod: newestPost },
		...posts.map((p) => ({ route: p.url, isPost: true, lastmod: p.updatedAt || p.publishedAt || null })),
	];
	const body = entries
		.map(({ route, isPost, lastmod }) => {
			const { changefreq, priority } = seoMeta(route, isPost);
			const lm = lastmod ? `\n    <lastmod>${lastmod.slice(0, 10)}</lastmod>` : "";
			return `  <url>
    <loc>${SITE_ORIGIN}${route === "/" ? "/" : route}</loc>${lm}
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
		})
		.join("\n");
	return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>
`;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function breadcrumbLd(pairs) {
	return {
		"@context": "https://schema.org",
		"@type": "BreadcrumbList",
		itemListElement: pairs.map(([name, url], i) => ({
			"@type": "ListItem",
			position: i + 1,
			name,
			item: url,
		})),
	};
}

function readingMinutes(searchText, bodyHtml) {
	const text = bodyHtml ? bodyHtml.replace(/<[^>]+>/g, " ") : searchText || "";
	const words = (text.match(/\S+/g) || []).length;
	return Math.max(1, Math.round(words / 200));
}

function cdata(s) {
	return `<![CDATA[${String(s == null ? "" : s).replace(/\]\]>/g, "]]]]><![CDATA[>")}]]>`;
}

function writeFile(file, contents) {
	fs.mkdirSync(path.dirname(file), { recursive: true });
	fs.writeFileSync(file, contents);
}

function pruneStalePostDirs(validSlugs) {
	if (!fs.existsSync(BLOG_DIR)) return;
	for (const entry of fs.readdirSync(BLOG_DIR, { withFileTypes: true })) {
		if (!entry.isDirectory()) continue;
		if (entry.name === "archive") continue;
		if (validSlugs.has(entry.name)) continue;
		fs.rmSync(path.join(BLOG_DIR, entry.name), { recursive: true, force: true });
	}
}

main().catch((err) => {
	console.error(`[blog:build] FAILED: ${err && err.message ? err.message : err}`);
	process.exit(1);
});
