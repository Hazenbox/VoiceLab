/**
 * LearningInfoModal Component
 * 
 * Comprehensive modal explaining how the Learning Center works,
 * feedback types, weighting system, admin controls, and the learning loop.
 */

import { memo, useEffect, useCallback } from 'react';
import { useThemeColors } from '../../theme';
import { Title, Text, Divider, Button } from '@marcelinodzn/ds-react';
import { DSIcon } from '../../components/DSIcon';
import { ActionButton } from '../../components/ActionButton';
import { FlowCanvas, FlowNode, FlowArrow, CurvedFlowArrow } from '../../components/FlowDiagram';

interface LearningInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LearningInfoModal = memo(function LearningInfoModal({
  isOpen,
  onClose,
}: LearningInfoModalProps) {
  const theme = useThemeColors();

  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;
    
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9998,
          backgroundColor: 'rgba(0, 0, 0, 0.65)',
        }}
        onClick={handleBackdropClick}
      />
      
      {/* Modal */}
      <div 
        style={{
          position: 'fixed',
          zIndex: 9999,
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          width: '720px',
          maxWidth: '95vw',
          maxHeight: '85vh',
          backgroundColor: theme.background.ghost,
          borderRadius: '16px',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="learning-info-modal-title"
      >
        {/* Header */}
        <div
          style={{
            padding: '0.75rem 1rem 0.75rem 1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: `1px solid ${theme.stroke.low}`,
            flexShrink: 0,
          }}
        >
          <Title size="L" as="h2" weight="high" color="high" id="learning-info-modal-title">
            How the learning center works
          </Title>
          <ActionButton
            icon={<DSIcon name="IcClose" size="S" style={{ color: theme.text.medium }} />}
            label="Close"
            onClick={onClose}
            size={36}
            tooltipDelay={999999}
          />
        </div>
        
        {/* Scrollable Content */}
        <div
          style={{
            flex: 1,
            overflow: 'auto',
            padding: '1.5rem',
          }}
          className="scrollable-container"
        >
          {/* Section 1: What is the Learning Center */}
          <section style={{ marginBottom: '2rem' }}>
            <Title size="M" as="h3" weight="high" color="high" style={{ marginBottom: '0.75rem' }}>
              What is the learning center?
            </Title>
            <Text size="S" weight="low" color="medium" style={{ lineHeight: 1.6 }}>
              The learning center is a continuous improvement system that learns from user feedback. 
              Every thumbs up, thumbs down, or edit teaches the AI what works and what 
              doesn&apos;t. Over time, the system gets better at generating content that matches 
              your team&apos;s style and preferences.
            </Text>
            
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(3, 1fr)', 
              gap: '0.5rem',
              marginTop: '1rem' 
            }}>
              <FeedbackType 
                icon="IcConfirm"
                label="Thumbs up" 
                description="Positive signal"
                theme={theme}
              />
              <FeedbackType 
                icon="IcDislike"
                label="Thumbs down" 
                description="Negative signal"
                theme={theme}
              />
              <FeedbackType 
                icon="IcCode"
                label="Edit" 
                description="Correction pair"
                theme={theme}
              />
            </div>
          </section>

          <Divider />

          {/* Section 2: Feedback Weighting */}
          <section style={{ marginBottom: '2rem', marginTop: '1.5rem' }}>
            <Title size="M" as="h3" weight="high" color="high" style={{ marginBottom: '0.75rem' }}>
              Feedback weighting
            </Title>
            <Text size="S" weight="low" color="medium" style={{ lineHeight: 1.6, marginBottom: '1rem' }}>
              Not all feedback is weighted equally. Edits are the strongest signal because they show 
              exactly what should change. Feedback also decays over time — recent corrections matter 
              more than old ones.
            </Text>

            <div style={{ 
              borderRadius: '8px', 
              border: `1px solid ${theme.stroke.low}`,
              overflow: 'hidden',
              marginBottom: '1rem',
            }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ backgroundColor: theme.background.bold }}>
                    <th style={{ 
                      textAlign: 'left', 
                      padding: '0.625rem 0.75rem', 
                      color: theme.text.high,
                      fontWeight: 500,
                      borderBottom: `1px solid ${theme.stroke.low}`,
                    }}>
                      Feedback type
                    </th>
                    <th style={{ 
                      textAlign: 'left', 
                      padding: '0.625rem 0.75rem', 
                      color: theme.text.high,
                      fontWeight: 500,
                      borderBottom: `1px solid ${theme.stroke.low}`,
                    }}>
                      Weight
                    </th>
                    <th style={{ 
                      textAlign: 'left', 
                      padding: '0.625rem 0.75rem', 
                      color: theme.text.high,
                      fontWeight: 500,
                      borderBottom: `1px solid ${theme.stroke.low}`,
                    }}>
                      Why
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <WeightRow 
                    type="Edit" 
                    weight="1.0" 
                    reason="Shows exact correction — strongest learning signal"
                    theme={theme}
                    isHighest
                  />
                  <WeightRow 
                    type="Thumbs down" 
                    weight="0.8" 
                    reason="Clear negative signal, but no specific fix provided"
                    theme={theme}
                  />
                  <WeightRow 
                    type="Thumbs up" 
                    weight="0.4" 
                    reason="Positive reinforcement, confirms good patterns"
                    theme={theme}
                    isLast
                  />
                </tbody>
              </table>
            </div>

            <div style={{
              padding: '0.875rem 1rem',
              borderRadius: '8px',
              backgroundColor: theme.background.bold,
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.75rem',
            }}>
              <DSIcon name="IcRefresh" size="S" style={{ color: theme.secondary, marginTop: '2px' }} />
              <div>
                <Text size="S" weight="high" color="high" style={{ display: 'block', marginBottom: '0.25rem' }}>
                  Recency decay
                </Text>
                <Text size="XS" weight="low" color="medium">
                  Corrections have a 14-day half-life. A correction from 2 weeks ago has half the weight 
                  of one from today. This ensures the system stays current with evolving preferences.
                </Text>
              </div>
            </div>
          </section>

          <Divider />

          {/* Section 3: Admin Controls */}
          <section style={{ marginBottom: '2rem', marginTop: '1.5rem' }}>
            <Title size="M" as="h3" weight="high" color="high" style={{ marginBottom: '0.75rem' }}>
              Admin controls
            </Title>
            <Text size="S" weight="low" color="medium" style={{ lineHeight: 1.6, marginBottom: '1rem' }}>
              Admins can review and control what the system learns. Not all user feedback should be 
              adopted — some corrections may be incorrect or inconsistent with brand guidelines.
            </Text>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <AdminControl
                icon="IcCheck"
                title="Approve corrections"
                description="Confirmed corrections are applied with full weight to future generations"
                theme={theme}
                color="#22c55e"
              />
              <AdminControl
                icon="IcClose"
                title="Reject corrections"
                description="Rejected corrections are excluded from learning — prevents bad patterns"
                theme={theme}
                color="#ef4444"
              />
              <AdminControl
                icon="IcSearch"
                title="Review queue"
                description="See all pending corrections, sorted by impact and recency"
                theme={theme}
                color={theme.secondary}
              />
            </div>
          </section>

          <Divider />

          {/* Section 4: Learning Flow */}
          <section style={{ marginBottom: '2rem', marginTop: '1.5rem' }}>
            <Title size="M" as="h3" weight="high" color="high" style={{ marginBottom: '0.75rem' }}>
              Learning loop
            </Title>
            <Text size="S" weight="low" color="medium" style={{ lineHeight: 1.6, marginBottom: '1rem' }}>
              The system continuously improves through a feedback loop:
            </Text>

            <div
              style={{
                padding: '1rem',
                borderRadius: '12px',
                overflow: 'hidden',
                backgroundColor: theme.background.bold,
                border: `1px solid ${theme.stroke.low}`,
              }}
            >
              <FlowCanvas height={220} viewBox="0 0 650 220" dotColor={theme.stroke.low}>
                {/* Generate content */}
                <FlowNode 
                  x={220} y={10} width={200} height={45} 
                  label="Generate content" 
                  color={theme.secondary} 
                  textColor="#fff" 
                  strokeColor={theme.secondary} 
                  noShadow 
                  labelFontSize={13}
                />
                <CurvedFlowArrow startX={420} startY={32} endX={510} endY={70} color={theme.secondary} />

                {/* User sees response */}
                <FlowNode 
                  x={460} y={70} width={170} height={45} 
                  label="User sees response" 
                  color={theme.background.ghost} 
                  textColor={theme.text.high} 
                  strokeColor={theme.stroke.medium} 
                  noShadow 
                  labelFontSize={13}
                />
                <CurvedFlowArrow startX={545} startY={115} endX={455} endY={155} color={theme.secondary} />

                {/* Feedback provided */}
                <FlowNode 
                  x={220} y={155} width={235} height={45} 
                  label="User provides feedback" 
                  sublabel="thumbs up, thumbs down, edit"
                  color={theme.background.ghost} 
                  textColor={theme.text.high} 
                  strokeColor={theme.stroke.medium} 
                  noShadow 
                  labelFontSize={13}
                  sublabelFontSize={11}
                />
                <CurvedFlowArrow startX={220} startY={177} endX={130} endY={115} color={theme.secondary} />

                {/* Learning engine */}
                <FlowNode 
                  x={20} y={70} width={170} height={45} 
                  label="Learning engine" 
                  sublabel="extracts patterns"
                  color={theme.background.ghost} 
                  textColor={theme.text.high} 
                  strokeColor={theme.stroke.medium} 
                  noShadow 
                  labelFontSize={13}
                  sublabelFontSize={11}
                />
                <CurvedFlowArrow startX={105} startY={70} endX={220} endY={32} color={theme.secondary} />
              </FlowCanvas>
            </div>
          </section>

          <Divider />

          {/* Section 5: Before/After Example */}
          <section style={{ marginTop: '1.5rem' }}>
            <Title size="M" as="h3" weight="high" color="high" style={{ marginBottom: '0.75rem' }}>
              Learning in action
            </Title>

            <BeforeAfterExample
              beforeLabel="Before learning"
              beforeText="Get excited! This amazing offer is just for you! Don't miss out on this incredible deal!"
              afterLabel="After user corrected tone"
              afterText="Here is a thoughtful offer based on your usage. Take a look when you have a moment — it might be a good fit."
              theme={theme}
            />
          </section>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '0.75rem 1.5rem',
            borderTop: `1px solid ${theme.stroke.low}`,
            display: 'flex',
            justifyContent: 'flex-end',
            flexShrink: 0,
          }}
        >
          <Button appearance="primary" size="S" onPress={onClose}>
            Got it
          </Button>
        </div>
      </div>
    </>
  );
});

// Sub-components

interface FeedbackTypeProps {
  icon: string;
  label: string;
  description: string;
  theme: ReturnType<typeof useThemeColors>;
}

const FeedbackType = memo(function FeedbackType({ 
  icon, 
  label, 
  description, 
  theme 
}: FeedbackTypeProps) {
  return (
    <div style={{
      padding: '0.75rem 0.5rem',
      borderRadius: '8px',
      backgroundColor: theme.background.bold,
      textAlign: 'center',
    }}>
      <DSIcon name={icon} size="M" style={{ color: theme.secondary, marginBottom: '0.5rem' }} />
      <Text size="XS" weight="high" color="high" style={{ display: 'block', marginBottom: '0.125rem' }}>
        {label}
      </Text>
      <Text size="XS" weight="low" color="low" style={{ fontSize: '10px' }}>
        {description}
      </Text>
    </div>
  );
});

interface WeightRowProps {
  type: string;
  weight: string;
  reason: string;
  theme: ReturnType<typeof useThemeColors>;
  isHighest?: boolean;
  isLast?: boolean;
}

const WeightRow = memo(function WeightRow({ 
  type, 
  weight, 
  reason, 
  theme, 
  isHighest,
  isLast 
}: WeightRowProps) {
  return (
    <tr>
      <td style={{ 
        padding: '0.5rem 0.75rem', 
        color: theme.text.high,
        fontWeight: 500,
        borderBottom: isLast ? 'none' : `1px solid ${theme.stroke.low}`,
      }}>
        {type}
      </td>
      <td style={{ 
        padding: '0.5rem 0.75rem', 
        color: isHighest ? theme.secondary : theme.text.high,
        fontWeight: isHighest ? 600 : 500,
        fontFamily: 'monospace',
        fontSize: '13px',
        borderBottom: isLast ? 'none' : `1px solid ${theme.stroke.low}`,
      }}>
        {weight}
      </td>
      <td style={{ 
        padding: '0.5rem 0.75rem', 
        color: theme.text.medium,
        borderBottom: isLast ? 'none' : `1px solid ${theme.stroke.low}`,
      }}>
        {reason}
      </td>
    </tr>
  );
});

interface AdminControlProps {
  icon: string;
  title: string;
  description: string;
  theme: ReturnType<typeof useThemeColors>;
  color: string;
}

const AdminControl = memo(function AdminControl({ 
  icon, 
  title, 
  description, 
  theme,
  color 
}: AdminControlProps) {
  return (
    <div style={{
      padding: '0.875rem 1rem',
      borderRadius: '8px',
      backgroundColor: theme.background.bold,
      display: 'flex',
      alignItems: 'flex-start',
      gap: '0.75rem',
    }}>
      <div style={{
        width: '28px',
        height: '28px',
        borderRadius: '6px',
        backgroundColor: `${color}15`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}>
        <DSIcon name={icon} size="S" style={{ color }} />
      </div>
      <div>
        <Text size="S" weight="high" color="high" style={{ display: 'block', marginBottom: '0.125rem' }}>
          {title}
        </Text>
        <Text size="XS" weight="low" color="medium">
          {description}
        </Text>
      </div>
    </div>
  );
});

interface BeforeAfterExampleProps {
  beforeLabel: string;
  beforeText: string;
  afterLabel: string;
  afterText: string;
  theme: ReturnType<typeof useThemeColors>;
}

const BeforeAfterExample = memo(function BeforeAfterExample({ 
  beforeLabel, 
  beforeText, 
  afterLabel, 
  afterText, 
  theme 
}: BeforeAfterExampleProps) {
  return (
    <div style={{ display: 'flex', gap: '1rem' }}>
      <div style={{
        flex: 1,
        padding: '1rem',
        borderRadius: '8px',
        border: `1px solid #ef444420`,
        backgroundColor: '#ef444408',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
          <DSIcon name="IcClose" size="S" style={{ color: '#ef4444' }} />
          <Text size="S" weight="high" color="high">
            {beforeLabel}
          </Text>
        </div>
        <Text size="S" weight="low" color="high" style={{ lineHeight: 1.6 }}>
          {beforeText}
        </Text>
      </div>

      <div style={{
        flex: 1,
        padding: '1rem',
        borderRadius: '8px',
        border: `1px solid #22c55e20`,
        backgroundColor: '#22c55e08',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
          <DSIcon name="IcCheck" size="S" style={{ color: '#22c55e' }} />
          <Text size="S" weight="high" color="high">
            {afterLabel}
          </Text>
        </div>
        <Text size="S" weight="low" color="high" style={{ lineHeight: 1.6 }}>
          {afterText}
        </Text>
      </div>
    </div>
  );
});

export default LearningInfoModal;
