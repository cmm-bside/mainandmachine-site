// Reverse-proxy /s/* on the apex to the AI-Ready Score app (Vercel) so the
// PRINTED book-QR short links (/s/ch05 etc.) stay on-domain forever. The app
// serves it at /score/s/[tag] (basePath) — lib/score-proxy.mjs rewrites the
// path — and answers with a /score?utm=… redirect, which the proxy rewrites
// onto the apex. Never remove this route.
import { proxyScore } from "../../lib/score-proxy.mjs";
export const onRequest = proxyScore;
