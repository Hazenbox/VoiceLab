/**
 * Preview Component
 * 
 * Main preview panel that routes to specialized preview components
 * based on the selected item type
 */

import React from 'react';
import type { DesignSystemNavItem } from '../../types';
import { useThemeColors } from '../../theme';
import { CodeBlock } from '../CodeBlock';
import { LiveComponentPreview } from './LiveComponentPreview';
import { TokenPreview } from './TokenPreview';
import { IconBrowser } from './IconBrowser';
import { PatternPreview } from './PatternPreview';
import { 
  COMPONENT_INFO, 
  DENSITY_OPTIONS,
  type ComponentName 
} from '../../data/designSystemData';

interface PreviewProps {
  item: DesignSystemNavItem | null;
  colorMode: 'Light' | 'Dark';
}

/**
 * Preview component for displaying design system items
 * Routes to specialized preview components based on item type
 */
export const Preview: React.FC<PreviewProps> = ({ item, colorMode: _colorMode }) => {
  const theme = useThemeColors();

  if (!item) {
    return (
      <div
        className="h-full flex items-center justify-center"
        style={{ backgroundColor: theme.background.ghost }}
      >
        <div className="text-center">
          <span className="text-4xl mb-4 block">📚</span>
          <p style={{ color: theme.text.medium }}>Select an item to preview</p>
        </div>
      </div>
    );
  }

  // Special case: Icons browser
  if (item.id === 'icons') {
    return (
      <div
        className="h-full flex flex-col overflow-hidden"
        style={{ backgroundColor: theme.background.ghost }}
      >
        <PreviewHeader title="Icons" subtitle="Icon library" />
        <div className="flex-1 overflow-y-auto p-6 scrollable-container">
          <IconBrowser />
        </div>
      </div>
    );
  }

  // Token preview (colors, spacing, etc.)
  if (item.type === 'token') {
    return (
      <div
        className="h-full flex flex-col overflow-hidden"
        style={{ backgroundColor: theme.background.ghost }}
      >
        <PreviewHeader title={item.label} subtitle="Design Token" />
        <div className="flex-1 overflow-y-auto p-6 scrollable-container">
          <TokenPreview categoryId={item.id} />
        </div>
      </div>
    );
  }

  // Component preview
  if (item.type === 'component') {
    const componentData = COMPONENT_INFO[item.id as ComponentName];
    
    if (componentData) {
      return (
        <div
          className="h-full flex flex-col overflow-hidden"
          style={{ backgroundColor: theme.background.ghost }}
        >
          <PreviewHeader 
            title={componentData.name} 
            subtitle={`${componentData.category.charAt(0).toUpperCase() + componentData.category.slice(1)} Component`} 
          />
          <div className="flex-1 overflow-y-auto p-6 scrollable-container">
            <ComponentDetailPreview component={componentData} />
          </div>
        </div>
      );
    }
    
    // Category fallback (e.g., "Form (7)")
    return (
      <div
        className="h-full flex flex-col overflow-hidden"
        style={{ backgroundColor: theme.background.ghost }}
      >
        <PreviewHeader title={item.label} subtitle="Component Category" />
        <div className="flex-1 overflow-y-auto p-6 scrollable-container">
          <CategoryOverview item={item} />
        </div>
      </div>
    );
  }

  // Pattern preview
  if (item.type === 'pattern') {
    return (
      <div
        className="h-full flex flex-col overflow-hidden"
        style={{ backgroundColor: theme.background.ghost }}
      >
        <PreviewHeader title={item.label} subtitle="UI Pattern" />
        <div className="flex-1 overflow-y-auto p-6 scrollable-container">
          <PatternPreview patternId={item.id} />
        </div>
      </div>
    );
  }

  // Density preview
  if (item.type === 'density') {
    return (
      <div
        className="h-full flex flex-col overflow-hidden"
        style={{ backgroundColor: theme.background.ghost }}
      >
        <PreviewHeader title={item.label} subtitle="Density Option" />
        <div className="flex-1 overflow-y-auto p-6 scrollable-container">
          <DensityPreview densityId={item.id} />
        </div>
      </div>
    );
  }

  // Guideline preview
  if (item.type === 'guideline') {
    return (
      <div
        className="h-full flex flex-col overflow-hidden"
        style={{ backgroundColor: theme.background.ghost }}
      >
        <PreviewHeader title={item.label} subtitle="Guideline" />
        <div className="flex-1 overflow-y-auto p-6 scrollable-container">
          <GuidelinePreview guidelineId={item.id} />
        </div>
      </div>
    );
  }

  // Fallback
  return (
    <div
      className="h-full flex items-center justify-center"
      style={{ backgroundColor: theme.background.ghost }}
    >
      <p style={{ color: theme.text.medium }}>
        Preview not available for {item.label}
      </p>
    </div>
  );
};

// =============================================================================
// Sub-components
// =============================================================================

/**
 * Header for preview panel
 */
const PreviewHeader: React.FC<{ title: string; subtitle: string }> = ({ title, subtitle }) => {
  const theme = useThemeColors();
  
  return (
    <div
      className="px-6 py-4 border-b flex-shrink-0"
      style={{ borderColor: theme.stroke.low }}
    >
      <h1
        className="text-2xl font-semibold mb-1"
        style={{ color: theme.text.high }}
      >
        {title}
      </h1>
      <p className="text-sm" style={{ color: theme.text.low }}>
        {subtitle}
      </p>
    </div>
  );
};

/**
 * Detailed component preview with live preview, code, and props
 */
const ComponentDetailPreview: React.FC<{ component: typeof COMPONENT_INFO[ComponentName] }> = ({ component }) => {
  const theme = useThemeColors();
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(component.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-8">
      {/* Description */}
      <div>
        <p className="text-lg" style={{ color: theme.text.medium }}>
          {component.description}
        </p>
      </div>

      {/* Live Preview */}
      <div>
        <h2 className="text-lg font-semibold mb-4" style={{ color: theme.text.high }}>
          Live Preview
        </h2>
        <LiveComponentPreview componentName={component.name as ComponentName} />
      </div>

      {/* Code Example */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold" style={{ color: theme.text.high }}>
            Code Example
          </h2>
          <button
            onClick={handleCopy}
            className="px-3 py-1 text-sm rounded-lg transition-colors"
            style={{
              backgroundColor: theme.background.subtle,
              color: theme.text.high,
              border: `1px solid ${theme.stroke.medium}`,
            }}
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
        <CodeBlock className="language-tsx">{component.code}</CodeBlock>
      </div>

      {/* Props Table */}
      <div>
        <h2 className="text-lg font-semibold mb-4" style={{ color: theme.text.high }}>
          Props
        </h2>
        <div
          className="rounded-lg overflow-hidden"
          style={{ border: `1px solid ${theme.stroke.low}` }}
        >
          <table className="w-full">
            <thead>
              <tr style={{ backgroundColor: theme.background.subtle }}>
                <th className="px-4 py-2 text-left text-sm font-medium" style={{ color: theme.text.medium }}>Prop</th>
                <th className="px-4 py-2 text-left text-sm font-medium" style={{ color: theme.text.medium }}>Type</th>
                <th className="px-4 py-2 text-left text-sm font-medium" style={{ color: theme.text.medium }}>Default</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(component.props).map(([propName, propInfo], index) => (
                <tr
                  key={propName}
                  style={{
                    backgroundColor: index % 2 === 0 ? theme.background.ghost : 'transparent',
                    borderTop: `1px solid ${theme.stroke.low}`,
                  }}
                >
                  <td className="px-4 py-2">
                    <code className="text-sm" style={{ color: theme.text.high }}>
                      {propName}
                      {propInfo.required && <span style={{ color: theme.accent }}>*</span>}
                    </code>
                  </td>
                  <td className="px-4 py-2">
                    <code className="text-xs" style={{ color: theme.text.medium }}>
                      {propInfo.type}
                    </code>
                  </td>
                  <td className="px-4 py-2">
                    <code className="text-xs" style={{ color: theme.text.low }}>
                      {propInfo.default || '—'}
                    </code>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

/**
 * Category overview when a category is selected (not a specific component)
 */
const CategoryOverview: React.FC<{ item: DesignSystemNavItem }> = ({ item }) => {
  const theme = useThemeColors();

  return (
    <div className="space-y-6">
      <p style={{ color: theme.text.medium }}>
        Select a component from the sidebar to see its preview.
      </p>

      {item.children && item.children.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-3" style={{ color: theme.text.high }}>
            Components in this category:
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {item.children.map((child) => (
              <div
                key={child.id}
                className="p-4 rounded-lg text-center"
                style={{
                  backgroundColor: theme.background.subtle,
                  border: `1px solid ${theme.stroke.low}`,
                }}
              >
                <span className="text-2xl mb-2 block">📦</span>
                <span className="text-sm font-medium" style={{ color: theme.text.high }}>
                  {child.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Density preview showing different spacing modes
 */
const DensityPreview: React.FC<{ densityId: string }> = ({ densityId }) => {
  const theme = useThemeColors();
  const density = DENSITY_OPTIONS.find(d => d.id === densityId);

  if (!density) {
    return <p style={{ color: theme.text.medium }}>Density option not found</p>;
  }

  const baseSpacing = 16;
  const adjustedSpacing = baseSpacing * density.multiplier;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-lg mb-4" style={{ color: theme.text.medium }}>
          {density.description}
        </p>
      </div>

      <div
        className="p-6 rounded-lg"
        style={{
          backgroundColor: theme.background.subtle,
          border: `1px solid ${theme.stroke.low}`,
        }}
      >
        <h3 className="text-sm font-semibold mb-4" style={{ color: theme.text.high }}>
          Spacing Example
        </h3>
        
        <div className="space-y-4">
          {/* Visual comparison */}
          <div className="flex items-center gap-4">
            <span className="text-sm w-24" style={{ color: theme.text.medium }}>Base ({baseSpacing}px)</span>
            <div
              className="h-4 rounded"
              style={{
                width: `${baseSpacing * 4}px`,
                backgroundColor: theme.stroke.medium,
              }}
            />
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm w-24" style={{ color: theme.text.medium }}>
              {density.name} ({adjustedSpacing.toFixed(0)}px)
            </span>
            <div
              className="h-4 rounded"
              style={{
                width: `${adjustedSpacing * 4}px`,
                backgroundColor: theme.accent,
              }}
            />
          </div>
        </div>

        {/* Multiplier info */}
        <div className="mt-6 pt-4" style={{ borderTop: `1px solid ${theme.stroke.low}` }}>
          <p className="text-sm" style={{ color: theme.text.low }}>
            Multiplier: <strong style={{ color: theme.text.high }}>{density.multiplier}x</strong>
          </p>
        </div>
      </div>

      {/* Example cards with density applied */}
      <div>
        <h3 className="text-sm font-semibold mb-4" style={{ color: theme.text.high }}>
          Example with {density.name} Density
        </h3>
        <div
          className="rounded-lg overflow-hidden"
          style={{
            backgroundColor: theme.background.subtle,
            border: `1px solid ${theme.stroke.low}`,
          }}
        >
          {['Item 1', 'Item 2', 'Item 3'].map((item, i) => (
            <div
              key={item}
              className="flex items-center justify-between"
              style={{
                padding: `${adjustedSpacing}px`,
                borderTop: i > 0 ? `1px solid ${theme.stroke.low}` : undefined,
              }}
            >
              <span style={{ color: theme.text.high }}>{item}</span>
              <span style={{ color: theme.text.low }}>›</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/**
 * Guideline preview with documentation
 */
const GuidelinePreview: React.FC<{ guidelineId: string }> = ({ guidelineId }) => {
  const theme = useThemeColors();

  const guidelines: Record<string, { title: string; content: string[] }> = {
    accessibility: {
      title: 'Accessibility Guidelines',
      content: [
        'Ensure sufficient color contrast (WCAG 2.1 Level AA minimum)',
        'Provide keyboard navigation for all interactive elements',
        'Use semantic HTML elements appropriately',
        'Include ARIA labels where needed',
        'Test with screen readers regularly',
        'Ensure focus states are visible',
      ],
    },
    usage: {
      title: 'Usage Guidelines',
      content: [
        'Follow consistent spacing patterns throughout your app',
        'Use design tokens instead of hard-coded values',
        'Maintain visual hierarchy with typography scale',
        'Apply colors semantically (text, background, accent)',
        'Use components as intended for their purpose',
        'Reference the Storybook for detailed examples',
      ],
    },
    'best-practices': {
      title: 'Best Practices',
      content: [
        'Keep UI consistent across all screens',
        'Test across different devices and screen sizes',
        'Optimize for performance (lazy load, memoize)',
        'Document custom implementations',
        'Review designs with the team before implementation',
        'Use the theme context for dynamic theming',
      ],
    },
  };

  const guideline = guidelines[guidelineId];

  if (!guideline) {
    return <p style={{ color: theme.text.medium }}>Guideline not found</p>;
  }

  return (
    <div className="space-y-6">
      <div
        className="p-6 rounded-lg"
        style={{
          backgroundColor: theme.background.subtle,
          border: `1px solid ${theme.stroke.low}`,
        }}
      >
        <ul className="space-y-4">
          {guideline.content.map((item, index) => (
            <li key={index} className="flex items-start gap-3">
              <span
                className="w-6 h-6 rounded-full flex items-center justify-center text-sm flex-shrink-0"
                style={{
                  backgroundColor: theme.accent,
                  color: '#fff',
                }}
              >
                {index + 1}
              </span>
              <span style={{ color: theme.text.medium }}>{item}</span>
            </li>
          ))}
        </ul>
      </div>

      <div
        className="p-4 rounded-lg"
        style={{
          backgroundColor: theme.background.ghost,
          border: `1px solid ${theme.stroke.low}`,
        }}
      >
        <p className="text-sm" style={{ color: theme.text.low }}>
          For more detailed guidelines, visit the{' '}
          <a
            href="https://jio-design-system.chromatic.com/"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: theme.accent }}
          >
            Storybook documentation
          </a>
          .
        </p>
      </div>
    </div>
  );
};

export default Preview;
