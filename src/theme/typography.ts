/**
 * Chat Typography Tokens - DS Compact Density
 * 
 * Based on Jio Design System tokens at Compact density.
 * Scale uses Body/L (15px) as base with ~1.25 modular ratio.
 * 
 * DS Token Reference:
 * - Display/S: 23px
 * - Body/2XL: 19px
 * - Body/XL: 17px
 * - Body/L: 15px (base)
 * - Body/M: 14px
 * - Body/S: 12px
 * - Body/XS: 10px
 */

export const chatTypography = {
  // Headings
  h1: { fontSize: '23px', lineHeight: 1.2, fontWeight: 700 },  // Display/S
  h2: { fontSize: '19px', lineHeight: 1.3, fontWeight: 600 },  // Body/2XL
  h3: { fontSize: '17px', lineHeight: 1.3, fontWeight: 600 },  // Body/XL
  h4: { fontSize: '15px', lineHeight: 1.4, fontWeight: 600 },  // Body/L
  h5: { fontSize: '14px', lineHeight: 1.4, fontWeight: 500 },  // Body/M
  h6: { fontSize: '12px', lineHeight: 1.4, fontWeight: 500 },  // Body/S

  // Body text
  body: { fontSize: '15px', lineHeight: 1.5, fontWeight: 300 },    // Body/L - BASE (lighter for JioType)
  bodySm: { fontSize: '14px', lineHeight: 1.5, fontWeight: 400 },  // Body/M

  // UI elements
  caption: { fontSize: '12px', lineHeight: 1.5, fontWeight: 400 }, // Body/S
  label: { fontSize: '10px', lineHeight: 1.4, fontWeight: 500 },   // Body/XS

  // Input areas
  input: { fontSize: '15px', lineHeight: 1.5, fontWeight: 400 },   // Body/L

  // Letter spacing
  letterSpacing: {
    tight: '-0.12px',  // For body text
    normal: '0',       // Default
  },
} as const;

// Line height in pixels for calculations (e.g., textarea max height)
export const lineHeights = {
  body: 22,   // 15px * 1.5 ≈ 22px
  input: 22,  // Match body
} as const;

export type ChatTypographyKey = keyof typeof chatTypography;
