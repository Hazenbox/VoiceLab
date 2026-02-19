/**
 * CodeBlock Component
 * Syntax-highlighted code block with copy button
 */

import { useMemo } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { useCopyToClipboard } from '../hooks/useCopyToClipboard';
import { useThemeColors, type ThemeColors } from '../theme';
import { ActionButton } from './ActionButton';
import { DSIcon } from './DSIcon';

/** Brand accent for inline code elements */
const BRAND_ACCENT = '#f97316';

/** DS-family syntax colors -- darker shades for light mode, lighter tints for dark mode */
const SYNTAX_COLORS = {
  light: {
    tag: '#4f46e5',       // indigo-600
    string: '#047857',    // emerald-700
    keyword: '#dc2626',   // red-600
    number: '#d97706',    // amber-600
    function: '#2563eb',  // blue-600
  },
  dark: {
    tag: '#818cf8',       // indigo-400
    string: '#34d399',    // emerald-400
    keyword: '#f87171',   // red-400
    number: '#fbbf24',    // amber-400
    function: '#60a5fa',  // blue-400
  },
} as const;

function buildDsSyntaxTheme(theme: ThemeColors): { [key: string]: React.CSSProperties } {
  const palette = theme.isLight ? SYNTAX_COLORS.light : SYNTAX_COLORS.dark;
  const bg = theme.background.minimal;

  return {
    'code[class*="language-"]': { color: theme.text.high, background: bg },
    'pre[class*="language-"]': { color: theme.text.high, background: bg },
    comment: { color: theme.text.low, fontStyle: 'italic' },
    prolog: { color: theme.text.low },
    doctype: { color: theme.text.low },
    cdata: { color: theme.text.low },
    punctuation: { color: theme.text.high },
    property: { color: theme.text.medium },
    tag: { color: palette.tag },
    boolean: { color: palette.keyword },
    number: { color: palette.number },
    constant: { color: palette.number },
    symbol: { color: palette.number },
    selector: { color: palette.tag },
    'attr-name': { color: theme.text.medium },
    string: { color: palette.string },
    char: { color: palette.string },
    'template-string': { color: palette.string },
    builtin: { color: palette.tag },
    operator: { color: theme.text.medium },
    entity: { color: palette.tag },
    url: { color: palette.string },
    keyword: { color: palette.keyword },
    'attr-value': { color: palette.string },
    function: { color: palette.function },
    'class-name': { color: palette.tag },
    regex: { color: palette.string },
    important: { color: palette.keyword, fontWeight: 'bold' },
    variable: { color: theme.text.high },
    inserted: { color: palette.string },
    deleted: { color: palette.keyword },
  };
}

const CopyIcon = ({ style }: { style?: React.CSSProperties }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={style}>
    <path
      d="M13 8H5C4.20435 8 3.44129 8.31607 2.87868 8.87868C2.31607 9.44129 2 10.2044 2 11V19C2 19.7956 2.31607 20.5587 2.87868 21.1213C3.44129 21.6839 4.20435 22 5 22H13C13.7956 22 14.5587 21.6839 15.1213 21.1213C15.6839 20.5587 16 19.7956 16 19V11C16 10.2044 15.6839 9.44129 15.1213 8.87868C14.5587 8.31607 13.7956 8 13 8ZM19 2H11C10.2044 2 9.44129 2.31607 8.87868 2.87868C8.31607 3.44129 8 4.20435 8 5V6H13C14.3261 6 15.5979 6.52678 16.5355 7.46447C17.4732 8.40215 18 9.67392 18 11V16H19C19.7956 16 20.5587 15.6839 21.1213 15.1213C21.6839 14.5587 22 13.7956 22 13V5C22 4.20435 21.6839 3.44129 21.1213 2.87868C20.5587 2.31607 19.7956 2 19 2Z"
      fill="currentColor"
    />
  </svg>
);

interface CodeBlockProps {
  children: string;
  className?: string;
  inline?: boolean;
}

export function CodeBlock({ children, className, inline }: CodeBlockProps) {
  const theme = useThemeColors();
  const { isCopied, copyToClipboard } = useCopyToClipboard(2000);
  const syntaxTheme = useMemo(() => buildDsSyntaxTheme(theme), [theme]);

  const match = /language-(\w+)/.exec(className || '');
  const language = match ? match[1] : '';

  if (inline || !language) {
    return (
      <code
        className="px-1.5 py-0.5 rounded text-xs font-mono"
        style={{
          backgroundColor: theme.background.bold,
          color: BRAND_ACCENT,
          border: `1px solid ${theme.stroke.low}`,
        }}
      >
        {children}
      </code>
    );
  }

  const codeString = String(children).replace(/\n$/, '');
  const handleCopy = () => copyToClipboard(codeString);
  const iconStyle = { color: theme.text.medium };

  return (
    <div className="relative group my-3 rounded-lg overflow-hidden">
      <div
        className="flex items-center justify-between px-4 py-2 text-xs font-medium"
        style={{
          backgroundColor: theme.background.minimal,
          color: theme.text.low,
          borderBottom: `1px solid ${theme.stroke.low}`,
        }}
      >
        <span>{language}</span>
        <ActionButton
          icon={isCopied
            ? <DSIcon name="IcConfirm" size="S" style={iconStyle} />
            : <CopyIcon style={iconStyle} />
          }
          label={isCopied ? "copied" : "copy"}
          onClick={handleCopy}
          size={28}
        />
      </div>

      <SyntaxHighlighter
        language={language}
        style={syntaxTheme}
        customStyle={{
          margin: 0,
          padding: '1rem',
          fontSize: '0.8125rem',
          lineHeight: '1.5',
          backgroundColor: theme.background.minimal,
        }}
        showLineNumbers={codeString.split('\n').length > 3}
        wrapLines
      >
        {codeString}
      </SyntaxHighlighter>
    </div>
  );
}

/**
 * Inline code component for single backticks
 */
export function InlineCode({ children }: { children: React.ReactNode }) {
  const theme = useThemeColors();
  
  return (
    <code
      className="px-1.5 py-0.5 rounded text-xs font-mono"
      style={{
        backgroundColor: theme.isLight ? '#fef3c7' : '#451a03',
        color: theme.isLight ? '#92400e' : '#fbbf24',
      }}
    >
      {children}
    </code>
  );
}
