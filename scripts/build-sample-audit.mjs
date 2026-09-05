import fs from "node:fs";
import { sampleAudit as inputs, estimateSampleScenario } from "../src/data/sample-audit.mjs";
const file = new URL("../services/sample-audit/index.html", import.meta.url);
const usd = n => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
const scenarios = [estimateSampleScenario(.3), estimateSampleScenario(.6)];
const row = (label, render) => `<tr><th scope="row">${label}</th>${scenarios.map(s => `<td>${render(s)}</td>`).join("")}</tr>`;
const html = `<div class="sample-assumptions">
  <div><span>Requests per month</span><b>${inputs.monthlyRequests}</b></div>
  <div><span>Manual preparation</span><b>${inputs.manualMinutes} minutes per request</b></div>
  <div><span>Review after preparation</span><b>${inputs.reviewMinutes} minutes per eligible request</b></div>
  <div><span>Value assigned to capacity</span><b>${usd(inputs.hourlyCapacityValue)} per hour</b></div>
  <div><span>Tools and operating allowance</span><b>${usd(inputs.monthlyOperatingCost)} per month</b></div>
  <div><span>Illustrative build budget</span><b>${usd(inputs.illustrativeBuildCost)}</b></div>
</div>
<table class="sample-economics">
  <caption>How the decision changes with eligible request volume</caption>
  <thead><tr><th scope="col">Monthly estimate</th><th scope="col">30% eligible</th><th scope="col">60% eligible</th></tr></thead>
  <tbody>
    ${row("Preparation capacity returned", s => `${s.hours} hours`)}
    ${row("Value assigned to that capacity", s => usd(s.capacityValue))}
    ${row("After the operating allowance", s => usd(s.netCapacityValue))}
    ${row("Build cost ÷ monthly net capacity value", s => s.recoveryMonths === null ? "No positive value" : `${s.recoveryMonths.toFixed(1)} months`)}
  </tbody>
</table>
<p class="sample-formula"><b>Calculation:</b> requests × eligible share × (${inputs.manualMinutes} − ${inputs.reviewMinutes}) minutes ÷ 60 = preparation hours returned. Hours × ${usd(inputs.hourlyCapacityValue)} − ${usd(inputs.monthlyOperatingCost)} = monthly net capacity value.</p>
<p class="sample-caution"><b>Capacity is not cash savings.</b> These assumptions are fictional. The recovery period values freed time; it does not show money earned or payroll reduced. If that time cannot be put to useful work, the benefit may be much lower or zero. Figures exclude discovery fees, taxes, optional Managed Services, separately scoped hardware, and the client's training/change effort. The build budget is an example within the published sprint range, not a quote. <a href="/pricing/">Actual scope, price, and audit-credit terms</a> are agreed separately.</p>`;
const source = fs.readFileSync(file, "utf8");
const region = /<!-- SAMPLE-ECONOMICS -->[\s\S]*?<!-- \/SAMPLE-ECONOMICS -->/;
if (!region.test(source)) throw new Error("Missing sample economics region.");
fs.writeFileSync(file, source.replace(region, `<!-- SAMPLE-ECONOMICS -->\n${html}\n<!-- /SAMPLE-ECONOMICS -->`));
console.log("Sample audit: fictional assumptions and two scenarios rendered.");
