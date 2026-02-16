/**
 * Admin Components
 * 
 * Central export for admin panel components.
 * 
 * @module admin/components
 */

// ── Dashboard Components (Phase 4.4) ─────────────────────────────────────────
export { ChannelDashboard } from './ChannelDashboard';
export type { ChannelMetrics, ChannelDashboardProps } from './ChannelDashboard';

export { IntentAccuracyDashboard } from './IntentAccuracyDashboard';
export type {
  IntentMetrics,
  IntentAccuracyMetrics,
  IntentAccuracyDashboardProps,
} from './IntentAccuracyDashboard';

export { TonalityComplianceDashboard } from './TonalityComplianceDashboard';
export type {
  TonalityViolation,
  EcosystemTonality,
  TonalityMetrics,
  TonalityComplianceDashboardProps,
} from './TonalityComplianceDashboard';

// ── UI Components ────────────────────────────────────────────────────────────
export { KPICard, MiniKPI, SimpleKPICard, KPICardSimple } from './KPICard';
export { AdminSidebar } from './AdminSidebar';
export type { AdminSection } from './AdminSidebar';
export { AdminTable, AdminTableRow, AdminTableCell } from './AdminTable';
export { AdminStatCard } from './AdminStatCard';
export { CategorySection, SearchFilterBar } from './CategorySection';
export type { KnowledgeItem } from './CategorySection';
export { CorrectionApprovalList } from './CorrectionApproval';
export { TimeRangeSelector, getTimestampForRange } from './TimeRangeSelector';
export type { TimeRange } from './TimeRangeSelector';
export { TokensDisplay } from './TokensDisplay';

// ── Chart Components ─────────────────────────────────────────────────────────
export {
  ChartContainer,
  HorizontalBarChart,
  VerticalBars,
  StatBreakdown,
  SentimentBar,
} from './AnalyticsCharts';

// ── CRUD Components ──────────────────────────────────────────────────────────
export { KnowledgeItemEditor, DeleteConfirmModal } from './KnowledgeCRUD';
