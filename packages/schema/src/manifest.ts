import { z } from 'zod'
import { StyleOverrides } from './style.js'
import { Theme } from './theme.js'

export const PathDef = z.object({
  label: z.string(),
  color: z.string().optional(),
})
export type PathDef = z.infer<typeof PathDef>

export const ThemeRef = z.union([z.string(), Theme])
export type ThemeRef = z.infer<typeof ThemeRef>

// A section marker sits between slides in slide_order. Editor-only metadata:
// the renderer, path resolver, and PDF export all skip these. Stable `id`
// lets the editor track collapsed/expanded state across renames.
export const SectionMarker = z.object({
  type: z.literal('section'),
  id: z.string().min(1),
  title: z.string(),
})
export type SectionMarker = z.infer<typeof SectionMarker>

export const SlideOrderEntry = z.union([z.string(), SectionMarker])
export type SlideOrderEntry = z.infer<typeof SlideOrderEntry>

export const isSectionMarker = (entry: SlideOrderEntry): entry is SectionMarker =>
  typeof entry !== 'string' && entry !== null && (entry as { type?: string }).type === 'section'

export const slideIdsOf = (order: readonly SlideOrderEntry[]): string[] =>
  order.filter((e): e is string => typeof e === 'string')

// Optional deck-wide watermark stamped on every slide. Useful for draft /
// confidential markers. Rendered as a small semi-transparent label by the
// runtime; the editor's toolbar exposes a dialog to set it.
export const Watermark = z.object({
  text: z.string().min(1),
  position: z.enum(['bottom-left', 'bottom-center', 'bottom-right']).default('bottom-right'),
  opacity: z.number().min(0).max(1).optional(),
})
export type Watermark = z.infer<typeof Watermark>

export const Manifest = z.object({
  title: z.string(),
  theme: ThemeRef.default('verso-slate'),
  paths: z.record(z.string(), PathDef).default({}),
  slide_order: z.array(SlideOrderEntry).default([]),
  style_overrides: StyleOverrides.optional(),
  // Free-form key/value pairs interpolated into slide text at render time as
  // `{{key}}`. Built-in keys (`date`, `time`, `pathId`, `deckTitle`) resolve
  // automatically and don't need to be declared here. Useful for shared deck
  // templates: declare `{{author}}` once, reuse across every slide.
  variables: z.record(z.string(), z.string()).optional(),
  watermark: Watermark.optional(),
})
export type Manifest = z.infer<typeof Manifest>
