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
      // Check if it's a specific color token from the new structure
      if (categoryId.startsWith('surface-') || 
          categoryId.startsWith('content-') || 
          categoryId.startsWith('stroke-') ||
          categoryId.startsWith('semantic-') ||
          categoryId.startsWith('background-') || 
          categoryId.startsWith('text-') || 
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
  
  // Comprehensive color table data with explicit light/dark values
  const colorsByCategory = [
    {
      category: 'Surface',
      description: 'Background and surface colors',
      colors: [
        { name: 'Ghost', mcpToken: 'Surface/Ghost', light: '#ffffff', dark: '#09090b', current: theme.background.ghost },
        { name: 'Subtle', mcpToken: 'Surface/Subtle', light: '#fafafa', dark: '#18181b', current: theme.background.subtle },
        { name: 'Bold', mcpToken: 'Surface/Bold', light: '#f4f4f5', dark: '#27272a', current: theme.background.bold },
        { name: 'Minimal', mcpToken: 'Surface/Minimal', light: '#f9fafb', dark: '#0a0a0b', current: theme.background.minimal },
      ],
    },
    {
      category: 'Content',
      description: 'Text and icon colors',
      colors: [
        { name: 'High', mcpToken: 'Content/High', light: '#18181b', dark: '#fafafa', current: theme.text.high },
        { name: 'Medium', mcpToken: 'Content/Medium', light: '#52525b', dark: '#a1a1aa', current: theme.text.medium },
        { name: 'Low', mcpToken: 'Content/Low', light: '#a1a1aa', dark: '#71717a', current: theme.text.low },
      ],
    },
    {
      category: 'Stroke',
      description: 'Border and divider colors',
      colors: [
        { name: 'High', mcpToken: 'Stroke/High', light: '#3f3f46', dark: '#d4d4d8', current: theme.stroke.high },
        { name: 'Medium', mcpToken: 'Stroke/Medium', light: '#e4e4e7', dark: '#3f3f46', current: theme.stroke.medium },
        { name: 'Low', mcpToken: 'Stroke/Low', light: '#f4f4f5', dark: '#27272a', current: theme.stroke.low },
      ],
    },
    {
      category: 'Accent',
      description: 'Brand color',
      colors: [
        { name: 'Primary', mcpToken: 'Accent/Primary', light: '#f97316', dark: '#f97316', current: theme.accent },
      ],
    },
    {
      category: 'Semantic',
      description: 'Status and feedback colors',
      colors: [
        { name: 'Positive', mcpToken: 'Semantic/Positive', light: '#00A859', dark: '#00A859', current: theme.semantic.positive },
        { name: 'Negative', mcpToken: 'Semantic/Negative', light: '#ef4444', dark: '#ef4444', current: theme.semantic.negative },
        { name: 'Warning', mcpToken: 'Semantic/Warning', light: '#eab308', dark: '#eab308', current: theme.semantic.warning },
        { name: 'Informative', mcpToken: 'Semantic/Informative', light: '#3b82f6', dark: '#3b82f6', current: theme.semantic.informative },
      ],
    },
  ];
  
  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div
        className="p-4 rounded-lg"
        style={{
          backgroundColor: theme.background.subtle,
          border: `1px solid ${theme.stroke.low}`,
        }}
      >
        <h3 className="text-base font-semibold mb-2" style={{ color: theme.text.high }}>
          All Color Tokens
        </h3>
        <p className="text-sm mb-1" style={{ color: theme.text.medium }}>
          Current Color Mode: <strong style={{ color: theme.text.high }}>{theme.colorMode}</strong>
        </p>
        <p className="text-xs" style={{ color: theme.text.low }}>
          15 unique color tokens that adapt to light/dark mode. MCP tokens are context-aware and resolve based on Platform, Color Mode, Density, Surface level, and Theme.
        </p>
      </div>

      {/* Comprehensive Color Tables */}
      {colorsByCategory.map(({ category, description, colors }) => (
        <div key={category}>
          <div className="mb-3">
            <h4 className="text-base font-semibold" style={{ color: theme.text.high }}>
              {category}
            </h4>
            <p className="text-xs" style={{ color: theme.text.medium }}>
              {description}
            </p>
          </div>
          
          <div style={{ border: `1px solid ${theme.stroke.low}`, borderRadius: '8px', overflow: 'hidden' }}>
            <table className="w-full" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: theme.background.subtle, borderBottom: `1px solid ${theme.stroke.low}` }}>
                  <th className="text-left py-2 px-3 text-xs font-medium" style={{ color: theme.text.medium }}>name</th>
                  <th className="text-left py-2 px-3 text-xs font-medium" style={{ color: theme.text.medium }}>mcp token</th>
                  <th className="text-center py-2 px-3 text-xs font-medium" style={{ color: theme.text.medium }}>preview</th>
                  <th className="text-left py-2 px-3 text-xs font-medium" style={{ color: theme.text.medium }}>light mode</th>
                  <th className="text-left py-2 px-3 text-xs font-medium" style={{ color: theme.text.medium }}>dark mode</th>
                </tr>
              </thead>
              <tbody>
                {colors.map((color, idx) => (
                  <tr 
                    key={color.name} 
                    style={{ 
                      borderBottom: idx < colors.length - 1 ? `1px solid ${theme.stroke.low}` : 'none',
                      backgroundColor: theme.background.ghost,
                    }}
                  >
                    <td className="py-2 px-3 text-sm font-medium" style={{ color: theme.text.high }}>
                      {color.name}
                    </td>
                    <td className="py-2 px-3">
                      <code className="text-xs" style={{ color: theme.text.medium }}>
                        {color.mcpToken}
                      </code>
                    </td>
                    <td className="py-2 px-3 text-center">
                      <div 
                        className="w-16 h-8 rounded mx-auto" 
                        style={{ 
                          backgroundColor: color.current,
                          border: `1px solid ${theme.stroke.low}`,
                        }} 
                      />
                    </td>
                    <td className="py-2 px-3">
                      <code className="text-xs" style={{ color: theme.text.medium }}>
                        {color.light}
                      </code>
                    </td>
                    <td className="py-2 px-3">
                      <code className="text-xs" style={{ color: theme.text.medium }}>
                        {color.dark}
                      </code>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
};

/**
 * Single color token preview
 */
const SingleColorPreview: React.FC<{ tokenId: string }> = ({ tokenId }) => {
  const theme = useThemeColors();

  const getTokenValue = (): { name: string; value: string; description: string; mcpToken: string } => {
    switch (tokenId) {
      // Surface tokens
      case 'surface-bold-idle':
      case 'surface-bold-hover':
      case 'surface-bold-pressed':
      case 'surface-bold-disabled':
        return { name: 'Surface Bold', value: theme.background.bold, description: 'Bold surface - primary action surfaces, CTAs', mcpToken: 'Surface/Bold/idle' };
      case 'surface-subtle-idle':
      case 'surface-subtle-hover':
      case 'surface-subtle-pressed':
        return { name: 'Surface Subtle', value: theme.background.subtle, description: 'Subtle surface - cards, containers', mcpToken: 'Surface/Subtle/idle' };
      case 'surface-ghost-idle':
      case 'surface-ghost-hover':
        return { name: 'Surface Ghost', value: theme.background.ghost, description: 'Ghost surface - page backgrounds', mcpToken: 'Surface/Ghost/idle' };
      case 'surface-minimal':
      case 'surface-moderate':
      case 'surface-elevated':
      case 'surface-overlay':
        return { name: 'Surface Level', value: theme.background.subtle, description: 'Surface elevation level', mcpToken: 'Surface/Elevated' };
      
      // Content tokens
      case 'content-high':
        return { name: 'Content High', value: theme.text.high, description: 'High emphasis - headings, primary text', mcpToken: 'Content/High' };
      case 'content-medium':
        return { name: 'Content Medium', value: theme.text.medium, description: 'Medium emphasis - body text, labels', mcpToken: 'Content/Medium' };
      case 'content-low':
        return { name: 'Content Low', value: theme.text.low, description: 'Low emphasis - hints, placeholders', mcpToken: 'Content/Low' };
      case 'content-on-bold-high':
      case 'content-on-bold-medium':
      case 'content-tinted':
        return { name: 'Content Variant', value: theme.text.high, description: 'Content color variant', mcpToken: 'Content/OnBold/High' };
      
      // Stroke tokens
      case 'stroke-high':
        return { name: 'Stroke High', value: theme.stroke.high, description: 'High emphasis borders', mcpToken: 'Stroke/High' };
      case 'stroke-medium':
        return { name: 'Stroke Medium', value: theme.stroke.medium, description: 'Standard borders', mcpToken: 'Stroke/Medium' };
      case 'stroke-low':
        return { name: 'Stroke Low', value: theme.stroke.low, description: 'Subtle dividers', mcpToken: 'Stroke/Low' };
      case 'stroke-focus':
        return { name: 'Stroke Focus', value: theme.accent, description: 'Focus ring color', mcpToken: 'Stroke/Focus' };
      
      // Semantic tokens
      case 'semantic-positive':
      case 'semantic-negative':
      case 'semantic-warning':
      case 'semantic-informative':
        return { name: 'Semantic Color', value: theme.accent, description: 'Semantic feedback color', mcpToken: 'Semantic/Positive' };
      
      // Legacy support
      case 'background-ghost':
        return { name: 'Surface Ghost', value: theme.background.ghost, description: 'Lightest background for page-level surfaces', mcpToken: 'Surface/Ghost/idle' };
      case 'background-subtle':
        return { name: 'Surface Subtle', value: theme.background.subtle, description: 'Medium background for cards and containers', mcpToken: 'Surface/Subtle/idle' };
      case 'background-bold':
        return { name: 'Surface Bold', value: theme.background.bold, description: 'Strongest background for emphasis', mcpToken: 'Surface/Bold/idle' };
      case 'text-high':
        return { name: 'Content High', value: theme.text.high, description: 'Primary text for headings and important content', mcpToken: 'Content/High' };
      case 'text-medium':
        return { name: 'Content Medium', value: theme.text.medium, description: 'Body text and secondary labels', mcpToken: 'Content/Medium' };
      case 'text-low':
        return { name: 'Content Low', value: theme.text.low, description: 'Hints, placeholders, and tertiary content', mcpToken: 'Content/Low' };
      case 'accent':
        return { name: 'Accent', value: theme.accent, description: 'Brand/primary accent color', mcpToken: 'Accent/Primary' };
      
      default:
        return { name: tokenId, value: '#000000', description: 'Unknown token', mcpToken: tokenId };
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
            MCP Token Path
          </p>
          <code
            className="block px-3 py-2 rounded mt-1 text-sm"
            style={{
              backgroundColor: theme.background.ghost,
              color: theme.accent,
            }}
          >
            {token.mcpToken}
          </code>
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
