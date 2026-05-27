import { z } from 'zod'

export const ColorRole = z.enum(['primary', 'secondary', 'classic', 'accent', 'surface', 'muted'])
export type ColorRole = z.infer<typeof ColorRole>

export const Tone = z.enum(['primary', 'secondary', 'accent', 'muted', 'surface'])
export type Tone = z.infer<typeof Tone>

export const Variant = z.enum(['soft', 'solid', 'outline'])
export type Variant = z.infer<typeof Variant>

export const StyleOverrides = z
  .object({
    primary: z.string().optional(),
    secondary: z.string().optional(),
    classic: z.string().optional(),
    accent: z.string().optional(),
    surface: z.string().optional(),
    muted: z.string().optional(),
    background: z.string().optional(),
    foreground: z.string().optional(),
  })
  .partial()
  .strict()
export type StyleOverrides = z.infer<typeof StyleOverrides>

export const HorizontalAlign = z.enum(['left', 'center', 'right'])
export type HorizontalAlign = z.infer<typeof HorizontalAlign>

export const VerticalAlign = z.enum(['top', 'middle', 'bottom'])
export type VerticalAlign = z.infer<typeof VerticalAlign>

// Per-zone alignment. Layouts that have BOTH a title zone (header + title)
// AND a content zone read these so authors can align each zone independently.
// Missing per-zone fields fall through to the flat `horizontal` / `vertical`
// on the parent `Align`, then to the layout's defaults. Single-zone layouts
// (cover, section, closing, quote, full-image) ignore these and only read the
// flat fields.
const ZoneAlign = z
  .object({
    horizontal: HorizontalAlign.optional(),
    vertical: VerticalAlign.optional(),
  })
  .partial()
  .strict()
export type ZoneAlign = z.infer<typeof ZoneAlign>

// Align is a discriminated-free shape that accepts:
//   { horizontal, vertical }                         (flat: applies to both zones)
//   { title?: ZoneAlign, content?: ZoneAlign }       (nested: per-zone)
//   any mix of the two (per-zone wins over flat for that zone)
// The flat form is the historical shape and stays back-compat. Nested form is
// additive and lets PowerPoint-style independent zone alignment work.
export const Align = z
  .object({
    horizontal: HorizontalAlign.optional(),
    vertical: VerticalAlign.optional(),
    title: ZoneAlign.optional(),
    content: ZoneAlign.optional(),
  })
  .partial()
  .strict()
export type Align = z.infer<typeof Align>

export interface ResolvedZoneAlign {
  title: { horizontal: HorizontalAlign; vertical: VerticalAlign }
  content: { horizontal: HorizontalAlign; vertical: VerticalAlign }
  // True when the input set align.title or align.content (per-zone form).
  // Layouts use this to switch on the per-zone flex model that lets title
  // stay anchored while content centers (PowerPoint-style). When false the
  // slide uses the historical "align the whole column as one group" model,
  // which preserves back-compat for every deck written before this feature.
  perZone: boolean
}

export interface ZoneAlignDefaults {
  horizontal: HorizontalAlign
  vertical: VerticalAlign
}

// Normalize `slide.align` into canonical per-zone values. Per-zone fields win
// over the flat fields, which win over the layout defaults. Returns the same
// shape for both zones so layouts can stamp `data-h-title` / `data-v-title`
// and `data-h-content` / `data-v-content` without per-call branching.
export const resolveZoneAlign = (
  align: Align | undefined,
  defaults: ZoneAlignDefaults,
): ResolvedZoneAlign => {
  const flatH = align?.horizontal
  const flatV = align?.vertical
  const perZone = !!(align?.title || align?.content)
  return {
    title: {
      horizontal: align?.title?.horizontal ?? flatH ?? defaults.horizontal,
      vertical: align?.title?.vertical ?? flatV ?? defaults.vertical,
    },
    content: {
      horizontal: align?.content?.horizontal ?? flatH ?? defaults.horizontal,
      vertical: align?.content?.vertical ?? flatV ?? defaults.vertical,
    },
    perZone,
  }
}
