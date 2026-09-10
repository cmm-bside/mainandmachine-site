import assert from "node:assert/strict";
import test from "node:test";
import { proxyScore } from "../lib/score-proxy.mjs";

test("Score HTML opts out of CDN body rewrites without weakening private caching", async (t) => {
  let upstreamUrl;
  t.mock.method(globalThis, "fetch", async (url) => {
    upstreamUrl = url;
    return new Response('<a href="mailto:team@example.com">team@example.com</a>', {
      headers: { "content-type": "text/html; charset=utf-8", "cache-control": "private, no-store" },
    });
  });
  const response = await proxyScore({ request: new Request("https://www.mainandmachine.com/score/") });
  assert.equal(upstreamUrl, "https://score.mainandmachine.com/score");
  assert.equal(response.headers.get("cache-control"), "private, no-store, no-transform");
  assert.equal(await response.text(), '<a href="mailto:team@example.com">team@example.com</a>');
});

test("existing no-transform directives and private report routes are preserved", async (t) => {
  const policy = "private, no-cache, No-Transform, max-age=0";
  t.mock.method(globalThis, "fetch", async () => new Response("<p>Private report</p>", {
    headers: { "content-type": "text/html", "cache-control": policy },
  }));
  const response = await proxyScore({ request: new Request("https://www.mainandmachine.com/score/report/example-token") });
  assert.equal(response.headers.get("cache-control"), policy);
});

test("HTML without a caching policy gains no cache lifetime", async (t) => {
  t.mock.method(globalThis, "fetch", async () => new Response("<p>Assessment</p>", {
    headers: { "content-type": "text/html" },
  }));
  const response = await proxyScore({ request: new Request("https://www.mainandmachine.com/score/") });
  assert.equal(response.headers.get("cache-control"), "no-transform");
});

test("scripts and API responses retain their original caching policy", async (t) => {
  for (const [route, type, policy] of [
    ["/score/_next/static/example.js", "application/javascript", "public, max-age=31536000, immutable"],
    ["/score/api/example", "application/json", "no-store"],
  ]) {
    const fetchMock = t.mock.method(globalThis, "fetch", async () => new Response("{}", {
      headers: { "content-type": type, "cache-control": policy },
    }));
    const response = await proxyScore({ request: new Request(`https://www.mainandmachine.com${route}`) });
    assert.equal(response.headers.get("cache-control"), policy);
    fetchMock.mock.restore();
  }
});

test("the existing canonical redirect retains query parameters", async () => {
  const response = await proxyScore({ request: new Request("https://www.mainandmachine.com/score?utm_source=example") });
  assert.equal(response.status, 301);
  assert.equal(response.headers.get("location"), "https://www.mainandmachine.com/score/?utm_source=example");
  assert.equal(response.headers.get("cache-control"), "public, max-age=3600");
});
