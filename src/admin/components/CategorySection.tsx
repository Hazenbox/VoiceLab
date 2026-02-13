import { useState } from 'react';
import { useThemeColors } from '../../theme/useColors';
import type { Id } from '../../../convex/_generated/dataModel';

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
  onEdit: (item: KnowledgeItem) => void;
  onDelete: (item: { id: Id<"knowledgeItems">; content: string }) => void;
  searchQuery?: string;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

// ── Severity Badge Component ─────────────────────────────────────
function SeverityBadge({ severity, count }: { severity: string; count: number }) {
  const colors: Record<string, { bg: string; text: string; label: string }> = {
    error: { bg: 'rgba(239, 68, 68, 0.15)', text: '#ef4444', label: 'error' },
    warning: { bg: 'rgba(245, 158, 11, 0.15)', text: '#f59e0b', label: 'warning' },
    info: { bg: 'rgba(59, 130, 246, 0.15)', text: '#3b82f6', label: 'info' },
  };
  
  const style = colors[severity] || colors.warning;
  
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
      style={{ backgroundColor: style.bg, color: style.text }}
    >
      {count} {style.label}
    </span>
  );
}

// ── Category Section Component ───────────────────────────────────
export function CategorySection({ 
  category, 
  items, 
  type,
  onEdit, 
  onDelete,
  searchQuery = '',
  isExpanded = true,
  onToggleExpand,
}: CategorySectionProps) {
  const theme = useThemeColors();
  const [localExpanded, setLocalExpanded] = useState(true);
  
  // Use controlled or uncontrolled expansion
  const expanded = onToggleExpand ? isExpanded : localExpanded;
  const toggleExpand = onToggleExpand || (() => setLocalExpanded(prev => !prev));
  
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

  // Get color for item based on type
  const getItemColor = () => {
    switch (type) {
      case 'avoid_word': return { bg: 'rgba(239, 68, 68, 0.12)', text: '#ef4444' };
      case 'preferred_word': return { bg: 'rgba(34, 197, 94, 0.12)', text: '#22c55e' };
      case 'auto_fix': return { bg: 'rgba(59, 130, 246, 0.12)', text: '#3b82f6' };
      case 'approved_example': return { bg: 'rgba(6, 182, 212, 0.12)', text: '#06b6d4' };
      case 'product_definition': return { bg: 'rgba(168, 85, 247, 0.12)', text: '#a855f7' };
      case 'festival': return { bg: 'rgba(234, 179, 8, 0.12)', text: '#eab308' };
      default: return { bg: theme.stroke.low, text: theme.text.high };
    }
  };

  const itemColor = getItemColor();
  const formattedCategory = category.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  return (
    <div 
      className="rounded-lg border overflow-hidden mb-3"
      style={{ borderColor: theme.stroke.low }}
    >
      {/* Header */}
      <button
        onClick={toggleExpand}
        className="w-full flex items-center justify-between px-4 py-3 text-left transition-colors hover:opacity-80"
        style={{ backgroundColor: theme.surface }}
      >
        <div className="flex items-center gap-3">
          {/* Expand/Collapse Icon */}
          <svg
            className={`w-4 h-4 transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            style={{ color: theme.text.medium }}
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          
          {/* Category Name */}
          <span className="font-medium" style={{ color: theme.text.high }}>
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
      </button>
      
      {/* Content */}
      {expanded && (
        <div 
          className="px-4 py-3 flex flex-wrap gap-2"
          style={{ borderTop: `1px solid ${theme.stroke.low}` }}
        >
          {filteredItems.map((item) => (
            <div
              key={item._id}
              className="group relative inline-flex items-center rounded-md px-2 py-1 cursor-pointer transition-all hover:ring-2 hover:ring-offset-1"
              style={{
                fontSize: '12px',
                backgroundColor: itemColor.bg,
                color: itemColor.text,
                // @ts-expect-error CSS variable for ring color
                '--tw-ring-color': itemColor.text,
              }}
              onClick={() => onEdit(item)}
              title={item.metadata?.suggestion ? `suggestion: ${item.metadata.suggestion}` : 'click to edit'}
            >
              <span>{item.content}</span>
              
              {/* Severity indicator for avoid words */}
              {type === 'avoid_word' && item.metadata?.severity === 'error' && (
                <span className="ml-1 w-1.5 h-1.5 rounded-full bg-red-500" title="high severity" />
              )}
              
              {/* Delete button - shows on hover */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete({ id: item._id, content: item.content });
                }}
                className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-white/20"
                title="delete"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Search and Filter Bar Component ──────────────────────────────
interface SearchFilterBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  categoryFilter: string | null;
  onCategoryFilterChange: (category: string | null) => void;
  availableCategories: string[];
  selectedType: string;
  totalCount: number;
  filteredCount: number;
}

export function SearchFilterBar({
  searchQuery,
  onSearchChange,
  categoryFilter,
  onCategoryFilterChange,
  availableCategories,
  selectedType,
  totalCount,
  filteredCount,
}: SearchFilterBarProps) {
  const theme = useThemeColors();
  const typeLabel = selectedType.replace(/_/g, ' ');

  return (
    <div className="flex flex-col sm:flex-row gap-3 mb-4">
      {/* Search input */}
      <div className="relative flex-1">
        <svg 
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
          style={{ color: theme.text.low }}
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          placeholder={`search ${typeLabel}...`}
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-10 pr-4 py-2 rounded-lg border focus:outline-none focus:ring-2 transition-colors"
          style={{ 
            borderColor: theme.stroke.medium,
            backgroundColor: theme.surface,
            color: theme.text.high,
            // @ts-expect-error CSS variable for focus ring
            '--tw-ring-color': theme.accent,
          }}
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
            title="clear search"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: theme.text.low }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
      
      {/* Category filter dropdown */}
      <select
        value={categoryFilter || ''}
        onChange={(e) => onCategoryFilterChange(e.target.value || null)}
        className="px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 transition-colors min-w-[160px]"
        style={{ 
          borderColor: theme.stroke.medium,
          backgroundColor: theme.surface,
          color: theme.text.high,
          // @ts-expect-error CSS variable for focus ring
          '--tw-ring-color': theme.accent,
        }}
      >
        <option value="">all categories</option>
        {availableCategories.map(cat => (
          <option key={cat} value={cat}>
            {cat.replace(/_/g, ' ')}
          </option>
        ))}
      </select>
      
      {/* Results count */}
      <div 
        className="flex items-center px-3 py-2 rounded-lg text-sm whitespace-nowrap"
        style={{ backgroundColor: theme.stroke.low, color: theme.text.medium }}
      >
        {filteredCount === totalCount 
          ? `${totalCount} items`
          : `${filteredCount} of ${totalCount} items`
        }
      </div>
    </div>
  );
}
