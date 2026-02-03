import React, { useState, useMemo } from 'react';
import { DOCUMENTATION_SECTIONS } from '../constants';

interface DocumentationPanelProps {
  onBack: () => void;
}

/**
 * Documentation panel with searchable help content
 */
export const DocumentationPanel: React.FC<DocumentationPanelProps> = ({ onBack }) => {
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
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-4 p-4">
        <button
          onClick={onBack}
          className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
        >
          <svg
            className="w-5 h-5 text-zinc-600 dark:text-zinc-400"
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
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-white">
          Documentation
        </h1>
      </div>

      {/* Search */}
      <div className="p-4">
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400"
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
            className="w-full pl-10 pr-4 py-2 bg-zinc-100 dark:bg-zinc-800 border-0 rounded-lg text-zinc-900 dark:text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {filteredSections.length === 0 ? (
          <div className="text-center py-8 text-zinc-500 dark:text-zinc-400">
            No results found for "{searchQuery}"
          </div>
        ) : (
          filteredSections.map((section) => (
            <div
              key={section.id}
              className="bg-white dark:bg-zinc-800 rounded-lg p-4 border border-zinc-200 dark:border-zinc-700"
            >
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-white mb-2">
                {section.title}
              </h2>
              <div className="text-sm text-zinc-600 dark:text-zinc-400 whitespace-pre-line">
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
