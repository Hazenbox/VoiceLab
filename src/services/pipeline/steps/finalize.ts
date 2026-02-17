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
import type { FinalizeResult, ClassifyResult, AssembleResult } from '../types';
import type { PipelineInput } from '../types';

export function finalize(
  content: string,
  input: PipelineInput,
  classification: ClassifyResult,
  assembled: AssembleResult,
): FinalizeResult {
  let finalContent = content;
  const constitutionalContext = assembled.constitutionalContext;
  const isGeneralChat = classification.intent === 'general_chat';

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

  // 2. Privacy masking
  let wasPrivacyMasked = false;
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

  return {
    content: finalContent,
    wasPrivacyMasked,
  };
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
    isComplaint: classification.intent === 'complaint',
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
    isComplaint: classification.intent === 'complaint',
    isHealthContext: constitutionalContext?.safetyResult?.domain?.includes('health'),
  };

  const signatureSelection = selectSignature(signatureContext);
  if (signatureSelection.shouldInclude && signatureSelection.text) {
    finished = appendSignature(finished, signatureSelection);
    console.log(`[Pipeline:Finalize] Added ${signatureSelection.type} signature`);
  }

  return finished;
}
