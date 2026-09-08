// The build-catalog page model. One entry per named build in
// /services/builds/, which is what turns a catalog card into a page.
//
// SLUGS ARE NEW AND PERMANENT. The catalog cards carry terse DOM ids
// (#receptionist, #chat-booking) that were never meant to be URLs; the slugs
// below are the search-facing form. Once a page ships its slug cannot change
// without a redirect, so they are stated here rather than derived from the id.
//
// PRICE CONTEXT IS A TIER, NEVER A NUMBER. Each build names which published
// service delivers it and the page renders that tier's price from
// site-facts.json via data-fact spans. No build has its own price and none may
// ever acquire one — numbers:check fails on any price in a claim position that
// is not canonical, and that is the guard standing behind this rule.
import { COMPANY } from "../../src/data/company.mjs";

export const BUILDS = [
	// ---- Front of house -----------------------------------------------------
	{
		slug: "ai-receptionist",
		countThis: "missed qualified calls &times; the additional share a prompt response could convert &times; gross profit per booking",
		cardId: "receptionist",
		group: "front",
		name: "24/7 AI Receptionist",
		kicker: "Answering",
		title: "24/7 AI Receptionist for Small Business | Main & Machine",
		description:
			"An AI receptionist for routine calls, questions, and appointment requests, with escalation rules. Delivered in a Sprint, $18,000–$60,000 fixed in writing.",
		// The quotable definition. Answer engines lift the first paragraph, so it
		// has to stand alone with no pronouns pointing back at a headline.
		definition:
			"A 24/7 AI receptionist is a phone system that answers your business line in a natural voice, handles the questions your staff answer twenty times a day, books appointments straight into your calendar, and routes anything urgent to a person. It works the hours nobody is at the desk — nights, weekends, and the middle of a job — and it leaves a written transcript of every call.",
		industries: ["construction", "healthcare", "hospitality", "professional-services"],
		painHeading: "What a missed call actually costs.",
		tier: "sprint",
		faq: [
			["Does it sound like a robot?",
			 "No, and that is the bar we hold it to. It answers in a natural voice, handles interruptions, and hands off mid-sentence when a caller asks for a person. If a caller has to work out what they are talking to, the build is not finished."],
			["What happens when it does not know the answer?",
			 "It says so and routes the call. An agent that guesses at a price, a lead time, or a medical question is worse than voicemail. The escalation path is scoped with you before anything ships, and every handoff is logged."],
			["Can it book straight into our calendar?",
			 "Yes. Booking into the calendar or scheduling system you already use is the normal scope — a receptionist that takes a message and stops has moved the work rather than removed it."],
			["What does it cost?",
			 "It is delivered through an AI Implementation Sprint, quoted fixed in writing before work begins. If a scoped workflow is not live in your operation within 90 days, we keep building at no charge until it is."],
		],
	},
	{
		slug: "website-chat-booking-agent",
		countThis: "additional qualified enquiries captured &times; conversion to booked work &times; gross profit per booking",
		cardId: "chat-booking",
		group: "front",
		name: "Website Chat & Booking Agent",
		kicker: "Booking",
		title: "Website Chat & Booking Agent | Main & Machine",
		description:
			"A website chat agent that answers from your own documents and books the appointment. Delivered in a Sprint, $18,000–$60,000 fixed in writing.",
		definition:
			"A website chat and booking agent is a chat window on your site that answers questions using your own pricing, policies, and service documents, then books the appointment while the visitor is still reading. It is not a decision-tree widget with five canned buttons: it reads what you actually publish, answers in sentences, and hands to a person when the question is outside what it has been given.",
		industries: ["professional-services", "retail", "healthcare", "hospitality"],
		painHeading: "What the contact form is costing you.",
		tier: "sprint",
		faq: [
			["How is this different from a chatbot widget?",
			 "A widget matches keywords against a script somebody wrote once. This reads your real documents — the price list, the service area, the intake policy — and answers from them. When you change the document, the answer changes."],
			["Will it make things up?",
			 "We ground responses in your approved documents and test unsupported questions, conflicting information, and handoffs before launch. Errors remain possible, so the scope sets the permitted actions, review requirements, and escalation path."],
			["Can it book, or only answer?",
			 "Booking is the point. Answering without booking moves a question from the phone to the chat window and leaves the appointment unmade."],
			["What does it cost?",
			 "It is delivered through an AI Implementation Sprint. The written quote specifies the integrations, knowledge sources, booking rules, and review requirements included in the scope."],
		],
	},
	{
		slug: "instant-lead-response",
		countThis: "qualified leads receiving a faster reply &times; the incremental conversion rate &times; gross profit per job",
		cardId: "lead-response",
		group: "front",
		name: "Instant Lead Response",
		kicker: "Follow-up",
		title: "Instant Lead Response for Small Business | Main & Machine",
		description:
			"Drafts timely lead replies and follow-ups in your voice, with review and escalation rules. Delivered in a Sprint, $18,000–$60,000 fixed in writing.",
		definition:
			"Instant lead response prepares tailored replies and follow-ups using your approved service information. Start with drafts your team reviews before sending. Optional automatic sending covers only agreed enquiries, with escalation and stop rules. Timing depends on your systems and reviewers; there is no one-minute reply guarantee.",
		industries: ["construction", "professional-services", "retail", "hospitality"],
		painHeading: "What a weekend in the inbox costs.",
		tier: "sprint",
		faq: [
			["Is this just an autoresponder?",
			 "The workflow prepares a reply to the actual enquiry using your approved service information, rather than only sending a receipt acknowledgment. Follow-up drafts use the same boundaries. Whether any message sends automatically or waits for a person is agreed in scope."],
			["Does a person still see the leads?",
			 "Yes. Your team can see the enquiries, prepared replies, sent messages, and handoffs. Anything outside the approved boundary goes to a person. If automatic sending is included, only eligible enquiries may receive approved content without individual review; the scope defines escalation conditions, follow-up limits, and stop rules."],
			["What if we do not want it replying on its own?",
			 "Choose draft-and-approve: the workflow prepares a reply, and your reviewer decides whether and when to send it. This can reduce writing effort, but the customer still waits for review. We measure draft preparation separately from time to a sent response; no one-minute response is promised."],
			["What does it cost?",
			 "It is delivered through an AI Implementation Sprint, quoted fixed in writing before work begins. If a scoped workflow is not live in your operation within 90 days, we keep building at no charge until it is."],
		],
	},
	{
		slug: "missed-call-text-back",
		countThis: "missed qualified calls &times; the share recovered by a text &times; the booking rate &times; gross profit per booking",
		cardId: "text-back",
		group: "front",
		name: "Missed-Call Text-Back",
		kicker: "Recovery",
		title: "Missed-Call Text-Back for Small Business | Main & Machine",
		description:
			"A missed call sends an immediate text with a booking link instead of vanishing. Delivered in a Sprint, $18,000–$60,000 fixed in writing.",
		definition:
			"Missed-call text-back is a system that sends an immediate text message to any caller you could not answer: who you are, when you will call back, and a link to book. It is the smallest build in the catalog and one of the most effective, because a missed call with no voicemail is otherwise a customer you will never know you had.",
		industries: ["construction", "healthcare", "hospitality", "retail"],
		painHeading: "What an unanswered call is worth.",
		tier: "sprint",
		faq: [
			["How fast does the text go out?",
			 "Within seconds of the call ending. The value is entirely in the timing — a text that arrives an hour later reaches somebody who has already called the next business on the list."],
			["Can the caller reply to it?",
			 "Yes, and the reply goes somewhere a person reads. A one-way text that cannot be answered is a notification, not a recovery."],
			["Will this work with our existing phone number?",
			 "That is the normal scope. Keeping your published number is the point; a build that requires a new number throws away the thing customers already have."],
			["What does it cost?",
			 "It is delivered through an AI Implementation Sprint, quoted fixed in writing before work begins. It is usually scoped alongside another front-of-house build rather than on its own."],
		],
	},
	{
		slug: "review-reputation-agent",
		countThis: "completed jobs, review invitations, responses, and the staff time spent requesting and replying to reviews",
		cardId: "reviews",
		group: "front",
		name: "Review & Reputation Agent",
		kicker: "Reputation",
		title: "Review & Reputation Agent for Business | Main & Machine",
		description:
			"Requests honest customer reviews and drafts responses, with service issues handled separately. Delivered in a Sprint, $18,000–$60,000 fixed.",
		definition:
			"A review and reputation agent invites customers to leave an honest review after completed work and drafts responses for your approval. Customers receive the same review opportunity regardless of satisfaction. Service issues go to your team separately, without blocking or delaying a public review.",
		industries: ["hospitality", "healthcare", "retail", "construction"],
		painHeading: "What silence in your review profile costs.",
		tier: "sprint",
		faq: [
			["Is filtering out unhappy customers allowed?",
			 "No. The workflow must not discourage negative reviews or selectively invite positive ones. Customers receive the same review opportunity, and a route to customer support is offered separately."],
			["Does it write fake reviews?",
			 "No, and we would not build that. It asks real customers and drafts your replies. Anything else is fraud and would put your listings at risk."],
			["When does it ask?",
			 "After a defined completion point in your workflow, regardless of customer sentiment. The timing and message follow the review platform’s rules and the customer’s communication preferences."],
			["What does it cost?",
			 "It is delivered through an AI Implementation Sprint, quoted fixed in writing before work begins."],
		],
	},

	// ---- Back of house ------------------------------------------------------
	{
		slug: "private-ai-server",
		countThis: "hours a month your team spends on work they will not put through a public tool &times; loaded hourly cost",
		cardId: "server",
		group: "back",
		name: "Private AI Server",
		kicker: "The hardware",
		title: "Private AI Server for Your Business | Main & Machine",
		description:
			"A machine in your building, bought in your name, running open-source AI locally. Delivered in a Sprint, $18,000–$60,000 fixed in writing.",
		definition:
			"A private AI server is hardware you own, configured to run open-source models locally. It provides a local processing environment for documents and workflows. Any connected external service or commercial-model routing is a separate data-handling choice to review in the scope.",
		industries: ["healthcare", "professional-services", "construction", "retail"],
		painHeading: "What sending your data outside actually risks.",
		tier: "sprint",
		faq: [
			["Do we own the hardware?",
			 "Yes. It is bought in your name and it is your property, not a leased seat. That is the difference between this and every subscription alternative."],
			["What happens if you stop working with us?",
			 "The machine stays where it is and keeps running. You own the hardware and the models on it are open-source, so nothing switches off when an engagement ends."],
			["Is a local model good enough?",
			 "It depends on the task, model, hardware, and quality requirements. We test the intended workflow. If external reasoning is appropriate, the scope explains what filtered information may leave and which controls apply."],
			["What does it cost?",
			 "It is delivered through an AI Implementation Sprint, quoted fixed in writing before work begins. Hardware is quoted as part of that scope, not billed as a surprise afterwards."],
		],
	},
	{
		slug: "data-privacy-filter",
		countThis: "documents a month that currently cannot go near a model &times; the minutes each one costs to handle by hand",
		cardId: "privacy-filter",
		group: "back",
		name: "Data Privacy Filter",
		kicker: "The gatekeeper",
		title: "AI Data Privacy Filter for Business | Main & Machine",
		description:
			"Detects and removes supported identifiers before model processing, with testing and routing controls. Delivered in a Sprint, $18,000–$60,000 fixed.",
		definition:
			"A data privacy filter detects supported personal identifiers in prompts and documents and removes them before model processing. The scope defines whether filtered text stays local or may use an external model. Detection can miss information, so filtering works alongside routing limits, access controls, and tests; it is not a guarantee that regulated data is safe to transmit.",
		industries: ["healthcare", "professional-services", "construction", "retail"],
		painHeading: "What one pasted document can cost.",
		tier: "sprint",
		faq: [
			["What counts as personal information here?",
			 "Names, contact details, account and file numbers, and whatever else your sector treats as identifying — which is a scoping conversation, because a lender, a clinic, and a contractor do not have the same list."],
			["Does the filter slow things down?",
			 "Filtering adds a processing step. Its latency depends on document size, recognizers, and hardware, so it should be measured on the files your team actually uses."],
			["Can we prove it worked?",
			 "Logs show the processing route and recorded actions. Seeded tests measure detection against known identifiers. Neither proves that every identifier was detected in every production document; review both alongside deployment restrictions."],
			["What does it cost?",
			 "It is delivered through an AI Implementation Sprint, quoted fixed in writing before work begins. It is normally scoped alongside the private server rather than on its own."],
		],
	},
	{
		slug: "company-knowledge-base",
		countThis: "times a week someone asks a colleague a question the records already answer &times; both people's time",
		cardId: "knowledge-base",
		group: "back",
		name: "Company Knowledge Base",
		kicker: "The memory",
		title: "AI Company Knowledge Base | Main & Machine",
		description:
			"Your records, emails, notes, and policies joined so one question can cross all of them. Delivered in a Sprint, $18,000–$60,000 fixed.",
		definition:
			"A company knowledge base is everything your business knows, put into a form AI can actually use: the structured records in your systems and the unstructured material around them — emails, notes, policies, job files — joined so a single question can cross both. It is the component that lets the rest of the catalog answer from your business rather than from the internet.",
		industries: ["professional-services", "healthcare", "construction", "retail"],
		painHeading: "What it costs when the answer lives in someone's head.",
		tier: "sprint",
		faq: [
			["Do we have to reorganise our files first?",
			 "We inspect the source records during scoping. Some can be connected as they are; others need cleanup, ownership decisions, or access changes before reliable answers are possible."],
			["Where does it live?",
			 "The scope defines where it runs and who can access each source. A local deployment can keep processing on your hardware; any private-cloud or external component requires its own data review."],
			["What happens when a policy changes?",
			 "The source document must be updated and the knowledge base refreshed. The scope should specify the refresh process and how the team checks that answers use the current version."],
			["What does it cost?",
			 "It is delivered through an AI Implementation Sprint, quoted fixed in writing before work begins."],
		],
	},
	{
		slug: "slack-teams-integration",
		countThis: "minutes per person per day spent switching into a system to check on something &times; headcount",
		cardId: "slack-teams",
		group: "back",
		name: "Slack & Teams Integration",
		kicker: "The front door",
		title: "AI in Slack & Teams for Small Business | Main & Machine",
		description:
			"The system lives where your team already works — no new app, no new login. Delivered in a Sprint, $18,000–$60,000 fixed in writing.",
		definition:
			"A Slack and Teams integration puts the AI system where your team already works, so finished work arrives in the channel they already watch and a person approves it there. No new app, no new login, no training deck. It is the difference between a system people use and a system people were shown once.",
		industries: ["professional-services", "construction", "retail", "healthcare"],
		painHeading: "What another login costs in adoption.",
		tier: "sprint",
		faq: [
			["Does everyone need to learn something new?",
			 "That is what this build exists to avoid. Work shows up in the channel they already read, and approving it is a click in a place they are already standing."],
			["Slack or Teams?",
			 "Whichever you run. If you run both, both — the integration follows your business rather than asking it to standardise first."],
			["Can people approve work from their phone?",
			 "Yes, because the approval happens inside Slack or Teams, which they already have on their phone. That is most of why adoption holds."],
			["What does it cost?",
			 "It is delivered through an AI Implementation Sprint, quoted fixed in writing before work begins. It is normally scoped as part of a larger build rather than alone."],
		],
	},
	{
		slug: "private-company-chat",
		countThis: "staff already using a consumer AI tool &times; hours a week &mdash; that is the work already happening with no log",
		cardId: "company-chat",
		group: "back",
		name: "Private Company Chat",
		kicker: "The workspace",
		title: "Private Company AI Chat | Main & Machine",
		description:
			"Your own chat interface, on your server, behind your filter, connected to your records. Delivered in a Sprint, $18,000–$60,000 fixed.",
		definition:
			"Private company chat connects a company-controlled interface to your models and approved knowledge sources. It gives staff a defined place to ask questions, draft, and summarize, with filtering and access boundaries. Local and external model use are described in the scope, including the relevant provider terms.",
		industries: ["professional-services", "healthcare", "construction", "retail"],
		painHeading: "What staff are already pasting into public tools.",
		tier: "sprint",
		faq: [
			["Our staff already use ChatGPT. Why change?",
			 "A managed interface can limit access to approved records and make review easier. Define where each request is processed, what is logged, and which external routes are permitted; the interface alone does not guarantee privacy."],
			["Is it as good as the consumer tools?",
			 "The useful comparison is your actual workflow: access to the right records, answer quality, controls, and cost. We test those requirements before deciding whether a private setup or an existing business tool is the better fit."],
			["Do we need the server and the knowledge base first?",
			 "Effectively yes — this is the interface onto those two. It is normally scoped together with them rather than bought as a standalone."],
			["What does it cost?",
			 "It is delivered through an AI Implementation Sprint, quoted fixed in writing before work begins."],
		],
	},
	{
		slug: "business-system-connectors",
		countThis: "hours a month spent reconciling two systems by hand &times; loaded hourly cost, plus the cost of one error caught late",
		cardId: "connectors",
		group: "back",
		name: "Business System Connectors",
		kicker: "The plumbing",
		title: "Business System Connectors for AI | Main & Machine",
		description:
			"QuickBooks first: reconciliation prepared, invoices chased, nothing posted without approval. Delivered in a Sprint, $18,000–$60,000 fixed.",
		definition:
			"Business system connectors join the AI system to the software you already run, starting with QuickBooks because that is where Main Street keeps its books. Reconciliation is prepared, invoices are chased, reports are drafted — and nothing posts until a person approves it. The connector is what turns a system that can read into a system that can finish the work.",
		industries: ["professional-services", "construction", "retail", "hospitality"],
		painHeading: "What hand-reconciliation costs every month.",
		tier: "sprint",
		faq: [
			["Which systems do you connect to?",
			 "QuickBooks first, then whatever else runs your operation — CRM, billing, scheduling, field software. More connectors follow the work rather than a published roadmap."],
			["Will it post to our books on its own?",
			 "No. Everything is prepared and staged, and a person approves it. An AI system with unattended write access to the ledger is not something we will build."],
			["What if our software has no API?",
			 "Then that is a scoping finding and you hear it in the audit, before anyone has been quoted for a build that depends on it."],
			["What does it cost?",
			 "It is delivered through an AI Implementation Sprint, quoted fixed in writing before work begins."],
		],
	},
	{
		slug: "testing-and-monitoring",
		countThis: "what one silently-wrong automated action would cost you &mdash; then ask how you would currently find out",
		cardId: "testing",
		group: "back",
		name: "Testing & Monitoring",
		kicker: "The receipts",
		title: "AI Testing & Monitoring | Main & Machine",
		description:
			"Scheduled stress tests, a dashboard you can open yourself, and an audit trail behind every action. Managed Services from $1,500/month.",
		definition:
			"Testing and monitoring is the evidence layer: stress tests that run against your system on a schedule, results on a dashboard you can open yourself, and an audit trail behind every action the system takes. A test suite ships with every build we deliver, because a system you cannot audit is a system you cannot trust. Keeping it watched over time is what Managed Services is.",
		industries: ["healthcare", "professional-services", "construction", "retail"],
		painHeading: "What you cannot prove, you cannot rely on.",
		tier: "managed",
		faq: [
			["Is this an extra we have to buy?",
			 "The test suite and the audit trail ship with every build. What Managed Services adds is somebody continuing to watch the results and act on them after the sprint ends."],
			["What do the tests actually check?",
			 "That the system still does what it was scoped to do — the answers it gives, the things it escalates, and the cases it is supposed to refuse. Models and businesses both drift, and the tests are how you find out which one moved."],
			["Can we see the results ourselves?",
			 "Yes. The dashboard is yours to open, not a report we summarise for you. The audit trail is the same: it is evidence, and evidence you cannot inspect is just a claim."],
			["Is there a lock-in?",
			 "No. Managed Services runs from $1,500 a month with no lock-in, and paying annually runs 12 months for the price of 10 with unused months refunded if you leave."],
		],
	},
];

/** The five industries, for the "who it's for" links. Names match /industries/. */
export const INDUSTRY_NAMES = {
	"professional-services": "Professional services",
	retail: "Retail & e-commerce",
	healthcare: "Healthcare & wellness",
	construction: "Construction & trades",
	hospitality: "Hospitality & food service",
};

export const bySlug = (s) => BUILDS.find((b) => b.slug === s);
export const routeOf = (b) => `/services/builds/${b.slug}/`;
export const tierOf = (b) => COMPANY.services.find((s) => s.key === b.tier);
