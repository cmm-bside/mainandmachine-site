// Authored scope examples. These describe decisions and acceptance checks,
// not a product compatibility guarantee or an additional client deployment.
export const BUILD_DETAILS = {
  'business-system-connectors': {
    heading: 'What should move between your systems?',
    intro: 'Start with one handoff, such as a vendor invoice becoming a prepared accounting record. Confirm the systems, access, and permitted actions before committing to a connection.',
    sections: [
      ['An invoice-to-accounting example', 'An invoice arrives in an approved inbox. The workflow extracts the supplier, invoice reference, dates, line items, and total; matches the supplier and existing records; then prepares a coding suggestion with the source attached. A reviewer resolves missing information and approves the next action. This is an illustrative scope, not a promise that every account supports the same connection.'],
      ['Decide which record wins', 'Name the source of truth for suppliers, customers, invoice status, and payment status. If accounting and CRM records disagree, the scope should specify whether to pause, flag the difference, or update an approved field. A repeated message should not create a second invoice or contact.'],
      ['Define access and exceptions', 'Review the QuickBooks edition or other accounting platform, available access, subscription requirements, and permission owner. Agree how duplicate documents, unknown suppliers, disputed amounts, unavailable systems, and failed updates reach a person. Posting or payment requires the approval boundary in the scope.'],
      ['Check a completed handoff', 'Test a routine record, a duplicate, a missing field, and a failed connection. The reviewer should be able to inspect the source, see the proposed change, and tell whether the destination accepted it. Measure total preparation and review effort rather than only extraction speed.'],
    ],
    links: [['/blog/automate-invoice-processing-with-ai/', 'Read the invoice-processing walkthrough'], ['/work/marcus/results/', 'Inspect the MARCUS results'], ['/services/ai-implementation/', 'See implementation scope']],
  },
  'company-knowledge-base': {
    heading: 'What should a useful answer include?',
    intro: 'A useful company answer includes a source the reader can inspect and respects who is allowed to see it. Define that behavior using the questions your team already asks.',
    sections: [
      ['Start with a question and its source', 'An illustrative question is: “Which documents are required before this request can be approved?” The expected response points to the current procedure, lists the relevant requirements, and identifies any missing information. It should not invent the status of a record it cannot access.'],
      ['Keep permissions with the information', 'Identify the people or groups allowed to use each collection. Test that a person cannot retrieve restricted content through a summary, a citation, or a follow-up question. Connecting a shared folder does not mean every employee should see every file.'],
      ['Give updates an owner', 'Name the source owner and agree how revised, superseded, and deleted material reaches the knowledge base. Show the source version or date where it helps the reader. If two policies conflict, the workflow should surface the conflict for review rather than quietly choose one.'],
      ['Test missing and conflicting answers', 'Use representative questions with known answers, questions outside the sources, restricted questions, and outdated documents. Check whether the cited source actually supports the answer. Include the time needed to verify and correct responses in your evaluation.'],
    ],
    links: [['/work/marcus/results/', 'Read the published knowledge-work results'], ['/guides/private-ai-for-small-business/', 'Compare private AI arrangements'], ['/services/ai-implementation/', 'See implementation scope']],
  },
  'instant-lead-response': {
    heading: 'From inquiry to a controlled next step.',
    intro: 'Agree what counts as a prepared draft and what counts as a sent response. Name the included channels, eligible automatic sends, and the requests that must wait for a person.',
    sections: [
      ['Capture the request once', 'An illustrative workflow starts with a web inquiry. It records the requested service and available contact details, checks for an existing customer record, and routes the inquiry to its owner. Incomplete or duplicate requests need an explicit handling rule.'],
      ['Prepare a reply from approved material', 'Use the service description, availability rules, and published information agreed in scope. The reply may ask for missing details or suggest the next step. It should not invent a quote, guarantee an appointment, or make a commitment outside its authority.'],
      ['Choose draft-only or bounded sending', 'In draft-only mode, a person reviews and controls the send, so customer response time includes the wait for that reviewer. If automatic sending is in scope, limit it to eligible requests and approved content; specify escalation conditions, follow-up limits, and stop rules. Communication preferences and requests to stop must carry across the sequence. Neither mode carries a blanket one-minute response guarantee.'],
      ['Measure the whole response path', 'Track draft preparation time separately from the time a useful response is sent. Include successful routing, reviewer effort, exceptions, and the resulting appointment or next action. Compare similar inquiries before and after launch. A prepared draft or quick acknowledgment alone does not demonstrate a recovered sale.'],
    ],
    links: [['/blog/ai-lead-response-automation/', 'Read about lead response automation'], ['/blog/how-to-measure-ai-roi/', 'Set up the measurement log'], ['/services/ai-implementation/', 'See implementation scope']],
  },
  'private-ai-server': {
    heading: 'Choose the boundary before the hardware.',
    intro: 'A local server is one part of a private workflow. The scope also needs to cover connected services, access, backups, maintenance, and what happens when the model cannot complete a task.',
    sections: [
      ['List the permitted processing routes', 'Identify the documents, model inputs, outputs, logs, and backups involved. For a local-only workflow, verify that connected components do not introduce an external processing route. For a hybrid workflow, define which tasks and information may use external services.'],
      ['Test the intended work', 'Use representative documents and expected outputs to assess quality, response time, and concurrent use on the proposed hardware. A hardware specification alone cannot establish that a model will meet your workflow requirements. Keep a path to a person when the approved system cannot answer.'],
      ['Price ownership and operation together', 'Include the hardware, configuration, integrations, backups, replacement planning, and the person responsible for updates. A hybrid arrangement also needs external usage and subscription costs. The written quote should distinguish included work from recurring expenses.'],
      ['Plan maintenance and recovery', 'Agree who applies updates, how changes are tested, how access is removed, and how a failed system is restored. A model change should be checked against the workflow’s acceptance examples before the team depends on it.'],
    ],
    links: [['/guides/private-ai-for-small-business/', 'Compare local and hybrid AI'], ['/security/', 'Read the documented data controls'], ['/guides/what-ai-automation-costs-to-run/', 'Review ongoing cost categories']],
  },
};

export function buildDetailHtml(slug, esc) {
  const detail = BUILD_DETAILS[slug];
  if (!detail) return '';
  return `<section class="section paper-2" aria-labelledby="workflow-detail-title">
  <div class="wrap">
    <div class="head-block"><div><span class="kicker">Inside the workflow</span><h2 class="h2 mt-s" id="workflow-detail-title">${esc(detail.heading)}</h2></div><p>${esc(detail.intro)}</p></div>
    <div class="prose-2">${detail.sections.map(([title, body]) => `<div><h3>${esc(title)}</h3><p>${esc(body)}</p></div>`).join('\n')}</div>
    <p class="section-action">${detail.links.map(([href, label]) => `<a href="${href}">${esc(label)}</a>`).join(' &middot; ')}</p>
  </div>
</section>`;
}
