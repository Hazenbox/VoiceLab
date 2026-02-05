/**
 * Guidelines Module
 * 
 * Content Trust System - Guidelines Data Layer
 * Exports ecosystems, channels, user profiles, emotions, and guardrails.
 * 
 * @module services/guidelines
 */

// Ecosystem Registry
export {
  ECOSYSTEMS,
  getEcosystem,
  detectEcosystem,
  getEcosystemOptions,
  type Ecosystem,
} from './ecosystems';

// Channel Registry
export {
  CONTENT_CHANNELS,
  getChannel,
  getChannelsByGroup,
  getChannelGroups,
  getChannelOptions,
  getChannelDefaults,
  type ContentChannel,
  type ChannelGroup,
} from './channels';
