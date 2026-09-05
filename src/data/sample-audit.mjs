// Fictional teaching example, not a client result, price quote, or cash forecast.
export const sampleAudit = Object.freeze({
  monthlyRequests: 600,
  manualMinutes: 12,
  reviewMinutes: 5,
  hourlyCapacityValue: 40,
  monthlyOperatingCost: 300,
  illustrativeBuildCost: 18000,
});

export function estimateSampleScenario(eligibleShare, inputs = sampleAudit) {
  for (const key of Object.keys(sampleAudit)) {
    const value = inputs[key];
    if (!Number.isFinite(value) || value < 0) throw new RangeError("Sample inputs must be finite and nonnegative.");
  }
  if (!Number.isFinite(eligibleShare) || eligibleShare < 0 || eligibleShare > 1) {
    throw new RangeError("Eligible share must be between zero and one.");
  }
  const hours = inputs.monthlyRequests * eligibleShare * Math.max(0, inputs.manualMinutes - inputs.reviewMinutes) / 60;
  const capacityValue = hours * inputs.hourlyCapacityValue;
  const netCapacityValue = capacityValue - inputs.monthlyOperatingCost;
  return {
    eligibleShare, hours, capacityValue, netCapacityValue,
    recoveryMonths: netCapacityValue > 0 ? inputs.illustrativeBuildCost / netCapacityValue : null,
  };
}
