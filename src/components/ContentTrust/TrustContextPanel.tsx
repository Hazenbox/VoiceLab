/**
 * TrustContextPanel Component
 * 
 * Slide-out panel showing detailed trust information.
 */

import { memo, useState, useMemo } from 'react';
import { useThemeColors, SEMANTIC_COLORS } from '../../theme';
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
import { Badge } from '../ui/Badge';
import { DSIcon } from '../DSIcon';
import { Title, Tabs, TabList, Tab, Label, Text } from '@marcelinodzn/ds-react';

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
  const statusColors = { pass: SEMANTIC_COLORS.positive, warning: SEMANTIC_COLORS.warning, fail: SEMANTIC_COLORS.negative };
  
  return (
    <div 
      className="flex items-center justify-between py-2 border-b last:border-b-0"
      style={{ borderColor: theme.stroke.low }}
    >
      <Text size="S" color="high">{label}</Text>
      <div className="flex items-center gap-2">
        {violations > 0 && (
          <Badge variant="negative">{violations}</Badge>
        )}
        <span className="text-sm font-medium tabular-nums" style={{ color: statusColors[status] }}>{score}</span>
      </div>
    </div>
  );
};

const ViolationItem: React.FC<{ violation: Violation }> = ({ violation }) => {
  const theme = useThemeColors();
  const severityVariant = { error: 'negative', warning: 'warning', info: 'informative' } as const;
  
  return (
    <div className="p-3 rounded-lg mb-2" style={{ backgroundColor: theme.stroke.low }}>
      <div className="flex items-start gap-2">
        <Badge variant={severityVariant[violation.severity]}>
          {violation.severity}
        </Badge>
        <div className="flex-1 space-y-1">
          <Text size="S" color="high">{violation.rule}</Text>
          {violation.suggestion && (
            <Text size="XS" color="medium">{violation.suggestion}</Text>
          )}
          {violation.text && (
            <Text size="XS" color="low" style={{ fontFamily: 'var(--font-mono)' }}>
              "{violation.text}"
            </Text>
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
    high: SEMANTIC_COLORS.positive,
    medium: SEMANTIC_COLORS.warning,
    low: SEMANTIC_COLORS.negative,
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
            backgroundColor: `${SEMANTIC_COLORS.warning}26`,
            color: SEMANTIC_COLORS.warning,
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
 * Content Preview - Shows the analyzed content
 */
const ContentPreview: React.FC<{ content: string }> = ({ content }) => {
  const theme = useThemeColors();
  
  if (!content) return null;
  
  return (
    <div 
      className="p-3 rounded-lg" 
      style={{ backgroundColor: theme.stroke.low }}
    >
      <Text size="S" color="medium">
        "{content}"
      </Text>
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
      {/* Icon aligned with label (12px font, line-height 1) */}
      <div className="flex-shrink-0 flex items-center" style={{ height: '12px' }}>
        {isFollowed ? (
          <DSIcon name="IcSuccessColored" size="XS" attention="high" />
        ) : (
          <DSIcon name="IcWarningColored" size="XS" attention="high" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <Label size="XS" weight="medium" color="high">{guardrail.rule}</Label>
        <Text size="XS" color="low">{guardrail.description}</Text>
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
        <Label size="XS" weight="medium" color="high">
          {validation.agentName}
        </Label>
        <Badge variant={isPerfect ? 'positive' : 'warning'}>
          {validation.rulesPassed}/{validation.rulesChecked}
        </Badge>
      </div>
      {validation.keyRulesFollowed.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {validation.keyRulesFollowed.slice(0, 3).map((rule, i) => (
            <Badge key={i} variant="neutral">
              {rule}
            </Badge>
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
  const hasViolations = followedCount < guardrailsFollowed.length;
  
  return (
    <div className="space-y-3">
      {/* Trust Summary Header */}
      <div 
        className="p-3 rounded-lg" 
        style={{ backgroundColor: `${SEMANTIC_COLORS.positive}1A` }}
      >
        <Label size="S" weight="high" color="high" style={{ color: SEMANTIC_COLORS.positive }}>
          {trustSummary.totalRulesPassed}/{trustSummary.totalRulesChecked} rules followed
        </Label>
        <Text size="XS" color="medium">
          {trustSummary.compliancePercentage}% compliance achieved
        </Text>
      </div>
      
      {/* Guardrails Followed (Collapsible) */}
      <Accordion 
        title="Brand guardrails followed" 
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
        title="Validation rules applied" 
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
  
  // Get all violations, but filter out auto-fixed avoid words since they've been automatically corrected
  // These violations were in the original content but have been auto-fixed in the displayed content
  const allViolations = useMemo(() => {
    const violations = trustScore?.validationResults.flatMap(vr => vr.violations) || [];
    // Filter out auto-fixable avoid_words violations since they're automatically fixed
    return violations.filter(v => !(v.agentId === 'avoid_words' && v.autoFixable));
  }, [trustScore]);
  
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
          <div className="pl-4 pr-4 py-3 flex items-center justify-between flex-shrink-0">
            <Title size="M" as="h2" weight="high" color="high">
              Content trust
            </Title>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
              style={{
                backgroundColor: theme.background.ghost,
                color: theme.text.medium,
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme.stroke.low}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = theme.background.ghost}
              aria-label="Close trust panel"
            >
              <DSIcon name="IcClose" size="S" attention="medium" />
            </button>
          </div>
        )}
        
        {/* Tabs */}
        {isOpen && (
          <div className="flex-shrink-0 px-4 border-b" style={{ borderColor: theme.stroke.low }}>
            <Tabs 
              selectedKey={activeTab} 
              onSelectionChange={(key) => setActiveTab(key as 'score' | 'context' | 'violations')}
              size="M"
            >
              <TabList>
                <Tab id="score">Score</Tab>
                <Tab id="context">Context</Tab>
                <Tab id="violations">
                  Violations
                  {allViolations.length > 0 && (
                    <span 
                      className="ml-1.5 px-1.5 py-0.5 rounded-full text-[10px]"
                      style={{ backgroundColor: `${SEMANTIC_COLORS.negative}1A`, color: SEMANTIC_COLORS.negative }}
                    >
                      {allViolations.length}
                    </span>
                  )}
                </Tab>
              </TabList>
            </Tabs>
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
                title="Score breakdown" 
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
