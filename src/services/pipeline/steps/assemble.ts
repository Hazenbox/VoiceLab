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
import type { PipelineInput, ClassifyResult, AssembleResult } from '../types';
import type { RetrievedKnowledge, CorrectionEntry } from '../../knowledge';

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

  let enhancedSystemPrompt = systemPrompt;
  let constitutionalContext: ConstitutionalContext | null = null;

  // Constitutional AI context
  if (input.featureFlags.constitutionalWrapper) {
    try {
      const constitutionalRequest: GenerationRequest = {
        userMessage: input.message,
        ecosystem: effectiveEcosystem,
        channel: effectiveChannel,
        userProfile: input.userProfile?.role as 'new_user' | 'regular' | 'premium' | 'enterprise' | 'senior' | 'youth' | 'unknown' | undefined,
        conversationHistory: input.conversationHistory
          .slice(-10)
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
        enhancedSystemPrompt = `${constitutionalContext.systemPromptInjection}\n\n---\n\n${enhancedSystemPrompt}`;
      }

      // Token Gate
      if (constitutionalContext.tokens) {
        const gateDecision = checkTokenGate(constitutionalContext.tokens);
        console.log(`[Pipeline:Assemble] TokenGate: ${formatGateDecision(gateDecision)}`);

        if (gateDecision.promptInjection) {
          enhancedSystemPrompt = `${enhancedSystemPrompt}\n\n---\n\n${gateDecision.promptInjection}`;
        }
      }
    } catch (constitutionalError) {
      console.warn('[Pipeline:Assemble] Constitutional context failed:', constitutionalError);
    }
  }

  // Profile Learning
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
        enhancedSystemPrompt = `${enhancedSystemPrompt}\n\n---\n\n${section}`;
      }
    } catch (learningError) {
      console.warn('[Pipeline:Assemble] Profile learning failed:', learningError);
    }
  }

  // Session memory
  if (input.featureFlags.learning) {
    try {
      const sessionMemoryBlock = formatSessionMemoryForPrompt();
      if (sessionMemoryBlock) {
        enhancedSystemPrompt = `${enhancedSystemPrompt}\n\n---\n\n${sessionMemoryBlock}`;
      }
    } catch { /* ignore */ }
  }

  // Nudge controller
  try {
    const nudgeContext: NudgeContext = {
      permission: 'allowed',
      emotion: constitutionalContext?.tokens?.userEmotion || 'shanta',
      intent: classification.intent || 'general',
      resolutionStatus: constitutionalContext?.stateContext?.resolutionStatus || 'in_progress',
      turnNumber: input.conversationHistory.filter(m => m.role === 'user').length + 1,
      ecosystem: effectiveEcosystem,
      userSegment: input.userProfile?.role,
    };

    const nudgeDecision = decideNudge(nudgeContext);
    if (nudgeDecision.shouldNudge && nudgeDecision.nudge) {
      const nudgeBlock = formatNudgeForPrompt(nudgeDecision);
      enhancedSystemPrompt = `${enhancedSystemPrompt}\n\n---\n\n${nudgeBlock}`;
    }
  } catch (nudgeError) {
    console.warn('[Pipeline:Assemble] Nudge failed:', nudgeError);
  }

  // Domain playbooks
  try {
    const detectedDomain = detectDomain(input.message, effectiveEcosystem);
    const domainPlaybook = getPlaybook(detectedDomain);
    if (domainPlaybook) {
      const playbookGuidance = formatPlaybookForPrompt(domainPlaybook, input.message);
      enhancedSystemPrompt = `${enhancedSystemPrompt}\n\n---\n\n${playbookGuidance}`;
    }
  } catch { /* ignore */ }

  // Training examples
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

    enhancedSystemPrompt = `${enhancedSystemPrompt}\n\n---\n\n${examplesSection}`;
  }

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
