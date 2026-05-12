# Layouts

A **layout** receives a `slide` and a `LayoutContext` and returns the slide's inner HTML. Verso ships 17 built-ins. You can also write your own in `verso.config.ts` (or scaffolded with `verso new layout`).

## How layouts pick content

The runtime calls `layout.render(slide, ctx)` once per slide. `ctx.blocks` is a flattened array of every block from `slide.content`, already filtered by the active path. The layout decides:

- Which blocks go where (left column, hero area, footer).
- What special blocks the slide expects (e.g. `image-right` looks for the first `image` block; `agenda` falls back to bullet items).

Layouts never mutate the slide. They consume `ctx.blocks` and emit HTML.

## The 17 built-ins

Grouped by purpose. Each one expects certain block shapes; if they're missing, the layout renders with sensible defaults.

### Core

| Layout | What it expects | Notes |
|--------|-----------------|-------|
| `content` | Any blocks | The default. Stacks all blocks in order. |
| `two-col` | Any blocks | Splits content roughly in half between two columns. |
| `three-col` | Any blocks | Three columns. |
| `image-left` | One `image` block + others | Image takes the left side, rest fills the right. |
| `image-right` | One `image` block + others | Mirror of `image-left`. |
| `hero` | A `heading` + an `image` | Big heading, large image, optional supporting text. |
| `full-image` | One `image` | Image bleeds to the slide edges. Text overlays on top. |

### Openers and closers

| Layout | What it expects | Notes |
|--------|-----------------|-------|
| `cover` | Slide `title` + `header` (optional) | First slide of a deck. Centered, big type. |
| `section` | Slide `title` | Visual divider between sections. |
| `closing` | Slide `title` + optional contact text | Last slide. "Thanks / Questions?" style. |
| `author` | A `heading` + an `image` | Author bio: portrait + name + role. |

### Structured

| Layout | What it expects | Notes |
|--------|-----------------|-------|
| `agenda` | `bullets` (or `heading` blocks, or nothing) | Auto-builds from the deck outline when empty. See [path-branching.md](./path-branching.md) and the [agenda fallback rules](#agenda-auto-build). |
| `compare` | Two `card` blocks side by side | A vs B comparison. |
| `stats` | Several `card` blocks, often with big numbers | Metric tiles. |
| `big-number` | One `heading` with the number + a `text` for context | One huge number, one short label. |
| `quote` | A `quote` block | Big quote, optional attribution. |
| `timeline` | A `bullets` block | Renders as horizontal timeline. |

## Slide-level fields a layout can read

Every layout has access to:

- `slide.title` and `slide.header` (rendered by helper functions `titleBlock(slide)` and `headerBlock(slide)`)
- `slide.align` for per-slide horizontal/vertical alignment
- `slide.transition` (the runtime stamps the class; layouts don't need to do anything)
- `slide.notes`, `slide.annotation` (consumed by speaker mode, not the layout)
- `slide.omit_from_agenda` (read by the agenda layout's fallback builder, not the slide's own layout)

## Agenda auto-build

The `agenda` layout falls back through three tiers:

1. **A manual `bullets` block** on the slide. Wins if present.
2. **`heading` blocks** on the slide. Their text becomes the list.
3. **The deck outline** from `ctx.deckOutline`: section markers if any exist, otherwise every path-filtered slide title.

Slide titles in the auto fallback skip any slide with `omit_from_agenda: true` (use this for cover, the agenda slide itself, closing slides).

Item count drives density: `≤ 8` items render in one column, `9-20` in two, `> 20` in three with smaller type.

## Custom layouts

A layout is just an object with a `name` and a `render` function. Example:

```ts
import { defineLayout, html } from '@starside-io/verso-runtime'

export const splitThirds = defineLayout({
  name: 'split-thirds',
  render: (slide, ctx) => {
    const [first, ...rest] = ctx.blocks
    return html`
      <div class="layout-split-thirds">
        <div class="left">${first ? ctx.block(first) : ''}</div>
        <div class="right">${rest.map((b, i) => ctx.block(b, [i + 1]))}</div>
      </div>
    `
  },
})
```

Register it in `verso.config.ts`:

```ts
import { splitThirds } from './layouts/split-thirds'

export default {
  layouts: [splitThirds],
}
```

Then any slide can use it:

```json
{ "id": "intro", "layout": "split-thirds", "content": [ ... ] }
```

### What `ctx` gives you

```ts
interface LayoutContext {
  pathId: string                 // The active path id
  colors: ResolvedColors         // Resolved color roles for this slide
  blocks: ContentBlock[]         // Path-filtered, flattened
  deckOutline: DeckOutlineEntry[] // Whole-deck outline (section markers + slide titles)
  block: (b, path?) => HTML      // Render a single block
  component: (c, props) => HTML  // Render a non-block custom component
}
```

`ctx.block(b)` is what you call to render a child block. The runtime takes care of wrapping it in a `.verso-block` div with the right CSS variables.

## CSS conventions

Built-in layouts target classes like `.layout-content`, `.layout-two-col`, etc. Your CSS should:

- Reference CSS variables (`var(--color-primary)`, `var(--color-classic)`) rather than hex literals, so themes propagate.
- Avoid `position: absolute` for primary content; the slide section is a flex column, layouts flow within it.
- Set `flex: 1` on internal columns so they stretch to fill the slide height.

See `packages/layouts/src/styles.css` for the full set of built-in styles.
