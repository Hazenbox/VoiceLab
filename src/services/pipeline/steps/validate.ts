/**
 * Pipeline Step: Validate
 *
 * Post-generation validation chain:
 * 1. Token enforcement (brand protection rules from Convex)
 * 2. Validation pipeline (brand, safety, structure, formatting)
 * 3. Constitutional AI validation
 * 4. Trust scoring
 * 5. Auto-fix
 *
 * Rules:
 * - Safety fail = hard stop (handled by safetyCheck step)
 * - Validation fail = soft stop (one retry allowed, controlled by orchestrator)
 * - Validators execute in deterministic order
 * - No cross-validator dependencies
 */

import { runValidationPipeline } from '../../validation';
import { calculateTrustScore, generateAutoFixes, applyAutoFixes } from '../../trust';
import {
  createTokenEnforcementAgent,
  type TokenEnforcementContext,
} from '../../validation/tokenEnforcementAgent';
import { getCachedEnforcementRules } from '../../validation/tokenEnforcementCache';
import {
  validateConstitutionalResponse,
  convertToViolations,
  type ConstitutionalContext,
} from '../../generation/constitutionalWrapper';
import type { PipelineInput, ValidateResult, AssembleResult } from '../types';

export async function validate(
  input: PipelineInput,
  content: string,
  assembled: AssembleResult,
): Promise<ValidateResult> {
  let processedContent = content;

  // 1. Token enforcement (Convex brand protection rules)
  const cachedRules = getCachedEnforcementRules();
  if (cachedRules.length > 0) {
    processedContent = await applyTokenEnforcement(processedContent, input, assembled, cachedRules);
  }

  // 2. Run validation pipeline
  let validationResult;
  let trustScore = null;
  let validationSummary = null;

  try {
    validationResult = await runValidationPipeline(processedContent, assembled.generationContext);

    // 3. Constitutional AI validation
    if (input.featureFlags.constitutionalWrapper && assembled.constitutionalContext) {
      validationResult = applyConstitutionalValidation(
        processedContent,
        assembled.constitutionalContext,
        validationResult,
      );
    }

    // 4. Trust scoring
    trustScore = calculateTrustScore(validationResult, input.trustSettings);

    validationSummary = {
      passedCount: validationResult.agentResults.filter((r: { passed: boolean }) => r.passed).length,
      warningCount: validationResult.agentResults
        .flatMap((r: { violations: Array<{ severity: string }> }) => r.violations)
        .filter((v: { severity: string }) => v.severity === 'warning').length,
      errorCount: validationResult.agentResults
        .flatMap((r: { violations: Array<{ severity: string }> }) => r.violations)
        .filter((v: { severity: string }) => v.severity === 'error').length,
      autoFixesApplied: 0,
    };
  } catch (error) {
    console.error('[Pipeline:Validate] Validation pipeline threw -- marking output as UNVALIDATED:', error);
    return {
      passed: false,
      content: processedContent,
      validation: null,
      trustScore: null,
      autoFixPreview: null,
      validationSummary: {
        passedCount: 0,
        warningCount: 0,
        errorCount: 1,
        autoFixesApplied: 0,
      },
    };
  }

  // 5. Auto-fix
  let autoFixPreview = null;
  let autoFixEvidence: { applied: Array<{ from: string; to: string }>; totalCount: number } | undefined;
  
  if (trustScore && trustScore.autoFixableCount > 0) {
    const fixResult = await tryAutoFix(processedContent, trustScore, input, validationResult);
    if (fixResult) {
      autoFixPreview = fixResult.preview;
      processedContent = fixResult.content;
      trustScore = fixResult.trustScore;
      if (validationSummary) {
        validationSummary.autoFixesApplied = fixResult.preview.appliedFixes.length;
      }
      
      // Build evidence for transparency panel
      autoFixEvidence = {
        applied: fixResult.preview.appliedFixes.map(fix => ({
          from: fix.original,
          to: fix.replacement,
        })),
        totalCount: fixResult.preview.appliedFixes.length,
      };
    }
  }

  // 3-tier validation:
  // Hard stops (always block): safety violations, PII leakage, human impersonation
  // Advisory score (threshold 55): everything else guides retry but doesn't block
  const hasHardStop = checkHardStops(validationResult);
  const passed = !hasHardStop && validationResult.overallScore >= 55;

  return {
    passed,
    content: processedContent,
    validation: validationResult,
    trustScore,
    autoFixPreview,
    validationSummary,
    autoFixEvidence,
  };
}

/**
 * Check for hard-stop violations that ALWAYS block content.
 * Only 3 things qualify as hard stops:
 * 1. Safety violations (critical severity)
 * 2. PII leakage
 * 3. Human impersonation
 * Everything else is advisory.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function checkHardStops(validationResult: any): boolean {
  if (!validationResult?.agentResults) return false;

  for (const agentResult of validationResult.agentResults) {
    for (const violation of (agentResult.violations || [])) {
      // Hard stop 1: Critical safety violations
      if (violation.severity === 'critical' && violation.category === 'safety') {
        return true;
      }
      // Hard stop 2: PII leakage
      if (violation.category === 'pii' || violation.rule?.includes('pii')) {
        return true;
      }
      // Hard stop 3: Human impersonation
      if (violation.category === 'ai_identity' && violation.severity === 'critical') {
        return true;
      }
    }
  }

  return false;
}

async function applyTokenEnforcement(
  content: string,
  input: PipelineInput,
  assembled: AssembleResult,
  rules: unknown[],
): Promise<string> {
  try {
    const constitutionalContext = assembled.constitutionalContext;
    const activeTokens = {
      ecosystem: input.ecosystem,
      channel: input.contentChannel,
      'safety.domain': constitutionalContext?.safetyResult?.domain || 'general',
      'safety.level': constitutionalContext?.tokens?.safetyLevel || 'none',
      'emotion.rasa.user': constitutionalContext?.tokens?.userEmotion || 'shanta',
      'emotion.intensity': constitutionalContext?.tokens?.emotionIntensity || 'moderate',
      persona: input.featureFlags.persona ? input.userProfile?.role : undefined,
    };

    const enforcementContext: TokenEnforcementContext = {
      activeTokens,
      rules,
    };

    const enforcementAgent = createTokenEnforcementAgent(enforcementContext);
    const enforcementResult = await enforcementAgent.validate(content);

    if (!enforcementResult.passed) {
      const autoFixable = enforcementResult.violations.filter(
        (v: { autoFixable: boolean; autoFixAction?: string }) => v.autoFixable && v.autoFixAction === 'remove',
      );

      if (autoFixable.length > 0) {
        let fixed = content;
        for (const violation of autoFixable) {
          const termRegex = new RegExp(`\\b${violation.term}\\b`, 'gi');
          fixed = fixed.replace(termRegex, '');
        }
        fixed = fixed
          .replace(/ {2,}/g, ' ')
          .replace(/ +([.,!?])/g, '$1')
          .replace(/([.,!?]) *([.,!?])/g, '$1')
          .replace(/\n{3,}/g, '\n\n')
          .trim();

        console.log(`[Pipeline:Validate] Token enforcement auto-fixed ${autoFixable.length} violations`);
        return fixed;
      }
    }

    return content;
  } catch (error) {
    console.warn('[Pipeline:Validate] Token enforcement failed:', error);
    return content;
  }
}

function applyConstitutionalValidation(
  content: string,
  constitutionalContext: ConstitutionalContext,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  validationResult: any,
// eslint-disable-next-line @typescript-eslint/no-explicit-any
): any {
  try {
    const constitutionalValidation = validateConstitutionalResponse(content, constitutionalContext);

    if (!constitutionalValidation.passed) {
      const violations = convertToViolations(constitutionalValidation);

      if (violations.length > 0) {
        validationResult.summary = validationResult.summary || {};
        validationResult.summary.totalViolations =
          (validationResult.summary.totalViolations || 0) + violations.length;

        validationResult.results = validationResult.results || [];
        validationResult.results.push({
          agentId: 'constitutional',
          score: constitutionalValidation.passed
            ? 100
            : Math.max(0, 100 - violations.length * 15),
          violations: violations.map(cv => ({
            severity: cv.severity,
            rule: cv.rule,
            text: cv.text,
            suggestion: cv.suggestion,
            category: cv.category,
            autoFixable: cv.autoFixable,
          })),
          processingTimeMs: 0,
        });
      }
    }

    return validationResult;
  } catch (error) {
    console.warn('[Pipeline:Validate] Constitutional validation failed:', error);
    return validationResult;
  }
}

async function tryAutoFix(
  content: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  trustScore: any,
  input: PipelineInput,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  validationResult: any,
// eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<{ preview: any; content: string; trustScore: any } | null> {
  try {
    const autoFixableViolations = trustScore.validationResults
      .flatMap((r: { violations: Array<{ autoFixable: boolean }> }) => r.violations)
      .filter((v: { autoFixable: boolean }) => v.autoFixable);

    if (autoFixableViolations.length === 0) return null;

    const dynamicReplacements = input.externalData?.knowledge?.autoFixRules?.map(rule => ({
      from: rule.content,
      to: rule.metadata?.suggestion,
    }));

    const fixes = generateAutoFixes(autoFixableViolations, dynamicReplacements);
    const fixResult = applyAutoFixes(content, fixes);

    if (fixResult.appliedFixes.length === 0) return null;

    const preview = {
      originalContent: content,
      fixedContent: fixResult.fixedContent,
      appliedFixes: fixResult.appliedFixes,
      isPending: false,
    };

    // Re-validate after fix to get accurate trust score
    let newTrustScore = trustScore;
    try {
      const fixedValidation = await runValidationPipeline(fixResult.fixedContent, undefined);
      newTrustScore = calculateTrustScore(fixedValidation, input.trustSettings);
    } catch (revalidateError) {
      console.warn('[Pipeline:Validate] Re-validation after auto-fix failed, using original score:', revalidateError);
    }

    return {
      preview,
      content: fixResult.fixedContent,
      trustScore: newTrustScore,
    };
  } catch (error) {
    console.warn('[Pipeline:Validate] Auto-fix failed:', error);
    return null;
  }
}
