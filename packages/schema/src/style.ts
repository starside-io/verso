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

export const Align = z
  .object({
    horizontal: HorizontalAlign.optional(),
    vertical: VerticalAlign.optional(),
  })
  .partial()
  .strict()
export type Align = z.infer<typeof Align>
