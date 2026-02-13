/**
 * Risk Module
 * 
 * Risk classification and awareness for conversation control.
 * 
 * @module services/risk
 */

export {
  classifyRisk,
  getRiskGuidance,
  getBlockedActions,
  getRequiredConfirmations,
  getRiskPromptSection,
  isActionAllowed,
  type RiskCategory,
  type RiskLevel,
  type RiskClassification,
} from './riskClassifier';
