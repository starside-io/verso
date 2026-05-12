import { type LayoutContext, defineLayout, html } from '@starside-io/verso-runtime'
import type {
  Align,
  BulletsBlock,
  ContentBlock,
  HeadingBlock,
  HorizontalAlign,
  ImageBlock,
  QuoteBlock,
  Slide,
  VerticalAlign,
} from '@starside-io/verso-schema'

interface AlignDefaults {
  horizontal: HorizontalAlign
  vertical: VerticalAlign
}

const resolveAlign = (
  override: Align | undefined,
  defaults: AlignDefaults,
): { h: HorizontalAlign; v: VerticalAlign } => ({
  h: override?.horizontal ?? defaults.horizontal,
  v: override?.vertical ?? defaults.vertical,
})

const headerBlock = (slide: Slide) =>
  slide.header ? html`<div class="verso-kicker">${slide.header}</div>` : ''

const titleBlock = (slide: Slide, className = 'verso-title') =>
  slide.title ? html`<h1 class="${className}">${slide.title}</h1>` : ''

const splitImageAndRest = (
  blocks: readonly ContentBlock[],
): {
  image: ImageBlock | undefined
  imageIdx: number
  rest: Array<{ block: ContentBlock; idx: number }>
} => {
  const imageIdx = blocks.findIndex((b): b is ImageBlock => b.type === 'image')
  const image = imageIdx >= 0 ? (blocks[imageIdx] as ImageBlock) : undefined
  const rest = blocks.map((block, idx) => ({ block, idx })).filter((entry) => entry.block !== image)
  return { image, imageIdx, rest }
}

/** Render a list of blocks where each one's index in ctx.blocks is the same as
 *  its index in the array (i.e. the array is a prefix slice). */
const renderBlocks = (blocks: readonly ContentBlock[], ctx: LayoutContext) =>
  blocks.map((b, i) => ctx.block(b, [i]))

/** Render a list of blocks paired with their original indices in ctx.blocks. */
const renderIndexed = (
  pairs: ReadonlyArray<{ block: ContentBlock; idx: number }>,
  ctx: LayoutContext,
) => pairs.map(({ block, idx }) => ctx.block(block, [idx]))

/** Slice ctx.blocks by [start, end) and pair each with its real index. */
const sliceIndexed = (blocks: readonly ContentBlock[], start: number, end: number) =>
  blocks.slice(start, end).map((block, i) => ({ block, idx: start + i }))

interface IndexedBlock {
  block: ContentBlock
  idx: number
}

interface BlockGroup {
  heading?: HeadingBlock
  headingIdx?: number
  body: IndexedBlock[]
}

const groupByHeading = (blocks: readonly ContentBlock[]): BlockGroup[] => {
  const groups: BlockGroup[] = []
  let current: BlockGroup | undefined
  blocks.forEach((b, i) => {
    if (b.type === 'heading') {
      current = { heading: b as HeadingBlock, headingIdx: i, body: [] }
      groups.push(current)
    } else if (current) {
      current.body.push({ block: b, idx: i })
    } else {
      current = { body: [{ block: b, idx: i }] }
      groups.push(current)
    }
  })
  return groups
}

const splitIntoColumns = (blocks: readonly ContentBlock[], n: number): IndexedBlock[][] => {
  const size = Math.max(1, Math.ceil(blocks.length / n))
  const out: IndexedBlock[][] = []
  for (let i = 0; i < n; i++) {
    out.push(
      blocks.slice(i * size, (i + 1) * size).map((block, j) => ({ block, idx: i * size + j })),
    )
  }
  return out
}

export const content = defineLayout({
  name: 'content',
  render: (slide, ctx) => {
    const { h, v } = resolveAlign(slide.align, { horizontal: 'left', vertical: 'top' })
    return html`
      <div class="layout-content" data-h="${h}" data-v="${v}">
        <div class="verso-stack">
          ${headerBlock(slide)}
          ${titleBlock(slide)}
          <div class="verso-content">${renderBlocks(ctx.blocks, ctx)}</div>
        </div>
      </div>
    `
  },
})

export const twoCol = defineLayout({
  name: 'two-col',
  render: (slide, ctx) => {
    const { h, v } = resolveAlign(slide.align, { horizontal: 'left', vertical: 'top' })
    const half = Math.ceil(ctx.blocks.length / 2)
    const left = sliceIndexed(ctx.blocks, 0, half)
    const right = sliceIndexed(ctx.blocks, half, ctx.blocks.length)
    return html`
      <div class="layout-two-col" data-h="${h}" data-v="${v}">
        ${headerBlock(slide)}
        ${titleBlock(slide)}
        <div class="verso-cols">
          <div class="verso-col"><div class="verso-side-content">${renderIndexed(left, ctx)}</div></div>
          <div class="verso-col"><div class="verso-side-content">${renderIndexed(right, ctx)}</div></div>
        </div>
      </div>
    `
  },
})

export const imageLeft = defineLayout({
  name: 'image-left',
  render: (slide, ctx) => {
    const { h, v } = resolveAlign(slide.align, { horizontal: 'left', vertical: 'middle' })
    const { image, imageIdx, rest } = splitImageAndRest(ctx.blocks)
    return html`
      <div class="layout-image-left" data-h="${h}" data-v="${v}">
        ${headerBlock(slide)}
        ${titleBlock(slide)}
        <div class="verso-cols">
          <div class="verso-image-side"><div class="verso-side-content">${image ? ctx.block(image, [imageIdx]) : ''}</div></div>
          <div class="verso-text-side"><div class="verso-side-content">${renderIndexed(rest, ctx)}</div></div>
        </div>
      </div>
    `
  },
})

export const imageRight = defineLayout({
  name: 'image-right',
  render: (slide, ctx) => {
    const { h, v } = resolveAlign(slide.align, { horizontal: 'left', vertical: 'middle' })
    const { image, imageIdx, rest } = splitImageAndRest(ctx.blocks)
    return html`
      <div class="layout-image-right" data-h="${h}" data-v="${v}">
        ${headerBlock(slide)}
        ${titleBlock(slide)}
        <div class="verso-cols">
          <div class="verso-text-side"><div class="verso-side-content">${renderIndexed(rest, ctx)}</div></div>
          <div class="verso-image-side"><div class="verso-side-content">${image ? ctx.block(image, [imageIdx]) : ''}</div></div>
        </div>
      </div>
    `
  },
})

export const hero = defineLayout({
  name: 'hero',
  render: (slide, ctx) => {
    const { h, v } = resolveAlign(slide.align, { horizontal: 'center', vertical: 'middle' })
    return html`
      <div class="layout-hero" data-h="${h}" data-v="${v}">
        <div class="verso-stack">
          ${headerBlock(slide)}
          ${slide.title ? html`<h1 class="verso-hero-title">${slide.title}</h1>` : ''}
          <div class="verso-hero-body">${renderBlocks(ctx.blocks, ctx)}</div>
        </div>
      </div>
    `
  },
})

export const fullImage = defineLayout({
  name: 'full-image',
  render: (slide, ctx) => {
    const { h, v } = resolveAlign(slide.align, { horizontal: 'left', vertical: 'bottom' })
    const { image, rest } = splitImageAndRest(ctx.blocks)
    return html`
      <div class="layout-full-image" data-h="${h}" data-v="${v}">
        ${
          image
            ? html`<img class="verso-full-image-bg" src="${image.src}" alt="${image.alt ?? ''}" />`
            : ''
        }
        <div class="verso-full-image-overlay">
          <div class="verso-stack">
            ${headerBlock(slide)}
            ${slide.title ? html`<h1 class="verso-title">${slide.title}</h1>` : ''}
            <div class="verso-content">${renderIndexed(rest, ctx)}</div>
          </div>
        </div>
      </div>
    `
  },
})

export const cover = defineLayout({
  name: 'cover',
  render: (slide, ctx) => {
    const { h, v } = resolveAlign(slide.align, { horizontal: 'center', vertical: 'middle' })
    return html`
      <div class="layout-cover" data-h="${h}" data-v="${v}">
        ${slide.header ? html`<div class="verso-cover-kicker">${slide.header}</div>` : ''}
        ${slide.title ? html`<h1 class="verso-cover-title">${slide.title}</h1>` : ''}
        <div class="verso-cover-body">${renderBlocks(ctx.blocks, ctx)}</div>
      </div>
    `
  },
})

export const section = defineLayout({
  name: 'section',
  render: (slide, ctx) => {
    const { h, v } = resolveAlign(slide.align, { horizontal: 'left', vertical: 'middle' })
    return html`
      <div class="layout-section" data-h="${h}" data-v="${v}">
        ${slide.header ? html`<div class="verso-section-kicker">${slide.header}</div>` : ''}
        ${slide.title ? html`<h1 class="verso-section-title">${slide.title}</h1>` : ''}
        <div class="verso-section-body">${renderBlocks(ctx.blocks, ctx)}</div>
      </div>
    `
  },
})

export const agenda = defineLayout({
  name: 'agenda',
  render: (slide, ctx) => {
    const { h, v } = resolveAlign(slide.align, { horizontal: 'left', vertical: 'top' })

    // 1. Manual `bullets` block always wins (lets the author override the
    //    auto agenda for a specific slide).
    // 2. Else `heading` blocks on this slide (legacy behavior).
    // 3. Else build from the deck outline: prefer section markers if any
    //    exist, otherwise list every path-filtered slide title.
    const bullets = ctx.blocks.find((b): b is BulletsBlock => b.type === 'bullets')
    const headingItems = ctx.blocks
      .filter((b): b is HeadingBlock => b.type === 'heading')
      .map((b) => ({ text: b.text, isSection: false }))

    let items: { text: string; isSection: boolean }[]
    if (bullets) {
      items = bullets.items.map((t) => ({ text: t, isSection: false }))
    } else if (headingItems.length > 0) {
      items = headingItems
    } else {
      const outline = ctx.deckOutline ?? []
      const sections = outline.filter((e) => e.kind === 'section')
      items =
        sections.length > 0
          ? sections.map((e) => ({ text: e.title, isSection: true }))
          : outline
              .filter((e) => e.kind === 'slide')
              .map((e) => ({ text: e.title, isSection: false }))
    }

    // Density tier drives column count and font size via CSS attribute.
    // Thresholds tuned for a 1920x1080 deck with the layout's default padding.
    const density = items.length <= 8 ? 'sparse' : items.length <= 20 ? 'medium' : 'dense'

    return html`
      <div class="layout-agenda" data-h="${h}" data-v="${v}" data-density="${density}">
        ${headerBlock(slide)}
        ${titleBlock(slide)}
        <ol class="verso-agenda">
          ${items.map(
            (it) =>
              html`<li class="verso-agenda-item${it.isSection ? ' is-section' : ''}">${it.text}</li>`,
          )}
        </ol>
      </div>
    `
  },
})

export const threeCol = defineLayout({
  name: 'three-col',
  render: (slide, ctx) => {
    const { h, v } = resolveAlign(slide.align, { horizontal: 'left', vertical: 'top' })
    const cols = splitIntoColumns(ctx.blocks, 3)
    return html`
      <div class="layout-three-col" data-h="${h}" data-v="${v}">
        ${headerBlock(slide)}
        ${titleBlock(slide)}
        <div class="verso-cols verso-cols-3">
          ${cols.map(
            (col) => html`
              <div class="verso-col">
                <div class="verso-side-content">${renderIndexed(col, ctx)}</div>
              </div>
            `,
          )}
        </div>
      </div>
    `
  },
})

export const compare = defineLayout({
  name: 'compare',
  render: (slide, ctx) => {
    const { h, v } = resolveAlign(slide.align, { horizontal: 'left', vertical: 'top' })
    const groups = groupByHeading(ctx.blocks)
    const left = groups[0]
    const right = groups[1]
    const renderSide = (g: BlockGroup | undefined, sideClass: string) => html`
      <div class="verso-compare-side ${sideClass}">
        ${g?.heading ? html`<div class="verso-compare-header">${g.heading.text}</div>` : ''}
        <div class="verso-side-content">${g ? renderIndexed(g.body, ctx) : ''}</div>
      </div>
    `
    return html`
      <div class="layout-compare" data-h="${h}" data-v="${v}">
        ${headerBlock(slide)}
        ${titleBlock(slide)}
        <div class="verso-cols verso-compare-cols">
          ${renderSide(left, 'verso-compare-left')}
          ${renderSide(right, 'verso-compare-right')}
        </div>
      </div>
    `
  },
})

export const stats = defineLayout({
  name: 'stats',
  render: (slide, ctx) => {
    const { h, v } = resolveAlign(slide.align, { horizontal: 'center', vertical: 'middle' })
    const hasContainers = ctx.blocks.some((b) => b.type === 'card' || b.type === 'panel')
    const cells: BlockGroup[] = hasContainers
      ? ctx.blocks.map((b, i) => ({ body: [{ block: b, idx: i }] }))
      : groupByHeading(ctx.blocks)
    return html`
      <div class="layout-stats" data-h="${h}" data-v="${v}">
        ${headerBlock(slide)}
        ${titleBlock(slide)}
        <div class="verso-stats" data-count="${cells.length}">
          ${cells.map(
            (g) => html`
              <div class="verso-stat">
                ${g.heading ? html`<div class="verso-stat-number">${g.heading.text}</div>` : ''}
                <div class="verso-stat-label">${renderIndexed(g.body, ctx)}</div>
              </div>
            `,
          )}
        </div>
      </div>
    `
  },
})

export const bigNumber = defineLayout({
  name: 'big-number',
  render: (slide, ctx) => {
    const { h, v } = resolveAlign(slide.align, { horizontal: 'center', vertical: 'middle' })
    const headingIdx = ctx.blocks.findIndex((b): b is HeadingBlock => b.type === 'heading')
    const heading = headingIdx >= 0 ? (ctx.blocks[headingIdx] as HeadingBlock) : undefined
    const rest = ctx.blocks
      .map((block, idx) => ({ block, idx }))
      .filter((entry) => entry.idx !== headingIdx)
    return html`
      <div class="layout-big-number" data-h="${h}" data-v="${v}">
        ${headerBlock(slide)}
        ${titleBlock(slide)}
        ${heading ? html`<div class="verso-big-number">${heading.text}</div>` : ''}
        <div class="verso-big-number-body">${renderIndexed(rest, ctx)}</div>
      </div>
    `
  },
})

export const quote = defineLayout({
  name: 'quote',
  render: (slide, ctx) => {
    const { h, v } = resolveAlign(slide.align, { horizontal: 'center', vertical: 'middle' })
    const quoteIdx = ctx.blocks.findIndex((b): b is QuoteBlock => b.type === 'quote')
    const q = quoteIdx >= 0 ? (ctx.blocks[quoteIdx] as QuoteBlock) : undefined
    const rest = ctx.blocks
      .map((block, idx) => ({ block, idx }))
      .filter((entry) => entry.idx !== quoteIdx)
    return html`
      <div class="layout-quote" data-h="${h}" data-v="${v}">
        ${headerBlock(slide)}
        ${titleBlock(slide)}
        ${
          q
            ? html`
              <blockquote class="verso-pullquote">
                <p>${q.text}</p>
                ${q.attribution ? html`<cite>${q.attribution}</cite>` : ''}
              </blockquote>
            `
            : ''
        }
        ${renderIndexed(rest, ctx)}
      </div>
    `
  },
})

export const timeline = defineLayout({
  name: 'timeline',
  render: (slide, ctx) => {
    const { h, v } = resolveAlign(slide.align, { horizontal: 'left', vertical: 'top' })
    const groups = groupByHeading(ctx.blocks)
    return html`
      <div class="layout-timeline" data-h="${h}" data-v="${v}">
        ${headerBlock(slide)}
        ${titleBlock(slide)}
        <ol class="verso-timeline" data-count="${groups.length}">
          ${groups.map(
            (g) => html`
              <li class="verso-timeline-step">
                <div class="verso-timeline-dot"></div>
                ${g.heading ? html`<div class="verso-timeline-label">${g.heading.text}</div>` : ''}
                <div class="verso-timeline-body">${renderIndexed(g.body, ctx)}</div>
              </li>
            `,
          )}
        </ol>
      </div>
    `
  },
})

export const closing = defineLayout({
  name: 'closing',
  render: (slide, ctx) => {
    const { h, v } = resolveAlign(slide.align, { horizontal: 'center', vertical: 'middle' })
    return html`
      <div class="layout-closing" data-h="${h}" data-v="${v}">
        ${slide.header ? html`<div class="verso-closing-kicker">${slide.header}</div>` : ''}
        ${slide.title ? html`<h1 class="verso-closing-title">${slide.title}</h1>` : ''}
        <div class="verso-closing-body">${renderBlocks(ctx.blocks, ctx)}</div>
      </div>
    `
  },
})

export const author = defineLayout({
  name: 'author',
  render: (slide, ctx) => {
    const { h, v } = resolveAlign(slide.align, { horizontal: 'left', vertical: 'middle' })
    const { image, rest } = splitImageAndRest(ctx.blocks)
    return html`
      <div class="layout-author" data-h="${h}" data-v="${v}">
        <div class="verso-cols verso-author-cols">
          <div class="verso-author-portrait">
            ${
              image
                ? html`<img class="verso-author-img" src="${image.src}" alt="${image.alt ?? ''}" />`
                : html`<div class="verso-author-placeholder"></div>`
            }
          </div>
          <div class="verso-author-info">
            ${slide.header ? html`<div class="verso-author-role">${slide.header}</div>` : ''}
            ${slide.title ? html`<h1 class="verso-author-name">${slide.title}</h1>` : ''}
            <div class="verso-side-content">${renderIndexed(rest, ctx)}</div>
          </div>
        </div>
      </div>
    `
  },
})

export const builtInLayouts = [
  content,
  twoCol,
  threeCol,
  imageLeft,
  imageRight,
  hero,
  fullImage,
  cover,
  section,
  agenda,
  compare,
  stats,
  bigNumber,
  quote,
  timeline,
  closing,
  author,
]
