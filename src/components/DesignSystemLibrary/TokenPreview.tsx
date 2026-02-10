/**
 * Token Preview Components
 * 
 * Displays design tokens using actual theme hooks for reliable resolution
 */

import React from 'react';
import { useThemeColors } from '../../theme';
import { TOKEN_CATEGORIES } from '../../data/designSystemData';

interface TokenPreviewProps {
  categoryId: string;
}

/**
 * Main token preview component that routes to specific token category previews
 */
export const TokenPreview: React.FC<TokenPreviewProps> = ({ categoryId }) => {
  const theme = useThemeColors();

  switch (categoryId) {
    case 'colors':
      return <ColorTokensPreview />;
    case 'spacing':
      return <SpacingTokensPreview />;
    case 'border-radius':
    case 'borderRadius':
      return <BorderRadiusPreview />;
    case 'typography':
      return <TypographyPreview />;
    default:
      // Check if it's a specific color token
      if (categoryId.startsWith('background-') || 
          categoryId.startsWith('text-') || 
          categoryId.startsWith('stroke-') ||
          categoryId === 'accent') {
        return <SingleColorPreview tokenId={categoryId} />;
      }
      return (
        <div className="p-4 text-center" style={{ color: theme.text.medium }}>
          Select a token category to view
        </div>
      );
  }
};

/**
 * Color swatch component
 */
const ColorSwatch: React.FC<{ 
  name: string; 
  value: string; 
  mcpToken?: string;
  description?: string;
}> = ({ name, value, mcpToken, description }) => {
  const theme = useThemeColors();
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{ border: `1px solid ${theme.stroke.low}` }}
    >
      {/* Color preview */}
      <div
        className="h-20 w-full"
        style={{ backgroundColor: value }}
      />
      
      {/* Info */}
      <div className="p-3" style={{ backgroundColor: theme.background.ghost }}>
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-medium" style={{ color: theme.text.high }}>
            {name}
          </span>
          <button
            onClick={handleCopy}
            className="text-xs px-2 py-1 rounded transition-colors"
            style={{
              backgroundColor: theme.background.subtle,
              color: theme.text.medium,
            }}
          >
            {copied ? 'Copied!' : value}
          </button>
        </div>
        {mcpToken && (
          <code 
            className="text-xs px-1 py-0.5 rounded block mb-1"
            style={{
              backgroundColor: theme.background.subtle,
              color: theme.text.medium,
            }}
          >
            {mcpToken}
          </code>
        )}
        {description && (
          <p className="text-xs" style={{ color: theme.text.low }}>
            {description}
          </p>
        )}
      </div>
    </div>
  );
};

/**
 * All color tokens preview
 */
const ColorTokensPreview: React.FC = () => {
  const theme = useThemeColors();

  const colorGroups = [
    {
      title: 'Surface Colors',
      subtitle: 'Background colors with state variations',
      tokens: [
        { 
          name: 'Bold', 
          mcpToken: 'Surface/Bold/*',
          value: theme.background.bold, 
          description: 'Primary action surfaces, CTAs, high emphasis elements' 
        },
        { 
          name: 'Subtle', 
          mcpToken: 'Surface/Subtle/*',
          value: theme.background.subtle, 
          description: 'Cards, containers, secondary surfaces' 
        },
        { 
          name: 'Ghost', 
          mcpToken: 'Surface/Ghost/*',
          value: theme.background.ghost, 
          description: 'Page backgrounds, minimal surfaces' 
        },
      ],
    },
    {
      title: 'Content Colors',
      subtitle: 'Text and icon colors',
      tokens: [
        { 
          name: 'High', 
          mcpToken: 'Content/High', 
          value: theme.text.high, 
          description: 'Headings, primary text, high emphasis icons' 
        },
        { 
          name: 'Medium', 
          mcpToken: 'Content/Medium', 
          value: theme.text.medium, 
          description: 'Body text, labels, medium emphasis icons' 
        },
        { 
          name: 'Low', 
          mcpToken: 'Content/Low', 
          value: theme.text.low, 
          description: 'Hints, placeholders, disabled text' 
        },
      ],
    },
    {
      title: 'Stroke Colors',
      subtitle: 'Border and divider colors',
      tokens: [
        { 
          name: 'High', 
          mcpToken: 'Stroke/High', 
          value: theme.stroke.high, 
          description: 'High emphasis borders, focused states' 
        },
        { 
          name: 'Medium', 
          mcpToken: 'Stroke/Medium', 
          value: theme.stroke.medium, 
          description: 'Standard borders, default outlines' 
        },
        { 
          name: 'Low', 
          mcpToken: 'Stroke/Low', 
          value: theme.stroke.low, 
          description: 'Subtle dividers, low emphasis separators' 
        },
      ],
    },
    {
      title: 'Accent / Brand',
      subtitle: 'Primary brand color',
      tokens: [
        { 
          name: 'Accent', 
          mcpToken: 'Accent/Primary', 
          value: theme.accent, 
          description: 'Brand color, links, CTAs, primary actions' 
        },
      ],
    },
  ];

  return (
    <div className="space-y-8">
      {colorGroups.map((group) => (
        <div key={group.title}>
          <div className="mb-4">
            <h3 className="text-lg font-semibold" style={{ color: theme.text.high }}>
              {group.title}
            </h3>
            {group.subtitle && (
              <p className="text-sm mt-1" style={{ color: theme.text.medium }}>
                {group.subtitle}
              </p>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {group.tokens.map((token) => (
              <ColorSwatch
                key={token.name}
                name={token.name}
                mcpToken={token.mcpToken}
                value={token.value}
                description={token.description}
              />
            ))}
          </div>
        </div>
      ))}

      {/* MCP Token Info Box */}
      <div
        className="p-4 rounded-lg"
        style={{
          backgroundColor: theme.background.subtle,
          border: `1px solid ${theme.stroke.low}`,
        }}
      >
        <h4 className="text-sm font-semibold mb-2" style={{ color: theme.text.high }}>
          MCP Token Context
        </h4>
        <p className="text-sm mb-2" style={{ color: theme.text.medium }}>
          Current Color Mode: <strong style={{ color: theme.text.high }}>{theme.colorMode}</strong>
        </p>
        <p className="text-xs" style={{ color: theme.text.low }}>
          Tokens are context-aware and resolve based on: Platform (Desktop/Tablet/Mobile), 
          Color Mode (Light/Dark), Density (Compact/Default/Open), Surface level, and Theme (Pack1/Pack2).
          Toggle between Light/Dark mode to see how colors adapt.
        </p>
      </div>

      {/* Additional Token Info */}
      <div
        className="p-4 rounded-lg"
        style={{
          backgroundColor: theme.background.ghost,
          border: `1px solid ${theme.stroke.low}`,
        }}
      >
        <h4 className="text-sm font-semibold mb-2" style={{ color: theme.text.high }}>
          Complete Token Structure
        </h4>
        <div className="space-y-2 text-xs" style={{ color: theme.text.medium }}>
          <p><strong>Surface States:</strong> Bold, Subtle, Ghost (each with idle/hover/pressed/disabled)</p>
          <p><strong>Surface Levels:</strong> Minimal, Moderate, Elevated, Overlay</p>
          <p><strong>Content Variants:</strong> High, Medium, Low, OnBold/High, OnBold/Medium, Tinted</p>
          <p><strong>Stroke Variants:</strong> High, Medium, Low, Focus</p>
          <p><strong>Semantic Colors:</strong> Positive, Negative, Warning, Informative</p>
        </div>
      </div>
    </div>
  );
};

/**
 * Single color token preview
 */
const SingleColorPreview: React.FC<{ tokenId: string }> = ({ tokenId }) => {
  const theme = useThemeColors();

  const getTokenValue = (): { name: string; value: string; description: string } => {
    switch (tokenId) {
      case 'background-ghost':
        return { name: 'Background Ghost', value: theme.background.ghost, description: 'Lightest background for page-level surfaces' };
      case 'background-subtle':
        return { name: 'Background Subtle', value: theme.background.subtle, description: 'Medium background for cards and containers' };
      case 'background-bold':
        return { name: 'Background Bold', value: theme.background.bold, description: 'Strongest background for emphasis' };
      case 'text-high':
        return { name: 'Text High', value: theme.text.high, description: 'Primary text for headings and important content' };
      case 'text-medium':
        return { name: 'Text Medium', value: theme.text.medium, description: 'Body text and secondary labels' };
      case 'text-low':
        return { name: 'Text Low', value: theme.text.low, description: 'Hints, placeholders, and tertiary content' };
      case 'stroke-high':
        return { name: 'Stroke High', value: theme.stroke.high, description: 'High emphasis borders' };
      case 'stroke-medium':
        return { name: 'Stroke Medium', value: theme.stroke.medium, description: 'Standard borders' };
      case 'stroke-low':
        return { name: 'Stroke Low', value: theme.stroke.low, description: 'Subtle dividers' };
      case 'accent':
        return { name: 'Accent', value: theme.accent, description: 'Brand/primary accent color' };
      default:
        return { name: tokenId, value: '#000000', description: 'Unknown token' };
    }
  };

  const token = getTokenValue();

  return (
    <div className="space-y-6">
      {/* Large color preview */}
      <div
        className="h-32 rounded-lg"
        style={{
          backgroundColor: token.value,
          border: `1px solid ${theme.stroke.low}`,
        }}
      />

      {/* Token details */}
      <div
        className="p-4 rounded-lg space-y-4"
        style={{
          backgroundColor: theme.background.subtle,
          border: `1px solid ${theme.stroke.low}`,
        }}
      >
        <div>
          <p className="text-sm font-medium" style={{ color: theme.text.medium }}>
            Token Name
          </p>
          <p className="text-lg font-semibold" style={{ color: theme.text.high }}>
            {token.name}
          </p>
        </div>

        <div>
          <p className="text-sm font-medium" style={{ color: theme.text.medium }}>
            Value
          </p>
          <code
            className="block px-3 py-2 rounded mt-1 text-sm"
            style={{
              backgroundColor: theme.background.ghost,
              color: theme.text.high,
            }}
          >
            {token.value}
          </code>
        </div>

        <div>
          <p className="text-sm font-medium" style={{ color: theme.text.medium }}>
            Usage
          </p>
          <p className="text-sm" style={{ color: theme.text.low }}>
            {token.description}
          </p>
        </div>

        <div>
          <p className="text-sm font-medium" style={{ color: theme.text.medium }}>
            Color Mode
          </p>
          <p className="text-sm" style={{ color: theme.text.low }}>
            Currently showing {theme.colorMode} mode value
          </p>
        </div>
      </div>
    </div>
  );
};

/**
 * Spacing tokens preview
 */
const SpacingTokensPreview: React.FC = () => {
  const theme = useThemeColors();
  const spacings = TOKEN_CATEGORIES.spacing.tokens;

  return (
    <div className="space-y-6">
      <p className="text-sm" style={{ color: theme.text.medium }}>
        Spacing tokens provide consistent measurements for margins, padding, and gaps.
      </p>

      <div className="space-y-4">
        {spacings.map((spacing) => (
          <div
            key={spacing.id}
            className="flex items-center gap-4 p-4 rounded-lg"
            style={{
              backgroundColor: theme.background.subtle,
              border: `1px solid ${theme.stroke.low}`,
            }}
          >
            {/* Visual representation */}
            <div
              className="flex-shrink-0 rounded"
              style={{
                width: spacing.value,
                height: spacing.value,
                backgroundColor: theme.accent,
                minWidth: '4px',
                minHeight: '4px',
              }}
            />
            
            {/* Info */}
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium" style={{ color: theme.text.high }}>
                  {spacing.name}
                </span>
                <code
                  className="text-xs px-2 py-0.5 rounded"
                  style={{
                    backgroundColor: theme.background.ghost,
                    color: theme.text.medium,
                  }}
                >
                  {spacing.value}
                </code>
              </div>
              <p className="text-xs mt-1" style={{ color: theme.text.low }}>
                {spacing.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Border radius preview
 */
const BorderRadiusPreview: React.FC = () => {
  const theme = useThemeColors();
  const radii = TOKEN_CATEGORIES.borderRadius.tokens;

  return (
    <div className="space-y-6">
      <p className="text-sm" style={{ color: theme.text.medium }}>
        Border radius tokens for consistent corner rounding.
      </p>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {radii.map((radius) => (
          <div
            key={radius.id}
            className="p-4 text-center"
            style={{
              backgroundColor: theme.background.subtle,
              border: `1px solid ${theme.stroke.low}`,
              borderRadius: '8px',
            }}
          >
            {/* Visual */}
            <div
              className="w-16 h-16 mx-auto mb-3"
              style={{
                backgroundColor: theme.accent,
                borderRadius: radius.value,
              }}
            />
            
            {/* Info */}
            <p className="font-medium" style={{ color: theme.text.high }}>
              {radius.name}
            </p>
            <code className="text-xs" style={{ color: theme.text.medium }}>
              {radius.value}
            </code>
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Typography preview
 */
const TypographyPreview: React.FC = () => {
  const theme = useThemeColors();
  const typography = TOKEN_CATEGORIES.typography.tokens;

  const fontSizes = typography.filter(t => t.id.includes('font-size'));
  const fontWeights = typography.filter(t => t.id.includes('font-weight'));

  return (
    <div className="space-y-8">
      {/* Font Sizes */}
      <div>
        <h3 className="text-lg font-semibold mb-4" style={{ color: theme.text.high }}>
          Font Sizes
        </h3>
        <div className="space-y-4">
          {fontSizes.map((size) => (
            <div
              key={size.id}
              className="flex items-center gap-4 p-4 rounded-lg"
              style={{
                backgroundColor: theme.background.subtle,
                border: `1px solid ${theme.stroke.low}`,
              }}
            >
              <span
                style={{
                  fontSize: size.value,
                  color: theme.text.high,
                  minWidth: '200px',
                }}
              >
                The quick brown fox
              </span>
              <div className="flex-1">
                <span className="font-medium" style={{ color: theme.text.high }}>
                  {size.name}
                </span>
                <code
                  className="ml-2 text-xs px-2 py-0.5 rounded"
                  style={{
                    backgroundColor: theme.background.ghost,
                    color: theme.text.medium,
                  }}
                >
                  {size.value}
                </code>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Font Weights */}
      <div>
        <h3 className="text-lg font-semibold mb-4" style={{ color: theme.text.high }}>
          Font Weights
        </h3>
        <div className="space-y-4">
          {fontWeights.map((weight) => (
            <div
              key={weight.id}
              className="flex items-center gap-4 p-4 rounded-lg"
              style={{
                backgroundColor: theme.background.subtle,
                border: `1px solid ${theme.stroke.low}`,
              }}
            >
              <span
                className="text-lg"
                style={{
                  fontWeight: parseInt(weight.value || '400'),
                  color: theme.text.high,
                  minWidth: '200px',
                }}
              >
                The quick brown fox
              </span>
              <div className="flex-1">
                <span className="font-medium" style={{ color: theme.text.high }}>
                  {weight.name}
                </span>
                <code
                  className="ml-2 text-xs px-2 py-0.5 rounded"
                  style={{
                    backgroundColor: theme.background.ghost,
                    color: theme.text.medium,
                  }}
                >
                  {weight.value}
                </code>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TokenPreview;
