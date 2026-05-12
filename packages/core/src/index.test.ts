import { Manifest, Slide, Theme } from '@starside-io/verso-schema'
import { describe, expect, it } from 'vitest'
import { flattenContent, resolveBlockColors, resolvePath, resolveSlideColors } from './index.js'

const theme: Theme = Theme.parse({
  name: 'verso-slate',
  colors: { primary: '#1A3C6E', secondary: '#4A90D9', classic: '#F4F4F4' },
})

const manifest: Manifest = Manifest.parse({
  title: 'Workshop',
  theme: 'verso-slate',
  paths: {
    ba: { label: 'BA' },
    pm: { label: 'PM' },
    full: { label: 'Full' },
  },
  slide_order: ['intro', 'shared', 'ba-only', 'pm-only', 'closing'],
})

const makeSlides = () => {
  const list = [
    Slide.parse({ id: 'intro', title: 'Intro' }),
    Slide.parse({ id: 'shared', title: 'Shared' }),
    Slide.parse({ id: 'ba-only', title: 'BA Deep Dive', path_include: ['ba'] }),
    Slide.parse({ id: 'pm-only', title: 'PM Overview', path_include: ['pm'] }),
    Slide.parse({ id: 'closing', title: 'Closing' }),
  ]
  return new Map(list.map((s) => [s.id, s]))
}

describe('resolvePath', () => {
  it('returns linear slides plus the matching branch for ba', () => {
    const out = resolvePath({ manifest, slides: makeSlides(), pathId: 'ba' })
    expect(out.map((s) => s.id)).toEqual(['intro', 'shared', 'ba-only', 'closing'])
  })

  it('returns the pm branch when pathId is pm', () => {
    const out = resolvePath({ manifest, slides: makeSlides(), pathId: 'pm' })
    expect(out.map((s) => s.id)).toEqual(['intro', 'shared', 'pm-only', 'closing'])
  })

  it('returns every slide for the full path', () => {
    const out = resolvePath({ manifest, slides: makeSlides(), pathId: 'full' })
    expect(out.map((s) => s.id)).toEqual(['intro', 'shared', 'closing'])
  })

  it('respects path_exclude even when path_include is absent', () => {
    const slides = makeSlides()
    slides.set('shared', Slide.parse({ id: 'shared', title: 'Shared', path_exclude: ['pm'] }))
    const out = resolvePath({ manifest, slides, pathId: 'pm' })
    expect(out.map((s) => s.id)).toEqual(['intro', 'pm-only', 'closing'])
  })
})

describe('resolveSlideColors / resolveBlockColors', () => {
  it('cascades theme → deck → slide → block', () => {
    const m: Manifest = Manifest.parse({
      title: 'X',
      style_overrides: { secondary: '#deck-sec' },
    })
    const slide: Slide = Slide.parse({
      id: 's',
      style_overrides: { primary: '#slide-pri' },
      content: [
        {
          type: 'bullets',
          items: ['a'],
          style_overrides: { secondary: '#block-sec' },
        },
      ],
    })

    const slideColors = resolveSlideColors(theme, m, slide)
    expect(slideColors.primary).toBe('#slide-pri')
    expect(slideColors.secondary).toBe('#deck-sec')
    expect(slideColors.classic).toBe('#F4F4F4')

    const blockColors = resolveBlockColors(theme, m, slide, slide.content[0]!)
    expect(blockColors.primary).toBe('#slide-pri')
    expect(blockColors.secondary).toBe('#block-sec')
  })

  it('does not bleed block override upward to slide', () => {
    const slide: Slide = Slide.parse({
      id: 's',
      content: [{ type: 'bullets', items: ['a'], style_overrides: { primary: '#leak' } }],
    })
    const slideColors = resolveSlideColors(theme, manifest, slide)
    expect(slideColors.primary).toBe('#1A3C6E')
  })
})

describe('flattenContent', () => {
  it('filters blocks per path', () => {
    const slide = Slide.parse({
      id: 's',
      content: [
        { type: 'text', text: 'always' },
        { type: 'text', text: 'ba only', path_include: ['ba'] },
        { type: 'text', text: 'no pm', path_exclude: ['pm'] },
      ],
    })
    const ba = flattenContent(slide, 'ba')
    expect(ba.length).toBe(3)
    const pm = flattenContent(slide, 'pm')
    expect(pm.length).toBe(1)
  })
})
