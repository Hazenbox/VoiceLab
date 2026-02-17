/**
 * Pipeline Step: Assemble
 *
 * Builds the LLM prompt from context, knowledge, constitutional rules,
 * profile learning, memory, nudges, playbooks, and training examples.
 *
 * Token preservation rules:
 * - Tokens are resolved HERE, before prompt assembly
 * - Token objects are immutable per pipeline run -- never mutated after this step
 */

import { buildPrompt } from '../../prompt';
import { buildGenerationContext } from '../../context';
import { buildConversationalPrompt, buildJioInquiryPrompt } from '../../prompt/basePersona';
import { MAX_CONSTITUTIONAL_HISTORY } from '../../../constants';
import {
  prepareConstitutionalContext,
  type ConstitutionalContext,
  type GenerationRequest,
} from '../../generation/constitutionalWrapper';
import {
  checkTokenGate,
  formatGateDecision,
} from '../../tokens/tokenGate';
import {
  buildProfileLearningSection,
  getPersonalizationSummary,
  type UserLearningProfile,
} from '../../learning';
import {
  formatSessionMemoryForPrompt,
} from '../../memory';
import {
  decideNudge,
  formatNudgeForPrompt,
  type NudgeContext,
} from '../../nudge/nudgeController';
import {
  detectDomain,
  getPlaybook,
  formatPlaybookForPrompt,
} from '../../playbooks/domainPlaybooks';
import {
  findMatchingTemplate,
  generateMicroPlan,
  formatPlanForPrompt,
} from '../../conversation/microPlanGenerator';
import {
  detectBlockingInfo,
  formatBlockingInfoForPrompt,
} from '../../conversation/blockingInfoDetector';
import type { PipelineInput, ClassifyResult, AssembleResult } from '../types';
import type { RetrievedKnowledge, CorrectionEntry } from '../../knowledge';

// ── Token Budget ──────────────────────────────────────────────────────────
// Rough estimate: 1 token ~= 4 characters. Cap system prompt at ~2500 tokens.
const SYSTEM_PROMPT_TOKEN_BUDGET = 2500;
const CHARS_PER_TOKEN = 4;

function estimateTokens(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

/**
 * Shedding priority (lowest priority shed first):
 * 1. training examples
 * 2. nudge
 * 3. playbook
 * 4. profile learning
 * 5. session memory
 * Constitutional + base prompt + knowledge are never shed.
 */
interface PromptSection {
  key: string;
  content: string;
  sheddable: boolean;
  priority: number; // higher = shed first
}

function applyTokenBudget(
  basePrompt: string,
  sections: PromptSection[],
): string {
  const baseTokens = estimateTokens(basePrompt);
  let remaining = SYSTEM_PROMPT_TOKEN_BUDGET - baseTokens;

  // Sort by priority: lower number = keep longer (shed higher numbers first)
  const sorted = [...sections].sort((a, b) => a.priority - b.priority);
  const included: string[] = [];

  for (const section of sorted) {
    const sectionTokens = estimateTokens(section.content);
    if (!section.sheddable || sectionTokens <= remaining) {
      included.push(section.content);
      remaining -= sectionTokens;
    } else {
      console.log(`[Pipeline:Assemble] Token budget: shedding "${section.key}" (${sectionTokens} tokens over budget)`);
    }
  }

  return [basePrompt, ...included].join('\n\n---\n\n');
}

export function assemble(
  input: PipelineInput,
  classification: ClassifyResult,
  knowledge: RetrievedKnowledge | null,
): AssembleResult {
  const effectiveEcosystem = classification.detectedEcosystem || input.ecosystem;
  const effectiveChannel = classification.detectedChannel || input.contentChannel;
  const isContentGeneration = classification.intent === 'content_generation';

  // For conversational paths, use simpler prompts
  if (!isContentGeneration) {
    const systemPrompt = classification.intent === 'jio_inquiry'
      ? buildJioInquiryPrompt()
      : buildConversationalPrompt();

    return {
      systemPrompt,
      generationContext: { ecosystem: effectiveEcosystem, channel: effectiveChannel },
      tokenSnapshot: { ecosystem: effectiveEcosystem, channel: effectiveChannel },
      constitutionalContext: null,
    };
  }

  // Full content generation path
  const generationContext = buildGenerationContext({
    ecosystem: effectiveEcosystem,
    channel: effectiveChannel,
    userMessage: input.message,
    userProfile: input.userProfile,
    persona: input.featureFlags.persona ? input.userProfile?.role : undefined,
  });

  const { system: systemPrompt, context: finalContext } = buildPrompt(
    generationContext,
    input.message,
    knowledge ? { knowledge } : {},
  );

  // Build base prompt (constitutional + core prompt -- never shed)
  let basePrompt = systemPrompt;
  let constitutionalContext: ConstitutionalContext | null = null;

  // Constitutional AI context (never shed)
  if (input.featureFlags.constitutionalWrapper) {
    try {
      const constitutionalRequest: GenerationRequest = {
        userMessage: input.message,
        ecosystem: effectiveEcosystem,
        channel: effectiveChannel,
        userProfile: input.userProfile?.role as 'new_user' | 'regular' | 'premium' | 'enterprise' | 'senior' | 'youth' | 'unknown' | undefined,
        conversationHistory: (input.conversationHistory || [])
          .slice(-MAX_CONSTITUTIONAL_HISTORY)
          .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
        directiveOverrides: (input.externalData?.directiveOverrides || []).map(o => ({
          directiveType: o.directiveType,
          directiveKey: o.directiveKey,
          ecosystem: o.ecosystem,
          channel: o.channel,
          overrideAction: o.overrideAction,
          overrideValue: o.overrideValue,
          priority: o.priority,
          reason: o.reason,
          isActive: o.isActive,
        })),
      };

      constitutionalContext = prepareConstitutionalContext(constitutionalRequest);

      if (constitutionalContext.systemPromptInjection) {
        basePrompt = `${constitutionalContext.systemPromptInjection}\n\n---\n\n${basePrompt}`;
      }

      // Token Gate (never shed)
      if (constitutionalContext.tokens) {
        const gateDecision = checkTokenGate(constitutionalContext.tokens);
        console.log(`[Pipeline:Assemble] TokenGate: ${formatGateDecision(gateDecision)}`);

        if (gateDecision.promptInjection) {
          basePrompt = `${basePrompt}\n\n---\n\n${gateDecision.promptInjection}`;
        }
      }
    } catch (constitutionalError) {
      console.warn('[Pipeline:Assemble] Constitutional context failed:', constitutionalError);
    }
  }

  // Collect optional sections with shedding priorities
  // Lower priority number = keep longer. Higher = shed first.
  const optionalSections: PromptSection[] = [];

  // Profile Learning (priority 4 -- shed fourth)
  if (input.featureFlags.learning && input.externalData?.userLearningProfile) {
    try {
      const learningProfile: UserLearningProfile = {
        userId: input.externalData.userLearningProfile.userId,
        deviceId: input.externalData.userLearningProfile.deviceId,
        avoidPatterns: input.externalData.userLearningProfile.avoidPatterns ?? [],
        preferredWarmth: input.externalData.userLearningProfile.preferredWarmth,
        preferredDetail: input.externalData.userLearningProfile.preferredDetail,
        preferredLanguage: input.externalData.userLearningProfile.preferredLanguage,
        traitPreferences: input.externalData.userLearningProfile.traitPreferences ?? [],
        correctionCount: input.externalData.userLearningProfile.correctionCount ?? 0,
        lastCorrectionAt: input.externalData.userLearningProfile.lastCorrectionAt,
      };

      const correctionEntries: CorrectionEntry[] = ((input.externalData.corrections ?? []) as Array<{
        editedContent?: string;
        comment?: string;
        originalContent: string;
        feedbackType: string;
        timestamp: number;
      }>)
        .filter(c => c.editedContent || c.comment)
        .map(c => ({
          original: c.originalContent,
          edited: c.editedContent || '',
          context: c.comment || `${c.feedbackType} feedback`,
          timestamp: c.timestamp,
          feedbackType: c.feedbackType,
        }));

      const section = buildProfileLearningSection(learningProfile, correctionEntries);
      if (section) {
        optionalSections.push({ key: 'profile_learning', content: section, sheddable: true, priority: 4 });
      }
    } catch (learningError) {
      console.warn('[Pipeline:Assemble] Profile learning failed:', learningError);
    }
  }

  // Session memory (priority 5 -- shed fifth)
  if (input.featureFlags.learning) {
    try {
      const sessionMemoryBlock = formatSessionMemoryForPrompt();
      if (sessionMemoryBlock) {
        optionalSections.push({ key: 'session_memory', content: sessionMemoryBlock, sheddable: true, priority: 5 });
      }
    } catch { /* ignore */ }
  }

  // Nudge controller (priority 2 -- shed second)
  try {
    const nudgeContext: NudgeContext = {
      permission: 'allowed',
      emotion: constitutionalContext?.tokens?.userEmotion || 'shanta',
      intent: classification.intent || 'general',
      resolutionStatus: constitutionalContext?.stateContext?.resolutionStatus || 'in_progress',
      turnNumber: (input.conversationHistory || []).filter(m => m.role === 'user').length + 1,
      ecosystem: effectiveEcosystem,
      userSegment: input.userProfile?.role,
    };

    const nudgeDecision = decideNudge(nudgeContext);
    if (nudgeDecision.shouldNudge && nudgeDecision.nudge) {
      const nudgeBlock = formatNudgeForPrompt(nudgeDecision);
      optionalSections.push({ key: 'nudge', content: nudgeBlock, sheddable: true, priority: 2 });
    }
  } catch (nudgeError) {
    console.warn('[Pipeline:Assemble] Nudge failed:', nudgeError);
  }

  // Domain playbooks (priority 3 -- shed third)
  try {
    const detectedDomain = detectDomain(input.message, effectiveEcosystem);
    const domainPlaybook = getPlaybook(detectedDomain);
    if (domainPlaybook) {
      const playbookGuidance = formatPlaybookForPrompt(domainPlaybook, input.message);
      optionalSections.push({ key: 'playbook', content: playbookGuidance, sheddable: true, priority: 3 });
    }
  } catch { /* ignore */ }

  // Micro-plan for multi-step intents (priority 3 -- tied with playbook, shed third)
  if (classification.intent === 'content_generation') {
    try {
      const topic = constitutionalContext?.tokens?.safetyResult?.domain || 'general';
      const intent = constitutionalContext?.tokens?.intent || classification.intent;
      const template = findMatchingTemplate(intent, topic);
      if (template) {
        const plan = generateMicroPlan(template);
        const planBlock = formatPlanForPrompt(plan);
        optionalSections.push({ key: 'micro_plan', content: planBlock, sheddable: true, priority: 3 });
      }
    } catch { /* ignore */ }
  }

  // Blocking info detection (priority 2 -- shed second, alongside nudge)
  if (input.featureFlags.conversationState) {
    try {
      const turnNumber = (input.conversationHistory || []).filter(m => m.role === 'user').length + 1;
      const blockingResult = detectBlockingInfo({
        intent: classification.intent,
        topic: constitutionalContext?.tokens?.safetyResult?.domain || 'general',
        knownInfo: {},
        turnNumber,
      });
      if (blockingResult.hasBlockingNeeds) {
        const blockingBlock = formatBlockingInfoForPrompt(blockingResult);
        optionalSections.push({ key: 'blocking_info', content: blockingBlock, sheddable: true, priority: 2 });
      }
    } catch { /* ignore */ }
  }

  // Training examples (priority 1 -- shed first)
  if (input.featureFlags.learning && input.externalData?.trainingExamples?.length) {
    const examplesSection = [
      '# high-quality examples',
      'use these verified examples as a reference for style and format:',
      '',
      ...input.externalData.trainingExamples.map((ex, i) => {
        const lines = [
          `## example ${i + 1}`,
          `input: "${ex.inputContext}"`,
          `output: "${ex.outputContent}"`,
        ];
        if (ex.ecosystem) lines.push(`ecosystem: ${ex.ecosystem}`);
        if (ex.channel) lines.push(`channel: ${ex.channel}`);
        return lines.join('\n');
      }),
    ].join('\n\n');

    optionalSections.push({ key: 'training_examples', content: examplesSection, sheddable: true, priority: 1 });
  }

  // Apply token budget -- shed lowest-priority sections first if over cap
  const enhancedSystemPrompt = applyTokenBudget(basePrompt, optionalSections);

  return {
    systemPrompt: enhancedSystemPrompt,
    generationContext: finalContext,
    tokenSnapshot: {
      ecosystem: effectiveEcosystem,
      channel: effectiveChannel,
      persona: input.userProfile?.role,
      temperature: input.temperature,
      maxTokens: input.maxTokens,
    },
    constitutionalContext,
  };
}
