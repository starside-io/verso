import {
  type LayoutContext,
  type RenderResult,
  defineLayout,
  html,
} from '@starside-io/verso-runtime'
import {
  type Align,
  type BulletsBlock,
  type ContentBlock,
  type HeadingBlock,
  type HorizontalAlign,
  type ImageBlock,
  type QuoteBlock,
  type Slide,
  type VerticalAlign,
  resolveZoneAlign,
} from '@starside-io/verso-schema'

interface AlignDefaults {
  horizontal: HorizontalAlign
  vertical: VerticalAlign
}

// Flat resolver used for the root layout container. When the slide opts into
// per-zone alignment (align.title / align.content set), the renderer instead
// wraps header+title in `.verso-title-zone` and the blocks in
// `.verso-content-zone` so each can be aligned independently. See
// `resolveZoneAlign` and the `has-zones` CSS in styles.css.
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

// Per-zone wrappers. Only emitted when the slide opts into per-zone alignment
// (align.title or align.content set). Empty wrappers degrade gracefully if
// the slide has neither header nor title (we still emit the zone so the
// content-zone keeps a known sibling for the per-zone CSS rules).
const titleZone = (
  slide: Slide,
  h: HorizontalAlign,
  v: VerticalAlign,
  titleClass = 'verso-title',
) =>
  html`
    <div class="verso-title-zone" data-h-title="${h}" data-v-title="${v}">
      ${headerBlock(slide)}
      ${slide.title ? html`<h1 class="${titleClass}">${slide.title}</h1>` : ''}
    </div>
  `

const contentZone = (inner: unknown, h: HorizontalAlign, v: VerticalAlign) =>
  html`
    <div class="verso-content-zone" data-h-content="${h}" data-v-content="${v}">
      ${inner}
    </div>
  `

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
    const z = resolveZoneAlign(slide.align, { horizontal: 'left', vertical: 'top' })
    if (z.perZone) {
      return html`
        <div class="layout-content has-zones" data-h="${z.content.horizontal}" data-v="${z.content.vertical}">
          ${titleZone(slide, z.title.horizontal, z.title.vertical)}
          ${contentZone(
            html`<div class="verso-content">${renderBlocks(ctx.blocks, ctx)}</div>`,
            z.content.horizontal,
            z.content.vertical,
          )}
        </div>
      `
    }
    return html`
      <div class="layout-content" data-h="${z.content.horizontal}" data-v="${z.content.vertical}">
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
    const z = resolveZoneAlign(slide.align, { horizontal: 'left', vertical: 'top' })
    const half = Math.ceil(ctx.blocks.length / 2)
    const left = sliceIndexed(ctx.blocks, 0, half)
    const right = sliceIndexed(ctx.blocks, half, ctx.blocks.length)
    const cols = html`
      <div class="verso-cols">
        <div class="verso-col"><div class="verso-side-content">${renderIndexed(left, ctx)}</div></div>
        <div class="verso-col"><div class="verso-side-content">${renderIndexed(right, ctx)}</div></div>
      </div>
    `
    if (z.perZone) {
      return html`
        <div class="layout-two-col has-zones" data-h="${z.content.horizontal}" data-v="${z.content.vertical}">
          ${titleZone(slide, z.title.horizontal, z.title.vertical)}
          ${contentZone(cols, z.content.horizontal, z.content.vertical)}
        </div>
      `
    }
    return html`
      <div class="layout-two-col" data-h="${z.content.horizontal}" data-v="${z.content.vertical}">
        ${headerBlock(slide)}
        ${titleBlock(slide)}
        ${cols}
      </div>
    `
  },
})

export const imageLeft = defineLayout({
  name: 'image-left',
  render: (slide, ctx) => {
    const z = resolveZoneAlign(slide.align, { horizontal: 'left', vertical: 'middle' })
    const { image, imageIdx, rest } = splitImageAndRest(ctx.blocks)
    const cols = html`
      <div class="verso-cols">
        <div class="verso-image-side"><div class="verso-side-content">${image ? ctx.block(image, [imageIdx]) : ''}</div></div>
        <div class="verso-text-side"><div class="verso-side-content">${renderIndexed(rest, ctx)}</div></div>
      </div>
    `
    if (z.perZone) {
      return html`
        <div class="layout-image-left has-zones" data-h="${z.content.horizontal}" data-v="${z.content.vertical}">
          ${titleZone(slide, z.title.horizontal, z.title.vertical)}
          ${contentZone(cols, z.content.horizontal, z.content.vertical)}
        </div>
      `
    }
    return html`
      <div class="layout-image-left" data-h="${z.content.horizontal}" data-v="${z.content.vertical}">
        ${headerBlock(slide)}
        ${titleBlock(slide)}
        ${cols}
      </div>
    `
  },
})

export const imageRight = defineLayout({
  name: 'image-right',
  render: (slide, ctx) => {
    const z = resolveZoneAlign(slide.align, { horizontal: 'left', vertical: 'middle' })
    const { image, imageIdx, rest } = splitImageAndRest(ctx.blocks)
    const cols = html`
      <div class="verso-cols">
        <div class="verso-text-side"><div class="verso-side-content">${renderIndexed(rest, ctx)}</div></div>
        <div class="verso-image-side"><div class="verso-side-content">${image ? ctx.block(image, [imageIdx]) : ''}</div></div>
      </div>
    `
    if (z.perZone) {
      return html`
        <div class="layout-image-right has-zones" data-h="${z.content.horizontal}" data-v="${z.content.vertical}">
          ${titleZone(slide, z.title.horizontal, z.title.vertical)}
          ${contentZone(cols, z.content.horizontal, z.content.vertical)}
        </div>
      `
    }
    return html`
      <div class="layout-image-right" data-h="${z.content.horizontal}" data-v="${z.content.vertical}">
        ${headerBlock(slide)}
        ${titleBlock(slide)}
        ${cols}
      </div>
    `
  },
})

export const hero = defineLayout({
  name: 'hero',
  render: (slide, ctx) => {
    const z = resolveZoneAlign(slide.align, { horizontal: 'center', vertical: 'middle' })
    if (z.perZone) {
      return html`
        <div class="layout-hero has-zones" data-h="${z.content.horizontal}" data-v="${z.content.vertical}">
          ${titleZone(slide, z.title.horizontal, z.title.vertical, 'verso-hero-title')}
          ${contentZone(
            html`<div class="verso-hero-body">${renderBlocks(ctx.blocks, ctx)}</div>`,
            z.content.horizontal,
            z.content.vertical,
          )}
        </div>
      `
    }
    return html`
      <div class="layout-hero" data-h="${z.content.horizontal}" data-v="${z.content.vertical}">
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
    const z = resolveZoneAlign(slide.align, { horizontal: 'left', vertical: 'top' })

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
      // Items can be plain strings OR { text, icon? }; agenda only needs
      // the text part. Per-item icons aren't rendered in the agenda layout
      // (yet); they're ignored for now.
      items = bullets.items.map((t) => ({
        text: typeof t === 'string' ? t : t.text,
        isSection: false,
      }))
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

    const list = html`
      <ol class="verso-agenda">
        ${items.map(
          (it) =>
            html`<li class="verso-agenda-item${it.isSection ? ' is-section' : ''}">${it.text}</li>`,
        )}
      </ol>
    `

    if (z.perZone) {
      return html`
        <div class="layout-agenda has-zones" data-h="${z.content.horizontal}" data-v="${z.content.vertical}" data-density="${density}">
          ${titleZone(slide, z.title.horizontal, z.title.vertical)}
          ${contentZone(list, z.content.horizontal, z.content.vertical)}
        </div>
      `
    }

    return html`
      <div class="layout-agenda" data-h="${z.content.horizontal}" data-v="${z.content.vertical}" data-density="${density}">
        ${headerBlock(slide)}
        ${titleBlock(slide)}
        ${list}
      </div>
    `
  },
})

export const threeCol = defineLayout({
  name: 'three-col',
  render: (slide, ctx) => {
    const z = resolveZoneAlign(slide.align, { horizontal: 'left', vertical: 'top' })
    const cols = splitIntoColumns(ctx.blocks, 3)
    const grid = html`
      <div class="verso-cols verso-cols-3">
        ${cols.map(
          (col) => html`
            <div class="verso-col">
              <div class="verso-side-content">${renderIndexed(col, ctx)}</div>
            </div>
          `,
        )}
      </div>
    `
    if (z.perZone) {
      return html`
        <div class="layout-three-col has-zones" data-h="${z.content.horizontal}" data-v="${z.content.vertical}">
          ${titleZone(slide, z.title.horizontal, z.title.vertical)}
          ${contentZone(grid, z.content.horizontal, z.content.vertical)}
        </div>
      `
    }
    return html`
      <div class="layout-three-col" data-h="${z.content.horizontal}" data-v="${z.content.vertical}">
        ${headerBlock(slide)}
        ${titleBlock(slide)}
        ${grid}
      </div>
    `
  },
})

export const compare = defineLayout({
  name: 'compare',
  render: (slide, ctx) => {
    const z = resolveZoneAlign(slide.align, { horizontal: 'left', vertical: 'top' })
    const groups = groupByHeading(ctx.blocks)
    const left = groups[0]
    const right = groups[1]
    const renderSide = (g: BlockGroup | undefined, sideClass: string) => html`
      <div class="verso-compare-side ${sideClass}">
        ${g?.heading ? html`<div class="verso-compare-header">${g.heading.text}</div>` : ''}
        <div class="verso-side-content">${g ? renderIndexed(g.body, ctx) : ''}</div>
      </div>
    `
    const grid = html`
      <div class="verso-cols verso-compare-cols">
        ${renderSide(left, 'verso-compare-left')}
        ${renderSide(right, 'verso-compare-right')}
      </div>
    `
    if (z.perZone) {
      return html`
        <div class="layout-compare has-zones" data-h="${z.content.horizontal}" data-v="${z.content.vertical}">
          ${titleZone(slide, z.title.horizontal, z.title.vertical)}
          ${contentZone(grid, z.content.horizontal, z.content.vertical)}
        </div>
      `
    }
    return html`
      <div class="layout-compare" data-h="${z.content.horizontal}" data-v="${z.content.vertical}">
        ${headerBlock(slide)}
        ${titleBlock(slide)}
        ${grid}
      </div>
    `
  },
})

export const stats = defineLayout({
  name: 'stats',
  render: (slide, ctx) => {
    const z = resolveZoneAlign(slide.align, { horizontal: 'center', vertical: 'middle' })
    const hasContainers = ctx.blocks.some((b) => b.type === 'card' || b.type === 'panel')
    const cells: BlockGroup[] = hasContainers
      ? ctx.blocks.map((b, i) => ({ body: [{ block: b, idx: i }] }))
      : groupByHeading(ctx.blocks)
    const grid = html`
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
    `
    if (z.perZone) {
      return html`
        <div class="layout-stats has-zones" data-h="${z.content.horizontal}" data-v="${z.content.vertical}">
          ${titleZone(slide, z.title.horizontal, z.title.vertical)}
          ${contentZone(grid, z.content.horizontal, z.content.vertical)}
        </div>
      `
    }
    return html`
      <div class="layout-stats" data-h="${z.content.horizontal}" data-v="${z.content.vertical}">
        ${headerBlock(slide)}
        ${titleBlock(slide)}
        ${grid}
      </div>
    `
  },
})

export const bigNumber = defineLayout({
  name: 'big-number',
  render: (slide, ctx) => {
    const z = resolveZoneAlign(slide.align, { horizontal: 'center', vertical: 'middle' })
    const headingIdx = ctx.blocks.findIndex((b): b is HeadingBlock => b.type === 'heading')
    const heading = headingIdx >= 0 ? (ctx.blocks[headingIdx] as HeadingBlock) : undefined
    const rest = ctx.blocks
      .map((block, idx) => ({ block, idx }))
      .filter((entry) => entry.idx !== headingIdx)
    const body = html`
      ${heading ? html`<div class="verso-big-number">${heading.text}</div>` : ''}
      <div class="verso-big-number-body">${renderIndexed(rest, ctx)}</div>
    `
    if (z.perZone) {
      return html`
        <div class="layout-big-number has-zones" data-h="${z.content.horizontal}" data-v="${z.content.vertical}">
          ${titleZone(slide, z.title.horizontal, z.title.vertical)}
          ${contentZone(body, z.content.horizontal, z.content.vertical)}
        </div>
      `
    }
    return html`
      <div class="layout-big-number" data-h="${z.content.horizontal}" data-v="${z.content.vertical}">
        ${headerBlock(slide)}
        ${titleBlock(slide)}
        ${body}
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
    const z = resolveZoneAlign(slide.align, { horizontal: 'left', vertical: 'top' })
    const groups = groupByHeading(ctx.blocks)
    const list = html`
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
    `
    if (z.perZone) {
      return html`
        <div class="layout-timeline has-zones" data-h="${z.content.horizontal}" data-v="${z.content.vertical}">
          ${titleZone(slide, z.title.horizontal, z.title.vertical)}
          ${contentZone(list, z.content.horizontal, z.content.vertical)}
        </div>
      `
    }
    return html`
      <div class="layout-timeline" data-h="${z.content.horizontal}" data-v="${z.content.vertical}">
        ${headerBlock(slide)}
        ${titleBlock(slide)}
        ${list}
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
    const z = resolveZoneAlign(slide.align, { horizontal: 'left', vertical: 'middle' })
    const { image, rest } = splitImageAndRest(ctx.blocks)
    // Author is the one layout where title and content live in the same right
    // column inside a 2-col grid. Per-zone wrappers apply inside that column
    // when opted in; otherwise we keep the historical sibling order so the
    // existing CSS rules around `.verso-author-info` keep working.
    const portrait = html`
      <div class="verso-author-portrait">
        ${
          image
            ? html`<img class="verso-author-img" src="${image.src}" alt="${image.alt ?? ''}" />`
            : html`<div class="verso-author-placeholder"></div>`
        }
      </div>
    `
    const role = slide.header ? html`<div class="verso-author-role">${slide.header}</div>` : ''
    const name = slide.title ? html`<h1 class="verso-author-name">${slide.title}</h1>` : ''
    const body = html`<div class="verso-side-content">${renderIndexed(rest, ctx)}</div>`
    if (z.perZone) {
      return html`
        <div class="layout-author has-zones" data-h="${z.content.horizontal}" data-v="${z.content.vertical}">
          <div class="verso-cols verso-author-cols">
            ${portrait}
            <div class="verso-author-info">
              <div class="verso-title-zone" data-h-title="${z.title.horizontal}" data-v-title="${z.title.vertical}">
                ${role}
                ${name}
              </div>
              <div class="verso-content-zone" data-h-content="${z.content.horizontal}" data-v-content="${z.content.vertical}">
                ${body}
              </div>
            </div>
          </div>
        </div>
      `
    }
    return html`
      <div class="layout-author" data-h="${z.content.horizontal}" data-v="${z.content.vertical}">
        <div class="verso-cols verso-author-cols">
          ${portrait}
          <div class="verso-author-info">
            ${role}
            ${name}
            ${body}
          </div>
        </div>
      </div>
    `
  },
})

// =========================================================================
// Additional layouts (asymmetric splits, grids, image-driven, special, flow)
// =========================================================================

// Helper: wrap a layout body with optional per-zone title/content wrappers.
// Layouts with both a title strip and a content area follow the same pattern;
// this collapses the boilerplate.
const withZones = (
  layoutClass: string,
  slide: Slide,
  z: ReturnType<typeof resolveZoneAlign>,
  body: unknown,
): RenderResult => {
  if (z.perZone) {
    return html`
      <div class="${layoutClass} has-zones" data-h="${z.content.horizontal}" data-v="${z.content.vertical}">
        ${titleZone(slide, z.title.horizontal, z.title.vertical)}
        ${contentZone(body, z.content.horizontal, z.content.vertical)}
      </div>
    `
  }
  return html`
    <div class="${layoutClass}" data-h="${z.content.horizontal}" data-v="${z.content.vertical}">
      ${headerBlock(slide)}
      ${titleBlock(slide)}
      ${body}
    </div>
  `
}

// --- Asymmetric splits -----------------------------------------------------

// Build a generic asymmetric split. firstFraction is "1fr" / "2fr" template;
// blocks are sliced in half by midpoint then dropped into the two columns.
const renderAsymmetric = (slide: Slide, ctx: LayoutContext, layoutClass: string): RenderResult => {
  const z = resolveZoneAlign(slide.align, { horizontal: 'left', vertical: 'top' })
  const half = Math.ceil(ctx.blocks.length / 2)
  const left = sliceIndexed(ctx.blocks, 0, half)
  const right = sliceIndexed(ctx.blocks, half, ctx.blocks.length)
  const cols = html`
    <div class="verso-cols">
      <div class="verso-col"><div class="verso-side-content">${renderIndexed(left, ctx)}</div></div>
      <div class="verso-col"><div class="verso-side-content">${renderIndexed(right, ctx)}</div></div>
    </div>
  `
  return withZones(layoutClass, slide, z, cols)
}

export const oneThirdLeft = defineLayout({
  name: 'one-third-left',
  render: (slide, ctx) => renderAsymmetric(slide, ctx, 'layout-one-third-left'),
})

export const oneThirdRight = defineLayout({
  name: 'one-third-right',
  render: (slide, ctx) => renderAsymmetric(slide, ctx, 'layout-one-third-right'),
})

export const twoThirdsLeft = defineLayout({
  name: 'two-thirds-left',
  render: (slide, ctx) => renderAsymmetric(slide, ctx, 'layout-two-thirds-left'),
})

export const twoThirdsRight = defineLayout({
  name: 'two-thirds-right',
  render: (slide, ctx) => renderAsymmetric(slide, ctx, 'layout-two-thirds-right'),
})

// --- Grids -----------------------------------------------------------------

export const quad = defineLayout({
  name: 'quad',
  render: (slide, ctx) => {
    const z = resolveZoneAlign(slide.align, { horizontal: 'left', vertical: 'top' })
    // 2x2 grid. Blocks 0+1 are top row, 2+3 are bottom row.
    const cells = ctx.blocks.slice(0, 4).map(
      (b, i) => html`
      <div class="verso-quad-cell"><div class="verso-side-content">${ctx.block(b, [i])}</div></div>
    `,
    )
    return withZones('layout-quad', slide, z, html`<div class="verso-quad">${cells}</div>`)
  },
})

export const iconGrid = defineLayout({
  name: 'icon-grid',
  render: (slide, ctx) => {
    const z = resolveZoneAlign(slide.align, { horizontal: 'left', vertical: 'top' })
    // Renders any block. Cells size to content; CSS Grid auto-flow handles 2x2,
    // 3x2, or 4x2 depending on count. Best with card or icon blocks.
    const count = ctx.blocks.length
    const cells = ctx.blocks.map(
      (b, i) => html`
      <div class="verso-icon-grid-cell"><div class="verso-side-content">${ctx.block(b, [i])}</div></div>
    `,
    )
    return withZones(
      'layout-icon-grid',
      slide,
      z,
      html`<div class="verso-icon-grid" data-count="${String(count)}">${cells}</div>`,
    )
  },
})

export const kpiBand = defineLayout({
  name: 'kpi-band',
  render: (slide, ctx) => {
    const z = resolveZoneAlign(slide.align, { horizontal: 'left', vertical: 'top' })
    // The first run of card blocks forms the KPI row at the top. Everything
    // after the first non-card block is rendered as supporting content below.
    const kpiEnd = ctx.blocks.findIndex((b) => b.type !== 'card')
    const splitIdx = kpiEnd === -1 ? ctx.blocks.length : kpiEnd
    const kpis = sliceIndexed(ctx.blocks, 0, splitIdx)
    const body = sliceIndexed(ctx.blocks, splitIdx, ctx.blocks.length)
    const kpiRow = html`
      <div class="verso-kpi-band-row" data-count="${String(kpis.length)}">${renderIndexed(kpis, ctx)}</div>
    `
    const bodyBlock =
      body.length > 0
        ? html`<div class="verso-kpi-band-body">${renderIndexed(body, ctx)}</div>`
        : ''
    return withZones('layout-kpi-band', slide, z, html`${kpiRow}${bodyBlock}`)
  },
})

export const swot = defineLayout({
  name: 'swot',
  render: (slide, ctx) => {
    const z = resolveZoneAlign(slide.align, { horizontal: 'left', vertical: 'top' })
    // 2x2 grid with fixed quadrant labels. Each of the first 4 blocks goes
    // into one quadrant. Labels rendered at the top of each cell.
    const LABELS = ['Strengths', 'Weaknesses', 'Opportunities', 'Threats']
    const cells = ctx.blocks.slice(0, 4).map(
      (b, i) => html`
      <div class="verso-swot-cell" data-quadrant="${LABELS[i]?.toLowerCase() ?? ''}">
        <div class="verso-swot-label">${LABELS[i] ?? ''}</div>
        <div class="verso-side-content">${ctx.block(b, [i])}</div>
      </div>
    `,
    )
    return withZones('layout-swot', slide, z, html`<div class="verso-swot">${cells}</div>`)
  },
})

// --- Image-driven ----------------------------------------------------------

export const pictureFill = defineLayout({
  name: 'picture-fill',
  render: (slide, ctx) => {
    const z = resolveZoneAlign(slide.align, { horizontal: 'left', vertical: 'bottom' })
    const { image, rest } = splitImageAndRest(ctx.blocks)
    // Image fills the slide as background. Title + minimal text overlay sit at
    // the bottom (or wherever align.content.vertical puts them) with a gradient
    // for readability.
    return html`
      <div class="layout-picture-fill" data-h="${z.content.horizontal}" data-v="${z.content.vertical}">
        ${image ? html`<img class="verso-picture-fill-img" src="${image.src}" alt="${image.alt ?? ''}" />` : ''}
        <div class="verso-picture-fill-overlay">
          ${headerBlock(slide)}
          ${titleBlock(slide, 'verso-picture-fill-title')}
          <div class="verso-picture-fill-body">${renderIndexed(rest, ctx)}</div>
        </div>
      </div>
    `
  },
})

export const pictureWithCaption = defineLayout({
  name: 'picture-with-caption',
  render: (slide, ctx) => {
    const z = resolveZoneAlign(slide.align, { horizontal: 'left', vertical: 'middle' })
    const { image, imageIdx, rest } = splitImageAndRest(ctx.blocks)
    // Image on the left at 60% width, large caption (first heading + first
    // text block) on the right at 40%. Different from image-left in that the
    // caption side is type-heavy, not block-stack.
    const cols = html`
      <div class="verso-cols verso-picture-caption-cols">
        <div class="verso-picture-caption-img">
          ${image ? ctx.block(image, [imageIdx]) : ''}
        </div>
        <div class="verso-picture-caption-text">
          <div class="verso-side-content">${renderIndexed(rest, ctx)}</div>
        </div>
      </div>
    `
    return withZones('layout-picture-with-caption', slide, z, cols)
  },
})

export const bento = defineLayout({
  name: 'bento',
  render: (slide, ctx) => {
    const z = resolveZoneAlign(slide.align, { horizontal: 'left', vertical: 'top' })
    // First block is the "hero" cell (takes 2 columns on top row); next two
    // blocks are stacked on the right or sit on the bottom row depending on
    // how many blocks total. With 3+ blocks, renders as a 2-row asymmetric grid.
    const cells = ctx.blocks.map(
      (b, i) => html`
      <div class="verso-bento-cell" data-cell="${String(i)}">
        <div class="verso-side-content">${ctx.block(b, [i])}</div>
      </div>
    `,
    )
    return withZones(
      'layout-bento',
      slide,
      z,
      html`<div class="verso-bento" data-count="${String(ctx.blocks.length)}">${cells}</div>`,
    )
  },
})

// --- Title + special -------------------------------------------------------

export const titleBand = defineLayout({
  name: 'title-band',
  render: (slide, ctx) => {
    const z = resolveZoneAlign(slide.align, { horizontal: 'left', vertical: 'top' })
    // Full-width colored title bar at the top, body below as one column. The
    // title-band is styled differently from a normal title (filled background,
    // larger type) so it reads as a section/topic heading on a content slide.
    const titleStrip = html`
      <div class="verso-title-band">
        ${headerBlock(slide)}
        ${slide.title ? html`<h1 class="verso-title-band-title">${slide.title}</h1>` : ''}
      </div>
    `
    const body = html`<div class="verso-content">${renderBlocks(ctx.blocks, ctx)}</div>`
    if (z.perZone) {
      return html`
        <div class="layout-title-band has-zones" data-h="${z.content.horizontal}" data-v="${z.content.vertical}">
          <div class="verso-title-zone" data-h-title="${z.title.horizontal}" data-v-title="${z.title.vertical}">
            ${titleStrip}
          </div>
          ${contentZone(body, z.content.horizontal, z.content.vertical)}
        </div>
      `
    }
    return html`
      <div class="layout-title-band" data-h="${z.content.horizontal}" data-v="${z.content.vertical}">
        ${titleStrip}
        ${body}
      </div>
    `
  },
})

export const titleOnly = defineLayout({
  name: 'title-only',
  render: (slide, _ctx) => {
    const z = resolveZoneAlign(slide.align, { horizontal: 'center', vertical: 'middle' })
    // Centered title slide. No content area. PowerPoint's "Title Only" master.
    return html`
      <div class="layout-title-only" data-h="${z.content.horizontal}" data-v="${z.content.vertical}">
        ${headerBlock(slide)}
        ${slide.title ? html`<h1 class="verso-title-only-title">${slide.title}</h1>` : ''}
      </div>
    `
  },
})

export const calloutBanner = defineLayout({
  name: 'callout-banner',
  render: (slide, ctx) => {
    const z = resolveZoneAlign(slide.align, { horizontal: 'center', vertical: 'middle' })
    // Single full-width attention banner. The slide title becomes the banner
    // headline; the first text block becomes the supporting sentence. Other
    // blocks (if any) sit below the banner.
    const first = ctx.blocks[0]
    const rest = sliceIndexed(ctx.blocks, 1, ctx.blocks.length)
    return html`
      <div class="layout-callout-banner" data-h="${z.content.horizontal}" data-v="${z.content.vertical}">
        <div class="verso-callout-banner">
          ${headerBlock(slide)}
          ${slide.title ? html`<h1 class="verso-callout-banner-title">${slide.title}</h1>` : ''}
          ${first ? html`<div class="verso-callout-banner-body">${ctx.block(first, [0])}</div>` : ''}
        </div>
        ${rest.length > 0 ? html`<div class="verso-callout-banner-after">${renderIndexed(rest, ctx)}</div>` : ''}
      </div>
    `
  },
})

export const chapter = defineLayout({
  name: 'chapter',
  render: (slide, ctx) => {
    const z = resolveZoneAlign(slide.align, { horizontal: 'left', vertical: 'middle' })
    // Book-style chapter divider, heavier than section. Big chapter number /
    // kicker, oversized title, optional intro paragraph.
    const body = html`<div class="verso-chapter-body">${renderBlocks(ctx.blocks, ctx)}</div>`
    return html`
      <div class="layout-chapter" data-h="${z.content.horizontal}" data-v="${z.content.vertical}">
        ${slide.header ? html`<div class="verso-chapter-kicker">${slide.header}</div>` : ''}
        ${slide.title ? html`<h1 class="verso-chapter-title">${slide.title}</h1>` : ''}
        ${body}
      </div>
    `
  },
})

export const qAndA = defineLayout({
  name: 'q-and-a',
  render: (slide, ctx) => {
    const z = resolveZoneAlign(slide.align, { horizontal: 'left', vertical: 'top' })
    // The first two top-level blocks become Q and A respectively. The first is
    // the question (rendered with a Q marker), the second is the answer (with
    // an A marker). Other blocks render below as supporting content.
    const q = ctx.blocks[0]
    const a = ctx.blocks[1]
    const rest = sliceIndexed(ctx.blocks, 2, ctx.blocks.length)
    const body = html`
      <div class="verso-qa">
        ${q ? html`<div class="verso-qa-row verso-qa-q"><span class="verso-qa-marker">Q</span><div class="verso-qa-body">${ctx.block(q, [0])}</div></div>` : ''}
        ${a ? html`<div class="verso-qa-row verso-qa-a"><span class="verso-qa-marker">A</span><div class="verso-qa-body">${ctx.block(a, [1])}</div></div>` : ''}
        ${rest.length > 0 ? html`<div class="verso-qa-after">${renderIndexed(rest, ctx)}</div>` : ''}
      </div>
    `
    return withZones('layout-q-and-a', slide, z, body)
  },
})

// --- Flow + structured -----------------------------------------------------

export const processFlow = defineLayout({
  name: 'process',
  render: (slide, ctx) => {
    const z = resolveZoneAlign(slide.align, { horizontal: 'left', vertical: 'middle' })
    // Horizontal chevrons. Each block becomes one step. Steps are numbered
    // by CSS counter; cards / text blocks render inside the step body.
    const steps = ctx.blocks.map(
      (b, i) => html`
      <div class="verso-process-step" data-step="${String(i + 1)}">
        <div class="verso-process-step-num">${String(i + 1)}</div>
        <div class="verso-process-step-body">${ctx.block(b, [i])}</div>
      </div>
    `,
    )
    return withZones('layout-process', slide, z, html`<div class="verso-process">${steps}</div>`)
  },
})

export const splitVertical = defineLayout({
  name: 'split-vertical',
  render: (slide, ctx) => {
    const z = resolveZoneAlign(slide.align, { horizontal: 'left', vertical: 'top' })
    // Top half + bottom half, full-width 50/50. First half of blocks go on top,
    // second half on bottom. Useful for showing two parallel concepts stacked.
    const half = Math.ceil(ctx.blocks.length / 2)
    const top = sliceIndexed(ctx.blocks, 0, half)
    const bottom = sliceIndexed(ctx.blocks, half, ctx.blocks.length)
    const stack = html`
      <div class="verso-rows">
        <div class="verso-row verso-row-top"><div class="verso-side-content">${renderIndexed(top, ctx)}</div></div>
        <div class="verso-row verso-row-bottom"><div class="verso-side-content">${renderIndexed(bottom, ctx)}</div></div>
      </div>
    `
    return withZones('layout-split-vertical', slide, z, stack)
  },
})

export const roadmap = defineLayout({
  name: 'roadmap',
  render: (slide, ctx) => {
    const z = resolveZoneAlign(slide.align, { horizontal: 'left', vertical: 'top' })
    // Quarterly milestone columns. Each top-level block becomes a column
    // (Q1, Q2, Q3, Q4 ... or arbitrary count). Cards inside the column read
    // as milestones for that quarter. Auto-labels each column Q1..Qn from
    // index unless the block is a heading (then heading text wins).
    const columns = ctx.blocks.map((b, i) => {
      const label = b.type === 'heading' ? (b as HeadingBlock).text : `Q${i + 1}`
      return html`
        <div class="verso-roadmap-col" data-quarter="${String(i + 1)}">
          <div class="verso-roadmap-label">${label}</div>
          <div class="verso-roadmap-body verso-side-content">${ctx.block(b, [i])}</div>
        </div>
      `
    })
    return withZones(
      'layout-roadmap',
      slide,
      z,
      html`<div class="verso-roadmap" data-count="${String(ctx.blocks.length)}">${columns}</div>`,
    )
  },
})

// =========================================================================

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
  // New batch (19): asymmetric splits, grids, image-driven, special, flow.
  oneThirdLeft,
  oneThirdRight,
  twoThirdsLeft,
  twoThirdsRight,
  quad,
  iconGrid,
  kpiBand,
  swot,
  pictureFill,
  pictureWithCaption,
  bento,
  titleBand,
  titleOnly,
  calloutBanner,
  chapter,
  qAndA,
  processFlow,
  splitVertical,
  roadmap,
]
