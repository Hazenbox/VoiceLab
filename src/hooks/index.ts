/**
 * Custom Hooks (Phase 4.1)
 * 
 * Extracted from App.tsx for better code organization.
 * 
 * @module hooks
 */

// Generation Hook
export { 
  useGeneration,
  type GenerationState,
  type GenerationResult,
  type GenerationOptions,
  type UseGenerationReturn,
} from './useGeneration';

// Messages Hook
export {
  useMessages,
  type Message,
  type MessagesState,
  type UseMessagesOptions,
  type UseMessagesReturn,
} from './useMessages';

// Trust Settings Hook
export {
  useTrustSettings,
  getChannelConstraints,
  type TrustSettings,
  type UseTrustSettingsOptions,
  type UseTrustSettingsReturn,
} from './useTrustSettings';
