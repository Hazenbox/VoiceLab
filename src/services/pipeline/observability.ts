/**
 * Pipeline Observability
 *
 * Structured logging for every pipeline execution.
 * Lightweight: logs hashes and counts, not full content.
 *
 * Logging guardrails:
 * - DO log: inputHash, model, tokenSnapshot, retrievalCount, validationPassed, retryCount, latencyMs
 * - DO NOT log: full prompt text, full generated output, or PII content
 */

import type { PipelineInput, PipelineResult } from './types';
import { createLogger } from '../../utils/logger';

const logger = createLogger('Pipeline');

function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

export interface PipelineLog {
  inputHash: string;
  model: string;
  pipelinePath: string;
  ecosystem: string;
  channel: string;
  retrievalCount: number;
  validationPassed: boolean | null;
  retryCount: number;
  latencyMs: number;
  success: boolean;
  error?: string;
}

export function logPipelineRun(input: PipelineInput, result: PipelineResult): PipelineLog {
  const log: PipelineLog = {
    inputHash: hashString(input.message),
    model: result.metadata.model,
    pipelinePath: result.pipelinePath,
    ecosystem: result.metadata.effectiveEcosystem,
    channel: result.metadata.effectiveChannel,
    retrievalCount: result.metadata.retrievalCount,
    validationPassed: result.validation?.overallScore != null
      ? result.validation.overallScore >= 0.7
      : null,
    retryCount: result.retryCount,
    latencyMs: result.metadata.latencyMs,
    success: result.success,
    error: result.error,
  };

  if (result.success) {
    logger.info('Pipeline completed', log);
  } else {
    logger.warn('Pipeline failed', log);
  }

  return log;
}

export function createPipelineTimer(): { stop: () => number; elapsed: () => number } {
  const start = performance.now();
  return {
    stop: () => Math.round(performance.now() - start),
    elapsed: () => Math.round(performance.now() - start),
  };
}
