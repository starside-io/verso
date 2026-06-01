import { z } from 'zod'
import { ContentBlock } from './block.js'
import { Align, StyleOverrides } from './style.js'

// Per-layout requirements that AI-generated decks routinely get wrong.
//
// `minBlocks`: minimum top-level blocks in `content`. Layouts that silently
// degrade with too few blocks (agenda falls back to deckOutline, full-image
// just hides the image, etc.) keep their minimum at 0.
//
// `mustBeMultipleOf`: top-level block count must be a multiple of N. The
// twoCol/threeCol layouts split content by midpoint and leave a column empty
// (or visually unbalanced) when the count doesn't divide evenly. Set with the
// minimum so we both reject "too few" and "wrong shape" with one rule.
//
// `needsImage`: at least one top-level block must have `type: "image"`.
//
// `needsHeadingGroups`: at least N top-level heading blocks. The compare and
// (sometimes) stats layouts use headings to partition content into sides /
// cells; without enough headings the layout collapses to one side.
//
// Layouts not listed here are unconstrained.
export const layoutRequirements: Record<
  string,
  {
    minBlocks: number
    mustBeMultipleOf?: number
    needsImage?: boolean
    needsHeadingGroups?: number
  }
> = {
  'two-col': { minBlocks: 2, mustBeMultipleOf: 2 },
  'three-col': { minBlocks: 3, mustBeMultipleOf: 3 },
  compare: { minBlocks: 2, needsHeadingGroups: 2 },
  'image-left': { minBlocks: 1, needsImage: true },
  'image-right': { minBlocks: 1, needsImage: true },
  stats: { minBlocks: 1 },
  'big-number': { minBlocks: 1 },
  // Asymmetric splits. Same shape as two-col: 2 columns, blocks split by
  // midpoint, must be a multiple of 2 to balance.
  'one-third-left': { minBlocks: 2, mustBeMultipleOf: 2 },
  'one-third-right': { minBlocks: 2, mustBeMultipleOf: 2 },
  'two-thirds-left': { minBlocks: 2, mustBeMultipleOf: 2 },
  'two-thirds-right': { minBlocks: 2, mustBeMultipleOf: 2 },
  // Grids. quad and swot are fixed 2x2 (exactly 4). icon-grid is flexible
  // but should have at least 3 cells to read as a grid. kpi-band needs at
  // least one card up top.
  quad: { minBlocks: 4 },
  swot: { minBlocks: 4 },
  'icon-grid': { minBlocks: 3 },
  'kpi-band': { minBlocks: 1 },
  // Image-driven. picture-fill needs an image to fill the slide;
  // picture-with-caption needs both an image and at least one block for the
  // caption side. bento needs at least 3 cells to look like a magazine grid.
  'picture-fill': { minBlocks: 1, needsImage: true },
  'picture-with-caption': { minBlocks: 2, needsImage: true },
  bento: { minBlocks: 3 },
  // Title + special. title-only and chapter only render the slide title;
  // callout-banner uses the title + first block. q-and-a needs at least 2
  // blocks for the Q and the A.
  'title-band': { minBlocks: 0 },
  'title-only': { minBlocks: 0 },
  'callout-banner': { minBlocks: 1 },
  chapter: { minBlocks: 0 },
  'q-and-a': { minBlocks: 2 },
  // Flow + structured. process needs at least 2 steps to be a process.
  // split-vertical is 2 stacked panels. roadmap needs at least 2 quarters.
  process: { minBlocks: 2 },
  'split-vertical': { minBlocks: 2, mustBeMultipleOf: 2 },
  roadmap: { minBlocks: 2 },
}

const BaseSlide = z.object({
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

// Layout-aware validation runs AFTER the basic field validations succeed.
// Each rule pushes a fresh ZodIssue with a friendly message that mentions
// the slide id and the chosen layout, so the editor / build / data-plugin
// can surface it verbatim.
export const Slide = BaseSlide.superRefine((slide, ctx) => {
  const req = layoutRequirements[slide.layout]
  if (!req) return
  const count = slide.content.length

  if (count < req.minBlocks) {
    const noun = req.minBlocks === 1 ? 'block' : 'blocks'
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['content'],
      message: `Slide "${slide.id}" uses layout "${slide.layout}" but has only ${count} ${count === 1 ? 'block' : 'blocks'}. The ${slide.layout} layout needs at least ${req.minBlocks} ${noun}${columnHint(slide.layout)}.`,
    })
    // If the minimum isn't met, the multiple-of / image / heading checks
    // below would add noise. Stop here.
    return
  }

  if (req.mustBeMultipleOf && count % req.mustBeMultipleOf !== 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['content'],
      message: `Slide "${slide.id}" uses layout "${slide.layout}" but has ${count} blocks. The ${slide.layout} layout splits content evenly across ${req.mustBeMultipleOf} columns, so the block count must be a multiple of ${req.mustBeMultipleOf}. Add or remove a block, or switch to a different layout.`,
    })
  }

  if (req.needsImage && !slide.content.some((b) => b.type === 'image')) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['content'],
      message: `Slide "${slide.id}" uses layout "${slide.layout}" but has no image block. Add a block with type "image" or switch to a different layout.`,
    })
  }

  if (req.needsHeadingGroups) {
    const headings = slide.content.filter((b) => b.type === 'heading').length
    if (headings < req.needsHeadingGroups) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['content'],
        message: `Slide "${slide.id}" uses layout "${slide.layout}" but has only ${headings} heading ${headings === 1 ? 'block' : 'blocks'}. The ${slide.layout} layout uses headings to split content into sides; add at least ${req.needsHeadingGroups} heading blocks (one per side).`,
      })
    }
  }
})

const columnHint = (layout: string): string => {
  if (layout === 'two-col') return ' (one per column)'
  if (layout === 'three-col') return ' (one per column)'
  return ''
}

export type Slide = z.infer<typeof Slide>
