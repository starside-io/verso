import { existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import { versoDataPlugin } from './src/data-plugin.js'

const here = dirname(fileURLToPath(import.meta.url))
const projectRoot = resolve(process.env.VERSO_PROJECT ?? join(here, '../../examples/minimal'))

const userConfigCandidates = ['verso.config.ts', 'verso.config.mts', 'verso.config.js']
const userConfigEntry =
  userConfigCandidates.map((f) => join(projectRoot, f)).find((p) => existsSync(p)) ??
  join(here, 'src/empty-config.ts')

export default defineConfig({
  root: here,
  resolve: {
    alias: {
      '@starside-io/verso-user-config': userConfigEntry,
    },
    preserveSymlinks: true,
  },
  plugins: [versoDataPlugin({ projectRoot })],
  optimizeDeps: {
    include: [
      '@starside-io/verso-runtime',
      '@starside-io/verso-layouts',
      '@starside-io/verso-themes',
      '@starside-io/verso-schema',
      '@starside-io/verso-core',
    ],
  },
})
