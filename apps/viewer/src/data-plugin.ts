import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { basename, extname, join, resolve } from 'node:path'
import { buildHtml, buildPdf, buildPng } from '@starside-io/verso-build'
import { Manifest, Slide, Theme, slideIdsOf } from '@starside-io/verso-schema'
import type { Plugin } from 'vite'

export interface VersoDataPluginOptions {
  projectRoot: string
}

const sendJson = (res: ServerResponse, body: unknown, status = 200): void => {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  res.end(JSON.stringify(body))
}

const sendError = (res: ServerResponse, status: number, message: string): void => {
  sendJson(res, { error: message }, status)
}

const readJsonSafe = (path: string): unknown => {
  const text = readFileSync(path, 'utf-8')
  return JSON.parse(text)
}

const collectJsonDir = (dir: string): Record<string, unknown> => {
  const out: Record<string, unknown> = {}
  if (!existsSync(dir) || !statSync(dir).isDirectory()) return out
  for (const file of readdirSync(dir)) {
    if (!file.endsWith('.json')) continue
    const id = file.replace(/\.json$/, '')
    out[id] = readJsonSafe(join(dir, file))
  }
  return out
}

// Atomic write: tmp file + rename so a crash mid-write can't corrupt JSON.
const writeJsonAtomic = (path: string, value: unknown): void => {
  mkdirSync(join(path, '..'), { recursive: true })
  const tmp = `${path}.${process.pid}.${Date.now()}.tmp`
  writeFileSync(tmp, `${JSON.stringify(value, null, 2)}\n`)
  renameSync(tmp, path)
}

const readBody = (req: IncomingMessage): Promise<string> =>
  new Promise((resolve_, reject) => {
    let data = ''
    req.setEncoding('utf-8')
    req.on('data', (chunk) => {
      data += chunk
      // 5 MB cap is generous for slide JSON.
      if (data.length > 5 * 1024 * 1024) {
        reject(new Error('Request body too large'))
        req.destroy()
      }
    })
    req.on('end', () => resolve_(data))
    req.on('error', reject)
  })

const parseBody = async (req: IncomingMessage): Promise<unknown> => {
  const text = await readBody(req)
  if (!text) return undefined
  try {
    return JSON.parse(text)
  } catch (err) {
    throw new Error(`Invalid JSON body: ${(err as Error).message}`)
  }
}

const safeId = (s: string): boolean => /^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/.test(s)

const ASSET_MIME: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
}

const ASSET_MAX_BYTES = 25 * 1024 * 1024 // 25 MB cap; binary-safe upload

const sanitizeAssetName = (raw: string): string | null => {
  const bare = basename(raw).trim()
  if (!bare) return null
  // Lower-case the extension, keep stem as-is but strip anything other than
  // [a-zA-Z0-9._-]. Reject names that resolve to "." / ".." or contain slashes.
  const cleaned = bare.replace(/[^a-zA-Z0-9._-]+/g, '_')
  if (cleaned === '.' || cleaned === '..' || cleaned.startsWith('.')) return null
  const ext = extname(cleaned).toLowerCase()
  const stem = cleaned.slice(0, cleaned.length - ext.length) || 'asset'
  return `${stem}${ext}`
}

const uniqueAssetPath = (assetsDir: string, name: string): string => {
  const ext = extname(name)
  const stem = name.slice(0, name.length - ext.length)
  let candidate = join(assetsDir, name)
  let i = 2
  while (existsSync(candidate)) {
    candidate = join(assetsDir, `${stem}-${i}${ext}`)
    i++
  }
  return candidate
}

const readBinaryBody = (req: IncomingMessage): Promise<Buffer> =>
  new Promise((resolve_, reject) => {
    const chunks: Buffer[] = []
    let total = 0
    req.on('data', (chunk: Buffer) => {
      total += chunk.length
      if (total > ASSET_MAX_BYTES) {
        reject(new Error(`Upload too large (max ${ASSET_MAX_BYTES} bytes)`))
        req.destroy()
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => resolve_(Buffer.concat(chunks)))
    req.on('error', reject)
  })

export const versoDataPlugin = ({ projectRoot }: VersoDataPluginOptions): Plugin => {
  const root = resolve(projectRoot)
  const slidesDir = join(root, 'slides')
  const themesDir = join(root, 'themes')
  const assetsDir = join(root, 'assets')
  const manifestPath = join(root, 'deck.json')

  return {
    name: 'verso:data',

    configureServer(server) {
      // ---------- READ ----------

      server.middlewares.use('/__verso/manifest', (req, res, next) => {
        if (req.method !== 'GET' && req.method !== 'PUT') return next()
        if (req.method === 'GET') {
          if (!existsSync(manifestPath)) {
            return sendError(res, 404, `deck.json not found at ${manifestPath}`)
          }
          try {
            return sendJson(res, readJsonSafe(manifestPath))
          } catch (err) {
            return sendError(res, 500, `Failed to read deck.json: ${(err as Error).message}`)
          }
        }
        // PUT: replace deck.json
        ;(async () => {
          try {
            const body = await parseBody(req)
            const manifest = Manifest.parse(body)
            writeJsonAtomic(manifestPath, manifest)
            sendJson(res, { ok: true })
          } catch (err) {
            sendError(res, 400, (err as Error).message)
          }
        })()
      })

      server.middlewares.use('/__verso/slides', (req, res, next) => {
        if (req.method !== 'GET') return next()
        try {
          sendJson(res, collectJsonDir(slidesDir))
        } catch (err) {
          sendError(res, 500, `Failed to read slides: ${(err as Error).message}`)
        }
      })

      server.middlewares.use('/__verso/themes', (req, res, next) => {
        if (req.method !== 'GET') return next()
        try {
          const obj = collectJsonDir(themesDir)
          sendJson(res, Object.values(obj))
        } catch (err) {
          sendError(res, 500, `Failed to read themes: ${(err as Error).message}`)
        }
      })

      // ---------- WRITE: slide ----------

      server.middlewares.use('/__verso/slide/', (req, res, next) => {
        const url = req.url ?? ''
        const id = decodeURIComponent(url.replace(/^\/+/, '').split('/')[0] ?? '').trim()
        const isReorder = id === 'reorder'
        const isNew = id === 'new'
        if (!id || (!isReorder && !isNew && !safeId(id))) {
          return sendError(res, 400, `Invalid slide id "${id}"`)
        }

        if (isReorder && req.method === 'POST') {
          ;(async () => {
            try {
              const body = (await parseBody(req)) as { order?: unknown }
              if (!Array.isArray(body?.order)) {
                return sendError(res, 400, 'order must be an array')
              }
              if (!existsSync(manifestPath)) {
                return sendError(res, 404, 'deck.json not found')
              }
              // Validate the new shape (strings for slide ids, section markers
              // for dividers) by round-tripping through the Manifest schema.
              const m = Manifest.parse({
                ...(readJsonSafe(manifestPath) as object),
                slide_order: body.order,
              })
              writeJsonAtomic(manifestPath, m)
              sendJson(res, { ok: true })
            } catch (err) {
              sendError(res, 400, (err as Error).message)
            }
          })()
          return
        }

        if (isNew && req.method === 'POST') {
          ;(async () => {
            try {
              const body = (await parseBody(req)) as { id?: string; layout?: string }
              if (!body?.id || typeof body.id !== 'string' || !safeId(body.id)) {
                return sendError(res, 400, 'Missing or invalid id')
              }
              const slidePath = join(slidesDir, `${body.id}.json`)
              if (existsSync(slidePath)) {
                return sendError(res, 409, `Slide "${body.id}" already exists`)
              }
              const slide = Slide.parse({
                id: body.id,
                title: body.id.replace(/-/g, ' '),
                layout: body.layout ?? 'content',
                content: [{ type: 'text', text: 'Edit this slide.' }],
              })
              writeJsonAtomic(slidePath, slide)
              if (existsSync(manifestPath)) {
                const m = Manifest.parse(readJsonSafe(manifestPath))
                if (!slideIdsOf(m.slide_order).includes(slide.id)) {
                  m.slide_order.push(slide.id)
                  writeJsonAtomic(manifestPath, m)
                }
              }
              sendJson(res, { ok: true, slide })
            } catch (err) {
              sendError(res, 400, (err as Error).message)
            }
          })()
          return
        }

        const slidePath = join(slidesDir, `${id}.json`)
        if (req.method === 'PUT') {
          ;(async () => {
            try {
              const body = await parseBody(req)
              const slide = Slide.parse(body)
              if (slide.id !== id) {
                return sendError(
                  res,
                  400,
                  `Slide id mismatch: URL "${id}" vs body "${slide.id}". Rename via reorder/new.`,
                )
              }
              writeJsonAtomic(slidePath, slide)
              sendJson(res, { ok: true })
            } catch (err) {
              sendError(res, 400, (err as Error).message)
            }
          })()
          return
        }
        if (req.method === 'DELETE') {
          if (!existsSync(slidePath)) {
            return sendError(res, 404, `Slide "${id}" not found`)
          }
          try {
            rmSync(slidePath)
            if (existsSync(manifestPath)) {
              const m = Manifest.parse(readJsonSafe(manifestPath))
              m.slide_order = m.slide_order.filter((e) => typeof e !== 'string' || e !== id)
              writeJsonAtomic(manifestPath, m)
            }
            return sendJson(res, { ok: true })
          } catch (err) {
            return sendError(res, 500, (err as Error).message)
          }
        }
        next()
      })

      // ---------- BUILD: pdf ----------

      server.middlewares.use('/__verso/build-pdf', (req, res, next) => {
        if (req.method !== 'POST') return next()
        ;(async () => {
          try {
            const body = ((await parseBody(req)) ?? {}) as {
              pathId?: string
              open?: boolean
            }
            const result = await buildPdf({ projectRoot: root, pathId: body.pathId })
            if (body.open && result.files[0]) {
              const platform = process.platform
              const cmd =
                platform === 'darwin' ? 'open' : platform === 'win32' ? 'start' : 'xdg-open'
              const { spawn } = await import('node:child_process')
              spawn(cmd, [result.files[0].file], { stdio: 'ignore', detached: true }).unref()
            }
            sendJson(res, result)
          } catch (err) {
            sendError(res, 500, (err as Error).message)
          }
        })()
      })

      // ---------- BUILD: html ----------

      server.middlewares.use('/__verso/build-html', (req, res, next) => {
        if (req.method !== 'POST') return next()
        ;(async () => {
          try {
            const body = ((await parseBody(req)) ?? {}) as {
              pathId?: string
              open?: boolean
              inlineImages?: boolean
            }
            const result = await buildHtml({
              projectRoot: root,
              pathId: body.pathId,
              inlineImages: body.inlineImages !== false,
            })
            if (body.open && result.files[0]) {
              const platform = process.platform
              const cmd =
                platform === 'darwin' ? 'open' : platform === 'win32' ? 'start' : 'xdg-open'
              const { spawn } = await import('node:child_process')
              spawn(cmd, [result.files[0].file], { stdio: 'ignore', detached: true }).unref()
            }
            sendJson(res, result)
          } catch (err) {
            sendError(res, 500, (err as Error).message)
          }
        })()
      })

      // ---------- BUILD: png (single slide) ----------

      server.middlewares.use('/__verso/build-png', (req, res, next) => {
        if (req.method !== 'POST') return next()
        ;(async () => {
          try {
            const body = ((await parseBody(req)) ?? {}) as {
              pathId?: string
              slideId?: string
              open?: boolean
            }
            if (!body.slideId) {
              return sendError(res, 400, 'slideId is required')
            }
            const result = await buildPng({
              projectRoot: root,
              pathId: body.pathId,
              slideId: body.slideId,
            })
            if (body.open) {
              const platform = process.platform
              const cmd =
                platform === 'darwin' ? 'open' : platform === 'win32' ? 'start' : 'xdg-open'
              const { spawn } = await import('node:child_process')
              spawn(cmd, [result.file], { stdio: 'ignore', detached: true }).unref()
            }
            sendJson(res, result)
          } catch (err) {
            sendError(res, 500, (err as Error).message)
          }
        })()
      })

      // ---------- ASSETS: upload + serve ----------

      // POST /__verso/asset/<filename> with raw body bytes. Filename is
      // sanitized; collisions get a numeric suffix. Returns the project-
      // relative path the slide should reference (e.g. "assets/foo.png").
      server.middlewares.use('/__verso/asset/', (req, res, next) => {
        if (req.method !== 'POST') return next()
        const url = req.url ?? ''
        const requested = decodeURIComponent(url.replace(/^\/+/, '').split('?')[0] ?? '').trim()
        const sanitized = sanitizeAssetName(requested)
        if (!sanitized) return sendError(res, 400, `Invalid asset filename "${requested}"`)
        const ext = extname(sanitized).toLowerCase()
        if (!ASSET_MIME[ext]) {
          return sendError(
            res,
            415,
            `Unsupported asset type "${ext}". Allowed: ${Object.keys(ASSET_MIME).join(', ')}`,
          )
        }
        ;(async () => {
          try {
            mkdirSync(assetsDir, { recursive: true })
            const finalPath = uniqueAssetPath(assetsDir, sanitized)
            const buf = await readBinaryBody(req)
            writeFileSync(finalPath, buf)
            const rel = `assets/${basename(finalPath)}`
            sendJson(res, { path: rel, bytes: buf.length })
          } catch (err) {
            sendError(res, 400, (err as Error).message)
          }
        })()
      })

      // GET /assets/<rel> — serve user assets so slide image refs resolve in
      // both the live viewer and the editor's preview iframe.
      server.middlewares.use('/assets/', (req, res, next) => {
        if (req.method !== 'GET') return next()
        const url = req.url ?? ''
        const rel = decodeURIComponent(url.replace(/^\/+/, '').split('?')[0] ?? '')
        if (!rel || rel.includes('..')) return next()
        const filePath = resolve(assetsDir, rel)
        if (!filePath.startsWith(assetsDir)) return next()
        if (!existsSync(filePath) || statSync(filePath).isDirectory()) return next()
        const mime = ASSET_MIME[extname(filePath).toLowerCase()] ?? 'application/octet-stream'
        res.setHeader('Content-Type', mime)
        res.setHeader('Cache-Control', 'no-cache')
        res.end(readFileSync(filePath))
      })

      // ---------- WRITE: theme ----------

      server.middlewares.use('/__verso/theme/', (req, res, next) => {
        const url = req.url ?? ''
        const name = decodeURIComponent(url.replace(/^\/+/, '').split('/')[0] ?? '').trim()
        if (!name || !safeId(name)) return sendError(res, 400, `Invalid theme name "${name}"`)

        const themePath = join(themesDir, `${name}.json`)
        if (req.method === 'PUT') {
          ;(async () => {
            try {
              const body = await parseBody(req)
              const theme = Theme.parse(body)
              if (theme.name !== name) {
                return sendError(
                  res,
                  400,
                  `Theme name mismatch: URL "${name}" vs body "${theme.name}"`,
                )
              }
              writeJsonAtomic(themePath, theme)
              sendJson(res, { ok: true })
            } catch (err) {
              sendError(res, 400, (err as Error).message)
            }
          })()
          return
        }
        next()
      })

      // ---------- watcher ----------

      const watchedDirs = [manifestPath, slidesDir, themesDir]
      for (const d of watchedDirs) server.watcher.add(d)
      server.watcher.on('change', (file) => {
        if (file.startsWith(root)) server.ws.send({ type: 'full-reload' })
      })
    },
  }
}
