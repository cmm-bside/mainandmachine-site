import { claimText } from "../../src/data/approved-claims.mjs";

// FAQ content for service / industry / overview pages, injected as BOTH
// FAQPage JSON-LD and a visible <details> block by scripts/inject-faq.mjs
// (idempotent — safe to re-run). Answers are plain text so the visible copy
// and the structured data stay byte-identical, which is what AI engines and
// rich results expect. Facts mirror src/data/company.mjs; prices use the
// published format and are guarded by check-facts.mjs.

// Shared answer fragments — keep prices/locations consistent everywhere.
const COST =
	"The AI Readiness Audit runs $3,500–$8,500, and 100% of the fee credits toward a sprint signed within 60 days, up to 25% of the sprint price. An AI Implementation Sprint runs $18,000–$60,000, quoted as a fixed price in writing before any work begins — and if a scoped workflow is not live within 90 days, we keep building at no charge until it is. Managed Services runs from $1,500 a month with no lock-in.";
const COST_SHORT =
	"The AI Readiness Audit runs $3,500–$8,500; an AI Implementation Sprint runs $18,000–$60,000, quoted fixed in writing before work begins. If a scoped workflow is not live within 90 days, we keep building at no charge until it is.";
// NOTE: there is deliberately no shared REMOTE / TIMELINE answer any more.
// One constant reused across six pages produced six byte-identical answers,
// which is duplicate content in the eyes of both a crawler and a reader. The
// FACTS (two hubs, remote across the US, 2–4 weeks, 4–12 weeks, 90 days) stay
// identical everywhere and are guarded by check-facts.mjs; the prose around
// them is written per page. Reach for a shared constant only when the answer
// genuinely has no page-specific angle — see COST / COST_SHORT below, which
// are quoted price lists where varying the wording would be worse.
const TIMELINE =
	"An AI Readiness Audit takes 2 to 4 weeks. An AI Implementation Sprint runs 4 to 12 weeks — about 90 days per workflow. Managed Services is ongoing.";
const FREE = claimText("assessment");

export const FAQ = {
	"guides/index.html": {
		label: "Field Guide FAQ",
		heading: "About the Field Guide.",
		items: [
			{ q: "What is the Field Guide?", a: "Practical guides to the buying questions around AI consulting — what it costs, whether you are ready, hiring versus engaging, and how to vet a firm — written with our real published prices as the spine." },
			{ q: "How is the Field Guide different from The Ampersand?", a: "The Ampersand is essays on how the machine works and what it means, a few times a month. The Field Guide answers commercial questions with numbers. Read the essays to understand; read the guides to decide." },
			{ q: "Are the prices in these guides real?", a: "Our audit and implementation prices are published offers: audits $3,500–$8,500 and sprints $18,000–$60,000, with a fixed quote before work begins. Worked examples are labeled assumptions, not competitor quotes or promised outcomes." },
		],
	},
	"guides/ai-consultant-cost/index.html": {
		label: "Cost guide FAQ",
		heading: "What AI consulting costs.",
		items: [
			{ q: "How much does an AI consultant cost per hour?", a: "An hourly rate alone does not establish the project cost. Ask for estimated hours, a spending cap, named deliverables, and the assumptions behind the estimate. Main & Machine quotes agreed audits and builds at a fixed price." },
			{ q: "How much should a small business budget for AI consulting?", a: "Before audit credits and ongoing costs, the audit and build total $21,500–$68,500: an AI Readiness Audit at $3,500–$8,500 plus an Implementation Sprint at $18,000–$60,000, fixed in writing before work begins — with 100% of the audit fee credited toward the sprint when it is signed within 60 days, up to 25% of the sprint price." },
			{ q: "How do I compare proposals?", a: "Compare the same workflow and deliverables, including integration, testing, ownership, training, and ongoing costs. A proposal with a different scope is not a useful price comparison." },
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
			{ q: "Should a small business hire an AI engineer?", a: "Consider a hire when you have a continuous technical backlog, an internal manager who can evaluate the work, and budget for salary, benefits, tools, and ramp-up. A defined first workflow may fit a fixed-price engagement better; headcount alone does not decide." },
			{ q: "How much does an in-house AI hire cost?", a: "Budget the actual role and location: salary plus benefits, payroll costs, recruiting, management time, tools, and ramp-up. A published salary benchmark is not a fully loaded hiring quote. Compare the same delivery period and scope with an external proposal." },
			{ q: "What does doing nothing about AI cost?", a: "Measure the workflow before assigning a cost to waiting. The calculator estimates potential value from stated assumptions; it does not measure actual loss. Time returned is capacity and becomes cash savings only when spending is actually avoided or reduced." },
			{ q: "Can a consultant hand off to an internal team?", a: "Our builds include documentation and team training, with ownership and handoff responsibilities agreed in scope. Name an internal owner who can review the system, manage access, and decide when further technical help is needed." },
		],
	},
	"guides/how-to-choose-an-ai-consultant/index.html": {
		label: "Vetting FAQ",
		heading: "Vetting an AI consultant.",
		items: [
			{ q: "What should I ask an AI consultant before hiring them?", a: "Ten questions: the exact cost and when you learn it, whether they guarantee ROI (they should not), the real timeline, who scopes versus who builds, whether they can say wait, tool incentives, where your data goes, who can overrule the system, what you own at handoff, and proof of a real build." },
			{ q: "What are red flags when hiring an AI consultant?", a: "Guaranteed ROI numbers, transformation promised in weeks, prices only available after a discovery sequence, unverifiable scarcity, tool recommendations that always land on a partner product, and case studies with no names." },
			{ q: "Should an AI consultant guarantee ROI?", a: "No — and a guarantee is itself a red flag. Real results depend on your execution, so a serious firm quotes ranges and publishes its assumptions." },
			{ q: "What should you own at the end of an AI project?", a: "Everything: the systems, credentials, documentation, and prompts, with your team trained to run them. Ongoing help should be optional — ours is a monthly retainer from $1,500 with no lock-in." },
		],
	},
	"guides/what-ai-automation-costs-to-run/index.html": {
		label: "Running costs FAQ",
		heading: "What it costs to run.",
		items: [
			{ q: "How much does AI automation cost to run per month?", a: "The $50–$500 monthly planning band covers an illustrative small workflow’s tools and model usage. It excludes the build, internal labor, hardware, and optional Managed Services, which starts at $1,500 a month. Actual usage and vendor terms determine the running cost." },
			{ q: "How much does AI model usage actually cost?", a: "Estimate input and output volume using the chosen provider’s current rates, then allow for retries, long documents, testing, and peak demand. A small pilot measured against real files is more useful than a universal monthly allowance." },
			{ q: "Do I have to pay for AI maintenance after the build?", a: "Someone has to own the system: a named person in-house spending a few hours a month, or a maintenance retainer. Ours is Managed Services — a monthly retainer from $1,500 with no lock-in, priced by what is running." },
			{ q: "Is AI automation ever not worth the running cost?", a: "Yes. Compare the value of the work with build costs, ongoing fees, internal review time, and the cost of errors. Frequency matters, but a low-volume task can still be worthwhile when its value or risk is high." },
		],
	},
	"guides/ai-agents-vs-automations-vs-integrations/index.html": {
		label: "Agents vs. automations FAQ",
		heading: "Sorting the three words.",
		items: [
			{ q: "What is the difference between an AI agent and an automation?", a: "An automation is a fixed rule that runs every time — if X, then Y, deterministic. An agent reads context and drafts judgment-shaped work for a person to approve; it interprets rather than follows a rule." },
			{ q: "What is an integration?", a: "Two systems finally talking to each other: data moves automatically between them and no judgment is involved. It is usually the cheapest of the three, and sometimes free with a native connector." },
			{ q: "Do most small businesses need an AI agent?", a: "Usually not. Most businesses that ask for an agent need an automation — cheaper to build, more reliable in production, and finished sooner. Agents earn their cost only where the work genuinely requires reading and judgment." },
			{ q: "Are AI agents more expensive to build than automations?", a: "Yes. Within our AI Implementation Sprint band of $18,000–$60,000, fixed in writing before work begins, integration-and-automation work sits toward the bottom and agent work toward the top." },
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
			{ q: "What does an AI readiness audit cost?", a: "Ours costs $3,500–$8,500, fixed in writing before work begins, and takes 2–4 weeks. 100% of the fee credits toward a sprint signed within 60 days, up to 25% of the sprint price. The price is published in full on the pricing page — no discovery call required to learn it." },
			{ q: "What do you get at the end of an AI readiness audit?", a: "Four things in writing: a workflow map of your real operations with hours and costs on each step, a shortlist of where AI genuinely pays with rough dollar ranges, a phased implementation plan, and outright ownership of the document. It is vendor-neutral and usable with any builder, or alone." },
			{ q: "Is an AI readiness audit the same as an AI strategy engagement?", a: "The names alone do not tell you what you will receive. Our audit maps workflows, records inputs and assumptions, ranks opportunities, and recommends phased next steps. Compare deliverables and decision criteria; an audit can recommend waiting rather than building." },
			{ q: "Can you see a sample audit before buying one?", a: "Yes. Four illustrative pages at mainandmachine.com/services/sample-audit/ show a workflow map, ranked opportunities, an economic worksheet, and a phased recommendation. The business and figures are fictional, not client findings or a quote." },
		],
	},
	"guides/ai-data-cloud-vs-on-prem/index.html": {
		label: "Data guide FAQ",
		heading: "Where AI data goes.",
		items: [
			{ q: "Does ChatGPT use my business data to train its models?", a: "OpenAI states that its business products and API do not use business data for training by default. Consumer settings and other providers have different terms. Check the exact product, retention settings, connected tools, and current agreement before using sensitive records." },
			{ q: "Does a small business need on-premise AI?", a: "The answer depends on the records, contracts, access requirements, and operating budget. Local processing can help restrict data routes, while approved cloud services may fit other workflows. Neither deployment choice alone makes a system compliant or private." },
			{ q: "How do you use AI on regulated data like health or lending records?", a: claimText("marcusArchitecture") + " " + claimText("privacyFilter") },
			{ q: "What is the middle path between cloud AI and on-premise AI?", a: "A hybrid deployment can process documents locally and send selected, filtered text to an external model. Identifier detection can miss sensitive information; decide what may leave, test the filter, and prohibit external processing where the risk or agreement requires it." },
		],
	},
	"guides/chatgpt-vs-custom-ai/index.html": {
		label: "Subscription guide FAQ",
		heading: "Seats versus systems.",
		items: [
			{ q: "Is a ChatGPT subscription enough for a small business?", a: "It may be enough for individual drafting, research, and brainstorming. Test a defined workflow with approved data before buying a custom build. Repeatable work spanning several systems may need integrations, review controls, and monitoring." },
			{ q: "What does custom AI cost compared to ChatGPT seats?", a: "Compare the provider’s current seat price times users and billing period with the full custom workflow cost. Our Implementation Sprints cost $18,000–$60,000, plus running costs and any optional support; the two options deliver different scope." },
			{ q: "Why do ChatGPT rollouts fail in small businesses?", a: "Because seats get bought without any workflow being redesigned around them, so adoption fades within weeks and the licenses become shelfware. That outcome is evidence a change was never planned, not evidence AI failed." },
			{ q: "Should you try ChatGPT before hiring an AI consultant?", a: "A limited trial can reveal whether a subscription solves the workflow. Assign an owner, define approved data, and measure usage and output quality. Low adoption is a reason to investigate the workflow and training before investing further." },
		],
	},
	"guides/signs-you-are-not-ready-for-ai/index.html": {
		label: "Not-ready FAQ",
		heading: "Ready or not.",
		items: [
			{ q: "How do I know if my business is ready for AI?", a: "Check six things: workflows two people describe the same way, data living in systems rather than in someone's head, a named person with 2–3 hours a week to review outputs, no unresolved people problems underneath the workflow, a budget that covers tools, model usage, internal review, and any paid support, and a reason better than a competitor mentioned AI." },
			{ q: "What should I do before hiring an AI consultant?", a: "Write down your top three workflows, identify the system of record, name an owner, and estimate volume and review effort. The free AI-Ready Score can help prioritize what to investigate before committing to a build." },
			{ q: "How much does it cost to get ready for AI?", a: "Documenting workflows and taking the free AI-Ready Score do not require a consultant or a paid tool. They still take staff time. If you trial software, budget its current subscription price and the time needed to evaluate it." },
			{ q: "Will an AI consultant tell me if I'm not ready?", a: "A good one will. Our free 30-minute assessment ends with \"wait\" when that is the true answer, and an AI Readiness Audit ($3,500–$8,500) sometimes recommends holding off in writing." },
		],
	},
	"guides/how-to-scope-an-ai-project/index.html": {
		label: "Scoping FAQ",
		heading: "Scoping it tight.",
		items: [
			{ q: "What should an AI project scope include?", a: "One workflow named end-to-end, its current annual cost in hours times loaded rate, acceptance criteria written in operations language, an explicit out-of-scope list, ownership of everything at handoff, the vendor's stated monthly run cost, and a fixed price in writing before work begins." },
			{ q: "How do vendors inflate AI project scopes?", a: "Four patterns recur: discovery phases that never end, \"phase 1\" pricing that hides unpriced later phases, proprietary-platform lock-in presented as architecture, and change-order pipelines that reprice every ambiguity after you are committed." },
			{ q: "Should an AI project be priced hourly or fixed?", a: "Fixed, in writing, before work begins — that single clause moves scope risk to the vendor. Our AI Readiness Audits run $3,500–$8,500 and Implementation Sprints $18,000–$60,000 on exactly those terms." },
			{ q: "How long should an AI implementation take?", a: "About 90 days per workflow is a fair yardstick. Our Implementation Sprints run 4–12 weeks; a project with no end date is an inflation pattern, not a plan." },
		],
	},
	"guides/ai-roi-math-small-business/index.html": {
		label: "ROI math FAQ",
		heading: "The model, published.",
		items: [
			{ q: "How do you calculate AI ROI for a small business?", a: "Apply a capture percentage to the modeled annual opportunity, subtract twelve months of running costs, then subtract the one-time investment for first-year net. The calculator starts with industry assumptions and lets you edit capture and costs. No result is guaranteed." },
			{ q: "What does AI implementation cost for a 25-person firm?", a: "The default planning estimate is $18,000, using $720 × 25 employees. It is not a quote. Actual Implementation Sprints cost $18,000–$60,000, with scope and price agreed in writing before work begins." },
			{ q: "Is the ROI of AI guaranteed?", a: "No, and anyone guaranteeing it is selling. The math breaks when the workflows are not truly repetitive, when adoption fails, or when the estimate counts work you would never have staffed anyway." },
			{ q: "Where do the per-employee ROI numbers come from?", a: "They are our published model assumptions — the same rates behind our online ROI calculator — stated as team-wide averages. An AI Readiness Audit ($3,500–$8,500, 2–4 weeks) replaces them with your measured numbers." },
		],
	},
	"guides/ai-for-the-skeptical-owner/index.html": {
		label: "Skeptic FAQ",
		heading: "For the skeptic.",
		items: [
			{ q: "Do most AI projects really fail?", a: "The cited BCG study reported companies’ progress in realizing value, not the failure rate of every AI project. Use its findings as context; evaluate your own workflow with a baseline, adoption measures, costs, and acceptance criteria." },
			{ q: "Does a small business actually need AI?", a: "Not necessarily, and for many businesses not yet. The cost of waiting is modeled, not guaranteed — but repetitive manual work compounds quietly through hiring cycles, so it is worth measuring before dismissing." },
			{ q: "What can an AI skeptic try without committing money?", a: "Take the free 14-question AI-Ready Score or work through the free readiness checklist. Document one workflow and compare a sample output with the current process using approved tools and data. Staff time still has a cost." },
			{ q: "Is skepticism a problem when adopting AI?", a: "No. Ask for evidence, test assumptions, keep a named owner accountable, and define when to stop. Those habits make it easier to distinguish a useful workflow from an attractive demonstration." },
		],
	},
	"services/sample-audit/index.html": {
		label: "Sample audit FAQ",
		heading: "About this sample document.",
		items: [
			{ q: "What is this page?", a: claimText("sampleAudit") },
			{ q: "What does the full audit cost?", a: "$3,500–$8,500, fixed in writing, over 2 to 4 weeks." },
			{ q: "How do I get one with my workflows in it?", a: FREE },
		],
	},
	"industries/index.html": {
		label: "Industries FAQ",
		heading: "Who this is for.",
		items: [
			{ q: "Which industries do you work with?", a: "Professional services, retail, healthcare, construction, and hospitality — small and mid-size businesses, roughly 5 to 100 people and $1M to $50M in revenue." },
			{ q: "Does the approach change by industry?", a: "The method is the same: map the work, assess costs and constraints, then test a priority workflow. Industry changes the records, review requirements, and operating risks; the expected value must be validated for your business." },
			{ q: "How much does it cost?", a: COST },
			{ q: "Do you work remotely?", a: "Both. Denver, Colorado and Phoenix, Arizona are our two hubs for in-person work; everywhere else in the US is remote. Whichever it is, the method and the fixed prices are the same." },
		],
	},
	"industries/professional-services/index.html": {
		label: "Industry FAQ",
		heading: "AI for professional services firms.",
		items: [
			{ q: "What can AI do for a professional services firm?", a: "Usually the intake and coordination work — qualifying requests, summarizing, routing, and prepping the repetitive documents — so your people spend time on judgment, not handoffs." },
			{ q: "Is our client data safe?", a: "Define approved data routes, access, retention, and review requirements before building. MARCUS processes borrower documents locally and can route selected tasks to external models on filtered text. Filtering can miss identifiers; privileged or restricted files may require additional limits agreed in scope." },
			{ q: "Do we need to replace our practice management software?", a: "No. We build an integration layer on the practice management, billing, and document tools you already run. Nothing gets ripped out; the systems you have start talking to each other." },
			{ q: "What happens to billable-hour economics?", a: "The hours you bill are judgment hours, and those stay human. What the machine takes is the non-billable wrapper — intake write-ups, chasing invoices, reconciling status — so more of the week is billable in the first place. On flat-fee work, the same recovered capacity shows up as margin." },
			{ q: "How much does it cost?", a: COST_SHORT },
			{ q: "How long does it take?", a: "An audit is 2 to 4 weeks; a build is 4 to 12." },
			{ q: "Do you work remotely or on-site?", a: "Firms near our Denver, Colorado or Phoenix, Arizona hubs can put us in the conference room; everyone else in the US works with us remotely. Reading how matters actually move rarely requires a room, and the fixed prices do not change either way." },
			{ q: "Is there a real example?", a: "The closest published case is MARCUS — 14 AI agents we built for B:Side Capital, a regulated lender." },
		],
	},
	"industries/retail/index.html": {
		label: "Industry FAQ",
		heading: "AI for retail and e-commerce businesses.",
		items: [
			{ q: "What can AI do for a retail business?", a: "Usually inventory reconciliation across channels — the daily work of making the shop floor, the webstore, and the marketplace listings agree with each other and with what is actually on the shelf, plus the supplier and returns paperwork that surrounds it." },
			{ q: "What does reconciliation across channels actually mean?", a: "Your POS says one count, the webstore says another, and the marketplace says a third. An agent pulls all three plus the receiving records, finds the lines that disagree, proposes which is right and why, and stages the corrections. A person approves before any count is written back." },
			{ q: "Will it change prices or place orders on its own?", a: "No. It prepares the reorder and flags the margin problem; a person decides. Nothing is purchased, repriced, or listed until someone approves it, and every approval is in the audit log." },
			{ q: "How much does it cost for a retailer?", a: COST_SHORT + " Reconciliation is a candidate when overselling, stock errors, and manual checking justify the total cost." },
			{ q: "How long does it take?", a: "The audit is 2 to 4 weeks. The first build is 4 to 12, and it carries the delivery guarantee: live within 90 days, or we keep building at no charge until it is." },
			{ q: "Do you work remotely or on-site?", a: "We keep hubs in Denver, Colorado and Phoenix, Arizona, so a shop within reach of either gets on-site time; the rest of the US is remote. Walking a stockroom in person helps once — the reconciliation work that follows runs the same remotely, at the same fixed price." },
		],
	},
	"industries/healthcare/index.html": {
		label: "Industry FAQ",
		heading: "AI for medical and dental practices.",
		items: [
			{ q: "What can AI do for a healthcare practice?", a: "The administrative work around the care: intake packets completed and checked before the visit, eligibility and benefits verified, prior-authorization packets assembled from documents you already hold, recalls drafted, and coding prepared for a certified coder to approve. Never the clinical decision." },
			{ q: "Where does our patient data go?", a: "The agreed deployment determines where records are processed. Local models can run on hardware you control; external services require an explicit data-boundary review. Automated privacy filters can miss identifiers and do not replace access controls, required agreements, or a healthcare compliance review." },
			{ q: "What about HIPAA and a business associate agreement?", a: "When a vendor is acting as a business associate, the required agreement and safeguards must be in place before protected health information is shared. Review the proposed data routes with your compliance adviser. We do not claim HIPAA certification; a local model or privacy filter alone does not establish compliance." },
			{ q: "Will it touch clinical decisions?", a: "No. We do not build systems that diagnose, triage, interpret an image or a lab result, adjust a dose, or decide medical necessity. That is a design rule, not a launch limitation. Nothing sends, files, posts, or bills until a licensed person approves it." },
			{ q: "How much does it cost for a practice?", a: COST_SHORT + " Intake or coding preparation may be candidates; the audit tests their value, data requirements, and review workload." },
			{ q: "How long does it take?", a: "Plan on 2 to 4 weeks for the audit and 4 to 12 for the first build, scheduled around clinic hours rather than against them. The guarantee holds either way: live within 90 days, or we keep building at no charge until it is." },
			{ q: "Do you work remotely or on-site?", a: "Practices near Denver, Colorado or Phoenix, Arizona can have us on-site; elsewhere in the US we work remotely. Hardware and installation are agreed only if the approved deployment requires them." },
		],
	},
	"industries/construction/index.html": {
		label: "Industry FAQ",
		heading: "AI for construction businesses.",
		items: [
			{ q: "What can AI do for a construction business?", a: "The paper that holds up payment: pay applications assembled on schedule, lien waivers tracked and chased across every tier, certified-payroll and prevailing-wage documentation prepared, submittal logs kept current, and OSHA logs maintained from what the field already reports." },
			{ q: "Will it work with how the field actually reports?", a: "That is the point. Foremen send photos and texts, not structured data. The agent reads what comes in, matches it to the cost code and the job, and drafts the document — a person in the office approves before anything goes to the GC or the owner." },
			{ q: "What about lien waivers and compliance paper?", a: "Waiver status is tracked per subcontractor per pay period, with the conditional and unconditional versions drafted and the missing ones chased automatically. Certified payroll and prevailing-wage records get assembled from the same source data rather than rebuilt by hand each cycle. A person signs everything." },
			{ q: "How much does it cost for a contractor?", a: COST_SHORT + " Pay-application preparation may be a useful first workflow; test the expected time and collection benefits against build, running, and internal costs. Payback is not guaranteed." },
			{ q: "How long does it take?", a: "The audit runs 2 to 4 weeks and the first build 4 to 12, usually scoped to land between billing cycles. It is guaranteed: live within 90 days, or we keep building at no charge until it is." },
			{ q: "Do you work remotely or on-site?", a: "Denver, Colorado and Phoenix, Arizona are the two hubs we travel from; contractors elsewhere in the US work with us remotely. The job site is not where this work happens — the paperwork is — and the fixed prices are the same wherever you build." },
		],
	},
	"industries/hospitality/index.html": {
		label: "Industry FAQ",
		heading: "AI for restaurants and hospitality operators.",
		items: [
			{ q: "What can AI do for a hospitality operation?", a: "The back-office paper that piles up while you run service: supplier invoices coded and matched to deliveries, tip reporting and allocation prepared for payroll, health-department documentation kept current, and the weekly cost-of-goods picture assembled without anyone keying it twice." },
			{ q: "What about the Monday invoice stack?", a: "That is usually the first build. Invoices arrive by email, PDF, and photo from a dozen suppliers. An agent reads each one, codes it, matches it to what was actually delivered, flags the price changes and short-ships that would otherwise pass unnoticed, and stages it for approval. Nothing posts until a manager approves it." },
			{ q: "Does it handle tip reporting and health-department paper?", a: "Tip reporting and allocation get prepared from the POS data you already have, in the format payroll needs. Health-department documentation — temperature logs, cleaning schedules, certification expiry — gets tracked and the gaps flagged before an inspector finds them. A person signs off; the machine keeps the calendar." },
			{ q: "How much does it cost for a restaurant group?", a: COST_SHORT + " Invoice preparation is a candidate when the volume, review time, and error costs justify a build." },
			{ q: "How long does it take?", a: "Audit: 2 to 4 weeks. First build: 4 to 12. The scoped build carries the delivery guarantee — live within 90 days, or we keep building at no charge until it is." },
			{ q: "Do you work remotely or on-site?", a: "Operators near our Denver, Colorado and Phoenix, Arizona hubs get in-person time; the rest of the US is remote. Either way the work runs off the invoices and POS exports you already have, and the fixed prices do not move." },
		],
	},
};
