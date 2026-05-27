import { describe, expect, it } from 'vitest'
import { Manifest, Slide, Theme, layoutRequirements } from './index.js'

describe('Slide schema', () => {
  it('parses a minimal slide and applies defaults', () => {
    const parsed = Slide.parse({ id: 'intro' })
    expect(parsed.id).toBe('intro')
    expect(parsed.layout).toBe('content')
    expect(parsed.content).toEqual([])
  })

  it('accepts an optional header above the title', () => {
    const parsed = Slide.parse({ id: 'intro', header: 'Section 01', title: 'Hi' })
    expect(parsed.header).toBe('Section 01')
  })

  it('rejects a slide without an id', () => {
    expect(() => Slide.parse({ title: 'no id' })).toThrow()
  })

  it('parses a slide with bullet content and path gates', () => {
    const parsed = Slide.parse({
      id: 'ba-deep',
      title: 'Process Mapping',
      layout: 'two-col',
      path_include: ['ba'],
      content: [
        {
          type: 'bullets',
          items: ['As-is mapping', 'Gap analysis'],
          style_overrides: { secondary: '#FFD166' },
        },
        {
          type: 'bullets',
          items: ['Future state', 'Roadmap'],
        },
      ],
    })
    expect(parsed.path_include).toEqual(['ba'])
    expect(parsed.content[0]?.type).toBe('bullets')
  })

  it('preserves unknown block types via the custom block fallback', () => {
    const parsed = Slide.parse({
      id: 'custom',
      content: [{ type: 'split-image', src: 'a.png', text: 'hi' }],
    })
    const block = parsed.content[0] as { type: string; src: string; text: string }
    expect(block.type).toBe('split-image')
    expect(block.src).toBe('a.png')
  })
})

describe('Slide layout validation', () => {
  it('exposes layoutRequirements for introspection', () => {
    expect(layoutRequirements['two-col']).toEqual({ minBlocks: 2, mustBeMultipleOf: 2 })
    expect(layoutRequirements['three-col']).toEqual({ minBlocks: 3, mustBeMultipleOf: 3 })
    expect(layoutRequirements['image-left']?.needsImage).toBe(true)
    expect(layoutRequirements.content).toBeUndefined()
  })

  it('rejects two-col with 1 block (below minimum)', () => {
    expect(() =>
      Slide.parse({
        id: 'half',
        layout: 'two-col',
        content: [{ type: 'text', text: 'lonely' }],
      }),
    ).toThrow(/two-col.*at least 2 blocks/)
  })

  it('rejects two-col with 3 blocks (unbalanced split)', () => {
    expect(() =>
      Slide.parse({
        id: 'role',
        layout: 'two-col',
        content: [
          { type: 'text', text: 'a' },
          { type: 'text', text: 'b' },
          { type: 'text', text: 'c' },
        ],
      }),
    ).toThrow(/multiple of 2/)
  })

  it('accepts two-col with 2 blocks', () => {
    const parsed = Slide.parse({
      id: 'cot',
      layout: 'two-col',
      content: [
        { type: 'text', text: 'a' },
        { type: 'text', text: 'b' },
      ],
    })
    expect(parsed.content.length).toBe(2)
  })

  it('accepts two-col with 4 blocks', () => {
    const parsed = Slide.parse({
      id: 'cot4',
      layout: 'two-col',
      content: [
        { type: 'text', text: 'a' },
        { type: 'text', text: 'b' },
        { type: 'text', text: 'c' },
        { type: 'text', text: 'd' },
      ],
    })
    expect(parsed.content.length).toBe(4)
  })

  it('rejects three-col with 2 blocks (empty column)', () => {
    expect(() =>
      Slide.parse({
        id: 'tc',
        layout: 'three-col',
        content: [
          { type: 'text', text: 'a' },
          { type: 'text', text: 'b' },
        ],
      }),
    ).toThrow(/three-col.*at least 3/)
  })

  it('rejects three-col with 4 blocks (must be multiple of 3)', () => {
    expect(() =>
      Slide.parse({
        id: 'tc',
        layout: 'three-col',
        content: [
          { type: 'text', text: 'a' },
          { type: 'text', text: 'b' },
          { type: 'text', text: 'c' },
          { type: 'text', text: 'd' },
        ],
      }),
    ).toThrow(/multiple of 3/)
  })

  it('rejects image-left without an image block', () => {
    expect(() =>
      Slide.parse({
        id: 'noimg',
        layout: 'image-left',
        content: [{ type: 'text', text: 'just words' }],
      }),
    ).toThrow(/no image block/)
  })

  it('accepts image-left with an image block', () => {
    const parsed = Slide.parse({
      id: 'img',
      layout: 'image-left',
      content: [
        { type: 'image', src: 'a.png' },
        { type: 'text', text: 'caption' },
      ],
    })
    expect(parsed.content.length).toBe(2)
  })

  it('rejects compare with only 1 heading block', () => {
    expect(() =>
      Slide.parse({
        id: 'cmp',
        layout: 'compare',
        content: [
          { type: 'heading', text: 'Pros' },
          { type: 'text', text: 'good' },
        ],
      }),
    ).toThrow(/heading blocks/)
  })

  it('accepts compare with 2 heading blocks', () => {
    const parsed = Slide.parse({
      id: 'cmp',
      layout: 'compare',
      content: [
        { type: 'heading', text: 'Pros' },
        { type: 'text', text: 'good' },
        { type: 'heading', text: 'Cons' },
        { type: 'text', text: 'bad' },
      ],
    })
    expect(parsed.content.length).toBe(4)
  })

  it('leaves content layout unconstrained (0 minimum)', () => {
    const parsed = Slide.parse({ id: 'empty', layout: 'content', content: [] })
    expect(parsed.content).toEqual([])
  })

  it('leaves agenda layout unconstrained (falls back to deckOutline)', () => {
    const parsed = Slide.parse({ id: 'toc', layout: 'agenda', content: [] })
    expect(parsed.layout).toBe('agenda')
  })

  it('reports the slide id in the error message', () => {
    try {
      Slide.parse({
        id: 'my-slide',
        layout: 'two-col',
        content: [{ type: 'text', text: 'only one' }],
      })
      throw new Error('expected throw')
    } catch (err) {
      // ZodError.message is a JSON string with escaped quotes around the id.
      expect((err as Error).message).toMatch(/my-slide/)
    }
  })
})

describe('Manifest schema', () => {
  it('parses a manifest with paths', () => {
    const parsed = Manifest.parse({
      title: 'Workshop',
      theme: 'verso-slate',
      paths: {
        ba: { label: 'Business Analysts', color: '#4A90D9' },
        full: { label: 'Full Deck' },
      },
      slide_order: ['intro', 'closing'],
    })
    expect(parsed.title).toBe('Workshop')
    expect(parsed.paths.ba?.label).toBe('Business Analysts')
  })

  it('defaults theme and slide_order', () => {
    const parsed = Manifest.parse({ title: 'Tiny' })
    expect(parsed.theme).toBe('verso-slate')
    expect(parsed.slide_order).toEqual([])
  })

  it('accepts an inline theme object on theme', () => {
    const parsed = Manifest.parse({
      title: 'Inline',
      theme: {
        name: 'inline',
        colors: { primary: '#000', secondary: '#fff', classic: '#888' },
      },
    })
    if (typeof parsed.theme === 'string') throw new Error('expected inline theme')
    expect(parsed.theme.name).toBe('inline')
    expect(parsed.theme.colors.primary).toBe('#000')
  })
})

describe('Theme schema', () => {
  it('requires all three color roles', () => {
    expect(() =>
      Theme.parse({ name: 'broken', colors: { primary: '#000', secondary: '#fff' } }),
    ).toThrow()
  })
})
