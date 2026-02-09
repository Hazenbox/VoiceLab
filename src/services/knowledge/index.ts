export {
  retrieveKnowledge,
  getCodeDefaults,
  buildKnowledgePromptSection,
  getAvoidWordsByCategory,
  clearKnowledgeCache,
  type KnowledgeItem,
  type RetrievedKnowledge,
  type ConvexKnowledgeData,
} from './knowledgeRetriever';

export {
  saveAsExample,
  getLocalExamples,
  clearLocalExamples,
  type SaveExamplePayload,
} from './saveExample';

export {
  extractLearningInsights,
  mergeLearnedCorrections,
  storeLocalCorrection,
  getLocalCorrections,
  clearLocalCorrections,
  type CorrectionEntry,
  type LearnedPattern,
  type LearningInsights,
} from './learningEngine';
