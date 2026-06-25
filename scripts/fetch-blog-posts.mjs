#!/usr/bin/env node
// Build-time Beehiiv fetcher for "The Ampersand".
//
// Pulls confirmed posts from the Beehiiv v2 API, extracts + sanitizes the
// RSS article HTML, and writes ONE source of truth for the rest of the build:
//
//   src/data/blog-posts.js   — light INDEX (no bodyHtml; searchText trimmed)
//   blog-data/index.json     — same index, as JSON, for the client search/teaser
//   blog-data/<slug>.json    — per-post body (bodyHtml + full searchText)
//
// Contract:
//   - No key set (fresh clone / local dev)  -> write an empty blog, exit 0.
//   - Key set but the fetch/config fails     -> exit non-zero (fail the deploy
//     rather than ship stale or empty content).
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";
import sanitizeHtml from "sanitize-html";
import imageSize from "image-size";
import {
	SITE_HOST,
	SITE_ORIGIN,
	BLOG_NAME,
	BLOG_DESCRIPTION,
	BEEHIIV_API_KEY,
	BEEHIIV_PUBLICATION_ID,
	BEEHIIV_SUBSCRIBE_URL,
	DATA_MODULE_PATH,
	BLOG_DATA_DIR,
	BLOG_INDEX_JSON,
	BLOG_IMAGES_DIR,
	BLOG_IMAGES_PUBLIC,
	POST_DATE_OVERRIDES,
} from "./lib/config.mjs";

const API_BASE = "https://api.beehiiv.com/v2";
const INDEX_SEARCH_CAP = 300; // searchText length in the bundled index
const BODY_SEARCH_CAP = 2000; // searchText length in per-post body files

// ---------------------------------------------------------------------------
// Entry
// ---------------------------------------------------------------------------
export async function run() {
	if (!BEEHIIV_API_KEY) {
		console.warn(
			"[blog:fetch] BEEHIIV_API_KEY not set — writing an empty blog (graceful fallback).",
		);
		writeEmpty();
		return;
	}
	if (!BEEHIIV_PUBLICATION_ID) {
		// Key present but no publication id == misconfiguration. Fail loudly.
		throw new Error(
			"BEEHIIV_API_KEY is set but BEEHIIV_PUBLICATION_ID is missing. Set both, or unset the key for an empty build.",
		);
	}

	const raw = await fetchAllPosts();
	const posts = raw
		.map(normalizePost)
		.filter((p) => p && p.slug && !p.hiddenFromFeed)
		.sort((a, b) => (b.publishedAt || "").localeCompare(a.publishedAt || ""));

	// Self-host every image (hero + inline) so nothing hotlinks beehiiv's S3.
	await localizeImages(posts);

	const publicationUrl = derivePublicationUrl(posts);
	const subscribeUrl = deriveSubscribeUrl(publicationUrl);

	writeOutputs(posts, { publicationUrl, subscribeUrl });
	console.log(
		`[blog:fetch] Wrote ${posts.length} post(s). publicationUrl=${publicationUrl || "(none)"}`,
	);
}

// ---------------------------------------------------------------------------
// Beehiiv API
// ---------------------------------------------------------------------------
async function fetchAllPosts() {
	const all = [];
	let page = 1;
	let totalPages = 1;
	do {
		const url = new URL(
			`${API_BASE}/publications/${BEEHIIV_PUBLICATION_ID}/posts`,
		);
		url.searchParams.set("status", "confirmed");
		url.searchParams.set("limit", "100");
		url.searchParams.set("page", String(page));
		url.searchParams.set("order_by", "publish_date");
		url.searchParams.set("direction", "desc");
		// RSS content = clean article HTML (web content is a hydrated shell,
		// email content is table markup). stats = views/opens for "Top".
		url.searchParams.append("expand[]", "free_rss_content");
		url.searchParams.append("expand[]", "stats");

		const res = await fetch(url, {
			headers: {
				Authorization: `Bearer ${BEEHIIV_API_KEY}`,
				Accept: "application/json",
			},
		});
		if (!res.ok) {
			const body = await res.text().catch(() => "");
			throw new Error(
				`Beehiiv API ${res.status} ${res.statusText} on page ${page}: ${body.slice(0, 300)}`,
			);
		}
		const json = await res.json();
		if (Array.isArray(json.data)) all.push(...json.data);
		totalPages = Number(json?.total_pages) || 1;
		page += 1;
	} while (page <= totalPages);
	return all;
}

// ---------------------------------------------------------------------------
// Image self-hosting — download hero + inline images to /images/blog/<slug>/
// so nothing on a post hotlinks beehiiv's S3. Rewrites <img src>, the
// heroImage.assetUrl (also the og/JSON-LD image), and stamps width/height for
// zero layout shift. Failures degrade gracefully: the original URL is kept and
// the build continues (a hard fail over one dead asset is worse than a deploy).
const CT_EXT = {
	"image/jpeg": "jpg", "image/jpg": "jpg", "image/png": "png",
	"image/webp": "webp", "image/gif": "gif", "image/avif": "avif", "image/svg+xml": "svg",
};

function isRemote(url) {
	return typeof url === "string" && /^https?:\/\//i.test(url);
}

async function localizeImages(posts) {
	if (!posts.length) return;
	fs.mkdirSync(BLOG_IMAGES_DIR, { recursive: true });
	const cache = new Map(); // remote URL -> { src, width, height }
	const keepSlugs = new Set();
	let downloaded = 0;

	for (const post of posts) {
		keepSlugs.add(post.slug);
		if (post.heroImage && isRemote(post.heroImage.assetUrl)) {
			const local = await fetchImage(post.heroImage.assetUrl, post.slug, cache);
			if (local) {
				post.heroImage.assetUrl = local.src;
				post.heroImage.width = local.width;
				post.heroImage.height = local.height;
				downloaded++;
			}
		}
		// socialImage is the SAME object reference as heroImage (set in
		// normalizePost), so the rewrite above already covers it.
		const before = post.bodyHtml;
		post.bodyHtml = await rewriteBodyImages(post.bodyHtml, post.slug, post.title, cache);
		if (post.bodyHtml !== before) downloaded++;
	}
	pruneImageDirs(keepSlugs);
	console.log(`[blog:fetch] Self-hosted images for ${keepSlugs.size} post(s) (${cache.size} unique asset(s)).`);
}

async function fetchImage(remoteUrl, slug, cache) {
	if (cache.has(remoteUrl)) return cache.get(remoteUrl);
	try {
		const res = await fetch(remoteUrl, { headers: { Accept: "image/*" } });
		if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
		const buf = Buffer.from(await res.arrayBuffer());
		const ct = (res.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
		const urlExt = (remoteUrl.split("?")[0].match(/\.([a-z0-9]+)$/i) || [])[1];
		const ext = CT_EXT[ct] || (urlExt ? urlExt.toLowerCase() : "jpg");
		const hash = createHash("sha1").update(buf).digest("hex").slice(0, 12);
		const file = `${hash}.${ext}`;
		const dir = path.join(BLOG_IMAGES_DIR, slug);
		fs.mkdirSync(dir, { recursive: true });
		fs.writeFileSync(path.join(dir, file), buf);
		let width = null, height = null;
		try {
			const dim = imageSize(buf);
			if (dim && dim.width) { width = dim.width; height = dim.height; }
		} catch { /* dimensions optional (e.g. svg) */ }
		const out = { src: `${BLOG_IMAGES_PUBLIC}/${slug}/${file}`, width, height };
		cache.set(remoteUrl, out);
		return out;
	} catch (err) {
		console.warn(`[blog:fetch] image download failed (${slug}): ${remoteUrl.slice(0, 90)} — ${err.message}. Keeping remote URL.`);
		cache.set(remoteUrl, null);
		return null;
	}
}

// Rewrite every <img> in a body: localize the src and stamp width/height +
// a descriptive alt fallback. Sequential awaits keep it simple and the dedupe
// cache means a repeated asset downloads once.
async function rewriteBodyImages(html, slug, title, cache) {
	if (!html || !/<img\b/i.test(html)) return html;
	const tags = html.match(/<img\b[^>]*>/gi) || [];
	let out = html;
	for (const tag of tags) {
		const srcMatch = tag.match(/\ssrc="([^"]*)"/i);
		const src = srcMatch ? srcMatch[1] : "";
		if (!isRemote(src)) continue;
		const local = await fetchImage(src, slug, cache);
		if (!local) continue;
		let next = tag.replace(/\ssrc="[^"]*"/i, ` src="${local.src}"`);
		if (local.width && !/\swidth=/i.test(next)) {
			next = next.replace(/<img\b/i, `<img width="${local.width}" height="${local.height}"`);
		}
		// Descriptive alt fallback when beehiiv left it empty.
		if (!/\salt="[^"]*[^"\s][^"]*"/i.test(next)) {
			const safeTitle = String(title || "").replace(/"/g, "&quot;");
			next = /\salt="/i.test(next)
				? next.replace(/\salt="[^"]*"/i, ` alt="${safeTitle} — illustration"`)
				: next.replace(/<img\b/i, `<img alt="${safeTitle} — illustration"`);
		}
		out = out.replace(tag, next);
	}
	return out;
}

// Drop image folders for posts that no longer exist (renames / removals).
function pruneImageDirs(keepSlugs) {
	if (!fs.existsSync(BLOG_IMAGES_DIR)) return;
	for (const entry of fs.readdirSync(BLOG_IMAGES_DIR, { withFileTypes: true })) {
		if (entry.isDirectory() && !keepSlugs.has(entry.name)) {
			fs.rmSync(path.join(BLOG_IMAGES_DIR, entry.name), { recursive: true, force: true });
		}
	}
}

// ---------------------------------------------------------------------------
// Normalization -> post contract
// ---------------------------------------------------------------------------
function normalizePost(p) {
	if (!p) return null;
	const slug = (p.slug || "").trim();
	const title = (p.title || "").trim();
	if (!title) return null;

	const rssHtml = findRssContent(p);
	const bodyHtml = sanitizeArticle(extractArticle(rssHtml));
	const plain = htmlToText(bodyHtml);

	const subtitle = (p.subtitle || "").trim();
	const previewText = (p.preview_text || "").trim();
	const excerpt = subtitle || previewText || clip(plain, 220);

	let publishedAt = unixToIso(p.publish_date || p.displayed_date);
	let updatedAt = unixToIso(p.displayed_date || p.publish_date);
	// Editorial date override (config) wins over beehiiv's publish_date — drives
	// display, sort order, sitemap/RSS/JSON-LD. Noon UTC keeps the day stable.
	const dateOverride = POST_DATE_OVERRIDES[slug];
	if (dateOverride) {
		publishedAt = `${dateOverride}T12:00:00.000Z`;
		updatedAt = publishedAt;
	}

	const heroUrl = usableThumb(p.thumbnail_url);
	const heroImage = heroUrl ? { assetUrl: heroUrl, alt: title } : null;
	// Beehiiv has no distinct social asset; reuse the cover (SEO falls back
	// to the default OG image when both are null).
	const socialImage = heroImage;

	const stats = p.stats || {};
	const popularity =
		(Number(stats?.web?.views) || 0) +
		(Number(stats?.email?.unique_opens) || 0);

	return {
		slug,
		title,
		excerpt,
		publishedAt,
		updatedAt,
		seoTitle: (p.meta_default_title || title).trim(),
		seoDescription: (p.meta_default_description || excerpt).trim(),
		heroImage,
		socialImage,
		bodyHtml,
		searchText: plain.toLowerCase().slice(0, BODY_SEARCH_CAP),
		popularity,
		url: `/blog/${slug}/`,
		webUrl: p.web_url || "",
		hiddenFromFeed: p.hidden_from_feed === true,
	};
}

// Beehiiv nests RSS content differently across responses; check the spots.
function findRssContent(p) {
	const c = p.content || {};
	return (
		c?.free?.rss ||
		c?.free?.rss_content ||
		p?.free_rss_content ||
		p?.rss_content ||
		(typeof c === "string" ? c : "") ||
		""
	);
}

// The RSS HTML is wrapped:
//   <div class="beehiiv"><style>…</style>
//     <div class="beehiiv__body">…ARTICLE…</div>
//     <div class="beehiiv__footer">Powered by beehiiv…</div>
//   </div>
// Slice on the known sibling boundaries (a balanced regex is fragile because
// of nested image divs). If markers are absent, return the whole fragment and
// let the sanitizer clean it.
function extractArticle(html) {
	if (!html) return "";
	const bodyOpen = html.match(/<div[^>]*class="[^"]*beehiiv__body[^"]*"[^>]*>/i);
	if (!bodyOpen) return html;
	const start = bodyOpen.index + bodyOpen[0].length;
	const footer = html.slice(start).match(/<div[^>]*class="[^"]*beehiiv__footer[^"]*"[^>]*>/i);
	const end = footer ? start + footer.index : html.length;
	return html.slice(start, end);
}

// ---------------------------------------------------------------------------
// Sanitization
// ---------------------------------------------------------------------------
const BAD_CLASS =
	/subscribe|recommend|signup|email-capture|poll|cta-|advertisement|sponsor|paywall|share|footer|button/i;
const EMPTY_INLINE = new Set(["span", "strong", "b", "em", "i", "u"]);

// Inline allowlist for the final article.
const ALLOWED_TAGS = [
	"p", "h2", "h3", "h4", "blockquote", "ul", "ol", "li", "a",
	"strong", "b", "em", "i", "u", "img", "figure", "figcaption",
	"hr", "br", "code", "pre", "span",
];
// Structural wrappers kept ONLY for pass 1 so exclusiveFilter can drop a
// bad-class element together with its children (a discarded div keeps its
// children, which would leak subscribe/CTA copy). Pass 2 strips them.
const STRUCTURAL_TAGS = ["div", "section", "aside", "header", "footer", "table", "tbody", "tr", "td"];

const COMMON_OPTS = {
	allowedAttributes: {
		a: ["href", "target", "rel"],
		img: ["src", "alt", "title", "loading", "decoding"],
		p: ["class"],
	},
	allowedSchemes: ["http", "https", "mailto"],
	transformTags: {
		h1: "h2", // page already renders the title as the h1
		a: (tagName, attribs) => {
			let href = (attribs.href || "").trim();
			// Same-site absolute/protocol-relative -> root-relative so the
			// app intercepts the click instead of a full navigation.
			href = href.replace(
				new RegExp(`^(https?:)?//(www\\.)?${SITE_HOST.replace(/^www\./, "").replace(/\./g, "\\.")}`, "i"),
				"",
			);
			if (href === "") href = "/";
			const external = /^https?:\/\//i.test(href);
			const out = { tagName: "a", attribs: { href } };
			if (external) {
				out.attribs.target = "_blank";
				out.attribs.rel = "noopener noreferrer";
			}
			return out;
		},
		img: (tagName, attribs) => ({
			tagName: "img",
			attribs: { ...attribs, loading: "lazy", decoding: "async" },
		}),
	},
	exclusiveFilter: (frame) => {
		const cls = (frame.attribs && frame.attribs.class) || "";
		if (BAD_CLASS.test(cls)) return true; // drop widget/CTA subtrees whole
		// Drop empty inline wrappers (no text, no media).
		if (
			EMPTY_INLINE.has(frame.tag) &&
			!frame.text.trim() &&
			!(frame.mediaChildren && frame.mediaChildren.length)
		) {
			return true;
		}
		return false;
	},
};

function sanitizeArticle(html) {
	if (!html) return "";
	// Pass 1: keep structural tags so bad-class subtrees are removed entirely.
	const pass1 = sanitizeHtml(html, {
		...COMMON_OPTS,
		allowedTags: [...ALLOWED_TAGS, ...STRUCTURAL_TAGS],
	});
	// Pass 2: strict allowlist — structural wrappers are discarded (children
	// kept), leaving clean article markup.
	const pass2 = sanitizeHtml(pass1, {
		...COMMON_OPTS,
		allowedTags: ALLOWED_TAGS,
	});
	return dropcapFirstParagraph(pass2.trim());
}

// Tag the first <p> with class "blog-dropcap" (the prose CSS styles ::first-letter).
function dropcapFirstParagraph(html) {
	let done = false;
	return html.replace(/<p\b([^>]*)>/i, (m, attrs) => {
		if (done) return m;
		done = true;
		const cls = attrs.match(/\bclass="([^"]*)"/i);
		if (cls) {
			return m.replace(cls[0], `class="${cls[1]} blog-dropcap"`);
		}
		return `<p${attrs} class="blog-dropcap">`;
	});
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function unixToIso(v) {
	if (v == null || v === "") return null;
	let n = Number(v);
	if (!Number.isFinite(n)) {
		const d = new Date(v);
		return Number.isNaN(d.getTime()) ? null : d.toISOString();
	}
	if (n < 1e12) n *= 1000; // unix seconds -> ms
	const d = new Date(n);
	return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

// Beehiiv assigns a generic gray placeholder when no cover is set.
function usableThumb(url) {
	if (!url || typeof url !== "string") return null;
	if (/\/static_assets\/defaults\//.test(url)) return null;
	return url;
}

function htmlToText(html) {
	return (html || "")
		.replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
		.replace(/<[^>]+>/g, " ")
		.replace(/&nbsp;/gi, " ")
		.replace(/&amp;/gi, "&")
		.replace(/&lt;/gi, "<")
		.replace(/&gt;/gi, ">")
		.replace(/&#39;|&apos;/gi, "'")
		.replace(/&quot;/gi, '"')
		.replace(/\s+/g, " ")
		.trim();
}

function clip(s, n) {
	if (!s) return "";
	if (s.length <= n) return s;
	const cut = s.slice(0, n);
	const sp = cut.lastIndexOf(" ");
	return (sp > 60 ? cut.slice(0, sp) : cut).trim() + "…";
}

function derivePublicationUrl(posts) {
	for (const p of posts) {
		if (p.webUrl) {
			try {
				return `https://${new URL(p.webUrl).host}`;
			} catch {
				/* ignore */
			}
		}
	}
	return "";
}

function deriveSubscribeUrl(publicationUrl) {
	if (BEEHIIV_SUBSCRIBE_URL) return BEEHIIV_SUBSCRIBE_URL;
	return publicationUrl ? `${publicationUrl}/subscribe` : "";
}

// ---------------------------------------------------------------------------
// Output
// ---------------------------------------------------------------------------
function toIndexEntry(p) {
	// Everything except bodyHtml; searchText trimmed for the bundle.
	const { bodyHtml, hiddenFromFeed, ...rest } = p;
	return { ...rest, searchText: (p.searchText || "").slice(0, INDEX_SEARCH_CAP) };
}

function writeOutputs(posts, { publicationUrl, subscribeUrl }) {
	const index = posts.map(toIndexEntry);
	const meta = {
		name: BLOG_NAME,
		description: BLOG_DESCRIPTION,
		count: posts.length,
		generatedAt: new Date().toISOString(),
		origin: SITE_ORIGIN,
		publicationUrl,
		subscribeUrl,
	};

	fs.mkdirSync(path.dirname(DATA_MODULE_PATH), { recursive: true });
	fs.mkdirSync(BLOG_DATA_DIR, { recursive: true });

	// (a) bundled ESM index — the single source of truth for the build.
	const module = `// AUTO-GENERATED by scripts/fetch-blog-posts.mjs — do not edit.\n// Light index (no post bodies). Bodies live in /blog-data/<slug>.json.\nexport const meta = ${JSON.stringify(meta, null, 2)};\nexport const posts = ${JSON.stringify(index, null, 2)};\n`;
	fs.writeFileSync(DATA_MODULE_PATH, module);

	// (b) same index as JSON for the client (search box + homepage teaser).
	fs.writeFileSync(BLOG_INDEX_JSON, JSON.stringify({ meta, posts: index }));

	// (c) per-post body files.
	const keep = new Set(["index.json"]);
	for (const p of posts) {
		const file = `${p.slug}.json`;
		keep.add(file);
		fs.writeFileSync(
			path.join(BLOG_DATA_DIR, file),
			JSON.stringify({
				slug: p.slug,
				title: p.title,
				bodyHtml: p.bodyHtml,
				searchText: p.searchText,
			}),
		);
	}
	// Prune stale body files from removed/renamed posts.
	for (const f of fs.readdirSync(BLOG_DATA_DIR)) {
		if (f.endsWith(".json") && !keep.has(f)) {
			fs.rmSync(path.join(BLOG_DATA_DIR, f));
		}
	}
}

function writeEmpty() {
	writeOutputs([], {
		publicationUrl: "",
		subscribeUrl: BEEHIIV_SUBSCRIBE_URL || "",
	});
}

export { normalizePost, extractArticle, sanitizeArticle, localizeImages };

// Run only when invoked directly (not when imported by a test).
if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
	run().catch((err) => {
		console.error(`[blog:fetch] FAILED: ${err && err.message ? err.message : err}`);
		process.exit(1);
	});
}
