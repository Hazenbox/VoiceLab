/**
 * Playbooks module exports
 * @module services/playbooks
 */

export {
  // Types
  type DomainType,
  type DomainPlaybook,
  type CommonIssue,
  type ResponsePattern,
  type VocabularyEntry,
  type ProactiveOpportunity,
  type ToneGuidance,
  // Data
  DOMAIN_PLAYBOOKS,
  // Functions
  getPlaybook,
  detectDomain,
  findMatchingIssue,
  formatPlaybookForPrompt,
  getDomainVocabulary,
  simplifyTerm,
} from './domainPlaybooks';
