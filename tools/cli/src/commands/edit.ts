import { resolve } from 'node:path'
import { startEditor } from '@starside-io/verso-editor'
import { startViewer } from '@starside-io/verso-viewer'
import pc from 'picocolors'
import { log, requireProjectRoot } from '../utils.js'

export interface EditOptions {
  dir?: string
  port?: string
  viewerPort?: string
  host?: string
  open?: boolean
}

const openBrowser = async (url: string): Promise<void> => {
  const platform = process.platform
  const cmd = platform === 'darwin' ? 'open' : platform === 'win32' ? 'start' : 'xdg-open'
  const { spawn } = await import('node:child_process')
  spawn(cmd, [url], { stdio: 'ignore', detached: true }).unref()
}

export const runEdit = async (opts: EditOptions): Promise<void> => {
  const cwd = opts.dir ? resolve(process.cwd(), opts.dir) : process.cwd()
  const projectRoot = requireProjectRoot(cwd)

  const viewerPort = opts.viewerPort ? Number(opts.viewerPort) : 5173
  const editorPort = opts.port ? Number(opts.port) : 5180
  const host = opts.host ?? 'localhost'

  log.info(`Project: ${projectRoot}`)
  log.info(`Starting viewer on http://${host}:${viewerPort}`)
  const viewer = await startViewer({ projectRoot, port: viewerPort, host, open: false })

  const viewerUrl = `http://${host}:${viewerPort}`
  log.info(`Starting editor on http://${host}:${editorPort}`)
  const editor = await startEditor({ viewerUrl, port: editorPort, host })

  const editorUrl = `http://${host}:${editorPort}`
  console.log()
  console.log(`  ${pc.bold('Editor:')} ${pc.cyan(editorUrl)}`)
  console.log(`  ${pc.dim('Viewer:')} ${pc.dim(viewerUrl)}`)
  console.log()

  if (opts.open !== false) {
    await openBrowser(editorUrl)
  }

  const shutdown = async () => {
    console.log()
    log.info('Shutting down…')
    try {
      await editor.close()
    } catch {}
    try {
      await viewer.close()
    } catch {}
    process.exit(0)
  }
  process.on('SIGINT', () => void shutdown())
  process.on('SIGTERM', () => void shutdown())
}
