import fs from "node:fs";
import path from "node:path";
import { ROOT, EXCLUDED_POST_SLUGS } from "./config.mjs";

export const ARCHIVE_PATH = path.join(ROOT, "content/blog/posts.json");
export function validateArchive(posts, { checkAssets = true } = {}) {
	if (!Array.isArray(posts) || !posts.length) throw new Error("The permanent article archive is empty.");
	const slugs = new Set();
	const identities = new Set();
	for (const p of posts) {
		if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(p.slug || "") || EXCLUDED_POST_SLUGS.includes(p.slug)) throw new Error(`Invalid or excluded slug: ${p.slug}`);
		if (slugs.has(p.slug)) throw new Error(`Duplicate article slug: ${p.slug}`);
		slugs.add(p.slug);
		if (!p.title?.trim() || !p.bodyHtml?.replace(/<[^>]*>/g, "").replace(/&(?:nbsp|#160);/gi, " ").trim() || !Number.isFinite(Date.parse(p.publishedAt))) throw new Error(`Incomplete article: ${p.slug}`);
		if (p.url !== `/blog/${p.slug}/`) throw new Error(`Invalid article URL: ${p.slug}`);
		if (p.sourceId) {
			const id = `${p.source}:${p.sourceId}`;
			if (identities.has(id)) throw new Error(`Duplicate source identity: ${p.slug}`);
			identities.add(id);
		}
		const imageUrls = [];
		for (const img of [p.heroImage, p.socialImage]) {
			if (img?.assetUrl) imageUrls.push(img.assetUrl);
			if (img?.srcset) imageUrls.push(...img.srcset.split(",").map(x => x.trim().split(/\s+/)[0]));
		}
		for (const tag of p.bodyHtml.match(/<img\b[^>]*>/gi) || []) {
			const src = tag.match(/\bsrc=["']([^"']+)["']/i)?.[1];
			if (src) imageUrls.push(src);
			const srcset = tag.match(/\bsrcset=["']([^"']+)["']/i)?.[1];
			if (srcset) imageUrls.push(...srcset.split(",").map(x => x.trim().split(/\s+/)[0]));
		}
		for (const url of imageUrls) {
			if (!url.startsWith("/images/") || /(?:^|\/)\.\.(?:\/|$)|[%?#\\]/.test(url)) throw new Error(`Article image is not a safe local asset: ${p.slug}`);
			if (checkAssets && !fs.existsSync(path.join(ROOT, url))) throw new Error(`Missing archived image: ${url}`);
		}
	}
	return posts;
}

export function readArchive() {
	const data = JSON.parse(fs.readFileSync(ARCHIVE_PATH, "utf8"));
	if (data.version !== 1) throw new Error("Unsupported archive version.");
	return validateArchive(data.posts);
}

// Missing feed items never delete archived articles. Stable IDs keep old URLs
// alive when Soro renames a post; a new item cannot replace a different source.
export function mergePosts(archive, incoming) {
	const merged = new Map(archive.map(p => [p.slug, p]));
	const seen = new Set();
	for (const next of incoming) {
		if (EXCLUDED_POST_SLUGS.includes(next.slug)) continue;
		const identity = next.sourceId || next.slug;
		if (seen.has(identity)) throw new Error(`Repeated feed identity: ${identity}`);
		seen.add(identity);
		const byId = next.sourceId && archive.find(p => p.source === "soro" && p.sourceId === next.sourceId);
		const bySlug = merged.get(next.slug);
		if (bySlug && (bySlug.source !== "soro" || (bySlug.sourceId && bySlug.sourceId !== next.sourceId))) throw new Error(`Soro slug collides with another article: ${next.slug}`);
		const old = byId || bySlug;
		if (old?.sourceHash === next.sourceHash && next.sourceHash) continue;
		const post = { ...next, slug: old?.slug || next.slug, url: old?.url || next.url, publishedAt: old?.publishedAt || next.publishedAt, popularity: old?.popularity || 0 };
		merged.set(post.slug, post);
	}
	return [...merged.values()].sort((a,b) => b.publishedAt.localeCompare(a.publishedAt) || a.slug.localeCompare(b.slug));
}
