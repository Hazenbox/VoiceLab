/**
 * useTrustPanel -- trust panel state and auto-fix handlers
 *
 * Extracted from App.tsx. Manages:
 * - Trust panel visibility and message selection
 * - Auto-fix generation and acceptance
 * - Re-validation after fixes
 */

import { useState, useCallback, useMemo } from 'react';
import type { TrustSettings } from '../types';
import { runValidationPipeline } from '../services/validation';
import { calculateTrustScore, generateAutoFixes, applyAutoFixes } from '../services/trust';

interface ChatMessage {
  id: string;
  content: string;
  trustScore?: {
    validationResults: Array<{
      violations: Array<{
        severity: string;
        autoFixable?: boolean;
        [key: string]: unknown;
      }>;
      passed: boolean;
      [key: string]: unknown;
    }>;
    [key: string]: unknown;
  };
  generationContext?: unknown;
  autoFixPreview?: {
    isPending: boolean;
    fixedContent: string;
    appliedFixes: unknown[];
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

interface UseTrustPanelParams {
  chatMessages: ChatMessage[];
  trustSettings: TrustSettings;
  setMessages: (updater: (prev: ChatMessage[]) => ChatMessage[]) => void;
  convexAutoFixRules?: Array<{
    content: string;
    metadata?: { suggestion?: string };
  }>;
}

export function useTrustPanel({
  chatMessages,
  trustSettings,
  setMessages,
  convexAutoFixRules,
}: UseTrustPanelParams) {
  // ── State ────────────────────────────────────────────────────────────
  const [showTrustPanel, setShowTrustPanel] = useState(false);
  const [selectedMessageForTrust, setSelectedMessageForTrust] = useState<string | null>(null);
  const [isAutoFixing, setIsAutoFixing] = useState(false);

  // ── Memos ────────────────────────────────────────────────────────────
  const selectedMessageForTrustPanel = useMemo(
    () =>
      selectedMessageForTrust
        ? chatMessages.find(m => m.id === selectedMessageForTrust)
        : null,
    [selectedMessageForTrust, chatMessages],
  );

  // ── Handlers ──────────────────────────────────────────────────────────

  const handleTrustBadgeClick = useCallback((messageId: string) => {
    setSelectedMessageForTrust(messageId);
    setShowTrustPanel(true);
  }, []);

  const handleAutoFix = useCallback(async () => {
    const message = selectedMessageForTrust
      ? chatMessages.find(m => m.id === selectedMessageForTrust)
      : null;

    if (!message?.trustScore || isAutoFixing) return;

    setIsAutoFixing(true);
    try {
      const violations = message.trustScore.validationResults
        .flatMap(r => r.violations)
        .filter(v => v.autoFixable);

      if (violations.length === 0) {
        console.log('[AutoFix] No auto-fixable violations found');
        return;
      }

      const dynamicReplacements = convexAutoFixRules?.map(rule => ({
        from: rule.content,
        to: rule.metadata?.suggestion,
      }));

      const fixes = generateAutoFixes(violations, dynamicReplacements);
      const result = applyAutoFixes(message.content, fixes);

      if (result.appliedFixes.length === 0) {
        console.log('[AutoFix] No fixes were applied');
        return;
      }

      const newValidation = await runValidationPipeline(
        result.fixedContent,
        message.generationContext,
      );
      const newTrustScore = calculateTrustScore(newValidation, trustSettings);

      setMessages(prev =>
        prev.map(m =>
          m.id === message.id
            ? {
                ...m,
                content: result.fixedContent,
                trustScore: newTrustScore,
                validationSummary: {
                  passedCount: newValidation.agentResults.filter((r: { passed: boolean }) => r.passed).length,
                  warningCount: newValidation.agentResults
                    .flatMap((r: { violations: Array<{ severity: string }> }) => r.violations)
                    .filter((v: { severity: string }) => v.severity === 'warning').length,
                  errorCount: newValidation.agentResults
                    .flatMap((r: { violations: Array<{ severity: string }> }) => r.violations)
                    .filter((v: { severity: string }) => v.severity === 'error').length,
                  autoFixesApplied: result.appliedFixes.length,
                },
              }
            : m,
        ),
      );

      console.log(
        `[AutoFix] Applied ${result.appliedFixes.length} fixes, score improved by ${result.scoreImprovement}`,
      );
    } catch (err) {
      console.error('[AutoFix] Error applying fixes:', err);
    } finally {
      setIsAutoFixing(false);
    }
  }, [selectedMessageForTrust, chatMessages, isAutoFixing, trustSettings, setMessages, convexAutoFixRules]);

  const handleAcceptAutoFix = useCallback(
    async (messageId: string) => {
      const message = chatMessages.find(m => m.id === messageId);
      if (!message?.autoFixPreview?.isPending) {
        console.log('[AutoFix Accept] No pending auto-fix preview for message:', messageId);
        return;
      }

      const { fixedContent, appliedFixes } = message.autoFixPreview;

      try {
        console.log(`[AutoFix Accept] Accepting ${appliedFixes.length} fixes for message:`, messageId);

        const newValidation = await runValidationPipeline(fixedContent, message.generationContext);
        const newTrustScore = calculateTrustScore(newValidation, trustSettings);

        setMessages(prev =>
          prev.map(m =>
            m.id === messageId
              ? {
                  ...m,
                  content: fixedContent,
                  trustScore: newTrustScore,
                  validationSummary: {
                    passedCount: newValidation.agentResults.filter((r: { passed: boolean }) => r.passed).length,
                    warningCount: newValidation.agentResults
                      .flatMap((r: { violations: Array<{ severity: string }> }) => r.violations)
                      .filter((v: { severity: string }) => v.severity === 'warning').length,
                    errorCount: newValidation.agentResults
                      .flatMap((r: { violations: Array<{ severity: string }> }) => r.violations)
                      .filter((v: { severity: string }) => v.severity === 'error').length,
                    autoFixesApplied: appliedFixes.length,
                  },
                  autoFixPreview: undefined,
                }
              : m,
          ),
        );

        console.log(`[AutoFix Accept] Successfully applied ${appliedFixes.length} fixes`);
      } catch (err) {
        console.error('[AutoFix Accept] Error accepting fixes:', err);
      }
    },
    [chatMessages, trustSettings, setMessages],
  );

  return {
    showTrustPanel,
    setShowTrustPanel,
    selectedMessageForTrust,
    setSelectedMessageForTrust,
    selectedMessageForTrustPanel,
    isAutoFixing,
    handleTrustBadgeClick,
    handleAutoFix,
    handleAcceptAutoFix,
  };
}
