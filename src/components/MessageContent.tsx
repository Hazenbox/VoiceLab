/**
 * MessageContent Component
 * Renders markdown-formatted chat messages with custom styling
 * 
 * Performance: The components object is memoized to prevent unnecessary
 * re-parsing of markdown on every render. Only regenerates when theme changes.
 */

import { memo, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { CodeBlock, InlineCode } from './CodeBlock';
import { useThemeColors } from '../theme';
import type { Components } from 'react-markdown';
import type { ThemeColors } from '../theme';

interface MessageContentProps {
  content: string;
  role: 'user' | 'assistant';
}

// Memoized remark/rehype plugins (stable references)
const remarkPlugins = [remarkGfm];
const rehypePlugins = [rehypeRaw];

/**
 * Factory function to create markdown components with theme styling.
 * Returns a memoizable Components object.
 */
function createMarkdownComponents(theme: ThemeColors): Components {
  return {
    // Code blocks
    code({ className, children }) {
      const match = /language-(\w+)/.exec(className || '');
      // If there's no language specified, treat as inline code
      const isInline = !match;
      
      if (isInline) {
        return <InlineCode>{children}</InlineCode>;
      }
      return (
        <CodeBlock className={className}>
          {String(children)}
        </CodeBlock>
      );
    },

    // Headings
    h1: ({ children }) => (
      <h1 
        className="text-xl font-bold mt-4 mb-2"
        style={{ color: theme.text.high }}
      >
        {children}
      </h1>
    ),
    h2: ({ children }) => (
      <h2 
        className="text-lg font-bold mt-3 mb-2"
        style={{ color: theme.text.high }}
      >
        {children}
      </h2>
    ),
    h3: ({ children }) => (
      <h3 
        className="text-base font-semibold mt-3 mb-1.5"
        style={{ color: theme.text.high }}
      >
        {children}
      </h3>
    ),
    h4: ({ children }) => (
      <h4 
        className="text-sm font-semibold mt-2 mb-1"
        style={{ color: theme.text.high }}
      >
        {children}
      </h4>
    ),
    h5: ({ children }) => (
      <h5 
        className="text-sm font-medium mt-2 mb-1"
        style={{ color: theme.text.medium }}
      >
        {children}
      </h5>
    ),
    h6: ({ children }) => (
      <h6 
        className="text-xs font-medium mt-2 mb-1"
        style={{ color: theme.text.medium }}
      >
        {children}
      </h6>
    ),

    // Paragraphs
    p: ({ children }) => (
      <p 
        className="text-sm mb-2"
        style={{ color: theme.text.high, letterSpacing: '-0.12px', lineHeight: '22px' }}
      >
        {children}
      </p>
    ),

    // Lists
    ul: ({ children }) => (
      <ul 
        className="list-disc list-inside mb-2 space-y-1"
        style={{ color: theme.text.high }}
      >
        {children}
      </ul>
    ),
    ol: ({ children }) => (
      <ol 
        className="list-decimal list-inside mb-2 space-y-1"
        style={{ color: theme.text.high }}
      >
        {children}
      </ol>
    ),
    li: ({ children }) => (
      <li className="text-sm leading-relaxed ml-2">
        {children}
      </li>
    ),

    // Links
    a: ({ href, children }) => (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="underline hover:no-underline transition-colors"
        style={{ 
          color: '#f97316',
        }}
      >
        {children}
      </a>
    ),

    // Emphasis
    strong: ({ children }) => (
      <strong className="font-semibold">
        {children}
      </strong>
    ),
    em: ({ children }) => (
      <em className="italic">
        {children}
      </em>
    ),

    // Blockquotes
    blockquote: ({ children }) => (
      <blockquote
        className="border-l-4 pl-3 py-1 my-2 italic"
        style={{
          borderColor: '#f97316',
          backgroundColor: theme.isLight ? '#fef3c7' : '#451a03',
        }}
      >
        {children}
      </blockquote>
    ),

    // Tables
    table: ({ children }) => (
      <div className="overflow-x-auto my-3 scrollable-container">
        <table 
          className="min-w-full text-sm border-collapse"
          style={{ 
            borderColor: theme.stroke.low,
          }}
        >
          {children}
        </table>
      </div>
    ),
    thead: ({ children }) => (
      <thead 
        style={{ 
          backgroundColor: theme.isLight ? '#f5f5f5' : '#27272a',
          color: theme.text.high,
        }}
      >
        {children}
      </thead>
    ),
    tbody: ({ children }) => (
      <tbody>{children}</tbody>
    ),
    tr: ({ children }) => (
      <tr 
        className="border-b"
        style={{ borderColor: theme.stroke.low }}
      >
        {children}
      </tr>
    ),
    th: ({ children }) => (
      <th className="px-3 py-2 text-left font-semibold">
        {children}
      </th>
    ),
    td: ({ children }) => (
      <td 
        className="px-3 py-2"
        style={{ color: theme.text.medium }}
      >
        {children}
      </td>
    ),

    // Horizontal rule
    hr: () => (
      <hr 
        className="my-3"
        style={{ borderColor: theme.stroke.low }}
      />
    ),

    // Task lists (GFM)
    input: ({ type, checked }) => (
      type === 'checkbox' ? (
        <input
          type="checkbox"
          checked={checked}
          disabled
          className="mr-2 align-middle"
          style={{ accentColor: '#f97316' }}
        />
      ) : null
    ),
  };
}

/**
 * Normalize markdown to fix common LLM output issues
 * - Fixes numbered lists broken by blank lines (including nested bullets)
 * - Handles: "1. Title\n- bullet\n\n1. Title" -> continuous list
 */
function normalizeMarkdown(content: string): string {
  // Step 1: Normalize multiple blank lines to single blank line
  let normalized = content.replace(/\n{3,}/g, '\n\n');
  
  // Step 2: Fix numbered lists with nested content
  // Pattern: After a numbered item (and optional nested bullets/content),
  // if there's a blank line followed by another numbered item, remove the blank line
  // This regex matches:
  // - A line starting with "N. " (numbered item)
  // - Followed by any content (including nested bullets with - or *)
  // - Then a blank line
  // - Then another numbered item
  // We need to remove just the blank line before the next numbered item
  
  // Match: content ending with newline, blank line, then "N. "
  // Replace blank line with single newline to keep list continuous
  normalized = normalized.replace(
    /(\n(?:[-*]\s+[^\n]+\n)*)\n(?=\d+\.\s)/g,
    '$1'
  );
  
  // Also handle case where numbered item has no children but blank line before next
  normalized = normalized.replace(
    /(\d+\.\s+[^\n]+)\n\n(?=\d+\.\s)/g,
    '$1\n'
  );
  
  return normalized;
}

/**
 * MessageContent renders markdown with custom theming.
 * Memoized to prevent re-renders when parent state changes but content is same.
 */
export const MessageContent = memo(function MessageContent({ content }: MessageContentProps) {
  const theme = useThemeColors();

  // Memoize components object - only recreate when theme changes
  // This prevents ReactMarkdown from re-parsing on every render
  const components = useMemo(
    () => createMarkdownComponents(theme),
    [theme]
  );

  // Normalize markdown to fix common LLM output issues (e.g., broken numbered lists)
  const normalizedContent = useMemo(
    () => normalizeMarkdown(content),
    [content]
  );

  return (
    <div className="markdown-content">
      <ReactMarkdown
        remarkPlugins={remarkPlugins}
        rehypePlugins={rehypePlugins}
        components={components}
      >
        {normalizedContent}
      </ReactMarkdown>
    </div>
  );
});
