import type { BrainDetectionResult } from './brain-detector.js';

export function renderBrainStatus(result: BrainDetectionResult): string {
  const lines: string[] = [
    '🧠 Brain Status Report',
    `Checked: ${result.checkedAt}`,
    `Sync: ${result.shouldSync ? '⚠ needs refresh' : '✅ fresh enough'}`,
    `Commits since sync: ${result.hasNewCommitsSinceSync ? '⚠ yes' : '✅ none detected'}`,
    `Doctor: ${result.doctorWarnOrHigher > 0 ? `⚠ ${result.doctorWarnOrHigher} warn/error finding(s)` : '✅ no warn/error findings cached'}`,
    `Plans: ${result.stalePlanCount > 0 ? `⚠ ${result.stalePlanCount} stale in-progress plan(s)` : '✅ no stale in-progress plans'}`,
    `Knowledge: ${result.knowledgeEntries} entries, ${result.knowledgeLines} lines`,
    `Vital Signs block: ${result.vitalsPresent ? '✅ present' : '❌ missing'}`,
    '',
    'Recommended:',
  ];

  if (result.shouldSync) {
    lines.push('- Run `nexus sync`');
  }

  if (result.shouldDoctor) {
    lines.push('- Run `nexus doctor --severity=warn`');
  }

  if (!result.shouldSync && !result.shouldDoctor) {
    lines.push('- Brain looks healthy. Continue current plan execution.');
  }

  if (result.reasons.length > 0) {
    lines.push('', 'Reasons:');
    lines.push(...result.reasons.map((reason) => `- [${reason.code}] ${reason.message}`));
  }

  return lines.join('\n');
}
