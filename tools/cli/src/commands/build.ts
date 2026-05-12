import { resolve } from 'node:path'
import { buildHtml, buildPdf } from '@starside-io/verso-build'
import pc from 'picocolors'
import { log, requireProjectRoot } from '../utils.js'

export interface BuildOptions {
  dir?: string
  path?: string
  out?: string
  size?: string
  format?: string
  inlineImages?: boolean
}

const SIZE_KEYS = ['16:9', '4:3', 'letter', 'a4'] as const
type SizeKey = (typeof SIZE_KEYS)[number]

const FORMATS = ['pdf', 'html'] as const
type Format = (typeof FORMATS)[number]

const isSizeKey = (s: string): s is SizeKey => (SIZE_KEYS as readonly string[]).includes(s)
const isFormat = (s: string): s is Format => (FORMATS as readonly string[]).includes(s)

const formatBytes = (n: number): string => {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(2)} MB`
}

export const runBuild = async (opts: BuildOptions): Promise<void> => {
  const cwd = opts.dir ? resolve(process.cwd(), opts.dir) : process.cwd()
  const projectRoot = requireProjectRoot(cwd)

  const size = opts.size ?? '16:9'
  if (!isSizeKey(size)) {
    console.error(pc.red(`Unknown --size "${size}". Use one of: ${SIZE_KEYS.join(', ')}`))
    process.exit(1)
  }

  const format = opts.format ?? 'pdf'
  if (!isFormat(format)) {
    console.error(pc.red(`Unknown --format "${format}". Use one of: ${FORMATS.join(', ')}`))
    process.exit(1)
  }

  const inlineImages = opts.inlineImages !== false

  log.info(`Building ${format.toUpperCase()} from ${projectRoot}`)
  if (opts.path) log.info(`Path: ${opts.path}`)
  log.info(`Size: ${size}`)
  if (format === 'html') log.info(`Inline images: ${inlineImages ? 'yes' : 'no'}`)

  const start = Date.now()
  const result =
    format === 'html'
      ? await buildHtml({
          projectRoot,
          pathId: opts.path,
          outDir: opts.out,
          size,
          inlineImages,
        })
      : await buildPdf({
          projectRoot,
          pathId: opts.path,
          outDir: opts.out,
          size,
        })
  const elapsed = ((Date.now() - start) / 1000).toFixed(1)

  console.log()
  for (const f of result.files) {
    console.log(
      `  ${pc.green('✓')} ${pc.bold(f.pathId)} ${pc.dim('→')} ${f.file} ${pc.dim(
        `(${f.slides} slides, ${formatBytes(f.bytes)})`,
      )}`,
    )
  }
  console.log()
  log.info(`Done in ${elapsed}s`)
}
