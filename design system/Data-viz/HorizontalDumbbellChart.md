# HorizontalDumbbellChart

## Overview

The HorizontalDumbbellChart is a top-level chart wrapper that composes ChartHeader, ChartLegend, DataDisplay, HorizontalDumbbellBarGroup, and ChartFooter into a complete dumbbell (gap/barbell) chart visualization. Each category displays two data-driven dots connected by a line, positioned along a shared horizontal scale. The two dots use distinct categorical colors (`categorical/bold/1` for left, `categorical/bold/2` for right).

Follows the **Organized Props Pattern** with three layers:

1. **Global Modes** (design token resolution)
2. **Parent Props** (visibility toggles, data, dimensions)
3. **Child Configs** (grouped objects for each child component)

## Figma Reference

- **Node ID**: `274:14998`
- **Design File**: DataVis-Components
- **Figma URL**: https://www.figma.com/design/uA5ExvS0cNXbDEKzT9Rnrt/DataVis-Components?node-id=274-14998

## Architecture

```
HorizontalDumbbellChart (flex column, gap L, node 274:14998)
│   wrapped by ChartAccessibility (chartType="horizontal-bar")
├── ChartHeader (conditional: showHeader)
│   ├── ChartTitle
│   └── ChartSubtitle
├── ChartLegend (conditional: showLegend)
│   └── ChartKey[] (categorical/bold/1, categorical/bold/2)
├── DataDisplay (conditional: showDataDisplay)
│   ├── ChartBody (label)
│   ├── DataHead (leadValue + supportingValue + supportingLabel)
│   └── DataBadgeSemantic (badge with trend indicator)
├── barGroupWrapper (flex-1, full width)
│   └── HorizontalDumbbellBarGroup
│       ├── HorizontalDumbbellBar[] (data-driven positioned dots)
│       ├── XAxis (conditional: showXAxis)
│       └── HoverBadge (conditional: showHoverBadge)
└── ChartFooter (conditional: showFooter)
    ├── ChartBody (source)
    └── ChartBody (notes)
```

## Import

```tsx
import HorizontalDumbbellChart from "./charts/HorizontalDumbbellChart";
```

## Data Formats

### Canonical Format (Recommended)

```typescript
const data: ChartSeriesDataPoint[] = [
  { category: "Germany", series: "2024", value: 1200 },
  { category: "Germany", series: "2025", value: 3500 },
  { category: "UK", series: "2024", value: 1800 },
  { category: "UK", series: "2025", value: 4200 },
];

<HorizontalDumbbellChart
  data={data}
  seriesOrder={["2024", "2025"]}
/>
```

### Direct Format

```typescript
const data: DumbbellDataPoint[] = [
  { category: "Q1", value1: 20, value2: 80 },
  { category: "Q2", value1: 30, value2: 70 },
];

<HorizontalDumbbellChart data={data} />
```

## Props Interface (Organized Props Pattern)

```typescript
interface HorizontalDumbbellChartProps {
  // Layer 2: Parent props
  data: ChartSeriesDataPoint[] | DumbbellDataPoint[];
  seriesOrder?: [string, string];
  width?: number | string;
  height?: number | string;
  showHeader?: boolean;
  showFooter?: boolean;
  showLegend?: boolean;
  showDataDisplay?: boolean;
  interactive?: boolean;

  // Layer 3: Child configs
  chartHeader?: ChartHeaderConfig;
  chartLegend?: ChartLegendConfig;
  dataDisplay?: DataDisplayConfig;
  barGroup?: BarGroupConfig;
  chartFooter?: ChartFooterConfig;

  // Layer 1: Global modes
  modes?: GlobalModes;

  // Accessibility
  accessibility?: AccessibilityConfig;
}
```

## Props

| Prop              | Type                                            | Default     | Description                                             |
| ----------------- | ----------------------------------------------- | ----------- | ------------------------------------------------------- |
| `data`            | `ChartSeriesDataPoint[] \| DumbbellDataPoint[]` | `[]`        | Data to visualize (2 series per category)               |
| `seriesOrder`     | `[string, string]`                              | (auto)      | Maps series to value1 (left dot) and value2 (right dot) |
| `width`           | `number \| string`                              | `420`       | Chart width                                             |
| `height`          | `number \| string`                              | `500`       | Chart height                                            |
| `showHeader`      | `boolean`                                       | `true`      | Show ChartHeader (title + subtitle)                     |
| `showFooter`      | `boolean`                                       | `true`      | Show ChartFooter (source + notes)                       |
| `showLegend`      | `boolean`                                       | `true`      | Show ChartLegend                                        |
| `showDataDisplay` | `boolean`                                       | `false`     | Show DataDisplay KPI section                            |
| `interactive`     | `boolean`                                       | `true`      | Enable hover/click interactivity                        |
| `chartHeader`     | `ChartHeaderConfig`                             | `{}`        | ChartHeader configuration                               |
| `chartLegend`     | `ChartLegendConfig`                             | `{}`        | ChartLegend configuration                               |
| `dataDisplay`     | `DataDisplayConfig`                             | `{}`        | DataDisplay configuration                               |
| `barGroup`        | `BarGroupConfig`                                | `{}`        | HorizontalDumbbellBarGroup configuration                |
| `chartFooter`     | `ChartFooterConfig`                             | `{}`        | ChartFooter configuration                               |
| `modes`           | `GlobalModes`                                   | `{}`        | Global modes for design token resolution                |
| `accessibility`   | `AccessibilityConfig`                           | `undefined` | Accessibility config for screen readers                 |

### ChartHeaderConfig

| Prop       | Type     | Default                  | Description   |
| ---------- | -------- | ------------------------ | ------------- |
| `title`    | `string` | `"This is chart title."` | Title text    |
| `subtitle` | `string` | (long default)           | Subtitle text |

### ChartLegendConfig

| Prop                  | Type                             | Default     | Description                                     |
| --------------------- | -------------------------------- | ----------- | ----------------------------------------------- |
| `items`               | `ChartLegendItem[]`              | `undefined` | Manual legend items (overrides auto-generation) |
| `seriesLabels`        | `[string, string]`               | `undefined` | Series labels for auto 2-item legend            |
| `type`                | `"circle" \| "dashed" \| "line"` | `"circle"`  | Indicator type                                  |
| `showDataHead`        | `boolean`                        | `false`     | Show DataHead in legend items                   |
| `leadValue`           | `string`                         | `undefined` | Lead value for first legend item DataHead       |
| `supportingValue`     | `string`                         | `undefined` | Supporting value for first legend item DataHead |
| `supportingLabelText` | `string`                         | `undefined` | Supporting label for first legend item DataHead |

### BarGroupConfig

| Prop                 | Type                                             | Default     | Description                          |
| -------------------- | ------------------------------------------------ | ----------- | ------------------------------------ |
| `showLeftLabels`     | `boolean`                                        | `true`      | Show left value labels               |
| `showRightLabels`    | `boolean`                                        | `true`      | Show right value labels              |
| `showCategoryLabels` | `boolean`                                        | `true`      | Show category labels                 |
| `showXAxis`          | `boolean`                                        | `true`      | Show X-axis at the bottom            |
| `showHoverBadge`     | `boolean`                                        | `false`     | Show DataBadge on hover              |
| `xAxisTickCount`     | `number`                                         | `6`         | Target X-axis tick count             |
| `valueFormat`        | `ValueFormatConfig`                              | `undefined` | Auto-format axis and value labels    |
| `formatXAxisValue`   | `(value: number) => string`                      | `undefined` | Custom X-axis formatter              |
| `formatHoverValue`   | `(v1, v2, label?) => string`                     | `undefined` | Custom hover badge formatter         |
| `barHeight`          | `string`                                         | `"M"`       | T-shirt sizing: XS, S, M, L, XL, 2XL |
| `onBarHover`         | `(data: HorizontalDumbbellBarHoverData) => void` | `undefined` | Hover callback                       |
| `onBarClick`         | `(data: HorizontalDumbbellBarHoverData) => void` | `undefined` | Click callback                       |
| `hoveredBarIndex`    | `number`                                         | `undefined` | Controlled hover state               |

### DataDisplayConfig

| Prop                    | Type                            | Default               | Description                           |
| ----------------------- | ------------------------------- | --------------------- | ------------------------------------- |
| `mode`                  | `"static" \| "hover"`           | `"static"`            | Static values or hover-driven updates |
| `label`                 | `string`                        | `"Label."`            | Main label text                       |
| `showLabelIcon`         | `boolean`                       | `false`               | Show info icon                        |
| `leadValue`             | `string`                        | `"£2,390"`            | Lead data value                       |
| `supportingValue`       | `string`                        | `"/ 3,000"`           | Supporting value                      |
| `showSupportingValue`   | `boolean`                       | `true`                | Show supporting value                 |
| `supportingLabel`       | `string`                        | `"Supporting label."` | Label below values                    |
| `showSupportingLabel`   | `boolean`                       | `true`                | Show supporting label                 |
| `showContentRight`      | `boolean`                       | `true`                | Show semantic badge section           |
| `badgeValue`            | `string`                        | `"23.5"`              | Badge value                           |
| `badgeAutoDetect`       | `boolean`                       | `true`                | Auto-detect semantic mode             |
| `size`                  | `"S" \| "M" \| "L"`             | `"L"`                 | Typography size variant               |
| `type`                  | `"Left" \| "Centered"`          | `"Left"`              | Layout type                           |
| `formatHoverLeadValue`  | `(v1, v2, category?) => string` | `undefined`           | Custom hover lead value formatter     |
| `formatHoverBadgeValue` | `(v1, v2, category?) => string` | `undefined`           | Custom hover badge value formatter    |

### ChartFooterConfig

| Prop     | Type     | Default               | Description |
| -------- | -------- | --------------------- | ----------- |
| `source` | `string` | `"Source: jio.com."`  | Source text |
| `notes`  | `string` | `"Additional notes."` | Notes text  |

### Global Modes (`modes`)

| Mode Prop     | Figma Collection  | Available Values                                                                                                          |
| ------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `Brand`       | `"10 Brand"`      | `"Jio"` (entry point for token resolution)                                                                                |
| `Platform`    | `"7 Platform"`    | `"S [Mobile 360]"`, `"M [Tablet portrait 768]"`, `"M [Tablet landscape 1024]"`, `"L [Laptop 1440]"`, `"L [Desktop 1920]"` |
| `Density`     | `"6 Density"`     | `"Default"`, `"Compact"`, `"Open"`                                                                                        |
| `colourTheme` | `"9 Theme"`       | `"MyJio"`, `"Test Brand"`, `"JioFinance"`                                                                                 |
| `colourMode`  | `"5 Colour Mode"` | `"Light"`, `"Dark"`                                                                                                       |
| `fullWidth`   | (CSS prop)        | `true`, `false` - fills available width                                                                                   |

## Usage Examples

### Basic Usage

```tsx
<HorizontalDumbbellChart
  data={data}
  seriesOrder={["2024", "2025"]}
  width={420}
  height={500}
  modes={{
    Platform: "L [Laptop 1440]",
    colourMode: "Light",
    Brand: "Jio",
  }}
/>
```

### With All Features

```tsx
<HorizontalDumbbellChart
  data={data}
  seriesOrder={["2024", "2025"]}
  width={500}
  height={650}
  showHeader={true}
  showFooter={true}
  showLegend={true}
  showDataDisplay={true}
  chartHeader={{
    title: "European Market Performance",
    subtitle: "Year-over-year comparison",
  }}
  chartLegend={{
    seriesLabels: ["2024", "2025"],
  }}
  dataDisplay={{
    mode: "hover",
    label: "Hover a dumbbell",
    leadValue: "-",
    badgeValue: "-",
  }}
  barGroup={{
    showLeftLabels: true,
    showRightLabels: true,
    showCategoryLabels: true,
    showXAxis: true,
    showHoverBadge: true,
    xAxisTickCount: 6,
    barHeight: "M",
  }}
  chartFooter={{
    source: "Source: Finance.",
    notes: "*All values in GBP.",
  }}
  modes={{
    Platform: "L [Laptop 1440]",
    Density: "Default",
    colourTheme: "MyJio",
    colourMode: "Light",
    Brand: "Jio",
  }}
  accessibility={{
    enabled: true,
    dataTable: true,
  }}
/>
```

### With Currency Formatting

```tsx
<HorizontalDumbbellChart
  data={data}
  seriesOrder={["Min", "Max"]}
  barGroup={{
    valueFormat: { type: "currency", currency: "GBP", abbreviate: true },
  }}
  modes={modes}
/>
```

## Design Tokens Used

| Property    | Variable Name             | Fallback | Description                |
| ----------- | ------------------------- | -------- | -------------------------- |
| Section Gap | `"Dimensions/Spacings/L"` | `20px`   | Gap between major sections |

(All child components resolve their own tokens via the shared `modes` prop.)

## Legend Auto-Generation

The legend is auto-generated based on available data:

1. **`chartLegend.items`**: Manual items (highest priority)
2. **`chartLegend.seriesLabels`** or **`seriesOrder`**: Creates 2-item legend with categorical/bold/1 and categorical/bold/2
3. **Auto-detect from canonical data**: Extracts unique series names
4. **Fallback**: Generic "Category name" labels

## Hover Interaction

### Hover Badge

The HorizontalDumbbellBarGroup supports a cursor-following DataBadge that displays hover information when `barGroup.showHoverBadge` is enabled.

## DataDisplay Integration

This chart supports an optional DataDisplay component positioned between ChartLegend and the group component. See **[DataDisplay Integration](./DataDisplayIntegration.md)** for full configuration including static/hover modes, custom formatters, and requirements.

**Chart-specific formatter signatures:**

- `formatHoverLeadValue`: `(v1: number, v2: number, category?: string) => string`
- `formatHoverBadgeValue`: `(v1: number, v2: number, category?: string) => string`

When `dataDisplay.mode = "hover"`:

- `label` updates to show the hovered category name
- `leadValue` shows `"value1 – value2"` (or custom via `formatHoverLeadValue`)
- `badgeValue` shows percentage difference (or custom via `formatHoverBadgeValue`)

## Accessibility

Wrapped by `ChartAccessibility` (enabled by default). Provides ARIA attributes, auto-generated summaries, and hidden data tables. See **[ChartAccessibility.md](./ChartAccessibility.md)** for configuration.

The component converts DumbbellDataPoint[] to ChartSeriesDataPoint[] for accessibility processing.

```tsx
<HorizontalDumbbellChart
  data={data}
  accessibility={{
    enabled: true,
    dataTable: true,
    summary: "auto", // or custom string
    ariaLabel: "Revenue comparison chart",
  }}
/>
```

## Child Components

- **ChartHeader**: `src/components/ChartHeader.tsx`
- **ChartLegend**: `src/components/ChartLegend.tsx`
- **DataDisplay**: `src/components/DataDisplay.tsx`
- **HorizontalDumbbellBarGroup**: `src/components/HorizontalDumbbellBarGroup.tsx`
- **ChartFooter**: `src/components/ChartFooter.tsx`
- **ChartAccessibility**: `src/components/ChartAccessibility.tsx`

## Performance Notes

- Uses `useMemo` for mode mapping and legend generation
- Token resolution benefits from `resolvedCache`
- Legend item generation is memoized and only recomputes when data/config changes
- DataDisplay computed values are memoized based on hover state and config
- Data statistics for hover mode are cached per render cycle
- Accessibility data conversion is memoized

## Related Documentation

- **[OrganizedPropsPattern.md](./OrganizedPropsPattern.md)** - Pattern documentation
- **[HorizontalDumbbellBarGroup.md](./HorizontalDumbbellBarGroup.md)** - Group component
- **[ChartHeader.md](./ChartHeader.md)** - Header component
- **[ChartFooter.md](./ChartFooter.md)** - Footer component
- **[ChartLegend.md](./ChartLegend.md)** - Legend component
- **[DataDisplay.md](./DataDisplay.md)** - DataDisplay component
- **[ChartAccessibility.md](./ChartAccessibility.md)** - Accessibility wrapper

## Files

| File                                             | Description              |
| ------------------------------------------------ | ------------------------ |
| `src/charts/HorizontalDumbbellChart.tsx`         | Component implementation |
| `src/charts/HorizontalDumbbellChart.stories.tsx` | Storybook stories        |
| `src/components/HorizontalDumbbellBar.tsx`       | Bar component            |
| `src/components/HorizontalDumbbellBarGroup.tsx`  | Group component          |
| `src/designData/figma-variables-resolver.js`     | Token resolver           |
| `src/types/chart-data.ts`                        | Data types               |
| `src/utils/formatValue.ts`                       | Value formatting         |
