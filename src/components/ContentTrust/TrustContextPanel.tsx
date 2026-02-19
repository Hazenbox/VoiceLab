/**
 * TrustContextPanel Component
 * 
 * Slide-out panel showing detailed trust information.
 */

import { memo, useState, useMemo, useCallback } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useThemeColors, SEMANTIC_COLORS } from '../../theme';
import type { 
  TrustScore, 
  GenerationContext, 
  Violation, 
  ComplianceJustification,
  GuardrailStatus,
  ValidationAgentSummary,
  GenerationEvidence,
} from '../../types';
import { 
  getScoreExplanation, 
  getComplianceJustification,
} from '../../services/trust';
import { getContextSummary } from '../../services/context';
import { useUIStore } from '../../stores/uiStore';
import { Accordion } from '../ui/Accordion';
import { Badge } from '../ui/Badge';
import { DSIcon } from '../DSIcon';
import { Title, Tabs, TabList, Tab, Label, Text, Button } from '@marcelinodzn/ds-react';

interface TrustContextPanelProps {
  isOpen: boolean;
  onClose: () => void;
  trustScore?: TrustScore;
  generationContext?: GenerationContext;
  analyzedContent?: string;
  onAutoFix?: () => void;
  autoFixAvailable?: boolean;
  /** Evidence of what influenced the generation */
  evidence?: GenerationEvidence;
  /** The message ID being viewed (for highlighting) */
  messageId?: string;
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

const ViolationItem: React.FC<{ 
  violation: Violation;
  onClick?: () => void;
}> = ({ violation, onClick }) => {
  const theme = useThemeColors();
  const severityVariant = { error: 'negative', warning: 'warning', info: 'informative' } as const;
  const isClickable = onClick && violation.text;
  
  return (
    <div 
      className="p-3 rounded-lg mb-2" 
      onClick={isClickable ? onClick : undefined}
      onMouseEnter={(e) => { if (isClickable) e.currentTarget.style.opacity = '0.8'; }}
      onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
      style={{ 
        backgroundColor: theme.stroke.low,
        cursor: isClickable ? 'pointer' : 'default',
        transition: 'opacity 150ms',
      }}
    >
      <div className="flex items-start gap-3">
        <Badge variant={severityVariant[violation.severity]}>
          {violation.severity}
        </Badge>
        <div className="flex-1">
          <Text size="S" color="high">{violation.rule}</Text>
          {violation.suggestion && (
            <div className="mt-2">
              <Text size="XS" color="medium">{violation.suggestion}</Text>
            </div>
          )}
          {violation.text && (
            <div className="mt-3">
              <span 
                className="inline-block px-2 py-1 rounded"
                style={{ backgroundColor: theme.stroke.medium, fontFamily: 'var(--font-mono)', fontSize: '12px', color: theme.text.medium }}
              >
                "{violation.text}"
              </span>
            </div>
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
  if (!productName) {
    return (
      <Text size="XS" color="low">No specific product detected</Text>
    );
  }
  
  const confidenceVariant = {
    high: 'positive',
    medium: 'warning',
    low: 'negative',
  } as const;
  
  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="flex items-center gap-1.5">
        <Badge variant={confidenceVariant[confidence as keyof typeof confidenceVariant] || 'neutral'}>
          {confidence}
        </Badge>
        <Label size="XS" weight="medium" color="high">{productName}</Label>
      </div>
      {ecosystemMismatch && suggestedEcosystem && (
        <Badge variant="warning">
          Typically uses {suggestedEcosystem} tone
        </Badge>
      )}
      {matchedKeywords.length > 0 && (
        <div className="flex flex-wrap gap-1 justify-end">
          {matchedKeywords.slice(0, 3).map((kw, i) => (
            <Badge key={i} variant="neutral">{kw}</Badge>
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
    { label: 'Tone & voice', value: summary.ecosystem },
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
        <Label size="XS" weight="high" color="high">Detected topic</Label>
        <DetectedProductBadge 
          productName={summary.detectedProduct.productName}
          confidence={summary.detectedProduct.confidence}
          ecosystemMismatch={summary.detectedProduct.ecosystemMismatch}
          suggestedEcosystem={summary.detectedProduct.suggestedEcosystem}
          matchedKeywords={summary.detectedProduct.matchedKeywords}
        />
        {summary.detectedProduct.ecosystemMismatch && (
          <Text size="XS" color="low">
            Content will be about <strong>{summary.detectedProduct.productName}</strong> with 
            the tone from your selected ecosystem setting.
          </Text>
        )}
      </div>
      
      {/* Other Context Items */}
      <div>
        {items.map((item, index) => (
          <div 
            key={item.label} 
            className="flex items-center justify-between py-2"
            style={{ borderBottom: index < items.length - 1 ? `1px solid ${theme.stroke.low}` : 'none' }}
          >
            <Label size="XS" weight="medium" color="low">{item.label}</Label>
            <Text size="XS" color="high" style={{ textAlign: 'right', maxWidth: '60%' }}>{item.value}</Text>
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
      className="flex items-start gap-2 pt-0.5 pb-2 border-b last:border-b-0"
      style={{ borderColor: theme.stroke.low }}
    >
      <div className="flex-shrink-0 flex items-center pt-2.5" style={{ height: '15px' }}>
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

// =============================================================================
// EVIDENCE SECTION - Shows what influenced the generation
// =============================================================================

/**
 * Evidence Timeline Item - A single step in the timeline
 * Clean, minimal design with numbered steps and connected line
 */
const EvidenceTimelineItem: React.FC<{
  title: string;
  stepNumber: number;
  items: Array<{ label: string; value: string | number }>;
  tags?: string[];
  fixes?: Array<{ from: string; to: string }>;
  onFixClick?: (fixTo: string) => void;
  isLast?: boolean;
}> = ({ title, stepNumber, items, tags, fixes, onFixClick, isLast = false }) => {
  const theme = useThemeColors();
  
  return (
    <div style={{ display: 'flex', gap: '12px' }}>
      {/* Timeline column: numbered circle + connector line */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ 
          width: '20px', 
          height: '20px', 
          borderRadius: '50%',
          backgroundColor: SEMANTIC_COLORS.informative, 
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <span style={{ color: '#ffffff', fontSize: '11px', fontWeight: 600 }}>{stepNumber}</span>
        </div>
        {/* Connector line - extends to next step */}
        {!isLast && (
          <div style={{ 
            width: '1px', 
            flex: 1,
            backgroundColor: theme.stroke.low,
          }} />
        )}
      </div>
      
      {/* Content */}
      <div style={{ flex: 1, paddingBottom: isLast ? 0 : '32px' }}>
        {/* Title row - height matches circle for vertical centering */}
        <div style={{ height: '20px', display: 'flex', alignItems: 'center' }}>
          <Label size="S" weight="high" color="high">{title}</Label>
        </div>
        <div style={{ marginTop: '4px' }}>
          <Text size="XS" color="medium">
            {items.map((item, i) => (
              <span key={i}>
                {item.label}: <span style={{ color: theme.text.high, fontWeight: 500 }}>{item.value}</span>
                {i < items.length - 1 && <span style={{ margin: '0 8px', color: theme.stroke.medium }}>|</span>}
              </span>
            ))}
          </Text>
        </div>
        {/* Auto-fixes displayed as individual rows with dividers */}
        {fixes && fixes.length > 0 && (
          <div style={{ marginTop: '8px' }}>
            {fixes.map((fix, idx) => (
              <div 
                key={idx}
                onClick={() => onFixClick?.(fix.to)}
                onMouseEnter={(e) => { if (onFixClick) e.currentTarget.style.backgroundColor = theme.stroke.low; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                style={{ 
                  padding: '8px 4px',
                  marginLeft: '-4px',
                  marginRight: '-4px',
                  borderRadius: '4px',
                  borderBottom: idx < fixes.length - 1 ? `1px solid ${theme.stroke.low}` : 'none',
                  cursor: onFixClick ? 'pointer' : 'default',
                  transition: 'background-color 150ms',
                }}
              >
                <Text size="XS" color="medium">
                  <span style={{ color: theme.text.high, fontWeight: 500 }}>"{fix.from}"</span>
                  <span style={{ margin: '0 8px' }}>→</span>
                  <span style={{ color: theme.text.high, fontWeight: 500 }}>"{fix.to}"</span>
                </Text>
              </div>
            ))}
          </div>
        )}
        {/* Inline tags */}
        {tags && tags.length > 0 && (
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '8px' }}>
            {tags.map((tag, idx) => (
              <Badge key={idx} variant="neutral">{tag}</Badge>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Evidence Section - Main evidence display with clean timeline
 * Uses pure DS components and inline styles (no Tailwind)
 */
const EvidenceSection: React.FC<{ 
  evidence: GenerationEvidence;
  onFixClick?: (fixTo: string) => void;
}> = ({ evidence, onFixClick }) => {
  const theme = useThemeColors();
  
  const hasKnowledge = evidence.knowledgeUsed.avoidWordsMatched.length > 0 || 
                       evidence.knowledgeUsed.preferredWordsUsed.length > 0 ||
                       evidence.knowledgeUsed.autoFixRulesCount > 0;
  
  const hasLearnings = evidence.learningsApplied.correctionsCount > 0 ||
                       evidence.learningsApplied.avoidPatterns.length > 0 ||
                       evidence.learningsApplied.stylePreferences.length > 0;
  
  const hasAutoFixes = evidence.autoFixes.totalCount > 0;
  
  const totalInfluences = (hasKnowledge ? 1 : 0) + (hasLearnings ? 1 : 0) + (hasAutoFixes ? 1 : 0);
  
  // Build timeline items array
  const timelineItems: Array<{
    title: string;
    items: Array<{ label: string; value: string | number }>;
    tags?: string[];
    fixes?: Array<{ from: string; to: string }>;
  }> = [];
  
  if (hasKnowledge) {
    timelineItems.push({
      title: 'Knowledge base',
      items: [
        { label: 'avoid words', value: evidence.knowledgeUsed.avoidWordsMatched.length },
        { label: 'preferred', value: evidence.knowledgeUsed.preferredWordsUsed.length },
        { label: 'rules', value: evidence.knowledgeUsed.autoFixRulesCount },
      ],
      tags: evidence.knowledgeUsed.avoidWordsMatched.length > 0 
        ? evidence.knowledgeUsed.avoidWordsMatched.slice(0, 5) 
        : undefined,
    });
  }
  
  if (hasLearnings) {
    timelineItems.push({
      title: 'Learnings applied',
      items: [
        { label: 'corrections', value: evidence.learningsApplied.correctionsCount },
        { label: 'avoid patterns', value: evidence.learningsApplied.avoidPatterns.length },
      ],
      tags: evidence.learningsApplied.avoidPatterns.length > 0 
        ? evidence.learningsApplied.avoidPatterns.slice(0, 5) 
        : undefined,
    });
  }
  
  if (hasAutoFixes) {
    timelineItems.push({
      title: 'Auto-fixes applied',
      items: [
        { label: 'replacements', value: evidence.autoFixes.totalCount },
      ],
      fixes: evidence.autoFixes.applied,
    });
  }
  
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Summary Header - simple text, no card */}
      <div>
        <p style={{ 
          fontFamily: '"JioType Var"', 
          fontWeight: 700, 
          fontSize: '14px', 
          lineHeight: 1.1, 
          color: theme.text.high,
          margin: 0,
        }}>
          {totalInfluences} influence{totalInfluences !== 1 ? 's' : ''} shaped this response.
        </p>
        <p style={{ 
          fontFamily: '"JioType Var"', 
          fontWeight: 400, 
          fontSize: '12px', 
          lineHeight: 1.3, 
          color: theme.text.high,
          margin: 0,
          marginTop: '4px',
          paddingBottom: '16px',
        }}>
          See exactly what rules, learnings, and fixes were applied.
        </p>
      </div>
      
      {/* Timeline */}
      {timelineItems.length > 0 && (
        <div>
          {timelineItems.map((item, index) => (
            <EvidenceTimelineItem
              key={index}
              stepNumber={index + 1}
              title={item.title}
              items={item.items}
              tags={item.tags}
              fixes={item.fixes}
              onFixClick={item.fixes ? onFixClick : undefined}
              isLast={index === timelineItems.length - 1}
            />
          ))}
        </div>
      )}
      
      {/* No Evidence State */}
      {!hasKnowledge && !hasLearnings && !hasAutoFixes && (
        <div 
          style={{ 
            textAlign: 'center', 
            paddingTop: '32px', 
            paddingBottom: '32px',
          }}
        >
          <div 
            style={{ 
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              margin: '0 auto 12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: theme.stroke.low,
            }}
          >
            <DSIcon name="IcInfo" size="M" attention="low" />
          </div>
          <Text size="S" color="medium">No specific rules or learnings were applied</Text>
          <div style={{ marginTop: '4px' }}>
            <Text size="XS" color="low">This response used default generation settings</Text>
          </div>
        </div>
      )}
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
  evidence,
  messageId,
}: TrustContextPanelProps) {
  const theme = useThemeColors();
  const [activeTab, setActiveTab] = useState<'score' | 'context' | 'violations' | 'autofix'>('score');
  
  // Highlight state for interactive rows
  const { setHighlightedText, clearHighlight } = useUIStore(
    useShallow((s) => ({
      setHighlightedText: s.setHighlightedText,
      clearHighlight: s.clearHighlight,
    }))
  );
  
  // Handle fix click - highlight the replacement text in chat
  const handleFixClick = useCallback((fixTo: string) => {
    if (messageId) {
      setHighlightedText(fixTo, messageId);
    }
  }, [messageId, setHighlightedText]);
  
  // Handle violation click - highlight the problematic text in chat
  const handleViolationClick = useCallback((violationText: string) => {
    if (messageId) {
      setHighlightedText(violationText, messageId);
    }
  }, [messageId, setHighlightedText]);
  
  // Handle close - clear highlights
  const handleClose = useCallback(() => {
    clearHighlight();
    onClose();
  }, [clearHighlight, onClose]);
  
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
        borderLeft: `1px solid ${theme.stroke.medium}`,
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
              onClick={handleClose}
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
          <div className="flex-shrink-0 px-4 border-b" style={{ borderColor: theme.stroke.medium }}>
            <Tabs 
              selectedKey={activeTab} 
              onSelectionChange={(key) => setActiveTab(key as 'score' | 'context' | 'violations' | 'autofix')}
              size="S"
            >
              <TabList>
                <Tab id="score">Score</Tab>
                <Tab id="context">Context</Tab>
                <Tab id="violations">
                  <span className="flex items-center gap-1.5">
                    Violations
                    {allViolations.length > 0 && (
                      <Badge variant="negative">{allViolations.length}</Badge>
                    )}
                  </span>
                </Tab>
                <Tab id="autofix">Auto-fix</Tab>
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
                  <p className="text-sm" style={{ color: theme.text.medium }}>No violations found!</p>
                </div>
              ) : (
                allViolations.map((violation, i) => (
                  <ViolationItem 
                    key={i} 
                    violation={violation} 
                    onClick={violation.text ? () => handleViolationClick(violation.text) : undefined}
                  />
                ))
              )}
            </div>
          )}
          
          {activeTab === 'autofix' && evidence && <EvidenceSection evidence={evidence} onFixClick={handleFixClick} />}
          {activeTab === 'autofix' && !evidence && (
            <div style={{ textAlign: 'center', paddingTop: '32px', paddingBottom: '32px' }}>
              <div 
                style={{ 
                  width: '48px', 
                  height: '48px', 
                  borderRadius: '50%', 
                  margin: '0 auto 12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: theme.stroke.low,
                }}
              >
                <DSIcon name="IcInfo" size="M" attention="low" />
              </div>
              <Text size="S" color="medium">No auto-fixes applied</Text>
              <div style={{ marginTop: '4px' }}>
                <Text size="XS" color="low">Auto-fixes are applied during content generation</Text>
              </div>
            </div>
          )}
          </div>
        )}
        
        
      </aside>
  );
});

export default TrustContextPanel;
