/* The Ampersand — pulls posts from /api/posts (Substack mirror) and renders
   the homepage teaser and the /blog feed. Progressive enhancement: if the feed
   is empty or unreachable, the homepage keeps its static fallback list and the
   blog page shows a tasteful "coming soon" state. */
(function () {
	"use strict";

	var SUBSTACK = "https://mainandmachine.substack.com";

	function fmtDate(iso, fallback) {
		var d = iso ? new Date(iso) : null;
		if (!d || isNaN(d.getTime())) return fallback || "";
		try {
			return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
		} catch (e) {
			return fallback || "";
		}
	}

	function el(tag, cls, text) {
		var n = document.createElement(tag);
		if (cls) n.className = cls;
		if (text != null) n.textContent = text;
		return n;
	}

	function thumb(post, cls) {
		var box = el("div", cls);
		if (post.image) {
			var img = el("img");
			img.loading = "lazy";
			img.alt = "";
			img.src = post.image;
			img.addEventListener("error", function () {
				box.classList.add("is-empty");
				if (img.parentNode) box.removeChild(img);
			});
			box.appendChild(img);
		} else {
			box.classList.add("is-empty");
		}
		return box;
	}

	function fetchPosts() {
		return fetch("/api/posts", { headers: { Accept: "application/json" } })
			.then(function (r) { return r.ok ? r.json() : { posts: [] }; })
			.catch(function () { return { posts: [] }; });
	}

	/* ---------- homepage teaser (section 12) ---------- */
	function renderTeaser(posts) {
		var list = document.getElementById("amp-posts");
		if (!list || !posts.length) return; // keep static fallback
		list.innerHTML = "";
		posts.slice(0, 5).forEach(function (post, i) {
			var a = el("a", "post");
			a.href = post.url;
			a.target = "_blank";
			a.rel = "noopener";
			a.appendChild(el("span", "post__no", ("0" + (i + 1)).slice(-2)));
			a.appendChild(el("span", "post__title", post.title));
			a.appendChild(el("span", "post__date", fmtDate(post.iso, post.date)));
			list.appendChild(a);
		});
	}

	/* ---------- /blog feed ---------- */
	function renderFeed(payload) {
		var root = document.getElementById("feed-root");
		if (!root) return;
		var posts = payload.posts || [];
		root.classList.remove("is-loading");

		if (!posts.length) {
			root.innerHTML = "";
			var empty = el("div", "feed__empty crop");
			empty.appendChild(el("span", "kicker kicker--plain", "The Ampersand"));
			empty.appendChild(el("h2", "h2 mt-s", "The first dispatch is on its way."));
			var p = el("p", "lead");
			p.textContent = "Free weekly essays on building durable things in a noisy time — no hype, no funnels. Subscribe and you'll get the first one the moment it's out.";
			empty.appendChild(p);
			var cta = el("a", "btn btn--accent btn--lg");
			cta.href = SUBSTACK + "/subscribe";
			cta.target = "_blank";
			cta.rel = "noopener";
			cta.textContent = "Subscribe on Substack →";
			empty.appendChild(cta);
			root.appendChild(empty);
			return;
		}

		root.innerHTML = "";

		// Featured — latest post
		var f = posts[0];
		var feat = el("a", "feed__featured crop");
		feat.href = f.url; feat.target = "_blank"; feat.rel = "noopener";
		feat.appendChild(thumb(f, "feed__featured-img"));
		var fbody = el("div", "feed__featured-body");
		fbody.appendChild(el("span", "tick-lbl", "Latest dispatch · " + fmtDate(f.iso, f.date)));
		fbody.appendChild(el("h2", "feed__featured-title", f.title));
		if (f.excerpt) fbody.appendChild(el("p", "feed__excerpt", f.excerpt));
		var read = el("span", "feed__read");
		read.textContent = "Read the essay →";
		fbody.appendChild(read);
		feat.appendChild(fbody);
		root.appendChild(feat);

		// Recent grid
		var rest = posts.slice(1);
		if (rest.length) {
			var bar = el("div", "feed__bar");
			bar.appendChild(el("span", "tick-lbl", "Recent dispatches"));
			bar.appendChild(el("span", "tick-lbl", "RSS / live from Substack"));
			root.appendChild(bar);

			var grid = el("div", "feed__grid");
			rest.forEach(function (post) {
				var card = el("a", "feed__card");
				card.href = post.url; card.target = "_blank"; card.rel = "noopener";
				card.appendChild(thumb(post, "feed__card-img"));
				var body = el("div", "feed__card-body");
				body.appendChild(el("span", "feed__date", fmtDate(post.iso, post.date)));
				body.appendChild(el("h3", "feed__card-title", post.title));
				if (post.excerpt) body.appendChild(el("p", "feed__card-excerpt", post.excerpt));
				card.appendChild(body);
				grid.appendChild(card);
			});
			root.appendChild(grid);
		}

		var archive = el("a", "feed__archive");
		archive.href = SUBSTACK + "/archive";
		archive.target = "_blank"; archive.rel = "noopener";
		archive.textContent = "View the full archive →";
		root.appendChild(archive);
	}

	function init() {
		var needsTeaser = document.getElementById("amp-posts");
		var needsFeed = document.getElementById("feed-root");
		if (!needsTeaser && !needsFeed) return;
		fetchPosts().then(function (payload) {
			renderTeaser(payload.posts || []);
			renderFeed(payload);
		});
	}

	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", init);
	} else {
		init();
	}
})();
