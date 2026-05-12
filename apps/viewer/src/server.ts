import { existsSync, rmSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { type ViteDevServer, createServer } from 'vite'
import { versoDataPlugin } from './data-plugin.js'

const here = dirname(fileURLToPath(import.meta.url))
const viewerRoot = resolve(here, '..')

export interface StartViewerOptions {
  projectRoot: string
  port?: number
  host?: string
  open?: boolean
}

export const resolveUserConfigEntry = (projectRoot: string): string => {
  const candidates = ['verso.config.ts', 'verso.config.mts', 'verso.config.js', 'verso.config.mjs']
  for (const c of candidates) {
    const p = join(projectRoot, c)
    if (existsSync(p)) return p
  }
  return resolve(viewerRoot, 'src/empty-config.ts')
}

export const resolveUserStylesEntry = (projectRoot: string): string => {
  const candidates = ['styles.css', 'verso.css']
  for (const c of candidates) {
    const p = join(projectRoot, c)
    if (existsSync(p)) return p
  }
  return resolve(viewerRoot, 'src/empty-styles.css')
}

export const buildViteConfig = (options: StartViewerOptions) => {
  const project = resolve(options.projectRoot)
  const userConfig = resolveUserConfigEntry(project)
  const userStyles = resolveUserStylesEntry(project)
  return {
    root: viewerRoot,
    configFile: false as const,
    server: {
      port: options.port ?? 5173,
      host: options.host ?? 'localhost',
      open: options.open ?? false,
      headers: { 'Cache-Control': 'no-store' },
      fs: { strict: false },
      watch: { followSymlinks: true, ignored: ['!**/node_modules/@starside-io/verso-**'] },
    },
    resolve: {
      alias: {
        '@starside-io/verso-user-config': userConfig,
        '@starside-io/verso-user-styles': userStyles,
      },
    },
    plugins: [versoDataPlugin({ projectRoot: project })],
    optimizeDeps: {
      exclude: [
        '@starside-io/verso-runtime',
        '@starside-io/verso-layouts',
        '@starside-io/verso-themes',
        '@starside-io/verso-schema',
        '@starside-io/verso-core',
      ],
    },
    cacheDir: join(project, 'node_modules', '.vite-verso'),
  }
}

export const startViewer = async (options: StartViewerOptions): Promise<ViteDevServer> => {
  const project = resolve(options.projectRoot)
  rmSync(join(project, 'node_modules', '.vite-verso'), { recursive: true, force: true })
  const server = await createServer(buildViteConfig(options))
  await server.listen()
  server.printUrls()
  return server
}
