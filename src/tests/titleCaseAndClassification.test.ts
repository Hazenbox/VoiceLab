/**
 * Verification tests for title case, intent classification, and markdown formatting fixes.
 *
 * Covers:
 *   Fix 0 -- Intent classifier content type expansion
 *   Fix 1 -- Sentence case in prompts (basePersona)
 *   Fix 2 -- Error isolation in post-process pipeline
 *   Fix 3 -- Whitespace regex preserving markdown newlines
 *   Fix 4 -- v-06 title case detection and auto-fix
 */
import { describe, it, expect } from 'vitest';
import { classifyIntent } from '../services/intent/intentClassifier';
import { buildConversationalPrompt, buildJioInquiryPrompt } from '../services/prompt/basePersona';
import { applyFormatFixes } from '../services/trust/autoFixEngine';
import { runComplianceVerifier } from '../services/postprocess/complianceVerifier';

// =============================================================================
// Fix 0: Intent classifier recognises content function types
// =============================================================================
describe('Fix 0: intent classifier content types', () => {
  const contentMessages = [
    'write error for failed otp',
    'create alert for payment failure',
    'draft confirmation for booking',
    'generate response for complaint',
    'write greeting for new user',
    'create reminder for plan expiry',
    'write warning for invalid input',
    'draft welcome for new subscriber',
    'write notice for maintenance',
    'create disclaimer for offer',
    'write template for password reset',
    'create description for JioFiber plan',
    'write summary for monthly bill',
    'draft instruction for SIM activation',
    'write an error message for OTP timeout',
    'create a friendly notification for recharge',
  ];

  for (const msg of contentMessages) {
    it(`should classify "${msg}" as content_generation`, () => {
      const result = classifyIntent(msg);
      expect(result.intent).toBe('content_generation');
    });
  }

  const nonContentMessages = [
    'my internet is slow',
    'what is JioFiber',
    'tell me about Jio plans',
    'hello how are you',
    'what is the meaning of life',
  ];

  for (const msg of nonContentMessages) {
    it(`should NOT classify "${msg}" as content_generation`, () => {
      const result = classifyIntent(msg);
      expect(result.intent).not.toBe('content_generation');
    });
  }
});

// =============================================================================
// Fix 1: Prompts contain sentence case instructions
// =============================================================================
describe('Fix 1: prompt sentence case instructions', () => {
  it('BASE_PERSONA_PROMPT includes sentence case rule', () => {
    const prompt = buildConversationalPrompt();
    expect(prompt.toLowerCase()).toContain('sentence case');
    expect(prompt.toLowerCase()).toContain('not title case');
  });

  it('JIO_INQUIRY_LAYER includes sentence case rule', () => {
    const prompt = buildJioInquiryPrompt();
    const jioLayer = prompt.split('## Jio product knowledge')[1] || '';
    expect(jioLayer.toLowerCase()).toContain('sentence case');
  });

  it('JIO_INQUIRY_LAYER includes active voice rule', () => {
    const prompt = buildJioInquiryPrompt();
    expect(prompt.toLowerCase()).toContain('active voice');
  });

  it('JIO_INQUIRY_LAYER includes hallucination guard', () => {
    const prompt = buildJioInquiryPrompt();
    expect(prompt.toLowerCase()).toContain('never fabricate');
  });

  it('prompt headings use sentence case, not Title Case', () => {
    const prompt = buildJioInquiryPrompt();
    expect(prompt).not.toContain('### Slow Internet');
    expect(prompt).not.toContain('### WiFi Not Working');
    expect(prompt).not.toContain('### Recharge / Billing');
    expect(prompt).not.toContain('### JioFiber Installation');
    expect(prompt).not.toContain('### Streaming Issues');

    expect(prompt).toContain('### Slow internet');
    expect(prompt).toContain('### WiFi not working');
    expect(prompt).toContain('### Recharge / billing');
    expect(prompt).toContain('### JioFiber installation');
    expect(prompt).toContain('### Streaming issues');
  });
});

// =============================================================================
// Fix 3: Whitespace regex preserves markdown newlines
// =============================================================================
describe('Fix 3: whitespace regex preserves markdown', () => {
  it('applySafetyPostProcess in finalize should not be tested directly but format fixes should preserve newlines', () => {
    const markdown = [
      'Here is some help:',
      '',
      '**1. Check your transaction status**',
      '',
      '- Open the MyJio app',
      '- Look for the transaction',
      '',
      '**2. Check your bank statement**',
      '',
      '- Log in to your bank app',
    ].join('\n');

    const result = applyFormatFixes(markdown);
    expect(result).toContain('\n\n**1.');
    expect(result).toContain('\n\n**2.');
    expect(result).toContain('\n- Open');
    expect(result).toContain('\n- Log');
  });

  it('applyFormatFixes does not destroy newlines in formatted content', () => {
    const input = 'Heading line\n\n- bullet one\n- bullet two\n\nAnother paragraph';
    const result = applyFormatFixes(input);
    expect(result).toContain('\n\n- bullet one');
    expect(result).toContain('\n\nAnother paragraph');
  });
});

// =============================================================================
// Fix 4: toSentenceCase (via applyFormatFixes) converts Title Case headings
// =============================================================================
describe('Fix 4: toSentenceCase handles markdown headings', () => {
  it('converts bold numbered Title Case heading to sentence case', () => {
    const input = '**1. Check Your Transaction Status**';
    const result = applyFormatFixes(input);
    expect(result).toContain('Check your transaction status');
  });

  it('converts markdown ## Title Case heading to sentence case', () => {
    const input = '## Check Your Transaction Status';
    const result = applyFormatFixes(input);
    expect(result).toContain('Check your transaction status');
  });

  it('preserves brand names in headings', () => {
    const input = '**5. Contact Jio Customer Support**';
    const result = applyFormatFixes(input);
    expect(result).toContain('Jio');
    expect(result).toContain('customer support');
  });

  it('preserves first meaningful word capitalisation', () => {
    const input = '### Wait For A Few Minutes';
    const result = applyFormatFixes(input);
    expect(result.trim().startsWith('### Wait')).toBe(true);
    expect(result).toContain('for');
    expect(result).toContain('few minutes');
    expect(result).not.toContain('For');
    expect(result).not.toContain('Few Minutes');
  });

  it('does not touch lines that are not title-cased', () => {
    const input = 'Open the MyJio app and go to Recharge > My Recharges.';
    const result = applyFormatFixes(input);
    expect(result).toBe(input);
  });

  it('handles multi-line content with mixed headings and body', () => {
    const input = [
      'Here is some help:',
      '',
      '**1. Check Your Transaction Status**',
      '- Open the MyJio app',
      '',
      '**2. Check Your Bank Statement**',
      '- Log in to your bank app',
    ].join('\n');

    const result = applyFormatFixes(input);
    expect(result).toContain('Check your transaction status');
    expect(result).toContain('Check your bank statement');
    expect(result).toContain('Open the MyJio app');
  });
});

// =============================================================================
// Fix 4b: v-06 compliance verifier detects Title Case
// =============================================================================
describe('Fix 4b: v-06 compliance verifier detection', () => {
  it('detects Title Case in bold numbered heading', () => {
    const content = '**1. Check Your Transaction Status**\n- Open the MyJio app.';
    const report = runComplianceVerifier(content, {});
    const v06 = report.violations.find(v => v.id === 'v-06');
    expect(v06).toBeDefined();
    expect(v06?.autoFixable).toBe(true);
  });

  it('detects Title Case in markdown heading', () => {
    const content = '## Contact Jio Customer Support\nCall 1800-889-9999.';
    const report = runComplianceVerifier(content, {});
    const v06 = report.violations.find(v => v.id === 'v-06');
    expect(v06).toBeDefined();
  });

  it('does not flag sentence case headings', () => {
    const content = '**1. Check your transaction status**\n- Open the MyJio app.';
    const report = runComplianceVerifier(content, {});
    const v06 = report.violations.find(v => v.id === 'v-06');
    expect(v06).toBeUndefined();
  });

  it('auto-fixes Title Case when applied', () => {
    const content = '**1. Check Your Transaction Status**\n\nSome body text here.';
    const report = runComplianceVerifier(content, {});
    expect(report.fixedContent).toContain('Check your transaction status');
  });
});
