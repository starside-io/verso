import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
export const templatesDir = resolve(here, '..', 'templates')

export type TemplateName =
  | 'minimal'
  | 'branded'
  | 'inline-theme'
  | 'multi-path'
  | 'layouts-gallery'
  | 'extended'

export const knownTemplates: TemplateName[] = [
  'minimal',
  'branded',
  'inline-theme',
  'multi-path',
  'layouts-gallery',
  'extended',
]
