# AreaChart

## Overview

The AreaChart component is a complete stacked area chart visualization that combines ChartHeader, ChartLegend, DataDisplay, AreaGroup, and ChartFooter components. It supports multiple series with automatic categorical coloring from Figma design tokens and D3 stacking, making it ideal for showing cumulative values, market share, or part-to-whole relationships over time.

**This component follows the [Organized Props Pattern](./OrganizedPropsPattern.md).**

## Import

```tsx
import AreaChart from "./charts/AreaChart";
import type {
  AreaGroupData,
  AreaSeriesData,
  AreaCurveStyle,
  ChartLegendItem,
  ChartSeriesDataPoint,
} from "./charts/AreaChart";
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
const data: AreaGroupData = {
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

/** Hover event data passed to onSeriesHover callback */
interface AreaSeriesHoverData {
  seriesIndex: number;
  name?: string;
  isHovered: boolean;
}

/** Props for the AreaGroup child component */
interface AreaGroupConfig {
  showYAxis?: boolean;
  showXAxis?: boolean;
  yAxisTickCount?: number;
  curveStyle?: AreaCurveStyle;
  valueFormat?: ValueFormatConfig;
  formatYAxisValue?: (value: number) => string;
  /** Show DataBadge that follows cursor when hovering areas (requires interactive=true) */
  showHoverBadge?: boolean;
  /** Custom formatter for hover badge value. Receives series total and name. */
  formatHoverValue?: (value: number, label?: string) => string;
  onSeriesHover?: (data: AreaSeriesHoverData | null) => void;
  onSeriesClick?: (data: AreaSeriesHoverData) => void;
  hoveredSeriesIndex?: number | null;
}

/** Props for the ChartFooter child component */
interface ChartFooterConfig {
  source?: string;
  notes?: string;
}

/**
 * Props for the DataDisplay child component.
 * When mode is "hover", values update dynamically based on area hover state.
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
  formatHoverLeadValue?: (seriesTotal: number, seriesName?: string) => string;
  formatHoverBadgeValue?: (seriesTotal: number, seriesName?: string) => string;
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

interface AreaChartProps {
  // Layer 2: Parent component props
  /**
   * Supports canonical format (ChartSeriesDataPoint[]) or legacy format (AreaGroupData)
   */
  data: ChartSeriesDataPoint[] | AreaGroupData;
  /** Order of series names (for canonical format) - determines stacking order */
  seriesOrder?: string[];
  width?: number | string;
  height?: number | string;
  showHeader?: boolean;
  showFooter?: boolean;
  showLegend?: boolean;
  showDataDisplay?: boolean; // Show DataDisplay component above areas
  /** Enable hover/click interactivity on areas (default: true) */
  interactive?: boolean;

  // Layer 3: Child component configurations
  chartHeader?: ChartHeaderConfig;
  chartLegend?: ChartLegendConfig;
  dataDisplay?: DataDisplayConfig; // Configuration for DataDisplay
  areaGroup?: AreaGroupConfig;
  chartFooter?: ChartFooterConfig;

  // Layer 1: Global modes
  modes?: GlobalModes;
}
```

## Props

### Parent Component Props (Layer 2)

| Prop              | Type               | Default    | Description                                                     |
| ----------------- | ------------------ | ---------- | --------------------------------------------------------------- |
| `data`            | `AreaGroupData`    | (required) | Chart data with categories and series                           |
| `width`           | `number \| string` | `346`      | Width of the chart                                              |
| `height`          | `number \| string` | `400`      | **Total height of the chart.** AreaGroup fills remaining space. |
| `showHeader`      | `boolean`          | `true`     | Whether to show header                                          |
| `showFooter`      | `boolean`          | `true`     | Whether to show footer                                          |
| `showLegend`      | `boolean`          | `true`     | Whether to show legend                                          |
| `showDataDisplay` | `boolean`          | `false`    | Show DataDisplay component above areas                          |
| `interactive`     | `boolean`          | `true`     | Enable hover/click interactivity on areas                       |

### ChartHeader Config (`chartHeader`)

| Prop       | Type     | Default                       | Description         |
| ---------- | -------- | ----------------------------- | ------------------- |
| `title`    | `string` | `"This is chart title."`      | Chart title text    |
| `subtitle` | `string` | `"This is chart subtitle..."` | Chart subtitle text |

### ChartLegend Config (`chartLegend`)

| Prop    | Type                | Default     | Description         |
| ------- | ------------------- | ----------- | ------------------- |
| `items` | `ChartLegendItem[]` | `undefined` | Manual legend items |

### AreaGroup Config (`areaGroup`)

| Prop                 | Type                                          | Default     | Description                                 |
| -------------------- | --------------------------------------------- | ----------- | ------------------------------------------- |
| `showYAxis`          | `boolean`                                     | `true`      | Whether to show Y-axis                      |
| `showXAxis`          | `boolean`                                     | `true`      | Whether to show X-axis                      |
| `yAxisTickCount`     | `number`                                      | `6`         | Number of Y-axis ticks                      |
| `curveStyle`         | `"Sharp" \| "Curved"`                         | `"Sharp"`   | Area curve style                            |
| `valueFormat`        | `ValueFormatConfig`                           | `undefined` | Y-axis value format                         |
| `formatYAxisValue`   | `(value: number) => string`                   | `undefined` | Custom Y-axis formatter                     |
| `showHoverBadge`     | `boolean`                                     | `false`     | Show DataBadge that follows cursor on hover |
| `formatHoverValue`   | `(value: number, label?: string) => string`   | `undefined` | Custom formatter for hover badge value      |
| `onSeriesHover`      | `(data: AreaSeriesHoverData \| null) => void` | `undefined` | Callback fired when series hover changes    |
| `onSeriesClick`      | `(data: AreaSeriesHoverData) => void`         | `undefined` | Callback fired when a series is clicked     |
| `hoveredSeriesIndex` | `number \| null`                              | `undefined` | Index of hovered series (controlled mode)   |

### ChartFooter Config (`chartFooter`)

| Prop     | Type     | Default               | Description             |
| -------- | -------- | --------------------- | ----------------------- |
| `source` | `string` | `"Source: jio.com."`  | Source attribution text |
| `notes`  | `string` | `"Additional notes."` | Additional notes text   |

### DataDisplay Config (`dataDisplay`)

| Prop                      | Type                                                   | Default               | Description                                                          |
| ------------------------- | ------------------------------------------------------ | --------------------- | -------------------------------------------------------------------- |
| `mode`                    | `"static" \| "hover"`                                  | `"static"`            | Display mode: static uses provided values, hover updates dynamically |
| `label`                   | `string`                                               | `"Label."`            | Main label text above the data value                                 |
| `showLabelIcon`           | `boolean`                                              | `false`               | Whether to show info icon next to the main label                     |
| `leadValue`               | `string`                                               | `"£2,390"`            | Lead value for static mode or default in hover mode                  |
| `supportingValue`         | `string`                                               | `"/ 3,000"`           | Supporting value next to lead value                                  |
| `showSupportingValue`     | `boolean`                                              | `true`                | Whether to show supporting value                                     |
| `supportingLabel`         | `string`                                               | `"Supporting label."` | Supporting label text below the values                               |
| `showSupportingLabel`     | `boolean`                                              | `true`                | Whether to show supporting label                                     |
| `showSupportingLabelIcon` | `boolean`                                              | `false`               | Whether to show icon in supporting label                             |
| `showContentRight`        | `boolean`                                              | `true`                | Whether to show the semantic badge                                   |
| `badgeValue`              | `string`                                               | `"23.5"`              | Badge value for static mode                                          |
| `badgeAutoDetect`         | `boolean`                                              | `true`                | Auto-detect semantic mode from value                                 |
| `badgeSemanticMode`       | `"positive" \| "negative" \| "warning"`                | `"positive"`          | Manual semantic mode when autoDetect is false                        |
| `showBadgeIcon`           | `boolean`                                              | `true`                | Whether to show chevron icon in badge                                |
| `size`                    | `"S" \| "M" \| "L"`                                    | `"L"`                 | Typography size variant                                              |
| `type`                    | `"Left" \| "Centered"`                                 | `"Left"`              | Layout type: horizontal or vertical                                  |
| `formatHoverLeadValue`    | `(seriesTotal: number, seriesName?: string) => string` | `undefined`           | Custom formatter for lead value in hover mode                        |
| `formatHoverBadgeValue`   | `(seriesTotal: number, seriesName?: string) => string` | `undefined`           | Custom formatter for badge value in hover mode                       |

### Global Modes (`modes`) (Layer 1)

| Mode Prop     | Figma Collection  | Available Values                                                                                                          |
| ------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `Brand`       | `"10 Brand"`      | `"Jio"`                                                                                                                   |
| `Platform`    | `"7 Platform"`    | `"S [Mobile 360]"`, `"M [Tablet portrait 768]"`, `"M [Tablet landscape 1024]"`, `"L [Laptop 1440]"`, `"L [Desktop 1920]"` |
| `Density`     | `"6 Density"`     | `"Default"`, `"Compact"`, `"Open"`                                                                                        |
| `colourTheme` | `"9 Theme"`       | `"MyJio"`, `"Test Brand"`, `"JioFinance"`                                                                                 |
| `colourMode`  | `"5 Colour Mode"` | `"Light"`, `"Dark"`                                                                                                       |
| `fullWidth`   | -                 | `true`, `false` - When true, chart fills 100% width                                                                       |

## Data Structure

```typescript
interface AreaGroupData {
  /** Category labels for X-axis */
  categories: string[];
  /** Array of area series data */
  series: AreaSeriesData[];
}

interface AreaSeriesData {
  /** Series name (used in legend) */
  name?: string;
  /** Array of values, one for each category point */
  values: number[];
  /** Custom fill color */
  color?: string;
}
```

## Architecture

```
AreaChart
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
├── AreaGroup
│   ├── YAxis (optional)
│   ├── SVG
│   │   └── Areas (stacked area paths)
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

<AreaChart data={data} />;
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

<AreaChart
  data={data}
  width={400}
  height={280}
  showHeader={true}
  showFooter={true}
  showLegend={true}
  chartHeader={{
    title: "Monthly Performance",
    subtitle: "Stacked area chart for 2024",
  }}
  areaGroup={{
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

### Curved Style

```tsx
<AreaChart
  data={data}
  chartHeader={{
    title: "Smooth Area Chart",
  }}
  areaGroup={{
    curveStyle: "Curved",
  }}
  modes={modes}
/>
```

### Market Share Example

```tsx
const marketShareData = {
  categories: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
  series: [
    { name: "Our Company", values: [35, 38, 42, 45, 48, 52] },
    { name: "Competitor A", values: [30, 28, 26, 25, 24, 22] },
    { name: "Competitor B", values: [20, 19, 18, 17, 16, 15] },
    { name: "Others", values: [15, 15, 14, 13, 12, 11] },
  ],
};

<AreaChart
  data={marketShareData}
  chartHeader={{
    title: "Market Share",
    subtitle: "Monthly market share distribution",
  }}
  chartFooter={{
    source: "Source: Industry Report 2024.",
    notes: "Values represent percentage of total market.",
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

<AreaChart
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
<AreaChart
  data={data}
  showDataDisplay={true}
  chartHeader={{
    title: "Revenue Breakdown",
    subtitle: "Stacked area visualization",
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

DataDisplay updates dynamically when hovering over area series:

```tsx
<AreaChart
  data={data}
  showDataDisplay={true}
  interactive={true}
  chartHeader={{
    title: "Market Share",
  }}
  dataDisplay={{
    mode: "hover",
    label: "Hover a series to see details",
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
<AreaChart
  data={data}
  showDataDisplay={true}
  interactive={true}
  dataDisplay={{
    mode: "hover",
    label: "Select a series",
    formatHoverLeadValue: (seriesTotal, seriesName) =>
      `${seriesName}: £${seriesTotal.toLocaleString()}`,
    formatHoverBadgeValue: (seriesTotal, seriesName) => {
      const percent = ((seriesTotal / grandTotal) * 100).toFixed(1);
      return `${percent}%`;
    },
  }}
  modes={modes}
/>
```

### Custom Legend Items

```tsx
<AreaChart
  data={data}
  chartLegend={{
    items: [
      { label: "Product A", color: "#ff671f", type: "circle" },
      { label: "Product B", color: "#3900ad", type: "circle" },
      { label: "Product C", color: "#465aff", type: "circle" },
      { label: "Product D", color: "#99d6ff", type: "circle" },
    ],
  }}
  modes={modes}
/>
```

### Full Width

```tsx
<AreaChart
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
<AreaChart data={data} showHeader={false} showFooter={false} showLegend={false} modes={modes} />
```

### With Value Formatting

```tsx
// Percentage format
<AreaChart
  data={percentageData}
  areaGroup={{
    valueFormat: { type: 'percentage' },
  }}
  modes={modes}
/>

// Currency format
<AreaChart
  data={revenueData}
  areaGroup={{
    valueFormat: { type: 'currency', currency: 'INR', abbreviate: true },
  }}
  modes={modes}
/>

// Custom formatter
<AreaChart
  data={data}
  areaGroup={{
    formatYAxisValue: (value) => `$${value}K`,
  }}
  modes={modes}
/>
```

## Height Behavior

The `height` prop controls the **total height** of the AreaChart container. The AreaGroup child component automatically stretches to fill the remaining vertical space after header, legend, DataDisplay, and footer are rendered.

### Layout Diagram

```
┌───────────────────────────────────────┐
│  ChartHeader (title + subtitle)       │  ← Auto height
├───────────────────────────────────────┤
│  ChartLegend (optional)               │  ← Auto height
├───────────────────────────────────────┤
│  DataDisplay (optional)               │  ← Auto height
├───────────────────────────────────────┤
│                                       │
│                                       │
│            AreaGroup                  │  ← flex: 1 (fills remaining)
│     (YAxis + Areas + XAxis)           │
│                                       │
│                                       │
├───────────────────────────────────────┤
│  ChartFooter (source + notes)         │  ← Auto height
└───────────────────────────────────────┘
        Total height: `height` prop
```

### How It Works

1. **Fixed Container**: The root AreaChart container uses `height: [prop value]` and `display: flex; flex-direction: column`.
2. **Auto-sized Elements**: Header, Legend, DataDisplay, and Footer take their natural height.
3. **Stretching AreaGroup**: The AreaGroup is wrapped in a div with `flex: 1`, which fills all remaining space.
4. **Dynamic Measurement**: AreaGroup receives `height="100%"` and uses `ResizeObserver` to measure its actual pixel height for D3 scaling.

### Usage Examples

```tsx
// Standard fixed height (default 400px)
<AreaChart data={data} height={400} />

// Taller chart for more data visibility
<AreaChart data={data} height={600} />

// Compact dashboard widget
<AreaChart
  data={data}
  height={280}
  showFooter={false}
  showLegend={false}
/>

// Chart without header/footer - areas fill entire height
<AreaChart
  data={data}
  height={300}
  showHeader={false}
  showFooter={false}
  showLegend={false}
/>
```

## Design Tokens Used

| Property      | Variable Name             | Fallback  | Description                      |
| ------------- | ------------------------- | --------- | -------------------------------- |
| Section Gap   | `"Dimensions/Spacings/L"` | `20`      | Gap between chart sections       |
| Border Radius | `"Dimensions/Shape/3XS"`  | `4`       | Corner radius of areas container |
| Color 1       | `"categorical/bold/1"`    | `#ff671f` | First series color (orange)      |
| Color 2       | `"categorical/bold/2"`    | `#3900ad` | Second series color (purple)     |
| Color 3       | `"categorical/bold/3"`    | `#465aff` | Third series color (blue)        |
| Color 4       | `"categorical/bold/4"`    | `#99d6ff` | Fourth series color (light blue) |

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

## Stacking Behavior

Areas are stacked using D3's stack generator:

- First series (index 0) starts from y=0 baseline
- Each subsequent series stacks on top of the previous
- Series are rendered in reverse order so the first series appears on top visually

### Stacking Example

For data:

```tsx
series: [
  { values: [10, 20, 30] }, // Series 1 (bottom)
  { values: [15, 25, 35] }, // Series 2 (middle)
  { values: [5, 10, 15] }, // Series 3 (top)
];
```

The stacked y-values become:

- Series 1: [0-10], [0-20], [0-30]
- Series 2: [10-25], [20-45], [30-65]
- Series 3: [25-30], [45-55], [65-80]

## Child Components

| Component     | Config Prop   | File                | Description                 |
| ------------- | ------------- | ------------------- | --------------------------- |
| `ChartHeader` | `chartHeader` | `./ChartHeader.tsx` | Title and subtitle          |
| `ChartLegend` | `chartLegend` | `./ChartLegend.tsx` | Legend with ChartKey items  |
| `AreaGroup`   | `areaGroup`   | `./AreaGroup.tsx`   | SVG stacked areas with axes |
| `ChartFooter` | `chartFooter` | `./ChartFooter.tsx` | Source and notes            |

## Figma Reference

- **Node ID**: `174:3147`
- **Design File**: DataVis-Components

## DataDisplay Integration

The AreaChart supports an optional DataDisplay component positioned between ChartLegend and AreaGroup.

### Display Modes

| Mode       | Description                                      |
| ---------- | ------------------------------------------------ |
| `"static"` | Uses provided values directly (default)          |
| `"hover"`  | Updates dynamically when area series are hovered |

### Static Mode

In static mode, DataDisplay shows fixed values that you provide:

```tsx
<AreaChart
  data={data}
  showDataDisplay={true}
  dataDisplay={{
    mode: "static",
    label: "Total revenue",
    leadValue: "£2,390",
    badgeValue: "+23.5%",
  }}
/>
```

### Hover Mode

In hover mode, DataDisplay updates dynamically when hovering over area series:

- **`label`**: Shows the hovered series name
- **`leadValue`**: Shows the hovered series total (sum of all values in the series)
- **`badgeValue`**: Shows percentage of grand total (formatted by `formatHoverBadgeValue` if provided)

When no series is hovered, DataDisplay shows the default values from the config.

### Area-Specific Hover Data

Unlike bar charts, area charts have stacked series where hovering shows series-level information:

```typescript
// Formatter receives series total and name
formatHoverLeadValue?: (seriesTotal: number, seriesName?: string) => string;
formatHoverBadgeValue?: (seriesTotal: number, seriesName?: string) => string;
```

This allows you to:

- Show the series total value
- Display percentage of grand total
- Format with series name context

```tsx
<AreaChart
  data={data}
  showDataDisplay={true}
  interactive={true}
  dataDisplay={{
    mode: "hover",
    label: "Series Details",
    formatHoverLeadValue: (seriesTotal, seriesName) =>
      `${seriesName}: £${seriesTotal.toLocaleString()}`,
    formatHoverBadgeValue: (seriesTotal) => {
      const percent = ((seriesTotal / grandTotal) * 100).toFixed(0);
      return `${percent}%`;
    },
  }}
/>
```

### Hover Mode Requirements

1. **Requires `interactive={true}`**: DataDisplay hover mode only works when area interactivity is enabled
2. **Series name as label**: In hover mode, the series name becomes the label
3. **Series total**: The formatter receives the sum of all values in the hovered series
4. **Value inheritance**: When not hovered, displays the static values from config

## Related Documentation

- [OrganizedPropsPattern.md](./OrganizedPropsPattern.md) - Pattern documentation
- [AreaGroup.md](./AreaGroup.md) - Area group component
- [ChartHeader.md](./ChartHeader.md) - Header component
- [ChartFooter.md](./ChartFooter.md) - Footer component
- [ChartLegend.md](./ChartLegend.md) - Legend component
- [DataDisplay.md](./DataDisplay.md) - DataDisplay component

## Hover Interaction

The AreaChart component supports interactive hover highlighting. When a series is hovered, it remains vibrant while other series dim to create visual focus.

### Interactive Example

```tsx
<AreaChart
  data={data}
  interactive={true}
  chartHeader={{
    title: "Interactive Area Chart",
    subtitle: "Hover over areas to highlight a series",
  }}
  areaGroup={{
    curveStyle: "Curved",
    onSeriesHover: (hoverData) => {
      if (hoverData) {
        console.log(`Hovering: ${hoverData.name} (index: ${hoverData.seriesIndex})`);
      }
    },
    onSeriesClick: (clickData) => {
      console.log(`Clicked: ${clickData.name}`);
    },
  }}
  modes={modes}
/>
```

### Disable Interactivity

```tsx
<AreaChart data={data} interactive={false} modes={modes} />
```

### Hover Behavior

1. **Enabled by default**: Set `interactive={true}` (default) to enable hover
2. **Hover highlighting**: Hovered series keeps bold color at full opacity
3. **Dimming**: Non-hovered series use hover colors with reduced opacity (0.2)
4. **Smooth transitions**: Uses design tokens for easing and duration
5. **Click support**: Optional `onSeriesClick` callback for click handling

## Hover Badge

The AreaChart supports a cursor-following DataBadge that displays the hovered series name.

### Enabling Hover Badge

```tsx
<AreaChart
  data={data}
  interactive={true}
  areaGroup={{
    showHoverBadge: true,
  }}
  modes={modes}
/>
```

### Custom Hover Badge Format

```tsx
<AreaChart
  data={data}
  areaGroup={{
    showHoverBadge: true,
    formatHoverValue: (value, label) => `${label}: Total ${value}`,
  }}
  modes={modes}
/>
```

The hover badge uses:

- **`enterTransition`** collection for fade-in animation
- **`exitTransition`** collection for fade-out animation
- Inverted `colourMode` for visibility contrast

## Performance Notes

- Uses `useMemo` for mode mapping and legend generation
- AreaGroup handles D3 stacking calculations with memoization
- Token resolution benefits from `resolvedCache`

## Use Cases

- Stacked area charts for cumulative data
- Market share visualization over time
- Part-to-whole relationships
- Revenue/cost breakdowns
- Traffic/usage analytics
- Population demographics
- Budget allocation over time
- Product line comparisons
