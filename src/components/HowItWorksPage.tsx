/**
 * HowItWorksPage Component
 * 
 * Comprehensive documentation page explaining the complete Voice Lab system.
 * Covers the full generation flow including onboarding, persona engine,
 * knowledge base, RAG, learning engine, content trust, feedback loop,
 * multi-user sync via Convex, and admin panel.
 */

import { memo } from 'react';
import { useThemeColors } from '../theme';
import { FlowCanvas, FlowNode, FlowArrow, CurvedFlowArrow, DottedBackground } from './FlowDiagram';
import { DSIcon } from './DSIcon';

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
 * Compact Table Component for structured data
 */
interface CompactTableProps {
  title: string;
  headers: string[];
  rows: string[][];
}

const CompactTable = memo(function CompactTable({ title, headers, rows }: CompactTableProps) {
  const theme = useThemeColors();
  
  return (
    <div 
      className="p-4 rounded-lg"
      style={{ 
        backgroundColor: theme.background.ghost,
        border: `1px solid ${theme.stroke.medium}`
      }}
    >
      <h4 className="font-medium text-sm mb-3" style={{ color: theme.text.high }}>
        {title}
      </h4>
      <table className="w-full text-sm">
        <thead>
          <tr style={{ borderBottom: `1px solid ${theme.stroke.medium}` }}>
            {headers.map((h, i) => (
              <th key={i} className="py-1.5 text-left text-xs font-medium" style={{ color: theme.text.low }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} style={{ borderBottom: `1px solid ${theme.stroke.low}` }}>
              {row.map((cell, ci) => (
                <td key={ci} className="py-1.5 text-xs" style={{ color: ci === 0 ? theme.text.high : theme.text.medium }}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
});

/**
 * Main HowItWorksPage Component
 */
export const HowItWorksPage = memo(function HowItWorksPage({ onBack: _onBack }: HowItWorksPageProps) {
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
            <FlowCanvas height={200} viewBox="0 0 900 200" dotColor={theme.stroke.low}>
              {/* Row 1: Main generation flow */}
              <FlowNode x={0} y={15} width={90} height={45} label="Onboarding" sublabel="Profile" color="#ffffff" textColor={theme.text.high} strokeColor={theme.stroke.medium} />
              <FlowArrow x1={95} y1={37} x2={115} y2={37} color={theme.accent} />
              
              <FlowNode x={120} y={15} width={90} height={45} label="Persona" sublabel="Auto-Config" color="#ffffff" textColor={theme.text.high} strokeColor={theme.stroke.medium} />
              <FlowArrow x1={215} y1={37} x2={235} y2={37} color={theme.accent} />
              
              <FlowNode x={240} y={15} width={100} height={45} label="Context" sublabel="+ Knowledge" color="#ffffff" textColor={theme.text.high} strokeColor={theme.stroke.medium} />
              <FlowArrow x1={345} y1={37} x2={365} y2={37} color={theme.accent} />
              
              <FlowNode x={370} y={15} width={90} height={45} label="Prompt" sublabel="Builder" color="#ffffff" textColor={theme.text.high} strokeColor={theme.stroke.medium} />
              <FlowArrow x1={465} y1={37} x2={485} y2={37} color={theme.accent} />
              
              <FlowNode x={490} y={15} width={100} height={45} label="LLM" sublabel="Orchestrator" color={theme.accent} textColor="#fff" strokeColor={theme.accent} />
              <FlowArrow x1={595} y1={37} x2={615} y2={37} color={theme.accent} />
              
              <FlowNode x={620} y={15} width={90} height={45} label="Content" sublabel="Trust" color="#ffffff" textColor={theme.text.high} strokeColor={theme.stroke.medium} />
              <FlowArrow x1={715} y1={37} x2={735} y2={37} color={theme.accent} />
              
              <FlowNode x={740} y={15} width={80} height={45} label="Response" sublabel="Display" color="#ffffff" textColor={theme.text.high} strokeColor={theme.stroke.medium} />

              {/* Row 2: Feedback loop */}
              <FlowNode x={740} y={80} width={80} height={45} label="Feedback" sublabel="5 Actions" color="#ffffff" textColor={theme.text.high} strokeColor={theme.stroke.medium} />
              <FlowArrow x1={740} y1={60} x2={740} y2={80} color={theme.accent} />

              <FlowNode x={580} y={80} width={100} height={45} label="Learning" sublabel="Engine" color="#ffffff" textColor={theme.text.high} strokeColor={theme.stroke.medium} />
              <CurvedFlowArrow startX={740} startY={102} endX={680} endY={102} color={theme.accent} />

              <FlowNode x={400} y={80} width={120} height={45} label="Convex Sync" sublabel="Multi-User DB" color="#ffffff" textColor={theme.text.high} strokeColor={theme.stroke.medium} />
              <CurvedFlowArrow startX={580} startY={102} endX={520} endY={102} color={theme.accent} />
              
              <FlowNode x={230} y={80} width={110} height={45} label="RAG" sublabel="Vector Search" color="#ffffff" textColor={theme.text.high} strokeColor={theme.stroke.medium} />
              <CurvedFlowArrow startX={400} startY={102} endX={340} endY={102} color={theme.accent} />

              {/* Loop back arrow */}
              <path 
                d={`M 230 102 L 180 102 L 180 60 L 240 42`} 
                fill="none" 
                stroke={theme.accent} 
                strokeWidth={1.5} 
                strokeDasharray="4" 
                markerEnd="url(#arrowhead)"
              />
              <text x={140} y={82} textAnchor="middle" fill={theme.text.low} fontSize={9} fontFamily="'Geist Mono', ui-monospace, monospace">
                Loop
              </text>

              {/* Row 3: Admin */}
              <FlowNode x={400} y={150} width={120} height={40} label="Admin Panel" sublabel="/admin" color="#ffffff" textColor={theme.text.high} strokeColor={theme.stroke.medium} />
              <FlowArrow x1={460} y1={125} x2={460} y2={150} color={theme.stroke.medium} />
            </FlowCanvas>
          </div>

          {/* ━━━ Section 1: First-Time Onboarding ━━━ */}
          <Section 
            number={1} 
            title="First-Time Onboarding"
            description="New users set up their profile in a 3-step wizard"
          >
            <div 
              className="p-4 rounded-lg mb-4"
              style={{ 
                backgroundColor: theme.background.ghost,
                border: `1px solid ${theme.stroke.medium}`,
                overflow: 'hidden'
              }}
            >
              <FlowCanvas height={80} viewBox="0 0 700 80" dotColor={theme.stroke.low}>
                <FlowNode x={0} y={15} width={140} height={50} label="Step 1" sublabel="Your Name" color="#ffffff" textColor={theme.text.high} strokeColor={theme.stroke.medium} />
                <CurvedFlowArrow startX={140} startY={40} endX={200} endY={40} color={theme.stroke.medium} />
                
                <FlowNode x={200} y={15} width={140} height={50} label="Step 2" sublabel="Your Role" color="#ffffff" textColor={theme.text.high} strokeColor={theme.stroke.medium} />
                <CurvedFlowArrow startX={340} startY={40} endX={400} endY={40} color={theme.stroke.medium} />
                
                <FlowNode x={400} y={15} width={140} height={50} label="Step 3" sublabel="Product Ecosystem" color="#ffffff" textColor={theme.text.high} strokeColor={theme.stroke.medium} />
                <CurvedFlowArrow startX={540} startY={40} endX={600} endY={40} color={theme.accent} />
                
                <FlowNode x={600} y={15} width={90} height={50} label="Ready" color={theme.accent} textColor="#fff" strokeColor={theme.accent} />
              </FlowCanvas>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <InfoCard 
                title="6 Roles"
                items={[
                  'Marketing - Campaigns, promotions, brand content',
                  'Product - Feature copy, release notes, in-app content',
                  'UX Writer - Interface copy, microcopy, flows',
                  'Sales - Pitches, proposals, outreach',
                  'Support - Help articles, chat responses, FAQs',
                  'Leadership - Internal comms, strategy, memos'
                ]}
                icon={<DSIcon name="IcUser" size="XS" attention="high" />}
              />
              <InfoCard 
                title="14 Product Ecosystems"
                items={[
                  'Connectivity - Jio Mobile, Fiber, 5G',
                  'Home - JioFiber, Home Entertainment',
                  'Entertainment - JioCinema, JioTV, JioSaavn',
                  'Shopping - JioMart, Retail',
                  'Finance - JioPayments, Banking, Insurance',
                  'Health - JioHealthHub, Wellness',
                  'Business / Work / Government / Education',
                  'Sports / Agriculture / Energy / Transport'
                ]}
                icon={<DSIcon name="IcApartment" size="XS" attention="high" />}
              />
            </div>

            <p className="text-sm" style={{ color: theme.text.medium }}>
              On first visit, a 3-step onboarding wizard collects your name, role, and primary product ecosystem. A unique device ID is generated via <code className="px-1.5 py-0.5 rounded text-xs" style={{ backgroundColor: theme.stroke.low }}>crypto.randomUUID()</code>. Your profile is saved to <code className="px-1.5 py-0.5 rounded text-xs" style={{ backgroundColor: theme.stroke.low }}>localStorage</code> and synced to Convex for multi-user tracking. No login required. You can update these settings anytime in the Settings panel.
            </p>
          </Section>

          {/* ━━━ Section 2: Persona Auto-Configuration ━━━ */}
          <Section 
            number={2} 
            title="Persona Auto-Configuration"
            description="Your role automatically configures the system for optimal output"
          >
            <CompactTable 
              title="Role-Based Presets (6 Personas)"
              headers={['Role', 'Default Channel', 'Goal', 'Warmth', 'Detail', 'Emotion']}
              rows={[
                ['Marketing', 'Social Media Post', 'Engagement', '8/10', '4/10', 'Adbhuta (Wonder)'],
                ['Product', 'App Notification', 'Information', '6/10', '7/10', 'Shanta (Peace)'],
                ['UX Writer', 'Onboarding Screen', 'Instructional', '7/10', '3/10', 'Shanta (Peace)'],
                ['Sales', 'Marketing Email', 'Action', '8/10', '6/10', 'Vira (Courage)'],
                ['Support', 'Customer Care Chat', 'Support', '9/10', '8/10', 'Karuna (Compassion)'],
                ['Leadership', 'Internal Announcement', 'Information', '6/10', '7/10', 'Vira (Courage)'],
              ]}
            />

            <div className="grid grid-cols-2 gap-4 mt-4 mb-4">
              <InfoCard 
                title="Each Persona Configures"
                items={[
                  'Default ecosystem and channel selection',
                  'Warmth and detail level sliders',
                  'Content goal (engagement, information, action, etc.)',
                  'Default Navarasa emotion',
                  'Prompt personality paragraph for the LLM',
                  'Content focus and priority areas',
                  'Anti-patterns specific to the role'
                ]}
                icon={<DSIcon name="IcSettings" size="XS" attention="high" />}
              />
              <InfoCard 
                title="Prompt Personality Injection"
                items={[
                  'A "Content Creator Context" section is added to the system prompt',
                  'Describes how the AI should write for the specific role',
                  'Example: Support persona emphasises empathy, patience, clear steps',
                  'Example: Marketing persona focuses on hooks, CTAs, engagement',
                  'Includes role-specific avoidance patterns',
                  'All overridable by the user in Settings'
                ]}
                icon={<DSIcon name="IcDocument" size="XS" attention="high" />}
              />
            </div>
          </Section>

          {/* ━━━ Section 3: Context Building ━━━ */}
          <Section 
            number={3} 
            title="Context Building"
            description="Your message gets enriched with smart context from multiple sources"
          >
            <div className="grid grid-cols-2 gap-4 mb-4">
              <InfoCard 
                title="Ecosystem (14 Types)"
                items={[
                  'Connectivity - Jio mobile, fiber, 5G',
                  'Entertainment - JioCinema, JioTV, JioSaavn',
                  'Finance - JioPayments, banking, insurance',
                  'Shopping - JioMart, retail, e-commerce',
                  'Health - JioHealthHub, telemedicine',
                  'Education - Learning platforms, courses',
                  'Sports - Live streaming, fantasy games',
                  'Agriculture - Farmer services, rural',
                  'Energy / Transport / Home / Business / Work / Government'
                ]}
                icon={<DSIcon name="IcApartment" size="XS" attention="high" />}
              />
              <InfoCard 
                title="Channel (18 Types)"
                items={[
                  'Push Notification - Short, action-focused',
                  'SMS - 160 char limit',
                  'Customer Care Chat - Warm, detailed',
                  'WhatsApp Support - Conversational',
                  'Marketing Email - Engaging',
                  'App Notification / Onboarding Screen',
                  'Social Media / Digital Ads / IVR',
                  'And 9 more...'
                ]}
                icon={<DSIcon name="IcChat" size="XS" attention="high" />}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              <InfoCard 
                title="Navarasa Emotion Detection"
                items={[
                  'Shringara - Love & Affection',
                  'Hasya - Joy & Amusement',
                  'Karuna - Compassion & Sadness',
                  'Raudra - Anger & Frustration',
                  'Vira - Courage & Pride',
                  'Bhayanaka - Fear & Anxiety',
                  'Bibhatsa - Disgust & Aversion',
                  'Adbhuta - Wonder & Curiosity',
                  'Shanta - Peace & Calm'
                ]}
                icon={<DSIcon name="IcSentimentSatisfied" size="XS" attention="high" />}
              />
              <InfoCard 
                title="User Profile & Timing"
                items={[
                  'Age Group - Digital confident/cautious',
                  'Literacy Level - Affects complexity',
                  'Region - 12 Indian regions',
                  'Language - 15 supported languages',
                  'Morning/Afternoon/Evening/Late Night tone shifts',
                  'Weekend and festival-aware timing'
                ]}
                icon={<DSIcon name="IcClock" size="XS" attention="high" />}
              />
            </div>
          </Section>

          {/* ━━━ Section 4: Knowledge Base & RAG ━━━ */}
          <Section 
            number={4} 
            title="Knowledge Base & RAG"
            description="Dynamic knowledge retrieval powered by Convex + vector search"
          >
            <div className="grid grid-cols-3 gap-4 mb-4">
              <InfoCard 
                title="Seeded Knowledge (Tier 1)"
                items={[
                  '~283 avoid words/phrases',
                  '~200+ preferred vocabulary',
                  '~33 auto-fix replacement rules',
                  '14 product definitions',
                  '11 Indian festivals',
                  'All stored in Convex with embeddings'
                ]}
                icon={<DSIcon name="IcDatabase" size="XS" attention="high" />}
              />
              <InfoCard 
                title="Code-Level Rules (Stay in Code)"
                items={[
                  '101 regex validation patterns',
                  '10 brand guardrails',
                  '9 Navarasa emotions',
                  'Readability algorithm',
                  '18 channel formatting rules',
                  '15 ecosystem definitions'
                ]}
                icon={<DSIcon name="IcCode" size="XS" attention="high" />}
              />
              <InfoCard 
                title="RAG Pipeline (Vector Search)"
                items={[
                  'Model: BAAI/bge-small-en-v1.5',
                  '384-dimensional embeddings',
                  'Convex native vector search',
                  'Filters by type, category, active status',
                  'Minimum similarity score: 0.3',
                  'Results merged into prompt context'
                ]}
                icon={<DSIcon name="IcSearch" size="XS" attention="high" />}
              />
            </div>

            <div 
              className="p-4 rounded-lg mb-4"
              style={{ 
                backgroundColor: theme.background.ghost,
                border: `1px solid ${theme.stroke.medium}`,
                overflow: 'hidden'
              }}
            >
              <h4 className="font-medium text-sm mb-3" style={{ color: theme.text.high }}>
                Two-Source Architecture
              </h4>
              <FlowCanvas height={100} viewBox="0 0 700 100" dotColor={theme.stroke.low}>
                <FlowNode x={0} y={10} width={100} height={40} label="User Query" color="#ffffff" textColor={theme.text.high} strokeColor={theme.stroke.medium} />
                <CurvedFlowArrow startX={100} startY={30} endX={150} endY={30} color={theme.stroke.medium} />
                
                <FlowNode x={150} y={10} width={120} height={40} label="Knowledge" sublabel="Retriever" color={theme.accent} textColor="#fff" strokeColor={theme.accent} />
                
                {/* Two branches */}
                <CurvedFlowArrow startX={270} startY={20} endX={320} endY={10} color={theme.stroke.medium} />
                <FlowNode x={320} y={0} width={120} height={30} label="Convex DB" color="#ffffff" textColor={theme.text.high} strokeColor={theme.stroke.medium} />

                <CurvedFlowArrow startX={270} startY={40} endX={320} endY={55} color={theme.stroke.medium} />
                <FlowNode x={320} y={45} width={120} height={30} label="Code Defaults" color="#ffffff" textColor={theme.text.high} strokeColor={theme.stroke.medium} />
                
                {/* Merge */}
                <CurvedFlowArrow startX={440} startY={15} endX={490} endY={30} color={theme.stroke.medium} />
                <CurvedFlowArrow startX={440} startY={60} endX={490} endY={30} color={theme.stroke.medium} />
                
                <FlowNode x={490} y={10} width={100} height={40} label="Semantic" sublabel="Search (RAG)" color="#ffffff" textColor={theme.text.high} strokeColor={theme.stroke.medium} />
                <CurvedFlowArrow startX={590} startY={30} endX={630} endY={30} color={theme.accent} />
                
                <FlowNode x={630} y={10} width={65} height={40} label="Prompt" color={theme.accent} textColor="#fff" strokeColor={theme.accent} />
              </FlowCanvas>
            </div>

            <p className="text-sm" style={{ color: theme.text.medium }}>
              The Knowledge Retriever first checks Convex for dynamic knowledge (avoid words, vocabulary, auto-fix rules, approved examples). If Convex is unavailable, it falls back to hardcoded code defaults. Results are cached in-memory for 60 seconds. When RAG is enabled, the user's query is embedded via HuggingFace and run through Convex vector search to find contextually relevant knowledge items, which are merged into the prompt alongside the base knowledge.
            </p>
          </Section>

          {/* ━━━ Section 5: Prompt Construction ━━━ */}
          <Section 
            number={5} 
            title="Prompt Construction"
            description="14 layers of context assembled into a comprehensive system prompt"
          >
            <div 
              className="p-4 rounded-lg mb-4"
              style={{ 
                backgroundColor: theme.background.ghost,
                border: `1px solid ${theme.stroke.medium}`
              }}
            >
              <h4 className="font-medium text-sm mb-3" style={{ color: theme.text.high }}>
                System Prompt Assembly Order
              </h4>
              <div className="space-y-1.5">
                {[
                  { num: 1, text: 'System Header - "Jio Content Generation System"', badge: 'Core' },
                  { num: 2, text: 'Current Context - Ecosystem tone, channel, warmth/detail levels', badge: 'Core' },
                  { num: 3, text: 'Content Topic - Detected product context', badge: 'Core' },
                  { num: 4, text: '10 Brand Guardrails (MANDATORY) - With DO/DON\'T examples', badge: 'Core' },
                  { num: 5, text: 'Style Rules (MANDATORY) - Sentence case, British spellings, ₹ symbol, etc.', badge: 'Core' },
                  { num: 6, text: 'Conversation Flow - 6-step structure', badge: 'Core' },
                  { num: 7, text: 'Content Creator Context - Persona prompt personality', badge: 'Phase 1' },
                  { num: 8, text: 'Channel Guidelines - 18 channel-specific formatting rules', badge: 'Core' },
                  { num: 9, text: 'Knowledge Sections - Avoid words (50), vocabulary (30), auto-fix (15), examples (5)', badge: 'Phase 2' },
                  { num: 10, text: 'Learned Corrections - User edits, dislikes, style preferences', badge: 'Phase 3' },
                  { num: 11, text: 'Semantic RAG Results - Contextually retrieved knowledge', badge: 'Phase 4' },
                  { num: 12, text: 'User Profile Adaptations - Language, region, age, literacy', badge: 'Core' },
                  { num: 13, text: 'Emotional Context - Navarasa emotion mapping', badge: 'Core' },
                  { num: 14, text: 'Timing Context + Important Reminders (9 final rules)', badge: 'Core' },
                ].map((item) => (
                  <div 
                    key={item.num}
                    className="flex items-center gap-3 p-2 rounded"
                    style={{ backgroundColor: item.badge !== 'Core' ? `${theme.accent}08` : 'transparent' }}
                  >
                    <span 
                      className="w-6 h-6 rounded-full flex items-center justify-center text-xs flex-shrink-0"
                      style={{ backgroundColor: theme.accent, color: '#fff' }}
                    >
                      {item.num}
                    </span>
                    <span className="text-xs flex-1" style={{ color: theme.text.medium }}>{item.text}</span>
                    <span 
                      className="text-[10px] px-1.5 py-0.5 rounded flex-shrink-0"
                      style={{ 
                        backgroundColor: item.badge === 'Core' ? theme.stroke.low : theme.accent,
                        color: item.badge === 'Core' ? theme.text.low : '#fff'
                      }}
                    >
                      {item.badge}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div 
              className="p-4 rounded-lg mb-4"
              style={{ 
                backgroundColor: theme.background.ghost,
                border: `1px solid ${theme.stroke.medium}`
              }}
            >
              <h4 className="font-medium text-sm mb-2" style={{ color: theme.text.high }}>
                10 Brand Guardrails (Training 1.pdf)
              </h4>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { num: 1, text: 'We are Direct - Get to the point, no filler' },
                  { num: 2, text: 'We are Focused - Say only what matters' },
                  { num: 3, text: 'We are Caring - Approachable, customer first' },
                  { num: 4, text: 'We are Inviting - Make everyone feel welcome' },
                  { num: 5, text: 'We are Positive - Offer solutions, not problems' },
                  { num: 6, text: 'We are Personal - Speak to needs, not sell' },
                  { num: 7, text: 'We are Simple - Clear, self-explanatory' },
                  { num: 8, text: 'We are Modest - No boasting or exaggeration' },
                  { num: 9, text: 'We are Inspirational - Encourage without preaching' },
                  { num: 10, text: 'We are Non-judgmental - Respect everyone' },
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

            <div 
              className="p-4 rounded-lg mb-4"
              style={{ 
                backgroundColor: theme.background.ghost,
                border: `1px solid ${theme.stroke.medium}`
              }}
            >
              <h4 className="font-medium text-sm mb-2" style={{ color: theme.text.high }}>
                Jio Signature Phrases
              </h4>
              <div className="flex flex-wrap gap-2">
                {[
                  'With love, from Jio.',
                  'Life is beautiful.',
                  'Made in India, with love.',
                  'We are Jio.',
                  'JioTogether.'
                ].map((phrase) => (
                  <span 
                    key={phrase}
                    className="text-xs px-2 py-1 rounded"
                    style={{ backgroundColor: theme.stroke.low, color: theme.text.medium }}
                  >
                    {phrase}
                  </span>
                ))}
              </div>
            </div>
          </Section>

          {/* ━━━ Section 6: LLM Orchestration ━━━ */}
          <Section 
            number={6} 
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

          {/* ━━━ Section 7: Backend Architecture ━━━ */}
          <Section 
            number={7} 
            title="Backend Architecture"
            description="Hybrid client-side + Vercel serverless + Convex real-time database"
          >
            <div className="grid grid-cols-3 gap-4 mb-4">
              <InfoCard 
                title="Vercel Serverless (/api/llm)"
                items={[
                  'Proxies LLM requests securely',
                  'Keeps API keys server-side',
                  'Request logging and rate limiting',
                  'Streaming support (SSE)'
                ]}
                icon={<DSIcon name="IcArrowForward" size="XS" attention="high" />}
              />
              <InfoCard 
                title="Convex (Shared Database)"
                items={[
                  '5 tables: users, corrections, analytics, knowledgeItems, adminConfig',
                  'Real-time subscriptions (useQuery hooks)',
                  'Native vector search (384-dim)',
                  'Serverless functions (actions, mutations, queries)',
                  'Multi-user data aggregation'
                ]}
                icon={<DSIcon name="IcDatabase" size="XS" attention="high" />}
              />
              <InfoCard 
                title="Client-Side Persistence"
                items={[
                  'localStorage - UI prefs, profiles, caches, queues',
                  'IndexedDB - Audio blobs (large files)',
                  'In-memory caches - Knowledge (60s TTL)',
                  'Convex is the shared source of truth',
                  'Local storage acts as offline buffer'
                ]}
                icon={<DSIcon name="IcCpu" size="XS" attention="high" />}
              />
            </div>

            <p className="text-sm" style={{ color: theme.text.medium }}>
              Voice Lab uses a hybrid architecture: LLM requests go through Vercel serverless functions for API key security. User data (profiles, corrections, analytics, knowledge) is stored in Convex for multi-user access. Client-side storage (localStorage, IndexedDB) provides offline resilience and fast reads. The <code className="px-1.5 py-0.5 rounded text-xs" style={{ backgroundColor: theme.stroke.low }}>ConvexSyncService</code> handles background sync with offline queuing, automatic replay on reconnect, and batched analytics flushing every 5 seconds.
            </p>
          </Section>

          {/* ━━━ Section 8: Content Trust Validation ━━━ */}
          <Section 
            number={8} 
            title="Content Trust Validation"
            description="8 AI agents verify the response quality"
          >
            <div 
              className="p-4 rounded-lg mb-4"
              style={{ 
                backgroundColor: theme.background.ghost,
                border: `1px solid ${theme.stroke.medium}`,
                overflow: 'hidden'
              }}
            >
              <svg width="100%" height="300" viewBox="0 0 900 300">
                <DottedBackground color={theme.stroke.low} />
                <rect x="0" y="0" width="900" height="300" fill="url(#dotted-pattern)" />

                {/* 8 Agent Nodes */}
                {[
                  { name: 'Gender', badge: 'Neutrality', weight: '12%', x: 10, color: '#E0F2FE', textColor: '#0369A1' },
                  { name: 'Inclusivity', badge: 'Check', weight: '12%', x: 110, color: '#F0FDF4', textColor: '#15803D' },
                  { name: 'Cultural', badge: 'Sensitivity', weight: '12%', x: 210, color: '#FEF3C7', textColor: '#B45309' },
                  { name: 'A11y', badge: 'Access', weight: '10%', x: 310, color: '#F3E8FF', textColor: '#7E22CE' },
                  { name: 'Compliance', badge: 'Legal', weight: '14%', x: 410, color: '#FCE7F3', textColor: '#BE185D' },
                  { name: 'Style', badge: 'Tone', weight: '14%', x: 510, color: '#FFEDD5', textColor: '#C2410C' },
                  { name: 'Brand', badge: 'Voice', weight: '14%', x: 610, color: '#E1EFFE', textColor: '#0284C7' },
                  { name: 'Readability', badge: 'Grade 8', weight: '12%', x: 710, color: '#DCFCE7', textColor: '#166534' },
                ].map((agent, index) => {
                  const targetX = 350 + (index * 25); 
                  
                  return (
                    <g key={agent.name}>
                      <CurvedFlowArrow 
                        startX={agent.x + 45} 
                        startY={90} 
                        endX={targetX} 
                        endY={200} 
                        color={theme.stroke.high} 
                      />
                      <FlowNode 
                        x={agent.x} 
                        y={40} 
                        width={90} 
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
                  x={350} 
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

            <div className="grid grid-cols-2 gap-4 mb-4">
              <InfoCard 
                title="Validation Patterns (100+)"
                items={[
                  'Title case detection (sentence case only)',
                  'British spelling enforcement',
                  'Currency format (₹ symbol)',
                  'Exclamation mark warnings',
                  'Elitism patterns (ping us -> message us)',
                  'Fear-based messaging detection'
                ]}
                icon={<DSIcon name="IcCheckCircle" size="XS" attention="high" />}
              />
              <InfoCard 
                title="Readability Agent"
                items={[
                  'Flesch-Kincaid Grade Level scoring',
                  'Target: Grade 8 or below',
                  'Long sentence detection (>25 words)',
                  'Complex word flagging',
                  'Sentence structure analysis',
                  'Per Training 1.pdf requirement'
                ]}
                icon={<DSIcon name="IcLibrary" size="XS" attention="high" />}
              />
            </div>

            <p className="text-sm" style={{ color: theme.text.medium }}>
              Each response is analyzed by 8 validation agents that check for gender neutrality, inclusivity, cultural sensitivity, accessibility, compliance, style consistency, brand alignment, and readability. The weighted scores produce a final trust score that determines if the content is certified, needs review, or has issues.
            </p>
          </Section>

          {/* ━━━ Section 9: Response & Feedback ━━━ */}
          <Section 
            number={9} 
            title="Response & Feedback Loop"
            description="Your response appears with 5 feedback actions that drive learning"
          >
            <div className="grid grid-cols-2 gap-4 mb-4">
              <InfoCard 
                title="Response Display"
                items={[
                  'Streaming mode - Words appear as generated',
                  'Trust badge shows content certification level',
                  'Click badge for detailed agent breakdown',
                  'Generation context preserved per message',
                  'Copy / regenerate options'
                ]}
                icon={<DSIcon name="IcBolt" size="XS" attention="high" />}
              />
              <InfoCard 
                title="5 Feedback Actions"
                items={[
                  'Thumbs Up - Positive reinforcement (green highlight)',
                  'Thumbs Down - Negative signal + optional reason input',
                  'Edit - Textarea pre-filled with original, save delta',
                  'Comment - Free-text style/preference feedback',
                  'Save as Example - Bookmark approved content for reuse'
                ]}
                icon={<DSIcon name="IcThumbUp" size="XS" attention="high" />}
              />
            </div>

            <div 
              className="p-4 rounded-lg mb-4"
              style={{ 
                backgroundColor: theme.background.ghost,
                border: `1px solid ${theme.stroke.medium}`
              }}
            >
              <h4 className="font-medium text-sm mb-2" style={{ color: theme.text.high }}>
                Feedback UX Details
              </h4>
              <ul className="space-y-1.5">
                {[
                  'Only one feedback action per message (mutual exclusion)',
                  'Thumbs down and comment expand an input field inline',
                  'Edit expands a resizable textarea (4 rows, 80-200px height)',
                  'Submit with Enter key or check icon; cancel with Escape',
                  'After submission, collapses to a confirmation message',
                  'Save as Example only appears if the feature is enabled',
                  'Feedback is tagged with the ecosystem/channel at generation time (not current UI state)',
                ].map((item, index) => (
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
                Messages are saved to <code className="px-1.5 py-0.5 rounded text-xs" style={{ backgroundColor: theme.stroke.low }}>localStorage</code> for quick access, audio data in <code className="px-1.5 py-0.5 rounded text-xs" style={{ backgroundColor: theme.stroke.low }}>IndexedDB</code>. Conversations persist across sessions and are scoped to each project. Feedback is saved locally and synced to Convex for admin visibility.
              </p>
            </div>
          </Section>

          {/* ━━━ Section 10: Learning Engine ━━━ */}
          <Section 
            number={10} 
            title="Learning from Feedback"
            description="The system learns from every user interaction and improves over time"
          >
            <CompactTable 
              title="Feedback Signal Strengths"
              headers={['Feedback Type', 'Signal', 'What the System Learns']}
              rows={[
                ['Thumbs Up', 'Positive', 'Reinforcement - content saved as example for reuse'],
                ['Thumbs Down', 'Negative', 'Avoidance patterns extracted from optional reason'],
                ['Edit', 'Strongest', 'Original vs. edited delta - learns before/after corrections (200 char cap)'],
                ['Comment', 'Qualitative', 'Style preferences and tone guidance'],
                ['Save as Example', 'Approval', 'Bookmarked content becomes a prompt example (max 50 locally)'],
              ]}
            />

            <div className="grid grid-cols-2 gap-4 mt-4 mb-4">
              <InfoCard 
                title="Learning Pipeline"
                items={[
                  'extractLearningInsights() processes corrections by ecosystem/channel',
                  'Edits (up to 10) become before/after correction pairs',
                  'Thumbs down (up to 5) become avoidance patterns',
                  'Comments (up to 5) become style preferences',
                  'Builds a composite "Learned from User Corrections" prompt section',
                  'Merged into the Knowledge Retriever output'
                ]}
                icon={<DSIcon name="IcLightbulb" size="XS" attention="high" />}
              />
              <InfoCard 
                title="How Learning Improves the Prompt"
                items={[
                  'Avoid patterns merged into avoidWords (deduplicated)',
                  'Style preferences injected as a dedicated section',
                  'Corrections shown as numbered BEFORE/AFTER pairs',
                  'Saved examples become approved content in the prompt (max 5)',
                  'All filtered by current ecosystem/channel context',
                  'Local corrections cache: max 100 entries in localStorage'
                ]}
                icon={<DSIcon name="IcTrendingUp" size="XS" attention="high" />}
              />
            </div>

            <p className="text-sm" style={{ color: theme.text.medium }}>
              Every piece of feedback creates a learning signal. The Learning Engine extracts patterns from corrections, filters them by the current ecosystem and channel context, and injects them into the next generation's prompt. This means the system progressively adapts to each user's preferences. Corrections are stored locally (max 100) and synced to Convex for cross-user learning in the admin panel.
            </p>
          </Section>

          {/* ━━━ Section 11: Multi-User Sync ━━━ */}
          <Section 
            number={11} 
            title="Multi-User Data Sync"
            description="Background synchronisation to Convex for multi-user access"
          >
            <div className="grid grid-cols-2 gap-4 mb-4">
              <InfoCard 
                title="What Gets Synced"
                items={[
                  'User profiles (name, role, product, device ID)',
                  'Heartbeat pings (last seen tracking)',
                  'Analytics events (generation, feedback, session)',
                  'Corrections and feedback (all 5 types)',
                  'Saved examples (approved content)'
                ]}
                icon={<DSIcon name="IcSort" size="XS" attention="high" />}
              />
              <InfoCard 
                title="Sync Architecture"
                items={[
                  'ConvexSyncService - Singleton, non-blocking',
                  'Events queued in localStorage (max 100)',
                  'Analytics buffered in memory (5s flush interval)',
                  'safeMutation() - Never throws, returns {ok} result',
                  'Offline: queues events, replays on reconnect',
                  'Queue flush order: user_sync first, then heartbeat, analytics (batched), corrections'
                ]}
                icon={<DSIcon name="IcRefresh" size="XS" attention="high" />}
              />
            </div>

            <div 
              className="p-4 rounded-lg mb-4"
              style={{ 
                backgroundColor: theme.background.ghost,
                border: `1px solid ${theme.stroke.medium}`
              }}
            >
              <h4 className="font-medium text-sm mb-2" style={{ color: theme.text.high }}>
                Convex Database Tables
              </h4>
              <div className="space-y-1.5">
                {[
                  { table: 'users', desc: 'User profiles (one per device) with deviceId, name, role, product, lastSeenAt' },
                  { table: 'corrections', desc: 'All feedback/edits with original content, edited content, comment, ecosystem, channel, adminStatus' },
                  { table: 'analyticsEvents', desc: 'Generation/session/feedback events with trustScore, violations, token counts, LLM provider' },
                  { table: 'knowledgeItems', desc: 'Dynamic knowledge base with type, category, content, metadata, tags, 384-dim embedding vector' },
                  { table: 'adminConfig', desc: 'System-level key-value settings (JSON values)' },
                ].map((item) => (
                  <div key={item.table} className="flex items-start gap-2 text-sm">
                    <code className="px-1.5 py-0.5 rounded text-xs flex-shrink-0" style={{ backgroundColor: theme.accent, color: '#fff' }}>
                      {item.table}
                    </code>
                    <span style={{ color: theme.text.medium }}>{item.desc}</span>
                  </div>
                ))}
              </div>
            </div>

            <p className="text-sm" style={{ color: theme.text.medium }}>
              User identification is lightweight and login-free: a unique UUID is generated per device on first visit. The Convex user ID is cached in localStorage (<code className="px-1.5 py-0.5 rounded text-xs" style={{ backgroundColor: theme.stroke.low }}>voicelab_convex_user_id</code>) for persistence across sessions. The sync bridge is injected into the React tree via a <code className="px-1.5 py-0.5 rounded text-xs" style={{ backgroundColor: theme.stroke.low }}>ConvexSyncBridge</code> component that provides the real mutation function.
            </p>
          </Section>

          {/* ━━━ Section 12: Admin Panel ━━━ */}
          <Section 
            number={12} 
            title="Admin Panel (/admin)"
            description="Passphrase-protected admin interface for system oversight"
          >
            <div className="grid grid-cols-3 gap-4 mb-4">
              <InfoCard 
                title="Dashboard"
                items={[
                  '4 stat cards (today, this week, total, examples)',
                  'Feedback breakdown by type with percentages',
                  'Recent feedback table (last 10 entries)',
                  'Type badges and content previews'
                ]}
              />
              <InfoCard 
                title="Analytics"
                items={[
                  'Feedback by Ecosystem (sorted by count)',
                  'Feedback by Channel (sorted by count)',
                  'Feedback Type Distribution',
                  'Designed for Convex real-time data'
                ]}
              />
              <InfoCard 
                title="Memory & Learnings"
                items={[
                  'Filter bar: All / thumbs_up / thumbs_down / edit / comment',
                  'Full corrections table with content preview',
                  'Original, edited, and comment columns',
                  'Paginated to 50 items'
                ]}
              />
            </div>

            <div className="grid grid-cols-3 gap-4 mb-4">
              <InfoCard 
                title="Knowledge Base"
                items={[
                  '6 knowledge type cards with counts',
                  '~283 avoid words, ~200+ vocabulary',
                  '~33 auto-fix rules, 14 products, 11 festivals',
                  'Management guide (seed & embed commands)',
                  'Locally saved examples table'
                ]}
              />
              <InfoCard 
                title="Users"
                items={[
                  'Device-based identification explained',
                  'Current device profile display',
                  'Name, role, product, device ID',
                  'Designed for multi-user listing from Convex'
                ]}
              />
              <InfoCard 
                title="System Config"
                items={[
                  '5 feature flags with env var names',
                  'Convex URL and deployment info',
                  'Default LLM and fallback chain',
                  'HuggingFace embedding model info',
                  'Environment diagnostics'
                ]}
              />
            </div>

            <p className="text-sm" style={{ color: theme.text.medium }}>
              Access the admin panel at <code className="px-1.5 py-0.5 rounded text-xs" style={{ backgroundColor: theme.stroke.low }}>/admin</code>. Default passphrase: <code className="px-1.5 py-0.5 rounded text-xs" style={{ backgroundColor: theme.stroke.low }}>voicelab-admin</code> (configurable via <code className="px-1.5 py-0.5 rounded text-xs" style={{ backgroundColor: theme.stroke.low }}>VITE_ADMIN_PASSPHRASE</code> env var). Session stored in sessionStorage -- re-enter after browser close. The admin panel reads from localStorage with a 5-second polling interval and is designed to also pull directly from Convex when connected.
            </p>
          </Section>

          {/* ━━━ Section 13: Error Handling & Abort ━━━ */}
          <Section 
            number={13} 
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
                  <DSIcon name="IcWarning" size="XS" attention="high" />
                  Error Handling
                </h4>
                <ul className="space-y-2 text-sm" style={{ color: theme.text.medium }}>
                  <li className="flex items-start gap-2">
                    <span style={{ color: theme.accent }}>1.</span>
                    API failure triggers automatic retry with exponential backoff
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
                    localStorage QuotaExceededError handled gracefully (warns, never crashes)
                  </li>
                  <li className="flex items-start gap-2">
                    <span style={{ color: theme.accent }}>5.</span>
                    Convex sync failures queue events for later replay
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
                  <DSIcon name="IcClose" size="XS" attention="high" />
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

          {/* ━━━ Section 14: Real Examples ━━━ */}
          <Section 
            number={14} 
            title="Real Examples"
            description="See how different settings affect the output"
          >
            <ExampleComparison
              title="Brand Guardrails Applied"
              before={{ label: "Title Case, Wrong Currency", content: "Light Up Your Home With JioFiber! Get Rs. 100,000 Off Now!" }}
              after={{ label: "Sentence case, correct format", content: "Light up your home with JioFiber. Get ₹1,00,000 off now." }}
            />

            <ExampleComparison
              title="Channel Effect"
              before={{ label: "SMS (160 chars)", content: "Jio: Your 2GB/day plan expires tomorrow. Recharge now at jio.com to stay connected. Reply HELP for assistance." }}
              after={{ label: "Customer Care Chat", content: "Namaste. I noticed your current plan is expiring tomorrow. No worries though - I am here to help you find the perfect recharge option. Would you like me to show you some plans that match your usage? We have some great offers running right now." }}
            />

            <ExampleComparison
              title="Persona Effect"
              before={{ label: "Support Persona (Warm, empathetic)", content: "I understand this has been frustrating. Let me personally look into this for you right away. Here is exactly what we are doing to resolve this - I will keep you updated every step of the way." }}
              after={{ label: "Marketing Persona (Engaging, punchy)", content: "Your entertainment just got an upgrade. Unlimited movies, shows, and live sports are now at your fingertips. Dive in and explore what is new today." }}
            />

            <ExampleComparison
              title="Learning Effect (After User Edits)"
              before={{ label: "Before learning", content: "Get excited! This amazing offer is just for you! Don't miss out on this incredible deal!" }}
              after={{ label: "After user corrected tone", content: "Here is a thoughtful offer based on your usage. Take a look when you have a moment - it might be a good fit." }}
            />
          </Section>

          {/* ━━━ Section 15: Settings & Configuration ━━━ */}
          <Section 
            number={15} 
            title="Settings & Configuration"
            description="All settings that affect content generation and system behaviour"
          >
            <div className="grid grid-cols-2 gap-4 mb-4">
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

            <div 
              className="p-4 rounded-lg"
              style={{ 
                backgroundColor: theme.background.ghost,
                border: `1px solid ${theme.stroke.medium}`
              }}
            >
              <h4 className="font-medium text-sm mb-3" style={{ color: theme.text.high }}>
                Feature Flags (Environment Variables)
              </h4>
              <div className="space-y-1">
                {[
                  { flag: 'VITE_ENABLE_CONVEX_SYNC', desc: 'Enable/disable background Convex synchronisation' },
                  { flag: 'VITE_ENABLE_PERSONA', desc: 'Enable/disable role-based persona auto-configuration' },
                  { flag: 'VITE_ENABLE_KNOWLEDGE_BASE', desc: 'Enable/disable dynamic knowledge retrieval from Convex' },
                  { flag: 'VITE_ENABLE_LEARNING', desc: 'Enable/disable learning from user feedback' },
                  { flag: 'VITE_ENABLE_RAG', desc: 'Enable/disable semantic search (vector embeddings)' },
                  { flag: 'VITE_ADMIN_PASSPHRASE', desc: 'Custom admin panel passphrase (default: voicelab-admin)' },
                ].map((item) => (
                  <div key={item.flag} className="flex items-start gap-2 text-xs py-1">
                    <code className="px-1.5 py-0.5 rounded flex-shrink-0" style={{ backgroundColor: theme.stroke.low, color: theme.text.high }}>
                      {item.flag}
                    </code>
                    <span style={{ color: theme.text.medium }}>{item.desc}</span>
                  </div>
                ))}
              </div>
            </div>
          </Section>

        </div>
      </main>
    </div>
  );
});

export default HowItWorksPage;
