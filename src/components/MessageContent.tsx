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
import { Title, Display, Divider } from '@marcelinodzn/ds-react';
import type { Components } from 'react-markdown';
import type { ThemeColors } from '../theme';

/**
 * Brand accent color for interactive elements in markdown.
 * Matches Jio brand orange. Keep in sync with design tokens.
 */
const BRAND_ACCENT = '#f97316';

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

    // Headings -- DS Display for h1, Title for h2-h3, custom for h4-h6
    h1: ({ children }) => (
      <div className="mt-8 mb-3" style={{ lineHeight: '1.2' }}>
        <Display size="M" as="h1" weight="high" color="high">{children}</Display>
      </div>
    ),
    h2: ({ children }) => (
      <div className="mt-6 mb-3" style={{ lineHeight: '1.2' }}>
        <Title size="L" as="h2" weight="high" color="high">{children}</Title>
      </div>
    ),
    h3: ({ children }) => (
      <div className="mt-4 mb-2" style={{ lineHeight: '1.3' }}>
        <Title size="M" as="h3" weight="high" color="high">{children}</Title>
      </div>
    ),
    h4: ({ children }) => (
      <h4 
        className="text-sm font-semibold mt-3 mb-1.5"
        style={{ color: theme.text.high }}
      >
        {children}
      </h4>
    ),
    h5: ({ children }) => (
      <h5 
        className="text-sm font-medium mt-3 mb-1.5"
        style={{ color: theme.text.medium }}
      >
        {children}
      </h5>
    ),
    h6: ({ children }) => (
      <h6 
        className="text-xs font-medium mt-3 mb-1.5"
        style={{ color: theme.text.medium }}
      >
        {children}
      </h6>
    ),

    // Paragraphs
    p: ({ children }) => (
      <p 
        className="text-sm mb-3"
        style={{ color: theme.text.high, letterSpacing: '-0.12px', lineHeight: '24px' }}
      >
        {children}
      </p>
    ),

    // Lists - use list-outside with padding for proper sequential numbering
    // Nested ul (inside li) gets reduced margins for proper hierarchy
    ul: ({ children }) => (
      <ul 
        className="list-disc pl-5 mb-3 space-y-1.5 [li_>&]:mt-1 [li_>&]:mb-0"
        style={{ color: theme.text.high }}
      >
        {children}
      </ul>
    ),
    ol: ({ children }) => (
      <ol 
        className="list-decimal pl-5 mb-3 space-y-1.5"
        style={{ color: theme.text.high }}
      >
        {children}
      </ol>
    ),
    li: ({ children }) => (
      <li className="text-sm leading-relaxed">
        {children}
      </li>
    ),

    // Links -- tokenized brand accent
    a: ({ href, children }) => (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="underline hover:no-underline transition-colors"
        style={{ color: BRAND_ACCENT }}
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

    // Blockquotes -- tokenized accent + theme-aware background
    blockquote: ({ children }) => (
      <blockquote
        className="border-l-4 pl-3 py-1 my-3 italic"
        style={{
          borderColor: BRAND_ACCENT,
          backgroundColor: theme.background.bold,
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
          backgroundColor: theme.background.bold,
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

    // Horizontal rule -- DS Divider
    hr: () => (
      <div className="my-6">
        <Divider />
      </div>
    ),

    // Task lists (GFM)
    input: ({ type, checked }) => (
      type === 'checkbox' ? (
        <input
          type="checkbox"
          checked={checked}
          disabled
          className="mr-2 align-middle"
          style={{ accentColor: BRAND_ACCENT }}
        />
      ) : null
    ),
  };
}

/**
 * Normalize markdown to fix common LLM output issues
 * - Fixes numbered lists broken by blank lines (including nested bullets)
 * - Handles: "1. Title\n - bullet\n\n2. Title" -> continuous list with nested bullets
 * - Indents bullets under numbered items to create proper nested lists
 */
function normalizeMarkdown(content: string): string {
  // Step 1: Normalize multiple blank lines to single blank line
  let normalized = content.replace(/\n{3,}/g, '\n\n');
  
  // Step 2: Process line by line to:
  // - Remove blank lines between numbered list items (keeps list continuous)
  // - Ensure bullets under numbered items are properly indented (3+ spaces)
  const lines = normalized.split('\n');
  const resultLines: string[] = [];
  let inNumberedList = false;
  let pendingBlankLines: string[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();
    
    // Check if this is a numbered list item (e.g., "1. ", "2. ", etc.)
    const numberedMatch = trimmedLine.match(/^(\d+)\.\s+(.*)$/);
    // Check if this is a bullet item (with optional leading whitespace)
    const bulletMatch = trimmedLine.match(/^[-*]\s+(.*)$/);
    
    if (numberedMatch) {
      // This is a numbered list item
      inNumberedList = true;
      
      // If there were pending blank lines and we're continuing a list,
      // DON'T add them - this keeps the list continuous
      pendingBlankLines = [];
      
      resultLines.push(line);
    } else if (bulletMatch && inNumberedList) {
      // This is a bullet under a numbered item
      // Ensure it has proper indentation (3 spaces) for nesting
      pendingBlankLines = []; // Don't add blank lines before bullets in a list
      resultLines.push('   - ' + bulletMatch[1]);
    } else if (trimmedLine === '') {
      // Blank line - queue it, we'll decide later whether to keep it
      pendingBlankLines.push(line);
    } else {
      // Non-list content
      // Check if this looks like content that should end the list
      const looksLikeListContent = line.match(/^\s+[-*]\s/) || line.match(/^\s{2,}/);
      
      if (!looksLikeListContent) {
        // This is regular content, not part of the list
        inNumberedList = false;
      }
      
      // Add any pending blank lines
      resultLines.push(...pendingBlankLines);
      pendingBlankLines = [];
      
      resultLines.push(line);
    }
  }
  
  // Add any remaining pending blank lines
  resultLines.push(...pendingBlankLines);
  
  return resultLines.join('\n');
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
