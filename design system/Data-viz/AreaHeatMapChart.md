# AreaHeatMapChart

## Overview

A complete heatmap chart component that combines ChartHeader, SequentialChartKey (legend), DataDisplay, AreaHeatMapGroup (heatmap grid), and ChartFooter. Uses sequential color tokens from Figma for color-coded intensity visualization.

**Features:**

- Complete chart wrapper with header, legend, data display, heatmap, and footer
- Sequential color legend synchronized with heatmap colors
- **High values → dark colors**, low values → light colors (matching legend)
- Automatic min/max value derivation for legend labels
- **Handles duplicate row/column labels** (e.g., "T" for Tuesday/Thursday)
- Axis labels are centered with their corresponding rows/columns
- Full design token integration for responsive theming
- Interactive hover with optional HoverBadge or DataDisplay
- DataDisplay supports static values or dynamic hover-driven updates
- Accessibility support via ChartAccessibility wrapper

## Figma Reference

- **Node ID**: `240:9565`
- **Design File**: DataVis-Components
- **Figma URL**: https://www.figma.com/design/uA5ExvS0cNXbDEKzT9Rnrt/DataVis-Components?node-id=240-9565

## Architecture

```
AreaHeatMapChart
├── ChartAccessibility (wrapper)
│   └── Container
│       ├── ChartHeader (optional)
│       │   ├── ChartTitle
│       │   └── ChartSubtitle
│       ├── SequentialChartKey (optional)
│       │   ├── ChartBody (label)
│       │   ├── Gradient bar (9 color segments)
│       │   └── XAxis (Low/High labels)
│       ├── DataDisplay (optional, when showDataDisplay=true)
│       │   ├── contentLeft
│       │   │   ├── mainLabel (ChartBody + optional InfoIcon)
│       │   │   └── DataHead (DataLead + DataSupporting + SupportingLabel)
│       │   └── contentRight (DataBadgeSemantic)
│       ├── AreaHeatMapGroup
│       │   ├── YAxis (row labels)
│       │   └── Visual Container
│       │       ├── Rows Container
│       │       │   └── Cell[] (colored divs)
│       │       └── XAxis (column labels)
│       └── ChartFooter (optional)
│           ├── Source text
│           └── Notes text
```

## Import

```tsx
import { AreaHeatMapChart } from "@jio/datavis-components";
```

## Data Formats

### Canonical Format (Recommended)

```typescript
import type { ChartSeriesDataPoint } from "@jio/datavis-components";

// series = row (Y-axis), category = column (X-axis)
const data: ChartSeriesDataPoint[] = [
  { category: "12am", series: "M", value: 3 },
  { category: "2", series: "M", value: 2 },
  { category: "4", series: "M", value: 6 },
  // ...
];
```

## Props Interface (Organized Props Pattern)

The component follows the **Organized Props Pattern** with three layers: Global Modes, Parent Props, and Child Configs.

## Props

### Layer 2: Parent Props

| Prop                 | Type                                           | Default | Description                                                        |
| -------------------- | ---------------------------------------------- | ------- | ------------------------------------------------------------------ |
| `data`               | `ChartSeriesDataPoint[] \| HeatMapDataPoint[]` | `[]`    | Chart data (canonical or legacy format)                            |
| `width`              | `number \| string`                             | `346`   | Total chart width                                                  |
| `height`             | `number \| string`                             | `500`   | **Total height of the chart.** HeatMapGroup fills remaining space. |
| `showHeader`         | `boolean`                                      | `true`  | Show chart header                                                  |
| `showLegend`         | `boolean`                                      | `true`  | Show sequential chart key legend                                   |
| `showFooter`         | `boolean`                                      | `true`  | Show chart footer                                                  |
| `showDataDisplay`    | `boolean`                                      | `false` | Show DataDisplay section                                           |
| `interactive`        | `boolean`                                      | `true`  | Enable hover/click on cells                                        |
| `colorLevels`        | `number`                                       | `9`     | Number of color intensity levels (1-9)                             |
| `sequentialColorSet` | `1-6`                                          | `1`     | Sequential color category to use                                   |

### Layer 3: Child Component Configs

#### `chartHeader`

| Prop           | Type      | Default                       | Description              |
| -------------- | --------- | ----------------------------- | ------------------------ |
| `title`        | `string`  | `"This is chart title."`      | Chart title              |
| `subtitle`     | `string`  | `"This is chart subtitle..."` | Chart subtitle           |
| `showSubtitle` | `boolean` | `true`                        | Whether to show subtitle |

#### `chartLegend` (SequentialChartKey)

| Prop           | Type               | Default    | Description                      |
| -------------- | ------------------ | ---------- | -------------------------------- |
| `showKeyLabel` | `boolean`          | `true`     | Show label above gradient        |
| `label`        | `string`           | `"Label."` | Legend label text                |
| `lowLabel`     | `string \| number` | `"Low"`    | Text for low (left) tick         |
| `highLabel`    | `string \| number` | `"High"`   | Text for high (right) tick       |
| `barHeight`    | `number`           | `8`        | Height of gradient bar in pixels |

#### `heatmapGroup`

| Prop               | Type                               | Default   | Description             |
| ------------------ | ---------------------------------- | --------- | ----------------------- |
| `showYAxis`        | `boolean`                          | `true`    | Show Y-axis labels      |
| `showXAxis`        | `boolean`                          | `true`    | Show X-axis labels      |
| `showHoverBadge`   | `boolean`                          | `false`   | Show DataBadge on hover |
| `yAxisLabels`      | `string[]`                         | (derived) | Y-axis labels           |
| `xAxisLabels`      | `string[]`                         | (derived) | X-axis labels           |
| `formatHoverValue` | `(value, row?, column?) => string` | -         | Custom hover formatter  |
| `onCellHover`      | `(data) => void`                   | -         | Cell hover callback     |
| `onCellClick`      | `(data) => void`                   | -         | Cell click callback     |

#### `chartFooter`

| Prop     | Type     | Default               | Description        |
| -------- | -------- | --------------------- | ------------------ |
| `source` | `string` | `"Source: jio.com."`  | Source attribution |
| `notes`  | `string` | `"Additional notes."` | Additional notes   |

#### `dataDisplay`

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
| `formatHoverLeadValue`    | `(value, row?, column?) => string`      | `undefined`           | Custom formatter for lead value in hover mode                        |
| `formatHoverBadgeValue`   | `(value, row?, column?) => string`      | `undefined`           | Custom formatter for badge value in hover mode                       |

### Layer 1: Global Modes

| Prop                | Type      | Description            |
| ------------------- | --------- | ---------------------- |
| `modes.Platform`    | `string`  | Device platform sizing |
| `modes.Density`     | `string`  | Spacing density        |
| `modes.colourTheme` | `string`  | Color theme            |
| `modes.colourMode`  | `string`  | Light/Dark mode        |
| `modes.Brand`       | `string`  | Brand entry point      |
| `modes.fullWidth`   | `boolean` | Fill available width   |

## Usage Examples

### Basic Weekly Activity Heatmap

```tsx
import { AreaHeatMapChart } from "@jio/datavis-components";
import type { ChartSeriesDataPoint } from "@jio/datavis-components";

const days = ["M", "T", "W", "T", "F", "S", "S"];
const hours = ["12am", "2", "4", "6", "8", "10", "12pm", "2", "4", "6", "8", "10"];

const data: ChartSeriesDataPoint[] = [];
days.forEach((day) => {
  hours.forEach((hour) => {
    data.push({
      category: hour,
      series: day,
      value: Math.floor(Math.random() * 9) + 1,
    });
  });
});

function WeeklyActivityChart() {
  return (
    <AreaHeatMapChart
      data={data}
      width={346}
      height={448}
      chartHeader={{
        title: "Weekly Activity",
        subtitle: "Hour-by-hour activity levels.",
      }}
      chartLegend={{
        label: "Activity level",
        lowLabel: "Low",
        highLabel: "High",
      }}
      heatmapGroup={{
        yAxisLabels: days,
        xAxisLabels: hours,
      }}
      chartFooter={{
        source: "Source: Analytics.",
        notes: "Last 7 days.",
      }}
      modes={{
        Platform: "L [Laptop 1440]",
        colourMode: "Light",
      }}
    />
  );
}
```

### With Numeric Legend Labels

```tsx
<AreaHeatMapChart
  data={salesData}
  chartLegend={{
    label: "Revenue ($K)",
    lowLabel: 0, // Will show "0"
    highLabel: 1000, // Will show "1,000"
  }}
  modes={{ colourMode: "Light" }}
/>
```

### With Hover Badge and Click Handler

```tsx
<AreaHeatMapChart
  data={data}
  heatmapGroup={{
    showHoverBadge: true,
    formatHoverValue: (value, row, column) => `${row} at ${column}: ${value}`,
    onCellClick: (data) => {
      console.log(`Clicked: ${data.row} at ${data.column} = ${data.value}`);
    },
  }}
  modes={{ colourMode: "Light" }}
/>
```

### Full Width

```tsx
<AreaHeatMapChart
  data={data}
  modes={{
    Platform: "L [Laptop 1440]",
    colourMode: "Light",
    fullWidth: true,
  }}
/>
```

### Dark Mode

```tsx
<AreaHeatMapChart
  data={data}
  modes={{
    Platform: "L [Laptop 1440]",
    colourTheme: "MyJio",
    colourMode: "Dark",
    Brand: "Jio",
  }}
/>
```

## Design Tokens Used

| Token                          | Purpose                    | Default      |
| ------------------------------ | -------------------------- | ------------ |
| `Dimensions/Spacings/L`        | Gap between chart sections | 20px         |
| `Dimensions/Spacings/XS`       | Gap within sections        | 8px          |
| `sequential/category{1-6}/1-9` | Heatmap cell colors        | Orange scale |

## Height Behavior

The `height` prop controls the **total height** of the AreaHeatMapChart container. The AreaHeatMapGroup child component automatically stretches to fill the remaining vertical space after header, legend, DataDisplay, and footer are rendered.

### Layout Diagram

```
┌───────────────────────────────────────┐
│  ChartHeader (title + subtitle)       │  ← Auto height
├───────────────────────────────────────┤
│  SequentialChartKey (legend)          │  ← Auto height
├───────────────────────────────────────┤
│  DataDisplay (optional)               │  ← Auto height
├───────────────────────────────────────┤
│                                       │
│                                       │
│         AreaHeatMapGroup              │  ← flex: 1 (fills remaining)
│    (YAxis + Grid + XAxis)             │
│                                       │
│                                       │
├───────────────────────────────────────┤
│  ChartFooter (source + notes)         │  ← Auto height
└───────────────────────────────────────┘
        Total height: `height` prop
```

### How It Works

1. **Fixed Container**: The root AreaHeatMapChart container uses `height: [prop value]` and `display: flex; flex-direction: column`.
2. **Auto-sized Elements**: Header, Legend, DataDisplay, and Footer take their natural height.
3. **Stretching HeatMapGroup**: The AreaHeatMapGroup is wrapped in a div with `flex: 1`, which fills all remaining space.
4. **Dynamic Measurement**: AreaHeatMapGroup receives `height="100%"` and uses `ResizeObserver` to measure its actual pixel height.

### Usage Examples

```tsx
// Standard fixed height (default 500px)
<AreaHeatMapChart data={data} height={500} />

// Taller chart for more visibility
<AreaHeatMapChart data={data} height={700} />

// Compact dashboard widget
<AreaHeatMapChart
  data={data}
  height={380}
  showFooter={false}
/>

// Chart without header/footer - heatmap fills entire height
<AreaHeatMapChart
  data={data}
  height={350}
  showHeader={false}
  showFooter={false}
  showLegend={false}
/>
```

## Hover Interaction

### Hover Badge

AreaHeatMapGroup supports a cursor-following DataBadge that displays hover information when `heatmapGroup.showHoverBadge` is enabled.

## DataDisplay Integration

This chart supports an optional DataDisplay component positioned between SequentialChartKey (legend) and AreaHeatMapGroup. See **[DataDisplay Integration](./DataDisplayIntegration.md)** for full configuration including static/hover modes, custom formatters, and requirements.

**Chart-specific formatter signatures:**

- `formatHoverLeadValue`: `(value: number, row?: string, column?: string) => string`
- `formatHoverBadgeValue`: `(value: number, row?: string, column?: string) => string`

The formatters receive heatmap-specific data (value, row label, column label). This allows you to:

- Show the cell value with row/column context
- Display custom formatting (e.g., "Monday at 12am: 42 interactions")
- Calculate percentages or other derived values

When hovering in hover mode, the default label shows: `{row} at {column}` (e.g., "M at 12am")

### DataDisplay vs HoverBadge

AreaHeatMapGroup has its own `showHoverBadge` option. When using DataDisplay in hover mode:

- Consider setting `heatmapGroup.showHoverBadge: false` to avoid duplicate hover information
- DataDisplay shows richer data (label, value, badge) in a fixed location
- HoverBadge follows the cursor and shows value only

## Color Synchronization

The `sequentialColorSet` and `colorLevels` props control both the SequentialChartKey legend and the AreaHeatMapGroup cells:

```tsx
<AreaHeatMapChart
  colorLevels={9} // 9 distinct colors
  sequentialColorSet={1} // Uses sequential/category1/1-9 tokens
  // Both legend gradient and heatmap cells use the same color palette
/>
```

**Color Mapping:**

- **High values** → Dark colors (`sequential/category1/1`)
- **Low values** → Light colors (`sequential/category1/9`)

This matches the SequentialChartKey legend where "Low" (light) is on the left and "High" (dark) is on the right.

## Duplicate Label Handling

The component correctly handles duplicate labels in **both rows AND columns**:

```typescript
// Row duplicates: "T" for Tuesday/Thursday, "S" for Saturday/Sunday
const days = ["M", "T", "W", "T", "F", "S", "S"];

// Column duplicates: "2", "4", etc. for AM and PM
const hours = ["12am", "2", "4", "6", "8", "10", "12pm", "2", "4", "6", "8", "10"];
```

The algorithm uses combined occurrence tracking to ensure each cell maps to the correct data point, even when using the canonical data format where labels (not indices) are stored.

## Accessibility

Wrapped by `ChartAccessibility` (enabled by default). Provides ARIA attributes, auto-generated summaries, and hidden data tables. See **[ChartAccessibility.md](./ChartAccessibility.md)** for configuration.

```tsx
<AreaHeatMapChart
  data={data}
  accessibility={{
    enabled: true,
    dataTable: true,
    summary: "auto", // or custom string
  }}
/>
```

## Child Components

- **ChartHeader**: Title and subtitle component
- **SequentialChartKey**: Sequential color legend
- **AreaHeatMapGroup**: The heatmap grid component
- **ChartFooter**: Source and notes component
- **DataDisplay**: Data display with label, value, and badge

## Performance Notes

- Uses `useMemo` for mode mapping and legend generation
- Token resolution benefits from `resolvedCache`

## Related Documentation

- **[AreaHeatMapGroup.md](./AreaHeatMapGroup.md)** - Standalone heatmap grid
- **[SequentialChartKey.md](./SequentialChartKey.md)** - Sequential color legend
- **[DataDisplay.md](./DataDisplay.md)** - Data display with label, value, and badge
- **[ChartHeader.md](./ChartHeader.md)** - Chart title and subtitle
- **[ChartFooter.md](./ChartFooter.md)** - Chart source and notes

## Files

| File                                      | Description              |
| ----------------------------------------- | ------------------------ |
| `src/charts/AreaHeatMapChart.tsx`         | Component implementation |
| `src/charts/AreaHeatMapChart.stories.tsx` | Storybook stories        |
