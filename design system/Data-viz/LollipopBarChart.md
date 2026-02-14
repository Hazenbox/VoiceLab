# LollipopBarChart

## Overview

`LollipopBarChart` is a top-level compound chart component that composes `ChartHeader`, `ChartLegend`, `DataDisplay`, `LollipopBarGroup`, and `ChartFooter` into a complete lollipop bar visualization. It follows the **[Organized Props Pattern](./OrganizedPropsPattern.md)** with three layers: Global Modes, Parent Props, and Child Configs.

## Figma Reference

- **Node ID**: `274:11306`
- **Design File**: DataVis-Components
- **Figma URL**: https://www.figma.com/design/uA5ExvS0cNXbDEKzT9Rnrt/DataVis-Components?node-id=274-11306

## Architecture

```
LollipopBarChart (wrapper with title, subtitle, source, notes)
├── ChartAccessibility (screen reader wrapper)
│   ├── ChartHeader (ChartTitle + ChartSubtitle)
│   ├── ChartLegend (optional, up to 6 ChartKey items)
│   ├── DataDisplay (optional, static or hover-driven KPI display)
│   │   ├── ChartBody (label)
│   │   ├── DataHead (DataLead + DataSupporting + SupportingLabel)
│   │   └── DataBadgeSemantic (change indicator)
│   ├── LollipopBarGroup (D3 calculations, layout)
│   │   ├── YAxis (tick positioning from D3 scale)
│   │   ├── AvgLine (optional, DataBadge with average value)
│   │   ├── HoverBadge (optional, follows cursor)
│   │   └── LollipopBar[] (individual lollipop bars)
│   │       ├── ShapeRect (dot shape)
│   │       ├── Line (stem)
│   │       └── ChartBody (category + value labels)
│   └── ChartFooter (source + notes via ChartBody)
```

## Props Interface (Organized Props Pattern)

### Layer 1: Global Modes

```tsx
modes?: {
  Platform?: string;      // "L [Laptop 1440]", "S [Mobile 360]", etc.
  Density?: string;       // "Default", "Compact", "Open"
  colourTheme?: string;   // "MyJio", "JioFinance"
  colourMode?: string;    // "Light", "Dark"
  Brand?: string;         // "Jio" (default)
  fullWidth?: boolean;    // Fill container width
}
```

### Layer 2: Parent Props

| Prop              | Type                              | Default | Description                             |
| ----------------- | --------------------------------- | ------- | --------------------------------------- |
| `data`            | `ChartDataPoint[] \| DataPoint[]` | `[]`    | Chart data (canonical or legacy format) |
| `width`           | `number \| string`                | `420`   | Total chart width                       |
| `height`          | `number \| string`                | `500`   | Total chart height                      |
| `showHeader`      | `boolean`                         | `true`  | Show ChartHeader                        |
| `showFooter`      | `boolean`                         | `true`  | Show ChartFooter                        |
| `showLegend`      | `boolean`                         | `false` | Show ChartLegend                        |
| `showDataDisplay` | `boolean`                         | `false` | Show DataDisplay above chart            |
| `interactive`     | `boolean`                         | `true`  | Enable hover/click interactivity        |

### Layer 3: Child Configs

#### `chartHeader`

| Prop       | Type     | Default                       | Description         |
| ---------- | -------- | ----------------------------- | ------------------- |
| `title`    | `string` | `"This is chart title."`      | Chart title text    |
| `subtitle` | `string` | `"This is chart subtitle..."` | Chart subtitle text |

#### `chartLegend`

| Prop                  | Type                             | Default        | Description                     |
| --------------------- | -------------------------------- | -------------- | ------------------------------- |
| `items`               | `ChartLegendItem[]`              | auto-generated | Manual legend items             |
| `label`               | `string`                         | -              | Simple single-item legend label |
| `type`                | `"circle" \| "dashed" \| "line"` | `"circle"`     | Indicator type                  |
| `showDataHead`        | `boolean`                        | `false`        | Show DataHead in legend         |
| `leadValue`           | `string`                         | -              | Lead value for DataHead         |
| `supportingValue`     | `string`                         | -              | Supporting value for DataHead   |
| `supportingLabelText` | `string`                         | -              | Supporting label text           |
| `showDataSupporting`  | `boolean`                        | `true`         | Show DataSupporting             |
| `showSupportingLabel` | `boolean`                        | `true`         | Show SupportingLabel            |

**Auto-generation**: When neither `items` nor `label` is provided, legend items are auto-generated from data. Each data point maps to a categorical color (`categorical/bold/1` through `categorical/bold/6`).

#### `dataDisplay`

| Prop                    | Type                                    | Default               | Description                  |
| ----------------------- | --------------------------------------- | --------------------- | ---------------------------- |
| `mode`                  | `"static" \| "hover"`                   | `"static"`            | Display mode                 |
| `label`                 | `string`                                | `"Label."`            | Main label text              |
| `showLabelIcon`         | `boolean`                               | `false`               | Show info icon               |
| `leadValue`             | `string`                                | `"£2,390"`            | Lead value                   |
| `supportingValue`       | `string`                                | `"/ 3,000"`           | Supporting value             |
| `showSupportingValue`   | `boolean`                               | `true`                | Show supporting value        |
| `supportingLabel`       | `string`                                | `"Supporting label."` | Supporting label text        |
| `showSupportingLabel`   | `boolean`                               | `true`                | Show supporting label        |
| `showContentRight`      | `boolean`                               | `true`                | Show semantic badge          |
| `badgeValue`            | `string`                                | `"23.5"`              | Badge value                  |
| `badgeAutoDetect`       | `boolean`                               | `true`                | Auto-detect semantic mode    |
| `badgeSemanticMode`     | `"positive" \| "negative" \| "warning"` | `"positive"`          | Manual semantic mode         |
| `showBadgeIcon`         | `boolean`                               | `true`                | Show badge icon              |
| `size`                  | `"S" \| "M" \| "L"`                     | `"L"`                 | Typography scaling           |
| `type`                  | `"Left" \| "Centered"`                  | `"Left"`              | Layout type                  |
| `formatHoverLeadValue`  | `(value, category?) => string`          | -                     | Custom hover lead formatter  |
| `formatHoverBadgeValue` | `(value, category?) => string`          | -                     | Custom hover badge formatter |

#### `barGroup`

| Prop                 | Type                        | Default | Description                  |
| -------------------- | --------------------------- | ------- | ---------------------------- |
| `showTopLabels`      | `boolean`                   | `false` | Show value labels above dots |
| `showCategoryLabels` | `boolean`                   | `true`  | Show category labels below   |
| `showYAxis`          | `boolean`                   | `false` | Show Y-axis                  |
| `showAvgLine`        | `boolean`                   | `false` | Show average line            |
| `showHoverBadge`     | `boolean`                   | `false` | Show hover badge             |
| `yAxisTickCount`     | `number`                    | `6`     | Y-axis tick count            |
| `valueFormat`        | `ValueFormatConfig`         | -       | Auto-format all values       |
| `formatYAxisValue`   | `(value) => string`         | -       | Custom Y-axis formatter      |
| `formatAvgValue`     | `(value) => string`         | -       | Custom avg line formatter    |
| `formatHoverValue`   | `(value, label?) => string` | -       | Custom hover badge formatter |
| `barWidth`           | `string`                    | `"M"`   | Dot size (XS-2XL)            |
| `onBarHover`         | `(data) => void`            | -       | Hover callback               |
| `onBarClick`         | `(data) => void`            | -       | Click callback               |
| `hoveredBarIndex`    | `number`                    | -       | Controlled hover state       |

#### `chartFooter`

| Prop     | Type     | Default               | Description        |
| -------- | -------- | --------------------- | ------------------ |
| `source` | `string` | `"Source: jio.com."`  | Source attribution |
| `notes`  | `string` | `"Additional notes."` | Additional notes   |

### Accessibility

```tsx
accessibility?: {
  enabled?: boolean;     // default: true
  summary?: string;      // custom summary or "auto"
  dataTable?: boolean;   // default: true (hidden table for SR)
  ariaLabel?: string;    // custom aria-label
}
```

## Usage Examples

### Basic Chart

```tsx
<LollipopBarChart
  data={[
    { category: "Jan", value: 120 },
    { category: "Feb", value: 180 },
    { category: "Mar", value: 90 },
  ]}
  chartHeader={{
    title: "Monthly Revenue",
    subtitle: "Q1 2024 Performance",
  }}
  chartFooter={{
    source: "Source: Analytics",
    notes: "*In thousands USD",
  }}
  modes={{
    Platform: "L [Laptop 1440]",
    colourMode: "Light",
  }}
/>
```

### Full Featured Chart

```tsx
<LollipopBarChart
  data={canonicalData}
  width={500}
  height={550}
  showHeader={true}
  showFooter={true}
  showLegend={true}
  showDataDisplay={true}
  chartHeader={{
    title: "Regional Performance",
    subtitle: "Revenue by region with KPI overview",
  }}
  chartLegend={{
    items: [{ label: "Region A" }, { label: "Region B" }, { label: "Region C" }],
  }}
  dataDisplay={{
    mode: "hover",
    label: "Hover a lollipop",
    leadValue: "-",
    badgeValue: "-",
  }}
  barGroup={{
    showTopLabels: true,
    showCategoryLabels: true,
    showYAxis: true,
    showAvgLine: true,
    showHoverBadge: true,
    barWidth: "M",
    valueFormat: { type: "currency", currency: "GBP" },
  }}
  chartFooter={{
    source: "Source: Regional Reports",
    notes: "*Preliminary figures",
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

### Hover-Driven DataDisplay

```tsx
<LollipopBarChart
  data={data}
  showDataDisplay={true}
  dataDisplay={{
    mode: "hover",
    label: "Select a data point",
    leadValue: "-",
    supportingValue: "",
    badgeValue: "-",
    formatHoverLeadValue: (value, category) => `£${value.toLocaleString()}`,
    formatHoverBadgeValue: (value) => {
      const pct = ((value / total) * 100).toFixed(1);
      return `${pct}%`;
    },
  }}
  barGroup={{
    showYAxis: true,
    barWidth: "M",
  }}
/>
```

## Design Tokens Used

The component resolves the following Figma tokens:

| Token                   | Purpose                    | Default                    |
| ----------------------- | -------------------------- | -------------------------- |
| `Dimensions/Spacings/L` | Gap between major sections | 20px                       |
| `categorical/bold/1-6`  | Legend indicator colors    | `#ff671f`, `#3900ad`, etc. |

All child components resolve their own tokens internally. The `modes` object is passed through to each child for consistent token resolution across the entire chart.

## Data Format

Supports both canonical and legacy formats:

```tsx
// Canonical (recommended)
const data: ChartDataPoint[] = [
  { id: "jan", category: "Jan", value: 120 },
  { id: "feb", category: "Feb", value: 180, colorIndex: 2 },
];

// Legacy (deprecated, still supported)
const legacyData = [
  { label: "Jan", value: 120 },
  { label: "Feb", value: 180 },
];
```

## Legend Auto-Generation

When `showLegend` is `true` and no `chartLegend.items` or `chartLegend.label` is provided:

1. **Custom colors in data**: Groups by unique color, creates one legend item per color
2. **Default**: Creates one legend item per data point (up to 6) using categorical colors `categorical/bold/1` through `categorical/bold/6`

This matches the Figma design where each lollipop has its own color and legend entry.

## Files

| File                                      | Description              |
| ----------------------------------------- | ------------------------ |
| `src/charts/LollipopBarChart.tsx`         | Component implementation |
| `src/charts/LollipopBarChart.stories.tsx` | Storybook stories        |
| `src/markdown/LollipopBarChart.md`        | This documentation       |
