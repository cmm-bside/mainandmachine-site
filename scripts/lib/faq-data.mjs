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
	"guides/index.html": {
		label: "Field Guide FAQ",
		heading: "About the Field Guide.",
		items: [
			{ q: "What is the Field Guide?", a: "Practical guides to the buying questions around AI consulting — what it costs, whether you are ready, hiring versus engaging, and how to vet a firm — written with our real published prices as the spine." },
			{ q: "How is the Field Guide different from The Ampersand?", a: "The Ampersand is weekly essays on how the machine works and what it means. The Field Guide answers commercial questions with numbers. Read the essays to understand; read the guides to decide." },
			{ q: "Are the prices in these guides real?", a: "Ours are the published list: audits $3,500–$8,500, sprints $12,000–$45,000, fixed in writing before work begins. Market figures are stated as typical ranges, not competitor quotes." },
		],
	},
	"guides/ai-consultant-cost/index.html": {
		label: "Cost guide FAQ",
		heading: "What AI consulting costs.",
		items: [
			{ q: "How much does an AI consultant cost per hour?", a: "Independent AI consultants typically bill $100–$300 an hour; specialists with deep machine-learning backgrounds run $200–$500. The total depends on hours, which almost nobody quotes in advance — which is why we price fixed instead." },
			{ q: "How much should a small business budget for AI consulting?", a: "Roughly $15,000–$55,000 in year one at our published prices: an AI Readiness Audit at $3,500–$8,500 plus an Implementation Sprint at $12,000–$45,000, fixed in writing before work begins." },
			{ q: "Why are Big Four AI engagements so expensive?", a: "They are built for enterprises: layers of analysts, governance frameworks, and brand assurance. Engagements commonly start around $250,000 — rational at 40,000 employees, mismatched at 40." },
			{ q: "Is fixed-price better than hourly for AI projects?", a: "For small and mid-size businesses, usually yes. AI work carries unusual scope uncertainty, and hourly billing hands all of it to the buyer. A fixed price forces the seller to scope before selling." },
		],
	},
	"guides/ai-readiness-checklist/index.html": {
		label: "Readiness FAQ",
		heading: "About AI readiness.",
		items: [
			{ q: "How do I know if my business is ready for AI?", a: "Run the 20 checks on this page: documented workflows, exportable data, a named owner with review time, and a number on what the manual work costs. Sixteen or more and you are ready to build; nine or fewer means fix the foundations first." },
			{ q: "What should be in place before hiring an AI consultant?", a: "At minimum: your three most repetitive workflows named, one of them written down, a person with two to three hours a week to review outputs, and a budget range. Those four save you money in week one of any engagement." },
			{ q: "Do I need clean data before starting with AI?", a: "No — nobody's data is clean. You need to know which system is the truth for each core fact and be able to export it without calling a vendor. That is a policy decision more often than a purchase." },
			{ q: "Is there a free automated readiness assessment?", a: "Yes — the AI-Ready Score: fourteen questions, about seven minutes, a 0–100 score, and the one constraint to fix first. No sales call follows it." },
		],
	},
	"guides/ai-consultant-vs-in-house/index.html": {
		label: "Hire vs. engage FAQ",
		heading: "Hiring vs. engaging.",
		items: [
			{ q: "Should a small business hire an AI engineer?", a: "Usually not below about 100 employees. A capable hire runs $165,000–$280,000 a year fully loaded and pays off only with several new builds a quarter; a fixed-price engagement covers a complete first build for $15,500–$53,500, once." },
			{ q: "How much does an in-house AI hire cost?", a: "$130,000–$200,000 in salary for someone who can genuinely build, plus 25–40% for taxes, benefits, and overhead — $165,000–$280,000 a year, every year, plus three to six months of ramp before the first workflow ships." },
			{ q: "What does doing nothing about AI cost?", a: "Our ROI calculator models the drag at roughly $4,600–$6,400 per employee per year in manual work and lost capacity, depending on industry. Modeled assumptions, stated in the open — not your books, but not zero." },
			{ q: "Can a consultant hand off to an internal team?", a: "That is our default: every build ends with your team trained and everything owned by you. Many clients then name a part-time internal owner from operations rather than hiring an engineer." },
		],
	},
	"guides/how-to-choose-an-ai-consultant/index.html": {
		label: "Vetting FAQ",
		heading: "Vetting an AI consultant.",
		items: [
			{ q: "What should I ask an AI consultant before hiring them?", a: "Ten questions: the exact cost and when you learn it, whether they guarantee ROI (they should not), the real timeline, who scopes versus who builds, whether they can say wait, tool incentives, where your data goes, who can overrule the system, what you own at handoff, and proof of a real build." },
			{ q: "What are red flags when hiring an AI consultant?", a: "Guaranteed ROI numbers, transformation promised in weeks, prices only available after a discovery sequence, unverifiable scarcity, tool recommendations that always land on a partner product, and case studies with no names." },
			{ q: "Should an AI consultant guarantee ROI?", a: "No — and a guarantee is itself a red flag. Real results depend on your execution, so a serious firm quotes ranges and publishes its assumptions." },
			{ q: "What should you own at the end of an AI project?", a: "Everything: the systems, credentials, documentation, and prompts, with your team trained to run them. Ongoing help should be optional — ours is a monthly retainer with no lock-in." },
		],
	},
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
