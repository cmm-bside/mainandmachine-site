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
	"guides/what-ai-automation-costs-to-run/index.html": {
		label: "Running costs FAQ",
		heading: "What it costs to run.",
		items: [
			{ q: "How much does AI automation cost to run per month?", a: "Typically $50–$500 a month for a small business, covering model usage, software subscriptions, integration platform fees, and monitoring. Document-heavy workflows sit at the top of that band; chat-light workflows at the bottom." },
			{ q: "How much does AI model usage actually cost?", a: "Models charge by the token — roughly three-quarters of a word — in both directions. Light use often runs $20–$100 a month; systems that read long documents at volume can run several times that." },
			{ q: "Do I have to pay for AI maintenance after the build?", a: "Someone has to own the system: a named person in-house spending a few hours a month, or a maintenance retainer. Ours is Managed Services — a monthly retainer with no lock-in, priced by what is running." },
			{ q: "Is AI automation ever not worth the running cost?", a: "Yes. A task done a handful of times a month cannot repay even $50 in monthly costs plus the attention the system needs — leave those workflows manual. Volume is the test." },
		],
	},
	"guides/ai-agents-vs-automations-vs-integrations/index.html": {
		label: "Agents vs. automations FAQ",
		heading: "Sorting the three words.",
		items: [
			{ q: "What is the difference between an AI agent and an automation?", a: "An automation is a fixed rule that runs every time — if X, then Y, deterministic. An agent reads context and drafts judgment-shaped work for a person to approve; it interprets rather than follows a rule." },
			{ q: "What is an integration?", a: "Two systems finally talking to each other: data moves automatically between them and no judgment is involved. It is usually the cheapest of the three, and sometimes free with a native connector." },
			{ q: "Do most small businesses need an AI agent?", a: "Usually not. Most businesses that ask for an agent need an automation — cheaper to build, more reliable in production, and finished sooner. Agents earn their cost only where the work genuinely requires reading and judgment." },
			{ q: "Are AI agents more expensive to build than automations?", a: "Yes. Within our AI Implementation Sprint band of $12,000–$45,000, fixed in writing before work begins, integration-and-automation work sits toward the bottom and agent work toward the top." },
		],
	},
	"guides/how-long-ai-implementation-takes/index.html": {
		label: "Timeline FAQ",
		heading: "How long it takes.",
		items: [
			{ q: "How long does AI implementation take for a small business?", a: "About 90 days per workflow: roughly two weeks of discovery and mapping, weeks of building and integration inside the real operation, then handoff and training. An AI Readiness Audit of 2–4 weeks precedes the 4–12 week Implementation Sprint." },
			{ q: "Can AI really be implemented in two weeks?", a: "A chat wrapper can — a general model with your logo, not wired to your systems, with no training. That can be a fair pilot; it is not an implementation, because it never touches your operation." },
			{ q: "What takes the longest in an AI implementation?", a: "Integration, not the model. Getting the AI working takes an afternoon; wiring it into your systems, handling real files and edge cases, and testing until the exception rate is boring takes weeks." },
			{ q: "What makes AI implementation go faster?", a: "Exportable data, one named owner who answers questions in hours, and one workflow instead of five. Approval bottlenecks and a missing system of record are what slow it down." },
		],
	},
	"guides/what-is-an-ai-readiness-audit/index.html": {
		label: "Audit guide FAQ",
		heading: "What an audit delivers.",
		items: [
			{ q: "What does an AI readiness audit cost?", a: "Ours costs $3,500–$8,500, fixed in writing before work begins, and takes 2–4 weeks. The price is published in full on the pricing page — no discovery call required to learn it." },
			{ q: "What do you get at the end of an AI readiness audit?", a: "Four things in writing: a workflow map of your real operations with hours and costs on each step, a shortlist of where AI genuinely pays with rough dollar ranges, a phased implementation plan, and outright ownership of the document. It is vendor-neutral and usable with any builder, or alone." },
			{ q: "Is an AI readiness audit the same as an AI strategy engagement?", a: "No. Strategy engagements typically cost $25,000–$100,000 and deliver a vision deck and roadmap without prices; an audit is a short diagnostic that produces your numbers — hours, costs, and a shortlist. It is also not a sales document: sometimes the written conclusion is to wait a quarter and build nothing yet." },
			{ q: "Can you see a sample audit before buying one?", a: "Yes. We publish two redacted pages of a real audit deliverable at mainandmachine.com/services/sample-audit/, and you should ask any firm you are considering for the equivalent." },
		],
	},
	"guides/ai-data-cloud-vs-on-prem/index.html": {
		label: "Data guide FAQ",
		heading: "Where AI data goes.",
		items: [
			{ q: "Does ChatGPT use my business data to train its models?", a: "On business and API tiers, the major providers' standard terms say no; consumer and free tiers often permit training use unless you opt out. Check the tier you are actually on — the data terms live in the plan, not the model." },
			{ q: "Does a small business need on-premise AI?", a: "Usually not. On-prem earns its cost in three situations: a regulator can ask where your data went, a contract forbids third-party processing, or a breach of one dataset would end the business. Otherwise a business-tier cloud deployment, with PII stripping where customer data flows, is the right call." },
			{ q: "How do you use AI on regulated data like health or lending records?", a: "Run the model on hardware you control so records never leave, and strip identifying details before any model reads a document. That is how MARCUS runs at an SBA lender: 14 agents entirely on-prem, PII removed by Microsoft Presidio first, encrypted at rest, with an append-only tamper-evident audit log." },
			{ q: "What is the middle path between cloud AI and on-premise AI?", a: "Local PII stripping before cloud calls: software on your side replaces names, numbers, and identifiers with placeholders, and only the redacted text travels to the cloud model. You get cloud-grade models without shipping the sensitive details, at far less cost than hosting a model yourself." },
		],
	},
	"guides/chatgpt-vs-custom-ai/index.html": {
		label: "Subscription guide FAQ",
		heading: "Seats versus systems.",
		items: [
			{ q: "Is a ChatGPT subscription enough for a small business?", a: "For individual work — drafting, research, brainstorming — yes, and you should exhaust the $20–$30 seat before buying anything custom. It stalls where work is repeatable, spans multiple systems, must run unattended, or needs an audit trail." },
			{ q: "What does custom AI cost compared to ChatGPT seats?", a: "Twenty seats run about $6,000 a year at $25 per user per month. A custom system is an AI Implementation Sprint at $12,000–$45,000, fixed in writing before work begins, plus typically $50–$500 a month to run." },
			{ q: "Why do ChatGPT rollouts fail in small businesses?", a: "Because seats get bought without any workflow being redesigned around them, so adoption fades within weeks and the licenses become shelfware. That outcome is evidence a change was never planned, not evidence AI failed." },
			{ q: "Should you try ChatGPT before hiring an AI consultant?", a: "Yes. A month of seats for your heaviest writers and researchers is the cheapest AI readiness test that exists — and if nobody uses the $25 tool, do not buy the $25,000 system, because the constraint is adoption, not capability." },
		],
	},
	"guides/signs-you-are-not-ready-for-ai/index.html": {
		label: "Not-ready FAQ",
		heading: "Ready or not.",
		items: [
			{ q: "How do I know if my business is ready for AI?", a: "Check six things: workflows two people describe the same way, data living in systems rather than in someone's head, a named person with 2–3 hours a week to review outputs, no unresolved people problems underneath the workflow, a budget that covers $50–$500 a month in running costs, and a reason better than a competitor mentioned AI." },
			{ q: "What should I do before hiring an AI consultant?", a: "Write down your top three workflows one page each, pick one system of record for every fact that matters, take the free 14-question AI-Ready Score, read two plain-English essays on what AI can and cannot do, and run one $25-a-month tool with a named owner for 90 days." },
			{ q: "How much does it cost to get ready for AI?", a: "Almost nothing. The 90-day preparation plan costs about $25 a month in subscription fees plus a few afternoons of writing workflows down — no consultant required." },
			{ q: "Will an AI consultant tell me if I'm not ready?", a: "A good one will. Our free 30-minute assessment ends with \"wait\" when that is the true answer, and an AI Readiness Audit ($3,500–$8,500) sometimes recommends holding off in writing." },
		],
	},
	"guides/how-to-scope-an-ai-project/index.html": {
		label: "Scoping FAQ",
		heading: "Scoping it tight.",
		items: [
			{ q: "What should an AI project scope include?", a: "One workflow named end-to-end, its current annual cost in hours times loaded rate, acceptance criteria written in operations language, an explicit out-of-scope list, ownership of everything at handoff, the vendor's stated monthly run cost, and a fixed price in writing before work begins." },
			{ q: "How do vendors inflate AI project scopes?", a: "Four patterns recur: discovery phases that never end, \"phase 1\" pricing that hides unpriced later phases, proprietary-platform lock-in presented as architecture, and change-order pipelines that reprice every ambiguity after you are committed." },
			{ q: "Should an AI project be priced hourly or fixed?", a: "Fixed, in writing, before work begins — that single clause moves scope risk to the vendor. Our AI Readiness Audits run $3,500–$8,500 and Implementation Sprints $12,000–$45,000 on exactly those terms." },
			{ q: "How long should an AI implementation take?", a: "About 90 days per workflow is a fair yardstick. Our Implementation Sprints run 4–12 weeks; a project with no end date is an inflation pattern, not a plan." },
		],
	},
	"guides/ai-roi-math-small-business/index.html": {
		label: "ROI math FAQ",
		heading: "The model, published.",
		items: [
			{ q: "How do you calculate AI ROI for a small business?", a: "Model two lines against one cost: manual work ($2,400–$4,000 per employee per year depending on industry) plus lost capacity ($1,800–$2,800 per employee per year), against an implementation estimate of $720 per employee, floored at $12,000 and capped at $45,000. Treat the result as a first read, never a promise." },
			{ q: "What does AI implementation cost for a 25-person firm?", a: "About $18,000 in our published model ($720 × 25 employees), which sits inside our Implementation Sprint range of $12,000–$45,000, quoted as a fixed price in writing before work begins." },
			{ q: "Is the ROI of AI guaranteed?", a: "No, and anyone guaranteeing it is selling. The math breaks when the workflows are not truly repetitive, when adoption fails, or when the estimate counts work you would never have staffed anyway." },
			{ q: "Where do the per-employee ROI numbers come from?", a: "They are our published model assumptions — the same rates behind our online ROI calculator — stated as team-wide averages. An AI Readiness Audit ($3,500–$8,500, 2–4 weeks) replaces them with your measured numbers." },
		],
	},
	"guides/ai-for-the-skeptical-owner/index.html": {
		label: "Skeptic FAQ",
		heading: "For the skeptic.",
		items: [
			{ q: "Do most AI projects really fail?", a: "Yes. Boston Consulting Group's 2024 study found 78% of companies that spent on AI saw essentially nothing move; only 22% turned the spending into measurable results." },
			{ q: "Does a small business actually need AI?", a: "Not necessarily, and for many businesses not yet. The cost of waiting is modeled, not guaranteed — but repetitive manual work compounds quietly through hiring cycles, so it is worth measuring before dismissing." },
			{ q: "What can an AI skeptic try without committing money?", a: "Take the free 14-question AI-Ready Score (about 7 minutes, no sales call), work through a free readiness checklist, and run one $25-a-month tool with a named owner for 90 days. If nothing sticks, stop — that result is real information." },
			{ q: "Is skepticism a problem when adopting AI?", a: "The opposite. Demanding proof, rejecting vendor magic, and keeping a named person accountable are the traits that separate working projects from the 78% that move nothing." },
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
