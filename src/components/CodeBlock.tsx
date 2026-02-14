/**
 * CodeBlock Component
 * Syntax-highlighted code block with copy button
 */

import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useCopyToClipboard } from '../hooks/useCopyToClipboard';
import { useThemeColors } from '../theme';
import { Button } from '@marcelinodzn/ds-react';
import { DSIcon } from './DSIcon';

/** Brand accent for inline code elements */
const BRAND_ACCENT = '#f97316';

interface CodeBlockProps {
  children: string;
  className?: string;
  inline?: boolean;
}

export function CodeBlock({ children, className, inline }: CodeBlockProps) {
  const theme = useThemeColors();
  const { isCopied, copyToClipboard } = useCopyToClipboard(2000);

  // Extract language from className (format: "language-javascript")
  const match = /language-(\w+)/.exec(className || '');
  const language = match ? match[1] : '';

  // For inline code, render simple styled span
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

  const handleCopy = () => {
    copyToClipboard(codeString);
  };

  return (
    <div className="relative group my-3 rounded-lg overflow-hidden">
      {/* Language label and copy button */}
      <div 
        className="flex items-center justify-between px-4 py-2 text-xs font-medium"
        style={{
          backgroundColor: theme.background.subtle,
          color: theme.text.low,
          borderBottom: `1px solid ${theme.stroke.low}`,
        }}
      >
        <span className="uppercase">{language}</span>
        <Button
          appearance="ghost"
          size="S"
          onPress={handleCopy}
          aria-label={isCopied ? 'Copied!' : 'Copy code'}
        >
          <div className="flex items-center gap-1.5">
            {isCopied ? (
              <>
                <DSIcon name="IcCheck" size="XS" attention="high" />
                <span>copied!</span>
              </>
            ) : (
              <>
                <DSIcon name="IcCopyDocument" size="XS" attention="medium" />
                <span>copy</span>
              </>
            )}
          </div>
        </Button>
      </div>

      {/* Code content */}
      <SyntaxHighlighter
        language={language}
        style={theme.isLight ? oneLight : oneDark}
        customStyle={{
          margin: 0,
          padding: '1rem',
          fontSize: '0.8125rem',
          lineHeight: '1.5',
          backgroundColor: theme.background.subtle,
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
