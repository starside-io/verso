import { z } from 'zod'

export const ThemeColors = z.object({
  primary: z.string(),
  secondary: z.string(),
  classic: z.string(),
  accent: z.string().optional(),
  surface: z.string().optional(),
  muted: z.string().optional(),
  background: z.string().optional(),
  foreground: z.string().optional(),
})
export type ThemeColors = z.infer<typeof ThemeColors>

export const Theme = z.object({
  name: z.string().min(1),
  colors: ThemeColors,
})
export type Theme = z.infer<typeof Theme>
