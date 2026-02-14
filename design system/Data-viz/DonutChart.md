# DonutChart

## Overview

A complete donut chart visualization component that combines ChartHeader, ChartLegend, DonutPathGroup, and ChartFooter into a cohesive chart layout. Displays data as proportional arc segments in a ring shape with optional centered metrics.

**Features:**

- Full chart layout with title, subtitle, legend, and source/notes
- D3-powered donut arc generation
- Automatic categorical coloring from Figma tokens (categorical/bold/1-6)
- Optional centered DataDisplay for summary values
- Full design token integration via modes prop
- Accessibility support with screen reader summaries

## Figma Reference

- **Node ID**: `214:4887`
- **Design File**: DataVis-Components
- **Figma URL**: https://www.figma.com/design/uA5ExvS0cNXbDEKzT9Rnrt/DataVis-Components?node-id=214-4887

## Architecture

```
DonutChart
├── ChartHeader (title + subtitle)
├── ChartLegend (categorical legend up to 6 items)
├── DonutPathGroup
│   ├── shapes (SVG donut arcs)
│   └── dataDisplay (centered metrics)
├── InlineChartKeyGroup (optional - detailed legend with values)
└── ChartFooter (source + notes)
```

## Import

```tsx
import { DonutChart } from "@jio/datavis-components";
```

## Data Formats

### Canonical Format (ChartDataPoint)

```typescript
interface ChartDataPoint {
  category: string; // Category label
  value: number; // Data value (determines arc size)
  color?: string; // Custom color override
  colorIndex?: number; // Categorical color (1-6)
}

const data: ChartDataPoint[] = [
  { category: "Product A", value: 35 },
  { category: "Product B", value: 25 },
  { category: "Product C", value: 20 },
];
```

## Props Interface (Organized Props Pattern)

The component follows the **Organized Props Pattern** with three layers: Global Modes, Parent Props, and Child Configs.

## Props

### Parent Props (Layer 2)

| Prop                      | Type               | Default | Description                                                     |
| ------------------------- | ------------------ | ------- | --------------------------------------------------------------- |
| `data`                    | `ChartDataPoint[]` | `[]`    | Chart data with category, value, and optional color             |
| `width`                   | `number \| string` | `346`   | Width of the chart container                                    |
| `height`                  | `number \| string` | `524`   | Height of the chart container                                   |
| `showHeader`              | `boolean`          | `true`  | Whether to show the chart header                                |
| `showFooter`              | `boolean`          | `true`  | Whether to show the chart footer                                |
| `showLegend`              | `boolean`          | `true`  | Whether to show the chart legend                                |
| `showInlineChartKeyGroup` | `boolean`          | `false` | Whether to show the inline chart key group (legend with values) |
| `interactive`             | `boolean`          | `true`  | Enable hover/click interactivity on donut segments              |

### Child Config Props (Layer 3)

| Prop                  | Type                        | Description                           |
| --------------------- | --------------------------- | ------------------------------------- |
| `chartHeader`         | `ChartHeaderConfig`         | Configuration for title and subtitle  |
| `chartLegend`         | `ChartLegendConfig`         | Configuration for legend items        |
| `donutGroup`          | `DonutGroupConfig`          | Configuration for donut visualization |
| `inlineChartKeyGroup` | `InlineChartKeyGroupConfig` | Configuration for inline key group    |
| `chartFooter`         | `ChartFooterConfig`         | Configuration for source and notes    |

### Global Modes (Layer 1)

| Property      | Type      | Description                                                                                               |
| ------------- | --------- | --------------------------------------------------------------------------------------------------------- |
| `Platform`    | `string`  | Platform size: `"S [Mobile 360]"`, `"M [Tablet portrait 768]"`, `"L [Laptop 1440]"`, `"L [Desktop 1920]"` |
| `Density`     | `string`  | Spacing density: `"Default"`, `"Compact"`, `"Open"`                                                       |
| `colourTheme` | `string`  | Color theme: `"MyJio"`, `"JioFinance"`                                                                    |
| `colourMode`  | `string`  | Color mode: `"Light"`, `"Dark"`                                                                           |
| `Brand`       | `string`  | Brand: `"Jio"`                                                                                            |
| `fullWidth`   | `boolean` | Whether the container should fill 100% width (default: false)                                             |

### ChartHeaderConfig

| Property   | Type     | Default                       | Description         |
| ---------- | -------- | ----------------------------- | ------------------- |
| `title`    | `string` | `"This is chart title."`      | Chart title text    |
| `subtitle` | `string` | `"This is chart subtitle..."` | Chart subtitle text |

### ChartLegendConfig

| Property | Type                | Default        | Description                                     |
| -------- | ------------------- | -------------- | ----------------------------------------------- |
| `items`  | `ChartLegendItem[]` | auto-generated | Manual legend items (overrides auto-generation) |

### DonutGroupConfig

| Property           | Type                                                                | Default     | Description                                         |
| ------------------ | ------------------------------------------------------------------- | ----------- | --------------------------------------------------- |
| `arcWidth`         | `ArcWidthSize`                                                      | `"M"`       | Arc width: "XS", "S", "M", "L", "XL", "2XL"         |
| `innerRadiusRatio` | `number` (0-1)                                                      | calculated  | Inner radius ratio (overrides arcWidth calculation) |
| `startAngle`       | `number`                                                            | `0`         | Start angle in degrees (0 = right side)             |
| `padAngle`         | `number`                                                            | `0`         | Padding angle between segments in degrees           |
| `showDataDisplay`  | `boolean`                                                           | `true`      | Whether to show the centered DataDisplay            |
| `dataDisplay`      | `DonutDataDisplayConfig`                                            | `{}`        | Configuration for the centered DataDisplay          |
| `showHoverBadge`   | `boolean`                                                           | `false`     | Show DataBadge that follows cursor when hovering    |
| `formatHoverValue` | `(value: number, category?: string, percentage?: number) => string` | default     | Custom formatter for hover badge value              |
| `onArcHover`       | `(data: DonutArcHoverData) => void`                                 | `undefined` | Callback fired when any arc hover state changes     |
| `onArcClick`       | `(data: DonutArcHoverData) => void`                                 | `undefined` | Callback fired when any arc is clicked              |
| `hoveredArcIndex`  | `number`                                                            | `undefined` | Index of currently hovered arc (controlled state)   |

**Note:** The donut automatically fills the available space within its container wrapper. The donut sizes itself to the smallest dimension (width or height) to maintain its circular shape.

### DonutArcHoverData

| Property     | Type      | Description                          |
| ------------ | --------- | ------------------------------------ |
| `index`      | `number`  | Arc segment index                    |
| `category`   | `string`  | Category label                       |
| `value`      | `number`  | Data value                           |
| `percentage` | `number`  | Percentage of total (0-100)          |
| `isHovered`  | `boolean` | Whether the arc is currently hovered |
| `mouseX`     | `number`  | Mouse X coordinate (optional)        |
| `mouseY`     | `number`  | Mouse Y coordinate (optional)        |
| `color`      | `string`  | Color of the hovered arc (optional)  |

### DonutDataDisplayConfig

| Property                | Type                                                                | Default      | Description                                                          |
| ----------------------- | ------------------------------------------------------------------- | ------------ | -------------------------------------------------------------------- |
| `mode`                  | `"static" \| "hover"`                                               | `"static"`   | Display mode: static uses provided values, hover updates dynamically |
| `label`                 | `string`                                                            | `"Label."`   | The main label text above the data value                             |
| `showLabelIcon`         | `boolean`                                                           | `false`      | Whether to show info icon next to label                              |
| `leadValue`             | `string`                                                            | `"£2,390"`   | The primary data value                                               |
| `supportingValue`       | `string`                                                            | `""`         | Secondary value next to lead value                                   |
| `showSupportingValue`   | `boolean`                                                           | `false`      | Whether to show supporting value                                     |
| `supportingLabel`       | `string`                                                            | `""`         | Descriptive text below the values                                    |
| `showSupportingLabel`   | `boolean`                                                           | `true`       | Whether to show supporting label                                     |
| `showContentRight`      | `boolean`                                                           | `false`      | Whether to show the semantic badge                                   |
| `badgeValue`            | `string`                                                            | `""`         | The badge value to display                                           |
| `badgeAutoDetect`       | `boolean`                                                           | `true`       | Auto-detect semantic mode from value                                 |
| `badgeSemanticMode`     | `"positive" \| "negative" \| "warning"`                             | `"positive"` | Manual semantic mode when autoDetect is false                        |
| `showBadgeIcon`         | `boolean`                                                           | `true`       | Whether to show chevron icon in badge                                |
| `size`                  | `"S" \| "M" \| "L"`                                                 | `"L"`        | Typography size variant                                              |
| `formatHoverLeadValue`  | `(value: number, category?: string, percentage?: number) => string` | `undefined`  | Custom formatter for lead value in hover mode                        |
| `formatHoverBadgeValue` | `(value: number, category?: string, percentage?: number) => string` | `undefined`  | Custom formatter for badge value in hover mode                       |

### InlineChartKeyGroupConfig

| Property                    | Type                             | Default            | Description                                        |
| --------------------------- | -------------------------------- | ------------------ | -------------------------------------------------- |
| `data`                      | `InlineChartKeyGroupItem[]`      | auto-generated     | Custom data (overrides auto-generation from donut) |
| `formatValue`               | `(value: number) => string`      | `toLocaleString()` | Format function for primary value (dataSlot1)      |
| `showPercentage`            | `boolean`                        | `false`            | Whether to show percentage in dataSlot2            |
| `formatPercentage`          | `(percentage: number) => string` | `"X.X%"`           | Format function for percentage value               |
| `defaultType`               | `"circle" \| "dashed" \| "line"` | `"circle"`         | Default indicator type for all items               |
| `defaultShowShapeIndicator` | `boolean`                        | `true`             | Whether to show the shape indicator                |

**Auto-sync with Donut Data:** When `data` is not provided, the InlineChartKeyGroup automatically generates items from the donut data, including:

- Category labels from donut segments
- Values from donut segments (formatted via `formatValue`)
- Colors from donut segments (auto-assigned categorical colors)
- Percentages (when `showPercentage: true`)

### ChartFooterConfig

| Property | Type     | Default               | Description             |
| -------- | -------- | --------------------- | ----------------------- |
| `source` | `string` | `"Source: jio.com."`  | Source attribution text |
| `notes`  | `string` | `"Additional notes."` | Additional notes text   |

## Usage Examples

### Basic Usage

```tsx
import { DonutChart } from "@jio/datavis-components";

<DonutChart
  data={[
    { category: "Product A", value: 35 },
    { category: "Product B", value: 25 },
    { category: "Product C", value: 20 },
    { category: "Product D", value: 10 },
    { category: "Product E", value: 7 },
    { category: "Product F", value: 3 },
  ]}
  chartHeader={{
    title: "Revenue Distribution",
    subtitle: "By product category",
  }}
  donutGroup={{
    showDataDisplay: true,
    dataDisplay: {
      label: "Total",
      leadValue: "£12,390",
      supportingLabel: "Monthly revenue",
    },
  }}
  chartFooter={{
    source: "Source: Analytics",
  }}
  modes={{
    Platform: "L [Laptop 1440]",
    colourMode: "Light",
  }}
/>;
```

### Progress Donut

```tsx
<DonutChart
  data={[
    { category: "Completed", value: 75 },
    { category: "Remaining", value: 25 },
  ]}
  chartHeader={{
    title: "Project Progress",
    subtitle: "Development milestone",
  }}
  donutGroup={{
    arcWidth: "XL",
    showDataDisplay: true,
    dataDisplay: {
      label: "Progress",
      leadValue: "75%",
      supportingLabel: "Complete",
      size: "L",
    },
  }}
/>
```

### Without Header and Footer

```tsx
<DonutChart
  data={data}
  showHeader={false}
  showFooter={false}
  donutGroup={{
    showDataDisplay: true,
    dataDisplay: {
      label: "Total",
      leadValue: "£12,390",
    },
  }}
/>
```

### Custom Legend Items

```tsx
<DonutChart
  data={quarterlyData}
  chartLegend={{
    items: [
      { label: "January - March", color: "#ff671f" },
      { label: "April - June", color: "#3900ad" },
      { label: "July - September", color: "#465aff" },
      { label: "October - December", color: "#99d6ff" },
    ],
  }}
  donutGroup={{
    showDataDisplay: true,
    dataDisplay: {
      label: "Annual",
      leadValue: "£100K",
    },
  }}
/>
```

### Dark Mode

```tsx
<DonutChart
  data={data}
  chartHeader={{
    title: "Revenue Distribution",
    subtitle: "Dark mode visualization",
  }}
  donutGroup={{
    showDataDisplay: true,
    dataDisplay: {
      label: "Total",
      leadValue: "£12,390",
    },
  }}
  modes={{
    colourMode: "Dark",
  }}
/>
```

### Full Width Container

```tsx
<DonutChart
  data={data}
  chartHeader={{
    title: "Revenue Distribution",
  }}
  modes={{
    fullWidth: true,
    colourMode: "Light",
  }}
/>
```

### With Segment Padding

```tsx
<DonutChart
  data={data}
  chartHeader={{
    title: "Segmented Donut",
    subtitle: "With gaps between segments",
  }}
  donutGroup={{
    padAngle: 2,
    showDataDisplay: true,
    dataDisplay: {
      label: "Total",
      leadValue: "£12,390",
    },
  }}
/>
```

### Arc Width Variations

```tsx
// Thin donut
<DonutChart
  data={data}
  donutGroup={{
    arcWidth: "S",
    dataDisplay: { label: "Thin", leadValue: "100%" },
  }}
/>

// Thick donut
<DonutChart
  data={data}
  donutGroup={{
    arcWidth: "2XL",
    dataDisplay: { label: "Thick", leadValue: "100%" },
  }}
/>
```

### With Hover Callbacks

```tsx
<DonutChart
  data={data}
  interactive={true}
  chartHeader={{
    title: "Interactive Donut",
    subtitle: "Hover over segments to see details",
  }}
  donutGroup={{
    showDataDisplay: true,
    dataDisplay: {
      label: "Total",
      leadValue: "£12,390",
    },
    onArcHover: (data) => {
      console.log(`Hovered: ${data.category} - ${data.value} (${data.percentage.toFixed(1)}%)`);
    },
    onArcClick: (data) => {
      console.log(`Clicked: ${data.category}`);
    },
  }}
/>
```

### Non-Interactive Donut

```tsx
<DonutChart
  data={data}
  interactive={false}
  chartHeader={{
    title: "Static Donut",
    subtitle: "No hover or click interactions",
  }}
/>
```

### With InlineChartKeyGroup

The InlineChartKeyGroup provides a detailed legend with values, synchronized with the donut data.

```tsx
<DonutChart
  data={[
    { category: "Product A", value: 35 },
    { category: "Product B", value: 25 },
    { category: "Product C", value: 20 },
    { category: "Product D", value: 10 },
    { category: "Product E", value: 7 },
    { category: "Product F", value: 3 },
  ]}
  showInlineChartKeyGroup={true}
  chartHeader={{
    title: "Revenue Distribution",
    subtitle: "With inline chart key group",
  }}
  donutGroup={{
    showDataDisplay: true,
    dataDisplay: {
      label: "Total",
      leadValue: "£2,390",
    },
  }}
/>
```

### InlineChartKeyGroup with Percentages

```tsx
<DonutChart
  data={data}
  showInlineChartKeyGroup={true}
  showLegend={false}
  inlineChartKeyGroup={{
    showPercentage: true,
    formatValue: (v) => v.toLocaleString(),
    formatPercentage: (p) => `${p.toFixed(1)}%`,
  }}
/>
```

### InlineChartKeyGroup with Currency Format

```tsx
<DonutChart
  data={[
    { category: "Product A", value: 35000 },
    { category: "Product B", value: 25000 },
    { category: "Product C", value: 20000 },
  ]}
  showInlineChartKeyGroup={true}
  showLegend={false}
  inlineChartKeyGroup={{
    formatValue: (v) => `£${(v / 1000).toFixed(0)}k`,
    showPercentage: false,
  }}
/>
```

### InlineChartKeyGroup Replacing Legend

You can use InlineChartKeyGroup as a more detailed alternative to the standard legend:

```tsx
<DonutChart
  data={data}
  showLegend={false}
  showInlineChartKeyGroup={true}
  inlineChartKeyGroup={{
    formatValue: (v) => `${v}%`,
  }}
  chartHeader={{
    title: "Quarterly Breakdown",
    subtitle: "Using InlineChartKeyGroup instead of legend",
  }}
/>
```

## Design Tokens Used

### Spacing

- `Dimensions/Spacings/L` (20px) - Gap between chart sections

### Colors (Categorical)

- `categorical/bold/1` through `categorical/bold/6` - Automatic segment coloring

### Arc Width (barWidth collection)

| Size | Token Value |
| ---- | ----------- |
| XS   | ~8px        |
| S    | ~12px       |
| M    | ~16px       |
| L    | ~20px       |
| XL   | ~24px       |
| 2XL  | ~32px       |

## Hover Interaction

### Hover Badge

The DataBadge follows the cursor as it moves over arc segments, displaying the percentage value.

```tsx
<DonutChart
  data={data}
  interactive={true}
  chartHeader={{
    title: "Donut with Hover Badge",
    subtitle: "Badge follows cursor showing percentage",
  }}
  donutGroup={{
    showHoverBadge: true,
    showDataDisplay: true,
    dataDisplay: {
      label: "Total",
      leadValue: "£12,390",
    },
  }}
/>
```

### Custom Hover Badge Format

```tsx
<DonutChart
  data={data}
  donutGroup={{
    showHoverBadge: true,
    formatHoverValue: (value, category, percentage) =>
      `${category}: ${value} (${percentage?.toFixed(0)}%)`,
  }}
/>
```

## DataDisplay Integration

This chart supports an optional DataDisplay component positioned in the center of the donut. See **[DataDisplay Integration](./DataDisplayIntegration.md)** for full configuration including static/hover modes, custom formatters, and requirements.

**Chart-specific formatter signatures:**

- `formatHoverLeadValue`: `(value: number, category?: string, percentage?: number) => string`
- `formatHoverBadgeValue`: `(value: number, category?: string, percentage?: number) => string`

The centered DataDisplay can update dynamically when hovering over arc segments. In hover mode:

- `label` shows the hovered segment's category
- `leadValue` shows the segment's value (formatted by `formatHoverLeadValue` if provided)
- `badgeValue` shows the segment's percentage (formatted by `formatHoverBadgeValue` if provided)

## Accessibility

Wrapped by `ChartAccessibility` (enabled by default). Provides ARIA attributes, auto-generated summaries, and hidden data tables. See **[ChartAccessibility.md](./ChartAccessibility.md)** for configuration.

```tsx
<DonutChart
  data={data}
  chartHeader={{ title: "Revenue Distribution" }}
  accessibility={{
    enabled: true,
    dataTable: true,
    summary: "Pie chart showing revenue distribution across 6 product categories.",
    ariaLabel: "Revenue distribution chart",
  }}
/>
```

**Screen reader output example:** _"pie chart titled 'Revenue Distribution'. Shows 6 data points. Values range from 3 to 35. Highest value: 35 at Product A."_

## Child Components

- **DonutPathGroup** - The core donut visualization component
- **ChartHeader** - Title and subtitle component
- **ChartLegend** - Legend with categorical color indicators
- **InlineChartKeyGroup** - Detailed legend with values (optional)
- **ChartFooter** - Source and notes component
- **DataDisplay** - Centered value display with label

## Performance Notes

- Uses `useMemo` for mode mapping and legend generation
- Token resolution benefits from `resolvedCache`

## Related Documentation

- **[DonutPathGroup.md](./DonutPathGroup.md)** - The core donut visualization component
- **[ChartHeader.md](./ChartHeader.md)** - Title and subtitle component
- **[ChartLegend.md](./ChartLegend.md)** - Legend with categorical color indicators
- **[InlineChartKeyGroup.md](./InlineChartKeyGroup.md)** - Detailed legend with values
- **[ChartFooter.md](./ChartFooter.md)** - Source and notes component
- **[DataDisplay.md](./DataDisplay.md)** - Centered value display with label

## Files

| File                                | Description              |
| ----------------------------------- | ------------------------ |
| `src/charts/DonutChart.tsx`         | Component implementation |
| `src/charts/DonutChart.stories.tsx` | Storybook stories        |
