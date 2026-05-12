import { defineConfig } from '@starside-io/verso-runtime'
import { splitImage } from './layouts/split-image.js'

export default defineConfig({
  layouts: [splitImage],
})
