import type {
  AccentBarBlock,
  BadgeBlock,
  BulletsBlock,
  CalloutBlock,
  CardBlock,
  CodeBlock,
  DividerBlock,
  EmbedBlock,
  HeadingBlock,
  IconBlock,
  ImageBlock,
  PanelBlock,
  QuoteBlock,
  TextBlock,
} from '@starside-io/verso-schema'
import { defineComponent } from '../define.js'
import { html, raw } from '../html.js'
import {
  applyIconAttrs,
  type IconWeightName,
  requestIconLoad,
  resolveIcon,
} from '../icons.js'

export const Heading = defineComponent<HeadingBlock>({
  name: 'heading',
  render: (props) => {
    const level = props.level ?? 2
    if (level === 1) return html`<h1 class="verso-heading">${props.text}</h1>`
    if (level === 3) return html`<h3 class="verso-heading">${props.text}</h3>`
    return html`<h2 class="verso-heading">${props.text}</h2>`
  },
})

export const Text = defineComponent<TextBlock>({
  name: 'text',
  render: (props) => html`<p class="verso-text">${props.text}</p>`,
})

// Renders one bullet item. Items can be a plain string (back-compat) or an
// object with text + optional Phosphor icon. When an icon is set we emit the
// same resolveIcon/requestIconLoad placeholder pattern the standalone Icon
// component uses, so the viewer's hydrator swaps it in lazily.
const renderBulletItem = (item: BulletsBlock['items'][number]) => {
  if (typeof item === 'string') return html`<li>${item}</li>`
  const text = item.text ?? ''
  if (!item.icon) return html`<li>${text}</li>`
  const weight = (item.iconWeight ?? 'regular') as IconWeightName
  const tone = item.iconTone ?? 'primary'
  const size = 18
  const svg = resolveIcon(item.icon, weight)
  if (svg) {
    return html`<li class="verso-bullet-with-icon"><span class="verso-icon verso-bullet-icon" data-tone="${tone}" data-icon="${item.icon}" data-weight="${weight}">${raw(applyIconAttrs(svg, size))}</span><span class="verso-bullet-text">${text}</span></li>`
  }
  requestIconLoad(item.icon, weight)
  return html`<li class="verso-bullet-with-icon"><span class="verso-icon verso-icon-pending verso-bullet-icon" data-icon="${item.icon}" data-weight="${weight}" data-size="${String(size)}" data-tone="${tone}" aria-hidden="true" style="display:inline-block;width:${String(size)}px;height:${String(size)}px"></span><span class="verso-bullet-text">${text}</span></li>`
}

export const Bullets = defineComponent<BulletsBlock>({
  name: 'bullets',
  render: (props) => {
    const items = props.items.map(renderBulletItem)
    return html`<ul class="verso-bullets">${items}</ul>`
  },
})

export const Image = defineComponent<ImageBlock>({
  name: 'image',
  render: (props) => html`
    <figure class="verso-image">
      <img src="${props.src}" alt="${props.alt ?? ''}" />
      ${props.caption ? html`<figcaption>${props.caption}</figcaption>` : ''}
    </figure>
  `,
})

export const Quote = defineComponent<QuoteBlock>({
  name: 'quote',
  render: (props) => html`
    <blockquote class="verso-quote">
      <p>${props.text}</p>
      ${props.attribution ? html`<cite>${props.attribution}</cite>` : ''}
    </blockquote>
  `,
})

export const Code = defineComponent<CodeBlock>({
  name: 'code',
  render: (props) =>
    html`<pre class="verso-code" data-language="${props.language ?? 'text'}"><code>${props.source}</code></pre>`,
})

export const Callout = defineComponent<CalloutBlock>({
  name: 'callout',
  render: (props) => {
    const tone = props.tone ?? 'info'
    return html`<div class="verso-callout" data-tone="${tone}"><p>${props.text}</p></div>`
  },
})

export const Card = defineComponent<CardBlock>({
  name: 'card',
  render: (props, ctx) => {
    const tone = props.tone ?? 'surface'
    const variant = props.variant ?? 'soft'
    const padding = props.padding ?? 'md'
    const parent = ctx.currentPath ?? []
    const inner = props.content.map((b, i) => ctx.block(b, [...parent, i]))
    return html`<div class="verso-card" data-tone="${tone}" data-variant="${variant}" data-padding="${padding}">${inner}</div>`
  },
})

export const Panel = defineComponent<PanelBlock>({
  name: 'panel',
  render: (props, ctx) => {
    const tone = props.tone ?? 'primary'
    const variant = props.variant ?? 'soft'
    const bleed = props.bleed ?? 'none'
    const parent = ctx.currentPath ?? []
    const inner = props.content.map((b, i) => ctx.block(b, [...parent, i]))
    return html`<div class="verso-panel" data-tone="${tone}" data-variant="${variant}" data-bleed="${bleed}">${inner}</div>`
  },
})

export const AccentBar = defineComponent<AccentBarBlock>({
  name: 'accent-bar',
  render: (props) => {
    const tone = props.tone ?? 'accent'
    const size = props.size ?? 'thick'
    const orientation = props.orientation ?? 'horizontal'
    return html`<div class="verso-accent-bar" data-tone="${tone}" data-size="${size}" data-orientation="${orientation}"></div>`
  },
})

export const Badge = defineComponent<BadgeBlock>({
  name: 'badge',
  render: (props) => {
    const tone = props.tone ?? 'accent'
    const variant = props.variant ?? 'soft'
    return html`<span class="verso-badge" data-tone="${tone}" data-variant="${variant}">${props.text}</span>`
  },
})

export const Divider = defineComponent<DividerBlock>({
  name: 'divider',
  render: (props) => {
    const tone = props.tone ?? 'muted'
    return html`<hr class="verso-divider" data-tone="${tone}" />`
  },
})

// Iframe embed. The wrapper has the aspect ratio so the placeholder reserves
// space before the iframe loads. PDF/print media hides the iframe and shows
// the fallback image / text (iframes don't reliably rasterize in headless
// Chromium screenshots).
export const Embed = defineComponent<EmbedBlock>({
  name: 'embed',
  render: (props) => {
    const aspect = props.aspect ?? '16:9'
    const title = props.title ?? 'Embedded content'
    const allow =
      props.allow ??
      'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share'
    const fallback = props.fallback_src
      ? html`<img class="verso-embed-fallback" src="${props.fallback_src}" alt="${title}" />`
      : html`<div class="verso-embed-fallback verso-embed-fallback-text">
          <p class="verso-embed-fallback-title">${title}</p>
          <p class="verso-embed-fallback-src">${props.fallback_text ?? props.src}</p>
        </div>`
    return html`
      <div class="verso-embed" data-aspect="${aspect}">
        <iframe
          class="verso-embed-iframe"
          src="${props.src}"
          title="${title}"
          loading="lazy"
          allowfullscreen
          allow="${allow}"
          referrerpolicy="strict-origin-when-cross-origin"
        ></iframe>
        ${fallback}
      </div>
    `
  },
})

// Phosphor icon. SVGs are looked up via the runtime's icon registry:
// `resolveIcon` returns the SVG synchronously if cached, otherwise we emit a
// sized placeholder and `requestIconLoad` kicks off an async fetch. The
// viewer's hydrator listens for `verso:icon-loaded` and swaps the placeholder
// with the real SVG (no re-render of the whole slide needed).
export const Icon = defineComponent<IconBlock>({
  name: 'icon',
  render: (props) => {
    const weight = (props.weight ?? 'regular') as IconWeightName
    const size = props.size ?? 32
    const tone = props.tone ?? 'primary'
    const svg = resolveIcon(props.name, weight)
    if (svg) {
      return html`<span class="verso-icon" data-tone="${tone}" data-icon="${props.name}" data-weight="${weight}">${raw(applyIconAttrs(svg, size, props.label))}</span>`
    }
    // Not cached. Fire-and-forget async load; the hydrator swaps in the SVG
    // when it arrives. The placeholder keeps the layout from jumping.
    requestIconLoad(props.name, weight)
    const labelAttr = props.label ? `aria-label="${props.label.replace(/"/g, '&quot;')}" role="img"` : 'aria-hidden="true"'
    return html`<span
      class="verso-icon verso-icon-pending"
      data-icon="${props.name}"
      data-weight="${weight}"
      data-size="${String(size)}"
      data-tone="${tone}"
      ${raw(labelAttr)}
      style="display:inline-block;width:${String(size)}px;height:${String(size)}px"
    ></span>`
  },
})

export const builtInComponents = [
  Heading,
  Text,
  Bullets,
  Image,
  Quote,
  Code,
  Callout,
  Card,
  Panel,
  AccentBar,
  Badge,
  Divider,
  Embed,
  Icon,
]
