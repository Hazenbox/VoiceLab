# HorizontalBarChart

## Overview

A complete horizontal bar chart component that composes ChartHeader, ChartLegend, DataDisplay, HorizontalBarGroup, and ChartFooter. Uses D3 for data scaling and the design token resolver for consistent styling across themes and platforms.

**This component follows the [Organized Props Pattern](./OrganizedPropsPattern.md).**

## Figma Reference

- **Node ID**: `138:10008`
- **Design File**: DataVis-Components
- **Figma URL**: https://www.figma.com/design/uA5ExvS0cNXbDEKzT9Rnrt/DataVis-Components?node-id=138-10008

## Architecture

```
HorizontalBarChart (flex column, gap: Dimensions/Spacings/L)
├── ChartHeader (optional)
│   ├── ChartTitle
│   └── ChartSubtitle
├── ChartLegend (optional)
│   └── ChartKey[] (with optional DataHead)
├── DataDisplay (optional, when showDataDisplay=true)
│   ├── contentLeft
│   │   ├── mainLabel (ChartBody + optional InfoIcon)
│   │   └── DataHead (DataLead + DataSupporting + SupportingLabel)
│   └── contentRight (DataBadgeSemantic)
├── HorizontalBarGroup (flex: 1)
│   ├── contentWrapper (contains bars)
│   │   └── HorizontalBar[] (for each data point)
│   │       ├── categoryLabelOutside
│   │       ├── barArea
│   │       │   ├── barWrapper (proportional width)
│   │       │   └── rightOutsideLabel
│   │       └── XAxis (optional)
└── ChartFooter (optional)
    ├── source
    └── notes
```

## Import

```tsx
import HorizontalBarChart from "./charts/HorizontalBarChart";
```

## Data Formats

### ChartDataPoint (Canonical - Recommended)

```tsx
import { ChartDataPoint } from "../types/chart-data";

interface ChartDataPoint {
  id?: string; // Unique identifier for React keys
  category: string; // Category label (e.g., "Category A")
  value: number; // Numeric value for bar width
  color?: string; // Optional custom color for the bar
  colorIndex?: number; // Categorical color index (1-6)
}
```

### HorizontalDataPoint (Legacy - Deprecated)

```tsx
/**
 * @deprecated Use ChartDataPoint from '../types/chart-data' instead.
 */
interface HorizontalDataPoint {
  label: string; // Category label
  value: number; // Numeric value for bar width
  color?: string; // Optional custom color
}
```

## Props Interface (Organized Props Pattern)

```typescript
/** Props for the ChartHeader child component */
interface ChartHeaderConfig {
  title?: string;
  subtitle?: string;
}

/** Props for the ChartLegend child component */
interface ChartLegendConfig {
  items?: ChartLegendItem[];
  label?: string;
  type?: "circle" | "dashed" | "line";
  showDataHead?: boolean;
  leadValue?: string;
  supportingValue?: string;
  supportingLabelText?: string;
  showDataSupporting?: boolean;
  showSupportingLabel?: boolean;
}

/** Props for the HorizontalBarGroup child component */
interface BarGroupConfig {
  showValueLabels?: boolean;
  showValueLabelsInside?: boolean;
  showCategoryLabels?: boolean;
  showCategoryLabelsInside?: boolean;
  showXAxis?: boolean;
  xAxisTickCount?: number;
  valueFormat?: ValueFormatConfig;
  formatXAxisValue?: (value: number) => string;
  barHeight?: string;
  /** Show DataBadge that follows cursor when hovering bars (requires interactive=true) */
  showHoverBadge?: boolean;
  /** Custom formatter for hover badge value */
  formatHoverValue?: (value: number, label?: string) => string;
  /** Callback fired when any bar hover state changes */
  onBarHover?: (data: HorizontalBarHoverData) => void;
  /** Callback fired when any bar is clicked */
  onBarClick?: (data: HorizontalBarHoverData) => void;
  /** Index of the currently hovered bar (for controlled hover state) */
  hoveredBarIndex?: number;
}

/** Props for the ChartFooter child component */
interface ChartFooterConfig {
  source?: string;
  notes?: string;
}

/**
 * Props for the DataDisplay child component.
 * When mode is "hover", values update dynamically based on bar hover state.
 */
interface DataDisplayConfig {
  mode?: "static" | "hover";
  label?: string;
  showLabelIcon?: boolean;
  leadValue?: string;
  supportingValue?: string;
  showSupportingValue?: boolean;
  supportingLabel?: string;
  showSupportingLabel?: boolean;
  showSupportingLabelIcon?: boolean;
  showContentRight?: boolean;
  badgeValue?: string;
  badgeAutoDetect?: boolean;
  badgeSemanticMode?: "positive" | "negative" | "warning";
  showBadgeIcon?: boolean;
  size?: "S" | "M" | "L";
  type?: "Left" | "Centered";
  formatHoverLeadValue?: (value: number, category?: string) => string;
  formatHoverBadgeValue?: (value: number, category?: string) => string;
}

/** Global modes for design token resolution */
interface GlobalModes {
  Platform?: string;
  Density?: string;
  colourTheme?: string;
  colourMode?: string;
  Brand?: string;
  fullWidth?: boolean;
}

interface HorizontalBarChartProps {
  // Layer 2: Parent component props
  /**
   * Supports canonical format (ChartDataPoint[]) or legacy format (HorizontalDataPoint[])
   */
  data: ChartDataPoint[] | HorizontalDataPoint[];
  width?: number | string;
  height?: number | string;
  showHeader?: boolean;
  showFooter?: boolean;
  showLegend?: boolean;
  showDataDisplay?: boolean; // Show DataDisplay component above bars
  /** Enable hover/click interactivity on bars (default: true) */
  interactive?: boolean;

  // Layer 3: Child component configurations
  chartHeader?: ChartHeaderConfig;
  chartLegend?: ChartLegendConfig;
  dataDisplay?: DataDisplayConfig; // Configuration for DataDisplay
  barGroup?: BarGroupConfig;
  chartFooter?: ChartFooterConfig;

  // Layer 1: Global modes
  modes?: GlobalModes;
}
```

## Props

### Parent Component Props (Layer 2)

| Prop              | Type                                        | Default | Description                                                              |
| ----------------- | ------------------------------------------- | ------- | ------------------------------------------------------------------------ |
| `data`            | `ChartDataPoint[] \| HorizontalDataPoint[]` | `[]`    | Array of data points (canonical or legacy format)                        |
| `width`           | `number \| string`                          | `346`   | Total width of the chart container                                       |
| `height`          | `number \| string`                          | `400`   | **Total height of the chart.** HorizontalBarGroup fills remaining space. |
| `showHeader`      | `boolean`                                   | `true`  | Show the chart header (title + subtitle)                                 |
| `showFooter`      | `boolean`                                   | `true`  | Show the chart footer (source + notes)                                   |
| `showLegend`      | `boolean`                                   | `false` | Show the chart legend                                                    |
| `showDataDisplay` | `boolean`                                   | `false` | Show DataDisplay component above the bar group                           |
| `interactive`     | `boolean`                                   | `true`  | Enable hover/click interactivity on bars                                 |

### ChartHeader Config (`chartHeader`)

| Prop       | Type     | Default                       | Description         |
| ---------- | -------- | ----------------------------- | ------------------- |
| `title`    | `string` | `"This is chart title."`      | Chart title text    |
| `subtitle` | `string` | `"This is chart subtitle..."` | Chart subtitle text |

### ChartLegend Config (`chartLegend`)

| Prop                  | Type                             | Default     | Description                                     |
| --------------------- | -------------------------------- | ----------- | ----------------------------------------------- |
| `items`               | `ChartLegendItem[]`              | `undefined` | Manual legend items - overrides auto-generation |
| `label`               | `string`                         | `undefined` | Simple legend label for single-series charts    |
| `type`                | `"circle" \| "dashed" \| "line"` | `"circle"`  | Indicator type for legend                       |
| `showDataHead`        | `boolean`                        | `false`     | Show DataHead in legend                         |
| `leadValue`           | `string`                         | `undefined` | Lead value for DataHead (e.g., "₹2,390")        |
| `supportingValue`     | `string`                         | `undefined` | Supporting value for DataHead (e.g., "/ 3,000") |
| `supportingLabelText` | `string`                         | `undefined` | Supporting label text for DataHead              |
| `showDataSupporting`  | `boolean`                        | `true`      | Show DataSupporting in DataHead                 |
| `showSupportingLabel` | `boolean`                        | `true`      | Show SupportingLabel in DataHead                |

### BarGroup Config (`barGroup`)

| Prop                       | Type                                        | Default     | Description                                                  |
| -------------------------- | ------------------------------------------- | ----------- | ------------------------------------------------------------ |
| `showValueLabels`          | `boolean`                                   | `true`      | Show value labels outside the bar on the right               |
| `showValueLabelsInside`    | `boolean`                                   | `false`     | Show value labels inside the bar on the right                |
| `showCategoryLabels`       | `boolean`                                   | `true`      | Show category labels outside the bar on the left             |
| `showCategoryLabelsInside` | `boolean`                                   | `false`     | Show category labels inside the bar on the left              |
| `showXAxis`                | `boolean`                                   | `true`      | Show the X-axis at the bottom                                |
| `xAxisTickCount`           | `number`                                    | `6`         | Target number of X-axis ticks                                |
| `valueFormat`              | `ValueFormatConfig`                         | `undefined` | Value format configuration for axis and labels               |
| `formatXAxisValue`         | `(value: number) => string`                 | `undefined` | Custom formatter for X-axis tick labels                      |
| `barHeight`                | `string`                                    | `"M"`       | T-shirt sizing: `"XS"`, `"S"`, `"M"`, `"L"`, `"XL"`, `"2XL"` |
| `showHoverBadge`           | `boolean`                                   | `false`     | Show DataBadge that follows cursor when hovering bars        |
| `formatHoverValue`         | `(value: number, label?: string) => string` | `undefined` | Custom formatter for hover badge value                       |
| `onBarHover`               | `function`                                  | `undefined` | Callback fired when any bar hover state changes              |
| `onBarClick`               | `function`                                  | `undefined` | Callback fired when any bar is clicked                       |
| `hoveredBarIndex`          | `number`                                    | `undefined` | Index of the currently hovered bar (for controlled hover)    |

### ChartFooter Config (`chartFooter`)

| Prop     | Type     | Default               | Description                     |
| -------- | -------- | --------------------- | ------------------------------- |
| `source` | `string` | `"Source: jio.com."`  | Source text displayed in footer |
| `notes`  | `string` | `"Additional notes."` | Notes text displayed in footer  |

### DataDisplay Config (`dataDisplay`)

| Prop                      | Type                                           | Default               | Description                                                          |
| ------------------------- | ---------------------------------------------- | --------------------- | -------------------------------------------------------------------- |
| `mode`                    | `"static" \| "hover"`                          | `"static"`            | Display mode: static uses provided values, hover updates dynamically |
| `label`                   | `string`                                       | `"Label."`            | Main label text above the data value                                 |
| `showLabelIcon`           | `boolean`                                      | `false`               | Whether to show info icon next to the main label                     |
| `leadValue`               | `string`                                       | `"£2,390"`            | Lead value for static mode or default in hover mode                  |
| `supportingValue`         | `string`                                       | `"/ 3,000"`           | Supporting value next to lead value                                  |
| `showSupportingValue`     | `boolean`                                      | `true`                | Whether to show supporting value                                     |
| `supportingLabel`         | `string`                                       | `"Supporting label."` | Supporting label text below the values                               |
| `showSupportingLabel`     | `boolean`                                      | `true`                | Whether to show supporting label                                     |
| `showSupportingLabelIcon` | `boolean`                                      | `false`               | Whether to show icon in supporting label                             |
| `showContentRight`        | `boolean`                                      | `true`                | Whether to show the semantic badge                                   |
| `badgeValue`              | `string`                                       | `"23.5"`              | Badge value for static mode                                          |
| `badgeAutoDetect`         | `boolean`                                      | `true`                | Auto-detect semantic mode from value                                 |
| `badgeSemanticMode`       | `"positive" \| "negative" \| "warning"`        | `"positive"`          | Manual semantic mode when autoDetect is false                        |
| `showBadgeIcon`           | `boolean`                                      | `true`                | Whether to show chevron icon in badge                                |
| `size`                    | `"S" \| "M" \| "L"`                            | `"L"`                 | Typography size variant                                              |
| `type`                    | `"Left" \| "Centered"`                         | `"Left"`              | Layout type: horizontal or vertical                                  |
| `formatHoverLeadValue`    | `(value: number, category?: string) => string` | `undefined`           | Custom formatter for lead value in hover mode                        |
| `formatHoverBadgeValue`   | `(value: number, category?: string) => string` | `undefined`           | Custom formatter for badge value in hover mode                       |

### Global Modes (`modes`) (Layer 1)

| Mode Prop     | Figma Collection  | Available Values                                                                                                          |
| ------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `Brand`       | `"10 Brand"`      | `"Jio"` (entry point for token resolution)                                                                                |
| `Platform`    | `"7 Platform"`    | `"S [Mobile 360]"`, `"M [Tablet portrait 768]"`, `"M [Tablet landscape 1024]"`, `"L [Laptop 1440]"`, `"L [Desktop 1920]"` |
| `Density`     | `"6 Density"`     | `"Default"`, `"Compact"`, `"Open"`                                                                                        |
| `colourTheme` | `"9 Theme"`       | `"MyJio"`, `"Test Brand"`, `"JioFinance"`                                                                                 |
| `colourMode`  | `"5 Colour Mode"` | `"Light"`, `"Dark"`                                                                                                       |
| `fullWidth`   | -                 | `true`, `false` - When true, chart fills 100% width                                                                       |

```
HorizontalBarChart (flex column, gap: Dimensions/Spacings/L)
├── ChartHeader (optional)
│   ├── ChartTitle
│   └── ChartSubtitle
├── ChartLegend (optional)
│   └── ChartKey[] (with optional DataHead)
├── DataDisplay (optional, when showDataDisplay=true)
│   ├── contentLeft
│   │   ├── mainLabel (ChartBody + optional InfoIcon)
│   │   └── DataHead (DataLead + DataSupporting + SupportingLabel)
│   └── contentRight (DataBadgeSemantic)
├── HorizontalBarGroup (flex: 1)
│   ├── contentWrapper (contains bars)
│   │   └── HorizontalBar[] (for each data point)
│   │       ├── categoryLabelOutside
│   │       ├── barArea
│   │       │   ├── barWrapper (proportional width)
│   │       │   └── rightOutsideLabel
│   │       └── XAxis (optional)
└── ChartFooter (optional)
    ├── source
    └── notes
```

## Usage Examples

### Basic Usage (Organized Props)

```tsx
import HorizontalBarChart from "./charts/HorizontalBarChart";

const data = [
  { label: "Category A", value: 120 },
  { label: "Category B", value: 85 },
  { label: "Category C", value: 150 },
];

<HorizontalBarChart data={data} />;
```

### Full Configuration

```tsx
const modes = {
  Platform: "L [Laptop 1440]",
  Density: "Default",
  colourTheme: "MyJio",
  colourMode: "Light",
  Brand: "Jio",
};

<HorizontalBarChart
  data={data}
  width={400}
  height={350}
  showHeader={true}
  showFooter={true}
  showLegend={true}
  chartHeader={{
    title: "Revenue by Category",
    subtitle: "Q4 2025 performance data.",
  }}
  chartLegend={{
    label: "Revenue",
  }}
  barGroup={{
    showValueLabels: true,
    showCategoryLabels: true,
    showXAxis: true,
    barHeight: "M",
  }}
  chartFooter={{
    source: "Source: Finance.",
    notes: "Values in thousands.",
  }}
  modes={modes}
/>;
```

### With Legend and DataHead

```tsx
<HorizontalBarChart
  data={data}
  showLegend={true}
  chartLegend={{
    label: "Total Revenue",
    showDataHead: true,
    leadValue: "₹8.5L",
    supportingValue: "/ 10L",
    supportingLabelText: "target",
    showDataSupporting: true,
    showSupportingLabel: true,
  }}
  modes={modes}
/>
```

### With DataDisplay (Static Mode)

```tsx
<HorizontalBarChart
  data={data}
  showDataDisplay={true}
  chartHeader={{
    title: "Revenue by Category",
    subtitle: "Q4 2025 performance",
  }}
  dataDisplay={{
    mode: "static",
    label: "Total revenue",
    leadValue: "£2,390",
    supportingValue: "/ 3,000",
    supportingLabel: "Monthly target",
    badgeValue: "+23.5%",
  }}
  modes={modes}
/>
```

### With DataDisplay (Hover Mode)

DataDisplay updates dynamically when hovering over bars:

```tsx
<HorizontalBarChart
  data={data}
  showDataDisplay={true}
  interactive={true}
  chartHeader={{
    title: "Revenue by Category",
  }}
  dataDisplay={{
    mode: "hover",
    label: "Hover a bar to see details",
    leadValue: "-",
    supportingValue: "",
    showSupportingValue: false,
    badgeValue: "-",
  }}
  modes={modes}
/>
```

### With DataDisplay (Hover Mode + Custom Formatters)

```tsx
<HorizontalBarChart
  data={data}
  showDataDisplay={true}
  interactive={true}
  dataDisplay={{
    mode: "hover",
    label: "Select a category",
    formatHoverLeadValue: (value, category) => `${category}: £${value.toLocaleString()}`,
    formatHoverBadgeValue: (value) => {
      const percent = ((value / totalRevenue) * 100).toFixed(1);
      return `${percent}%`;
    },
  }}
  modes={modes}
/>
```

### Custom Colors

```tsx
const coloredData = [
  { label: "Sales", value: 120, color: "#22C55E" },
  { label: "Marketing", value: 85, color: "#3B82F6" },
  { label: "Development", value: 150, color: "#8B5CF6" },
];

<HorizontalBarChart
  data={coloredData}
  chartHeader={{
    title: "Department Comparison",
  }}
  modes={modes}
/>;
```

### With Value Format

```tsx
<HorizontalBarChart
  data={revenueData}
  chartHeader={{
    title: "Revenue by Department",
    subtitle: "Q4 2025 financial performance.",
  }}
  barGroup={{
    valueFormat: {
      type: "currency",
      currency: "INR",
      abbreviate: true,
    },
  }}
  modes={modes}
/>
```

### Inside Labels

```tsx
<HorizontalBarChart
  data={data}
  chartHeader={{
    title: "Chart with Inside Labels",
    subtitle: "Category and value labels displayed inside the bars.",
  }}
  barGroup={{
    showValueLabels: false,
    showValueLabelsInside: true,
    showCategoryLabels: false,
    showCategoryLabelsInside: true,
    barHeight: "L",
  }}
  modes={modes}
/>
```

### Full Width

```tsx
<HorizontalBarChart
  data={data}
  chartHeader={{
    title: "Full Width Chart",
  }}
  modes={{
    ...modes,
    fullWidth: true,
  }}
/>
```

### Dark Mode

```tsx
<HorizontalBarChart
  data={data}
  modes={{
    ...modes,
    colourMode: "Dark",
  }}
/>
```

## Hover Interaction

The chart supports hover interaction with automatic dimming of non-hovered bars.

### Color & Opacity States

| State                              | Color Token                      | Opacity | Description                   |
| ---------------------------------- | -------------------------------- | ------- | ----------------------------- |
| **Default** (nothing hovered)      | `categorical/bold/{colorIndex}`  | `1`     | Original vibrant colors       |
| **Highlighted** (this bar hovered) | `categorical/bold/{colorIndex}`  | `1`     | Stays vibrant                 |
| **Dimmed** (another bar hovered)   | `categorical/hover/{colorIndex}` | `0.2`   | Muted color + reduced opacity |

### Transition Tokens

All hover transitions use design tokens from the `hoverTransition` collection:

- **Easing**: `"easing"` - Cubic-bezier timing function
- **Duration**: `"duration"` - Transition time (e.g., 200ms for "Moderate" mode)
- **Dim Opacity**: `"dimOpacity"` - Opacity for dimmed bars (default: 0.2)

```tsx
<HorizontalBarChart
  data={data}
  interactive={true}
  barGroup={{
    onBarHover: (hoverData) => {
      if (hoverData.isHovered) {
        console.log(`Hovering: ${hoverData.label} - ${hoverData.value}`);
      }
    },
    onBarClick: (clickData) => {
      console.log(`Clicked: ${clickData.label}`);
    },
  }}
  modes={modes}
/>
```

### Hover Badge

The chart supports a cursor-following DataBadge that displays the hovered bar's value with smooth fade animations.

```tsx
<HorizontalBarChart
  data={data}
  interactive={true}
  barGroup={{
    showHoverBadge: true,
  }}
  modes={modes}
/>
```

#### Custom Hover Badge Format

```tsx
<HorizontalBarChart
  data={data}
  barGroup={{
    showHoverBadge: true,
    formatHoverValue: (value, label) => `${label}: £${value.toLocaleString()}`,
  }}
  modes={modes}
/>
```

The hover badge uses:

- **`enterTransition`** collection for fade-in animation
- **`exitTransition`** collection for fade-out animation
- Inverted `colourMode` for visibility contrast

### Controlled Hover State

```tsx
const [hoveredIndex, setHoveredIndex] = useState<number | undefined>(undefined);

<HorizontalBarChart
  data={data}
  interactive={true}
  barGroup={{
    hoveredBarIndex: hoveredIndex,
    onBarHover: (hoverData) => {
      setHoveredIndex(hoverData.isHovered ? hoverData.index : undefined);
    },
  }}
  modes={modes}
/>;
```

### Disable Interactivity

```tsx
<HorizontalBarChart data={data} interactive={false} modes={modes} />
```

### Different Bar Heights

```tsx
// Large bars for fewer data points
<HorizontalBarChart
  data={quarterlyData}
  barGroup={{
    barHeight: "XL",
  }}
  modes={modes}
/>

// Small bars for many data points
<HorizontalBarChart
  data={monthlyData}
  barGroup={{
    barHeight: "S",
  }}
  modes={modes}
/>
```

## Migration from Flat Props

### Before (Flat Props - Deprecated)

```tsx
<HorizontalBarChart
  title="Revenue by Category"
  subtitle="Q4 2025 performance data."
  source="Source: Finance."
  notes="Values in thousands."
  data={data}
  width={400}
  height={350}
  showHeader={true}
  showFooter={true}
  showLegend={true}
  legendLabel="Revenue"
  showValueLabels={true}
  showCategoryLabels={true}
  showXAxis={true}
  barHeight="M"
  modes={modes}
/>
```

### After (Organized Props)

```tsx
<HorizontalBarChart
  data={data}
  width={400}
  height={350}
  showHeader={true}
  showFooter={true}
  showLegend={true}
  chartHeader={{
    title: "Revenue by Category",
    subtitle: "Q4 2025 performance data.",
  }}
  chartLegend={{
    label: "Revenue",
  }}
  barGroup={{
    showValueLabels: true,
    showCategoryLabels: true,
    showXAxis: true,
    barHeight: "M",
  }}
  chartFooter={{
    source: "Source: Finance.",
    notes: "Values in thousands.",
  }}
  modes={modes}
/>
```

## Height Behavior

The `height` prop controls the **total chart height**, not just the bar group. The HorizontalBarGroup automatically stretches to fill the remaining space after header, legend, DataDisplay, and footer.

### How It Works

```
┌─────────────────────────────────────────┐
│ ChartHeader (natural height)            │
├─────────────────────────────────────────┤
│ ChartLegend (natural height)            │
├─────────────────────────────────────────┤
│ DataDisplay (natural height, optional)  │
├─────────────────────────────────────────┤
│                                         │
│ HorizontalBarGroup (flex: 1, fills)     │
│                                         │
├─────────────────────────────────────────┤
│ ChartFooter (natural height)            │
└─────────────────────────────────────────┘
       ↑                                ↑
       └────── Total height prop ───────┘
```

### Usage Examples

```tsx
// Fixed 500px chart - bar group fills remaining space
<HorizontalBarChart
  data={data}
  height={500}
  showHeader={true}
  showFooter={true}
/>

// Compact 280px chart for dashboards
<HorizontalBarChart
  data={data}
  height={280}
  showHeader={true}
  showFooter={false}
  showLegend={false}
/>

// Bars only - fills full height
<HorizontalBarChart
  data={data}
  height={300}
  showHeader={false}
  showFooter={false}
  showLegend={false}
/>
```

### Key Benefits

1. **Predictable sizing**: Chart always respects the specified height
2. **Automatic stretching**: Bar group expands to fill available space
3. **Consistent layouts**: Same chart height regardless of which sections are visible
4. **Responsive-friendly**: Use percentage heights for fluid layouts

## Design Tokens Used

| Property      | Variable Name           | Fallback  | Description                   |
| ------------- | ----------------------- | --------- | ----------------------------- |
| Container Gap | `Dimensions/Spacings/L` | `20px`    | Gap between chart sections    |
| Bar Height    | `barWidth`              | `16px`    | Height of each horizontal bar |
| Bar Color     | `categorical/bold/1`    | `#ff671f` | Default bar color             |

## Child Components

| Component            | Config Prop   | File                       | Description                   |
| -------------------- | ------------- | -------------------------- | ----------------------------- |
| `ChartHeader`        | `chartHeader` | `./ChartHeader.tsx`        | Title and subtitle            |
| `ChartLegend`        | `chartLegend` | `./ChartLegend.tsx`        | Legend with keys and DataHead |
| `HorizontalBarGroup` | `barGroup`    | `./HorizontalBarGroup.tsx` | Bar visualization with D3     |
| `ChartFooter`        | `chartFooter` | `./ChartFooter.tsx`        | Source and notes              |

## DataDisplay Integration

This chart supports an optional DataDisplay component positioned between ChartLegend and the group component. See **[DataDisplay Integration](./DataDisplayIntegration.md)** for full configuration including static/hover modes, custom formatters, and requirements.

## Accessibility

Wrapped by `ChartAccessibility` (enabled by default). Provides ARIA attributes, auto-generated summaries, and hidden data tables. See **[ChartAccessibility.md](./ChartAccessibility.md)** for configuration.

## Related Documentation

- [OrganizedPropsPattern.md](./OrganizedPropsPattern.md) - Pattern documentation
- [HorizontalBarGroup.md](./HorizontalBarGroup.md) - Bar group component
- [HorizontalBar.md](./HorizontalBar.md) - Individual bar component
- [ChartHeader.md](./ChartHeader.md) - Header component
- [ChartFooter.md](./ChartFooter.md) - Footer component
- [ChartLegend.md](./ChartLegend.md) - Legend component
- [DataDisplay.md](./DataDisplay.md) - DataDisplay component

## Performance Notes

- Uses `useMemo` for mode mapping and legend generation
- Token resolution benefits from `resolvedCache`

## Related Documentation

- [OrganizedPropsPattern.md](./OrganizedPropsPattern.md) - Pattern documentation
- [HorizontalBarGroup.md](./HorizontalBarGroup.md) - Bar group component
- [HorizontalBar.md](./HorizontalBar.md) - Individual bar component
- [ChartHeader.md](./ChartHeader.md) - Header component
- [ChartFooter.md](./ChartFooter.md) - Footer component
- [ChartLegend.md](./ChartLegend.md) - Legend component
- [DataDisplay.md](./DataDisplay.md) - DataDisplay component

## Files

| File                                | Description                   |
| ----------------------------------- | ----------------------------- |
| `src/charts/HorizontalBarChart.tsx` | Main component implementation |
