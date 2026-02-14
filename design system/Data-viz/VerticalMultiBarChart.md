# VerticalMultiBarChart

## Overview

The VerticalMultiBarChart component is a complete chart visualization for grouped multi-bar data. It combines ChartHeader, ChartLegend, DataDisplay, VerticalMultiBarGroup, and ChartFooter to create a full chart with title, subtitle, legend, data summary, bars, and footer. It supports up to 3 bar series per category, making it ideal for comparing multiple data series.

**This component follows the [Organized Props Pattern](./OrganizedPropsPattern.md).**

## Figma Reference

- **Node ID**: `88:2510`
- **Design File**: DataVis-Components
- **Figma URL**: https://www.figma.com/design/uA5ExvS0cNXbDEKzT9Rnrt/DataVis-Components?node-id=88-2510

## Architecture

```
VerticalMultiBarChart (flex column, gap from token)
├── ChartHeader (conditional: showHeader)
│   ├── ChartTitle (title)
│   └── ChartSubtitle (subtitle)
├── ChartLegend (conditional: showLegend)
│   ├── ChartKey (series1Label, categorical/bold/1)
│   ├── ChartKey (series2Label, categorical/bold/2)
│   └── ChartKey (series3Label, categorical/bold/3)
├── DataDisplay (conditional: showDataDisplay)
│   ├── contentLeft
│   │   ├── mainLabel (ChartBody + optional InfoIcon)
│   │   └── DataHead (DataLead + DataSupporting + SupportingLabel)
│   └── contentRight (DataBadgeSemantic)
├── VerticalMultiBarGroup
│   ├── YAxis (conditional: showYAxis)
│   ├── ZeroLine (conditional: withNegatives)
│   ├── AvgLine (conditional: showAvgLine)
│   └── VerticalMultiBar[] (for each data point)
└── ChartFooter (conditional: showFooter)
    ├── Source text
    └── Notes text
```

## Import

```tsx
import VerticalMultiBarChart from "./charts/VerticalMultiBarChart";
```

## Data Formats

### MultiBarDataPoint (Legacy)

```typescript
interface MultiBarDataPoint {
  label: string; // Category label (e.g., "Q1", "Jan")
  value1: number; // Value for bar 1 (required)
  value2?: number; // Value for bar 2 (optional)
  value3?: number; // Value for bar 3 (optional)
  bar1Color?: string; // Custom color for bar 1
  bar2Color?: string; // Custom color for bar 2
  bar3Color?: string; // Custom color for bar 3
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
  series1Label?: string;
  series2Label?: string;
  series3Label?: string;
}

/** Props for the VerticalMultiBarGroup child component */
interface BarGroupConfig {
  showTopLabels?: boolean;
  showCategoryLabels?: boolean;
  showYAxis?: boolean;
  showAvgLine?: boolean;
  yAxisTickCount?: number;
  valueFormat?: ValueFormatConfig;
  formatYAxisValue?: (value: number) => string;
  formatAvgValue?: (value: number) => string;
  barWidthMulti?: string;
  showHoverBadge?: boolean;
  formatHoverValue?: (value: number, label?: string) => string;
  onBarHover?: (data: VerticalMultiBarHoverData) => void;
  onBarClick?: (data: VerticalMultiBarHoverData) => void;
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
  formatHoverLeadValue?: (value: number, category?: string, barIndex?: number) => string;
  formatHoverBadgeValue?: (value: number, category?: string, barIndex?: number) => string;
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

interface VerticalMultiBarChartProps {
  // Layer 2: Parent component props
  /**
   * Supports canonical format (ChartSeriesDataPoint[]) or legacy format (MultiBarDataPoint[])
   */
  data: ChartSeriesDataPoint[] | MultiBarDataPoint[];
  seriesOrder?: string[]; // Control series order for canonical format
  width?: number | string;
  height?: number | string;
  showHeader?: boolean;
  showFooter?: boolean;
  showLegend?: boolean;
  showDataDisplay?: boolean; // Show DataDisplay component above bars
  interactive?: boolean;
  hoverType?: "group" | "individual";

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

| Prop              | Type                                            | Default   | Description                                                                 |
| ----------------- | ----------------------------------------------- | --------- | --------------------------------------------------------------------------- |
| `data`            | `ChartSeriesDataPoint[] \| MultiBarDataPoint[]` | `[]`      | Array of data points (canonical or legacy format)                           |
| `seriesOrder`     | `string[]`                                      | -         | Control series order for canonical format                                   |
| `width`           | `number \| string`                              | `328`     | Container width                                                             |
| `height`          | `number \| string`                              | `400`     | **Total height of the chart.** VerticalMultiBarGroup fills remaining space. |
| `showHeader`      | `boolean`                                       | `true`    | Show chart header                                                           |
| `showFooter`      | `boolean`                                       | `true`    | Show chart footer                                                           |
| `showLegend`      | `boolean`                                       | `true`    | Show chart legend                                                           |
| `showDataDisplay` | `boolean`                                       | `false`   | Show DataDisplay component above the bar group                              |
| `interactive`     | `boolean`                                       | `true`    | Enable hover/click interactivity                                            |
| `hoverType`       | `'group' \| 'individual' \| 'categorical'`      | `'group'` | Hover type: group, individual, or categorical                               |

### ChartHeader Config (`chartHeader`)

| Prop       | Type     | Default                  | Description         |
| ---------- | -------- | ------------------------ | ------------------- |
| `title`    | `string` | `"This is chart title."` | Chart title text    |
| `subtitle` | `string` | (see default)            | Chart subtitle text |

### ChartLegend Config (`chartLegend`)

| Prop           | Type                | Default           | Description                                     |
| -------------- | ------------------- | ----------------- | ----------------------------------------------- |
| `items`        | `ChartLegendItem[]` | -                 | Manual legend items (overrides auto-generation) |
| `series1Label` | `string`            | `"Category name"` | Label for bar series 1 in legend                |
| `series2Label` | `string`            | `"Category name"` | Label for bar series 2 in legend                |
| `series3Label` | `string`            | `"Category name"` | Label for bar series 3 in legend                |

### BarGroup Config (`barGroup`)

| Prop                 | Type                | Default | Description                                     |
| -------------------- | ------------------- | ------- | ----------------------------------------------- |
| `showTopLabels`      | `boolean`           | `false` | Show value labels above/below bars              |
| `showCategoryLabels` | `boolean`           | `true`  | Show category labels at bottom                  |
| `showYAxis`          | `boolean`           | `true`  | Show the Y-axis                                 |
| `showAvgLine`        | `boolean`           | `false` | Show average line across chart                  |
| `yAxisTickCount`     | `number`            | `6`     | Number of Y-axis ticks                          |
| `valueFormat`        | `ValueFormatConfig` | -       | Auto-format for all chart values                |
| `formatYAxisValue`   | `function`          | -       | Custom Y-axis value formatter                   |
| `formatAvgValue`     | `function`          | -       | Custom average value formatter                  |
| `barWidthMulti`      | `string`            | `"M"`   | T-shirt sizing: XS, S, M, L, XL, 2XL            |
| `showHoverBadge`     | `boolean`           | `false` | Show DataBadge following cursor on hover        |
| `formatHoverValue`   | `function`          | -       | Custom formatter for hover badge value          |
| `onBarHover`         | `function`          | -       | Callback fired when any bar hover state changes |
| `onBarClick`         | `function`          | -       | Callback fired when any bar is clicked          |
| `hoveredBarIndex`    | `number`            | -       | Controlled hover state (category index)         |

### ChartFooter Config (`chartFooter`)

| Prop     | Type     | Default               | Description           |
| -------- | -------- | --------------------- | --------------------- |
| `source` | `string` | `"Source: jio.com."`  | Source text in footer |
| `notes`  | `string` | `"Additional notes."` | Notes text in footer  |

### DataDisplay Config (`dataDisplay`)

| Prop                      | Type                                                              | Default               | Description                                                          |
| ------------------------- | ----------------------------------------------------------------- | --------------------- | -------------------------------------------------------------------- |
| `mode`                    | `"static" \| "hover"`                                             | `"static"`            | Display mode: static uses provided values, hover updates dynamically |
| `label`                   | `string`                                                          | `"Label."`            | Main label text above the data value                                 |
| `showLabelIcon`           | `boolean`                                                         | `false`               | Whether to show info icon next to the main label                     |
| `leadValue`               | `string`                                                          | `"£2,390"`            | Lead value for static mode or default in hover mode                  |
| `supportingValue`         | `string`                                                          | `"/ 3,000"`           | Supporting value next to lead value                                  |
| `showSupportingValue`     | `boolean`                                                         | `true`                | Whether to show supporting value                                     |
| `supportingLabel`         | `string`                                                          | `"Supporting label."` | Supporting label text below the values                               |
| `showSupportingLabel`     | `boolean`                                                         | `true`                | Whether to show supporting label                                     |
| `showSupportingLabelIcon` | `boolean`                                                         | `false`               | Whether to show icon in supporting label                             |
| `showContentRight`        | `boolean`                                                         | `true`                | Whether to show the semantic badge                                   |
| `badgeValue`              | `string`                                                          | `"23.5"`              | Badge value for static mode                                          |
| `badgeAutoDetect`         | `boolean`                                                         | `true`                | Auto-detect semantic mode from value                                 |
| `badgeSemanticMode`       | `"positive" \| "negative" \| "warning"`                           | `"positive"`          | Manual semantic mode when autoDetect is false                        |
| `showBadgeIcon`           | `boolean`                                                         | `true`                | Whether to show chevron icon in badge                                |
| `size`                    | `"S" \| "M" \| "L"`                                               | `"L"`                 | Typography size variant                                              |
| `type`                    | `"Left" \| "Centered"`                                            | `"Left"`              | Layout type: horizontal or vertical                                  |
| `formatHoverLeadValue`    | `(value: number, category?: string, barIndex?: number) => string` | `undefined`           | Custom formatter for lead value in hover mode                        |
| `formatHoverBadgeValue`   | `(value: number, category?: string, barIndex?: number) => string` | `undefined`           | Custom formatter for badge value in hover mode                       |

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
VerticalMultiBarChart (flex column, gap from token)
├── ChartHeader (conditional: showHeader)
│   ├── ChartTitle (title)
│   └── ChartSubtitle (subtitle)
├── ChartLegend (conditional: showLegend)
│   ├── ChartKey (series1Label, categorical/bold/1)
│   ├── ChartKey (series2Label, categorical/bold/2)
│   └── ChartKey (series3Label, categorical/bold/3)
├── DataDisplay (conditional: showDataDisplay)
│   ├── contentLeft
│   │   ├── mainLabel (ChartBody + optional InfoIcon)
│   │   └── DataHead (DataLead + DataSupporting + SupportingLabel)
│   └── contentRight (DataBadgeSemantic)
├── VerticalMultiBarGroup
│   ├── YAxis (conditional: showYAxis)
│   ├── ZeroLine (conditional: withNegatives)
│   ├── AvgLine (conditional: showAvgLine)
│   └── VerticalMultiBar[] (for each data point)
└── ChartFooter (conditional: showFooter)
    ├── Source text
    └── Notes text
```

## Usage Examples

### Basic Usage (Organized Props)

```tsx
const data = [
  { label: "Q1", value1: 120, value2: 90, value3: 150 },
  { label: "Q2", value1: 100, value2: 110, value3: 130 },
  { label: "Q3", value1: 80, value2: 70, value3: 100 },
  { label: "Q4", value1: 140, value2: 120, value3: 160 },
];

<VerticalMultiBarChart
  data={data}
  chartHeader={{
    title: "Quarterly Revenue by Product Line",
    subtitle: "Revenue comparison across three product categories",
  }}
  chartLegend={{
    series1Label: "Product A",
    series2Label: "Product B",
    series3Label: "Product C",
  }}
/>;
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

<VerticalMultiBarChart
  data={data}
  width={450}
  height={280}
  showHeader={true}
  showFooter={true}
  showLegend={true}
  chartHeader={{
    title: "Quarterly Revenue",
    subtitle: "Three product comparison",
  }}
  chartLegend={{
    series1Label: "Product A",
    series2Label: "Product B",
    series3Label: "Product C",
  }}
  barGroup={{
    showYAxis: true,
    yAxisTickCount: 6,
    barWidthMulti: "M",
  }}
  chartFooter={{
    source: "Source: Finance Dept",
    notes: "FY 2024",
  }}
  modes={modes}
/>;
```

### With DataDisplay (Static Mode)

```tsx
<VerticalMultiBarChart
  data={data}
  showDataDisplay={true}
  chartHeader={{
    title: "Quarterly Revenue",
    subtitle: "Multi-series comparison",
  }}
  dataDisplay={{
    mode: "static",
    label: "Total revenue",
    leadValue: "£4,230",
    supportingValue: "/ 5,000",
    supportingLabel: "Quarterly target",
    badgeValue: "+15.2%",
  }}
  chartLegend={{
    series1Label: "Product A",
    series2Label: "Product B",
    series3Label: "Product C",
  }}
  modes={modes}
/>
```

### With DataDisplay (Hover Mode)

DataDisplay updates dynamically when hovering over bars:

```tsx
<VerticalMultiBarChart
  data={data}
  showDataDisplay={true}
  interactive={true}
  hoverType="individual"
  chartHeader={{
    title: "Quarterly Revenue",
  }}
  dataDisplay={{
    mode: "hover",
    label: "Hover a bar to see details",
    leadValue: "-",
    supportingValue: "",
    showSupportingValue: false,
    badgeValue: "-",
  }}
  chartLegend={{
    series1Label: "Product A",
    series2Label: "Product B",
    series3Label: "Product C",
  }}
  modes={modes}
/>
```

### With DataDisplay (Hover Mode + Custom Formatters)

```tsx
<VerticalMultiBarChart
  data={data}
  showDataDisplay={true}
  interactive={true}
  hoverType="individual"
  dataDisplay={{
    mode: "hover",
    label: "Select a bar",
    formatHoverLeadValue: (value, category, barIndex) =>
      `£${value.toLocaleString()} (Bar ${barIndex})`,
    formatHoverBadgeValue: (value) => {
      const percent = ((value / totalRevenue) * 100).toFixed(1);
      return `${percent}%`;
    },
  }}
  modes={modes}
/>
```

### Two Series Only

```tsx
const twoSeriesData = [
  { label: "2021", value1: 85, value2: 75 },
  { label: "2022", value1: 100, value2: 90 },
  { label: "2023", value1: 120, value2: 110 },
];

<VerticalMultiBarChart
  data={twoSeriesData}
  chartHeader={{
    title: "Revenue vs Expenses",
    subtitle: "Year over year comparison",
  }}
  chartLegend={{
    series1Label: "Revenue",
    series2Label: "Expenses",
  }}
  barGroup={{
    showYAxis: true,
  }}
  modes={modes}
/>;
```

### With Negative Values

```tsx
const profitLossData = [
  { label: "Jan", value1: 100, value2: 80, value3: 120 },
  { label: "Feb", value1: -20, value2: -30, value3: -10 },
  { label: "Mar", value1: -40, value2: -50, value3: -30 },
];

<VerticalMultiBarChart
  data={profitLossData}
  chartHeader={{
    title: "Monthly Profit/Loss",
    subtitle: "By department",
  }}
  chartLegend={{
    series1Label: "Sales",
    series2Label: "Marketing",
    series3Label: "Operations",
  }}
  barGroup={{
    showYAxis: true,
  }}
  modes={modes}
/>;
```

### With Custom Legend

```tsx
<VerticalMultiBarChart
  data={data}
  chartHeader={{
    title: "Regional Sales",
  }}
  chartLegend={{
    items: [
      { label: "North Region", color: "#ff671f", type: "circle" },
      { label: "South Region", color: "#3900ad", type: "circle" },
      { label: "West Region", color: "#465aff", type: "circle" },
    ],
  }}
  modes={modes}
/>
```

### With Average Line

```tsx
<VerticalMultiBarChart
  data={data}
  chartHeader={{
    title: "Performance Metrics",
    subtitle: "With average indicator",
  }}
  barGroup={{
    showAvgLine: true,
    formatAvgValue: (value) => `${value.toFixed(1)}%`,
  }}
  modes={modes}
/>
```

### Full Width Chart

```tsx
<VerticalMultiBarChart
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

### With Custom Y-Axis Formatting

```tsx
<VerticalMultiBarChart
  data={largeValueData}
  chartHeader={{
    title: "Revenue by Quarter (in Millions)",
    subtitle: "With custom Y-axis formatting",
  }}
  barGroup={{
    showYAxis: true,
    yAxisTickCount: 5,
    formatYAxisValue: (value) => `$${(value / 1000000).toFixed(1)}M`,
  }}
  modes={modes}
/>
```

### With Hover Interaction (Group Mode)

```tsx
<VerticalMultiBarChart
  data={data}
  interactive={true}
  hoverType="group"
  chartHeader={{
    title: "Interactive Chart",
    subtitle: "Hover to highlight entire category",
  }}
  barGroup={{
    onBarHover: (hoverData) => {
      console.log(`Category: ${hoverData.label}, Hovered: ${hoverData.isHovered}`);
    },
  }}
  modes={modes}
/>
```

### With Hover Interaction (Individual Mode)

```tsx
<VerticalMultiBarChart
  data={data}
  interactive={true}
  hoverType="individual"
  chartHeader={{
    title: "Individual Bar Hover",
    subtitle: "Hover to highlight specific bars",
  }}
  barGroup={{
    onBarHover: (hoverData) => {
      console.log(`Bar ${hoverData.barIndex} in ${hoverData.label}: ${hoverData.isHovered}`);
    },
    onBarClick: (hoverData) => {
      console.log(`Clicked bar ${hoverData.barIndex}`);
    },
  }}
  modes={modes}
/>
```

### With Hover Interaction (Categorical Mode)

```tsx
<VerticalMultiBarChart
  data={data}
  interactive={true}
  hoverType="categorical"
  chartHeader={{
    title: "Categorical Bar Hover",
    subtitle: "Hover to highlight entire series across categories",
  }}
  barGroup={{
    onBarHover: (hoverData) => {
      console.log(`Series ${hoverData.barIndex} highlighted across all categories`);
    },
  }}
  modes={modes}
/>
```

### Non-Interactive Chart

```tsx
<VerticalMultiBarChart
  data={data}
  interactive={false}
  chartHeader={{
    title: "Static Chart",
    subtitle: "No hover effects",
  }}
  modes={modes}
/>
```

## Migration from Flat Props

### Before (Flat Props - Deprecated)

```tsx
<VerticalMultiBarChart
  title="Quarterly Revenue"
  subtitle="Three product comparison"
  source="Source: Finance Dept"
  notes="FY 2024"
  data={data}
  width={450}
  height={280}
  showHeader={true}
  showFooter={true}
  showLegend={true}
  series1Label="Product A"
  series2Label="Product B"
  series3Label="Product C"
  showTopLabels={false}
  showCategoryLabels={true}
  showYAxis={true}
  yAxisTickCount={6}
  barWidthMulti="M"
  modes={modes}
/>
```

### After (Organized Props)

```tsx
<VerticalMultiBarChart
  data={data}
  width={450}
  height={280}
  showHeader={true}
  showFooter={true}
  showLegend={true}
  chartHeader={{
    title: "Quarterly Revenue",
    subtitle: "Three product comparison",
  }}
  chartLegend={{
    series1Label: "Product A",
    series2Label: "Product B",
    series3Label: "Product C",
  }}
  barGroup={{
    showTopLabels: false,
    showCategoryLabels: true,
    showYAxis: true,
    yAxisTickCount: 6,
    barWidthMulti: "M",
  }}
  chartFooter={{
    source: "Source: Finance Dept",
    notes: "FY 2024",
  }}
  modes={modes}
/>
```

## Height Behavior

The `height` prop controls the **total chart height**, not just the bar group. The VerticalMultiBarGroup automatically stretches to fill the remaining space after header, legend, DataDisplay, and footer.

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
│ VerticalMultiBarGroup (flex: 1, fills)  │
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
<VerticalMultiBarChart
  data={data}
  height={500}
  showHeader={true}
  showFooter={true}
/>

// Compact 280px chart for dashboards
<VerticalMultiBarChart
  data={data}
  height={280}
  showHeader={true}
  showFooter={false}
  showLegend={false}
/>

// Bars only - fills full height
<VerticalMultiBarChart
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

| Property  | Variable Name             | Fallback        | Description                         |
| --------- | ------------------------- | --------------- | ----------------------------------- |
| Gap       | `"Dimensions/Spacings/L"` | `20px`          | Spacing between chart sections      |
| Bar Width | `"barMultiWidth"`         | `26px` (M mode) | Width from barMultiWidth collection |

## Child Components

| Component               | Config Prop   | File                          | Description                    |
| ----------------------- | ------------- | ----------------------------- | ------------------------------ |
| `ChartHeader`           | `chartHeader` | `./ChartHeader.tsx`           | Title and subtitle             |
| `ChartLegend`           | `chartLegend` | `./ChartLegend.tsx`           | Legend with categorical colors |
| `VerticalMultiBarGroup` | `barGroup`    | `./VerticalMultiBarGroup.tsx` | Bar group with D3              |
| `ChartFooter`           | `chartFooter` | `./ChartFooter.tsx`           | Source and notes               |

## Legend Auto-Generation

The component automatically generates legend items based on the data:

1. **Detects series count** from first data point (checks value1, value2, value3)
2. **Creates legend items** for each series with categorical colors
3. **Uses series labels** from `chartLegend` config (series1Label, series2Label, series3Label)
4. **Can be overridden** with `chartLegend.items` prop for custom legends

## Comparison with VerticalBarChart

| Feature           | VerticalBarChart    | VerticalMultiBarChart                 |
| ----------------- | ------------------- | ------------------------------------- |
| Bars per category | 1                   | Up to 3                               |
| Data structure    | `{ label, value }`  | `{ label, value1, value2?, value3? }` |
| Bar width prop    | `barGroup.barWidth` | `barGroup.barWidthMulti`              |
| Legend labels     | `chartLegend.label` | `chartLegend.series1Label/2/3`        |
| Child component   | VerticalBarGroup    | VerticalMultiBarGroup                 |
| Use case          | Single series       | Multi-series comparison               |

The component supports an optional `DataBadge` that follows the cursor on hover. The content displayed depends on the `hoverType`:

| Hover Type    | Badge Displays | Example Output          |
| ------------- | -------------- | ----------------------- |
| `individual`  | Data value     | `120`, `90`, `150`      |
| `group`       | Category label | `Q1`, `Q2`, `January`   |
| `categorical` | Series name    | `Product A`, `Series 1` |

### Individual Mode - Shows Value

```tsx
<VerticalMultiBarChart
  data={data}
  interactive={true}
  hoverType="individual"
  chartHeader={{ title: "Badge shows data VALUE" }}
  barGroup={{
    showHoverBadge: true,
  }}
  modes={modes}
/>
```

### Group Mode - Shows Category Label

```tsx
<VerticalMultiBarChart
  data={data}
  interactive={true}
  hoverType="group"
  chartHeader={{ title: "Badge shows CATEGORY" }}
  barGroup={{
    showHoverBadge: true,
  }}
  modes={modes}
/>
// Badge shows: "Q1", "Q2", etc.
```

### Categorical Mode - Shows Series Name

```tsx
<VerticalMultiBarChart
  data={data}
  interactive={true}
  hoverType="categorical"
  chartHeader={{ title: "Badge shows SERIES name" }}
  barGroup={{
    showHoverBadge: true,
  }}
  modes={modes}
/>
// Badge shows: "Product A", "Product B", etc.
```

### Custom Formatting

Override the default display with a custom formatter:

```tsx
<VerticalMultiBarChart
  data={data}
  interactive={true}
  chartHeader={{ title: "Chart with Custom Badge" }}
  barGroup={{
    showHoverBadge: true,
    formatHoverValue: (value, label) => `${label}: ₹${(value / 1000).toFixed(1)}K`,
  }}
  modes={modes}
/>
```

## Hover Interaction

The chart supports interactive hover with automatic dimming using design tokens.

### Hover Types

| Type                | Behavior                                                                | Use Case                  |
| ------------------- | ----------------------------------------------------------------------- | ------------------------- |
| `'group'` (default) | All bars in a category highlight together; other categories dim         | Category-level comparison |
| `'individual'`      | Only the specific hovered bar highlights; all other bars dim            | Individual bar analysis   |
| `'categorical'`     | All bars of the same series across all categories highlight; others dim | Series comparison/legend  |

### Color & Opacity States

| State                         | Color Token                 | Opacity            | Description                    |
| ----------------------------- | --------------------------- | ------------------ | ------------------------------ |
| **Default** (nothing hovered) | `categorical/bold/{1,2,3}`  | `1`                | Original vibrant colors        |
| **Highlighted** (hovered)     | `categorical/bold/{1,2,3}`  | `1`                | Stays vibrant                  |
| **Dimmed** (not hovered)      | `categorical/hover/{1,2,3}` | `dimOpacity` (0.2) | Muted colors + reduced opacity |

### Transition Tokens

All hover transitions use design tokens from the `hoverTransition` collection:

- **Easing**: `"easing"` - Cubic-bezier timing function
- **Duration**: `"duration"` - Transition time (e.g., 200ms for "Moderate" mode)
- **Dim Opacity**: `"dimOpacity"` - Opacity for dimmed bars (default: 0.2)

### Callback Data Structure

```typescript
interface VerticalMultiBarHoverData {
  index?: number; // Category index (0, 1, 2, ...)
  label?: string; // Category label ("Q1", "Q2", ...)
  values: {
    // All bar values in the category
    value1?: number;
    value2?: number;
    value3?: number;
  };
  isHovered: boolean; // Current hover state
  barIndex?: 1 | 2 | 3; // Which bar (only in individual mode)
  mouseX?: number; // Mouse X coordinate (clientX)
  mouseY?: number; // Mouse Y coordinate (clientY)
}
```

### Hover Badge

The component supports an optional `DataBadge` that follows the cursor on hover. The content displayed depends on the `hoverType`:

| Hover Type    | Badge Displays | Example Output          |
| ------------- | -------------- | ----------------------- |
| `individual`  | Data value     | `120`, `90`, `150`      |
| `group`       | Category label | `Q1`, `Q2`, `January`   |
| `categorical` | Series name    | `Product A`, `Series 1` |

#### Individual Mode - Shows Value

```tsx
<VerticalMultiBarChart
  data={data}
  interactive={true}
  hoverType="individual"
  chartHeader={{ title: "Badge shows data VALUE" }}
  barGroup={{
    showHoverBadge: true,
  }}
  modes={modes}
/>
```

#### Group Mode - Shows Category Label

```tsx
<VerticalMultiBarChart
  data={data}
  interactive={true}
  hoverType="group"
  chartHeader={{ title: "Badge shows CATEGORY" }}
  barGroup={{
    showHoverBadge: true,
  }}
  modes={modes}
/>
// Badge shows: "Q1", "Q2", etc.
```

#### Categorical Mode - Shows Series Name

```tsx
<VerticalMultiBarChart
  data={data}
  interactive={true}
  hoverType="categorical"
  chartHeader={{ title: "Badge shows SERIES name" }}
  barGroup={{
    showHoverBadge: true,
  }}
  modes={modes}
/>
// Badge shows: "Product A", "Product B", etc.
```

#### Custom Formatting

Override the default display with a custom formatter:

```tsx
<VerticalMultiBarChart
  data={data}
  interactive={true}
  chartHeader={{ title: "Chart with Custom Badge" }}
  barGroup={{
    showHoverBadge: true,
    formatHoverValue: (value, label) => `${label}: ₹${(value / 1000).toFixed(1)}K`,
  }}
  modes={modes}
/>
```

## DataDisplay Integration

This chart supports an optional DataDisplay component positioned between ChartLegend and the group component. See **[DataDisplay Integration](./DataDisplayIntegration.md)** for full configuration including static/hover modes, custom formatters, and requirements.

**Note**: For this chart, formatters receive `(value: number, category?: string, barIndex?: number)` where `barIndex` identifies which bar (1, 2, or 3) was hovered.

## Accessibility

Wrapped by `ChartAccessibility` (enabled by default). Provides ARIA attributes, auto-generated summaries, and hidden data tables. See **[ChartAccessibility.md](./ChartAccessibility.md)** for configuration.

## Performance Notes

- Uses `useMemo` for mode mapping and legend item generation
- Token resolution benefits from `resolvedCache`

## Related Documentation

- [OrganizedPropsPattern.md](./OrganizedPropsPattern.md) - Pattern documentation
- [VerticalMultiBarGroup.md](./VerticalMultiBarGroup.md) - Bar group component
- [ChartHeader.md](./ChartHeader.md) - Header component
- [ChartFooter.md](./ChartFooter.md) - Footer component
- [ChartLegend.md](./ChartLegend.md) - Legend component
- [DataDisplay.md](./DataDisplay.md) - DataDisplay component

## Files

| File                                   | Description                   |
| -------------------------------------- | ----------------------------- |
| `src/charts/VerticalMultiBarChart.tsx` | Main component implementation |
