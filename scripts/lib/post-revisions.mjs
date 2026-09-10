import fs from 'node:fs';

// Reviewed website editions live outside the upstream archive so a scheduled
// feed sync cannot overwrite them. Keep original URLs and publication dates.
export const POST_REVISIONS = {
  'will-this-replace-my-office-manager': {
    title: 'Will This Replace My Office Manager?',
    excerpt: 'The honest answer is no. Sometimes the honest answer is you should not buy this.',
    seoDescription: 'What AI can take off an office manager’s plate, what still needs a person, and how to think about automation without losing human judgment.',
    file: 'office-manager-marcus-clarification.json',
    updatedAt: '2026-09-10T00:00:00Z',
  },
  'how-long-does-ai-implementation-take': {
    title: 'What Delays an AI Implementation? A Buyer Checklist',
    excerpt: 'Prevent avoidable AI project delays by resolving system access, workflow decisions, acceptance criteria, and operator handoff before they block the build.',
    seoDescription: 'Prevent AI implementation delays with a checklist for system access, decision owners, acceptance criteria, scope changes, and operator handoff.',
    file: 'implementation-delays.json',
  },
  'ai-readiness-audit': {
    title: 'AI Readiness Audit Handoff: What to Check',
    excerpt: 'Use this handoff checklist to inspect an AI audit: traceable findings, complete costs, operating boundaries, and a next step another builder can price.',
    seoDescription: 'Review an AI readiness audit with a practical handoff checklist covering evidence, costs, operating boundaries, acceptance criteria, and next steps.',
    file: 'audit-handoff.json',
  },
  'how-to-measure-ai-roi': {
    title: 'How to Measure AI ROI: Build a Workflow Evidence Log',
    excerpt: 'Record a comparable baseline, preparation and review time, exceptions, costs, and the use of returned capacity before reporting an AI workflow result.',
    seoDescription: 'Build an AI ROI evidence log with baseline workload, preparation and review time, exceptions, operating costs, and the use of returned staff capacity.',
    file: 'roi-measurement-log.json',
  },
};
export function applyPostRevision(post) {
  const revision = POST_REVISIONS[post.slug];
  if (!revision) return post;
  const bodyHtml = JSON.parse(fs.readFileSync(new URL(`../../content/editorial/${revision.file}`, import.meta.url), 'utf8')).bodyHtml;
  Object.assign(post, {
    title: revision.title, seoTitle: revision.title,
    excerpt: revision.excerpt, seoDescription: revision.seoDescription,
    bodyHtml, searchText: bodyHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').toLowerCase().trim(),
    // This date describes this website edition, not later upstream metadata.
    updatedAt: revision.updatedAt || '2026-09-06T00:00:00Z',
  });
  return post;
}
