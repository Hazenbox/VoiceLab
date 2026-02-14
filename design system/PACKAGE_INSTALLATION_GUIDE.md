# Jio Design System - Package Installation Guide for Paulius

## Generated Packages

Two package tarballs have been created with the **latest fixes** (including Chip component improvements):

1. **`marcelinodzn-ds-tokens-1.0.1.tgz`** (708.4 KB)
   - Location: `packages/ds-tokens/marcelinodzn-ds-tokens-1.0.1.tgz`
   
2. **`marcelinodzn-ds-react-1.0.6.tgz`** (2.9 MB)
   - Location: `packages/ds-react/marcelinodzn-ds-react-1.0.6.tgz`

## Installation Instructions

### Step 1: Install the Tokens Package

```bash
npm install ./path/to/marcelinodzn-ds-tokens-1.0.1.tgz
```

### Step 2: Install the React Components Package

```bash
npm install ./path/to/marcelinodzn-ds-react-1.0.6.tgz
```

### Step 3: Install Peer Dependencies

The packages require these peer dependencies (install if not already in your project):

```bash
npm install react react-dom
npm install @base-ui/react
```

**React/React DOM:**
- Minimum version: React 18.x
- Recommended: React 18.2.0 or later

**Base UI:**
- Required version: `@base-ui/react` (used for headless accessible components)

### Step 4: Import and Use Components

```tsx
import { Button, Chip, Badge, BadgeCounter, Icon } from '@marcelinodzn/ds-react';
import { IcStar } from '@marcelinodzn/ds-react/icons';

function App() {
  return (
    <>
      <Button appearance="primary">Click me</Button>
      <Chip size="M" start={<BadgeCounter count={5} size="S" />}>
        Messages
      </Chip>
    </>
  );
}
```

## Latest Fixes Included

These packages include the following bug fixes:

1. **BadgeCounter "undefined" bug fixed**
   - Changed prop from `value` to `count` (correct API)
   - Example: `<BadgeCounter count={5} />` instead of `<BadgeCounter value={5} />`

2. **Chip XS and S sizes now distinct**
   - XS chips: 20px height
   - S chips: 24px height
   - M chips: 32px height
   - L chips: 40px height

3. **Improved hover/pressed states**
   - Added visual feedback overlay for interactive chips
   - Smooth transitions for state changes

## TypeScript Support

**Note:** The ds-react package build encountered a memory issue during TypeScript declaration (`.d.ts`) generation, but the JavaScript bundles (CJS and ESM) built successfully. 

If you encounter TypeScript errors:
- The components will still work at runtime
- You may need to add `// @ts-ignore` or `// @ts-expect-error` for type errors
- We're working on optimizing the build process to fix this

## File Sizes

- **ds-tokens**: 708.4 KB compressed, 9.9 MB unpacked
- **ds-react**: 2.9 MB compressed, 17.4 MB unpacked

## Testing the Installation

Create a test component to verify everything works:

```tsx
import { Badge, BadgeCounter, Chip, Button, Icon } from '@marcelinodzn/ds-react';
import { IcStar, IcClose } from '@marcelinodzn/ds-react/icons';

export function TestComponent() {
  return (
    <div style={{ padding: '20px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
      {/* Button */}
      <Button appearance="primary" size="M">Primary Button</Button>
      
      {/* Chip with BadgeCounter - using correct 'count' prop */}
      <Chip size="M" start={<BadgeCounter count={5} size="S" />}>
        Messages
      </Chip>
      
      {/* Chip with icons */}
      <Chip 
        size="M"
        start={<Icon asset={<IcStar />} size="S" />}
        end={<Icon asset={<IcClose />} size="S" />}
      >
        Favorite
      </Chip>
      
      {/* Size comparison - XS vs S (now different heights!) */}
      <Chip size="XS">XS - 20px</Chip>
      <Chip size="S">S - 24px</Chip>
      <Chip size="M">M - 32px</Chip>
      <Chip size="L">L - 40px</Chip>
    </div>
  );
}
```

## Support

If you encounter any issues:
1. Check that all peer dependencies are installed
2. Verify React version is 18.x or later
3. Try clearing `node_modules` and reinstalling
4. Contact Nuno Marcelino with specific error messages

## Next Steps

After installation, you can:
- Import any component from `@marcelinodzn/ds-react`
- Access 1600+ icons from `@marcelinodzn/ds-react/icons`
- Use design tokens from `@marcelinodzn/ds-tokens`

For full documentation, see the Storybook or component source code in the packages.
