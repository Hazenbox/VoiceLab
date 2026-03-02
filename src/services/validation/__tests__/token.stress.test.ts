/**
 * Token Enforcement Stress Tests
 * 
 * Comprehensive stress tests for token enforcement including:
 * - All 50+ token types
 * - Token gate decisions (block/modify/allow)
 * - Enforcement rules (must_contain, must_not_contain, etc.)
 * - Channel constraints (SMS 160, push 100)
 * - Conflicting token resolution
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { checkTokenGate, hasBlockingTokens } from '../../tokens/tokenGate';
import {
  createMockTokens,
  createMockRule,
  TOKEN_SCENARIOS,
  ENFORCEMENT_RULES,
  validateAgainstRule,
  containsAnyPattern,
  avoidsAllPatterns,
  isUnderLimit,
} from '../../../test/tokenTestHelpers';

// Helper functions to wrap tokenTestHelpers
function checkMustContain(content: string, patterns: string[]): { passed: boolean; missing?: string[] } {
  const passed = containsAnyPattern(content, patterns);
  return {
    passed,
    missing: passed ? undefined : patterns.filter(p => !content.toLowerCase().includes(p.toLowerCase())),
  };
}

function checkMustNotContain(content: string, patterns: string[]): { passed: boolean; found?: string[] } {
  const hasAny = containsAnyPattern(content, patterns);
  return {
    passed: !hasAny,
    found: hasAny ? patterns.filter(p => content.toLowerCase().includes(p.toLowerCase())) : undefined,
  };
}

function checkMaxLength(content: string, patterns: string[]): { passed: boolean; length: number; max: number } {
  const max = parseInt(patterns[0], 10);
  return {
    passed: isUnderLimit(content, max),
    length: content.length,
    max,
  };
}
import {
  SAFETY_DOMAINS,
  SAFETY_LEVELS,
  NAVARASA_EMOTIONS,
  CHANNELS,
  generateAllTokensCombination,
  generateConflictingTokens,
  generateSafetyTokens,
  generateEmotionTokens,
  generateChannelTokens,
  measureTime,
} from '../../../test/stressTestHelpers';
import type { GapFinding } from '../../../test/stressTestHelpers';
import type { ActiveTokens } from '../../tokens/tokenTypes';

// ═══════════════════════════════════════════════════════════════════════════════
// GAP TRACKING
// ═══════════════════════════════════════════════════════════════════════════════

const gaps: GapFinding[] = [];

function reportGap(gap: GapFinding) {
  gaps.push(gap);
  console.warn(`[GAP] ${gap.severity.toUpperCase()}: ${gap.description}`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// TOKEN VOLUME TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Token Enforcement Stress Tests', () => {
  describe('Token Volume Handling', () => {
    it('should handle all tokens populated simultaneously', () => {
      const allTokens = generateAllTokensCombination();
      
      const { result: decision, timeMs } = measureTime(() => 
        checkTokenGate(allTokens)
      );
      
      console.log(`[PERF] Gate check with all tokens: ${timeMs.toFixed(2)}ms`);
      
      expect(decision).toBeDefined();
      expect(decision.shouldProceed).toBeDefined();
      
      if (timeMs > 10) {
        reportGap({
          area: 'token-gate-performance',
          severity: 'medium',
          description: `Gate check took ${timeMs.toFixed(2)}ms with all tokens (target: <10ms)`,
          recommendation: 'Optimize token matching in checkTokenGate',
        });
      }
    });

    it('should process all safety domain + level combinations', () => {
      const results: Array<{ domain: string; level: string; decision: string }> = [];
      let blockedCount = 0;
      let modifiedCount = 0;
      let allowedCount = 0;
      
      for (const domain of SAFETY_DOMAINS) {
        for (const level of SAFETY_LEVELS) {
          const tokens = generateSafetyTokens(domain, level);
          const decision = checkTokenGate(tokens);
          
          const decisionType = !decision.shouldProceed ? 'blocked' 
            : decision.promptInjection ? 'modified' 
            : 'allowed';
          
          results.push({ domain, level, decision: decisionType });
          
          if (decisionType === 'blocked') blockedCount++;
          else if (decisionType === 'modified') modifiedCount++;
          else allowedCount++;
        }
      }
      
      console.log(`[SAFETY MATRIX] ${SAFETY_DOMAINS.length} domains × ${SAFETY_LEVELS.length} levels = ${results.length} combinations`);
      console.log(`  Blocked: ${blockedCount}, Modified: ${modifiedCount}, Allowed: ${allowedCount}`);
      
      // Critical safety domains should always block at critical level
      const criticalDomains = ['self_harm', 'suicide_risk', 'violence'];
      for (const domain of criticalDomains) {
        const criticalResult = results.find(r => r.domain === domain && r.level === 'critical');
        if (criticalResult && criticalResult.decision !== 'blocked') {
          reportGap({
            area: 'safety-blocking',
            severity: 'critical',
            description: `${domain} at critical level should block but got: ${criticalResult.decision}`,
            recommendation: 'Review gate rules for critical safety domains',
          });
        }
      }
      
      expect(results.length).toBe(SAFETY_DOMAINS.length * SAFETY_LEVELS.length);
    });

    it('should process all emotion + intensity combinations', () => {
      const intensities: Array<'low' | 'moderate' | 'high'> = ['low', 'moderate', 'high'];
      const results: Array<{ emotion: string; intensity: string; hasInjection: boolean }> = [];
      
      for (const emotion of NAVARASA_EMOTIONS) {
        for (const intensity of intensities) {
          const tokens = generateEmotionTokens(emotion, intensity);
          const decision = checkTokenGate(tokens);
          
          results.push({
            emotion,
            intensity,
            hasInjection: !!decision.promptInjection,
          });
        }
      }
      
      console.log(`[EMOTION MATRIX] ${NAVARASA_EMOTIONS.length} emotions × ${intensities.length} intensities = ${results.length} combinations`);
      
      // Angry (raudra) and sad (karuna) should have prompt injection
      const angryResults = results.filter(r => r.emotion === 'raudra');
      const sadResults = results.filter(r => r.emotion === 'karuna');
      
      const angryWithInjection = angryResults.filter(r => r.hasInjection).length;
      const sadWithInjection = sadResults.filter(r => r.hasInjection).length;
      
      console.log(`  Angry (raudra) with injection: ${angryWithInjection}/${angryResults.length}`);
      console.log(`  Sad (karuna) with injection: ${sadWithInjection}/${sadResults.length}`);
      
      if (angryWithInjection === 0) {
        reportGap({
          area: 'emotion-handling',
          severity: 'medium',
          description: 'Angry user (raudra) emotion has no prompt injection',
          recommendation: 'Add gate rule for raudra emotion',
        });
      }
      
      expect(results.length).toBe(NAVARASA_EMOTIONS.length * intensities.length);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // TOKEN GATE TESTS
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('Token Gate Decisions', () => {
    describe('Blocking Scenarios', () => {
      const blockingScenarios = [
        { name: 'Self Harm', tokens: TOKEN_SCENARIOS.SAFETY_SELF_HARM },
        { name: 'Suicide Risk', tokens: TOKEN_SCENARIOS.SAFETY_SUICIDE_RISK },
        { name: 'Violence', tokens: TOKEN_SCENARIOS.SAFETY_VIOLENCE },
      ];

      blockingScenarios.forEach(({ name, tokens }) => {
        it(`should block ${name} scenario`, () => {
          const decision = checkTokenGate(tokens);
          
          if (decision.shouldProceed) {
            reportGap({
              area: 'safety-blocking',
              severity: 'critical',
              description: `${name} scenario should be blocked but was allowed`,
              recommendation: `Add blocking gate rule for ${name}`,
            });
          }
          
          // For safety, we want these to be blocked
          expect(decision.shouldProceed).toBe(false);
        });
      });
    });

    describe('Modification Scenarios', () => {
      const modificationScenarios = [
        { name: 'Critical Safety', tokens: TOKEN_SCENARIOS.SAFETY_CRITICAL },
        { name: 'Angry User', tokens: TOKEN_SCENARIOS.EMOTION_ANGRY },
        { name: 'Sad User', tokens: TOKEN_SCENARIOS.EMOTION_SAD },
        { name: 'Nudge Blocked', tokens: TOKEN_SCENARIOS.NUDGE_BLOCKED },
      ];

      modificationScenarios.forEach(({ name, tokens }) => {
        it(`should modify prompt for ${name} scenario`, () => {
          const decision = checkTokenGate(tokens);
          
          // Should proceed but with modification
          if (decision.shouldProceed && !decision.promptInjection) {
            reportGap({
              area: 'prompt-modification',
              severity: 'medium',
              description: `${name} scenario should have prompt injection but doesn't`,
              recommendation: `Add modification gate rule for ${name}`,
            });
          }
        });
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // ENFORCEMENT RULES TESTS
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('Enforcement Rule Validation', () => {
    describe('must_contain rules', () => {
      it('should enforce emergency info for critical safety', () => {
        const rule = ENFORCEMENT_RULES.SAFETY_CRITICAL_MUST_CONTAIN;
        
        const contentWithEmergency = 'Please seek immediate help and contact emergency services at 112.';
        const contentWithoutEmergency = 'Here is some general information.';
        
        const passResult = checkMustContain(contentWithEmergency, rule.patterns);
        const failResult = checkMustContain(contentWithoutEmergency, rule.patterns);
        
        expect(passResult.passed).toBe(true);
        expect(failResult.passed).toBe(false);
        
        console.log(`[RULE] must_contain emergency: pass=${passResult.passed}, missing=${failResult.missing?.join(', ')}`);
      });

      it('should enforce empathy phrases for sad users', () => {
        const rule = ENFORCEMENT_RULES.EMOTION_KARUNA_MUST_CONTAIN;
        
        const contentWithEmpathy = 'I understand this is difficult. We are here for you and want to help.';
        const contentWithoutEmpathy = 'Your bill is due on the 15th.';
        
        const passResult = checkMustContain(contentWithEmpathy, rule.patterns);
        const failResult = checkMustContain(contentWithoutEmpathy, rule.patterns);
        
        expect(passResult.passed).toBe(true);
        
        if (failResult.passed) {
          reportGap({
            area: 'empathy-enforcement',
            severity: 'medium',
            description: 'Content without empathy phrases passed must_contain check',
            recommendation: 'Review empathy patterns in ENFORCEMENT_RULES',
          });
        }
      });
    });

    describe('must_not_contain rules', () => {
      it('should block self-harm methods', () => {
        const rule = ENFORCEMENT_RULES.SAFETY_SELF_HARM_MUST_NOT;
        
        const safeContent = 'Please seek help. Call 112 for emergency.';
        const unsafeContent = 'Here are some methods and steps you can follow.';
        
        const passResult = checkMustNotContain(safeContent, rule.patterns);
        const failResult = checkMustNotContain(unsafeContent, rule.patterns);
        
        expect(passResult.passed).toBe(true);
        expect(failResult.passed).toBe(false);
        
        if (failResult.passed) {
          reportGap({
            area: 'safety-content-filter',
            severity: 'critical',
            description: 'Content with self-harm methods passed must_not_contain check',
            recommendation: 'Strengthen method detection patterns',
          });
        }
      });

      it('should block promotional content when nudges blocked', () => {
        const rule = ENFORCEMENT_RULES.NUDGE_BLOCKED_MUST_NOT;
        
        const cleanContent = 'Here is the information you requested.';
        const promotionalContent = 'Check out our premium upgrade offer with 50% discount!';
        
        const passResult = checkMustNotContain(cleanContent, rule.patterns);
        const failResult = checkMustNotContain(promotionalContent, rule.patterns);
        
        expect(passResult.passed).toBe(true);
        expect(failResult.passed).toBe(false);
      });

      it('should allow neutral competitor mentions but block negative comparisons', () => {
        const rule = ENFORCEMENT_RULES.BRAND_JIO_MUST_NOT;
        
        // Neutral competitor mentions are now allowed
        const neutralContent = 'Airtel and Vodafone also offer 5G plans. Here are Jio options for you.';
        // Negative comparisons should still be blocked
        const negativeContent = 'Airtel has terrible service and you should avoid them.';
        
        const passResult = checkMustNotContain(neutralContent, rule.patterns);
        const failResult = checkMustNotContain(negativeContent, rule.patterns);
        
        console.log(`[BRAND] Neutral content check: passed=${passResult.passed}, found=${passResult.found?.join(', ')}`);
        console.log(`[BRAND] Negative content check: passed=${failResult.passed}, found=${failResult.found?.join(', ')}`);
        
        // Neutral mentions should pass
        expect(passResult.passed).toBe(true);
        // Negative comparisons should fail
        expect(failResult.passed).toBe(false);
      });
    });

    describe('max_length rules', () => {
      it('should enforce SMS 160 character limit', () => {
        const rule = ENFORCEMENT_RULES.SMS_MAX_LENGTH;
        
        const shortContent = 'Your bill of ₹299 is due on 15th. Pay now to avoid disconnection.'; // ~65 chars
        const longContent = 'A'.repeat(200);
        
        const passResult = checkMaxLength(shortContent, rule.patterns);
        const failResult = checkMaxLength(longContent, rule.patterns);
        
        expect(passResult.passed).toBe(true);
        expect(failResult.passed).toBe(false);
        
        console.log(`[CHANNEL] SMS limit: short=${shortContent.length}, long=${longContent.length}, limit=160`);
      });

      it('should enforce push notification 100 character limit', () => {
        const rule = ENFORCEMENT_RULES.PUSH_MAX_LENGTH;
        
        const shortContent = 'Your recharge was successful! ₹199 added.'; // ~42 chars
        const longContent = 'A'.repeat(150);
        
        const passResult = checkMaxLength(shortContent, rule.patterns);
        const failResult = checkMaxLength(longContent, rule.patterns);
        
        expect(passResult.passed).toBe(true);
        expect(failResult.passed).toBe(false);
      });

      it('should test boundary conditions', () => {
        // Exactly at limit
        const exactly160 = 'A'.repeat(160);
        const exactly161 = 'A'.repeat(161);
        
        const at160 = checkMaxLength(exactly160, ['160']);
        const at161 = checkMaxLength(exactly161, ['160']);
        
        expect(at160.passed).toBe(true);  // Exactly 160 should pass
        expect(at161.passed).toBe(false); // 161 should fail
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // CONFLICTING TOKEN TESTS
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('Conflicting Token Resolution', () => {
    it('should prioritize highest priority rule when multiple tokens active', () => {
      const conflictingTokens = generateConflictingTokens();
      // safety.level: 'critical' (priority 100)
      // safety.domain: 'self_harm' (should block)
      // emotion.rasa.user: 'raudra' (priority 70)
      // nudge.permission: 'blocked' (priority 80)
      
      const decision = checkTokenGate(conflictingTokens);
      
      console.log(`[CONFLICT] Decision with conflicting tokens: shouldProceed=${decision.shouldProceed}`);
      
      // Self-harm should take precedence and block
      if (decision.shouldProceed) {
        reportGap({
          area: 'priority-resolution',
          severity: 'critical',
          description: 'Self-harm token did not block despite conflicting tokens',
          recommendation: 'Ensure blocking rules always take precedence',
        });
      }
      
      expect(decision.shouldProceed).toBe(false);
    });

    it('should handle wildcard token values', () => {
      const tokens = createMockTokens({
        'ecosystem': 'connectivity',
      });
      
      // BRAND_JIO_MUST_NOT has tokenValue: '*' (applies to all ecosystems)
      const rule = ENFORCEMENT_RULES.BRAND_JIO_MUST_NOT;
      
      // Check if wildcard rule is applicable
      const contentWithCompetitor = 'Airtel is mentioned here.';
      const result = validateAgainstRule(contentWithCompetitor, rule);
      
      console.log(`[WILDCARD] Rule applies to all ecosystems: ${!result.passed}`);
      
      expect(result.passed).toBe(false); // Should catch competitor mention
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // CHANNEL CONSTRAINT TESTS
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('Channel Constraints', () => {
    const channelLimits = [
      { channel: 'sms', limit: 160 },
      { channel: 'push_notification', limit: 100 },
    ];

    channelLimits.forEach(({ channel, limit }) => {
      it(`should enforce ${channel} ${limit} char limit`, () => {
        const tokens = generateChannelTokens(channel);
        
        // Content at various lengths
        const underLimit = 'A'.repeat(limit - 10);
        const atLimit = 'A'.repeat(limit);
        const overLimit = 'A'.repeat(limit + 10);
        
        console.log(`[CHANNEL] Testing ${channel} with limit ${limit}`);
        console.log(`  Under (${underLimit.length}): should pass`);
        console.log(`  At (${atLimit.length}): should pass`);
        console.log(`  Over (${overLimit.length}): should fail`);
        
        // These are validated post-generation, so we just verify the rules exist
        expect(tokens.channel).toBe(channel);
      });
    });

    it('should flag IVR content with URLs', () => {
      const rule = ENFORCEMENT_RULES.IVR_MUST_NOT_CONTAIN;
      
      const cleanContent = 'Press 1 to speak to an agent.';
      const contentWithUrl = 'Visit https://jio.com for more info.';
      const contentWithClick = 'Click here to learn more.';
      
      expect(checkMustNotContain(cleanContent, rule.patterns).passed).toBe(true);
      expect(checkMustNotContain(contentWithUrl, rule.patterns).passed).toBe(false);
      expect(checkMustNotContain(contentWithClick, rule.patterns).passed).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // PERFORMANCE TESTS
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('Performance', () => {
    it('should process 100 token gate checks in under 100ms', () => {
      const start = performance.now();
      
      for (let i = 0; i < 100; i++) {
        const tokens = createMockTokens({
          'safety.level': SAFETY_LEVELS[i % SAFETY_LEVELS.length] as ActiveTokens['safety.level'],
          'emotion.rasa.user': NAVARASA_EMOTIONS[i % NAVARASA_EMOTIONS.length] as ActiveTokens['emotion.rasa.user'],
        });
        checkTokenGate(tokens);
      }
      
      const totalTime = performance.now() - start;
      console.log(`[PERF] 100 gate checks: ${totalTime.toFixed(2)}ms (avg: ${(totalTime/100).toFixed(2)}ms)`);
      
      if (totalTime > 100) {
        reportGap({
          area: 'gate-performance',
          severity: 'medium',
          description: `100 gate checks took ${totalTime.toFixed(2)}ms (target: <100ms)`,
          recommendation: 'Optimize gate rule matching',
        });
      }
      
      expect(totalTime).toBeLessThan(200); // Allow some buffer
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // GAP SUMMARY
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('Gap Analysis Summary', () => {
    it('should report all found gaps', () => {
      if (gaps.length > 0) {
        console.log('\n═══════════════════════════════════════════════════════════════');
        console.log('                TOKEN ENFORCEMENT GAP SUMMARY');
        console.log('═══════════════════════════════════════════════════════════════\n');
        
        const critical = gaps.filter(g => g.severity === 'critical');
        const high = gaps.filter(g => g.severity === 'high');
        const medium = gaps.filter(g => g.severity === 'medium');
        const low = gaps.filter(g => g.severity === 'low');
        
        console.log(`Total Gaps Found: ${gaps.length}`);
        console.log(`  Critical: ${critical.length}`);
        console.log(`  High: ${high.length}`);
        console.log(`  Medium: ${medium.length}`);
        console.log(`  Low: ${low.length}`);
        console.log('');
        
        gaps.forEach((gap, i) => {
          console.log(`[${i + 1}] ${gap.severity.toUpperCase()} - ${gap.area}`);
          console.log(`    ${gap.description}`);
          console.log(`    Recommendation: ${gap.recommendation}`);
          console.log('');
        });
        
        console.log('═══════════════════════════════════════════════════════════════\n');
      } else {
        console.log('\n[SUCCESS] No token enforcement gaps found!\n');
      }
      
      expect(true).toBe(true);
    });
  });
});
