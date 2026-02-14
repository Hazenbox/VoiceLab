# VerticalStackedBarChart

## Overview

A complete vertical stacked bar chart component that composes `ChartHeader`, `ChartLegend`, `DataDisplay`, `VerticalStackedBarGroup`, and `ChartFooter` into a cohesive data visualization. Uses D3 for scaling and the design token resolver for consistent styling.

**This component follows the [Organized Props Pattern](./OrganizedPropsPattern.md).**

## Figma Reference

- **Node ID**: `133:2318`
- **Design File**: DataVis-Components
- **Figma URL**: https://www.figma.com/design/uA5ExvS0cNXbDEKzT9Rnrt/DataVis-Components?node-id=133-2318

## Architecture

```
VerticalStackedBarChart (flex container, vertical layout)
├── ChartHeader (conditional, when showHeader=true)
│   ├── ChartTitle
│   └── ChartSubtitle
├── ChartLegend (conditional, when showLegend=true)
│   └── ChartKey[] (6 items for categorical colors)
│       ├── Circle indicator (categorical color)
│       └── Label
├── DataDisplay (conditional, when showDataDisplay=true)
│   ├── contentLeft
│   │   ├── mainLabel (ChartBody + optional InfoIcon)
│   │   └── DataHead (DataLead + DataSupporting + SupportingLabel)
│   └── contentRight (DataBadgeSemantic)
├── VerticalStackedBarGroup
│   ├── YAxis (optional, when showYAxis=true)
│   │   └── ChartAxisTick (for each tick value)
│   ├── AvgLine (optional, when showAvgLine=true)
│   └── contentWrapper (flex, space-between)
│       └── VerticalStackedBar[] (D3-scaled heights)
│           ├── topOutsideLabel (optional total)
│           ├── stackedBars (pill radius container)
│           │   └── shapeRect[1-6] (colored segments)
│           └── categoryLabel
└── ChartFooter (conditional, when showFooter=true)
    ├── ChartBody (source)
    └── ChartBody (notes)
```

## Import

```tsx
import VerticalStackedBarChart from "./charts/VerticalStackedBarChart";
```

## Data Formats

### StackedBarDataPoint (Legacy)

```tsx
interface StackedBarDataPoint {
  label: string; // Category label (e.g., "Jan")
  segments: StackedBarSegment[]; // Array of segments (max 6)
  totalLabel?: string; // Optional custom total label
}
```

### StackedBarSegment

```tsx
interface StackedBarSegment {
  value: number; // Segment value
  label?: string; // Segment label (for legend)
  color?: string; // Custom color override
}
```

## Props Interface (Organized Props Pattern)

```tsx
import { StackedBarDataPoint } from "./VerticalStackedBarGroup";
import { ChartLegendItem } from "./ChartLegend";
import { ValueFormatConfig } from "./VerticalStackedBarGroup";

/** Props for the ChartHeader child component */
interface ChartHeaderConfig {
  title?: string;
  subtitle?: string;
}

/** Props for the ChartLegend child component */
interface ChartLegendConfig {
  items?: ChartLegendItem[];
}

/** Props for the VerticalStackedBarGroup child component */
interface BarGroupConfig {
  showTopLabels?: boolean;
  showCategoryLabels?: boolean;
  showYAxis?: boolean;
  showAvgLine?: boolean;
  yAxisTickCount?: number;
  valueFormat?: ValueFormatConfig;
  formatYAxisValue?: (value: number) => string;
  formatAvgValue?: (value: number) => string;
  barWidth?: string;
  hoverType?: StackedBarHoverType;
  showHoverBadge?: boolean;
  formatHoverValue?: (value: number, label?: string) => string;
  onBarHover?: (data: VerticalStackedBarHoverData) => void;
  onBarClick?: (data: VerticalStackedBarHoverData) => void;
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
  formatHoverLeadValue?: (value: number, category?: string, segmentIndex?: number) => string;
  formatHoverBadgeValue?: (value: number, category?: string, segmentIndex?: number) => string;
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

interface VerticalStackedBarChartProps {
  // Layer 2: Parent component props
  /**
   * Supports canonical format (ChartSeriesDataPoint[]) or legacy format (StackedBarDataPoint[])
   */
  data: ChartSeriesDataPoint[] | StackedBarDataPoint[];
  seriesOrder?: string[]; // Control segment stacking order for canonical format
  width?: number | string;
  height?: number | string;
  showHeader?: boolean;
  showFooter?: boolean;
  showLegend?: boolean;
  showDataDisplay?: boolean; // Show DataDisplay component above bars
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

| Prop              | Type                                              | Default | Description                                                                   |
| ----------------- | ------------------------------------------------- | ------- | ----------------------------------------------------------------------------- |
| `data`            | `ChartSeriesDataPoint[] \| StackedBarDataPoint[]` | `[]`    | Array of data points (canonical or legacy format)                             |
| `seriesOrder`     | `string[]`                                        | -       | Control segment stacking order for canonical format                           |
| `width`           | `number \| string`                                | `328`   | Total width of the chart                                                      |
| `height`          | `number \| string`                                | `400`   | **Total height of the chart.** VerticalStackedBarGroup fills remaining space. |
| `showHeader`      | `boolean`                                         | `true`  | Show/hide the chart header                                                    |
| `showFooter`      | `boolean`                                         | `true`  | Show/hide the chart footer                                                    |
| `showLegend`      | `boolean`                                         | `true`  | Show/hide the chart legend                                                    |
| `showDataDisplay` | `boolean`                                         | `false` | Show DataDisplay component above the bar group                                |
| `interactive`     | `boolean`                                         | `true`  | Enable hover/click interactivity on bars                                      |

### ChartHeader Config (`chartHeader`)

| Prop       | Type     | Default                       | Description         |
| ---------- | -------- | ----------------------------- | ------------------- |
| `title`    | `string` | `"This is chart title."`      | Chart title text    |
| `subtitle` | `string` | `"This is chart subtitle..."` | Chart subtitle text |

### ChartLegend Config (`chartLegend`)

| Prop    | Type                | Default     | Description                                     |
| ------- | ------------------- | ----------- | ----------------------------------------------- |
| `items` | `ChartLegendItem[]` | `undefined` | Manual legend items (overrides auto-generation) |

### BarGroup Config (`barGroup`)

| Prop                 | Type                                        | Default     | Description                                                                                 |
| -------------------- | ------------------------------------------- | ----------- | ------------------------------------------------------------------------------------------- |
| `showTopLabels`      | `boolean`                                   | `false`     | Show value labels above bars                                                                |
| `showCategoryLabels` | `boolean`                                   | `true`      | Show category labels below bars                                                             |
| `showYAxis`          | `boolean`                                   | `true`      | Show Y-axis with tick marks                                                                 |
| `showAvgLine`        | `boolean`                                   | `false`     | Show horizontal average line                                                                |
| `yAxisTickCount`     | `number`                                    | `6`         | Target number of Y-axis ticks                                                               |
| `valueFormat`        | `ValueFormatConfig`                         | `undefined` | Value format configuration                                                                  |
| `formatYAxisValue`   | `(value: number) => string`                 | `undefined` | Custom formatter for Y-axis labels                                                          |
| `formatAvgValue`     | `(value: number) => string`                 | `undefined` | Custom formatter for average value                                                          |
| `barWidth`           | `string`                                    | `"M"`       | T-shirt sizing: XS, S, M, L, XL, 2XL                                                        |
| `hoverType`          | `"group" \| "individual" \| "categorical"`  | `"group"`   | Hover type: group (all segments), individual, or categorical (same segment across all bars) |
| `showHoverBadge`     | `boolean`                                   | `false`     | Show hover badge with value on bar hover                                                    |
| `formatHoverValue`   | `(value: number, label?: string) => string` | `undefined` | Custom formatter for hover badge display                                                    |
| `onBarHover`         | `function`                                  | `undefined` | Callback fired when any bar hover state changes                                             |
| `onBarClick`         | `function`                                  | `undefined` | Callback fired when any bar is clicked                                                      |
| `hoveredBarIndex`    | `number`                                    | `undefined` | Index of the currently hovered bar (for controlled hover)                                   |

### ChartFooter Config (`chartFooter`)

| Prop     | Type     | Default               | Description                  |
| -------- | -------- | --------------------- | ---------------------------- |
| `source` | `string` | `"Source: jio.com."`  | Source attribution in footer |
| `notes`  | `string` | `"Additional notes."` | Notes text in footer         |

### DataDisplay Config (`dataDisplay`)

| Prop                      | Type                                                                  | Default               | Description                                                          |
| ------------------------- | --------------------------------------------------------------------- | --------------------- | -------------------------------------------------------------------- |
| `mode`                    | `"static" \| "hover"`                                                 | `"static"`            | Display mode: static uses provided values, hover updates dynamically |
| `label`                   | `string`                                                              | `"Label."`            | Main label text above the data value                                 |
| `showLabelIcon`           | `boolean`                                                             | `false`               | Whether to show info icon next to the main label                     |
| `leadValue`               | `string`                                                              | `"£2,390"`            | Lead value for static mode or default in hover mode                  |
| `supportingValue`         | `string`                                                              | `"/ 3,000"`           | Supporting value next to lead value                                  |
| `showSupportingValue`     | `boolean`                                                             | `true`                | Whether to show supporting value                                     |
| `supportingLabel`         | `string`                                                              | `"Supporting label."` | Supporting label text below the values                               |
| `showSupportingLabel`     | `boolean`                                                             | `true`                | Whether to show supporting label                                     |
| `showSupportingLabelIcon` | `boolean`                                                             | `false`               | Whether to show icon in supporting label                             |
| `showContentRight`        | `boolean`                                                             | `true`                | Whether to show the semantic badge                                   |
| `badgeValue`              | `string`                                                              | `"23.5"`              | Badge value for static mode                                          |
| `badgeAutoDetect`         | `boolean`                                                             | `true`                | Auto-detect semantic mode from value                                 |
| `badgeSemanticMode`       | `"positive" \| "negative" \| "warning"`                               | `"positive"`          | Manual semantic mode when autoDetect is false                        |
| `showBadgeIcon`           | `boolean`                                                             | `true`                | Whether to show chevron icon in badge                                |
| `size`                    | `"S" \| "M" \| "L"`                                                   | `"L"`                 | Typography size variant                                              |
| `type`                    | `"Left" \| "Centered"`                                                | `"Left"`              | Layout type: horizontal or vertical                                  |
| `formatHoverLeadValue`    | `(value: number, category?: string, segmentIndex?: number) => string` | `undefined`           | Custom formatter for lead value in hover mode                        |
| `formatHoverBadgeValue`   | `(value: number, category?: string, segmentIndex?: number) => string` | `undefined`           | Custom formatter for badge value in hover mode                       |

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
VerticalStackedBarChart (flex container, vertical layout)
├── ChartHeader (conditional, when showHeader=true)
│   ├── ChartTitle
│   └── ChartSubtitle
├── ChartLegend (conditional, when showLegend=true)
│   └── ChartKey[] (6 items for categorical colors)
│       ├── Circle indicator (categorical color)
│       └── Label
├── DataDisplay (conditional, when showDataDisplay=true)
│   ├── contentLeft
│   │   ├── mainLabel (ChartBody + optional InfoIcon)
│   │   └── DataHead (DataLead + DataSupporting + SupportingLabel)
│   └── contentRight (DataBadgeSemantic)
├── VerticalStackedBarGroup
│   ├── YAxis (optional, when showYAxis=true)
│   │   └── ChartAxisTick (for each tick value)
│   ├── AvgLine (optional, when showAvgLine=true)
│   └── contentWrapper (flex, space-between)
│       └── VerticalStackedBar[] (D3-scaled heights)
│           ├── topOutsideLabel (optional total)
│           ├── stackedBars (pill radius container)
│           │   └── shapeRect[1-6] (colored segments)
│           └── categoryLabel
└── ChartFooter (conditional, when showFooter=true)
    ├── ChartBody (source)
    └── ChartBody (notes)
```

## Hover Interaction

The chart supports hover interaction with automatic dimming of non-hovered bars.

### Color & Opacity States

| State                              | Color Token                 | Opacity | Description                   |
| ---------------------------------- | --------------------------- | ------- | ----------------------------- |
| **Default** (nothing hovered)      | `categorical/bold/{index}`  | `1`     | Original vibrant colors       |
| **Highlighted** (this bar hovered) | `categorical/bold/{index}`  | `1`     | Stays vibrant                 |
| **Dimmed** (another bar hovered)   | `categorical/hover/{index}` | `0.2`   | Muted color + reduced opacity |

### Hover Types

| Type            | Description                                                                                                                          |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `"group"`       | All segments in a bar highlight together; other bars dim                                                                             |
| `"individual"`  | Only the hovered segment highlights; other segments and bars dim                                                                     |
| `"categorical"` | Same segment index across ALL bars highlights together; e.g., hovering on "Product A" in any bar highlights all "Product A" segments |

### Transition Tokens

All hover transitions use design tokens from the `hoverTransition` collection:

- **Easing**: `"easing"` - Cubic-bezier timing function
- **Duration**: `"duration"` - Transition time (e.g., 200ms for "Moderate" mode)
- **Dim Opacity**: `"dimOpacity"` - Opacity for dimmed bars (default: 0.2)

### Hover Badge

The chart can display a hover badge that follows the mouse cursor when hovering over bars. The badge content is determined by the `hoverType`.

#### Default Badge Content by Hover Type

| Hover Type    | Badge Displays          | Example       |
| ------------- | ----------------------- | ------------- |
| `individual`  | The segment value       | `"45"`        |
| `group`       | The category label      | `"January"`   |
| `categorical` | The series/segment name | `"Product A"` |

#### Usage Examples

##### Individual Mode (shows segment value)

```tsx
<VerticalStackedBarChart
  data={data}
  interactive={true}
  hoverType="individual"
  barGroup={{
    showHoverBadge: true,
  }}
  modes={modes}
/>
```

##### Group Mode (shows category label)

```tsx
<VerticalStackedBarChart
  data={data}
  interactive={true}
  hoverType="group"
  barGroup={{
    showHoverBadge: true,
  }}
  modes={modes}
/>
```

##### Categorical Mode (shows series name)

```tsx
<VerticalStackedBarChart
  data={data}
  interactive={true}
  hoverType="categorical"
  barGroup={{
    showHoverBadge: true,
  }}
  modes={modes}
/>
```

##### Custom Formatter

```tsx
<VerticalStackedBarChart
  data={data}
  interactive={true}
  hoverType="individual"
  barGroup={{
    showHoverBadge: true,
    formatHoverValue: (value, label) => `$${(value / 1000).toFixed(1)}K`,
  }}
  modes={modes}
/>
```

## Usage Examples

### Basic Usage (Organized Props)

```tsx
import VerticalStackedBarChart from "./charts/VerticalStackedBarChart";

const data = [
  {
    label: "Jan",
    segments: [
      { value: 30, label: "Product A" },
      { value: 25, label: "Product B" },
      { value: 20, label: "Product C" },
    ],
  },
  {
    label: "Feb",
    segments: [
      { value: 35, label: "Product A" },
      { value: 30, label: "Product B" },
      { value: 15, label: "Product C" },
    ],
  },
];

<VerticalStackedBarChart data={data} />;
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

<VerticalStackedBarChart
  data={data}
  width={400}
  height={300}
  showHeader={true}
  showFooter={true}
  showLegend={true}
  chartHeader={{
    title: "Monthly Revenue by Product",
    subtitle: "Q1 2024 Performance Overview",
  }}
  barGroup={{
    showTopLabels: true,
    showYAxis: true,
    barWidth: "M",
  }}
  chartFooter={{
    source: "Source: Finance Team",
    notes: "*In thousands USD",
  }}
  modes={modes}
/>;
```

### With DataDisplay (Static Mode)

```tsx
<VerticalStackedBarChart
  data={data}
  showDataDisplay={true}
  chartHeader={{
    title: "Monthly Revenue",
    subtitle: "Stacked by product category",
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

DataDisplay updates dynamically when hovering over segments:

```tsx
<VerticalStackedBarChart
  data={data}
  showDataDisplay={true}
  interactive={true}
  hoverType="individual"
  chartHeader={{
    title: "Monthly Revenue",
  }}
  dataDisplay={{
    mode: "hover",
    label: "Hover a segment to see details",
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
<VerticalStackedBarChart
  data={data}
  showDataDisplay={true}
  interactive={true}
  hoverType="individual"
  dataDisplay={{
    mode: "hover",
    label: "Select a segment",
    formatHoverLeadValue: (value, category, segmentIndex) =>
      `Segment ${segmentIndex}: £${value.toLocaleString()}`,
    formatHoverBadgeValue: (value) => {
      const percent = ((value / totalRevenue) * 100).toFixed(1);
      return `${percent}%`;
    },
  }}
  modes={modes}
/>
```

### Without Header

```tsx
<VerticalStackedBarChart
  data={data}
  showHeader={false}
  showFooter={true}
  showLegend={true}
  modes={modes}
/>
```

### Without Footer

```tsx
<VerticalStackedBarChart
  data={data}
  showHeader={true}
  showFooter={false}
  showLegend={true}
  chartHeader={{
    title: "Standalone Chart",
  }}
  modes={modes}
/>
```

### Bars Only

```tsx
<VerticalStackedBarChart
  data={data}
  showHeader={false}
  showFooter={false}
  showLegend={false}
  height={240}
  modes={modes}
/>
```

### With Y-Axis and Average Line

```tsx
<VerticalStackedBarChart
  data={data}
  height={300}
  chartHeader={{
    title: "Performance Dashboard",
  }}
  barGroup={{
    showYAxis: true,
    showAvgLine: true,
    yAxisTickCount: 6,
  }}
  modes={modes}
/>
```

### With Custom Formatters

```tsx
<VerticalStackedBarChart
  data={revenueData}
  chartHeader={{
    title: "Revenue Overview",
  }}
  barGroup={{
    showYAxis: true,
    showTopLabels: true,
    showAvgLine: true,
    formatYAxisValue: (value) => `$${(value / 1000).toFixed(1)}K`,
    formatAvgValue: (value) => `Avg: $${(value / 1000).toFixed(1)}K`,
  }}
  modes={modes}
/>
```

### Percentage Stacked Chart

```tsx
const percentageData = [
  { label: "2021", segments: [...], totalLabel: "100%" },
  { label: "2022", segments: [...], totalLabel: "100%" },
];

<VerticalStackedBarChart
  data={percentageData}
  chartHeader={{
    title: "Market Share",
  }}
  barGroup={{
    showTopLabels: true,
    formatYAxisValue: (value) => `${value}%`,
  }}
  modes={modes}
/>
```

### Custom Legend Items

```tsx
<VerticalStackedBarChart
  data={data}
  showLegend={true}
  chartHeader={{
    title: "Sales Mix",
  }}
  chartLegend={{
    items: [
      { label: "Online Sales", color: "#ff671f" },
      { label: "Retail Sales", color: "#3900ad" },
      { label: "Wholesale", color: "#465aff" },
    ],
  }}
  modes={modes}
/>
```

### Dark Mode

```tsx
<VerticalStackedBarChart
  data={data}
  chartHeader={{
    title: "Dark Mode Chart",
  }}
  modes={{
    ...modes,
    colourMode: "Dark",
  }}
/>
```

### Full Width

```tsx
<VerticalStackedBarChart
  data={data}
  height={300}
  chartHeader={{
    title: "Responsive Chart",
  }}
  modes={{
    ...modes,
    fullWidth: true,
  }}
/>
```

## Migration from Flat Props

### Before (Flat Props - Deprecated)

```tsx
<VerticalStackedBarChart
  title="Monthly Revenue"
  subtitle="Q1 2024 Overview"
  source="Source: Finance"
  notes="*In thousands"
  data={data}
  width={400}
  height={300}
  showHeader={true}
  showFooter={true}
  showLegend={true}
  showTopLabels={true}
  showYAxis={true}
  barWidth="M"
  modes={modes}
/>
```

### After (Organized Props)

```tsx
<VerticalStackedBarChart
  data={data}
  width={400}
  height={300}
  showHeader={true}
  showFooter={true}
  showLegend={true}
  chartHeader={{
    title: "Monthly Revenue",
    subtitle: "Q1 2024 Overview",
  }}
  barGroup={{
    showTopLabels: true,
    showYAxis: true,
    barWidth: "M",
  }}
  chartFooter={{
    source: "Source: Finance",
    notes: "*In thousands",
  }}
  modes={modes}
/>
```

## Height Behavior

The `height` prop controls the **total chart height**, not just the bar group. The VerticalStackedBarGroup automatically stretches to fill the remaining space after header, legend, DataDisplay, and footer.

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
│ VerticalStackedBarGroup (flex: 1, fills)│
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
<VerticalStackedBarChart
  data={data}
  height={500}
  showHeader={true}
  showFooter={true}
/>

// Compact 280px chart for dashboards
<VerticalStackedBarChart
  data={data}
  height={280}
  showHeader={true}
  showFooter={false}
  showLegend={false}
/>

// Bars only - fills full height
<VerticalStackedBarChart
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

| Property           | Variable Name             | Fallback | Description                               |
| ------------------ | ------------------------- | -------- | ----------------------------------------- |
| Section Gap        | `"Dimensions/Spacings/L"` | `20px`   | Gap between header, legend, chart, footer |
| Categorical Colors | `"categorical/bold/1-6"`  | Various  | Colors for legend and segments            |

## Legend Auto-Generation

When `showLegend` is `true` and no `chartLegend.items` are provided, the component auto-generates legend items:

1. **From segment labels**: Uses the first category's segment labels and categorical colors
2. **From segment colors**: Uses custom colors if provided on segments
3. **Default**: Creates 6 items with "Category name" labels and `categorical/bold/1-6` colors

This ensures the legend matches the stacked bar colors.

## Child Components

| Component                 | Config Prop   | File                            | Description                |
| ------------------------- | ------------- | ------------------------------- | -------------------------- |
| `ChartHeader`             | `chartHeader` | `./ChartHeader.tsx`             | Title and subtitle         |
| `ChartLegend`             | `chartLegend` | `./ChartLegend.tsx`             | Legend with ChartKey items |
| `VerticalStackedBarGroup` | `barGroup`    | `./VerticalStackedBarGroup.tsx` | Bar group with D3 scaling  |
| `ChartFooter`             | `chartFooter` | `./ChartFooter.tsx`             | Source and notes           |

## Comparison with VerticalBarChart

| Feature          | VerticalBarChart | VerticalStackedBarChart   |
| ---------------- | ---------------- | ------------------------- |
| Segments per bar | 1                | Up to 6                   |
| Data structure   | `DataPoint[]`    | `StackedBarDataPoint[]`   |
| Legend default   | Single item      | 6 categorical items       |
| Negative values  | Supported        | Not supported             |
| Use case         | Simple values    | Part-to-whole comparisons |

## DataDisplay Integration

This chart supports an optional DataDisplay component positioned between ChartLegend and the group component. See **[DataDisplay Integration](./DataDisplayIntegration.md)** for full configuration including static/hover modes, custom formatters, and requirements.

**Note**: For this chart, formatters receive `(value: number, category?: string, segmentIndex?: number)` where `segmentIndex` identifies which segment (0-5) was hovered.

## Accessibility

Wrapped by `ChartAccessibility` (enabled by default). Provides ARIA attributes, auto-generated summaries, and hidden data tables. See **[ChartAccessibility.md](./ChartAccessibility.md)** for configuration.

## Performance Notes

- Uses `useMemo` for mode mapping and legend generation
- Token resolution benefits from `resolvedCache`

## Related Documentation

- [OrganizedPropsPattern.md](./OrganizedPropsPattern.md) - Pattern documentation
- [VerticalStackedBarGroup.md](./VerticalStackedBarGroup.md) - Bar group component
- [ChartHeader.md](./ChartHeader.md) - Header component
- [ChartFooter.md](./ChartFooter.md) - Footer component
- [ChartLegend.md](./ChartLegend.md) - Legend component
- [DataDisplay.md](./DataDisplay.md) - DataDisplay component

## Files

| File                                     | Description                   |
| ---------------------------------------- | ----------------------------- |
| `src/charts/VerticalStackedBarChart.tsx` | Main component implementation |
