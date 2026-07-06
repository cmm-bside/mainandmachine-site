// The proxied Score app (Next.js) requests its assets from the root namespace
// /_next/* rather than /score/_next/*, so proxy that namespace to the same
// origin or the app renders unstyled. /_next/* is Next-internal and does not
// collide with the plain-HTML main site. (The clean long-term fix is basePath
// '/score' on the app, after which this route can be removed.)
import { proxyScore } from "../../lib/score-proxy.mjs";
export const onRequest = proxyScore;
