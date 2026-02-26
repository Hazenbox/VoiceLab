import { useThemeColors } from '../../theme/useColors';
import { Badge } from '../../components/ui/Badge';
import type { Id } from '../../../convex/_generated/dataModel';

/** Map knowledge types to Badge variants */
const TYPE_TO_BADGE_VARIANT: Record<string, 'positive' | 'negative' | 'warning' | 'informative' | 'neutral'> = {
  avoid_word: 'negative',
  preferred_word: 'positive',
  auto_fix: 'informative',
  approved_example: 'informative',
  product_definition: 'neutral',
  festival: 'warning',
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
  
  const badgeVariant = TYPE_TO_BADGE_VARIANT[type] || 'neutral';
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
        
      </div>
      
      {/* Content - Always visible */}
      <div 
        className="px-4 py-3 flex flex-wrap gap-2"
        style={{ borderTop: `1px solid ${theme.stroke.low}` }}
      >
        {filteredItems.map((item) => (
          <Badge 
            key={item._id} 
            variant={badgeVariant}
            title={item.metadata?.suggestion ? `Suggestion: ${item.metadata.suggestion}` : undefined}
          >
            {item.content}
            {/* Severity indicator for avoid words */}
            {type === 'avoid_word' && item.metadata?.severity === 'error' && (
              <span className="ml-1 w-1.5 h-1.5 rounded-full bg-red-500" title="High severity" />
            )}
          </Badge>
        ))}
      </div>
    </div>
  );
}

