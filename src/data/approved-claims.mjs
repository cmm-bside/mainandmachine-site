// Qualified claims grounded in the published security, evidence, and offer pages.
// Keep sources beside reusable wording; these are scope limits, not new results.
export const APPROVED_CLAIMS = {
  assessment: {
    text: 'Start with a free 30-minute assessment to discuss one workflow and the next step. If substantial discovery is needed, we scope a paid audit; a fixed build quote follows an agreed scope.',
    sources: ['/book/', '/services/ai-readiness-audit/', '/pricing/'],
  },
  advisor: {
    text: 'An advisor from Main & Machine discusses your workflow and next step. Christopher Myers is accountable for scoping and sign-off; the build team implements agreed work. Your scheduling confirmation identifies the meeting host.',
    sources: ['/book/', '/about/'],
  },
  assessmentData: {
    text: 'We use your details to respond and assess the requested work, as described in our privacy policy. Requesting an assessment does not subscribe you to marketing.',
    sources: ['/book/', '/privacy/'],
  },
  sampleAudit: {
    text: 'Four sample pages show a workflow map, ranked opportunities, an economic worksheet, and a phased recommendation. The business, inputs, costs, and modeled results are fictional; they are not a client result or quote.',
    sources: ['/services/sample-audit/'],
  },
  marcusArchitecture: {
    text: 'MARCUS processes borrower documents locally on B:Side-owned hardware. Selected tasks can use external models on filtered text. The agreed data boundary determines which processing routes are permitted.',
    sources: ['/security/', '/work/marcus/results/'],
  },
  privacyFilter: {
    text: 'Presidio, originally developed at Microsoft, detects supported personal identifiers for removal before model processing. Automated detection can miss information; filtering is one control alongside routing restrictions, access decisions, and tests using known identifiers.',
    sources: ['/security/', 'https://github.com/data-privacy-stack/presidio/blob/main/docs/faq.md'],
  },
  auditLog: {
    text: 'MARCUS records actions in an append-only, hash-chained audit log. The chain makes changes to recorded entries detectable when verified; it does not independently validate the underlying action or every operational metric.',
    sources: ['/security/', '/work/marcus/results/'],
  },
  evidenceLimits: {
    text: 'MARCUS results are reported by B:Side Capital for the first 90 days of full-fleet operation and reconciled against its audit log. Christopher Myers holds leadership roles at both organizations. These are first-party operational results, not an independent audit or a promise of another client’s outcome.',
    sources: ['/work/marcus/results/', '/about/'],
  },
  timeValue: {
    text: 'Preparation time returned is operating capacity, not automatically reduced payroll or cash savings. Annualized equivalents and calculator scenarios are estimates, not measured annual results or guarantees.',
    sources: ['/work/marcus/results/', '/calculator/', '/guides/ai-roi-math-small-business/'],
  },
};

export const claimText = key => APPROVED_CLAIMS[key].text;

// Operational values must come from the signed-off proof mirror, never a
// remembered fallback number when a case is withheld or incomplete.
export function marcusMeasuredSummary(proof) {
  const keys = ['hours-returned', 'weekly-adoption', 'identifiers-out', 'human-approved'];
  if (!proof?.signedOff || !keys.every(key => proof.figures?.[key]?.value !== undefined))
    return 'Operational figures are withheld until the case data has written approval.';
  return `The first 90-day scorecard reports ${proof.figures['hours-returned'].value} staff hours of preparation returned, ${proof.figures['weekly-adoption'].value}% weekly staff adoption by week six, ${proof.figures['identifiers-out'].value} borrower identifiers sent to an outside model in that window, and ${proof.figures['human-approved'].value}% of consequential actions approved by a person first.`;
}
