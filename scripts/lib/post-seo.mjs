// Editorial summaries for existing essays whose feed descriptions were too
// short or over the site's display budget. Feed content remains authoritative.
export const POST_SEO_DESCRIPTIONS = {
  'how-much-does-ai-implementation-cost': 'See what drives AI implementation costs, from project scope and integrations to ongoing tools, support, and a written fixed-price quote.',
  'how-to-smell-the-hype': 'Learn how to separate useful AI work from marketing hype, ask better questions, and judge a proposal by what changes inside your business.',
  'sorting-the-vocabulary': 'A plain-English guide to AI vocabulary for business owners: understand the terms before choosing tools, hiring a builder, or scoping a project.',
  'what-a-construction-estimator-should-never-automate': 'Where AI can help construction estimating, where professional judgment belongs, and why the estimator still owns the number sent to a customer.',
  'what-an-agent-actually-is': 'Understand what an AI agent actually does, how it differs from a simple automation, and where human approval belongs in a business workflow.',
  'where-your-data-goes': 'Understand where business data travels when you use AI, what to ask about cloud services, and how deployment choices affect your control.',
  'why-everything-happened-at-once': 'Why AI progress seemed to arrive all at once, what made today’s systems possible, and how a business owner can make sense of the change.',
  'will-this-replace-my-office-manager': 'What AI can take off an office manager’s plate, what still needs a person, and how to think about automation without losing human judgment.',
};

// These summaries are deliberate editorial overrides. Apply them after every
// feed fetch and when building a cached feed so upstream excerpts cannot revive
// malformed endings. They do not change an essay's body or publication date.
export const POST_EXCERPTS = {
  'ai-managed-services': 'AI managed services keep deployed workflows monitored, maintained, and accountable after implementation. Define the systems covered, who reviews exceptions, and what support costs.',
  'ai-employee-training-program': 'An AI employee training program teaches real workflows, protects human judgment, and checks adoption before the business expands the rollout.',
};
POST_SEO_DESCRIPTIONS['ai-managed-services'] = 'Learn what AI managed services cover after implementation, from monitoring and maintenance to review responsibilities, support scope, and costs.';
POST_SEO_DESCRIPTIONS['ai-employee-training-program'] = 'Build an AI employee training program around real workflows, human judgment, clear ownership, and adoption checks before expanding the rollout.';

export function applyPostEditorialOverrides(post) {
  if (POST_SEO_DESCRIPTIONS[post.slug]) post.seoDescription = POST_SEO_DESCRIPTIONS[post.slug];
  if (POST_EXCERPTS[post.slug]) post.excerpt = POST_EXCERPTS[post.slug];
  return post;
}
