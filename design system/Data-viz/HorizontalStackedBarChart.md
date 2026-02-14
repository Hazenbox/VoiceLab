# HorizontalStackedBarChart

## Overview

A complete horizontal stacked bar chart visualization that combines ChartHeader, ChartLegend, DataDisplay, HorizontalStackedBarGroup, and ChartFooter components. Wrapped with ChartAccessibility for screen reader support.

**This component follows the [Organized Props Pattern](./OrganizedPropsPattern.md).**

## Figma Reference

- **Node ID**: `259:6430`
- **Design File**: DataVis-Components
- **Figma URL**: https://www.figma.com/design/uA5ExvS0cNXbDEKzT9Rnrt/DataVis-Components?node-id=259-6430

## Architecture

```
HorizontalStackedBarChart (flex column, gap from Dimensions/Spacings/L)
├── ChartAccessibility (wrapper with ARIA)
│   └── ChartHeader (optional)
│       ├── ChartTitle
│       └── ChartSubtitle
│   └── ChartLegend (optional, auto-generated from series)
│       └── ChartKey[] (up to 6 with categorical colors)
│   └── DataDisplay (optional)
│       ├── mainLabel (ChartBody)
│       ├── DataHead (leadValue + supportingValue)
│       │   ├── DataLead
│       │   └── DataSupporting
│       └── DataBadgeSemantic (badge with icon)
│   └── barGroupWrapper (flex: 1)
│       └── HorizontalStackedBarGroup
│           ├── contentWrapper
│           │   └── HorizontalStackedBar[] (for each category)
│           ├── XAxis (optional)
│           └── HoverBadge (optional)
│   └── ChartFooter (optional)
│       └── source + notes
```

## Import

```tsx
import HorizontalStackedBarChart from "./charts/HorizontalStackedBarChart";
```

## Data Formats

### Canonical Format (Recommended)

```typescript
import { ChartSeriesDataPoint } from "../types/chart-data";

const data: ChartSeriesDataPoint[] = [
  { category: "Q1", series: "Product A", value: 30 },
  { category: "Q1", series: "Product B", value: 25 },
  { category: "Q2", series: "Product A", value: 35 },
  { category: "Q2", series: "Product B", value: 30 },
];
```

### Legacy Format (Deprecated)

```typescript
const legacyData: HorizontalStackedDataPoint[] = [
  {
    label: "Q1",
    segments: [
      { value: 30, label: "Product A" },
      { value: 25, label: "Product B" },
    ],
  },
  {
    label: "Q2",
    segments: [
      { value: 35, label: "Product A" },
      { value: 30, label: "Product B" },
    ],
  },
];
```

## Props Interface (Organized Props Pattern)

```typescript
interface HorizontalStackedBarChartProps {
  // Layer 2: Parent component props
  data: ChartSeriesDataPoint[] | HorizontalStackedDataPoint[];
  seriesOrder?: string[];
  width?: number | string;
  height?: number | string;
  showHeader?: boolean;
  showFooter?: boolean;
  showLegend?: boolean;
  showDataDisplay?: boolean;
  interactive?: boolean;
  hoverType?: StackedBarHoverType;

  // Layer 3: Child component configurations
  chartHeader?: ChartHeaderConfig;
  chartLegend?: ChartLegendConfig;
  dataDisplay?: DataDisplayConfig;
  barGroup?: BarGroupConfig;
  chartFooter?: ChartFooterConfig;

  // Layer 1: Global modes
  modes?: GlobalModes;

  // Accessibility
  accessibility?: AccessibilityConfig;
}
```

## Props

| Prop              | Type                                                     | Default     | Description                                       |
| ----------------- | -------------------------------------------------------- | ----------- | ------------------------------------------------- |
| `data`            | `ChartSeriesDataPoint[] \| HorizontalStackedDataPoint[]` | `[]`        | Array of data points (canonical or legacy format) |
| `seriesOrder`     | `string[]`                                               | `undefined` | Order of series names for canonical format        |
| `width`           | `number \| string`                                       | `346`       | Total width of the chart container                |
| `height`          | `number \| string`                                       | `500`       | Total height of the chart container               |
| `showHeader`      | `boolean`                                                | `true`      | Show/hide the chart header                        |
| `showFooter`      | `boolean`                                                | `true`      | Show/hide the chart footer                        |
| `showLegend`      | `boolean`                                                | `true`      | Show/hide the chart legend                        |
| `showDataDisplay` | `boolean`                                                | `false`     | Show/hide the DataDisplay component               |
| `interactive`     | `boolean`                                                | `true`      | Enable hover/click interactivity                  |
| `hoverType`       | `"group" \| "individual" \| "categorical"`               | `"group"`   | Hover behavior type                               |
| `modes`           | `GlobalModes`                                            | `{}`        | Mode configuration for design token resolution    |
| `accessibility`   | `AccessibilityConfig`                                    | `undefined` | Accessibility configuration for screen readers    |

## Child Component Configurations

### ChartHeaderConfig

```typescript
interface ChartHeaderConfig {
  title?: string; // Default: "This is chart title."
  subtitle?: string; // Default: "This is chart subtitle..."
}
```

### ChartLegendConfig

```typescript
interface ChartLegendConfig {
  items?: ChartLegendItem[]; // Manual legend items (overrides auto-generation)
}
```

### DataDisplayConfig

```typescript
interface DataDisplayConfig {
  mode?: "static" | "hover"; // "hover" updates on bar hover
  label?: string; // Main label text
  showLabelIcon?: boolean;
  leadValue?: string; // e.g., "£2,390"
  supportingValue?: string; // e.g., "/ 3,000"
  showSupportingValue?: boolean;
  supportingLabel?: string;
  showSupportingLabel?: boolean;
  showSupportingLabelIcon?: boolean;
  showContentRight?: boolean;
  badgeValue?: string; // e.g., "23.5"
  badgeAutoDetect?: boolean;
  badgeSemanticMode?: "positive" | "negative" | "warning";
  showBadgeIcon?: boolean;
  size?: "S" | "M" | "L";
  type?: "Left" | "Centered";
  formatHoverLeadValue?: (value: number, category?: string, segmentIndex?: number) => string;
  formatHoverBadgeValue?: (value: number, category?: string, segmentIndex?: number) => string;
}
```

### BarGroupConfig

```typescript
interface BarGroupConfig {
  showValueLabels?: boolean; // Default: true
  showCategoryLabels?: boolean; // Default: true
  showXAxis?: boolean; // Default: true
  xAxisTickCount?: number; // Default: 6
  valueFormat?: ValueFormatConfig;
  formatXAxisValue?: (value: number) => string;
  barHeight?: string; // "XS" | "S" | "M" | "L" | "XL" | "2XL"
  hoverType?: StackedBarHoverType;
  showHoverBadge?: boolean;
  formatHoverValue?: (value: number, label?: string, segmentValue?: number) => string;
  onBarHover?: (data: HorizontalStackedBarHoverData) => void;
  onBarClick?: (data: HorizontalStackedBarHoverData) => void;
  hoveredBarIndex?: number;
  hoveredSegmentIndex?: number | null;
}
```

### ChartFooterConfig

```typescript
interface ChartFooterConfig {
  source?: string; // Default: "Source: jio.com."
  notes?: string; // Default: "Additional notes."
}
```

## Global Modes

| Mode Prop     | Figma Collection  | Available Values                                                           |
| ------------- | ----------------- | -------------------------------------------------------------------------- |
| `Brand`       | `"10 Brand"`      | `"Jio"` (entry point for token resolution)                                 |
| `Platform`    | `"7 Platform"`    | `"S [Mobile 360]"`, `"M [Tablet portrait 768]"`, `"L [Laptop 1440]"`, etc. |
| `Density`     | `"6 Density"`     | `"Default"`, `"Compact"`, `"Open"`                                         |
| `colourTheme` | `"9 Theme"`       | `"MyJio"`, `"Test Brand"`, `"JioFinance"`                                  |
| `colourMode`  | `"5 Colour Mode"` | `"Light"`, `"Dark"`                                                        |
| `fullWidth`   | N/A               | `true`, `false` - When true, chart fills available width                   |

## Design Tokens Used

| Property      | Variable Name           | Fallback | Description                |
| ------------- | ----------------------- | -------- | -------------------------- |
| Container Gap | `Dimensions/Spacings/L` | `20px`   | Gap between chart sections |
| Color 1-6     | `categorical/bold/{n}`  | Various  | Segment colors             |

## Usage Examples

### Basic Usage

```tsx
import HorizontalStackedBarChart from "./charts/HorizontalStackedBarChart";

const data = [
  { category: "Q1", series: "Product A", value: 30 },
  { category: "Q1", series: "Product B", value: 25 },
  { category: "Q2", series: "Product A", value: 35 },
  { category: "Q2", series: "Product B", value: 30 },
];

<HorizontalStackedBarChart
  data={data}
  chartHeader={{
    title: "Quarterly Sales",
    subtitle: "Breakdown by product category.",
  }}
/>;
```

### With DataDisplay (Hover Mode)

```tsx
<HorizontalStackedBarChart
  data={data}
  showDataDisplay={true}
  hoverType="individual"
  dataDisplay={{
    mode: "hover",
    label: "Revenue",
    leadValue: "£2,390",
    supportingValue: "/ 3,000",
    supportingLabel: "Total annual revenue",
  }}
  chartHeader={{
    title: "Revenue by Product",
    subtitle: "Hover over segments to see details.",
  }}
/>
```

### Categorical Hover

```tsx
<HorizontalStackedBarChart
  data={data}
  hoverType="categorical"
  barGroup={{
    showHoverBadge: true,
  }}
  chartHeader={{
    title: "Product Comparison",
    subtitle: "Same products across quarters highlight together.",
  }}
/>
```

### With Value Format

```tsx
<HorizontalStackedBarChart
  data={revenueData}
  barGroup={{
    valueFormat: { type: "currency", currency: "INR", abbreviate: true },
  }}
  chartHeader={{
    title: "Revenue by Region",
    subtitle: "Values in Indian Rupees.",
  }}
/>
```

### Dark Mode

```tsx
<HorizontalStackedBarChart
  data={data}
  modes={{
    Platform: "L [Laptop 1440]",
    colourMode: "Dark",
    Brand: "Jio",
  }}
/>
```

### Full Width

```tsx
<HorizontalStackedBarChart
  data={data}
  modes={{
    fullWidth: true,
    ...otherModes,
  }}
/>
```

### Custom Legend Items

```tsx
<HorizontalStackedBarChart
  data={data}
  chartLegend={{
    items: [
      { label: "Smartphones", color: "#ff671f" },
      { label: "Laptops", color: "#3900ad" },
      { label: "Tablets", color: "#465aff" },
    ],
  }}
/>
```

## Hover Interaction

### Hover Types

| Type            | Description                                            |
| --------------- | ------------------------------------------------------ |
| `"group"`       | All segments in a bar highlight together               |
| `"individual"`  | Only the hovered segment highlights                    |
| `"categorical"` | Same segment index across all bars highlights together |

## DataDisplay Integration

This chart supports an optional DataDisplay component positioned between ChartLegend and the group component. See **[DataDisplay Integration](./DataDisplayIntegration.md)** for full configuration including static/hover modes, custom formatters, and requirements.

**Note**: For this chart, formatters receive `(value: number, category?: string, segmentIndex?: number)` where `segmentIndex` identifies which segment (0-5) was hovered.

## Accessibility

Wrapped by `ChartAccessibility` (enabled by default). Provides ARIA attributes, auto-generated summaries, and hidden data tables. See **[ChartAccessibility.md](./ChartAccessibility.md)** for configuration.

## Child Components

| Component                   | Config Prop   | File                              | Description                |
| --------------------------- | ------------- | --------------------------------- | -------------------------- |
| `ChartHeader`               | `chartHeader` | `./ChartHeader.tsx`               | Title and subtitle         |
| `ChartLegend`               | `chartLegend` | `./ChartLegend.tsx`               | Legend with ChartKey items |
| `HorizontalStackedBarGroup` | `barGroup`    | `./HorizontalStackedBarGroup.tsx` | Bar group with D3 scaling  |
| `ChartFooter`               | `chartFooter` | `./ChartFooter.tsx`               | Source and notes           |

## Performance Notes

- Uses `useMemo` for mode mapping and legend generation
- Token resolution benefits from `resolvedCache`

## Related Documentation

- [OrganizedPropsPattern.md](./OrganizedPropsPattern.md) - Pattern documentation
- [HorizontalStackedBarGroup.md](./HorizontalStackedBarGroup.md) - Bar group component
- [ChartHeader.md](./ChartHeader.md) - Header component
- [ChartFooter.md](./ChartFooter.md) - Footer component
- [ChartLegend.md](./ChartLegend.md) - Legend component
- [DataDisplay.md](./DataDisplay.md) - DataDisplay component

## Files

| File                                       | Description                   |
| ------------------------------------------ | ----------------------------- |
| `src/charts/HorizontalStackedBarChart.tsx` | Main component implementation |
