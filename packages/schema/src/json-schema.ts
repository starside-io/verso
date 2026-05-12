import { zodToJsonSchema } from 'zod-to-json-schema'
import { Manifest } from './manifest.js'
import { Slide } from './slide.js'
import { Theme } from './theme.js'

export const manifestJsonSchema = zodToJsonSchema(Manifest, 'Manifest')
export const slideJsonSchema = zodToJsonSchema(Slide, 'Slide')
export const themeJsonSchema = zodToJsonSchema(Theme, 'Theme')
