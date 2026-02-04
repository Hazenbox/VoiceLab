/**
 * CodeBlock Component
 * Syntax-highlighted code block with copy button
 */

import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useCopyToClipboard } from '../hooks/useCopyToClipboard';
import { useThemeColors } from '../theme';

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
          backgroundColor: theme.isLight ? '#f5f5f5' : '#27272a',
          color: '#f97316',
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
          backgroundColor: theme.isLight ? '#18181b' : '#09090b',
          color: theme.isLight ? '#a1a1aa' : '#71717a',
          borderBottom: `1px solid ${theme.stroke.low}`,
        }}
      >
        <span className="uppercase">{language}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2 py-1 rounded transition-colors hover:bg-white/10"
          aria-label={isCopied ? 'Copied!' : 'Copy code'}
        >
          {isCopied ? (
            <>
              <svg className="w-3.5 h-3.5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-green-500">Copied!</span>
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <span>Copy</span>
            </>
          )}
        </button>
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
          backgroundColor: theme.isLight ? '#fafafa' : '#18181b',
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
