/**
 * TrustContextPanel Component
 * 
 * Slide-out panel showing detailed trust information.
 * Displays all parameters considered for content generation.
 * 
 * Features:
 * - Score breakdown by validation agent
 * - Violation list with suggestions
 * - Generation context summary
 * - Auto-fix suggestions
 */

import React, { memo, useState, useCallback } from 'react';
import { useThemeColors } from '../../theme';
import type { TrustScore, GenerationContext, Violation } from '../../types';
import { 
  getScoreExplanation, 
  getCertificationBadge,
  getScoreColor,
  formatScore,
} from '../../services/trust';
import { getContextSummary } from '../../services/context';

// =============================================================================
// Types
// =============================================================================

interface TrustContextPanelProps {
  /** Whether panel is open */
  isOpen: boolean;
  /** Callback to close panel */
  onClose: () => void;
  /** Trust score data */
  trustScore?: TrustScore;
  /** Generation context */
  generationContext?: GenerationContext;
  /** Callback when user wants to apply auto-fix */
  onAutoFix?: () => void;
  /** Whether auto-fix is available */
  autoFixAvailable?: boolean;
}

// =============================================================================
// Score Indicator
// =============================================================================

const ScoreIndicator: React.FC<{
  score: number;
  label: string;
  status: 'pass' | 'warning' | 'fail';
  violations: number;
}> = ({ score, label, status, violations }) => {
  const theme = useThemeColors();
  
  const statusColors = {
    pass: '#22c55e',
    warning: '#eab308',
    fail: '#ef4444',
  };
  
  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center gap-2">
        <div
          className="w-2 h-2 rounded-full"
          style={{ backgroundColor: statusColors[status] }}
        />
        <span className="text-sm" style={{ color: theme.text.high }}>
          {label}
        </span>
      </div>
      <div className="flex items-center gap-2">
        {violations > 0 && (
          <span
            className="text-xs px-1.5 py-0.5 rounded"
            style={{ 
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              color: '#ef4444',
            }}
          >
            {violations} issue{violations !== 1 ? 's' : ''}
          </span>
        )}
        <span
          className="text-sm font-medium tabular-nums"
          style={{ color: statusColors[status] }}
        >
          {score}
        </span>
      </div>
    </div>
  );
};

// =============================================================================
// Violation Item
// =============================================================================

const ViolationItem: React.FC<{
  violation: Violation;
  index: number;
}> = ({ violation, index }) => {
  const theme = useThemeColors();
  
  const severityColors = {
    critical: '#ef4444',
    error: '#f97316',
    warning: '#eab308',
    info: '#3b82f6',
  };
  
  const severityLabels = {
    critical: 'Critical',
    error: 'Error',
    warning: 'Warning',
    info: 'Info',
  };
  
  return (
    <div
      className="p-3 rounded-lg mb-2"
      style={{ backgroundColor: theme.stroke.low }}
    >
      <div className="flex items-start gap-2">
        <span
          className="text-xs font-medium px-1.5 py-0.5 rounded mt-0.5"
          style={{
            backgroundColor: `${severityColors[violation.severity]}20`,
            color: severityColors[violation.severity],
          }}
        >
          {severityLabels[violation.severity]}
        </span>
        <div className="flex-1">
          <p
            className="text-sm"
            style={{ color: theme.text.high }}
          >
            {violation.message}
          </p>
          {violation.suggestion && (
            <p
              className="text-xs mt-1"
              style={{ color: theme.text.medium }}
            >
              💡 {violation.suggestion}
            </p>
          )}
          {violation.location?.text && (
            <p
              className="text-xs mt-1 font-mono px-2 py-1 rounded"
              style={{ 
                backgroundColor: theme.background.ghost,
                color: theme.text.low,
              }}
            >
              "{violation.location.text}"
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// Context Summary Section
// =============================================================================

const ContextSummarySection: React.FC<{
  context: GenerationContext;
}> = ({ context }) => {
  const theme = useThemeColors();
  const summary = getContextSummary(context);
  
  const items = [
    { label: 'Ecosystem', value: summary.ecosystem },
    { label: 'Channel', value: summary.channel },
    { label: 'Warmth', value: summary.warmth },
    { label: 'Detail', value: summary.detail },
    { label: 'Goal', value: summary.goal },
    { label: 'Profile', value: summary.profile },
    { label: 'Emotion', value: summary.emotion },
    { label: 'Timing', value: summary.timing },
  ];
  
  return (
    <div className="space-y-2">
      {items.map(item => (
        <div
          key={item.label}
          className="flex items-center justify-between py-1.5 border-b"
          style={{ borderColor: theme.stroke.low }}
        >
          <span
            className="text-xs font-medium"
            style={{ color: theme.text.low }}
          >
            {item.label}
          </span>
          <span
            className="text-xs text-right max-w-[60%] truncate"
            style={{ color: theme.text.high }}
            title={item.value}
          >
            {item.value}
          </span>
        </div>
      ))}
      
      {summary.overrides.length > 0 && (
        <div className="pt-2">
          <span
            className="text-xs"
            style={{ color: theme.text.low }}
          >
            Overridden: {summary.overrides.join(', ')}
          </span>
        </div>
      )}
    </div>
  );
};

// =============================================================================
// Main Component
// =============================================================================

export const TrustContextPanel = memo(function TrustContextPanel({
  isOpen,
  onClose,
  trustScore,
  generationContext,
  onAutoFix,
  autoFixAvailable = false,
}: TrustContextPanelProps) {
  const theme = useThemeColors();
  const [activeTab, setActiveTab] = useState<'score' | 'context' | 'violations'>('score');
  
  if (!isOpen) return null;
  
  const explanation = trustScore ? getScoreExplanation(trustScore) : null;
  const badge = trustScore ? getCertificationBadge(trustScore.certification) : null;
  
  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-40"
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* Panel */}
      <div
        className="fixed right-0 top-0 bottom-0 w-[380px] z-50 shadow-2xl overflow-hidden flex flex-col"
        style={{ backgroundColor: theme.background.default }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="trust-panel-title"
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3 border-b"
          style={{ borderColor: theme.stroke.low }}
        >
          <div className="flex items-center gap-3">
            {trustScore && badge && (
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold"
                style={{
                  backgroundColor: `${badge.color === 'green' ? '#22c55e' : badge.color === 'yellow' ? '#eab308' : '#ef4444'}20`,
                  color: badge.color === 'green' ? '#22c55e' : badge.color === 'yellow' ? '#eab308' : '#ef4444',
                }}
              >
                {formatScore(trustScore.overall)}
              </div>
            )}
            <div>
              <h2
                id="trust-panel-title"
                className="text-sm font-semibold"
                style={{ color: theme.text.high }}
              >
                Content Trust
              </h2>
              {badge && (
                <p
                  className="text-xs"
                  style={{ color: theme.text.medium }}
                >
                  {badge.label}: {badge.description}
                </p>
              )}
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="p-2 rounded-lg transition-colors hover:bg-white/10"
            aria-label="Close panel"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke={theme.text.medium}
              strokeWidth="2"
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* Tabs */}
        <div
          className="flex border-b"
          style={{ borderColor: theme.stroke.low }}
          role="tablist"
        >
          {(['score', 'context', 'violations'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`
                flex-1 px-4 py-2.5 text-xs font-medium capitalize
                transition-colors
              `}
              style={{
                color: activeTab === tab ? theme.accent : theme.text.medium,
                borderBottom: activeTab === tab ? `2px solid ${theme.accent}` : '2px solid transparent',
              }}
              role="tab"
              aria-selected={activeTab === tab}
            >
              {tab}
              {tab === 'violations' && trustScore && trustScore.violations.length > 0 && (
                <span
                  className="ml-1.5 px-1.5 py-0.5 rounded-full text-[10px]"
                  style={{
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    color: '#ef4444',
                  }}
                >
                  {trustScore.violations.length}
                </span>
              )}
            </button>
          ))}
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Score Tab */}
          {activeTab === 'score' && explanation && (
            <div className="space-y-4">
              <p
                className="text-sm p-3 rounded-lg"
                style={{ 
                  backgroundColor: theme.stroke.low,
                  color: theme.text.high,
                }}
              >
                {explanation.summary}
              </p>
              
              <div>
                <h3
                  className="text-xs font-semibold uppercase tracking-wider mb-3"
                  style={{ color: theme.text.low }}
                >
                  Score Breakdown
                </h3>
                <div className="divide-y" style={{ borderColor: theme.stroke.low }}>
                  {explanation.agentBreakdown.map(agent => (
                    <ScoreIndicator
                      key={agent.name}
                      score={agent.score}
                      label={agent.name}
                      status={agent.status}
                      violations={agent.violations}
                    />
                  ))}
                </div>
              </div>
              
              <div>
                <h3
                  className="text-xs font-semibold uppercase tracking-wider mb-3"
                  style={{ color: theme.text.low }}
                >
                  Recommendations
                </h3>
                <ul className="space-y-2">
                  {explanation.recommendations.map((rec, i) => (
                    <li
                      key={i}
                      className="text-sm flex items-start gap-2"
                      style={{ color: theme.text.medium }}
                    >
                      <span className="mt-0.5">•</span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
          
          {/* Context Tab */}
          {activeTab === 'context' && generationContext && (
            <ContextSummarySection context={generationContext} />
          )}
          
          {activeTab === 'context' && !generationContext && (
            <p
              className="text-sm text-center py-8"
              style={{ color: theme.text.low }}
            >
              No context information available
            </p>
          )}
          
          {/* Violations Tab */}
          {activeTab === 'violations' && trustScore && (
            <div>
              {trustScore.violations.length === 0 ? (
                <div className="text-center py-8">
                  <div
                    className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center"
                    style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)' }}
                  >
                    <span className="text-2xl">✓</span>
                  </div>
                  <p
                    className="text-sm"
                    style={{ color: theme.text.medium }}
                  >
                    No violations found!
                  </p>
                </div>
              ) : (
                <div>
                  {trustScore.violations.map((violation, index) => (
                    <ViolationItem
                      key={violation.agentId + index}
                      violation={violation}
                      index={index}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Footer with Auto-Fix */}
        {autoFixAvailable && trustScore && trustScore.violations.length > 0 && (
          <div
            className="px-4 py-3 border-t"
            style={{ borderColor: theme.stroke.low }}
          >
            <button
              onClick={onAutoFix}
              className="
                w-full py-2.5 rounded-lg text-sm font-medium
                transition-colors
              "
              style={{
                backgroundColor: theme.accent,
                color: '#ffffff',
              }}
            >
              ✨ Auto-Fix ({trustScore.violations.length} issue{trustScore.violations.length !== 1 ? 's' : ''})
            </button>
          </div>
        )}
      </div>
    </>
  );
});

export default TrustContextPanel;
