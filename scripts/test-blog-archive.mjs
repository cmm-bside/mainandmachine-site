import test from "node:test";
import assert from "node:assert/strict";
import { readArchive, mergePosts, validateArchive } from "./lib/blog-archive.mjs";
import { fetchSoroItems, mapSoroPost } from "./fetch-blog-posts.mjs";

const sample = (slug, source = "soro", id = slug) => ({ slug, source, sourceId: id, title: slug, bodyHtml: "<p>A complete article.</p>", publishedAt: "2026-09-01T12:00:00.000Z", url: `/blog/${slug}/` });
test("every saved article has a body, unique URL and existing local images", () => { assert.ok(readArchive().length >= 31); });
test("a truncated feed retains older articles and the imported archive", () => {
	const old = [sample("old"), sample("essay", "beehiiv")];
	assert.equal(mergePosts(old, [sample("new")]).length, 3);
	assert.deepEqual(mergePosts(old, []).map(p => p.slug).sort(), ["essay", "old"]);
});
test("source identities preserve permanent URLs and reject collisions", () => {
	assert.equal(mergePosts([sample("old", "soro", "id")], [sample("renamed", "soro", "id")])[0].url, "/blog/old/");
	assert.throws(() => mergePosts([sample("essay", "beehiiv")], [sample("essay")]), /collides/);
	assert.throws(() => mergePosts([sample("essay", "soro", "one")], [sample("essay", "soro", "two")]), /collides/);
});
test("excluded posts cannot return, and invalid/missing assets block publishing", () => {
	assert.equal(mergePosts([sample("old")], [sample("the-person-still-signs")]).length, 1);
	assert.throws(() => validateArchive([sample("../bad")]), /slug/);
	assert.throws(() => validateArchive([{ ...sample("old"), bodyHtml: "" }]), /Incomplete/);
	assert.throws(() => validateArchive(mergePosts([sample("old")], [{ ...sample("old"), bodyHtml: "<p></p><br><hr>" }])), /Incomplete/);
	assert.throws(() => validateArchive([{ ...sample("old"), heroImage: { assetUrl: "https://cdn.example/image.jpg" } }]), /local asset/);
	assert.throws(() => validateArchive([{ ...sample("old"), heroImage: { assetUrl: "/images/blog/missing.jpg" } }]), /Missing/);
});
test("Soro outages and non-RSS notices fail without replacing the saved archive", async () => {
	await assert.rejects(fetchSoroItems("https://example.test/rss", async () => new Response("Widget inactive")), /RSS fetch failed/);
	await assert.rejects(fetchSoroItems("https://example.test/rss", async () => new Response("<rss></rss>", { status: 503 })), /RSS fetch failed/);
	assert.throws(() => mapSoroPost("<title>Broken post</title>"), /safe slug/);
});
