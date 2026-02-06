import React, { useState, useMemo } from 'react';
import { DOCUMENTATION_SECTIONS } from '../constants';
import { useThemeColors } from '../theme';

interface DocumentationPanelProps {
  onBack: () => void;
}

/**
 * Documentation panel with searchable help content
 */
export const DocumentationPanel: React.FC<DocumentationPanelProps> = ({ onBack }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const theme = useThemeColors();

  // Filter sections based on search query
  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) {
      return DOCUMENTATION_SECTIONS;
    }

    const query = searchQuery.toLowerCase();
    return DOCUMENTATION_SECTIONS.filter(
      (section) =>
        section.title.toLowerCase().includes(query) ||
        section.content.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-4 p-4">
        <button
          onClick={onBack}
          className="p-2 rounded-lg transition-colors"
          style={{ color: theme.text.medium }}
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
        </button>
        <h1 
          className="text-xl font-semibold"
          style={{ color: theme.text.high }}
        >
          Documentation
        </h1>
      </div>

      {/* Search */}
      <div className="p-4">
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            style={{ color: theme.text.low }}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search documentation..."
            className="w-full pl-10 pr-4 py-2 border-0 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            style={{
              backgroundColor: theme.background.ghost,
              color: theme.text.high,
            }}
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollable-container">
        {filteredSections.length === 0 ? (
          <div 
            className="text-center py-8"
            style={{ color: theme.text.low }}
          >
            No results found for "{searchQuery}"
          </div>
        ) : (
          filteredSections.map((section) => (
            <div
              key={section.id}
              className="rounded-lg p-4"
              style={{
                backgroundColor: theme.background.subtle,
                border: `1px solid ${theme.stroke.low}`,
              }}
            >
              <h2 
                className="text-lg font-semibold mb-2"
                style={{ color: theme.text.high }}
              >
                {section.title}
              </h2>
              <div 
                className="text-sm whitespace-pre-line"
                style={{ color: theme.text.medium }}
              >
                {section.content}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default DocumentationPanel;
