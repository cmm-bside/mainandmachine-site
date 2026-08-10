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
		countThis: "calls that went to voicemail last week &times; the share that would have booked &times; your average job value",
		cardId: "receptionist",
		group: "front",
		name: "24/7 AI Receptionist",
		kicker: "Answering",
		title: "24/7 AI Receptionist for Small Business | Main & Machine",
		description:
			"An AI receptionist that answers every call, handles routine questions, and books appointments. Delivered in a Sprint, $18,000–$60,000 fixed in writing.",
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
		countThis: "visitors who opened the contact form and did not send it &times; your close rate on enquiries that do arrive",
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
			 "It answers from your documents or it says it does not know and offers a person. That constraint is built in at the architecture level, not asked for in a prompt, and it is the single most important thing we test before launch."],
			["Can it book, or only answer?",
			 "Booking is the point. Answering without booking moves a question from the phone to the chat window and leaves the appointment unmade."],
			["What does it cost?",
			 "It is delivered through an AI Implementation Sprint, quoted fixed in writing before work begins. Most first builds land in the lower half of the published range."],
		],
	},
	{
		slug: "instant-lead-response",
		countThis: "leads that arrived outside office hours last month &times; the share still unanswered after an hour &times; average job value",
		cardId: "lead-response",
		group: "front",
		name: "Instant Lead Response",
		kicker: "Follow-up",
		title: "Instant Lead Response for Small Business | Main & Machine",
		description:
			"Every lead gets a real reply in under a minute, then follow-ups drafted in your voice. Delivered in a Sprint, $18,000–$60,000 fixed in writing.",
		definition:
			"Instant lead response is a system that answers every inbound enquiry within a minute of it arriving — web form, email, or ad platform — with a real reply rather than an autoresponder, then keeps drafting follow-ups in your voice until the person answers or asks you to stop. Speed is the whole mechanism: the business that replies first usually wins the job, and most leads that arrive outside office hours are gone by Monday.",
		industries: ["construction", "professional-services", "retail", "hospitality"],
		painHeading: "What a weekend in the inbox costs.",
		tier: "sprint",
		faq: [
			["Is this just an autoresponder?",
			 "No. An autoresponder sends the same paragraph to everyone and tells the reader they have been filed. This drafts a reply to the actual enquiry, using what you publish about your services and prices, and it keeps a thread going rather than firing once."],
			["Does a person still see the leads?",
			 "Yes. Everything it sends is visible to you, and anything outside the scope it was given goes to a person instead of being answered. The point is that nobody waits until Monday, not that nobody reads their mail."],
			["What if we do not want it replying on its own?",
			 "Then it drafts and you send. Draft-and-approve is a normal scope choice, and it still removes most of the delay — the writing is done by the time you open the thread."],
			["What does it cost?",
			 "It is delivered through an AI Implementation Sprint, quoted fixed in writing before work begins. If a scoped workflow is not live in your operation within 90 days, we keep building at no charge until it is."],
		],
	},
	{
		slug: "missed-call-text-back",
		countThis: "unanswered calls in a week &times; the share that never called back &times; average job value",
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
		countThis: "jobs completed last quarter &divide; reviews received &mdash; then ask what one extra review a week is worth in enquiries",
		cardId: "reviews",
		group: "front",
		name: "Review & Reputation Agent",
		kicker: "Reputation",
		title: "Review & Reputation Agent for Business | Main & Machine",
		description:
			"Asks for reviews at the right moment, routes unhappy customers to you first, drafts replies. Delivered in a Sprint, $18,000–$60,000 fixed.",
		definition:
			"A review and reputation agent asks each customer for a review at the moment they are most likely to leave one, routes anyone unhappy to you privately before they post, and drafts your reply to every review that lands. The asymmetry it fixes is simple: satisfied customers forget to write reviews and dissatisfied ones never do.",
		industries: ["hospitality", "healthcare", "retail", "construction"],
		painHeading: "What silence in your review profile costs.",
		tier: "sprint",
		faq: [
			["Is filtering out unhappy customers allowed?",
			 "Nothing is filtered or suppressed. Everyone is asked. What changes is that somebody unhappy gets a route to you first, which is ordinary customer service — and if they still post, the reply is drafted and waiting."],
			["Does it write fake reviews?",
			 "No, and we would not build that. It asks real customers and drafts your replies. Anything else is fraud and would put your listings at risk."],
			["When does it ask?",
			 "At the point in your process where the job is finished and the customer is satisfied — which is a scoping question about your workflow, not a setting. Asking at the wrong moment is why most review requests are ignored."],
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
			"A private AI server is a physical machine in your building, bought in your name, configured to run open-source AI models locally. Other vendors rent you a seat on their server and your data travels to it. This one is your property from the day it is installed, which means the documents it reads never leave the premises and the capability does not disappear if a vendor changes their terms.",
		industries: ["healthcare", "professional-services", "construction", "retail"],
		painHeading: "What sending your data outside actually risks.",
		tier: "sprint",
		faq: [
			["Do we own the hardware?",
			 "Yes. It is bought in your name and it is your property, not a leased seat. That is the difference between this and every subscription alternative."],
			["What happens if you stop working with us?",
			 "The machine stays where it is and keeps running. You own the hardware and the models on it are open-source, so nothing switches off when an engagement ends."],
			["Is a local model good enough?",
			 "For the work small and mid-size businesses actually need — reading documents, drafting, classifying, answering from your own records — yes. Where a task genuinely needs a frontier model, the privacy filter sends cleaned text out and keeps identifiers in."],
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
			"Strips personal information from prompts and documents before anything leaves your building. Delivered in a Sprint, $18,000–$60,000 fixed.",
		definition:
			"A data privacy filter sits between your people and any AI model, stripping personal information out of prompts and documents before anything leaves your building. The cleaned text then goes to a local model or, where the work genuinely needs one, to a commercial model — with the identifiers still on your side of the wall. It is the component that makes AI usable on records you are legally responsible for.",
		industries: ["healthcare", "professional-services", "construction", "retail"],
		painHeading: "What one pasted document can cost.",
		tier: "sprint",
		faq: [
			["What counts as personal information here?",
			 "Names, contact details, account and file numbers, and whatever else your sector treats as identifying — which is a scoping conversation, because a lender, a clinic, and a contractor do not have the same list."],
			["Does the filter slow things down?",
			 "Not in a way anyone notices. It runs on the same machine as the model, so the work stays inside your building rather than making a round trip."],
			["Can we prove it worked?",
			 "That is what the audit trail is for. Every request through the filter is logged, so the question 'did that document leave the building' has a recorded answer rather than an assurance."],
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
			 "No. If a business could tidy its records it would already have done it. The build works against what you have, which is the reason it takes a sprint rather than an afternoon."],
			["Where does it live?",
			 "On your server, behind your filter. A knowledge base is the most sensitive thing in the catalog because it concentrates everything, which is exactly why it should not sit on somebody else's hardware."],
			["What happens when a policy changes?",
			 "You change the document and the answers change with it. That is the point of answering from your records rather than from a script somebody wrote once."],
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
			"Private company chat is your own chat interface — running on your server, behind your privacy filter, connected to your knowledge base. It is what your staff already wanted from the consumer chatbots, without the part where your customer records become somebody else's training data. Staff stop pasting company documents into a public tool because there is finally a better place to ask.",
		industries: ["professional-services", "healthcare", "construction", "retail"],
		painHeading: "What staff are already pasting into public tools.",
		tier: "sprint",
		faq: [
			["Our staff already use ChatGPT. Why change?",
			 "Because you cannot see what they pasted into it. A private interface gives them the same usefulness with your records staying inside the building and an audit trail behind every question."],
			["Is it as good as the consumer tools?",
			 "For work grounded in your own business it is better, because it can read your records and they cannot. For open-ended general questions the frontier models are still ahead, which is what the privacy filter routes to."],
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
