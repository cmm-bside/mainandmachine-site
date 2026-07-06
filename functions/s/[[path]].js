// Reverse-proxy /s/* on the apex to the AI-Ready Score app (Vercel) so the
// PRINTED book-QR short links (/s/ch05 etc.) stay on-domain forever. The app
// maps each /s/[tag] to a /score?utm=… landing; that redirect is rewritten
// onto the apex in lib/score-proxy.mjs. Never remove this route.
import { proxyScore } from "../../lib/score-proxy.mjs";
export const onRequest = proxyScore;
