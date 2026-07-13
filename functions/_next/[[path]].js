// COMPAT ONLY: the Score app now ships basePath '/score', so its HTML asks
// for assets at /score/_next/* (covered by functions/score). This route only
// serves browsers holding pre-basePath cached HTML that still references
// bare /_next/* — lib/score-proxy.mjs rewrites those onto /score/_next/*.
// Safe to delete after a few weeks in production.
import { proxyScore } from "../../lib/score-proxy.mjs";
export const onRequest = proxyScore;
