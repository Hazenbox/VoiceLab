# ClusteredBubbleChart

A complete bubble chart visualization that combines ChartHeader, ChartLegend, DataDisplay, ClusteredBubbleGroup, InlineChartKeyGroup, and ChartFooter into a cohesive chart component.

## Figma Reference

- **Node ID**: `255:8116`
- **Design URL**: [DataVis Components - ClusteredBubbleChart](https://www.figma.com/design/uA5ExvS0cNXbDEKzT9Rnrt/DataVis-Components?node-id=255-8116)

## Import

```tsx
import { ClusteredBubbleChart } from "@jio/datavis-components/charts";
// or
import ClusteredBubbleChart from "@jio/datavis-components/charts/ClusteredBubbleChart";
```

## Architecture

```
ClusteredBubbleChart
├── ChartHeader (title + subtitle)
├── ChartLegend (category color indicators)
├── DataDisplay (summary value + semantic badge)
├── ClusteredBubbleGroup (D3 force bubble layout)
├── InlineChartKeyGroup (category names with values)
└── ChartFooter (source + notes)
```

## Basic Usage

```tsx
<ClusteredBubbleChart
  data={[
    { category: "Product A", value: 1000 },
    { category: "Product B", value: 750 },
    { category: "Product C", value: 500 },
    { category: "Product D", value: 300 },
    { category: "Product E", value: 150 },
    { category: "Product F", value: 50 },
  ]}
  chartHeader={{
    title: "Revenue by Product",
    subtitle: "Distribution of revenue across product lines.",
  }}
  modes={{
    Platform: "L [Laptop 1440]",
    colourTheme: "MyJio",
    colourMode: "Light",
  }}
/>
```

## Props (Organized Props Pattern)

The component follows the **Organized Props Pattern** with three layers:

### Layer 1: Global Modes

```tsx
modes?: {
  Platform?: string;      // "L [Laptop 1440]", "M [Tablet 768]", "S [Mobile 360]"
  Density?: string;       // "Default", "Compact", "Open"
  colourTheme?: string;   // "MyJio", "JioFinance"
  colourMode?: string;    // "Light", "Dark"
  Brand?: string;         // "Jio"
  fullWidth?: boolean;    // Enable full-width mode
}
```

### Layer 2: Parent Props

| Prop                      | Type               | Default | Description                                  |
| ------------------------- | ------------------ | ------- | -------------------------------------------- |
| `data`                    | `ChartDataPoint[]` | `[]`    | Array of data points with category and value |
| `width`                   | `number \| string` | `420`   | Total width of the chart                     |
| `height`                  | `number \| string` | `340`   | Height of the bubble visualization area      |
| `showHeader`              | `boolean`          | `true`  | Show chart header (title + subtitle)         |
| `showFooter`              | `boolean`          | `true`  | Show chart footer (source + notes)           |
| `showLegend`              | `boolean`          | `true`  | Show chart legend                            |
| `showDataDisplay`         | `boolean`          | `true`  | Show DataDisplay component                   |
| `showInlineChartKeyGroup` | `boolean`          | `true`  | Show InlineChartKeyGroup                     |
| `interactive`             | `boolean`          | `true`  | Enable hover/click interactivity             |

### Layer 3: Child Component Configs

#### chartHeader

```tsx
chartHeader?: {
  title?: string;     // Chart title text
  subtitle?: string;  // Chart subtitle text
}
```

#### chartLegend

```tsx
chartLegend?: {
  items?: ChartLegendItem[];  // Manual legend items (overrides auto-generation)
}
```

#### dataDisplay

```tsx
dataDisplay?: {
  mode?: "static" | "hover";    // "hover" updates values when bubbles are hovered
  label?: string;               // Main label text
  showLabelIcon?: boolean;      // Show info icon next to label
  leadValue?: string;           // Primary value display
  supportingValue?: string;     // Secondary value (e.g., "/ 3,000")
  showSupportingValue?: boolean;
  supportingLabel?: string;     // Label below the value
  showSupportingLabel?: boolean;
  showSupportingLabelIcon?: boolean;
  showContentRight?: boolean;   // Show semantic badge
  badgeValue?: string;          // Badge value
  badgeAutoDetect?: boolean;    // Auto-detect positive/negative from value
  badgeSemanticMode?: "positive" | "negative" | "warning";
  showBadgeIcon?: boolean;
  size?: "S" | "M" | "L";       // Typography scale
  type?: "Left" | "Centered";   // Layout type
  formatHoverLeadValue?: (value: number, category?: string) => string;
  formatHoverBadgeValue?: (value: number, category?: string) => string;
}
```

#### bubbleGroup

```tsx
bubbleGroup?: {
  minRadius?: number;           // Minimum bubble radius (default: 10)
  maxRadius?: number;           // Maximum bubble radius (default: 90)
  forceStrength?: number;       // D3 force strength (default: 0.03)
  showHoverBadge?: boolean;     // Show cursor-following badge on hover
  formatHoverValue?: (value: number, label?: string) => string;
  onBubbleHover?: (data: BubbleHoverData) => void;
  onBubbleClick?: (data: BubbleHoverData) => void;
  hoveredBubbleIndex?: number;  // Controlled hover state
}
```

#### inlineChartKeyGroup

```tsx
inlineChartKeyGroup?: {
  items?: InlineChartKeyGroupItem[];  // Manual items (overrides auto-generation)
  defaultType?: "circle" | "dashed" | "line";
  showDataSlot1?: boolean;            // Show primary value
  showDataSlot2?: boolean;            // Show secondary value
  formatValue?: (value: number) => string;
}
```

#### chartFooter

```tsx
chartFooter?: {
  source?: string;   // Source attribution text
  notes?: string;    // Additional notes
}
```

## Data Format

### Canonical Format (ChartDataPoint)

```tsx
interface ChartDataPoint {
  id?: string; // Unique identifier
  category: string; // Bubble label
  value: number; // Size value (determines bubble radius)
  color?: string; // Custom color override
  colorIndex?: number; // Categorical color (1-6)
}

const data: ChartDataPoint[] = [
  { category: "India", value: 4520 },
  { category: "USA", value: 3800 },
  { category: "UK", value: 2100 },
  { category: "Germany", value: 1800 },
  { category: "Japan", value: 900 },
  { category: "Australia", value: 450 },
];
```

## Examples

### Full Configuration

```tsx
<ClusteredBubbleChart
  data={marketData}
  width={500}
  height={400}
  showHeader
  showFooter
  showLegend
  showDataDisplay
  showInlineChartKeyGroup
  interactive
  chartHeader={{
    title: "Global Market Share",
    subtitle: "Customer distribution by country.",
  }}
  chartLegend={
    {
      // Auto-generated from data if not provided
    }
  }
  dataDisplay={{
    mode: "static",
    label: "Total Customers",
    leadValue: "13,570",
    supportingValue: "/ 15,000",
    supportingLabel: "Annual target",
    badgeValue: "+8.5",
  }}
  bubbleGroup={{
    showHoverBadge: true,
    minRadius: 15,
    maxRadius: 100,
  }}
  inlineChartKeyGroup={{
    formatValue: (v) => v.toLocaleString(),
  }}
  chartFooter={{
    source: "Source: CRM Analytics.",
    notes: "Q4 2025 data.",
  }}
  modes={{
    Platform: "L [Laptop 1440]",
    colourTheme: "MyJio",
    colourMode: "Light",
  }}
/>
```

### Hover Mode DataDisplay

When `dataDisplay.mode` is set to `"hover"`, the DataDisplay component updates dynamically when bubbles are hovered:

```tsx
<ClusteredBubbleChart
  data={productData}
  dataDisplay={{
    mode: "hover",
    label: "Hover a bubble",
    leadValue: "--",
    supportingValue: "/ 2,750",
    supportingLabel: "of total revenue",
    badgeValue: "--%",
    formatHoverLeadValue: (value) => `£${value.toLocaleString()}`,
  }}
  bubbleGroup={{
    showHoverBadge: true,
  }}
/>
```

### With Formatted Values

```tsx
<ClusteredBubbleChart
  data={revenueData}
  bubbleGroup={{
    showHoverBadge: true,
    formatHoverValue: (value, label) => {
      const formatted = `£${(value / 1000000).toFixed(1)}M`;
      return label ? `${label}: ${formatted}` : formatted;
    },
  }}
  inlineChartKeyGroup={{
    formatValue: (v) => `£${(v / 1000000).toFixed(1)}M`,
  }}
/>
```

### Dark Mode

```tsx
<ClusteredBubbleChart
  data={productData}
  modes={{
    Platform: "L [Laptop 1440]",
    colourTheme: "MyJio",
    colourMode: "Dark",
  }}
/>
```

### Minimal (Bubbles + Keys Only)

```tsx
<ClusteredBubbleChart
  data={productData}
  showHeader
  showFooter={false}
  showLegend={false}
  showDataDisplay={false}
  showInlineChartKeyGroup
  chartHeader={{
    title: "Product Distribution",
    subtitle: "Relative size by revenue.",
  }}
/>
```

### Full Width

```tsx
<ClusteredBubbleChart
  data={productData}
  height={400}
  modes={{
    fullWidth: true,
    Platform: "L [Laptop 1440]",
    colourTheme: "MyJio",
    colourMode: "Light",
  }}
/>
```

## Auto-Generated Content

### Legend Items

If `chartLegend.items` is not provided, legend items are automatically generated from the data:

- Each data point becomes a legend item
- Colors are assigned from `categorical/bold/1-6` tokens
- Limited to first 6 items

### InlineChartKeyGroup Items

If `inlineChartKeyGroup.items` is not provided, items are automatically generated:

- Each data point becomes an inline chart key
- Labels come from `category`
- Values are formatted using `formatValue` or `toLocaleString()`
- Colors match the legend/bubble colors

## Design Tokens Used

| Token Path                    | Purpose                           |
| ----------------------------- | --------------------------------- |
| `Dimensions/Spacings/L`       | Gap between chart sections (20px) |
| `categorical/bold/1-6`        | Bubble and legend colors          |
| `Colour/on-Colour/High`       | Text colors                       |
| `Typography/fontsize/Title/M` | Title font size                   |
| `Typography/fontsize/Body/XS` | Body text font size               |

## Accessibility

The chart is wrapped with `ChartAccessibility` which provides:

- ARIA attributes (`role="figure"`, `aria-label`, `aria-describedby`)
- Auto-generated natural language summary
- Visually-hidden data table for screen readers

```tsx
<ClusteredBubbleChart
  data={data}
  accessibility={{
    enabled: true,
    dataTable: true,
    summary: "Custom summary override",
  }}
/>
```

## Related Documentation

- [ClusteredBubbleGroup](./ClusteredBubbleGroup.md) - The bubble visualization component
- [ChartHeader](./ChartHeader.md) - Title and subtitle
- [ChartLegend](./ChartLegend.md) - Color legend
- [DataDisplay](./DataDisplay.md) - Summary value display
- [InlineChartKeyGroup](./InlineChartKeyGroup.md) - Inline keys with values
- [ChartFooter](./ChartFooter.md) - Source and notes
- [VerticalBarChart](./VerticalBarChart.md) - Similar pattern for bar charts
