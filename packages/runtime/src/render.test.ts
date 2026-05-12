import { Manifest, Slide } from '@starside-io/verso-schema'
import { describe, expect, it } from 'vitest'
import { builtInComponents } from './components/index.js'
import { defineLayout, defineTheme } from './define.js'
import { html } from './html.js'
import { buildRegistry } from './registry.js'
import { renderDeck } from './render.js'

const slate = defineTheme({
  name: 'verso-slate',
  colors: { primary: '#1A3C6E', secondary: '#4A90D9', classic: '#F4F4F4' },
})

const content = defineLayout({
  name: 'content',
  render: (slide, ctx) =>
    html`<header>${slide.title ?? ''}</header><main>${ctx.blocks.map((b) => ctx.block(b))}</main>`,
})

const registry = buildRegistry({
  builtIn: { themes: [slate], layouts: [content], components: builtInComponents },
})

describe('renderDeck', () => {
  it('renders only slides for the active path with cascade applied', () => {
    const manifest = Manifest.parse({
      title: 'X',
      theme: 'verso-slate',
      paths: { ba: { label: 'BA' } },
      slide_order: ['intro', 'ba-deep'],
    })
    const slides = new Map<string, Slide>([
      [
        'intro',
        Slide.parse({ id: 'intro', title: 'Hi', content: [{ type: 'text', text: 'hello' }] }),
      ],
      [
        'ba-deep',
        Slide.parse({
          id: 'ba-deep',
          title: 'BA',
          path_include: ['ba'],
          style_overrides: { primary: '#D95B4A' },
          content: [{ type: 'bullets', items: ['a', 'b'] }],
        }),
      ],
    ])

    const out = renderDeck({ manifest, slides, registry, pathId: 'ba' })
    expect(out.slides.length).toBe(2)
    expect(out.slides[0]!.html).toContain('Hi')
    expect(out.slides[1]!.html).toContain('--color-primary:#D95B4A')
    expect(out.slides[1]!.html).toContain('<li>a</li>')
  })

  it('throws a clear error when the manifest theme is unknown', () => {
    const manifest = Manifest.parse({ title: 'X', theme: 'no-such-theme' })
    expect(() => renderDeck({ manifest, slides: new Map(), registry, pathId: 'full' })).toThrow(
      /Theme "no-such-theme" not found/,
    )
  })

  it('resolves an inline theme without registry lookup', () => {
    const manifest = Manifest.parse({
      title: 'inline',
      theme: { name: 'inline', colors: { primary: '#abcdef', secondary: '#222', classic: '#fff' } },
      paths: { full: { label: 'Full' } },
      slide_order: ['s'],
    })
    const slides = new Map<string, Slide>([['s', Slide.parse({ id: 's', title: 'Hi' })]])
    const out = renderDeck({ manifest, slides, registry, pathId: 'full' })
    expect(out.theme.name).toBe('inline')
    expect(out.slides[0]!.html).toContain('--color-primary:#abcdef')
  })

  it('escapes user content in components', () => {
    const manifest = Manifest.parse({
      title: 'X',
      paths: { full: { label: 'Full' } },
      slide_order: ['s'],
    })
    const slides = new Map<string, Slide>([
      [
        's',
        Slide.parse({
          id: 's',
          content: [{ type: 'text', text: '<script>alert(1)</script>' }],
        }),
      ],
    ])
    const out = renderDeck({ manifest, slides, registry, pathId: 'full' })
    expect(out.slides[0]!.html).not.toContain('<script>')
    expect(out.slides[0]!.html).toContain('&lt;script&gt;')
  })
})
