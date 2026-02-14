# HorizontalButterflyBarChart

## Overview

The HorizontalButterflyBarChart displays two series growing outward from a center axis, commonly used for:

- Population pyramids (age distribution by gender)
- Year-over-year comparisons (2023 vs 2024)
- Before/after analysis
- Any dual-series comparison with a shared dimension

**This component follows the [Organized Props Pattern](./OrganizedPropsPattern.md).**

## Figma Reference

- **Node ID**: `262:8111`
- **Design File**: DataVis-Components
- **Figma URL**: https://www.figma.com/design/uA5ExvS0cNXbDEKzT9Rnrt/DataVis-Components?node-id=262-8111

## Architecture

```
HorizontalButterflyBarChart
├── ChartHeader (optional)
├── ChartLegend (optional)
├── DataDisplay (optional)
├── HorizontalButterflyBarGroup
│   ├── contentWrapper
│   │   └── HorizontalButterflyBar[] (for each category)
│   └── XAxis (dual mirrored scales)
└── ChartFooter (optional)
```

## Import

```tsx
import HorizontalButterflyBarChart from "./charts/HorizontalButterflyBarChart";
```

## Data Formats

Uses canonical `ChartSeriesDataPoint[]` format with exactly 2 series per category:

```tsx
const data: ChartSeriesDataPoint[] = [
  { category: "0-14", series: "Male", value: 15 },
  { category: "0-14", series: "Female", value: 18 },
  { category: "15-24", series: "Male", value: 22 },
  { category: "15-24", series: "Female", value: 24 },
  // ... more categories
];
```

The first series becomes the left bar, the second becomes the right bar.

## Props Interface (Organized Props Pattern)

### Parent Component Props (Layer 2)

| Prop              | Type                     | Default  | Description                               |
| ----------------- | ------------------------ | -------- | ----------------------------------------- |
| `data`            | `ChartSeriesDataPoint[]` | Required | Canonical data with 2 series per category |
| `width`           | `number \| string`       | `420`    | Container width                           |
| `height`          | `number \| string`       | `500`    | Container height                          |
| `showHeader`      | `boolean`                | `true`   | Show chart header                         |
| `showFooter`      | `boolean`                | `true`   | Show chart footer                         |
| `showLegend`      | `boolean`                | `true`   | Show chart legend                         |
| `showDataDisplay` | `boolean`                | `true`   | Show data display                         |
| `interactive`     | `boolean`                | `true`   | Enable hover/click                        |

### Child Component Configurations (Layer 3)

#### `chartHeader`

| Prop       | Type     | Default                       | Description    |
| ---------- | -------- | ----------------------------- | -------------- |
| `title`    | `string` | `"This is chart title."`      | Chart title    |
| `subtitle` | `string` | `"This is chart subtitle..."` | Chart subtitle |

#### `chartLegend`

| Prop         | Type                             | Default        | Description         |
| ------------ | -------------------------------- | -------------- | ------------------- |
| `items`      | `ChartLegendItem[]`              | Auto-generated | Manual legend items |
| `leftLabel`  | `string`                         | Auto-detected  | Left series label   |
| `rightLabel` | `string`                         | Auto-detected  | Right series label  |
| `type`       | `"circle" \| "dashed" \| "line"` | `"circle"`     | Indicator type      |

#### `dataDisplay`

| Prop                    | Type                           | Default     | Description            |
| ----------------------- | ------------------------------ | ----------- | ---------------------- |
| `mode`                  | `"static" \| "hover"`          | `"static"`  | Display mode           |
| `label`                 | `string`                       | `"Label."`  | Main label text        |
| `leadValue`             | `string`                       | `"£2,390"`  | Primary value          |
| `supportingValue`       | `string`                       | `"/ 3,000"` | Secondary value        |
| `badgeValue`            | `string`                       | `"23.5"`    | Badge value            |
| `size`                  | `"S" \| "M" \| "L"`            | `"L"`       | Typography size        |
| `type`                  | `"Left" \| "Centered"`         | `"Left"`    | Layout type            |
| `formatHoverLeadValue`  | `(value, category?) => string` | -           | Custom hover formatter |
| `formatHoverBadgeValue` | `(value, category?) => string` | -           | Custom badge formatter |

#### `barGroup`

| Prop                    | Type                        | Default         | Description             |
| ----------------------- | --------------------------- | --------------- | ----------------------- |
| `seriesOrder`           | `[string, string]`          | Auto-detected   | Left/right series names |
| `showValueLabels`       | `boolean`                   | `false`         | Show outside labels     |
| `showValueLabelsInside` | `boolean`                   | `false`         | Show inside labels      |
| `showCategoryLabels`    | `boolean`                   | `true`          | Show center labels      |
| `showXAxis`             | `boolean`                   | `true`          | Show X-axis             |
| `xAxisTickCount`        | `number`                    | `6`             | Target tick count       |
| `valueFormat`           | `ValueFormatConfig`         | -               | Value formatting        |
| `barHeight`             | `string`                    | `"M"`           | Bar height size         |
| `categoryLabelWidth`    | `number`                    | Auto-calculated | Fixed label width       |
| `showHoverBadge`        | `boolean`                   | `false`         | Show hover badge        |
| `formatHoverValue`      | `(value, label?) => string` | -               | Hover badge formatter   |
| `onBarHover`            | `(data) => void`            | -               | Hover callback          |
| `onBarClick`            | `(data) => void`            | -               | Click callback          |

#### `chartFooter`

| Prop     | Type     | Default               | Description |
| -------- | -------- | --------------------- | ----------- |
| `source` | `string` | `"Source: jio.com."`  | Source text |
| `notes`  | `string` | `"Additional notes."` | Notes text  |

### Global Modes (Layer 1)

```tsx
modes: {
  Platform: "L [Laptop 1440]",  // "7 Platform" collection
  Density: "Default",           // "6 Density" collection
  colourTheme: "MyJio",         // "9 Theme" collection
  colourMode: "Light",          // "5 Colour Mode" collection
  Brand: "Jio",                 // "10 Brand" collection
  fullWidth: false,             // Fill available width
}
```

## Design Tokens Used

| Property        | Variable Name           | Fallback  | Description                |
| --------------- | ----------------------- | --------- | -------------------------- |
| Container Gap   | `Dimensions/Spacings/L` | `20px`    | Gap between chart sections |
| Left Bar Color  | `categorical/bold/1`    | `#ff671f` | Left bar/legend color      |
| Right Bar Color | `categorical/bold/2`    | `#3900ad` | Right bar/legend color     |

```
┌─────────────────────────────────────────────────────────────────┐
│                   HorizontalButterflyBarChart                   │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │  Title                                         ChartHeader  │ │
│ │  Subtitle                                                   │ │
│ └─────────────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │  ● Category name  ● Category name              ChartLegend  │ │
│ └─────────────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │  Label.                                        DataDisplay  │ │
│ │  £2,390 / 3,000                          ▲ 23.5             │ │
│ │  Supporting label.                                          │ │
│ └─────────────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │   [leftBar]──┤ Category ├──[rightBar]                       │ │
│ │   [leftBar]──┤ Category ├──[rightBar]                       │ │
│ │   [leftBar]──┤ Category ├──[rightBar]   ButterflyBarGroup   │ │
│ │   50  40  30  20  10  0 │ gap │ 0  10  20  30  40  50       │ │
│ └─────────────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │  Source: jio.com.                Additional notes. Footer   │ │
│ └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## Usage Examples

### Basic Usage

```tsx
import { HorizontalButterflyBarChart } from "@jio/datavis-components";
import type { ChartSeriesDataPoint } from "@jio/datavis-components";

const data: ChartSeriesDataPoint[] = [
  { category: "0-14", series: "Male", value: 15 },
  { category: "0-14", series: "Female", value: 18 },
  { category: "15-24", series: "Male", value: 22 },
  { category: "15-24", series: "Female", value: 24 },
];

<HorizontalButterflyBarChart
  data={data}
  chartHeader={{
    title: "Population by Age Group",
    subtitle: "Male vs Female distribution",
  }}
  barGroup={{ seriesOrder: ["Male", "Female"] }}
  modes={{ colourMode: "Light" }}
/>;
```

### With Hover-Driven DataDisplay

```tsx
<HorizontalButterflyBarChart
  data={data}
  showDataDisplay={true}
  dataDisplay={{
    mode: "hover",
    label: "Age Group",
    leadValue: "—",
    supportingLabel: "Hover to see details",
  }}
  barGroup={{
    seriesOrder: ["Male", "Female"],
    showHoverBadge: true,
  }}
/>
```

### Year-over-Year Comparison

```tsx
const comparisonData: ChartSeriesDataPoint[] = [
  { category: "Revenue", series: "2023", value: 85 },
  { category: "Revenue", series: "2024", value: 120 },
  { category: "Expenses", series: "2023", value: 65 },
  { category: "Expenses", series: "2024", value: 75 },
];

<HorizontalButterflyBarChart
  data={comparisonData}
  chartHeader={{
    title: "Year-over-Year Comparison",
    subtitle: "2023 vs 2024 financial metrics",
  }}
  chartLegend={{
    leftLabel: "2023",
    rightLabel: "2024",
  }}
  barGroup={{
    seriesOrder: ["2023", "2024"],
    barHeight: "L",
  }}
/>;
```

### With Value Formatting

```tsx
<HorizontalButterflyBarChart
  data={data}
  barGroup={{
    valueFormat: { type: "percentage", maxDecimals: 0 },
  }}
/>
```

## Key Behaviors

### Series Auto-Detection

If `seriesOrder` is not provided, the component automatically detects the two unique series from the data.

### Legend Generation

The legend is auto-generated from the series names:

- Left series → First legend item (categorical/bold/1 color)
- Right series → Second legend item (categorical/bold/2 color)

### DataDisplay Modes

- **Static mode** (default): Uses provided values directly
- **Hover mode**: Updates dynamically when bars are hovered

### Dual X-Axis

The X-axis displays two mirrored scales:

- Left axis: max → 0 (growing left)
- Right axis: 0 → max (growing right)

## DataDisplay Integration

This chart supports an optional DataDisplay component positioned between ChartLegend and the group component. See **[DataDisplay Integration](./DataDisplayIntegration.md)** for full configuration including static/hover modes, custom formatters, and requirements.

## Accessibility

Wrapped by `ChartAccessibility` (enabled by default). Provides ARIA attributes, auto-generated summaries, and hidden data tables. See **[ChartAccessibility.md](./ChartAccessibility.md)** for configuration.

## Child Components

| Component                     | Config Prop   | File                                | Description               |
| ----------------------------- | ------------- | ----------------------------------- | ------------------------- |
| `ChartHeader`                 | `chartHeader` | `./ChartHeader.tsx`                 | Title and subtitle        |
| `ChartLegend`                 | `chartLegend` | `./ChartLegend.tsx`                 | Legend with series colors |
| `HorizontalButterflyBarGroup` | `barGroup`    | `./HorizontalButterflyBarGroup.tsx` | Bar group component       |
| `ChartFooter`                 | `chartFooter` | `./ChartFooter.tsx`                 | Source and notes          |

## Performance Notes

- Uses `useMemo` for mode mapping and legend generation
- Token resolution benefits from `resolvedCache`

## Related Documentation

- [OrganizedPropsPattern.md](./OrganizedPropsPattern.md) - Pattern documentation
- [HorizontalButterflyBarGroup.md](./HorizontalButterflyBarGroup.md) - Bar group component
- [ChartHeader.md](./ChartHeader.md) - Header component
- [ChartFooter.md](./ChartFooter.md) - Footer component
- [ChartLegend.md](./ChartLegend.md) - Legend component
- [DataDisplay.md](./DataDisplay.md) - DataDisplay component

## Files

| File                                         | Description                   |
| -------------------------------------------- | ----------------------------- |
| `src/charts/HorizontalButterflyBarChart.tsx` | Main component implementation |
