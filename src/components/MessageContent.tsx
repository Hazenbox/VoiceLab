/**
 * MessageContent Component
 * Renders markdown-formatted chat messages with custom styling
 * 
 * Performance: The components object is memoized to prevent unnecessary
 * re-parsing of markdown on every render. Only regenerates when theme changes.
 */

import React, { memo, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import { CodeBlock, InlineCode } from './CodeBlock';
import { useThemeColors, chatTypography, HIGHLIGHT_COLORS } from '../theme';
import { Divider } from '@marcelinodzn/ds-react';
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
  /** Text to highlight in the message (from trust panel interactions) */
  highlightedText?: string;
}

/**
 * Custom sanitization schema that extends defaults with safe attributes.
 * SECURITY: This prevents XSS from LLM-generated content while allowing
 * necessary markdown formatting. No script tags, no event handlers.
 */
const sanitizeSchema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    // Allow class names for code highlighting
    code: [...(defaultSchema.attributes?.code || []), 'className'],
    // Allow safe link attributes
    a: ['href', 'title', 'target', 'rel'],
    // Allow checkbox attributes for task lists
    input: ['type', 'checked', 'disabled'],
  },
  // Only allow safe protocols for links
  protocols: {
    href: ['http', 'https', 'mailto'],
  },
};

// Memoized remark/rehype plugins (stable references)
const remarkPlugins = [remarkGfm];
// SECURITY: Use rehype-sanitize instead of rehype-raw to prevent XSS
const rehypePlugins = [[rehypeSanitize, sanitizeSchema]] as const;

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

    // Headings - using chatTypography tokens (DS Compact density)
    h1: ({ children }) => (
      <h1 
        className="mt-8 mb-3"
        style={{ 
          fontSize: chatTypography.h1.fontSize,
          lineHeight: chatTypography.h1.lineHeight,
          fontWeight: chatTypography.h1.fontWeight,
          color: theme.text.high,
        }}
      >
        {children}
      </h1>
    ),
    h2: ({ children }) => (
      <h2 
        className="mt-6 mb-3"
        style={{ 
          fontSize: chatTypography.h2.fontSize,
          lineHeight: chatTypography.h2.lineHeight,
          fontWeight: chatTypography.h2.fontWeight,
          color: theme.text.high,
        }}
      >
        {children}
      </h2>
    ),
    h3: ({ children }) => (
      <h3 
        className="mt-4 mb-3"
        style={{ 
          fontSize: chatTypography.h3.fontSize,
          lineHeight: chatTypography.h3.lineHeight,
          fontWeight: chatTypography.h3.fontWeight,
          color: theme.text.high,
        }}
      >
        {children}
      </h3>
    ),
    h4: ({ children }) => (
      <h4 
        className="mt-3 mb-1.5"
        style={{ 
          fontSize: chatTypography.h4.fontSize,
          lineHeight: chatTypography.h4.lineHeight,
          fontWeight: chatTypography.h4.fontWeight,
          color: theme.text.high,
        }}
      >
        {children}
      </h4>
    ),
    h5: ({ children }) => (
      <h5 
        className="mt-3 mb-1.5"
        style={{ 
          fontSize: chatTypography.h5.fontSize,
          lineHeight: chatTypography.h5.lineHeight,
          fontWeight: chatTypography.h5.fontWeight,
          color: theme.text.medium,
        }}
      >
        {children}
      </h5>
    ),
    h6: ({ children }) => (
      <h6 
        className="mt-3 mb-1.5"
        style={{ 
          fontSize: chatTypography.h6.fontSize,
          lineHeight: chatTypography.h6.lineHeight,
          fontWeight: chatTypography.h6.fontWeight,
          color: theme.text.medium,
        }}
      >
        {children}
      </h6>
    ),

    // Paragraphs - Body/L (15px)
    p: ({ children }) => (
      <p 
        className="mb-3 last:mb-0"
        style={{ 
          fontSize: chatTypography.body.fontSize,
          lineHeight: chatTypography.body.lineHeight,
          fontWeight: chatTypography.body.fontWeight,
          color: theme.text.high, 
          letterSpacing: chatTypography.letterSpacing.tight,
        }}
      >
        {children}
      </p>
    ),

    // Lists - use list-outside with padding for proper sequential numbering
    // Nested ul (inside li) gets reduced margins for proper hierarchy
    ul: ({ children }) => (
      <ul 
        className="list-disc pl-5 mb-3 last:mb-0 space-y-1.5 [li_>&]:mt-1 [li_>&]:mb-0"
        style={{ color: theme.text.high }}
      >
        {children}
      </ul>
    ),
    ol: ({ children }) => (
      <ol 
        className="list-decimal pl-5 mb-3 last:mb-0 space-y-1.5"
        style={{ color: theme.text.high }}
      >
        {children}
      </ol>
    ),
    li: ({ children }) => (
      <li 
        style={{ 
          fontSize: chatTypography.body.fontSize,
          lineHeight: chatTypography.body.lineHeight,
        }}
      >
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

    // Tables - Body/L (15px)
    table: ({ children }) => (
      <div className="overflow-x-auto my-3 scrollable-container">
        <table 
          className="min-w-full border-collapse"
          style={{ 
            fontSize: chatTypography.body.fontSize,
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
 * Apply text highlighting by wrapping matched text with special markers.
 * These markers are processed after markdown rendering.
 */
function applyHighlighting(content: string, highlightText: string | undefined): string {
  if (!highlightText) return content;
  
  // Skip highlighting for problematic patterns:
  // - Pure whitespace (spaces, tabs, newlines)
  // - Very short text (1-2 chars) that's likely punctuation or whitespace
  // - Text containing newlines (would span paragraphs)
  const trimmed = highlightText.trim();
  if (!trimmed || trimmed.length < 2 || highlightText.includes('\n')) {
    return content;
  }
  
  // Escape regex special characters in the search text
  const escaped = highlightText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escaped})`, 'gi');
  
  // Wrap with markers that won't be parsed as markdown
  return content.replace(regex, '==HL_S==$1==HL_E==');
}

/**
 * Highlight component for rendering highlighted text spans
 */
const HighlightSpan: React.FC<{ text: string; isLight: boolean }> = ({ text, isLight }) => (
  <span 
    style={{
      backgroundColor: isLight ? HIGHLIGHT_COLORS.light.background : HIGHLIGHT_COLORS.dark.background,
      color: isLight ? HIGHLIGHT_COLORS.light.text : HIGHLIGHT_COLORS.dark.text,
      padding: '1px 4px',
      borderRadius: '2px',
      transition: 'background-color 300ms ease-out',
    }}
  >
    {text}
  </span>
);

/**
 * Process text content to render highlight markers as styled spans
 */
function processHighlightedText(text: string, isLight: boolean): React.ReactNode {
  if (!text.includes('==HL_S==')) {
    return text;
  }
  
  const parts = text.split(/(==HL_S==.*?==HL_E==)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('==HL_S==')) {
          const highlightedText = part.replace('==HL_S==', '').replace('==HL_E==', '');
          return <HighlightSpan key={i} text={highlightedText} isLight={isLight} />;
        }
        return part;
      })}
    </>
  );
}

/**
 * MessageContent renders markdown with custom theming.
 * Memoized to prevent re-renders when parent state changes but content is same.
 */
export const MessageContent = memo(function MessageContent({ 
  content,
  highlightedText,
}: MessageContentProps) {
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
  
  // Apply highlighting if text is specified
  const processedContent = useMemo(
    () => applyHighlighting(normalizedContent, highlightedText),
    [normalizedContent, highlightedText]
  );

  // Check if we need to process highlights in the rendered output
  const hasHighlights = highlightedText && processedContent.includes('==HL_S==');

  // If we have highlights, we need a custom text renderer
  const componentsWithHighlight = useMemo(() => {
    if (!hasHighlights) return components;
    
    return {
      ...components,
      // Override paragraph to process highlights
      p: ({ children }: { children?: React.ReactNode }) => {
        const processedChildren = processChildren(children, theme.isLight);
        return (
          <p 
            className="mb-3 last:mb-0"
            style={{ 
              fontSize: chatTypography.body.fontSize,
              lineHeight: chatTypography.body.lineHeight,
              fontWeight: chatTypography.body.fontWeight,
              color: theme.text.high, 
              letterSpacing: chatTypography.letterSpacing.tight,
            }}
          >
            {processedChildren}
          </p>
        );
      },
      // Override list items to process highlights
      li: ({ children }: { children?: React.ReactNode }) => {
        const processedChildren = processChildren(children, theme.isLight);
        return (
          <li 
            style={{ 
              fontSize: chatTypography.body.fontSize,
              lineHeight: chatTypography.body.lineHeight,
            }}
          >
            {processedChildren}
          </li>
        );
      },
    };
  }, [components, hasHighlights, theme.isLight, theme.text.high]);

  return (
    <div className="markdown-content">
      <ReactMarkdown
        remarkPlugins={remarkPlugins}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        rehypePlugins={rehypePlugins as any}
        components={componentsWithHighlight}
      >
        {processedContent}
      </ReactMarkdown>
    </div>
  );
});

/**
 * Process React children to handle highlight markers in text nodes
 * Recursively processes nested React elements (like <strong>, <em>) to find text nodes
 */
function processChildren(children: React.ReactNode, isLight: boolean): React.ReactNode {
  if (typeof children === 'string') {
    return processHighlightedText(children, isLight);
  }
  if (Array.isArray(children)) {
    return children.map((child, i) => {
      if (typeof child === 'string') {
        return <React.Fragment key={i}>{processHighlightedText(child, isLight)}</React.Fragment>;
      }
      // Recursively process React elements with children (e.g., <strong>, <em>)
      if (React.isValidElement(child) && child.props.children) {
        return React.cloneElement(child, { 
          ...child.props, 
          key: i,
          children: processChildren(child.props.children, isLight) 
        });
      }
      return child;
    });
  }
  // Handle single React element with children
  if (React.isValidElement(children) && children.props.children) {
    return React.cloneElement(children, { 
      ...children.props, 
      children: processChildren(children.props.children, isLight) 
    });
  }
  return children;
}
