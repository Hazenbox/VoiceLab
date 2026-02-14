# ProjectionLineChart

## Overview

The ProjectionLineChart is a complete chart visualization component that displays a line chart with an optional projection/confidence band. It combines ChartHeader, ChartLegend, DataDisplay, ProjectionPathGroup, and ChartFooter components. This component is ideal for forecasting visualizations, prediction intervals, and trend charts with uncertainty ranges.

**This component follows the [Organized Props Pattern](./OrganizedPropsPattern.md).**

## Figma Reference

- **Node ID**: `221:3814`
- **Design File**: DataVis-Components
- **Figma URL**: https://www.figma.com/design/uA5ExvS0cNXbDEKzT9Rnrt/DataVis-Components?node-id=221-3814

## Architecture

```
ProjectionLineChart
├── ChartAccessibility (wrapper)
│   ├── ChartHeader (optional)
│   │   ├── ChartTitle
│   │   └── ChartSubtitle
│   ├── ChartLegend (optional)
│   │   └── ChartKey[] (auto-generated or manual)
│   ├── DataDisplay (optional, when showDataDisplay=true)
│   │   ├── contentLeft
│   │   │   ├── mainLabel (ChartBody + optional InfoIcon)
│   │   │   └── DataHead (DataLead + DataSupporting + SupportingLabel)
│   │   └── contentRight (DataBadgeSemantic)
│   ├── ProjectionPathGroup
│   │   ├── YAxis (optional)
│   │   ├── SVG
│   │   │   ├── path (projection area)
│   │   │   └── path (main line)
│   │   ├── HoverLine (conditional)
│   │   └── XAxis (optional)
│   └── ChartFooter (optional)
│       └── ChartBody (source + notes)
```

## Import

```tsx
import ProjectionLineChart from "./charts/ProjectionLineChart";
```

## Data Formats

### ProjectionDataPoint

```typescript
interface ProjectionDataPoint {
  /** Category label (x-axis) */
  category: string;
  /** Main value (the solid line) */
  value: number;
  /** Upper bound of projection/confidence interval (optional) */
  upperBound?: number;
  /** Lower bound of projection/confidence interval (optional) */
  lowerBound?: number;
}
```

### Example Data

```typescript
const projectionData: ProjectionDataPoint[] = [
  { category: "Q1 '24", value: 2, lowerBound: 1.8, upperBound: 2.2 },
  { category: "Q2 '24", value: 3, lowerBound: 2.5, upperBound: 3.5 },
  { category: "Q3 '24", value: 5, lowerBound: 4, upperBound: 6 },
  { category: "Q4 '24", value: 7, lowerBound: 5.5, upperBound: 9 },
  { category: "Q1 '25", value: 12, lowerBound: 9, upperBound: 16 },
  { category: "Q2 '25", value: 18, lowerBound: 13, upperBound: 24 },
];
```

## Props Interface (Organized Props Pattern)

```typescript
/**
 * Props for the DataDisplay child component.
 * When mode is "hover", values update dynamically based on projection hover state.
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
    value: number,
    category?: string,
    bounds?: { upper?: number; lower?: number }
  ) => string;
  formatHoverBadgeValue?: (
    value: number,
    category?: string,
    bounds?: { upper?: number; lower?: number }
  ) => string;
}

interface ProjectionLineChartProps {
  // Layer 2: Parent component props
  data: ProjectionDataPoint[];
  width?: number | string;
  height?: number | string;
  showHeader?: boolean;
  showFooter?: boolean;
  showLegend?: boolean;
  showDataDisplay?: boolean; // Show DataDisplay component above projection
  onHover?: (hoverData: ProjectionHoverData | null) => void;

  // Layer 3: Child component configurations
  chartHeader?: ChartHeaderConfig;
  chartLegend?: ChartLegendConfig;
  dataDisplay?: DataDisplayConfig; // Configuration for DataDisplay
  projectionPathGroup?: ProjectionPathGroupConfig;
  chartFooter?: ChartFooterConfig;

  // Layer 1: Global modes
  modes?: GlobalModes;

  // Accessibility
  accessibility?: AccessibilityConfig;
}
```

## Props Reference

### Parent Props (Layer 2)

| Prop              | Type                                          | Default | Description                                                     |
| ----------------- | --------------------------------------------- | ------- | --------------------------------------------------------------- |
| `data`            | `ProjectionDataPoint[]`                       | (req)   | Chart data with value and optional bounds                       |
| `width`           | `number \| string`                            | `346`   | Width of the chart                                              |
| `height`          | `number \| string`                            | `400`   | **Total height of the chart.** PathGroup fills remaining space. |
| `showHeader`      | `boolean`                                     | `true`  | Whether to show the header                                      |
| `showFooter`      | `boolean`                                     | `true`  | Whether to show the footer                                      |
| `showLegend`      | `boolean`                                     | `true`  | Whether to show the legend                                      |
| `showDataDisplay` | `boolean`                                     | `false` | Show DataDisplay component above projection                     |
| `onHover`         | `(data: ProjectionHoverData \| null) => void` | -       | Callback when hover state changes                               |

### ChartHeader Config

| Prop       | Type     | Default                                            | Description         |
| ---------- | -------- | -------------------------------------------------- | ------------------- |
| `title`    | `string` | `"This is chart title."`                           | Chart title text    |
| `subtitle` | `string` | `"This is chart subtitle supporting the title..."` | Chart subtitle text |

### ChartLegend Config

| Prop                  | Type                | Default                 | Description                          |
| --------------------- | ------------------- | ----------------------- | ------------------------------------ |
| `items`               | `ChartLegendItem[]` | auto-generated          | Manual legend items (overrides auto) |
| `projectionLabel`     | `string`            | `"Projection"`          | Label for the main projection line   |
| `projectionBandLabel` | `string`            | `"Confidence interval"` | Label for the confidence band        |

### ProjectionPathGroup Config

| Prop               | Type                        | Default    | Description                     |
| ------------------ | --------------------------- | ---------- | ------------------------------- |
| `showYAxis`        | `boolean`                   | `true`     | Whether to show Y-axis          |
| `showXAxis`        | `boolean`                   | `true`     | Whether to show X-axis          |
| `showHoverLine`    | `boolean`                   | `true`     | Whether to show hover line      |
| `yAxisTickCount`   | `number`                    | `6`        | Number of Y-axis ticks          |
| `rounded`          | `boolean`                   | `true`     | Rounded line caps and joins     |
| `curveStyle`       | `"Sharp" \| "Curved"`       | `"Curved"` | Line interpolation style        |
| `valueFormat`      | `ValueFormatConfig`         | -          | Format config for Y-axis labels |
| `formatYAxisValue` | `(value: number) => string` | -          | Custom Y-axis formatter         |

### ChartFooter Config

| Prop     | Type     | Default               | Description             |
| -------- | -------- | --------------------- | ----------------------- |
| `source` | `string` | `"Source: jio.com."`  | Source attribution text |
| `notes`  | `string` | `"Additional notes."` | Additional notes text   |

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
| `formatHoverLeadValue`    | `(value, category?, bounds?) => string` | `undefined`           | Custom formatter for lead value in hover mode                        |
| `formatHoverBadgeValue`   | `(value, category?, bounds?) => string` | `undefined`           | Custom formatter for badge value in hover mode                       |

### Global Modes (Layer 1)

| Prop          | Type      | Description                                   |
| ------------- | --------- | --------------------------------------------- |
| `Platform`    | `string`  | Device platform sizing                        |
| `Density`     | `string`  | Spacing density: "Default", "Compact", "Open" |
| `colourTheme` | `string`  | Color theme: "MyJio", "JioFinance"            |
| `colourMode`  | `string`  | Light/Dark mode: "Light", "Dark"              |
| `Brand`       | `string`  | Brand entry point: "Jio"                      |
| `fullWidth`   | `boolean` | Fill available container width                |

## Height Behavior

The `height` prop controls the **total height** of the ProjectionLineChart container. The ProjectionPathGroup child component automatically stretches to fill the remaining vertical space after header, legend, DataDisplay, and footer are rendered.

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
│       ProjectionPathGroup             │  ← flex: 1 (fills remaining)
│   (YAxis + Line + Area + XAxis)       │
│                                       │
│                                       │
├───────────────────────────────────────┤
│  ChartFooter (source + notes)         │  ← Auto height
└───────────────────────────────────────┘
        Total height: `height` prop
```

### How It Works

1. **Fixed Container**: The root ProjectionLineChart container uses `height: [prop value]` and `display: flex; flex-direction: column`.
2. **Auto-sized Elements**: Header, Legend, DataDisplay, and Footer take their natural height.
3. **Stretching PathGroup**: The ProjectionPathGroup is wrapped in a div with `flex: 1`, which fills all remaining space.
4. **Dynamic Measurement**: ProjectionPathGroup receives `height="100%"` and uses `ResizeObserver` to measure its actual pixel height for D3 scaling.

### Usage Examples

```tsx
// Standard fixed height (default 400px)
<ProjectionLineChart data={data} height={400} />

// Taller chart for more data visibility
<ProjectionLineChart data={data} height={600} />

// Compact dashboard widget
<ProjectionLineChart
  data={data}
  height={280}
  showFooter={false}
  showLegend={false}
/>

// Chart without header/footer - projection fills entire height
<ProjectionLineChart
  data={data}
  height={300}
  showHeader={false}
  showFooter={false}
  showLegend={false}
/>
```

## Design Tokens Used

| Property      | Variable Name             | Fallback  | Description                |
| ------------- | ------------------------- | --------- | -------------------------- |
| Container Gap | `"Dimensions/Spacings/L"` | `20`      | Gap between chart sections |
| Line Color    | `"categorical/bold/1"`    | `#ff671f` | Main projection line color |
| Band Color    | `"categorical/subtle/1"`  | `#fbe6de` | Projection band fill color |

## Usage Examples

### Basic Usage

```tsx
const data: ProjectionDataPoint[] = [
  { category: "Q1", value: 10, lowerBound: 8, upperBound: 12 },
  { category: "Q2", value: 15, lowerBound: 11, upperBound: 20 },
  { category: "Q3", value: 22, lowerBound: 15, upperBound: 30 },
  { category: "Q4", value: 32, lowerBound: 20, upperBound: 45 },
];

<ProjectionLineChart
  data={data}
  chartHeader={{
    title: "Revenue Projection",
    subtitle: "Quarterly forecast with confidence interval",
  }}
  modes={{
    Platform: "L [Laptop 1440]",
    colourMode: "Light",
  }}
/>;
```

### Full Configuration

```tsx
<ProjectionLineChart
  data={projectionData}
  width={400}
  height={300}
  showHeader={true}
  showFooter={true}
  showLegend={true}
  onHover={(data) => console.log(data)}
  chartHeader={{
    title: "Growth Projection",
    subtitle: "5-year forecast with confidence bands",
  }}
  chartLegend={{
    projectionLabel: "Base case",
    projectionBandLabel: "Range (low to high)",
  }}
  projectionPathGroup={{
    showYAxis: true,
    showXAxis: true,
    showHoverLine: true,
    curveStyle: "Curved",
    yAxisTickCount: 5,
  }}
  chartFooter={{
    source: "Source: Finance Team",
    notes: "Updated quarterly",
  }}
  modes={{
    Platform: "L [Laptop 1440]",
    Density: "Default",
    colourTheme: "MyJio",
    colourMode: "Light",
    Brand: "Jio",
    fullWidth: false,
  }}
/>
```

### Custom Legend Items

```tsx
<ProjectionLineChart
  data={data}
  chartLegend={{
    items: [
      { label: "Expected growth", color: "#ff671f", type: "line" },
      { label: "Uncertainty range", color: "#fbe6de", type: "circle" },
      { label: "Historical", color: "#3900ad", type: "dashed" },
    ],
  }}
  modes={modes}
/>
```

### Full Width

```tsx
<ProjectionLineChart
  data={data}
  height={300}
  chartHeader={{ title: "Full Width Chart" }}
  modes={{ ...modes, fullWidth: true }}
/>
```

### With Value Formatting

```tsx
// Percentage format
<ProjectionLineChart
  data={percentageData}
  projectionPathGroup={{
    valueFormat: { type: "percentage" },
  }}
  modes={modes}
/>

// Currency format
<ProjectionLineChart
  data={currencyData}
  projectionPathGroup={{
    valueFormat: { type: "currency", currency: "INR", abbreviate: true },
  }}
  modes={modes}
/>
```

### With Hover Callback

```tsx
const [hoverData, setHoverData] = useState<ProjectionHoverData | null>(null);

<ProjectionLineChart data={data} onHover={setHoverData} modes={modes} />;

{
  hoverData && (
    <div>
      Category: {hoverData.category}
      <br />
      Value: {hoverData.value.toFixed(2)}
      <br />
      {hoverData.upperBound && `Upper: ${hoverData.upperBound}`}
      <br />
      {hoverData.lowerBound && `Lower: ${hoverData.lowerBound}`}
    </div>
  );
}
```

### With DataDisplay (Static Mode)

```tsx
<ProjectionLineChart
  data={data}
  showDataDisplay={true}
  chartHeader={{
    title: "Revenue Projection",
    subtitle: "Quarterly forecast",
  }}
  dataDisplay={{
    mode: "static",
    label: "Projected total",
    leadValue: "£2,390",
    supportingValue: "/ 3,000",
    supportingLabel: "Target value",
    badgeValue: "+23.5%",
  }}
  modes={modes}
/>
```

### With DataDisplay (Hover Mode)

DataDisplay updates dynamically when hovering over the projection:

```tsx
<ProjectionLineChart
  data={data}
  showDataDisplay={true}
  chartHeader={{
    title: "Revenue Projection",
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
<ProjectionLineChart
  data={data}
  showDataDisplay={true}
  dataDisplay={{
    mode: "hover",
    label: "Select a point",
    formatHoverLeadValue: (value, category, bounds) => `${category}: £${value.toLocaleString()}`,
    formatHoverBadgeValue: (value, category, bounds) => {
      if (bounds?.upper && bounds?.lower) {
        const range = bounds.upper - bounds.lower;
        return `±${(range / 2).toFixed(1)}`;
      }
      return `${((value / total) * 100).toFixed(0)}%`;
    },
  }}
  modes={modes}
/>
```

## DataDisplay Integration

This chart supports an optional DataDisplay component positioned between ChartLegend and the group component. See **[DataDisplay Integration](./DataDisplayIntegration.md)** for full configuration including static/hover modes, custom formatters, and requirements.

**Note**: For this chart, formatters receive `(value: number, category?: string, bounds?: { upper?: number; lower?: number })` allowing you to display the projected value and confidence range.

## Accessibility

Wrapped by `ChartAccessibility` (enabled by default). Provides ARIA attributes, auto-generated summaries, and hidden data tables. See **[ChartAccessibility.md](./ChartAccessibility.md)** for configuration.

## Performance Notes

- Uses `useMemo` for mode mapping and legend generation
- Token resolution benefits from `resolvedCache`

## Related Documentation

- [OrganizedPropsPattern.md](./OrganizedPropsPattern.md) - Pattern documentation
- [ProjectionPathGroup.md](./ProjectionPathGroup.md) - Path group component
- [ChartHeader.md](./ChartHeader.md) - Header component
- [ChartFooter.md](./ChartFooter.md) - Footer component
- [ChartLegend.md](./ChartLegend.md) - Legend component
- [DataDisplay.md](./DataDisplay.md) - DataDisplay component

## Files

| File                                 | Description                   |
| ------------------------------------ | ----------------------------- |
| `src/charts/ProjectionLineChart.tsx` | Main component implementation |
