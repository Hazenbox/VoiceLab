# DataCard

## Overview

The DataCard component is a styled card container that combines a title (ChartBody) with a DataHead component to display data metrics. It's commonly used for dashboard KPI cards, metric displays, and data summaries. All styling tokens (background, padding, border radius) are resolved from Figma design variables, and font sizes scale based on the "Local size" mode (S, M, L).

**Title Formatting**: By default, automatically formats title according to Figma text rules:

- Sentence case normalization (lowercase all words except first)
- Preserves acronyms (all-uppercase words like "API", "KPI", "USD")
- Preserves proper nouns (countries, demonyms like "European", "Germany")
- No trailing punctuation (unlike sentences)

## Figma Reference

- **Node ID**: `118:729`
- **Design File**: DataVis-Components
- **Figma URL**: https://www.figma.com/design/uA5ExvS0cNXbDEKzT9Rnrt/DataVis-Components?node-id=118-729

## Import

```tsx
import DataCard from "./components/DataCard";
```

## Props Interface

```typescript
interface DataCardProps {
  /** The title/label text displayed at the top of the card */
  title?: string;
  /** Whether to show the title */
  showTitle?: boolean;
  /**
   * Whether to auto-format the title according to Figma text rules.
   * When enabled, applies sentence case normalization (first word capitalized, rest lowercase).
   * Per Figma spec: "No capitalisation, apart from the first word."
   * Note: Unlike sentences, titles do NOT get trailing punctuation.
   * (default: true)
   */
  formatTitle?: boolean;
  /**
   * Options for title formatting when formatTitle is enabled.
   * Allows customization of case normalization, acronym/proper noun preservation.
   */
  formatOptions?: FormatLabelOptions;
  /** Width of the card (number for px or string for custom unit) */
  width?: number | string;
  /** Fill emphasis level for background styling: "Ghost", "Minimal", "Subtle", "Bold" */
  fillEmphasis?: string;
  /** Size variant for child component font scaling: "S", "M", "L" */
  size?: string;
  /** Background level for depth/hierarchy: "Level 0", "Level 1", "Level 2", "Bold", "Elevated" */
  backgroundLevel?: string;
  /** Appearance variant: "Neutral", "Primary", "Secondary", "Sparkle", "Informative", "Negative", "Positive", "Warning", "Brand BG" */
  appearance?: string;
  /** Nested props for the DataHead component */
  dataHead?: {
    /** The lead value to display (e.g., currency, number, percentage) */
    leadValue?: string;
    /** The supporting value to display (e.g., "/ 3,000") */
    supportingValue?: string;
    /** The supporting label text to display */
    supportingLabelText?: string;
    /** Whether to show the DataSupporting component */
    showDataSupporting?: boolean;
    /** Whether to show the SupportingLabel component */
    showSupportingLabel?: boolean;
  };
  /** Mode configuration for design token resolution */
  modes?: {
    Platform?: string;
    Density?: string;
    colourTheme?: string;
    colourMode?: string;
    Brand?: string;
  };
}
```

## Props

| Prop              | Type                 | Default                      | Description                                          |
| ----------------- | -------------------- | ---------------------------- | ---------------------------------------------------- |
| `title`           | `string`             | `"This is chart body text."` | The title/label text at the top                      |
| `showTitle`       | `boolean`            | `true`                       | Whether to show the title                            |
| `formatTitle`     | `boolean`            | `true`                       | Whether to auto-format title per Figma text rules    |
| `formatOptions`   | `FormatLabelOptions` | `{}`                         | Options for title formatting (case, preserved words) |
| `width`           | `number \| string`   | `248`                        | Width of the card (px or custom)                     |
| `fillEmphasis`    | `string`             | `"Subtle"`                   | Fill emphasis level (Ghost, Minimal, Subtle, Bold)   |
| `size`            | `string`             | `"L"`                        | Size variant for child font scaling (S, M, L)        |
| `backgroundLevel` | `string`             | `"Level 0"`                  | Background depth/hierarchy level                     |
| `appearance`      | `string`             | `"Neutral"`                  | Semantic appearance variant                          |
| `dataHead`        | `object`             | See below                    | Nested props for DataHead                            |
| `modes`           | `object`             | `{}`                         | Mode configuration for tokens                        |

### FormatLabelOptions

| Option                     | Type       | Default | Description                                              |
| -------------------------- | ---------- | ------- | -------------------------------------------------------- |
| `capitalizeFirst`          | `boolean`  | `true`  | Whether to capitalize the first letter                   |
| `normalizeCase`            | `boolean`  | `true`  | Whether to lowercase all words except the first          |
| `preserveAcronyms`         | `boolean`  | `true`  | Whether to preserve acronyms (e.g., "API", "KPI", "USA") |
| `preserveProperNouns`      | `boolean`  | `true`  | Whether to preserve proper nouns from the preserved list |
| `additionalPreservedWords` | `string[]` | `[]`    | Additional words to preserve capitalization for          |

### DataHead Nested Props

| Prop                  | Type      | Default               | Description                     |
| --------------------- | --------- | --------------------- | ------------------------------- |
| `leadValue`           | `string`  | `"£2,390"`            | The lead value to display       |
| `supportingValue`     | `string`  | `"/ 3,000"`           | The supporting value to display |
| `supportingLabelText` | `string`  | `"Supporting label."` | The supporting label text       |
| `showDataSupporting`  | `boolean` | `true`                | Whether to show DataSupporting  |
| `showSupportingLabel` | `boolean` | `true`                | Whether to show SupportingLabel |

## Modes Configuration

| Mode Prop     | Figma Collection  | Available Values                                                                                                          | Description                      |
| ------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| `Brand`       | `"10 Brand"`      | `"Jio"`                                                                                                                   | Entry point for token resolution |
| `Platform`    | `"7 Platform"`    | `"S [Mobile 360]"`, `"M [Tablet portrait 768]"`, `"M [Tablet landscape 1024]"`, `"L [Laptop 1440]"`, `"L [Desktop 1920]"` | Device-specific sizing           |
| `Density`     | `"6 Density"`     | `"Default"`, `"Compact"`, `"Open"`                                                                                        | Spacing density                  |
| `colourTheme` | `"9 Theme"`       | `"MyJio"`, `"Test Brand"`, `"JioFinance"`                                                                                 | Brand theme                      |
| `colourMode`  | `"5 Colour Mode"` | `"Light"`, `"Dark"`                                                                                                       | Light/dark mode                  |

## Local Props

DataCard has four **local props** that are not part of the `modes` object but still map to Figma collections for token resolution. These props work together to control the card's appearance through a hierarchical token resolution chain.

### Appearance (Local Prop)

The `appearance` prop controls the semantic color scheme of the card. It defaults to `"Neutral"` and maps to the Figma collection `"1 Appearance"`.

| Appearance      | Description                 | Use Case                           |
| --------------- | --------------------------- | ---------------------------------- |
| `"Neutral"`     | Default grey/neutral colors | Standard cards (default)           |
| `"Primary"`     | Brand primary color         | Featured/highlighted content       |
| `"Secondary"`   | Brand secondary color       | Alternative highlights             |
| `"Sparkle"`     | Special accent color        | Premium/special features           |
| `"Informative"` | Blue/info color             | Informational messages             |
| `"Positive"`    | Green/success color         | Success states, positive metrics   |
| `"Negative"`    | Red/error color             | Error states, negative metrics     |
| `"Warning"`     | Yellow/warning color        | Warning states, caution indicators |
| `"Brand BG"`    | Brand background color      | Brand-colored backgrounds          |

### Fill Emphasis (Local Prop)

The `fillEmphasis` prop controls the visual prominence of the card's background. It defaults to `"Subtle"` and maps to the Figma collection `"2 Fill emphasis"`.

| Fill Emphasis | Description               | Use Case                                       |
| ------------- | ------------------------- | ---------------------------------------------- |
| `"Ghost"`     | Transparent/no background | Minimal visual interference, blend with parent |
| `"Minimal"`   | Very light background     | Subtle card appearance                         |
| `"Subtle"`    | Light background tint     | Default emphasis, clear card boundary          |
| `"Bold"`      | Strong background color   | High visual prominence                         |

### Background Level (Local Prop)

The `backgroundLevel` prop controls the depth/hierarchy level of the card background. It defaults to `"Level 0"` and maps to the Figma collection `"3 Background Level"`.

| Background Level | Description       | Use Case                              |
| ---------------- | ----------------- | ------------------------------------- |
| `"Level 0"`      | Base level        | Default, flat appearance (default)    |
| `"Level 1"`      | First elevation   | Slightly elevated content             |
| `"Level 2"`      | Second elevation  | More elevated content                 |
| `"Bold"`         | Bold/strong level | High contrast backgrounds             |
| `"Elevated"`     | Floating level    | Cards with shadow/floating appearance |

### Size (Local Prop)

The `size` prop controls the font scaling of child components. It defaults to `"L"` and maps to the Figma collection `"Local size"`.

| Size  | Description  | Use Case                                     |
| ----- | ------------ | -------------------------------------------- |
| `"S"` | Small fonts  | Compact displays, mobile layouts             |
| `"M"` | Medium fonts | Balanced display, tablet layouts             |
| `"L"` | Large fonts  | Prominent display, desktop layouts (default) |

## Token Resolution Chain

The local props work together in a hierarchical chain to resolve the final `Colour/Surface` value:

```
appearance (1 Appearance)
    → fillEmphasis (2 Fill emphasis)
        → backgroundLevel (3 Background Level)
            → Primitive Colors
```

This means:

1. **appearance** selects the color family (Neutral, Primary, Negative, etc.)
2. **fillEmphasis** selects the intensity within that family (Ghost, Minimal, Subtle, Bold)
3. **backgroundLevel** selects the depth level (Level 0, Level 1, Level 2, Bold, Elevated)

## Design Tokens Used

| Property      | Variable Name             | Fallback  | Description                                                                 |
| ------------- | ------------------------- | --------- | --------------------------------------------------------------------------- |
| Background    | `"Colour/Surface"`        | `#ffffff` | Card background color (varies by appearance, fillEmphasis, backgroundLevel) |
| Padding       | `"Dimensions/Spacings/S"` | `12px`    | Internal padding                                                            |
| Gap           | `"Dimensions/Spacings/S"` | `12px`    | Gap between title and DataHead                                              |
| Border Radius | `"Dimensions/Shape/XS"`   | `8px`     | Corner radius                                                               |

> **Note**: The `Colour/Surface` token resolves through a chain: `appearance` → `fillEmphasis` → `backgroundLevel` → primitive colors. This allows for highly customizable card backgrounds based on semantic meaning (appearance), visual prominence (fillEmphasis), and depth (backgroundLevel).

## Architecture

```
DataCard (container - flex column, gap: 12px, padding: 12px, border-radius: 8px)
├── ChartBody (optional title)
└── DataHead (data display)
    ├── contentWrapper (flex row)
    │   ├── DataLead (headline value)
    │   └── DataSupporting (optional supporting value)
    └── SupportingLabel (optional label)
```

### Child Components

### ChartBody (Title)

- **Purpose**: Displays the card title/label
- **Typography**: Body XS Low (12px, 400 weight)
- **Color**: High-emphasis text

### DataHead

- **Purpose**: Container for data values and labels
- **Contains**: DataLead, DataSupporting, SupportingLabel
- **Gap**: 6px between elements

## Visual Properties

- **Layout**: Flex column with gap
- **Background**: Surface color (white in Light mode)
- **Border Radius**: 8px (from `Dimensions/Shape/XS`)
- **Padding**: 12px (from `Dimensions/Spacings/S`)
- **Gap**: 12px between title and data section
- **Overflow**: Clipped (hidden)

## Usage Examples

### Basic Usage

```tsx
<DataCard
  title="Monthly Revenue"
  dataHead={{
    leadValue: "£2,390",
    supportingValue: "/ 3,000",
    supportingLabelText: "Target progress",
  }}
/>
```

### Title Formatting (Default Behavior)

By default, titles are automatically formatted per Figma spec:

```tsx
// Input: "MONTHLY REVENUE TARGET"
// Output: "Monthly revenue target"
<DataCard title="MONTHLY REVENUE TARGET" dataHead={{ leadValue: "£2,390" }} />

// Acronyms preserved
// Input: "API Performance KPI"
// Output: "API performance KPI"
<DataCard title="API Performance KPI" dataHead={{ leadValue: "99.9%" }} />

// Proper nouns preserved
// Input: "European Market Revenue"
// Output: "European market revenue"
<DataCard title="European Market Revenue" dataHead={{ leadValue: "€1.2M" }} />

// Country names preserved
// Input: "Germany and France Sales"
// Output: "Germany and France sales"
<DataCard title="Germany and France Sales" dataHead={{ leadValue: "€567K" }} />
```

### Disable Title Formatting

```tsx
// Keep title exactly as provided
<DataCard title="Custom Title FORMAT" formatTitle={false} dataHead={{ leadValue: "£2,390" }} />
```

### Custom Preserved Words

```tsx
// Add custom words to preserve capitalization
<DataCard
  title="MyBrand Dashboard Analytics"
  formatOptions={{ additionalPreservedWords: ["MyBrand"] }}
  dataHead={{ leadValue: "12,345" }}
/>
// Output: "MyBrand dashboard analytics"
```

### With Full Configuration

```tsx
const modes = {
  Platform: "L [Laptop 1440]",
  Density: "Default",
  colourTheme: "MyJio",
  colourMode: "Light",
  Brand: "Jio",
};

<DataCard
  title="Monthly Revenue"
  showTitle={true}
  width={248}
  fillEmphasis="Subtle"
  size="L"
  dataHead={{
    leadValue: "£2,390",
    supportingValue: "/ 3,000",
    supportingLabelText: "Target progress",
    showDataSupporting: true,
    showSupportingLabel: true,
  }}
  modes={modes}
/>;
```

### Appearance Variants

```tsx
// Neutral - default grey appearance
<DataCard
  title="Status"
  appearance="Neutral"
  dataHead={{ leadValue: "Normal" }}
  modes={modes}
/>

// Primary - brand primary color
<DataCard
  title="Featured"
  appearance="Primary"
  fillEmphasis="Subtle"
  dataHead={{ leadValue: "Highlight" }}
  modes={modes}
/>

// Positive - success/growth indicators
<DataCard
  title="Growth"
  appearance="Positive"
  fillEmphasis="Subtle"
  dataHead={{ leadValue: "+15.3%" }}
  modes={modes}
/>

// Negative - error/decline indicators
<DataCard
  title="Alert"
  appearance="Negative"
  fillEmphasis="Subtle"
  dataHead={{ leadValue: "-5.2%" }}
  modes={modes}
/>

// Warning - caution indicators
<DataCard
  title="Warning"
  appearance="Warning"
  fillEmphasis="Subtle"
  dataHead={{ leadValue: "85%" }}
  modes={modes}
/>

// Informative - info messages
<DataCard
  title="Info"
  appearance="Informative"
  fillEmphasis="Subtle"
  dataHead={{ leadValue: "New" }}
  modes={modes}
/>
```

### Fill Emphasis Variants

```tsx
// Ghost - transparent/no background
<DataCard
  title="Revenue"
  fillEmphasis="Ghost"
  dataHead={{ leadValue: "£2,390" }}
  modes={modes}
/>

// Minimal - very light background
<DataCard
  title="Revenue"
  fillEmphasis="Minimal"
  dataHead={{ leadValue: "£2,390" }}
  modes={modes}
/>

// Subtle - light background tint (default)
<DataCard
  title="Revenue"
  fillEmphasis="Subtle"
  dataHead={{ leadValue: "£2,390" }}
  modes={modes}
/>

// Bold - strong background color
<DataCard
  title="Revenue"
  fillEmphasis="Bold"
  dataHead={{ leadValue: "£2,390" }}
  modes={modes}
/>
```

### Background Level Variants

```tsx
// Level 0 - base level (default)
<DataCard
  title="Revenue"
  backgroundLevel="Level 0"
  dataHead={{ leadValue: "£2,390" }}
  modes={modes}
/>

// Level 1 - slightly elevated
<DataCard
  title="Revenue"
  backgroundLevel="Level 1"
  dataHead={{ leadValue: "£2,390" }}
  modes={modes}
/>

// Level 2 - more elevated
<DataCard
  title="Revenue"
  backgroundLevel="Level 2"
  dataHead={{ leadValue: "£2,390" }}
  modes={modes}
/>

// Elevated - floating appearance
<DataCard
  title="Revenue"
  backgroundLevel="Elevated"
  dataHead={{ leadValue: "£2,390" }}
  modes={modes}
/>
```

### Combining Appearance with Fill Emphasis

```tsx
// Negative appearance with Bold emphasis for critical alerts
<DataCard
  title="Critical Alert"
  appearance="Negative"
  fillEmphasis="Bold"
  dataHead={{ leadValue: "-15%" }}
  modes={modes}
/>

// Positive appearance with Bold emphasis for success highlights
<DataCard
  title="Success"
  appearance="Positive"
  fillEmphasis="Bold"
  dataHead={{ leadValue: "+25%" }}
  modes={modes}
/>

// Primary appearance with Minimal emphasis for subtle highlights
<DataCard
  title="Featured"
  appearance="Primary"
  fillEmphasis="Minimal"
  dataHead={{ leadValue: "New" }}
  modes={modes}
/>
```

### Size Variants

```tsx
// Small size - compact display
<DataCard
  title="Revenue"
  width={200}
  size="S"
  dataHead={{ leadValue: "£2,390", supportingValue: "/ 3,000" }}
  modes={modes}
/>

// Medium size
<DataCard
  title="Revenue"
  width={220}
  size="M"
  dataHead={{ leadValue: "£2,390", supportingValue: "/ 3,000" }}
  modes={modes}
/>

// Large size - prominent display (default)
<DataCard
  title="Revenue"
  width={248}
  size="L"
  dataHead={{ leadValue: "£2,390", supportingValue: "/ 3,000" }}
  modes={modes}
/>
```

### Without Title

```tsx
<DataCard
  showTitle={false}
  dataHead={{
    leadValue: "£2,390",
    supportingValue: "/ 3,000",
    supportingLabelText: "Monthly revenue",
  }}
  modes={modes}
/>
```

### Lead Value Only

```tsx
<DataCard
  title="Total Users"
  width={180}
  dataHead={{
    leadValue: "12,345",
    showDataSupporting: false,
    showSupportingLabel: false,
  }}
  modes={modes}
/>
```

### Dark Mode

```tsx
<DataCard
  title="Monthly Revenue"
  dataHead={{
    leadValue: "£2,390",
    supportingValue: "/ 3,000",
    supportingLabelText: "Target progress",
  }}
  modes={{ ...modes, colourMode: "Dark" }}
/>
```

### Different Themes

```tsx
// MyJio theme
<DataCard
  title="Revenue"
  dataHead={{ leadValue: "£2,390" }}
  modes={{ colourTheme: "MyJio", colourMode: "Light" }}
/>

// JioFinance theme
<DataCard
  title="Portfolio Value"
  dataHead={{ leadValue: "₹25,00,000", supportingValue: "+12.5%" }}
  modes={{ colourTheme: "JioFinance", colourMode: "Light" }}
/>
```

### Custom Width

```tsx
// Fixed width
<DataCard title="Revenue" width={300} dataHead={{ leadValue: "£2,390" }} />

// Full width
<DataCard title="Revenue" width="100%" dataHead={{ leadValue: "£2,390" }} />

// Auto width
<DataCard title="Revenue" width="auto" dataHead={{ leadValue: "£2,390" }} />
```

### Dashboard Grid

```tsx
<div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
  <DataCard
    title="Revenue"
    dataHead={{ leadValue: "£2,390", supportingValue: "/ 3,000" }}
    modes={modes}
  />
  <DataCard
    title="Users"
    dataHead={{ leadValue: "12,345", supportingValue: "+5.2%" }}
    modes={modes}
  />
  <DataCard
    title="Conversion"
    dataHead={{ leadValue: "3.2%", supportingValue: "of visitors" }}
    modes={modes}
  />
</div>
```

### Platform-Specific Sizing

```tsx
// Mobile
<DataCard
  title="Revenue"
  width={180}
  size="S"
  dataHead={{ leadValue: "£2,390" }}
  modes={{ Platform: "S [Mobile 360]" }}
/>

// Tablet
<DataCard
  title="Revenue"
  width={220}
  size="M"
  dataHead={{ leadValue: "£2,390" }}
  modes={{ Platform: "M [Tablet portrait 768]" }}
/>

// Desktop
<DataCard
  title="Revenue"
  width={280}
  size="L"
  dataHead={{ leadValue: "£2,390" }}
  modes={{ Platform: "L [Desktop 1920]" }}
/>
```

## Related Documentation

- **Component**: `src/components/DataCard.tsx`
- **Storybook**: `src/components/DataCard.stories.tsx`
- **Child Components**:
  - `src/components/ChartBody.tsx`
  - `src/components/DataHead.tsx`
  - `src/components/DataLead.tsx`
  - `src/components/DataSupporting.tsx`
  - `src/components/SupportingLabel.tsx`
- **Resolver**: `src/designData/figma-variables-resolver.js`

## Token Resolution Flow (Detailed)

```
props: modes + local props (appearance, fillEmphasis, backgroundLevel, size)
    ↓
modesByCollectionName mapping
    ↓
┌──────────────────────────────────────────────────┐
│ Collection Mappings (order matters):             │
│   "1 Appearance" ← appearance (default: Neutral) │
│   "2 Fill emphasis" ← fillEmphasis (Subtle)      │
│   "3 Background Level" ← backgroundLevel (L0)    │
│   "Local size" ← size (default: "L")             │
│   "5 Colour Mode" ← modes.colourMode             │
│   "6 Density" ← modes.Density                    │
│   "7 Platform" ← modes.Platform                  │
│   "9 Theme" ← modes.colourTheme                  │
│   "10 Brand" ← modes.Brand                       │
└──────────────────────────────────────────────────┘
    ↓
getVariableByName("Colour/Surface", ...) resolution chain:
    ↓
┌──────────────────────────────────────────────────┐
│ Colour/Surface                                   │
│   ↓ (9 Theme: MyJio)                             │
│ Jio/Surfaces/[Theme] Surface                     │
│   ↓ (1 Appearance: Neutral)                      │
│ Jio/MyJio/[appearance] Surface                   │
│   ↓ (2 Fill emphasis: Subtle)                    │
│ Grey/[Child] Surface                             │
│   ↓ (3 Background Level: Level 0)                │
│ Grey/Subtle/[Parent] Surface                     │
│   ↓                                              │
│ Primitive Color (e.g., Grey/100)                 │
└──────────────────────────────────────────────────┘
    ↓
childModes (modes + size + appearance + fillEmphasis + backgroundLevel) passed to children
    ↓
┌──────────────────────────────────────────────────┐
│ ChartBody resolves its own tokens (color, font)  │
│   └── Uses same appearance chain for text color  │
│ DataHead resolves spacing tokens                 │
│   └── Children resolve:                          │
│       - Font sizes via "Local size" collection   │
│       - Text colors via appearance chain         │
│         (on-Colour/High, Medium, Low tokens)     │
└──────────────────────────────────────────────────┘
```

## Performance Notes

- Uses `getVariableByName()` with O(1) lookup via `nameMap` for all design tokens
- Resolved values are cached automatically by the resolver
- Mode changes trigger fresh resolution with cache invalidation
- Child components receive a merged `childModes` object containing:
  - Global modes (Platform, Density, colourTheme, colourMode, Brand)
  - Local props (size, appearance, fillEmphasis, backgroundLevel)
- This ensures children use the same appearance chain for text color resolution
- Four local props control card styling:
  - `appearance` (defaults to "Neutral") - semantic color family
  - `fillEmphasis` (defaults to "Subtle") - background intensity
  - `backgroundLevel` (defaults to "Level 0") - depth hierarchy
  - `size` (defaults to "L") - font scaling for children
- When `fillEmphasis` is changed to "Bold", child text colors automatically adjust for contrast
- Token resolution follows the chain: appearance → fillEmphasis → backgroundLevel → primitives

## Use Cases

- Dashboard KPI cards
- Metric display tiles
- Data summary blocks
- Statistics cards
- Budget/target progress displays
- Financial metrics display
- User analytics cards
- Performance indicators

## Accessibility Notes

- Card structure provides clear visual grouping
- Text hierarchy (title → lead → supporting → label) aids comprehension
- Color contrast maintained in both Light and Dark modes
- Font sizes scale appropriately with size mode

## Files

| File                                         | Purpose                            |
| -------------------------------------------- | ---------------------------------- |
| `src/components/DataCard.tsx`                | Component implementation           |
| `src/components/DataCard.stories.tsx`        | Storybook stories                  |
| `src/components/ChartBody.tsx`               | Child component - title display    |
| `src/components/DataHead.tsx`                | Child component - data container   |
| `src/components/DataLead.tsx`                | Child component - lead value       |
| `src/components/DataSupporting.tsx`          | Child component - supporting value |
| `src/components/SupportingLabel.tsx`         | Child component - supporting label |
| `src/designData/figma-variables-resolver.js` | Design token resolver              |
