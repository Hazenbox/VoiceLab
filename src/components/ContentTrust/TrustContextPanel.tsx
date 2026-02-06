/**
 * TrustContextPanel Component
 * 
 * Slide-out panel showing detailed trust information.
 */

import { memo, useState, useMemo } from 'react';
import { useThemeColors } from '../../theme';
import type { 
  TrustScore, 
  GenerationContext, 
  Violation, 
  ComplianceJustification,
  GuardrailStatus,
  ValidationAgentSummary,
} from '../../types';
import { 
  getScoreExplanation, 
  getCertificationBadge, 
  formatScore, 
  getComplianceJustification,
} from '../../services/trust';
import { getContextSummary } from '../../services/context';

interface TrustContextPanelProps {
  isOpen: boolean;
  onClose: () => void;
  trustScore?: TrustScore;
  generationContext?: GenerationContext;
  analyzedContent?: string;
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
    <div 
      className="flex items-center justify-between py-2 border-b last:border-b-0"
      style={{ borderColor: theme.stroke.low }}
    >
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

// =============================================================================
// COMPLIANCE JUSTIFICATION COMPONENTS
// =============================================================================

/**
 * Shield check icon for trust indicators
 */
const ShieldCheckIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <path d="M9 12l2 2 4-4" />
  </svg>
);

/**
 * Chevron icon for collapsible sections
 */
const ChevronIcon: React.FC<{ isOpen: boolean; className?: string }> = ({ isOpen, className }) => (
  <svg 
    className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''} ${className || ''}`} 
    width="16" 
    height="16" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2"
  >
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

/**
 * Content Preview - Shows the analyzed content
 */
const ContentPreview: React.FC<{ content: string }> = ({ content }) => {
  const theme = useThemeColors();
  
  if (!content) return null;
  
  return (
    <div className="mb-4">
      <div 
        className="p-3 rounded-lg text-sm leading-relaxed" 
        style={{ backgroundColor: theme.stroke.low, color: theme.text.medium }}
      >
        "{content}"
      </div>
    </div>
  );
};

/**
 * Collapsible Section - Expandable content area
 */
const CollapsibleSection: React.FC<{
  title: string;
  defaultOpen?: boolean;
  badge?: string | number;
  children: React.ReactNode;
}> = ({ title, defaultOpen = false, badge, children }) => {
  const theme = useThemeColors();
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
  return (
    <div className="border rounded-lg overflow-hidden" style={{ borderColor: theme.stroke.low }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-3 hover:bg-white/5 transition-colors"
        style={{ backgroundColor: theme.stroke.low }}
      >
        <span className="text-xs font-semibold" style={{ color: theme.text.high }}>{title}</span>
        <div className="flex items-center gap-2">
          {badge !== undefined && (
            <span 
              className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
              style={{ backgroundColor: 'rgba(34, 197, 94, 0.15)', color: '#22c55e' }}
            >
              {badge}
            </span>
          )}
          <ChevronIcon isOpen={isOpen} />
        </div>
      </button>
      {isOpen && (
        <div className="p-3" style={{ backgroundColor: theme.background.ghost }}>
          {children}
        </div>
      )}
    </div>
  );
};

/**
 * Guardrail Item - Individual brand guardrail status
 */
const GuardrailItem: React.FC<{ guardrail: GuardrailStatus }> = ({ guardrail }) => {
  const theme = useThemeColors();
  const isFollowed = guardrail.status === 'followed';
  
  return (
    <div className="flex items-start gap-2 py-2 first:pt-0 last:pb-0">
      <div 
        className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
        style={{ 
          backgroundColor: isFollowed ? 'rgba(34, 197, 94, 0.15)' : 'rgba(234, 179, 8, 0.15)',
        }}
      >
        {isFollowed ? (
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="3">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        ) : (
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#eab308" strokeWidth="3">
            <circle cx="12" cy="12" r="1" fill="#eab308" />
          </svg>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium" style={{ color: theme.text.high }}>{guardrail.rule}</p>
        <p className="text-[11px] mt-0.5 leading-relaxed" style={{ color: theme.text.low }}>
          {guardrail.description}
        </p>
      </div>
    </div>
  );
};

/**
 * Validation Agent Item - Individual agent validation summary
 */
const ValidationAgentItem: React.FC<{ validation: ValidationAgentSummary }> = ({ validation }) => {
  const theme = useThemeColors();
  const isPerfect = validation.rulesPassed === validation.rulesChecked;
  
  return (
    <div className="py-2 first:pt-0 last:pb-0">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-medium" style={{ color: theme.text.high }}>
          {validation.agentName}
        </span>
        <span 
          className="text-[10px] px-1.5 py-0.5 rounded font-medium"
          style={{ 
            backgroundColor: isPerfect ? 'rgba(34, 197, 94, 0.15)' : 'rgba(234, 179, 8, 0.15)',
            color: isPerfect ? '#22c55e' : '#eab308',
          }}
        >
          {validation.rulesPassed}/{validation.rulesChecked}
        </span>
      </div>
      {validation.keyRulesFollowed.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {validation.keyRulesFollowed.slice(0, 3).map((rule, i) => (
            <span 
              key={i}
              className="text-[10px] px-1.5 py-0.5 rounded"
              style={{ backgroundColor: theme.stroke.low, color: theme.text.medium }}
            >
              {rule}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

/**
 * Compliance Justification Section - Main trust building section
 */
const ComplianceJustificationSection: React.FC<{
  justification: ComplianceJustification;
}> = ({ justification }) => {
  const theme = useThemeColors();
  const { trustSummary, guardrailsFollowed, validationsPassed } = justification;
  
  const followedCount = guardrailsFollowed.filter(g => g.status === 'followed').length;
  const totalAgentRulesPassed = validationsPassed.reduce((sum, v) => sum + v.rulesPassed, 0);
  
  return (
    <div className="mb-4 space-y-3">
      {/* Trust Summary Header */}
      <div 
        className="flex items-center gap-3 p-3 rounded-lg" 
        style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)' }}
      >
        <ShieldCheckIcon className="flex-shrink-0 text-[#22c55e]" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold" style={{ color: '#22c55e' }}>
            {trustSummary.totalRulesPassed}/{trustSummary.totalRulesChecked} rules followed
          </p>
          <p className="text-xs" style={{ color: theme.text.medium }}>
            {trustSummary.compliancePercentage}% compliance achieved
          </p>
        </div>
      </div>
      
      {/* Guardrails Followed (Collapsible) */}
      <CollapsibleSection 
        title="Brand Guardrails Followed" 
        defaultOpen={false}
        badge={`${followedCount}/10`}
      >
        <div className="divide-y" style={{ borderColor: theme.stroke.low }}>
          {guardrailsFollowed.map(g => (
            <GuardrailItem key={g.id} guardrail={g} />
          ))}
        </div>
      </CollapsibleSection>
      
      {/* Validation Rules Passed (Collapsible) */}
      <CollapsibleSection 
        title="Validation Rules Applied" 
        defaultOpen={false}
        badge={totalAgentRulesPassed}
      >
        <div className="divide-y" style={{ borderColor: theme.stroke.low }}>
          {validationsPassed.map(v => (
            <ValidationAgentItem key={v.agentId} validation={v} />
          ))}
        </div>
      </CollapsibleSection>
    </div>
  );
};

export const TrustContextPanel = memo(function TrustContextPanel({
  isOpen,
  onClose,
  trustScore,
  generationContext,
  analyzedContent,
  onAutoFix,
  autoFixAvailable = false,
}: TrustContextPanelProps) {
  const theme = useThemeColors();
  const [activeTab, setActiveTab] = useState<'score' | 'context' | 'violations'>('score');
  
  const explanation = trustScore ? getScoreExplanation(trustScore) : null;
  const badge = trustScore ? getCertificationBadge(trustScore.certification) : null;
  const allViolations = trustScore?.validationResults.flatMap(vr => vr.violations) || [];
  
  // Compute compliance justification for trust building
  const complianceJustification = useMemo(() => {
    if (!trustScore || !analyzedContent) return null;
    return getComplianceJustification(analyzedContent, trustScore);
  }, [trustScore, analyzedContent]);
  
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
              {/* Content Preview - Shows what was analyzed */}
              {complianceJustification && (
                <ContentPreview content={complianceJustification.analyzedContent} />
              )}
              
              {/* Compliance Justification - Trust building section */}
              {complianceJustification && (
                <ComplianceJustificationSection justification={complianceJustification} />
              )}
              
              {/* Summary Message */}
              <p className="text-sm p-3 rounded-lg" style={{ backgroundColor: theme.stroke.low, color: theme.text.high }}>
                {explanation.summary}
              </p>
              
              {/* Score Breakdown */}
              <div>
                <h3 className="text-xs font-semibold mb-3" style={{ color: theme.text.low }}>
                  Score Breakdown
                </h3>
                <div>
                  {explanation.agentBreakdown.map(agent => (
                    <ScoreIndicator key={agent.name} score={agent.score} label={agent.name}
                      status={agent.status} violations={agent.violations} />
                  ))}
                </div>
              </div>
              
              {/* Recommendations */}
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
