import type { ContentBlock } from '@starside-io/verso-schema'

export interface BlockMenuEntry {
  type: string
  label: string
  category: 'Text' | 'Media' | 'Containers' | 'Decoration'
  stub: () => ContentBlock
}

export const BLOCK_MENU: BlockMenuEntry[] = [
  // Text
  {
    type: 'heading',
    label: 'Heading',
    category: 'Text',
    stub: () => ({ type: 'heading', level: 2, text: 'Heading' }),
  },
  { type: 'text', label: 'Text', category: 'Text', stub: () => ({ type: 'text', text: 'Text' }) },
  {
    type: 'bullets',
    label: 'Bullets',
    category: 'Text',
    stub: () => ({ type: 'bullets', items: ['Bullet a', 'Bullet b'] }),
  },
  {
    type: 'quote',
    label: 'Quote',
    category: 'Text',
    stub: () => ({ type: 'quote', text: 'A short, punchy quote.', attribution: 'Attribution' }),
  },

  // Media
  {
    type: 'image',
    label: 'Image',
    category: 'Media',
    stub: () => ({ type: 'image', src: 'https://placehold.co/1200x800', alt: 'Image' }),
  },
  {
    type: 'code',
    label: 'Code',
    category: 'Media',
    stub: () => ({ type: 'code', language: 'ts', source: 'const verso = "hello"' }),
  },
  {
    type: 'embed',
    label: 'Embed',
    category: 'Media',
    stub: () => ({
      type: 'embed',
      src: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
      title: 'Embedded video',
      aspect: '16:9',
      fallback_text: 'Open the deck online to play this video.',
    }),
  },

  // Containers
  {
    type: 'card',
    label: 'Card',
    category: 'Containers',
    stub: () => ({
      type: 'card',
      tone: 'surface',
      variant: 'soft',
      content: [
        { type: 'heading', level: 3, text: 'Card title' },
        { type: 'text', text: 'Card body.' },
      ],
    }),
  },
  {
    type: 'panel',
    label: 'Panel',
    category: 'Containers',
    stub: () => ({
      type: 'panel',
      tone: 'primary',
      variant: 'soft',
      content: [{ type: 'text', text: 'Panel content.' }],
    }),
  },

  // Decoration
  {
    type: 'icon',
    label: 'Icon',
    category: 'Decoration',
    stub: () => ({ type: 'icon', name: 'lightning', weight: 'regular', size: 48, tone: 'primary' }),
  },
  {
    type: 'callout',
    label: 'Callout',
    category: 'Decoration',
    stub: () => ({ type: 'callout', tone: 'info', text: 'Heads up.' }),
  },
  {
    type: 'badge',
    label: 'Badge',
    category: 'Decoration',
    stub: () => ({ type: 'badge', tone: 'accent', variant: 'soft', text: 'New' }),
  },
  {
    type: 'accent-bar',
    label: 'Accent bar',
    category: 'Decoration',
    stub: () => ({ type: 'accent-bar', tone: 'accent', size: 'thick' }),
  },
  {
    type: 'divider',
    label: 'Divider',
    category: 'Decoration',
    stub: () => ({ type: 'divider', tone: 'muted' }),
  },
]

export const BLOCK_CATEGORIES: BlockMenuEntry['category'][] = [
  'Text',
  'Media',
  'Containers',
  'Decoration',
]
