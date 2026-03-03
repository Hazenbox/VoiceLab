/**
 * KnowledgeInfoModal Component
 * 
 * Comprehensive modal explaining how the Knowledge Base works,
 * its types, architecture, impact on generation, and processing flow.
 */

import { memo, useEffect, useCallback } from 'react';
import { useThemeColors } from '../../theme';
import { Title, Text, Divider, Button } from '@marcelinodzn/ds-react';
import { DSIcon } from '../../components/DSIcon';
import { ActionButton } from '../../components/ActionButton';
import { FlowCanvas, FlowNode, FlowArrow } from '../../components/FlowDiagram';
import { Badge } from '../../components/ui/Badge';

interface KnowledgeInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const KnowledgeInfoModal = memo(function KnowledgeInfoModal({
  isOpen,
  onClose,
}: KnowledgeInfoModalProps) {
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
        aria-labelledby="knowledge-info-modal-title"
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
          <Title size="L" as="h2" weight="high" color="high" id="knowledge-info-modal-title">
            How the knowledge base works
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
          {/* Section 1: What is the Knowledge Base */}
          <section style={{ marginBottom: '2rem' }}>
            <Title size="M" as="h3" weight="high" color="high" style={{ marginBottom: '0.75rem' }}>
              What is the knowledge base?
            </Title>
            <Text size="S" weight="low" color="medium" style={{ lineHeight: 1.6 }}>
              The knowledge base is a structured repository of brand rules, vocabulary guidelines, 
              product definitions, and cultural context. It ensures every AI response uses correct 
              terminology, avoids problematic language, and stays culturally appropriate. Rules are 
              retrieved dynamically based on conversation context using semantic search.
            </Text>
            
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(2, 1fr)', 
              gap: '0.75rem',
              marginTop: '1rem' 
            }}>
              <KnowledgeCategory 
                label="Avoid words" 
                description="Words and phrases NOT to use (jargon, overly formal, offensive)"
                theme={theme}
                variant="negative"
              />
              <KnowledgeCategory 
                label="Preferred words" 
                description="Recommended vocabulary for brand consistency"
                theme={theme}
                variant="positive"
              />
              <KnowledgeCategory 
                label="Auto-fix rules" 
                description="Automatic replacements (wrong term to correct term)"
                theme={theme}
                variant="informative"
              />
              <KnowledgeCategory 
                label="Product definitions" 
                description="Ecosystem glossary with correct naming and tone"
                theme={theme}
                variant="neutral"
              />
              <KnowledgeCategory 
                label="Festivals" 
                description="Cultural calendar with appropriate greetings and context"
                theme={theme}
                variant="warning"
              />
              <KnowledgeCategory 
                label="Approved examples" 
                description="Curated content samples for few-shot learning"
                theme={theme}
                variant="informative"
              />
            </div>
          </section>

          <Divider />

          {/* Section 2: Architecture */}
          <section style={{ marginBottom: '2rem', marginTop: '1.5rem' }}>
            <Title size="M" as="h3" weight="high" color="high" style={{ marginBottom: '0.75rem' }}>
              How knowledge integrates
            </Title>
            <Text size="S" weight="low" color="medium" style={{ lineHeight: 1.6, marginBottom: '1rem' }}>
              Knowledge rules are retrieved at runtime based on conversation context. 
              Semantic search finds the most relevant rules, which are then injected into the prompt.
            </Text>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <ArchitectureLayer
                number={1}
                title="User message + context"
                description="The incoming message, channel, ecosystem, and user profile"
                theme={theme}
                color={theme.text.low}
              />
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <DSIcon name="IcChevronDown" size="S" style={{ color: theme.text.low }} />
              </div>
              <ArchitectureLayer
                number={2}
                title="Knowledge Retriever (KNOWLEDGE BASE)"
                description="Semantic search retrieves relevant avoid words, preferred terms, auto-fix rules, product definitions"
                theme={theme}
                color={theme.secondary}
                highlighted
              />
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <DSIcon name="IcChevronDown" size="S" style={{ color: theme.text.low }} />
              </div>
              <ArchitectureLayer
                number={3}
                title="Prompt Builder"
                description="Injects knowledge rules into the system prompt as constraints and guidelines"
                theme={theme}
                color={theme.text.low}
              />
            </div>
          </section>

          <Divider />

          {/* Section 3: Impact Table */}
          <section style={{ marginBottom: '2rem', marginTop: '1.5rem' }}>
            <Title size="M" as="h3" weight="high" color="high" style={{ marginBottom: '0.75rem' }}>
              How knowledge impacts generation
            </Title>
            <Text size="S" weight="low" color="medium" style={{ lineHeight: 1.6, marginBottom: '1rem' }}>
              Each knowledge type shapes AI output in specific ways:
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
                      Type
                    </th>
                    <th style={{ 
                      textAlign: 'left', 
                      padding: '0.625rem 0.75rem', 
                      color: theme.text.high,
                      fontWeight: 500,
                      borderBottom: `1px solid ${theme.stroke.low}`,
                    }}>
                      Example
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
                    type="avoid_word" 
                    example="kindly" 
                    impact="Removes formal/stiff language, uses natural alternatives"
                    theme={theme}
                  />
                  <ImpactRow 
                    type="avoid_word" 
                    example="ASAP" 
                    impact="Replaces jargon with clear, specific timeframes"
                    theme={theme}
                  />
                  <ImpactRow 
                    type="preferred_word" 
                    example="Jio (not JIO)" 
                    impact="Ensures consistent brand capitalization"
                    theme={theme}
                  />
                  <ImpactRow 
                    type="auto_fix" 
                    example="recharge pack -> prepaid plan" 
                    impact="Automatically corrects outdated terminology"
                    theme={theme}
                  />
                  <ImpactRow 
                    type="product_definition" 
                    example="JioFiber" 
                    impact="Uses correct product name, features, and positioning"
                    theme={theme}
                  />
                  <ImpactRow 
                    type="festival" 
                    example="Diwali" 
                    impact="Adds culturally appropriate greeting when relevant"
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
              Before and after
            </Title>

            <ExampleScenario
              title="Response without knowledge base"
              content="Kindly recharge your account ASAP to avoid service disruption. Please do the needful at your earliest convenience."
              issues={[
                { label: 'kindly', type: 'avoid' },
                { label: 'ASAP', type: 'avoid' },
                { label: 'do the needful', type: 'avoid' },
                { label: 'earliest convenience', type: 'avoid' },
              ]}
              theme={theme}
              isBefore
            />

            <div style={{ height: '1rem' }} />

            <ExampleScenario
              title="Response with knowledge base applied"
              content="Your prepaid plan expires tomorrow. Recharge now to keep your number active and avoid any interruption."
              issues={[
                { label: 'prepaid plan', type: 'preferred' },
                { label: 'clear timeline', type: 'preferred' },
                { label: 'direct action', type: 'preferred' },
              ]}
              theme={theme}
              isBefore={false}
            />
          </section>

          <Divider />

          {/* Section 5: Processing Flow */}
          <section style={{ marginTop: '1.5rem' }}>
            <Title size="M" as="h3" weight="high" color="high" style={{ marginBottom: '0.75rem' }}>
              Knowledge processing flow
            </Title>
            <Text size="S" weight="low" color="medium" style={{ lineHeight: 1.6, marginBottom: '1rem' }}>
              From user message to clean response, knowledge rules are applied at multiple stages:
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
              <FlowCanvas height={470} viewBox="0 0 650 470" dotColor={theme.stroke.low}>
                {/* Step 1: User message received */}
                <FlowNode 
                  x={175} y={10} width={300} height={40} 
                  label="User message received" 
                  color={theme.background.ghost} 
                  textColor={theme.text.high} 
                  strokeColor={theme.background.ghost} 
                  noShadow 
                  labelFontSize={13}
                />
                <FlowArrow x1={325} y1={50} x2={325} y2={75} color={theme.text.low} />
                
                {/* Step 2: Semantic search */}
                <FlowNode 
                  x={175} y={75} width={300} height={40} 
                  label="Semantic search" 
                  sublabel="matches relevant knowledge rules"
                  color={theme.secondary} 
                  textColor="#fff" 
                  strokeColor={theme.secondary} 
                  noShadow 
                  labelFontSize={13}
                  sublabelFontSize={11}
                />
                <FlowArrow x1={325} y1={115} x2={325} y2={140} color={theme.text.low} />
                
                {/* Step 3: Knowledge assembled */}
                <FlowNode 
                  x={175} y={140} width={300} height={40} 
                  label="Knowledge rules assembled" 
                  sublabel="avoid, prefer, fix, definitions"
                  color={theme.secondary} 
                  textColor="#fff" 
                  strokeColor={theme.secondary} 
                  noShadow 
                  labelFontSize={13}
                  sublabelFontSize={11}
                />
                <FlowArrow x1={325} y1={180} x2={325} y2={205} color={theme.text.low} />
                
                {/* Step 4: Rules injected */}
                <FlowNode 
                  x={175} y={205} width={300} height={40} 
                  label="Rules injected into prompt" 
                  sublabel="as constraints and guidelines"
                  color={theme.background.ghost} 
                  textColor={theme.text.high} 
                  strokeColor={theme.background.ghost} 
                  noShadow 
                  labelFontSize={13}
                  sublabelFontSize={11}
                />
                <FlowArrow x1={325} y1={245} x2={325} y2={270} color={theme.text.low} />
                
                {/* Step 5: LLM generates */}
                <FlowNode 
                  x={175} y={270} width={300} height={40} 
                  label="LLM generates response" 
                  sublabel="following knowledge constraints"
                  color={theme.background.ghost} 
                  textColor={theme.text.high} 
                  strokeColor={theme.background.ghost} 
                  noShadow 
                  labelFontSize={13}
                  sublabelFontSize={11}
                />
                <FlowArrow x1={325} y1={310} x2={325} y2={335} color={theme.text.low} />
                
                {/* Step 6: Output validated */}
                <FlowNode 
                  x={175} y={335} width={300} height={40} 
                  label="Output validated" 
                  sublabel="checked against avoid words"
                  color={theme.secondary} 
                  textColor="#fff" 
                  strokeColor={theme.secondary} 
                  noShadow 
                  labelFontSize={13}
                  sublabelFontSize={11}
                />
                <FlowArrow x1={325} y1={375} x2={325} y2={400} color={theme.text.low} />
                
                {/* Step 7: Clean response */}
                <FlowNode 
                  x={175} y={400} width={300} height={40} 
                  label="Clean response delivered" 
                  color={theme.background.ghost} 
                  textColor={theme.text.high} 
                  strokeColor={theme.background.ghost} 
                  noShadow 
                  labelFontSize={13}
                />
              </FlowCanvas>
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

interface KnowledgeCategoryProps {
  label: string;
  description: string;
  theme: ReturnType<typeof useThemeColors>;
  variant: 'negative' | 'positive' | 'informative' | 'neutral' | 'warning';
}

const KnowledgeCategory = memo(function KnowledgeCategory({ 
  label, 
  description, 
  theme,
  variant 
}: KnowledgeCategoryProps) {
  const variantColors: Record<string, string> = {
    negative: '#ef4444',
    positive: '#22c55e',
    informative: '#3b82f6',
    neutral: theme.text.medium,
    warning: '#f59e0b',
  };

  return (
    <div style={{
      padding: '0.75rem',
      borderRadius: '8px',
      backgroundColor: theme.background.bold,
      borderLeft: `3px solid ${variantColors[variant]}`,
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
      border: highlighted ? 'none' : `1px solid ${theme.stroke.low}`,
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
  type: string;
  example: string;
  impact: string;
  theme: ReturnType<typeof useThemeColors>;
  isLast?: boolean;
}

const ImpactRow = memo(function ImpactRow({ type, example, impact, theme, isLast }: ImpactRowProps) {
  return (
    <tr>
      <td style={{ 
        padding: '0.5rem 0.75rem', 
        color: theme.text.high,
        fontFamily: 'monospace',
        fontSize: '12px',
        borderBottom: isLast ? 'none' : `1px solid ${theme.stroke.low}`,
      }}>
        {type}
      </td>
      <td style={{ 
        padding: '0.5rem 0.75rem', 
        color: theme.text.high,
        fontWeight: 500,
        borderBottom: isLast ? 'none' : `1px solid ${theme.stroke.low}`,
      }}>
        {example}
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
  content: string;
  issues: Array<{ label: string; type: 'avoid' | 'preferred' }>;
  theme: ReturnType<typeof useThemeColors>;
  isBefore: boolean;
}

const ExampleScenario = memo(function ExampleScenario({ 
  title, 
  content, 
  issues, 
  theme,
  isBefore 
}: ExampleScenarioProps) {
  return (
    <div style={{
      padding: '1rem',
      borderRadius: '8px',
      border: `1px solid ${isBefore ? '#ef4444' : '#22c55e'}20`,
      backgroundColor: isBefore ? '#ef444408' : '#22c55e08',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
        <DSIcon 
          name={isBefore ? 'IcClose' : 'IcCheck'} 
          size="S" 
          style={{ color: isBefore ? '#ef4444' : '#22c55e' }} 
        />
        <Text size="S" weight="high" color="high">
          {title}
        </Text>
      </div>
      
      <div style={{ 
        padding: '0.75rem', 
        borderRadius: '6px', 
        backgroundColor: theme.background.ghost,
        marginBottom: '0.75rem',
      }}>
        <Text size="S" weight="low" color="high" style={{ lineHeight: 1.6 }}>
          {content}
        </Text>
      </div>

      <div style={{ 
        display: 'flex', 
        flexWrap: 'wrap', 
        gap: '0.375rem',
      }}>
        {issues.map((issue) => (
          <Badge 
            key={issue.label} 
            variant={issue.type === 'avoid' ? 'negative' : 'positive'} 
            emphasis="low"
          >
            {issue.label}
          </Badge>
        ))}
      </div>
    </div>
  );
});

export default KnowledgeInfoModal;
