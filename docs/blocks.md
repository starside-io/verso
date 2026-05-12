# Blocks

Every entry in a slide's `content` array is a **block**. Each block has a `type` field and type-specific props. The runtime looks up a component by `type` in its registry and calls its `render()` function.

This page documents every built-in block. To register your own, see [Custom blocks](#custom-blocks) at the bottom.

## Common fields

Every block shares these optional fields:

| Field | Type | Notes |
|-------|------|-------|
| `id` | `string` | Stable id. Optional. The editor doesn't require it. |
| `path_include` | `string[]` | Only render in these paths. |
| `path_exclude` | `string[]` | Skip in these paths. |
| `style_overrides` | object | Block-level color overrides. See [themes.md](./themes.md). |
| `align` | `{ horizontal, vertical }` | Per-block alignment override. Most layouts ignore it; some (cards) use it. |

## Text blocks

### `heading`

```json
{ "type": "heading", "level": 2, "text": "Section title" }
```

| Prop | Default | Notes |
|------|---------|-------|
| `level` | `2` | `1`, `2`, or `3`. Renders as `<h1>`/`<h2>`/`<h3>`. |
| `text` | required | The heading text. |

### `text`

```json
{ "type": "text", "text": "Plain paragraph." }
```

### `bullets`

```json
{ "type": "bullets", "items": ["First", "Second", "Third"] }
```

### `quote`

```json
{
  "type": "quote",
  "text": "A short, punchy quote.",
  "attribution": "Author Name"
}
```

`attribution` is optional.

## Media blocks

### `image`

```json
{
  "type": "image",
  "src": "assets/hero.png",
  "alt": "Hero illustration",
  "caption": "Optional caption"
}
```

| Prop | Default | Notes |
|------|---------|-------|
| `src` | required | URL or project-relative path. Editor uploads land in `assets/`. |
| `alt` | `""` | Accessibility text. The editor's lint warns when missing. |
| `caption` | undefined | Rendered as `<figcaption>` below the image. |

### `code`

```json
{
  "type": "code",
  "language": "ts",
  "source": "const verso = 'hello'"
}
```

`language` populates `data-language` on the `<pre>`; the built-in components don't ship a syntax highlighter (drop in Shiki or Prism via a `verso.config.ts` custom component if you need one).

### `embed`

Iframe (YouTube, CodeSandbox, Figma, etc) with a PDF-safe fallback. See [embed.md](./features/embed.md).

```json
{
  "type": "embed",
  "src": "https://www.youtube.com/embed/dQw4w9WgXcQ",
  "title": "Demo video",
  "aspect": "16:9",
  "fallback_text": "Open the deck online to play this video."
}
```

## Containers (recursive)

Containers wrap other blocks. Their `content` array follows the same shape as `slide.content`, so blocks can nest arbitrarily deep.

### `card`

```json
{
  "type": "card",
  "tone": "surface",
  "variant": "soft",
  "padding": "md",
  "content": [
    { "type": "heading", "level": 3, "text": "Card title" },
    { "type": "text", "text": "Card body." }
  ]
}
```

| Prop | Values | Notes |
|------|--------|-------|
| `tone` | `primary` / `secondary` / `accent` / `muted` / `surface` | Color role. Default: `surface`. |
| `variant` | `soft` / `solid` / `outline` | Default: `soft`. |
| `padding` | `none` / `sm` / `md` / `lg` | Default: `md`. |

### `panel`

Same shape as `card`, but a different visual: typically wider, can `bleed` past the slide's content area.

```json
{
  "type": "panel",
  "tone": "primary",
  "bleed": "all",
  "content": [
    { "type": "text", "text": "Panel content extends edge-to-edge." }
  ]
}
```

| Prop | Values | Notes |
|------|--------|-------|
| `tone` / `variant` | Same as `card` | |
| `bleed` | `left` / `right` / `top` / `bottom` / `all` / `none` | Which sides escape the slide padding. Default: `none`. |

## Decoration

Small visual elements. They have a `tone` for color but no `content`.

### `callout`

```json
{ "type": "callout", "tone": "info", "text": "Heads up." }
```

`tone`: `info` / `warn` / `success` / `danger`. Default: `info`.

### `badge`

```json
{ "type": "badge", "tone": "accent", "variant": "soft", "text": "New" }
```

Same `tone` + `variant` as cards. Renders inline-ish.

### `accent-bar`

Small colored bar. Often used as a visual divider above a heading.

```json
{ "type": "accent-bar", "tone": "accent", "size": "thick", "orientation": "horizontal" }
```

| Prop | Values |
|------|--------|
| `tone` | Same as cards. |
| `size` | `thin` / `thick`. |
| `orientation` | `horizontal` / `vertical`. |

### `divider`

```json
{ "type": "divider", "tone": "muted" }
```

A thin horizontal rule.

## Custom blocks

Register a component in `verso.config.ts`:

```ts
import { defineComponent, html } from '@starside-io/verso-runtime'

export default {
  components: [
    defineComponent({
      name: 'metric',
      render: (props: { label: string; value: string }) =>
        html`<div class="metric"><span class="value">${props.value}</span><span class="label">${props.label}</span></div>`,
    }),
  ],
}
```

In a slide:

```json
{ "type": "metric", "label": "Customers", "value": "12,431" }
```

The schema's `custom` type is a passthrough, so any unknown `type` is forwarded to your component as-is. If no component is registered for that type, the runtime renders an empty placeholder div.

## Variable interpolation

Any text field can reference deck-level variables as `{{key}}`:

```json
{ "type": "text", "text": "Prepared by {{author}} on {{date}}." }
```

See [variables.md](./features/variables.md) for the full list of built-in keys and how to declare custom ones.
