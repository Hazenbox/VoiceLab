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
  getComplianceJustification,
} from '../../services/trust';
import { getContextSummary } from '../../services/context';
import { Accordion } from '../ui/Accordion';
import { DSIcon } from '../DSIcon';

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
  const statusColors = { pass: '#00A859', warning: '#eab308', fail: '#ef4444' };
  
  return (
    <div 
      className="flex items-center justify-between py-2 border-b last:border-b-0"
      style={{ borderColor: theme.stroke.low }}
    >
      <span className="text-sm" style={{ color: theme.text.high }}>{label}</span>
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
              <span className="flex-shrink-0 mt-0.5">
                <DSIcon name="IcInfo" size="XS" attention="medium" />
              </span>
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

/**
 * Detected Product Badge - Shows product detection with mismatch warning
 */
const DetectedProductBadge: React.FC<{ 
  productName: string | null; 
  confidence: string;
  ecosystemMismatch: boolean;
  suggestedEcosystem: string | null;
  matchedKeywords: string[];
}> = ({ productName, confidence, ecosystemMismatch, suggestedEcosystem, matchedKeywords }) => {
  const theme = useThemeColors();
  
  if (!productName) {
    return (
      <span className="text-xs" style={{ color: theme.text.low }}>
        No specific product detected
      </span>
    );
  }
  
  const confidenceColors = {
    high: '#00A859',
    medium: '#eab308',
    low: '#f97316',
  };
  
  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-1.5">
        <span 
          className="text-[10px] px-1.5 py-0.5 rounded"
          style={{ 
            backgroundColor: `${confidenceColors[confidence as keyof typeof confidenceColors] || '#6b7280'}20`,
            color: confidenceColors[confidence as keyof typeof confidenceColors] || '#6b7280',
          }}
        >
          {confidence}
        </span>
        <span className="text-xs font-medium" style={{ color: theme.text.high }}>
          {productName}
        </span>
      </div>
      {ecosystemMismatch && suggestedEcosystem && (
        <span 
          className="text-[10px] px-1.5 py-0.5 rounded flex items-center gap-1"
          style={{ 
            backgroundColor: 'rgba(234, 179, 8, 0.15)',
            color: '#eab308',
          }}
        >
          <DSIcon name="IcWarning" size="XS" attention="medium" />
          Typically uses {suggestedEcosystem} tone
        </span>
      )}
      {matchedKeywords.length > 0 && (
        <div className="flex flex-wrap gap-1 justify-end">
          {matchedKeywords.slice(0, 3).map((kw, i) => (
            <span 
              key={i}
              className="text-[9px] px-1 py-0.5 rounded"
              style={{ backgroundColor: theme.stroke.low, color: theme.text.low }}
            >
              {kw}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

const ContextSummarySection: React.FC<{ context: GenerationContext }> = ({ context }) => {
  const theme = useThemeColors();
  const summary = getContextSummary(context);
  
  const items = [
    { label: 'Tone & Voice', value: summary.ecosystem },
    { label: 'Channel', value: summary.channel },
    { label: 'Warmth', value: summary.warmth },
    { label: 'Detail', value: summary.detail },
    { label: 'Goal', value: summary.goal },
    { label: 'Profile', value: summary.profile },
    { label: 'Emotion', value: summary.emotion },
    { label: 'Timing', value: summary.timing },
  ];
  
  return (
    <div className="space-y-3">
      {/* Detected Product Section - Transparency Layer */}
      <div 
        className="p-3 rounded-lg space-y-2"
        style={{ backgroundColor: theme.stroke.low }}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold flex items-center gap-1.5" style={{ color: theme.text.high }}>
            <DSIcon name="IcSearch" size="XS" attention="high" />
            Detected Topic
          </span>
        </div>
        <DetectedProductBadge 
          productName={summary.detectedProduct.productName}
          confidence={summary.detectedProduct.confidence}
          ecosystemMismatch={summary.detectedProduct.ecosystemMismatch}
          suggestedEcosystem={summary.detectedProduct.suggestedEcosystem}
          matchedKeywords={summary.detectedProduct.matchedKeywords}
        />
        {summary.detectedProduct.ecosystemMismatch && (
          <p className="text-[10px] leading-relaxed" style={{ color: theme.text.low }}>
            Content will be about <strong>{summary.detectedProduct.productName}</strong> with 
            the tone from your selected ecosystem setting.
          </p>
        )}
      </div>
      
      {/* Other Context Items */}
      <div>
        {items.map(item => (
          <div key={item.label} className="flex items-center justify-between py-1.5 border-b" style={{ borderColor: theme.stroke.low }}>
            <span className="text-xs font-medium" style={{ color: theme.text.low }}>{item.label}</span>
            <span className="text-xs text-right max-w-[60%] truncate" style={{ color: theme.text.high }}>{item.value}</span>
          </div>
        ))}
      </div>
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
  <span className={className}>
    <DSIcon name="IcShield" size="S" attention="high" />
  </span>
);

/**
 * Content Preview - Shows the analyzed content
 */
const ContentPreview: React.FC<{ content: string }> = ({ content }) => {
  const theme = useThemeColors();
  
  if (!content) return null;
  
  return (
    <div 
      className="p-3 rounded-lg text-sm" 
      style={{ 
        backgroundColor: theme.stroke.low, 
        color: theme.text.high,
        letterSpacing: '-0.12px',
        lineHeight: '22px'
      }}
    >
      "{content}"
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
    <div 
      className="flex items-start gap-2 py-2 border-b last:border-b-0"
      style={{ borderColor: theme.stroke.low }}
    >
      <div 
        className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
        style={{ 
          backgroundColor: isFollowed ? '#00A859' : '#eab308',
        }}
      >
        {isFollowed ? (
          <span className="text-white scale-75">
            <DSIcon name="IcCheck" size="XS" attention="high" />
          </span>
        ) : (
          <span className="text-white scale-75">
            <DSIcon name="IcCircle" size="XS" attention="high" />
          </span>
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
    <div 
      className="py-2 border-b last:border-b-0"
      style={{ borderColor: theme.stroke.low }}
    >
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-medium" style={{ color: theme.text.high }}>
          {validation.agentName}
        </span>
        <span 
          className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
          style={{ 
            backgroundColor: isPerfect ? '#00A859' : '#eab308',
            color: '#ffffff',
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
    <div className="space-y-3">
      {/* Trust Summary Header */}
      <div 
        className="flex items-center gap-3 p-3 rounded-lg" 
        style={{ backgroundColor: 'rgba(0, 168, 89, 0.1)' }}
      >
        <ShieldCheckIcon className="flex-shrink-0 text-[#00A859]" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold" style={{ color: '#00A859' }}>
            {trustSummary.totalRulesPassed}/{trustSummary.totalRulesChecked} rules followed
          </p>
          <p className="text-xs" style={{ color: theme.text.medium }}>
            {trustSummary.compliancePercentage}% compliance achieved
          </p>
        </div>
      </div>
      
      {/* Guardrails Followed (Collapsible) */}
      <Accordion 
        title="Brand Guardrails Followed" 
        defaultOpen={false}
        badge={`${followedCount}/10`}
        variant="card"
      >
        <div>
          {guardrailsFollowed.map(g => (
            <GuardrailItem key={g.id} guardrail={g} />
          ))}
        </div>
      </Accordion>
      
      {/* Validation Rules Passed (Collapsible) */}
      <Accordion 
        title="Validation Rules Applied" 
        defaultOpen={false}
        badge={totalAgentRulesPassed}
        variant="card"
      >
        <div>
          {validationsPassed.map(v => (
            <ValidationAgentItem key={v.agentId} validation={v} />
          ))}
        </div>
      </Accordion>
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
          <div className="px-3 py-3 border-b flex items-center justify-between flex-shrink-0" style={{ borderColor: theme.stroke.low }}>
            <h2 className="text-sm font-semibold" style={{ color: theme.text.high }}>Content Trust</h2>
            <button
              onClick={onClose}
              className="close-trust-btn w-6 h-6 rounded-full flex items-center justify-center transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-1"
              style={{
                backgroundColor: 'transparent',
                color: theme.text.high,
              }}
              aria-label="Close trust panel"
            >
              <DSIcon name="IcClose" size="XS" attention="high" />
              <style>{`
                .close-trust-btn:hover {
                  background-color: ${theme.stroke.low} !important;
                }
              `}</style>
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
          <div className="flex-1 overflow-y-auto p-4 scrollable-container">
          {activeTab === 'score' && explanation && (
            <div className="space-y-3">
              {/* Content Preview - Shows what was analyzed */}
              {complianceJustification && (
                <ContentPreview content={complianceJustification.analyzedContent} />
              )}
              
              {/* Compliance Justification - Trust building section */}
              {complianceJustification && (
                <ComplianceJustificationSection justification={complianceJustification} />
              )}
              
              {/* Score Breakdown - Collapsible */}
              <Accordion 
                title="Score Breakdown" 
                defaultOpen={false}
                badge={explanation.agentBreakdown.length}
                variant="card"
              >
                <div>
                  {explanation.agentBreakdown.map(agent => (
                    <ScoreIndicator key={agent.name} score={agent.score} label={agent.name}
                      status={agent.status} violations={agent.violations} />
                  ))}
                </div>
              </Accordion>
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
                    style={{ backgroundColor: 'rgba(0, 168, 89, 0.1)' }}>
                    <span className="text-[#00A859]">
                      <DSIcon name="IcCheck" size="M" attention="high" />
                    </span>
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
              <DSIcon name="IcStar" size="XS" attention="high" />
              Auto-Fix ({trustScore.autoFixableCount} fixable)
            </button>
          </div>
        )}
      </aside>
  );
});

export default TrustContextPanel;
