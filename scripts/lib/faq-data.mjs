// FAQ content for service / industry / overview pages, injected as BOTH
// FAQPage JSON-LD and a visible <details> block by scripts/inject-faq.mjs
// (idempotent — safe to re-run). Answers are plain text so the visible copy
// and the structured data stay byte-identical, which is what AI engines and
// rich results expect. Facts mirror src/data/company.mjs; prices use the
// published format and are guarded by check-facts.mjs.

// Shared answer fragments — keep prices/locations consistent everywhere.
const COST =
	"The AI Readiness Audit runs $3,500–$8,500. An AI Implementation Sprint runs $12,000–$45,000, quoted as a fixed price in writing before any work begins. Managed Services is a monthly retainer with no lock-in.";
const COST_SHORT =
	"The AI Readiness Audit runs $3,500–$8,500; an AI Implementation Sprint runs $12,000–$45,000, quoted fixed in writing before work begins.";
const REMOTE =
	"We run two hubs — Denver, Colorado and Phoenix, Arizona — for in-person work, and we work remotely with businesses across the US. Same method, same fixed prices either way.";
const TIMELINE =
	"An AI Readiness Audit takes 2 to 4 weeks. An AI Implementation Sprint runs 4 to 12 weeks — about 90 days per workflow. Managed Services is ongoing.";
const FREE =
	"Every engagement starts with a free 30-minute AI Opportunity Assessment. We reply within 24 hours, and there is no pitch — just a straight read on whether there is a real opportunity and what it is worth.";

export const FAQ = {
	"services/sample-audit/index.html": {
		label: "Sample audit FAQ",
		heading: "About this sample document.",
		items: [
			{ q: "What is this page?", a: "Two redacted pages from a real AI Readiness Audit deliverable, so you can read the document instead of a description of it." },
			{ q: "What does the full audit cost?", a: "$3,500–$8,500, fixed in writing, over 2 to 4 weeks." },
			{ q: "How do I get one with my workflows in it?", a: FREE },
		],
	},
	"industries/index.html": {
		label: "Industries FAQ",
		heading: "Who this is for.",
		items: [
			{ q: "Which industries do you work with?", a: "Professional services, retail, healthcare, construction, and hospitality — small and mid-size businesses, roughly 5 to 100 people and $1M to $50M in revenue." },
			{ q: "Does the approach change by industry?", a: "The method is the same — map the work, price the opportunities, build the highest-payback one. What changes is which workflows pay first." },
			{ q: "How much does it cost?", a: COST },
			{ q: "Do you work remotely?", a: REMOTE },
		],
	},
	"industries/professional-services/index.html": {
		label: "Industry FAQ",
		heading: "AI for professional services firms.",
		items: [
			{ q: "What can AI do for a professional services firm?", a: "Usually the intake and coordination work — qualifying requests, summarizing, routing, and prepping the repetitive documents — so your people spend time on judgment, not handoffs." },
			{ q: "Is our client data safe?", a: "It can be built so nothing leaves your office. MARCUS — the system we built for B:Side Capital, a regulated lender — runs entirely on the client's own hardware: PII is stripped before any model reads a document, and every action writes to a tamper-evident log. A firm holding privileged files can ask for the same pattern." },
			{ q: "Do we need to replace our practice management software?", a: "No. We build an integration layer on the practice management, billing, and document tools you already run. Nothing gets ripped out; the systems you have start talking to each other." },
			{ q: "What happens to billable-hour economics?", a: "The hours you bill are judgment hours, and those stay human. What the machine takes is the non-billable wrapper — intake write-ups, chasing invoices, reconciling status — so more of the week is billable in the first place. On flat-fee work, the same recovered capacity shows up as margin." },
			{ q: "How much does it cost?", a: COST_SHORT },
			{ q: "How long does it take?", a: "An audit is 2 to 4 weeks; a build is 4 to 12." },
			{ q: "Do you work remotely or on-site?", a: REMOTE },
			{ q: "Is there a real example?", a: "The closest published case is MARCUS — 14 AI agents we built for B:Side Capital, a regulated lender." },
		],
	},
	"industries/retail/index.html": {
		label: "Industry FAQ",
		heading: "AI for retail businesses.",
		items: [
			{ q: "What can AI do for a retail business?", a: "Often the reconciliation across systems that do not talk — inventory, POS, and ordering — plus demand patterns and the repetitive back-office work." },
			{ q: "How much does it cost?", a: COST_SHORT },
			{ q: "How long does it take?", a: "An audit is 2 to 4 weeks; a build is 4 to 12." },
			{ q: "Do you work remotely or on-site?", a: REMOTE },
		],
	},
	"industries/healthcare/index.html": {
		label: "Industry FAQ",
		heading: "AI for healthcare practices.",
		items: [
			{ q: "What can AI do for a healthcare practice?", a: "Typically the front-desk and intake work — scheduling, forms, and summaries — handled so a person reviews rather than retypes." },
			{ q: "Where does our patient data go?", a: "Where it needs to stay. The MARCUS build for a regulated lender runs entirely in-house, with no file leaving the building — the same control is available to you." },
			{ q: "How much does it cost?", a: COST_SHORT },
			{ q: "How long does it take?", a: "An audit is 2 to 4 weeks; a build is 4 to 12." },
			{ q: "Do you work remotely or on-site?", a: REMOTE },
		],
	},
	"industries/construction/index.html": {
		label: "Industry FAQ",
		heading: "AI for construction businesses.",
		items: [
			{ q: "What can AI do for a construction business?", a: "Often the invoicing and paperwork gap that eats cash flow — turning field information into clean billing, and chasing the documents that hold up payment." },
			{ q: "How much does it cost?", a: COST_SHORT },
			{ q: "How long does it take?", a: "An audit is 2 to 4 weeks; a build is 4 to 12." },
			{ q: "Do you work remotely or on-site?", a: REMOTE },
		],
	},
	"industries/hospitality/index.html": {
		label: "Industry FAQ",
		heading: "AI for hospitality operations.",
		items: [
			{ q: "What can AI do for a hospitality operation?", a: "Usually the manual reconciliation across POS, scheduling, and ordering, plus guest communication and the repetitive coordination between systems." },
			{ q: "How much does it cost?", a: COST_SHORT },
			{ q: "How long does it take?", a: "An audit is 2 to 4 weeks; a build is 4 to 12." },
			{ q: "Do you work remotely or on-site?", a: REMOTE },
		],
	},
};
