# HistogramChart

## Overview

HistogramChart is a top-level chart component following the **Organized Props Pattern**. It provides a complete visualization with:

- Title and subtitle (ChartHeader)
- Legend with categorical colors (ChartLegend)
- Data display with label, value, and semantic badge (DataDisplay)
- Histogram visualization with flexible-width bars (HistogramGroup)
- Source and notes footer (ChartFooter)

## Figma Reference

- **Node ID**: `233:31161`
- **Design File**: DataVis-Components
- **Figma URL**: https://www.figma.com/design/uA5ExvS0cNXbDEKzT9Rnrt/DataVis-Components?node-id=233-31161

## Architecture

```
HistogramChart
├── ChartAccessibility (wrapper)
│   └── histogramChart (container)
│       ├── ChartHeader (optional)
│       │   ├── ChartTitle
│       │   └── ChartSubtitle
│       ├── ChartLegend (optional)
│       │   └── ChartKey[] (categorical colors)
│       ├── DataDisplay (optional, when showDataDisplay=true)
│       │   ├── contentLeft
│       │   │   ├── mainLabel (ChartBody + optional InfoIcon)
│       │   │   └── DataHead (DataLead + DataSupporting + SupportingLabel)
│       │   └── contentRight (DataBadgeSemantic)
│       ├── HistogramGroup
│       │   ├── YAxis (optional)
│       │   ├── contentWrapper
│       │   │   ├── barWrapper
│       │   │   │   └── verticalBar[] (flex: 1)
│       │   │   ├── XAxis (optional)
│       │   │   └── AvgLine (optional)
│       │   └── HoverBadge (optional)
│       └── ChartFooter (optional)
│           ├── source (ChartBody)
│           └── notes (ChartBody)
```

## Import

```tsx
import { HistogramChart } from "@jio/datavis-components";
```

## Data Formats

### Canonical Format (Recommended)

```typescript
import type { ChartDataPoint } from "@jio/datavis-components";

const distributionData: ChartDataPoint[] = [
  { category: "0", value: 5 },
  { category: "1", value: 12 },
  { category: "2", value: 25 },
  { category: "3", value: 45 },
  // ... more data points
];
```

### Legacy Format (Still Supported)

```typescript
const data: HistogramDataPoint[] = [
  { label: "0", value: 5 },
  { label: "1", value: 12 },
];
```

## Props Interface (Organized Props Pattern)

The component follows a three-layer architecture:

```
┌─────────────────────────────────────────────────────────────────┐
│ LAYER 1: Global Modes (Design Token Resolution)                │
│ modes: { Platform, Density, colourTheme, colourMode, Brand,    │
│          fullWidth }                                            │
│ Applied to: ALL child components automatically                  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ LAYER 2: Parent Component Props                                 │
│ - data, width, height                                          │
│ - showHeader, showFooter, showLegend, showDataDisplay          │
│ - interactive                                                   │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ LAYER 3: Child Component Configs                                │
│ chartHeader: { title, subtitle }                               │
│ chartLegend: { items, label, type, showDataHead, ... }         │
│ dataDisplay: { mode, label, leadValue, badgeValue, ... }       │
│ histogramGroup: { showYAxis, showXAxis, showAvgLine, ... }     │
│ chartFooter: { source, notes }                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Props

### Parent Props (Layer 2)

| Prop              | Type                                       | Default | Description                                                          |
| ----------------- | ------------------------------------------ | ------- | -------------------------------------------------------------------- |
| `data`            | `ChartDataPoint[] \| HistogramDataPoint[]` | `[]`    | Array of data points                                                 |
| `width`           | `number \| string`                         | `346`   | Total chart width                                                    |
| `height`          | `number \| string`                         | `400`   | **Total height of the chart.** HistogramGroup fills remaining space. |
| `showHeader`      | `boolean`                                  | `true`  | Show chart header                                                    |
| `showFooter`      | `boolean`                                  | `true`  | Show chart footer                                                    |
| `showLegend`      | `boolean`                                  | `true`  | Show chart legend                                                    |
| `showDataDisplay` | `boolean`                                  | `false` | Show DataDisplay section                                             |
| `interactive`     | `boolean`                                  | `true`  | Enable bar interactivity                                             |

### ChartHeader Config

| Prop       | Type     | Default                | Description         |
| ---------- | -------- | ---------------------- | ------------------- |
| `title`    | `string` | "This is chart title." | Chart title text    |
| `subtitle` | `string` | (default text)         | Chart subtitle text |

### ChartLegend Config

| Prop                  | Type                             | Default    | Description                    |
| --------------------- | -------------------------------- | ---------- | ------------------------------ |
| `items`               | `ChartLegendItem[]`              | -          | Manual legend items            |
| `label`               | `string`                         | -          | Simple label for single-series |
| `type`                | `"circle" \| "dashed" \| "line"` | `"circle"` | Indicator type                 |
| `showDataHead`        | `boolean`                        | `false`    | Show DataHead in legend        |
| `leadValue`           | `string`                         | -          | Lead value for DataHead        |
| `supportingValue`     | `string`                         | -          | Supporting value for DataHead  |
| `supportingLabelText` | `string`                         | -          | Supporting label text          |
| `showDataSupporting`  | `boolean`                        | `true`     | Show DataSupporting            |
| `showSupportingLabel` | `boolean`                        | `true`     | Show SupportingLabel           |

### HistogramGroup Config

| Prop               | Type                                        | Default | Description                   |
| ------------------ | ------------------------------------------- | ------- | ----------------------------- |
| `showYAxis`        | `boolean`                                   | `true`  | Show Y-axis                   |
| `showXAxis`        | `boolean`                                   | `true`  | Show X-axis                   |
| `showAvgLine`      | `boolean`                                   | `false` | Show average line             |
| `showHoverBadge`   | `boolean`                                   | `false` | Show hover badge              |
| `yAxisTickCount`   | `number`                                    | `6`     | Y-axis tick count             |
| `xAxisLabels`      | `string[]`                                  | -       | Custom X-axis labels          |
| `xAxisTickCount`   | `number`                                    | `6`     | X-axis tick count             |
| `valueFormat`      | `ValueFormatConfig`                         | -       | Value format config           |
| `formatYAxisValue` | `(value: number) => string`                 | -       | Y-axis formatter              |
| `formatAvgValue`   | `(value: number) => string`                 | -       | Average formatter             |
| `formatHoverValue` | `(value: number, label?: string) => string` | -       | Hover badge formatter         |
| `color`            | `string`                                    | -       | Custom bar color              |
| `colorIndex`       | `number`                                    | `1`     | Categorical color index (1-6) |
| `onBarHover`       | `(data: HistogramBarHoverData) => void`     | -       | Hover callback                |
| `onBarClick`       | `(data: HistogramBarHoverData) => void`     | -       | Click callback                |
| `hoveredBarIndex`  | `number`                                    | -       | Controlled hover state        |

### ChartFooter Config

| Prop     | Type     | Default             | Description        |
| -------- | -------- | ------------------- | ------------------ |
| `source` | `string` | "Source: jio.com."  | Source attribution |
| `notes`  | `string` | "Additional notes." | Additional notes   |

### DataDisplay Config

| Prop                      | Type                                    | Default               | Description                                                          |
| ------------------------- | --------------------------------------- | --------------------- | -------------------------------------------------------------------- |
| `mode`                    | `"static" \| "hover"`                   | `"static"`            | Display mode: static uses provided values, hover updates dynamically |
| `label`                   | `string`                                | `"Label."`            | Main label text above the data value                                 |
| `showLabelIcon`           | `boolean`                               | `false`               | Whether to show info icon next to the main label                     |
| `leadValue`               | `string`                                | `"£2,390"`            | Lead value for static mode or default in hover mode                  |
| `supportingValue`         | `string`                                | `"/ 3,000"`           | Supporting value next to lead value                                  |
| `showSupportingValue`     | `boolean`                               | `true`                | Whether to show supporting value                                     |
| `supportingLabel`         | `string`                                | `"Supporting label."` | Supporting label text below the values                               |
| `showSupportingLabel`     | `boolean`                               | `true`                | Whether to show supporting label                                     |
| `showSupportingLabelIcon` | `boolean`                               | `false`               | Whether to show icon in supporting label                             |
| `showContentRight`        | `boolean`                               | `true`                | Whether to show the semantic badge                                   |
| `badgeValue`              | `string`                                | `"23.5"`              | Badge value for static mode                                          |
| `badgeAutoDetect`         | `boolean`                               | `true`                | Auto-detect semantic mode from value                                 |
| `badgeSemanticMode`       | `"positive" \| "negative" \| "warning"` | `"positive"`          | Manual semantic mode when autoDetect is false                        |
| `showBadgeIcon`           | `boolean`                               | `true`                | Whether to show chevron icon in badge                                |
| `size`                    | `"S" \| "M" \| "L"`                     | `"L"`                 | Typography size variant                                              |
| `type`                    | `"Left" \| "Centered"`                  | `"Left"`              | Layout type: horizontal or vertical                                  |
| `formatHoverLeadValue`    | `(value, category?, index?) => string`  | `undefined`           | Custom formatter for lead value in hover mode                        |
| `formatHoverBadgeValue`   | `(value, category?, index?) => string`  | `undefined`           | Custom formatter for badge value in hover mode                       |

### Global Modes (Layer 1)

| Prop                | Type      | Default | Description                             |
| ------------------- | --------- | ------- | --------------------------------------- |
| `modes.Platform`    | `string`  | -       | Platform mode (e.g., "L [Laptop 1440]") |
| `modes.Density`     | `string`  | -       | Density mode (e.g., "Default")          |
| `modes.colourTheme` | `string`  | -       | Theme mode (e.g., "MyJio")              |
| `modes.colourMode`  | `string`  | -       | Colour mode (e.g., "Light")             |
| `modes.Brand`       | `string`  | -       | Brand mode (e.g., "Jio")                |
| `modes.fullWidth`   | `boolean` | -       | Enable full width layout                |

### Accessibility Config

| Prop                      | Type               | Default  | Description                   |
| ------------------------- | ------------------ | -------- | ----------------------------- |
| `accessibility.enabled`   | `boolean`          | `true`   | Enable accessibility features |
| `accessibility.dataTable` | `boolean`          | `true`   | Include hidden data table     |
| `accessibility.summary`   | `string \| "auto"` | `"auto"` | Chart summary                 |
| `accessibility.ariaLabel` | `string`           | -        | Custom ARIA label             |

## Usage Examples

### Basic Usage

```tsx
import { HistogramChart } from "@jio/datavis-components";

const distributionData = [
  { category: "0", value: 5 },
  { category: "1", value: 12 },
  { category: "2", value: 25 },
  { category: "3", value: 45 },
  // ... more data points
];

<HistogramChart
  data={distributionData}
  chartHeader={{
    title: "Score Distribution",
    subtitle: "Distribution of test scores across the population.",
  }}
  histogramGroup={{
    showYAxis: true,
    showXAxis: true,
    showAvgLine: true,
    showHoverBadge: true,
  }}
  chartFooter={{
    source: "Source: Internal data.",
    notes: "Q4 2025",
  }}
  modes={{
    Platform: "L [Laptop 1440]",
    colourMode: "Light",
    colourTheme: "MyJio",
    Brand: "Jio",
  }}
/>;
```

### With Custom Legend

```tsx
<HistogramChart
  data={distributionData}
  chartLegend={{
    label: "Revenue Distribution",
    type: "circle",
    showDataHead: true,
    leadValue: "£75,230",
    supportingValue: "/ 100,000",
    supportingLabelText: "target",
  }}
  histogramGroup={{
    showYAxis: true,
    showXAxis: true,
  }}
  modes={{ colourMode: "Light" }}
/>
```

### Full Width Layout

```tsx
<HistogramChart
  data={distributionData}
  chartHeader={{
    title: "Full Width Histogram",
    subtitle: "Responsive chart that fills container width.",
  }}
  histogramGroup={{
    showHoverBadge: true,
  }}
  modes={{
    colourMode: "Light",
    fullWidth: true,
  }}
/>
```

### Dark Mode

```tsx
<HistogramChart
  data={distributionData}
  chartHeader={{
    title: "Dark Mode Chart",
    subtitle: "Chart with dark color mode.",
  }}
  histogramGroup={{
    showHoverBadge: true,
  }}
  modes={{
    colourMode: "Dark",
    colourTheme: "MyJio",
  }}
/>
```

### Currency Formatting

```tsx
<HistogramChart
  data={revenueData}
  chartHeader={{
    title: "Revenue Distribution",
    subtitle: "Monthly revenue by segment.",
  }}
  histogramGroup={{
    showYAxis: true,
    showXAxis: true,
    showAvgLine: true,
    showHoverBadge: true,
    valueFormat: {
      type: "currency",
      currency: "INR",
      abbreviate: true,
    },
  }}
  modes={{ colourMode: "Light" }}
/>
```

### Minimal (No Header/Footer/Legend)

```tsx
<HistogramChart
  data={distributionData}
  showHeader={false}
  showFooter={false}
  showLegend={false}
  histogramGroup={{
    showYAxis: true,
    showXAxis: true,
  }}
  modes={{ colourMode: "Light" }}
/>
```

### With DataDisplay (Static Mode)

```tsx
<HistogramChart
  data={distributionData}
  showDataDisplay={true}
  chartHeader={{
    title: "Score Distribution",
    subtitle: "Analysis of test scores.",
  }}
  dataDisplay={{
    mode: "static",
    label: "Total count",
    leadValue: "2,390",
    supportingValue: "/ 3,000",
    supportingLabel: "target participants",
    badgeValue: "+79.6%",
  }}
  modes={{ colourMode: "Light" }}
/>
```

### With DataDisplay (Hover Mode)

DataDisplay updates dynamically when hovering over bars:

```tsx
<HistogramChart
  data={distributionData}
  showDataDisplay={true}
  chartHeader={{
    title: "Score Distribution",
  }}
  dataDisplay={{
    mode: "hover",
    label: "Hover to see values",
    leadValue: "-",
    supportingValue: "",
    showSupportingValue: false,
    badgeValue: "-",
  }}
  histogramGroup={{
    showHoverBadge: false, // Use DataDisplay instead of hover badge
  }}
  modes={{ colourMode: "Light" }}
/>
```

### With DataDisplay (Hover Mode + Custom Formatters)

```tsx
<HistogramChart
  data={distributionData}
  showDataDisplay={true}
  dataDisplay={{
    mode: "hover",
    label: "Select a bin",
    formatHoverLeadValue: (value, category, index) =>
      `Bin ${index + 1}: ${value.toLocaleString()} items`,
    formatHoverBadgeValue: (value, category, index) => {
      const total = distributionData.reduce((sum, d) => sum + d.value, 0);
      return `${((value / total) * 100).toFixed(1)}%`;
    },
  }}
  modes={{ colourMode: "Light" }}
/>
```

## Design Tokens Used

| Token Path              | Purpose                    | Default Value |
| ----------------------- | -------------------------- | ------------- |
| `Dimensions/Spacings/L` | Gap between chart sections | 20px          |

## Height Behavior

The `height` prop controls the **total height** of the HistogramChart container. The HistogramGroup child component automatically stretches to fill the remaining vertical space after header, legend, DataDisplay, and footer are rendered.

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
│          HistogramGroup               │  ← flex: 1 (fills remaining)
│    (YAxis + Bars + XAxis + AvgLine)   │
│                                       │
│                                       │
├───────────────────────────────────────┤
│  ChartFooter (source + notes)         │  ← Auto height
└───────────────────────────────────────┘
        Total height: `height` prop
```

### How It Works

1. **Fixed Container**: The root HistogramChart container uses `height: [prop value]` and `display: flex; flex-direction: column`.
2. **Auto-sized Elements**: Header, Legend, DataDisplay, and Footer take their natural height.
3. **Stretching HistogramGroup**: The HistogramGroup is wrapped in a div with `flex: 1`, which fills all remaining space.
4. **Dynamic Measurement**: HistogramGroup receives `height="100%"` and uses `ResizeObserver` to measure its actual pixel height for D3 scaling.

### Usage Examples

```tsx
// Standard fixed height (default 400px)
<HistogramChart data={data} height={400} />

// Taller chart for more data visibility
<HistogramChart data={data} height={600} />

// Compact dashboard widget
<HistogramChart
  data={data}
  height={280}
  showFooter={false}
  showLegend={false}
/>

// Chart without header/footer - histogram fills entire height
<HistogramChart
  data={data}
  height={300}
  showHeader={false}
  showFooter={false}
  showLegend={false}
/>
```

## Hover Interaction

### Hover Badge

HistogramGroup supports a cursor-following DataBadge that displays hover information when `histogramGroup.showHoverBadge` is enabled.

## DataDisplay Integration

This chart supports an optional DataDisplay component positioned between ChartLegend and HistogramGroup. See **[DataDisplay Integration](./DataDisplayIntegration.md)** for full configuration including static/hover modes, custom formatters, and requirements.

**Chart-specific formatter signatures:**

- `formatHoverLeadValue`: `(value: number, category?: string, index?: number) => string`
- `formatHoverBadgeValue`: `(value: number, category?: string, index?: number) => string`

The formatters receive histogram-specific data:

- `value`: The hovered bar's value
- `category`: The bin label
- `index`: Bar index (0-based)

## Accessibility

Wrapped by `ChartAccessibility` (enabled by default). Provides ARIA attributes, auto-generated summaries, and hidden data tables. See **[ChartAccessibility.md](./ChartAccessibility.md)** for configuration.

The component is wrapped with `ChartAccessibility` which provides:

- ARIA attributes (`role="figure"`, `aria-label`, `aria-describedby`)
- Auto-generated natural language summary
- Hidden data table for screen reader navigation
- Statistics calculation (min, max, avg, trend detection)

```tsx
<HistogramChart
  data={data}
  accessibility={{
    enabled: true,
    dataTable: true,
    summary: "auto", // or custom string
    ariaLabel: "Distribution chart",
  }}
/>
```

**Screen reader output example:** _"bar chart titled 'Score Distribution'. Shows 22 data points. Values range from 5.2 to 98.7. Average value: 45.3."_

## Child Components

| Component          | Description                                |
| ------------------ | ------------------------------------------ |
| `HistogramGroup`   | The core histogram visualization component |
| `VerticalBarChart` | Similar chart with fixed-width bars        |
| `ChartHeader`      | Title and subtitle component               |
| `ChartLegend`      | Legend with ChartKey items                 |
| `ChartFooter`      | Source and notes component                 |
| `DataDisplay`      | Data display with label, value, and badge  |

## Performance Notes

- Uses `useMemo` for mode mapping and legend generation
- Token resolution benefits from `resolvedCache`

## Related Documentation

- **[HistogramGroup.md](./HistogramGroup.md)** - The histogram visualization component
- **[ChartHeader.md](./ChartHeader.md)** - Title and subtitle component
- **[ChartLegend.md](./ChartLegend.md)** - Legend with ChartKey items
- **[ChartFooter.md](./ChartFooter.md)** - Source and notes component
- **[DataDisplay.md](./DataDisplay.md)** - Data display with label, value, and badge
- **[VerticalBarChart.md](./VerticalBarChart.md)** - Similar chart with fixed-width bars

## Files

| File                                    | Description              |
| --------------------------------------- | ------------------------ |
| `src/charts/HistogramChart.tsx`         | Component implementation |
| `src/charts/HistogramChart.stories.tsx` | Storybook stories        |
