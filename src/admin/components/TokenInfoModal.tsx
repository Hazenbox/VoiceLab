/**
 * TokenInfoModal Component
 * 
 * Comprehensive modal explaining how tokens work in the system,
 * their architecture, impact on generation, and real examples.
 */

import { memo, useEffect, useCallback } from 'react';
import { useThemeColors } from '../../theme';
import { Title, Text, Divider, Button } from '@marcelinodzn/ds-react';
import { DSIcon } from '../../components/DSIcon';
import { ActionButton } from '../../components/ActionButton';

interface TokenInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TokenInfoModal = memo(function TokenInfoModal({
  isOpen,
  onClose,
}: TokenInfoModalProps) {
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
        aria-labelledby="token-info-modal-title"
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
          <Title size="L" as="h2" weight="high" color="high" id="token-info-modal-title">
            How tokens work
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
          {/* Section 1: What are Tokens */}
          <section style={{ marginBottom: '2rem' }}>
            <Title size="M" as="h3" weight="high" color="high" style={{ marginBottom: '0.75rem' }}>
              What are tokens?
            </Title>
            <Text size="S" weight="low" color="medium" style={{ lineHeight: 1.6 }}>
              Tokens are structured labels that describe every aspect of a conversation. 
              The system automatically detects these from user messages and context, 
              then uses them to shape how the AI responds. Users never see tokens — 
              they work behind the scenes to ensure consistent, appropriate responses.
            </Text>
            
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(2, 1fr)', 
              gap: '0.75rem',
              marginTop: '1rem' 
            }}>
              <TokenCategory 
                label="User intent" 
                description="What the user wants (ask info, solve problem, make decision)"
                theme={theme}
              />
              <TokenCategory 
                label="Emotion state" 
                description="How the user feels using Navarasa (angry, sad, curious, calm)"
                theme={theme}
              />
              <TokenCategory 
                label="Safety domain" 
                description="Sensitive topics detected (health, finance, legal, self-harm)"
                theme={theme}
              />
              <TokenCategory 
                label="Channel" 
                description="Where the conversation happens (app, WhatsApp, IVR, SMS)"
                theme={theme}
              />
              <TokenCategory 
                label="Context" 
                description="Time, urgency, session history, journey stage"
                theme={theme}
              />
              <TokenCategory 
                label="Persona" 
                description="Relationship posture (friend, guide, expert, support)"
                theme={theme}
              />
            </div>
          </section>

          <Divider />

          {/* Section 2: Architecture */}
          <section style={{ marginBottom: '2rem', marginTop: '1.5rem' }}>
            <Title size="M" as="h3" weight="high" color="high" style={{ marginBottom: '0.75rem' }}>
              Three-layer architecture
            </Title>
            <Text size="S" weight="low" color="medium" style={{ lineHeight: 1.6, marginBottom: '1rem' }}>
              The system operates in three layers. Tokens control Layer 2, shaping every response 
              with brand tone, safety posture, and contextual awareness.
            </Text>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <ArchitectureLayer
                number={1}
                title="Base LLM"
                description="Open-domain knowledge, reasoning, multi-turn conversations, creative writing"
                theme={theme}
                color={theme.text.low}
              />
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <DSIcon name="IcChevronDown" size="S" style={{ color: theme.text.low }} />
              </div>
              <ArchitectureLayer
                number={2}
                title="Jio Experience Layer (TOKENS)"
                description="Routing, brand tone, safety posture, emotion response, cultural localization, nudging controls"
                theme={theme}
                color={theme.accent}
                highlighted
              />
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <DSIcon name="IcChevronDown" size="S" style={{ color: theme.text.low }} />
              </div>
              <ArchitectureLayer
                number={3}
                title="Safety & Enforcement"
                description="Hard policy enforcement, compliance blocks, escalation triggers, logging"
                theme={theme}
                color={theme.text.low}
              />
            </div>
          </section>

          <Divider />

          {/* Section 3: Impact Table */}
          <section style={{ marginBottom: '2rem', marginTop: '1.5rem' }}>
            <Title size="M" as="h3" weight="high" color="high" style={{ marginBottom: '0.75rem' }}>
              How tokens impact generation
            </Title>
            <Text size="S" weight="low" color="medium" style={{ lineHeight: 1.6, marginBottom: '1rem' }}>
              Each token value triggers specific behavior rules for the AI:
            </Text>

            <div style={{ 
              borderRadius: '8px', 
              border: `1px solid ${theme.stroke.low}`,
              overflow: 'hidden',
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
                      Token
                    </th>
                    <th style={{ 
                      textAlign: 'left', 
                      padding: '0.625rem 0.75rem', 
                      color: theme.text.high,
                      fontWeight: 500,
                      borderBottom: `1px solid ${theme.stroke.low}`,
                    }}>
                      Value
                    </th>
                    <th style={{ 
                      textAlign: 'left', 
                      padding: '0.625rem 0.75rem', 
                      color: theme.text.high,
                      fontWeight: 500,
                      borderBottom: `1px solid ${theme.stroke.low}`,
                    }}>
                      Impact on AI response
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <ImpactRow 
                    token="emotion.rasa.user" 
                    value="raudra (angry)" 
                    impact="Lead with empathy, stay calm, be solution-focused, no fluff"
                    theme={theme}
                  />
                  <ImpactRow 
                    token="safety.level" 
                    value="critical" 
                    impact="Emergency redirect, provide helpline numbers, no advice given"
                    theme={theme}
                  />
                  <ImpactRow 
                    token="channel" 
                    value="sms" 
                    impact="Very concise, character-limited, no excess context"
                    theme={theme}
                  />
                  <ImpactRow 
                    token="nudge.permission" 
                    value="blocked" 
                    impact="No Jio service suggestions allowed under any circumstance"
                    theme={theme}
                  />
                  <ImpactRow 
                    token="persona" 
                    value="jio_support" 
                    impact="Calm, composed, acknowledge first, resolve quickly"
                    theme={theme}
                  />
                  <ImpactRow 
                    token="context.urgency" 
                    value="high" 
                    impact="Prioritize speed, reduce cognitive load, shorter responses"
                    theme={theme}
                  />
                  <ImpactRow 
                    token="literacy" 
                    value="low" 
                    impact="Simple words, short sentences, more step-by-step guidance"
                    theme={theme}
                    isLast
                  />
                </tbody>
              </table>
            </div>
          </section>

          <Divider />

          {/* Section 4: Examples */}
          <section style={{ marginBottom: '2rem', marginTop: '1.5rem' }}>
            <Title size="M" as="h3" weight="high" color="high" style={{ marginBottom: '0.75rem' }}>
              Example scenarios
            </Title>

            <ExampleScenario
              title="Frustrated user with billing issue"
              userMessage="My bill is wrong AGAIN! This is the third time!"
              tokens={[
                { key: 'user.intent', value: 'solve_problem' },
                { key: 'emotion.rasa.user', value: 'raudra (anger)' },
                { key: 'emotion.intensity', value: 'high' },
                { key: 'context.session', value: 'repeat_issue' },
                { key: 'nudge.permission', value: 'blocked' },
                { key: 'persona', value: 'jio_support' },
              ]}
              result="AI acknowledges frustration first, apologizes sincerely, provides clear resolution steps, no promotional suggestions, offers escalation path."
              theme={theme}
            />

            <div style={{ height: '1rem' }} />

            <ExampleScenario
              title="Curious user exploring plans"
              userMessage="What plans do you have for streaming?"
              tokens={[
                { key: 'user.intent', value: 'make_decision' },
                { key: 'emotion.rasa.user', value: 'adbhuta (curiosity)' },
                { key: 'context.journey_stage', value: 'discover' },
                { key: 'nudge.permission', value: 'proactive_allowed' },
                { key: 'persona', value: 'jio_guide' },
              ]}
              result="AI provides structured comparison, can proactively recommend relevant plans, maintains helpful and exploratory tone."
              theme={theme}
            />
          </section>

          <Divider />

          {/* Section 5: Processing Flow */}
          <section style={{ marginTop: '1.5rem' }}>
            <Title size="M" as="h3" weight="high" color="high" style={{ marginBottom: '0.75rem' }}>
              Token processing flow
            </Title>
            <Text size="S" weight="low" color="medium" style={{ lineHeight: 1.6, marginBottom: '1rem' }}>
              From user message to AI response, tokens shape every step:
            </Text>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <FlowStep number={1} text="User sends message" theme={theme} />
              <FlowStep number={2} text="Token Classifier analyzes message + context" theme={theme} />
              <FlowStep number={3} text="Tokens assembled (intent, emotion, safety, channel...)" theme={theme} />
              <FlowStep number={4} text="Token Rules map values to LLM behavior instructions" theme={theme} />
              <FlowStep number={5} text="Token Gate checks for blocking conditions" theme={theme} />
              <FlowStep number={6} text="Prompt built with token instructions embedded" theme={theme} />
              <FlowStep number={7} text="LLM generates response shaped by token rules" theme={theme} />
              <FlowStep number={8} text="Token Enforcement validates output against content rules" theme={theme} />
              <FlowStep number={9} text="Response delivered to user" theme={theme} isLast />
            </div>
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

interface TokenCategoryProps {
  label: string;
  description: string;
  theme: ReturnType<typeof useThemeColors>;
}

const TokenCategory = memo(function TokenCategory({ label, description, theme }: TokenCategoryProps) {
  return (
    <div style={{
      padding: '0.75rem',
      borderRadius: '8px',
      backgroundColor: theme.background.bold,
    }}>
      <Text size="S" weight="high" color="high" style={{ display: 'block', marginBottom: '0.25rem' }}>
        {label}
      </Text>
      <Text size="XS" weight="low" color="low">
        {description}
      </Text>
    </div>
  );
});

interface ArchitectureLayerProps {
  number: number;
  title: string;
  description: string;
  theme: ReturnType<typeof useThemeColors>;
  color: string;
  highlighted?: boolean;
}

const ArchitectureLayer = memo(function ArchitectureLayer({ 
  number, 
  title, 
  description, 
  theme, 
  color,
  highlighted 
}: ArchitectureLayerProps) {
  return (
    <div style={{
      padding: '0.875rem 1rem',
      borderRadius: '8px',
      border: `1px solid ${highlighted ? color : theme.stroke.low}`,
      backgroundColor: highlighted ? `${color}10` : theme.background.bold,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
        <span style={{
          width: '20px',
          height: '20px',
          borderRadius: '50%',
          backgroundColor: color,
          color: '#fff',
          fontSize: '11px',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          {number}
        </span>
        <Text size="S" weight="high" color="high">
          {title}
        </Text>
      </div>
      <Text size="XS" weight="low" color="medium" style={{ marginLeft: '28px' }}>
        {description}
      </Text>
    </div>
  );
});

interface ImpactRowProps {
  token: string;
  value: string;
  impact: string;
  theme: ReturnType<typeof useThemeColors>;
  isLast?: boolean;
}

const ImpactRow = memo(function ImpactRow({ token, value, impact, theme, isLast }: ImpactRowProps) {
  return (
    <tr>
      <td style={{ 
        padding: '0.5rem 0.75rem', 
        color: theme.text.high,
        fontFamily: 'monospace',
        fontSize: '12px',
        borderBottom: isLast ? 'none' : `1px solid ${theme.stroke.low}`,
      }}>
        {token}
      </td>
      <td style={{ 
        padding: '0.5rem 0.75rem', 
        color: theme.accent,
        fontWeight: 500,
        borderBottom: isLast ? 'none' : `1px solid ${theme.stroke.low}`,
      }}>
        {value}
      </td>
      <td style={{ 
        padding: '0.5rem 0.75rem', 
        color: theme.text.medium,
        borderBottom: isLast ? 'none' : `1px solid ${theme.stroke.low}`,
      }}>
        {impact}
      </td>
    </tr>
  );
});

interface ExampleScenarioProps {
  title: string;
  userMessage: string;
  tokens: Array<{ key: string; value: string }>;
  result: string;
  theme: ReturnType<typeof useThemeColors>;
}

const ExampleScenario = memo(function ExampleScenario({ 
  title, 
  userMessage, 
  tokens, 
  result, 
  theme 
}: ExampleScenarioProps) {
  return (
    <div style={{
      padding: '1rem',
      borderRadius: '8px',
      border: `1px solid ${theme.stroke.low}`,
      backgroundColor: theme.background.bold,
    }}>
      <Text size="S" weight="high" color="high" style={{ display: 'block', marginBottom: '0.75rem' }}>
        {title}
      </Text>
      
      <div style={{ 
        padding: '0.5rem 0.75rem', 
        borderRadius: '6px', 
        backgroundColor: theme.background.ghost,
        marginBottom: '0.75rem',
      }}>
        <Text size="XS" weight="low" color="low" style={{ display: 'block', marginBottom: '0.25rem' }}>
          User message:
        </Text>
        <Text size="S" weight="low" color="high" style={{ fontStyle: 'italic' }}>
          "{userMessage}"
        </Text>
      </div>

      <Text size="XS" weight="medium" color="medium" style={{ display: 'block', marginBottom: '0.5rem' }}>
        Detected tokens:
      </Text>
      <div style={{ 
        display: 'flex', 
        flexWrap: 'wrap', 
        gap: '0.375rem',
        marginBottom: '0.75rem',
      }}>
        {tokens.map((t) => (
          <span 
            key={t.key}
            style={{
              padding: '0.25rem 0.5rem',
              borderRadius: '4px',
              backgroundColor: theme.background.ghost,
              fontSize: '11px',
              fontFamily: 'monospace',
              color: theme.text.medium,
            }}
          >
            <span style={{ color: theme.text.low }}>{t.key}:</span>{' '}
            <span style={{ color: theme.accent }}>{t.value}</span>
          </span>
        ))}
      </div>

      <Text size="XS" weight="medium" color="medium" style={{ display: 'block', marginBottom: '0.25rem' }}>
        AI behavior:
      </Text>
      <Text size="S" weight="low" color="high">
        {result}
      </Text>
    </div>
  );
});

interface FlowStepProps {
  number: number;
  text: string;
  theme: ReturnType<typeof useThemeColors>;
  isLast?: boolean;
}

const FlowStep = memo(function FlowStep({ number, text, theme, isLast }: FlowStepProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
      <div style={{
        width: '24px',
        height: '24px',
        borderRadius: '50%',
        backgroundColor: theme.accent,
        color: '#fff',
        fontSize: '12px',
        fontWeight: 600,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}>
        {number}
      </div>
      <div style={{
        flex: 1,
        padding: '0.5rem 0.75rem',
        borderRadius: '6px',
        backgroundColor: theme.background.bold,
        borderLeft: `2px solid ${theme.accent}`,
      }}>
        <Text size="S" weight="low" color="high">
          {text}
        </Text>
      </div>
      {!isLast && (
        <div style={{ 
          position: 'absolute',
          left: '11px',
          marginTop: '24px',
          width: '2px',
          height: '8px',
          backgroundColor: theme.stroke.low,
        }} />
      )}
    </div>
  );
});

export default TokenInfoModal;
