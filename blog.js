/* The Ampersand — client glue for a build-time blog.
   Everything is sourced from /blog-data/index.json, which is generated at
   build from beehiiv. NO runtime newsletter API calls.

   Wires up, only where the relevant elements exist:
     - homepage teaser (#amp-posts)
     - client-side search (#blog-search over title + excerpt + searchText)
     - archive tabs (.archtab)
     - beehiiv subscribe forms/links ([data-beehiiv-subscribe])
     - copy-link buttons (.essay__copy) */
(function () {
	"use strict";

	var INDEX_URL = "/blog-data/index.json";
	var dataPromise = null;

	function loadIndex() {
		if (!dataPromise) {
			dataPromise = fetch(INDEX_URL, { headers: { Accept: "application/json" } })
				.then(function (r) { return r.ok ? r.json() : { posts: [], meta: {} }; })
				.catch(function () { return { posts: [], meta: {} }; });
		}
		return dataPromise;
	}

	function esc(s) {
		return String(s == null ? "" : s)
			.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
			.replace(/"/g, "&quot;").replace(/'/g, "&#39;");
	}

	function fmtDate(iso) {
		if (!iso) return "";
		var d = new Date(iso);
		if (isNaN(d.getTime())) return "";
		try {
			return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
		} catch (e) { return ""; }
	}

	function cardHTML(post) {
		var img = post.heroImage && post.heroImage.assetUrl;
		var thumb = img
			? '<div class="feed__card-img"><img loading="lazy" decoding="async" alt="' + esc((post.heroImage && post.heroImage.alt) || (post.title + " — illustrated diagram from The Ampersand")) + '" src="' + esc(img) + '" /></div>'
			: '<div class="feed__card-img is-empty"></div>';
		return '<a class="feed__card" href="' + esc(post.url) + '">' + thumb +
			'<div class="feed__card-body">' +
			'<span class="feed__date">' + esc(fmtDate(post.publishedAt)) + '</span>' +
			'<h3 class="feed__card-title">' + esc(post.title) + '</h3>' +
			(post.excerpt ? '<p class="feed__card-excerpt">' + esc(post.excerpt) + '</p>' : '') +
			'</div></a>';
	}

	/* ---------- homepage teaser ---------- */
	function renderTeaser(posts) {
		var list = document.getElementById("amp-posts");
		if (!list || !posts.length) return; // keep static fallback
		list.innerHTML = "";
		posts.slice(0, 5).forEach(function (post, i) {
			var a = document.createElement("a");
			a.className = "post";
			a.href = post.url;
			a.innerHTML =
				'<span class="post__no">' + ("0" + (i + 1)).slice(-2) + '</span>' +
				'<span class="post__title">' + esc(post.title) + '</span>' +
				'<span class="post__date">' + esc(fmtDate(post.publishedAt)) + '</span>';
			list.appendChild(a);
		});
	}

	/* ---------- subscribe wiring ---------- */
	function wireSubscribe(meta) {
		var url = meta && meta.subscribeUrl;
		if (!url) return;
		var nodes = document.querySelectorAll("[data-beehiiv-subscribe]");
		Array.prototype.forEach.call(nodes, function (node) {
			if (node.tagName === "FORM") {
				node.setAttribute("action", url);
				node.setAttribute("method", "get");
				node.setAttribute("target", "_blank");
			} else if (node.tagName === "A") {
				node.setAttribute("href", url);
			}
		});
	}

	/* ---------- client search ---------- */
	function tokenize(q) { return q.toLowerCase().split(/\s+/).filter(Boolean); }

	function matches(post, tokens) {
		var hay = (post.title + " " + (post.excerpt || "") + " " + (post.searchText || "")).toLowerCase();
		return tokens.every(function (t) { return hay.indexOf(t) !== -1; });
	}

	function wireSearch(posts) {
		var input = document.getElementById("blog-search");
		var results = document.getElementById("blog-results");
		var feed = document.getElementById("blog-feed");
		if (!input || !results || !feed) return;

		function run() {
			var q = input.value.trim();
			if (!q) {
				results.hidden = true;
				results.innerHTML = "";
				feed.hidden = false;
				return;
			}
			var tokens = tokenize(q);
			var hits = posts.filter(function (p) { return matches(p, tokens); });
			feed.hidden = true;
			results.hidden = false;
			if (!hits.length) {
				results.innerHTML = '<div class="feed__empty"><span class="kicker kicker--plain">No matches</span><h2 class="h2 mt-s">Nothing for “' + esc(q) + '.”</h2><p class="lead">Try a different word — search runs across every essay\'s full text.</p></div>';
				return;
			}
			results.innerHTML =
				'<div class="feed__bar"><span class="tick-lbl">' + hits.length + ' result' + (hits.length === 1 ? '' : 's') + '</span><span class="tick-lbl">“' + esc(q) + '”</span></div>' +
				'<div class="feed__grid">' + hits.map(cardHTML).join("") + '</div>';
		}

		input.addEventListener("input", run);

		// Honor ?q= so the WebSite SearchAction target (/blog/?q={term}) lands
		// on a pre-run search, not an empty box.
		var initial = "";
		try { initial = new URLSearchParams(window.location.search).get("q") || ""; } catch (e) { /* no URLSearchParams: skip */ }
		if (initial) {
			input.value = initial;
			run();
		}
	}

	/* ---------- archive tabs ---------- */
	function wireTabs() {
		var tabs = document.querySelectorAll(".archtab");
		if (!tabs.length) return;
		Array.prototype.forEach.call(tabs, function (tab) {
			tab.addEventListener("click", function () {
				var name = tab.getAttribute("data-tab");
				Array.prototype.forEach.call(tabs, function (t) {
					var on = t === tab;
					t.classList.toggle("is-active", on);
					t.setAttribute("aria-selected", on ? "true" : "false");
				});
				["latest", "top"].forEach(function (key) {
					var pane = document.getElementById("tab-" + key);
					if (pane) pane.hidden = key !== name;
				});
				// The Top pane ships empty (its batches are inert templates) —
				// fill it the first time the tab opens.
				if (name === "top") {
					var grid = document.querySelector("#tab-top .feed__grid");
					if (grid && !grid.children.length) loadArchiveBatch("top");
				}
			});
		});
	}

	/* ---------- archive "Load more" batches ---------- */
	function loadArchiveBatch(pane) {
		var paneEl = document.getElementById("tab-" + pane);
		if (!paneEl) return;
		var tpl = paneEl.querySelector("template.archmore-batch");
		if (tpl) {
			var frag = tpl.content.cloneNode(true);
			if (pane === "top") {
				// Top is one continuous grid — append cards into it.
				paneEl.querySelector(".feed__grid").appendChild(frag);
			} else {
				// Latest appends whole month groups where the template sat.
				tpl.parentNode.insertBefore(frag, tpl);
			}
			tpl.parentNode.removeChild(tpl);
		}
		var btn = paneEl.querySelector(".archmore");
		if (btn && !paneEl.querySelector("template.archmore-batch")) btn.hidden = true;
	}

	function wireLoadMore() {
		var btns = document.querySelectorAll(".archmore");
		Array.prototype.forEach.call(btns, function (btn) {
			btn.addEventListener("click", function () {
				loadArchiveBatch(btn.getAttribute("data-pane"));
			});
		});
	}

	/* ---------- copy link ---------- */
	function wireCopy() {
		var btns = document.querySelectorAll(".essay__copy");
		Array.prototype.forEach.call(btns, function (btn) {
			btn.addEventListener("click", function () {
				var url = btn.getAttribute("data-copy") || location.href;
				var done = function () {
					var label = btn.textContent;
					btn.textContent = "Copied ✓";
					setTimeout(function () { btn.textContent = label; }, 1600);
				};
				if (navigator.clipboard && navigator.clipboard.writeText) {
					navigator.clipboard.writeText(url).then(done, done);
				} else { done(); }
			});
		});
	}

	/* ---------- reading-progress bar (post pages) ---------- */
	function wireReadingProgress() {
		var bar = document.getElementById("reading-progress-bar");
		var article = document.querySelector("article .essay");
		if (!bar || !article) return;
		var ticking = false;
		function update() {
			ticking = false;
			var rect = article.getBoundingClientRect();
			var total = rect.height - window.innerHeight;
			var passed = -rect.top;
			var pct = total > 0 ? Math.min(1, Math.max(0, passed / total)) : (rect.top <= 0 ? 1 : 0);
			bar.style.width = (pct * 100).toFixed(2) + "%";
		}
		function onScroll() {
			if (!ticking) { ticking = true; window.requestAnimationFrame(update); }
		}
		window.addEventListener("scroll", onScroll, { passive: true });
		window.addEventListener("resize", onScroll, { passive: true });
		update();
	}

	/* ---------- TOC scroll-spy + smooth-scroll (post pages) ---------- */
	function wireToc() {
		var toc = document.querySelector(".essay__toc");
		if (!toc) return;
		var links = toc.querySelectorAll("a[data-toc]");
		if (!links.length) return;
		var byId = {};
		Array.prototype.forEach.call(links, function (a) {
			byId[a.getAttribute("data-toc")] = a;
		});
		var sections = document.querySelectorAll(".essay__section[id]");

		function setActive(id) {
			Array.prototype.forEach.call(links, function (a) {
				a.classList.toggle("is-active", a.getAttribute("data-toc") === id);
			});
		}

		if ("IntersectionObserver" in window) {
			var visible = {};
			var io = new IntersectionObserver(function (entries) {
				entries.forEach(function (e) {
					if (e.isIntersecting) visible[e.target.id] = e.intersectionRatio;
					else delete visible[e.target.id];
				});
				// Pick the section nearest the top of the reading zone.
				var best = null, bestTop = Infinity;
				Array.prototype.forEach.call(sections, function (s) {
					if (!(s.id in visible)) return;
					var top = Math.abs(s.getBoundingClientRect().top - 110);
					if (top < bestTop) { bestTop = top; best = s.id; }
				});
				if (best) setActive(best);
			}, { rootMargin: "-100px 0px -55% 0px", threshold: [0, 0.25, 0.5, 1] });
			Array.prototype.forEach.call(sections, function (s) { io.observe(s); });
		}

		// Smooth-scroll on click (respect reduced-motion), update the hash.
		var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
		Array.prototype.forEach.call(links, function (a) {
			a.addEventListener("click", function (ev) {
				var id = a.getAttribute("data-toc");
				var target = document.getElementById(id);
				if (!target) return;
				ev.preventDefault();
				target.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
				setActive(id);
				if (history.replaceState) history.replaceState(null, "", "#" + id);
				else location.hash = id;
			});
		});
	}

	function init() {
		wireTabs();
		wireLoadMore();
		wireCopy();
		wireReadingProgress();
		wireToc();
		var needsData =
			document.getElementById("amp-posts") ||
			document.getElementById("blog-search") ||
			document.querySelector("[data-beehiiv-subscribe]");
		if (!needsData) return;
		loadIndex().then(function (payload) {
			var posts = payload.posts || [];
			renderTeaser(posts);
			wireSearch(posts);
			wireSubscribe(payload.meta || {});
		});
	}

	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", init);
	} else {
		init();
	}
})();
