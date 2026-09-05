#!/usr/bin/env node
import fs from "node:fs";
import { createHash } from "node:crypto";
import { fetchSoroItems, mapSoroPost, localizeImages } from "./fetch-blog-posts.mjs";
import { readArchive, mergePosts, validateArchive, ARCHIVE_PATH } from "./lib/blog-archive.mjs";
import { applyPostEditorialOverrides } from "./lib/post-seo.mjs";

const archive = readArchive();
const items = await fetchSoroItems();
if (!items.length) throw new Error("Soro returned an empty feed; the saved archive was left intact.");
const incoming = items.map(item => ({ ...mapSoroPost(item), sourceHash: createHash("sha256").update(item.trim()).digest("hex") }));
const merged = mergePosts(archive, incoming);
for (const post of merged) applyPostEditorialOverrides(post);
await localizeImages(merged);
validateArchive(merged);
const output = `${JSON.stringify({ version: 1, posts: merged }, null, 2)}\n`;
if (output !== fs.readFileSync(ARCHIVE_PATH, "utf8")) {
	fs.writeFileSync(`${ARCHIVE_PATH}.tmp`, output);
	fs.renameSync(`${ARCHIVE_PATH}.tmp`, ARCHIVE_PATH);
}
console.log(`[blog:sync] Saved ${merged.length} complete articles; ${incoming.length} Soro feed items checked.`);
