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

// Abort Controller Hook
export { useAbortController, useAbortControllerMap } from './useAbortController';

// Other Hooks (existing, now re-exported)
export { useSyncStatus } from './useSyncStatus';
export { useCopyToClipboard } from './useCopyToClipboard';
export { useNetworkStatus } from './useNetworkStatus';
export { useAudioAnalyzer } from './useAudioAnalyzer';
export { useChatPersistence } from './useChatPersistence';
export { useAudioRecorder } from './useAudioRecorder';
export { useSessionAnalytics } from './useSessionAnalytics';

// Extracted from App.tsx (Phase 1 refactor)
export { useVoiceConversation } from './useVoiceConversation';
export { useMessageInteractions } from './useMessageInteractions';
export { useTrustPanel } from './useTrustPanel';
