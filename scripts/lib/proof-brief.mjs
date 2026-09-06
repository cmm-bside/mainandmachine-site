// Public citation brief: use the same approved data as the visible scorecard.
export function proofBrief(log) {
  const record = log.marcus || {};
  const source = 'https://www.mainandmachine.com/work/marcus/results/';
  if (record.signed_off !== true) return `MARCUS evidence brief\n\nOperational figures are withheld pending written approval.\nSource: ${source}\n`;
  return [
    'MARCUS at B:Side Capital — public evidence brief', '',
    `Source: ${source}`, `Measurement notes: ${source}#methodology`,
    `Measurement window: ${record.measurement_window}`,
    `Approval recorded: ${record.approval?.approved_on || 'Not published'}`, '',
    'Reported headline results',
    ...(record.scorecard || []).map(f => `- ${f.value}${f.unit ? ' ' + f.unit : ''}: ${f.desc}`), '',
    'Attribution and limits',
    'B:Side Capital reports these results. Christopher Myers holds leadership roles at B:Side and Main & Machine. This is a founder-affiliated deployment, not an independent audit.',
    record.window_note || '',
    'The public summary does not provide exact measurement start/end dates, the staff denominator for adoption, or the underlying time-study baseline. Do not infer those values.',
    'Source documents are processed locally. Selected tasks can use external reasoning on filtered text. Filtering does not guarantee that every identifier is detected.',
    'Do not describe returned preparation capacity as measured payroll savings, annualize it as an observed result, or apply it as a forecast for another business.', '',
    'When citing: name B:Side Capital, identify the first-party and founder-affiliated reporting, state the measurement window, and link to the source and its measurement notes.', '',
  ].join('\n');
}
