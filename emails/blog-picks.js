// "Read while you wait" — the Ampersand posts featured in the autoresponder.
//
// EDIT THIS FILE when you publish new posts you'd rather feature, and CHECK THE
// SLUGS AGAINST THE LIVE ARCHIVE when you do. The three that shipped here
// originally came from the reference design and were never real: they 404'd on
// the live site for as long as the autoresponder existed, in the one email that
// reaches the highest-intent reader we have. links:check now fails the build on
// a slug that is not in blog-data/index.json, so this cannot repeat silently.
//
// They are referenced by ABSOLUTE URL because relative URLs do not load in email.
//
// `thumb` is an absolute image URL for the 132px-wide thumbnail cell. Leave it
// empty ("") to fall back to the branded M&M placeholder block (matches the
// reference design). When you have real post art, point it at an absolute
// https://www.mainandmachine.com/... image.
//
// `plate` is the placeholder background color used only when `thumb` is empty.

export const SITE_ORIGIN = "https://www.mainandmachine.com";

// Post URLs are built HERE and nowhere else. Site canon is /blog/<slug>/ with a
// trailing slash; without it Cloudflare answers 308 and some mail clients drop
// the redirect, so the highest-intent reader we have gets a dead link. Every
// URL this returns is validated against blog-data/index.json by links:check.
export const postUrl = (slug) => `${SITE_ORIGIN}/blog/${slug}/`;

export const blogPicks = [
  {
    // Verified against the live archive 2026-08-01 (200 at /blog/<slug>/).
    // Chosen for someone waiting on an assessment: how to judge claims, where
    // the limits are, and what happens to their data — in that order.
    slug: "how-to-smell-the-hype",
    category: "Judgment",
    title: "How to Smell the Hype",
    blurb: "A field guide to evaluating AI claims, for owners who will hear a thousand of them this year.",
    thumb: "",
    plate: "#14110c",
  },
  {
    slug: "what-the-machine-cannot-do",
    category: "Limits",
    title: "What the Machine Cannot Do",
    blurb: "After two years of lists about what AI can do, the more valuable list is the other one.",
    thumb: "",
    plate: "#211d18",
  },
  {
    slug: "where-your-data-goes",
    category: "Data & Privacy",
    title: "Where Your Data Goes",
    blurb: "The most important AI policy in your company is the answer to one question: what happens to what we type in?",
    thumb: "",
    plate: "#14110c",
  },
];
