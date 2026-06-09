# Main & Machine — website

The **production website** for Main & Machine. The marketing site is plain static
HTML/CSS/JS (no framework). The one build step is the blog, **The Ampersand**, which is
sourced from beehiiv at build time and prerendered to static pages — see
[`BLOG_SETUP.md`](./BLOG_SETUP.md).

> **Source code lives on GitHub → Cloudflare Pages runs `npm run build:static`
> and deploys to www.mainandmachine.com on every push.**

> **Cloudflare Pages build settings:** Build command `npm run build:static`,
> output directory `/`. Set `BEEHIIV_API_KEY` (secret) and `BEEHIIV_PUBLICATION_ID`
> in the project's environment variables. Without them the build still succeeds and
> ships an empty blog. Details in [`BLOG_SETUP.md`](./BLOG_SETUP.md).

```
mainandmachine-site/
├── index.html     ← the homepage (markup + a small inline reveal/animation script)
├── styles.css     ← all styling (design tokens, layout, hero animation, grain, marks)
├── _headers       ← Cloudflare Pages caching/security headers
├── .gitignore
└── README.md      ← you are here
```

Open `index.html` in any browser and the whole site renders. Fonts load from Google Fonts
over the network; everything else (texture, the ampersand watermark, the registration
marks, the favicon) is self-contained. **There are no image assets to manage.**

---

## Step 1 — Put the source on GitHub

From inside this folder:

```bash
cd mainandmachine-site
git init
git add .
git commit -m "Main & Machine website — initial commit"
```

Create the repo and push. If you have the GitHub CLI (`gh`):

```bash
gh repo create mainandmachine-site --public --source=. --remote=origin --push
```

No `gh`? Create an empty repo named `mainandmachine-site` at https://github.com/new
(don't add a README/license), then:

```bash
git branch -M main
git remote add origin https://github.com/<your-username>/mainandmachine-site.git
git push -u origin main
```

> Doing this from **Claude Code**? Just say:
> *"Initialise git here, create a GitHub repo called mainandmachine-site, and push."*

---

## Step 2 — Connect Cloudflare Pages to the repo

1. Go to the Cloudflare dashboard → **Workers & Pages → Create → Pages →
   Connect to Git**.
2. Authorize GitHub and pick the **`mainandmachine-site`** repo.
3. Build settings — this is a plain static site, so leave them empty:
   - **Framework preset:** `None`
   - **Build command:** *(leave blank)*
   - **Build output directory:** `/`
4. **Save and Deploy.** Cloudflare builds a preview at
   `https://mainandmachine-site.pages.dev`.

From now on, **every `git push` to `main` auto-deploys.** No CLI needed for updates.

---

## Step 3 — Point www.mainandmachine.com at it

In the new Pages project → **Custom domains → Set up a custom domain**:

1. Add `www.mainandmachine.com`.
2. Add the apex `mainandmachine.com` too (Cloudflare offers a one-click redirect from
   apex → `www`, which is the recommended setup).

**DNS records** (added automatically if mainandmachine.com's DNS is already on Cloudflare;
otherwise add them at your registrar):
- `www` → **CNAME** → `mainandmachine-site.pages.dev`
- apex `@` → Cloudflare's apex/redirect option (or a registrar redirect to the `www` URL)

HTTPS certificates are provisioned automatically. DNS can take a few minutes to a few hours
to propagate.

---

## Editing the site

This site was built to be edited from the terminal with
[Claude Code](https://www.anthropic.com/claude-code):

```bash
cd mainandmachine-site
claude
```

Describe the change in plain language, then commit and push to publish:

```bash
git add . && git commit -m "Update hero headline" && git push
```

**Where things live:**
- **Copy / structure** → `index.html`. Sections are commented (`<!-- 01 THE NAME -->`,
  `<!-- 04 PRICING -->`, …) and each carries a `data-screen-label`.
- **Colors, type, spacing, animation** → `styles.css`. Colors are CSS custom properties in
  the `:root` blocks at the top — the **"A+ ELEVATION LAYER"** block near the top wins, so
  edit values there. Key tokens:
  - `--paper`, `--ink` — the two background tones
  - `--accent` (`#bd451f`, the rust), `--accent-ink` (brighter rust for dark sections)
  - `--sans` = Archivo (headlines/body), `--mono` = Space Mono (labels/data)
- **Hero animation** → the `HERO ANIMATION` block in `styles.css` (word-rise + `ampDrift`)
  plus the small `<script>` at the bottom of `index.html`. Respects
  `prefers-reduced-motion`; a 1400 ms failsafe guarantees text never stays hidden.

> When you change CSS, bump the cache-buster: in `index.html` the link is `styles.css?v=5`
> → change it to `?v=6` so browsers fetch the new file immediately.

### Preview locally before pushing

```bash
cd mainandmachine-site
python3 -m http.server 8000      # then open http://localhost:8000
```

---

## Good to know

- **One page.** Nav links are in-page anchors (`#work`, `#pricing`, `#method`, `#about`,
  `#writing`). Real sub-pages = new `.html` files in this folder + updated links.
- **Footer contact:** `cmyers@mainandmachine.com`, `480-360-5128`, Denver & Phoenix —
  edit in `index.html`.
- **Placeholder links:** the "Book an assessment" and newsletter buttons currently point at
  `#`. Search `href="#"` in `index.html` and swap in your real scheduling / Substack URLs.
- **Rollback:** because every deploy maps to a git commit, you can roll back instantly from
  the Cloudflare Pages **Deployments** tab, or with `git revert`.
