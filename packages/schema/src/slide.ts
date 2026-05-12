import { z } from 'zod'
import { ContentBlock } from './block.js'
import { Align, StyleOverrides } from './style.js'

export const Slide = z.object({
  id: z.string().min(1),
  header: z.string().optional(),
  title: z.string().optional(),
  layout: z.string().default('content'),
  content: z.array(ContentBlock).default([]),
  tags: z.array(z.string()).optional(),
  notes: z.string().optional(),
  annotation: z.string().optional(),
  path_include: z.array(z.string()).optional(),
  path_exclude: z.array(z.string()).optional(),
  // When true, this slide is hidden from the auto-built `agenda` layout. Use
  // for housekeeping slides (cover, the agenda itself, closing) so they don't
  // appear in their own table of contents.
  omit_from_agenda: z.boolean().optional(),
  // Per-slide transition played in present/speaker mode when this slide
  // becomes active. Free-form string so projects can add custom CSS animations,
  // but the renderer ships these out-of-the-box: "none" (default), "fade",
  // "slide-left", "slide-right", "slide-up", "slide-down", "zoom", "zoom-out",
  // "flip-x", "flip-y", "blur", "pop", "iris", "wipe-right", "wipe-down",
  // "tilt".
  transition: z.string().optional(),
  style_overrides: StyleOverrides.optional(),
  align: Align.optional(),
})
export type Slide = z.infer<typeof Slide>
