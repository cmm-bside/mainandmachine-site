#!/usr/bin/env node
// Offline build reader for The Ampersand. Soro synchronization is a separate
// scheduled operation that commits full articles and images before deployment.
import fs from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";
import sanitizeHtml from "sanitize-html";
import imageSize from "image-size";
import { applyPostEditorialOverrides } from "./lib/post-seo.mjs";
import { optimizeBlogImage } from "./lib/blog-images.mjs";
import {
	ROOT,
	LOCAL_SCRATCH_DIRS,
	SITE_HOST,
	SITE_ORIGIN,
	BLOG_NAME,
	BLOG_DESCRIPTION,
	SORO_RSS_URL,
	DATA_MODULE_PATH,
	BLOG_DATA_DIR,
	BLOG_INDEX_JSON,
	BLOG_IMAGES_DIR,
	BLOG_IMAGES_PUBLIC,
	POST_DATE_OVERRIDES,
} from "./lib/config.mjs";

const INDEX_SEARCH_CAP = 300; // searchText length in the bundled index
const BODY_SEARCH_CAP = 2000; // searchText length in per-post body files

// ---------------------------------------------------------------------------
// Entry
// ---------------------------------------------------------------------------
export async function run() {
	const { readArchive } = await import("./lib/blog-archive.mjs");
	const posts = readArchive();
	for (const post of posts) applyPostEditorialOverrides(post);
	assertPublicationIdentity(posts);
	writeOutputs(posts, { publicationUrl: `${SITE_ORIGIN}/blog/`, subscribeUrl: "" });
	console.log(`[blog:fetch] Built ${posts.length} posts from the permanent local archive.`);
}

// ---------------------------------------------------------------------------
// Publication identity
// ---------------------------------------------------------------------------
// "Did the API return posts?" is not the same question as "did it return OUR
// posts?". On 2026-08-01 this fetch pulled a two-post publication — one of them
// slugged "test" — while the committed pages linked 15 essays by name. Every
// essay link on the site would have 404'd, and the build would have been green
// the whole way down, because a non-empty result looks like success.
//
// The committed HTML is the assertion: those slugs were written by hand against
// a real archive, so at least one of them MUST come back. Zero overlap means we
// are pointed somewhere else. We check before writing anything, so a wrong
// publication never reaches blog:build or the blog-data/ on disk.
const HREF_BLOG_RE = /(?:href|action)="(?:https:\/\/[^"/]+)?\/blog\/([a-z0-9-]+)\/"/g;
const NON_PRODUCTION_SLUGS = new Set(["test", "testing", "draft", "untitled", "hello-world"]);
// /blog/archive/ matches the slug shape but is a route blog:build always emits,
// not a post. Counting it would inflate the expected set and let a publication
// that happened to contain "archive" satisfy the overlap test.
const BLOG_NON_POST_SEGMENTS = new Set(["archive", "rss.xml"]);

function committedPostSlugs() {
	const skip = new Set([...LOCAL_SCRATCH_DIRS, "blog", "blog-data", "node_modules", "emails"]);
	const found = new Set();
	(function walk(dir, top = true) {
		for (const name of fs.readdirSync(dir)) {
			if (top && skip.has(name)) continue;
			if (name.startsWith(".")) continue;
			const fp = path.join(dir, name);
			if (fs.statSync(fp).isDirectory()) walk(fp, false);
			else if (name.endsWith(".html"))
				for (const [, slug] of fs.readFileSync(fp, "utf8").matchAll(HREF_BLOG_RE))
					if (!BLOG_NON_POST_SEGMENTS.has(slug)) found.add(slug);
		}
	})(ROOT);
	return found;
}

function assertPublicationIdentity(posts) {
	const linked = committedPostSlugs();
	if (!linked.size) return; // no committed essay links to verify against

	const returned = new Set(posts.map((p) => p.slug));
	const overlap = [...linked].filter((slug) => returned.has(slug));
	if (overlap.length) return;

	const junk = [...returned].filter((slug) => NON_PRODUCTION_SLUGS.has(slug));
	console.error(
		`[blog:fetch] ABORTED — wrong publication.\n` +
			`  The archive returned ${posts.length} post(s), and NOT ONE of them is a slug this\n` +
			`  site links to. Committed pages reference ${linked.size} essay(s) by name; the overlap is zero.\n` +
			(junk.length
				? `  The result contains ${junk.map((j) => `"${j}"`).join(", ")} — a placeholder post, which is a\n` +
					`  strong sign this is a new or scratch publication rather than The Ampersand.\n`
				: "") +
			`  Returned: ${[...returned].slice(0, 8).join(", ") || "(none)"}\n` +
			`  Expected at least one of: ${[...linked].sort().slice(0, 8).join(", ")}\n` +
			`\n` +
			`  Restore the correct permanent article archive. Nothing was written.`,
	);
	process.exit(1);
}

// ---------------------------------------------------------------------------
// Soro RSS
// ---------------------------------------------------------------------------
// Soro controls this compact RSS 2.0 shape, so a dependency-free reader is
// easier to audit than a general XML parser. Copy is decoded and then passed
// through the exact sanitizer used by the existing blog; no voice transform
// or description synthesis runs for Soro posts.
function decodeXmlEntities(text) {
	return String(text || "")
		.replace(/&#x([0-9a-f]+);/gi, (match, hex) => {
			const codePoint = Number.parseInt(hex, 16);
			return Number.isInteger(codePoint) && codePoint <= 0x10ffff
				? String.fromCodePoint(codePoint)
				: match;
		})
		.replace(/&#(\d+);/g, (match, decimal) => {
			const codePoint = Number(decimal);
			return Number.isInteger(codePoint) && codePoint <= 0x10ffff
				? String.fromCodePoint(codePoint)
				: match;
		})
		.replace(/&lt;/gi, "<")
		.replace(/&gt;/gi, ">")
		.replace(/&quot;/gi, '"')
		.replace(/&apos;/gi, "'")
		.replace(/&amp;/gi, "&");
}

function rssTag(item, tag) {
	const match = String(item || "").match(
		new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i"),
	);
	if (!match) return "";
	const inner = match[1].trim();
	const cdata = inner.match(/^<!\[CDATA\[([\s\S]*?)\]\]>$/i);
	return decodeXmlEntities(cdata ? cdata[1] : inner).trim();
}

async function fetchSoroItems(feedUrl = SORO_RSS_URL, fetchImpl = fetch) {
	if (!feedUrl) {
		throw new Error("Soro RSS feed URL is missing.");
	}

	const url = new URL(feedUrl);
	// The feed is CDN-backed and can lag a publish by an hour. A unique query
	// parameter forces every production build through to origin.
	url.searchParams.set("cb", String(Date.now()));
	const response = await fetchImpl(url, {
		headers: { Accept: "application/rss+xml, application/xml, text/xml", "User-Agent": "Mozilla/5.0 MainAndMachine" },
		cache: "no-store",
		signal: AbortSignal.timeout(30000),
	});
	const body = await response.text().catch(() => "");

	// When the Soro widget is inactive the endpoint returns HTTP 200 with a
	// plain-text notice. Treat either condition as fatal so a build can never
	// succeed after silently dropping every Soro post.
	if (!response.ok || !/<rss[\s>]/i.test(body)) {
		const notice = body.replace(/\s+/g, " ").trim().slice(0, 160);
		throw new Error(
			`Soro RSS fetch failed (${response.status} ${response.statusText || "unknown status"})${notice ? `: ${notice}` : ""}`,
		);
	}

	return [...body.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi)].map(
		(match) => match[1],
	);
}

function soroSlug(link, guid) {
	let slug = "";
	try {
		const pathname = new URL(link).pathname.replace(/\/+$/, "");
		slug = pathname.split("/").pop() || "";
		try {
			slug = decodeURIComponent(slug);
		} catch {
			// Keep the encoded last segment; it is still the vendor's exact slug.
		}
	} catch {
		// Soro's guid is the documented fallback when link is not a URL.
	}
	if (!slug) slug = String(guid || "").trim();

	// A slug becomes a directory name during prerender. Reject path separators,
	// traversal, control characters, and other unsafe guid fallbacks rather
	// than writing outside /blog/ or silently changing the vendor's identifier.
	if (!slug || slug === "." || slug === ".." || /[\\/\0-\x1f\x7f]/.test(slug)) {
		return "";
	}
	return slug;
}

function mapSoroPost(item) {
	const title = rssTag(item, "title");
	const link = rssTag(item, "link");
	const guid = rssTag(item, "guid");
	const description = rssTag(item, "description");
	const content = rssTag(item, "content:encoded");
	const pubDate = rssTag(item, "pubDate");
	const media = String(item || "").match(
		/<media:content\b[^>]*\burl=["']([^"']+)["']/i,
	);
	const cover = media ? decodeXmlEntities(media[1]).trim() : "";
	const slug = soroSlug(link, guid);
	const bodyHtml = sanitizeArticle(content);
	const plain = htmlToText(bodyHtml);
	const publishedAt = unixToIso(pubDate);

	const label = title || slug || guid || "untitled item";
	if (!title) throw new Error(`Soro RSS item "${label}" has no title.`);
	if (!slug) throw new Error(`Soro RSS item "${label}" has no safe slug or guid.`);
	if (!plain.trim()) throw new Error(`Soro RSS item "${label}" has no usable content:encoded body.`);
	if (!publishedAt) throw new Error(`Soro RSS item "${label}" has an invalid pubDate.`);

	// Soro's description is already the vendor-authored card/meta copy. Keep it
	// verbatim after XML decoding; synthesize only when the tag is empty.
	const excerpt = description || clip(plain, 157);
	const heroImage = cover ? { assetUrl: cover, alt: title } : null;
	return {
		slug,
		title,
		excerpt,
		publishedAt,
		updatedAt: publishedAt,
		seoTitle: title,
		seoDescription: excerpt,
		heroImage,
		socialImage: heroImage,
		bodyHtml,
		searchText: plain.toLowerCase().slice(0, BODY_SEARCH_CAP),
		popularity: 0,
		url: `/blog/${slug}/`,
		webUrl: "",
		hiddenFromFeed: false,
		source: "soro",
		sourceId: guid || link,
	};
}

function dedupePosts(posts) {
	const out = [];
	const seen = new Set();
	for (const post of posts) {
		if (!post?.slug) continue;
		if (seen.has(post.slug)) {
			console.warn(
				`[blog:fetch] Duplicate slug "${post.slug}" from ${post.source || "Beehiiv"}; keeping the first item.`,
			);
			continue;
		}
		seen.add(post.slug);
		out.push(post);
	}
	return out;
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
				post.heroImage.srcset = local.srcset;
				downloaded++;
			}
		}
		if (post.socialImage && isRemote(post.socialImage.assetUrl)) {
			const local = await fetchImage(post.socialImage.assetUrl, post.slug, cache);
			if (local) Object.assign(post.socialImage, { assetUrl: local.src, width: local.width, height: local.height, srcset: local.srcset });
		}
		const before = post.bodyHtml;
		post.bodyHtml = (await rewriteBodyImages(post.bodyHtml, post.slug, post.title, cache)).replaceAll("/blog/the-person-still-signs/", "/blog/human-in-the-loop-ai-systems/");
		if (post.bodyHtml !== before) downloaded++;
	}
	// Permanent archives retain historical images even when the feed changes.
	console.log(`[blog:fetch] Self-hosted images for ${keepSlugs.size} post(s) (${cache.size} unique asset(s)).`);
}

async function fetchImage(remoteUrl, slug, cache) {
	if (cache.has(remoteUrl)) return cache.get(remoteUrl);
	try {
		const res = await fetch(remoteUrl, { headers: { Accept: "image/*", "User-Agent": "Mozilla/5.0 MainAndMachine" }, signal: AbortSignal.timeout(30000) });
		if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
		const buf = Buffer.from(await res.arrayBuffer());
		const ct = (res.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
		const urlExt = (remoteUrl.split("?")[0].match(/\.([a-z0-9]+)$/i) || [])[1];
		const ext = CT_EXT[ct] || (urlExt ? urlExt.toLowerCase() : "jpg");
		const hash = createHash("sha1").update(buf).digest("hex").slice(0, 12);
		const file = `${hash}.${ext}`;
		const dir = path.join(BLOG_IMAGES_DIR, slug);
		fs.mkdirSync(dir, { recursive: true });
		const optimized = await optimizeBlogImage(buf, { dir, publicDir: `${BLOG_IMAGES_PUBLIC}/${slug}`, hash });
		if (optimized) { cache.set(remoteUrl, optimized); return optimized; }
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
		let next = tag.replace(/\ssrc="[^"]*"/i, ` src="${local.src}"`).replace(/\s(?:srcset|sizes)="[^"]*"/gi, "");
		if (local.srcset) next = next.replace(/<img\b/i, `<img srcset="${local.srcset}" sizes="(max-width: 760px) calc(100vw - 40px), 760px"`);
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
	return dropcapFirstParagraph(figurizeImageCaptions(pass2.trim()));
}

// beehiiv emits an image credit as a bare <p> right after the image (usually
// wrapped in a stray <span>), so it reads as the article's FIRST paragraph:
// it took body type and the drop cap, and the essay appeared to open with
// "Photo via Unsplash". Rewrite image + credit into a real figure/figcaption
// pair, which the prose CSS already styles as a small mono caption.
const CAPTION_MAX = 140;
const FIG_RE =
	/(<a\b[^>]*>\s*)?(<img\b[^>]*>)(\s*<\/a>)?(\s*(?:<span\b[^>]*>\s*)?<p\b[^>]*>([\s\S]*?)<\/p>(?:\s*<\/span>)?)?/gi;

function figurizeImageCaptions(html) {
	return html.replace(FIG_RE, (m, aOpen, img, aClose, capBlock, capInner) => {
		// An opening <a> with no closing tag right after the image is a shape
		// we did not expect — leave it exactly as it came.
		if (aOpen && !aClose) return m;
		const media = aOpen ? `${aOpen.trim()}${img}</a>` : img;
		const text = capInner == null ? "" : htmlToText(capInner);
		// Only a SHORT paragraph directly under an image is a credit line. A
		// real opening paragraph stays a paragraph, outside the figure.
		if (!text || text.length > CAPTION_MAX) {
			return `<figure>${media}</figure>${capBlock || ""}`;
		}
		return `<figure>${media}<figcaption>${capInner.trim()}</figcaption></figure>`;
	});
}

// Tag the first <p> with class "blog-dropcap" (the prose CSS styles ::first-letter).
// The alternation swallows whole <figure> blocks first, so a caption can never
// be mistaken for the opening paragraph.
function dropcapFirstParagraph(html) {
	let done = false;
	return html.replace(/<figure\b[\s\S]*?<\/figure>|<p\b([^>]*)>/gi, (m, attrs) => {
		if (done || attrs === undefined) return m;
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
		revision: process.env.CF_PAGES_COMMIT_SHA || execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
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

export {
	normalizePost,
	extractArticle,
	sanitizeArticle,
	localizeImages,
	committedPostSlugs,
	assertPublicationIdentity,
	decodeXmlEntities,
	rssTag,
	fetchSoroItems,
	mapSoroPost,
	dedupePosts,
};

// Run only when invoked directly (not when imported by a test).
if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
	run().catch((err) => {
		console.error(`[blog:fetch] FAILED: ${err && err.message ? err.message : err}`);
		process.exit(1);
	});
}
