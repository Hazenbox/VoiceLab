# LineChart

## Overview

The LineChart component is a complete line chart visualization that combines ChartHeader, ChartLegend, DataDisplay, PathGroup, and ChartFooter components. It supports multiple series with automatic categorical coloring from Figma design tokens, making it ideal for trend visualization, time series data, and multi-series comparisons.

**This component follows the [Organized Props Pattern](./OrganizedPropsPattern.md).**

## Figma Reference

- **Node ID**: `133:3117`
- **Design File**: DataVis-Components
- **Figma URL**: https://www.figma.com/design/uA5ExvS0cNXbDEKzT9Rnrt/DataVis-Components?node-id=133-3117

## Architecture

```
LineChart
├── ChartHeader (optional)
│   ├── ChartTitle
│   └── ChartSubtitle
├── ChartLegend (optional)
│   └── ChartKey[] (one per series)
├── DataDisplay (optional, when showDataDisplay=true)
│   ├── contentLeft
│   │   ├── mainLabel (ChartBody + optional InfoIcon)
│   │   └── DataHead (DataLead + DataSupporting + SupportingLabel)
│   └── contentRight (DataBadgeSemantic)
├── PathGroup
│   ├── YAxis (optional)
│   ├── SVG
│   │   └── Paths
│   │       └── path[] (one per series)
│   ├── HoverLine (for hover mode)
│   └── XAxis (optional)
└── ChartFooter (optional)
    └── ChartBody[] (source, notes)
```

## Import

```tsx
import LineChart from "./charts/LineChart";
```

## Data Formats

### Canonical Format (Recommended)

```typescript
import { ChartSeriesDataPoint } from "../types/chart-data";

// Flat structure - each row is a data point
const data: ChartSeriesDataPoint[] = [
  { category: "Jan", series: "Revenue", value: 100 },
  { category: "Jan", series: "Expenses", value: 80 },
  { category: "Feb", series: "Revenue", value: 120 },
  { category: "Feb", series: "Expenses", value: 85 },
];
```

### Legacy Format (Still Supported)

```typescript
const data: PathGroupData = {
  categories: ["Jan", "Feb", "Mar"],
  series: [
    { name: "Revenue", values: [100, 120, 115] },
    { name: "Expenses", values: [80, 85, 90] },
  ],
};
```

> **Migration Note**: The component internally normalizes both formats. Legacy format will log a deprecation warning in development.

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
}

/** Props for the PathGroup child component */
interface PathGroupConfig {
  showYAxis?: boolean;
  showXAxis?: boolean;
  yAxisTickCount?: number;
  rounded?: boolean;
  curveStyle?: CurveStyle;
  valueFormat?: ValueFormatConfig;
  formatYAxisValue?: (value: number) => string;
}

/** Props for the ChartFooter child component */
interface ChartFooterConfig {
  source?: string;
  notes?: string;
}

/**
 * Props for the DataDisplay child component.
 * When mode is "hover", values update dynamically based on line hover state.
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
  formatHoverLeadValue?: (
    values: { seriesIndex: number; value: number }[],
    category?: string
  ) => string;
  formatHoverBadgeValue?: (
    values: { seriesIndex: number; value: number }[],
    category?: string
  ) => string;
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

interface LineChartProps {
  // Layer 2: Parent component props
  /**
   * Supports canonical format (ChartSeriesDataPoint[]) or legacy format (PathGroupData)
   */
  data: ChartSeriesDataPoint[] | PathGroupData;
  /** Order of series names (for canonical format) */
  seriesOrder?: string[];
  width?: number | string;
  height?: number | string;
  showHeader?: boolean;
  showFooter?: boolean;
  showLegend?: boolean;
  showDataDisplay?: boolean; // Show DataDisplay component above lines

  // Layer 3: Child component configurations
  chartHeader?: ChartHeaderConfig;
  chartLegend?: ChartLegendConfig;
  dataDisplay?: DataDisplayConfig; // Configuration for DataDisplay
  pathGroup?: PathGroupConfig;
  chartFooter?: ChartFooterConfig;

  // Layer 1: Global modes
  modes?: GlobalModes;
}
```

## Props

### Parent Component Props (Layer 2)

| Prop              | Type                                      | Default     | Description                                                     |
| ----------------- | ----------------------------------------- | ----------- | --------------------------------------------------------------- |
| `data`            | `ChartSeriesDataPoint[] \| PathGroupData` | (required)  | Chart data (canonical or legacy format)                         |
| `seriesOrder`     | `string[]`                                | `undefined` | Order of series names (for canonical format)                    |
| `width`           | `number \| string`                        | `328`       | Width of the chart                                              |
| `height`          | `number \| string`                        | `400`       | **Total height of the chart.** PathGroup fills remaining space. |
| `showHeader`      | `boolean`                                 | `true`      | Whether to show header                                          |
| `showFooter`      | `boolean`                                 | `true`      | Whether to show footer                                          |
| `showLegend`      | `boolean`                                 | `true`      | Whether to show legend                                          |
| `showDataDisplay` | `boolean`                                 | `false`     | Show DataDisplay component above line group                     |

### ChartHeader Config (`chartHeader`)

| Prop       | Type     | Default                       | Description         |
| ---------- | -------- | ----------------------------- | ------------------- |
| `title`    | `string` | `"This is chart title."`      | Chart title text    |
| `subtitle` | `string` | `"This is chart subtitle..."` | Chart subtitle text |

### ChartLegend Config (`chartLegend`)

| Prop    | Type                | Default     | Description         |
| ------- | ------------------- | ----------- | ------------------- |
| `items` | `ChartLegendItem[]` | `undefined` | Manual legend items |

### PathGroup Config (`pathGroup`)

| Prop               | Type                        | Default     | Description             |
| ------------------ | --------------------------- | ----------- | ----------------------- |
| `showYAxis`        | `boolean`                   | `true`      | Whether to show Y-axis  |
| `showXAxis`        | `boolean`                   | `true`      | Whether to show X-axis  |
| `yAxisTickCount`   | `number`                    | `6`         | Number of Y-axis ticks  |
| `rounded`          | `boolean`                   | `true`      | Rounded line caps/joins |
| `curveStyle`       | `"Sharp" \| "Curved"`       | `"Sharp"`   | Line curve style        |
| `valueFormat`      | `ValueFormatConfig`         | `undefined` | Y-axis value format     |
| `formatYAxisValue` | `(value: number) => string` | `undefined` | Custom Y-axis formatter |

### ChartFooter Config (`chartFooter`)

| Prop     | Type     | Default               | Description             |
| -------- | -------- | --------------------- | ----------------------- |
| `source` | `string` | `"Source: jio.com."`  | Source attribution text |
| `notes`  | `string` | `"Additional notes."` | Additional notes text   |

### DataDisplay Config (`dataDisplay`)

| Prop                      | Type                                                                              | Default               | Description                                                          |
| ------------------------- | --------------------------------------------------------------------------------- | --------------------- | -------------------------------------------------------------------- |
| `mode`                    | `"static" \| "hover"`                                                             | `"static"`            | Display mode: static uses provided values, hover updates dynamically |
| `label`                   | `string`                                                                          | `"Label."`            | Main label text above the data value                                 |
| `showLabelIcon`           | `boolean`                                                                         | `false`               | Whether to show info icon next to the main label                     |
| `leadValue`               | `string`                                                                          | `"£2,390"`            | Lead value for static mode or default in hover mode                  |
| `supportingValue`         | `string`                                                                          | `"/ 3,000"`           | Supporting value next to lead value                                  |
| `showSupportingValue`     | `boolean`                                                                         | `true`                | Whether to show supporting value                                     |
| `supportingLabel`         | `string`                                                                          | `"Supporting label."` | Supporting label text below the values                               |
| `showSupportingLabel`     | `boolean`                                                                         | `true`                | Whether to show supporting label                                     |
| `showSupportingLabelIcon` | `boolean`                                                                         | `false`               | Whether to show icon in supporting label                             |
| `showContentRight`        | `boolean`                                                                         | `true`                | Whether to show the semantic badge                                   |
| `badgeValue`              | `string`                                                                          | `"23.5"`              | Badge value for static mode                                          |
| `badgeAutoDetect`         | `boolean`                                                                         | `true`                | Auto-detect semantic mode from value                                 |
| `badgeSemanticMode`       | `"positive" \| "negative" \| "warning"`                                           | `"positive"`          | Manual semantic mode when autoDetect is false                        |
| `showBadgeIcon`           | `boolean`                                                                         | `true`                | Whether to show chevron icon in badge                                |
| `size`                    | `"S" \| "M" \| "L"`                                                               | `"L"`                 | Typography size variant                                              |
| `type`                    | `"Left" \| "Centered"`                                                            | `"Left"`              | Layout type: horizontal or vertical                                  |
| `formatHoverLeadValue`    | `(values: { seriesIndex: number; value: number }[], category?: string) => string` | `undefined`           | Custom formatter for lead value in hover mode (receives all series)  |
| `formatHoverBadgeValue`   | `(values: { seriesIndex: number; value: number }[], category?: string) => string` | `undefined`           | Custom formatter for badge value in hover mode (receives all series) |

### Global Modes (`modes`) (Layer 1)

| Mode Prop     | Figma Collection  | Available Values                                                                                                          |
| ------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `Brand`       | `"10 Brand"`      | `"Jio"`                                                                                                                   |
| `Platform`    | `"7 Platform"`    | `"S [Mobile 360]"`, `"M [Tablet portrait 768]"`, `"M [Tablet landscape 1024]"`, `"L [Laptop 1440]"`, `"L [Desktop 1920]"` |
| `Density`     | `"6 Density"`     | `"Default"`, `"Compact"`, `"Open"`                                                                                        |
| `colourTheme` | `"9 Theme"`       | `"MyJio"`, `"Test Brand"`, `"JioFinance"`                                                                                 |
| `colourMode`  | `"5 Colour Mode"` | `"Light"`, `"Dark"`                                                                                                       |
| `fullWidth`   | -                 | `true`, `false` - When true, chart fills 100% width                                                                       |

```
LineChart
├── ChartHeader (optional)
│   ├── ChartTitle
│   └── ChartSubtitle
├── ChartLegend (optional)
│   └── ChartKey[] (one per series)
├── DataDisplay (optional, when showDataDisplay=true)
│   ├── contentLeft
│   │   ├── mainLabel (ChartBody + optional InfoIcon)
│   │   └── DataHead (DataLead + DataSupporting + SupportingLabel)
│   └── contentRight (DataBadgeSemantic)
├── PathGroup
│   ├── YAxis (optional)
│   ├── SVG
│   │   └── Paths
│   │       └── path[] (one per series)
│   ├── HoverLine (for hover mode)
│   └── XAxis (optional)
└── ChartFooter (optional)
    └── ChartBody[] (source, notes)
```

## Usage Examples

### Basic Usage (Organized Props)

```tsx
const data = {
  categories: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul"],
  series: [
    { name: "Series 1", values: [30, 45, 35, 55, 40, 70, 60] },
    { name: "Series 2", values: [20, 35, 25, 45, 60, 40, 80] },
    { name: "Series 3", values: [40, 55, 45, 65, 50, 80, 70] },
    { name: "Series 4", values: [50, 65, 55, 75, 60, 90, 80] },
  ],
};

<LineChart data={data} />;
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

<LineChart
  data={data}
  width={400}
  height={280}
  showHeader={true}
  showFooter={true}
  showLegend={true}
  chartHeader={{
    title: "Monthly Performance",
    subtitle: "Revenue trends for 2024",
  }}
  pathGroup={{
    showYAxis: true,
    showXAxis: true,
    curveStyle: "Sharp",
  }}
  chartFooter={{
    source: "Source: Finance Department.",
    notes: "Values in millions.",
  }}
  modes={modes}
/>;
```

### Curved Lines

```tsx
<LineChart
  data={data}
  chartHeader={{
    title: "Smooth Trend Lines",
  }}
  pathGroup={{
    curveStyle: "Curved",
  }}
  modes={modes}
/>
```

### Two Series Comparison

```tsx
const data = {
  categories: ["Q1", "Q2", "Q3", "Q4"],
  series: [
    { name: "Revenue", values: [100, 150, 130, 180] },
    { name: "Costs", values: [80, 90, 100, 120] },
  ],
};

<LineChart
  data={data}
  chartHeader={{
    title: "Revenue vs Costs",
    subtitle: "Quarterly comparison",
  }}
  modes={modes}
/>;
```

### Single Series (No Legend)

```tsx
const data = {
  categories: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
  series: [{ name: "Daily Active Users", values: [1200, 1500, 1400, 1600, 1800, 2000, 1900] }],
};

<LineChart
  data={data}
  showLegend={false}
  chartHeader={{
    title: "Daily Active Users",
    subtitle: "Weekly trend",
  }}
  modes={modes}
/>;
```

### With DataDisplay (Static Mode)

```tsx
<LineChart
  data={data}
  showDataDisplay={true}
  chartHeader={{
    title: "Revenue Trend",
    subtitle: "Monthly performance",
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

DataDisplay updates dynamically when hovering over the chart:

```tsx
<LineChart
  data={data}
  showDataDisplay={true}
  chartHeader={{
    title: "Revenue Trend",
  }}
  dataDisplay={{
    mode: "hover",
    label: "Hover to see values",
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
<LineChart
  data={data}
  showDataDisplay={true}
  dataDisplay={{
    mode: "hover",
    label: "Select a point",
    formatHoverLeadValue: (values, category) => {
      // Sum all series values at the hovered point
      const total = values.reduce((sum, v) => sum + v.value, 0);
      return `£${total.toLocaleString()}`;
    },
    formatHoverBadgeValue: (values, category) => {
      // Show the first series value as percentage
      const firstValue = values[0]?.value || 0;
      return `${firstValue > 0 ? "+" : ""}${firstValue.toFixed(1)}%`;
    },
  }}
  modes={modes}
/>
```

### Custom Legend Items

```tsx
<LineChart
  data={data}
  chartLegend={{
    items: [
      { label: "Product A", color: "#ff671f", type: "circle" },
      { label: "Product B", color: "#3900ad", type: "circle" },
    ],
  }}
  modes={modes}
/>
```

### Full Width

```tsx
<LineChart
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

### Chart Only (No Header/Footer/Legend)

```tsx
<LineChart data={data} showHeader={false} showFooter={false} showLegend={false} modes={modes} />
```

### With Value Formatting

```tsx
// Percentage format
<LineChart
  data={percentageData}
  pathGroup={{
    valueFormat: { type: 'percentage' },
  }}
  modes={modes}
/>

// Currency format
<LineChart
  data={revenueData}
  pathGroup={{
    valueFormat: { type: 'currency', currency: 'INR', abbreviate: true },
  }}
  modes={modes}
/>

// Custom formatter
<LineChart
  data={data}
  pathGroup={{
    formatYAxisValue: (value) => `$${value}K`,
  }}
  modes={modes}
/>
```

## Migration from Flat Props

### Before (Flat Props - Deprecated)

```tsx
<LineChart
  title="Monthly Performance"
  subtitle="Revenue trends for 2024"
  source="Source: Finance Department."
  notes="Values in millions."
  data={data}
  width={400}
  height={280}
  showHeader={true}
  showFooter={true}
  showLegend={true}
  showYAxis={true}
  showXAxis={true}
  curveStyle="Sharp"
  modes={modes}
/>
```

### After (Organized Props)

```tsx
<LineChart
  data={data}
  width={400}
  height={280}
  showHeader={true}
  showFooter={true}
  showLegend={true}
  chartHeader={{
    title: "Monthly Performance",
    subtitle: "Revenue trends for 2024",
  }}
  pathGroup={{
    showYAxis: true,
    showXAxis: true,
    curveStyle: "Sharp",
  }}
  chartFooter={{
    source: "Source: Finance Department.",
    notes: "Values in millions.",
  }}
  modes={modes}
/>
```

## Height Behavior

The `height` prop controls the **total chart height**, not just the PathGroup. The PathGroup automatically stretches to fill the remaining space after header, legend, DataDisplay, and footer.

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
│ PathGroup (flex: 1, fills remaining)    │
│                                         │
├─────────────────────────────────────────┤
│ ChartFooter (natural height)            │
└─────────────────────────────────────────┘
       ↑                                ↑
       └────── Total height prop ───────┘
```

### Usage Examples

```tsx
// Fixed 500px chart - PathGroup fills remaining space
<LineChart
  data={data}
  height={500}
  showHeader={true}
  showFooter={true}
/>

// Compact 280px chart for dashboards
<LineChart
  data={data}
  height={280}
  showHeader={true}
  showFooter={false}
  showLegend={false}
/>

// Lines only - fills full height
<LineChart
  data={data}
  height={300}
  showHeader={false}
  showFooter={false}
  showLegend={false}
/>
```

### Key Benefits

1. **Predictable sizing**: Chart always respects the specified height
2. **Automatic stretching**: PathGroup expands to fill available space
3. **Consistent layouts**: Same chart height regardless of which sections are visible
4. **Responsive-friendly**: Use percentage heights for fluid layouts

## Design Tokens Used

| Property     | Variable Name             | Fallback  | Description                |
| ------------ | ------------------------- | --------- | -------------------------- |
| Section Gap  | `"Dimensions/Spacings/L"` | `20`      | Gap between chart sections |
| Stroke Width | `"Strokes/2XL"`           | `3`       | Line stroke width          |
| Color 1      | `"categorical/bold/1"`    | `#ff671f` | First series color         |
| Color 2      | `"categorical/bold/2"`    | `#3900ad` | Second series color        |
| Color 3      | `"categorical/bold/3"`    | `#465aff` | Third series color         |
| Color 4      | `"categorical/bold/4"`    | `#99d6ff` | Fourth series color        |

## Legend Auto-Generation

When `chartLegend.items` is not provided, the chart automatically generates legend items from the data:

1. Each series becomes a legend item
2. Series `name` is used as the label
3. Series `color` is used if provided, otherwise categorical colors are assigned
4. Colors cycle through `categorical/bold/1-4`

```tsx
// Data with named series
const data = {
  categories: ["Jan", "Feb", "Mar"],
  series: [
    { name: "Revenue", values: [100, 150, 130] }, // Gets categorical/bold/1
    { name: "Costs", values: [80, 90, 100] }, // Gets categorical/bold/2
  ],
};

// Legend auto-generates:
// - "Revenue" with orange indicator
// - "Costs" with purple indicator
```

## Child Components

| Component     | Config Prop   | File                | Description                |
| ------------- | ------------- | ------------------- | -------------------------- |
| `ChartHeader` | `chartHeader` | `./ChartHeader.tsx` | Title and subtitle         |
| `ChartLegend` | `chartLegend` | `./ChartLegend.tsx` | Legend with ChartKey items |
| `PathGroup`   | `pathGroup`   | `./PathGroup.tsx`   | SVG line paths with axes   |
| `ChartFooter` | `chartFooter` | `./ChartFooter.tsx` | Source and notes           |

## DataDisplay Integration

This chart supports an optional DataDisplay component positioned between ChartLegend and the group component. See **[DataDisplay Integration](./DataDisplayIntegration.md)** for full configuration including static/hover modes, custom formatters, and requirements.

**Note**: For this chart, formatters receive `(values: { seriesIndex: number; value: number }[], category?: string)` - an array of all series values at the hovered X position, allowing you to sum, compare, or select specific series values.

## Accessibility

Wrapped by `ChartAccessibility` (enabled by default). Provides ARIA attributes, auto-generated summaries, and hidden data tables. See **[ChartAccessibility.md](./ChartAccessibility.md)** for configuration.

## Performance Notes

- Uses `useMemo` for mode mapping and legend generation
- Token resolution benefits from `resolvedCache`

## Related Documentation

- [OrganizedPropsPattern.md](./OrganizedPropsPattern.md) - Pattern documentation
- [PathGroup.md](./PathGroup.md) - Path group component
- [ChartHeader.md](./ChartHeader.md) - Header component
- [ChartFooter.md](./ChartFooter.md) - Footer component
- [ChartLegend.md](./ChartLegend.md) - Legend component
- [DataDisplay.md](./DataDisplay.md) - DataDisplay component

## Files

| File                       | Description                   |
| -------------------------- | ----------------------------- |
| `src/charts/LineChart.tsx` | Main component implementation |
