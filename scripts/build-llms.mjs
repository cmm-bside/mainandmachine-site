#!/usr/bin/env node
// Generate /llms.txt from the canonical facts file so it can never drift.
// Runs in build:static (and can be run by hand: npm run llms:build).
// The committed llms.txt should always match this script's output —
// facts:check fails the build when it doesn't.
import fs from "node:fs";
import path from "node:path";
import { ROOT } from "./lib/config.mjs";
import { COMPANY } from "../src/data/company.mjs";

const [audit, sprint, managed] = COMPANY.services;

const out = `# ${COMPANY.name}

> AI consulting and implementation for small and mid-size businesses
> (${COMPANY.audience.headcount.replace(/ /g, "")} employees, ${COMPANY.audience.revenue.replace(/ /g, "")} revenue). Fixed-price audits from $3,500;
> implementation sprints $12,000–$45,000, delivered in ~90 days.
> Denver, Phoenix, and remote across the US. Founded by ${COMPANY.founder.name}.
> The free 30-minute assessment is the front door.

## Services

- [${audit.name}](/services/ai-readiness-audit/): $3,500–$8,500,
  2–4 weeks. Workflow map + where AI pays + a phased plan you own.
- [${sprint.name}](/services/implementation-sprint/):
  $12,000–$45,000 fixed quote, 4–12 weeks. Working agents, automations,
  integrations, team training.
- [${managed.name}](/services/managed-services/): monthly retainer,
  no lock-in.

## Free tools

- [The AI-Ready Score](/score) — free seven-minute self-assessment:
  fourteen questions across three phases (Map, Prove, Expand). You get a
  0–100 score and the one constraint to fix first. No sales call.

## Key pages

- [Pricing](/pricing/) — full price list, published
- [Free assessment](/book/) — 30 minutes, reply within 24 hours
- [Method](/method/) · [About](/about/) ·
  [Denver](/denver/) · [Phoenix](/phoenix/)
- [The work](/work/) — builds shown plainly, sample audit included
- [The Ampersand](/blog/) — weekly plain-English AI essays

## Facts

- Founder & Chairman: ${COMPANY.founder.name} (CEO, B:Side Capital + Fund;
  professor, ASU W.P. Carey; author)
- Contact: ${COMPANY.email} · ${COMPANY.phone}
- Every system we build can be explained, questioned, and overruled
  by an accountable human.
`;

fs.writeFileSync(path.join(ROOT, "llms.txt"), out);
console.log("[llms:build] llms.txt generated from src/data/company.mjs");
