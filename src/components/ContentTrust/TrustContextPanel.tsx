/**
 * TrustContextPanel Component
 * 
 * Slide-out panel showing detailed trust information.
 */

import { memo, useState } from 'react';
import { useThemeColors } from '../../theme';
import type { TrustScore, GenerationContext, Violation } from '../../types';
import { getScoreExplanation, getCertificationBadge, formatScore } from '../../services/trust';
import { getContextSummary } from '../../services/context';

interface TrustContextPanelProps {
  isOpen: boolean;
  onClose: () => void;
  trustScore?: TrustScore;
  generationContext?: GenerationContext;
  onAutoFix?: () => void;
  autoFixAvailable?: boolean;
}

const ScoreIndicator: React.FC<{
  score: number;
  label: string;
  status: 'pass' | 'warning' | 'fail';
  violations: number;
}> = ({ score, label, status, violations }) => {
  const theme = useThemeColors();
  const statusColors = { pass: '#22c55e', warning: '#eab308', fail: '#ef4444' };
  
  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: statusColors[status] }} />
        <span className="text-sm" style={{ color: theme.text.high }}>{label}</span>
      </div>
      <div className="flex items-center gap-2">
        {violations > 0 && (
          <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
            {violations}
          </span>
        )}
        <span className="text-sm font-medium tabular-nums" style={{ color: statusColors[status] }}>{score}</span>
      </div>
    </div>
  );
};

const ViolationItem: React.FC<{ violation: Violation }> = ({ violation }) => {
  const theme = useThemeColors();
  const severityColors = { error: '#f97316', warning: '#eab308', info: '#3b82f6' };
  
  return (
    <div className="p-3 rounded-lg mb-2" style={{ backgroundColor: theme.stroke.low }}>
      <div className="flex items-start gap-2">
        <span className="text-xs font-medium px-1.5 py-0.5 rounded mt-0.5"
          style={{ backgroundColor: `${severityColors[violation.severity]}20`, color: severityColors[violation.severity] }}>
          {violation.severity}
        </span>
        <div className="flex-1">
          <p className="text-sm" style={{ color: theme.text.high }}>{violation.rule}</p>
          {violation.suggestion && (
            <p className="text-xs mt-1 flex items-start gap-1" style={{ color: theme.text.medium }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="flex-shrink-0 mt-0.5">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 16v-4M12 8h.01" />
              </svg>
              <span>{violation.suggestion}</span>
            </p>
          )}
          {violation.text && (
            <p className="text-xs mt-1 font-mono px-2 py-1 rounded"
              style={{ backgroundColor: theme.background.ghost, color: theme.text.low }}>
              "{violation.text}"
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

const ContextSummarySection: React.FC<{ context: GenerationContext }> = ({ context }) => {
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
        <div key={item.label} className="flex items-center justify-between py-1.5 border-b" style={{ borderColor: theme.stroke.low }}>
          <span className="text-xs font-medium" style={{ color: theme.text.low }}>{item.label}</span>
          <span className="text-xs text-right max-w-[60%] truncate" style={{ color: theme.text.high }}>{item.value}</span>
        </div>
      ))}
    </div>
  );
};

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
  
  const explanation = trustScore ? getScoreExplanation(trustScore) : null;
  const badge = trustScore ? getCertificationBadge(trustScore.certification) : null;
  const allViolations = trustScore?.validationResults.flatMap(vr => vr.violations) || [];
  
  return (
    <aside
      className="h-full flex flex-col overflow-hidden relative"
      style={{
        width: isOpen ? '380px' : '0px',
        backgroundColor: theme.background.ghost,
        borderLeft: `1px solid ${theme.stroke.low}`,
        transition: 'width 250ms cubic-bezier(0.4, 0, 0.2, 1), transform 250ms cubic-bezier(0.4, 0, 0.2, 1)',
        transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
        opacity: isOpen ? 1 : 0,
        overflow: isOpen ? 'visible' : 'hidden',
      }}
    >
        
        {/* Header */}
        {isOpen && (
          <div className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0" style={{ borderColor: theme.stroke.low }}>
            <div className="flex items-center gap-3">
              {trustScore && badge && (
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold"
                  style={{
                    backgroundColor: `${badge.color === 'green' ? '#22c55e' : badge.color === 'yellow' ? '#eab308' : '#ef4444'}20`,
                    color: badge.color === 'green' ? '#22c55e' : badge.color === 'yellow' ? '#eab308' : '#ef4444',
                  }}>
                  {formatScore(trustScore.overall)}
                </div>
              )}
              <div>
                <h2 className="text-sm font-semibold" style={{ color: theme.text.high }}>Content Trust</h2>
                {badge && <p className="text-xs" style={{ color: theme.text.medium }}>{badge.label}</p>}
              </div>
            </div>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10 transition-colors"
              style={{ color: theme.text.medium }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
        
        {/* Tabs */}
        {isOpen && (
          <div className="flex border-b flex-shrink-0" style={{ borderColor: theme.stroke.low }}>
            {(['score', 'context', 'violations'] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className="flex-1 px-4 py-2.5 text-xs font-medium capitalize"
                style={{
                  color: activeTab === tab ? theme.accent : theme.text.medium,
                  borderBottom: activeTab === tab ? `2px solid ${theme.accent}` : '2px solid transparent',
                }}>
                {tab}
                {tab === 'violations' && allViolations.length > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-[10px]"
                    style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
                    {allViolations.length}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
        
        {/* Content */}
        {isOpen && (
          <div className="flex-1 overflow-y-auto p-4">
          {activeTab === 'score' && explanation && (
            <div className="space-y-4">
              <p className="text-sm p-3 rounded-lg" style={{ backgroundColor: theme.stroke.low, color: theme.text.high }}>
                {explanation.summary}
              </p>
              <div>
                <h3 className="text-xs font-semibold mb-3" style={{ color: theme.text.low }}>
                  Score Breakdown
                </h3>
                <div className="divide-y" style={{ borderColor: theme.stroke.low }}>
                  {explanation.agentBreakdown.map(agent => (
                    <ScoreIndicator key={agent.name} score={agent.score} label={agent.name}
                      status={agent.status} violations={agent.violations} />
                  ))}
                </div>
              </div>
              <div>
                <h3 className="text-xs font-semibold mb-3" style={{ color: theme.text.low }}>
                  Recommendations
                </h3>
                <ul className="space-y-2">
                  {explanation.recommendations.map((rec, i) => (
                    <li key={i} className="text-sm flex items-start gap-2" style={{ color: theme.text.medium }}>
                      <span>•</span><span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
          
          {activeTab === 'context' && generationContext && <ContextSummarySection context={generationContext} />}
          {activeTab === 'context' && !generationContext && (
            <p className="text-sm text-center py-8" style={{ color: theme.text.low }}>No context available</p>
          )}
          
          {activeTab === 'violations' && (
            <div>
              {allViolations.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center"
                    style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)' }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2">
                      <path d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <p className="text-sm" style={{ color: theme.text.medium }}>No violations found!</p>
                </div>
              ) : (
                allViolations.map((violation, i) => <ViolationItem key={i} violation={violation} />)
              )}
            </div>
          )}
          </div>
        )}
        
        {/* Footer */}
        {isOpen && autoFixAvailable && trustScore && allViolations.length > 0 && (
          <div className="px-4 py-3 border-t flex-shrink-0" style={{ borderColor: theme.stroke.low }}>
            <button onClick={onAutoFix} className="w-full py-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-2"
              style={{ backgroundColor: theme.accent, color: '#ffffff' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
              Auto-Fix ({trustScore.autoFixableCount} fixable)
            </button>
          </div>
        )}
      </aside>
  );
});

export default TrustContextPanel;
