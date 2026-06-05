// Cloudflare Pages Function — GET /api/posts
// Fetches The Ampersand's Substack RSS server-side (no CORS), parses it,
// and returns normalized JSON. Cached ~30 min at the edge so we don't hit
// Substack on every request. Degrades to an empty list on any failure.

const FEED_URL = "https://mainandmachine.substack.com/feed";
const CACHE_SECONDS = 1800; // 30 minutes
const MAX_POSTS = 24;

export async function onRequestGet(context) {
	const { request, waitUntil } = context;
	const cache = caches.default;
	const cacheKey = new Request(new URL("/api/posts", request.url).toString(), request);

	const cached = await cache.match(cacheKey);
	if (cached) return cached;

	let payload;
	try {
		const res = await fetch(FEED_URL, {
			headers: {
				"User-Agent": "Mozilla/5.0 (compatible; MainAndMachineBot/1.0; +https://www.mainandmachine.com)",
				Accept: "application/rss+xml, application/xml, text/xml",
			},
			cf: { cacheTtl: CACHE_SECONDS, cacheEverything: true },
		});
		if (!res.ok) throw new Error(`feed status ${res.status}`);
		const xml = await res.text();
		payload = { ok: true, ...parseFeed(xml) };
	} catch (err) {
		payload = { ok: false, error: String(err && err.message || err), publication: "The Ampersand", posts: [] };
	}

	const response = new Response(JSON.stringify(payload), {
		headers: {
			"Content-Type": "application/json; charset=utf-8",
			"Cache-Control": `public, max-age=${CACHE_SECONDS}, s-maxage=${CACHE_SECONDS}`,
		},
	});
	// Only edge-cache successful responses, so a transient error doesn't stick for 30 min.
	if (payload.ok) waitUntil(cache.put(cacheKey, response.clone()));
	return response;
}

function parseFeed(xml) {
	const channelTitle = decode(firstTag(xml, "title")) || "The Ampersand";
	const items = xml.split(/<item\b[^>]*>/i).slice(1).map((chunk) => {
		const item = chunk.split(/<\/item>/i)[0];
		const title = decode(firstTag(item, "title"));
		const link = decode(firstTag(item, "link"));
		const pubDate = decode(firstTag(item, "pubDate"));
		const author = decode(firstTag(item, "dc:creator")) || decode(firstTag(item, "creator"));
		const descriptionHtml = firstTag(item, "description");
		const contentHtml = firstTag(item, "content:encoded") || firstTag(item, "encoded");
		const excerpt = clip(stripTags(decode(descriptionHtml || contentHtml)), 200);
		const image = enclosureUrl(item) || firstImg(decode(contentHtml || descriptionHtml));
		const iso = pubDate ? new Date(pubDate).toISOString() : "";
		return { title, url: link, date: pubDate, iso, author, excerpt, image };
	}).filter((p) => p.title && p.url);

	return { publication: channelTitle, count: items.length, posts: items.slice(0, MAX_POSTS) };
}

// --- tiny XML/HTML helpers (Workers runtime has no DOMParser) ---

function firstTag(xml, tag) {
	const re = new RegExp(`<${escapeTag(tag)}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${escapeTag(tag)}>`, "i");
	const m = xml.match(re);
	return m ? stripCdata(m[1]).trim() : "";
}

function enclosureUrl(item) {
	const m = item.match(/<enclosure\b[^>]*\burl=["']([^"']+)["'][^>]*>/i);
	return m ? decode(m[1]) : "";
}

function firstImg(html) {
	if (!html) return "";
	const m = html.match(/<img\b[^>]*\bsrc=["']([^"']+)["']/i);
	return m ? m[1] : "";
}

function stripCdata(s) {
	return s.replace(/^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/i, "$1");
}

function stripTags(s) {
	return (s || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function clip(s, n) {
	if (!s) return "";
	if (s.length <= n) return s;
	const cut = s.slice(0, n);
	const lastSpace = cut.lastIndexOf(" ");
	return (lastSpace > 40 ? cut.slice(0, lastSpace) : cut).trim() + "…";
}

function escapeTag(tag) {
	return tag.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function decode(s) {
	if (!s) return "";
	return s
		.replace(/&#x([0-9a-f]+);/gi, (_, h) => safeCodePoint(parseInt(h, 16)))
		.replace(/&#(\d+);/g, (_, d) => safeCodePoint(parseInt(d, 10)))
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/&quot;/g, '"')
		.replace(/&apos;/g, "'")
		.replace(/&#39;/g, "'")
		.replace(/&amp;/g, "&");
}

function safeCodePoint(cp) {
	try {
		return String.fromCodePoint(cp);
	} catch {
		return "";
	}
}
