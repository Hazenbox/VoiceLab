/**
 * Compliance Report Generator
 *
 * Converts a FullReport into a structured markdown document
 * for manual review, export, and audit trail.
 */

import type { FullReport, GroupResult, TestResult } from './complianceEvaluator';

function statusIcon(status: string): string {
  switch (status) {
    case 'pass': return 'PASS';
    case 'fail': return 'FAIL';
    case 'warn': return 'WARN';
    case 'error': return 'ERR';
    default: return '---';
  }
}

function pct(n: number, total: number): string {
  if (total === 0) return '0%';
  return `${Math.round((n / total) * 100)}%`;
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`;
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max - 3) + '...';
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXECUTIVE SUMMARY
// ═══════════════════════════════════════════════════════════════════════════════

function renderSummary(report: FullReport): string {
  const lines: string[] = [];
  lines.push('# compliance test report');
  lines.push('');
  lines.push(`**date**: ${new Date(report.timestamp).toLocaleString()}`);
  lines.push(`**duration**: ${formatDuration(report.durationMs)}`);
  lines.push(`**total tests**: ${report.totalTests}`);
  lines.push('');
  lines.push('## executive summary');
  lines.push('');
  lines.push('| metric | value |');
  lines.push('|--------|-------|');
  lines.push(`| overall score | **${Math.round(report.overallScore * 100)}%** |`);
  lines.push(`| pass | ${report.passCount} (${pct(report.passCount, report.totalTests)}) |`);
  lines.push(`| fail | ${report.failCount} (${pct(report.failCount, report.totalTests)}) |`);
  lines.push(`| warn | ${report.warnCount} (${pct(report.warnCount, report.totalTests)}) |`);
  lines.push(`| error | ${report.errorCount} (${pct(report.errorCount, report.totalTests)}) |`);
  lines.push('');

  const compliance = report.totalTests > 0
    ? ((report.passCount + report.warnCount) / report.totalTests) * 100
    : 0;
  lines.push(`**compliance rate (pass + warn)**: ${compliance.toFixed(1)}%`);
  if (compliance >= 90) {
    lines.push('**verdict**: >90% compliance target MET');
  } else {
    lines.push(`**verdict**: below 90% target (${compliance.toFixed(1)}%). action items below.`);
  }
  lines.push('');
  return lines.join('\n');
}

// ═══════════════════════════════════════════════════════════════════════════════
// GROUP BREAKDOWN
// ═══════════════════════════════════════════════════════════════════════════════

function renderGroupSummaryTable(report: FullReport): string {
  const lines: string[] = [];
  lines.push('## group scores');
  lines.push('');
  lines.push('| # | group | tests | pass | fail | warn | err | score |');
  lines.push('|---|-------|-------|------|------|------|-----|-------|');
  report.groups.forEach((g, i) => {
    const total = g.tests.length;
    lines.push(`| ${i + 1} | ${g.groupName} | ${total} | ${g.passCount} | ${g.failCount} | ${g.warnCount} | ${g.errorCount} | ${Math.round(g.score * 100)}% |`);
  });
  lines.push('');
  return lines.join('\n');
}

// ═══════════════════════════════════════════════════════════════════════════════
// DETAILED RESULTS
// ═══════════════════════════════════════════════════════════════════════════════

function renderGroupDetail(group: GroupResult): string {
  const lines: string[] = [];
  lines.push(`### ${group.groupName}`);
  lines.push('');
  lines.push(`score: ${Math.round(group.score * 100)}% | pass: ${group.passCount} | fail: ${group.failCount} | warn: ${group.warnCount}`);
  lines.push('');

  lines.push('| id | description | status | score | notes |');
  lines.push('|----|-------------|--------|-------|-------|');
  for (const t of group.tests) {
    const notes = t.notes.length > 0 ? truncate(t.notes.join('; '), 80) : '-';
    lines.push(`| ${t.testId} | ${t.description} | ${statusIcon(t.status)} | ${Math.round(t.score * 100)}% | ${notes} |`);
  }
  lines.push('');
  return lines.join('\n');
}

// ═══════════════════════════════════════════════════════════════════════════════
// FAILURES DEEP-DIVE
// ═══════════════════════════════════════════════════════════════════════════════

function renderFailures(report: FullReport): string {
  const failures = report.groups.flatMap(g => g.tests.filter(t => t.status === 'fail'));
  if (failures.length === 0) return '## failures\n\nnone.\n';

  const lines: string[] = [];
  lines.push('## failures detail');
  lines.push('');
  for (const f of failures) {
    lines.push(`#### ${f.testId}: ${f.description}`);
    lines.push('');
    lines.push(`- **group**: ${f.group}`);
    lines.push(`- **output**: \`${truncate(f.actualOutput.replace(/\n/g, ' '), 200)}\``);
    if (f.failPatternMatches.length > 0) {
      lines.push(`- **forbidden patterns found**: ${f.failPatternMatches.join(', ')}`);
    }
    if (f.failedPatterns.length > 0) {
      lines.push(`- **missing expected patterns**: ${f.failedPatterns.join(', ')}`);
    }
    if (f.notes.length > 0) {
      lines.push(`- **notes**: ${f.notes.join('; ')}`);
    }
    lines.push('');
  }
  return lines.join('\n');
}

// ═══════════════════════════════════════════════════════════════════════════════
// ACTION ITEMS
// ═══════════════════════════════════════════════════════════════════════════════

function renderActionItems(report: FullReport): string {
  const lines: string[] = [];
  lines.push('## action items');
  lines.push('');

  const worstGroups = [...report.groups]
    .sort((a, b) => a.score - b.score)
    .slice(0, 5)
    .filter(g => g.score < 1);

  if (worstGroups.length === 0) {
    lines.push('all groups at 100%. no action items.');
  } else {
    worstGroups.forEach((g, i) => {
      lines.push(`${i + 1}. **${g.groupName}** (${Math.round(g.score * 100)}%) -- ${g.failCount} failures, ${g.warnCount} warnings`);
    });
  }
  lines.push('');
  return lines.join('\n');
}

// ═══════════════════════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════════════════════

export function generateMarkdownReport(report: FullReport): string {
  const parts: string[] = [];
  parts.push(renderSummary(report));
  parts.push(renderGroupSummaryTable(report));
  parts.push('## detailed results');
  parts.push('');
  for (const group of report.groups) {
    parts.push(renderGroupDetail(group));
  }
  parts.push(renderFailures(report));
  parts.push(renderActionItems(report));
  parts.push('---');
  parts.push(`*report generated at ${report.timestamp}*`);
  return parts.join('\n');
}

export function generateJsonReport(report: FullReport): string {
  return JSON.stringify(report, null, 2);
}
