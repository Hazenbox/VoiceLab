/**
 * HowItWorksPage -- Visual-first showcase of the Voice Lab system.
 * 11 scroll-driven sections, each anchored by a flow diagram, icon grid, or visual workflow.
 */

import { memo, useRef, useEffect, useState } from 'react';
import { useThemeColors } from '../theme';
import { FlowCanvas, FlowNode, FlowArrow, CurvedFlowArrow } from './FlowDiagram';
import { Badge } from './ui/Badge';
import { Title } from '@marcelinodzn/ds-react';

interface HowItWorksPageProps {
  onBack: () => void;
}

// ---------------------------------------------------------------------------
// useInView -- scroll-reveal hook via IntersectionObserver
// ---------------------------------------------------------------------------
function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);

  return { ref, visible };
}

// ---------------------------------------------------------------------------
// VisualSection -- full-width section wrapper with alternating bg
// ---------------------------------------------------------------------------
interface VisualSectionProps {
  title: string;
  tagline: string;
  alt?: boolean;
  children: React.ReactNode;
  id?: string;
}

const VisualSection = memo(function VisualSection({ title, tagline, alt, children, id }: VisualSectionProps) {
  const theme = useThemeColors();
  const { ref, visible } = useInView();

  return (
    <section
      id={id}
      ref={ref}
      className={`hiw-reveal ${visible ? 'hiw-visible' : ''} py-16 px-6`}
      style={{ backgroundColor: alt ? theme.background.ghost : 'transparent' }}
    >
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <Title size="L" as="h2" weight="high" color="high">
            {title}
          </Title>
          <p 
            style={{
              fontFamily: '"JioType Var"',
              fontWeight: 400,
              fontSize: '12px',
              lineHeight: 1.3,
              fontVariationSettings: '"opsz" 24',
              color: theme.text.low,
              margin: 0,
              marginTop: '6px',
            }}
          >
            {tagline}
          </p>
        </div>
        {children}
      </div>
    </section>
  );
});

// ---------------------------------------------------------------------------
// StatCounter -- animated number counter
// ---------------------------------------------------------------------------
interface StatCounterProps {
  value: number;
  label: string;
  pills?: string[];
  visible: boolean;
  delay?: number;
}

const StatCounter = memo(function StatCounter({ value, label, pills, visible, delay = 0 }: StatCounterProps) {
  const theme = useThemeColors();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!visible) return;
    const timeout = setTimeout(() => {
      const duration = 800;
      const startTime = performance.now();
      const tick = (now: number) => {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        setCount(Math.round(eased * value));
        if (progress < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, delay);
    return () => clearTimeout(timeout);
  }, [visible, value, delay]);

  return (
    <div className="text-center flex-1">
      <div
        className="text-5xl font-extrabold tabular-nums mb-1"
        style={{ color: theme.text.high }}
      >
        {count}
      </div>
      <div
        className="text-sm font-medium mb-3"
        style={{ color: theme.text.high }}
      >
        {label}
      </div>
      {pills && (
        <div className="flex flex-wrap justify-center gap-1">
          {pills.map((p) => (
            <Badge key={p} variant="neutral" emphasis="low">{p}</Badge>
          ))}
        </div>
      )}
    </div>
  );
});

// ---------------------------------------------------------------------------
// IconCard -- compact icon + label card for grids
// ---------------------------------------------------------------------------
interface IconCardProps {
  label: string;
  sublabel?: string;
  color?: string;
  textColor?: string;
  large?: boolean;
}

const IconCard = memo(function IconCard({ label, sublabel, color, textColor, large }: IconCardProps) {
  const theme = useThemeColors();
  const bg = color || theme.background.ghost;
  const fg = textColor || theme.text.high;

  return (
    <div
      className={`rounded-xl flex flex-col items-center justify-center text-center ${large ? 'p-5' : 'p-3'}`}
      style={{ backgroundColor: bg, border: `1px solid ${theme.stroke.low}` }}
    >
      <div className={`font-semibold ${large ? 'text-sm' : 'text-xs'}`} style={{ color: fg }}>
        {label}
      </div>
      {sublabel && (
        <div className="text-[10px] mt-0.5" style={{ color: theme.text.low }}>
          {sublabel}
        </div>
      )}
    </div>
  );
});

// ---------------------------------------------------------------------------
// PipelineStep -- vertical timeline step card with example
// ---------------------------------------------------------------------------
interface PipelineStepProps {
  number: number;
  label: string;
  description: string;
  example: string;
  isLast: boolean;
  visible: boolean;
}

const PipelineStep = memo(function PipelineStep({ number, label, description, example, isLast, visible }: PipelineStepProps) {
  const theme = useThemeColors();

  return (
    <div className={`hiw-reveal ${visible ? 'hiw-visible' : ''} hiw-stagger-${number} flex gap-3`}>
      {/* Timeline spine */}
      <div className="flex flex-col items-center flex-shrink-0">
        <div
          className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold z-10"
          style={{ backgroundColor: theme.secondary, color: '#fff' }}
        >
          {number}
        </div>
        {!isLast && (
          <div className="w-px my-1" style={{ height: '60px', backgroundImage: `repeating-linear-gradient(to bottom, ${theme.stroke.medium} 0, ${theme.stroke.medium} 2px, transparent 2px, transparent 6px)` }} />
        )}
      </div>
      {/* Content */}
      <div className={`flex-1 ${isLast ? '' : 'mb-6'}`}>
        <div className="text-sm font-semibold" style={{ color: theme.text.high }}>
          {label}
        </div>
        <div className="text-xs mt-0.5" style={{ color: theme.text.medium }}>
          {description}
        </div>
        <div
          className="text-[11px] mt-1.5 px-2.5 py-1 rounded-lg"
          style={{ backgroundColor: theme.stroke.low, color: theme.text.medium }}
        >
          {example}
        </div>
      </div>
    </div>
  );
});

// ---------------------------------------------------------------------------
// BeforeAfter -- side-by-side comparison
// ---------------------------------------------------------------------------
interface BeforeAfterProps {
  beforeLabel: string;
  beforeText: string;
  afterLabel: string;
  afterText: string;
}

const BeforeAfter = memo(function BeforeAfter({ beforeLabel, beforeText, afterLabel, afterText }: BeforeAfterProps) {
  const theme = useThemeColors();

  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="rounded-xl p-4" style={{ backgroundColor: theme.stroke.low }}>
        <div
          className="text-[10px] font-semibold uppercase tracking-wider mb-2 px-2 py-0.5 rounded inline-block"
          style={{ backgroundColor: theme.background.ghost, color: theme.text.low }}
        >
          {beforeLabel}
        </div>
        <p className="text-sm" style={{ color: theme.text.medium }}>{beforeText}</p>
      </div>
      <div className="rounded-xl p-4" style={{ backgroundColor: `${theme.secondary}08` }}>
        <div
          className="text-[10px] font-semibold uppercase tracking-wider mb-2 px-2 py-0.5 rounded inline-block"
          style={{ backgroundColor: theme.secondary, color: '#fff' }}
        >
          {afterLabel}
        </div>
        <p className="text-sm" style={{ color: theme.text.high }}>{afterText}</p>
      </div>
    </div>
  );
});

// ---------------------------------------------------------------------------
// PromptLayer -- single layer in the prompt tower
// ---------------------------------------------------------------------------
interface PromptLayerProps {
  label: string;
  phase: string;
  index: number;
  total: number;
}

const PromptLayer = memo(function PromptLayer({ label, phase, index, total }: PromptLayerProps) {
  const theme = useThemeColors();
  const isCore = phase === 'Core';
  const opacity = 0.4 + (index / total) * 0.6;

  return (
    <div
      className="flex items-center gap-3 px-4 py-2 rounded-lg"
      style={{
        backgroundColor: isCore ? theme.background.ghost : `${theme.secondary}12`,
        opacity,
      }}
    >
      <span className="text-[10px] font-mono flex-shrink-0 w-5 text-right" style={{ color: theme.text.low }}>
        {index + 1}
      </span>
      <span className="text-xs flex-1" style={{ color: theme.text.high }}>{label}</span>
      <span
        className="text-[9px] px-1.5 py-0.5 rounded-full flex-shrink-0 uppercase tracking-wider font-medium"
        style={{
          backgroundColor: isCore ? theme.stroke.low : theme.secondary,
          color: isCore ? theme.text.low : '#fff',
        }}
      >
        {phase}
      </span>
    </div>
  );
});


// ===========================================================================
// MAIN COMPONENT
// ===========================================================================

export const HowItWorksPage = memo(function HowItWorksPage({ onBack: _onBack }: HowItWorksPageProps) {
  const theme = useThemeColors();

  const scrollRef = useRef<HTMLDivElement>(null);

  const pipelineInView = useInView(0.1);
  const scaleInView = useInView(0.2);

  return (
    <div className="h-full flex flex-col" style={{ backgroundColor: theme.background.ghost }}>
      {/* Scrollable Content */}
      <main ref={scrollRef} className="flex-1 overflow-y-auto">

        {/* ================================================================
            SECTION 1: HERO
            ================================================================ */}
        <section
          id="hiw-hero"
          className="py-20 px-6"
          style={{ backgroundColor: 'transparent' }}
        >
          <div className="max-w-6xl mx-auto text-center mb-12">
            <h2
              className="text-4xl font-extrabold tracking-tight mb-3"
              style={{ color: theme.text.high }}
            >
              How Tone Studio works
            </h2>
          </div>

          {/* Hero pipeline diagram -- VERTICAL */}
          <div className="max-w-md mx-auto">
            <div
              className="p-6 rounded-2xl overflow-hidden"
              style={{ backgroundColor: theme.background.ghost, border: `1px solid ${theme.stroke.medium}` }}
            >
              <FlowCanvas height={620} viewBox="0 0 300 620" dotColor={theme.stroke.low}>
                {[
                  { y: 0,   label: 'Your input',       sub: '' },
                  { y: 75,  label: 'Intent classify',   sub: 'Route' },
                  { y: 150, label: 'Safety gate',       sub: 'Block' },
                  { y: 225, label: 'Knowledge RAG',     sub: 'Retrieve' },
                  { y: 300, label: 'Prompt assembly',   sub: '14 layers' },
                  { y: 375, label: 'LLM generate',      sub: 'Multi-provider' },
                  { y: 450, label: '15+ validators',    sub: '8 AI agents' },
                  { y: 525, label: 'Trusted output',    sub: 'Scored' },
                ].map((node, i, arr) => (
                  <g key={node.label}>
                    <FlowNode
                      x={50}
                      y={node.y}
                      width={200}
                      height={55}
                      label={node.label}
                      sublabel={node.sub}
                      color={i === arr.length - 1 ? theme.secondary : '#ffffff'}
                      textColor={i === arr.length - 1 ? '#fff' : theme.text.high}
                      strokeColor={i === arr.length - 1 ? theme.secondary : theme.stroke.medium}
                    />
                    {i < arr.length - 1 && (
                      <FlowArrow
                        x1={150}
                        y1={node.y + 58}
                        x2={150}
                        y2={node.y + 73}
                        color={theme.secondary}
                      />
                    )}
                  </g>
                ))}
              </FlowCanvas>
            </div>
          </div>
        </section>

        {/* ================================================================
            SECTION 2: ONBOARDING & PERSONA
            ================================================================ */}
        <VisualSection
          id="hiw-onboarding"
          title="Onboarding & persona engine"
          tagline="3 steps to set up. The system auto-configures everything else."
          alt
        >
          {/* Wizard flow */}
          <div
            className="p-6 rounded-2xl mb-8 overflow-hidden"
            style={{ backgroundColor: theme.background.ghost, border: `1px solid ${theme.stroke.medium}` }}
          >
            <FlowCanvas height={70} viewBox="0 0 800 70" dotColor={theme.stroke.low}>
              <FlowNode x={0} y={10} width={140} height={50} label="Step 1" sublabel="Your name" color="#ffffff" textColor={theme.text.high} strokeColor={theme.stroke.medium} />
              <CurvedFlowArrow startX={145} startY={35} endX={195} endY={35} color={theme.secondary} />
              <FlowNode x={200} y={10} width={140} height={50} label="Step 2" sublabel="Your role" color="#ffffff" textColor={theme.text.high} strokeColor={theme.stroke.medium} />
              <CurvedFlowArrow startX={345} startY={35} endX={395} endY={35} color={theme.secondary} />
              <FlowNode x={400} y={10} width={160} height={50} label="Step 3" sublabel="Product ecosystem" color="#ffffff" textColor={theme.text.high} strokeColor={theme.stroke.medium} />
              <CurvedFlowArrow startX={565} startY={35} endX={615} endY={35} color={theme.secondary} />
              <FlowNode x={620} y={10} width={160} height={50} label="Auto-configured" sublabel="Ready to generate" color={theme.secondary} textColor="#fff" strokeColor={theme.secondary} />
            </FlowCanvas>
          </div>

          {/* 6 Persona cards */}
          <div className="grid grid-cols-3 gap-3 mb-8">
            {[
              { role: 'Marketing',  channel: 'Social Media',          emotion: 'Wonder',     warmth: 80 },
              { role: 'Product',    channel: 'App Notification',      emotion: 'Peace',      warmth: 60 },
              { role: 'UX Writer',  channel: 'Onboarding Screen',     emotion: 'Peace',      warmth: 70 },
              { role: 'Sales',      channel: 'Marketing Email',       emotion: 'Courage',    warmth: 80 },
              { role: 'Support',    channel: 'Customer Care Chat',    emotion: 'Compassion', warmth: 90 },
              { role: 'Leadership', channel: 'Internal Announcement', emotion: 'Courage',    warmth: 60 },
            ].map((p) => (
              <div
                key={p.role}
                className="rounded-xl p-4"
                style={{ backgroundColor: theme.background.ghost, border: `1px solid ${theme.stroke.medium}` }}
              >
                <div className="text-sm font-semibold mb-2" style={{ color: theme.text.high }}>
                  {p.role}
                </div>
                <div className="text-[11px] mb-1" style={{ color: theme.text.medium }}>
                  {p.channel}
                </div>
                <div className="flex items-center gap-2 mt-3">
                  <span className="text-[10px]" style={{ color: theme.text.low }}>Warmth</span>
                  <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: theme.stroke.low }}>
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${p.warmth}%`, backgroundColor: theme.secondary }}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-[10px]" style={{ color: theme.text.low }}>Emotion</span>
                  <Badge variant="neutral" emphasis="low">{p.emotion}</Badge>
                </div>
              </div>
            ))}
          </div>

          {/* Marketing persona example */}
          <div
            className="rounded-2xl p-5"
            style={{ backgroundColor: `${theme.secondary}08` }}
          >
            <div className="text-xs font-medium mb-3" style={{ color: theme.text.high }}>
              Example: Marketing persona auto-configuration
            </div>
            <div className="text-xs mb-4" style={{ color: theme.text.medium }}>
              When a user selects &quot;Marketing&quot; as their role, the system automatically configures the following parameters without any manual input:
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { param: 'Default channel', value: 'Social media post' },
                { param: 'Content goal', value: 'Engagement' },
                { param: 'Warmth level', value: '8/10' },
                { param: 'Detail level', value: '4/10' },
                { param: 'Default emotion', value: 'Adbhuta (Wonder)' },
                { param: 'Focus areas', value: 'Hooks, CTAs, engagement' },
              ].map((item) => (
                <div key={item.param} className="flex items-center gap-2">
                  <span className="text-[10px] font-medium" style={{ color: theme.text.low }}>{item.param}:</span>
                  <Badge variant="neutral" emphasis="high">{item.value}</Badge>
                </div>
              ))}
            </div>
            <div className="mt-3 text-xs" style={{ color: theme.text.medium }}>
              The AI prompt personality is also injected: &quot;Write with energy and hooks. Focus on CTAs, engagement, and shareability. Avoid dry or formal tone.&quot;
            </div>
          </div>
        </VisualSection>

        {/* ================================================================
            SECTION 3: 7-STEP PIPELINE
            ================================================================ */}
        <section id="hiw-pipeline" ref={pipelineInView.ref}>
          <VisualSection
            title="The 7-step pipeline"
            tagline="Every piece of content passes through 7 stages before it reaches you."
          >
            <div
              className="p-6 rounded-2xl max-w-2xl mx-auto"
              style={{ backgroundColor: theme.background.ghost, border: `1px solid ${theme.stroke.medium}` }}
            >
              {[
                { n: 1, label: 'Intent classify',     desc: 'Routes your request to the right pipeline -- content, question, or product inquiry', example: '"Write a push notification for JioFiber" -> classified as content generation for Connectivity ecosystem' },
                { n: 2, label: 'Safety gate',          desc: 'Blocks harmful, sensitive, or crisis content before generation (production-locked)', example: '"Write something offensive about competitors" -> blocked before any LLM call is made' },
                { n: 3, label: 'Knowledge RAG',        desc: 'Retrieves relevant rules via 384-dimension vector search from the knowledge base', example: 'Query embeds to 384-dim vector, finds "avoid word: leverage" and "prefer: use" from Convex DB' },
                { n: 4, label: 'Prompt assembly',      desc: 'Builds a 14-layer context-aware system prompt from persona, channel, emotion, and rules', example: 'Loads JioFiber tone, push notification format (60 chars), Adbhuta emotion, 10 guardrails, avoid-words' },
                { n: 5, label: 'LLM generate',         desc: 'Multi-provider architecture with automatic fallback -- no single point of failure', example: 'Qwen generates response in 1.2s; if Qwen fails, HuggingFace takes over in 0.3s' },
                { n: 6, label: '15+ validators',       desc: '8 AI agents score across gender, inclusivity, cultural, A11Y, compliance, style, brand, readability', example: 'Brand agent flags "Amazing deal!" as too informal (score 72), Style agent flags title case violation' },
                { n: 7, label: 'Auto-fix + finalize',  desc: 'Corrects fixable violations, scrubs PII, normalises entities, formats output', example: '"Rs. 999" auto-fixed to "₹999", title case corrected to sentence case, trust score: 94 (certified)' },
              ].map((step, i, arr) => (
                <PipelineStep
                  key={step.n}
                  number={step.n}
                  label={step.label}
                  description={step.desc}
                  example={step.example}
                  isLast={i === arr.length - 1}
                  visible={pipelineInView.visible}
                />
              ))}
            </div>
          </VisualSection>
        </section>

        {/* ================================================================
            SECTION 4: KNOWLEDGE & PROMPT ASSEMBLY
            ================================================================ */}
        <VisualSection
          id="hiw-knowledge"
          title="Knowledge & prompt assembly"
          tagline="Three tiers of knowledge merge through RAG into a 14-layer system prompt."
          alt
        >
          <div className="grid grid-cols-2 gap-6">
            {/* Left: 3-tier knowledge hierarchy */}
            <div>
              <div className="text-xs font-medium uppercase tracking-wider mb-3" style={{ color: theme.text.low }}>
                Knowledge hierarchy
              </div>
              <div className="space-y-2">
                {[
                  { tier: 'Tier 1: Code defaults', items: ['101 regex patterns', '10 brand guardrails', '18 channel rules', '9 Navarasa emotions'], color: theme.stroke.low },
                  { tier: 'Tier 2: Convex database', items: ['283 avoid words', '200+ preferred vocab', '33 auto-fix rules', '14 product definitions', '11 festivals'], color: `${theme.secondary}15` },
                  { tier: 'Tier 3: User learnings', items: ['Corrections from feedback', 'Style preferences', 'Saved examples'], color: `${theme.secondary}25` },
                ].map((t) => (
                  <div
                    key={t.tier}
                    className="rounded-xl p-4"
                    style={{ backgroundColor: t.color }}
                  >
                    <div className="text-xs font-semibold mb-2" style={{ color: theme.text.high }}>
                      {t.tier}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {t.items.map((item) => (
                        <Badge key={item} variant="neutral" emphasis="low">{item}</Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              {/* RAG merge arrow */}
              <div className="flex items-center justify-center my-3">
                <svg width="200" height="30" viewBox="0 0 200 30">
                  <path d="M 30 0 L 100 25" stroke={theme.secondary} strokeWidth={1.5} strokeDasharray="4" fill="none" />
                  <path d="M 100 0 L 100 25" stroke={theme.secondary} strokeWidth={1.5} strokeDasharray="4" fill="none" />
                  <path d="M 170 0 L 100 25" stroke={theme.secondary} strokeWidth={1.5} strokeDasharray="4" fill="none" />
                  <circle cx={100} cy={25} r={4} fill={theme.secondary} />
                </svg>
              </div>
              <div className="text-center">
                <span
                  className="text-xs font-semibold px-4 py-1.5 rounded-full inline-block"
                  style={{ backgroundColor: theme.secondary, color: '#fff' }}
                >
                  Semantic RAG Search (384-dim)
                </span>
              </div>
            </div>

            {/* Right: 14-layer prompt tower */}
            <div>
              <div className="text-xs font-medium uppercase tracking-wider mb-3" style={{ color: theme.text.low }}>
                14-layer prompt assembly
              </div>
              <p className="text-xs mb-4" style={{ color: theme.text.medium }}>
                Every generation request assembles a system prompt from 14 contextual layers. Core layers are always present. Phase layers are injected progressively as the system learns -- persona config (P1), knowledge base rules (P2), user corrections (P3), and semantic RAG results (P4). The final prompt can contain hundreds of directives, but only the most relevant 5--10 per category are selected based on the current ecosystem, channel, and emotion.
              </p>
              <div className="space-y-1">
                {[
                  { label: 'System header',            phase: 'Core' },
                  { label: 'Ecosystem + channel tone',  phase: 'Core' },
                  { label: 'Content topic context',     phase: 'Core' },
                  { label: '10 brand guardrails',       phase: 'Core' },
                  { label: 'Style rules (mandatory)',    phase: 'Core' },
                  { label: 'Conversation flow',         phase: 'Core' },
                  { label: 'Persona personality',       phase: 'P1' },
                  { label: 'Channel guidelines (18)',    phase: 'Core' },
                  { label: 'Knowledge sections',        phase: 'P2' },
                  { label: 'Learned corrections',       phase: 'P3' },
                  { label: 'Semantic RAG results',      phase: 'P4' },
                  { label: 'User profile adaptations',  phase: 'Core' },
                  { label: 'Navarasa emotion map',      phase: 'Core' },
                  { label: 'Timing + final reminders',  phase: 'Core' },
                ].map((layer, i, arr) => (
                  <PromptLayer
                    key={layer.label}
                    label={layer.label}
                    phase={layer.phase}
                    index={i}
                    total={arr.length}
                  />
                ))}
              </div>
            </div>
          </div>
        </VisualSection>

        {/* ================================================================
            SECTION 5: LLM ORCHESTRATION
            ================================================================ */}
        <VisualSection
          id="hiw-llm"
          title="LLM orchestration"
          tagline="Smart request management with caching, retry, and multi-provider fallback."
        >
          <div
            className="p-6 rounded-2xl overflow-hidden"
            style={{ backgroundColor: theme.background.ghost, border: `1px solid ${theme.stroke.medium}` }}
          >
            <FlowCanvas height={200} viewBox="0 0 750 200" dotColor={theme.stroke.low}>
              <FlowNode x={0} y={75} width={85} height={50} label="Request" color="#ffffff" textColor={theme.text.high} strokeColor={theme.stroke.medium} />
              <CurvedFlowArrow startX={88} startY={100} endX={118} endY={100} color={theme.stroke.medium} />

              <FlowNode x={122} y={75} width={95} height={50} label="Cache check" color="#ffffff" textColor={theme.text.high} strokeColor={theme.stroke.medium} />

              <CurvedFlowArrow startX={170} startY={75} endX={170} endY={30} color={theme.secondary} label="Hit" />
              <FlowNode x={135} y={0} width={70} height={28} label="Instant" color={theme.secondary} textColor="#fff" strokeColor={theme.secondary} />

              <CurvedFlowArrow startX={220} startY={100} endX={260} endY={100} color={theme.stroke.medium} label="Miss" />

              <FlowNode x={264} y={75} width={100} height={50} label="Provider" sublabel="selection" color="#ffffff" textColor={theme.text.high} strokeColor={theme.stroke.medium} />

              {[
                { label: 'Qwen',        y: 20,  primary: true },
                { label: 'HuggingFace', y: 65,  primary: false },
                { label: 'OpenAI',      y: 110, primary: false },
                { label: 'Claude',      y: 155, primary: false },
              ].map((prov) => (
                <g key={prov.label}>
                  <CurvedFlowArrow startX={367} startY={100} endX={405} endY={prov.y + 18} color={theme.stroke.medium} />
                  <FlowNode
                    x={408}
                    y={prov.y}
                    width={90}
                    height={35}
                    label={prov.label}
                    color={prov.primary ? theme.secondary : '#ffffff'}
                    textColor={prov.primary ? '#fff' : theme.text.high}
                    strokeColor={prov.primary ? theme.secondary : theme.stroke.medium}
                  />
                </g>
              ))}

              <CurvedFlowArrow startX={500} startY={37} endX={545} endY={80} color={theme.stroke.medium} />
              <FlowNode x={548} y={65} width={80} height={45} label="Retry" sublabel="+ backoff" color="#ffffff" textColor={theme.text.high} strokeColor={theme.stroke.medium} />

              <CurvedFlowArrow startX={632} startY={87} endX={665} endY={87} color={theme.secondary} />
              <FlowNode x={668} y={65} width={75} height={45} label="Stream" sublabel="response" color={theme.secondary} textColor="#fff" strokeColor={theme.secondary} />

              <path d="M 588 110 L 588 160 L 458 160 L 458 110" fill="none" stroke={theme.stroke.medium} strokeWidth={1.5} strokeDasharray="4" />
              <text x={523} y={175} textAnchor="middle" fill={theme.text.low} fontSize={10} fontFamily="'JioType', system-ui, sans-serif">
                Fallback on failure
              </text>
            </FlowCanvas>
          </div>
        </VisualSection>

        {/* ================================================================
            SECTION 6: TRUST SYSTEM
            ================================================================ */}
        <VisualSection
          id="hiw-trust"
          title="Content trust validation"
          tagline="8 AI agents verify every response. The weighted scores produce a trust certificate."
          alt
        >
          {/* Flow diagram with agents on left, arrows, trust score on right */}
          <div
            className="p-6 rounded-2xl overflow-hidden mb-6"
            style={{ backgroundColor: theme.background.ghost, border: `1px solid ${theme.stroke.medium}` }}
          >
            <FlowCanvas height={320} viewBox="0 0 700 320" dotColor={theme.stroke.low}>
              {/* 8 agent nodes on the left */}
              {[
                { name: 'Gender neutrality',   weight: '12%', y: 0 },
                { name: 'Inclusivity',          weight: '12%', y: 40 },
                { name: 'Cultural sensitivity', weight: '12%', y: 80 },
                { name: 'Accessibility',        weight: '10%', y: 120 },
                { name: 'Compliance',           weight: '14%', y: 160 },
                { name: 'Style consistency',    weight: '14%', y: 200 },
                { name: 'Brand alignment',      weight: '14%', y: 240 },
                { name: 'Readability',          weight: '12%', y: 280 },
              ].map((agent, i) => (
                <g key={agent.name}>
                  <FlowNode
                    x={0}
                    y={agent.y}
                    width={220}
                    height={32}
                    label={`${agent.name} (${agent.weight})`}
                    color={i % 2 === 0 ? theme.stroke.low : theme.background.ghost}
                    textColor={theme.text.high}
                    strokeColor={theme.stroke.medium}
                    noShadow
                  />
                  <CurvedFlowArrow
                    startX={225}
                    startY={agent.y + 16}
                    endX={480}
                    endY={160}
                    color={theme.stroke.medium}
                  />
                </g>
              ))}
              {/* Trust score circle on the right */}
              <FlowNode
                x={485}
                y={110}
                width={100}
                height={100}
                label="94"
                sublabel="Trust score"
                color={theme.secondary}
                textColor="#fff"
                strokeColor={theme.secondary}
                noShadow
              />
            </FlowCanvas>
          </div>

          {/* Trust level legend */}
          <div className="flex justify-center gap-4">
            {[
              { level: 'Certified', range: '90-100' },
              { level: 'Needs review', range: '70-89' },
              { level: 'Has issues', range: 'Below 70' },
            ].map((l) => (
              <div
                key={l.level}
                className="rounded-lg px-4 py-2 flex items-center gap-3"
                style={{ backgroundColor: theme.stroke.low }}
              >
                <div className="text-xs font-semibold" style={{ color: theme.text.high }}>{l.level}</div>
                <div className="text-[10px]" style={{ color: theme.text.medium }}>{l.range}</div>
              </div>
            ))}
          </div>
        </VisualSection>

        {/* ================================================================
            SECTION 7: TWO MODES
            ================================================================ */}
        <VisualSection
          id="hiw-modes"
          title="Two modes"
          tagline="Type or talk. Both produce brand-certified content."
        >
          <div className="grid grid-cols-2 gap-6">
            {/* Copy mode */}
            <div
              className="rounded-2xl p-5"
              style={{ backgroundColor: theme.background.ghost, border: `1px solid ${theme.stroke.medium}` }}
            >
              <div className="text-sm font-semibold mb-1" style={{ color: theme.text.high }}>
                Copy mode
              </div>
              <div className="text-xs mb-4" style={{ color: theme.text.medium }}>
                Type naturally, get brand-compliant content
              </div>
              <div
                className="p-6 rounded-2xl overflow-hidden"
                style={{ backgroundColor: theme.background.ghost, border: `1px solid ${theme.stroke.medium}` }}
              >
                <FlowCanvas height={55} viewBox="0 0 500 55" dotColor={theme.stroke.low}>
                  <FlowNode x={0} y={7} width={80} height={40} label="Type" color="#ffffff" textColor={theme.text.high} strokeColor={theme.stroke.medium} />
                  <FlowArrow x1={84} y1={27} x2={98} y2={27} color={theme.secondary} />
                  <FlowNode x={102} y={7} width={80} height={40} label="Context" sublabel="Eco+channel" color="#ffffff" textColor={theme.text.high} strokeColor={theme.stroke.medium} />
                  <FlowArrow x1={186} y1={27} x2={200} y2={27} color={theme.secondary} />
                  <FlowNode x={204} y={7} width={80} height={40} label="Generate" color={theme.secondary} textColor="#fff" strokeColor={theme.secondary} />
                  <FlowArrow x1={288} y1={27} x2={302} y2={27} color={theme.secondary} />
                  <FlowNode x={306} y={7} width={80} height={40} label="Stream" sublabel="response" color="#ffffff" textColor={theme.text.high} strokeColor={theme.stroke.medium} />
                  <FlowArrow x1={390} y1={27} x2={404} y2={27} color={theme.secondary} />
                  <FlowNode x={408} y={7} width={80} height={40} label="Feedback" color="#ffffff" textColor={theme.text.high} strokeColor={theme.stroke.medium} />
                </FlowCanvas>
              </div>
            </div>

            {/* Voice mode */}
            <div
              className="rounded-2xl p-5"
              style={{ backgroundColor: theme.background.ghost, border: `1px solid ${theme.stroke.medium}` }}
            >
              <div className="text-sm font-semibold mb-1" style={{ color: theme.text.high }}>
                Voice mode
              </div>
              <div className="text-xs mb-4" style={{ color: theme.text.medium }}>
                Tap the AI Orb, speak naturally, hear the response
              </div>
              <div
                className="p-6 rounded-2xl overflow-hidden"
                style={{ backgroundColor: theme.background.ghost, border: `1px solid ${theme.stroke.medium}` }}
              >
                <FlowCanvas height={55} viewBox="0 0 500 55" dotColor={theme.stroke.low}>
                  <FlowNode x={0} y={7} width={70} height={40} label="Tap orb" color="#ffffff" textColor={theme.text.high} strokeColor={theme.stroke.medium} />
                  <FlowArrow x1={74} y1={27} x2={88} y2={27} color={theme.secondary} />
                  <FlowNode x={92} y={7} width={70} height={40} label="STT" sublabel="3 providers" color="#ffffff" textColor={theme.text.high} strokeColor={theme.stroke.medium} />
                  <FlowArrow x1={166} y1={27} x2={180} y2={27} color={theme.secondary} />
                  <FlowNode x={184} y={7} width={80} height={40} label="AI process" color={theme.secondary} textColor="#fff" strokeColor={theme.secondary} />
                  <FlowArrow x1={268} y1={27} x2={282} y2={27} color={theme.secondary} />
                  <FlowNode x={286} y={7} width={70} height={40} label="TTS" sublabel="3 providers" color="#ffffff" textColor={theme.text.high} strokeColor={theme.stroke.medium} />
                  <FlowArrow x1={360} y1={27} x2={374} y2={27} color={theme.secondary} />
                  <FlowNode x={378} y={7} width={110} height={40} label="Orb speaks" sublabel="Audio response" color="#ffffff" textColor={theme.text.high} strokeColor={theme.stroke.medium} />
                </FlowCanvas>
              </div>

              {/* Orb states */}
              <div className="flex gap-2 mt-3 flex-wrap">
                {['Idle', 'Connecting', 'Listening', 'Speaking', 'Error', 'Fallback'].map((state) => (
                  <Badge key={state} variant="neutral" emphasis="low">{state}</Badge>
                ))}
              </div>
            </div>
          </div>
        </VisualSection>

        {/* ================================================================
            SECTION 8: LEARNING LOOP
            ================================================================ */}
        <VisualSection
          id="hiw-learning"
          title="Learning loop"
          tagline="Every interaction trains the AI to generate better content."
          alt
        >
          {/* Circular flow */}
          <div className="flex justify-center mb-8">
            <div
              className="p-6 rounded-2xl overflow-hidden"
              style={{ backgroundColor: theme.background.ghost, border: `1px solid ${theme.stroke.medium}` }}
            >
              <FlowCanvas height={180} viewBox="0 0 600 180" dotColor={theme.stroke.low}>
                <FlowNode x={220} y={0} width={160} height={45} label="Generate content" color={theme.secondary} textColor="#fff" strokeColor={theme.secondary} />
                <CurvedFlowArrow startX={380} startY={22} endX={470} endY={60} color={theme.secondary} />

                <FlowNode x={420} y={60} width={160} height={45} label="User sees response" color="#ffffff" textColor={theme.text.high} strokeColor={theme.stroke.medium} />
                <CurvedFlowArrow startX={500} startY={105} endX={420} endY={135} color={theme.secondary} />

                <FlowNode x={220} y={130} width={200} height={45} label="5 feedback actions" sublabel="Thumbs, edit, comment, save" color="#ffffff" textColor={theme.text.high} strokeColor={theme.stroke.medium} />
                <CurvedFlowArrow startX={220} startY={152} endX={130} endY={105} color={theme.secondary} />

                <FlowNode x={20} y={60} width={160} height={45} label="Learning engine" sublabel="Extract patterns" color="#ffffff" textColor={theme.text.high} strokeColor={theme.stroke.medium} />
                <CurvedFlowArrow startX={100} startY={60} endX={220} endY={22} color={theme.secondary} />
              </FlowCanvas>
            </div>
          </div>

          {/* 5 feedback actions */}
          <div className="grid grid-cols-5 gap-3 mb-8">
            {[
              { action: 'Thumbs up',   desc: 'Positive signal' },
              { action: 'Thumbs down', desc: 'Negative signal' },
              { action: 'Edit',        desc: 'Correction pair' },
              { action: 'Comment',     desc: 'Style preference' },
              { action: 'Save',        desc: 'Approved example' },
            ].map((f) => (
              <IconCard key={f.action} label={f.action} sublabel={f.desc} />
            ))}
          </div>

          {/* Before/after */}
          <BeforeAfter
            beforeLabel="Before learning"
            beforeText="Get excited! This amazing offer is just for you! Don't miss out on this incredible deal!"
            afterLabel="After user corrected tone"
            afterText="Here is a thoughtful offer based on your usage. Take a look when you have a moment -- it might be a good fit."
          />
        </VisualSection>

        {/* ================================================================
            SECTION 9: SCALE & BRAND
            ================================================================ */}
        <section id="hiw-scale" ref={scaleInView.ref}>
          <VisualSection
            title="Scale at a glance"
            tagline="One interface for all ecosystems, channels, languages, and emotions."
          >
            {/* Stat counters */}
            <div className="flex gap-6 mb-12">
              <StatCounter
                value={14} label="Ecosystems" visible={scaleInView.visible} delay={0}
                pills={['Connectivity', 'Home', 'Entertainment', 'Shopping', 'Finance', 'Health', 'Education', 'Sports', 'Business', 'Work', 'Government', 'Agriculture', 'Energy', 'Transport']}
              />
              <StatCounter
                value={18} label="Channels" visible={scaleInView.visible} delay={100}
                pills={['Push Notification', 'SMS', 'WhatsApp Alert', 'Customer Care Chat', 'WhatsApp Support', 'Chatbot / FAQ', 'IVR / Voice Menu', 'Voice Assistant', 'Voice Prompts', 'Marketing Email', 'Transactional Email', 'Social Media Post', 'Digital Ads', 'TV / Video Ad', 'App Notification', 'Onboarding Screen', 'Internal Announcement', 'Training Module']}
              />
              <StatCounter
                value={15} label="Languages" visible={scaleInView.visible} delay={200}
                pills={['English', 'Hindi', 'Hinglish', 'Tamil', 'Telugu', 'Kannada', 'Malayalam', 'Marathi', 'Gujarati', 'Bengali', 'Punjabi', 'Odia', 'Assamese', 'Urdu', 'Konkani']}
              />
              <StatCounter
                value={9} label="Emotions" visible={scaleInView.visible} delay={300}
                pills={['Love', 'Joy', 'Compassion', 'Courage', 'Wonder', 'Peace', 'Anger', 'Fear', 'Disgust']}
              />
            </div>

            {/* 10 brand guardrails */}
            <div className="text-xs font-medium uppercase tracking-wider mb-3" style={{ color: theme.text.low }}>
              10 brand guardrails
            </div>
            <div className="grid grid-cols-5 gap-2 mb-6">
              {[
                'Direct', 'Focused', 'Caring', 'Inviting', 'Positive',
                'Personal', 'Simple', 'Modest', 'Inspirational', 'Non-Judgmental',
              ].map((g, i) => (
                <div
                  key={g}
                  className="rounded-xl p-3 flex items-center gap-2"
                  style={{ backgroundColor: theme.background.ghost, border: `1px solid ${theme.stroke.medium}` }}
                >
                  <span
                    className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                    style={{ backgroundColor: theme.secondary, color: '#fff' }}
                  >
                    {i + 1}
                  </span>
                  <span className="text-xs font-medium" style={{ color: theme.text.high }}>{g}</span>
                </div>
              ))}
            </div>

            {/* Signature phrases */}
            <div className="flex flex-wrap gap-2">
              {['With love, from Jio.', 'Life is beautiful.', 'Made in India, with love.', 'We are Jio.', 'JioTogether.'].map((phrase) => (
                <Badge key={phrase} variant="neutral" emphasis="low">{phrase}</Badge>
              ))}
            </div>
          </VisualSection>
        </section>

        {/* ================================================================
            SECTION 10: ADMIN & GOVERNANCE
            ================================================================ */}
        <VisualSection
          id="hiw-admin"
          title="Admin & governance"
          tagline="No-code governance. Update a rule, enforce it instantly."
          alt
        >
          <div className="grid grid-cols-4 gap-4">
            {[
              { title: 'Dashboard',        desc: 'Real-time KPIs, hourly activity, quality scores, session tracking' },
              { title: 'Learning center',   desc: 'Review feedback, approve or reject corrections, track patterns' },
              { title: 'Knowledge base',    desc: 'CRUD for avoid-words, vocabulary, auto-fix rules, product definitions' },
              { title: 'Compliance tests',  desc: '333 automated tests across 23 groups, downloadable reports' },
            ].map((card) => (
              <div
                key={card.title}
                className="rounded-2xl p-5"
                style={{ backgroundColor: theme.background.ghost, border: `1px solid ${theme.stroke.medium}` }}
              >
                <div className="text-sm font-semibold mb-2" style={{ color: theme.text.high }}>
                  {card.title}
                </div>
                <div className="text-xs" style={{ color: theme.text.medium }}>
                  {card.desc}
                </div>
              </div>
            ))}
          </div>
        </VisualSection>

        {/* ================================================================
            SECTION 11: ARCHITECTURE
            ================================================================ */}
        <VisualSection
          id="hiw-arch"
          title="Architecture"
          tagline="Hybrid client-side + serverless + real-time database."
        >
          {/* 3-column architecture */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            {[
              {
                layer: 'Client',
                items: ['React 19 + Vite', 'Zustand Stores', 'Jio Design System', 'Web Audio API', 'Unicorn Studio (Orb)'],
              },
              {
                layer: 'Serverless',
                items: ['Vercel Functions', '/api/llm Proxy', 'API Key Security', 'Rate Limiting (Upstash)', 'SSE Streaming'],
              },
              {
                layer: 'Database',
                items: ['Convex (Real-Time)', '5 Tables', 'Vector Search (384d)', 'Multi-User Sync', 'Offline Queue + Replay'],
              },
            ].map((col) => (
              <div
                key={col.layer}
                className="rounded-2xl p-5"
                style={{ backgroundColor: theme.background.ghost, border: `1px solid ${theme.stroke.medium}` }}
              >
                <div className="text-sm font-semibold mb-3" style={{ color: theme.text.high }}>
                  {col.layer}
                </div>
                <div className="space-y-1.5">
                  {col.items.map((item) => (
                    <div
                      key={item}
                      className="text-xs px-3 py-1.5 rounded-lg"
                      style={{ backgroundColor: theme.stroke.low, color: theme.text.medium }}
                    >
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Architecture flow diagram -- standardised */}
          <div
            className="p-6 rounded-2xl overflow-hidden mb-6"
            style={{ backgroundColor: theme.background.ghost, border: `1px solid ${theme.stroke.medium}` }}
          >
            <FlowCanvas height={60} viewBox="0 0 700 60" dotColor={theme.stroke.low}>
              <FlowNode x={0} y={5} width={130} height={50} label="Browser" sublabel="React + Zustand" color="#ffffff" textColor={theme.text.high} strokeColor={theme.stroke.medium} />
              <CurvedFlowArrow startX={135} startY={30} endX={195} endY={30} color={theme.secondary} />
              <FlowNode x={200} y={5} width={130} height={50} label="Vercel Edge" sublabel="Serverless proxy" color="#ffffff" textColor={theme.text.high} strokeColor={theme.stroke.medium} />
              <CurvedFlowArrow startX={335} startY={30} endX={395} endY={30} color={theme.secondary} />
              <FlowNode x={400} y={5} width={130} height={50} label="LLM providers" sublabel="Qwen / OpenAI / Claude" color={theme.secondary} textColor="#fff" strokeColor={theme.secondary} />
              <FlowNode x={560} y={5} width={130} height={50} label="Convex" sublabel="Real-time DB" color="#ffffff" textColor={theme.text.high} strokeColor={theme.stroke.medium} />
            </FlowCanvas>
          </div>

          {/* Tech badges */}
          <div className="flex flex-wrap gap-2 justify-center">
            {[
              'Multi-Provider LLM', 'Circuit Breakers', 'Constitutional AI',
              'PII Detection', 'Sentry Monitoring', 'Upstash Redis',
              'Vector Search', 'Offline Queue', '333 Compliance Tests',
            ].map((badge) => (
              <Badge key={badge} variant="informative" emphasis="low">{badge}</Badge>
            ))}
          </div>
        </VisualSection>

        {/* Bottom spacing */}
        <div className="h-16" />
      </main>
    </div>
  );
});

export default HowItWorksPage;
