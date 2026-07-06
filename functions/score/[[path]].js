// Reverse-proxy /score/* on the apex to the AI-Ready Score app (Vercel).
// Logic in lib/score-proxy.mjs; the app ships standalone (no nav/footer here).
import { proxyScore } from "../../lib/score-proxy.mjs";
export const onRequest = proxyScore;
