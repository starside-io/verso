import { defineLayout, html } from '@starside-io/verso-runtime'

export const splitImage = defineLayout({
  name: 'split-image',
  render: (slide, ctx) => {
    const images = ctx.blocks.filter((b) => b.type === 'image')
    const others = ctx.blocks.filter((b) => b.type !== 'image')
    return html`
      <div class="layout-split-image">
        <div class="split-left">
          ${slide.header ? html`<div class="verso-kicker">${slide.header}</div>` : ''}
          ${slide.title ? html`<h1 class="verso-title">${slide.title}</h1>` : ''}
          ${others.map((b) => ctx.block(b))}
        </div>
        <div class="split-right">${images.map((b) => ctx.block(b))}</div>
      </div>
    `
  },
})
