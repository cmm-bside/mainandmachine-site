import fs from 'node:fs';
import path from 'node:path';
import { applyPostEditorialOverrides } from './post-seo.mjs';

// Keep public feed JSON and cached page rendering consistent without fetching
// or dropping a report/article. Body HTML, provenance and dates are preserved.
export function applyBlogEditorialCache(root) {
  let changed = 0;
  const modulePath = path.join(root, 'src/data/blog-posts.js');
  if (fs.existsSync(modulePath)) {
    const before = fs.readFileSync(modulePath, 'utf8');
    const after = before.replace(/(export const posts\s*=\s*)(\[[\s\S]*?\]);/, (_, prefix, raw) => {
      const posts = JSON.parse(raw);
      const original = JSON.stringify(posts);
      posts.forEach(applyPostEditorialOverrides);
      return prefix + (JSON.stringify(posts) === original ? raw : JSON.stringify(posts)) + ';';
    });
    if (after !== before) { fs.writeFileSync(modulePath, after); changed++; }
  }
  const dataDir = path.join(root, 'blog-data');
  if (fs.existsSync(dataDir)) for (const name of fs.readdirSync(dataDir).filter(name => name.endsWith('.json'))) {
    const file = path.join(dataDir, name);
    const before = fs.readFileSync(file, 'utf8');
    const data = JSON.parse(before);
    const original = JSON.stringify(data);
    if (Array.isArray(data.posts)) data.posts.forEach(applyPostEditorialOverrides);
    else if (data.slug) applyPostEditorialOverrides(data);
    if (JSON.stringify(data) !== original) { fs.writeFileSync(file, JSON.stringify(data) + '\n'); changed++; }
  }
  return changed;
}
