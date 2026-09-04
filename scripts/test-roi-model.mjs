import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const modelPath = new URL('../js/roi.js', import.meta.url);
const context = { window: {}, Intl };
vm.runInNewContext(fs.readFileSync(modelPath, 'utf8'), context);
const M = context.window.MMRoi;

const baseline = M.compute('professional-services', 25);
assert.equal(baseline.total, 150000);
assert.equal(baseline.runCost, 1737);
assert.equal(baseline.implementation, 18000);
assert.equal(baseline.annualLow, 17013);
assert.equal(baseline.annualHigh, 148263);
assert.equal(baseline.captured, 18750);
assert.equal(baseline.firstYearNet, -987);
assert.equal(baseline.firstYearHigh, 130263);
const construction = M.compute('construction', 10);
assert.equal(construction.runCost, 884);
assert.equal(construction.annualNet, 5116);
assert.equal(construction.firstYearNet, -12884);

// Independent editable costs/capture, including a true loss and zero capture.
const custom = M.compute('professional-services', 25, { capturePercent: 20, monthlyRunCost: 500, implementation: 30000 });
assert.equal(custom.captured, 30000);
assert.equal(custom.annualNet, 24000);
assert.equal(custom.firstYearNet, -6000);
const zero = M.compute('professional-services', 25, { capturePercent: 0, monthlyRunCost: 500, implementation: 18000 });
assert.equal(zero.firstYearNet, -24000);
assert.equal(M.compute('retail', 25, { capturePercent: 150 }).capturePercent, 100);
assert.equal(M.compute('retail', 25, { capturePercent: -10 }).capturePercent, 0);
assert.equal(M.compute('retail', 25, { capturePercent: 'invalid' }).capturePercent, 12.5);
assert.equal(M.compute('retail', 25, { implementation: 0, monthlyRunCost: 0 }).implementation, 0);

// Legacy annual-range contract remains stable across every supported industry/team.
for (const industry of Object.keys(M.rates)) {
  for (let team = 5; team <= 100; team++) {
    const m = M.compute(industry, team);
    const expectedRun = Math.round((50 + 450 * (team - 5) / 95) * 12);
    assert.equal(m.runCost, expectedRun);
    assert.equal(m.annualLow, m.total * 0.125 - expectedRun);
    assert.equal(m.annualHigh, m.total - expectedRun);
    assert.equal(m.firstYearNet, m.annualNet - m.implementation);
    assert.ok(Number.isFinite(m.firstYearNet));
  }
}
console.log('ROI model: default examples, editable costs/capture and 480 legacy cases passed.');
