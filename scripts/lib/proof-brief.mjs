// Public citation brief: use the same approved data as the visible scorecard.
export function proofBrief(log) {
  const record = log.marcus || {};
  const source = 'https://www.mainandmachine.com/work/marcus/results/';
  if (record.signed_off !== true) return `MARCUS evidence brief\n\nOperational figures are withheld pending written approval.\nSource: ${source}\n`;
  return [
    'MARCUS at B:Side Capital — public evidence brief', '',
    `Source: ${source}`, `Measurement notes: ${source}#methodology`,
    `Measurement window: ${record.measurement_window}`,
    `Methodology clarified: ${record.methodology?.clarified_on || 'Not published'}`, '',
    'Reported headline results',
    ...(record.scorecard || []).map(f => `- ${f.value}${f.unit ? ' ' + f.unit : ''}: ${f.desc}`), '',
    'Attribution and limits',
    'B:Side Capital reports these results. Christopher Myers holds leadership roles at B:Side and Main & Machine. This is a founder-affiliated deployment, not an independent audit.',
    record.window_note || '',
    ...(record.methodology?.staff_denominator ? [`Staff denominator: ${record.methodology.staff_denominator} employees. The reported adoption percentage is rounded; an exact active-user count is not published.`] : []),
    'The reporting period is identified by month, not exact day boundaries. Preparation hours are estimated from initial workflow studies. The detailed calculation worksheet, sample sizes, and treatment of human review and corrections are not published.',
    'Source documents are processed locally. Selected tasks can use external reasoning on filtered text. Filtering does not guarantee that every identifier is detected.',
    'Do not describe returned preparation capacity as measured payroll savings, annualize it as an observed result, or apply it as a forecast for another business.', '',
    'When citing: name B:Side Capital, identify the first-party and founder-affiliated reporting, state the measurement window, and link to the source and its measurement notes.', '',
  ].join('\n');
}
