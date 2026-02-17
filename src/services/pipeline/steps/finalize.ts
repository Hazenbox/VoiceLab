/**
 * Pipeline Step: Finalize
 *
 * Post-processes the generated content (privacy masking).
 * Calls: config/ lookups only
 *
 * Note: finishing layers (small joy, signatures, nudges) are currently
 * still hardcoded in App.tsx. They will be moved to config-driven lookups
 * in a later phase.
 */

import { maskSensitiveData, containsSensitiveData } from '../../privacy/dataMasking';

export interface FinalizeResult {
  content: string;
  wasPrivacyMasked: boolean;
}

export function finalize(content: string): FinalizeResult {
  let finalContent = content;
  let wasPrivacyMasked = false;

  try {
    if (containsSensitiveData(finalContent)) {
      finalContent = maskSensitiveData(finalContent);
      wasPrivacyMasked = true;
    }
  } catch (error) {
    console.warn('[Pipeline:Finalize] Privacy masking failed:', error);
  }

  return {
    content: finalContent,
    wasPrivacyMasked,
  };
}
