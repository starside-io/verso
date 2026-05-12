// List of built-in layouts the editor exposes in the Layout dropdown.
// Mirrors @starside-io/verso-layouts. Custom layouts (defined in verso.config.ts) won't
// appear here — users can still set them by editing JSON directly.
export interface LayoutEntry {
  name: string
  label: string
  category: 'Core' | 'Openers / closers' | 'Structured'
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
  { name: 'closing', label: 'Closing', category: 'Openers / closers' },
  { name: 'author', label: 'Author / contact', category: 'Openers / closers' },
  { name: 'agenda', label: 'Agenda', category: 'Structured' },
  { name: 'compare', label: 'Compare', category: 'Structured' },
  { name: 'stats', label: 'Stats', category: 'Structured' },
  { name: 'big-number', label: 'Big number', category: 'Structured' },
  { name: 'quote', label: 'Quote', category: 'Structured' },
  { name: 'timeline', label: 'Timeline', category: 'Structured' },
]
