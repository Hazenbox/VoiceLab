/**
 * Pipeline Step: Finalize
 *
 * Post-processes generated content:
 * 1. Finishing layer (small joy + signature)
 * 2. Privacy masking
 */

import { maskSensitiveData, containsSensitiveData } from '../../privacy/dataMasking';
import {
  selectJoy,
  injectJoy,
  type JoyContext,
} from '../../finishing/smallJoyEngine';
import {
  selectSignature,
  appendSignature,
  type SignatureContext,
} from '../../finishing/signatureSelector';
import { normalizeEntities } from '../../postprocess/entityNormalizer';
import { conditionalPromoStrip } from '../../postprocess/promoStripper';
import { detectAndMaskPII } from '../../postprocess/piiDetector';
import { checkAntiPatterns } from '../../postprocess/antiPatternChecker';
import { applyFormatFixes } from '../../trust/autoFixEngine';
import type { FinalizeResult, ClassifyResult, AssembleResult } from '../types';
import type { PipelineInput } from '../types';

/**
 * Strip conversational wrapper text from generated content.
 * LLMs sometimes add meta-commentary like "I can help you personalize this..." 
 * even when instructed to output only the content.
 * This is a safety net to ensure clean output.
 */
function stripConversationalWrapper(content: string): string {
  let result = content;
  
  // Patterns that indicate conversational wrapper (not part of the actual content)
  const wrapperPatterns = [
    // Offers to help further
    /\n+I can (also )?help you (personalize|customize|modify|edit|refine|improve|send|share).*$/gim,
    /\n+Would you like (me to|to).*\?$/gim,
    /\n+Let me know if you('d like| want| need).*$/gim,
    /\n+Feel free to (ask|let me know|reach out).*$/gim,
    // Meta-commentary about the content
    /^(Here('s| is) (the|a|an|your).*?:\s*\n+)/im,
    /^(I('ve| have) (written|drafted|created|prepared).*?:\s*\n+)/im,
    // Questions about next steps (at end of content)
    /\n+Is there anything else.*\?$/gim,
    /\n+Do you (want|need|have).*\?$/gim,
    /\n+Shall I.*\?$/gim,
  ];
  
  for (const pattern of wrapperPatterns) {
    result = result.replace(pattern, '');
  }
  
  return result.trim();
}

/**
 * Deterministic safety post-processor.
 * Catches safety-critical content that the LLM might generate despite instructions.
 * Runs BEFORE finishing layer so that joy/signatures are never added to safety responses.
 */
function applySafetyPostProcess(content: string, userMessage: string): string {
  let result = content;

  const selfHarmKeywords = /\b(suicide|kill\s+(myself|yourself)|end\s+(my|your)\s+life|self[- ]harm|want\s+to\s+die|hurt\s+myself)\b/i;
  if (selfHarmKeywords.test(userMessage) && !/AASRA|iCall|9820466726|9152987821|helpline/i.test(result)) {
    result += '\n\nif you or someone you know is in crisis, please reach out:\n- AASRA: 9820466726 (24/7)\n- iCall: 9152987821\n- emergency: 112';
  }


  const aiProviderLeak = /\b(OpenAI|GPT-?\d*|ChatGPT|Claude|Anthropic|Google\s+AI|Gemini|Llama|Mistral)\b/gi;
  result = result.replace(aiProviderLeak, '');

  const humanImpersonation = /\bi\s+am\s+(a\s+)?(real\s+)?(?:human|person)\b/gi;
  result = result.replace(humanImpersonation, "i'm Jio's AI assistant");

  return result.replace(/ {2,}/g, ' ').replace(/\n{3,}/g, '\n\n');
}

export function finalize(
  content: string,
  input: PipelineInput,
  classification: ClassifyResult,
  assembled: AssembleResult,
): FinalizeResult {
  let finalContent = content;
  const constitutionalContext = assembled.constitutionalContext;
  const isGeneralChat = classification.intent === 'general_chat';

  // 0a. Strip conversational wrapper text (LLM meta-commentary)
  try {
    finalContent = stripConversationalWrapper(finalContent);
  } catch (error) {
    console.warn('[Pipeline:Finalize] Conversational wrapper strip failed:', error);
  }

  // 0b. Safety post-process (deterministic catch-all for critical safety content)
  try {
    finalContent = applySafetyPostProcess(finalContent, input.message);
  } catch (error) {
    console.warn('[Pipeline:Finalize] Safety post-process failed:', error);
  }

  // 0c. Normalize markdown tables (fix malformed LLM output)
  try {
    finalContent = normalizeMarkdownTables(finalContent);
  } catch (error) {
    console.warn('[Pipeline:Finalize] Markdown table normalization failed:', error);
  }

  // 1. Finishing layer: Small Joy + Signature
  if (!isGeneralChat) {
    try {
      finalContent = applyFinishingLayer(
        finalContent,
        classification,
        constitutionalContext,
        input,
      );
    } catch (error) {
      console.warn('[Pipeline:Finalize] Finishing layer failed:', error);
    }
  }

  // 2. Entity normalization (deterministic brand name fixes)
  try {
    const entityResult = normalizeEntities(finalContent);
    if (entityResult.replacementCount > 0) {
      finalContent = entityResult.content;
      console.log(`[Pipeline:Finalize] Normalized ${entityResult.replacementCount} entity names`);
    }
  } catch (error) {
    console.warn('[Pipeline:Finalize] Entity normalization failed:', error);
  }

  // 3. Night-time promotional stripping
  try {
    const timing = assembled.constitutionalContext?.tokens?.timing;
    const promoResult = conditionalPromoStrip(finalContent, timing);
    if (promoResult.strippedCount > 0) {
      finalContent = promoResult.content;
      console.log(`[Pipeline:Finalize] Stripped ${promoResult.strippedCount} promotional sentences (late night)`);
    }
  } catch (error) {
    console.warn('[Pipeline:Finalize] Promo stripping failed:', error);
  }

  // 4. Format fixes (Indian number format, time format, Oxford comma)
  try {
    finalContent = applyFormatFixes(finalContent);
  } catch (error) {
    console.warn('[Pipeline:Finalize] Format fixes failed:', error);
  }

  // 5. PII detection & masking
  let piiCount = 0;
  try {
    const piiResult = detectAndMaskPII(finalContent);
    if (piiResult.detectedCount > 0) {
      finalContent = piiResult.content;
      piiCount = piiResult.detectedCount;
      console.log(`[Pipeline:Finalize] Masked ${piiCount} PII instances`);
    }
  } catch (error) {
    console.warn('[Pipeline:Finalize] PII detection failed:', error);
  }

  // 6. Anti-pattern check (log warnings, don't block)
  try {
    const apResult = checkAntiPatterns(finalContent);
    if (apResult.violations.length > 0) {
      console.log(`[Pipeline:Finalize] Anti-pattern violations: ${apResult.violations.map(v => v.id).join(', ')}`);
    }
  } catch (error) {
    console.warn('[Pipeline:Finalize] Anti-pattern check failed:', error);
  }

  // 7. Legacy privacy masking (fallback)
  let wasPrivacyMasked = false;
  const contentBeforeMasking = finalContent;
  try {
    if (containsSensitiveData(finalContent)) {
      const maskResult = maskSensitiveData(finalContent);
      if (maskResult.wasModified) {
        finalContent = maskResult.maskedText;
        wasPrivacyMasked = true;
      }
    }
  } catch (error) {
    console.warn('[Pipeline:Finalize] Privacy masking failed:', error);
  }

  // 8. Masking integrity check - detect suspicious masking patterns
  // If masking corrupted normal text, revert to pre-masking content
  try {
    const integrityResult = checkMaskingIntegrity(finalContent, contentBeforeMasking);
    if (!integrityResult.passed) {
      console.warn(`[Pipeline:Finalize] Masking integrity check failed: ${integrityResult.reason}. Reverting to pre-masking content.`);
      finalContent = contentBeforeMasking;
      wasPrivacyMasked = false;
    }
  } catch (error) {
    console.warn('[Pipeline:Finalize] Masking integrity check failed:', error);
  }

  return {
    content: finalContent,
    wasPrivacyMasked,
  };
}

/**
 * Check if masking introduced suspicious patterns that indicate false positives.
 * 
 * Detects patterns like:
 * - Words with asterisks in the middle (e.g., "in******************en")
 * - Too many asterisks in a row (more than typical PII length)
 * - Asterisks that don't look like proper PII masking formats
 */
function checkMaskingIntegrity(
  maskedContent: string,
  originalContent: string
): { passed: boolean; reason?: string } {
  // Pattern 1: Detect words with asterisks in the middle that don't look like PII
  // Real PII masking produces patterns like: "****1234", "ab****cd", "XXXX XXXX 1234"
  // False positive masking produces: "in******************en" (asterisks inside a word)
  const suspiciousWordPattern = /\b[a-zA-Z]{1,3}\*{5,}[a-zA-Z]{1,3}\b/g;
  const suspiciousMatches = maskedContent.match(suspiciousWordPattern);
  
  if (suspiciousMatches && suspiciousMatches.length > 0) {
    return {
      passed: false,
      reason: `Detected ${suspiciousMatches.length} suspicious masking pattern(s): ${suspiciousMatches.slice(0, 3).join(', ')}`
    };
  }
  
  // Pattern 2: Detect very long asterisk sequences (>20) that aren't typical PII
  // Typical PII: phone (10 digits), Aadhaar (12), PAN (10), credit card (16)
  // Suspicious: 20+ consecutive asterisks often indicate false positives
  const longAsteriskPattern = /\*{20,}/g;
  const longMatches = maskedContent.match(longAsteriskPattern);
  
  if (longMatches && longMatches.length > 0) {
    // Check if original content had actual long PII (unlikely in normal responses)
    const originalHadLongPII = /\d{20,}/.test(originalContent);
    if (!originalHadLongPII) {
      return {
        passed: false,
        reason: `Detected ${longMatches.length} unusually long masking pattern(s)`
      };
    }
  }
  
  // Pattern 3: Check if masking removed too much content
  // If more than 20% of alphabetic content was replaced with asterisks, it's suspicious
  const originalAlphaCount = (originalContent.match(/[a-zA-Z]/g) || []).length;
  const maskedAlphaCount = (maskedContent.match(/[a-zA-Z]/g) || []).length;
  const asteriskCount = (maskedContent.match(/\*/g) || []).length;
  
  if (originalAlphaCount > 50) { // Only check for substantial content
    const alphaLossRatio = (originalAlphaCount - maskedAlphaCount) / originalAlphaCount;
    const asteriskRatio = asteriskCount / originalContent.length;
    
    if (alphaLossRatio > 0.2 || asteriskRatio > 0.15) {
      return {
        passed: false,
        reason: `Excessive masking detected: ${Math.round(alphaLossRatio * 100)}% alpha loss, ${Math.round(asteriskRatio * 100)}% asterisks`
      };
    }
  }
  
  return { passed: true };
}

/**
 * Pattern to detect if user message indicates a complaint or escalation request.
 * This is used to suppress joy/signatures which would feel inappropriate.
 */
const COMPLAINT_PATTERN = /\b(complaint|complain|unhappy|frustrated|angry|upset|disappointed|terrible|worst|awful|horrible|unacceptable|escalate|supervisor|manager|speak to someone)\b/i;

/**
 * Derive complaint status from the user's message or context.
 * We can't rely on intent type since 'complaint' isn't a pipeline intent.
 */
function isUserComplaint(input: PipelineInput, constitutionalContext: unknown): boolean {
  // Check if escalation was requested/offered (from constitutional context)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ctx = constitutionalContext as any;
  if (ctx?.stateContext?.wasEscalated) return true;
  if (ctx?.stateContext?.requestsEscalation) return true;
  
  // Check user message for complaint patterns
  return COMPLAINT_PATTERN.test(input.message);
}

function applyFinishingLayer(
  content: string,
  classification: ClassifyResult,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constitutionalContext: any,
  input: PipelineInput,
): string {
  let finished = content;
  const userTurnCount = input.conversationHistory.filter(m => m.role === 'user').length + 1;
  const resolutionStatus = constitutionalContext?.stateContext?.resolutionStatus || 'in_progress';
  const hasSolution = /(?:step\s*\d|follow these|here's how|to fix this|you can|try this)/i.test(finished);
  
  // Derive complaint status from message content and context (not intent type)
  const isComplaint = isUserComplaint(input, constitutionalContext);

  // Joy injection
  const joyContext: JoyContext = {
    emotion: constitutionalContext?.tokens?.userEmotion || 'shanta',
    emotionIntensity: constitutionalContext?.tokens?.emotionIntensity || 'moderate',
    intent: classification.intent || 'general',
    topic: input.ecosystem,
    ecosystem: input.ecosystem,
    resolutionStatus,
    turnNumber: userTurnCount,
    isMilestone: false,
    safetyDomain: constitutionalContext?.safetyResult?.domain,
    riskLevel: constitutionalContext?.tokens?.risk,
    isComplaint,
    isEscalated: constitutionalContext?.stateContext?.wasEscalated || false,
    hasSolutionContext: hasSolution,
  };

  const joySelection = selectJoy(joyContext);
  if (joySelection.shouldInclude && joySelection.element) {
    finished = injectJoy(finished, joySelection);
    console.log(`[Pipeline:Finalize] Added ${joySelection.element.type} joy`);
  }

  // Signature
  const signatureContext: SignatureContext = {
    resolutionStatus,
    emotion: constitutionalContext?.tokens?.userEmotion || 'shanta',
    emotionIntensity: constitutionalContext?.tokens?.emotionIntensity || 'moderate',
    intent: classification.intent || 'general',
    turnNumber: userTurnCount,
    isLastTurn: false,
    wasEscalated: constitutionalContext?.stateContext?.wasEscalated || false,
    channel: input.contentChannel,
    safetyDomain: constitutionalContext?.safetyResult?.domain,
    riskLevel: constitutionalContext?.tokens?.risk,
    isComplaint,
    isHealthContext: constitutionalContext?.safetyResult?.domain?.includes('health'),
  };

  const signatureSelection = selectSignature(signatureContext);
  if (signatureSelection.shouldInclude && signatureSelection.text) {
    finished = appendSignature(finished, signatureSelection);
    console.log(`[Pipeline:Finalize] Added ${signatureSelection.type} signature`);
  }

  return finished;
}

/**
 * Normalize malformed markdown tables from LLM output.
 * 
 * Common issues:
 * 1. Missing newlines between table rows
 * 2. Missing spaces around pipe separators
 * 3. Malformed separator rows (|---|---|)
 * 4. Concatenated cell values without proper separation
 */
function normalizeMarkdownTables(content: string): string {
  // Only process if content contains pipe characters (potential table)
  if (!content.includes('|')) {
    return content;
  }

  const lines = content.split('\n');
  const normalized: string[] = [];
  let inTable = false;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    // Detect table lines (contain multiple pipes)
    const pipeCount = (line.match(/\|/g) || []).length;
    const isTableLine = pipeCount >= 2;

    if (isTableLine) {
      inTable = true;
      
      // Fix 1: Ensure spaces around pipe separators for readability
      // |text| -> | text |
      line = line.replace(/\|([^\s|])/g, '| $1').replace(/([^\s|])\|/g, '$1 |');
      
      // Fix 2: Normalize separator row (|---|---|)
      // Handle mangled separators like |-----|--|------|
      if (/^\s*\|[\s\-:]+\|/.test(line)) {
        // This looks like a separator row, normalize it
        const cellCount = (line.match(/\|/g) || []).length - 1;
        if (cellCount > 0) {
          const separator = '| ' + Array(cellCount).fill('---').join(' | ') + ' |';
          line = separator;
        }
      }
      
      // Fix 3: Detect and split concatenated rows (rows merged into one line)
      // Pattern: | ... || ... | (double pipe indicates merged rows)
      if (/\|\|/.test(line)) {
        const parts = line.split('||').map(p => p.trim());
        for (const part of parts) {
          if (part) {
            const cleanPart = part.startsWith('|') ? part : '| ' + part;
            const endPart = cleanPart.endsWith('|') ? cleanPart : cleanPart + ' |';
            normalized.push(endPart);
          }
        }
        continue;
      }
    } else if (inTable && line.trim() === '') {
      // End of table
      inTable = false;
    }

    normalized.push(line);
  }

  return normalized.join('\n');
}
