// Narrow guards for retired claims. These are regression tripwires, not an
// automated truth detector. Qualified local-only options and fictional sample
// economics are valid; they are deliberately not banned by generic keywords.
export const RETIRED_CLAIMS = [
  ['unqualified-lead-speed', /(?:every (?:inbound )?lead gets a real reply|replies to every inbound lead|answers every (?:enquiry|inquiry))[^.]{0,45}(?:under|within) (?:a|one) minute/i],
  ['borrower-boundary', /no borrower file (?:leaves|leaving) the building/i],
  ['perfect-filter', /(?:PII is stripped|identifiers are stripped|filter strips identifiers)[^.]{0,90}before any model reads/i],
  ['immutable-log-absolute', /entries can be added, never edited or deleted/i],
  ['unvalidated-priority', /(?:build the highest-payback one|fixed-scope build of the highest-payback workflow)/i],
  ['unalterable-log', /compliance can prove nothing was altered/i],
  ['all-metrics-log', /every figure is reconstructable from[^.]{0,60}audit log/i],
  ['contractor-payback', /first build pays for itself on the pay.application cycle alone/i],
  ['big-four-minimum', /Big Four[^.]{0,100}\$500,000\+\s+minimums/i],
  ['malformed-staff-excerpt', /without adding full-time AI staff daily/i],
  ['malformed-training-excerpt', /scales a weak process company/i],
];

export function claimFindings(text) {
  // Normalize typography/HTML layout without dropping JSON-LD descriptions.
  const plain = String(text)
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]*>/g, tag => ' ' + [...tag.matchAll(/\b(?:content|alt|title|aria-label)=["']([^"']*)["']/gi)].map(match => match[1]).join(' ') + ' ')
    .replace(/&(?:nbsp|#160);/g, ' ')
    .replace(/&(?:mdash|ndash);/g, '-')
    .replace(/\s+/g, ' ');
  return RETIRED_CLAIMS.filter(([, rule]) => rule.test(plain)).map(([id]) => id);
}
