# Search and AI visibility measurement

## Measure the business outcome

Use Search Console for non-brand query clicks and impressions, Bing Webmaster Tools for Bing search, and the existing Plausible installation for visits and conversions. The site already emits `workflow_plan_started`, `workflow_plan_details`, `workflow_plan_submitted`, `workflow_plan_submit_issue`, `booking_form_submitted`, and `calendly_booked` events. Configure the corresponding Plausible goals if they are not already present. Event delivery and goal configuration require account verification; a passing build does not establish either.

Keep plan submissions separate from qualified leads and paid implementation opportunities. A CRM or an owner-maintained lead record must supply those later outcomes. Do not add names, email addresses, submitted task descriptions, or customer records to analytics.

## One-time account checks

- Verify the domain in Google Search Console and submit https://www.mainandmachine.com/sitemap.xml. Inspect the homepage, implementation page, four improved build pages, and revised guides/blog posts. A public crawl cannot confirm Google's selected canonical or actual index coverage.
- Verify Bing Webmaster Tools and submit the same sitemap. The existing post-deploy workflow submits changed static pages and authored blog revisions through IndexNow. Acceptance is a notification, not a promise of indexing or ranking.
- Confirm Search Console's current AI-search inclusion settings where available. Google AI search still requires eligible, indexed content; llms.txt does not establish inclusion.
- Review sources and entry pages in Plausible for chatgpt.com, perplexity.ai, claude.ai, copilot.microsoft.com, and gemini.google.com. Interfaces vary; use the account's available source filters. Missing referrers mean some AI-originated visits cannot be identified.
- Review Core Web Vitals in Search Console when field data is available. Lab scores and a single test do not establish real-user performance.

## Monthly comparison

Use the same reporting periods, country/device filters, and non-brand query definition. Compare the last 28 days with the preceding 28 days; add a year-over-year comparison when available. Record release dates and material campaign changes.

Track:
- Non-brand Google clicks/impressions, with landing pages and queries.
- Bing clicks/impressions and crawl/index issues.
- Identifiable AI referral visits and landing pages.
- Accepted workflow-plan submissions, booked calls, qualified leads, and implementation opportunities.
- Overlapping query/page pairs: timeline guide versus delay checklist; audit guide versus audit handoff checklist; ROI model versus measurement log.

Do not merge or redirect a page just because two titles share words. Compare intent, performance, and links first. The September revisions retain existing URLs and give the three articles narrower jobs.

## Fixed AI-search prompt set

Run each prompt with web search enabled in the same selected products. Record date, product/model, region, exact prompt, response/source link where shareable, whether the brand is mentioned, whether our site is cited, which URL, and any factual error. Results vary between runs; a single answer is not a visibility baseline.

1. Who implements AI workflows for small businesses in Denver?
2. Who implements AI workflows for small businesses in Phoenix?
3. What does an AI implementation project cost for a small business?
4. How do I choose between a local and hybrid private AI system?
5. Who can connect an accounting system to business workflows with human approval?
6. How should a company knowledge base handle sources and permissions?
7. How do I measure ROI from AI invoice processing?
8. What should an AI readiness audit deliver?
9. What causes AI implementation delays?
10. What evidence is available about Main & Machine's MARCUS deployment?

Log mentions and citations separately. Citation rate means runs citing our domain divided by completed comparable runs. Keep the sample size visible. Do not infer traffic or sales from citations alone.

## Local presence and evidence

Confirm existing Google Business Profile ownership before editing or creating a listing. Main & Machine describes itself as a service-area business; do not invent storefronts, local clients, memberships, reviews, or staffed offices. Separate city profiles need separate qualifying operations under Google's guidelines. Match the current company name, phone, website, and actual service coverage.

Seek reviews from real customers without incentives or selective positive-only requests. Obtain publication permission for client examples and quotes. Outreach and third-party publication are separate actions; they are not performed by a website deployment.

## Sources

- https://developers.google.com/search/docs/fundamentals/ai-optimization-guide
- https://support.google.com/business/answer/3038177
- https://www.indexnow.org/documentation
