// "Read while you wait" — the three Ampersand posts featured in the autoresponder.
//
// EDIT THIS FILE when you publish new posts you'd rather feature. These are the
// three from the reference design. They are referenced by ABSOLUTE URL because
// relative URLs do not load in email.
//
// `thumb` is an absolute image URL for the 132px-wide thumbnail cell. Leave it
// empty ("") to fall back to the branded M&M placeholder block (matches the
// reference design). When you have real post art, point it at an absolute
// https://www.mainandmachine.com/... image.
//
// `plate` is the placeholder background color used only when `thumb` is empty.

export const SITE_ORIGIN = "https://www.mainandmachine.com";

export const blogPicks = [
  {
    slug: "most-of-your-workflows-dont-need-ai",
    category: "AI & Judgment",
    title: "Most of your workflows don't need AI.",
    blurb: "Discernment is the whole job — knowing the handful of places automation quietly pays.",
    thumb: "",
    plate: "#14110c",
  },
  {
    slug: "buy-boring-build-rare",
    category: "The Method",
    title: "Buy Boring, Build Rare",
    blurb: "Most of what a small business needs already exists for forty dollars a month. We only build the thing that's actually yours.",
    thumb: "",
    plate: "#211d18",
  },
  {
    slug: "what-we-killed-in-the-audit",
    category: "Field Notes",
    title: "What We Killed in the Audit",
    blurb: "Four automations a client asked for, and why we talked them out of every one. The honest “no” is the most valuable line item.",
    thumb: "",
    plate: "#14110c",
  },
];
