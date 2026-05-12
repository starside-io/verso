import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import preact from '@preact/preset-vite'
import { type ViteDevServer, createServer } from 'vite'

const here = dirname(fileURLToPath(import.meta.url))
const editorRoot = resolve(here, '..')

export interface StartEditorOptions {
  viewerUrl: string
  port?: number
  host?: string
}

export const startEditor = async (options: StartEditorOptions): Promise<ViteDevServer> => {
  const server = await createServer({
    root: editorRoot,
    configFile: false,
    plugins: [preact()],
    server: {
      port: options.port ?? 5180,
      host: options.host ?? 'localhost',
      strictPort: true,
      proxy: {
        '/__verso': { target: options.viewerUrl, changeOrigin: true },
      },
    },
    define: {
      __VERSO_VIEWER_URL__: JSON.stringify(options.viewerUrl),
    },
  })
  await server.listen()
  return server
}
