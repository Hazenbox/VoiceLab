# Fonts Directory

This directory is reserved for future font assets if needed.

## Current Font Setup

The app uses a custom font configuration defined in `src/index.css`:

### Primary Font: JioType (JioTypeVar)

**Variable font** supporting weights 100-900 in both regular and italic styles.

- **Location:** `/public/JioTypeVar.ttf` and `/public/JioTypeVar-Italic.ttf`
- **Family name:** `JioType`
- **Usage:** Applied globally to all text via `:root`
- **Fallback chain:** Inter → system-ui → Avenir → Helvetica → Arial → sans-serif

### Monospace Font: Geist Mono

**Variable font** from Google Fonts supporting weights 100-900.

- **Source:** Google Fonts CDN (linked in `index.html`)
- **Usage:** Applied to all `font-mono` Tailwind classes and code/time displays
- **Fallback chain:** ui-monospace → SFMono-Regular → Menlo → Monaco → Consolas → monospace

## Font Weight Tokens

The design system uses these font weights:
- **400** - Regular (default)
- **500** - Medium
- **600** - Semibold

All weights are supported by the variable fonts.
