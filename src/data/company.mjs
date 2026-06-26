// CANONICAL BUSINESS FACTS — the single source of truth.
// Every fact here must be byte-identical wherever it appears: page copy,
// meta tags, JSON-LD, llms.txt, footers, and emails. Generated surfaces
// (blog pages, emails) import this module; the static HTML pages
// (index.html, book/index.html) are guarded by scripts/check-facts.mjs,
// which fails the build if they drift. See CLAUDE.md.
//
// Keep this file runtime-agnostic (no Node or Worker globals): it is
// imported by build scripts, Cloudflare Pages Functions, and email templates.

export const COMPANY = {
  name: "Main & Machine",
  domain: "mainandmachine.com",
  origin: "https://www.mainandmachine.com",
  oneLiner:
    "AI consulting & implementation for small and mid-size business (5–100 employees, $1M–$50M revenue)",
  tagline: "Human-centric AI for small and mid-size business",
  slogan: "The machine belongs to Main Street.",

  founder: {
    name: "Christopher Myers",
    title: "Founder & Chairman",
    roles: [
      "CEO, B:Side Capital + Fund",
      "Professor of entrepreneurship, ASU W.P. Carey School of Business",
      "Author",
    ],
  },

  services: [
    {
      key: "audit",
      name: "AI Readiness Audit",
      price: "$3,500–$8,500",
      priceLow: 3500,
      priceHigh: 8500,
      timeline: "2 to 4 weeks",
    },
    {
      key: "sprint",
      name: "AI Implementation Sprint",
      price: "$12,000–$45,000",
      priceLow: 12000,
      priceHigh: 45000,
      timeline: "4 to 12 weeks",
      note: "Fixed quote in writing before work begins",
    },
    {
      key: "managed",
      name: "Managed Services",
      price: "Monthly retainer",
      timeline: "Ongoing",
      note: "No lock-in",
    },
  ],

  delivery: "~90 days per workflow, fixed price quoted in writing before work",
  freeOffer: "30-minute AI Opportunity Assessment, reply within 24 hours",

  audience: {
    headcount: "5–100",
    revenue: "$1M–$50M",
  },

  locations: ["Denver, CO", "Phoenix, AZ"],
  coverage: "Remote across the US",

  email: "cmyers@mainandmachine.com",
  phone: "480-360-5128", // display form
  phoneE164: "+1-480-360-5128", // schema.org / JSON-LD form
  phoneHref: "tel:+14803605128",

  // Press credit is ALWAYS attributed to the founder, never the company.
  press: [
    "Forbes",
    "The Wall Street Journal",
    "The New York Times",
    "Inc.",
    "TechCrunch",
    "MSNBC",
    "Fox Business",
  ],
};
