# The Ampersand — blog setup & author workflow

"The Ampersand" is sourced from **beehiiv at build time**. There are no
runtime newsletter API calls: every deploy fetches your confirmed posts,
sanitizes the article HTML, and prerenders static pages, JSON-LD, a sitemap,
and an RSS feed. The published site just serves files.

```
beehiiv ──fetch at build──▶ src/data/blog-posts.js (generated, gitignored)
                                     │
        ┌────────────────────────────┼─────────────────────────────┐
        ▼                            ▼                              ▼
   /blog-data/<slug>.json     prerendered HTML                 SEO outputs
   (per-post bodies)          /blog, /blog/archive,            JSON-LD, sitemap.xml,
                              /blog/<slug>                      /blog/rss.xml
```

---

## Author workflow (day to day)

1. **Write** the essay in beehiiv as usual.
2. **Set a real subtitle.** It becomes the card excerpt, the meta description,
   and the social description. (Falls back to preview text, then the opening
   line, but a deliberate subtitle reads best.)
3. **Set a cover image.** It becomes the post's hero + social image. If you
   leave the beehiiv default gray placeholder, the site falls back to the
   brand OG image automatically.
4. **Publish** (or schedule). A published post has status `confirmed`.
5. The site **rebuilds** and the post appears at `/blog/<slug>` within a few
   minutes (see "Instant rebuilds" below).

### Keeping a post off the website

Toggle **"Hide from feed"** on the post in beehiiv. That is the real
website on/off switch — it keeps the essay email-only and out of the blog,
archive, sitemap, and RSS. (A normal newsletter essay is `platform: email`;
that is fine and still appears — only "Hide from feed" removes it.)

### What you can't change from beehiiv

The page chrome (nav, footer, subscribe band, typography) lives in this repo.
Article inline styles, subscribe/CTA widgets, polls, and the "Powered by
beehiiv" footer are stripped during sanitization so essays inherit the site's
prose styling.

---

## One-time setup

### 1. beehiiv API key (required to pull content)

- In beehiiv: **Settings → API → create a key** with **`posts:read`** scope.
- In Cloudflare Pages (**Settings → Environment variables**, Production *and*
  Preview), add — as encrypted/secret where offered:
  - `BEEHIIV_API_KEY` = your key  ← **secret, never commit it**
  - `BEEHIIV_PUBLICATION_ID` = your `pub_…` id
    (beehiiv **Settings → API**, or the publication URL).
  - *(optional)* `BEEHIIV_SUBSCRIBE_URL` = an explicit subscribe URL. If
    omitted, the build derives `https://<your-handle>.beehiiv.com/subscribe`
    from your posts.

> If `BEEHIIV_API_KEY` is **unset**, the build still succeeds and ships an
> empty blog with a graceful "first dispatch is on its way" state. If the key
> **is** set but the fetch fails, the build exits non-zero and the deploy
> fails — by design, so you never ship stale or empty content over a live blog.

### 2. Cloudflare Pages build settings

This repo used to have no build step. The blog adds one:

| Setting | Value |
| --- | --- |
| Framework preset | `None` |
| Build command | `npm run build:static` |
| Build output directory | `/` *(unchanged)* |
| Node version | 18+ (`NODE_VERSION` env if needed) |

`npm install` runs `postinstall` (a safe empty build so a fresh/no-creds clone
is always buildable); the build command then fetches, prerenders, and runs SEO
checks.

### 3. Instant rebuilds (recommended)

- Cloudflare Pages → **Settings → Builds & deployments → Deploy hooks** →
  create a hook → copy the URL.
- beehiiv → **Settings → Webhooks** → add a webhook for **post published /
  updated** events → paste the deploy hook URL.

Now publishing or editing in beehiiv triggers a rebuild automatically.

**Fallbacks if you skip the webhook:**
- A scheduled/cron build (e.g. hourly) via Cloudflare or a GitHub Action that
  pings the deploy hook.
- Manual: trigger a deploy from the Cloudflare dashboard, or push any commit.

---

## Local development

```bash
npm install                 # installs deps + runs a safe empty build
npm run build:static        # full build (needs the env vars above to pull real posts)
npm run preview             # serve at http://localhost:8000
```

To build real content locally, export the vars first:

```bash
export BEEHIIV_API_KEY=...           # posts:read
export BEEHIIV_PUBLICATION_ID=pub_...
npm run build:static
```

Individual steps: `npm run blog:fetch` · `npm run blog:build` · `npm run seo:check`.

### Generated (gitignored) artifacts

Never committed; regenerated every build:

```
src/data/blog-posts.js        light index (no bodies) — source of truth
blog-data/index.json          same index, for client search + homepage teaser
blog-data/<slug>.json         per-post sanitized body
blog/index.html               /blog
blog/archive/index.html       /blog/archive
blog/<slug>/index.html        each post
blog/rss.xml                  RSS 2.0
sitemap.xml                   static + blog routes
```
