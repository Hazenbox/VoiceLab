# VerticalBarChart

## Overview

A complete vertical bar chart component that composes `ChartHeader`, `ChartLegend`, `DataDisplay`, `VerticalBarGroup`, and `ChartFooter` into a cohesive data visualization. Uses D3 for scaling and the design token resolver for consistent styling.

**This component follows the [Organized Props Pattern](./OrganizedPropsPattern.md).**

## Figma Reference

- **Node ID**: `41:1436`
- **Design File**: DataVis-Components
- **Figma URL**: https://www.figma.com/design/uA5ExvS0cNXbDEKzT9Rnrt/DataVis-Components?node-id=41-1436

## Architecture

```
VerticalBarChart (flex container, vertical layout)
├── ChartHeader (conditional, when showHeader=true)
│   ├── ChartTitle
│   └── ChartSubtitle
├── ChartLegend (conditional, when showLegend=true)
│   └── ChartKey[] (auto-generated or manual)
│       ├── Indicator (circle, line, or dashed)
│       └── Label + optional DataHead
├── DataDisplay (conditional, when showDataDisplay=true)
│   ├── contentLeft
│   │   ├── mainLabel (ChartBody + optional InfoIcon)
│   │   └── DataHead (DataLead + DataSupporting + SupportingLabel)
│   └── contentRight (DataBadgeSemantic)
├── VerticalBarGroup (flex-grow)
│   ├── YAxis (optional, when showYAxis=true)
│   │   └── ChartAxisTick (for each tick value)
│   └── contentWrapper (flex, space-between)
│       └── VerticalBar[] (D3-scaled heights)
│           ├── ChartBody (topLabel)
│           ├── ShapeRect (bar)
│           └── ChartBody (bottomLabel)
└── ChartFooter (conditional, when showFooter=true)
    ├── ChartBody (source)
    └── ChartBody (notes)
```

## Import

```tsx
import VerticalBarChart from "./charts/VerticalBarChart";
```

## Data Formats

### ChartDataPoint (Canonical - Recommended)

```tsx
import { ChartDataPoint } from "../types/chart-data";

interface ChartDataPoint {
  id?: string; // Unique identifier for React keys
  category: string; // Category label (e.g., "Jan")
  value: number; // Numeric value for bar height
  color?: string; // Optional custom color for the bar
  colorIndex?: number; // Categorical color index (1-6)
}
```

### DataPoint (Legacy - Deprecated)

```tsx
/**
 * @deprecated Use ChartDataPoint from '../types/chart-data' instead.
 */
interface DataPoint {
  label: string; // Category label (e.g., "Jan")
  value: number; // Numeric value for bar height
  color?: string; // Optional custom color for the bar
}
```

> **Migration Note**: See `docs/DATA-FORMAT.md` for full specification and migration guide.

## Props Interface (Organized Props Pattern)

```tsx
import { DataPoint } from "./VerticalBarGroup";
import { ChartDataPoint } from "../types/chart-data";
import { ChartLegendItem } from "./ChartLegend";

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

/** Hover event data passed to callbacks */
export type { VerticalBarHoverData } from "../components/VerticalBarGroup";

/** Props for the VerticalBarGroup child component */
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
  /** Callback fired when any bar hover state changes */
  onBarHover?: (data: VerticalBarHoverData) => void;
  /** Callback fired when any bar is clicked */
  onBarClick?: (data: VerticalBarHoverData) => void;
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

interface VerticalBarChartProps {
  // Layer 2: Parent component props
  /**
   * Supports both canonical format (ChartDataPoint[]) and legacy format (DataPoint[]).
   * Canonical format (recommended): { category, value, color?, colorIndex? }
   * Legacy format (deprecated): { label, value, color?, colorIndex? }
   */
  data: ChartDataPoint[] | DataPoint[];
  width?: number | string;
  height?: number | string;
  showHeader?: boolean;
  showFooter?: boolean;
  showLegend?: boolean;
  /** Whether to show the DataDisplay component above the bar group */
  showDataDisplay?: boolean;
  /** Enable hover/click interactivity on bars (default: true) */
  interactive?: boolean;

  // Layer 3: Child component configurations
  chartHeader?: ChartHeaderConfig;
  chartLegend?: ChartLegendConfig;
  /** Configuration for DataDisplay: { mode, label, leadValue, badgeValue, ... } */
  dataDisplay?: DataDisplayConfig;
  barGroup?: BarGroupConfig;
  chartFooter?: ChartFooterConfig;

  // Layer 1: Global modes
  modes?: GlobalModes;
}
```

## Props

### Parent Component Props (Layer 2)

| Prop              | Type                              | Default | Description                                                                          |
| ----------------- | --------------------------------- | ------- | ------------------------------------------------------------------------------------ |
| `data`            | `ChartDataPoint[] \| DataPoint[]` | `[]`    | Array of data points (canonical or legacy)                                           |
| `width`           | `number \| string`                | `328`   | Total width of the chart                                                             |
| `height`          | `number \| string`                | `400`   | **Total height of the chart.** VerticalBarGroup automatically fills remaining space. |
| `showHeader`      | `boolean`                         | `true`  | Show/hide the chart header                                                           |
| `showFooter`      | `boolean`                         | `true`  | Show/hide the chart footer                                                           |
| `showLegend`      | `boolean`                         | `false` | Show/hide the chart legend                                                           |
| `showDataDisplay` | `boolean`                         | `false` | Show/hide DataDisplay component above the bar group                                  |
| `interactive`     | `boolean`                         | `true`  | Enable hover/click interactivity on bars                                             |

### ChartHeader Config (`chartHeader`)

| Prop       | Type     | Default                       | Description         |
| ---------- | -------- | ----------------------------- | ------------------- |
| `title`    | `string` | `"This is chart title."`      | Chart title text    |
| `subtitle` | `string` | `"This is chart subtitle..."` | Chart subtitle text |

### ChartLegend Config (`chartLegend`)

| Prop                  | Type                             | Default     | Description                                     |
| --------------------- | -------------------------------- | ----------- | ----------------------------------------------- |
| `items`               | `ChartLegendItem[]`              | `undefined` | Manual legend items (overrides auto-generation) |
| `label`               | `string`                         | `undefined` | Simple legend label for single-series charts    |
| `type`                | `"circle" \| "dashed" \| "line"` | `"circle"`  | Indicator type for legend (when using label)    |
| `showDataHead`        | `boolean`                        | `false`     | Whether to show DataHead in legend              |
| `leadValue`           | `string`                         | `undefined` | Lead value for DataHead (e.g., "£2,390")        |
| `supportingValue`     | `string`                         | `undefined` | Supporting value for DataHead (e.g., "/ 3,000") |
| `supportingLabelText` | `string`                         | `undefined` | Supporting label text for DataHead              |
| `showDataSupporting`  | `boolean`                        | `true`      | Whether to show DataSupporting in DataHead      |
| `showSupportingLabel` | `boolean`                        | `true`      | Whether to show SupportingLabel in DataHead     |

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

### BarGroup Config (`barGroup`)

| Prop                 | Type                                        | Default     | Description                                           |
| -------------------- | ------------------------------------------- | ----------- | ----------------------------------------------------- |
| `showTopLabels`      | `boolean`                                   | `false`     | Show value labels above bars                          |
| `showCategoryLabels` | `boolean`                                   | `true`      | Show category labels below bars                       |
| `showYAxis`          | `boolean`                                   | `false`     | Show Y-axis with tick marks on the left               |
| `showAvgLine`        | `boolean`                                   | `false`     | Show average line across chart                        |
| `showHoverBadge`     | `boolean`                                   | `false`     | Show DataBadge that follows cursor when hovering bars |
| `yAxisTickCount`     | `number`                                    | `6`         | Target number of Y-axis ticks                         |
| `valueFormat`        | `ValueFormatConfig`                         | `undefined` | Auto-format for all chart values                      |
| `formatYAxisValue`   | `(value: number) => string`                 | `undefined` | Custom formatter for Y-axis tick labels               |
| `formatAvgValue`     | `(value: number) => string`                 | `undefined` | Custom formatter for average line value               |
| `formatHoverValue`   | `(value: number, label?: string) => string` | `undefined` | Custom formatter for hover badge value                |
| `barWidth`           | `string`                                    | `"M"`       | T-shirt sizing: XS, S, M, L, XL, 2XL                  |
| `onBarHover`         | `(data: VerticalBarHoverData) => void`      | `undefined` | Callback fired when bar hover state changes           |
| `onBarClick`         | `(data: VerticalBarHoverData) => void`      | `undefined` | Callback fired when bar is clicked                    |
| `hoveredBarIndex`    | `number`                                    | `undefined` | Index of currently hovered bar (controlled state)     |

### ChartFooter Config (`chartFooter`)

| Prop     | Type     | Default               | Description                  |
| -------- | -------- | --------------------- | ---------------------------- |
| `source` | `string` | `"Source: jio.com."`  | Source attribution in footer |
| `notes`  | `string` | `"Additional notes."` | Notes text in footer         |

### Global Modes (`modes`) (Layer 1)

| Mode Prop     | Figma Collection  | Available Values                                                                                                          |
| ------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `Brand`       | `"10 Brand"`      | `"Jio"` (entry point for token resolution)                                                                                |
| `Platform`    | `"7 Platform"`    | `"S [Mobile 360]"`, `"M [Tablet portrait 768]"`, `"M [Tablet landscape 1024]"`, `"L [Laptop 1440]"`, `"L [Desktop 1920]"` |
| `Density`     | `"6 Density"`     | `"Default"`, `"Compact"`, `"Open"`                                                                                        |
| `colourTheme` | `"9 Theme"`       | `"MyJio"`, `"Test Brand"`, `"JioFinance"`                                                                                 |
| `colourMode`  | `"5 Colour Mode"` | `"Light"`, `"Dark"`                                                                                                       |
| `fullWidth`   | -                 | `true`, `false` - When true, chart fills 100% width                                                                       |

## Usage Examples

### Canonical Format (Recommended)

```tsx
import VerticalBarChart, { ChartDataPoint } from "./charts/VerticalBarChart";

const data: ChartDataPoint[] = [
  { id: "jan", category: "Jan", value: 120 },
  { id: "feb", category: "Feb", value: 180 },
  { id: "mar", category: "Mar", value: 90 },
  { id: "apr", category: "Apr", value: 240 },
];

<VerticalBarChart data={data} />;
```

### Legacy Format (Still Supported)

```tsx
import VerticalBarChart from "./charts/VerticalBarChart";

const data = [
  { label: "Jan", value: 120 },
  { label: "Feb", value: 180 },
  { label: "Mar", value: 90 },
  { label: "Apr", value: 240 },
];

<VerticalBarChart data={data} />;
```

### Full Configuration (Organized Props)

```tsx
const modes = {
  Platform: "L [Laptop 1440]",
  Density: "Default",
  colourTheme: "MyJio",
  colourMode: "Light",
  Brand: "Jio",
};

<VerticalBarChart
  data={data}
  width={400}
  height={400}
  showHeader={true}
  showFooter={true}
  showLegend={true}
  chartHeader={{
    title: "Monthly Revenue",
    subtitle: "Q1 2024 Performance Overview",
  }}
  chartLegend={{
    label: "Revenue",
  }}
  barGroup={{
    showTopLabels: true,
    showCategoryLabels: true,
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
<VerticalBarChart
  data={data}
  showDataDisplay={true}
  chartHeader={{
    title: "Monthly Revenue",
    subtitle: "Q1 2024 Performance",
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
<VerticalBarChart
  data={data}
  showDataDisplay={true}
  interactive={true}
  chartHeader={{
    title: "Monthly Revenue",
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
<VerticalBarChart
  data={data}
  showDataDisplay={true}
  interactive={true}
  dataDisplay={{
    mode: "hover",
    label: "Select a bar",
    formatHoverLeadValue: (value, category) => `£${value.toLocaleString()}`,
    formatHoverBadgeValue: (value) => {
      const percent = ((value / totalRevenue) * 100).toFixed(1);
      return `${percent}%`;
    },
  }}
  modes={modes}
/>
```

### Chart Without Header

```tsx
<VerticalBarChart
  data={data}
  showHeader={false}
  showFooter={true}
  chartFooter={{
    source: "Source: Analytics",
  }}
  modes={modes}
/>
```

### Chart Without Footer

```tsx
<VerticalBarChart
  data={data}
  showHeader={true}
  showFooter={false}
  chartHeader={{
    title: "Standalone Chart",
    subtitle: "No footer displayed",
  }}
  modes={modes}
/>
```

### Bars Only (No Header/Footer)

```tsx
<VerticalBarChart data={data} showHeader={false} showFooter={false} height={240} modes={modes} />
```

### With Y-Axis

```tsx
<VerticalBarChart
  data={gdpData}
  height={300}
  chartHeader={{
    title: "GDP by Country",
    subtitle: "In trillion Euros",
  }}
  barGroup={{
    showYAxis: true,
    yAxisTickCount: 4,
  }}
  modes={modes}
/>
```

### With Y-Axis and Custom Format

```tsx
<VerticalBarChart
  data={revenueData}
  height={300}
  chartHeader={{
    title: "Revenue Overview",
  }}
  barGroup={{
    showYAxis: true,
    yAxisTickCount: 5,
    formatYAxisValue: (value) => `$${value}K`,
  }}
  modes={modes}
/>
```

### Full Width

```tsx
<VerticalBarChart
  data={data}
  chartHeader={{
    title: "Full Width Chart",
    subtitle: "Expands to fill container",
  }}
  modes={{
    ...modes,
    fullWidth: true,
  }}
/>
```

### Dark Mode

```tsx
<VerticalBarChart
  data={data}
  chartHeader={{
    title: "Dark Mode Chart",
    subtitle: "With dark theme",
  }}
  modes={{
    ...modes,
    colourMode: "Dark",
  }}
/>
```

### With Legend (Simple Label)

```tsx
<VerticalBarChart
  data={data}
  showLegend={true}
  chartHeader={{
    title: "Monthly Revenue",
    subtitle: "With legend for data series",
  }}
  chartLegend={{
    label: "Revenue",
  }}
  modes={modes}
/>
```

### With Legend (Auto-Generated from Custom Colors)

```tsx
const coloredData = [
  { label: "Profit", value: 150, color: "#22C55E" },
  { label: "Loss", value: -80, color: "#EF4444" },
  { label: "Breakeven", value: 10, color: "#22C55E" },
];

<VerticalBarChart
  data={coloredData}
  showLegend={true}
  chartHeader={{
    title: "Profit & Loss",
    subtitle: "Legend auto-generated from unique colors",
  }}
  modes={modes}
/>;
```

### With Legend (Manual Items)

```tsx
<VerticalBarChart
  data={data}
  showLegend={true}
  chartHeader={{
    title: "Sales vs Target",
    subtitle: "Custom legend items with different indicator types",
  }}
  chartLegend={{
    items: [
      { label: "Actual Sales", type: "circle" },
      { label: "Target", type: "dashed" },
    ],
  }}
  barGroup={{
    showAvgLine: true,
  }}
  modes={modes}
/>
```

### With Legend and DataHead (Simple Props)

```tsx
<VerticalBarChart
  data={data}
  showLegend={true}
  chartHeader={{
    title: "Revenue Dashboard",
    subtitle: "Using simple legend props with DataHead enabled",
  }}
  chartLegend={{
    label: "Total Revenue",
    showDataHead: true,
    leadValue: "£1.2M",
    supportingValue: "/ £1.5M",
    supportingLabelText: "Target achieved",
  }}
  modes={modes}
/>
```

### With Legend and DataHead (Manual Items)

```tsx
<VerticalBarChart
  data={data}
  showLegend={true}
  chartHeader={{
    title: "Budget Overview",
    subtitle: "Legend with additional data metrics",
  }}
  chartLegend={{
    items: [
      {
        label: "Q1 Spend",
        showDataHead: true,
        leadValue: "£630K",
        supportingValue: "/ 800K",
        supportingLabelText: "Budget used",
      },
    ],
  }}
  modes={modes}
/>
```

### Custom Bar Colors

```tsx
const coloredData = [
  { label: "Success", value: 150, color: "#22C55E" },
  { label: "Warning", value: 80, color: "#F59E0B" },
  { label: "Error", value: 30, color: "#EF4444" },
];

<VerticalBarChart
  data={coloredData}
  chartHeader={{
    title: "Status Overview",
  }}
  barGroup={{
    showTopLabels: true,
    barWidth: "L",
  }}
  modes={modes}
/>;
```

### Different Bar Widths

```tsx
// Narrow bars for many data points
<VerticalBarChart
  data={monthlyData}
  width={600}
  barGroup={{
    barWidth: "XS",
  }}
  modes={modes}
/>

// Wide bars for few data points
<VerticalBarChart
  data={quarterlyData}
  width={300}
  barGroup={{
    barWidth: "XL",
  }}
  modes={modes}
/>
```

## Design Tokens Used

| Property | Variable Name             | Fallback | Description                    |
| -------- | ------------------------- | -------- | ------------------------------ |
| Gap      | `"Dimensions/Spacings/L"` | `20px`   | Spacing between chart sections |

## Legend Auto-Generation

When `showLegend` is `true` and no `chartLegend.items` are provided, the component auto-generates legend items:

1. **If `chartLegend.label` is provided**: Creates a single ChartKey with that label and the first bar's color (or `categorical/bold/1`)

2. **If data has custom colors**: Groups data by unique colors and creates a ChartKey for each unique color (max 6 items)

3. **Default behavior**: Creates a single ChartKey using the first data point's label and `categorical/bold/1` color

This ensures the legend stays connected to the actual chart data and colors.

## Height Behavior

The `height` prop controls the **total chart height**, not just the bar group. The VerticalBarGroup automatically stretches to fill the remaining space after header, legend, DataDisplay, and footer.

### How It Works

```
┌─────────────────────────────────────────┐
│ ChartHeader (natural height)            │
├─────────────────────────────────────────┤
│ ChartLegend (natural height, optional)  │
├─────────────────────────────────────────┤
│ DataDisplay (natural height, optional)  │
├─────────────────────────────────────────┤
│                                         │
│ VerticalBarGroup (flex: 1, fills rest)  │
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
<VerticalBarChart
  data={data}
  height={500}
  showHeader={true}
  showFooter={true}
/>

// Compact 250px chart for dashboards
<VerticalBarChart
  data={data}
  height={250}
  showHeader={true}
  showFooter={false}
/>

// Bars only - fills full height
<VerticalBarChart
  data={data}
  height={300}
  showHeader={false}
  showFooter={false}
/>
```

### Key Benefits

1. **Predictable sizing**: Chart always respects the specified height
2. **Automatic stretching**: Bar group expands to fill available space
3. **Consistent layouts**: Same chart height regardless of which sections are visible
4. **Responsive-friendly**: Use percentage heights for fluid layouts

## Hover Interaction

The VerticalBarChart supports hover interaction with automatic dimming of non-hovered bars.

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

### Enabling/Disabling Interactivity

The `interactive` prop at the parent level controls hover behavior.

```tsx
// Interactive (default) - bars have hover effects
<VerticalBarChart
  data={data}
  interactive={true}
  modes={modes}
/>

// Non-interactive - no hover effects
<VerticalBarChart
  data={data}
  interactive={false}
  modes={modes}
/>
```

### Using Callbacks

### Hover Callback Data

```typescript
interface VerticalBarHoverData {
  index?: number; // Data point index
  label?: string; // Category label
  value: number; // Data value
  isHovered: boolean; // Current hover state
  mouseX?: number; // Mouse X coordinate relative to chart container
  mouseY?: number; // Mouse Y coordinate relative to chart container
}
```

### Usage Examples

```tsx
// With hover callback
const [hoverData, setHoverData] = useState<VerticalBarHoverData | null>(null);

<VerticalBarChart
  data={data}
  barGroup={{
    showYAxis: true,
    onBarHover: setHoverData,
  }}
  modes={modes}
/>;

// Display hover info
{
  hoverData?.isHovered && (
    <Tooltip>
      {hoverData.label}: {hoverData.value}
    </Tooltip>
  );
}
```

```tsx
// With click callback
<VerticalBarChart
  data={data}
  barGroup={{
    onBarClick: (data) => {
      navigate(`/details/${data.index}`);
    },
  }}
  modes={modes}
/>
```

```tsx
// Controlled hover state
<VerticalBarChart
  data={data}
  barGroup={{
    hoveredBarIndex: 2, // Third bar always hovered
  }}
  modes={modes}
/>
```

### Hover Badge

The VerticalBarChart supports a cursor-following DataBadge that displays the value of the hovered bar.

#### Enabling Hover Badge

```tsx
<VerticalBarChart
  data={data}
  interactive={true} // Required for hover badge
  barGroup={{
    showHoverBadge: true,
  }}
  modes={modes}
/>
```

#### Custom Value Formatting

```tsx
// Using formatHoverValue for custom format
<VerticalBarChart
  data={data}
  barGroup={{
    showHoverBadge: true,
    formatHoverValue: (value, label) => `${label}: £${value.toLocaleString()}`,
  }}
  modes={modes}
/>

// Using valueFormat (applies to all chart values)
<VerticalBarChart
  data={data}
  barGroup={{
    showHoverBadge: true,
    valueFormat: { type: "currency", currency: "GBP" },
  }}
  modes={modes}
/>
```

#### How It Works

1. **Requires `interactive={true}`**: The hover badge only appears when interactivity is enabled (default)
2. **Smart positioning**: The DataBadge flips position based on cursor location relative to the chart's midpoint:
   - **Left half of chart**: Badge appears to the **right** of the cursor
   - **Right half of chart**: Badge appears to the **left** of the cursor
3. **Always visible**: This ensures the badge doesn't get cut off at the edges, even with long text values
4. **Inverted colourMode**: The DataBadge uses inverted colours for visibility:
   - **Light mode chart** → **Dark badge** (dark background, light text)
   - **Dark mode chart** → **Light badge** (light background, dark text)
5. **Value formatting**: Uses `formatHoverValue` if provided, otherwise falls back to `valueFormat` or raw value
6. **Modes inheritance**: The DataBadge inherits the chart's `modes` (except inverted colourMode) for proper theming

## DataDisplay Integration

This chart supports an optional DataDisplay component positioned between ChartLegend and the group component. See **[DataDisplay Integration](./DataDisplayIntegration.md)** for full configuration including static/hover modes, custom formatters, and requirements.

## Accessibility

Wrapped by `ChartAccessibility` (enabled by default). Provides ARIA attributes, auto-generated summaries, and hidden data tables. See **[ChartAccessibility.md](./ChartAccessibility.md)** for configuration.

## Child Components

| Component          | Config Prop   | File                     | Description                |
| ------------------ | ------------- | ------------------------ | -------------------------- |
| `ChartHeader`      | `chartHeader` | `./ChartHeader.tsx`      | Title and subtitle         |
| `ChartLegend`      | `chartLegend` | `./ChartLegend.tsx`      | Legend with ChartKey items |
| `VerticalBarGroup` | `barGroup`    | `./VerticalBarGroup.tsx` | Bar group with D3 scaling  |
| `ChartFooter`      | `chartFooter` | `./ChartFooter.tsx`      | Source and notes           |

## Migration from Flat Props

### Before (Flat Props - Deprecated)

```tsx
<VerticalBarChart
  title="Monthly Revenue"
  subtitle="Q1 2024 Overview"
  source="Source: Analytics"
  notes="*In thousands"
  data={data}
  width={400}
  height={300}
  showHeader={true}
  showFooter={true}
  showLegend={true}
  legendLabel="Revenue"
  legendShowDataHead={true}
  legendLeadValue="£1.2M"
  showTopLabels={true}
  showCategoryLabels={true}
  showYAxis={true}
  barWidth="M"
  modes={modes}
/>
```

### After (Organized Props)

```tsx
<VerticalBarChart
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
  chartLegend={{
    label: "Revenue",
    showDataHead: true,
    leadValue: "£1.2M",
  }}
  barGroup={{
    showTopLabels: true,
    showCategoryLabels: true,
    showYAxis: true,
    barWidth: "M",
  }}
  chartFooter={{
    source: "Source: Analytics",
    notes: "*In thousands",
  }}
  modes={modes}
/>
```

## Performance Notes

- Uses `useMemo` for mode mapping and legend generation
- Token resolution benefits from `resolvedCache`

## Related Documentation

- [OrganizedPropsPattern.md](./OrganizedPropsPattern.md) - Pattern documentation
- [VerticalBarGroup.md](./VerticalBarGroup.md) - Bar group component
- [ChartHeader.md](./ChartHeader.md) - Header component
- [ChartFooter.md](./ChartFooter.md) - Footer component
- [ChartLegend.md](./ChartLegend.md) - Legend component
- [DataDisplay.md](./DataDisplay.md) - DataDisplay component

## Files

| File                              | Description                   |
| --------------------------------- | ----------------------------- |
| `src/charts/VerticalBarChart.tsx` | Main component implementation |
