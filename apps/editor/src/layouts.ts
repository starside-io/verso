// List of built-in layouts the editor exposes in the Layout dropdown.
// Mirrors @starside-io/verso-layouts. Custom layouts (defined in verso.config.ts) won't
// appear here — users can still set them by editing JSON directly.
export interface LayoutEntry {
  name: string
  label: string
  category:
    | 'Core'
    | 'Openers / closers'
    | 'Structured'
    | 'Asymmetric splits'
    | 'Grids'
    | 'Image-driven'
    | 'Flow'
    | 'Special'
}

export const BUILT_IN_LAYOUTS: LayoutEntry[] = [
  { name: 'content', label: 'Content', category: 'Core' },
  { name: 'two-col', label: 'Two columns', category: 'Core' },
  { name: 'three-col', label: 'Three columns', category: 'Core' },
  { name: 'image-left', label: 'Image left', category: 'Core' },
  { name: 'image-right', label: 'Image right', category: 'Core' },
  { name: 'hero', label: 'Hero', category: 'Core' },
  { name: 'full-image', label: 'Full image', category: 'Core' },
  { name: 'cover', label: 'Cover', category: 'Openers / closers' },
  { name: 'section', label: 'Section divider', category: 'Openers / closers' },
  { name: 'chapter', label: 'Chapter divider', category: 'Openers / closers' },
  { name: 'closing', label: 'Closing', category: 'Openers / closers' },
  { name: 'author', label: 'Author / contact', category: 'Openers / closers' },
  { name: 'title-only', label: 'Title only', category: 'Openers / closers' },
  { name: 'agenda', label: 'Agenda', category: 'Structured' },
  { name: 'compare', label: 'Compare', category: 'Structured' },
  { name: 'stats', label: 'Stats', category: 'Structured' },
  { name: 'big-number', label: 'Big number', category: 'Structured' },
  { name: 'quote', label: 'Quote', category: 'Structured' },
  { name: 'timeline', label: 'Timeline', category: 'Structured' },
  { name: 'roadmap', label: 'Roadmap (quarters)', category: 'Structured' },
  { name: 'q-and-a', label: 'Q & A', category: 'Structured' },
  { name: 'one-third-left', label: '1/3 left + 2/3 right', category: 'Asymmetric splits' },
  { name: 'one-third-right', label: '2/3 left + 1/3 right', category: 'Asymmetric splits' },
  { name: 'two-thirds-left', label: '2/3 left + 1/3 right (alt)', category: 'Asymmetric splits' },
  { name: 'two-thirds-right', label: '1/3 left + 2/3 right (alt)', category: 'Asymmetric splits' },
  { name: 'split-vertical', label: 'Split top + bottom', category: 'Asymmetric splits' },
  { name: 'quad', label: 'Quad (2x2)', category: 'Grids' },
  { name: 'swot', label: 'SWOT', category: 'Grids' },
  { name: 'icon-grid', label: 'Icon grid', category: 'Grids' },
  { name: 'kpi-band', label: 'KPI band', category: 'Grids' },
  { name: 'bento', label: 'Bento', category: 'Grids' },
  { name: 'picture-fill', label: 'Picture fill', category: 'Image-driven' },
  { name: 'picture-with-caption', label: 'Picture with caption', category: 'Image-driven' },
  { name: 'process', label: 'Process (chevrons)', category: 'Flow' },
  { name: 'title-band', label: 'Title band', category: 'Special' },
  { name: 'callout-banner', label: 'Callout banner', category: 'Special' },
]
