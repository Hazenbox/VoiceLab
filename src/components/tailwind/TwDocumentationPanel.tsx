import React, { useState, useMemo } from 'react';
import { DOCUMENTATION_SECTIONS } from '../../constants';

interface TwDocumentationPanelProps {
  onBack: () => void;
}

/**
 * Tailwind-styled documentation panel with searchable help content
 */
export const TwDocumentationPanel: React.FC<TwDocumentationPanelProps> = ({ onBack }) => {
  const [searchQuery, setSearchQuery] = useState('');

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
    <div className="h-full flex flex-col bg-white dark:bg-zinc-950">
      {/* Header */}
      <div className="flex items-center gap-4 p-4 border-b border-zinc-200 dark:border-zinc-800">
        <button
          onClick={onBack}
          className="p-2 rounded-lg transition-colors text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
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
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
          Documentation
        </h1>
      </div>

      {/* Search */}
      <div className="p-4">
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 dark:text-zinc-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
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
            className="w-full pl-10 pr-4 py-2 border-0 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 placeholder-zinc-400 dark:placeholder-zinc-500"
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollable-container">
        {filteredSections.length === 0 ? (
          <div className="text-center py-8 text-zinc-400 dark:text-zinc-500">
            No results found for "{searchQuery}"
          </div>
        ) : (
          filteredSections.map((section) => (
            <div
              key={section.id}
              className="rounded-lg p-4 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800"
            >
              <h2 className="text-lg font-semibold mb-2 text-zinc-900 dark:text-zinc-50">
                {section.title}
              </h2>
              <div className="text-sm whitespace-pre-line text-zinc-600 dark:text-zinc-400">
                {section.content}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default TwDocumentationPanel;
