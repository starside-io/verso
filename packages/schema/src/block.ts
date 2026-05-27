import { z } from 'zod'
import { Align, StyleOverrides, Tone, Variant } from './style.js'

const BaseBlock = z.object({
  id: z.string().optional(),
  path_include: z.array(z.string()).optional(),
  path_exclude: z.array(z.string()).optional(),
  style_overrides: StyleOverrides.optional(),
  align: Align.optional(),
})

// Phosphor icon weights. Declared up here because both IconBlock (below) and
// BulletItem (below) reference it.
export const ICON_WEIGHTS = ['thin', 'light', 'regular', 'bold', 'fill', 'duotone'] as const
export type IconWeight = (typeof ICON_WEIGHTS)[number]

export const HeadingBlock = BaseBlock.extend({
  type: z.literal('heading'),
  level: z.union([z.literal(1), z.literal(2), z.literal(3)]).default(2),
  text: z.string(),
})

export const TextBlock = BaseBlock.extend({
  type: z.literal('text'),
  text: z.string(),
})

// A bullets item is either a plain string OR an object that pairs the text
// with a leading Phosphor icon. The icon picks up `--color-primary` by
// default; override per-item with `iconTone`. Backward compatible: existing
// `items: ["a", "b"]` still parses fine.
export const BulletItem = z.union([
  z.string(),
  z.object({
    text: z.string(),
    icon: z.string().optional(),
    iconWeight: z.enum(ICON_WEIGHTS).optional(),
    iconTone: Tone.optional(),
  }),
])
export type BulletItem = z.infer<typeof BulletItem>

export const BulletsBlock = BaseBlock.extend({
  type: z.literal('bullets'),
  items: z.array(BulletItem),
})

export const ImageBlock = BaseBlock.extend({
  type: z.literal('image'),
  src: z.string(),
  alt: z.string().optional(),
  caption: z.string().optional(),
})

export const QuoteBlock = BaseBlock.extend({
  type: z.literal('quote'),
  text: z.string(),
  attribution: z.string().optional(),
})

export const CodeBlock = BaseBlock.extend({
  type: z.literal('code'),
  language: z.string().optional(),
  source: z.string(),
})

export const CalloutBlock = BaseBlock.extend({
  type: z.literal('callout'),
  tone: z.enum(['info', 'warn', 'success', 'danger']).default('info'),
  text: z.string(),
})

export const AccentBarBlock = BaseBlock.extend({
  type: z.literal('accent-bar'),
  tone: Tone.optional(),
  size: z.enum(['thin', 'thick']).optional(),
  orientation: z.enum(['horizontal', 'vertical']).optional(),
})

export const BadgeBlock = BaseBlock.extend({
  type: z.literal('badge'),
  tone: Tone.optional(),
  variant: Variant.optional(),
  text: z.string(),
})

export const DividerBlock = BaseBlock.extend({
  type: z.literal('divider'),
  tone: Tone.optional(),
})

// Iframe embed (YouTube, CodeSandbox, Figma, etc.). Aspect controls the
// container ratio when set (default 16:9). `fallback_src` / `fallback_text`
// are shown in PDF export (print media) since iframes don't reliably
// rasterize in headless Chromium snapshots.
export const EmbedBlock = BaseBlock.extend({
  type: z.literal('embed'),
  src: z.string(),
  title: z.string().optional(),
  aspect: z.enum(['16:9', '4:3', '1:1', '21:9', 'auto']).optional(),
  fallback_src: z.string().optional(),
  fallback_text: z.string().optional(),
  allow: z.string().optional(),
})

// Phosphor icon block. `name` is the Phosphor icon id (kebab-case, e.g.
// "lightning", "check-circle"). `weight` picks one of Phosphor's six visual
// weights (defaults to regular). `tone` maps to the existing color cascade
// (--color-primary, --color-secondary, etc.) via CSS variables so themes
// drive the rendered color. `label` makes the icon focusable to assistive
// tech; omit for purely decorative use.
export const IconBlock = BaseBlock.extend({
  type: z.literal('icon'),
  name: z.string(),
  weight: z.enum(ICON_WEIGHTS).optional(),
  size: z.number().int().positive().optional(),
  tone: Tone.optional(),
  label: z.string().optional(),
})

export const CustomBlock = BaseBlock.extend({
  type: z.string(),
}).passthrough()

export type HeadingBlock = z.infer<typeof HeadingBlock>
export type TextBlock = z.infer<typeof TextBlock>
export type BulletsBlock = z.infer<typeof BulletsBlock>
export type ImageBlock = z.infer<typeof ImageBlock>
export type QuoteBlock = z.infer<typeof QuoteBlock>
export type CodeBlock = z.infer<typeof CodeBlock>
export type CalloutBlock = z.infer<typeof CalloutBlock>
export type AccentBarBlock = z.infer<typeof AccentBarBlock>
export type BadgeBlock = z.infer<typeof BadgeBlock>
export type DividerBlock = z.infer<typeof DividerBlock>
export type EmbedBlock = z.infer<typeof EmbedBlock>
export type IconBlock = z.infer<typeof IconBlock>
export type CustomBlock = z.infer<typeof CustomBlock>

type BaseBlockShape = z.infer<typeof BaseBlock>

export interface CardBlock extends BaseBlockShape {
  type: 'card'
  tone?: Tone
  variant?: Variant
  padding?: 'none' | 'sm' | 'md' | 'lg'
  /** Optional header text rendered above content. Useful as a quick title
   *  without wrapping it in a heading block. */
  header?: string
  /** Optional Phosphor icon rendered next to the header (or above content if
   *  no header). Same lookup pipeline as the standalone IconBlock. */
  icon?: string
  iconWeight?: IconWeight
  iconTone?: Tone
  content: ContentBlock[]
}

export interface PanelBlock extends BaseBlockShape {
  type: 'panel'
  tone?: Tone
  variant?: Variant
  bleed?: 'left' | 'right' | 'top' | 'bottom' | 'all' | 'none'
  content: ContentBlock[]
}

export type ContentBlock =
  | HeadingBlock
  | TextBlock
  | BulletsBlock
  | ImageBlock
  | QuoteBlock
  | CodeBlock
  | CalloutBlock
  | AccentBarBlock
  | BadgeBlock
  | DividerBlock
  | EmbedBlock
  | IconBlock
  | CardBlock
  | PanelBlock
  | CustomBlock

export const ContentBlock: z.ZodType<ContentBlock> = z.lazy(() =>
  z.union([
    HeadingBlock,
    TextBlock,
    BulletsBlock,
    ImageBlock,
    QuoteBlock,
    CodeBlock,
    CalloutBlock,
    AccentBarBlock,
    BadgeBlock,
    DividerBlock,
    EmbedBlock,
    IconBlock,
    CardBlock,
    PanelBlock,
    CustomBlock,
  ]),
)

export const CardBlock: z.ZodType<CardBlock> = z.lazy(() =>
  BaseBlock.extend({
    type: z.literal('card'),
    tone: Tone.optional(),
    variant: Variant.optional(),
    padding: z.enum(['none', 'sm', 'md', 'lg']).optional(),
    header: z.string().optional(),
    icon: z.string().optional(),
    iconWeight: z.enum(ICON_WEIGHTS).optional(),
    iconTone: Tone.optional(),
    content: z.array(ContentBlock),
  }),
)

export const PanelBlock: z.ZodType<PanelBlock> = z.lazy(() =>
  BaseBlock.extend({
    type: z.literal('panel'),
    tone: Tone.optional(),
    variant: Variant.optional(),
    bleed: z.enum(['left', 'right', 'top', 'bottom', 'all', 'none']).optional(),
    content: z.array(ContentBlock),
  }),
)
