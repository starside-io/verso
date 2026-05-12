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

export default defineConfig({
  plugins: [preact()],
  server: {
    port: 5180,
    strictPort: true,
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
  },
})
