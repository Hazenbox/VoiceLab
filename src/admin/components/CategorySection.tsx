import { useThemeColors, SEMANTIC_COLORS } from '../../theme/useColors';
import { Label } from '@marcelinodzn/ds-react';
import type { Id } from '../../../convex/_generated/dataModel';

/** Color palette for knowledge item categories */
const CATEGORY_TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  avoid_word:          { bg: `${SEMANTIC_COLORS.negative}1F`, text: SEMANTIC_COLORS.negative },
  preferred_word:      { bg: `${SEMANTIC_COLORS.positive}1F`, text: SEMANTIC_COLORS.positive },
  auto_fix:            { bg: `${SEMANTIC_COLORS.informative}1F`, text: SEMANTIC_COLORS.informative },
  approved_example:    { bg: 'rgba(6, 182, 212, 0.12)', text: '#06b6d4' },
  product_definition:  { bg: 'rgba(168, 85, 247, 0.12)', text: '#a855f7' },
  festival:            { bg: `${SEMANTIC_COLORS.warning}1F`, text: SEMANTIC_COLORS.warning },
};

/** Color palette for severity badges */
const SEVERITY_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  error:   { bg: `${SEMANTIC_COLORS.negative}26`, text: SEMANTIC_COLORS.negative, label: 'Error' },
  warning: { bg: `${SEMANTIC_COLORS.warning}26`, text: SEMANTIC_COLORS.warning, label: 'Warning' },
  info:    { bg: `${SEMANTIC_COLORS.informative}26`, text: SEMANTIC_COLORS.informative, label: 'Info' },
};

// ── Types ────────────────────────────────────────────────────────
export interface KnowledgeItem {
  _id: Id<"knowledgeItems">;
  type: string;
  category: string;
  content: string;
  metadata?: {
    ecosystem?: string;
    channel?: string;
    persona?: string;
    severity?: string;
    suggestion?: string;
    source?: string;
    [key: string]: string | undefined;
  };
  tags: string[];
  isActive: boolean;
}

interface CategorySectionProps {
  category: string;
  items: KnowledgeItem[];
  type: string;
  searchQuery?: string;
}

// ── Severity Badge Component ─────────────────────────────────────
function SeverityBadge({ severity, count }: { severity: string; count: number }) {
  const theme = useThemeColors();
  const style = SEVERITY_COLORS[severity] || SEVERITY_COLORS.warning;
  
  const bgColorMap: Record<string, string> = {
    error:   theme.isLight ? '#FEE2E2' : 'rgba(239, 68, 68, 0.2)',
    warning: theme.isLight ? '#FEF3C7' : 'rgba(234, 179, 8, 0.2)',
    info:    theme.isLight ? '#DBEAFE' : 'rgba(59, 130, 246, 0.2)',
  };
  
  return (
    <span
      className="inline-flex items-center gap-1"
      style={{
        display: 'inline-block',
        backgroundColor: bgColorMap[severity] || bgColorMap.warning,
        borderRadius: '4px',
        padding: '2px 6px',
      }}
    >
      <Label size="XS" weight="medium" attention="high" as="span">
        {count} {style.label}
      </Label>
    </span>
  );
}

// ── Category Section Component ───────────────────────────────────
// Always expanded - no accordion behavior
export function CategorySection({ 
  category, 
  items, 
  type,
  searchQuery = '',
}: CategorySectionProps) {
  const theme = useThemeColors();
  
  // Filter items by search query
  const filteredItems = searchQuery
    ? items.filter(item => 
        item.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.metadata?.suggestion?.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : items;
  
  // Don't render if no items match
  if (filteredItems.length === 0) return null;
  
  // Calculate severity counts for avoid_word type
  const severityCounts = type === 'avoid_word'
    ? filteredItems.reduce((acc, item) => {
        const sev = item.metadata?.severity || 'warning';
        acc[sev] = (acc[sev] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    : null;

  const itemColor = CATEGORY_TYPE_COLORS[type] || { bg: theme.stroke.low, text: theme.text.high };
  const formattedCategory = category.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  return (
    <div 
      className="rounded-lg border overflow-hidden mb-3"
      style={{ borderColor: theme.stroke.low }}
    >
      {/* Header - Static, no collapse */}
      <div
        className="w-full flex items-center justify-between px-4 py-2.5"
        style={{ backgroundColor: theme.surface }}
      >
        <div className="flex items-center gap-3">
          {/* Category Name */}
          <span className="font-medium text-sm" style={{ color: theme.text.high }}>
            {formattedCategory}
          </span>
          
          {/* Item Count */}
          <span 
            className="px-2 py-0.5 rounded-full text-xs"
            style={{ backgroundColor: theme.stroke.low, color: theme.text.medium }}
          >
            {filteredItems.length}
          </span>
        </div>
        
        {/* Severity badges for avoid words */}
        {severityCounts && (
          <div className="flex items-center gap-2">
            {severityCounts.error && <SeverityBadge severity="error" count={severityCounts.error} />}
            {severityCounts.warning && <SeverityBadge severity="warning" count={severityCounts.warning} />}
            {severityCounts.info && <SeverityBadge severity="info" count={severityCounts.info} />}
          </div>
        )}
      </div>
      
      {/* Content - Always visible */}
      <div 
        className="px-4 py-3 flex flex-wrap gap-2"
        style={{ borderTop: `1px solid ${theme.stroke.low}` }}
      >
        {filteredItems.map((item) => (
          <div
            key={item._id}
            className="inline-flex items-center rounded-md px-2 py-1"
            style={{
              fontSize: '12px',
              backgroundColor: itemColor.bg,
              color: itemColor.text,
            }}
            title={item.metadata?.suggestion ? `Suggestion: ${item.metadata.suggestion}` : undefined}
          >
            <span>{item.content}</span>
            
            {/* Severity indicator for avoid words */}
            {type === 'avoid_word' && item.metadata?.severity === 'error' && (
              <span className="ml-1 w-1.5 h-1.5 rounded-full bg-red-500" title="High severity" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

