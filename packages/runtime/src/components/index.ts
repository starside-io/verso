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
  ImageBlock,
  PanelBlock,
  QuoteBlock,
  TextBlock,
} from '@starside-io/verso-schema'
import { defineComponent } from '../define.js'
import { html } from '../html.js'

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

export const Bullets = defineComponent<BulletsBlock>({
  name: 'bullets',
  render: (props) => {
    const items = props.items.map((i) => html`<li>${i}</li>`)
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
]
