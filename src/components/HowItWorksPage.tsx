/**
 * HowItWorksPage Component
 * 
 * Comprehensive documentation page explaining the complete chat generation flow.
 * Includes visual workflow diagrams, step-by-step explanations, and real examples.
 */

import { memo } from 'react';
import { useThemeColors } from '../theme';
import { FlowCanvas, FlowNode, FlowArrow, CurvedFlowArrow, DottedBackground } from './FlowDiagram';

interface HowItWorksPageProps {
  onBack: () => void;
}

/**
 * Section Component - Consistent section styling
 */
interface SectionProps {
  number: number;
  title: string;
  description: string;
  children: React.ReactNode;
}

const Section = memo(function Section({ number, title, description, children }: SectionProps) {
  const theme = useThemeColors();
  
  return (
    <section className="mb-12">
      <div className="flex items-start gap-4 mb-6">
        <div 
          className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 font-semibold text-lg"
          style={{ 
            backgroundColor: theme.accent,
            color: '#fff'
          }}
        >
          {number}
        </div>
        <div>
          <h2 
            className="text-xl font-semibold mb-1"
            style={{ color: theme.text.high }}
          >
            {title}
          </h2>
          <p 
            className="text-sm"
            style={{ color: theme.text.medium }}
          >
            {description}
          </p>
        </div>
      </div>
      <div className="ml-14">
        {children}
      </div>
    </section>
  );
});

/**
 * Info Card Component
 */
interface InfoCardProps {
  title: string;
  items: string[];
  icon?: React.ReactNode;
}

const InfoCard = memo(function InfoCard({ title, items, icon }: InfoCardProps) {
  const theme = useThemeColors();
  
  return (
    <div 
      className="p-4 rounded-lg"
      style={{ 
        backgroundColor: theme.background.ghost,
        border: `1px solid ${theme.stroke.medium}`
      }}
    >
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <h4 
          className="font-medium text-sm"
          style={{ color: theme.text.high }}
        >
          {title}
        </h4>
      </div>
      <ul className="space-y-1.5">
        {items.map((item, index) => (
          <li 
            key={index}
            className="text-sm flex items-start gap-2"
            style={{ color: theme.text.medium }}
          >
            <span style={{ color: theme.accent }}>•</span>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
});

/**
 * Example Comparison Component
 */
interface ExampleComparisonProps {
  title: string;
  before: { label: string; content: string };
  after: { label: string; content: string };
}

const ExampleComparison = memo(function ExampleComparison({ title, before, after }: ExampleComparisonProps) {
  const theme = useThemeColors();
  
  return (
    <div 
      className="p-4 rounded-lg mb-4"
      style={{ 
        backgroundColor: theme.background.ghost,
        border: `1px solid ${theme.stroke.medium}`
      }}
    >
      <h4 
        className="font-medium text-sm mb-3"
        style={{ color: theme.text.high }}
      >
        {title}
      </h4>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div 
            className="text-xs font-medium mb-2 px-2 py-1 rounded inline-block"
            style={{ 
              backgroundColor: '#00A859',
              color: '#ffffff',
              border: 'none'
            }}
          >
            {before.label}
          </div>
          <p 
            className="text-sm p-3 rounded"
            style={{ 
              backgroundColor: 'transparent',
              color: theme.text.medium,
              border: '1px solid #00A859'
            }}
          >
            {before.content}
          </p>
        </div>
        <div>
          <div 
            className="text-xs font-medium mb-2 px-2 py-1 rounded inline-block"
            style={{ 
              backgroundColor: theme.accent,
              color: '#fff'
            }}
          >
            {after.label}
          </div>
          <p 
            className="text-sm p-3 rounded"
            style={{ 
              backgroundColor: theme.background.ghost,
              color: theme.text.high,
              border: `1px solid ${theme.accent}`
            }}
          >
            {after.content}
          </p>
        </div>
      </div>
    </div>
  );
});

/**
 * Main HowItWorksPage Component
 */
export const HowItWorksPage = memo(function HowItWorksPage({ onBack }: HowItWorksPageProps) {
  const theme = useThemeColors();
  
  return (
    <div 
      className="h-full flex flex-col"
      style={{ backgroundColor: theme.background.ghost }}
    >
      {/* Header */}
      <header 
        className="flex items-center px-6 py-2 flex-shrink-0"
        style={{ borderBottom: `1px solid ${theme.stroke.low}` }}
      >
        <h1 
          className="text-lg font-extrabold"
          style={{ color: theme.text.high }}
        >
          How It Works
        </h1>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto px-6 py-8">
        <div className="max-w-4xl mx-auto">
          
          {/* Overview Diagram */}
          <div 
            className="mb-12 p-6 rounded-xl"
            style={{ 
              backgroundColor: theme.background.ghost,
              border: `1px solid ${theme.stroke.medium}`,
              overflow: 'hidden'
            }}
          >
            <h3 
              className="text-lg font-semibold mb-4"
              style={{ color: theme.text.high }}
            >
              Complete Generation Flow
            </h3>
            <FlowCanvas height={120} viewBox="0 0 800 120" dotColor={theme.stroke.low}>
              {/* Flow Nodes */}
              <FlowNode x={0} y={35} width={90} height={50} label="User Input" color="#ffffff" textColor={theme.text.high} strokeColor={theme.stroke.medium} />
              <FlowArrow x1={95} y1={60} x2={115} y2={60} color={theme.accent} />
              
              <FlowNode x={120} y={35} width={100} height={50} label="Context" sublabel="Building" color="#ffffff" textColor={theme.text.high} strokeColor={theme.stroke.medium} />
              <FlowArrow x1={225} y1={60} x2={245} y2={60} color={theme.accent} />
              
              <FlowNode x={250} y={35} width={90} height={50} label="Prompt" sublabel="Builder" color="#ffffff" textColor={theme.text.high} strokeColor={theme.stroke.medium} />
              <FlowArrow x1={345} y1={60} x2={365} y2={60} color={theme.accent} />
              
              <FlowNode x={370} y={35} width={100} height={50} label="LLM" sublabel="Orchestrator" color={theme.accent} textColor="#fff" strokeColor={theme.accent} />
              <FlowArrow x1={475} y1={60} x2={495} y2={60} color={theme.accent} />
              
              <FlowNode x={500} y={35} width={90} height={50} label="Content" sublabel="Trust" color="#ffffff" textColor={theme.text.high} strokeColor={theme.stroke.medium} />
              <FlowArrow x1={595} y1={60} x2={615} y2={60} color={theme.accent} />
              
              <FlowNode x={620} y={35} width={90} height={50} label="Response" sublabel="Display" color="#ffffff" textColor={theme.text.high} strokeColor={theme.stroke.medium} />
              <FlowArrow x1={715} y1={60} x2={735} y2={60} color={theme.accent} />
              
              <FlowNode x={740} y={35} width={55} height={50} label="Save" color="#ffffff" textColor={theme.text.high} strokeColor={theme.stroke.medium} />
            </FlowCanvas>
          </div>

          {/* Section 1: User Input */}
          <Section 
            number={1} 
            title="User Input"
            description="Your message starts its journey here"
          >
            <div 
              className="p-4 rounded-lg mb-4"
              style={{ 
                backgroundColor: theme.background.ghost,
                border: `1px solid ${theme.stroke.medium}`,
                overflow: 'hidden'
              }}
            >
              <FlowCanvas height={100} viewBox="0 0 600 100" dotColor={theme.stroke.low}>
                <FlowNode x={0} y={25} width={120} height={50} label="User Types" sublabel="Message" color="#ffffff" textColor={theme.text.high} strokeColor={theme.stroke.medium} />
                <CurvedFlowArrow startX={120} startY={50} endX={180} endY={50} color={theme.stroke.medium} />
                
                <FlowNode x={180} y={25} width={120} height={50} label="ChatPanel" sublabel="Captures Input" color="#ffffff" textColor={theme.text.high} strokeColor={theme.stroke.medium} />
                <CurvedFlowArrow startX={300} startY={50} endX={360} endY={50} color={theme.stroke.medium} />
                
                <FlowNode x={360} y={25} width={120} height={50} label="App.tsx" sublabel="handleSendMessage" color={theme.accent} textColor="#fff" strokeColor={theme.accent} />
                <CurvedFlowArrow startX={480} startY={50} endX={540} endY={50} color={theme.stroke.medium} />
                
                <FlowNode x={540} y={25} width={55} height={50} label="Next" color="#ffffff" textColor={theme.text.high} strokeColor={theme.stroke.medium} />
              </FlowCanvas>
            </div>
            <p className="text-sm" style={{ color: theme.text.medium }}>
              When you type a message and press Enter (or click send), the <code className="px-1.5 py-0.5 rounded text-xs" style={{ backgroundColor: theme.stroke.low }}>ChatPanel</code> component captures your input and passes it to the main <code className="px-1.5 py-0.5 rounded text-xs" style={{ backgroundColor: theme.stroke.low }}>handleSendChatMessage</code> function in App.tsx. Your message is immediately displayed in the chat while processing begins.
            </p>
          </Section>

          {/* Section 2: Context Building */}
          <Section 
            number={2} 
            title="Context Building"
            description="Your message gets enriched with smart context"
          >
            <div className="grid grid-cols-2 gap-4 mb-4">
              <InfoCard 
                title="Ecosystem (10 Types)"
                items={[
                  'Connectivity - Jio mobile, fiber',
                  'Entertainment - JioCinema, JioTV',
                  'Finance - JioPayments, banking',
                  'Shopping - JioMart, retail',
                  'Support - Customer care',
                  'And 5 more...'
                ]}
                icon={<svg className="w-4 h-4" fill="none" stroke={theme.accent} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>}
              />
              <InfoCard 
                title="Channel (18 Types)"
                items={[
                  'Push Notification - Short, action-focused',
                  'SMS - 160 char limit',
                  'Customer Care Chat - Warm, detailed',
                  'WhatsApp Support - Conversational',
                  'Marketing Email - Engaging',
                  'And 13 more...'
                ]}
                icon={<svg className="w-4 h-4" fill="none" stroke={theme.accent} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              <InfoCard 
                title="Navarasa Emotion Detection"
                items={[
                  'Shringara - Joy, gratitude',
                  'Karuna - Compassion, empathy',
                  'Raudra - Frustration (calm response)',
                  'Bhayanaka - Anxiety (reassuring)',
                  'Shanta - Calm, neutral',
                  'Auto-detected from your message!'
                ]}
                icon={<svg className="w-4 h-4" fill="none" stroke={theme.accent} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
              />
              <InfoCard 
                title="User Profile"
                items={[
                  'Age Group - Digital confident/cautious',
                  'Literacy Level - Affects complexity',
                  'Region - 12 Indian regions',
                  'Language - 15 supported languages',
                  'Adapts tone and vocabulary'
                ]}
                icon={<svg className="w-4 h-4" fill="none" stroke={theme.accent} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>}
              />
            </div>

            <div 
              className="p-4 rounded-lg"
              style={{ 
                backgroundColor: theme.background.ghost,
                border: `1px solid ${theme.stroke.medium}`
              }}
            >
              <h4 className="font-medium text-sm mb-2" style={{ color: theme.text.high }}>
                Timing Context
              </h4>
              <p className="text-sm" style={{ color: theme.text.medium }}>
                The system also considers time of day (morning/afternoon/evening/late night), day of week (weekday/weekend), and special occasions like festivals to tailor the response appropriately.
              </p>
            </div>
          </Section>

          {/* Section 3: Prompt Construction */}
          <Section 
            number={3} 
            title="Prompt Construction"
            description="Building the perfect instructions for the AI"
          >
            <div 
              className="p-4 rounded-lg mb-4"
              style={{ 
                backgroundColor: theme.background.ghost,
                border: `1px solid ${theme.stroke.medium}`
              }}
            >
              <h4 className="font-medium text-sm mb-3" style={{ color: theme.text.high }}>
                10 Brand Guardrails (Always Applied)
              </h4>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { num: 1, text: 'Warmth First - Feel like a caring friend' },
                  { num: 2, text: 'No Corporate Jargon - Simple language' },
                  { num: 3, text: 'Clear Action Path - Obvious next steps' },
                  { num: 4, text: 'Respect Time - Be concise' },
                  { num: 5, text: 'Inclusive Language - Gender-neutral' },
                  { num: 6, text: 'No Elitism - Never exclude anyone' },
                  { num: 7, text: 'Empathetic Responses - Acknowledge emotions' },
                  { num: 8, text: 'Trust Transparency - Honest about limitations' },
                  { num: 9, text: 'Celebrate with Users - Share in joys' },
                  { num: 10, text: 'Preserve Dignity - Never shame or blame' },
                ].map((item) => (
                  <div 
                    key={item.num}
                    className="flex items-start gap-2 p-2 rounded"
                    style={{ backgroundColor: theme.background.ghost }}
                  >
                    <span 
                      className="w-5 h-5 rounded-full flex items-center justify-center text-xs flex-shrink-0"
                      style={{ backgroundColor: theme.accent, color: '#fff' }}
                    >
                      {item.num}
                    </span>
                    <span className="text-xs" style={{ color: theme.text.medium }}>{item.text}</span>
                  </div>
                ))}
              </div>
            </div>

            <p className="text-sm mb-4" style={{ color: theme.text.medium }}>
              The prompt builder combines your message with the generation context, brand guardrails, channel-specific formatting rules, and emotion response strategies to create a comprehensive system prompt for the AI.
            </p>
          </Section>

          {/* Section 4: LLM Orchestration */}
          <Section 
            number={4} 
            title="LLM Orchestration"
            description="Smart request management with caching, retry, and fallback"
          >
            <div 
              className="p-4 rounded-lg mb-4"
              style={{ 
                backgroundColor: theme.background.ghost,
                border: `1px solid ${theme.stroke.medium}`,
                overflow: 'hidden'
              }}
            >
              <FlowCanvas height={200} viewBox="0 0 700 200" dotColor={theme.stroke.low}>
                {/* Main flow */}
                <FlowNode x={0} y={75} width={80} height={50} label="Request" color="#ffffff" textColor={theme.text.high} strokeColor={theme.stroke.medium} />
                <CurvedFlowArrow startX={80} startY={100} endX={120} endY={100} color={theme.stroke.medium} />
                
                <FlowNode x={120} y={75} width={90} height={50} label="Cache" sublabel="Check" color="#ffffff" textColor={theme.text.high} strokeColor={theme.stroke.medium} />
                
                {/* Cache hit path */}
                <CurvedFlowArrow startX={165} startY={75} endX={165} endY={25} color={theme.accent} label="Hit" />
                <FlowNode x={130} y={0} width={70} height={25} label="Return" color={theme.accent} textColor="#fff" strokeColor={theme.accent} />
                
                {/* Cache miss path */}
                <CurvedFlowArrow startX={210} startY={100} endX={250} endY={100} color={theme.stroke.medium} label="Miss" />
                
                <FlowNode x={250} y={75} width={90} height={50} label="Provider" sublabel="Selection" color="#ffffff" textColor={theme.text.high} strokeColor={theme.stroke.medium} />
                
                {/* Provider options */}
                <FlowNode x={380} y={20} width={80} height={35} label="Qwen" sublabel="(Primary)" color={theme.accent} textColor="#fff" strokeColor={theme.accent} />
                <FlowNode x={380} y={65} width={80} height={35} label="HuggingFace" sublabel="(Fallback)" color="#ffffff" textColor={theme.text.high} strokeColor={theme.stroke.medium} />
                <FlowNode x={380} y={110} width={80} height={35} label="OpenAI" color="#ffffff" textColor={theme.text.high} strokeColor={theme.stroke.medium} />
                <FlowNode x={380} y={155} width={80} height={35} label="Claude" color="#ffffff" textColor={theme.text.high} strokeColor={theme.stroke.medium} />
                
                {/* Lines connecting to providers */}
                <CurvedFlowArrow startX={340} startY={100} endX={380} endY={37} color={theme.stroke.medium} />
                <CurvedFlowArrow startX={340} startY={100} endX={380} endY={82} color={theme.stroke.medium} />
                <CurvedFlowArrow startX={340} startY={100} endX={380} endY={127} color={theme.stroke.medium} />
                <CurvedFlowArrow startX={340} startY={100} endX={380} endY={172} color={theme.stroke.medium} />
                
                {/* Retry loop */}
                <CurvedFlowArrow startX={460} startY={82} endX={510} endY={82} color={theme.stroke.medium} />
                <FlowNode x={510} y={60} width={80} height={45} label="Retry" sublabel="Logic" color="#ffffff" textColor={theme.text.high} strokeColor={theme.stroke.medium} />
                
                {/* Success path */}
                <CurvedFlowArrow startX={590} startY={82} endX={630} endY={82} color={theme.accent} />
                <FlowNode x={630} y={60} width={65} height={45} label="Success" color={theme.accent} textColor="#fff" strokeColor={theme.accent} />
                
                {/* Failure - try fallback */}
                <path d="M 550 105 L 550 140 L 420 140 L 420 110" fill="none" stroke={theme.stroke.medium} strokeWidth={1} strokeDasharray="4" />
                <text x={485} y={155} textAnchor="middle" fill={theme.text.low} fontSize={10} fontFamily="'Geist Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace">Fallback on failure</text>
              </FlowCanvas>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-4">
              <InfoCard 
                title="Response Caching"
                items={[
                  'Identical requests return cached response',
                  'Saves API costs',
                  'Instant response for repeated queries'
                ]}
              />
              <InfoCard 
                title="Retry Logic"
                items={[
                  'Automatic retries on transient failures',
                  'Exponential backoff',
                  'Configurable retry count'
                ]}
              />
              <InfoCard 
                title="Fallback Chain"
                items={[
                  'Primary: Qwen (DashScope)',
                  'Fallback: HuggingFace',
                  'Ensures high availability'
                ]}
              />
            </div>
          </Section>

          {/* Section 5: Backend API */}
          <Section 
            number={5} 
            title="Backend API"
            description="Secure server-side processing"
          >
            <div 
              className="p-4 rounded-lg mb-4"
              style={{ 
                backgroundColor: theme.background.ghost,
                border: `1px solid ${theme.stroke.medium}`,
                overflow: 'hidden'
              }}
            >
              <FlowCanvas height={80} viewBox="0 0 600 80" dotColor={theme.stroke.low}>
                <FlowNode x={0} y={15} width={100} height={50} label="Frontend" sublabel="Request" color="#ffffff" textColor={theme.text.high} strokeColor={theme.stroke.medium} />
                <CurvedFlowArrow startX={100} startY={40} endX={160} endY={40} color={theme.stroke.medium} />
                
                <FlowNode x={160} y={15} width={120} height={50} label="/api/llm" sublabel="Serverless Function" color={theme.accent} textColor="#fff" strokeColor={theme.accent} />
                <CurvedFlowArrow startX={280} startY={40} endX={340} endY={40} color={theme.stroke.medium} />
                
                <FlowNode x={340} y={15} width={120} height={50} label="External API" sublabel="DashScope/OpenAI" color="#ffffff" textColor={theme.text.high} strokeColor={theme.stroke.medium} />
                <CurvedFlowArrow startX={460} startY={40} endX={520} endY={40} color={theme.stroke.medium} />
                
                <FlowNode x={520} y={15} width={70} height={50} label="Response" color="#ffffff" textColor={theme.text.high} strokeColor={theme.stroke.medium} />
              </FlowCanvas>
            </div>

            <p className="text-sm" style={{ color: theme.text.medium }}>
              Your request is sent to a secure Vercel serverless function (<code className="px-1.5 py-0.5 rounded text-xs" style={{ backgroundColor: theme.stroke.low }}>/api/llm</code>) which adds authentication headers and forwards the request to the AI provider. This keeps your API keys secure and allows for request logging and rate limiting.
            </p>
          </Section>

          {/* Section 6: Content Trust Validation */}
          <Section 
            number={6} 
            title="Content Trust Validation"
            description="7 AI agents verify the response quality"
          >
            <div 
              className="p-4 rounded-lg mb-4"
              style={{ 
                backgroundColor: theme.background.ghost,
                border: `1px solid ${theme.stroke.medium}`,
                overflow: 'hidden'
              }}
            >
              <svg width="100%" height="300" viewBox="0 0 800 300">
                <DottedBackground color={theme.stroke.low} />
                <rect x="0" y="0" width="800" height="300" fill="url(#dotted-pattern)" />

                {/* 7 Agent Nodes */}
                {[
                  { name: 'Gender', badge: 'Neutrality', weight: '15%', x: 20, color: '#E0F2FE', textColor: '#0369A1' }, // Sky
                  { name: 'Inclusivity', badge: 'Check', weight: '15%', x: 130, color: '#F0FDF4', textColor: '#15803D' }, // Green
                  { name: 'Cultural', badge: 'Sensitivity', weight: '15%', x: 240, color: '#FEF3C7', textColor: '#B45309' }, // Amber
                  { name: 'A11y', badge: 'Access', weight: '10%', x: 350, color: '#F3E8FF', textColor: '#7E22CE' }, // Purple
                  { name: 'Compliance', badge: 'Legal', weight: '15%', x: 460, color: '#FCE7F3', textColor: '#BE185D' }, // Pink
                  { name: 'Style', badge: 'Tone', weight: '15%', x: 570, color: '#FFEDD5', textColor: '#C2410C' }, // Orange
                  { name: 'Brand', badge: 'Voice', weight: '15%', x: 680, color: '#E1EFFE', textColor: '#0284C7' }, // Light Blue
                ].map((agent, index) => {
                  // Calculate target x on the Trust Score node (distributed)
                  const targetX = 325 + (index * 25); 
                  
                  return (
                    <g key={agent.name}>
                      <CurvedFlowArrow 
                        startX={agent.x + 50} 
                        startY={90} 
                        endX={targetX} 
                        endY={200} 
                        color={theme.stroke.high} 
                      />
                      <FlowNode 
                        x={agent.x} 
                        y={40} 
                        width={100} 
                        height={50} 
                        label={agent.name} 
                        sublabel={agent.weight}
                        color="#ffffff" 
                        textColor={theme.text.high} 
                        strokeColor={theme.stroke.medium}
                        badge={{
                          text: agent.badge,
                          color: agent.color,
                          textColor: agent.textColor
                        }}
                      />
                    </g>
                  );
                })}
                
                {/* Trust Score Node */}
                <FlowNode 
                  x={300} 
                  y={200} 
                  width={200} 
                  height={60} 
                  label="Trust Score" 
                  sublabel="Certified / Review / Issues"
                  color={theme.accent} 
                  textColor="#fff" 
                  strokeColor={theme.accent} 
                />
              </svg>
            </div>

            <p className="text-sm" style={{ color: theme.text.medium }}>
              Each response is analyzed by 7 validation agents that check for gender neutrality, inclusivity, cultural sensitivity, accessibility, compliance, style consistency, and brand alignment. The weighted scores produce a final trust score that determines if the content is certified, needs review, or has issues.
            </p>
          </Section>

          {/* Section 7: Response Delivery */}
          <Section 
            number={7} 
            title="Response Delivery"
            description="Your response appears with full context"
          >
            <div className="grid grid-cols-2 gap-4 mb-4">
              <InfoCard 
                title="Streaming Mode"
                items={[
                  'Words appear as they are generated',
                  'Faster perceived response time',
                  'Can be stopped mid-generation',
                  'Enabled by default'
                ]}
                icon={<svg className="w-4 h-4" fill="none" stroke={theme.accent} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>}
              />
              <InfoCard 
                title="Response Display"
                items={[
                  'Trust badge shows content certification',
                  'Click badge for detailed breakdown',
                  'Generation context preserved',
                  'Copy/regenerate options available'
                ]}
                icon={<svg className="w-4 h-4" fill="none" stroke={theme.accent} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
              />
            </div>

            <div 
              className="p-4 rounded-lg"
              style={{ 
                backgroundColor: theme.background.ghost,
                border: `1px solid ${theme.stroke.medium}`
              }}
            >
              <h4 className="font-medium text-sm mb-2" style={{ color: theme.text.high }}>
                Persistence
              </h4>
              <p className="text-sm" style={{ color: theme.text.medium }}>
                Messages are automatically saved to <code className="px-1.5 py-0.5 rounded text-xs" style={{ backgroundColor: theme.stroke.low }}>localStorage</code> for quick access, with audio data stored in <code className="px-1.5 py-0.5 rounded text-xs" style={{ backgroundColor: theme.stroke.low }}>IndexedDB</code> for larger files. Your conversations persist across sessions and are scoped to each project.
              </p>
            </div>
          </Section>

          {/* Section 8: Error Handling & Abort */}
          <Section 
            number={8} 
            title="Error Handling & Abort"
            description="Graceful handling of issues and cancellations"
          >
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div 
                className="p-4 rounded-lg"
                style={{ 
                  backgroundColor: theme.background.ghost,
                  border: `1px solid ${theme.stroke.medium}`
                }}
              >
                <h4 className="font-medium text-sm mb-3 flex items-center gap-2" style={{ color: theme.text.high }}>
                  <svg className="w-4 h-4" fill="none" stroke={theme.accent} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  Error Handling
                </h4>
                <ul className="space-y-2 text-sm" style={{ color: theme.text.medium }}>
                  <li className="flex items-start gap-2">
                    <span style={{ color: theme.accent }}>1.</span>
                    API failure triggers automatic retry
                  </li>
                  <li className="flex items-start gap-2">
                    <span style={{ color: theme.accent }}>2.</span>
                    If retries fail, fallback provider is tried
                  </li>
                  <li className="flex items-start gap-2">
                    <span style={{ color: theme.accent }}>3.</span>
                    User sees friendly error message
                  </li>
                  <li className="flex items-start gap-2">
                    <span style={{ color: theme.accent }}>4.</span>
                    Rate limits handled with backoff
                  </li>
                </ul>
              </div>

              <div 
                className="p-4 rounded-lg"
                style={{ 
                  backgroundColor: theme.background.ghost,
                  border: `1px solid ${theme.stroke.medium}`
                }}
              >
                <h4 className="font-medium text-sm mb-3 flex items-center gap-2" style={{ color: theme.text.high }}>
                  <svg className="w-4 h-4" fill="none" stroke={theme.accent} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Abort Functionality
                </h4>
                <ul className="space-y-2 text-sm" style={{ color: theme.text.medium }}>
                  <li className="flex items-start gap-2">
                    <span style={{ color: theme.accent }}>•</span>
                    Press Escape or click Stop during generation
                  </li>
                  <li className="flex items-start gap-2">
                    <span style={{ color: theme.accent }}>•</span>
                    AbortController cancels the API request
                  </li>
                  <li className="flex items-start gap-2">
                    <span style={{ color: theme.accent }}>•</span>
                    Partial responses are discarded
                  </li>
                  <li className="flex items-start gap-2">
                    <span style={{ color: theme.accent }}>•</span>
                    Ready for your next message immediately
                  </li>
                </ul>
              </div>
            </div>
          </Section>

          {/* Section 9: Real Examples */}
          <Section 
            number={9} 
            title="Real Examples"
            description="See how different settings affect the output"
          >
            <ExampleComparison
              title="Temperature Effect"
              before={{ label: "Temperature: 0.2 (Focused)", content: "Your bill is Rs 599. Pay by March 5 to avoid service interruption. Use MyJio app or visit jio.com/pay." }}
              after={{ label: "Temperature: 0.9 (Creative)", content: "Hey there! Just a quick heads up - your bill's chilling at Rs 599, waiting for you! Pop over to MyJio before the 5th and sort it out. Easy peasy!" }}
            />

            <ExampleComparison
              title="Channel Effect"
              before={{ label: "SMS (160 chars)", content: "Jio: Your 2GB/day plan expires tomorrow. Recharge now at jio.com to stay connected! Reply HELP for assistance." }}
              after={{ label: "Customer Care Chat", content: "Namaste! I noticed your current plan is expiring tomorrow. No worries though - I'm here to help you find the perfect recharge option. Would you like me to show you some plans that match your usage? We have some great offers running right now!" }}
            />

            <ExampleComparison
              title="Ecosystem Effect"
              before={{ label: "Finance (Calm, trustworthy)", content: "Your JioPay transaction of Rs 2,500 was successful. Reference: JIO123456. Your updated balance is Rs 15,420. For any concerns, we're here 24/7." }}
              after={{ label: "Entertainment (Playful, energetic)", content: "Woohoo! You just unlocked premium access! Get ready for unlimited movies, shows, and live sports. Your entertainment journey starts NOW - grab some popcorn and dive in!" }}
            />

            <ExampleComparison
              title="Emotion Detection"
              before={{ label: "User frustrated (Raudra)", content: "I completely understand your frustration, and I'm truly sorry for the inconvenience. Let me personally look into this right away and make sure we get it sorted. Here's exactly what I'm doing to fix this..." }}
              after={{ label: "User excited (Shringara)", content: "That's fantastic news! We're so happy to hear that! Your excitement is contagious and we love being part of this moment with you. Here's something extra special to celebrate..." }}
            />
          </Section>

          {/* Section 10: Settings Reference */}
          <Section 
            number={10} 
            title="Settings Reference"
            description="All settings that affect content generation"
          >
            <div className="grid grid-cols-2 gap-4">
              <div 
                className="p-4 rounded-lg"
                style={{ 
                  backgroundColor: 'transparent',
                  border: `1px solid ${theme.stroke.medium}`
                }}
              >
                <h4 className="font-medium text-sm mb-3" style={{ color: theme.text.high }}>
                  Generation Settings
                </h4>
                <table className="w-full text-sm">
                  <tbody>
                    <tr style={{ borderBottom: `1px solid ${theme.stroke.low}` }}>
                      <td className="py-2" style={{ color: theme.text.medium }}>Temperature</td>
                      <td className="py-2 text-right" style={{ color: theme.text.high }}>0 - 1 (default: 0.7)</td>
                    </tr>
                    <tr style={{ borderBottom: `1px solid ${theme.stroke.low}` }}>
                      <td className="py-2" style={{ color: theme.text.medium }}>Max Tokens</td>
                      <td className="py-2 text-right" style={{ color: theme.text.high }}>100 - 4000 (default: 2000)</td>
                    </tr>
                    <tr style={{ borderBottom: `1px solid ${theme.stroke.low}` }}>
                      <td className="py-2" style={{ color: theme.text.medium }}>Stream Response</td>
                      <td className="py-2 text-right" style={{ color: theme.text.high }}>On / Off (default: On)</td>
                    </tr>
                    <tr>
                      <td className="py-2" style={{ color: theme.text.medium }}>LLM Provider</td>
                      <td className="py-2 text-right" style={{ color: theme.text.high }}>Qwen, OpenAI, Claude, etc.</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div 
                className="p-4 rounded-lg"
                style={{ 
                  backgroundColor: theme.background.ghost,
                  border: `1px solid ${theme.stroke.medium}`
                }}
              >
                <h4 className="font-medium text-sm mb-3" style={{ color: theme.text.high }}>
                  Trust Settings
                </h4>
                <table className="w-full text-sm">
                  <tbody>
                    <tr style={{ borderBottom: `1px solid ${theme.stroke.low}` }}>
                      <td className="py-2" style={{ color: theme.text.medium }}>Minimum Score</td>
                      <td className="py-2 text-right" style={{ color: theme.text.high }}>70 - 100 (default: 90)</td>
                    </tr>
                    <tr style={{ borderBottom: `1px solid ${theme.stroke.low}` }}>
                      <td className="py-2" style={{ color: theme.text.medium }}>Strictness</td>
                      <td className="py-2 text-right" style={{ color: theme.text.high }}>Lenient / Standard / Strict</td>
                    </tr>
                    <tr style={{ borderBottom: `1px solid ${theme.stroke.low}` }}>
                      <td className="py-2" style={{ color: theme.text.medium }}>Block Below Threshold</td>
                      <td className="py-2 text-right" style={{ color: theme.text.high }}>On / Off (default: Off)</td>
                    </tr>
                    <tr>
                      <td className="py-2" style={{ color: theme.text.medium }}>Auto-fix Minor Issues</td>
                      <td className="py-2 text-right" style={{ color: theme.text.high }}>On / Off (default: Off)</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </Section>

        </div>
      </main>
    </div>
  );
});

export default HowItWorksPage;
