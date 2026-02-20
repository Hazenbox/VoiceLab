/**
 * HowItWorksPage -- Visual-first showcase of the Voice Lab system.
 * 11 scroll-driven sections, each anchored by a flow diagram, icon grid, or visual workflow.
 */

import { memo, useRef, useEffect, useState, useCallback } from 'react';
import { useThemeColors } from '../theme';
import { FlowCanvas, FlowNode, FlowArrow, CurvedFlowArrow } from './FlowDiagram';

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
        <h2
          className="text-2xl font-bold mb-1 tracking-tight"
          style={{ color: theme.text.high }}
        >
          {title}
        </h2>
        <p className="text-sm mb-10" style={{ color: theme.text.low }}>
          {tagline}
        </p>
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
      let start = 0;
      const duration = 800;
      const startTime = performance.now();
      const tick = (now: number) => {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        start = Math.round(eased * value);
        setCount(start);
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
        style={{ color: theme.accent }}
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
            <span
              key={p}
              className="text-[10px] px-2 py-0.5 rounded-full"
              style={{ backgroundColor: theme.stroke.low, color: theme.text.medium }}
            >
              {p}
            </span>
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
// PipelineStep -- numbered zigzag step card
// ---------------------------------------------------------------------------
interface PipelineStepProps {
  number: number;
  label: string;
  description: string;
  isRight: boolean;
  visible: boolean;
}

const PipelineStep = memo(function PipelineStep({ number, label, description, isRight, visible }: PipelineStepProps) {
  const theme = useThemeColors();
  const animClass = isRight ? 'hiw-slide-right' : 'hiw-slide-left';

  return (
    <div className={`flex ${isRight ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`${animClass} ${visible ? 'hiw-visible' : ''} hiw-stagger-${number} flex items-center gap-4 p-4 rounded-xl max-w-md`}
        style={{ backgroundColor: theme.background.ghost, border: `1px solid ${theme.stroke.medium}` }}
      >
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-lg font-bold"
          style={{ backgroundColor: theme.accent, color: '#fff' }}
        >
          {number}
        </div>
        <div>
          <div className="text-sm font-semibold" style={{ color: theme.text.high }}>
            {label}
          </div>
          <div className="text-xs mt-0.5" style={{ color: theme.text.medium }}>
            {description}
          </div>
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
      <div className="rounded-xl p-4" style={{ border: `1px solid ${theme.stroke.medium}` }}>
        <div
          className="text-[10px] font-semibold uppercase tracking-wider mb-2 px-2 py-0.5 rounded inline-block"
          style={{ backgroundColor: theme.stroke.low, color: theme.text.low }}
        >
          {beforeLabel}
        </div>
        <p className="text-sm" style={{ color: theme.text.medium }}>{beforeText}</p>
      </div>
      <div className="rounded-xl p-4" style={{ border: `1px solid ${theme.accent}`, backgroundColor: `${theme.accent}08` }}>
        <div
          className="text-[10px] font-semibold uppercase tracking-wider mb-2 px-2 py-0.5 rounded inline-block"
          style={{ backgroundColor: theme.accent, color: '#fff' }}
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
  const isCore = phase === 'core';
  const opacity = 0.4 + (index / total) * 0.6;

  return (
    <div
      className="flex items-center gap-3 px-4 py-2 rounded-lg"
      style={{
        backgroundColor: isCore ? theme.background.ghost : `${theme.accent}12`,
        border: `1px solid ${isCore ? theme.stroke.low : theme.accent}`,
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
          backgroundColor: isCore ? theme.stroke.low : theme.accent,
          color: isCore ? theme.text.low : '#fff',
        }}
      >
        {phase}
      </span>
    </div>
  );
});

// ---------------------------------------------------------------------------
// ConnectorLine -- SVG dashed vertical connector between pipeline steps
// ---------------------------------------------------------------------------
const ConnectorLine = memo(function ConnectorLine({ direction }: { direction: 'left' | 'right' | 'center' }) {
  const theme = useThemeColors();
  const xStart = direction === 'left' ? 120 : direction === 'right' ? 280 : 200;
  const xEnd = direction === 'left' ? 280 : direction === 'right' ? 120 : 200;

  return (
    <svg width="100%" height="40" viewBox="0 0 400 40" className="my-1">
      <path
        d={`M ${xStart} 0 C ${xStart} 20, ${xEnd} 20, ${xEnd} 40`}
        fill="none"
        stroke={theme.accent}
        strokeWidth={2}
        strokeDasharray="6 4"
        className="hiw-animated-dash"
        opacity={0.5}
      />
    </svg>
  );
});

// ===========================================================================
// MAIN COMPONENT
// ===========================================================================

export const HowItWorksPage = memo(function HowItWorksPage({ onBack: _onBack }: HowItWorksPageProps) {
  const theme = useThemeColors();

  // Scroll container ref for smooth nav
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollTo = useCallback((id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  // Visibility hooks for animated sections
  const pipelineInView = useInView(0.1);
  const scaleInView = useInView(0.2);

  // Navigation items
  const navItems = [
    { id: 'hiw-hero', label: 'overview' },
    { id: 'hiw-onboarding', label: 'onboarding' },
    { id: 'hiw-pipeline', label: 'pipeline' },
    { id: 'hiw-knowledge', label: 'knowledge' },
    { id: 'hiw-llm', label: 'llm' },
    { id: 'hiw-trust', label: 'trust' },
    { id: 'hiw-modes', label: 'modes' },
    { id: 'hiw-learning', label: 'learning' },
    { id: 'hiw-scale', label: 'scale' },
    { id: 'hiw-admin', label: 'admin' },
    { id: 'hiw-arch', label: 'architecture' },
  ];

  return (
    <div className="h-full flex flex-col" style={{ backgroundColor: theme.background.ghost }}>
      {/* Sticky Header */}
      <header
        className="flex items-center gap-4 px-6 py-2 flex-shrink-0 overflow-x-auto"
        style={{ borderBottom: `1px solid ${theme.stroke.low}`, backgroundColor: theme.background.ghost }}
      >
        <h1 className="text-lg font-extrabold flex-shrink-0" style={{ color: theme.text.high }}>
          how it works
        </h1>
        <div className="flex items-center gap-1 ml-4">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => scrollTo(item.id)}
              className="text-[11px] px-2.5 py-1 rounded-full hover:opacity-80 transition-opacity flex-shrink-0"
              style={{ backgroundColor: theme.stroke.low, color: theme.text.medium }}
            >
              {item.label}
            </button>
          ))}
        </div>
      </header>

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
              how voice lab works
            </h2>
            <p className="text-base" style={{ color: theme.text.medium }}>
              from your words to brand-certified content in under 3 seconds
            </p>
          </div>

          {/* Hero pipeline diagram */}
          <div className="max-w-6xl mx-auto">
            <div
              className="p-6 rounded-2xl overflow-hidden"
              style={{ backgroundColor: theme.background.ghost, border: `1px solid ${theme.stroke.medium}` }}
            >
              <FlowCanvas height={80} viewBox="0 0 960 80" dotColor={theme.stroke.low}>
                {[
                  { x: 0,   label: 'your input',       sub: '' },
                  { x: 120, label: 'intent classify',   sub: 'route' },
                  { x: 240, label: 'safety gate',       sub: 'block' },
                  { x: 360, label: 'knowledge rag',     sub: 'retrieve' },
                  { x: 480, label: 'prompt assembly',   sub: '14 layers' },
                  { x: 600, label: 'llm generate',      sub: 'multi-provider' },
                  { x: 720, label: '15+ validators',    sub: '8 agents' },
                  { x: 840, label: 'trusted output',    sub: 'scored' },
                ].map((node, i, arr) => (
                  <g key={node.label}>
                    <FlowNode
                      x={node.x}
                      y={15}
                      width={105}
                      height={50}
                      label={node.label}
                      sublabel={node.sub}
                      color={i === arr.length - 1 ? theme.accent : '#ffffff'}
                      textColor={i === arr.length - 1 ? '#fff' : theme.text.high}
                      strokeColor={i === arr.length - 1 ? theme.accent : theme.stroke.medium}
                    />
                    {i < arr.length - 1 && (
                      <FlowArrow
                        x1={node.x + 108}
                        y1={40}
                        x2={node.x + 118}
                        y2={40}
                        color={theme.accent}
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
          title="onboarding & persona engine"
          tagline="3 steps to set up. the system auto-configures everything else."
          alt
        >
          {/* Wizard flow */}
          <div
            className="p-5 rounded-2xl mb-8 overflow-hidden"
            style={{ backgroundColor: theme.background.ghost, border: `1px solid ${theme.stroke.medium}` }}
          >
            <FlowCanvas height={70} viewBox="0 0 800 70" dotColor={theme.stroke.low}>
              <FlowNode x={0} y={10} width={140} height={50} label="step 1" sublabel="your name" color="#ffffff" textColor={theme.text.high} strokeColor={theme.stroke.medium} />
              <CurvedFlowArrow startX={145} startY={35} endX={195} endY={35} color={theme.accent} />
              <FlowNode x={200} y={10} width={140} height={50} label="step 2" sublabel="your role" color="#ffffff" textColor={theme.text.high} strokeColor={theme.stroke.medium} />
              <CurvedFlowArrow startX={345} startY={35} endX={395} endY={35} color={theme.accent} />
              <FlowNode x={400} y={10} width={160} height={50} label="step 3" sublabel="product ecosystem" color="#ffffff" textColor={theme.text.high} strokeColor={theme.stroke.medium} />
              <CurvedFlowArrow startX={565} startY={35} endX={615} endY={35} color={theme.accent} />
              <FlowNode x={620} y={10} width={160} height={50} label="auto-configured" sublabel="ready to generate" color={theme.accent} textColor="#fff" strokeColor={theme.accent} />
            </FlowCanvas>
          </div>

          {/* 6 Persona cards */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { role: 'marketing',  channel: 'social media',          emotion: 'wonder',     warmth: 80 },
              { role: 'product',    channel: 'app notification',      emotion: 'peace',      warmth: 60 },
              { role: 'ux writer',  channel: 'onboarding screen',     emotion: 'peace',      warmth: 70 },
              { role: 'sales',      channel: 'marketing email',       emotion: 'courage',    warmth: 80 },
              { role: 'support',    channel: 'customer care chat',    emotion: 'compassion', warmth: 90 },
              { role: 'leadership', channel: 'internal announcement', emotion: 'courage',    warmth: 60 },
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
                  <span className="text-[10px]" style={{ color: theme.text.low }}>warmth</span>
                  <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: theme.stroke.low }}>
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${p.warmth}%`, backgroundColor: theme.accent }}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-[10px]" style={{ color: theme.text.low }}>emotion</span>
                  <span
                    className="text-[10px] px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: `${theme.accent}15`, color: theme.accent }}
                  >
                    {p.emotion}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </VisualSection>

        {/* ================================================================
            SECTION 3: 7-STEP PIPELINE
            ================================================================ */}
        <section id="hiw-pipeline" ref={pipelineInView.ref}>
          <VisualSection
            title="the 7-step pipeline"
            tagline="every piece of content passes through 7 stages before it reaches you."
          >
            <div className="space-y-1">
              {[
                { n: 1, label: 'intent classify',   desc: 'routes your request to the right pipeline -- content, question, or product inquiry' },
                { n: 2, label: 'safety gate',        desc: 'blocks harmful, sensitive, or crisis content before generation (production-locked)' },
                { n: 3, label: 'knowledge rag',      desc: 'retrieves relevant rules via 384-dimension vector search from the knowledge base' },
                { n: 4, label: 'prompt assembly',    desc: 'builds a 14-layer context-aware system prompt from persona, channel, emotion, and rules' },
                { n: 5, label: 'llm generate',       desc: 'multi-provider architecture with automatic fallback -- no single point of failure' },
                { n: 6, label: '15+ validators',     desc: '8 ai agents score across gender, inclusivity, cultural, a11y, compliance, style, brand, readability' },
                { n: 7, label: 'auto-fix + finalize', desc: 'corrects fixable violations, scrubs pii, normalises entities, formats output' },
              ].map((step, i) => (
                <div key={step.n}>
                  <PipelineStep
                    number={step.n}
                    label={step.label}
                    description={step.desc}
                    isRight={i % 2 !== 0}
                    visible={pipelineInView.visible}
                  />
                  {i < 6 && <ConnectorLine direction={i % 2 === 0 ? 'right' : 'left'} />}
                </div>
              ))}
            </div>
          </VisualSection>
        </section>

        {/* ================================================================
            SECTION 4: KNOWLEDGE & PROMPT ASSEMBLY
            ================================================================ */}
        <VisualSection
          id="hiw-knowledge"
          title="knowledge & prompt assembly"
          tagline="three tiers of knowledge merge through rag into a 14-layer system prompt."
          alt
        >
          <div className="grid grid-cols-2 gap-6">
            {/* Left: 3-tier knowledge hierarchy */}
            <div>
              <div className="text-xs font-medium uppercase tracking-wider mb-3" style={{ color: theme.text.low }}>
                knowledge hierarchy
              </div>
              <div className="space-y-2">
                {[
                  { tier: 'tier 1: code defaults', items: ['101 regex patterns', '10 brand guardrails', '18 channel rules', '9 navarasa emotions'], color: theme.stroke.low },
                  { tier: 'tier 2: convex database', items: ['283 avoid words', '200+ preferred vocab', '33 auto-fix rules', '14 product definitions', '11 festivals'], color: `${theme.accent}15` },
                  { tier: 'tier 3: user learnings', items: ['corrections from feedback', 'style preferences', 'saved examples'], color: `${theme.accent}25` },
                ].map((t) => (
                  <div
                    key={t.tier}
                    className="rounded-xl p-4"
                    style={{ backgroundColor: t.color, border: `1px solid ${theme.stroke.medium}` }}
                  >
                    <div className="text-xs font-semibold mb-2" style={{ color: theme.text.high }}>
                      {t.tier}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {t.items.map((item) => (
                        <span
                          key={item}
                          className="text-[10px] px-2 py-0.5 rounded-full"
                          style={{ backgroundColor: theme.background.ghost, color: theme.text.medium, border: `1px solid ${theme.stroke.low}` }}
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              {/* RAG merge arrow */}
              <div className="flex items-center justify-center my-3">
                <svg width="200" height="30" viewBox="0 0 200 30">
                  <path d="M 30 0 L 100 25" stroke={theme.accent} strokeWidth={1.5} strokeDasharray="4" fill="none" />
                  <path d="M 100 0 L 100 25" stroke={theme.accent} strokeWidth={1.5} strokeDasharray="4" fill="none" />
                  <path d="M 170 0 L 100 25" stroke={theme.accent} strokeWidth={1.5} strokeDasharray="4" fill="none" />
                  <circle cx={100} cy={25} r={4} fill={theme.accent} />
                </svg>
              </div>
              <div className="text-center">
                <span
                  className="text-xs font-semibold px-4 py-1.5 rounded-full inline-block"
                  style={{ backgroundColor: theme.accent, color: '#fff' }}
                >
                  semantic rag search (384-dim)
                </span>
              </div>
            </div>

            {/* Right: 14-layer prompt tower */}
            <div>
              <div className="text-xs font-medium uppercase tracking-wider mb-3" style={{ color: theme.text.low }}>
                14-layer prompt assembly
              </div>
              <div className="space-y-1">
                {[
                  { label: 'system header',           phase: 'core' },
                  { label: 'ecosystem + channel tone', phase: 'core' },
                  { label: 'content topic context',    phase: 'core' },
                  { label: '10 brand guardrails',      phase: 'core' },
                  { label: 'style rules (mandatory)',   phase: 'core' },
                  { label: 'conversation flow',        phase: 'core' },
                  { label: 'persona personality',      phase: 'p1' },
                  { label: 'channel guidelines (18)',   phase: 'core' },
                  { label: 'knowledge sections',       phase: 'p2' },
                  { label: 'learned corrections',      phase: 'p3' },
                  { label: 'semantic rag results',     phase: 'p4' },
                  { label: 'user profile adaptations', phase: 'core' },
                  { label: 'navarasa emotion map',     phase: 'core' },
                  { label: 'timing + final reminders', phase: 'core' },
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
          title="llm orchestration"
          tagline="smart request management with caching, retry, and multi-provider fallback."
        >
          <div
            className="p-6 rounded-2xl overflow-hidden"
            style={{ backgroundColor: theme.background.ghost, border: `1px solid ${theme.stroke.medium}` }}
          >
            <FlowCanvas height={200} viewBox="0 0 750 200" dotColor={theme.stroke.low}>
              {/* Request */}
              <FlowNode x={0} y={75} width={85} height={50} label="request" color="#ffffff" textColor={theme.text.high} strokeColor={theme.stroke.medium} />
              <CurvedFlowArrow startX={88} startY={100} endX={118} endY={100} color={theme.stroke.medium} />

              {/* Cache check */}
              <FlowNode x={122} y={75} width={95} height={50} label="cache check" color="#ffffff" textColor={theme.text.high} strokeColor={theme.stroke.medium} />

              {/* Cache hit */}
              <CurvedFlowArrow startX={170} startY={75} endX={170} endY={30} color={theme.accent} label="hit" />
              <FlowNode x={135} y={0} width={70} height={28} label="instant" color={theme.accent} textColor="#fff" strokeColor={theme.accent} />

              {/* Cache miss */}
              <CurvedFlowArrow startX={220} startY={100} endX={260} endY={100} color={theme.stroke.medium} label="miss" />

              {/* Provider selection */}
              <FlowNode x={264} y={75} width={100} height={50} label="provider" sublabel="selection" color="#ffffff" textColor={theme.text.high} strokeColor={theme.stroke.medium} />

              {/* Provider cards */}
              {[
                { label: 'qwen',        y: 20,  primary: true },
                { label: 'huggingface', y: 65,  primary: false },
                { label: 'openai',      y: 110, primary: false },
                { label: 'claude',      y: 155, primary: false },
              ].map((prov) => (
                <g key={prov.label}>
                  <CurvedFlowArrow startX={367} startY={100} endX={405} endY={prov.y + 18} color={theme.stroke.medium} />
                  <FlowNode
                    x={408}
                    y={prov.y}
                    width={90}
                    height={35}
                    label={prov.label}
                    color={prov.primary ? theme.accent : '#ffffff'}
                    textColor={prov.primary ? '#fff' : theme.text.high}
                    strokeColor={prov.primary ? theme.accent : theme.stroke.medium}
                  />
                </g>
              ))}

              {/* Retry */}
              <CurvedFlowArrow startX={500} startY={37} endX={545} endY={80} color={theme.stroke.medium} />
              <FlowNode x={548} y={65} width={80} height={45} label="retry" sublabel="+ backoff" color="#ffffff" textColor={theme.text.high} strokeColor={theme.stroke.medium} />

              {/* Success */}
              <CurvedFlowArrow startX={632} startY={87} endX={665} endY={87} color={theme.accent} />
              <FlowNode x={668} y={65} width={75} height={45} label="stream" sublabel="response" color={theme.accent} textColor="#fff" strokeColor={theme.accent} />

              {/* Fallback dashed line */}
              <path d="M 588 110 L 588 160 L 458 160 L 458 110" fill="none" stroke={theme.stroke.medium} strokeWidth={1.5} strokeDasharray="4" />
              <text x={523} y={175} textAnchor="middle" fill={theme.text.low} fontSize={10} fontFamily="'JioType', system-ui, sans-serif">
                fallback on failure
              </text>
            </FlowCanvas>
          </div>
        </VisualSection>

        {/* ================================================================
            SECTION 6: TRUST SYSTEM
            ================================================================ */}
        <VisualSection
          id="hiw-trust"
          title="content trust validation"
          tagline="8 ai agents verify every response. the weighted scores produce a trust certificate."
          alt
        >
          {/* 8 agent cards */}
          <div className="grid grid-cols-4 gap-3 mb-6">
            {[
              { name: 'gender neutrality',     weight: '12%', color: '#E0F2FE' },
              { name: 'inclusivity',            weight: '12%', color: '#F0FDF4' },
              { name: 'cultural sensitivity',   weight: '12%', color: '#FEF3C7' },
              { name: 'accessibility',          weight: '10%', color: '#F3E8FF' },
              { name: 'compliance',             weight: '14%', color: '#FCE7F3' },
              { name: 'style consistency',      weight: '14%', color: '#FFEDD5' },
              { name: 'brand alignment',        weight: '14%', color: '#E1EFFE' },
              { name: 'readability',            weight: '12%', color: '#DCFCE7' },
            ].map((agent) => (
              <div
                key={agent.name}
                className="rounded-xl p-3 text-center"
                style={{ backgroundColor: agent.color, border: `1px solid ${theme.stroke.low}` }}
              >
                <div className="text-xs font-semibold" style={{ color: theme.text.high }}>
                  {agent.name}
                </div>
                <div className="text-[10px] mt-1" style={{ color: theme.text.medium }}>
                  {agent.weight}
                </div>
              </div>
            ))}
          </div>

          {/* Converging arrows */}
          <div className="flex justify-center mb-4">
            <svg width="400" height="40" viewBox="0 0 400 40">
              {[50, 100, 150, 200, 250, 300, 350].map((x, i) => (
                <path
                  key={i}
                  d={`M ${x} 0 L 200 35`}
                  fill="none"
                  stroke={theme.accent}
                  strokeWidth={1.5}
                  strokeDasharray="4"
                  opacity={0.5}
                />
              ))}
              <circle cx={200} cy={35} r={5} fill={theme.accent} />
            </svg>
          </div>

          {/* Trust score + 3 levels */}
          <div className="flex items-center justify-center gap-6">
            <div
              className="rounded-2xl px-8 py-4 text-center"
              style={{ backgroundColor: theme.accent, color: '#fff' }}
            >
              <div className="text-2xl font-extrabold">trust score</div>
              <div className="text-xs opacity-80 mt-1">0 -- 100, weighted across 9 dimensions</div>
            </div>
          </div>

          <div className="flex justify-center gap-4 mt-6">
            {[
              { level: 'certified', color: '#16a34a', bg: '#DCFCE7', range: '90-100' },
              { level: 'needs review', color: '#ca8a04', bg: '#FEF3C7', range: '70-89' },
              { level: 'has issues', color: '#dc2626', bg: '#FEE2E2', range: 'below 70' },
            ].map((l) => (
              <div
                key={l.level}
                className="rounded-xl px-5 py-3 text-center"
                style={{ backgroundColor: l.bg, border: `1px solid ${l.color}30` }}
              >
                <div className="text-xs font-semibold" style={{ color: l.color }}>{l.level}</div>
                <div className="text-[10px] mt-0.5" style={{ color: l.color + '99' }}>{l.range}</div>
              </div>
            ))}
          </div>
        </VisualSection>

        {/* ================================================================
            SECTION 7: TWO MODES
            ================================================================ */}
        <VisualSection
          id="hiw-modes"
          title="two modes"
          tagline="type or talk. both produce brand-certified content."
        >
          <div className="grid grid-cols-2 gap-6">
            {/* Copy mode */}
            <div
              className="rounded-2xl p-5"
              style={{ backgroundColor: theme.background.ghost, border: `1px solid ${theme.stroke.medium}` }}
            >
              <div className="text-sm font-semibold mb-1" style={{ color: theme.text.high }}>
                copy mode
              </div>
              <div className="text-xs mb-4" style={{ color: theme.text.medium }}>
                type naturally, get brand-compliant content
              </div>
              <div className="overflow-hidden rounded-xl" style={{ border: `1px solid ${theme.stroke.low}` }}>
                <FlowCanvas height={55} viewBox="0 0 500 55" dotColor={theme.stroke.low}>
                  <FlowNode x={0} y={7} width={80} height={40} label="type" color="#ffffff" textColor={theme.text.high} strokeColor={theme.stroke.medium} />
                  <FlowArrow x1={84} y1={27} x2={98} y2={27} color={theme.accent} />
                  <FlowNode x={102} y={7} width={80} height={40} label="context" sublabel="eco+channel" color="#ffffff" textColor={theme.text.high} strokeColor={theme.stroke.medium} />
                  <FlowArrow x1={186} y1={27} x2={200} y2={27} color={theme.accent} />
                  <FlowNode x={204} y={7} width={80} height={40} label="generate" color={theme.accent} textColor="#fff" strokeColor={theme.accent} />
                  <FlowArrow x1={288} y1={27} x2={302} y2={27} color={theme.accent} />
                  <FlowNode x={306} y={7} width={80} height={40} label="stream" sublabel="response" color="#ffffff" textColor={theme.text.high} strokeColor={theme.stroke.medium} />
                  <FlowArrow x1={390} y1={27} x2={404} y2={27} color={theme.accent} />
                  <FlowNode x={408} y={7} width={80} height={40} label="feedback" color="#ffffff" textColor={theme.text.high} strokeColor={theme.stroke.medium} />
                </FlowCanvas>
              </div>
            </div>

            {/* Voice mode */}
            <div
              className="rounded-2xl p-5"
              style={{ backgroundColor: theme.background.ghost, border: `1px solid ${theme.stroke.medium}` }}
            >
              <div className="text-sm font-semibold mb-1" style={{ color: theme.text.high }}>
                voice mode
              </div>
              <div className="text-xs mb-4" style={{ color: theme.text.medium }}>
                tap the ai orb, speak naturally, hear the response
              </div>
              <div className="overflow-hidden rounded-xl" style={{ border: `1px solid ${theme.stroke.low}` }}>
                <FlowCanvas height={55} viewBox="0 0 500 55" dotColor={theme.stroke.low}>
                  <FlowNode x={0} y={7} width={70} height={40} label="tap orb" color="#ffffff" textColor={theme.text.high} strokeColor={theme.stroke.medium} />
                  <FlowArrow x1={74} y1={27} x2={88} y2={27} color={theme.accent} />
                  <FlowNode x={92} y={7} width={70} height={40} label="stt" sublabel="3 providers" color="#ffffff" textColor={theme.text.high} strokeColor={theme.stroke.medium} />
                  <FlowArrow x1={166} y1={27} x2={180} y2={27} color={theme.accent} />
                  <FlowNode x={184} y={7} width={80} height={40} label="ai process" color={theme.accent} textColor="#fff" strokeColor={theme.accent} />
                  <FlowArrow x1={268} y1={27} x2={282} y2={27} color={theme.accent} />
                  <FlowNode x={286} y={7} width={70} height={40} label="tts" sublabel="3 providers" color="#ffffff" textColor={theme.text.high} strokeColor={theme.stroke.medium} />
                  <FlowArrow x1={360} y1={27} x2={374} y2={27} color={theme.accent} />
                  <FlowNode x={378} y={7} width={110} height={40} label="orb speaks" sublabel="audio response" color="#ffffff" textColor={theme.text.high} strokeColor={theme.stroke.medium} />
                </FlowCanvas>
              </div>

              {/* Orb states */}
              <div className="flex gap-2 mt-3 flex-wrap">
                {['idle', 'connecting', 'listening', 'speaking', 'error', 'fallback'].map((state) => (
                  <span
                    key={state}
                    className="text-[10px] px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: theme.stroke.low, color: theme.text.medium }}
                  >
                    {state}
                  </span>
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
          title="learning loop"
          tagline="every interaction trains the ai to generate better content."
          alt
        >
          {/* Circular flow */}
          <div className="flex justify-center mb-8">
            <div
              className="p-6 rounded-2xl overflow-hidden"
              style={{ backgroundColor: theme.background.ghost, border: `1px solid ${theme.stroke.medium}` }}
            >
              <FlowCanvas height={180} viewBox="0 0 600 180" dotColor={theme.stroke.low}>
                <FlowNode x={220} y={0} width={160} height={45} label="generate content" color={theme.accent} textColor="#fff" strokeColor={theme.accent} />
                <CurvedFlowArrow startX={380} startY={22} endX={470} endY={60} color={theme.accent} />

                <FlowNode x={420} y={60} width={160} height={45} label="user sees response" color="#ffffff" textColor={theme.text.high} strokeColor={theme.stroke.medium} />
                <CurvedFlowArrow startX={500} startY={105} endX={420} endY={135} color={theme.accent} />

                <FlowNode x={220} y={130} width={200} height={45} label="5 feedback actions" sublabel="thumbs, edit, comment, save" color="#ffffff" textColor={theme.text.high} strokeColor={theme.stroke.medium} />
                <CurvedFlowArrow startX={220} startY={152} endX={130} endY={105} color={theme.accent} />

                <FlowNode x={20} y={60} width={160} height={45} label="learning engine" sublabel="extract patterns" color="#ffffff" textColor={theme.text.high} strokeColor={theme.stroke.medium} />
                <CurvedFlowArrow startX={100} startY={60} endX={220} endY={22} color={theme.accent} />
              </FlowCanvas>
            </div>
          </div>

          {/* 5 feedback actions */}
          <div className="grid grid-cols-5 gap-3 mb-8">
            {[
              { action: 'thumbs up',   desc: 'positive signal' },
              { action: 'thumbs down', desc: 'negative signal' },
              { action: 'edit',        desc: 'correction pair' },
              { action: 'comment',     desc: 'style preference' },
              { action: 'save',        desc: 'approved example' },
            ].map((f) => (
              <IconCard key={f.action} label={f.action} sublabel={f.desc} />
            ))}
          </div>

          {/* Before/After */}
          <BeforeAfter
            beforeLabel="before learning"
            beforeText="Get excited! This amazing offer is just for you! Don't miss out on this incredible deal!"
            afterLabel="after user corrected tone"
            afterText="Here is a thoughtful offer based on your usage. Take a look when you have a moment -- it might be a good fit."
          />
        </VisualSection>

        {/* ================================================================
            SECTION 9: SCALE & BRAND
            ================================================================ */}
        <section id="hiw-scale" ref={scaleInView.ref}>
          <VisualSection
            title="scale at a glance"
            tagline="14 x 18 x 15 x 9 = over 34,000 unique content contexts. one interface."
          >
            {/* Stat counters */}
            <div className="flex gap-6 mb-12">
              <StatCounter
                value={14} label="ecosystems" visible={scaleInView.visible} delay={0}
                pills={['connectivity', 'home', 'entertainment', 'shopping', 'finance', 'health', 'education', 'sports', 'business', 'work', 'government', 'agriculture', 'energy', 'transport']}
              />
              <StatCounter
                value={18} label="channels" visible={scaleInView.visible} delay={100}
                pills={['push notification', 'sms', 'whatsapp', 'customer care', 'email', 'ivr', 'social media', 'digital ads']}
              />
              <StatCounter
                value={15} label="languages" visible={scaleInView.visible} delay={200}
                pills={['english', 'hindi', 'hinglish', 'tamil', 'telugu', 'kannada', 'malayalam', 'marathi', 'gujarati', 'bengali']}
              />
              <StatCounter
                value={9} label="emotions" visible={scaleInView.visible} delay={300}
                pills={['love', 'joy', 'compassion', 'courage', 'wonder', 'peace', 'anger', 'fear', 'disgust']}
              />
            </div>

            {/* 10 Brand Guardrails */}
            <div className="text-xs font-medium uppercase tracking-wider mb-3" style={{ color: theme.text.low }}>
              10 brand guardrails
            </div>
            <div className="grid grid-cols-5 gap-2 mb-6">
              {[
                'direct', 'focused', 'caring', 'inviting', 'positive',
                'personal', 'simple', 'modest', 'inspirational', 'non-judgmental',
              ].map((g, i) => (
                <div
                  key={g}
                  className="rounded-xl p-3 flex items-center gap-2"
                  style={{ backgroundColor: theme.background.ghost, border: `1px solid ${theme.stroke.medium}` }}
                >
                  <span
                    className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                    style={{ backgroundColor: theme.accent, color: '#fff' }}
                  >
                    {i + 1}
                  </span>
                  <span className="text-xs font-medium" style={{ color: theme.text.high }}>{g}</span>
                </div>
              ))}
            </div>

            {/* Signature phrases */}
            <div className="flex flex-wrap gap-2">
              {['with love, from jio.', 'life is beautiful.', 'made in india, with love.', 'we are jio.', 'jiotogether.'].map((phrase) => (
                <span
                  key={phrase}
                  className="text-xs px-3 py-1.5 rounded-full italic"
                  style={{ backgroundColor: theme.stroke.low, color: theme.text.medium }}
                >
                  {phrase}
                </span>
              ))}
            </div>
          </VisualSection>
        </section>

        {/* ================================================================
            SECTION 10: ADMIN & GOVERNANCE
            ================================================================ */}
        <VisualSection
          id="hiw-admin"
          title="admin & governance"
          tagline="no-code governance. update a rule, enforce it instantly."
          alt
        >
          <div className="grid grid-cols-4 gap-4">
            {[
              { title: 'dashboard',        desc: 'real-time kpis, hourly activity, quality scores, session tracking' },
              { title: 'learning center',   desc: 'review feedback, approve or reject corrections, track patterns' },
              { title: 'knowledge base',    desc: 'crud for avoid-words, vocabulary, auto-fix rules, product definitions' },
              { title: 'compliance tests',  desc: '333 automated tests across 23 groups, downloadable reports' },
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
          title="architecture"
          tagline="hybrid client-side + serverless + real-time database."
        >
          {/* 3-column architecture */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            {[
              {
                layer: 'client',
                items: ['react 19 + vite', 'zustand stores', 'jio design system', 'web audio api', 'unicorn studio (orb)'],
              },
              {
                layer: 'serverless',
                items: ['vercel functions', '/api/llm proxy', 'api key security', 'rate limiting (upstash)', 'sse streaming'],
              },
              {
                layer: 'database',
                items: ['convex (real-time)', '5 tables', 'vector search (384d)', 'multi-user sync', 'offline queue + replay'],
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

          {/* Architecture flow diagram */}
          <div
            className="p-5 rounded-2xl overflow-hidden mb-6"
            style={{ backgroundColor: theme.background.ghost, border: `1px solid ${theme.stroke.medium}` }}
          >
            <FlowCanvas height={60} viewBox="0 0 700 60" dotColor={theme.stroke.low}>
              <FlowNode x={0} y={5} width={130} height={50} label="browser" sublabel="react + zustand" color="#ffffff" textColor={theme.text.high} strokeColor={theme.stroke.medium} />
              <CurvedFlowArrow startX={135} startY={30} endX={195} endY={30} color={theme.accent} />
              <FlowNode x={200} y={5} width={130} height={50} label="vercel edge" sublabel="serverless proxy" color="#ffffff" textColor={theme.text.high} strokeColor={theme.stroke.medium} />
              <CurvedFlowArrow startX={335} startY={30} endX={395} endY={30} color={theme.accent} />
              <FlowNode x={400} y={5} width={130} height={50} label="llm providers" sublabel="qwen / openai / claude" color={theme.accent} textColor="#fff" strokeColor={theme.accent} />
              <CurvedFlowArrow startX={200} startY={55} endX={200} endY={55} color={theme.stroke.medium} />
              <FlowNode x={560} y={5} width={130} height={50} label="convex" sublabel="real-time db" color="#ffffff" textColor={theme.text.high} strokeColor={theme.stroke.medium} />
            </FlowCanvas>
          </div>

          {/* Tech badges */}
          <div className="flex flex-wrap gap-2 justify-center">
            {[
              'multi-provider llm', 'circuit breakers', 'constitutional ai',
              'pii detection', 'sentry monitoring', 'upstash redis',
              'vector search', 'offline queue', '333 compliance tests',
            ].map((badge) => (
              <span
                key={badge}
                className="text-[10px] px-3 py-1 rounded-full font-medium"
                style={{ backgroundColor: theme.accent, color: '#fff' }}
              >
                {badge}
              </span>
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
