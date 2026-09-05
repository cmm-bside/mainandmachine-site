import assert from "node:assert/strict";
import { sampleAudit, estimateSampleScenario } from "../src/data/sample-audit.mjs";
assert.deepEqual(estimateSampleScenario(.3), {
  eligibleShare: .3, hours: 21, capacityValue: 840, netCapacityValue: 540, recoveryMonths: 100 / 3,
});
assert.equal(estimateSampleScenario(.6).hours, 42);
assert.equal(estimateSampleScenario(.6).netCapacityValue, 1380);
assert.equal(estimateSampleScenario(0).recoveryMonths, null);
assert.equal(estimateSampleScenario(1, { ...sampleAudit, reviewMinutes: 20 }).hours, 0);
assert.equal(estimateSampleScenario(1, { ...sampleAudit, hourlyCapacityValue: 0 }).recoveryMonths, null);
for (const share of [-1, 1.1, NaN, Infinity]) assert.throws(() => estimateSampleScenario(share), RangeError);
assert.throws(() => estimateSampleScenario(.6, { ...sampleAudit, monthlyRequests: -1 }), RangeError);
console.log("Sample audit: independent worked examples, no-value cases, and invalid inputs passed.");
