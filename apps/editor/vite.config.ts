import { createRequire } from 'node:module'
import { dirname } from 'node:path'
import preact from '@preact/preset-vite'
import { defineConfig } from 'vite'

// The editor runs on its own port. Data routes (/__verso/*) and the slide
// preview (/) are proxied through to the viewer dev server, which the
// `verso edit` CLI command launches alongside this one.
//
// VERSO_VIEWER_URL is set by `verso edit`. If absent (e.g. running `pnpm dev`
// directly inside this package), we fall back to the layouts-gallery viewer
// since it's the richest demo deck.
const viewerUrl = process.env.VERSO_VIEWER_URL ?? 'http://localhost:5174'

// Resolve @phosphor-icons/core's assets directory at config-load time. Vite's
// import.meta.glob can only glob literal paths rooted at the project root, so
// when this editor is consumed as a published npm package (where pnpm/npm
// hoists @phosphor-icons up to a parent node_modules), a glob like
// `/node_modules/@phosphor-icons/core/assets/**/*.svg` matches zero files and
// the icon picker shows blank squares. Aliasing a stable virtual path to the
// real (resolved) directory makes the glob work in any install layout.
// @phosphor-icons/core doesn't export ./package.json so we resolve the main
// entry instead, then walk up to the package root (dist/index.mjs -> ../).
const require = createRequire(import.meta.url)
const phosphorMain = require.resolve('@phosphor-icons/core')
const phosphorAssetsDir = `${dirname(dirname(phosphorMain))}/assets`

export default defineConfig({
  plugins: [preact()],
  server: {
    port: 5180,
    strictPort: true,
    fs: {
      // Allow Vite to serve files from outside the project root. Phosphor's
      // assets dir often lives in a parent node_modules thanks to pnpm/npm
      // hoisting, so the editor needs explicit allow for it.
      allow: [phosphorAssetsDir, '..'],
    },
    proxy: {
      '/__verso': { target: viewerUrl, changeOrigin: true },
      '/__viewer': {
        target: viewerUrl,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/__viewer/, ''),
      },
    },
  },
  define: {
    __VERSO_VIEWER_URL__: JSON.stringify(viewerUrl),
    // Absolute URL the editor uses to fetch individual Phosphor SVGs. Vite
    // serves any allowed filesystem path under /@fs/. Resolving the package
    // here (config-load time) makes the runtime independent of node_modules
    // layout — works in the workspace AND in any published editor install.
    __PHOSPHOR_ASSETS_URL__: JSON.stringify(`/@fs${phosphorAssetsDir}`),
  },
})
