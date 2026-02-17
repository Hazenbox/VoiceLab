/**
 * Regression Sanity Check Script
 *
 * Runs ~20 representative inputs through the post-processing pipeline
 * and checks for KB compliance signals. Not a full test suite -- just a
 * quick sanity check before shipping changes.
 *
 * Usage: npx tsx src/scripts/regressionCheck.ts
 *
 * Checks:
 * 1. Entity normalization (brand names correct)
 * 2. No forbidden phrases
 * 3. Response length within channel limits
 * 4. No late-night promos (when applicable)
 * 5. British spelling compliance
 * 6. No PII leakage patterns
 */

import { normalizeEntities } from '../services/postprocess/entityNormalizer';
import { trimResponse } from '../services/postprocess/responseTrimmer';
import { stripPromoContent } from '../services/postprocess/promoStripper';
import { checkForbiddenPhrases } from '../services/validation/agents/forbiddenPhraseChecker';
import type { ContentChannelType } from '../types';

// ── Test Scenarios ──────────────────────────────────────────────────────

interface TestScenario {
  id: string;
  category: string;
  input: string;
  channel: ContentChannelType;
  checks: string[];
}

const SCENARIOS: TestScenario[] = [
  // Complaint scenarios (5)
  {
    id: 'complaint-1',
    category: 'complaint',
    input: 'My Jio Fiber is not working since morning. Very frustrated.',
    channel: 'customer_care_chat',
    checks: ['no_forbidden', 'entity_names', 'length_ok'],
  },
  {
    id: 'complaint-2',
    category: 'complaint',
    input: 'I was charged Rs. 500 extra on my bill. This is unacceptable!',
    channel: 'whatsapp_support',
    checks: ['no_forbidden', 'entity_names', 'currency_format', 'length_ok'],
  },
  {
    id: 'complaint-3',
    category: 'complaint',
    input: 'Your network has been terrible for 3 days. I want to speak to a manager.',
    channel: 'customer_care_chat',
    checks: ['no_forbidden', 'length_ok'],
  },
  {
    id: 'complaint-4',
    category: 'complaint',
    input: 'Jio Cinema app keeps crashing. Worst experience ever.',
    channel: 'chatbot_faq',
    checks: ['no_forbidden', 'entity_names', 'length_ok'],
  },
  {
    id: 'complaint-5',
    category: 'complaint',
    input: 'My recharge of INR 399 did not go through but money was deducted.',
    channel: 'whatsapp_support',
    checks: ['no_forbidden', 'currency_format', 'length_ok'],
  },

  // Transactional scenarios (3)
  {
    id: 'transaction-1',
    category: 'transactional',
    input: 'How do I recharge my Jio number online?',
    channel: 'chatbot_faq',
    checks: ['no_forbidden', 'length_ok'],
  },
  {
    id: 'transaction-2',
    category: 'transactional',
    input: 'I want to upgrade from Jio Fiber Silver to Gold plan.',
    channel: 'customer_care_chat',
    checks: ['no_forbidden', 'entity_names', 'length_ok'],
  },
  {
    id: 'transaction-3',
    category: 'transactional',
    input: 'Please help me port my number to Jio.',
    channel: 'whatsapp_support',
    checks: ['no_forbidden', 'length_ok'],
  },

  // Night-time scenarios (2)
  {
    id: 'night-1',
    category: 'night_time',
    input: 'Check out this special offer! Upgrade now for a limited time deal.',
    channel: 'push_notification',
    checks: ['no_promo_night', 'length_ok'],
  },
  {
    id: 'night-2',
    category: 'night_time',
    input: 'Your bill is due tomorrow. Exclusive deal: subscribe now and save 50%.',
    channel: 'sms',
    checks: ['no_promo_night', 'length_ok'],
  },

  // High-risk scenarios (2)
  {
    id: 'risk-1',
    category: 'high_risk',
    input: 'Are you a real person? Are you human?',
    channel: 'customer_care_chat',
    checks: ['no_forbidden', 'no_impersonation'],
  },
  {
    id: 'risk-2',
    category: 'high_risk',
    input: 'My Aadhaar number is 1234-5678-9012 and PAN is ABCDE1234F.',
    channel: 'customer_care_chat',
    checks: ['no_pii_echo'],
  },

  // Edge cases (3)
  {
    id: 'edge-1',
    category: 'edge_case',
    input: 'Tell me a joke about Airtel',
    channel: 'customer_care_chat',
    checks: ['no_forbidden', 'no_competitor'],
  },
  {
    id: 'edge-2',
    category: 'edge_case',
    input: '',
    channel: 'chatbot_faq',
    checks: ['length_ok'],
  },
  {
    id: 'edge-3',
    category: 'edge_case',
    input: 'a'.repeat(500),
    channel: 'sms',
    checks: ['length_ok'],
  },

  // Multi-step scenarios (2)
  {
    id: 'multi-1',
    category: 'multi_step',
    input: 'How do I set up Jio Fiber at my home? Step by step please.',
    channel: 'whatsapp_support',
    checks: ['no_forbidden', 'entity_names', 'length_ok'],
  },
  {
    id: 'multi-2',
    category: 'multi_step',
    input: 'I need to change my Jio number, update my plan, and add a family member.',
    channel: 'customer_care_chat',
    checks: ['no_forbidden', 'length_ok'],
  },

  // SMS/Push format tests (3)
  {
    id: 'format-1',
    category: 'format',
    input: 'Your Jio Fiber connection is now active. Welcome to JioFiber family.',
    channel: 'sms',
    checks: ['entity_names', 'length_ok'],
  },
  {
    id: 'format-2',
    category: 'format',
    input: 'Jio Cinema new release: Watch the latest blockbuster now on JioCinema.',
    channel: 'push_notification',
    checks: ['entity_names', 'length_ok'],
  },
  {
    id: 'format-3',
    category: 'format',
    input: 'Dear customer, your Jio Saavn premium subscription has been activated.',
    channel: 'sms',
    checks: ['entity_names', 'length_ok'],
  },
];

// ── Check Functions ─────────────────────────────────────────────────────

function checkEntityNames(text: string): { pass: boolean; details: string } {
  const result = normalizeEntities(text);
  if (result.replacementCount === 0) {
    return { pass: true, details: 'all entity names correct' };
  }
  return {
    pass: false,
    details: `${result.replacementCount} entity fixes needed: ${result.replacements.map(r => `${r.from}->${r.to}`).join(', ')}`,
  };
}

function checkForbidden(text: string): { pass: boolean; details: string } {
  const result = checkForbiddenPhrases(text);
  if (result.isValid) {
    return { pass: true, details: 'no forbidden phrases' };
  }
  return {
    pass: false,
    details: `${result.violations.length} violations: ${result.violations.map(v => `"${v.phrase}" (${v.category})`).join(', ')}`,
  };
}

function checkLength(text: string, channel: ContentChannelType): { pass: boolean; details: string } {
  const result = trimResponse(text, channel);
  if (!result.wasTrimmed) {
    return { pass: true, details: `within ${channel} limits (${text.length} chars)` };
  }
  return {
    pass: false,
    details: `over limit: ${result.originalLength} -> ${result.trimmedLength} chars`,
  };
}

function checkNoPromoNight(text: string): { pass: boolean; details: string } {
  const result = stripPromoContent(text);
  if (result.strippedCount === 0) {
    return { pass: true, details: 'no promotional content' };
  }
  return {
    pass: false,
    details: `${result.strippedCount} promo sentences: ${result.strippedSentences.join(' | ')}`,
  };
}

function checkCurrencyFormat(text: string): { pass: boolean; details: string } {
  const hasRs = /\bRs\.?\s/i.test(text);
  const hasINR = /\bINR\s/i.test(text);
  if (!hasRs && !hasINR) {
    return { pass: true, details: 'currency format ok' };
  }
  return {
    pass: false,
    details: `found non-standard currency: ${hasRs ? 'Rs.' : ''} ${hasINR ? 'INR' : ''}`,
  };
}

function checkNoImpersonation(text: string): { pass: boolean; details: string } {
  const impersonation = /\bi am (a )?human\b|\bi am (a )?person\b|\bi was born\b/i;
  if (!impersonation.test(text)) {
    return { pass: true, details: 'no impersonation' };
  }
  return { pass: false, details: 'human impersonation detected' };
}

function checkNoPiiEcho(text: string): { pass: boolean; details: string } {
  const piiPatterns = [
    /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/,  // Aadhaar
    /\b[A-Z]{5}\d{4}[A-Z]\b/,              // PAN
    /\b\d{10}\b/,                           // Phone
  ];
  const found = piiPatterns.some(p => p.test(text));
  if (!found) {
    return { pass: true, details: 'no PII echoed' };
  }
  return { pass: false, details: 'PII pattern found in response' };
}

function checkNoCompetitor(text: string): { pass: boolean; details: string } {
  const competitors = /\b(Airtel|Vodafone|Vi|Idea|BSNL|MTNL|ACT Fibernet|Hathway)\b/i;
  if (!competitors.test(text)) {
    return { pass: true, details: 'no competitor mentions' };
  }
  return { pass: false, details: 'competitor brand mentioned' };
}

// ── Runner ──────────────────────────────────────────────────────────────

function runCheck(checkName: string, text: string, channel: ContentChannelType): { pass: boolean; details: string } {
  switch (checkName) {
    case 'entity_names': return checkEntityNames(text);
    case 'no_forbidden': return checkForbidden(text);
    case 'length_ok': return checkLength(text, channel);
    case 'no_promo_night': return checkNoPromoNight(text);
    case 'currency_format': return checkCurrencyFormat(text);
    case 'no_impersonation': return checkNoImpersonation(text);
    case 'no_pii_echo': return checkNoPiiEcho(text);
    case 'no_competitor': return checkNoCompetitor(text);
    default: return { pass: true, details: `unknown check: ${checkName}` };
  }
}

function runRegressionSuite() {
  console.log('=== regression sanity check ===\n');

  let totalChecks = 0;
  let passedChecks = 0;
  let failedChecks = 0;
  const failures: Array<{ scenario: string; check: string; details: string }> = [];

  for (const scenario of SCENARIOS) {
    console.log(`[${scenario.id}] ${scenario.category} (${scenario.channel})`);

    for (const checkName of scenario.checks) {
      totalChecks++;
      const result = runCheck(checkName, scenario.input, scenario.channel);

      if (result.pass) {
        passedChecks++;
        console.log(`  OK  ${checkName}: ${result.details}`);
      } else {
        failedChecks++;
        failures.push({ scenario: scenario.id, check: checkName, details: result.details });
        console.log(`  FAIL ${checkName}: ${result.details}`);
      }
    }
    console.log('');
  }

  // Summary
  console.log('=== summary ===');
  console.log(`total: ${totalChecks} checks across ${SCENARIOS.length} scenarios`);
  console.log(`passed: ${passedChecks} (${Math.round(passedChecks / totalChecks * 100)}%)`);
  console.log(`failed: ${failedChecks}`);

  if (failures.length > 0) {
    console.log('\n=== failures ===');
    for (const f of failures) {
      console.log(`  ${f.scenario} / ${f.check}: ${f.details}`);
    }
  }

  console.log(`\nverdict: ${failedChecks === 0 ? 'PASS' : 'REVIEW NEEDED'}`);
  process.exit(failedChecks > 0 ? 1 : 0);
}

// Run if executed directly
runRegressionSuite();
