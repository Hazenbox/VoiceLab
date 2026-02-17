/**
 * Shared Pipeline Module
 * 
 * Exports types and utilities that work on both client and server.
 * Phase 6A: Foundation for server-side pipeline execution.
 */

export * from './types';
export { runPipelineServer, AbortError } from './serverRunner';
