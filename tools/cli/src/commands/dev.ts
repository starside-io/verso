import { resolve } from 'node:path'
import { startViewer } from '@starside-io/verso-viewer'
import { log, requireProjectRoot } from '../utils.js'

export interface DevOptions {
  port?: string
  host?: string
  open?: boolean
  dir?: string
}

export const runDev = async (opts: DevOptions): Promise<void> => {
  const cwd = opts.dir ? resolve(process.cwd(), opts.dir) : process.cwd()
  const projectRoot = requireProjectRoot(cwd)
  const port = opts.port ? Number(opts.port) : 5173
  log.info(`Starting Verso viewer on http://localhost:${port} for project ${projectRoot}`)

  await startViewer({
    projectRoot,
    port,
    host: opts.host ?? 'localhost',
    open: opts.open ?? false,
  })
}
